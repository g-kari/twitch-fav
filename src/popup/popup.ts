import { loadStreamers, exportSettings, importSettings, saveStreamers } from '../utils/storage';

document.addEventListener('DOMContentLoaded', () => {
  // Handle export button
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const streamers = await loadStreamers();
      exportSettings(streamers);
    });
  }
  
  // Handle import button
  const importBtn = document.getElementById('import-btn');
  const importFile = document.getElementById('import-file') as HTMLInputElement;
  
  if (importBtn && importFile) {
    importBtn.addEventListener('click', () => {
      importFile.click();
    });
    
    importFile.addEventListener('change', async (event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      
      if (file) {
        try {
          const importedData = await importSettings(file);
          await saveStreamers(importedData);
          
          // Show success message
          alert('設定を正常にインポートしました。Twitchのページを再読み込みしてください。');
          
          // Reset input
          target.value = '';
        } catch (error) {
          console.error('Import error:', error);
          alert('設定のインポート中にエラーが発生しました。ファイル形式を確認してください。');
        }
      }
    });
  }
  
  // Handle options link
  const optionsLink = document.getElementById('options-link');
  if (optionsLink) {
    optionsLink.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }
});