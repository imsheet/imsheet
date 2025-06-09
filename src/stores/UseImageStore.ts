import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { imageService, type ImageInfo } from '../services/ImageService'
import { mConsole } from '../main'

export const useImageStore = defineStore('image', () => {
  // 状态
  const images = ref<ImageInfo[]>([])
  const recycleBinImages = ref<ImageInfo[]>([])
  const currentPage = ref(1)
  const pageSize = ref(20)
  const totalCount = ref(0)
  const recycleBinCount = ref(0)
  const loading = ref(false)
  const statistics = ref({
    size: 0,
    quantity: 0,
    last_hash: 'null'
  })

  // 计算属性
  const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value))
  const recycleBinPages = computed(() => Math.ceil(recycleBinCount.value / pageSize.value))

  // 获取正常图片列表
  const fetchImages = async (page?: number, size?: number, dateRange?: [number, number]): Promise<boolean> => {
    loading.value = true
    try {
      const currentPageValue = page || currentPage.value
      const currentSizeValue = size || pageSize.value
      
      const imagesList = await imageService.getImagesList(currentPageValue, currentSizeValue, 1, dateRange)
      const count = await imageService.getImagesCount(1, dateRange)
      
      // 如果是第一页，替换整个列表；否则追加到现有列表
      if (currentPageValue === 1) {
        images.value = imagesList
      } else {
        images.value = [...images.value, ...imagesList]
      }
      
      totalCount.value = count
      currentPage.value = currentPageValue
      pageSize.value = currentSizeValue
      
      mConsole.log(`获取到 ${imagesList.length} 张图片，总计 ${count} 张`)
      
      // 返回是否还有更多数据
      return imagesList.length === currentSizeValue
    } catch (error) {
      mConsole.error('获取图片列表失败:', error)
      if (page === 1) {
        images.value = []
        totalCount.value = 0
      }
      return false
    } finally {
      loading.value = false
    }
  }

  // 获取回收站图片列表
  const fetchRecycleBinImages = async (page?: number, size?: number, dateRange?: [number, number]): Promise<boolean> => {
    loading.value = true
    try {
      const currentPageValue = page || currentPage.value
      const currentSizeValue = size || pageSize.value
      
      const imagesList = await imageService.getImagesList(currentPageValue, currentSizeValue, 0, dateRange)
      const count = await imageService.getImagesCount(0, dateRange)
      
      // 如果是第一页，替换整个列表；否则追加到现有列表
      if (currentPageValue === 1) {
        recycleBinImages.value = imagesList
      } else {
        recycleBinImages.value = [...recycleBinImages.value, ...imagesList]
      }
      
      recycleBinCount.value = count
      currentPage.value = currentPageValue
      pageSize.value = currentSizeValue
      
      mConsole.log(`回收站中有 ${imagesList.length} 张图片，总计 ${count} 张`)
      
      // 返回是否还有更多数据
      return imagesList.length === currentSizeValue
    } catch (error) {
      mConsole.error('获取回收站图片列表失败:', error)
      if (page === 1) {
        recycleBinImages.value = []
        recycleBinCount.value = 0
      }
      return false
    } finally {
      loading.value = false
    }
  }

  // 上传图片
  const uploadImage = async (file: File, onProgress?: (progress: any) => void): Promise<boolean> => {
    try {
      const success = await imageService.uploadImage(file, onProgress)
      
      if (success) {
        // 刷新图片列表
        await fetchImages()
        await updateStatistics()
      }
      
      return success
    } catch (error) {
      mConsole.error('上传图片失败:', error)
      return false
    }
  }

  // 移动到回收站
  const moveToRecycleBin = async (imageId: number): Promise<boolean> => {
    try {
      const success = await imageService.moveToRecycleBin(imageId)
      
      if (success) {
        // 从正常图片列表中移除
        images.value = images.value.filter(img => img.id !== imageId)
        totalCount.value = Math.max(0, totalCount.value - 1)
        recycleBinCount.value += 1
        
        mConsole.log('图片已移到回收站:', imageId)
      }
      
      return success
    } catch (error) {
      mConsole.error('移动到回收站失败:', error)
      return false
    }
  }

  // 从回收站恢复
  const restoreFromRecycleBin = async (imageId: number): Promise<boolean> => {
    try {
      const success = await imageService.restoreFromRecycleBin(imageId)
      
      if (success) {
        // 从回收站列表中移除
        recycleBinImages.value = recycleBinImages.value.filter(img => img.id !== imageId)
        recycleBinCount.value = Math.max(0, recycleBinCount.value - 1)
        totalCount.value += 1
        
        mConsole.log('图片已从回收站恢复:', imageId)
      }
      
      return success
    } catch (error) {
      mConsole.error('从回收站恢复失败:', error)
      return false
    }
  }

  // 清空回收站
  const emptyRecycleBin = async (): Promise<boolean> => {
    try {
      loading.value = true
      const success = await imageService.emptyRecycleBin()
      
      if (success) {
        // 清空回收站数据
        recycleBinImages.value = []
        recycleBinCount.value = 0
        
        // 更新统计信息
        await updateStatistics()
        
        mConsole.log('回收站已清空')
      }
      
      return success
    } catch (error) {
      mConsole.error('清空回收站失败:', error)
      return false
    } finally {
      loading.value = false
    }
  }

  // 永久删除单张图片
  const permanentlyDeleteImage = async (imageId: number): Promise<boolean> => {
    try {
      const success = await imageService.permanentlyDeleteImage(imageId)
      
      if (success) {
        // 从回收站列表中移除
        recycleBinImages.value = recycleBinImages.value.filter(img => img.id !== imageId)
        recycleBinCount.value = Math.max(0, recycleBinCount.value - 1)
        
        // 更新统计信息
        await updateStatistics()
        
        mConsole.log('图片已永久删除:', imageId)
      }
      
      return success
    } catch (error) {
      mConsole.error('永久删除图片失败:', error)
      return false
    }
  }

  // 搜索图片
  const searchImages = async (keyword: string, page = 1, size = 20, isRecycleBin = false): Promise<ImageInfo[]> => {
    try {
      const state = isRecycleBin ? 0 : 1
      const results = await imageService.searchImages(keyword, page, size, state)
      
      if (isRecycleBin) {
        recycleBinImages.value = results
      } else {
        images.value = results
      }
      
      return results
    } catch (error) {
      mConsole.error('搜索图片失败:', error)
      return []
    }
  }

  // 获取图片URL
  const getImageUrl = (image: ImageInfo): string => {
    return imageService.getImageUrl(image)
  }

  // 新增：获取应用自定义域名的图片URL（用于复制功能）
  const getImageUrlWithCustomDomain = (image: ImageInfo): string => {
    return imageService.getImageUrlWithCustomDomain(image)
  }

  // 更新统计信息
  const updateStatistics = async () => {
    try {
      const stats = await imageService.getStatistics()
      statistics.value = stats
    } catch (error) {
      mConsole.error('更新统计信息失败:', error)
    }
  }

  // 设置页面大小
  const setPageSize = (size: number) => {
    pageSize.value = size
  }

  // 设置当前页
  const setCurrentPage = (page: number) => {
    currentPage.value = page
  }

  // 重置状态
  const reset = () => {
    images.value = []
    recycleBinImages.value = []
    currentPage.value = 1
    pageSize.value = 20
    totalCount.value = 0
    recycleBinCount.value = 0
    loading.value = false
  }

  // 别名方法：为了兼容性，loadImages 调用 fetchImages
  const loadImages = async (page?: number, size?: number, dateRange?: [number, number]): Promise<boolean> => {
    return fetchImages(page, size, dateRange)
  }

  // 分页模式加载图片 - 专门用于Gallery视图的分页功能
  const loadImagesWithPagination = async (page?: number, size?: number, dateRange?: [number, number]): Promise<boolean> => {
    loading.value = true
    try {
      const currentPageValue = page || currentPage.value
      const currentSizeValue = size || pageSize.value
      
      const imagesList = await imageService.getImagesList(currentPageValue, currentSizeValue, 1, dateRange)
      const count = await imageService.getImagesCount(1, dateRange)
      
      // 分页模式：始终替换整个列表，不累加
      images.value = imagesList
      
      totalCount.value = count
      currentPage.value = currentPageValue
      pageSize.value = currentSizeValue
      
      mConsole.log(`分页加载：第${currentPageValue}页，获取到 ${imagesList.length} 张图片，总计 ${count} 张`)
      
      return true
    } catch (error) {
      mConsole.error('分页加载图片失败:', error)
      images.value = []
      totalCount.value = 0
      return false
    } finally {
      loading.value = false
    }
  }

  // 刷新图片列表方法 - 修复上传功能
  const refreshImages = async (): Promise<void> => {
    try {
      // 重置到第一页并重新加载
      currentPage.value = 1
      images.value = []
      await fetchImages(1, pageSize.value)
      await updateStatistics()
      mConsole.log('图片列表已刷新')
    } catch (error) {
      mConsole.error('刷新图片列表失败:', error)
    }
  }

  return {
    // 状态
    images,
    recycleBinImages,
    currentPage,
    pageSize,
    totalCount,
    recycleBinCount,
    loading,
    statistics,
    
    // 计算属性
    totalPages,
    recycleBinPages,
    
    // 方法
    fetchImages,
    fetchRecycleBinImages,
    loadImages, // 添加别名方法
    loadImagesWithPagination, // 添加分页模式加载方法
    uploadImage,
    moveToRecycleBin,
    restoreFromRecycleBin,
    emptyRecycleBin,
    permanentlyDeleteImage,
    searchImages,
    getImageUrl,
    getImageUrlWithCustomDomain, // 添加获取自定义域名URL的方法
    updateStatistics,
    setPageSize,
    setCurrentPage,
    reset,
    refreshImages // 添加刷新方法
  }
})