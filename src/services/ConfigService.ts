import { CosConfig } from './CosService';
import { tauriCosService, TauriCosService as TauriCosServiceClass } from './TauriCosService'; // 导入类本身并重命名
import { dbSyncService } from './DbSyncService';
import { mConsole } from '../main';

export class ConfigService {
  private static instance: ConfigService;
  private storageKey = 'imsheet_config';

  private constructor() {}

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  // 加载配置
  loadConfig(): any {
    try {
      const configStr = localStorage.getItem(this.storageKey);
      if (!configStr) return null;
      
      const config = JSON.parse(configStr);
      
      // 如果有 COS 配置，先重置然后初始化 Tauri COS 服务
      if (config.cos) {
        // 重置配置，清除可能的测试配置
        tauriCosService.resetConfig();
        // 使用真实配置初始化
        tauriCosService.initialize(config.cos);
        mConsole.log('✅ 已使用真实配置初始化 TauriCosService');
        
        // 数据库初始化现在由 main.ts 统一处理，这里不再重复初始化
      }
      
      return config;
    } catch (error) {
      mConsole.error('加载配置失败:', error);
      return null;
    }
  }

  // 保存配置
  saveConfig(config: any): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(config));
    } catch (error) {
      mConsole.error('保存配置失败:', error);
    }
  }

  // 保存 COS 配置
  async saveCosConfig(cosConfig: CosConfig): Promise<{ success: boolean; message: string }> {
    try {
      // 始终保存配置，无论验证是否成功
      const config = this.loadConfig() || {};
      config.cos = cosConfig;
      this.saveConfig(config);
      
      // 验证 COS 配置
      const isValid = await this.validateCosConfig(cosConfig);
      if (!isValid) {
        return { success: false, message: 'COS 配置已保存，但验证失败，请检查您的配置信息。应用重启后配置仍会保留。' };
      }
      
      // 初始化 Tauri COS 服务
      tauriCosService.initialize(cosConfig);
      
      return { success: true, message: 'COS 配置已保存并验证通过' };
    } catch (error) {
      mConsole.error('保存 COS 配置失败:', error);
      // 即使出现错误，也尝试保存配置
      try {
        const config = this.loadConfig() || {};
        config.cos = cosConfig;
        this.saveConfig(config);
        return { success: false, message: `配置已保存，但验证过程出错: ${error}` };
      } catch {
        return { success: false, message: `保存和验证 COS 配置失败: ${error}` };
      }
    }
  }

  // 验证 COS 配置
  private async validateCosConfig(config: CosConfig): Promise<boolean> {
    try {
      // 创建临时 Tauri COS 服务实例进行验证
      const tempService = TauriCosServiceClass.createTempInstance(); // 使用重命名的类名
      tempService.initialize(config);
      
      // 尝试一个简单的操作 - 检查一个不存在的对象
      await tempService.head('validation_test_' + Date.now());
      
      return true;
    } catch (error) {
      mConsole.error('验证 COS 配置失败:', error);
      // 如果是404错误，说明连接成功但对象不存在，这是预期的
      if (error instanceof Error && (error.message.includes('404') || error.message.includes('NoSuchKey'))) {
        return true;
      }
      return false;
    }
  }

  // 确认配置操作
  async confirmConfig(action: 'create' | 'pull'): Promise<{ success: boolean; message: string }> {
    try {
      if (action === 'create') {
        // 创建新数据库的逻辑
        const success = await dbSyncService.createCloudDb();
        if (success) {
          return { success: true, message: '成功创建云端数据库' };
        } else {
          return { success: false, message: '创建云端数据库失败' };
        }
      } else if (action === 'pull') {
        // 拉取现有数据库的逻辑
        const success = await dbSyncService.pullDb();
        if (success) {
          return { success: true, message: '成功拉取云端数据库' };
        } else {
          return { success: false, message: '拉取云端数据库失败' };
        }
      }
      
      return { success: false, message: '未知操作' };
    } catch (error) {
      mConsole.error('确认配置操作失败:', error);
      return { success: false, message: `操作失败: ${error}` };
    }
  }
}

export const configService = ConfigService.getInstance();