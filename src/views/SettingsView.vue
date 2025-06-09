<script setup lang="ts">
import { reactive, onMounted, /* computed */ } from 'vue'
import { useRouter } from 'vue-router'
import { useConfigStore } from '../stores/UseConfigStore'
import { CosConfig } from '../services/CosService'
import { dbSyncService } from '../services/DbSyncService'
import { 
  NCard, 
  NTabs, 
  NTabPane, 
  NForm, 
  NFormItem, 
  NInput, 
  NButton, 
  // NIcon, 
  // NSwitch, 
  // NTooltip,
  useMessage,
  useDialog 
} from 'naive-ui'
import { mConsole } from '../main'
// import { HelpCircleSharp } from '@vicons/ionicons5'

const router = useRouter()
const configStore = useConfigStore()
const message = useMessage()
const dialog = useDialog()


const formValue = reactive<CosConfig>({
  APPID: '',
  SecretId: '',
  SecretKey: '',
  Bucket: '',
  Region: '',
  Domain: '',
  Dir: ''
})

// 加载已有配置
onMounted(() => {
  configStore.loadConfig()
  if (configStore.cosConfig) {
    Object.assign(formValue, configStore.cosConfig)
  }
})

// 智能刷新页面函数
const refreshPageOrNavigate = async () => {
  const currentRoute = router.currentRoute.value;
  
  if (currentRoute.path === '/') {
    // 如果当前在主页，强制刷新页面数据
    mConsole.log('当前在主页，强制刷新页面数据');
    // 这里可以发送事件给主页组件刷新数据，或者强制刷新整个页面
    window.location.reload();
  } else {
    // 如果不在主页，跳转到主页
    mConsole.log('跳转到主页');
    await router.push('/');
  }
}

// 保存COS配置
const handleSaveConfig = async (e: MouseEvent) => {
  e.preventDefault()
  configStore.setGlobalLoading(true)

  try {
    // 验证必填字段
    if (!formValue.SecretId || !formValue.SecretKey || !formValue.Bucket || !formValue.Region) {
      message.error('请填写必填字段')
      configStore.setGlobalLoading(false)
      return
    }

    // 保存配置
    const result = await configStore.saveCosConfig(formValue)
    
    if (result.success) {
      message.success('配置已保存')
      
      // 添加调试信息
      mConsole.log('当前配置:', formValue)
      mConsole.log('检查云端数据库...')
      
      // 检查云端数据库是否存在
      const existsDb = await dbSyncService.checkCloudDbExists()
      
      mConsole.log('云端数据库检测结果:', existsDb)
      
      if (existsDb) {
        // 云端存在数据库，询问是否拉取（对应原项目的 checkImagesDB 逻辑）
        dialog.warning({
          title: '发现云端数据库',
          content: '检测到云端已存在数据库，是否拉取现有数据？',
          positiveText: '拉取现有数据',
          negativeText: '取消',
          onPositiveClick: async () => {
            const pullResult = await configStore.confirmConfig('pull')
            
            if (pullResult.success) {
              message.success(pullResult.message)
              await refreshPageOrNavigate()
            } else {
              message.error(pullResult.message)
            }
            
            configStore.setGlobalLoading(false)
          },
          onNegativeClick: () => {
            // 用户取消拉取，但配置已保存，可以直接进入主页
            refreshPageOrNavigate()
            configStore.setGlobalLoading(false)
          }
        })
      } else {
        // 云端不存在数据库，询问是否创建（对应原项目的 createImagesDB 逻辑）
        dialog.warning({
          title: '创建新数据库',
          content: '未发现云端数据库，是否创建新的空数据库？',
          positiveText: '创建新数据库',
          negativeText: '取消',
          onPositiveClick: async () => {
            const createResult = await configStore.confirmConfig('create')
            
            if (createResult.success) {
              message.success(createResult.message)
              await refreshPageOrNavigate()
            } else {
              message.error(createResult.message)
            }
            
            configStore.setGlobalLoading(false)
          },
          onNegativeClick: () => {
            // 用户取消创建，但配置已保存，可以直接进入主页
            refreshPageOrNavigate()
            configStore.setGlobalLoading(false)
          }
        })
      }
    } else {
      message.error(result.message)
      configStore.setGlobalLoading(false)
    }
  } catch (error) {
    mConsole.error('保存配置失败:', error)
    message.error('配置保存失败，请检查网络或配置信息')
    configStore.setGlobalLoading(false)
  }
}

// WebP和重命名功能控制
// 检查WebP组件是否应该显示
// const webpDisplay = computed(() => configStore.uiConfig.webp?.display || false)
// 检查WebP功能是否启用
// const webpEnabled = computed(() => configStore.uiConfig.webp?.enabled || false)
// WebP质量
// const webpQuality = computed(() => configStore.uiConfig.webp?.quality || 80)

// 检查Rename组件是否应该显示
// const renameDisplay = computed(() => configStore.uiConfig.rename?.display || false)
// 检查Rename功能是否启用
// const renameEnabled = computed(() => configStore.uiConfig.rename?.enabled !== undefined ? configStore.uiConfig.rename.enabled : true)

// 切换WebP组件显示/隐藏
/* const toggleWebpDisplay = (value: boolean) => {
  configStore.saveUiConfig({
    webp: {
      display: value,
      enabled: webpEnabled.value,
      quality: webpQuality.value
    }
  })
  
  // 显示消息提示
  if (value) {
    message.success('已显示WebP转换控件')
  } else {
    message.info('已隐藏WebP转换控件')
  }
} */

// 切换WebP功能启用/禁用
// const toggleWebpEnabled = (value: boolean) => {
//   configStore.saveUiConfig({
//     webp: {
//       display: webpDisplay.value,
//       enabled: value,
//       quality: webpQuality.value
//     }
//   })
  
//   // 显示消息提示
//   if (value) {
//     message.success('已启用WebP转换')
//   } else {
//     message.info('已关闭WebP转换')
//   }
// }

// 切换Rename组件显示/隐藏
/* const toggleRenameDisplay = (value: boolean) => {
  configStore.saveUiConfig({
    rename: {
      display: value,
      enabled: renameEnabled.value
    }
  })
  
  // 显示消息提示
  if (value) {
    message.success('已显示重命名控件')
  } else {
    message.info('已隐藏重命名控件')
  }
} */

// 切换Rename功能启用/禁用
// const toggleRenameEnabled = (value: boolean) => {
//   configStore.saveUiConfig({
//     rename: {
//       display: renameDisplay.value,
//       enabled: value
//     }
//   })
  
//   // 显示消息提示
//   if (value) {
//     message.success('已启用自动重命名')
//   } else {
//     message.info('已关闭自动重命名')
//   }
// }

// 打开外部链接
// const openExternalLink = (url: string) => {
//   window.open(url, '_blank')
// }
</script>

<template>
  <n-card :bordered="false">
    <n-tabs class="card-tabs" default-value="cos" size="large" animated style="margin: 0 -4px"
      pane-style="padding-left: 4px; padding-right: 4px; box-sizing: border-box;">
      <n-tab-pane name="cos" tab="腾讯云 - COS" style="display: flex; flex-direction: column;">
          <n-form :model="formValue" inline style="min-width: 360px;" show-require-mark>
            <n-form-item label="SecretId - 密钥ID">
              <n-input v-model:value="formValue.SecretId" style="width: 800px;" placeholder="SecretId" />
            </n-form-item>
            <n-form-item label="SecretKey - 密钥Key">
              <n-input v-model:value="formValue.SecretKey" style="width: 800px;" type="password" placeholder="SecretKey" />
            </n-form-item>
          </n-form>
          <n-form :model="formValue" inline style="min-width: 360px;" show-require-mark>
            <n-form-item label="Bucket - 存储桶">
              <n-input v-model:value="formValue.Bucket" style="width: 800px;" placeholder="Bucket" />
            </n-form-item>
            <n-form-item label="Region - 所在域">
              <n-input v-model:value="formValue.Region" style="width: 800px;" placeholder="Region" />
            </n-form-item>
          </n-form>
          <n-form :model="formValue" inline style="min-width: 360px;">
            <n-form-item label="Domain - 域名[自定义]">
              <n-input v-model:value="formValue.Domain" style="width: 800px;" placeholder="https://a.cn 或 a.cn" />
            </n-form-item>
            <n-form-item label="Dir - 指定存储路径">
              <n-input v-model:value="formValue.Dir" style="width: 800px;" placeholder="lovely or lovely/cat" />
            </n-form-item>
          </n-form>
          <n-button type="primary" block secondary strong @click="handleSaveConfig" style="min-width: 360px;">
            保存
          </n-button>
          
          <!-- 功能控制区域 - 按照原项目样式 -->
          <!-- <div class="widget-conf" style="margin-top: 20px;"> -->
            <!-- <div class="widget-webp widget-item">
              <span style="margin-right: 6px; cursor:default;">WebP 格式控件</span>
              <div class="webp-too" style="display:flex; margin-right:auto">
                <n-tooltip placement="right" trigger="hover" content-style="padding: 0;">
                  <template #trigger>
                    <n-icon size="18">
                      <help-circle-sharp />
                    </n-icon>
                  </template>
                  显示或隐藏WebP格式转化控件
                </n-tooltip>
              </div>
              <n-switch v-model:value="webpDisplay" @update:value="toggleWebpDisplay" />
            </div> -->
            <!-- <div class="widget-webp widget-item" style="margin-top: 10px;">
              <span style="margin-right: 6px; cursor:default;">WebP 转换功能</span>
              <div class="webp-too" style="display:flex; margin-right:auto">
                <n-tooltip placement="right" trigger="hover" content-style="padding: 0;">
                  <template #trigger>
                    <n-icon size="18">
                      <help-circle-sharp />
                    </n-icon>
                  </template>
                  依托腾讯万象数据云端服务 [每月免费额度 10TB]
                  <span 
                    style="text-decoration:underline; cursor: pointer; color: #18a058;"
                    @click="openExternalLink('https://cloud.tencent.com/document/product/460/47503')"
                  >详情</span>
                </n-tooltip>
              </div>
              <n-switch v-model:value="webpEnabled" @update:value="toggleWebpEnabled" />
            </div> -->
            <!-- <div class="widget-rename widget-item" style="margin-top: 10px;">
              <span style="margin-right: 6px; cursor:default;">重命名控件</span>
              <div class="rename-too" style="display:flex; margin-right:auto">
                <n-tooltip placement="right" trigger="hover" content-style="padding: 0;">
                  <template #trigger>
                    <n-icon size="18">
                      <help-circle-sharp />
                    </n-icon>
                  </template>
                  显示或隐藏重命名控件
                </n-tooltip>
              </div>
              <n-switch v-model:value="renameDisplay" @update:value="toggleRenameDisplay" />
            </div> -->
            <!-- <div class="widget-rename widget-item" style="margin-top: 10px;">
              <span style="margin-right: 6px; cursor:default;">重命名功能</span>
              <div class="rename-too" style="display:flex; margin-right:auto">
                <n-tooltip placement="right" trigger="hover" content-style="padding: 0;">
                  <template #trigger>
                    <n-icon size="18">
                      <help-circle-sharp />
                    </n-icon>
                  </template>
                  时间戳格式命名文件，如果你想了解它如何运作？
                  <span 
                    style="text-decoration:underline; cursor: pointer; color: #18a058;"
                    @click="openExternalLink('https://github.com/your-username/imsheet-tauri/wiki/rename')"
                  >详情</span>
                </n-tooltip>
              </div>
              <n-switch v-model:value="renameEnabled" @update:value="toggleRenameEnabled" />
            </div> -->
          <!-- </div> -->
        </n-tab-pane>
        
        <n-tab-pane name="about" tab="关于 - About">
          <div style="padding: 20px; text-align: center;">
            <h2>ImSheet</h2>
            <p>一个简单高效的图片管理工具</p>
            <p style="color: #606060;">从 Electron 迁移到 Tauri 版本</p>
          </div>
        </n-tab-pane>
      </n-tabs>
  </n-card>
</template>

<style>
.widget-item {
  min-width: 360px;
  display: flex;
  align-items: center;
}

.widget-conf {
  border-top: 1px dashed #ccc;
  padding-top: 15px;
}
</style>