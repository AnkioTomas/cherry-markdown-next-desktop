import {
  Cherry,
  DEFAULT_TOOLBAR_ITEMS,
  type CherryOptions,
  type EditorOptions,
} from "cherry-markdown-next";
import "cherry-markdown-next/editor.css";
import "cherry-markdown-next/transformer.css";
import { message } from "@tauri-apps/plugin-dialog";
import { defaultWindowIcon } from "@tauri-apps/api/app";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Menu } from "@tauri-apps/api/menu";
import { CherryAi } from "../host/CherryAi";
import { CherryConfig, type UploadMode } from "../host/CherryConfig";
import { CherryUploader } from "../host/CherryUploader";
import { DocumentSession } from "./DocumentSession";
import { SettingsPanel } from "./SettingsPanel";
import "../themes.css";
import "../styles.css";

interface EditorChangePayload {
  markdown: string;
}

interface CherryBoot {
  text: string;
  appearance: "light" | "dark";
  layout: string;
  theme: string;
  statusbar: boolean;
  sidebar: boolean;
  lineNumbers: boolean;
  uploadEnabled: boolean;
  aiEnabled: boolean;
}

const SETTINGS_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" class="cherry-toolbar-icon" aria-hidden="true"><path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.15 7.15 0 0 0-1.62-.94l-.36-2.54A.48.48 0 0 0 14 2h-4a.48.48 0 0 0-.48.42l-.36 2.54c-.59.24-1.13.55-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.65 8.87a.49.49 0 0 0 .12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.77 14.5a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.39.3.59.22l2.39-.96c.5.39 1.03.7 1.62.94l.36 2.54c.05.24.24.42.48.42h4c.24 0 .44-.18.48-.42l.36-2.54c.59-.24 1.13-.55 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/></svg>`;

export async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function resolveAppearance(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export class CherryDesktopApp {
  private readonly root: HTMLElement;
  private readonly config = new CherryConfig();
  private readonly session = new DocumentSession();
  private readonly settings: SettingsPanel;
  private editor: Cherry | null = null;
  private applyingExternalUpdate = false;

  constructor() {
    const rootEl = document.getElementById("cherry-root");
    if (!rootEl) {
      throw new Error("Missing #cherry-root");
    }
    this.root = rootEl;
    this.settings = new SettingsPanel(this.config, () => {
      this.createEditor(this.buildBoot());
    });
  }

  async start(): Promise<void> {
    await this.config.load();
    this.createEditor(this.buildBoot());
    try {
      await this.setupMenu();
    } catch (error) {
      console.warn("[cherry-desktop] menu setup failed", error);
    }
    this.bindWindowEvents();
    this.bindAppearanceWatcher();
    await this.session.refreshTitle();
  }

  private isUploadEnabled(): boolean {
    const mode = this.config.getItem<UploadMode>("upload.mode", "off");
    if (mode === "off") {
      return false;
    }
    if (mode === "script") {
      return Boolean(this.config.getItem<string>("upload.script", "").trim());
    }
    return true;
  }

  private buildBoot(): CherryBoot {
    return {
      text: this.session.getText(),
      appearance: resolveAppearance(),
      layout: this.config.getItem<string>("ui.layout", "split"),
      theme: this.config.getItem<string>("ui.theme", "default"),
      statusbar: this.config.getItem<boolean>("ui.statusbar", true),
      sidebar: this.config.getItem<boolean>("ui.sidebar", true),
      lineNumbers: this.config.getItem<boolean>("ui.lineNumbers", true),
      uploadEnabled: this.isUploadEnabled(),
      aiEnabled: this.config.getItem<boolean>("ai.enabled", false),
    };
  }

  private buildEditorOptions(boot: CherryBoot): EditorOptions {
    const editorOptions: EditorOptions = {
      value: boot.text,
      lineNumbers: boot.lineNumbers,
    };

    if (boot.uploadEnabled) {
      editorOptions.onParseFile = async (file) => {
        try {
          const path = this.session.getPath();
          if (!path) {
            throw new Error("请先保存文档后再上传本地文件");
          }
          const dataBase64 = await fileToBase64(file);
          return await new CherryUploader(path, this.config).upload({
            name: file.name,
            mime: file.type,
            dataBase64,
          });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          await message(`上传失败: ${msg}`, {
            title: "上传失败",
            kind: "error",
          });
          throw error;
        }
      };
    }

    if (boot.aiEnabled) {
      editorOptions.onAiRequest = async (action, selected, prompts) => {
        try {
          return await new CherryAi(this.config).request(
            action,
            selected,
            prompts,
          );
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          await message(`AI 请求失败: ${msg}`, {
            title: "AI 失败",
            kind: "error",
          });
          throw error;
        }
      };
    }

    return editorOptions;
  }

  private createEditor(boot: CherryBoot): void {
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }

    document.body.classList.toggle("cherry-dark", boot.appearance === "dark");

    const options: CherryOptions = {
      layout: boot.layout as CherryOptions["layout"],
      appearance: boot.appearance,
      themeId: boot.theme,
      statusbar: boot.statusbar,
      sidebar: boot.sidebar,
      toolbar: {
        items: [
          ...DEFAULT_TOOLBAR_ITEMS.filter(
            (item) => boot.aiEnabled || item.id !== "ai",
          ),
          {
            id: "desktop-settings",
            type: "button",
            label: "设置",
            title: "打开设置",
            icon: SETTINGS_ICON,
            onClick: () => this.settings.open(),
          },
        ],
      },
      preview: {
        maxWidth: "720px",
      },
      editor: this.buildEditorOptions(boot),
    };

    this.editor = new Cherry(this.root, options);
    this.editor.eventBus.on("editor:change", (payload: EditorChangePayload) => {
      if (this.applyingExternalUpdate) {
        return;
      }
      this.session.setText(payload.markdown, true);
    });
  }

  private applyExternalText(text: string): void {
    if (!this.editor) {
      return;
    }
    this.applyingExternalUpdate = true;
    this.editor.setMarkdown(text);
    this.applyingExternalUpdate = false;
  }

  private async setupMenu(): Promise<void> {
    const appIcon = await defaultWindowIcon();
    const menu = await Menu.new({
      items: [
        {
          text: "Cherry Markdown Next",
          items: [
            {
              item: {
                About: {
                  name: "Cherry Markdown Next",
                  icon: appIcon ?? undefined,
                },
              },
            },
            { item: "Separator" },
            {
              text: "设置…",
              accelerator: "CmdOrCtrl+,",
              action: () => this.settings.open(),
            },
            { item: "Separator" },
            { item: "Hide" },
            { item: "HideOthers" },
            { item: "ShowAll" },
            { item: "Separator" },
            { item: "Quit" },
          ],
        },
        {
          text: "文件",
          items: [
            {
              text: "新建",
              accelerator: "CmdOrCtrl+N",
              action: () => {
                void this.handleNew();
              },
            },
            {
              text: "打开…",
              accelerator: "CmdOrCtrl+O",
              action: () => {
                void this.handleOpen();
              },
            },
            {
              text: "保存",
              accelerator: "CmdOrCtrl+S",
              action: () => {
                void this.session.save();
              },
            },
            {
              text: "另存为…",
              accelerator: "CmdOrCtrl+Shift+S",
              action: () => {
                void this.session.saveAs();
              },
            },
          ],
        },
        {
          text: "编辑",
          items: [
            { item: "Undo" },
            { item: "Redo" },
            { item: "Separator" },
            { item: "Cut" },
            { item: "Copy" },
            { item: "Paste" },
            { item: "SelectAll" },
          ],
        },
      ],
    });
    await menu.setAsAppMenu();
  }

  private bindWindowEvents(): void {
    void getCurrentWindow().onCloseRequested(async (event) => {
      if (!(await this.session.confirmDiscard())) {
        event.preventDefault();
      }
    });
  }

  private bindAppearanceWatcher(): void {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const appearance = resolveAppearance();
      document.body.classList.toggle("cherry-dark", appearance === "dark");
      this.editor?.theme.setLightDark(appearance);
    };
    media.addEventListener("change", apply);
  }

  private async handleNew(): Promise<void> {
    if (await this.session.newDocument()) {
      this.createEditor(this.buildBoot());
    }
  }

  private async handleOpen(): Promise<void> {
    if (await this.session.openDocument()) {
      this.createEditor(this.buildBoot());
    }
  }
}
