<script setup lang='ts'>
import { NSpace, NInput, NButton, NIcon, NDivider, NTag, useMessage, NTooltip } from 'naive-ui';
import { ref, computed, onMounted, watch } from 'vue';
import { useConfigStore } from '../../stores/UseConfigStore';
import { HelpCircleSharp } from '@vicons/ionicons5';
import { 
  saveExgFinish, 
  addExgFinish, 
  addExgError, 
  addExgLong, 
  exgExistErroe 
} from '../../utils/message';
import { mConsole } from '../../main';

const message = useMessage();
const configStore = useConfigStore();

const url = 'https://example.com/image.png';
const name = ref('');
const exgText = ref('');

// 获取格式列表
const formatList = ref<Array<{name: string; exgText: string}>>([]);

// 加载数据
const loadFormatList = () => {
  mConsole.log("加载格式列表", configStore.uiConfig.format.list);
  formatList.value = configStore.uiConfig.format.list || [];
}

// 组件挂载时，加载格式列表
onMounted(() => {
  loadFormatList();
});

// 监听configStore中format.list的变化
watch(() => configStore.uiConfig.format.list, (newList) => {
  if (newList) {
    mConsole.log("ConfigStore format.list变化", newList);
    loadFormatList();
  }
}, { deep: true });

// 格式化预览
const exgc = computed(() => {
  const value = exgText.value || '';
  const exg = /([\S\s]*)%url([\S\s]*)/;
  return value.replace(exg, `$1${url}$2`);
});

// 检查名称是否存在
const errname = computed(() => {
  const n = name.value.replace(/(^\s*)|(\s*$)/g, '');
  const isRepeat = formatList.value.filter(v => v.name == n);
  return isRepeat.length > 0;
});

// 选择已有格式
const selectExg = (key: typeof formatList.value[0]) => {
  name.value = key.name;
  exgText.value = key.exgText;
};

// 移除格式
const handleClose = (index: number) => {
  formatList.value.splice(index, 1);
  saveToStore();
};

// 添加新格式
const addExgText = () => {
  name.value = name.value.replace(/(^\s*)|(\s*$)/g, '');
  if (name.value === '') return addExgError(message);
  if (name.value.length > 20) return addExgLong(message);
  if (!exgText.value.match(/%url/)) return exgExistErroe(message);
  
  const item = { name: name.value, exgText: exgText.value };
  formatList.value.push(item);
  saveToStore();
  addExgFinish(message);

  // 清空输入
  name.value = '';
  exgText.value = '';
};

// 保存格式
const saveExgText = () => {
  const index = formatList.value.map(v => v.name).indexOf(name.value);
  if (index >= 0) {
    formatList.value[index].exgText = exgText.value;
    saveToStore();
    saveExgFinish(message);
  }
};

// 保存到配置存储
const saveToStore = () => {
  configStore.saveUiConfig({
    format: {
      ...configStore.uiConfig.format,
      list: formatList.value
    }
  });
};

// 打开帮助链接
/* const openHelp = () => {
  const url = 'https://github.com/your-username/imsheet-tauri/wiki/format-guide';
  window.open(url, '_blank');
}; */
</script>

<template>
  <div class="format-edit-i">
    <n-space vertical>
      <n-input v-model:value="exgc" type="textarea" placeholder="示例 ![](https://example.com/image.png)" :autosize="{
        minRows: 3,
        maxRows: 5
      }" readonly />
      
      <n-input v-model:value="exgText" type="textarea" placeholder="示例 ![](%url)" :autosize="{
        minRows: 3,
        maxRows: 5
      }" />
      
      <n-input v-model:value="name" type="text" placeholder="别名 markdown" />
      
      <div class="format-commit">
        <div class="que-icon" style="display: flex; align-items: center;">
          <span>%url</span>
          <n-tooltip placement="right" trigger="hover">
            <template #trigger>
              <n-icon size="18">
                <help-circle-sharp />
              </n-icon>
            </template>
            <span>
              在格式中使用 %url 作为图片URL的占位符。
              例如：![](%url) 会被替换为 ![](https://example.com/image.png)
            </span>
          </n-tooltip>
        </div>
        
        <div class="exg-con">
          <n-button v-show="errname" type="primary" @click="saveExgText" style="margin-right: 6px;">
            保存
          </n-button>
          <n-button type="primary" @click="addExgText" :disabled="errname">
            {{ errname ? '已存在' : '添加' }}
          </n-button>
        </div>
      </div>
      
      <n-divider dashed />
      
      <div class="format-list">
        <n-tag type="success" class="format-item" size="small" closable @close="handleClose(index)"
          v-for="(key, index) in formatList" :key="index">
          <span @click="selectExg(key)">{{ key.name }}</span>
        </n-tag>
      </div>
    </n-space>
  </div>
</template>

<style>
.format-edit-i {
  padding: 20px;
}

.format-commit {
  padding: 0 2px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.format-list {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
}

.format-item {
  margin: 0 6px 6px 0;
  cursor: pointer;
}
</style>