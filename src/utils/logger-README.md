# 日志系统使用指南

## 🎯 设计理念

在项目中采用**统一配置，分布使用**的日志管理架构：
- 所有日志配置在 `main.ts` 中**统一管理**
- 其他文件只需**简单导入**即可使用
- 避免在每个文件中重复配置

## 📁 文件结构

```
src/
├── main.ts              # 统一日志配置和导出
├── utils/
│   └── logger.ts        # 日志管理器核心实现
└── other-files/         # 其他文件简单导入使用
```

## 🔧 配置说明

### 1. 核心配置 (main.ts)

```typescript
// 根据环境自动配置
if (isDev) {
  // 开发环境：全量日志 + 详细信息
  mConsole.updateConfig({
    enabled: true,
    levels: { log: true, info: true, warn: true, error: true, debug: true },
    showTimestamp: true,
    showLevel: true
  })
} else {
  // 生产环境：精简日志
  mConsole.updateConfig({
    enabled: true,
    levels: { log: false, info: true, warn: true, error: true, debug: false },
    showTimestamp: false,
    showLevel: false
  })
}

// 导出供其他文件使用
export { mConsole, enableLogger, disableLogger }
```

### 2. 环境差异化

| 环境 | 配置特点 |
|------|----------|
| **开发环境** | 显示所有日志、时间戳、级别标签 |
| **生产环境** | 只显示重要日志、简洁输出 |

## 🚀 使用方法

### 基础使用 (推荐)

```typescript
// 任何文件中只需一行导入
import { mConsole } from '../main.ts'

// 直接使用，无需配置
mConsole.log('普通日志')
mConsole.info('信息日志') 
mConsole.warn('警告日志')
mConsole.error('错误日志')
mConsole.debug('调试日志')
```

### 运行时控制 (可选)

```typescript
// 需要运行时控制时导入控制函数
import { mConsole, enableLogger, disableLogger } from '../main.ts'

// 临时禁用日志
disableLogger()

// 重新启用日志
enableLogger()

// 自定义配置
mConsole.updateConfig({
  levels: {
    debug: true // 临时启用调试日志
  }
})
```

### Vue 组件中使用

```vue
<script setup lang="ts">
import { mConsole } from '../main.ts'

const handleClick = () => {
  mConsole.log('按钮被点击')
}

const handleError = (error: Error) => {
  mConsole.error('操作失败:', error)
}
</script>
```

## 🔄 VS Code 批量替换

使用正则表达式批量替换现有的 console 调用：

```
查找：console\.
替换为：mConsole.
启用正则表达式：✅
```

或者分别替换：
- `console.log` → `mConsole.log`
- `console.error` → `mConsole.error`
- `console.warn` → `mConsole.warn`
- `console.info` → `mConsole.info`

## 📊 日志输出示例

### 开发环境输出
```
[14:30:25.123] [LOG] 应用初始化完成
[14:30:25.456] [INFO] 数据加载成功
[14:30:25.789] [WARN] 配置项缺失，使用默认值
[14:30:26.012] [ERROR] 网络请求失败: timeout
[14:30:26.345] [DEBUG] 调试信息: {...}
```

### 生产环境输出
```
数据加载成功
配置项缺失，使用默认值  
网络请求失败: timeout
```

## 🛠️ 高级功能

### 1. 分组日志
```typescript
mConsole.group('用户操作')
mConsole.log('开始登录')
mConsole.log('验证完成')
mConsole.groupEnd()
```

### 2. 性能计时
```typescript
mConsole.time('数据处理')
// ... 处理逻辑
mConsole.timeEnd('数据处理') // 输出: 数据处理: 123.456ms
```

### 3. 表格输出
```typescript
mConsole.table([
  { name: '张三', age: 25 },
  { name: '李四', age: 30 }
])
```

## ✅ 优势

1. **统一管理** - 所有日志配置集中在一处
2. **简单使用** - 其他文件只需一行导入
3. **环境自适应** - 开发/生产环境自动切换
4. **性能优化** - 生产环境可完全禁用调试日志
5. **类型安全** - 完整的 TypeScript 支持
6. **功能完整** - 兼容所有 console API

## 🔧 自定义配置

如需修改全局日志行为，只需编辑 `main.ts` 中的配置：

```typescript
// 完全自定义配置
mConsole.updateConfig({
  enabled: true,
  levels: {
    log: true,
    info: true,
    warn: true,
    error: true,
    debug: false
  },
  showTimestamp: true,
  showLevel: false
})
```

这样的架构确保了配置的一致性和使用的便利性！
