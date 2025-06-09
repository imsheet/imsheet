import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router.ts'
import naive from 'naive-ui'
import mitt from 'mitt'
import { mConsole, enableLogger, disableLogger } from './utils/logger'
import { sqliteService } from './services/SqliteService.ts'
import { useConfigStore } from './stores/UseConfigStore.ts'
import { tauriCosService } from './services/TauriCosService.ts'

// 暂时禁用 Tauri COS 测试导入，避免干扰真实配置
// if (import.meta.env.DEV) {
//   import('./utils/test-tauri-cos');
// }

// ====== 统一日志配置 ======
// 根据环境和需求统一配置日志行为
const isDev = import.meta.env.DEV

// 使用 mConsole 记录环境信息
mConsole.log('当前环境变量:', import.meta.env)
mConsole.log(`当前环境: ${isDev ? '开发环境' : '生产环境'}`)

if (isDev) {
  // 开发环境：启用所有日志，显示详细信息
  mConsole.updateConfig({
    enabled: true,
    levels: {
      log: true,
      info: true,
      warn: true,
      error: true,
      debug: true
    },
    showTimestamp: true,
    showLevel: true
  })
} else {
  // 生产环境：只保留重要日志
  mConsole.updateConfig({
    enabled: true,
    levels: {
      log: false,
      info: true,
      warn: true,
      error: true, // 错误日志始终保留
      debug: false
    },
    showTimestamp: false,
    showLevel: false
  })
}

// 定义事件类型映射
type Events = {
  'update-menu': string
}

// 创建事件总线
export const emitter = mitt<Events>()

// 导出统一配置的日志管理器和控制函数供其他模块使用
export { mConsole, enableLogger, disableLogger }

// 创建应用
const app = createApp(App)

// 使用 Pinia 状态管理
const pinia = createPinia()
app.use(pinia)

// 初始化配置
async function initializeApp() {
  try {
    // 1. 首先初始化数据库服务（无论是否有 COS 配置都要初始化）
    if (!sqliteService.dbReady) {
      await sqliteService.init()
      mConsole.log('✅ 数据库服务初始化成功')
    } else {
      mConsole.log('✅ 数据库服务已初始化')
    }

    // 2. 导入配置存储和服务
    
    // 3. 创建配置存储实例
    const configStore = useConfigStore()
    
    // 4. 加载配置
    const config = configStore.loadConfig()
    
    // 5. 如果有 COS 配置，初始化 COS 服务
    if (config?.cos) {
      tauriCosService.initialize(config.cos)
      mConsole.log('✅ COS 服务初始化完成')
    } else {
      mConsole.log('ℹ️ 未找到 COS 配置，跳过 COS 服务初始化')
    }
  } catch (error) {
    mConsole.error('❌ 应用初始化过程中出现错误:', error)
    throw error
  }
}

// 使用路由
app.use(router)

// 使用 Naive UI
app.use(naive)

// 初始化应用配置然后挂载
initializeApp().then(() => {
  mConsole.log('应用初始化完成')
  app.mount('#app')
}).catch(error => {
  mConsole.error('应用初始化失败:', error)
  // 即使初始化失败也要挂载应用
  app.mount('#app')
})