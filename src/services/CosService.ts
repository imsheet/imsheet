import COS from 'cos-js-sdk-v5';
import { ref } from 'vue';
import { mConsole } from '../main';

export interface CosConfig {
  APPID: string;
  SecretId: string;
  SecretKey: string;
  Bucket: string;
  Region: string;
  Domain?: string;
  Dir?: string;
}

export class CosService {
  private static instance: CosService;
  private cos: COS | null = null;
  private config = ref<CosConfig | null>(null);
  
  private constructor() {}
  
  static getInstance(): CosService {
    if (!CosService.instance) {
      CosService.instance = new CosService();
    }
    return CosService.instance;
  }
  
  // 初始化 COS
  initialize(config: CosConfig): void {
    this.config.value = config;
    this.cos = new COS({
      SecretId: config.SecretId,
      SecretKey: config.SecretKey,
    });
    
    mConsole.log('COS 服务初始化成功');
  }
  
  // 获取配置
  getConfig(): CosConfig | null {
    return this.config.value;
  }
  
  // 获取完整的 COS 路径
  private getFullKey(key: string): string {
    if (!this.config.value) {
      throw new Error('COS 配置未初始化');
    }
    
    // 处理目录前缀
    if (this.config.value.Dir) {
      const dir = this.config.value.Dir.endsWith('/') ? 
        this.config.value.Dir : 
        `${this.config.value.Dir}/`;
      return `${dir}${key}`;
    }
    
    return `ImSheet/${key}`;
  }
  
  // 检查对象是否存在
  async head(key: string): Promise<any> {
    if (!this.cos || !this.config.value) {
      throw new Error('COS 未初始化');
    }
    
    return new Promise((resolve, reject) => {
      this.cos!.headObject({
        Bucket: this.config.value!.Bucket,
        Region: this.config.value!.Region,
        Key: this.getFullKey(key)
      }, function(err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }
  
  // 获取文件列表
  async listObjects(prefix: string = ''): Promise<any> {
    if (!this.cos || !this.config.value) {
      throw new Error('COS 未初始化');
    }
    
    const fullPrefix = this.config.value.Dir ? 
      `${this.config.value.Dir}/${prefix}` : 
      `ImSheet/${prefix}`;
    
    return new Promise((resolve, reject) => {
      this.cos!.getBucket({
        Bucket: this.config.value!.Bucket,
        Region: this.config.value!.Region,
        Prefix: fullPrefix
      }, function(err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }
  
  // 下载文件
  async pull(key: string): Promise<Blob | null> {
    if (!this.cos || !this.config.value) {
      throw new Error('COS 未初始化');
    }
    
    try {
      return new Promise((resolve, reject) => {
        this.cos!.getObject({
          Bucket: this.config.value!.Bucket,
          Region: this.config.value!.Region,
          Key: this.getFullKey(key),
          DataType: 'blob'
        }, function(err, data) {
          if (err) {
            reject(err);
          } else {
            resolve(data.Body as Blob);
          }
        });
      });
    } catch (error) {
      mConsole.error('从 COS 拉取文件失败:', error);
      return null;
    }
  }
  
  // 上传文件
  async push(file: Blob | File, key: string, onProgress?: (progress: any) => void): Promise<any> {
    if (!this.cos || !this.config.value) {
      throw new Error('COS 未初始化');
    }
    
    return new Promise((resolve, reject) => {
      this.cos!.putObject({
        Bucket: this.config.value!.Bucket,
        Region: this.config.value!.Region,
        Key: this.getFullKey(key),
        Body: file,
        onProgress: onProgress
      }, function(err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }
  
  // 删除文件
  async delete(key: string | string[]): Promise<any> {
    if (!this.cos || !this.config.value) {
      throw new Error('COS 未初始化');
    }
    
    if (Array.isArray(key)) {
      // 批量删除
      const objects = key.map(k => ({
        Key: this.getFullKey(k)
      }));
      
      return new Promise((resolve, reject) => {
        this.cos!.deleteMultipleObject({
          Bucket: this.config.value!.Bucket,
          Region: this.config.value!.Region,
          Objects: objects
        }, function(err, data) {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });
    } else {
      // 单个删除
      return new Promise((resolve, reject) => {
        this.cos!.deleteObject({
          Bucket: this.config.value!.Bucket,
          Region: this.config.value!.Region,
          Key: this.getFullKey(key)
        }, function(err, data) {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });
    }
  }
  
  // 获取文件 URL
  getObjectUrl(key: string): string {
    if (!this.cos || !this.config.value) {
      throw new Error('COS 未初始化');
    }
    
    if (this.config.value.Domain) {
      return `${this.config.value.Domain}/${this.getFullKey(key)}`;
    }
    
    return `https://${this.config.value.Bucket}.cos.${this.config.value.Region}.myqcloud.com/${this.getFullKey(key)}`;
  }
}

export const cosService = CosService.getInstance();