/**
 * Background script for TimeMyTicket extension
 * Runs as a service worker in the background
 */

// Initialize extension when installed
chrome.runtime.onInstalled.addListener(() => {
    console.log('TimeMyTicket instalado com sucesso');
    
    // Initialize storage if needed
    chrome.storage.local.get([
      'ticketTimers', 
      'activeTicket', 
      'phaseTimers', 
      'currentPhases',
      'lastPhaseChange'
    ], (result) => {
      if (!result.ticketTimers) {
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
    
    // Add context menu option to export report
    chrome.contextMenus.create({
      id: "exportTimersReport",
      title: "Exportar relatório de tempo de tickets",
      contexts: ["page"],
      documentUrlPatterns: ["https://*.hubspot.com/*"]
    });
  
    // Add context menu option to reset all timers
    chrome.contextMenus.create({
      id: "resetAllTimers",
      title: "Resetar todos os timers",
      contexts: ["page"],
      documentUrlPatterns: ["https://*.hubspot.com/*"]
    });
    
    // Add context menu option for settings
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
        chrome.storage.local.set({
          ticketTimers: {},
          activeTicket: null,
          timerStartTime: null,
          phaseTimers: {},
          currentPhases: {},
          lastPhaseChange: {}
        }, () => {
          // Notify user
          chrome.tabs.sendMessage(tab.id, { 
            action: "showToast", 
            message: "Todos os timers foram resetados", 
            type: "success" 
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
  });
  
  // Handle tab close to pause any active timer
  chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    chrome.storage.local.get([
      'activeTicket', 
      'timerStartTime', 
      'ticketTimers',
      'phaseTimers',
      'currentPhases'
    ], (data) => {
      if (data.activeTicket && data.timerStartTime) {
        // Calculate elapsed time
        const startTime = new Date(data.timerStartTime);
        const elapsedTime = Math.floor((new Date() - startTime) / 1000);
        
        // Add elapsed time to total
        const ticketTimers = data.ticketTimers || {};
        ticketTimers[data.activeTicket] = (ticketTimers[data.activeTicket] || 0) + elapsedTime;
        
        // Add time to current phase if available
        const phaseTimers = data.phaseTimers || {};
        const currentPhases = data.currentPhases || {};
        const currentPhase = currentPhases[data.activeTicket];
        
        if (currentPhase) {
          // Initialize structure if needed
          if (!phaseTimers[data.activeTicket]) {
            phaseTimers[data.activeTicket] = {};
          }
          
          // Add time to current phase
          phaseTimers[data.activeTicket][currentPhase] = 
            (phaseTimers[data.activeTicket][currentPhase] || 0) + elapsedTime;
        }
        
        // Update storage
        chrome.storage.local.set({
          activeTicket: null,
          timerStartTime: null,
          ticketTimers: ticketTimers,
          phaseTimers: phaseTimers
        });
        
        console.log(`Timer automatically paused for ticket ${data.activeTicket} due to tab close.`);
      }
    });
  });