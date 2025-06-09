<script setup lang="ts">
import { ref } from 'vue'
import { NLayout } from 'naive-ui'
import { useConfigStore } from '../stores/UseConfigStore.ts'
import { throttle, toExgText } from '../utils/tools.ts'
import UploadBox from '../components/upload/UploadBox.vue'
import ImageList from '../components/upload/ImageList.vue'
import { mConsole } from '../main.ts'

const configStore = useConfigStore()

// 引用组件实例
const imageListRef = ref<any>(null)

// 图片上传后刷新列表
const handleRefresh = () => {
  if (imageListRef.value) {
    imageListRef.value.refreshList()
  }
}

// 滚动加载更多
const refreshData = throttle(() => {
  if (imageListRef.value) {
    imageListRef.value.loadData()
  }
}, 100)

const handleScroll = (e: Event) => {
  const { scrollTop, clientHeight, scrollHeight } = e.target as Element
  if (scrollTop + clientHeight > scrollHeight / 1.2) {
    refreshData()
  }
}

// 创建下拉菜单选项 - 优化自定义域名支持
const createOptions = (imageUrl: string) => {
  const formatConfig = configStore.uiConfig.format
  const formatList = formatConfig?.list || []
  
  /* mConsole.log('🔄 创建下拉菜单选项:', { 
    formatActive: formatConfig?.active, 
    formatCount: formatList.length,
    hasCustomDomain: !!configStore.cosConfig?.Domain
  }) */
  
  // 如果格式功能激活且有格式列表，使用格式列表
  if (formatConfig?.active && formatList.length > 0) {
    const menuItems = formatList.map(format => {
      // 直接使用传入的imageUrl，因为在调用时已经应用了自定义域名
      const formattedText = toExgText(format.exgText, imageUrl)
      
      // mConsole.log(`  📝 格式化文本: ${format.name} -> ${formattedText}`)
      
      return {
        label: format.name,
        key: formattedText
      }
    })
    
    return [
      {
        label: '复制',
        key: 'copy',
        children: menuItems
      },
      {
        label: '移到回收站',
        key: 'recycle'
      }
    ]
  } else {
    mConsole.log('  ❌ 格式功能未激活或无格式列表，使用默认菜单')
    return [
      {
        label: '复制',
        key: 'copy',
        children: [{ 
          label: '图片地址', 
          key: imageUrl  // 直接使用传入的URL
        }]
      },
      {
        label: '移到回收站',
        key: 'recycle'
      }
    ]
  }
}
</script>

<template>
  <div style="min-width: 300px; height: calc(100vh - 40px); display: flex; flex-direction: column;">
    <div class="upload-layout">
      <UploadBox @refresh="handleRefresh"></UploadBox>
    </div>

    <NLayout class="img-layout" :native-scrollbar="false" @scroll="handleScroll">
      <ImageList ref="imageListRef" :create-options="createOptions"></ImageList>
    </NLayout>
  </div>
</template>

<style>
.upload-layout {
  margin: 10px 10px 0 10px;
}

.img-layout {
  margin: 10px;
  box-sizing: border-box;
  border: 1px dashed rgb(224, 224, 230);
  border-radius: 3px;
  transition: all .5s;
}

.img-layout:hover {
  border: 1px dashed #18a058;
}
</style>