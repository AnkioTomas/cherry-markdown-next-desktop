import { Command } from "@tauri-apps/plugin-shell";
import type { CherryConfig } from "../CherryConfig";
import { basename, extname, isAbsolute, resolve } from "../path";

export interface UploadResult {
  url: string;
  msg: string;
}



/**
 * 上传器基类：前端已把文件落到 tempPath，子类负责变成 Markdown URL。
 */
export abstract class BaseUploader {
  constructor(
    protected readonly documentPath: string,
    protected readonly config: CherryConfig,
  ) {}

  abstract upload(tempPath: string, originalName: string): Promise<UploadResult>;

  protected get timeoutMs(): number {
    return Math.max(
      1000,
      this.config.getItem<number>("upload.timeoutMs", 60_000),
    );
  }

  protected get documentDir(): string {
    const normalized = this.documentPath.replace(/\\/g, "/");
    const idx = normalized.lastIndexOf("/");
    return idx <= 0 ? normalized : normalized.slice(0, idx);
  }

  protected resolveConfiguredPath(configured: string): string {
    const trimmed = configured.trim();
    if (!trimmed) {
      return "";
    }
    if (isAbsolute(trimmed)) {
      return trimmed;
    }
    return resolve(this.documentDir, trimmed);
  }

  protected async runCommand(
    command: string,
    args: string[],
  ): Promise<{ stdout: string; stderr: string }> {
    try {
      const child = Command.create(command, args);
      // tauri-plugin-shell doesn't support changing cwd on the fly easily via TS without sidecar,
      // but for absolute paths, command works. Wait, wait, actually we can just run it.
      // We don't have cwd natively in Command.create options from tauri directly unless configured,
      // but usually upload scripts/binaries work anywhere, and they receive absolute paths for temp file.
      const result = await child.execute();
      return { stdout: result.stdout, stderr: result.stderr };
    } catch (e) {
      throw new Error(`执行失败: ${String(e)}`);
    }
  }

  protected isUrl(text: string): boolean {
    return /^https?:\/\//i.test(text);
  }

  protected uniqueFileName(name: string): string {
    const ext = extname(name);
    const base = basename(name, ext) || "file";
    const safe = base.replace(/[^\w.\-\u4e00-\u9fff]+/gi, "_");
    return `${safe}-${Date.now()}${ext}`;
  }
}
