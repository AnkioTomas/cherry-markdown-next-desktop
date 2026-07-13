import { LazyStore } from "@tauri-apps/plugin-store";

export type UploadMode = "off" | "local" | "script" | "picgo" | "upic";

export type AiActionId =
  | "polish"
  | "proofread"
  | "translate"
  | "summarize"
  | "custom";

export type AiProvider =
  | "openai"
  | "openrouter"
  | "deepseek"
  | "moonshot"
  | "ollama"
  | "custom";

export type ConfigListener = () => void;

export const CONFIG_DEFAULTS: Record<string, unknown> = {
  "ui.layout": "split",
  "ui.theme": "default",
  "ui.statusbar": true,
  "ui.sidebar": true,
  "ui.lineNumbers": true,
  "upload.mode": "off",
  "upload.directory": "assets",
  "upload.script": "",
  "upload.picgoPath": "",
  "upload.upicPath": "",
  "upload.timeoutMs": 60_000,
  "ai.enabled": false,
  "ai.provider": "openai",
  "ai.endpoint": "",
  "ai.apiKey": "",
  "ai.apiKeyEnv": "",
  "ai.model": "",
  "ai.temperature": -1,
  "ai.headers": {},
  "ai.timeoutMs": 120_000,
  "ai.prompt.polish": "",
  "ai.prompt.proofread": "",
  "ai.prompt.translate": "",
  "ai.prompt.summarize": "",
  "ai.prompt.custom": "",
};

const DEFAULTS = CONFIG_DEFAULTS;

export class CherryConfig {
  private readonly store = new LazyStore("cherry-config.json");
  private readonly cache = new Map<string, unknown>();
  private readonly listeners = new Set<ConfigListener>();
  private loaded = false;

  async load(): Promise<void> {
    const entries = await this.store.entries();
    this.cache.clear();
    for (const [key, value] of entries) {
      this.cache.set(key, value);
    }
    this.loaded = true;
  }

  onChange(listener: ConfigListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getItem<T>(key: string, def: T): T {
    if (!this.loaded) {
      return (DEFAULTS[key] as T | undefined) ?? def;
    }
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }
    return (DEFAULTS[key] as T | undefined) ?? def;
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    this.cache.set(key, value);
    await this.store.set(key, value);
    await this.store.save();
    for (const listener of this.listeners) {
      listener();
    }
  }

  async setMany(values: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(values)) {
      this.cache.set(key, value);
      await this.store.set(key, value);
    }
    await this.store.save();
    for (const listener of this.listeners) {
      listener();
    }
  }

  snapshot(): Record<string, unknown> {
    const result: Record<string, unknown> = { ...DEFAULTS };
    for (const [key, value] of this.cache) {
      result[key] = value;
    }
    return result;
  }
}
