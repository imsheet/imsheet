import { createRouter, createWebHashHistory } from 'vue-router'
import { emitter } from './main'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('./views/HomeView.vue'),
    meta: { requiresConfig: true }
  },
  {
    path: '/gallery',
    name: 'Gallery',
    component: () => import('./views/GalleryView.vue'),
    meta: { requiresConfig: true }
  },
  {
    path: '/recycle-bin',
    name: 'RecycleBin',
    component: () => import('./views/RecycleBinView.vue'),
    meta: { requiresConfig: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('./views/SettingsView.vue')
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 路由守卫，检查是否已配置 COS
router.beforeEach((to, from, next) => {
  from.meta = from.meta || {}
  if (to.meta.requiresConfig) {
    const configStr = localStorage.getItem('imsheet_config')
    const config = configStr ? JSON.parse(configStr) : null

    if (!config || !config.cos) {
      // 未配置 COS，重定向到设置页面
      // 发送事件通知菜单更新状态
      emitter.emit('update-menu', '/settings')
      next({ name: 'Settings' }) // 注意这里使用正确的大小写
      return
    }
  }

  next()
})

// 路由后置钩子，确保在路由变化后更新菜单状态
router.afterEach(() => {
  // 路由变化后，Vue会自动重新渲染组件，
  // 由于我们在Menu.vue中添加了watch监听route.path，
  // 所以这里不需要手动触发更新
})

export default router