<script setup lang='ts'>
import { NSpace, NInput, NButton, NIcon, NDivider, NTag, useMessage, NTooltip } from 'naive-ui';
import { computed, ref } from 'vue';
import { useUserStore } from '../../store/userStore'
import { saveExgFinish, addExgFinish, addExgError, addExgLong, exgExistErroe } from '../../model/ResModel'
import { HelpCircleSharp } from '@vicons/ionicons5'
import Link from '../../model/Link'
import { openNewPages } from '../../ipc/node-api'

const message = useMessage()

const active = ref(false)

const url = 'https://your.com/images.png',
    name = ref(''),
    exgText = ref('')

const userStore = useUserStore()
const exgList = userStore.format.list

const exgc = computed(() => {
    const value = exgText.value || '',
        exg = /([\S\s]*)%url([\S\s]*)/
    return value.replace(exg, `$1${url}$2`)
})

const errname = computed(() => {
    const n = name.value.replace(/(^\s*)|(\s*$)/g, '')
    const isRepeat = exgList.filter(v => v.name == n)
    return isRepeat.length > 0
})

const selectExg = (key: typeof exgList[0]) => {
    name.value = key.name
    exgText.value = key.exgText
}

const handleClose = (index: number) => {
    exgList.splice(index, 1)
}

const addExgText = () => {
    name.value = name.value.replace(/(^\s*)|(\s*$)/g, '')
    if (name.value === '') return addExgError(message)
    if (name.value.length > 20) return addExgLong(message)
    if (!exgText.value.match(/%url/)) return exgExistErroe(message)
    const item = { name: name.value, exgText: exgText.value }
    exgList.push(item)
    addExgFinish(message)
}

const saveExgText = () => {
    const index = exgList.map(v => v.name).indexOf(name.value)
    exgList[index].name = name.value
    exgList[index].exgText = exgText.value
    saveExgFinish(message)
}
</script>


<template>
    <div class="format-edit-i">
        <n-space vertical>
            <n-input v-model:value="exgc" :disabled="!active" type="textarea"
                placeholder="示例 ![](https://your.cn/img.png)" :autosize="{
                    minRows: 3,
                    maxRows: 5
                }" />
            <n-input v-model:value="exgText" type="textarea" placeholder="示例 ![](%url)" :autosize="{
                minRows: 3,
                maxRows: 5
            }" />
            <n-input v-model:value="name" type="text" placeholder="别名 markdown" />
            <div class="format-commit">
                <div class="que-icon" style="display: flex; align-items: center;">
                    <span>%url</span>
                    <n-tooltip placement="right" trigger="hover" content-style="padding: 0;">
                        <template #trigger>
                            <n-icon size="18">
                                <help-circle-sharp />
                            </n-icon>
                        </template>
                        如果您不了解怎么使用 请点击我
                        <span style="text-decoration:underline; cursor: pointer; color: #18a058;"
                            @click="openNewPages(Link.format)">详情</span>
                    </n-tooltip>
                </div>
                <div class="exg-con">
                    <n-button v-show="errname" type="primary" @click="saveExgText" style="margin-right: 6px;">
                        保存
                    </n-button>
                    <n-button type="primary" @click="addExgText" :disabled="errname">{{ errname ? '已存在' : '添加' }}
                    </n-button>
                </div>
            </div>
            <n-divider dashed />
            <div class="format-list">
                <n-tag type="success" class="format-item" size="small" closable @close="handleClose(index)"
                    v-for="(key, index) in exgList" :key="index">
                    <span @click="selectExg(key)">{{ key.name }}</span>
                </n-tag>
            </div>
        </n-space>
    </div>
</template>


<style>
.format-edit-i {
    padding: 20px;
}

.format-commit {
    padding: 0 2px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.format-list {
    width: 100%;
    display: flex;
    flex-wrap: wrap
}

.format-item {
    margin: 0 6px 6px 0;
    cursor: pointer;
}
</style>