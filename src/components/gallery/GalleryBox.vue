<script setup lang='ts'>
import { ref, computed, onMounted, watch } from 'vue'
import { NImage, NDropdown, useMessage, NSpace, NSlider, NTag, NBackTop } from 'naive-ui'
import { useUserStore } from '../../store/userStore'
import { changeImagesState, queryImagesList } from '../../ipc/node-api'
import { bytesToSize } from '../../utils/tools'
import { DropdownMixedOption, DropdownOption } from 'naive-ui/es/dropdown/src/interface'
import { clipboard } from 'electron'
import { handleMenuOp } from '../../model/ResModel'

const userStore = useUserStore()

type qureyParam = [
    pageSize: number,
    page: number,
    state: number,
    range?: Array<number>
]

const pageParam = ref<qureyParam | null>(null)

const ImagesList = ref<any>([]),
    loadData = (...args: qureyParam) => {
        queryImagesList(...args).then(res => {
            ImagesList.value = res
        })
    }


const useSize = computed(() => {
    return userStore.win.overSize.toString() + 'vh'
})
const message = useMessage()

const handleSelect = (key: string | number, option: DropdownOption) => {
    const res = handleMenuOp(message, option.label as string)
    if (res === 'copy') {
        clipboard.writeText(key.toString())
    } else if (res === 'remove') {
        changeImagesState(0, key.toString()).then(res => {
            loadData(...pageParam.value as qureyParam)
            emit('refresh')
        })
    } else if (res === 'recover') {
        changeImagesState(1, key.toString()).then(res => {
            loadData(...pageParam.value as qureyParam)
            emit('refresh')
        })
    }
}

type Props = { op?: (key: string) => DropdownMixedOption[] }
const props = withDefaults(defineProps<Props>(), {
    op: () => []
})

defineExpose({
    watchCon
})
function watchCon(...args: qureyParam) {
    pageParam.value = [...args]
    loadData(...args)
}

const emit = defineEmits(['refresh'])
</script>


<template>
    <div class="images-box">
        <div class="images-list">
            <n-dropdown size="large" trigger="hover" :options="props.op(key.image_location)" @select="handleSelect"
                :show-arrow="true" v-for="(key, index) in ImagesList" :key="index">
                <div class="image-item">
                    <div class="item-pos">
                        <n-image class="select-img" lazy object-fit="cover" :src="'https://' + key.image_location"
                            fallback-src="./33.png" />
                        <n-tag class="select-tag" :strong="true" :bordered="false" size="small">{{
                                new Date(key.create_time).toLocaleDateString() + ' ' + bytesToSize(key.image_size)
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
    </div>
</template>


<style scoped>
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

.image-item:hover {
    border: 2px dashed rgba(20, 161, 81, 0.664);
}

.image-item {
    display: flex;
    flex: 1 0 v-bind(useSize);
    max-width: calc(v-bind(useSize) + (v-bind(useSize)/3));
    height: v-bind(useSize);
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
    font-weight: bold;
    background-color: #cccccccc !important;
    border-radius: 0 8px 0 0/0 8px 0 0;
}

.select-tag {
    cursor: default;
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