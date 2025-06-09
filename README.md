# ImSheet

![](https://raw.githubusercontent.com/yamfeel/history/master/images202208150241351.png)

<p align="center">
  <strong>一款简约直观的图床工具，无服务端轻松管理你的个人图像资产</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Tauri-2.0-blue?style=flat-square&logo=tauri" alt="Tauri">
  <img src="https://img.shields.io/badge/Vue-3.x-green?style=flat-square&logo=vue.js" alt="Vue">
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Rust-1.70+-orange?style=flat-square&logo=rust" alt="Rust">
</p>

---

## 🎉 重大更新：从 Electron 迁移到 Tauri

> **📢 迁移公告**  
> ImSheet 已成功从 Electron 架构迁移到 Tauri！这次重大更新带来了显著的性能提升和更好的用户体验。

### 🚀 迁移带来的优势

| 方面 | Electron 版本 | Tauri 版本 | 改进 |
|------|-------------|-----------|------|
| **内存占用** | 较高 | 显著降低 | ⬇️ **大幅减少** |
| **启动速度** | 较慢 | 快速启动 | ⚡ **明显提升** |
| **包体积** | 体积较大 | 轻量化 | 📦 **显著缩减** |

### 📂 历史版本保存

- Electron 版本的完整代码已保存在 `electron-legacy` 分支
- 所有历史记录和功能特性得到完整保留
- 可随时切换查看历史版本: `git checkout electron-legacy`

---

## ✨ 特性

- 🌈 **无服务端同步** - 基于对象存储实现多端同步，降低维护成本
- 📦 **智能管理** - 轻松同步添加和删除，误操作不再担心
- 📑 **灵活格式** - 多种 Link 格式，满足不同使用场景
- 🌠 **WebP 转换** - 可控的图片压缩，高效节省存储空间
- 🎨 **悬浮窗口** - 视口自由调节，一键悬挂，优雅工作流
- ⚡ **原生性能** - Tauri + Rust 驱动，极速启动和运行
- 🔒 **安全可靠** - Rust 内存安全保障，系统级权限控制

## 🛠️ 技术栈

**前端框架**
- [Vue 3](https://vuejs.org/) - 渐进式 JavaScript 框架
- [TypeScript](https://www.typescriptlang.org/) - 类型安全的 JavaScript
- [Vite](https://vitejs.dev/) - 极速的构建工具
- [Naive UI](https://www.naiveui.com/) - 现代化 Vue 组件库

**桌面应用**
- [Tauri](https://tauri.app/) - 安全、快速的桌面应用框架
- [Rust](https://www.rust-lang.org/) - 系统级编程语言

**数据存储**
- [SQLite](https://www.sqlite.org/) - 轻量级本地数据库
- [腾讯云 COS](https://cloud.tencent.com/product/cos) - 对象存储服务

## 🍞 预览

<p align="center">
  <img src="https://raw.githubusercontent.com/yamfeel/history/master/images202208141855693.webp" alt="ImSheet Preview" style="border: 2px solid #33333311; border-radius: 8px;">
</p>

## ⚓ 工作原理

ImSheet 采用创新的无服务端同步方案：

1. **本地优先** - 使用 SQLite 作为本地数据库，零配置轻量级存储
2. **云端同步** - 将图片和数据库文件推送到对象存储
3. **哈希校验** - 记录数据库修改的哈希值，确保多设备数据一致性
4. **智能管理** - 自动处理上传、删除等操作的同步

> 💡 **存储建议**  
> 当数据库存储达到 1 万张图片后，建议创建新的配置路径以优化性能。

<p align="center">
  <img src="https://raw.githubusercontent.com/yamfeel/history/master/images202208142317677.webp" alt="Storage Status" style="border: 2px solid #33333311; border-radius: 8px;">
</p>

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18.0.0
- **Rust** >= 1.70.0
- **系统支持**: Windows 10+, macOS 10.15+, Linux

### 开发环境设置

```bash
# 克隆项目
git clone https://github.com/your-username/imsheet-tauri.git
cd imsheet-tauri

# 安装依赖
yarn

# 开发模式运行
yarn run tauri dev

# 构建应用
# MacOS
yarn run tauri build -- --bundles dmg
# Win
yarn run tauri build
```

### IDE 推荐配置

- [VS Code](https://code.visualstudio.com/)
- [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) - Vue 语言支持
- [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) - Tauri 开发工具
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) - Rust 语言服务

## 📦 下载使用

### 应用下载

🔗 [最新版本下载](https://github.com/imsheet/imsheet/releases)

支持平台：
- 🪟 Windows (x64)
- 🍎 macOS (Intel & Apple Silicon)

### 配置说明

1. **获取腾讯云 COS 配置**
   - 创建 COS 存储桶
   - 获取 SecretId 和 SecretKey
   - 配置数据万象服务（可选）

2. **首次使用配置**
   - 启动应用后进入设置页面
   - 填入 COS 配置信息
   - 测试连接并保存

## ⚠️ 使用注意

- 基于 SQLite 的无服务端方案虽支持多端同步，但**同一时间多地同时操作仍可能导致冲突**
- **仅适合个人使用**，不建议多人共享同一配置
- 建议定期备份配置文件和数据库

## 🤝 参与贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建功能分支: `git checkout -b feature/amazing-feature`
3. 提交更改: `git commit -m 'Add amazing feature'`
4. 推送分支: `git push origin feature/amazing-feature`
5. 提交 Pull Request

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/yamfeel">yamfeel</a>
</p>
