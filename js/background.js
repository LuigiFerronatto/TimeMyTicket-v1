/**
 * Background script for TimeMyTicket extension
 * Runs as a service worker in the background
 */

// Global state for active timer
let activeTimerState = {
  activeTicket: null,
  timerStartTime: null,
  ticketTimers: {},
  ticketTitles: {},
  phaseTimers: {},
  currentPhases: {},
  lastPhaseChange: {}
};

let timerInterval = null;

// Initialize extension when installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('TimeMyTicket installed successfully');
  
  // Initialize storage if needed
  chrome.storage.local.get([
    'ticketTimers', 
    'activeTicket', 
    'timerStartTime',
    'ticketTitles',
    'phaseTimers', 
    'currentPhases',
    'lastPhaseChange'
  ], (result) => {
    if (result.ticketTimers) {
      // Load existing data
      activeTimerState = {
        ticketTimers: result.ticketTimers || {},
        activeTicket: result.activeTicket || null,
        timerStartTime: result.timerStartTime ? new Date(result.timerStartTime) : null,
        ticketTitles: result.ticketTitles || {},
        phaseTimers: result.phaseTimers || {},
        currentPhases: result.currentPhases || {},
        lastPhaseChange: result.lastPhaseChange || {}
      };
      
      // Start timer if one is active
      if (activeTimerState.activeTicket && activeTimerState.timerStartTime) {
        startTimerInterval();
      }
    } else {
      // Initialize storage
      chrome.storage.local.set({
        ticketTimers: {},  // Total time per ticket
        activeTicket: null, // Currently active ticket
        timerStartTime: null, // Timestamp of current timer start
        ticketTitles: {}, // Ticket titles
        
        // Phase tracking fields
        phaseTimers: {}, // Time per phase per ticket {ticketId: {phase1: seconds, phase2: seconds}}
        currentPhases: {}, // Current phase of each ticket
        lastPhaseChange: {} // Timestamp of last phase change
      });
    }
  });
  
  // Add context menu options
  chrome.contextMenus.create({
    id: "exportTimersReport",
    title: "Exportar relatório de tempo de tickets",
    contexts: ["page"],
    documentUrlPatterns: ["https://*.hubspot.com/*"]
  });

  chrome.contextMenus.create({
    id: "resetAllTimers",
    title: "Resetar todos os timers",
    contexts: ["page"],
    documentUrlPatterns: ["https://*.hubspot.com/*"]
  });
  
  chrome.contextMenus.create({
    id: "openSettings",
    title: "Abrir configurações do TimeMyTicket",
    contexts: ["page"],
    documentUrlPatterns: ["https://*.hubspot.com/*"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "exportTimersReport") {
    // Send message to content script to generate report
    chrome.tabs.sendMessage(tab.id, { action: "exportTimerReport" });
  }
  
  if (info.menuItemId === "resetAllTimers") {
    // Confirm reset with the user
    if (confirm('Tem certeza que deseja resetar todos os timers? Esta ação não pode ser desfeita.')) {
      // Clear all timers and phase data
      activeTimerState = {
        ticketTimers: {},
        activeTicket: null,
        timerStartTime: null,
        ticketTitles: {},
        phaseTimers: {},
        currentPhases: {},
        lastPhaseChange: {}
      };
      
      // Stop timer interval if running
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      
      // Save to storage
      chrome.storage.local.set({
        ticketTimers: {},
        activeTicket: null,
        timerStartTime: null,
        phaseTimers: {},
        currentPhases: {},
        lastPhaseChange: {}
      }, () => {
        // Notify open tabs
        chrome.tabs.query({url: "https://*.hubspot.com/*"}, (tabs) => {
          for (const tab of tabs) {
            chrome.tabs.sendMessage(tab.id, { 
              action: "showToast", 
              message: "Todos os timers foram resetados", 
              type: "success" 
            });
          }
        });
      });
    }
  }
  
  if (info.menuItemId === "openSettings") {
    // Open popup in a new tab
    chrome.tabs.create({
      url: chrome.runtime.getURL('popup.html')
    });
  }
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Save report data as CSV
  if (request.action === 'saveReportData') {
    // Create URL object for the blob
    const blob = new Blob([request.csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    // Create filename with current date
    const date = new Date();
    const fileName = `timeMyTicket-${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}.csv`;
    
    // Download the file
    chrome.downloads.download({
      url: url,
      filename: fileName,
      saveAs: true
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error("Error downloading:", chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError });
      } else {
        sendResponse({ success: true, downloadId: downloadId });
      }
    });
    
    return true; // Indicates that the response will be sent asynchronously
  }
  
  // Start timer for a ticket
  if (request.action === 'startTimer') {
    startTimer(request.ticketId, request.ticketTitle);
    sendResponse({ success: true });
    return false;
  }
  
  // Pause the active timer
  if (request.action === 'pauseTimer') {
    pauseTimer();
    sendResponse({ success: true });
    return false;
  }
  
  // Get timer state
  if (request.action === 'getTimerState') {
    sendResponse({
      activeTicket: activeTimerState.activeTicket,
      timerStartTime: activeTimerState.timerStartTime ? activeTimerState.timerStartTime.toISOString() : null,
      ticketTimers: activeTimerState.ticketTimers,
      ticketTitles: activeTimerState.ticketTitles
    });
    return false;
  }
  
  // Sync data between tabs
  if (request.action === 'syncData') {
    // Notify all open tabs to update their data
    chrome.tabs.query({url: "https://*.hubspot.com/*"}, (tabs) => {
      for (const tab of tabs) {
        if (tab.id !== sender.tab?.id) {
          chrome.tabs.sendMessage(tab.id, { action: "refreshTimers" });
        }
      }
    });
    return false; // No async response needed
  }
  
  // Show toast notification
  if (request.action === 'showToast') {
    if (sender.tab) {
      chrome.tabs.sendMessage(sender.tab.id, {
        action: 'showToast',
        message: request.message,
        type: request.type || 'info'
      });
    }
    return false; // No async response needed
  }
  
  // Handle adding time manually
  if (request.action === 'addTimeManually') {
    addTimeManually(request.ticketId, request.phase, request.seconds);
    sendResponse({ success: true });
    return false;
  }
  
  // Reset a specific ticket timer
  if (request.action === 'resetTicketTimer') {
    resetTicketTimer(request.ticketId);
    sendResponse({ success: true });
    return false;
  }
});

// Handle tab close to pause any active timer
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (activeTimerState.activeTicket && activeTimerState.timerStartTime) {
    pauseTimer();
  }
});

// Start a timer for a ticket
function startTimer(ticketId, ticketTitle) {
  // If another timer is active, pause it first
  if (activeTimerState.activeTicket) {
    pauseTimer();
  }
  
  // Set ticket as active
  activeTimerState.activeTicket = ticketId;
  activeTimerState.timerStartTime = new Date();
  
  // Store ticket title if provided
  if (ticketTitle) {
    activeTimerState.ticketTitles[ticketId] = ticketTitle;
  }
  
  // Initialize counter if it doesn't exist
  if (!activeTimerState.ticketTimers[ticketId]) {
    activeTimerState.ticketTimers[ticketId] = 0;
  }
  
  // Save current state
  chrome.storage.local.set({
    activeTicket: activeTimerState.activeTicket,
    timerStartTime: activeTimerState.timerStartTime.toISOString(),
    ticketTimers: activeTimerState.ticketTimers,
    ticketTitles: activeTimerState.ticketTitles
  });
  
  // Start timer interval
  startTimerInterval();
  
  // Notify all open tabs
  chrome.tabs.query({url: "https://*.hubspot.com/*"}, (tabs) => {
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, { 
        action: "timerStarted", 
        ticketId: ticketId 
      });
    }
  });
  
  console.log(`Timer started for ticket ${ticketId}`);
}

// Pause the active timer
function pauseTimer() {
  if (!activeTimerState.activeTicket || !activeTimerState.timerStartTime) return;
  
  // Calculate elapsed time
  const elapsedTime = Math.floor((new Date() - activeTimerState.timerStartTime) / 1000);
  
  // Add elapsed time to total time
  activeTimerState.ticketTimers[activeTimerState.activeTicket] = 
    (activeTimerState.ticketTimers[activeTimerState.activeTicket] || 0) + elapsedTime;
  
  // Store ticket ID before clearing
  const pausedTicketId = activeTimerState.activeTicket;
  
  // Clear active timer
  clearInterval(timerInterval);
  timerInterval = null;
  
  // Update state
  activeTimerState.activeTicket = null;
  activeTimerState.timerStartTime = null;
  
  // Save current state
  chrome.storage.local.set({
    activeTicket: null,
    timerStartTime: null,
    ticketTimers: activeTimerState.ticketTimers
  });
  
  // Notify all open tabs
  chrome.tabs.query({url: "https://*.hubspot.com/*"}, (tabs) => {
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, { 
        action: "timerPaused", 
        ticketId: pausedTicketId 
      });
    }
  });
  
  console.log(`Timer paused for ticket ${pausedTicketId}`);
}

// Add time manually to a ticket
function addTimeManually(ticketId, phase, seconds) {
  if (!ticketId || seconds <= 0) return false;
  
  // Add time to ticket total
  activeTimerState.ticketTimers[ticketId] = (activeTimerState.ticketTimers[ticketId] || 0) + seconds;
  
  // Add time to phase if provided
  if (phase) {
    // Initialize structure if needed
    if (!activeTimerState.phaseTimers[ticketId]) {
      activeTimerState.phaseTimers[ticketId] = {};
    }
    
    // Add time to specific phase
    activeTimerState.phaseTimers[ticketId][phase] = 
      (activeTimerState.phaseTimers[ticketId][phase] || 0) + seconds;
    
    // Save phase timers
    chrome.storage.local.set({
      phaseTimers: activeTimerState.phaseTimers
    });
  }
  
  // Save ticket timers
  chrome.storage.local.set({
    ticketTimers: activeTimerState.ticketTimers
  });
  
  // Notify all open tabs
  chrome.tabs.query({url: "https://*.hubspot.com/*"}, (tabs) => {
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, { 
        action: "timeAdded", 
        ticketId: ticketId,
        seconds: seconds
      });
    }
  });
  
  return true;
}

// Reset timer for a specific ticket
function resetTicketTimer(ticketId) {
  if (!ticketId) return false;
  
  // If the ticket is active, deactivate it
  if (activeTimerState.activeTicket === ticketId) {
    clearInterval(timerInterval);
    timerInterval = null;
    activeTimerState.activeTicket = null;
    activeTimerState.timerStartTime = null;
  }
  
  // Reset timer
  delete activeTimerState.ticketTimers[ticketId];
  
  // Reset phases
  delete activeTimerState.phaseTimers[ticketId];
  delete activeTimerState.currentPhases[ticketId];
  delete activeTimerState.lastPhaseChange[ticketId];
  
  // Save changes
  chrome.storage.local.set({
    activeTicket: activeTimerState.activeTicket,
    timerStartTime: activeTimerState.timerStartTime ? activeTimerState.timerStartTime.toISOString() : null,
    ticketTimers: activeTimerState.ticketTimers,
    phaseTimers: activeTimerState.phaseTimers,
    currentPhases: activeTimerState.currentPhases,
    lastPhaseChange: activeTimerState.lastPhaseChange
  });
  
  // Notify all open tabs
  chrome.tabs.query({url: "https://*.hubspot.com/*"}, (tabs) => {
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, { 
        action: "timerReset", 
        ticketId: ticketId 
      });
    }
  });
  
  return true;
}

// Start timer interval
function startTimerInterval() {
  // Clear existing interval if any
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  
  // Update badge text every second
  timerInterval = setInterval(() => {
    if (activeTimerState.activeTicket && activeTimerState.timerStartTime) {
      // Calculate elapsed time
      const baseSeconds = activeTimerState.ticketTimers[activeTimerState.activeTicket] || 0;
      const elapsedSeconds = Math.floor((new Date() - activeTimerState.timerStartTime) / 1000);
      const totalSeconds = baseSeconds + elapsedSeconds;
      
      // Format time for badge (MM:SS)
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const badgeText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      // Update badge
      chrome.action.setBadgeText({ text: badgeText });
      chrome.action.setBadgeBackgroundColor({ color: "#FF6F00" });
      
      // Update action title
      const ticketTitle = activeTimerState.ticketTitles[activeTimerState.activeTicket] || `#${activeTimerState.activeTicket}`;
      chrome.action.setTitle({ title: `Timer ativo: ${ticketTitle} - ${badgeText}` });
    }
  }, 1000);
}