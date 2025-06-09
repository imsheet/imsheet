import { tauriCosService, TauriCosService } from './TauriCosService';
import { sqliteService } from './SqliteService';
import { mConsole } from '../main';
import { mkdir, readFile, remove, writeFile } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';

export class DbSyncService {
  private static instance: DbSyncService;
  // 修复：使用返回boolean的锁类型
  private syncLock: Promise<boolean> = Promise.resolve(true);
  
  private constructor() {}
  
  static getInstance(): DbSyncService {
    if (!DbSyncService.instance) {
      DbSyncService.instance = new DbSyncService();
    }
    return DbSyncService.instance;
  }
  
  // 检查云端数据库是否存在 - 修复：回到使用 head 方法，但正确处理返回结果
  async checkCloudDbExists(): Promise<boolean> {
    try {
      // 获取完整的数据库路径
      const dbKey = this.getDbKey();
      mConsole.log('检查云端数据库路径:', dbKey);
      
      // 获取当前配置信息用于调试
      const config = tauriCosService.getConfig();
      mConsole.log('当前COS配置:', {
        Bucket: config?.Bucket,
        Region: config?.Region,
        Dir: config?.Dir,
        计算出的完整路径: dbKey
      });
      
      // 使用 head 方法检查文件是否存在
      mConsole.log('开始执行 head 请求...');
      const metadata = await tauriCosService.head(dbKey);
      
      mConsole.log('head 请求返回结果:', {
        exists: metadata.exists,
        size: metadata.size,
        etag: metadata.etag,
        lastModified: metadata.last_modified
      });
      
      // 检查 metadata 的 exists 字段
      if (metadata.exists) {
        mConsole.log('✅ 云端数据库存在:', dbKey);
        return true;
      } else {
        mConsole.log('❌ 云端数据库不存在:', dbKey);
        return false;
      }
    } catch (error) {
      // 如果是网络错误或其他错误，记录详细信息并返回 false
      mConsole.error('❌ 检查云端数据库失败:', error);
      mConsole.error('错误详情:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return false;
    }
  }
  
  // 创建云端数据库 - 修复：创建全新的空数据库而不是基于现有数据库
  async createCloudDb(): Promise<boolean> {
    // 使用同步锁确保操作的原子性
    this.syncLock = this.syncLock.then(async () => {
      try {
        mConsole.log('开始创建全新的云端数据库...');
        
        // 创建一个全新的空数据库（不基于现有的本地数据库）
        const newDbData = await this.createFreshDatabase();
        
        // 创建临时文件并上传
        const tempFilePath = await this.saveDbToTemp(newDbData);
        
        try {
          // 使用正确的数据库路径
          const dbKey = this.getDbKey();
          mConsole.log('创建云端数据库:', dbKey);
          
          const result = await tauriCosService.upload(tempFilePath, dbKey);
          
          // 用新创建的数据库替换本地数据库
          await sqliteService.loadFromBinary(newDbData);
          
          // 更新本地数据库哈希
          if (result.etag) {
            const hash = result.etag.replace(/"/g, '');
            await sqliteService.updateDbHash(hash);
          }
          
          mConsole.log('✅ 云端数据库创建成功');
          return true;
        } finally {
          // 清理临时文件
          this.cleanupTempFile(tempFilePath);
        }
      } catch (error) {
        mConsole.error('创建云端数据库失败:', error);
        return false;
      }
    });
    
    return await this.syncLock;
  }

  // 新增：创建全新的空数据库 - 简化实现
  private async createFreshDatabase(): Promise<Uint8Array> {
    try {
      mConsole.log('创建全新的空数据库...');
      
      // 直接使用 SQLite 服务创建新的空数据库
      await sqliteService.createFreshDb();
      
      // 导出新创建的空数据库
      const freshData = await sqliteService.exportToUint8Array();
      
      mConsole.log('✅ 全新数据库创建完成，大小:', freshData.byteLength, 'bytes');
      
      return freshData;
    } catch (error) {
      mConsole.error('创建全新数据库失败:', error);
      throw error;
    }
  }
  
  // 推送本地数据库到云端 - 修复：使用正确的数据库路径
  async pushDb(): Promise<boolean> {
    this.syncLock = this.syncLock.then(async () => {
      try {
        // 确保本地数据库已初始化
        if (!sqliteService.dbReady) {
          mConsole.log('数据库未初始化，跳过推送');
          return false;
        }
        
        // 导出本地数据库
        const dbData = await sqliteService.exportToUint8Array();
        
        // 创建临时文件并上传
        const tempFilePath = await this.saveDbToTemp(dbData);
        
        try {
          // 使用正确的数据库路径
          const dbKey = this.getDbKey();
          mConsole.log('推送数据库到:', dbKey);
          
          const result = await tauriCosService.upload(tempFilePath, dbKey);
          
          // 更新本地数据库哈希
          if (result.etag) {
            const hash = result.etag.replace(/"/g, '');
            await sqliteService.updateDbHash(hash);
          }
          
          mConsole.log('✅ 数据库推送成功');
          return true;
        } finally {
          // 清理临时文件
          this.cleanupTempFile(tempFilePath);
        }
      } catch (error) {
        mConsole.error('推送数据库失败:', error);
        return false;
      }
    });
    
    return await this.syncLock;
  }
  
  // 从云端拉取数据库 - 修复：使用正确的数据库路径
  async pullDb(): Promise<boolean> {
    this.syncLock = this.syncLock.then(async () => {
      try {
        // 创建临时文件路径用于下载
        const tempFilePath = await this.createTempPath('images.db');
        
        try {
          // 使用正确的数据库路径
          const dbKey = this.getDbKey();
          mConsole.log('从云端拉取数据库:', dbKey);
          
          // 从云端下载数据库
          await tauriCosService.download(dbKey, tempFilePath);
          
          // 读取下载的数据库文件
          const dbData = await this.readTempFile(tempFilePath);
          
          // 加载到本地数据库
          await sqliteService.loadFromBinary(new Uint8Array(dbData));
          
          // 获取云端数据库的哈希并更新本地记录
          const metadata = await tauriCosService.head(dbKey);
          if (metadata.etag) {
            const hash = metadata.etag.replace(/"/g, '');
            await sqliteService.updateDbHash(hash);
          }
          
          mConsole.log('✅ 数据库拉取成功');
          return true;
        } finally {
          // 清理临时文件
          this.cleanupTempFile(tempFilePath);
        }
      } catch (error) {
        mConsole.error('拉取数据库失败:', error);
        return false;
      }
    });
    
    return await this.syncLock;
  }
  
  // 检查数据库同步状态 - 修复：使用正确的数据库路径
  async checkSyncStatus(): Promise<{ needSync: boolean; cloudHash?: string; localHash?: string }> {
    try {
      // 检查云端数据库是否存在
      const cloudExists = await this.checkCloudDbExists();
      if (!cloudExists) {
        return { needSync: false };
      }
      
      // 使用正确的数据库路径获取云端哈希
      const dbKey = this.getDbKey();
      const cloudMetadata = await tauriCosService.head(dbKey);
      const cloudHash = cloudMetadata.etag?.replace(/"/g, '');
      
      // 获取本地哈希
      const localHash = await sqliteService.getDbHash();
      
      const needSync = cloudHash !== localHash;
      
      return {
        needSync,
        cloudHash,
        localHash
      };
    } catch (error) {
      mConsole.error('检查同步状态失败:', error);
      return { needSync: false };
    }
  }
  
  // 同步本地数据库到云端（pushDb 的别名）
  async syncToCloud(): Promise<boolean> {
    return await this.pushDb();
  }
  
  // 从云端同步数据库到本地（pullDb 的别名）
  async syncFromCloud(): Promise<boolean> {
    return await this.pullDb();
  }
  
  // 辅助方法：保存数据库到临时文件
  private async saveDbToTemp(data: Uint8Array): Promise<string> {
    const appDir = await appDataDir();
    const tempDir = await join(appDir, 'temp');
    const fileName = `db_upload_${Date.now()}.db`;
    const tempFilePath = await join(tempDir, fileName);
    
    // 确保目录存在
    try {
      await mkdir(tempDir, { recursive: true });
    } catch (e) {
      // 目录可能已经存在
    }
    
    await writeFile(tempFilePath, data);
    return tempFilePath;
  }
  
  // 辅助方法：创建临时文件路径
  private async createTempPath(fileName: string): Promise<string> {
    
    const appDir = await appDataDir();
    const tempDir = await join(appDir, 'temp');
    const tempFileName = `db_download_${Date.now()}_${fileName}`;
    
    // 确保目录存在
    try {
      await mkdir(tempDir, { recursive: true });
    } catch (e) {
      // 目录可能已经存在
    }
    
    return await join(tempDir, tempFileName);
  }
  
  // 辅助方法：读取临时文件
  private async readTempFile(filePath: string): Promise<ArrayBuffer> {
    
    const uint8Array = await readFile(filePath);
    return uint8Array.buffer;
  }
  
  // 辅助方法：清理临时文件
  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      await remove(filePath);
    } catch (error) {
      console.warn('清理临时文件失败:', error);
    }
  }
  
  // 新增：获取数据库的完整 key
  private getDbKey(): string {
    const config = tauriCosService.getConfig();
    if (!config) {
      throw new Error('COS 配置未初始化');
    }
    
    // 根据配置构建数据库路径
    if (config.Dir) {
      const dir = config.Dir.endsWith('/') ? config.Dir : `${config.Dir}/`;
      return `${dir}images.db`;
    }
    
    return 'ImSheet/images.db';
  }
  
  // 新增：使用临时配置检查云端数据库是否存在
  async checkCloudDbExistsWithTempConfig(tempConfig: any): Promise<boolean> {
    try {
      // 创建临时 COS 服务实例
      const tempCosService = TauriCosService.createTempInstance();
      tempCosService.initialize(tempConfig);
      
      // 使用临时配置构建数据库路径
      let dbKey: string;
      if (tempConfig.Dir) {
        const dir = tempConfig.Dir.endsWith('/') ? tempConfig.Dir : `${tempConfig.Dir}/`;
        dbKey = `${dir}images.db`;
      } else {
        dbKey = 'ImSheet/images.db';
      }
      
      mConsole.log('使用临时配置检查云端数据库路径:', dbKey);
      
      // 使用临时服务检查文件是否存在
      const metadata = await tempCosService.head(dbKey);
      
      mConsole.log('临时配置检测结果:', {
        exists: metadata.exists,
        size: metadata.size,
        etag: metadata.etag,
        lastModified: metadata.last_modified
      });
      
      if (metadata.exists) {
        mConsole.log('✅ 云端数据库存在 (临时配置):', dbKey);
        return true;
      } else {
        mConsole.log('❌ 云端数据库不存在 (临时配置):', dbKey);
        return false;
      }
    } catch (error) {
      mConsole.error('❌ 使用临时配置检查云端数据库失败:', error);
      return false;
    }
  }
}

export const dbSyncService = DbSyncService.getInstance();