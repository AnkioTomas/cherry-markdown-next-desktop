import type { AiProvider, CherryConfig, UploadMode } from "../host/CherryConfig";
import { AI_PROVIDERS } from "../host/CherryAi";

type Field =
  | {
      key: string;
      label: string;
      type: "text" | "number" | "checkbox" | "textarea";
    }
  | {
      key: string;
      label: string;
      type: "select";
      options: Array<{ value: string; label: string }>;
    };

const UI_FIELDS: Field[] = [
  {
    key: "ui.layout",
    label: "布局",
    type: "select",
    options: [
      { value: "split", label: "分栏" },
      { value: "edit", label: "仅编辑" },
      { value: "preview", label: "仅预览" },
    ],
  },
  {
    key: "ui.theme",
    label: "主题",
    type: "select",
    options: [
      "default",
      "github",
      "claude",
      "morandi",
      "latex",
      "vue",
      "notion",
    ].map((value) => ({ value, label: value })),
  },
  { key: "ui.statusbar", label: "状态栏", type: "checkbox" },
  { key: "ui.sidebar", label: "侧边栏", type: "checkbox" },
  { key: "ui.lineNumbers", label: "行号", type: "checkbox" },
];

const UPLOAD_FIELDS: Field[] = [
  {
    key: "upload.mode",
    label: "上传模式",
    type: "select",
    options: [
      { value: "off", label: "关闭" },
      { value: "local", label: "本地 assets" },
      { value: "script", label: "自定义脚本" },
      { value: "picgo", label: "PicGo" },
      { value: "upic", label: "uPic" },
    ],
  },
  { key: "upload.directory", label: "本地目录", type: "text" },
  { key: "upload.script", label: "脚本路径", type: "text" },
  { key: "upload.picgoPath", label: "PicGo 路径", type: "text" },
  { key: "upload.upicPath", label: "uPic 路径", type: "text" },
  { key: "upload.timeoutMs", label: "超时(ms)", type: "number" },
];

const AI_FIELDS: Field[] = [
  { key: "ai.enabled", label: "启用 AI", type: "checkbox" },
  {
    key: "ai.provider",
    label: "供应商",
    type: "select",
    options: (Object.keys(AI_PROVIDERS) as AiProvider[]).map((value) => ({
      value,
      label: AI_PROVIDERS[value].label,
    })),
  },
  { key: "ai.endpoint", label: "Endpoint", type: "text" },
  { key: "ai.apiKey", label: "API Key", type: "text" },
  { key: "ai.apiKeyEnv", label: "API Key 环境变量", type: "text" },
  { key: "ai.model", label: "模型", type: "text" },
  { key: "ai.temperature", label: "温度(-1默认)", type: "number" },
  { key: "ai.timeoutMs", label: "超时(ms)", type: "number" },
  { key: "ai.prompt.polish", label: "润色提示词", type: "textarea" },
  { key: "ai.prompt.proofread", label: "校对提示词", type: "textarea" },
  { key: "ai.prompt.translate", label: "翻译提示词", type: "textarea" },
  { key: "ai.prompt.summarize", label: "摘要提示词", type: "textarea" },
  { key: "ai.prompt.custom", label: "自定义提示词", type: "textarea" },
];

function fieldValue(config: CherryConfig, field: Field): string | boolean {
  if (field.type === "checkbox") {
    return config.getItem<boolean>(field.key, false);
  }
  if (field.type === "number") {
    return String(config.getItem<number>(field.key, 0));
  }
  return String(config.getItem<string>(field.key, ""));
}

function renderFields(fields: Field[], config: CherryConfig): string {
  return fields
    .map((field) => {
      const value = fieldValue(config, field);
      const id = `cfg-${field.key}`;
      if (field.type === "checkbox") {
        return `<label class="cherry-dialog-field cherry-dialog-field--check" for="${id}"><input id="${id}" data-key="${field.key}" type="checkbox" ${value ? "checked" : ""} /><span>${escapeHtml(field.label)}</span></label>`;
      }
      if (field.type === "select") {
        const options = field.options
          .map(
            (opt) =>
              `<option value="${opt.value}" ${opt.value === value ? "selected" : ""}>${escapeHtml(opt.label)}</option>`,
          )
          .join("");
        return `<label class="cherry-dialog-field" for="${id}">${escapeHtml(field.label)}<select id="${id}" data-key="${field.key}">${options}</select></label>`;
      }
      if (field.type === "textarea") {
        return `<label class="cherry-dialog-field" for="${id}">${escapeHtml(field.label)}<textarea id="${id}" data-key="${field.key}" rows="4">${escapeHtml(String(value))}</textarea></label>`;
      }
      return `<label class="cherry-dialog-field" for="${id}">${escapeHtml(field.label)}<input id="${id}" data-key="${field.key}" type="${field.type}" value="${escapeHtml(String(value))}" /></label>`;
    })
    .join("");
}

function renderSection(title: string, fields: Field[], config: CherryConfig): string {
  return `
    <p class="cherry-dialog-table-hint cherry-dialog-section">${escapeHtml(title)}</p>
    ${renderFields(fields, config)}
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function readValues(root: HTMLElement): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const el of root.querySelectorAll<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >("[data-key]")) {
    const key = el.dataset.key!;
    if (el instanceof HTMLInputElement && el.type === "checkbox") {
      values[key] = el.checked;
      continue;
    }
    if (el instanceof HTMLInputElement && el.type === "number") {
      values[key] = Number(el.value);
      continue;
    }
    values[key] = el.value;
  }

  if (typeof values["upload.mode"] === "string") {
    values["upload.mode"] = values["upload.mode"] as UploadMode;
  }
  return values;
}

export class SettingsPanel {
  private host: HTMLElement | null = null;
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      this.close();
    }
  };

  constructor(
    private readonly config: CherryConfig,
    private readonly onSaved: () => void,
  ) {}

  open(): void {
    if (this.host) {
      return;
    }

    const mount =
      document.querySelector<HTMLElement>("#cherry-root .cherry") ??
      document.getElementById("cherry-root");
    if (!mount) {
      throw new Error("Missing cherry mount for settings dialog");
    }

    const host = document.createElement("div");
    host.className = "cherry-dialog-host";
    host.innerHTML = `
      <button type="button" class="cherry-dialog-backdrop" aria-label="关闭"></button>
      <div class="cherry-dialog-panel" role="dialog" aria-modal="true">
        <div class="cherry-dialog-body">
          <form class="cherry-dialog-form cherry-dialog-form--settings">
            <div class="cherry-dialog-table-head">
              <span class="cherry-dialog-table-title">设置</span>
            </div>
            <div class="cherry-dialog-form-scroll-area">
              ${renderSection("界面", UI_FIELDS, this.config)}
              ${renderSection("文件上传", UPLOAD_FIELDS, this.config)}
              ${renderSection("AI", AI_FIELDS, this.config)}
            </div>
            <div class="cherry-dialog-actions">
              <button type="button" data-action="cancel">取消</button>
              <button type="button" class="is-primary" data-action="save">保存</button>
            </div>
          </form>
        </div>
      </div>
    `;

    host
      .querySelector(".cherry-dialog-backdrop")
      ?.addEventListener("click", () => this.close());
    host
      .querySelector('[data-action="cancel"]')
      ?.addEventListener("click", () => this.close());
    host
      .querySelector('[data-action="save"]')
      ?.addEventListener("click", (event) => {
        event.preventDefault();
        void this.save(host);
      });
    host.querySelector("form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      void this.save(host);
    });

    mount.appendChild(host);
    this.host = host;
    document.addEventListener("keydown", this.onKeyDown);
  }

  close(): void {
    if (!this.host) {
      return;
    }
    document.removeEventListener("keydown", this.onKeyDown);
    this.host.classList.add("is-closing");
    const host = this.host;
    this.host = null;
    window.setTimeout(() => host.remove(), 200);
  }

  private async save(root: HTMLElement): Promise<void> {
    const values = readValues(root);
    await this.config.setMany(values);
    this.close();
    this.onSaved();
  }
}
