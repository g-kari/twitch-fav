import { loadStreamers, exportSettings, importSettings, Streamers } from './storage';
export function setupExportButton(exportBtnId: string, onSuccess?: (data: Streamers) => void, onError: (error: Error) => void = error => alert(error.message)): void {
  const button = document.getElementById(exportBtnId) as HTMLButtonElement | null;
  button?.addEventListener('click', async () => {
    if (button.disabled) return;
    button.disabled = true;
    try { const data = await loadStreamers(); exportSettings(data); onSuccess?.(data); }
    catch (error) { onError(error instanceof Error ? error : new Error('エクスポートに失敗しました。')); }
    finally { button.disabled = false; }
  });
}
export function setupImportButton(importBtnId: string, importFileId: string, onSuccess: (data: Streamers) => Promise<void>, onError: (error: Error) => void): void {
  const button = document.getElementById(importBtnId) as HTMLButtonElement | null;
  const input = document.getElementById(importFileId) as HTMLInputElement | null;
  if (!button || !input) return;
  let busy = false;
  button.addEventListener('click', () => { if (!busy) input.click(); });
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file || busy) return;
    busy = true; button.disabled = true;
    try { await onSuccess(await importSettings(file)); }
    catch (error) { onError(error instanceof Error ? error : new Error('インポートに失敗しました。')); }
    finally { input.value = ''; button.disabled = false; busy = false; }
  });
}
const timers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();
export function showStatusMessage(message: string, type: 'success' | 'error', elementId = 'status-message', timeout = 5000): void {
  const element = document.getElementById(elementId);
  if (!element) return;
  clearTimeout(timers.get(element));
  element.textContent = message; element.className = type;
  timers.set(element, setTimeout(() => { element.textContent = ''; element.className = ''; }, timeout));
}
