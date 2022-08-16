<script setup lang='ts'>
import { ref, reactive, onMounted, toRaw } from 'vue'
import { getCosConfig, setCosConfig, queryCosDB, createImagesDB, checkImagesDB, openNewPages } from '../../ipc/node-api'
import type { CosConfig } from '../../cond/cloud.conf'
import { NCard, NTabs, NTabPane, NForm, NFormItem, NSwitch, NTooltip } from 'naive-ui'
import { useMessage, useDialog, NInput, NButton, NSpin, NIcon } from 'naive-ui'
import { confirmSave, ErrorConfig, SaveConfig } from '../../model/ResModel'
import { HelpCircleSharp } from '@vicons/ionicons5'
import Link from '../../model/Link'
import { useUserStore } from '../../store/userStore'

const userStore = useUserStore()

const message = useMessage()
const dialog = useDialog()

onMounted(() => {
    getCosConfig().then((c: CosConfig) => {
        // console.log(c)
        if (c.exist && c.c) {
            formValue.c = c.c
            formValue.exist = c.exist
        }
    })
})

const show = ref(false)

const formValue = reactive<CosConfig>({
    exist: false,
    c: {
        APPID: '',
        SecretId: '',
        SecretKey: '',
        Bucket: '',
        Region: '',
        Domain: '',
        Dir: ''
    }
})

const save = () => {
    userStore.domain = formValue.c.Domain || ''
    SaveConfig(message)
    setCosConfig(toRaw(formValue))
}

/* COS_Config */
const handleClick = async (e: MouseEvent) => {
    e.preventDefault()
    show.value = true
    let cloudExist = false
    /* COS接口连通校验 */
    try {
        cloudExist = await queryCosDB(toRaw(formValue))
    } catch (e) {
        console.log(e)
        show.value = false
        return ErrorConfig(message)
    }

    const cosConf = await getCosConfig()
    /* imagesDB 如果存在 */
    if (cloudExist) {
        /* 与旧配置有冲突 */
        if (cosConf?.c?.Bucket != formValue.c.Bucket || cosConf?.c?.Dir != formValue.c.Dir) {
            type res = { reply: Boolean, m: Function }
            const is: res = await confirmSave(message, dialog)
            /* 用户取消操作 */
            if (!is.reply) show.value = false
            if (!is.reply) return is.m()
            /* 用户确认覆盖，重建DB并保存配置 */
            checkImagesDB(toRaw(formValue)).then(r => console.log('check', r)).catch(e => console.log(e))
        }
        show.value = false
        return save()
    } else {
        show.value = false
        createImagesDB().then(r => console.table('r', r)).catch(e => console.log(e))
        save()
    }
}

const cosWebpActive = () => {
    if (userStore.toWebp.open) {
        userStore.toWebp.active = true
    }
}
const cosRenameActive = () => {
    if (userStore.rename.open) {
        userStore.rename.active = true
    }
}
</script>


<template>
    <n-card :bordered="false">
        <n-spin :show="show">
            <n-tabs class="card-tabs" default-value="signin" size="large" animated style="margin: 0 -4px"
                pane-style="padding-left: 4px; padding-right: 4px; box-sizing: border-box;">
                <n-tab-pane name="signin" tab="腾讯云 - COS" style="display: flex; flex-direction: column;">
                    <n-form :model="formValue" inline style="min-width: 360px;" show-require-mark>
                        <!-- <n-form-item label="APPID - 应用ID">
                        <n-input v-model:value="formValue.c.APPID" style="width: 200px;" />
                        </n-form-item> -->
                        <n-form-item label="SecretId - 密钥ID">
                            <n-input v-model:value="formValue.c.SecretId" style="width: 800px;"  placeholder="SecretId"/>
                        </n-form-item>
                        <n-form-item label="SecretKey - 密钥Key">
                            <n-input v-model:value="formValue.c.SecretKey" style="width: 800px;" type="password"  placeholder="SecretKey"/>
                        </n-form-item>
                    </n-form>
                    <n-form :model="formValue" inline style="min-width: 360px;" show-require-mark>
                        <n-form-item label="Bucket - 存储桶">
                            <n-input v-model:value="formValue.c.Bucket" style="width: 800px;"  placeholder="Bucket"/>
                        </n-form-item>
                        <n-form-item label="Region - 所在域">
                            <n-input v-model:value="formValue.c.Region" style="width: 800px;"  placeholder="Region"/>
                        </n-form-item>
                    </n-form>
                    <n-form :model="formValue" inline style="min-width: 360px;">
                        <n-form-item label="Domain - 域名[自定义]" placeholder="请输入sss">
                            <n-input v-model:value="formValue.c.Domain" style="width: 800px;"  placeholder="my.cn"/>
                        </n-form-item>
                        <n-form-item label="Dir - 指定存储路径">
                            <n-input v-model:value="formValue.c.Dir" style="width: 800px;"  placeholder="lovely or lovely/cat"/>
                        </n-form-item>
                    </n-form>
                    <n-button type="primary" block secondary strong @click="handleClick" style="min-width: 360px;">
                        保存
                    </n-button>
                    <div class="widget-conf" style="margin-top: 20px;">
                        <div class="widget-webp widget-item">
                            <span style="margin-right: 6px; cursor:default;">WebP 格式转化</span>
                            <div class="webp-too" style="display:flex; margin-right:auto">
                                <n-tooltip placement="right" trigger="hover" content-style="padding: 0;">
                                    <template #trigger>
                                        <n-icon size="18">
                                            <help-circle-sharp />
                                        </n-icon>
                                    </template>
                                    依托腾讯万象数据云端服务 [每月免费额度 10TB]
                                    <span style="text-decoration:underline; cursor: pointer; color: #18a058;"
                                    @click="openNewPages(Link.webp)"
                                    >详情</span>
                                </n-tooltip>
                            </div>
                            <n-switch v-model:value="userStore.toWebp.open" @update:value="cosWebpActive"/>
                        </div>
                        <div class="widget-rename widget-item" style="margin-top: 10px;">
                            <span style="margin-right: 6px; cursor:default;">Rename 重命名</span>
                            <div class="rename-too" style="display:flex; margin-right:auto">
                                <n-tooltip placement="right" trigger="hover" content-style="padding: 0;">
                                    <template #trigger>
                                        <n-icon size="18">
                                            <help-circle-sharp />
                                        </n-icon>
                                    </template>
                                    时间戳格式命名文件，如果你想了解它如何运作？
                                    <span style="text-decoration:underline; cursor: pointer; color: #18a058;"
                                    @click="openNewPages(Link.rename)"
                                    >详情</span>
                                </n-tooltip>
                            </div>
                            <n-switch v-model:value="userStore.rename.open" @update:value="cosRenameActive"/>
                        </div>
                    </div>
                </n-tab-pane>
                <n-tab-pane name="Other" tab="其他 - Other">
                    <div>暂无其他...</div>
                </n-tab-pane>
            </n-tabs>
        </n-spin>
    </n-card>
</template>


<style>
.widget-item {
    min-width: 360px;
    display: flex;
    align-items: center;
}
</style>