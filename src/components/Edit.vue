<script setup lang="ts">
import { NSpace, NInput, NButton, NIcon, NDivider, NTag, useMessage, NTooltip } from 'naive-ui'
import { ref, computed, onMounted, watch } from 'vue'
import { HelpCircleSharp } from '@vicons/ionicons5'
import { useConfigStore } from '../stores/UseConfigStore'

const message = useMessage()
const configStore = useConfigStore()

const name = ref('')
const exgText = ref('')
const formatList = ref<Array<{name: string; exgText: string}>>([])

// 加载格式列表
const loadFormatList = () => {
  formatList.value = configStore.uiConfig.format.list || []
}

// 组件挂载时加载格式列表
onMounted(() => {
  loadFormatList()
})

// 监听 configStore 中 format.list 的变化
watch(() => configStore.uiConfig.format.list, (newList) => {
  if (newList) {
    loadFormatList()
  }
}, { deep: true })

// 示例URL
const sampleUrl = 'https://example.com/image.png'

// 格式预览
const formatPreview = computed(() => {
  const value = exgText.value || ''
  const exg = /([\S\s]*)%url([\S\s]*)/
  return value.replace(exg, `$1${sampleUrl}$2`)
})

// 检查名称是否已存在
const isNameExist = computed(() => {
  const n = name.value.trim()
  return formatList.value.some(item => item.name === n)
})

// 选择已有格式
const selectFormat = (format: typeof formatList.value[0]) => {
  name.value = format.name
  exgText.value = format.exgText
}

// 删除格式
const handleDelete = (index: number) => {
  formatList.value.splice(index, 1)
  saveFormats()
}

// 添加新格式
const addFormat = () => {
  const trimmedName = name.value.trim()
  
  // 验证
  if (!trimmedName) {
    message.error('请输入格式名称')
    return
  }
  
  if (trimmedName.length > 20) {
    message.error('名称不能超过20个字符')
    return
  }
  
  if (!exgText.value.includes('%url')) {
    message.error('格式内容必须包含 %url 占位符')
    return
  }
  
  if (isNameExist.value) {
    message.error('此名称已存在')
    return
  }
  
  // 添加新格式
  formatList.value.push({
    name: trimmedName,
    exgText: exgText.value
  })
  
  // 保存并重置表单
  saveFormats()
  message.success('添加成功')
  name.value = ''
  exgText.value = ''
}

// 更新已有格式
const updateFormat = () => {
  const trimmedName = name.value.trim()
  const index = formatList.value.findIndex(item => item.name === trimmedName)
  
  if (index === -1) {
    message.error('找不到要更新的格式')
    return
  }
  
  // 更新格式
  formatList.value[index].exgText = exgText.value
  
  // 保存
  saveFormats()
  message.success('保存成功')
}

// 保存所有格式
const saveFormats = () => {
  configStore.saveUiConfig({
    format: {
      ...configStore.uiConfig.format,
      list: formatList.value
    }
  })
}

// 打开帮助链接
/* const openHelp = () => {
  const url = 'https://github.com/your-username/imsheet-tauri/wiki/format-guide'
  window.open(url, '_blank')
} */
</script>

<template>
  <div class="format-edit-container">
    <n-space vertical>
      <n-input 
        v-model:value="formatPreview" 
        type="textarea" 
        placeholder="示例 ![](https://example.com/image.png)" 
        :autosize="{
          minRows: 3,
          maxRows: 5
        }" 
        readonly
      />
      
      <n-input 
        v-model:value="exgText" 
        type="textarea" 
        placeholder="示例 ![](%url)" 
        :autosize="{
          minRows: 3,
          maxRows: 5
        }" 
      />
      
      <n-input 
        v-model:value="name" 
        type="text" 
        placeholder="别名 markdown" 
      />
      
      <div class="format-commit">
        <div class="help-icon" style="display: flex; align-items: center;">
          <span>%url</span>
          <n-tooltip placement="right" trigger="hover">
            <template #trigger>
              <n-icon size="18" class="help-icon">
                <help-circle-sharp />
              </n-icon>
            </template>
            <span>
              在格式中使用 %url 作为图片URL的占位符。
              例如：![](%url) 会被替换为 ![](https://example.com/image.png)
            </span>
          </n-tooltip>
        </div>
        
        <div class="button-group">
          <n-button 
            v-if="isNameExist" 
            type="primary" 
            @click="updateFormat" 
            style="margin-right: 6px;"
          >
            保存
          </n-button>
          <n-button 
            type="primary" 
            @click="addFormat" 
            :disabled="isNameExist"
          >
            {{ isNameExist ? '已存在' : '添加' }}
          </n-button>
        </div>
      </div>
      
      <n-divider dashed />
      
      <div class="format-list">
        <n-tag 
          type="success" 
          class="format-item" 
          size="small" 
          closable 
          @close="handleDelete(index)"
          v-for="(format, index) in formatList" 
          :key="index"
        >
          <span @click="selectFormat(format)">{{ format.name }}</span>
        </n-tag>
      </div>
    </n-space>
  </div>
</template>

<style>
.format-edit-container {
  padding: 20px;
}

.format-commit {
  padding: 0 2px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.format-list {
  width: 100%;
  display: flex;
  flex-wrap: wrap
}

.format-item {
  margin: 0 6px 6px 0;
  cursor: pointer;
}

.help-icon {
  cursor: pointer;
  margin-left: 5px;
}
</style>