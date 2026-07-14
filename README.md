<p align="center">
  <img src="https://socialify.git.ci/AnkioTomas/cherry-markdown-next-desktop/image?description=1&font=Source%20Code%20Pro&forks=1&issues=1&logo=https%3A%2F%2Fraw.githubusercontent.com%2FAnkioTomas%2Fcherry-markdown-next-desktop%2Fmain%2Flogo%2Fandroid-chrome-512x512.png&name=1&pattern=Floating%20Cogs&pulls=1&stargazers=1&theme=Auto" alt="Cherry Markdown Next Desktop" width="640" height="320" />
</p>

<p align="center">
  <a href="https://github.com/AnkioTomas/cherry-markdown-next-desktop/releases"><img src="https://img.shields.io/github/v/release/AnkioTomas/cherry-markdown-next-desktop.svg?style=flat-square" alt="GitHub release" /></a>
  <a href="https://github.com/AnkioTomas/cherry-markdown-next-desktop/releases"><img src="https://img.shields.io/github/downloads/AnkioTomas/cherry-markdown-next-desktop/total.svg?style=flat-square" alt="GitHub downloads" /></a>
  <a href="https://github.com/AnkioTomas/cherry-markdown-next-desktop/blob/main/LICENSE"><img src="https://img.shields.io/github/license/AnkioTomas/cherry-markdown-next-desktop.svg?style=flat-square" alt="license" /></a>
  <a href="https://github.com/AnkioTomas/cherry-markdown-next-desktop/stargazers"><img src="https://img.shields.io/github/stars/AnkioTomas/cherry-markdown-next-desktop.svg?style=flat-square" alt="GitHub stars" /></a>
  <a href="https://github.com/AnkioTomas/cherry-markdown-next-desktop/issues"><img src="https://img.shields.io/github/issues/AnkioTomas/cherry-markdown-next-desktop.svg?style=flat-square" alt="GitHub issues" /></a>
</p>

基于 **[Tauri v2](https://v2.tauri.app/)** 与 **[cherry-markdown-next](https://github.com/AnkioTomas/cherry-markdown-next)** 构建的现代化、高性能跨平台 Markdown 桌面编辑器。极速启动，原生体验。

| 平台支持                             | 架构                                        |
| ---------------------------------- | ------------------------------------------- |
| `macOS`                            | Apple Silicon (M1/M2/M3) & Intel            |
| `Windows`                          | x64, x86, ARM64                             |
| `Linux`                            | Debian, Ubuntu, AppImage 等                 |

仓库：[AnkioTomas/cherry-markdown-next-desktop](https://github.com/AnkioTomas/cherry-markdown-next-desktop)

## 特性

- **强劲的渲染核心**：完全由开源核心渲染组件 `cherry-markdown-next` 驱动，支持 GFM 标准与 Cherry 语法扩展。
- **真正的原生体验**：Tauri v2 + Rust 底座，体积小巧，内存占用极低，极速启动。
- **系统级集成**：
  - 支持直接将 `.md` 文件拖入窗口秒开
  - 支持将整个文件夹作为工作区拖入
  - 完美跟随 macOS / Windows 系统自动切换暗黑模式
  - 提供沉浸式的无边框自定义标题栏
- **全平台支持**：一份代码，同时原生分发至 Windows、macOS 和 Linux。

## 下载安装

前往 [GitHub Releases](https://github.com/AnkioTomas/cherry-markdown-next-desktop/releases) 下载适用于您操作系统的最新版本：

- **macOS**: 下载 `.dmg` 文件（内置 Universal 二进制芯片兼容）。
- **Windows**: 下载 `.exe` 安装程序或 `.msi`。
- **Linux**: 下载 `.AppImage` 或 `.deb` 包。

## 开发

### 前置依赖

- [Node.js](https://nodejs.org/) (建议最新 LTS 版本)
- [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/tools/install)
- 各平台的 Tauri 编译系统依赖 (如 Xcode Command Line Tools, C++ Build Tools, WebKit2GTK)。详见 [Tauri 官方文档](https://v2.tauri.app/start/prerequisites/)。

### 本地运行

```bash
pnpm install
pnpm dev
# 或直接使用 tauri 命令行拉起
pnpm tauri dev
```



## License

[MIT](./LICENSE) © AnkioTomas
