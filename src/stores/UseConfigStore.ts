import { defineStore } from 'pinia';
import { ref } from 'vue';
import { CosConfig } from '../services/CosService';
import { configService } from '../services/ConfigService';
import { mConsole } from '../main';

// 定义格式项类型
interface FormatItem {
  name: string;
  exgText: string;
}

// 定义 UI 配置类型
interface UIConfig {
  theme: string;
  windowSize: { width: number; height: number };
  alwaysOnTop: boolean;
  thumbnailSize: number;
  // 新增：小窗模式的窗口状态记忆
  minWindowState: {
    previousSize: { width: number; height: number };
    wasMaximized: boolean;
    wasAlwaysOnTop: boolean;
    isCollapsed: boolean;
  };
  webp: {
    display: boolean;
    enabled: boolean;
    quality: number;
  };
  rename: {
    display: boolean;
    enabled: boolean;
  };
  format: {
    active: boolean;
    select: number;
    list: FormatItem[];
  };
}

export const useConfigStore = defineStore('config', () => {
  const cosConfig = ref<CosConfig | null>(null);
  
  // 全局加载状态
  const globalLoading = ref(false);
  
  const uiConfig = ref<UIConfig>({
    theme: 'light',
    windowSize: { width: 800, height: 600 },
    alwaysOnTop: false,
    thumbnailSize: 30,
    minWindowState: {
      previousSize: { width: 800, height: 600 },
      wasMaximized: false,
      wasAlwaysOnTop: false,
      isCollapsed: false
    },
    webp: {
      display: true,    // 默认显示WebP控件
      enabled: true,    // 默认启用WebP压缩
      quality: 80
    },
    rename: {
      display: true,    // 默认显示重命名控件
      enabled: true     // 默认启用重命名
    },
    format: {
      active: false,
      select: 0,
      list: [
        {
          name: 'markdown',
          exgText: '![](%url)'
        },
        {
          name: 'html',
          exgText: '<img src="%url" alt="image" />'
        },
        {
          name: 'bbcode',
          exgText: '[img]%url[/img]'
        },
        {
          name: 'url',
          exgText: '%url'
        }
      ]
    }
  });
  
  // 目录历史记录
  const dirHistory = ref<string[]>([]);
  
  // 加载配置
  function loadConfig() {
    const config = configService.loadConfig();
    if (config) {
      if (config.cos) {
        cosConfig.value = config.cos;
      }
      if (config.ui) {
        // 深度合并 UI 配置，确保重命名和WebP配置正确初始化
        uiConfig.value = {
          ...uiConfig.value,
          ...config.ui,
          // 确保重命名配置正确合并，保持默认启用状态
          rename: {
            display: config.ui.rename?.display !== undefined ? config.ui.rename.display : true,
            enabled: config.ui.rename?.enabled !== undefined ? config.ui.rename.enabled : true
          },
          // 确保WebP配置正确合并
          webp: {
            display: config.ui.webp?.display !== undefined ? config.ui.webp.display : true,
            enabled: config.ui.webp?.enabled !== undefined ? config.ui.webp.enabled : true,
            quality: config.ui.webp?.quality || 80
          },
          format: {
            ...uiConfig.value.format,
            ...(config.ui.format || {}),
            // 确保 list 始终存在
            list: config.ui.format?.list || uiConfig.value.format.list
          }
        };
      }
      // 加载目录历史记录
      if (config.dirHistory) {
        dirHistory.value = config.dirHistory;
      }
    }
    
    // 确保配置被保存，特别是首次运行时
    saveAllConfig();
    
    mConsole.log('配置加载完成:', {
      rename: uiConfig.value.rename,
      webp: uiConfig.value.webp,
      dirHistory: dirHistory.value
    });
    
    return config;
  }
  
  // 保存 COS 配置
  async function saveCosConfig(config: CosConfig) {
    const result = await configService.saveCosConfig(config);
    // 无论验证是否成功，都更新配置状态并保存配置
    cosConfig.value = config;
    
    // 记录目录历史
    if (config.Dir) {
      addDirToHistory(config.Dir);
    }
    
    saveAllConfig();
    return result;
  }
  
  // 保存 UI 配置
  function saveUiConfig(config: any) {
    // 深度合并配置，特别处理 format 配置
    if (config.format) {
      uiConfig.value.format = {
        ...uiConfig.value.format,
        ...config.format,
        // 确保 list 不被覆盖，除非明确提供了新的 list
        list: config.format.list || uiConfig.value.format.list
      };
      // 移除已处理的 format 配置
      const { format, ...restConfig } = config;
      uiConfig.value = { ...uiConfig.value, ...restConfig };
    } else {
      uiConfig.value = { ...uiConfig.value, ...config };
    }
    saveAllConfig();
  }
  
  // 保存所有配置
  function saveAllConfig() {
    configService.saveConfig({
      cos: cosConfig.value,
      ui: uiConfig.value,
      dirHistory: dirHistory.value
    });
  }
  
  // 添加目录到历史记录
  function addDirToHistory(dir: string) {
    if (!dir) return;
    
    // 移除已存在的相同目录（避免重复）
    const index = dirHistory.value.indexOf(dir);
    if (index > -1) {
      dirHistory.value.splice(index, 1);
    }
    
    // 添加到开头
    dirHistory.value.unshift(dir);
    
    // 限制历史记录数量（最多10个）
    if (dirHistory.value.length > 10) {
      dirHistory.value = dirHistory.value.slice(0, 10);
    }
    
    mConsole.log('目录历史已更新:', dirHistory.value);
  }
  
  // 删除历史记录中的目录
  function removeDirFromHistory(index: number) {
    if (index >= 0 && index < dirHistory.value.length) {
      const removedDir = dirHistory.value[index];
      dirHistory.value.splice(index, 1);
      saveAllConfig();
      mConsole.log('已删除目录历史:', removedDir);
    }
  }
  
  // 切换到指定目录
  async function switchToDir(dir: string) {
    if (!cosConfig.value) {
      mConsole.error('COS 配置不存在，无法切换目录');
      return { success: false, message: 'COS 配置不存在' };
    }
    
    // 更新 COS 配置中的目录
    const newConfig = { ...cosConfig.value, Dir: dir };
    
    try {
      // 调用保存配置方法（这会触发完整的保存流程，包括验证）
      const result = await saveCosConfig(newConfig);
      if (result.success) {
        mConsole.log('已切换到目录:', dir);
      }
      return result;
    } catch (error) {
      mConsole.error('切换目录失败:', error);
      return { success: false, message: '切换目录失败' };
    }
  }
  
  // 确认配置操作
  async function confirmConfig(action: 'create' | 'pull') {
    return await configService.confirmConfig(action);
  }
  
  // 设置全局加载状态
  function setGlobalLoading(loading: boolean) {
    globalLoading.value = loading;
  }
  
  return {
    cosConfig,
    uiConfig,
    dirHistory,
    globalLoading,
    loadConfig,
    saveCosConfig,
    saveUiConfig,
    confirmConfig,
    addDirToHistory,
    removeDirFromHistory,
    switchToDir,
    setGlobalLoading
  };
});