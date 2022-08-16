<script setup lang='ts'>
import GalleryBox from './GalleryBox.vue'
import { NLayout, NPagination, NDatePicker, NConfigProvider } from 'naive-ui'
import { queryImagesCount } from '../../ipc/node-api'
import { computed, onActivated, ref, watch } from 'vue'
import { zhCN, dateZhCN } from 'naive-ui'
import { useUserStore } from '../../store/userStore'
import { toExgText } from '../../utils/tools'

const userStore = useUserStore()

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

const range = ref<Array<number> | null>(null)
const count = ref(1)

onActivated(() => {
    countPage()
    page.value = 1
    pageSize.value = 20
    range.value = null
    const param = [pageSize.value, page.value, 1]
    GalleryBoxRef.value.watchCon(...param)
})

const GalleryBoxRef = ref<any>(null)
watch([page, pageSize, range], (...args) => {
    const r1 = args[0][2] ? args[0][2].toString() : '',
        r2 = args[1][2] ? args[1][2].toString() : ''
    const param: [pageSize: number, page: number, state: number, range?: Array<number>] =
        [pageSize.value, page.value, 1]
    if (range.value) param
        .push((range.value as any).map((v: number, i: number) => {
            return i === 0 ? v : v + (1000 * 60 * 60 * 24) - 1
        }))
    countPage(param.length === 4 ? param[3] : undefined)
    GalleryBoxRef.value.watchCon(...param)
    if (r1 != r2) return setTimeout(() => page.value = 1)
})

function countPage(range?: Array<number>) {
    const param: [state: number, range?: Array<number>] = [1]
    if (range) param.push(range)
    queryImagesCount(...param).then(res => {
        count.value = Math.ceil(res[0]['count(*)'] / pageSize.value)
    })
}

const options = (key: string) => {
    return [
        {
            label: '复制',
            key: 'marina bay sands',
            children: userStore.format.list.map(v => {
                return {
                    label: v.name,
                    key: toExgText(v.exgText, key, userStore.domain)
                }
            })
        },
        {
            label: '回收',
            key: key
        }
    ]
}
</script>


<template>
    <n-config-provider :locale="zhCN" :date-locale="dateZhCN">
        <div style="min-width: 300px;height: calc(100vh - 40px); display: flex; flex-direction: column;">
            <div class="gallery-con">
                <n-pagination v-model:page="page" v-model:page-size="pageSize" show-size-picker :page-count="count"
                    :page-slot="7" size="large" :page-sizes="pageSizes"
                    style="display: flex; margin-right: auto; margin-top: 10px;" />
                <n-date-picker style="margin: 10px 0 0 20px;" v-model:value="(range as any)" type="daterange"
                    clearable />
            </div>
            <NLayout class="img-layout" :native-scrollbar="false">
                <GalleryBox ref="GalleryBoxRef" :op="options" @refresh="countPage"></GalleryBox>
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
    border-radius: 3px;
    transition: all .5s;
}

.img-layout:hover {
    border: 1px dashed #18a058;
}
</style>