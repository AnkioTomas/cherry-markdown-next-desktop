import { CherryDesktopApp } from "./app/CherryDesktopApp";

void (async () => {
  try {
    await new CherryDesktopApp().start();
  } catch (error) {
    console.error("[cherry-desktop] failed to start", error);
    document.body.innerHTML = `<pre style="padding:24px;white-space:pre-wrap;color:#b91c1c">启动失败: ${
      error instanceof Error ? error.message : String(error)
    }</pre>`;
  }
})();
