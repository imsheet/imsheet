<script setup lang="ts">
import { computed } from 'vue'
import { NImage, NDropdown, useMessage, NEmpty } from 'naive-ui'
import type { DropdownOption } from 'naive-ui'
import { useConfigStore } from '../../stores/UseConfigStore'
import { useImageStore } from '../../stores/UseImageStore'
import { formatBytes } from '../../utils/tools'
import { mConsole } from '../../main'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'

const props = defineProps<{
  images?: any[]
  createOptions: (imageUrl: string) => DropdownOption[]
}>()

const emit = defineEmits(['restore'])

const message = useMessage()
const configStore = useConfigStore()
const imageStore = useImageStore()

// 计算缩略图尺寸
const thumbnailSize = computed(() => {
  return `${configStore.uiConfig.thumbnailSize || 30}vh`
})

// 获取图片URL - 兼容新旧数据格式并支持自定义域名
const getImageUrl = (image: any): string => {
  // 使用imageStore的getImageUrlWithCustomDomain方法，优先使用自定义域名
  return imageStore.getImageUrlWithCustomDomain(image)
}

// 处理下拉菜单点击
const handleSelect = async (key: string, imageUrl: string, imageData: any) => {
  mConsole.log('Gallery menu select:', { key, imageUrl, imageData })
  
  if (key === 'recycle') {
    // 移到回收站
    try {
      await imageStore.moveToRecycleBin(imageData.key || imageData.id)
      message.success('已移到回收站')
      // 刷新列表
      imageStore.refreshImages()
    } catch (error) {
      mConsole.error('移到回收站失败:', error)
      message.error('移到回收站失败')
    }
  } else if (key === 'restore') {
    // 恢复图片（从回收站恢复）
    try {
      await imageStore.restoreFromRecycleBin(imageData.key || imageData.id)
      message.success('恢复成功')
      emit('restore')
    } catch (error) {
      mConsole.error('恢复失败:', error)
      message.error('恢复失败')
    }
  } else {
    // 复制到剪贴板
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
  <div class="gallery-container">
    <div v-if="!props.images || props.images.length === 0" class="empty-state">
      <n-empty description="暂无图片" />
    </div>
    
    <div v-else class="gallery-grid">
      <div 
        v-for="(image, index) in props.images" 
        :key="image.id || image.key || index"
        class="gallery-item"
      >
        <n-dropdown 
          :options="createOptions(getImageUrl(image))" 
          size="large" 
          trigger="hover"
          @select="(key: any) => handleSelect(key, getImageUrl(image), image)"
        >
          <div class="image-wrapper">
            <n-image
              :src="getImageUrl(image)"
              :alt="image.name || image.image_name || 'Image'"
              :width="thumbnailSize"
              :height="thumbnailSize"
              object-fit="cover"
              lazy
              show-toolbar-tooltip
              class="gallery-image"
            />
            
            <!-- 图片信息覆盖层 -->
            <div class="image-overlay">
              <div class="image-info">
                <div class="image-name">
                  {{ image.name || image.image_name || 'Unknown' }}
                </div>
                <div class="image-size">
                  {{ formatBytes(image.size || image.image_size || 0) }}
                </div>
              </div>
            </div>
          </div>
        </n-dropdown>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gallery-container {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  min-height: 200px;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 20px;
  padding-bottom: 20px;
}

.gallery-item {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background: #f8f9fa;
  transition: all 0.3s ease;
}

.gallery-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.image-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.gallery-image {
  width: 100%;
  height: 100%;
  border-radius: 8px;
}

.image-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  color: white;
  padding: 8px;
  transform: translateY(100%);
  transition: transform 0.3s ease;
}

.gallery-item:hover .image-overlay {
  transform: translateY(0);
}

.image-info {
  font-size: 12px;
}

.image-name {
  font-weight: 500;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.image-size {
  color: rgba(255, 255, 255, 0.8);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .gallery-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 15px;
  }
  
  .gallery-container {
    padding: 15px;
  }
}

@media (max-width: 480px) {
  .gallery-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 10px;
  }
  
  .gallery-container {
    padding: 10px;
  }
}
</style>