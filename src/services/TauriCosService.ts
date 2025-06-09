import { invoke } from '@tauri-apps/api/core';
import { mConsole } from '../main';
import { appDataDir, join } from '@tauri-apps/api/path';
import { mkdir, readFile, remove, writeFile } from '@tauri-apps/plugin-fs';

// 导入类型定义
export interface CosConfig {
  APPID: string;
  SecretId: string;
  SecretKey: string;
  Bucket: string;
  Region: string;
  Domain?: string;
  Dir?: string;
}

export interface UploadOptions {
  callback?: string;
  headers?: CosHeaders;
}

export interface CosHeaders {
  content_type?: string;
  pic_operations?: string;
}

export interface UploadResult {
  success: boolean;
  key: string;
  url: string;
  etag?: string;
  size: number;
}

export interface DownloadResult {
  success: boolean;
  file_path: string;
  size: number;
}

export interface DeleteResult {
  success: boolean;
  deleted_count: number;
  failed_keys: string[];
}

export interface ObjectMetadata {
  exists: boolean;
  size?: number;
  etag?: string;
  last_modified?: string;
  content_type?: string;
}

export interface ListObjectsResult {
  objects: ObjectInfo[];
  is_truncated: boolean;
  next_marker?: string;
}

export interface ObjectInfo {
  key: string;
  size: number;
  etag: string;
  last_modified: string;
}

// 新增：上传进度接口
export interface UploadProgress {
  percent: number;
  loaded: number;
  total: number;
  stage: 'preparing' | 'uploading' | 'completed' | 'error';
}

// 新增：上传选项类型
export interface PushUploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  contentType?: string;
  headers?: CosHeaders;
  webp?: {
    enabled: boolean;
    quality: number;
  };
}

// 新增：COS 错误类型
export class CosError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'CosError';
  }
}

// Tauri COS 管理器
export class TauriCosService {
  private static instance: TauriCosService;
  private config: CosConfig | null = null;
  private readonly isDev = import.meta.env.DEV;

  private constructor() {}

  static getInstance(): TauriCosService {
    if (!TauriCosService.instance) {
      TauriCosService.instance = new TauriCosService();
    }
    return TauriCosService.instance;
  }

  // 新增：静态方法创建临时实例用于验证
  static createTempInstance(): TauriCosService {
    return new TauriCosService();
  }

  // 私有方法：安全日志输出
  private log(message: string, data?: any): void {
    if (this.isDev) {
      mConsole.log(`[TauriCosService] ${message}`, data);
    }
  }

  private logError(message: string, error?: any): void {
    mConsole.error(`[TauriCosService] ${message}`, error);
  }

  // 构建万象云处理头部
  private buildPicOperationsHeader(key: string, quality: number): string {
    // 重要：fileid 必须与上传的 ObjectKey 完全一致，这样万象云会覆盖原图
    // 而不是创建两个文件（原图 + WebP图）
    const picOperations = {
      "is_pic_info": 0,
      "rules": [{
        "fileid": key,  // 必须与上传的key一致，万象云会用WebP格式覆盖原文件
        "rule": `imageMogr2/format/webp/quality/${quality}!`
      }]
    };
    
    mConsole.log('万象云WebP处理配置:', { originalKey: key, quality });
    return JSON.stringify(picOperations);
  }

  // 初始化 COS
  initialize(config: CosConfig): void {
    this.config = config;
    this.log('COS 服务初始化成功');
    this.log('配置详情', { ...config, SecretKey: '***' }); // 隐藏敏感信息
  }

  // 重置配置（用于清除可能的测试配置）
  resetConfig(): void {
    this.config = null;
    this.log('COS 配置已重置');
  }

  // 获取配置
  getConfig(): CosConfig | null {
    return this.config;
  }

  // 上传文件
  async upload(filePath: string, key: string, options?: UploadOptions): Promise<UploadResult> {
    if (!this.config) {
      throw new CosError('COS 未初始化', 'NOT_INITIALIZED');
    }

    try {
      const result = await invoke<UploadResult>('cos_upload', {
        filePath,
        key,
        options,
        config: this.config
      });
      mConsole.log('上传结果:', result);
      return result;
    } catch (error) {
      this.logError('上传失败', error);
      throw new CosError(`上传失败: ${error}`, 'UPLOAD_FAILED', undefined, error);
    }
  }

  // 下载文件
  async download(key: string, savePath: string): Promise<DownloadResult> {
    if (!this.config) {
      throw new Error('COS 未初始化');
    }

    try {
      const result = await invoke<DownloadResult>('cos_download', {
        key,
        savePath,
        config: this.config
      });
      return result;
    } catch (error) {
      throw new Error(`下载失败: ${error}`);
    }
  }

  // 检查对象是否存在
  async head(key: string): Promise<ObjectMetadata> {
    if (!this.config) {
      throw new Error('COS 未初始化');
    }

    try {
      const result = await invoke<ObjectMetadata>('cos_head_object', {
        key,
        config: this.config
      });
      return result;
    } catch (error) {
      throw new Error(`检查对象失败: ${error}`);
    }
  }

  // 批量删除
  async delete(keys: string[]): Promise<DeleteResult> {
    if (!this.config) {
      throw new Error('COS 未初始化');
    }

    // 预处理 keys - 确保使用正确的路径格式
    const processedKeys = keys.map(key => {
      // 如果 key 已经包含完整路径信息，直接使用
      if (key.includes('/')) {
        return key;
      }
      
      // 否则使用 getFullKey 构建完整路径
      return this.getFullKey(key);
    });

    mConsole.log('删除操作 - 原始keys:', keys);
    mConsole.log('删除操作 - 处理后keys:', processedKeys);

    try {
      const result = await invoke<DeleteResult>('cos_delete_multiple', {
        keys: processedKeys,
        config: this.config
      });
      
      mConsole.log('删除结果:', result);
      return result;
    } catch (error) {
      mConsole.error('批量删除失败:', error);
      throw new Error(`删除失败: ${error}`);
    }
  }

  // 单个文件删除方法
  async deleteObject(key: string): Promise<boolean> {
    try {
      const result = await this.delete([key]);
      return result.success && result.deleted_count > 0;
    } catch (error) {
      mConsole.error('删除单个对象失败:', error);
      return false;
    }
  }

  // 列出对象
  async listObjects(prefix?: string, maxKeys?: number): Promise<ListObjectsResult> {
    if (!this.config) {
      throw new Error('COS 未初始化');
    }

    try {
      const result = await invoke<ListObjectsResult>('cos_list_objects', {
        prefix,
        maxKeys,
        config: this.config
      });
      return result;
    } catch (error) {
      throw new Error(`列出对象失败: ${error}`);
    }
  }

  // 获取对象 URL
  async getObjectUrl(key: string): Promise<string> {
    if (!this.config) {
      throw new Error('COS 未初始化');
    }

    try {
      const url = await invoke<string>('cos_get_object_url', {
        key,
        config: this.config
      });
      return url;
    } catch (error) {
      throw new Error(`获取对象 URL 失败: ${error}`);
    }
  }

  // 兼容原有接口的方法

  // 上传文件 (兼容原有的 push 方法) - 优化版本
  async push(
    file: Blob | File, 
    key: string, 
    onProgress?: (progress: UploadProgress) => void, 
    uploadOptions?: PushUploadOptions
  ): Promise<{
    ETag?: string;
    Location: string;
    Key: string;
    size: number;
  }> {
    this.log('开始上传', { key, fileSize: file.size });
    
    if (!this.config) {
      throw new CosError('COS 配置未初始化', 'NOT_INITIALIZED');
    }

    // 发送准备阶段进度
    onProgress?.({
      percent: 0,
      loaded: 0,
      total: file.size,
      stage: 'preparing'
    });
    
    let tempFilePath: string | null = null;
    
    try {
      // 保存到临时文件
      tempFilePath = await this.saveFileToTemp(file, key);
      
      // 发送上传开始进度
      onProgress?.({
        percent: 10,
        loaded: 0,
        total: file.size,
        stage: 'uploading'
      });
      
      // 准备上传选项
      const options: UploadOptions = {
        callback: onProgress ? 'progress' : undefined,
        headers: uploadOptions?.headers
      };

      // 如果启用了WebP转换，构建万象云处理头部
      if (uploadOptions?.webp?.enabled) {
        const quality = uploadOptions.webp.quality || 80;
        const picOperations = this.buildPicOperationsHeader(key, quality);
        
        if (!options.headers) {
          options.headers = {};
        }
        options.headers.pic_operations = picOperations;
        
        this.log('启用万象云WebP处理', { key, quality, picOperations });
      }
      
      const result = await this.upload(tempFilePath, key, options);
      
      // 发送上传完成进度
      onProgress?.({
        percent: 100,
        loaded: file.size,
        total: file.size,
        stage: 'completed'
      });

      // 构建完整的 COS URL - 使用后端返回的key（对于WebP转换，这将是WebP格式的key）
      const fullUrl = this.getObjectUrlSync(result.key);
      
      this.log('上传成功', { originalKey: key, finalKey: result.key, size: result.size, url: fullUrl });
      
      return {
        ETag: result.etag,
        Location: fullUrl,
        Key: result.key,
        size: result.size
      };
    } catch (error) {
      this.logError('上传过程失败', error);
      
      // 发送错误进度
      onProgress?.({
        percent: 0,
        loaded: 0,
        total: file.size,
        stage: 'error'
      });
      
      if (error instanceof CosError) {
        throw error;
      }
      
      throw new CosError(
        `上传失败: ${error instanceof Error ? error.message : String(error)}`,
        'UPLOAD_FAILED',
        undefined,
        error
      );
    } finally {
      // 清理临时文件
      if (tempFilePath) {
        await this.cleanupTempFile(tempFilePath);
      }
    }
  }

  // 下载文件 (兼容原有的 pull 方法)
  async pull(key: string): Promise<Blob | null> {
    try {
      // 创建临时文件路径
      const tempFilePath = await this.createTempPath(key);
      
      await this.download(key, tempFilePath);
      
      // 读取文件并转换为 Blob
      const arrayBuffer = await this.readTempFile(tempFilePath);
      const blob = new Blob([arrayBuffer]);
      
      // 清理临时文件
      this.cleanupTempFile(tempFilePath);
      
      return blob;
    } catch (error) {
      mConsole.error('拉取文件失败:', error);
      return null;
    }
  }

  // 辅助方法：保存文件到临时位置 - 优化版本
  private async saveFileToTemp(file: Blob | File, key: string): Promise<string> {
    try {
      const appDir = await appDataDir();
      const tempDir = await join(appDir, 'temp');
      const fileName = `upload_${Date.now()}_${key.replace(/[\/\\]/g, '_')}`;
      const tempFilePath = await join(tempDir, fileName);
      
      // 确保目录存在
      try {
        await mkdir(tempDir, { recursive: true });
      } catch (e) {
        // 目录可能已经存在，忽略错误
      }
      
      // 将文件内容写入临时文件
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      await writeFile(tempFilePath, uint8Array);
      
      this.log('临时文件创建成功', tempFilePath);
      return tempFilePath;
    } catch (error) {
      this.logError('创建临时文件失败', error);
      throw new CosError('创建临时文件失败', 'TEMP_FILE_FAILED', undefined, error);
    }
  }

  // 辅助方法：创建临时文件路径
  private async createTempPath(key: string): Promise<string> {
    const appDir = await appDataDir();
    const tempDir = await join(appDir, 'temp');
    const fileName = `download_${Date.now()}_${key.replace(/[\/\\]/g, '_')}`;
    
    return await join(tempDir, fileName);
  }

  // 辅助方法：读取临时文件
  private async readTempFile(filePath: string): Promise<ArrayBuffer> {
    const uint8Array = await readFile(filePath);
    return uint8Array.buffer;
  }

  // 辅助方法：清理临时文件 - 优化版本
  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      await remove(filePath);
      this.log('临时文件清理成功', filePath);
    } catch (error) {
      this.logError('清理临时文件失败', error);
      // 清理失败不应该影响主流程，只记录警告
    }
  }

  // 获取完整的 COS 路径
  private getFullKey(key: string): string {
    if (!this.config) {
      throw new Error('COS 配置未初始化');
    }
    
    // 处理目录前缀
    if (this.config.Dir) {
      const dir = this.config.Dir.endsWith('/') ? 
        this.config.Dir : 
        `${this.config.Dir}/`;
      return `${dir}${key}`;
    }
    
    return `ImSheet/${key}`;
  }

  // 获取文件 URL (同步版本，兼容原有接口) - 优化版本
  getObjectUrlSync(key: string): string {
    if (!this.config) {
      this.logError('COS 配置未初始化，返回原始 key', key);
      // 如果配置未初始化，直接返回原始 URL（可能是完整的 URL）
      if (key.startsWith('http')) {
        return key;
      }
      // 如果不是完整 URL，返回一个默认的 URL 格式
      return `https://${key}`;
    }

    const fullKey = this.getFullKey(key);
    let url: string;

    if (this.config.Domain) {
      // 修复：确保自定义域名包含协议前缀
      let domain = this.config.Domain;
      if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
        domain = `https://${domain}`;
      }
      // 移除末尾的斜杠
      domain = domain.replace(/\/+$/, '');
      url = `${domain}/${fullKey}`;
    } else {
      url = `https://${this.config.Bucket}.cos.${this.config.Region}.myqcloud.com/${fullKey}`;
    }

    this.log('生成对象 URL', { key, fullKey, url });
    return url;
  }

  // 新增：从 base64 数据上传文件（用于拖拽上传）
  async uploadFromBase64(
    base64Data: string,
    key: string,
    onProgress?: (progress: UploadProgress) => void,
    uploadOptions?: PushUploadOptions
  ): Promise<{
    ETag?: string;
    Location: string;
    Key: string;
    size: number;
  }> {
    this.log('开始从 base64 上传', { key, dataLength: base64Data.length });
    
    if (!this.config) {
      throw new CosError('COS 配置未初始化', 'NOT_INITIALIZED');
    }

    // 发送准备阶段进度
    onProgress?.({
      percent: 0,
      loaded: 0,
      total: 0,
      stage: 'preparing'
    });
    
    try {
      // 准备上传选项
      const options: UploadOptions = {
        callback: onProgress ? 'progress' : undefined,
        headers: uploadOptions?.headers
      };

      // 如果启用了WebP转换，构建万象云处理头部
      if (uploadOptions?.webp?.enabled) {
        const quality = uploadOptions.webp.quality || 80;
        const picOperations = this.buildPicOperationsHeader(key, quality);
        
        if (!options.headers) {
          options.headers = {};
        }
        options.headers.pic_operations = picOperations;
        
        this.log('启用万象云WebP处理 (Base64)', { key, quality, picOperations });
      }
      
      // 发送上传开始进度
      onProgress?.({
        percent: 10,
        loaded: 0,
        total: 0,
        stage: 'uploading'
      });
      
      const result = await invoke<UploadResult>('cos_upload_from_base64', {
        base64Data,
        key,
        options,
        config: this.config
      });
      
      // 发送上传完成进度
      onProgress?.({
        percent: 100,
        loaded: result.size,
        total: result.size,
        stage: 'completed'
      });

      // 构建完整的 COS URL - 使用后端返回的key（对于WebP转换，这将是WebP格式的key）
      const fullUrl = this.getObjectUrlSync(result.key);
      
      this.log('Base64 上传成功', { originalKey: key, finalKey: result.key, size: result.size, url: fullUrl });
      
      return {
        ETag: result.etag,
        Location: fullUrl,
        Key: result.key,
        size: result.size
      };
    } catch (error) {
      this.logError('Base64 上传过程失败', error);
      
      // 发送错误进度
      onProgress?.({
        percent: 0,
        loaded: 0,
        total: 0,
        stage: 'error'
      });
      
      if (error instanceof CosError) {
        throw error;
      }
      
      throw new CosError(
        `Base64 上传失败: ${error instanceof Error ? error.message : String(error)}`,
        'UPLOAD_FAILED',
        undefined,
        error
      );
    }
  }

  // 新增：处理拖拽上传
  async handleDragUpload(
    file: File,
    fileName: string,
    onProgress?: (progress: UploadProgress) => void,
    uploadOptions?: PushUploadOptions
  ): Promise<{
    ETag?: string;
    Location: string;
    Key: string;
    size: number;
  }> {
    this.log('开始处理拖拽上传', { fileName, fileSize: file.size });
    
    if (!this.config) {
      throw new CosError('COS 配置未初始化', 'NOT_INITIALIZED');
    }

    // 发送准备阶段进度
    onProgress?.({
      percent: 0,
      loaded: 0,
      total: file.size,
      stage: 'preparing'
    });
    
    try {
      // 将文件转换为 base64
      const base64Data = await this.fileToBase64(file);
      
      // 发送转换完成进度
      onProgress?.({
        percent: 20,
        loaded: 0,
        total: file.size,
        stage: 'uploading'
      });
      
      // 准备上传选项
      const options: UploadOptions = {
        callback: onProgress ? 'progress' : undefined,
        headers: uploadOptions?.headers
      };

      // 如果启用了WebP转换，构建万象云处理头部
      if (uploadOptions?.webp?.enabled) {
        const quality = uploadOptions.webp.quality || 80;
        const picOperations = this.buildPicOperationsHeader(fileName, quality);
        
        if (!options.headers) {
          options.headers = {};
        }
        options.headers.pic_operations = picOperations;
        
        this.log('启用万象云WebP处理 (拖拽上传)', { fileName, quality, picOperations });
      }
      
      const result = await invoke<UploadResult>('handle_drag_upload', {
        fileData: base64Data,
        fileName,
        config: this.config,
        options
      });
      
      // 发送上传完成进度
      onProgress?.({
        percent: 100,
        loaded: file.size,
        total: file.size,
        stage: 'completed'
      });

      // 构建完整的 COS URL - 使用后端返回的key（对于WebP转换，这将是WebP格式的key）
      const fullUrl = this.getObjectUrlSync(result.key);
      
      this.log('拖拽上传成功', { originalFileName: fileName, finalKey: result.key, size: result.size, url: fullUrl });
      
      return {
        ETag: result.etag,
        Location: fullUrl,
        Key: result.key,
        size: result.size
      };
    } catch (error) {
      this.logError('拖拽上传过程失败', error);
      
      // 发送错误进度
      onProgress?.({
        percent: 0,
        loaded: 0,
        total: file.size,
        stage: 'error'
      });
      
      if (error instanceof CosError) {
        throw error;
      }
      
      throw new CosError(
        `拖拽上传失败: ${error instanceof Error ? error.message : String(error)}`,
        'UPLOAD_FAILED',
        undefined,
        error
      );
    }
  }

  // 辅助方法：将文件转换为 base64
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = () => {
        reject(new Error('文件读取失败'));
      };
      reader.readAsDataURL(file);
    });
  }
}

// 导出单例实例
export const tauriCosService = TauriCosService.getInstance();