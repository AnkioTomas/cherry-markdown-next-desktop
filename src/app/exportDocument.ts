import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { basename } from "../host/path";

function collectInlineStyles(): string {
  return Array.from(document.querySelectorAll("style"))
    .map((el) => el.textContent ?? "")
    .filter(Boolean)
    .join("\n");
}

function getPreviewHtml(): string {
  const root =
    document.querySelector<HTMLElement>(
      "#cherry-root .cherry-preview .cherry-render",
    ) ??
    document.querySelector<HTMLElement>("#cherry-root .cherry-preview");
  return root?.innerHTML?.trim() || "<p></p>";
}

function buildExportHtml(title: string, bodyHtml: string): string {
  const styles = collectInlineStyles();
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    html, body { margin: 0; padding: 0; background: #fff; color: #1f2328; }
    .cherry-export { max-width: 720px; margin: 0 auto; }
    ${styles}
    @media print {
      body { padding: 0; }
      .cherry-export { max-width: none; }
    }
  </style>
</head>
<body>
  <article class="cherry-export cherry-render cherry-preview">${bodyHtml}</article>
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
  const title = docPath ? basename(docPath) : "Cherry Markdown";
  const html = buildExportHtml(title, getPreviewHtml());
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

/**
 * 打开系统打印对话框；用户可在对话框中选择「存储为 PDF」。
 */
export async function exportPdf(docPath: string | null): Promise<void> {
  const title = docPath ? basename(docPath) : "Cherry Markdown";
  const html = buildExportHtml(title, getPreviewHtml());
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);

  const win = frame.contentWindow;
  const doc = frame.contentDocument;
  if (!win || !doc) {
    frame.remove();
    throw new Error("无法创建打印预览");
  }

  doc.open();
  doc.write(html);
  doc.close();

  await new Promise<void>((resolve) => {
    const done = () => resolve();
    frame.onload = () => done();
    // 部分 WebView 不会触发 iframe onload
    window.setTimeout(done, 300);
  });

  win.focus();
  win.print();
  window.setTimeout(() => frame.remove(), 1000);
}
