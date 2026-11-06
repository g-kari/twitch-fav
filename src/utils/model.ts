export interface StreamerInfo {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isFavorite: boolean;
  order: number;
}
export type Streamers = Record<string, StreamerInfo>;
export const MAX_IMPORT_BYTES = 1024 * 1024;
export const MAX_STREAMERS = 5000;
export function channelName(href: string): string | null {
  const match = /^\/([a-z0-9_]{1,25})\/?$/i.exec(href);
  return match ? match[1].toLowerCase() : null;
}
export function safeAvatarUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 2048) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'static-cdn.jtvnw.net' || url.port || url.username || url.password || url.search || url.hash) return undefined;
    if (!/^\/(jtv_user_pictures|ttv-static)\/[a-z0-9_./-]+\.(png|jpe?g|webp)$/i.test(url.pathname)) return undefined;
    return url.href;
  } catch { return undefined; }
}
export function validateStreamers(value: unknown): Streamers {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('設定はJSONオブジェクトである必要があります。');
  const entries = Object.entries(value);
  if (entries.length > MAX_STREAMERS) throw new Error('チャンネル数が上限を超えています。');
  const result: Streamers = {};
  for (const [key, raw] of entries) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('チャンネル情報が不正です。');
    const item = raw as Record<string, unknown>;
    if (typeof item.username !== 'string' || !/^[a-z0-9_]{1,25}$/i.test(item.username) ||
        key !== `streamer-${item.username}` || item.id !== key ||
        typeof item.displayName !== 'string' || !item.displayName.trim() || item.displayName.length > 200 ||
        typeof item.isFavorite !== 'boolean' || !Number.isSafeInteger(item.order) || (item.order as number) < 0) {
      throw new Error('チャンネルのID・名前・お気に入り・順序を確認してください。');
    }
    const username = item.username.toLowerCase();
    const id = `streamer-${username}`;
    if (Object.hasOwn(result, id)) throw new Error('チャンネルが重複しています。');
    // Preserve Twitch CDN avatars; never load arbitrary URLs supplied by an import.
    result[id] = { id, username, displayName: item.displayName, isFavorite: item.isFavorite, order: item.order as number };
    const avatarUrl = safeAvatarUrl(item.avatarUrl);
    if (avatarUrl) result[id].avatarUrl = avatarUrl;
  }
  return result;
}
export function sortedStreamers(data: Streamers): StreamerInfo[] {
  return Object.values(data).sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite) || a.order - b.order || a.id.localeCompare(b.id));
}
export function moveStreamer(data: Streamers, id: string, targetId: string): Streamers {
  const result = validateStreamers(data);
  if (!Object.hasOwn(result, id) || !Object.hasOwn(result, targetId) || id === targetId) return result;
  if (result[id].isFavorite !== result[targetId].isFavorite) throw new Error('同じグループ内で並べ替えてください。');
  const ordered = sortedStreamers(result);
  const from = ordered.findIndex(item => item.id === id);
  const to = ordered.findIndex(item => item.id === targetId);
  const [item] = ordered.splice(from, 1);
  ordered.splice(to, 0, item);
  ordered.forEach((streamer, index) => { streamer.order = index; });
  return result;
}
