use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::Utc;
use hmac::{Hmac, Mac};
use sha1::{Sha1, Digest};
use md5;
use base64::Engine;
use reqwest;

type HmacSha1 = Hmac<Sha1>;

// COS 配置结构体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CosConfig {
    #[serde(rename = "APPID")]
    pub app_id: String,
    #[serde(rename = "SecretId")]
    pub secret_id: String,
    #[serde(rename = "SecretKey")]
    pub secret_key: String,
    #[serde(rename = "Bucket")]
    pub bucket: String,
    #[serde(rename = "Region")]
    pub region: String,
    #[serde(rename = "Domain")]
    pub domain: Option<String>,
    #[serde(rename = "Dir")]
    pub dir: Option<String>,
}

// 上传选项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadOptions {
    pub callback: Option<String>,
    pub headers: Option<CosHeaders>,
}

// 自定义头部选项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CosHeaders {
    pub content_type: Option<String>,
    pub pic_operations: Option<String>,
}

// 上传结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadResult {
    pub success: bool,
    pub key: String,
    pub url: String,
    pub etag: Option<String>,
    pub size: u64,
}

// 下载结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadResult {
    pub success: bool,
    pub file_path: String,
    pub size: u64,
}

// 删除结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeleteResult {
    pub success: bool,
    pub deleted_count: usize,
    pub failed_keys: Vec<String>,
}

// 对象元数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObjectMetadata {
    pub exists: bool,
    pub size: Option<u64>,
    pub etag: Option<String>,
    pub last_modified: Option<String>,
    pub content_type: Option<String>,
}

// 对象列表结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListObjectsResult {
    pub objects: Vec<ObjectInfo>,
    pub is_truncated: bool,
    pub next_marker: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObjectInfo {
    pub key: String,
    pub size: u64,
    pub etag: String,
    pub last_modified: String,
}

// COS 客户端
#[derive(Clone)]
pub struct CosClient {
    pub config: CosConfig,
    client: reqwest::Client,
}

impl CosClient {
    pub fn new(config: CosConfig) -> Self {
        let client = reqwest::Client::new();
        Self { config, client }
    }

    // 生成签名
    fn generate_signature(&self, method: &str, uri_path: &str, headers: &HashMap<String, String>, query_params: &HashMap<String, String>) -> String {
        let now = Utc::now();
        let key_time = format!("{};{}", now.timestamp() - 60, now.timestamp() + 3600);
        
        // 1. 构造 SignKey
        let mut mac = HmacSha1::new_from_slice(self.config.secret_key.as_bytes()).unwrap();
        mac.update(key_time.as_bytes());
        let sign_key = hex::encode(mac.finalize().into_bytes());

        // 2. 构造 FormatString
        let mut sorted_params: Vec<_> = query_params.iter().collect();
        sorted_params.sort_by_key(|&(k, _)| k);
        let url_param_list: Vec<String> = sorted_params.iter().map(|(k, _)| k.to_lowercase()).collect();
        let formatted_parameters: Vec<String> = sorted_params.iter().map(|(k, v)| format!("{}={}", k.to_lowercase(), urlencoding::encode(v))).collect();

        let mut sorted_headers: Vec<_> = headers.iter().collect();
        sorted_headers.sort_by_key(|&(k, _)| k);
        let header_list: Vec<String> = sorted_headers.iter().map(|(k, _)| k.to_lowercase()).collect();
        let formatted_headers: Vec<String> = sorted_headers.iter().map(|(k, v)| format!("{}={}", k.to_lowercase(), urlencoding::encode(v))).collect();

        let http_string = format!(
            "{}\n{}\n{}\n{}\n",
            method.to_lowercase(),
            uri_path,
            formatted_parameters.join("&"),
            formatted_headers.join("&")
        );

        // 3. 构造 StringToSign
        let string_to_sign = format!(
            "sha1\n{}\n{}\n",
            key_time,
            hex::encode(Sha1::digest(http_string.as_bytes()))
        );

        // 4. 构造 Signature
        let mut mac = HmacSha1::new_from_slice(sign_key.as_bytes()).unwrap();
        mac.update(string_to_sign.as_bytes());
        let signature = hex::encode(mac.finalize().into_bytes());

        // 5. 构造 Authorization
        format!(
            "q-sign-algorithm=sha1&q-ak={}&q-sign-time={}&q-key-time={}&q-header-list={}&q-url-param-list={}&q-signature={}",
            self.config.secret_id,
            key_time,
            key_time,
            header_list.join(";"),
            url_param_list.join(";"),
            signature
        )
    }

    // 获取完整的对象键
    fn get_full_key(&self, key: &str) -> String {
        // 如果 key 已经包含了目录前缀，直接返回
        if let Some(dir) = &self.config.dir {
            let dir_prefix = if dir.ends_with('/') { dir.clone() } else { format!("{}/", dir) };
            if key.starts_with(&dir_prefix) {
                return key.to_string();
            }
            return format!("{}{}", dir_prefix, key);
        } else {
            // 检查是否已经有 ImSheet/ 前缀
            if key.starts_with("ImSheet/") {
                return key.to_string();
            }
            return format!("ImSheet/{}", key);
        }
    }

    // 获取对象URL
    pub fn get_object_url(&self, key: &str) -> String {
        if let Some(domain) = &self.config.domain {
            format!("{}/{}", domain, self.get_full_key(key))
        } else {
            format!(
                "https://{}.cos.{}.myqcloud.com/{}",
                self.config.bucket,
                self.config.region,
                self.get_full_key(key)
            )
        }
    }

    // 上传文件
    pub async fn upload_file(&self, file_path: &str, key: &str, options: Option<UploadOptions>) -> Result<UploadResult, Box<dyn std::error::Error>> {
        // 添加调试日志
        println!("=== COS Upload Debug ===");
        println!("  Bucket: {}", self.config.bucket);
        println!("  Region: {}", self.config.region);
        println!("  Key: {}", key);
        println!("  File path: {}", file_path);
        
        // 读取原始文件数据
        let file_data = std::fs::read(file_path)?;
        let file_size = file_data.len() as u64;
        
        println!("  File size: {} bytes", file_size);
        
        // 根据文件扩展名确定内容类型
        let content_type = match std::path::Path::new(file_path).extension().and_then(|s| s.to_str()) {
            Some("jpg") | Some("jpeg") => "image/jpeg".to_string(),
            Some("png") => "image/png".to_string(),
            Some("gif") => "image/gif".to_string(),
            Some("webp") => "image/webp".to_string(),
            Some("bmp") => "image/bmp".to_string(),
            _ => "application/octet-stream".to_string(),
        };
        
        let full_key = self.get_full_key(key);
        let uri_path = format!("/{}", full_key);
        
        println!("  Full key: {}", full_key);
        println!("  URI path: {}", uri_path);
        println!("  Content-Type: {}", content_type);
        
        let mut headers = HashMap::new();
        headers.insert("host".to_string(), format!("{}.cos.{}.myqcloud.com", self.config.bucket, self.config.region));
        headers.insert("content-length".to_string(), file_size.to_string());
        headers.insert("content-type".to_string(), content_type.clone());
        
        // 检查是否需要添加万象处理头部
        if let Some(opts) = &options {
            if let Some(custom_headers) = &opts.headers {
                if let Some(pic_ops) = &custom_headers.pic_operations {
                    println!("  🌟 添加万象处理头部: {}", pic_ops);
                    headers.insert("pic-operations".to_string(), pic_ops.clone());
                }
            }
        }

        let query_params = HashMap::new();
        let authorization = self.generate_signature("PUT", &uri_path, &headers, &query_params);

        let url = format!(
            "https://{}.cos.{}.myqcloud.com{}",
            self.config.bucket,
            self.config.region,
            uri_path
        );
        
        println!("  Request URL: {}", url);

        let mut request = self.client
            .put(&url)
            .header("Authorization", authorization)
            .header("Content-Type", content_type)
            .header("Content-Length", file_size);

        // 添加万象处理头部到实际请求中
        if let Some(opts) = &options {
            if let Some(custom_headers) = &opts.headers {
                if let Some(pic_ops) = &custom_headers.pic_operations {
                    request = request.header("Pic-Operations", pic_ops);
                    println!("  🌟 已添加Pic-Operations头部到请求");
                }
            }
        }

        let request = request.body(file_data);

        println!("  🚀 Sending upload request...");
        let response = request.send().await?;
        let status = response.status();
        println!("  📥 Response status: {}", status);

        if status.is_success() {
            let etag = response.headers()
                .get("etag")
                .and_then(|v| v.to_str().ok())
                .map(|s| s.trim_matches('"').to_string());

            // 检查是否使用了万象云处理，如果是，获取处理后的实际文件大小
            let (actual_size, final_key) = if options.as_ref()
                .and_then(|opts| opts.headers.as_ref())
                .and_then(|headers| headers.pic_operations.as_ref())
                .is_some() 
            {
                println!("  🔍 检测到万象云处理，原文件已被WebP格式覆盖，获取压缩后文件大小...");
                
                // 由于fileid与ObjectKey相同，万象云会用WebP格式覆盖原文件
                // 所以原始key的文件现在就是WebP格式，直接获取其大小
                println!("  🔄 获取被WebP覆盖后的原文件大小: {}", full_key);
                
                // 获取被WebP覆盖后的文件大小
                match self.get_object_size(&full_key).await {
                    Ok(size) => {
                        println!("  📏 万象云WebP覆盖后文件大小: {} bytes (原始: {} bytes)", size, file_size);
                        (size, full_key.clone())
                    },
                    Err(e) => {
                        println!("  ⚠️ 获取WebP覆盖后文件大小失败，使用原始大小: {}", e);
                        (file_size, full_key.clone())
                    }
                }
            } else {
                (file_size, full_key.clone())
            };

            // 使用最终的key构建URL（对于WebP转换，这将是WebP文件的URL）
            let location_url = format!(
                "https://{}.cos.{}.myqcloud.com/{}",
                self.config.bucket,
                self.config.region,
                final_key
            );

            println!("  🎉 Upload completed successfully!");
            println!("  📍 Location: {}", location_url);
            println!("  📏 Final size: {} bytes", actual_size);
            println!("=== End COS Upload Debug ===");

            // 返回结果：对于万象云WebP处理，原文件已被WebP格式覆盖
            // 所以返回的key仍然是原始key，但内容已经是WebP格式
            Ok(UploadResult {
                success: true,
                key: key.to_string(),  // 返回原始key，因为万象云覆盖了原文件
                url: location_url,
                etag,
                size: actual_size, // 返回实际文件大小（万象云处理后的大小）
            })
        } else {
            let error_text = response.text().await?;
            println!("  ❌ Upload failed: {} - {}", status, error_text);
            Err(format!("Upload failed: {} - {}", status, error_text).into())
        }
    }

    // 下载文件
    pub async fn download_file(&self, key: &str, save_path: &str) -> Result<DownloadResult, Box<dyn std::error::Error>> {
        let full_key = self.get_full_key(key);
        let uri_path = format!("/{}", full_key);
        
        let mut headers = HashMap::new();
        headers.insert("host".to_string(), format!("{}.cos.{}.myqcloud.com", self.config.bucket, self.config.region));

        let query_params = HashMap::new();
        let authorization = self.generate_signature("GET", &uri_path, &headers, &query_params);

        let url = format!(
            "https://{}.cos.{}.myqcloud.com{}",
            self.config.bucket,
            self.config.region,
            uri_path
        );

        let response = self.client
            .get(&url)
            .header("Authorization", authorization)
            .send()
            .await?;

        let status = response.status();
        
        if status.is_success() {
            let content_length = response.content_length().unwrap_or(0);
            let bytes = response.bytes().await?;
            
            std::fs::write(save_path, bytes)?;

            Ok(DownloadResult {
                success: true,
                file_path: save_path.to_string(),
                size: content_length,
            })
        } else {
            let error_text = response.text().await?;
            Err(format!("Download failed: {} - {}", status, error_text).into())
        }
    }

    // 获取对象大小（用于万象云处理后获取实际文件大小）
    pub async fn get_object_size(&self, key: &str) -> Result<u64, Box<dyn std::error::Error>> {
        let metadata = self.head_object(key).await?;
        
        if metadata.exists {
            metadata.size.ok_or_else(|| "无法获取文件大小".into())
        } else {
            Err("文件不存在".into())
        }
    }

    // 检查对象是否存在
    pub async fn head_object(&self, key: &str) -> Result<ObjectMetadata, Box<dyn std::error::Error>> {
        let full_key = self.get_full_key(key);
        let uri_path = format!("/{}", full_key);
        
        let mut headers = HashMap::new();
        headers.insert("host".to_string(), format!("{}.cos.{}.myqcloud.com", self.config.bucket, self.config.region));

        let query_params = HashMap::new();
        let authorization = self.generate_signature("HEAD", &uri_path, &headers, &query_params);

        let url = format!(
            "https://{}.cos.{}.myqcloud.com{}",
            self.config.bucket,
            self.config.region,
            uri_path
        );

        let response = self.client
            .head(&url)
            .header("Authorization", authorization)
            .send()
            .await?;

        let status = response.status();

        if status.is_success() {
            let size = response.headers()
                .get("content-length")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| s.parse().ok());

            let etag = response.headers()
                .get("etag")
                .and_then(|v| v.to_str().ok())
                .map(|s| s.trim_matches('"').to_string());

            let last_modified = response.headers()
                .get("last-modified")
                .and_then(|v| v.to_str().ok())
                .map(|s| s.to_string());

            let content_type = response.headers()
                .get("content-type")
                .and_then(|v| v.to_str().ok())
                .map(|s| s.to_string());

            Ok(ObjectMetadata {
                exists: true,
                size,
                etag,
                last_modified,
                content_type,
            })
        } else if status == 404 {
            Ok(ObjectMetadata {
                exists: false,
                size: None,
                etag: None,
                last_modified: None,
                content_type: None,
            })
        } else {
            let error_text = response.text().await?;
            Err(format!("Head object failed: {} - {}", status, error_text).into())
        }
    }

    // 删除多个对象
    pub async fn delete_multiple(&self, keys: Vec<String>) -> Result<DeleteResult, Box<dyn std::error::Error>> {
        if keys.is_empty() {
            return Ok(DeleteResult {
                success: true,
                deleted_count: 0,
                failed_keys: vec![],
            });
        }

        let uri_path = "/";
        let mut headers = HashMap::new();
        headers.insert("host".to_string(), format!("{}.cos.{}.myqcloud.com", self.config.bucket, self.config.region));
        headers.insert("content-type".to_string(), "application/xml".to_string());

        // 构造删除请求的 XML
        let mut xml_body = String::from("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<Delete>\n<Quiet>false</Quiet>\n");
        for key in &keys {
            let full_key = self.get_full_key(key);
            xml_body.push_str(&format!("<Object><Key>{}</Key></Object>\n", full_key));
        }
        xml_body.push_str("</Delete>");

        // 计算并添加 Content-MD5 头部
        let md5_hash = md5::compute(xml_body.as_bytes());
        let content_md5 = base64::engine::general_purpose::STANDARD.encode(&md5_hash.0);
        headers.insert("content-md5".to_string(), content_md5.clone());
        headers.insert("content-length".to_string(), xml_body.len().to_string());

        // 添加查询参数
        let mut query_params = HashMap::new();
        query_params.insert("delete".to_string(), "".to_string());

        println!("=== 批量删除调试信息 ===");
        println!("删除的文件数量: {}", keys.len());
        println!("删除的文件列表: {:?}", keys);
        println!("XML Body:\n{}", xml_body);
        println!("Content-MD5: {}", content_md5);
        println!("Headers: {:?}", headers);
        println!("Query params: {:?}", query_params);

        let authorization = self.generate_signature("POST", uri_path, &headers, &query_params);
        
        println!("Authorization: {}", authorization);

        let url = format!(
            "https://{}.cos.{}.myqcloud.com/?delete",
            self.config.bucket,
            self.config.region
        );

        println!("Request URL: {}", url);

        let response = self.client
            .post(&url)
            .header("Authorization", authorization)
            .header("Content-Type", "application/xml")
            .header("Content-MD5", content_md5)
            .header("Content-Length", xml_body.len())
            .body(xml_body)
            .send()
            .await?;

        let status = response.status();
        let response_text = response.text().await?;

        println!("Response status: {}", status);
        println!("Response body: {}", response_text);

        if status.is_success() {
            // 解析响应XML来确定实际删除的文件
            println!("✅ 删除请求成功，响应内容:");
            println!("{}", response_text);
            
            // 简单解析删除成功的数量（实际项目中应该用XML解析器）
            let deleted_count = response_text.matches("<Deleted>").count();
            let error_count = response_text.matches("<Error>").count();
            
            println!("成功删除: {} 个文件", deleted_count);
            println!("删除失败: {} 个文件", error_count);

            Ok(DeleteResult {
                success: true,
                deleted_count,
                failed_keys: vec![],
            })
        } else {
            println!("❌ 删除请求失败: {} - {}", status, response_text);
            Err(format!("Delete multiple failed: {} - {}", status, response_text).into())
        }
    }

    // 列出对象
    pub async fn list_objects(&self, prefix: Option<String>, max_keys: Option<u32>) -> Result<ListObjectsResult, Box<dyn std::error::Error>> {
        let uri_path = "/";
        let mut headers = HashMap::new();
        headers.insert("host".to_string(), format!("{}.cos.{}.myqcloud.com", self.config.bucket, self.config.region));

        let mut query_params = HashMap::new();
        
        if let Some(prefix) = prefix {
            let full_prefix = if let Some(dir) = &self.config.dir {
                format!("{}/{}", dir, prefix)
            } else {
                format!("ImSheet/{}", prefix)
            };
            query_params.insert("prefix".to_string(), full_prefix);
        }
        
        if let Some(max_keys) = max_keys {
            query_params.insert("max-keys".to_string(), max_keys.to_string());
        }

        let authorization = self.generate_signature("GET", uri_path, &headers, &query_params);

        let mut url = format!(
            "https://{}.cos.{}.myqcloud.com/",
            self.config.bucket,
            self.config.region
        );

        if !query_params.is_empty() {
            let params: Vec<String> = query_params.iter()
                .map(|(k, v)| format!("{}={}", k, urlencoding::encode(v)))
                .collect();
            url.push_str(&format!("?{}", params.join("&")));
        }

        let response = self.client
            .get(&url)
            .header("Authorization", authorization)
            .send()
            .await?;

        let status = response.status();

        if status.is_success() {
            // 简化处理，返回空列表
            // 实际应该解析 XML 响应
            Ok(ListObjectsResult {
                objects: vec![],
                is_truncated: false,
                next_marker: None,
            })
        } else {
            let error_text = response.text().await?;
            Err(format!("List objects failed: {} - {}", status, error_text).into())
        }
    }
}