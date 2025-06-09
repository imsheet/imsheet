<script setup lang="ts">
import { ref } from 'vue'
import { NUpload, NUploadDragger, NIcon, NText, useMessage } from 'naive-ui'
import type { UploadCustomRequestOptions, UploadInst } from 'naive-ui'
import { CloudUpload } from '@vicons/ionicons5'
import { useImageStore } from '../../stores/UseImageStore'
import { useConfigStore } from '../../stores/UseConfigStore'
import { CosError } from '../../services/TauriCosService'
import type { UploadProgress } from '../../services/TauriCosService'
import { toExgText } from '../../utils/tools'
import { handleMenuOp } from '../../utils/message'
import { mConsole } from '../../main'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'

const emit = defineEmits(['refresh'])
const message = useMessage()
const imageStore = useImageStore()
const configStore = useConfigStore()

const upload = ref<UploadInst | null>(null)

// 上传队列管理
const uploadQueue = ref<Array<{ file: File, resolve: Function, reject: Function }>>([])
const isUploading = ref(false)

// 上传完成列表管理 - 用于自动复制功能
const uploadedFiles = ref<Array<{ fileName: string, url: string }>>([])
const totalUploadCount = ref(0)

// 串行处理上传队列
const processUploadQueue = async () => {
  if (isUploading.value || uploadQueue.value.length === 0) return
  
  isUploading.value = true
  
  while (uploadQueue.value.length > 0) {
    const item = uploadQueue.value.shift()
    if (!item) continue
    
    try {
      await item.resolve()
    } catch (error) {
      item.reject(error)
    }
    
    // 添加小延迟避免数据库操作冲突
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  isUploading.value = false
}

// 检查所有上传是否完成，自动复制到剪贴板
const checkUploadFinish = async () => {
  // 如果还有文件在上传队列中，等待完成
  if (uploadQueue.value.length > 0 || isUploading.value) {
    return
  }
  
  // 如果有上传成功的文件，进行自动复制
  if (uploadedFiles.value.length > 0) {
    try {
      const formatConfig = configStore.uiConfig.format
      const exgText = formatConfig?.active && formatConfig.list[formatConfig.select] 
        ? formatConfig.list[formatConfig.select].exgText 
        : '%url'
      
      // 格式化所有上传文件的URL
      const formattedTexts = uploadedFiles.value.map(file => 
        toExgText(exgText, file.url)
      )
      
      // 复制到剪贴板
      const textToCopy = formattedTexts.join('\n')
      await writeText(textToCopy)
      
      // 显示成功消息
      const formatName = formatConfig?.active && formatConfig.list[formatConfig.select]
        ? formatConfig.list[formatConfig.select].name
        : '默认'
      
      handleMenuOp(message, formatName)
      
      mConsole.log('自动复制完成:', {
        format: formatName,
        exgText,
        files: uploadedFiles.value,
        copiedText: textToCopy
      })
      
    } catch (error) {
      mConsole.error('自动复制失败:', error)
      message.error('复制到剪贴板失败')
    }
    
    // 清空上传完成列表
    uploadedFiles.value = []
    totalUploadCount.value = 0
  }
}

// 获取用户友好的错误消息
const getErrorMessage = (error: unknown): string => {
  if (error instanceof CosError) {
    switch (error.code) {
      case 'NOT_INITIALIZED':
        return 'COS 配置未初始化，请检查设置'
      case 'UPLOAD_FAILED':
        return '上传失败，请检查网络连接和配置'
      case 'TEMP_FILE_FAILED':
        return '创建临时文件失败，请检查磁盘空间'
      default:
        return error.message
    }
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  return '上传失败，请重试'
}

// 自定义上传请求 - 修复并发上传问题
const customRequest = ({ file, onFinish, onError, onProgress }: UploadCustomRequestOptions) => {
  if (!file.file) return
  
  const f = file.file
  
  // 文件类型校验
  if (!(/(gif|jpg|jpeg|png|webp|bmp)/i.test(f.type))) {
    message.error('仅支持图片文件（gif/jpg/jpeg/png/webp/bmp）')
    upload.value?.clear()
    return
  }
  
  // 大小校验，如果启用了WebP转换，并且文件大于32MB
  const webpEnabled = configStore.uiConfig.webp?.enabled
  if (webpEnabled && f.size > 33554432) {
    message.error('WebP转换模式下，图片大小不能超过32MB')
    upload.value?.clear()
    return
  }
  
  // 将上传任务添加到队列中
  const uploadPromise = new Promise<void>((resolve, reject) => {
    uploadQueue.value.push({
      file: f,
      resolve: async () => {
        // 创建加载消息实例以便后续更新
        let loadingMessage: any = null
        
        try {
          // 增加总上传计数
          totalUploadCount.value++
          
          // 上传文件 - 使用优化的进度回调
          const uploadResult = await imageStore.uploadImage(f, (progress: UploadProgress | number) => {
            // 兼容旧的数字进度和新的详细进度
            if (typeof progress === 'number') {
              onProgress({ percent: progress })
              
              // 更新加载消息
              if (!loadingMessage) {
                loadingMessage = message.loading(`正在上传 ${f.name}... ${progress.toFixed(0)}%`, { duration: 0 })
              } else {
                loadingMessage.content = `正在上传 ${f.name}... ${progress.toFixed(0)}%`
              }
            } else {
              onProgress({ percent: progress.percent })
              
              // 根据阶段显示不同的消息
              const stageMessages = {
                preparing: `准备上传 ${f.name}...`,
                uploading: `正在上传 ${f.name}... ${progress.percent.toFixed(0)}%`,
                completed: `${f.name} 上传完成`,
                error: `${f.name} 上传失败`
              }
              
              if (!loadingMessage) {
                loadingMessage = message.loading(stageMessages[progress.stage], { duration: 0 })
              } else {
                loadingMessage.content = stageMessages[progress.stage]
              }
            }
          })
          
          // 上传成功，添加到完成列表中
          if (uploadResult) {
            // 获取上传文件的URL - 刷新图片列表并获取最新图片
            await imageStore.refreshImages()
            
            // 从最新的图片列表中获取刚上传的图片
            // 假设最新上传的图片在列表的第一个位置
            if (imageStore.images && imageStore.images.length > 0) {
              const latestImage = imageStore.images[0]
              const imageUrl = imageStore.getImageUrlWithCustomDomain(latestImage)
              
              uploadedFiles.value.push({
                fileName: f.name,
                url: imageUrl
              })
              
              mConsole.log('添加到上传完成列表:', {
                fileName: f.name,
                url: imageUrl,
                totalCompleted: uploadedFiles.value.length,
                totalExpected: totalUploadCount.value
              })
            }
          }
          
          // 销毁加载消息
          if (loadingMessage) {
            loadingMessage.destroy()
            loadingMessage = null
          }
          
          message.success(`${f.name} 上传成功`)
          onFinish()
          resolve()
          
        } catch (err) {
          // 销毁加载消息
          if (loadingMessage) {
            loadingMessage.destroy()
            loadingMessage = null
          }
          
          mConsole.error('上传错误详情:', err)
          const errorMessage = getErrorMessage(err)
          message.error(`${f.name} ${errorMessage}`)
          onError()
          reject(err)
        }
      },
      reject
    })
  })
  
  // 启动队列处理
  processUploadQueue()
  
  // 处理上传完成后的清理工作
  uploadPromise.finally(() => {
    // 检查所有文件是否都上传完成
    setTimeout(async () => {
      if (uploadQueue.value.length === 0 && !isUploading.value) {
        // 所有文件上传完成，执行自动复制
        await checkUploadFinish()
        
        // 清除上传列表并刷新
        upload.value?.clear()
        emit('refresh')
        imageStore.refreshImages()
      }
    }, 200)
  })
}

// 从 URL 下载图片并转换为 File 对象
const downloadImageAsFile = async (url: string, filename?: string): Promise<File> => {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`下载失败: ${response.status}`)
    }
    
    const blob = await response.blob()
    
    // 如果没有提供文件名，从 URL 中提取
    if (!filename) {
      const urlParts = url.split('/')
      filename = urlParts[urlParts.length - 1] || 'image'
      
      // 如果文件名没有扩展名，根据 MIME 类型添加
      if (!filename.includes('.')) {
        const mimeType = blob.type
        if (mimeType.includes('jpeg')) filename += '.jpg'
        else if (mimeType.includes('png')) filename += '.png'
        else if (mimeType.includes('gif')) filename += '.gif'
        else if (mimeType.includes('webp')) filename += '.webp'
        else if (mimeType.includes('bmp')) filename += '.bmp'
        else filename += '.jpg' // 默认
      }
    }
    
    return new File([blob], filename, { type: blob.type })
  } catch (error) {
    mConsole.error('下载图片失败:', error)
    throw new Error('无法下载图片，请检查网络连接')
  }
}

// 处理拖拽的各种数据类型
const handleDroppedData = async (dataTransfer: DataTransfer): Promise<File[]> => {
  const files: File[] = []
  
  // 1. 优先处理文件对象（本地文件拖拽）
  if (dataTransfer.files && dataTransfer.files.length > 0) {
    for (let i = 0; i < dataTransfer.files.length; i++) {
      const file = dataTransfer.files[i]
      if (file.type.startsWith('image/')) {
        files.push(file)
      }
    }
    return files // 如果找到文件对象，直接返回
  }
  
  // 2. 如果没有文件对象，尝试处理 URL（浏览器图片拖拽）
  const items = dataTransfer.items
  if (items) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      
      // 处理文件类型的 item
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file && file.type.startsWith('image/')) {
          files.push(file)
        }
      }
      // 处理字符串类型的 item (URL)
      else if (item.kind === 'string' && item.type.includes('text')) {
        try {
          const url = await new Promise<string>((resolve) => {
            item.getAsString(resolve)
          })
          
          // 检查是否是图片 URL
          if (url && (url.startsWith('http') || url.startsWith('data:image'))) {
            // 处理 data URL
            if (url.startsWith('data:image')) {
              const response = await fetch(url)
              const blob = await response.blob()
              const filename = `image_${Date.now()}.${blob.type.split('/')[1] || 'jpg'}`
              files.push(new File([blob], filename, { type: blob.type }))
            }
            // 处理普通 URL
            else {
              const file = await downloadImageAsFile(url)
              files.push(file)
            }
          }
        } catch (error) {
          mConsole.warn('处理拖拽 URL 失败:', error)
        }
      }
    }
  }
  
  return files
}

// 模拟文件选择事件来触发上传
const simulateFileUpload = (files: File[]) => {
  if (!upload.value || files.length === 0) return
  
  // 直接使用 customRequest 处理每个文件
  files.forEach(file => {
    const uploadFile: any = {
      file,
      id: `${Date.now()}_${Math.random()}`,
      name: file.name,
      status: 'pending' as const,
      percentage: 0,
      batchId: `batch_${Date.now()}`,
      url: null,
      thumbnailUrl: null,
      type: file.type,
      fullPath: file.name
    }
    
    customRequest({
      file: uploadFile,
      onFinish: () => {},
      onError: () => {},
      onProgress: () => {}
    })
  })
}

// 拖拽相关处理
const dragOver = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  
  // 设置拖拽效果
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy'
  }
}

const dragDrop = async (e: DragEvent) => {
  if (!e.dataTransfer) return
  
  mConsole.log('拖拽数据类型:', Array.from(e.dataTransfer.types))
  mConsole.log('拖拽文件数量:', e.dataTransfer.files.length)
  mConsole.log('拖拽文件详情:', Array.from(e.dataTransfer.files).map(f => ({ name: f.name, type: f.type, size: f.size })))
  
  // 检查是否是浏览器拖拽（通过数据类型组合判断）
  const isBrowserDrag = e.dataTransfer.types.includes('text/html') && 
                       e.dataTransfer.types.includes('text/uri-list') &&
                       e.dataTransfer.types.includes('text/plain')
  
  // 检查是否有文件对象
  const hasFiles = e.dataTransfer.files && e.dataTransfer.files.length > 0
  
  if (isBrowserDrag) {
    // 浏览器拖拽，即使有文件对象也要自定义处理
    mConsole.log('检测到浏览器拖拽，使用自定义处理')
    
    e.preventDefault()
    e.stopPropagation()
    
    try {
      const files = await handleDroppedData(e.dataTransfer)
      mConsole.log('处理后的文件:', files.map(f => ({ name: f.name, type: f.type, size: f.size })))
      
      if (files.length === 0) {
        message.warning('未检测到有效的图片文件')
        return
      }
      
      // 验证文件数量
      if (files.length > 5) {
        message.error('最多只能同时上传5个文件')
        return
      }
      
      // 处理文件上传
      simulateFileUpload(files)
      
    } catch (error) {
      mConsole.error('处理拖拽文件失败:', error)
      message.error('处理拖拽文件失败，请重试')
    }
    
    return
  }
  
  // 检查是否有有效的图片文件（文件管理器拖拽）
  const hasValidImageFiles = hasFiles && 
    Array.from(e.dataTransfer.files).some(file => file.type.startsWith('image/'))
  
  // 如果有有效的图片文件且不是浏览器拖拽，让 Naive UI 组件处理
  if (hasValidImageFiles) {
    mConsole.log('检测到文件管理器拖拽，交由 Naive UI 处理')
    return // 不阻止事件，让 NUpload 组件处理
  }
  
  // 其他情况尝试自定义处理
  e.preventDefault()
  e.stopPropagation()
  
  mConsole.log('尝试自定义处理其他类型拖拽')
  
  try {
    const files = await handleDroppedData(e.dataTransfer)
    mConsole.log('处理后的文件:', files.map(f => ({ name: f.name, type: f.type, size: f.size })))
    
    if (files.length === 0) {
      message.warning('未检测到有效的图片文件')
      return
    }
    
    // 验证文件数量
    if (files.length > 5) {
      message.error('最多只能同时上传5个文件')
      return
    }
    
    // 处理文件上传
    simulateFileUpload(files)
    
  } catch (error) {
    mConsole.error('处理拖拽文件失败:', error)
    message.error('处理拖拽文件失败，请重试')
  }
}
</script>

<template>
  <n-upload 
    @dragover="dragOver" 
    @drop="dragDrop" 
    ref="upload" 
    multiple 
    :max="5" 
    :custom-request="customRequest"
  >
    <n-upload-dragger
      style="overflow: hidden; height:30vh; max-height: 160px; display: flex; justify-content: center; flex-direction: column;"
    >
      <div>
        <n-icon size="48" :depth="3">
          <cloud-upload />
        </n-icon>
      </div>
      <n-text style="font-size: 16px">
        点击或者拖动图片到该区域来上传
      </n-text>
    </n-upload-dragger>
  </n-upload>
</template>

<style>
</style>