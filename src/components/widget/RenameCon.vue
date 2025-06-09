<script setup lang='ts'>
import { NIcon, NPopover, NText, useMessage } from 'naive-ui'
import { ref, watch, onMounted, computed } from 'vue'
import { useConfigStore } from '../../stores/UseConfigStore'

// 获取配置存储
const configStore = useConfigStore()
const message = useMessage()

// 重命名状态
const renameActive = ref(true)

// 初始化重命名设置
const initRenameSettings = () => {
  const rename = configStore.uiConfig.rename
  if (rename) {
    renameActive.value = rename.enabled !== undefined ? rename.enabled : true
  }
}

// 切换重命名开关
const toggleRename = () => {
  renameActive.value = !renameActive.value
  saveRenameConfig()
  
  // 显示消息提示
  if (renameActive.value) {
    message.success('已启用自动重命名')
  } else {
    message.info('已关闭自动重命名')
  }
}

// 保存重命名配置
const saveRenameConfig = () => {
  configStore.saveUiConfig({
    rename: {
      display: configStore.uiConfig.rename?.display || true, // 保持显示设置不变
      enabled: renameActive.value
    }
  })
}

// 判断Rename组件是否应该显示
const showRenameComponent = computed(() => {
  // 此处检查的是Rename功能的显示/隐藏设置，而不是启用/禁用设置
  return configStore.uiConfig.rename?.display === true;
})

// 组件挂载时初始化
onMounted(() => {
  initRenameSettings()
})

// 监听配置变化
watch(() => configStore.uiConfig.rename, (newValue) => {
  if (newValue) {
    renameActive.value = newValue.enabled !== undefined ? newValue.enabled : true
  }
}, { deep: true })
</script>

<template>
  <div class="rename-box" v-if="showRenameComponent">
    <n-popover trigger="hover" raw :show-arrow="false">
      <template #trigger>
        <n-icon size="20" style="cursor:pointer;" @click="toggleRename">
          <!-- 重命名激活图标 -->
          <svg v-show="renameActive" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
            fill="none" version="1.1" width="72" height="72" viewBox="0 0 72 72">
            <g style="mix-blend-mode:passthrough">
              <g>
                <g style="mix-blend-mode:passthrough"></g>
                <g style="mix-blend-mode:passthrough">
                  <path
                    d="M14.54688,12.0312L31.25,12.0312L46.9375,47.75L47.375,47.75L47.375,12.0312L58.1094,12.0312L58.1094,62L43.0625,62L25.7812,23.98438L25.3438,23.98438L25.3438,62L14.54688,62L14.54688,12.0312Z"
                    fill="#18a058" fill-opacity="1" />
                  <path
                    d="M14.54688,12.0312L31.25,12.0312L46.9375,47.75L47.375,47.75L47.375,12.0312L58.1094,12.0312L58.1094,62L43.0625,62L25.7812,23.98438L25.3438,23.98438L25.3438,62L14.54688,62L14.54688,12.0312Z"
                    fill="#000000" fill-opacity="0.20000000298023224" />
                </g>
              </g>
            </g>
          </svg>

          <!-- 重命名未激活图标 -->
          <svg v-show="!renameActive" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
            fill="none" version="1.1" width="72" height="72" viewBox="0 0 72 72">
            <g style="mix-blend-mode:passthrough">
              <g>
                <g style="mix-blend-mode:passthrough"></g>
                <g style="mix-blend-mode:passthrough">
                  <path
                    d="M14.54688,12.0312L31.25,12.0312L46.9375,47.75L47.375,47.75L47.375,12.0312L58.1094,12.0312L58.1094,62L43.0625,62L25.7812,23.98438L25.3438,23.98438L25.3438,62L14.54688,62L14.54688,12.0312Z"
                    fill="#ecf0f1" fill-opacity="1" />
                  <path
                    d="M14.54688,12.0312L31.25,12.0312L46.9375,47.75L47.375,47.75L47.375,12.0312L58.1094,12.0312L58.1094,62L43.0625,62L25.7812,23.98438L25.3438,23.98438L25.3438,62L14.54688,62L14.54688,12.0312Z"
                    fill="#000000" fill-opacity="0.20000000298023224" />
                </g>
              </g>
            </g>
          </svg>
        </n-icon>
      </template>
      <n-text style="color: darkslategrey; width: 200px; padding: 6px 10px; background-color: aliceblue;">
        随机命名 eg. 3ZMiw-DeEZ50-20250604.webp
      </n-text>
    </n-popover>
  </div>
</template>

<style>
.rename-box {
  display: flex;
  align-items: center;
}
</style>