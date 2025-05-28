import { loadStreamers, exportSettings, importSettings, saveStreamers, StreamerInfo } from './storage';

/**
 * Set up export button event handler
 * @param exportBtnId - ID of the export button element
 * @param onSuccess - Optional callback on successful export
 */
export async function setupExportButton(
  exportBtnId: string,
  onSuccess?: (streamers: Record<string, StreamerInfo>) => void
): Promise<void> {
  const exportBtn = document.getElementById(exportBtnId);
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const streamers = await loadStreamers();
      exportSettings(streamers);
      if (onSuccess) {
        onSuccess(streamers);
      }
    });
  }
}

/**
 * Set up import button and file input event handlers
 * @param importBtnId - ID of the import button element
 * @param importFileId - ID of the file input element
 * @param onSuccess - Callback on successful import
 * @param onError - Callback on import error
 */
export function setupImportButton(
  importBtnId: string,
  importFileId: string,
  onSuccess: (importedData: Record<string, StreamerInfo>) => Promise<void>,
  onError: (error: Error) => void
): void {
  const importBtn = document.getElementById(importBtnId);
  const importFile = document.getElementById(importFileId) as HTMLInputElement;
  
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
          await onSuccess(importedData);
          
          // Reset input
          target.value = '';
        } catch (error) {
          console.error('Import error:', error);
          onError(error instanceof Error ? error : new Error(String(error)));
        }
      }
    });
  }
}

/**
 * Show a status message (for options page)
 * @param message - Message to display
 * @param type - Type of message (success or error)
 * @param elementId - ID of the status message element
 * @param timeout - Time in ms to show the message
 */
export function showStatusMessage(
  message: string, 
  type: 'success' | 'error',
  elementId: string = 'status-message',
  timeout: number = 3000
): void {
  const statusElement = document.getElementById(elementId);
  if (!statusElement) return;
  
  statusElement.textContent = message;
  statusElement.className = type;
  
  // Clear after specified timeout
  setTimeout(() => {
    statusElement.textContent = '';
    statusElement.className = '';
  }, timeout);
}