import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import { basename } from "../host/path";

/**
 * 收集页面全部可用 CSS。
 * 主题样式由 Vite 打成 `<link rel="stylesheet">`，只扫 `<style>` 会丢主题。
 */
function collectDocumentStyles(): string {
  const chunks: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = sheet.cssRules;
      if (!rules?.length) {
        continue;
      }
      chunks.push(Array.from(rules, (rule) => rule.cssText).join("\n"));
    } catch {
      // 跨域 stylesheet 读不到 cssRules，跳过
    }
  }
  return chunks.join("\n");
}

/**
 * 导出只需要：主题 class 壳 + 预览内容层。
 * 不要整棵 `#penna-root`（会带上编辑器布局的 height/overflow 污染）。
 */
function getExportRoot(): HTMLElement {
  const appRoot = document.querySelector<HTMLElement>("#penna-root");
  if (!appRoot) {
    throw new Error("无法找到编辑器根节点");
  }

  const render =
    appRoot.querySelector<HTMLElement>(".penna-preview .penna-render") ??
    appRoot.querySelector<HTMLElement>(".penna-render");
  if (!render) {
    throw new Error("无法找到预览内容");
  }

  const shell = document.createElement("article");
  shell.id = "penna-export";
  shell.className = appRoot.className;
  shell.appendChild(render.cloneNode(true));
  return shell;
}

function buildExportHtml(title: string, root: HTMLElement): string {
  const styles = collectDocumentStyles();
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      height: auto !important;
      overflow: visible !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    #penna-export {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
      box-sizing: border-box;
      width: 100%;
      min-height: 100%;
      background: color-mix(in srgb, var(--penna-c-text-3) 8%, var(--penna-c-bg));
    }
    ${styles}
    @media print {
      html, body {
        height: auto !important;
        overflow: visible !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      #penna-export { max-width: none !important; }
    }
  </style>
</head>
<body>
  ${root.outerHTML}
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function defaultExportName(docPath: string | null, ext: string): string {
  if (docPath) {
    const name = basename(docPath).replace(/\.(md|markdown)$/i, "");
    return `${name || "export"}.${ext}`;
  }
  return `export.${ext}`;
}

export async function exportHtml(docPath: string | null): Promise<boolean> {
  const title = docPath ? basename(docPath) : "Penna Markdown";
  const html = buildExportHtml(title, getExportRoot());
  const target = await save({
    defaultPath: defaultExportName(docPath, "html"),
    filters: [{ name: "HTML", extensions: ["html"] }],
  });
  if (!target) {
    return false;
  }
  await writeTextFile(target, html);
  return true;
}

export async function exportPdf(docPath: string | null): Promise<void> {
  const title = docPath ? basename(docPath) : "Penna Markdown";
  const html = buildExportHtml(title, getExportRoot());

  // 1. 创建 iframe 承载注入的 html（实现绝对的 CSS 隔离）
  const iframe = document.createElement("iframe");
  iframe.id = "penna-print-iframe";
  iframe.setAttribute("scrolling", "no");
  iframe.style.position = "absolute";
  iframe.style.top = "-9999px";
  iframe.style.left = "-9999px";
  iframe.style.width = "100%";
  iframe.style.border = "none";
  iframe.style.zIndex = "-1";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error("无法创建打印沙箱");
  }

  doc.open();
  doc.write(html);
  doc.close();

  const images = Array.from(doc.querySelectorAll("img"));
  await Promise.all(images.map((img) => {
    img.removeAttribute("loading");
    if (img.complete) return Promise.resolve();
    return new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });
  }));

  // 等待渲染和图片解析
  await new Promise((resolve) => setTimeout(resolve, 100));

  // 2. 核心：为了让宿主打印时能正常多页切割 iframe，必须把 iframe 的物理高度撑开至内容总高度
  const body = doc.body;
  const htmlEl = doc.documentElement;
  const contentHeight = Math.max(
    body.scrollHeight, body.offsetHeight,
    htmlEl.clientHeight, htmlEl.scrollHeight, htmlEl.offsetHeight
  );

  // 3. 在主文档注入 @media print 隔离样式
  const style = document.createElement("style");
  style.id = "penna-print-isolation";
  style.textContent = `
    @media screen {
      #penna-print-iframe { display: none !important; }
    }
    @media print {
      /* 重置宿主高度限制，允许分页 */
      html, body {
        height: auto !important;
        min-height: auto !important;
        overflow: visible !important;
        position: static !important;
        padding: 0 !important;
        margin: 0 !important;
        background: transparent !important;
      }
      /* 隐藏所有原生 UI，只保留 iframe 和隔离样式表 */
      body > *:not(#penna-print-iframe):not(#penna-print-isolation) {
        display: none !important;
      }
      /* 将 iframe 暴露给系统打印机，并应用实际高度 */
      #penna-print-iframe {
        display: block !important;
        position: static !important;
        width: 100% !important;
        height: ${contentHeight}px !important;
      }
    }
  `;
  document.body.appendChild(style);

  const cleanup = () => {
    window.removeEventListener("afterprint", cleanup);
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
    if (document.body.contains(style)) {
      document.body.removeChild(style);
    }
  };

  // 绑定在宿主 window 上，因为我们要调用的是宿主的打印
  window.addEventListener("afterprint", cleanup);

  try {
    // 4. 不再调用 iframe.print()，而是用 Tauri 的原生打印打印宿主
    // 因为宿主已被 @media print 劫持，实际上只会打印 iframe 里的内容
    await invoke("print_window");

  } catch (e) {
    cleanup();
    throw new Error(String(e));
  }
}
