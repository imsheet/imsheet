<script setup lang="ts">
import { ref, onMounted, onActivated, watch } from 'vue'
import { NLayout, NPagination, NConfigProvider, NDatePicker } from 'naive-ui'
import { zhCN, dateZhCN } from 'naive-ui'
import { useImageStore } from '../stores/UseImageStore'
import { useConfigStore } from '../stores/UseConfigStore'
import { toExgText } from '../utils/tools'
import GalleryImageGrid from '../components/gallery/GalleryImageGrid.vue'
import { mConsole } from '../main'

const imageStore = useImageStore()
const configStore = useConfigStore()

const page = ref(1)
const pageSize = ref(20)
const pageSizes = [
  { label: '10 每页', value: 10 },
  { label: '20 每页', value: 20 },
  { label: '30 每页', value: 30 },
  { label: '40 每页', value: 40 }
]

// 日期范围筛选
const range = ref<[number, number] | null>(null)

// 页面激活时加载数据
onMounted(() => {
  reload()
})

onActivated(() => {
  // 重置状态并重新加载
  page.value = 1
  pageSize.value = 20
  range.value = null
  reload()
})

// 监听分页和日期范围变化
watch([page, pageSize, range], ([, newPageSize], [, oldPageSize]) => {
  // 如果是页面大小变化，重置到第一页
  if (newPageSize !== oldPageSize) {
    page.value = 1
  }
  
  // 处理日期范围变化
  let dateRange: [number, number] | undefined = undefined
  if (range.value && Array.isArray(range.value) && range.value.length === 2) {
    // 将日期范围转换为时间戳，确保包含整天
    dateRange = [
      range.value[0], // 开始日期的00:00:00
      range.value[1] + (1000 * 60 * 60 * 24) - 1 // 结束日期的23:59:59
    ]
  }
  
  // 重新加载数据
  reload(dateRange)
})

// 重新加载图片数据
const reload = async (dateRange?: [number, number]) => {
  try {
    mConsole.log('Gallery reload:', { page: page.value, pageSize: pageSize.value, dateRange })
    
    // 使用分页模式加载数据，支持日期筛选
    await imageStore.loadImagesWithPagination(page.value, pageSize.value, dateRange)
    
    mConsole.log('Gallery loaded:', {
      totalImages: imageStore.images.length,
      totalCount: imageStore.totalCount,
      totalPages: imageStore.totalPages
    })
  } catch (error) {
    mConsole.error('加载图片数据失败:', error)
  }
}

// 处理页面变化
const handlePageChange = (newPage: number) => {
  mConsole.log('页面变化:', newPage)
  page.value = newPage
}

// 处理页面大小变化
const handlePageSizeChange = (newPageSize: number) => {
  mConsole.log('页面大小变化:', newPageSize)
  pageSize.value = newPageSize
  page.value = 1 // 重置到第一页
}

// 创建下拉菜单选项 - 使用与 HomeView 相同的逻辑
const createOptions = (imageUrl: string) => {
  // 修复：从正确的路径获取格式配置
  const formatConfig = configStore.uiConfig.format
  const formatList = formatConfig?.list || []
  const domain = configStore.cosConfig?.Domain || ''
  
  // 如果格式功能激活且有格式列表，使用格式列表
  if (formatConfig?.active && formatList.length > 0) {
    
    const menuItems = formatList.map(format => {
      const finalUrl = domain ? imageUrl.replace(/^https?:\/\/[^\/]+/, domain) : imageUrl
      const formattedText = toExgText(format.exgText, finalUrl, /* domain */)
      
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
    mConsole.log('  ❌ Gallery 格式功能未激活或无格式列表，使用默认菜单')
    return [
      {
        label: '复制',
        key: 'copy',
        children: [{ 
          label: '图片地址', 
          key: `${domain ? domain : ''}${imageUrl}` 
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
  <n-config-provider :locale="zhCN" :date-locale="dateZhCN">
    <div style="min-width: 300px; height: calc(100vh - 40px); display: flex; flex-direction: column;">
      <div class="gallery-con">
        <n-pagination 
          v-model:page="page" 
          v-model:page-size="pageSize" 
          :page-count="imageStore.totalPages"
          :page-slot="7" 
          size="large" 
          :page-sizes="pageSizes"
          style="display: flex; margin-right: auto; margin-top: 10px;"
          @update:page="handlePageChange"
          @update:page-size="handlePageSizeChange"
        />
        <n-date-picker 
          v-model:value="range" 
          type="daterange"
          clearable
          style="margin: 10px 0 0 20px;"
        />
      </div>

      <NLayout class="img-layout" :native-scrollbar="false">
        <GalleryImageGrid :create-options="createOptions" />
      </NLayout>
    </div>
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
  transition: all .5s;
  flex: 1;
}

.img-layout:hover {
  border: 1px dashed #18a058;
}
</style>