import { createActionQueue } from './utils/actions';
const dispatch = createActionQueue();
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || message?.scope !== 'twitch-favorites') return false;
  dispatch(message.action).then(
    data => respond({ ok: true, data }),
    error => respond({ ok: false, error: error instanceof Error ? error.message : '保存に失敗しました。' })
  );
  return true;
});
