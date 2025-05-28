import { loadStreamers, saveStreamers, StreamerInfo } from '../utils/storage';
import { setupExportButton, setupImportButton, showStatusMessage } from '../utils/importExport';

let streamersList: Record<string, StreamerInfo> = {};

// Initialize the options page
async function init() {
  streamersList = await loadStreamers();
  renderFavoritesList();
  setupEventListeners();
}

// Render the favorites list
function renderFavoritesList() {
  const listElement = document.getElementById('favorites-list');
  if (!listElement) return;
  
  // Clear current list
  listElement.innerHTML = '';
  
  // Get favorites and sort by order
  const favorites = Object.values(streamersList)
    .filter(streamer => streamer.isFavorite)
    .sort((a, b) => a.order - b.order);
  
  if (favorites.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'empty-message';
    emptyMessage.textContent = 'お気に入りはまだ追加されていません';
    listElement.appendChild(emptyMessage);
    return;
  }
  
  // Create list items for each favorite
  favorites.forEach(favorite => {
    const item = document.createElement('div');
    item.className = 'favorite-item';
    item.setAttribute('draggable', 'true');
    item.dataset.streamerId = favorite.id;
    
    // Create avatar
    if (favorite.avatarUrl) {
      const avatar = document.createElement('img');
      avatar.src = favorite.avatarUrl;
      avatar.alt = favorite.displayName;
      item.appendChild(avatar);
    }
    
    // Create name
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = favorite.displayName;
    item.appendChild(name);
    
    // Create remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '削除';
    removeBtn.addEventListener('click', () => {
      favorite.isFavorite = false;
      saveStreamers(streamersList).then(() => {
        renderFavoritesList();
        showStatusMessage('お気に入りから削除しました', 'success');
      });
    });
    item.appendChild(removeBtn);
    
    // Add to list
    listElement.appendChild(item);
  });
  
  // Setup drag and drop for the list
  setupDragAndDrop();
}

// Set up drag and drop functionality
function setupDragAndDrop() {
  const items = document.querySelectorAll('.favorite-item');
  const list = document.getElementById('favorites-list');
  
  if (!list) return;
  
  let draggedItem: HTMLElement | null = null;
  
  items.forEach(item => {
    if (!(item instanceof HTMLElement)) return;
    
    item.addEventListener('dragstart', () => {
      draggedItem = item;
      setTimeout(() => {
        item.classList.add('dragging');
      }, 0);
    });
    
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      draggedItem = null;
    });
    
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    
    item.addEventListener('dragenter', (e) => {
      e.preventDefault();
      if (draggedItem !== item) {
        const rect = item.getBoundingClientRect();
        const y = e.clientY - rect.top;
        
        if (y < rect.height / 2) {
          list.insertBefore(draggedItem!, item);
        } else {
          list.insertBefore(draggedItem!, item.nextSibling);
        }
      }
    });
  });
  
  list.addEventListener('dragover', (e) => {
    e.preventDefault();
  });
  
  list.addEventListener('drop', (e) => {
    e.preventDefault();
    
    // Update order in the streamers list
    const items = document.querySelectorAll('.favorite-item');
    let order = 0;
    
    items.forEach(item => {
      const streamerId = item.getAttribute('data-streamer-id');
      if (streamerId && streamersList[streamerId]) {
        streamersList[streamerId].order = order++;
      }
    });
    
    // Save the new order
    saveStreamers(streamersList).then(() => {
      showStatusMessage('お気に入りの順序を更新しました', 'success');
    });
  });
}

// Set up event listeners for import/export
function setupEventListeners() {
  // Set up export functionality
  setupExportButton('export-btn', () => {
    showStatusMessage('設定をエクスポートしました', 'success');
  });
  
  // Set up import functionality
  setupImportButton(
    'import-btn',
    'import-file',
    async (importedData) => {
      // Merge with existing data (preserve non-favorites)
      Object.keys(importedData).forEach(key => {
        if (!streamersList[key] || importedData[key].isFavorite) {
          streamersList[key] = importedData[key];
        }
      });
      
      await saveStreamers(streamersList);
      renderFavoritesList();
      showStatusMessage('設定を正常にインポートしました', 'success');
    },
    () => {
      showStatusMessage('設定のインポート中にエラーが発生しました', 'error');
    }
  );
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);