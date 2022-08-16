<script setup lang='ts'>
import { NIcon, NPopover, NTimeline, NTimelineItem } from 'naive-ui'
import { Save } from '@vicons/ionicons5'
import { queryLocalDBMsg } from '../../ipc/node-api';
import { ref } from 'vue';
import { bytesToSize } from '../../utils/tools';

const dbMsg = ref({
    gallerySize: '',
    galleryQuantity: '',
    dbSize: ''
})
const handleUpdateShow = () => {
    queryLocalDBMsg().then(res => {
        let data = {
            gallerySize: bytesToSize(res.rows[0].size),
            galleryQuantity: res.rows[0].quantity,
            dbSize: bytesToSize(res.size),
        }
        dbMsg.value = data
    })
}

</script>


<template>
    <div class="db-state-box">
        <n-popover placement="bottom" trigger="hover" @update:show="handleUpdateShow">
            <template #trigger>
                <n-icon size="16">
                    <Save />
                </n-icon>
            </template>
            <div class="db-state-box-msg">
                <n-timeline>
                    <n-timeline-item type="success" :title="'图库占用：' + dbMsg.gallerySize" />
                    <n-timeline-item type="success" :title="'图库总数：' + dbMsg.galleryQuantity + '张'" />
                    <n-timeline-item type="success" :title="'数据种子：' + dbMsg.dbSize" />
                </n-timeline>
            </div>
        </n-popover>
    </div>
</template>


<style>
.db-state-box {
    cursor: pointer;
    margin: 2px 10px 0 4px;
    display: flex;
}

.db-state-box-msg {
    display: flex;
    flex-direction: column;
}
</style>