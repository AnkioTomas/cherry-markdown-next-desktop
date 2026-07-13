import { convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ask, open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { basename, dirname } from "../host/path";

const UNTITLED = "Untitled.md";
const DEFAULT_MARKDOWN =
  "# Hello Cherry Markdown Desktop\n\nWelcome to your new Markdown editor.\n";

export type DocumentListener = () => void;

export class DocumentSession {
  private path: string | null = null;
  private text = DEFAULT_MARKDOWN;
  private dirty = false;
  private readonly listeners = new Set<DocumentListener>();

  onChange(listener: DocumentListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getPath(): string | null {
    return this.path;
  }

  getDir(): string | null {
    return this.path ? dirname(this.path) : null;
  }

  getText(): string {
    return this.text;
  }

  isDirty(): boolean {
    return this.dirty;
  }

  setText(text: string, markDirty = true): void {
    this.text = text;
    if (markDirty) {
      this.dirty = true;
    }
    this.emit();
  }

  async newDocument(): Promise<boolean> {
    if (!(await this.confirmDiscard())) {
      return false;
    }
    this.path = null;
    this.text = DEFAULT_MARKDOWN;
    this.dirty = false;
    this.updateBaseHref(null);
    this.emit();
    return true;
  }

  async openDocument(filePath?: string): Promise<boolean> {
    if (!(await this.confirmDiscard())) {
      return false;
    }

    let selected = filePath;
    if (!selected) {
      const picked = await open({
        multiple: false,
        directory: false,
        filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
      });
      if (!picked || Array.isArray(picked)) {
        return false;
      }
      selected = picked;
    }

    const content = await readTextFile(selected);
    this.path = selected;
    this.text = content;
    this.dirty = false;
    this.updateBaseHref(dirname(selected));
    this.emit();
    return true;
  }

  async save(): Promise<boolean> {
    if (!this.path) {
      return this.saveAs();
    }
    await writeTextFile(this.path, this.text);
    this.dirty = false;
    this.updateBaseHref(dirname(this.path));
    this.emit();
    return true;
  }

  async saveAs(): Promise<boolean> {
    const target = await save({
      defaultPath: this.path ?? UNTITLED,
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });
    if (!target) {
      return false;
    }
    await writeTextFile(target, this.text);
    this.path = target;
    this.dirty = false;
    this.updateBaseHref(dirname(target));
    this.emit();
    return true;
  }

  async confirmDiscard(): Promise<boolean> {
    if (!this.dirty) {
      return true;
    }
    return ask("当前文档尚未保存，是否丢弃修改？", {
      title: "未保存的更改",
      kind: "warning",
    });
  }

  async refreshTitle(): Promise<void> {
    const name = this.path ? basename(this.path) : UNTITLED;
    const title = `${this.dirty ? "• " : ""}${name} — Cherry Markdown Next`;
    await getCurrentWindow().setTitle(title);
  }

  updateBaseHref(docDir: string | null): void {
    let base = document.querySelector("base");
    if (!base) {
      base = document.createElement("base");
      document.head.prepend(base);
    }
    if (!docDir) {
      base.removeAttribute("href");
      return;
    }
    const href = convertFileSrc(docDir).replace(/\/?$/, "/");
    base.setAttribute("href", href);
  }

  private emit(): void {
    void this.refreshTitle();
    for (const listener of this.listeners) {
      listener();
    }
  }
}
