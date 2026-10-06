import { Action, sendAction } from '../utils/actions';
import { StreamerInfo, Streamers, channelName, safeAvatarUrl, sortedStreamers, validateStreamers } from '../utils/model';
import { STORAGE_KEY, loadStreamers } from '../utils/storage';

const SIDEBAR = '[data-a-target="side-nav-header"] + div';
const CHANNEL = 'a[data-a-target="followed-channel"]';
export function startContent() {
  let data: Streamers = {};
  let discovered: Streamers = {};
  let ready = false;
  let busy = false;
  let draggedId: string | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let sidebar: Element | null = null;
  const processed = new WeakSet<HTMLElement>();
  const observer = new MutationObserver(mutations => {
    if (!sidebar?.isConnected || mutations.some(mutation => sidebar?.contains(mutation.target))) schedule();
  });
  function watch() {
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
  }
  function schedule() {
    if (timer !== undefined) return;
    timer = setTimeout(() => { timer = undefined; render(); }, 50);
  }
  function notify(message: string) {
    let status = document.getElementById('twitch-fav-status');
    if (!status) {
      status = document.createElement('div');
      status.id = 'twitch-fav-status';
      status.setAttribute('role', 'status');
      (sidebar ?? document.body).appendChild(status);
    }
    status.textContent = message;
  }
  function info(anchor: HTMLElement): StreamerInfo | null {
    const username = channelName(anchor.getAttribute('href') ?? '');
    if (!username) return null;
    const id = `streamer-${username}`;
    const title = anchor.querySelector('[data-a-target="side-nav-title"]')?.cloneNode(true) as HTMLElement | undefined;
    title?.querySelectorAll('.twitch-fav-star').forEach(star => star.remove());
    const displayName = title?.textContent?.trim().slice(0, 200) || username;
    return { id, username, displayName, avatarUrl: safeAvatarUrl(anchor.querySelector('img')?.getAttribute('src')), isFavorite: data[id]?.isFavorite ?? false,
      order: data[id]?.order ?? discovered[id]?.order ?? Object.keys(data).length + Object.keys(discovered).length };
  }
  async function commit(action: Action) {
    if (!ready || busy) return;
    busy = true;
    render();
    try { data = await sendAction(action); notify('保存しました'); }
    catch (error) { notify(error instanceof Error ? error.message : '保存できませんでした。'); }
    finally { busy = false; render(); }
  }
  function process(anchor: HTMLElement) {
    const item = info(anchor);
    if (!item) { anchor.querySelector('.twitch-fav-star')?.remove(); delete anchor.dataset.twitchFavId; anchor.draggable = false; return; }
    discovered[item.id] = item;
    anchor.dataset.twitchFavId = item.id;
    let star = anchor.querySelector<HTMLElement>('.twitch-fav-star');
    const title = anchor.querySelector('[data-a-target="side-nav-title"]');
    if (!star && title) {
      // Span avoids invalid button-inside-link markup. Explicit keyboard behavior below.
      star = document.createElement('span');
      star.className = 'twitch-fav-star';
      star.setAttribute('role', 'button');
      star.tabIndex = 0;
      star.textContent = '★';
      title.appendChild(star);
      const activate = (event: Event) => {
        event.preventDefault(); event.stopPropagation();
        const current = info(anchor);
        if (current) void commit({ type: 'toggle', streamer: current });
      };
      star.addEventListener('click', activate);
      star.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') activate(event);
      });
    }
    if (star) {
      star.classList.toggle('active', item.isFavorite);
      star.setAttribute('aria-pressed', String(item.isFavorite));
      star.setAttribute('aria-disabled', String(!ready || busy));
      star.setAttribute('aria-label', `${item.displayName}をお気に入り${item.isFavorite ? 'から削除' : 'に追加'}`);
      star.title = 'お気に入りの切り替え';
    }
    anchor.classList.add('twitch-sidebar-channel');
    anchor.draggable = ready && !busy;
    if (processed.has(anchor)) return;
    processed.add(anchor);
    anchor.addEventListener('dragstart', event => {
      if (!ready || busy) { event.preventDefault(); return; }
      draggedId = info(anchor)?.id ?? null;
      if (event.dataTransfer && draggedId) {
        event.dataTransfer.setData('text/plain', draggedId);
        event.dataTransfer.effectAllowed = 'move';
      }
      anchor.classList.add('dragging');
    });
    anchor.addEventListener('dragend', () => { draggedId = null; anchor.classList.remove('dragging'); schedule(); });
    anchor.addEventListener('dragover', event => {
      if (!draggedId) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    });
    anchor.addEventListener('drop', event => {
      if (!draggedId) return;
      event.preventDefault(); event.stopPropagation();
      const targetId = info(anchor)?.id;
      const id = draggedId;
      draggedId = null;
      if (targetId && id !== targetId) void commit({ type: 'move', id, targetId, discovered });
    });
  }
  function render() {
    sidebar = document.querySelector(SIDEBAR);
    if (!sidebar || draggedId) return;
    observer.disconnect();
    try {
      const channels = Array.from(sidebar.querySelectorAll<HTMLElement>(CHANNEL));
      channels.forEach(process);
      const ranks = new Map(sortedStreamers({ ...discovered, ...data }).map((item, index) => [item.id, index]));
      const groups = new Map<Element, HTMLElement[]>();
      for (const anchor of channels) {
        if (!anchor.dataset.twitchFavId) continue;
        let unit = anchor;
        // Keep Twitch's existing card wrappers intact, never extract anchors from React cards.
        while (unit.parentElement && unit.parentElement !== sidebar &&
               unit.parentElement.querySelectorAll(CHANNEL).length === 1) unit = unit.parentElement;
        const parent = unit.parentElement;
        if (!parent || !sidebar.contains(parent)) continue;
        const group = groups.get(parent) ?? [];
        if (!group.includes(unit)) group.push(unit);
        groups.set(parent, group);
      }
      for (const [parent, units] of groups) {
        const id = (unit: HTMLElement) => unit.dataset.twitchFavId ?? unit.querySelector<HTMLElement>(CHANNEL)?.dataset.twitchFavId ?? '';
        const desired = [...units].sort((a, b) => (ranks.get(id(a)) ?? Infinity) - (ranks.get(id(b)) ?? Infinity));
        if (units.every((unit, index) => unit === desired[index])) continue;
        // Replace only channel slots; preserve labels, recommendations and other sibling nodes.
        const slots = units.map(unit => { const marker = document.createComment('twitch-fav-slot'); parent.insertBefore(marker, unit); return marker; });
        units.forEach(unit => unit.remove());
        slots.forEach((slot, index) => slot.replaceWith(desired[index]));
      }
    } finally { watch(); }
  }
  const changed = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
    if (area !== 'local' || !changes[STORAGE_KEY]) return;
    try { data = validateStreamers(changes[STORAGE_KEY].newValue ?? {}); ready = true; discovered = {}; }
    catch { ready = false; notify('保存データを読み込めません。設定画面で再インポートまたは初期化してください。'); }
    schedule();
  };
  chrome.storage.onChanged.addListener(changed);
  watch();
  void loadStreamers().then(value => { data = value; ready = true; render(); }, () => {
    render(); notify('設定を読み込めません。設定画面で再インポートまたは初期化してください。');
  });
  return () => { observer.disconnect(); if (timer !== undefined) clearTimeout(timer); chrome.storage.onChanged.removeListener(changed); };
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => startContent(), { once: true });
else startContent();
