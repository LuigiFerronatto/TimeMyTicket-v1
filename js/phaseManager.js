/**
 * PhaseManager handles all phase-related functionality
 */
class PhaseManager {
  constructor() {
    // Phase tracking state
    this.phaseTimers = {}; // Time per phase per ticket
    this.currentPhases = {}; // Current phase per ticket
    this.lastPhaseChange = {}; // Timestamp of last phase change
    
    // Load data from storage
    this.init();
  }
  
  /**
   * Initialize the phase manager
   */
  async init() {
    console.log('Initializing PhaseManager');
    await this.loadDataFromStorage();
    
    // Start detecting phases after a short delay
    setTimeout(() => {
      this.detectAndTrackPhases();
    }, 1500);
  }
  
  /**
   * Load phase data from storage
   */
  async loadDataFromStorage() {
    const data = await Utils.getFromStorage([
      CONFIG.storageKeys.phaseTimers,
      CONFIG.storageKeys.currentPhases,
      CONFIG.storageKeys.lastPhaseChange
    ]);
    
    this.phaseTimers = data[CONFIG.storageKeys.phaseTimers] || {};
    this.currentPhases = data[CONFIG.storageKeys.currentPhases] || {};
    this.lastPhaseChange = data[CONFIG.storageKeys.lastPhaseChange] || {};
    
    console.log('Phase data loaded:', { 
      phasesTracked: Object.keys(this.phaseTimers).length
    });
  }
  
  /**
   * Detect and track phases for all visible tickets
   */
  detectAndTrackPhases() {
    console.log('Detecting and tracking phases...');
    
    // Find all columns/phases
    const columns = document.querySelectorAll('[data-test-id="cdb-column"]');
    console.log(`Found ${columns.length} columns/phases`);
    
    // Track visible tickets to detect removed ones
    const visibleTickets = new Set();
    
    // Process each column
    columns.forEach(column => {
      // Get phase name
      const phaseNameElement = column.querySelector(CONFIG.selectors.phaseNameSelector);
      if (!phaseNameElement) {
        console.warn('Phase name element not found in column', column);
        return;
      }
      
      const phaseName = phaseNameElement.textContent.trim().toUpperCase();
      console.log(`Processing phase: ${phaseName}`);
      
      // Get all tickets in this phase
      const ticketCards = column.querySelectorAll(CONFIG.selectors.ticketCardSelector);
      console.log(`Found ${ticketCards.length} tickets in phase "${phaseName}"`);
      
      ticketCards.forEach(card => {
        const ticketId = card.getAttribute(CONFIG.selectors.ticketIdAttribute);
        if (!ticketId) {
          console.warn('Ticket ID not found for card', card);
          return;
        }
        
        // Mark this ticket as seen
        visibleTickets.add(ticketId);
        
        // Initialize phase tracking if this is the first encounter with the ticket
        if (!this.currentPhases[ticketId]) {
          console.log(`Initializing tracking for ticket ${ticketId} in phase "${phaseName}"`);
          this.currentPhases[ticketId] = phaseName;
          this.lastPhaseChange[ticketId] = new Date().toISOString();
          
          // Save to storage
          this.savePhaseData();
        }
        // Check if the ticket has changed phase
        else if (this.currentPhases[ticketId] !== phaseName) {
          console.log(`Ticket ${ticketId} changed from phase "${this.currentPhases[ticketId]}" to "${phaseName}"`);
          this.handlePhaseChange(ticketId, phaseName);
        }
      });
    });
    
    // Check current phase of active ticket
    if (window.timerManager && window.timerManager.activeTicket) {
      this.checkTicketPhase(window.timerManager.activeTicket);
    }
  }
  
  /**
   * Check and update the current phase of a ticket
   * @param {string} ticketId - The ticket ID
   */
  checkTicketPhase(ticketId) {
    const ticketCard = document.querySelector(`${CONFIG.selectors.ticketCardSelector}[${CONFIG.selectors.ticketIdAttribute}="${ticketId}"]`);
    if (!ticketCard) {
      console.warn(`Ticket card not found for ID: ${ticketId}`);
      return;
    }
    
    // Find the column containing the card
    let currentElement = ticketCard;
    let column = null;
    
    // Traverse up the DOM to find the column
    while (currentElement && !column) {
      if (currentElement.matches('[data-test-id="cdb-column"]')) {
        column = currentElement;
      }
      currentElement = currentElement.parentElement;
    }
    
    if (!column) {
      console.warn(`Column not found for ticket: ${ticketId}`);
      return;
    }
    
    const phaseNameElement = column.querySelector(CONFIG.selectors.phaseNameSelector);
    if (!phaseNameElement) {
      console.warn(`Phase name element not found for ticket: ${ticketId}`);
      return;
    }
    
    const currentPhaseName = phaseNameElement.textContent.trim().toUpperCase();
    console.log(`Current phase for ticket ${ticketId}: "${currentPhaseName}"`);
    
    if (!this.currentPhases[ticketId]) {
      // Initialize phase tracking
      console.log(`Initializing tracking for ticket ${ticketId} in phase "${currentPhaseName}"`);
      this.currentPhases[ticketId] = currentPhaseName;
      this.lastPhaseChange[ticketId] = new Date().toISOString();
      this.savePhaseData();
    }
    else if (this.currentPhases[ticketId] !== currentPhaseName) {
      // Handle phase change
      console.log(`Updating phase of ticket ${ticketId} to "${currentPhaseName}"`);
      this.handlePhaseChange(ticketId, currentPhaseName);
    } else {
      // If phase is the same but we're just starting tracking, update the timestamp
      this.lastPhaseChange[ticketId] = new Date().toISOString();
      this.savePhaseData();
    }
  }
  
  /**
   * Handle a phase change for a ticket
   * @param {string} ticketId - The ticket ID
   * @param {string} newPhase - The new phase
   */
  handlePhaseChange(ticketId, newPhase) {
    console.log(`Ticket ${ticketId} moved to phase: ${newPhase}`);
    
    const now = new Date();
    const oldPhase = this.currentPhases[ticketId];
    
    // If the ticket was already being tracked, account for time in previous phase
    if (oldPhase && this.lastPhaseChange[ticketId]) {
      const previousStartTime = new Date(this.lastPhaseChange[ticketId]);
      const timeInPreviousPhase = Math.floor((now - previousStartTime) / 1000);
      
      // Only count time if it's reasonable (avoid issues with incorrect timestamps)
      if (timeInPreviousPhase > 0 && timeInPreviousPhase < 86400 * 30) { // Not more than 30 days
        console.log(`Calculating time in previous phase: ${oldPhase}, time: ${timeInPreviousPhase} seconds`);
        
        // Initialize the structure if needed
        if (!this.phaseTimers[ticketId]) {
          this.phaseTimers[ticketId] = {};
        }
        
        // Accumulate time in previous phase
        this.phaseTimers[ticketId][oldPhase] = (this.phaseTimers[ticketId][oldPhase] || 0) + timeInPreviousPhase;
        
        console.log(`Added ${Utils.formatTimeWithSeconds(timeInPreviousPhase)} to phase "${oldPhase}" for ticket ${ticketId}`);
        console.log(`Total in phase "${oldPhase}": ${Utils.formatTimeWithSeconds(this.phaseTimers[ticketId][oldPhase])}`);
        
        // If the ticket is active, don't add to total time (the timer will handle that)
        if (window.timerManager && window.timerManager.activeTicket === ticketId) {
          console.log(`Ticket ${ticketId} is active. Timer will handle the total time.`);
        } else {
          // If the ticket is not active, add spent time to total time
          if (window.timerManager) {
            window.timerManager.addTimeManually(ticketId, timeInPreviousPhase);
          }
        }
      } else {
        console.warn(`Invalid time calculated for previous phase: ${timeInPreviousPhase}s. Ignoring.`);
      }
    }
    
    // Update current phase and timestamp
    this.currentPhases[ticketId] = newPhase;
    this.lastPhaseChange[ticketId] = now.toISOString();
    
    // Save to storage
    this.savePhaseData();
    
    // Show notification
    Utils.showToast(`Ticket movido para "${newPhase}"`, 'info');
    
    // Update UI if needed
    if (window.timerManager) {
      window.timerManager.updateTimerDisplay(ticketId, window.timerManager.ticketTimers[ticketId] || 0);
    }
  }
  
  /**
   * Add time to a specific phase
   * @param {string} ticketId - The ticket ID
   * @param {string} phaseName - The phase name
   * @param {number} seconds - Time in seconds to add
   */
  addTimeToPhase(ticketId, phaseName, seconds) {
    if (!ticketId || !phaseName || seconds <= 0) return false;
    
    console.log(`Adding ${seconds} seconds to phase "${phaseName}" for ticket ${ticketId}`);
    
    // Initialize structure if needed
    if (!this.phaseTimers[ticketId]) {
      this.phaseTimers[ticketId] = {};
    }
    
    // Add time to specific phase
    this.phaseTimers[ticketId][phaseName] = (this.phaseTimers[ticketId][phaseName] || 0) + seconds;
    
    // Save to storage
    this.savePhaseData();
    
    return true;
  }
  
  /**
   * Add time to current phase of a ticket
   * @param {string} ticketId - The ticket ID
   * @param {number} seconds - Time in seconds to add
   */
  addTimeToCurrentPhase(ticketId, seconds) {
    const currentPhase = this.currentPhases[ticketId];
    if (!currentPhase) return false;
    
    return this.addTimeToPhase(ticketId, currentPhase, seconds);
  }
  
  /**
   * Reset all phase data for a ticket
   * @param {string} ticketId - The ticket ID
   */
  resetTicketPhases(ticketId) {
    if (!ticketId) return false;
    
    console.log(`Resetting phase data for ticket ${ticketId}`);
    
    // Reset phase timers
    if (this.phaseTimers[ticketId]) {
      delete this.phaseTimers[ticketId];
    }
    
    // Reset current phase
    if (this.currentPhases[ticketId]) {
      delete this.currentPhases[ticketId];
    }
    
    // Reset last change timestamp
    if (this.lastPhaseChange[ticketId]) {
      delete this.lastPhaseChange[ticketId];
    }
    
    // Save to storage
    this.savePhaseData();
    
    return true;
  }
  
  /**
   * Get phase data for a ticket
   * @param {string} ticketId - The ticket ID
   * @returns {Object} Phase data
   */
  getTicketPhaseData(ticketId) {
    return {
      phaseTimers: this.phaseTimers[ticketId] || {},
      currentPhase: this.currentPhases[ticketId] || null,
      lastChange: this.lastPhaseChange[ticketId] || null
    };
  }
  
  /**
   * Save phase data to storage
   */
  savePhaseData() {
    Utils.saveToStorage({
      [CONFIG.storageKeys.phaseTimers]: this.phaseTimers,
      [CONFIG.storageKeys.currentPhases]: this.currentPhases,
      [CONFIG.storageKeys.lastPhaseChange]: this.lastPhaseChange
    });
  }
}

// Create global instance
window.phaseManager = new PhaseManager();