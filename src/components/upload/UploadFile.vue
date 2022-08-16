<script setup lang='ts'>
import { ref } from 'vue'
import { useMessage, NUpload, NUploadDragger, NIcon, NText } from 'naive-ui'
import { UploadCustomRequestOptions } from 'naive-ui'
import type { UploadInst } from 'naive-ui'
import { CloudUpload as ArchiveIcon, } from '@vicons/ionicons5'
import { cosPush, cosProgress, removeAllListeners } from '../../ipc/node-api';
import { uploadFail, uploadFinish, uploadTypeError, uploadSizeError, handleMenuOp } from '../../model/ResModel'
import { rename, toExgText } from '../../utils/tools'
import { useUserStore } from '../../store/userStore'
import { clipboard } from 'electron'

const emit = defineEmits(['refresh'])

const userStore = useUserStore()

const upload = ref<UploadInst | null>(null)

const message = useMessage()

type uploadList = Array<{ key: string, state: number, location?: string }>
const uploadList: uploadList = []

function uploadCheckFinish(clear: () => void) {
    if (uploadCheckFinish.length == 0) return
    const tmp: uploadList = uploadList.filter(v => v!.state != 0)
    if (tmp.length == uploadList.length) {
        const f = userStore.format
        const exgText = f.active ? f.list[f.select].exgText : '%url'
        const text = uploadList.map(v => toExgText(exgText, v.location!, userStore.domain))
        clipboard.writeText(text.join(''))
        !f.active ? handleMenuOp(message) :
            handleMenuOp(message, f.list[f.select].name)
        uploadList.splice(0, tmp.length)
        emit('refresh')
        clear()
    }
}

function uploadChangeState(key: string, state: number, location?: string) {
    const i = uploadList.map(v => v.key).indexOf(key)
    uploadList[i].location = location || ''
    uploadList[i].state = state
}

const customRequest = ({
    file,
    onFinish,
    onError,
    onProgress
}: UploadCustomRequestOptions) => {
    if (!file.file) return
    const f = file.file
    if (!(/(gif|jpg|jpeg|png|webp|bmp)/i.test(f.type))) {
        uploadTypeError(message)
        return upload.value!.clear()
    }
    if (userStore.toWebp.active && f.size > 33554432) {
        uploadSizeError(message)
        return upload.value!.clear()
    }
    let name: string, headers, Suffix = f.name.match(/\.[^.]*$/)![0]
    userStore.rename.active ?
        name = rename() + Suffix :
        name = f.name
    userStore.toWebp.active ?
        headers = {
            type: 'toWebp',
            key: name.replace(/\.[^.]*$/, '.webp'),
            quality: userStore.toWebp.quality
        } :
        headers = null
    uploadList.push({ key: name, state: 0 })
    cosProgress((e, { percent, key }) => {
        if (key == name) onProgress({ percent: Math.ceil(percent * 100) })
    })
    cosPush(f.size, f.path, name, { cb: true, headers }).then(res => {
        uploadChangeState(name, 1, res.Location)
        uploadFinish(message)
        onFinish()
        removeAllListeners()
        uploadCheckFinish(upload.value!.clear)
    }).catch(err => {
        onError()
        console.log(err)
        uploadFail(message)
        uploadChangeState(name, 2)
        uploadCheckFinish(upload.value!.clear)
    })
}

</script>


<template>
    <n-upload style="" ref="upload" multiple :max="5" :custom-request="customRequest">
        <n-upload-dragger
            style="overflow: hidden; height:30vh !important;max-height: 160px; display: flex; justify-content: center; flex-direction: column;">
            <div>
                <n-icon size="48" :depth="3">
                    <archive-icon />
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