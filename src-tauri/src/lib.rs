use std::sync::Mutex;
use std::collections::HashMap;
use tauri::{State, Window};

mod cos;
use cos::{CosClient, CosConfig, UploadOptions, UploadResult, DownloadResult, DeleteResult, ObjectMetadata, ListObjectsResult};

// 全局 COS 客户端管理器
type CosClients = Mutex<HashMap<String, CosClient>>;

// 初始化 COS 客户端
#[tauri::command]
async fn cos_initialize(config: CosConfig, state: State<'_, CosClients>) -> Result<String, String> {
    let client = CosClient::new(config.clone());
    let client_id = format!("{}_{}", config.bucket, config.region);
    
    let mut clients = state.lock().map_err(|e| format!("Failed to lock clients: {}", e))?;
    clients.insert(client_id.clone(), client);
    
    Ok(client_id)
}

// 上传文件
#[tauri::command]
async fn cos_upload(
    file_path: String,
    key: String,
    options: Option<UploadOptions>,
    config: CosConfig,
    _state: State<'_, CosClients>,
) -> Result<UploadResult, String> {
    // 添加调试日志
    println!("COS Upload Debug:");
    println!("  Bucket: {}", config.bucket);
    println!("  Region: {}", config.region);
    println!("  Key: {}", key);
    println!("  File path: {}", file_path);
    
    let client = CosClient::new(config);
    
    client.upload_file(&file_path, &key, options)
        .await
        .map_err(|e| e.to_string())
}

// 下载文件
#[tauri::command]
async fn cos_download(
    key: String,
    save_path: String,
    config: CosConfig,
    _state: State<'_, CosClients>,
) -> Result<DownloadResult, String> {
    let client = CosClient::new(config);
    
    client.download_file(&key, &save_path)
        .await
        .map_err(|e| e.to_string())
}

// 检查对象是否存在
#[tauri::command]
async fn cos_head_object(
    key: String,
    config: CosConfig,
    _state: State<'_, CosClients>,
) -> Result<ObjectMetadata, String> {
    let client = CosClient::new(config);
    
    client.head_object(&key)
        .await
        .map_err(|e| e.to_string())
}

// 批量删除对象
#[tauri::command]
async fn cos_delete_multiple(
    keys: Vec<String>,
    config: CosConfig,
    _state: State<'_, CosClients>,
) -> Result<DeleteResult, String> {
    let client = CosClient::new(config);
    
    client.delete_multiple(keys)
        .await
        .map_err(|e| e.to_string())
}

// 列出对象
#[tauri::command]
async fn cos_list_objects(
    prefix: Option<String>,
    max_keys: Option<u32>,
    config: CosConfig,
    _state: State<'_, CosClients>,
) -> Result<ListObjectsResult, String> {
    let client = CosClient::new(config);
    
    client.list_objects(prefix, max_keys)
        .await
        .map_err(|e| e.to_string())
}

// 获取对象 URL
#[tauri::command]
async fn cos_get_object_url(
    key: String,
    config: CosConfig,
    _state: State<'_, CosClients>,
) -> Result<String, String> {
    let client = CosClient::new(config);
    
    Ok(client.get_object_url(&key))
}

// 窗口控制命令
#[tauri::command]
async fn minimize_window(window: Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn maximize_window(window: Window) -> Result<(), String> {
    window.maximize().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn unmaximize_window(window: Window) -> Result<(), String> {
    window.unmaximize().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn toggle_maximize(window: Window) -> Result<bool, String> {
    let is_maximized = window.is_maximized().map_err(|e| e.to_string())?;
    if is_maximized {
        window.unmaximize().map_err(|e| e.to_string())?;
        Ok(false)
    } else {
        window.maximize().map_err(|e| e.to_string())?;
        Ok(true)
    }
}

#[tauri::command]
async fn close_window(window: Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn set_always_on_top(window: Window, always_on_top: bool) -> Result<(), String> {
    window.set_always_on_top(always_on_top).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn is_maximized(window: Window) -> Result<bool, String> {
    window.is_maximized().map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_window_size(window: Window) -> Result<(u32, u32), String> {
    let size = window.inner_size().map_err(|e| e.to_string())?;
    Ok((size.width, size.height))
}

#[tauri::command]
async fn set_window_size(window: Window, width: u32, height: u32) -> Result<(), String> {
    use tauri::Size;
    let size = Size::Physical(tauri::PhysicalSize { width, height });
    window.set_size(size).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn is_always_on_top(_window: Window) -> Result<bool, String> {
    // Tauri 目前没有直接获取置顶状态的 API，我们需要在前端管理状态
    // 这里返回一个占位值，实际状态由前端维护
    Ok(false)
}

// 开始拖动窗口
#[tauri::command]
async fn start_drag(window: Window) -> Result<(), String> {
    window.start_dragging().map_err(|e| e.to_string())?;
    Ok(())
}

// 处理双击事件（切换最大化状态）
#[tauri::command]
async fn handle_double_click(window: Window) -> Result<bool, String> {
    let is_maximized = window.is_maximized().map_err(|e| e.to_string())?;
    if is_maximized {
        window.unmaximize().map_err(|e| e.to_string())?;
        Ok(false)
    } else {
        window.maximize().map_err(|e| e.to_string())?;
        Ok(true)
    }
}

// 获取当前平台信息
#[tauri::command]
async fn get_platform_info() -> Result<String, String> {
    Ok(std::env::consts::OS.to_string())
}

// 获取屏幕缩放因子
#[tauri::command]
async fn get_scale_factor(window: Window) -> Result<f64, String> {
    let scale_factor = window.scale_factor().map_err(|e| e.to_string())?;
    Ok(scale_factor)
}

// 根据平台和缩放因子设置窗口尺寸
#[tauri::command]
async fn set_window_size_adaptive(window: Window, logical_width: u32, logical_height: u32) -> Result<(), String> {
    use tauri::Size;
    
    // 获取缩放因子（用于调试和未来可能的调整）
    let _scale_factor = window.scale_factor().map_err(|e| e.to_string())?;
    
    // 在 macOS 上，通常需要考虑 Retina 显示器的高 DPI
    // 使用更精确的倍数来匹配 tauri.conf.json 中的最小尺寸
    let adjusted_width = if cfg!(target_os = "macos") {
        // 在 macOS 上放大尺寸以适应高 DPI 屏幕，确保不小于最小尺寸 400
        std::cmp::max((logical_width as f64 * 1.5) as u32, 400)
    } else {
        logical_width
    };
    
    let adjusted_height = if cfg!(target_os = "macos") {
        // 在 macOS 上放大尺寸以适应高 DPI 屏幕，确保不小于最小尺寸 300
        std::cmp::max((logical_height as f64 * 1.5) as u32, 300)
    } else {
        logical_height
    };
    
    let size = Size::Logical(tauri::LogicalSize { 
        width: adjusted_width as f64, 
        height: adjusted_height as f64 
    });
    
    window.set_size(size).map_err(|e| e.to_string())?;
    Ok(())
}

// 保留原有的 greet 命令
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// 从base64数据上传文件
#[tauri::command]
async fn cos_upload_from_base64(
    base64_data: String,
    key: String,
    options: Option<UploadOptions>,
    config: CosConfig,
    _state: State<'_, CosClients>,
) -> Result<UploadResult, String> {
    use base64::{Engine as _, engine::general_purpose};
    use std::fs;
    
    println!("COS Upload from Base64 Debug:");
    println!("  Bucket: {}", config.bucket);
    println!("  Region: {}", config.region);
    println!("  Key: {}", key);
    println!("  Base64 data length: {}", base64_data.len());
    
    // 解码base64数据
    let file_data = general_purpose::STANDARD
        .decode(&base64_data)
        .map_err(|e| format!("Base64解码失败: {}", e))?;
    
    // 创建临时文件
    let temp_dir = std::env::temp_dir();
    let temp_file_path = temp_dir.join(format!("tauri_upload_{}", key.replace('/', "_")));
    
    // 写入临时文件
    fs::write(&temp_file_path, &file_data)
        .map_err(|e| format!("写入临时文件失败: {}", e))?;
    
    let client = CosClient::new(config);
    
    // 使用现有的upload_file方法
    let result = client.upload_file(
        temp_file_path.to_str().unwrap(),
        &key,
        options
    ).await;
    
    // 清理临时文件
    let _ = fs::remove_file(&temp_file_path);
    
    result.map_err(|e| e.to_string())
}

// 处理拖拽上传（别名方法，实际使用cos_upload_from_base64）
#[tauri::command]
async fn handle_drag_upload(
    file_data: String,
    file_name: String,
    options: Option<UploadOptions>,
    config: CosConfig,
    state: State<'_, CosClients>,
) -> Result<UploadResult, String> {
    println!("Handle Drag Upload Debug:");
    println!("  File name: {}", file_name);
    
    // 直接调用base64上传方法
    cos_upload_from_base64(file_data, file_name, options, config, state).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(CosClients::default())
        .invoke_handler(tauri::generate_handler![
            greet,
            cos_initialize,
            cos_upload,
            cos_download,
            cos_head_object,
            cos_delete_multiple,
            cos_list_objects,
            cos_get_object_url,
            minimize_window,
            maximize_window,
            unmaximize_window,
            toggle_maximize,
            close_window,
            set_always_on_top,
            is_maximized,
            get_window_size,
            set_window_size,
            is_always_on_top,
            start_drag,
            handle_double_click,
            get_platform_info,
            get_scale_factor,
            set_window_size_adaptive,
            cos_upload_from_base64,
            handle_drag_upload
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
