import { StreamerInfo, Streamers, moveStreamer, validateStreamers } from './model';
import { loadStreamers, saveStreamers } from './storage';
export type Action =
  | { type: 'toggle'; streamer: StreamerInfo }
  | { type: 'remove'; id: string }
  | { type: 'move'; id: string; targetId: string; discovered?: Streamers }
  | { type: 'import'; data: Streamers }
  | { type: 'clear' };
export function applyAction(data: Streamers, action: Action): Streamers {
  let result = validateStreamers(data);
  switch (action.type) {
    case 'toggle': {
      const item = Object.values(validateStreamers({ [action.streamer.id]: action.streamer }))[0];
      const previous = result[item.id];
      result[item.id] = { ...item, isFavorite: !previous?.isFavorite, order: previous?.order ?? Object.keys(result).length };
      break;
    }
    case 'remove':
      if (Object.hasOwn(result, action.id)) result[action.id].isFavorite = false;
      break;
    case 'move': {
      const discovered = validateStreamers(action.discovered ?? {});
      for (const item of Object.values(discovered)) {
        if (!result[item.id]) result[item.id] = { ...item, isFavorite: false, order: Object.keys(result).length };
      }
      result = moveStreamer(result, action.id, action.targetId);
      break;
    }
    case 'import': return validateStreamers(action.data);
    case 'clear': return {};
    default: throw new Error('未対応の操作です。');
  }
  return validateStreamers(result);
}
// All writes go through one extension service worker to avoid stale-tab overwrites.
export function createActionQueue(load = loadStreamers, save = saveStreamers) {
  let queue: Promise<unknown> = Promise.resolve();
  return (action: Action): Promise<Streamers> => {
    const operation = queue.then(async () => {
      // A valid explicit import/clear can recover corrupted local settings.
      const existing = action.type === 'import' || action.type === 'clear' ? {} : await load();
      const next = applyAction(existing, action);
      await save(next);
      return next;
    });
    queue = operation.catch(() => undefined);
    return operation;
  };
}
export async function sendAction(action: Action): Promise<Streamers> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ scope: 'twitch-favorites', action }, response => {
      const error = chrome.runtime.lastError;
      if (error) { reject(new Error(error.message || '設定を保存できません。')); return; }
      if (!response?.ok) { reject(new Error(response?.error || '設定を保存できません。')); return; }
      try { resolve(validateStreamers(response.data)); } catch (error) { reject(error); }
    });
  });
}
