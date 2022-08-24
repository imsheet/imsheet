# ImSheet

> ImSheet 一款简约直观的图床工具，无服务端轻松管理你的个人 images 资产。

![](https://raw.githubusercontent.com/yamfeel/history/master/images202208150241351.png)

## ✨ 特性

- 🌈 无服务端实现多端同步，降低维护时间成本。

- 📦 轻松同步添加和删除，上传误操作再无需担心。

- 📑 Link 格式灵活管理，多种交互选择的省心设计。

- 🌠 可控的 Webp 服务，高效节省你的存储资源。

- 🎨 视口自由调节，一键悬挂，优雅地端上台面。

## 🚀 驱动

ImSheet 基于 Electron + Vite + Ts 、Vue3 构建，由 Sqlite 驱动数据同步，依赖于  `COS 对象存储` 及转码压缩 `数据万象`。**目前仅支持腾讯云COS**

## 🍞 预览

<img src="https://raw.githubusercontent.com/yamfeel/history/master/images202208141855693.webp" title="" alt="" style="border: 2px solid #33333311">

## ⚓原理

SQLite 是一个无服务器、零配置的的轻量数据库，ImSheet 利用其特性将您的图片协同 db  一起推送给对象存储。每次上传操作都将校验并记录 db 最后修改的 hash 值，**做到多设备无服务端同步管理个人图片资产。**

由于每次都会携带 db 上传，所以当 db 存放到 1 万张图片信息后，推荐创建新的配置路径存放。

当然，为了直观反馈您的存储状态，可以将鼠标移至左上 存储标志 查看状态信息 ，更有条理管理文件路径。

<img src="https://raw.githubusercontent.com/yamfeel/history/master/images202208142317677.webp" title="" alt="" style="border: 2px solid #33333311">

## 📦 下载 & 说明

现仅支持 window，后续更新 mac，若mac有需求的小伙伴，也可以自行 build，代码都已开源。

其他：基于 sqlite 无服务的解决方案，虽支持多端同步，但也存在缺陷，同一时间多地操作，仍然会导致存储冲突。所以仅仅适合个人使用。

ImSheet Releases [Download](https://github.com/imsheet/imsheet/releases)
