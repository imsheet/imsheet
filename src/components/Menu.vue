<script setup lang='ts'>
import { useRouter, useRoute } from 'vue-router'
import { h, ref, Component, watch, onMounted, onUnmounted } from 'vue'
import { NIcon, NMenu } from 'naive-ui'
import type { MenuOption } from 'naive-ui'
import {
    CloudUpload,
    ExtensionPuzzle,
    Images,
    FileTray
} from '@vicons/ionicons5'
import { emitter, mConsole } from '../main'

function renderIcon(icon: Component) {
    return () => h(NIcon, null, { default: () => h(icon) })
}

const router = useRouter()
const route = useRoute()

// 菜单项定义 - 确保与实际路由路径匹配
const menuOptions: MenuOption[] = [
    {
        label: '主页',
        key: '/',
        icon: renderIcon(CloudUpload)
    },
    {
        label: '图库',
        key: '/gallery',
        icon: renderIcon(Images)
    },
    {
        label: '回收',
        key: '/recycle-bin',
        icon: renderIcon(FileTray)
    },
    {
        label: '配置',
        key: '/settings',
        icon: renderIcon(ExtensionPuzzle)
    }
]

// 根据当前路由路径设置激活的菜单项
const activeKey = ref<string | null>('/')

// 跳转函数
const tolink = () => {
    router.push(activeKey.value!)
}

// 同步路由和菜单状态的函数
const syncMenuWithRoute = () => {
    activeKey.value = route.path
    mConsole.log('同步菜单状态:', route.path)
}

// 监听路由变化，更新菜单选中状态
watch(() => route.path, (newPath) => {
    mConsole.log('路由变化:', newPath)
    activeKey.value = newPath
}, { immediate: true })

// 监听重定向事件
const handleMenuUpdate = (path: string) => {
    mConsole.log('收到菜单更新事件:', path)
    activeKey.value = path
}

// 组件挂载时注册事件监听
onMounted(() => {
    syncMenuWithRoute()
    emitter.on('update-menu', handleMenuUpdate)
})

// 组件卸载时移除事件监听
onUnmounted(() => {
    emitter.off('update-menu', handleMenuUpdate)
})

defineExpose({
    activeKey,
    tolink,
    syncMenuWithRoute
})
</script>

<template>
    <div class="menu-container">
        <n-menu v-model:value="activeKey" :options="menuOptions" :root-indent="36" :indent="12" @update:value="tolink" />
    </div>
</template>

<style scoped>
.menu-container {
    height: 100%;
    /* padding: 5px 0; */
}
</style>