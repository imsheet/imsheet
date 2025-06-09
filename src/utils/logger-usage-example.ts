/**
 * 示例：其他文件如何使用统一配置的日志系统
 * 
 * 只需要从 main.ts 导入即可，无需额外配置
 */

// 1. 简单导入，即可使用已配置好的日志实例
// import { mConsole } from '../main.ts'

// 2. 如果需要运行时控制，可以导入控制函数
import { mConsole, /* enableLogger, disableLogger */ } from '../main.ts'

// 3. 直接使用，无需任何配置
export class ExampleService {
  
  async getData() {
    try {
      mConsole.log('开始获取数据...')
      
      // 模拟异步操作
      const data = await fetch('/api/data')
      
      mConsole.info('数据获取成功', data)
      return data
      
    } catch (error) {
      mConsole.error('数据获取失败:', error)
      throw error
    }
  }
  
  processData(data: any) {
    mConsole.debug('处理数据:', data)
    
    if (!data) {
      mConsole.warn('数据为空，使用默认值')
      return { default: true }
    }
    
    return data
  }
  
  // 运行时控制示例（可选）
  toggleDebugMode() {
    // 临时启用调试日志
    // mConsole.updateConfig({
    //   levels: {
    //     debug: true
    //   }
    // })
    
    mConsole.debug('调试模式已启用')
  }
}

// 4. 在 Vue 组件中使用
export const useExampleComposition = () => {
  const logInfo = (message: string) => {
    mConsole.info(`[Composition] ${message}`)
  }
  
  const logError = (error: Error) => {
    mConsole.error(`[Composition] 错误:`, error)
  }
  
  return {
    logInfo,
    logError
  }
}
