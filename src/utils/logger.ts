/**
 * 日志管理器
 * 提供统一的日志输出控制
 */

export interface LoggerConfig {
  // 是否启用日志输出
  enabled: boolean
  // 日志级别控制
  levels: {
    log: boolean
    info: boolean
    warn: boolean
    error: boolean
    debug: boolean
  }
  // 是否显示时间戳
  showTimestamp: boolean
  // 是否显示日志级别标签
  showLevel: boolean
}

class Logger {
  private config: LoggerConfig = {
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
  }

  constructor(config?: Partial<LoggerConfig>) {
    if (config) {
      this.updateConfig(config)
    }
  }

  /**
   * 更新日志配置
   */
  updateConfig(config: Partial<LoggerConfig>) {
    this.config = {
      ...this.config,
      ...config,
      levels: {
        ...this.config.levels,
        ...(config.levels || {})
      }
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): LoggerConfig {
    return { ...this.config }
  }

  /**
   * 启用/禁用日志
   */
  setEnabled(enabled: boolean) {
    this.config.enabled = enabled
  }

  /**
   * 格式化日志前缀
   */
  private formatPrefix(level: string): string {
    const parts: string[] = []
    
    if (this.config.showTimestamp) {
      const now = new Date()
      // 手动格式化时间戳，包含毫秒
      const hours = now.getHours().toString().padStart(2, '0')
      const minutes = now.getMinutes().toString().padStart(2, '0')
      const seconds = now.getSeconds().toString().padStart(2, '0')
      const milliseconds = now.getMilliseconds().toString().padStart(3, '0')
      const timestamp = `${hours}:${minutes}:${seconds}.${milliseconds}`
      parts.push(`[${timestamp}]`)
    }
    
    if (this.config.showLevel) {
      parts.push(`[${level.toUpperCase()}]`)
    }
    
    return parts.length > 0 ? parts.join(' ') + ' ' : ''
  }

  /**
   * 内部日志输出方法
   */
  private output(level: keyof LoggerConfig['levels'], originalMethod: Function, ...args: any[]) {
    if (!this.config.enabled || !this.config.levels[level]) {
      return
    }

    const prefix = this.formatPrefix(level)
    if (prefix) {
      originalMethod(prefix, ...args)
    } else {
      originalMethod(...args)
    }
  }

  /**
   * 普通日志
   */
  log(...args: any[]) {
    this.output('log', console.log, ...args)
  }

  /**
   * 信息日志
   */
  info(...args: any[]) {
    this.output('info', console.info, ...args)
  }

  /**
   * 警告日志
   */
  warn(...args: any[]) {
    this.output('warn', console.warn, ...args)
  }

  /**
   * 错误日志
   */
  error(...args: any[]) {
    this.output('error', console.error, ...args)
  }

  /**
   * 调试日志
   */
  debug(...args: any[]) {
    this.output('debug', console.debug, ...args)
  }

  /**
   * 分组开始
   */
  group(label?: string) {
    if (this.config.enabled) {
      console.group(label)
    }
  }

  /**
   * 分组结束
   */
  groupEnd() {
    if (this.config.enabled) {
      console.groupEnd()
    }
  }

  /**
   * 折叠分组开始
   */
  groupCollapsed(label?: string) {
    if (this.config.enabled) {
      console.groupCollapsed(label)
    }
  }

  /**
   * 表格输出
   */
  table(data: any, columns?: string[]) {
    if (this.config.enabled) {
      console.table(data, columns)
    }
  }

  /**
   * 时间开始
   */
  time(label?: string) {
    if (this.config.enabled) {
      console.time(label)
    }
  }

  /**
   * 时间结束
   */
  timeEnd(label?: string) {
    if (this.config.enabled) {
      console.timeEnd(label)
    }
  }

  /**
   * 断言
   */
  assert(condition?: boolean, ...args: any[]) {
    if (this.config.enabled) {
      console.assert(condition, ...args)
    }
  }

  /**
   * 清空控制台
   */
  clear() {
    if (this.config.enabled) {
      console.clear()
    }
  }

  /**
   * 计数
   */
  count(label?: string) {
    if (this.config.enabled) {
      console.count(label)
    }
  }

  /**
   * 重置计数
   */
  countReset(label?: string) {
    if (this.config.enabled) {
      console.countReset(label)
    }
  }

  /**
   * 跟踪调用栈
   */
  trace(...args: any[]) {
    if (this.config.enabled) {
      console.trace(...args)
    }
  }
}

// 根据环境变量和开发模式设置默认配置
const isDev = import.meta.env.DEV
const defaultConfig: Partial<LoggerConfig> = {
  enabled: isDev, // 开发环境默认启用，生产环境默认禁用
  levels: {
    log: true,
    info: true,
    warn: true,
    error: true, // 错误日志始终保留
    debug: isDev // 调试日志只在开发环境启用
  },
  showTimestamp: isDev,
  showLevel: isDev
}

// 创建默认实例
export const mConsole = new Logger(defaultConfig)

// 导出Logger类供自定义使用
export { Logger }

// 导出便捷方法
export const enableLogger = () => mConsole.setEnabled(true)
export const disableLogger = () => mConsole.setEnabled(false)
export const toggleLogger = () => {
  const config = mConsole.getConfig()
  mConsole.setEnabled(!config.enabled)
  return !config.enabled
}
