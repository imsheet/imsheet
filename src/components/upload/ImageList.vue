<script setup lang="ts">
import { ref, computed, onMounted, onActivated } from 'vue'
import { NImage, NDropdown, useMessage, NSpace, NSlider, NTag, NBackTop } from 'naive-ui'
import { useImageStore } from '../../stores/UseImageStore'
import { useConfigStore } from '../../stores/UseConfigStore'
import { formatTimeAgo, formatBytes, toExgText } from '../../utils/tools'
import { mConsole } from '../../main'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'

const props = defineProps({
  createOptions: {
    type: Function,
    required: true
  },
  isRecycleBin: {
    type: Boolean,
    default: false
  }
})

const message = useMessage()
const imageStore = useImageStore()
const configStore = useConfigStore()

// 是否已加载所有图片
const listFull = ref(false)
// 当前页码
const currentPage = ref(1)

// 计算缩略图尺寸
const thumbnailSize = computed(() => {
  return `${configStore.uiConfig.thumbnailSize || 30}vh`
})

// 加载更多图片
const loadData = async () => {
  if (listFull.value) return
  
  try {
    let hasMore: boolean
    
    if (props.isRecycleBin) {
      // 回收站模式：加载回收站图片
      hasMore = await imageStore.fetchRecycleBinImages(currentPage.value++, 10)
    } else {
      // 正常模式：加载正常图片
      hasMore = await imageStore.fetchImages(currentPage.value++, 10)
    }
    
    if (!hasMore) {
      listFull.value = true
    }
  } catch (error) {
    mConsole.error('加载图片失败:', error)
  }
}

// 当图片加载完成后检查是否需要加载更多
const checkLoadMore = () => {
  const imagesBox = document.querySelector('.images-box')
  if (!imagesBox) return
  
  const parentNode = imagesBox.parentNode as Element
  if (!parentNode) return
  
  const grandParent = parentNode.parentNode as Element
  if (!grandParent) return
  
  if (parentNode.clientHeight < grandParent.clientHeight + 300) {
    loadData()
  }
}

// 刷新列表
const refreshList = () => {
  if (props.isRecycleBin) {
    imageStore.recycleBinImages = []
  } else {
    imageStore.images = []
  }
  currentPage.value = 1
  listFull.value = false
  loadData()
}

// 计算标签类型
const getTagType = (time: number): "info" | "success" | "warning" => {
  const now = Date.now()
  const diff = now - time
  
  if (diff < 86400000) return 'success'  // 一天内
  if (diff < 86400000 * 7) return 'info' // 一周内
  return 'warning'                        // 一周以上
}

// 点击标签复制图片地址 - 修复功能，支持自定义格式和自定义域名
const handleTagClick = async (image: any) => {
  try {
    const formatConfig = configStore.uiConfig.format
    let textToCopy = ''
    
    if (formatConfig?.active && formatConfig.list && formatConfig.list.length > 0) {
      // 使用自定义格式
      const selectedFormat = formatConfig.list[formatConfig.select || 0]
      const exgText = selectedFormat?.exgText || '%url'
      
      // 获取应用自定义域名的图片 URL
      const imageUrl = imageStore.getImageUrlWithCustomDomain(image)
      
      // 使用 toExgText 工具函数处理占位符
      textToCopy = toExgText(exgText, imageUrl)
      
      // 复制到剪贴板
      await writeText(textToCopy)
      message.success(`已复制为 ${selectedFormat.name || '自定义'} 格式`)
    } else {
      // 默认复制自定义域名URL或原始URL
      const imageUrl = imageStore.getImageUrlWithCustomDomain(image)
      await writeText(imageUrl)
      message.success('已复制图片地址')
    }
  } catch (err) {
    mConsole.error('复制失败:', err)
    message.error('复制失败')
  }
}

// 处理下拉菜单选择
const handleSelect = async (key: string, image: any) => {
  if (key === 'restore') {
    // 恢复图片
    const success = await imageStore.restoreFromRecycleBin(image.id)
    if (success) {
      message.success('恢复成功')
      refreshList()
    } else {
      message.error('恢复失败')
    }
  } else if (key === 'recycle') {
    // 移到回收站
    const success = await imageStore.moveToRecycleBin(image.id)
    if (success) {
      message.success('已移到回收站')
      refreshList()
    } else {
      message.error('移动失败')
    }
  } else {
    // 复制操作 - 修复逻辑
    try {
      // 如果key看起来像是格式化后的文本（不是简单的URL），直接复制
      if (key.includes('![') || key.includes('<img') || key.includes('[img]') || key.startsWith('http')) {
        await writeText(key)
        message.success('已复制')
      } else {
        // 否则作为普通URL处理
        const imageUrl = imageStore.getImageUrl(image)
        await writeText(imageUrl)
        message.success('已复制图片地址')
      }
    } catch (err) {
      mConsole.error('复制失败:', err)
      message.error('复制失败')
    }
  }
}

onMounted(() => {
  loadData()
})

onActivated(() => {
  // 如果列表为空，重新加载
  const currentImages = props.isRecycleBin ? imageStore.recycleBinImages : imageStore.images
  if (currentImages.length === 0) {
    refreshList()
  }
})

defineExpose({
  loadData,
  refreshList
})
</script>

<template>
  <div class="images-box">
    <div class="images-list">
      <n-dropdown 
        size="large" 
        trigger="hover" 
        :options="createOptions(imageStore.getImageUrlWithCustomDomain(image))" 
        @select="(key: any) => handleSelect(key, image)"
        :show-arrow="true" 
        v-for="(image, index) in (isRecycleBin ? imageStore.recycleBinImages : imageStore.images)" 
        :key="index"
      >
        <div class="images-item">
          <div class="item-pos">
            <n-image 
              class="select-img" 
              lazy 
              object-fit="cover" 
              :src="imageStore.getImageUrl(image)" 
              :on-load="index + 1 === (isRecycleBin ? imageStore.recycleBinImages : imageStore.images).length ? checkLoadMore : () => {}"
            />
            <n-tag 
              class="select-tag" 
              :strong="true" 
              :bordered="false" 
              size="small"
              @click="handleTagClick(image)" 
              :type="getTagType(image.create_time)"
            >
              {{ formatTimeAgo(image.create_time) + ' ' + formatBytes(image.image_size) }}
            </n-tag>
          </div>
        </div>
      </n-dropdown>
    </div>
    
    <div class="images-con">
      <div class="images-view">
        <n-space vertical>
          <n-slider 
            v-model:value="configStore.uiConfig.thumbnailSize" 
            :step="1" 
            :min="20" 
            :max="80" 
            :tooltip="false" 
          />
        </n-space>
      </div>
    </div>
    
    <n-back-top :right="30" />
  </div>
</template>

<style>
.images-box {
  width: 100%;
  height: 100%;
}

.images-con {
  justify-content: center;
  position: absolute;
  display: flex;
  bottom: 10px;
  width: 100%;
  animation: show .2s ease-out;
}

@keyframes show {
  from {
    bottom: -20px;
  }

  to {
    bottom: 10px;
  }
}

.images-view {
  padding: 0 10px;
  width: 200px;
  background-color: rgba(146, 146, 146, 0.178);
  backdrop-filter: blur(6px);
  border-radius: 20px;
}

.images-list {
  position: relative;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
}

.images-item:hover {
  border: 2px dashed rgba(20, 161, 81, 0.664);
}

.images-item {
  display: flex;
  flex: 1 0 v-bind(thumbnailSize);
  max-width: calc(v-bind(thumbnailSize) + (v-bind(thumbnailSize)/3));
  height: v-bind(thumbnailSize);
  min-width: 140px;
  min-height: 120px;
  margin: 6px;
  box-sizing: border-box;
  border: 2px solid rgba(0, 0, 0, 0.034);
  transition: all .5s;
}

.item-pos {
  display: block;
  position: relative;
  width: 100%;
  height: 100%;
}

.select-img {
  width: 100%;
  height: 100%;
  position: relative;
}

.item-pos .n-tag {
  text-shadow: 0 0 1px #00000050;
  background-color: #e3f3e7cc !important;
  border-radius: 0 8px 0 0/0 8px 0 0;
}

.select-tag {
  cursor: pointer;
  position: absolute;
  left: 0;
  bottom: 0;
  backdrop-filter: blur(3px);
}

.select-img img {
  width: 100%;
}

.n-image:not(.n-image--preview-disabled) {
  cursor: default !important;
}
</style>