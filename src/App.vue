<script setup lang="ts">
import Menu from './components/Menu.vue'
import { NLayout, NLayoutHeader, NLayoutSider } from 'naive-ui'
import { changeWin, getCosConfig, getWinSize, setCosConfig, setWinSize } from './ipc/node-api'
import { onMounted, ref } from 'vue'
import Controller from './components/widget/Controller.vue'
import { useUserStore } from './store/userStore'
import { CosConfig } from './cond/cloud.conf'
import { throttle } from './utils/tools'

const userStore = useUserStore()

const collapsed = ref(false)
const MenuRef = ref<any>(null)

let oldMaxWin = false
let oldCollapsed = false
let oldOverSize = 20
const handleMinWin = async () => {
  const winSize = await getWinSize() // w336 h350
  const win = userStore.win
  MenuRef.value.activeKey = '/'
  MenuRef.value.tolink()
  if (winSize[0] != 336 || winSize[1] != 350 || !collapsed.value) {
    oldMaxWin = win.maxWin
    oldCollapsed = collapsed.value
    oldOverSize = win.overSize
    changeWin(false)
    win.w = winSize[0]
    win.h = winSize[1]
    win.top = true
    collapsed.value = true
    win.overSize = 30
    setWinSize(336, 350)
  } else {
    win.top = false
    collapsed.value = oldCollapsed
    win.overSize = oldOverSize
    oldMaxWin ? changeWin(true) :
      setWinSize(win.w, win.h)
  }
}

onMounted(() => {
  getCosConfig().then((c: CosConfig) => {
    if (c && c.user) userStore.$state = c.user
  })
})

const saveUserConfig = throttle(()=> {
  getCosConfig().then((c: CosConfig) => {
    c.user = userStore.getState
    setCosConfig(c)
  })
}, 1000)

userStore.$subscribe(() => {
  saveUserConfig()
})

</script>

<template>
  <n-message-provider>
    <n-dialog-provider>
      <n-layout style="height: 100vh">
        <n-layout-header class="imsheet-headers" style="height: 40px;display:flex; align-items: center;" bordered>
          <div style="font-size: 20px; font-weight:bold; margin-left:12px; display:flex; user-select:none;">
            I
            <span class="min-win" @click="handleMinWin">m</span>
            Sheet
          </div>
          <controller />
        </n-layout-header>
        <n-layout position="absolute" style="top: 40px;" has-sider>
          <n-layout-sider show-trigger="arrow-circle" @collapse="collapsed = true" @expand="collapsed = false"
            :collapsed-width="10" :width="150" :native-scrollbar="false" bordered :collapsed="collapsed">
            <Menu ref="MenuRef"></Menu>
          </n-layout-sider>
          <n-layout content-style="height: calc(100vh - 40px)" :native-scrollbar="false">
            <router-view v-slot="{ Component }">
              <keep-alive exclude="SetCon">
                <component :is="Component" />
              </keep-alive>
            </router-view>
          </n-layout>
        </n-layout>
      </n-layout>
    </n-dialog-provider>
  </n-message-provider>
</template>

<style>
*::selection {
  background: #18a058;
  color: aliceblue;
}

.n-text {
  cursor: default;
}

.imsheet-headers {
  -webkit-app-region: drag;
  cursor: pointer;
}

.n-layout-toggle-button {
  top: 160px !important;
}

.min-win {
  -webkit-app-region: no-drag;
  cursor: pointer;
}

.min-win:hover {
  color: #187744;
}
</style>
