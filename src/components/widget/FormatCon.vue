<script setup lang='ts'>
import { NIcon, NPopselect, NButton, NDrawer, NDrawerContent, DrawerPlacement, NScrollbar } from 'naive-ui'
import { computed, onMounted, ref, watch } from 'vue'
import FormatEdit from './FormatEdit.vue'
import { useUserStore } from '../../store/userStore'
import { getCosConfig } from '../../ipc/node-api';
import { CosConfig } from '../../cond/cloud.conf';


const userStore = useUserStore()

const value = ref('')

const options = computed(() => {
    return userStore.format.list.map(v => ({ label: v.name, value: v.exgText }))
})

const exgIndex = computed(() => {
    return userStore.format.list.map(v => v.exgText).indexOf(value.value)
})

const formatOpen = () => {
    userStore.format.active = !userStore.format.active
}

const formatActive = () => {
    userStore.format.active = true
}

watch(exgIndex, () => {
    userStore.format.select = exgIndex.value
    exgIndex.value < 0 ? userStore.format.active = false : ''
})

const active = ref(false)
const placement = ref<DrawerPlacement>('right')
const activate = (place: DrawerPlacement) => {
    active.value = true
    placement.value = place
}

onMounted(() => {
    getCosConfig().then((c: CosConfig) => {
        if (c && c.user) {
            c.user.format.select < 0 ?
                userStore.format.active = false :
                userStore.format.active = true
            value.value = c.user.format.list
                .map((v: any) => v.exgText)[c.user.format.select]
        }
    })
})
</script>


<template>
    <div class="format-box">
        <n-popselect v-model:value="value" :options="options" size="medium" scrollable v-on:update-value="formatActive">
            <div class="format-icon"
                style="position: relative; display: flex; justify-content: center; align-items: center;"
                @click="formatOpen">
                <!-- <span style="position: relative;">s</span> -->
                <n-icon size="20" style="cursor:pointer; position: relative;">
                    <svg v-show="userStore.format.active" xmlns="http://www.w3.org/2000/svg"
                        xmlns:xlink="http://www.w3.org/1999/xlink" fill="none" version="1.1" width="72" height="72"
                        viewBox="0 0 72 72">
                        <g style="mix-blend-mode:passthrough">
                            <g>
                                <g style="mix-blend-mode:passthrough"></g>
                                <g style="mix-blend-mode:passthrough">
                                    <path
                                        d="M25.484375,21.53125L25.484375,33.12505L43.624975,33.12505L43.624975,42.56245L25.484375,42.56245L25.484375,62.00005L14.546875,62.00005L14.546875,12.03125L50.499975,12.03125L50.499975,21.53125L25.484375,21.53125Z"
                                        fill="#18a058" fill-opacity="1" />
                                    <path
                                        d="M25.484375,21.53125L25.484375,33.12505L43.624975,33.12505L43.624975,42.56245L25.484375,42.56245L25.484375,62.00005L14.546875,62.00005L14.546875,12.03125L50.499975,12.03125L50.499975,21.53125L25.484375,21.53125Z"
                                        fill="#000000" fill-opacity="0.20000000298023224" />
                                </g>
                            </g>
                        </g>
                    </svg>
                    <svg v-show="!userStore.format.active" xmlns="http://www.w3.org/2000/svg"
                        xmlns:xlink="http://www.w3.org/1999/xlink" fill="none" version="1.1" width="72" height="72"
                        viewBox="0 0 72 72">
                        <g style="mix-blend-mode:passthrough">
                            <g>
                                <g style="mix-blend-mode:passthrough"></g>
                                <g style="mix-blend-mode:passthrough">
                                    <path
                                        d="M25.484375,21.53125L25.484375,33.12505L43.624975,33.12505L43.624975,42.56245L25.484375,42.56245L25.484375,62.00005L14.546875,62.00005L14.546875,12.03125L50.499975,12.03125L50.499975,21.53125L25.484375,21.53125Z"
                                        fill="#ecf0f1" fill-opacity="1" />
                                    <path
                                        d="M25.484375,21.53125L25.484375,33.12505L43.624975,33.12505L43.624975,42.56245L25.484375,42.56245L25.484375,62.00005L14.546875,62.00005L14.546875,12.03125L50.499975,12.03125L50.499975,21.53125L25.484375,21.53125Z"
                                        fill="#000000" fill-opacity="0.20000000298023224" />
                                </g>
                            </g>
                        </g>
                    </svg>
                </n-icon>
                <strong v-show="userStore.format.active"
                    style="position:absolute; top: 10px; left: 12px; font-size: 10px; color: #12703e;">{{ exgIndex + 1
                    }}</strong>
            </div>

            <template #action>
                <div class="format-edit" style="display: flex">
                    <n-button strong dashed type="primary" style="flex-grow: 1;" @click="activate('left')">
                        管理
                    </n-button>
                </div>
            </template>
        </n-popselect>
        <n-drawer :native-scrollbar="true" v-model:show="active" width="300px" :placement="placement">
            <n-drawer-content title="格式库" closable style="-webkit-app-region: no-drag;">
                <n-scrollbar>
                    <format-edit />
                </n-scrollbar>
            </n-drawer-content>
        </n-drawer>
    </div>

</template>


<style>
.format-box {
    display: flex;
    align-items: center;
}

.n-drawer-body-content-wrapper {
    padding: 0 !important;
}
</style>