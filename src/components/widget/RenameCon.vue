<script setup lang='ts'>
import { NIcon, NPopover, NText } from 'naive-ui'
import { useUserStore } from '../../store/userStore'

const userStore = useUserStore()

const renameOpen = () => {
    userStore.rename.active = !userStore.rename.active
}

</script>


<template>
    <div class="rename-box" v-show="userStore.rename.open">
        <n-popover trigger="hover" raw :show-arrow="false">
            <template #trigger>
                <n-icon size="20" style="cursor:pointer;" @click="renameOpen">
                    <svg v-show="userStore.rename.active" xmlns="http://www.w3.org/2000/svg"
                        xmlns:xlink="http://www.w3.org/1999/xlink" fill="none" version="1.1" width="72" height="72"
                        viewBox="0 0 72 72">
                        <g style="mix-blend-mode:passthrough">
                            <g>
                                <g style="mix-blend-mode:passthrough"></g>
                                <g style="mix-blend-mode:passthrough">
                                    <path
                                        d="M14.54688,12.0312L31.25,12.0312L46.9375,47.75L47.375,47.75L47.375,12.0312L58.1094,12.0312L58.1094,62L43.0625,62L25.7812,23.98438L25.3438,23.98438L25.3438,62L14.54688,62L14.54688,12.0312Z"
                                        fill="#18a058" fill-opacity="1" />
                                    <path
                                        d="M14.54688,12.0312L31.25,12.0312L46.9375,47.75L47.375,47.75L47.375,12.0312L58.1094,12.0312L58.1094,62L43.0625,62L25.7812,23.98438L25.3438,23.98438L25.3438,62L14.54688,62L14.54688,12.0312Z"
                                        fill="#000000" fill-opacity="0.20000000298023224" />
                                </g>
                            </g>
                        </g>
                    </svg>
                    <svg v-show="!userStore.rename.active" xmlns="http://www.w3.org/2000/svg"
                        xmlns:xlink="http://www.w3.org/1999/xlink" fill="none" version="1.1" width="72" height="72"
                        viewBox="0 0 72 72">
                        <g style="mix-blend-mode:passthrough">
                            <g>
                                <g style="mix-blend-mode:passthrough"></g>
                                <g style="mix-blend-mode:passthrough">
                                    <path
                                        d="M14.54688,12.0312L31.25,12.0312L46.9375,47.75L47.375,47.75L47.375,12.0312L58.1094,12.0312L58.1094,62L43.0625,62L25.7812,23.98438L25.3438,23.98438L25.3438,62L14.54688,62L14.54688,12.0312Z"
                                        fill="#ecf0f1" fill-opacity="1" />
                                    <path
                                        d="M14.54688,12.0312L31.25,12.0312L46.9375,47.75L47.375,47.75L47.375,12.0312L58.1094,12.0312L58.1094,62L43.0625,62L25.7812,23.98438L25.3438,23.98438L25.3438,62L14.54688,62L14.54688,12.0312Z"
                                        fill="#000000" fill-opacity="0.20000000298023224" />
                                </g>
                            </g>
                        </g>
                    </svg>
                </n-icon>
            </template>
            <n-text style="color: darkslategrey; width: 200px; padding: 6px 10px; background-color: aliceblue;">
                当你想要随机命名的时候可以选择它</n-text>
        </n-popover>
    </div>

</template>


<style>
.rename-box {
    display: flex;
    align-items: center;
}
</style>