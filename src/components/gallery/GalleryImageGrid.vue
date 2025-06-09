<script setup lang="ts">
import { computed } from 'vue'
import { NImage, NDropdown, useMessage, NTag, NEmpty, NSpace, NSlider, NBackTop } from 'naive-ui'
import { useImageStore } from '../../stores/UseImageStore'
import { useConfigStore } from '../../stores/UseConfigStore'
import { formatTimeAgo, formatBytes, toExgText } from '../../utils/tools'
import { mConsole } from '../../main'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'

/* const props =  */defineProps({
  createOptions: {
    type: Function,
    required: true
  }
})

const message = useMessage()
const imageStore = useImageStore()
const configStore = useConfigStore()

// 计算缩略图尺寸
const thumbnailSize = computed(() => {
  return `${configStore.uiConfig.thumbnailSize || 30}vh`
})

// 计算标签类型
const getTagType = (time: number): "info" | "success" | "warning" => {
  const now = Date.now()
  const diff = now - time
  
  if (diff < 86400000) return 'success'  // 一天内
  if (diff < 86400000 * 7) return 'info' // 一周内
  return 'warning'                        // 一周以上
}

// 点击标签复制图片地址
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
      // 使用默认图片地址
      const imageUrl = imageStore.getImageUrlWithCustomDomain(image)
      await writeText(imageUrl)
      message.success('已复制图片地址')
    }
  } catch (error) {
    mConsole.error('复制失败:', error)
    message.error('复制失败')
  }
}

// 处理下拉菜单点击
const handleSelect = async (key: string, image: any) => {
  if (key === 'recycle') {
    // 移到回收站
    try {
      await imageStore.moveToRecycleBin(image.id)
      message.success('已移到回收站')
    } catch (error) {
      mConsole.error('移到回收站失败:', error)
      message.error('移到回收站失败')
    }
  } else {
    // 复制功能
    try {
      await writeText(key)
      message.success('已复制到剪贴板')
    } catch (error) {
      mConsole.error('复制失败:', error)
      message.error('复制失败')
    }
  }
}
</script>

<template>
  <div class="gallery-images-box">
    <!-- 加载状态 -->
    <div v-if="imageStore.loading" class="loading-container">
      <div class="loading-text">加载中...</div>
    </div>
    
    <!-- 空状态 -->
    <div v-else-if="imageStore.images.length === 0" class="empty-container">
      <NEmpty description="暂无图片" />
    </div>
    
    <!-- 图片网格 -->
    <div v-else class="gallery-grid">
      <n-dropdown 
        size="large" 
        trigger="hover" 
        :options="createOptions(imageStore.getImageUrlWithCustomDomain(image))" 
        @select="(key: any) => handleSelect(key, image)"
        :show-arrow="true" 
        v-for="image in imageStore.images" 
        :key="image.id"
      >
        <div class="gallery-item">
          <div class="gallery-item-container">
            <n-image 
              class="gallery-image" 
              lazy 
              object-fit="cover" 
              :src="imageStore.getImageUrl(image)" 
            />
            <n-tag 
              class="gallery-tag" 
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
    
    <!-- 视图控制器 -->
    <div class="gallery-controls">
      <div class="gallery-view-controls">
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

<style scoped>
.gallery-images-box {
  width: 100%;
  height: 100%;
  padding: 10px;
  position: relative;
  box-sizing: border-box;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.loading-text {
  font-size: 16px;
  color: #999;
}

.empty-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
}

.gallery-grid {
  position: relative;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-content: flex-start;
  width: 100%;
}

.gallery-item {
  cursor: pointer;
  display: flex;
  flex: 0 0 auto;
  width: v-bind(thumbnailSize);
  height: v-bind(thumbnailSize);
  min-width: 140px;
  min-height: 120px;
  margin: 6px;
  box-sizing: border-box;
  border: 2px solid rgba(0, 0, 0, 0.034);
  transition: all .5s;
}

.gallery-item:hover {
  border: 2px dashed rgba(20, 161, 81, 0.664);
  transform: scale(1.02);
}

.gallery-item-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.gallery-image {
  width: 100%;
  height: 100%;
}

.gallery-tag {
  position: absolute;
  left: 0;
  bottom: 0;
  cursor: pointer;
  backdrop-filter: blur(3px);
  background-color: #e3f3e7cc !important;
  border-radius: 0 8px 0 0/0 8px 0 0;
  text-shadow: 0 0 1px #00000050;
}

.gallery-controls {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
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

.gallery-view-controls {
  padding: 0 10px;
  width: 200px;
  background-color: rgba(146, 146, 146, 0.178);
  backdrop-filter: blur(6px);
  border-radius: 20px;
}

/* 确保图片不会被预览模式影响 */
:deep(.n-image:not(.n-image--preview-disabled)) {
  cursor: default !important;
}

:deep(.gallery-image img) {
  width: 100%;
}
</style>
