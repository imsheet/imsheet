<script setup lang='ts'>
import { useRouter } from 'vue-router'
import { h, ref, Component } from 'vue'
import { NIcon, NMenu } from 'naive-ui'
import type { MenuOption } from 'naive-ui'
import {
    CloudUpload,
    ExtensionPuzzle,
    Images,
    FileTray
} from '@vicons/ionicons5'

function renderIcon(icon: Component) {
    return () => h(NIcon, null, { default: () => h(icon) })
}

const router = useRouter()
const tolink = () => {
    router.push(activeKey.value!)
}

const menuOptions: MenuOption[] = [
    {
        label: '主页',
        key: '/',
        icon: renderIcon(CloudUpload)
    },
    {
        label: '图库',
        key: '/GalleryPage',
        icon: renderIcon(Images)
    },
    {
        label: '回收',
        key: '/RecyclePage',
        icon: renderIcon(FileTray)
    },
    {
        label: '配置',
        key: '/SetCon',
        icon: renderIcon(ExtensionPuzzle)
    }
]

const activeKey = ref<string | null>('/')

defineExpose({
    activeKey,
    tolink
})
</script>


<template>
    <n-menu v-model:value="activeKey" :root-indent="36" :indent="12" :options="menuOptions" @click="tolink" />
</template>


<style>
</style>