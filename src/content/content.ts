import { StreamerInfo, loadStreamers, saveStreamers } from '../utils/storage';

// Constants
const SIDEBAR_SELECTOR = '[data-a-target="side-nav-header"] + div';
const CHANNEL_ITEM_SELECTOR = 'a[data-a-target="followed-channel"]';
const STAR_ICON = '★';
const FAV_SEPARATOR_ID = 'twitch-fav-separator';

// Global state
let streamersList: Record<string, StreamerInfo> = {};
let sidebarObserver: MutationObserver | null = null;
let isDragging = false;
let draggedElement: HTMLElement | null = null;

// Main initialization function
async function init() {
  streamersList = await loadStreamers();
  
  // Wait for sidebar to be loaded
  const waitForSidebar = setInterval(() => {
    const sidebar = document.querySelector(SIDEBAR_SELECTOR);
    if (sidebar) {
      clearInterval(waitForSidebar);
      initSidebar();
      
      // Set up observer for sidebar changes
      setupSidebarObserver();
    }
  }, 1000);
}

// Initialize the sidebar elements
function initSidebar() {
  const channels = document.querySelectorAll(CHANNEL_ITEM_SELECTOR);
  if (channels.length === 0) return;

  // Process each channel
  Array.from(channels).forEach(processChannelElement);
  
  // Apply ordering based on favorites
  applyChannelOrdering();
}

// Process a single channel element
function processChannelElement(channelElement: Element) {
  if (!(channelElement instanceof HTMLElement)) return;
  if (channelElement.dataset.twitchFavProcessed === 'true') return;
  
  // Extract streamer info
  const channelUrl = channelElement.getAttribute('href');
  if (!channelUrl) return;
  
  const username = channelUrl.substring(1); // Remove leading slash
  const displayNameElement = channelElement.querySelector('[data-a-target="side-nav-title"]');
  const displayName = displayNameElement ? displayNameElement.textContent || username : username;
  
  const avatarElement = channelElement.querySelector('img');
  const avatarUrl = avatarElement ? avatarElement.getAttribute('src') || undefined : undefined;
  
  // Create unique ID
  const streamerId = `streamer-${username}`;
  
  // Add to our data structure if not exists
  if (!streamersList[streamerId]) {
    streamersList[streamerId] = {
      id: streamerId,
      username,
      displayName,
      avatarUrl,
      isFavorite: false,
      order: Object.keys(streamersList).length,
    };
  } else {
    // Update display name and avatar if changed
    streamersList[streamerId].displayName = displayName;
    if (avatarUrl) {
      streamersList[streamerId].avatarUrl = avatarUrl;
    }
  }
  
  // Add favorite star icon
  const starIcon = document.createElement('span');
  starIcon.className = 'twitch-fav-star';
  starIcon.textContent = STAR_ICON;
  if (streamersList[streamerId].isFavorite) {
    starIcon.classList.add('active');
  }
  
  starIcon.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Toggle favorite state
    streamersList[streamerId].isFavorite = !streamersList[streamerId].isFavorite;
    
    // Update UI
    if (streamersList[streamerId].isFavorite) {
      starIcon.classList.add('active');
    } else {
      starIcon.classList.remove('active');
    }
    
    // Save changes
    saveStreamers(streamersList).then(() => {
      applyChannelOrdering();
    });
  });
  
  // Add the star to the channel element
  const titleElement = channelElement.querySelector('[data-a-target="side-nav-title"]');
  if (titleElement) {
    titleElement.appendChild(starIcon);
  }
  
  // Add drag functionality
  channelElement.classList.add('twitch-sidebar-channel');
  channelElement.setAttribute('draggable', 'true');
  
  channelElement.addEventListener('dragstart', (e) => {
    if (!(e.target instanceof HTMLElement)) return;
    isDragging = true;
    draggedElement = channelElement;
    channelElement.classList.add('dragging');
    
    // Set streamer ID as drag data
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', streamerId);
      e.dataTransfer.effectAllowed = 'move';
    }
  });
  
  channelElement.addEventListener('dragend', () => {
    isDragging = false;
    channelElement.classList.remove('dragging');
    draggedElement = null;
  });
  
  channelElement.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (isDragging && draggedElement !== channelElement) {
      e.dataTransfer!.dropEffect = 'move';
    }
  });
  
  channelElement.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!isDragging || !draggedElement || draggedElement === channelElement) return;
    
    const draggedId = e.dataTransfer!.getData('text/plain');
    const targetId = streamerId;
    
    if (draggedId && draggedId !== targetId) {
      // Reorder the streamers list
      const draggedOrder = streamersList[draggedId].order;
      const targetOrder = streamersList[targetId].order;
      
      if (draggedOrder < targetOrder) {
        // Moving down
        Object.values(streamersList).forEach(streamer => {
          if (streamer.order > draggedOrder && streamer.order <= targetOrder) {
            streamer.order--;
          }
        });
      } else {
        // Moving up
        Object.values(streamersList).forEach(streamer => {
          if (streamer.order >= targetOrder && streamer.order < draggedOrder) {
            streamer.order++;
          }
        });
      }
      
      streamersList[draggedId].order = targetOrder;
      
      // Save changes and update UI
      saveStreamers(streamersList).then(() => {
        applyChannelOrdering();
      });
    }
  });
  
  // Mark as processed
  channelElement.dataset.twitchFavProcessed = 'true';
}

// Apply ordering to channels based on favorites
function applyChannelOrdering() {
  const sidebar = document.querySelector(SIDEBAR_SELECTOR);
  if (!sidebar) return;
  
  const channels = Array.from(document.querySelectorAll(CHANNEL_ITEM_SELECTOR));
  if (channels.length === 0) return;
  
  // Get all favorited streamers
  const favorites = Object.values(streamersList)
    .filter(streamer => streamer.isFavorite)
    .sort((a, b) => a.order - b.order);
  
  // Only proceed if we have favorites
  if (favorites.length > 0) {
    // Create or update separator element
    let separator = document.getElementById(FAV_SEPARATOR_ID);
    if (!separator) {
      separator = document.createElement('div');
      separator.id = FAV_SEPARATOR_ID;
      separator.className = 'twitch-fav-separator';
      separator.textContent = 'お気に入り';
      
      // Insert at top of sidebar
      if (sidebar.firstChild) {
        sidebar.insertBefore(separator, sidebar.firstChild);
      } else {
        sidebar.appendChild(separator);
      }
    }
    
    // Move favorite channels to the top
    favorites.forEach(favorite => {
      const channelElement = findChannelElement(favorite.username);
      if (channelElement) {
        // Move to top, right after the separator
        sidebar.insertBefore(channelElement, separator.nextSibling);
      }
    });
  } else {
    // Remove separator if no favorites
    const separator = document.getElementById(FAV_SEPARATOR_ID);
    if (separator) {
      separator.remove();
    }
  }
}

// Find channel element by username
function findChannelElement(username: string): HTMLElement | null {
  const href = `/${username}`;
  const elements = document.querySelectorAll(CHANNEL_ITEM_SELECTOR);
  
  for (const element of Array.from(elements)) {
    if (element.getAttribute('href') === href) {
      return element as HTMLElement;
    }
  }
  
  return null;
}

// Set up observer for sidebar changes
function setupSidebarObserver() {
  if (sidebarObserver) {
    sidebarObserver.disconnect();
  }
  
  const sidebar = document.querySelector(SIDEBAR_SELECTOR);
  if (!sidebar) return;
  
  sidebarObserver = new MutationObserver((mutations) => {
    let shouldUpdate = false;
    
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Check if any added nodes are channel elements
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof HTMLElement) {
            if (node.matches(CHANNEL_ITEM_SELECTOR)) {
              processChannelElement(node);
              shouldUpdate = true;
            } else {
              // Check for channel elements inside the added node
              const channels = node.querySelectorAll(CHANNEL_ITEM_SELECTOR);
              if (channels.length > 0) {
                channels.forEach(processChannelElement);
                shouldUpdate = true;
              }
            }
          }
        }
      }
    }
    
    if (shouldUpdate) {
      applyChannelOrdering();
    }
  });
  
  sidebarObserver.observe(sidebar, { childList: true, subtree: true });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}