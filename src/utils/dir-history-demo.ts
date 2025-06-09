// 目录历史记录功能演示
// 这个文件展示了如何使用新的目录历史记录功能

import { useConfigStore } from '../stores/UseConfigStore';
import { mConsole } from '../main';

export function demonstrateDirHistoryFeature() {
  mConsole.log('=== 目录历史记录功能演示 ===');
  
  const configStore = useConfigStore();
  
  // 模拟保存不同的 COS 配置，每次都有不同的 Dir
  const exampleConfigs = [
    {
      APPID: '1234567890',
      SecretId: 'test-secret-id',
      SecretKey: 'test-secret-key',
      Bucket: 'my-bucket',
      Region: 'ap-beijing',
      Dir: 'project-images'
    },
    {
      APPID: '1234567890',
      SecretId: 'test-secret-id',
      SecretKey: 'test-secret-key',
      Bucket: 'my-bucket',
      Region: 'ap-beijing',
      Dir: 'user-uploads'
    },
    {
      APPID: '1234567890',
      SecretId: 'test-secret-id',
      SecretKey: 'test-secret-key',
      Bucket: 'my-bucket',
      Region: 'ap-beijing',
      Dir: 'temp-files'
    }
  ];

  mConsole.log('模拟保存多个配置...');
  
  // 这些操作会自动将 Dir 添加到历史记录中
  exampleConfigs.forEach((config, index) => {
    mConsole.log(`模拟保存配置 ${index + 1}: Dir = "${config.Dir}"`);
    // 在实际使用中，这里会调用 configStore.saveCosConfig(config)
    // 这会自动触发 addDirToHistory(config.Dir)
  });

  mConsole.log('当前目录历史记录:', configStore.dirHistory);
  
  mConsole.log('\n=== 功能说明 ===');
  mConsole.log('1. 每次用户保存 COS 配置时，Dir 属性会自动被记录到历史记录中');
  mConsole.log('2. 在 ImagesDBState 组件的弹出框中，用户可以看到所有历史目录');
  mConsole.log('3. 点击任何历史目录，会自动切换当前 COS 配置的 Dir 并重新保存');
  mConsole.log('4. 历史记录最多保存 10 个，新的会替换最老的');
  mConsole.log('5. 可以删除不需要的历史记录项');
}
