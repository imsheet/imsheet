<script setup lang='ts'>
import ImagesDBState from './ImagesDBState.vue';
import FormatControl from './FormatControl.vue';
import WebpCon from './WebpCon.vue';
import RenameCon from './RenameCon.vue';
import TrayCon from './TrayCon.vue';
</script>

<template>
    <div class="widget-box">
        <images-d-b-state />
        <format-control />
        <webp-con />
        <rename-con />
        <div class="region-con"></div>
        <tray-con />
    </div>
</template>

<style>
.widget-box {
    display: flex;
    align-items: center;
    width: 100%;
    -webkit-app-region: no-drag;
    -webkit-user-select: none;
    user-select: none;
}

/* 确保所有子组件都不触发拖拽 */
.widget-box > * {
    -webkit-app-region: no-drag;
}

/* 专门的拖拽区域 */
.region-con {
    flex-grow: 1;
    display: flex;
    height: 40px;
    margin-right: auto;
    -webkit-app-region: drag;
    cursor: move;
}

/* 确保所有交互元素都不触发拖拽 */
.widget-box button,
.widget-box .n-button,
.widget-box .n-switch,
.widget-box .n-popover,
.widget-box .n-popselect,
.widget-box .n-icon,
.widget-box [role="button"] {
    -webkit-app-region: no-drag !important;
    cursor: pointer !important;
}
</style>