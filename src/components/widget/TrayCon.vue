<script setup lang='ts'>
import { NIcon } from 'naive-ui'
import { invoke } from '@tauri-apps/api/core'
import { ref, onMounted, watch } from 'vue'
import { useConfigStore } from '../../stores/UseConfigStore'
import { mConsole } from '../../main'

const configStore = useConfigStore()

// 窗口状态
const isAlwaysOnTop = ref(false)
const isMaximized = ref(false)

// 监听配置变化，自动更新置顶状态
watch(() => configStore.uiConfig.alwaysOnTop, (newValue) => {
  isAlwaysOnTop.value = newValue
}, { immediate: true })

// 初始化窗口状态
const initWindowState = async () => {
  try {
    isMaximized.value = await invoke('is_maximized') as boolean
    // 从配置中获取置顶状态
    isAlwaysOnTop.value = configStore.uiConfig.alwaysOnTop
  } catch (error) {
    mConsole.error('获取窗口状态失败:', error)
  }
}

// 最小化窗口
const minimize = async () => {
  try {
    await invoke('minimize_window')
  } catch (error) {
    mConsole.error('最小化窗口失败:', error)
  }
}

// 切换最大化
const changeWindo = async () => {
  try {
    const maximized = await invoke('toggle_maximize') as boolean
    isMaximized.value = maximized
  } catch (error) {
    mConsole.error('切换窗口最大化状态失败:', error)
  }
}

// 关闭窗口
const close = async () => {
  try {
    await invoke('close_window')
  } catch (error) {
    mConsole.error('关闭窗口失败:', error)
  }
}

// 切换置顶
const changePushpin = async () => {
  try {
    const newTopState = !isAlwaysOnTop.value
    await invoke('set_always_on_top', { alwaysOnTop: newTopState })
    
    // 更新配置存储
    configStore.saveUiConfig({ alwaysOnTop: newTopState })
    // isAlwaysOnTop.value 会通过 watch 自动更新
  } catch (error) {
    mConsole.error('设置窗口置顶失败:', error)
  }
}

// 组件挂载时初始化状态
onMounted(() => {
  initWindowState()
})
</script>

<template>
    <div class="tray-box">
        <n-icon @click="changePushpin" size="22">
            <svg v-show="isAlwaysOnTop" xmlns="http://www.w3.org/2000/svg"
                xmlns:xlink="http://www.w3.org/1999/xlink" fill="none" version="1.1" width="72" height="72"
                viewBox="0 0 72 72">
                <g style="mix-blend-mode:passthrough">
                    <g>
                        <g style="mix-blend-mode:passthrough">
                        </g>
                        <path d="M52.2857,9L52.2857,14.42857L49.5714,14.42857L49.5714,30.7143L55,38.8571L55,44.2857L38.7143,44.2857L38.7143,63.2857L33.2857,63.2857L33.2857,44.2857L17,44.2857L17,38.8571L22.42857,30.7143L22.42857,14.42857L19.71429,14.42857L19.71429,9L52.2857,9Z"
                            fill="#000000" fill-opacity="1" />
                    </g>
                </g>
            </svg>
            <svg v-show="!isAlwaysOnTop" xmlns="http://www.w3.org/2000/svg"
                xmlns:xlink="http://www.w3.org/1999/xlink" fill="none" version="1.1" width="72" height="72"
                viewBox="0 0 72 72">
                <g style="mix-blend-mode:passthrough">
                    <g>
                        <g style="mix-blend-mode:passthrough"></g>
                        <path
                            d="M63,28.0019L58.9978,32.0013L56.9981,30.0016L45,41.9997L43.0003,52.0009L38.9981,56.0003L27,43.9994L12.999369999999999,58L9,54.0006L23.0006,40L10.99969,28.0019L14.99906,23.9997L25.0032,22L37.0013,10.00189L35.001599999999996,8.0022L39.0009,4L63,28.0019Z"
                            fill="#000000" fill-opacity="1" />
                    </g>
                </g>
            </svg>
        </n-icon>
        <div class="winCon-tray" style="width: 10px; height:40px; -webkit-app-region: drag;"></div>
        <n-icon @click="minimize" size="20" style="margin-right: 2px; margin-top: 1px;">
            <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="none" version="1.1"
                width="72" height="72" viewBox="0 0 72 72">
                <defs>
                    <mask id="svg0_14_2699">
                        <g style="mix-blend-mode:passthrough">
                            <rect x="0" y="0" width="72" height="72" rx="0" fill="#FFFFFF" fill-opacity="1" />
                        </g>
                    </mask>
                </defs>
                <g style="mix-blend-mode:passthrough">
                    <g>
                        <g style="mix-blend-mode:passthrough"></g>
                    </g>
                    <g mask="url(#svg0_14_2699)">
                        <g style="mix-blend-mode:passthrough" transform="matrix(-1,0,0,-1,150,124)">
                            <path
                                d="M117.6318,67.32272L114,62L110.3682,67.32272L84.31895,105.5L80.22501,111.5L147.775,111.5L143.68099999999998,105.5L117.6318,67.32272ZM114,72.6454L136.4174,105.5L91.5826,105.5L114,72.6454Z"
                                fill-rule="evenodd" fill="#000000" fill-opacity="1" />
                        </g>
                    </g>
                </g>
            </svg>
        </n-icon>
        <n-icon size="21" @click="changeWindo">
            <svg v-show="!isMaximized" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
                fill="none" version="1.1" width="72" height="72" viewBox="0 0 72 72">
                <g style="mix-blend-mode:passthrough">
                    <g>
                        <g style="mix-blend-mode:passthrough"></g>
                        <g style="mix-blend-mode:passthrough">
                            <ellipse cx="36" cy="37" rx="24" ry="24" fill-opacity="0" stroke-opacity="1"
                                stroke="#000000" stroke-width="6" fill="none" stroke-dasharray="" />
                        </g>
                    </g>
                </g>
            </svg>

            <svg v-show="isMaximized" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
                fill="none" version="1.1" width="72" height="72" viewBox="0 0 72 72">
                <g style="mix-blend-mode:passthrough">
                    <g>
                        <g style="mix-blend-mode:passthrough"></g>
                        <g style="mix-blend-mode:passthrough">
                            <ellipse cx="36" cy="37" rx="24" ry="24" fill-opacity="0" stroke-opacity="1"
                                stroke="#000000" stroke-width="6" fill="none" stroke-dasharray="" />
                        </g>
                        <g style="mix-blend-mode:passthrough">
                            <ellipse cx="36" cy="37" rx="16.5" ry="16.5" fill-opacity="0" stroke-opacity="1"
                                stroke="#000000" stroke-width="3" fill="none" stroke-dasharray="" />
                        </g>
                    </g>
                </g>
            </svg>
        </n-icon>
        <n-icon @click="close" size="20">
            <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="none" version="1.1"
                width="72" height="72" viewBox="0 0 72 72">
                <g style="mix-blend-mode:passthrough">
                    <g>
                        <g style="mix-blend-mode:passthrough"></g>
                        <path
                            d="M36.49985546875,31.020808056640625L55.68115546875,11.839509904380625L61.16035546875,17.318758056640625L41.979055468750005,36.500008056640624L61.16035546875,55.681308056640624L55.68115546875,61.16050805664062L36.49985546875,41.979308056640626L17.31860546875,61.16050805664062L11.83935731649,55.681308056640624L31.02055546875,36.500008056640624L11.83935546875,17.318758056640625L17.31860546875,11.839508056640625L36.49985546875,31.020808056640625Z"
                            fill="#000000" fill-opacity="1" />
                    </g>
                </g>
            </svg>
        </n-icon>
    </div>
</template>

<style>
.tray-box {
    display: flex;
    align-items: center;
    margin-right: 10px;
    width: 120px;
    justify-content: space-between;
}

.tray-box i {
    cursor: pointer;
    padding: 3px;
    border-radius: 21px;
    transition: all .2s;
    -webkit-app-region: no-drag;
}

.tray-box i:hover {
    background-color: rgba(34, 34, 34, 0.08);
}
</style>