/**
 * Content script for TimeMyTicket extension
 * This is the entry point that initializes all modules and handles messages
 */
class TimeMyTicket {
    constructor() {
      this.initialized = false;
      
      // Initialize
      this.init();
      
      // Listen for messages
      this.setupMessageListeners();
    }
    
    /**
     * Initialize the extension
     */
    init() {
      console.log('TimeMyTicket: Initializing extension');
      
      // Check if already initialized
      if (this.initialized) {
        console.log('TimeMyTicket: Already initialized');
        return;
      }
      
      // The modules will be initialized in their own constructors
      // timerManager, phaseManager, uiManager, and colorManager are created as global window objects
      
      // Detect and track phases every 30 seconds
      setInterval(() => {
        if (window.phaseManager) {
          window.phaseManager.detectAndTrackPhases();
        }
      }, 30000);
      
      // Process cards every 60 seconds to catch any that might have been missed
      setInterval(() => {
        if (window.uiManager) {
          window.uiManager.processExistingCards();
        }
      }, 60000);
      
      this.initialized = true;
      console.log('TimeMyTicket: Initialization complete');
    }
    
    /**
     * Set up message listeners for communication with background script and popup
     */
    setupMessageListeners() {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
          console.log('TimeMyTicket: Received message', request.action);
          
          // Handle various message actions
          switch (request.action) {
            case 'getTicketInfo':
              this.handleGetTicketInfo(request, sendResponse);
              break;
              
            case 'addTimeToPhase':
              this.handleAddTimeToPhase(request, sendResponse);
              break;
              
            case 'resetTicketTimer':
              this.handleResetTicketTimer(request, sendResponse);
              break;
              
            case 'pauseTimer':
              this.handlePauseTimer(sendResponse);
              break;
              
            case 'exportTimerReport':
              this.handleExportTimerReport(sendResponse);
              break;
              
            case 'refreshTimers':
              this.handleRefreshTimers(sendResponse);
              break;
              
            case 'showToast':
              this.handleShowToast(request, sendResponse);
              break;
              
            case 'getTimerData':
              this.handleGetTimerData(sendResponse);
              break;
              
            case 'applyColorSettings':
              this.handleApplyColorSettings(sendResponse);
              break;
          }
          
          // Return true to indicate that the response will be sent asynchronously
          return true;
        });
      }
    }
    
    /**
     * Handle getting ticket information
     * @param {Object} request - The message request
     * @param {Function} sendResponse - The callback to send response
     */
    handleGetTicketInfo(request, sendResponse) {
      if (window.timerManager && request.ticketId) {
        const ticketInfo = window.timerManager.getTicketInfo(request.ticketId);
        sendResponse({ success: true, ticketInfo });
      } else {
        sendResponse({ success: false, error: 'Ticket ID not provided or TimerManager not available' });
      }
    }
    
    /**
     * Handle adding time to a phase
     * @param {Object} request - The message request
     * @param {Function} sendResponse - The callback to send response
     */
    handleAddTimeToPhase(request, sendResponse) {
      const { ticketId, phase, seconds } = request;
      
      if (!ticketId || !phase || !seconds) {
        sendResponse({ success: false, error: 'Missing required parameters' });
        return;
      }
      
      let success = true;
      
      // Add time to phase
      if (window.phaseManager) {
        success = window.phaseManager.addTimeToPhase(ticketId, phase, seconds);
      }
      
      // Add time to total
      if (window.timerManager) {
        success = window.timerManager.addTimeManually(ticketId, seconds) && success;
      }
      
      sendResponse({ success });
    }
    
    /**
     * Handle resetting a ticket timer
     * @param {Object} request - The message request
     * @param {Function} sendResponse - The callback to send response
     */
    handleResetTicketTimer(request, sendResponse) {
      const { ticketId } = request;
      
      if (!ticketId) {
        sendResponse({ success: false, error: 'Ticket ID not provided' });
        return;
      }
      
      let success = true;
      
      // Reset timer
      if (window.timerManager) {
        success = window.timerManager.resetTicketTimer(ticketId);
      }
      
      // Reset phases
      if (window.phaseManager) {
        success = window.phaseManager.resetTicketPhases(ticketId) && success;
      }
      
      sendResponse({ success });
    }
    
    /**
     * Handle pausing the active timer
     * @param {Function} sendResponse - The callback to send response
     */
    handlePauseTimer(sendResponse) {
      if (window.timerManager) {
        window.timerManager.pauseTimer();
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'TimerManager not available' });
      }
    }
    
    /**
     * Handle exporting timer report
     * @param {Function} sendResponse - The callback to send response
     */
    handleExportTimerReport(sendResponse) {
      try {
        // Generate and save the report as a CSV file
        this.generateAndSaveReport()
          .then(() => {
            sendResponse({ success: true });
          })
          .catch((error) => {
            console.error('Error exporting report:', error);
            sendResponse({ success: false, error: 'Error exporting report' });
          });
      } catch (error) {
        console.error('Error exporting report:', error);
        sendResponse({ success: false, error: 'Error exporting report' });
      }
    }
    
    /**
     * Generate and save the timer report
     * @returns {Promise<void>}
     */
    async generateAndSaveReport() {
      // Ensure required modules are available
      if (!window.timerManager || !window.phaseManager) {
        throw new Error('Required modules not available');
      }
      
      // Prepare CSV header
      let csvContent = "ID do Ticket,Título,Proprietário,CDA Responsável,Status,Tempo Total";
      
      // Add columns for each known phase
      CONFIG.knownPhases.forEach(phase => {
        csvContent += `,Tempo em ${phase}`;
      });
      
      csvContent += "\n";
      
      // Add each ticket with information
      for (const ticketId in window.timerManager.ticketTimers) {
        const ticketInfo = window.timerManager.getTicketInfo(ticketId);
        const phaseData = window.phaseManager.getTicketPhaseData(ticketId).phaseTimers;
        
        // Calculate total time (including current if active)
        let totalSeconds = window.timerManager.ticketTimers[ticketId] || 0;
        if (ticketId === window.timerManager.activeTicket && window.timerManager.timerStartTime) {
          const elapsedSeconds = Math.floor((new Date() - window.timerManager.timerStartTime) / 1000);
          totalSeconds += elapsedSeconds;
        }
        
        // Sanitize fields to avoid CSV issues
        const sanitizedTitle = ticketInfo.title.replace(/,/g, ' ');
        const sanitizedOwner = ticketInfo.owner.replace(/,/g, ' ');
        const sanitizedCDA = ticketInfo.cda.replace(/,/g, ' ');
        const sanitizedStatus = ticketInfo.status.replace(/,/g, ' ');
        
        // Add row with basic data
        csvContent += `${ticketId},"${sanitizedTitle}","${sanitizedOwner}","${sanitizedCDA}","${sanitizedStatus}",${Utils.formatTimeWithSeconds(totalSeconds)}`;
        
        // Add time in each phase
        CONFIG.knownPhases.forEach(phase => {
          const timeInPhase = phaseData[phase] || 0;
          csvContent += `,${Utils.formatTimeWithSeconds(timeInPhase)}`;
        });
        
        csvContent += "\n";
      }
      
      // Send message to background script to save the CSV
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'saveReportData',
          csvContent
        }, (response) => {
          if (response && response.success) {
            resolve();
          } else {
            reject(new Error(response?.error || 'Error saving report'));
          }
        });
      });
    }
    
    /**
     * Handle refreshing timers
     * @param {Function} sendResponse - The callback to send response
     */
    handleRefreshTimers(sendResponse) {
      // Process existing cards
      if (window.uiManager) {
        window.uiManager.processExistingCards();
      }
      
      // Detect and track phases
      if (window.phaseManager) {
        window.phaseManager.detectAndTrackPhases();
      }
      
      sendResponse({ success: true });
    }
    
    /**
     * Handle showing a toast notification
     * @param {Object} request - The message request
     * @param {Function} sendResponse - The callback to send response
     */
    handleShowToast(request, sendResponse) {
      const { message, type } = request;
      
      if (!message) {
        sendResponse({ success: false, error: 'Message not provided' });
        return;
      }
      
      Utils.showToast(message, type || 'info');
      sendResponse({ success: true });
    }
    
    /**
     * Handle getting timer data
     * @param {Function} sendResponse - The callback to send response
     */
    handleGetTimerData(sendResponse) {
      // Collect data from all modules
      const data = {
        ticketTimers: window.timerManager?.ticketTimers || {},
        activeTicket: window.timerManager?.activeTicket || null,
        timerStartTime: window.timerManager?.timerStartTime ? window.timerManager.timerStartTime.toISOString() : null,
        ticketTitles: window.timerManager?.ticketTitles || {},
        phaseTimers: window.phaseManager?.phaseTimers || {},
        currentPhases: window.phaseManager?.currentPhases || {},
        lastPhaseChange: window.phaseManager?.lastPhaseChange || {},
        colorSettings: window.colorManager?.getColorSettings() || {}
      };
      
      sendResponse(data);
    }
    
    /**
     * Handle applying color settings
     * @param {Function} sendResponse - The callback to send response
     */
    handleApplyColorSettings(sendResponse) {
      if (window.colorManager) {
        window.colorManager.applyColorHighlights();
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'ColorManager not available' });
      }
    }
  }
  
  // Initialize the extension when the DOM is fully loaded
  document.addEventListener('DOMContentLoaded', () => {
    console.log('TimeMyTicket: DOM content loaded');
    window.timeMyTicket = new TimeMyTicket();
  });
  
  // Also initialize after a short delay to ensure it works even if
  // the DOMContentLoaded event has already occurred
  setTimeout(() => {
    if (!window.timeMyTicket) {
      console.log('TimeMyTicket: Initializing after timeout');
      window.timeMyTicket = new TimeMyTicket();
    }
  }, 1500);