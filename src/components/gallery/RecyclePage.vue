<script setup lang='ts'>
import GalleryBox from './GalleryBox.vue'
import { NLayout, NPagination, NConfigProvider, NButton, NSpin } from 'naive-ui'
import { queryImagesCount, deleteImages } from '../../ipc/node-api'
import { onActivated, ref, watch } from 'vue'
import { zhCN, dateZhCN, useMessage } from 'naive-ui'
import { imageRemoveFinish, networkError } from '../../model/ResModel'
const page = ref(1)
const pageSize = ref(20)
const pageSizes = [
    {
        label: '10 每页',
        value: 10
    },
    {
        label: '20 每页',
        value: 20
    },
    {
        label: '30 每页',
        value: 30
    },
    {
        label: '40 每页',
        value: 50
    }
]

const count = ref(1)
const show = ref(false)

onActivated(() => {
    page.value = 1
    pageSize.value = 20
    reload()
})

const reload = () => {
    countPage()
    const param = [pageSize.value, page.value, 0]
    GalleryBoxRef.value.watchCon(...param)
}

const GalleryBoxRef = ref<any>(null)
watch([page, pageSize], () => {
    const param = [pageSize.value, page.value, 0]
    GalleryBoxRef.value.watchCon(...param)
    countPage()
})

function countPage() {
    queryImagesCount(0).then(res => {
        count.value = Math.ceil(res[0]['count(*)'] / pageSize.value)
    })
}

const options = (key: string) => {
    return [
        {
            label: '恢复',
            key: key
        }
    ]
}

const message = useMessage()
const handleClean = () => {
    show.value = true
    deleteImages().then(() => {
        imageRemoveFinish(message)
        show.value = false
        reload()
    })
}
</script>


<template>
    <n-config-provider :locale="zhCN" :date-locale="dateZhCN">
        <n-spin :show="show">
            <div style="min-width: 300px;height: calc(100vh - 40px); display: flex; flex-direction: column;">
                <div class="gallery-con">
                    <n-pagination v-model:page="page" v-model:page-size="pageSize" show-size-picker :page-count="count"
                        :page-slot="7" size="large" :page-sizes="pageSizes"
                        style="display: flex; margin-right: auto; margin-top: 10px;" />
                    <n-button style="margin-top: 10px;" @click="handleClean">清理</n-button>
                </div>
                <NLayout class="img-layout" :native-scrollbar="false">
                    <GalleryBox ref="GalleryBoxRef" :op="options"></GalleryBox>
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