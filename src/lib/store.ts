import { load, type Store } from "@tauri-apps/plugin-store";

export type AppSettings = {
  googleBooksApiKey?: string;
};

const STORE_FILE = ".settings.json";
const SETTINGS_KEY = "settings";

let storePromise: Promise<Store> | null = null;

function getStore() {
  if (!storePromise) {
    storePromise = load(STORE_FILE); // stored in app data dir
  }
  return storePromise;
}

export async function loadSettings<
  T extends Record<string, unknown> = AppSettings,
>() {
  const store = await getStore();
  return (await store.get<T>(SETTINGS_KEY)) ?? ({} as T);
}

export async function saveSettings(partial: Partial<AppSettings>) {
  const store = await getStore();
  const current = ((await store.get<AppSettings>(SETTINGS_KEY)) ??
    {}) as AppSettings;
  const next: AppSettings = { ...current, ...partial };
  await store.set(SETTINGS_KEY, next);
  await store.save();
  return next;
}

export async function clearSettings() {
  const store = await getStore();
  await store.set(SETTINGS_KEY, {});
  await store.save();
}

export async function removeStoreFile() {
  const store = await getStore();
  await store.clear();
  await store.save();
}
