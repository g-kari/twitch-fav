import { Streamers, sortedStreamers } from '../utils/model';
import { STORAGE_KEY, loadStreamers } from '../utils/storage';
import { Action, sendAction } from '../utils/actions';
import { setupExportButton, setupImportButton, showStatusMessage } from '../utils/importExport';
let data: Streamers = {};
let busy = false;
let draggedId: string | null = null;
const errorMessage = (error: unknown) => showStatusMessage(error instanceof Error ? error.message : '操作に失敗しました。', 'error');
async function commit(action: Action, success: string): Promise<void> {
  if (busy) { const error = new Error('保存中です。少し待ってから再試行してください。'); errorMessage(error); throw error; }
  const focusKey = (document.activeElement as HTMLElement | null)?.dataset.focusKey;
  busy = true;
  render();
  try { data = await sendAction(action); showStatusMessage(success, 'success'); }
  catch (error) { errorMessage(error); throw error; }
  finally {
    busy = false; render();
    if (focusKey) {
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-focus-key]'));
      (buttons.find(button => button.dataset.focusKey === focusKey && !button.disabled) ?? buttons.find(button => !button.disabled) ?? document.getElementById('export-btn'))?.focus();
    }
  }
}
function render() {
  const list = document.getElementById('favorites-list');
  if (!list) return;
  const focused = document.activeElement as HTMLElement | null;
  const focusKey = focused?.dataset.focusKey;
  list.replaceChildren();
  const favorites = sortedStreamers(data).filter(item => item.isFavorite);
  if (!favorites.length) {
    const empty = document.createElement('div'); empty.className = 'empty-message';
    empty.textContent = 'お気に入りはまだ追加されていません'; list.appendChild(empty);
  }
  favorites.forEach((favorite, index) => {
    const row = document.createElement('div'); row.className = 'favorite-item';
    row.draggable = !busy; row.dataset.streamerId = favorite.id;
    if (favorite.avatarUrl) {
      const avatar = document.createElement('img'); avatar.src = favorite.avatarUrl; avatar.alt = ''; avatar.referrerPolicy = 'no-referrer'; avatar.width = 30; avatar.height = 30; row.appendChild(avatar);
    }
    const name = document.createElement('div'); name.className = 'name'; name.textContent = favorite.displayName; row.appendChild(name);
    const button = (label: string, suffix: string, action: Action, disabled = false) => {
      const element = document.createElement('button'); element.textContent = label; element.type = 'button';
      element.dataset.focusKey = `${favorite.id}-${suffix}`;
      element.setAttribute('aria-label', `${favorite.displayName}: ${label}`);
      element.disabled = busy || disabled;
      element.addEventListener('click', () => { void commit(action, '設定を保存しました').catch(() => undefined); });
      row.appendChild(element);
    };
    button('上へ', 'up', { type: 'move', id: favorite.id, targetId: favorites[index - 1]?.id ?? favorite.id }, index === 0);
    button('下へ', 'down', { type: 'move', id: favorite.id, targetId: favorites[index + 1]?.id ?? favorite.id }, index === favorites.length - 1);
    button('削除', 'remove', { type: 'remove', id: favorite.id });
    row.addEventListener('dragstart', event => {
      if (busy) { event.preventDefault(); return; }
      draggedId = favorite.id;
      event.dataTransfer?.setData('text/plain', favorite.id);
      row.classList.add('dragging');
    });
    row.addEventListener('dragend', () => { draggedId = null; row.classList.remove('dragging'); });
    row.addEventListener('dragover', event => { if (draggedId) event.preventDefault(); });
    row.addEventListener('drop', event => {
      event.preventDefault();
      const id = draggedId; draggedId = null;
      if (id && id !== favorite.id) void commit({ type: 'move', id, targetId: favorite.id }, '順序を保存しました').catch(() => undefined);
    });
    list.appendChild(row);
  });
  if (focusKey) Array.from(list.querySelectorAll<HTMLElement>('[data-focus-key]')).find(element => element.dataset.focusKey === focusKey)?.focus();
}
async function refresh() {
  try { data = await loadStreamers(); render(); } catch (error) { errorMessage(error); }
}
document.addEventListener('DOMContentLoaded', () => {
  setupExportButton('export-btn', () => showStatusMessage('設定をエクスポートしました', 'success'), errorMessage);
  setupImportButton('import-btn', 'import-file', async imported => {
    if (!confirm('現在の設定をファイルの内容で置き換えます。続けますか？')) return;
    await commit({ type: 'import', data: imported }, '設定をインポートしました');
  }, errorMessage);
  document.getElementById('clear-btn')?.addEventListener('click', () => {
    if (confirm('保存したお気に入りと並び順をすべて削除します。続けますか？')) void commit({ type: 'clear' }, '設定を初期化しました').catch(() => undefined);
  });
  chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes[STORAGE_KEY]) void refresh(); });
  void refresh();
}, { once: true });
