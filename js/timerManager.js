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
      
      // Resume active timer if needed
      if (this.activeTicket && this.timerStartTime) {
        console.log(`Resuming active timer for ticket ${this.activeTicket}`);
        this.resumeActiveTimer();
      }
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
        // If another timer is active, pause it first
        if (this.activeTicket) {
          this.pauseTimer();
        }
        
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
      console.log(`Starting timer for ticket: ${ticketId} - ${this.ticketTitles[ticketId] || 'Sem título'}`);
      
      // Set ticket as active
      this.activeTicket = ticketId;
      this.timerStartTime = new Date();
      
      // Initialize counter if it doesn't exist
      if (!this.ticketTimers[ticketId]) {
        this.ticketTimers[ticketId] = 0;
      }
      
      // Save current state
      Utils.saveToStorage({
        [CONFIG.storageKeys.activeTicket]: this.activeTicket,
        [CONFIG.storageKeys.timerStartTime]: this.timerStartTime.toISOString(),
        [CONFIG.storageKeys.ticketTimers]: this.ticketTimers
      });
      
      // Update UI
      this.updateTimerUI();
      
      // Start interval to update UI every second
      this.timerInterval = setInterval(() => this.updateTimerUI(), 1000);
      
      // Notify PhaseManager to check and update phase if needed
      if (window.phaseManager) {
        window.phaseManager.checkTicketPhase(ticketId);
      }
      
      // Apply active timer styles
      if (window.uiManager) {
        window.uiManager.updateActiveTimerStyles(ticketId, true);
      }
    }
    
    /**
     * Pause the active timer
     */
    pauseTimer() {
      if (!this.activeTicket || !this.timerStartTime) return;
      
      console.log(`Pausing timer for ticket: ${this.activeTicket} - ${this.ticketTitles[this.activeTicket] || 'Sem título'}`);
      
      // Calculate elapsed time
      const elapsedTime = Math.floor((new Date() - this.timerStartTime) / 1000);
      console.log(`Elapsed time: ${Utils.formatTimeWithSeconds(elapsedTime)}`);
      
      // Add elapsed time to total time
      this.ticketTimers[this.activeTicket] = (this.ticketTimers[this.activeTicket] || 0) + elapsedTime;
      console.log(`Updated total time for ticket: ${Utils.formatTimeWithSeconds(this.ticketTimers[this.activeTicket])}`);
      
      // Add time to current phase if available
      if (window.phaseManager) {
        window.phaseManager.addTimeToCurrentPhase(this.activeTicket, elapsedTime);
      }
      
      // Clear active timer
      clearInterval(this.timerInterval);
      this.timerInterval = null;
      
      // Store previous active ticket to update UI
      const oldActiveTicket = this.activeTicket;
      
      // Update state
      this.activeTicket = null;
      this.timerStartTime = null;
      
      // Save current state
      Utils.saveToStorage({
        [CONFIG.storageKeys.activeTicket]: null,
        [CONFIG.storageKeys.timerStartTime]: null,
        [CONFIG.storageKeys.ticketTimers]: this.ticketTimers
      });
      
      // Update UI
      this.updateTimerDisplay(oldActiveTicket, this.ticketTimers[oldActiveTicket]);
      
      // Remove active timer styles
      if (window.uiManager) {
        window.uiManager.updateActiveTimerStyles(oldActiveTicket, false);
      }
      
      // Notify other tabs to update
      this.notifyOtherTabs();
    }
    
    /**
     * Resume the active timer
     */
    resumeActiveTimer() {
      if (this.activeTicket && this.timerStartTime) {
        console.log(`Resuming timer for ticket: ${this.activeTicket}`);
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
          
          const timerDisplay = timerIcon.querySelector('.timer-display');
          if (timerDisplay) {
            timerDisplay.textContent = Utils.formatTimeWithSeconds(seconds);
          }
        }
      });
    }
    
    /**
     * Reset timer for a specific ticket
     * @param {string} ticketId - The ticket ID
     */
    resetTicketTimer(ticketId) {
      console.log(`Resetting timer for ticket: ${ticketId}`);
      
      // If the ticket is active, deactivate it
      if (this.activeTicket === ticketId) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.activeTicket = null;
        this.timerStartTime = null;
        
        // Remove active timer styles
        if (window.uiManager) {
          window.uiManager.updateActiveTimerStyles(ticketId, false);
        }
      }
      
      // Reset timer
      delete this.ticketTimers[ticketId];
      
      // Save changes
      Utils.saveToStorage({
        [CONFIG.storageKeys.activeTicket]: this.activeTicket,
        [CONFIG.storageKeys.timerStartTime]: this.timerStartTime ? this.timerStartTime.toISOString() : null,
        [CONFIG.storageKeys.ticketTimers]: this.ticketTimers
      });
      
      // Update UI
      this.updateTimerDisplay(ticketId, 0);
      
      // Notify other tabs to update
      this.notifyOtherTabs();
      
      return true;
    }
    
    /**
     * Add time manually to a ticket
     * @param {string} ticketId - The ticket ID
     * @param {number} seconds - Time in seconds to add
     */
    addTimeManually(ticketId, seconds) {
      if (!ticketId || seconds <= 0) return false;
      
      console.log(`Adding ${seconds} seconds to ticket ${ticketId}`);
      
      // Add time to ticket total
      this.ticketTimers[ticketId] = (this.ticketTimers[ticketId] || 0) + seconds;
      
      // Save changes
      Utils.saveToStorage({
        [CONFIG.storageKeys.ticketTimers]: this.ticketTimers
      });
      
      // Update UI
      this.updateTimerDisplay(ticketId, this.ticketTimers[ticketId]);
      
      // Notify other tabs to update
      this.notifyOtherTabs();
      
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
        
        // Extract status (current column)
        const column = card.closest('[data-test-id="cdb-column"]');
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
     * Notify other tabs about changes
     */
    notifyOtherTabs() {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'syncData' });
      }
    }
  }
  
  // Create global instance
  window.timerManager = new TimerManager();