import { MAX_IMPORT_BYTES, Streamers, validateStreamers } from './model';
export type { StreamerInfo, Streamers } from './model';
export const STORAGE_KEY = 'twitch_favorites_data';
export async function saveStreamers(streamers: Streamers): Promise<void> {
  const validated = validateStreamers(streamers);
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [STORAGE_KEY]: validated }, () => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message || '設定の保存に失敗しました。'));
      else resolve();
    });
  });
}
export async function loadStreamers(): Promise<Streamers> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([STORAGE_KEY], result => {
      const error = chrome.runtime.lastError;
      if (error) { reject(new Error(error.message || '設定の読込に失敗しました。')); return; }
      try { resolve(validateStreamers(result?.[STORAGE_KEY] ?? {})); } catch (error) { reject(error); }
    });
  });
}
export function exportSettings(streamers: Streamers): void {
  const data = JSON.stringify(validateStreamers(streamers), null, 2);
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `twitch-favorites-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function importSettings(file: File): Promise<Streamers> {
  if (file.size > MAX_IMPORT_BYTES) throw new Error('設定ファイルは1 MiB以下にしてください。');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        if (typeof reader.result !== 'string') throw new Error('ファイルを読み込めません。');
        resolve(validateStreamers(JSON.parse(reader.result)));
      } catch (error) { reject(error); }
    };
    reader.onerror = reader.onabort = () => reject(new Error('ファイルを読み込めません。'));
    reader.readAsText(file);
  });
}
