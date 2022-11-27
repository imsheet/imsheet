<script setup lang='ts'>
import { ref, computed, onMounted, onActivated } from 'vue'
import { NImage, NDropdown, useMessage, NSpace, NSlider, NTag, NBackTop } from 'naive-ui'
import { useUserStore } from '../../store/userStore'
import { changeImagesState, queryImagesList } from '../../ipc/node-api'
import { lastTime, bytesToSize, toExgText } from '../../utils/tools'
import { clipboard } from 'electron'
import { DropdownMixedOption, DropdownOption } from 'naive-ui/es/dropdown/src/interface'
import { handleMenuOp } from '../../model/ResModel'
const userStore = useUserStore()

const ImagesList = ref<any>([]),
    ListPage = ref<any>(1),
    ListFull = ref<boolean>(false),
    loadData = () => {
        if (ListFull.value) return
        queryImagesList(10, ListPage.value++, 1).then(res => {
            if (!res.length) ListFull.value = true
            ImagesList.value = ImagesList.value.concat(res)
        })
    },
    dataTest = () => {
        let imagesBoxEn = document.querySelector('.images-box')
        imagesBoxEn = imagesBoxEn?.parentNode as Element
        const parent = imagesBoxEn?.parentNode as Element
        if (imagesBoxEn.clientHeight < parent.clientHeight + 300) loadData()
    },
    refreshList = () => {
        ImagesList.value = []
        ListPage.value = 1
        ListFull.value = false
        loadData()
    }

onMounted(() => {
    loadData()
})

onActivated(() => {
    const len = ImagesList.value.length
    queryImagesList(len > 10 ? len : 10, 1, 1).then(res => {
        ImagesList.value = res
    })
})

const useSizes = computed(() => {
    return userStore.win.overSize.toString() + 'vh'
})

const tagType = (time: number): "info" | "success" | "warning" => {
    const t = new Date().getTime() - time
    if (t < 86400000) return 'success'
    return t < 86400000 * 7 ? 'info' : 'warning'
}

const tagCopy = (key: string) => {
    const f = userStore.format
    const exgText = f.active ? f.list[f.select].exgText : '%url'
    const text = toExgText(exgText, key, userStore.domain)
    clipboard.writeText(text)
    !f.active ? handleMenuOp(message) :
        handleMenuOp(message, f.list[f.select].name)
}

const message = useMessage()
const handleSelect = (key: string, option: DropdownOption) => {
    if (handleMenuOp(message, option.label as string) === 'copy') {
        clipboard.writeText(key)
    } else {
        changeImagesState(0, key).then(() => {
            const len = ImagesList.value.length - 1
            queryImagesList(len, 1, 1).then(res => {
                ImagesList.value = res
            })
        })
    }
}

defineExpose({
    loadData,
    refreshList
})
type Props = { op?: (key: string) => DropdownMixedOption[] }
const props = withDefaults(defineProps<Props>(), {
    op: () => []
})

</script>


<template>
    <div class="images-box">
        <div class="images-list">
            <n-dropdown size="large" trigger="hover" :options="props.op(key.image_location)" @select="handleSelect"
                :show-arrow="true" v-for="(key, index) in ImagesList" :key="index">
                <div class="images-item">
                    <div class="item-pos">
                        <n-image class="select-img" lazy object-fit="cover" :src="'https://' + key.image_location"
                            :on-load="index + 1 == ImagesList.length ? dataTest : () => { }" fallback-src="./33.png" />
                        <n-tag class="select-tag" :strong="true" :bordered="false" size="small"
                            @click="tagCopy(key.image_location)" :type="tagType(key.create_time)">{{
                                    lastTime(key.create_time) + ' ' + bytesToSize(key.image_size)
                            }}
                        </n-tag>
                    </div>
                </div>
            </n-dropdown>
        </div>
        <div class="images-con">
            <div class="images-view">
                <n-space vertical>
                    <n-slider v-model:value="userStore.win.overSize" :step="1" :min="20" :max="80" :tooltip="false" />
                </n-space>
            </div>
        </div>
        <div class="images-box-back">
            <n-back-top :right="30" />
        </div>
    </div>
</template>


<style>
.images-box {
    width: 100%;
    height: 100%;
}

.images-con {
    justify-content: center;
    position: absolute;
    display: flex;
    bottom: 10px;
    width: 100%;
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

.images-view {
    padding: 0 10px;
    width: 200px;
    background-color: rgba(146, 146, 146, 0.178);
    backdrop-filter: blur(6px);
    border-radius: 20px;
}

.images-list {
    position: relative;
    margin: 0 auto;
    display: flex;
    flex-wrap: wrap;
}

.images-item:hover {
    border: 2px dashed rgba(20, 161, 81, 0.664);
}

.images-item {
    display: flex;
    flex: 1 0 v-bind(useSizes);
    max-width: calc(v-bind(useSizes) + (v-bind(useSizes)/3));
    height: v-bind(useSizes);
    min-width: 140px;
    min-height: 120px;
    margin: 6px;
    box-sizing: border-box;
    border: 2px solid rgba(0, 0, 0, 0.034);
    transition: all .5s;
}

.item-pos {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
}

.select-img {
    width: 100%;
    height: 100%;
    position: relative;
}

.item-pos .n-tag {
    text-shadow: 0 0 1px #00000050;
    background-color: #e3f3e7cc !important;
    border-radius: 0 8px 0 0/0 8px 0 0;
}

.select-tag {
    cursor: pointer;
    position: absolute;
    left: 0;
    bottom: 0;
    backdrop-filter: blur(3px);
}

.select-img img {
    width: 100%;
}

.n-image:not(.n-image--preview-disabled) {
    cursor: default !important;
}
</style>