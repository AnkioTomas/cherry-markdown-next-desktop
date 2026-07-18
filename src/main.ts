import { PennaDesktopApp } from "./app/PennaDesktopApp";

void (async () => {
  try {
    await new PennaDesktopApp().start();
  } catch (error) {
    console.error("[penna-desktop] failed to start", error);
    document.body.innerHTML = `<pre style="padding:24px;white-space:pre-wrap;color:#b91c1c">启动失败: ${
      error instanceof Error ? error.message : String(error)
    }</pre>`;
  }
})();
