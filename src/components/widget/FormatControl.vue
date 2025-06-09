<script setup lang='ts'>
import { NIcon, NPopselect, NButton, NDrawer, NDrawerContent, DrawerPlacement, NScrollbar } from 'naive-ui'
import { computed, onMounted, ref, watch } from 'vue'
import FormatEditor from './FormatEditor.vue'
import { useConfigStore } from '../../stores/UseConfigStore'
import { mConsole } from '../../main'

const configStore = useConfigStore()

// 当前选中的格式
const value = ref('')

// 格式状态
const formatActive = ref(false)

// 格式选项 - 修复从正确的路径获取格式列表
const options = computed(() => {
  const formatList = configStore.uiConfig.format?.list || []
  return formatList.map(v => ({ label: v.name, value: v.exgText }))
})

// 当前选中的格式索引 - 修复路径
const exgIndex = computed(() => {
  const formatList = configStore.uiConfig.format?.list || []
  return formatList.map(v => v.exgText).indexOf(value.value)
})

// 切换格式开关
const formatOpen = () => {
  formatActive.value = !formatActive.value
  saveFormatState()
}

// 激活格式
const handleFormatUpdate = (value: string) => {
  mConsole.log('🐛 handleFormatUpdate 被调用:', value)
  
  // 自动激活格式功能
  formatActive.value = true
  
  // 保存状态
  saveFormatState()
}

// 保存格式状态 - 修复保存逻辑
const saveFormatState = () => {
  const currentFormat = configStore.uiConfig.format || { active: false, select: 0, list: [] }
  
  const newFormatConfig = {
    ...currentFormat,  // 保持现有的 list 不变
    active: formatActive.value,
    select: exgIndex.value >= 0 ? exgIndex.value : 0
  }
  
  mConsole.log('  保存的新格式配置:', newFormatConfig)
  
  configStore.saveUiConfig({
    format: newFormatConfig
  })
  
  // 验证保存结果
  setTimeout(() => {
    mConsole.log('  保存后的配置:', configStore.uiConfig.format)
  }, 100)
}

// 监听格式索引变化
watch(exgIndex, () => {
  saveFormatState()
  
  if (exgIndex.value < 0) {
    formatActive.value = false
  }
})

// 监听选择值变化，自动激活格式功能
watch(value, (newValue) => {
  mConsole.log('🐛 format value changed:', newValue)
  if (newValue) {
    // 有选择值时自动激活
    formatActive.value = true
    saveFormatState()
  }
})

// 抽屉控制
const active = ref(false)
const placement = ref<DrawerPlacement>('right')

const activate = (place: DrawerPlacement) => {
  active.value = true
  placement.value = place
}

// 初始化 - 修复从正确的路径加载格式设置
onMounted(() => {
  
  // 加载格式配置
  const format = configStore.uiConfig.format
  if (format) {
    formatActive.value = format.active || false
    
    // 如果有选中的格式，设置选中值
    const formatList = format.list || []
    
    if (formatList.length > 0) {
      // 如果有保存的选择索引且有效，使用它
      if (format.select >= 0 && format.select < formatList.length) {
        value.value = formatList[format.select].exgText
      } else {
        // 否则默认选择第一个
        value.value = formatList[0].exgText
        formatActive.value = false
      }
    }
  }
})
</script>

<template>
  <div class="format-box">
    <n-popselect v-model:value="value" :options="options" size="medium" scrollable @update:value="handleFormatUpdate">
      <div class="format-icon" style="position: relative; display: flex; justify-content: center; align-items: center;" @click="formatOpen">
        <n-icon size="20" style="cursor:pointer; position: relative;">
          <!-- 激活状态图标 -->
          <svg v-show="formatActive" xmlns="http://www.w3.org/2000/svg"
            xmlns:xlink="http://www.w3.org/1999/xlink" fill="none" version="1.1" width="72" height="72"
            viewBox="0 0 72 72">
            <g style="mix-blend-mode:passthrough">
              <g>
                <g style="mix-blend-mode:passthrough"></g>
                <g style="mix-blend-mode:passthrough">
                  <path
                    d="M25.484375,21.53125L25.484375,33.12505L43.624975,33.12505L43.624975,42.56245L25.484375,42.56245L25.484375,62.00005L14.546875,62.00005L14.546875,12.03125L50.499975,12.03125L50.499975,21.53125L25.484375,21.53125Z"
                    fill="#18a058" fill-opacity="1" />
                  <path
                    d="M25.484375,21.53125L25.484375,33.12505L43.624975,33.12505L43.624975,42.56245L25.484375,42.56245L25.484375,62.00005L14.546875,62.00005L14.546875,12.03125L50.499975,12.03125L50.499975,21.53125L25.484375,21.53125Z"
                    fill="#000000" fill-opacity="0.20000000298023224" />
                </g>
              </g>
            </g>
          </svg>
          <!-- 未激活状态图标 -->
          <svg v-show="!formatActive" xmlns="http://www.w3.org/2000/svg"
            xmlns:xlink="http://www.w3.org/1999/xlink" fill="none" version="1.1" width="72" height="72"
            viewBox="0 0 72 72">
            <g style="mix-blend-mode:passthrough">
              <g>
                <g style="mix-blend-mode:passthrough"></g>
                <g style="mix-blend-mode:passthrough">
                  <path
                    d="M25.484375,21.53125L25.484375,33.12505L43.624975,33.12505L43.624975,42.56245L25.484375,42.56245L25.484375,62.00005L14.546875,62.00005L14.546875,12.03125L50.499975,12.03125L50.499975,21.53125L25.484375,21.53125Z"
                    fill="#ecf0f1" fill-opacity="1" />
                  <path
                    d="M25.484375,21.53125L25.484375,33.12505L43.624975,33.12505L43.624975,42.56245L25.484375,42.56245L25.484375,62.00005L14.546875,62.00005L14.546875,12.03125L50.499975,12.03125L50.499975,21.53125L25.484375,21.53125Z"
                    fill="#000000" fill-opacity="0.20000000298023224" />
                </g>
              </g>
            </g>
          </svg>
        </n-icon>
        <strong v-show="formatActive && exgIndex >= 0" style="position:absolute; top: 10px; left: 12px; font-size: 10px; color: #12703e;">
          {{ exgIndex + 1 }}
        </strong>
      </div>

      <template #action>
        <div class="format-edit" style="display: flex">
          <n-button strong dashed type="primary" style="flex-grow: 1;" @click="activate('left')">
            管理
          </n-button>
        </div>
      </template>
    </n-popselect>
    
    <n-drawer :native-scrollbar="true" v-model:show="active" width="300px" :placement="placement">
      <n-drawer-content title="格式库" closable style="-webkit-app-region: no-drag;">
        <n-scrollbar>
          <format-editor />
        </n-scrollbar>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<style>
.format-box {
  display: flex;
  align-items: center;
}

.n-drawer-body-content-wrapper {
  padding: 0 !important;
}
</style>