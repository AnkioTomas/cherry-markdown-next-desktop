import { open } from "@tauri-apps/plugin-shell";

/**
 * 预览区有 `<base href>` 指向文档目录，hash 链接会被解析成目录 URL，
 * Tauri asset 协议读目录直接炸：Is a directory (os error 21)。
 *
 * 这里统一劫持预览内所有 `<a>`：禁止 webview 跳转；
 * hash → 预览内滚动；http(s)/mailto/tel → 系统浏览器。
 */
export function bindPreviewLinkGuard(root: HTMLElement): void {
  const onActivate = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const preview = target.closest(".penna-preview");
    if (!preview || !root.contains(preview)) {
      return;
    }

    const anchor = target.closest("a[href]");
    if (!(anchor instanceof HTMLAnchorElement) || !preview.contains(anchor)) {
      return;
    }

    const raw = anchor.getAttribute("href")?.trim() ?? "";
    if (!raw) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (raw.startsWith("#")) {
      scrollPreviewHash(preview, raw.slice(1));
      return;
    }

    if (/^(https?:|mailto:|tel:)/i.test(raw)) {
      void open(raw).catch((error) => {
        console.warn("[penna-desktop] open external link failed", raw, error);
      });
      return;
    }

    if (raw.startsWith("//")) {
      void open(`https:${raw}`).catch((error) => {
        console.warn("[penna-desktop] open external link failed", raw, error);
      });
    }
  };

  root.addEventListener("click", onActivate, true);
  root.addEventListener(
    "auxclick",
    (event) => {
      if (event.button === 1) {
        onActivate(event);
      }
    },
    true,
  );
}

function scrollPreviewHash(preview: Element, hash: string): void {
  const id = decodeURIComponent(hash);
  if (!id) {
    return;
  }
  const el = preview.querySelector(`#${CSS.escape(id)}`);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}
