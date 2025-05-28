import { saveStreamers } from '../utils/storage';
import { setupExportButton, setupImportButton } from '../utils/importExport';

document.addEventListener('DOMContentLoaded', () => {
  // Set up export functionality
  setupExportButton('export-btn');
  
  // Set up import functionality
  setupImportButton(
    'import-btn',
    'import-file',
    async (importedData) => {
      await saveStreamers(importedData);
      // Show success message
      alert('設定を正常にインポートしました。Twitchのページを再読み込みしてください。');
    },
    () => {
      alert('設定のインポート中にエラーが発生しました。ファイル形式を確認してください。');
    }
  );
  
  // Handle options link
  const optionsLink = document.getElementById('options-link');
  if (optionsLink) {
    optionsLink.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }
});