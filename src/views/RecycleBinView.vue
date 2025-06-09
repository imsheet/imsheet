<script setup lang="ts">
import { ref, onActivated } from 'vue'
import { NLayout, NPagination, NConfigProvider, NButton, NSpin, useMessage } from 'naive-ui'
import { zhCN, dateZhCN } from 'naive-ui'
import { useImageStore } from '../stores/UseImageStore'
import ImageList from '../components/upload/ImageList.vue'
import { mConsole } from '../main'

const imageStore = useImageStore()
const message = useMessage()

const page = ref(1)
const pageSize = ref(20)
const pageSizes = [
  { label: '10 每页', value: 10 },
  { label: '20 每页', value: 20 },
  { label: '30 每页', value: 30 },
  { label: '40 每页', value: 40 }
]

const loading = ref(false)
const imageListRef = ref<any>(null)

// 页面激活时加载数据
onActivated(() => {
  page.value = 1
  pageSize.value = 20
  reload()
})

// 重新加载回收站数据
const reload = () => {
  imageStore.fetchRecycleBinImages(page.value, pageSize.value)
}

// 监听分页变化
const handlePageChange = () => {
  imageStore.fetchRecycleBinImages(page.value, pageSize.value)
}

// 创建下拉菜单选项 - 回收站只有恢复选项
const createOptions = (imageUrl: string) => {
  mConsole.log('🐛 RecycleBin createOptions 调试信息:')
  mConsole.log('  imageUrl:', imageUrl)
  
  return [
    {
      label: '恢复',
      key: 'restore'
    }
  ]
}

// 清空回收站
const handleEmptyRecycleBin = async () => {
  if (imageStore.recycleBinImages.length === 0) {
    message.info('回收站已经是空的')
    return
  }

  loading.value = true
  try {
    const result = await imageStore.emptyRecycleBin()
    if (result) {
      message.success('回收站已清空')
      reload()
    } else {
      message.error('清空回收站失败')
    }
  } catch (error) {
    mConsole.error('清空回收站失败:', error)
    message.error('清空回收站失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <n-config-provider :locale="zhCN" :date-locale="dateZhCN">
    <n-spin :show="loading">
      <div style="min-width: 300px; height: calc(100vh - 40px); display: flex; flex-direction: column;">
        <div class="gallery-con">
          <n-pagination 
            v-model:page="page" 
            v-model:page-size="pageSize" 
            :page-count="imageStore.recycleBinPages"
            :page-slot="7" 
            size="large" 
            :page-sizes="pageSizes"
            style="display: flex; margin-right: auto; margin-top: 10px;"
            @update:page="handlePageChange"
            @update:page-size="handlePageChange"
          />
          <n-button style="margin-top: 10px;" @click="handleEmptyRecycleBin">清空回收站</n-button>
        </div>

        <NLayout class="img-layout" :native-scrollbar="false">
          <ImageList 
            ref="imageListRef" 
            :create-options="createOptions"
            :is-recycle-bin="true"
          />
        </NLayout>
      </div>
    </n-spin>
  </n-config-provider>
</template>

<style>
.gallery-con {
  height: 46px;
  min-height: 46px;
  overflow: hidden;
  padding: 0 10px;
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
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