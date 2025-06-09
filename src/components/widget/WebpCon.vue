<script setup lang='ts'>
import { computed, ref, watch, watchEffect, onMounted } from 'vue';
import { NSpace, NSlider, NProgress, NPopover, NInputNumber, NIcon, useMessage } from 'naive-ui'
import { useConfigStore } from '../../stores/UseConfigStore'

// 获取配置存储
const configStore = useConfigStore()
const message = useMessage()

// WebP样式状态
const statusOn = { c: '#18a058', rc: '#18a05826', tc: '#18a058' },
      statusOff = { c: '#8b8b8b', rc: '#00000026', tc: '#8b8b8b' }

// WebP状态控制
const webpActive = ref(statusOn)
const webpEnabled = ref(false)
const webpQuality = ref(80)

// 初始化WebP设置
const initWebpSettings = () => {
  const webp = configStore.uiConfig.webp
  if (webp) {
    webpEnabled.value = webp.enabled || false
    webpQuality.value = webp.quality || 80
  }
}

// 切换WebP启用状态
const toggleWebp = () => {
  webpEnabled.value = !webpEnabled.value
  saveWebpConfig()
  
  // 显示消息提示
  if (webpEnabled.value) {
    message.success('已启用WebP转换')
  } else {
    message.info('已关闭WebP转换')
  }
}

// 保存WebP配置
const saveWebpConfig = () => {
  configStore.saveUiConfig({
    webp: {
      display: configStore.uiConfig.webp?.display || true, // 保持显示设置不变
      enabled: webpEnabled.value,
      quality: webpQuality.value
    }
  })
}

// 监听质量变化并保存
watch(webpQuality, () => {
  // 自动启用WebP转换
  if (!webpEnabled.value) {
    webpEnabled.value = true
  }
  
  // 保存配置
  saveWebpConfig()
})

// 判断是否应该显示WebP组件
const showWebpComponent = computed(() => {
  return configStore.uiConfig.webp?.display === true;
})

// 监听启用状态更新样式
watchEffect(() => {
  webpActive.value = webpEnabled.value ? statusOn : statusOff
})

// 监听配置变化
watch(() => configStore.uiConfig.webp, (newValue) => {
  if (newValue) {
    webpEnabled.value = newValue.enabled || false
    webpQuality.value = newValue.quality || 80
  }
}, { deep: true })

// 组件挂载时初始化
onMounted(() => {
  initWebpSettings()
})
</script>

<template>
  <div class="webp-box" v-if="showWebpComponent">
    <n-popover trigger="hover" :show-arrow="false">
      <template #trigger>
        <div class="progress-con" style="cursor:pointer;height: 22px;" @click="toggleWebp">
          <n-progress 
            style="width: 22px;" 
            type="circle" 
            :percentage="webpQuality"
            :color="webpActive.c" 
            :rail-color="webpActive.rc" 
            :indicator-text-color="webpActive.tc"
            :stroke-width="10" 
          />
        </div>
      </template>
      <div class="widget-webp" style="width: 200px;">
        <n-space vertical>
          <n-slider 
            v-model:value="webpQuality" 
            :step="1" 
            :min="15" 
            :max="99" 
            :tooltip="false" 
          />
        </n-space>
        <div class="webp-i">
          <n-icon size="60" style="margin:0 10px 0 6px; height: 42px; width: 100px; ">
            <svg style="position:absolute; top:-8px; left: 0;" xmlns="http://www.w3.org/2000/svg"
              xmlns:xlink="http://www.w3.org/1999/xlink" fill="none" version="1.1" width="173" height="64"
              viewBox="0 0 173 64">
              <clipPath id="master_svg0_14_4572">
                <rect x="0" y="0" width="173" height="64" rx="0" />
              </clipPath>
              <g clip-path="url(#master_svg0_14_4572)" style="mix-blend-mode:passthrough">
                <rect x="0" y="0" width="173" height="64" rx="0" fill="#FFFFFF" fill-opacity="0" />
                <g>
                  <g style="mix-blend-mode:passthrough">
                    <path
                      d="M16.6562,52L6.1562,11.5L15.843800000000002,11.5L22.1562,38.4062L22.4531,38.4062L29.75,11.5L39.75,11.5L47.5469,38.4062L47.8438,38.4062L54.1562,11.5L63.8438,11.5L52.8438,52L43.3438,52L34.9062,25.40625L34.5938,25.40625L26.1562,52L16.6562,52ZM93.75,34.75Q93.75,37.9062,93.047,40.4062L74.3438,40.4062Q75.2969,45.4062,80.1562,45.4062Q81.9531,45.4062,83.3438,44.3281Q84.75,43.25,85.5469,41.4531L92.953,44.5Q91.453,48.4062,88.0938,50.5625Q84.75,52.7031,80.0938,52.7031Q75.5,52.7031,72.0469,50.8125Q68.5938,48.9062,66.7188,45.4062Q64.8438,41.9062,64.8438,37.2031Q64.8438,32.29688,66.6719,28.65625Q68.5,25,71.875,23.03125Q75.25,21.04688,79.75,21.04688Q83.9531,21.04688,87.125,22.734375Q90.2969,24.40625,92.016,27.5Q93.75,30.59375,93.75,34.75ZM84.5938,33.0938Q84.5938,30.95312,83.2969,29.65625Q82,28.34375,79.75,28.34375Q75.6562,28.34375,74.5,33.0938L84.5938,33.0938Z"
                      fill="#3D3D3D" fill-opacity="1" />
                    <path
                      d="M96.547,52L96.547,11.5L105.547,11.5L105.547,25.25L105.844,25.25Q107.203,23.296875,109.266,22.171875Q111.344,21.04688,113.703,21.04688Q117.297,21.04688,119.969,22.953125Q122.656,24.84375,124.094,28.34375Q125.547,31.84375,125.547,36.5938Q125.547,41.5,124.094,45.1562Q122.656,48.7969,119.953,50.75Q117.25,52.7031,113.594,52.7031Q111.25,52.7031,109.219,51.5938Q107.203,50.5,105.844,48.5L105.547,48.5L105.547,52L96.547,52ZM105.344,36.9062Q105.344,40.2969,106.797,42.2969Q108.25,44.2969,110.75,44.2969Q113.344,44.2969,114.844,42.2969Q116.344,40.2969,116.344,36.9062Q116.344,33.4531,114.891,31.45312Q113.453,29.45312,110.953,29.45312Q108.344,29.45312,106.844,31.45312Q105.344,33.4531,105.344,36.9062Z"
                      fill="#2B8422" fill-opacity="1" />
                    <path
                      d="M143.406,11.5Q148.25,11.5,151.828,13.20312Q155.406,14.90625,157.344,18.07812Q159.297,21.25,159.297,25.54688Q159.297,29.79688,157.422,32.98438Q155.547,36.1562,152.062,37.8594Q148.594,39.5469,143.906,39.5469L137.75,39.5469L137.75,52L128.453,52L128.453,11.5L143.406,11.5ZM142,31.15625Q145.594,31.15625,147.688,29.65625Q149.797,28.15625,149.797,25.54688Q149.797,22.953125,147.688,21.4375Q145.594,19.90625,142,19.90625L137.75,19.90625L137.75,31.15625L142,31.15625Z"
                      fill="#3D3D3D" fill-opacity="1" />
                  </g>
                </g>
              </g>
            </svg>
          </n-icon>
          <n-input-number :min="15" :max="99" v-model:value="webpQuality" />
        </div>
      </div>
    </n-popover>
  </div>
</template>

<style>
.webp-box {
  margin: 0 8px;
  display: flex;
}

.webp-i {
  position: relative;
  display: flex;
  align-items: center;
}

.n-slider-handle {
  line-height: 1.2 !important;
  height: 12px !important;
  width: 12px !important;
}

.n-progress {
  line-height: 1;
}

.n-progress-text {
  font-size: 12px !important;
}

.n-progress-text__unit {
  display: none;
}
</style>