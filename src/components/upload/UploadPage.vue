<script setup lang='ts'>
import UploadFile from './UploadFile.vue'
import ImagesBox from './ImagesBox.vue'
import { NLayout } from 'naive-ui'
import { ref } from 'vue'
import { throttle } from '../../utils/tools'
import { useUserStore } from '../../store/userStore'
import { toExgText } from '../../utils/tools'
import { toRefresh } from '../../ipc/node-api'

const userStore = useUserStore()

const ImagesBoxRef = ref<any>(null)
const refreshData = throttle(() => ImagesBoxRef.value.loadData(), 100)
const handleScroll = (e: Event) => {
    const { scrollTop, clientHeight, scrollHeight } = e.target as Element
    if (scrollTop + clientHeight > scrollHeight / 1.2) refreshData()
}

toRefresh(() => { ImagesBoxRef.value.refreshList() })

const handleRefresh = () => {
    ImagesBoxRef.value.refreshList()
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
    <div style="min-width: 300px;height: calc(100vh - 40px); display: flex; flex-direction: column;">
        <div class="upload-layout">
            <UploadFile @refresh="handleRefresh"></UploadFile>
        </div>

        <NLayout class="img-layout" :native-scrollbar="false" :on-scroll="handleScroll" @rescroll="handleScroll">
            <ImagesBox ref="ImagesBoxRef" :op="options"></ImagesBox>
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