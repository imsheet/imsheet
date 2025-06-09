<script setup lang='ts'>
import { NIcon, NPopover, NTimeline, NTimelineItem, NTag } from 'naive-ui'
import { Save } from '@vicons/ionicons5'
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { formatBytes } from '../../utils/tools';
import { imageService } from '../../services/ImageService';
import { useConfigStore } from '../../stores/UseConfigStore';
import { mConsole } from '../../main';
import { useMessage, useDialog } from 'naive-ui';
import { dbSyncService } from '../../services/DbSyncService';

const message = useMessage();
const dialog = useDialog();
const router = useRouter();
const configStore = useConfigStore();

const dbMsg = ref({
    gallerySize: '',
    galleryQuantity: '',
    dbSize: ''
})

const handleUpdateShow = async () => {
    try {
        // 使用与原项目完全一致的queryLocalDBMsg方法
        const res = await imageService.queryLocalDBMsg();

        // 按照原项目的数据结构解析
        const data = {
            gallerySize: formatBytes(res.rows[0].size),
            galleryQuantity: res.rows[0].quantity.toString(),
            dbSize: formatBytes(res.size) // 这里的res.size就是数据库文件的实际大小（数据种子）
        }

        dbMsg.value = data;
    } catch (error) {
        mConsole.error('获取数据库信息失败:', error);
    }
}

// 获取当前目录
const currentDir = computed(() => configStore.cosConfig?.Dir || '默认目录');

// 获取目录历史记录
const dirHistoryList = computed(() => {
    return configStore.dirHistory.map(dir => ({ name: dir }));
});

// 删除目录历史记录
const deleteDir = async (index: number) => {
    try {
        configStore.removeDirFromHistory(index);
        message.success('已删除目录记录');
    } catch (error) {
        mConsole.error('删除目录记录失败:', error);
        message.error('删除失败');
    }
}

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

// 切换目录并执行完整的 handleSaveConfig 逻辑
const setTheDir = async (dir: { name: string }) => {
    // 启用全局 loading 状态
    configStore.setGlobalLoading(true);
    
    try {
        // 检查当前配置是否完整
        if (!configStore.cosConfig) {
            mConsole.error('COS 配置不存在');
            message.error('配置不完整，请重新配置');
            configStore.setGlobalLoading(false);
            return;
        }

        // 创建新的配置，只更改目录（但先不保存）
        const newConfig = configStore.cosConfig ? { ...configStore.cosConfig, Dir: dir.name } : null;
        
        if (!newConfig) {
            message.error('配置不完整，请重新配置');
            configStore.setGlobalLoading(false);
            return;
        }
        
        // 验证必填字段
        if (!newConfig.SecretId || !newConfig.SecretKey || !newConfig.Bucket || !newConfig.Region) {
            message.error('配置信息不完整，请检查设置');
            configStore.setGlobalLoading(false);
            return;
        }

        // 先检查云端数据库是否存在（使用临时配置）
        mConsole.log('准备切换到目录:', dir.name);
        mConsole.log('检查云端数据库...');
        
        try {
            // 使用临时配置检查数据库，但不修改 store
            const existsDb = await dbSyncService.checkCloudDbExistsWithTempConfig(newConfig);
            mConsole.log('云端数据库检测结果:', existsDb);
            
            if (existsDb) {
                // 云端存在数据库，询问是否拉取
                dialog.warning({
                    title: '发现云端数据库',
                    content: `检测到目录 "${dir.name}" 已存在云端数据库，是否拉取现有数据？`,
                    positiveText: '拉取现有数据',
                    negativeText: '取消',
                    onPositiveClick: async () => {
                        try {
                            // 现在才真正保存配置
                            const result = await configStore.saveCosConfig(newConfig);
                            if (result.success) {
                                message.success(`已切换到目录: ${dir.name}`);
                                
                                const pullResult = await configStore.confirmConfig('pull');
                                
                                if (pullResult.success) {
                                    message.success(pullResult.message);
                                    await refreshPageOrNavigate();
                                } else {
                                    message.error(pullResult.message);
                                }
                            } else {
                                message.error(result.message || '保存配置失败');
                            }
                        } catch (error) {
                            mConsole.error('拉取数据失败:', error);
                            message.error('操作失败');
                        }
                        
                        configStore.setGlobalLoading(false);
                    },
                    onNegativeClick: () => {
                        // 用户取消，无需恢复配置（因为我们没有修改过 store 中的配置）
                        mConsole.log('用户取消拉取数据操作');
                        configStore.setGlobalLoading(false);
                    }
                });
            } else {
                // 云端不存在数据库，询问是否创建
                dialog.warning({
                    title: '创建新数据库',
                    content: `未发现目录 "${dir.name}" 的云端数据库，是否创建新的空数据库？`,
                    positiveText: '创建新数据库',
                    negativeText: '取消',
                    onPositiveClick: async () => {
                        try {
                            // 现在才真正保存配置
                            const result = await configStore.saveCosConfig(newConfig);
                            if (result.success) {
                                message.success(`已切换到目录: ${dir.name}`);
                                
                                const createResult = await configStore.confirmConfig('create');
                                
                                if (createResult.success) {
                                    message.success(createResult.message);
                                    await refreshPageOrNavigate();
                                } else {
                                    message.error(createResult.message);
                                }
                            } else {
                                message.error(result.message || '保存配置失败');
                            }
                        } catch (error) {
                            mConsole.error('创建数据库失败:', error);
                            message.error('操作失败');
                        }
                        
                        configStore.setGlobalLoading(false);
                    },
                    onNegativeClick: () => {
                        // 用户取消，无需恢复配置（因为我们没有修改过 store 中的配置）
                        mConsole.log('用户取消创建数据库操作');
                        configStore.setGlobalLoading(false);
                    }
                });
            }
        } catch (dbCheckError) {
            // 数据库检查失败，无需恢复配置
            mConsole.error('数据库检查失败:', dbCheckError);
            throw dbCheckError;
        }
        
    } catch (error) {
        mConsole.error('切换目录失败:', error);
        message.error('配置检查失败，请检查网络或配置信息');
        configStore.setGlobalLoading(false);
    }
}

// 组件加载时初始化数据
onMounted(() => {
    handleUpdateShow();
})
</script>

<template>
    <div class="db-state-box">
        <n-popover placement="bottom" trigger="hover" @update:show="handleUpdateShow" class="db-state-box-popover">
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
            <template #footer>
                <div class="dir-list">
                    <n-tag :type="key.name === currentDir ? 'success' : 'default'" class="dir-item" size="small"
                        :closable="key.name === currentDir ? false : true" @close="deleteDir(index)"
                        v-for="(key, index) in dirHistoryList" :key="index">
                        <span @click="key.name != currentDir && setTheDir(key)">{{ key.name }}</span>
                    </n-tag>
                </div>
            </template>
        </n-popover>
    </div>
</template>

<style>
.db-state-box {
    cursor: pointer;
    margin: 2px 10px 0 4px;
    display: flex;
}

.dir-name {
    font-weight: bold;
    margin-bottom: 4px;
}

.dir-item {
    margin: 2px;
    cursor: pointer;
}

.db-state-box-popover {
    max-width: 220px;
    overflow-y: auto;
}

.db-state-box-msg {
    display: flex;
    flex-direction: column;
}
</style>