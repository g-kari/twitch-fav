// Types for our data structure
export interface StreamerInfo {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isFavorite: boolean;
  order: number;
}

// Storage keys
export const STORAGE_KEY = 'twitch_favorites_data';

// Save data to Chrome storage
export async function saveStreamers(streamers: Record<string, StreamerInfo>): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [STORAGE_KEY]: streamers }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

// Load data from Chrome storage
export async function loadStreamers(): Promise<Record<string, StreamerInfo>> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      if (result && result[STORAGE_KEY]) {
        resolve(result[STORAGE_KEY] as Record<string, StreamerInfo>);
      } else {
        resolve({});
      }
    });
  });
}

// Export settings to JSON file
export function exportSettings(streamers: Record<string, StreamerInfo>): void {
  const data = JSON.stringify(streamers, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `twitch-favorites-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  
  // Clean up
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
}

// Import settings from JSON file
export async function importSettings(file: File): Promise<Record<string, StreamerInfo>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (typeof result === 'string') {
          const data = JSON.parse(result) as Record<string, StreamerInfo>;
          resolve(data);
        } else {
          reject(new Error('Failed to read file'));
        }
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsText(file);
  });
}