import { sqliteService } from './SqliteService';
import { tauriCosService } from './TauriCosService';
import { dbSyncService } from './DbSyncService';
import { useConfigStore } from '../stores/UseConfigStore';
import { rename } from '../utils/tools';
import { mConsole } from '../main';
import { appDataDir, join } from '@tauri-apps/api/path';
import { exists, stat } from '@tauri-apps/plugin-fs';

export interface ImageInfo {
  id?: number;
  image_name: string;
  image_location: string;
  image_path: string;
  image_size: number;
  image_state: number;
  create_time: number;
}

export class ImageService {
  private static instance: ImageService;
  // 修复：使用返回boolean的锁类型
  private dbOperationLock: Promise<boolean> = Promise.resolve(true);
  
  private constructor() {}
  
  static getInstance(): ImageService {
    if (!ImageService.instance) {
      ImageService.instance = new ImageService();
    }
    return ImageService.instance;
  }
  
  // 上传图片 - 修复数据库操作同步
  async uploadImage(file: File, onProgress?: (progress: any) => void): Promise<boolean> {
    try {
      mConsole.log('开始上传图片:', file.name);
      
      // 获取配置存储实例
      const configStore = useConfigStore();
      
      // 生成文件名
      const fileName = this.generateFileName(file.name);
      
      // 准备上传选项，包含WebP配置
      const uploadOptions = this.prepareUploadOptions(configStore);
      
      // 上传到 COS
      const uploadResult = await tauriCosService.push(file, fileName, onProgress, uploadOptions);
      
      // 保存到数据库 - 使用互斥锁确保数据库操作的原子性
      const imageInfo: ImageInfo = {
        image_name: fileName,
        image_location: uploadResult.Location,
        image_path: uploadResult.Key || fileName,
        image_size: uploadResult.size || file.size,
        image_state: 1, // 正常状态
        create_time: Date.now()
      };
      
      // 等待之前的数据库操作完成，然后执行当前操作
      this.dbOperationLock = this.dbOperationLock.then(async () => {
        try {
          return await this.saveImageToDatabase(imageInfo);
        } catch (error) {
          mConsole.error('数据库操作失败:', error);
          return false;
        }
      });
      
      const success = await this.dbOperationLock;
      
      if (success) {
        mConsole.log('图片上传成功:', fileName);
        return true;
      } else {
        mConsole.error('保存到数据库失败');
        return false;
      }
      
    } catch (error) {
      mConsole.error('上传图片失败:', error);
      return false;
    }
  }

  // 新增：处理拖拽上传
  async uploadImageFromDrag(file: File, onProgress?: (progress: any) => void): Promise<boolean> {
    try {
      mConsole.log('开始处理拖拽上传图片:', file.name);
      
      // 获取配置存储实例
      const configStore = useConfigStore();
      
      // 生成文件名
      const fileName = this.generateFileName(file.name);
      
      // 准备上传选项，包含WebP配置
      const uploadOptions = this.prepareUploadOptions(configStore);
      
      // 使用拖拽上传方法上传到 COS
      const uploadResult = await tauriCosService.handleDragUpload(file, fileName, onProgress, uploadOptions);
      
      // 保存到数据库 - 使用互斥锁确保数据库操作的原子性
      const imageInfo: ImageInfo = {
        image_name: fileName,
        image_location: uploadResult.Location,
        image_path: uploadResult.Key || fileName,
        image_size: uploadResult.size || file.size,
        image_state: 1, // 正常状态
        create_time: Date.now()
      };
      
      // 等待之前的数据库操作完成，然后执行当前操作
      this.dbOperationLock = this.dbOperationLock.then(async () => {
        try {
          return await this.saveImageToDatabase(imageInfo);
        } catch (error) {
          mConsole.error('数据库操作失败:', error);
          return false;
        }
      });
      
      const success = await this.dbOperationLock;
      
      if (success) {
        mConsole.log('拖拽上传图片成功:', fileName);
        return true;
      } else {
        mConsole.error('保存到数据库失败');
        return false;
      }
      
    } catch (error) {
      mConsole.error('拖拽上传图片失败:', error);
      return false;
    }
  }

  // 新增：准备上传选项，包含WebP配置
  private prepareUploadOptions(configStore: any) {
    const webpConfig = configStore.uiConfig.webp;
    const uploadOptions: any = {};

    // 如果启用了WebP转换，使用腾讯云万象云端处理
    if (webpConfig?.enabled) {
      const quality = webpConfig.quality || 80;
      
      // 传递WebP配置参数，让TauriCosService动态构建pic_operations
      uploadOptions.webp = {
        enabled: true,
        quality: quality
      };

      mConsole.log('WebP压缩配置 (腾讯云万象处理):', { quality, enabled: true });
    }

    return uploadOptions;
  }

  // 获取图片列表
  async getImagesList(page: number, pageSize: number, state: number, dateRange?: [number, number]): Promise<ImageInfo[]> {
    try {
      const offset = (page - 1) * pageSize;
      let sql = `
        SELECT * FROM imsheet 
        WHERE image_state = ? 
      `;
      const params: any[] = [state];
      
      // 添加日期范围查询
      if (dateRange && dateRange.length === 2) {
        sql += ` AND create_time BETWEEN ? AND ? `;
        params.push(dateRange[0], dateRange[1]);
      }
      
      sql += ` ORDER BY create_time DESC LIMIT ? OFFSET ? `;
      params.push(pageSize, offset);
      
      const images = await sqliteService.all(sql, params);
      return images as ImageInfo[];
    } catch (error) {
      mConsole.error('获取图片列表失败:', error);
      return [];
    }
  }

  // 获取图片数量
  async getImagesCount(state: number, dateRange?: [number, number]): Promise<number> {
    try {
      let sql = `SELECT COUNT(*) as count FROM imsheet WHERE image_state = ?`;
      const params: any[] = [state];
      
      // 添加日期范围查询
      if (dateRange && dateRange.length === 2) {
        sql += ` AND create_time BETWEEN ? AND ?`;
        params.push(dateRange[0], dateRange[1]);
      }
      
      const result = await sqliteService.get(sql, params);
      return result?.count || 0;
    } catch (error) {
      mConsole.error('获取图片数量失败:', error);
      return 0;
    }
  }

  // 移动到回收站（改变状态为0，更新时间）
  async moveToRecycleBin(imageId: number): Promise<boolean> {
    try {
      // 与原electron项目的changeImagesState逻辑一致
      const currentTime = Date.now();
      const sql = `
        UPDATE imsheet 
        SET image_state = 0, create_time = ? 
        WHERE id = ?
      `;
      
      await sqliteService.run(sql, [currentTime, imageId]);
      
      // 同步数据库到云端
      await dbSyncService.syncToCloud();
      
      mConsole.log('图片已移到回收站:', imageId);
      return true;
    } catch (error) {
      mConsole.error('移动到回收站失败:', error);
      return false;
    }
  }

  // 从回收站恢复（改变状态为1，更新时间）
  async restoreFromRecycleBin(imageId: number): Promise<boolean> {
    try {
      // 与原electron项目的changeImagesState逻辑一致
      const currentTime = Date.now();
      const sql = `
        UPDATE imsheet 
        SET image_state = 1, create_time = ? 
        WHERE id = ?
      `;
      
      await sqliteService.run(sql, [currentTime, imageId]);
      
      // 同步数据库到云端
      await dbSyncService.syncToCloud();
      
      mConsole.log('图片已从回收站恢复:', imageId);
      return true;
    } catch (error) {
      mConsole.error('从回收站恢复失败:', error);
      return false;
    }
  }

  // 清空回收站（与原electron项目的deleteImages逻辑完全一致）
  async emptyRecycleBin(): Promise<boolean> {
    try {
      mConsole.log('开始清空回收站...');
      
      // 1. 先同步云端数据库，确保数据一致性
      await dbSyncService.syncFromCloud();
      
      // 2. 查询所有回收站中的图片
      const recycleBinImages = await sqliteService.all(
        'SELECT * FROM imsheet WHERE image_state = 0'
      ) as ImageInfo[];
      
      if (!recycleBinImages || recycleBinImages.length === 0) {
        mConsole.log('回收站为空，无需清理');
        // 仍需同步数据库
        await dbSyncService.syncToCloud();
        return true;
      }
      
      mConsole.log(`回收站中有 ${recycleBinImages.length} 张图片需要删除`);
      
      // 3. 计算需要删除的总大小
      const totalSize = recycleBinImages.reduce((sum, img) => sum + (img.image_size || 0), 0);
      const totalCount = recycleBinImages.length;
      
      // 4. 准备要删除的 COS 对象键
      const cosKeys = recycleBinImages.map(img => img.image_path);
      
      // 5. 从 COS 批量删除文件
      mConsole.log('从 COS 删除文件:', cosKeys);
      await tauriCosService.delete(cosKeys);
      
      // 6. 从数据库删除记录
      await sqliteService.run('DELETE FROM imsheet WHERE image_state = 0');
      
      // 7. 优化数据库（释放空间）
      await sqliteService.run('VACUUM');
      
      // 8. 更新统计信息（减去删除的大小和数量）
      await this.updateStatistics(-totalSize, -totalCount);
      
      // 9. 同步数据库到云端
      await dbSyncService.syncToCloud();
      
      mConsole.log(`回收站清空完成，删除了 ${totalCount} 张图片，释放了 ${totalSize} 字节空间`);
      return true;
      
    } catch (error) {
      mConsole.error('清空回收站失败:', error);
      return false;
    }
  }

  // 永久删除单张图片
  async permanentlyDeleteImage(imageId: number): Promise<boolean> {
    try {
      // 1. 获取图片信息
      const image = await sqliteService.get(
        'SELECT * FROM imsheet WHERE id = ? AND image_state = 0', 
        [imageId]
      ) as ImageInfo;
      
      if (!image) {
        mConsole.error('图片不存在或不在回收站中');
        return false;
      }
      
      // 2. 从 COS 删除文件
      await tauriCosService.deleteObject(image.image_path);
      
      // 3. 从数据库删除记录
      await sqliteService.run('DELETE FROM imsheet WHERE id = ?', [imageId]);
      
      // 4. 更新统计信息
      await this.updateStatistics(-image.image_size, -1);
      
      // 5. 同步数据库到云端
      await dbSyncService.syncToCloud();
      
      mConsole.log('图片已永久删除:', imageId);
      return true;
    } catch (error) {
      mConsole.error('永久删除图片失败:', error);
      return false;
    }
  }

  // 获取图片URL
  // 获取图片URL - 修复兼容旧项目数据的问题和自定义域名前缀
  getImageUrl(image: ImageInfo): string {
    // 如果 image_location 已经是完整URL，直接返回
    if (image.image_location.startsWith('http')) {
      return image.image_location;
    }
    
    // 兼容旧项目数据：检查是否需要构建URL
    // 旧项目的image_path可能已经包含了Dir前缀，新项目构建时会重复添加
    const configStore = useConfigStore();
    const cosConfig = configStore.cosConfig;
    
    if (!cosConfig) {
      console.warn('COS配置未初始化，直接返回image_location');
      return image.image_location;
    }
    
    // 如果配置了Dir，检查image_path是否已经包含了Dir前缀
    if (cosConfig.Dir) {
      const dirPrefix = cosConfig.Dir.endsWith('/') ? cosConfig.Dir : `${cosConfig.Dir}/`;
      
      // 如果image_path已经包含Dir前缀，直接构建URL，避免重复添加
      if (image.image_path.startsWith(dirPrefix) || image.image_path.startsWith('ImSheet/')) {
        // 旧数据，直接构建URL
        let url: string;
        if (cosConfig.Domain) {
          // 修复：确保自定义域名包含协议前缀
          let domain = cosConfig.Domain;
          if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
            domain = `https://${domain}`;
          }
          // 移除末尾的斜杠
          domain = domain.replace(/\/+$/, '');
          url = `${domain}/${image.image_path}`;
        } else {
          url = `https://${cosConfig.Bucket}.cos.${cosConfig.Region}.myqcloud.com/${image.image_path}`;
        }
        mConsole.log('使用旧数据格式构建URL:', { image_path: image.image_path, url });
        return url;
      }
    }
    
    // 新数据或者没有Dir配置，使用COS服务构建URL（会自动添加前缀）
    const url = tauriCosService.getObjectUrlSync(image.image_path);
    mConsole.log('使用新数据格式构建URL:', { image_path: image.image_path, url });
    return url;
  }

  // 新增：获取应用自定义域名的图片URL（用于复制功能）
  getImageUrlWithCustomDomain(image: ImageInfo): string {
    const originalUrl = this.getImageUrl(image);
    const configStore = useConfigStore();
    const customDomain = configStore.cosConfig?.Domain;
    
    // 如果没有自定义域名，直接返回原始URL
    if (!customDomain) {
      return originalUrl;
    }
    
    // 确保自定义域名格式正确
    let domain = customDomain;
    if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
      domain = `https://${domain}`;
    }
    
    // 移除末尾的斜杠
    domain = domain.replace(/\/+$/, '');
    
    // 替换原始URL的域名部分
    const urlWithCustomDomain = originalUrl.replace(/^https?:\/\/[^\/]+/, domain);
    
    mConsole.log('应用自定义域名:', { 
      original: originalUrl, 
      customDomain: domain, 
      result: urlWithCustomDomain 
    });
    
    return urlWithCustomDomain;
  }

  // 搜索图片
  async searchImages(keyword: string, page: number, pageSize: number, state = 1): Promise<ImageInfo[]> {
    try {
      const offset = (page - 1) * pageSize;
      const sql = `
        SELECT * FROM imsheet 
        WHERE image_state = ? AND image_name LIKE ?
        ORDER BY create_time DESC 
        LIMIT ? OFFSET ?
      `;
      
      const images = await sqliteService.all(sql, [state, `%${keyword}%`, pageSize, offset]);
      return images as ImageInfo[];
    } catch (error) {
      mConsole.error('搜索图片失败:', error);
      return [];
    }
  }

  // 获取统计信息
  async getStatistics() {
    try {
      const result = await sqliteService.get(
        'SELECT size, quantity, last_hash FROM imsheet_statistical WHERE id = 1'
      );
      return result || { size: 0, quantity: 0, last_hash: 'null' };
    } catch (error) {
      mConsole.error('获取统计信息失败:', error);
      return { size: 0, quantity: 0, last_hash: 'null' };
    }
  }

  // 与原项目完全一致的queryLocalDBMsg方法
  async queryLocalDBMsg() {
    try {
      // 1. 从统计表获取图库占用大小和数量
      const rows = await sqliteService.all(
        'SELECT * FROM imsheet_statistical WHERE id = 1'
      );
      
      // 2. 获取数据库文件的实际大小（数据种子）
      const dbSize = await this.getDbFileSize();
      
      // 3. 返回与原项目完全相同的数据结构
      return {
        rows: rows,
        size: dbSize
      };
    } catch (error) {
      mConsole.error('获取数据库信息失败:', error);
      return {
        rows: [{ size: 0, quantity: 0, last_hash: 'null' }],
        size: 0
      };
    }
  }

  // 获取数据库文件大小
  private async getDbFileSize(): Promise<number> {
    try {
      // 使用Tauri文件系统API获取数据库文件大小
      const appDir = await appDataDir();
      // 修正：使用join方法正确拼接路径
      const dbPath = await join(appDir, 'imsheet.db');
      
      mConsole.log('尝试获取数据库文件大小:', dbPath);
      
      // 首先检查文件是否存在
      const fileExists = await exists(dbPath);
      mConsole.log('数据库文件是否存在:', fileExists);
      
      if (!fileExists) {
        mConsole.log('数据库文件不存在，返回0');
        return 0;
      }
      
      const fileStats = await stat(dbPath);
      mConsole.log('数据库文件统计信息:', fileStats);
      return fileStats.size;
    } catch (error) {
      mConsole.error('获取数据库文件大小失败:', error);
      return 0;
    }
  }

  // 保存图片到数据库
  private async saveImageToDatabase(imageInfo: ImageInfo): Promise<boolean> {
    try {
      // 1. 先同步云端数据库
      await dbSyncService.syncFromCloud();
      
      // 2. 插入图片记录
      const sql = `
        INSERT INTO imsheet (image_name, image_location, image_path, image_size, image_state, create_time)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      await sqliteService.run(sql, [
        imageInfo.image_name,
        imageInfo.image_location,
        imageInfo.image_path,
        imageInfo.image_size,
        imageInfo.image_state,
        imageInfo.create_time
      ]);
      
      // 3. 更新统计信息
      await this.updateStatistics(imageInfo.image_size, 1);
      
      // 4. 同步数据库到云端
      await dbSyncService.syncToCloud();
      
      return true;
    } catch (error) {
      mConsole.error('保存图片到数据库失败:', error);
      return false;
    }
  }

  // 更新统计信息（与原electron项目的updateImagesDB逻辑一致）
  private async updateStatistics(sizeChange: number, countChange: number): Promise<void> {
    try {
      // 获取当前统计信息
      const current = await sqliteService.get(
        'SELECT size, quantity FROM imsheet_statistical WHERE id = 1'
      );
      
      if (current) {
        const newSize = current.size + sizeChange;
        const newQuantity = current.quantity + countChange;
        
        await sqliteService.run(
          'UPDATE imsheet_statistical SET size = ?, quantity = ? WHERE id = 1',
          [newSize, newQuantity]
        );
      }
    } catch (error) {
      mConsole.error('更新统计信息失败:', error);
    }
  }

  // 生成文件名
  private generateFileName(originalName: string): string {
    // 获取配置存储实例
    const configStore = useConfigStore();
    
    const originalExtension = originalName.split('.').pop() || 'jpg';
    
    let fileName: string;
    
    // 检查是否启用重命名
    if (configStore.uiConfig.rename?.enabled) {
      // 使用与原Electron项目完全相同的重命名算法
      fileName = rename();
    } else {
      // 使用原始文件名（去掉扩展名）+ 随机数
      const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.'));
      const random = Math.floor(Math.random() * 1000000);
      fileName = `${nameWithoutExt}_${random}`;
    }
    
    // 确定最终的文件扩展名
    let finalExtension = originalExtension;
    
    // 如果启用了WebP转换，将扩展名改为webp（与原Electron项目逻辑一致）
    const webpConfig = configStore.uiConfig.webp;
    if (webpConfig?.enabled) {
      finalExtension = 'webp';
      mConsole.log('WebP已启用，文件扩展名改为webp');
    }
    
    const finalFileName = `${fileName}.${finalExtension}`;
    mConsole.log('生成文件名:', { original: originalName, generated: finalFileName });
    
    return finalFileName;
  }
}

export const imageService = ImageService.getInstance();