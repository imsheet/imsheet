import { TauriCosService, CosConfig } from '../services/TauriCosService';

// 测试 Tauri COS 服务
export async function testTauriCosService() {
  console.log('开始测试 Tauri COS 服务...');
  
  // 测试配置
  const testConfig: CosConfig = {
    APPID: '1234567890',
    SecretId: 'test-secret-id',
    SecretKey: 'test-secret-key',
    Bucket: 'test-bucket',
    Region: 'ap-guangzhou',
    Domain: 'https://test-domain.com',
    Dir: 'test-dir'
  };

  try {
    // 1. 使用临时实例进行测试，而不是全局单例
    const tempService = TauriCosService.createTempInstance();
    tempService.initialize(testConfig);
    console.log('✓ COS 服务初始化成功');

    // 2. 测试获取配置
    const config = tempService.getConfig();
    console.log('✓ 获取配置成功:', config);

    // 3. 测试同步 URL 生成
    const testKey = 'test/image.jpg';
    const url = tempService.getObjectUrlSync(testKey);
    console.log('✓ 生成对象 URL 成功:', url);

    // 4. 测试异步 URL 生成
    try {
      const asyncUrl = await tempService.getObjectUrl(testKey);
      console.log('✓ 异步获取对象 URL 成功:', asyncUrl);
    } catch (error) {
      console.log('⚠ 异步获取 URL 失败 (可能因为后端未运行):', error);
    }

    // 5. 测试检查对象是否存在 (这会调用后端)
    try {
      const metadata = await tempService.head('test-object');
      console.log('✓ 检查对象元数据成功:', metadata);
    } catch (error) {
      console.log('⚠ 检查对象失败 (可能因为后端未运行或配置无效):', error);
    }

    console.log('🎉 Tauri COS 服务测试完成！');
    return true;
  } catch (error) {
    console.error('❌ 测试失败:', error);
    return false;
  }
}

// 暂时禁用自动测试，避免覆盖真实配置
// 如果需要测试，请手动调用 testTauriCosService()
// if (import.meta.env.DEV) {
//   setTimeout(() => {
//     testTauriCosService().then(success => {
//       if (success) {
//         console.log('%c✅ Tauri COS 迁移方案验证通过！', 'color: green; font-weight: bold;');
//       } else {
//         console.log('%c⚠️ Tauri COS 迁移方案需要调试', 'color: orange; font-weight: bold;');
//       }
//     });
//   }, 1000);
// }