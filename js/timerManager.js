/**
 * TimerManager handles all timer-related functionality
 */
class TimerManager {
  constructor() {
    // Core timer state
    this.ticketTimers = {}; // Total time per ticket
    this.activeTicket = null; // ID of active ticket
    this.timerStartTime = null; // When current timer started
    this.timerInterval = null; // Reference to interval
    this.ticketTitles = {}; // Store ticket titles
    
    // Load data from storage
    this.init();
  }
  
  /**
   * Initialize the timer manager
   */
  async init() {
    console.log('Initializing TimerManager');
    await this.loadDataFromStorage();
    
    // Sync with background script
    this.syncWithBackgroundScript();
    
    // Set up message listener for background updates
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'timerStarted') {
        this.handleTimerStarted(message.ticketId);
        sendResponse({ success: true });
      } else if (message.action === 'timerPaused') {
        this.handleTimerPaused(message.ticketId);
        sendResponse({ success: true });
      } else if (message.action === 'timeAdded') {
        this.handleTimeAdded(message.ticketId, message.seconds);
        sendResponse({ success: true });
      } else if (message.action === 'timerReset') {
        this.handleTimerReset(message.ticketId);
        sendResponse({ success: true });
      }
    });
  }
  
  /**
   * Sync state with background script
   */
  syncWithBackgroundScript() {
    chrome.runtime.sendMessage({ action: 'getTimerState' }, (response) => {
      if (response) {
        this.activeTicket = response.activeTicket;
        this.timerStartTime = response.timerStartTime ? new Date(response.timerStartTime) : null;
        this.ticketTimers = response.ticketTimers || {};
        this.ticketTitles = response.ticketTitles || {};
        
        // Start UI updater if there's an active timer
        if (this.activeTicket && this.timerStartTime) {
          this.resumeActiveTimer();
        }
        
        console.log('Synced with background script:', {
          ticketsMonitored: Object.keys(this.ticketTimers).length,
          activeTicket: this.activeTicket
        });
      }
    });
  }
  
  /**
   * Load timer data from storage
   */
  async loadDataFromStorage() {
    const data = await Utils.getFromStorage([
      CONFIG.storageKeys.ticketTimers,
      CONFIG.storageKeys.activeTicket,
      CONFIG.storageKeys.timerStartTime,
      CONFIG.storageKeys.ticketTitles
    ]);
    
    this.ticketTimers = data[CONFIG.storageKeys.ticketTimers] || {};
    this.activeTicket = data[CONFIG.storageKeys.activeTicket] || null;
    this.timerStartTime = data[CONFIG.storageKeys.timerStartTime] ? new Date(data[CONFIG.storageKeys.timerStartTime]) : null;
    this.ticketTitles = data[CONFIG.storageKeys.ticketTitles] || {};
    
    console.log('Timer data loaded:', { 
      ticketsMonitored: Object.keys(this.ticketTimers).length,
      activeTicket: this.activeTicket
    });
  }
  
  /**
   * Toggle timer for a ticket (start or pause)
   * @param {string} ticketId - The ticket ID
   */
  toggleTimer(ticketId) {
    console.log(`Toggle timer for ticket: ${ticketId}`);
    
    // If clicked ticket is already active, pause it
    if (this.activeTicket === ticketId) {
      this.pauseTimer();
      Utils.showToast('Timer pausado', 'info');
    } else {
      // Start timer for the new ticket
      this.startTimer(ticketId);
      Utils.showToast('Timer iniciado', 'success');
    }
  }
  
  /**
   * Start timer for a ticket
   * @param {string} ticketId - The ticket ID
   */
  startTimer(ticketId) {
    const ticketTitle = this.ticketTitles[ticketId] || `Ticket #${ticketId}`;
    console.log(`Starting timer for ticket: ${ticketId} - ${ticketTitle}`);
    
    // Store ticket title
    this.ticketTitles[ticketId] = ticketTitle;
    
    // Send message to background script to start timer
    chrome.runtime.sendMessage({ 
      action: 'startTimer', 
      ticketId: ticketId,
      ticketTitle: ticketTitle
    });
    
    // Set local state (will be updated in syncWithBackgroundScript)
    this.activeTicket = ticketId;
    this.timerStartTime = new Date();
    
    // Notify PhaseManager to check and update phase if needed
    if (window.phaseManager) {
      window.phaseManager.checkTicketPhase(ticketId);
    }
    
    // Update UI immediately (will be refreshed when background responds)
    this.updateTimerUI();
    
    // Apply active timer styles
    if (window.uiManager) {
      window.uiManager.updateActiveTimerStyles(ticketId, true);
    }
  }
  
  /**
   * Handle timer started message from background
   */
  handleTimerStarted(ticketId) {
    // Sync with background to get latest state
    this.syncWithBackgroundScript();
    
    // Apply active timer styles
    if (window.uiManager) {
      window.uiManager.updateActiveTimerStyles(ticketId, true);
    }
  }
  
  /**
   * Pause the active timer
   */
  pauseTimer() {
    if (!this.activeTicket) return;
    
    console.log(`Pausing timer for ticket: ${this.activeTicket} - ${this.ticketTitles[this.activeTicket] || 'Sem título'}`);
    
    // Store previous active ticket to update UI
    const oldActiveTicket = this.activeTicket;
    
    // Send message to background script to pause timer
    chrome.runtime.sendMessage({ action: 'pauseTimer' });
    
    // Clear local timer if running
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    // Update local state (will be updated in syncWithBackgroundScript)
    this.activeTicket = null;
    this.timerStartTime = null;
    
    // Update UI for the previously active ticket
    if (oldActiveTicket && window.uiManager) {
      window.uiManager.updateActiveTimerStyles(oldActiveTicket, false);
    }
  }
  
  /**
   * Handle timer paused message from background
   */
  handleTimerPaused(ticketId) {
    // Sync with background to get latest state
    this.syncWithBackgroundScript();
    
    // Remove active timer styles
    if (window.uiManager) {
      window.uiManager.updateActiveTimerStyles(ticketId, false);
    }
  }
  
  /**
   * Resume the active timer
   */
  resumeActiveTimer() {
    if (this.activeTicket && this.timerStartTime) {
      console.log(`Resuming timer for ticket: ${this.activeTicket}`);
      
      // Start local UI updater
      this.updateTimerUI();
      this.timerInterval = setInterval(() => this.updateTimerUI(), 1000);
      
      // Apply active timer styles
      if (window.uiManager) {
        window.uiManager.updateActiveTimerStyles(this.activeTicket, true);
      }
    }
  }
  
  /**
   * Update the timer UI
   */
  updateTimerUI() {
    if (!this.activeTicket || !this.timerStartTime) return;
    
    // Calculate total time (accumulated + current)
    const accumulated = this.ticketTimers[this.activeTicket] || 0;
    const current = Math.floor((new Date() - this.timerStartTime) / 1000);
    const totalSeconds = accumulated + current;
    
    // Update timer display
    this.updateTimerDisplay(this.activeTicket, totalSeconds);
  }
  
  /**
   * Update the timer display for a specific ticket
   * @param {string} ticketId - The ticket ID
   * @param {number} seconds - Time in seconds
   */
  updateTimerDisplay(ticketId, seconds) {
    // Find all timer displays for this ticket
    const cards = document.querySelectorAll(`${CONFIG.selectors.ticketCardSelector}[${CONFIG.selectors.ticketIdAttribute}="${ticketId}"]`);
    
    cards.forEach(card => {
      const timerIcon = card.querySelector('.ticket-timer-icon');
      if (timerIcon) {
        // Ensure it's expanded to show time
        if (!timerIcon.classList.contains('expanded')) {
          timerIcon.classList.add('expanded');
          timerIcon.classList.remove('minimized');
        }
        
        // Update time display
        const timerDisplay = timerIcon.querySelector('.timer-display');
        if (timerDisplay) {
          timerDisplay.textContent = Utils.formatTimeWithSeconds(seconds);
        }
      }
    });
  }
  
  /**
   * Handle time added message from background
   */
  handleTimeAdded(ticketId, seconds) {
    // Sync with background to get latest state
    this.syncWithBackgroundScript();
    
    // Update UI
    const totalSeconds = this.ticketTimers[ticketId] || 0;
    this.updateTimerDisplay(ticketId, totalSeconds);
  }
  
  /**
   * Reset timer for a specific ticket
   * @param {string} ticketId - The ticket ID
   */
  resetTicketTimer(ticketId) {
    console.log(`Resetting timer for ticket: ${ticketId}`);
    
    // Send message to background script to reset timer
    chrome.runtime.sendMessage({ 
      action: 'resetTicketTimer', 
      ticketId: ticketId 
    });
    
    // Clear local timer if this is the active ticket
    if (this.activeTicket === ticketId) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
      this.activeTicket = null;
      this.timerStartTime = null;
    }
    
    // Remove from local state (will be updated in syncWithBackgroundScript)
    delete this.ticketTimers[ticketId];
    
    // Update UI
    this.updateTimerDisplay(ticketId, 0);
    
    // Remove active timer styles
    if (window.uiManager) {
      window.uiManager.updateActiveTimerStyles(ticketId, false);
    }
    
    return true;
  }
  
/**
     * Handle timer reset message from background
     */
handleTimerReset(ticketId) {
  // Sync with background to get latest state
  this.syncWithBackgroundScript();
  
  // Update UI
  this.updateTimerDisplay(ticketId, 0);
  
  // Remove active timer styles
  if (window.uiManager) {
    window.uiManager.updateActiveTimerStyles(ticketId, false);
  }
}

/**
 * Add time manually to a ticket
 * @param {string} ticketId - The ticket ID
 * @param {number} seconds - Time in seconds to add
 */
addTimeManually(ticketId, seconds) {
  if (!ticketId || seconds <= 0) return false;
  
  // Get current phase if PhaseManager exists
  const currentPhase = window.phaseManager ? 
                       window.phaseManager.currentPhases[ticketId] : null;
  
  // Send message to background script to add time
  chrome.runtime.sendMessage({ 
    action: 'addTimeManually', 
    ticketId: ticketId,
    phase: currentPhase,
    seconds: seconds
  });
  
  // Add time to local state (will be updated in syncWithBackgroundScript)
  this.ticketTimers[ticketId] = (this.ticketTimers[ticketId] || 0) + seconds;
  
  // Update UI
  this.updateTimerDisplay(ticketId, this.ticketTimers[ticketId]);
  
  return true;
}

/**
 * Get ticket information
 * @param {string} ticketId - The ticket ID
 * @returns {Object} Ticket information
 */
getTicketInfo(ticketId) {
  // Find the ticket card in the DOM
  const card = document.querySelector(`${CONFIG.selectors.ticketCardSelector}[${CONFIG.selectors.ticketIdAttribute}="${ticketId}"]`);
  
  // Default values
  const ticketInfo = {
    id: ticketId,
    title: this.ticketTitles[ticketId] || `Ticket #${ticketId}`,
    owner: 'Desconhecido',
    cda: 'Não informado',
    status: 'Desconhecido'
  };
  
  if (card) {
    // Extract ticket title
    const titleElement = card.querySelector(CONFIG.selectors.cardTitleSelector);
    if (titleElement) {
      ticketInfo.title = titleElement.textContent.trim();
      // Update stored title
      this.ticketTitles[ticketId] = ticketInfo.title;
      Utils.saveToStorage({ [CONFIG.storageKeys.ticketTitles]: this.ticketTitles });
    }
    
    // Extract ticket owner
    const ownerElement = card.querySelector(CONFIG.selectors.cardOwnerSelector);
    if (ownerElement) {
      ticketInfo.owner = ownerElement.textContent.trim();
    }
    
    // Extract CDA responsible
    const cdaElement = card.querySelector(CONFIG.selectors.cdaResponsibleSelector);
    if (cdaElement) {
      ticketInfo.cda = cdaElement.textContent.trim();
    }
    
    // Extract status (current column/phase)
    const column = this.findCardColumn(card);
    if (column) {
      const columnNameElement = column.querySelector(CONFIG.selectors.phaseNameSelector);
      if (columnNameElement) {
        ticketInfo.status = columnNameElement.textContent.trim();
      }
    }
  }
  
  return ticketInfo;
}

/**
 * Find the column containing a card
 * @param {HTMLElement} card - The card element
 * @returns {HTMLElement|null} The column element
 */
findCardColumn(card) {
  // Find the column by traversing up the DOM
  let currentElement = card;
  
  // Try to find the column container
  while (currentElement && !currentElement.matches('[data-test-id="cdb-column"]')) {
    currentElement = currentElement.parentElement;
  }
  
  return currentElement;
}
}

// Create global instance
window.timerManager = new TimerManager();