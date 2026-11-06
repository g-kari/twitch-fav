import { sendAction } from '../utils/actions';
import { setupExportButton, setupImportButton, showStatusMessage } from '../utils/importExport';
const errorMessage = (error: Error) => showStatusMessage(error.message, 'error');
document.addEventListener('DOMContentLoaded', () => {
  setupExportButton('export-btn', () => showStatusMessage('設定をエクスポートしました', 'success'), errorMessage);
  setupImportButton('import-btn', 'import-file', async data => {
    if (!confirm('現在の設定をファイルの内容で置き換えます。続けますか？')) return;
    await sendAction({ type: 'import', data });
    showStatusMessage('設定をインポートしました。開いているTwitchにも反映されます。', 'success');
  }, errorMessage);
  document.getElementById('options-link')?.addEventListener('click', event => {
    event.preventDefault();
    chrome.runtime.openOptionsPage(() => {
      const error = chrome.runtime.lastError;
      if (error) errorMessage(new Error(error.message || '設定画面を開けません。'));
    });
  });
}, { once: true });
