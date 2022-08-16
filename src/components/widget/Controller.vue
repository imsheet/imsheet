<script setup lang='ts'>
import TrayCon from './TrayCon.vue';
import WebpCon from './WebpCon.vue';
import RenameCon from './RenameCon.vue';
import FormatCon from './FormatCon.vue';
import ImagesDBState from './ImagesDBState.vue';


</script>


<template>
    <div class="widget-box" style="display:flex; -webkit-app-region: no-drag; -webkit-user-select: none;">
        <images-d-b-state />
        <webp-con />
        <rename-con />
        <format-con />
        <div class="region-con"></div>
        <tray-con />
    </div>
</template>


<style>
.widget-box {
    display: flex;
    align-items: center;
    width: 100%;
}
.region-con {
    flex-grow: 1;
    display: flex;
    height: 40px;
    margin-right: auto;
    -webkit-app-region: drag;
}
</style>