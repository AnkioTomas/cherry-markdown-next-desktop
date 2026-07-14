# Cherry Markdown Next Desktop

基于 [Tauri v2](https://v2.tauri.app/) 和 Web 技术构建的现代化、高性能跨平台 Markdown 编辑器桌面版。
其底层由纯正的 Web 引擎驱动，并以开源渲染引擎 [cherry-markdown-next](https://github.com/) 作为核心组件，提供卓越的编辑与排版体验。

## 特性

- 🚀 **极速启动与高性能**：底座使用 Rust 与 Tauri，体积小巧，内存占用极低。
- 💻 **真正的跨平台**：完美支持 Windows、macOS 和 Linux。
- 📂 **原生拖拽支持**：支持直接将 `.md` 文件或整个文件夹（工作区）拖入窗口打开。
- 🌗 **自动暗色模式**：完美跟随系统外观切换深色/浅色模式，并呈现沉浸式的标题栏。

## 本地开发指南

### 前置依赖
- [Node.js](https://nodejs.org/) (建议最新 LTS 版本)
- [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/tools/install)
- 各平台的 Tauri 前置系统依赖 (如 macOS 的 Xcode Command Line Tools，Windows 的 C++ Build Tools，Linux 的 WebKit2GTK 库等)。详见 [Tauri 官方环境搭建指南](https://v2.tauri.app/start/prerequisites/)。

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

启动 Vite 前端服务并同时拉起 Tauri 桌面容器：

```bash
pnpm dev
# 或
pnpm tauri dev
```


