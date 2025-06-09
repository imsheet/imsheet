<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NConfigProvider, NMessageProvider, NDialogProvider, NLayout, NLayoutHeader, NLayoutSider, NSpin } from 'naive-ui'
import { useConfigStore } from './stores/UseConfigStore.ts'
import { invoke } from '@tauri-apps/api/core'
import Menu from './components/Menu.vue'
import Controller from './components/widget/Controller.vue'
import { mConsole } from './main.ts'

// 获取配置 store
const configStore = useConfigStore()

// 侧边栏折叠状态
const collapsed = ref(false)
// 菜单引用
const menuRef = ref<any>(null)
// 小窗模式状态
const isMinWindowMode = ref(false)
// 平台信息
const platformInfo = ref('')
// 屏幕缩放因子
const scaleFactor = ref(1)

// 加载配置
onMounted(async () => {
  configStore.loadConfig()
  
  // 获取平台信息和缩放因子
  try {
    platformInfo.value = await invoke('get_platform_info') as string
    scaleFactor.value = await invoke('get_scale_factor') as number
    mConsole.log(`平台: ${platformInfo.value}, 缩放因子: ${scaleFactor.value}`)
  } catch (error) {
    mConsole.error('获取平台信息失败:', error)
  }
  
  // 恢复小窗模式的侧边栏状态
  if (configStore.uiConfig.minWindowState.isCollapsed) {
    collapsed.value = true
  }
  
  // 检查当前是否处于小窗模式（通过窗口大小判断）
  try {
    const [width, /* height */] = await invoke('get_window_size') as [number, number]
    // 根据平台调整判断条件
    const minWindowThreshold = platformInfo.value === 'macos' ? 400 : 300
    isMinWindowMode.value = width <= minWindowThreshold
  } catch (error) {
    mConsole.error('获取窗口大小失败:', error)
  }
})

// 处理小窗模式
const handleMinWin = async () => {
  try {
    // 获取当前窗口状态
    const [currentWidth, currentHeight] = await invoke('get_window_size') as [number, number]
    const isMaximized = await invoke('is_maximized') as boolean
    
    if (menuRef.value) {
      menuRef.value.activeKey = '/'
      menuRef.value.tolink()
    }
    
    if (!isMinWindowMode.value) {
      // 进入小窗模式
      mConsole.log('进入小窗模式')
      
      // 保存当前状态到配置中
      const minWindowState = {
        previousSize: { width: currentWidth, height: currentHeight },
        wasMaximized: isMaximized,
        wasAlwaysOnTop: configStore.uiConfig.alwaysOnTop,
        isCollapsed: collapsed.value
      }
      
      // 如果当前是最大化状态，先取消最大化
      if (isMaximized) {
        await invoke('unmaximize_window')
      }
      
      // 设置小窗尺寸 - 根据平台自适应调整
      if (platformInfo.value === 'macos') {
        // macOS 使用自适应尺寸，确保在 Retina 屏幕上有合适的显示效果
        // 基础尺寸 300x250，经过 1.5 倍缩放后约为 450x375，符合最小尺寸要求
        await invoke('set_window_size_adaptive', { logicalWidth: 200, logicalHeight: 250 })
      } else {
        // Windows/Linux 使用标准尺寸，刚好等于最小尺寸
        await invoke('set_window_size', { width: 380, height: 330 })
      }
      
      // 设置置顶
      await invoke('set_always_on_top', { alwaysOnTop: true })
      
      // 折叠侧边栏
      collapsed.value = true
      
      // 更新状态
      isMinWindowMode.value = true
      
      // 保存配置
      configStore.saveUiConfig({
        minWindowState,
        alwaysOnTop: true
      })
      
    } else {
      // 退出小窗模式
      mConsole.log('退出小窗模式')
      
      const minWindowState = configStore.uiConfig.minWindowState
      
      // 恢复置顶状态
      await invoke('set_always_on_top', { alwaysOnTop: minWindowState.wasAlwaysOnTop })
      
      // 恢复侧边栏状态
      collapsed.value = minWindowState.isCollapsed
      
      // 恢复窗口大小或最大化状态
      if (minWindowState.wasMaximized) {
        await invoke('maximize_window')
      } else {
        await invoke('set_window_size', { 
          width: minWindowState.previousSize.width, 
          height: minWindowState.previousSize.height 
        })
      }
      
      // 更新状态
      isMinWindowMode.value = false
      
      // 保存配置，恢复原始的置顶状态
      configStore.saveUiConfig({
        alwaysOnTop: minWindowState.wasAlwaysOnTop
      })
    }
    
  } catch (error) {
    mConsole.error('切换小窗模式失败:', error)
  }
}

// 处理窗口拖动
const handleDrag = async (event: MouseEvent) => {
  // 只在左键按下时处理
  if (event.button !== 0) return
  
  // 检查事件目标，避免在交互元素上触发拖拽
  const target = event.target as HTMLElement
  
  // 如果点击的是按钮、输入框、下拉框等交互元素，不触发拖拽
  if (target.closest('button') || 
      target.closest('input') || 
      target.closest('select') || 
      target.closest('.n-button') ||
      target.closest('.n-switch') ||
      target.closest('.n-popover') ||
      target.closest('.n-dropdown') ||
      target.closest('.n-tooltip') ||
      target.closest('[role="button"]') ||
      target.closest('.min-win') ||  // 添加小窗按钮检测
      target.closest('.widget-box > *:not(.region-con)')) {
    return
  }
  
  try {
    await invoke('start_drag')
  } catch (error) {
    mConsole.error('启动拖动失败:', error)
  }
}

// 处理双击最大化/还原
const handleDoubleClick = async (event: MouseEvent) => {
  // 检查双击的目标，避免在交互元素上触发
  const target = event.target as HTMLElement
  
  // 如果双击的是交互元素，不触发最大化
  if (target.closest('button') || 
      target.closest('input') || 
      target.closest('select') || 
      target.closest('.n-button') ||
      target.closest('.n-switch') ||
      target.closest('.n-popover') ||
      target.closest('.n-dropdown') ||
      target.closest('.min-win') ||
      target.closest('.widget-box > *:not(.region-con)')) {
    return
  }
  
  try {
    await invoke('handle_double_click')
  } catch (error) {
    mConsole.error('双击处理失败:', error)
  }
}
</script>

<template>
  <n-message-provider>
    <n-dialog-provider>
      <n-config-provider>
        <n-layout style="height: 100vh" class="n-layout-body">
          <!-- 标题栏和控制区 -->
          <n-layout-header 
            class="imsheet-headers" 
            style="height: 40px; display: flex; align-items: center;" 
            bordered
            @mousedown="handleDrag"
            @dblclick="handleDoubleClick"
          >
            <div class="logo-container">
              <div class="logo-text">
                I<span class="min-win" @click="handleMinWin">m</span>Sheet
              </div>
              <!-- 中间拖拽区域 -->
              <div class="drag-area"></div>
              <!-- 控制器组件 -->
              <Controller />
            </div>
          </n-layout-header>
          
          <!-- 主要内容区域 -->
          <n-layout has-sider>
            <n-layout-sider
              bordered
              collapse-mode="width"
              :collapsed-width="50"
              :width="160"
              :collapsed="collapsed"
              show-trigger
              @collapse="collapsed = true"
              @expand="collapsed = false"
            >
              <Menu ref="menuRef" />
            </n-layout-sider>
            <n-layout class="container">
              <n-spin :show="configStore.globalLoading">
                <router-view />
              </n-spin>
            </n-layout>
          </n-layout>
        </n-layout>
      </n-config-provider>
    </n-dialog-provider>
  </n-message-provider>
</template>

<style>
html, body {
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
  overflow: hidden;
  background: transparent;
}

*::selection {
  background: #18a058;
  color: aliceblue;
}

.n-text {
  cursor: default;
}

.n-layout {
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.n-layout-body {
  border-radius: 10px;
}

.imsheet-headers {
  -webkit-app-region: no-drag; /* 让子元素控制拖拽行为 */
  cursor: pointer;
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
}

.logo-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0 10px;
  -webkit-app-region: no-drag; /* 确保子元素可以响应鼠标事件 */
}

.logo-text {
  font-size: 20px;
  font-weight: bold;
  user-select: none;
  -webkit-app-region: drag; /* 文本区域可以拖拽 */
  cursor: move;
}

.drag-area {
  flex: 1;
  height: 40px;
  -webkit-app-region: drag; /* 中间区域用于拖拽 */
  cursor: move;
}

.min-win {
  -webkit-app-region: no-drag !important; /* 使用 !important 确保优先级 */
  cursor: pointer !important;
  padding: 0 2px; /* 增加点击区域 */
  border-radius: 3px; /* 添加圆角 */
  transition: all 0.2s ease; /* 添加过渡效果 */
  position: relative;
  z-index: 10; /* 确保在最上层 */
}

.min-win:hover {
  color: #187744;
  background-color: rgba(24, 119, 68, 0.1); /* 添加悬停背景 */
}

.n-layout-toggle-button {
  top: 160px !important;
}

.n-layout-sider {
  background: rgba(250, 250, 252, 0.9);
  backdrop-filter: blur(20px);
}

.n-layout:not(.n-layout--has-sider) {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
}

.container {
  background: red;
  height: calc(100vh - 40px);
}
</style>