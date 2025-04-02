/**
 * UIManager handles all UI-related functionality
 */
class UIManager {
    constructor() {
      // Store references to created elements
      this.createdElements = {
        timers: new Set(),
        toasts: null,
        animations: new Map()
      };
      
      // Initialize
      this.init();
    }
    
    /**
     * Initialize the UI manager
     */
    init() {
      console.log('Initializing UIManager');
      
      // Add necessary styles
      this.injectStyles();
      
      // Process existing cards with a short delay
      setTimeout(() => {
        this.processExistingCards();
      }, 1000);
      
      // Set up mutation observer to detect new cards
      this.initMutationObserver();
    }
    
    /**
     * Inject required CSS styles
     */
    injectStyles() {
      // Add toast styles
      this.addToastStyles();
      
      // Add card highlight styles
      this.addHighlightStyles();
      
      // Add animated border styles
      this.addAnimatedBorderStyles();
    }
    
    /**
     * Add CSS styles for toast notifications
     */
    addToastStyles() {
      if (!document.getElementById('ticket-timer-toast-styles')) {
        const style = document.createElement('style');
        style.id = 'ticket-timer-toast-styles';
        style.textContent = `
          .ticket-timer-toast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 10px 16px;
            border-radius: 4px;
            color: white;
            font-family: "Nunito Sans", sans-serif;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            opacity: 0;
            transform: translateY(10px);
            transition: all 0.3s ease;
          }
          
          .ticket-timer-toast.show {
            opacity: 1;
            transform: translateY(0);
          }
          
          .ticket-timer-toast.success {
            background-color: #00bda5;
          }
          
          .ticket-timer-toast.info {
            background-color: #0091ae;
          }
          
          .ticket-timer-toast.warning {
            background-color: #ffab00;
          }
          
          .ticket-timer-toast.error {
            background-color: #ff5c35;
          }
        `;
        document.head.appendChild(style);
      }
    }
    
    /**
     * Add CSS styles for card highlighting
     */
    addHighlightStyles() {
      if (!document.getElementById('ticket-highlight-styles')) {
        const style = document.createElement('style');
        style.id = 'ticket-highlight-styles';
        style.textContent = `
          /* Base highlight style for tickets */
          .ticket-highlight {
            position: relative;
          }
          
          .ticket-highlight::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            z-index: 1;
          }
          
          /* Highlight styles for lanes */
          .lane-highlight-entregues::before {
            background-color: var(--highlight-color, ${CONFIG.cardHighlight.defaultColors.lanes['Entregues']});
          }
          
          .lane-highlight-dispensados::before {
            background-color: var(--highlight-color, ${CONFIG.cardHighlight.defaultColors.lanes['Dispensados']});
          }
          
          .lane-highlight-impedidos::before {
            background-color: var(--highlight-color, ${CONFIG.cardHighlight.defaultColors.lanes['Impedidos']});
          }
          
          /* Highlight style for owners */
          .owner-highlight::before {
            background-color: var(--highlight-color);
          }
        `;
        document.head.appendChild(style);
      }
    }
    
    /**
 * Add animated border styles
 */
/**
 * Add animated border styles
 */
addAnimatedBorderStyles() {
  if (!document.getElementById('ticket-timer-active-styles')) {
    const style = document.createElement('style');
    style.id = 'ticket-timer-active-styles';
    style.textContent = `
      @keyframes borderPulse {
        0% { border-width: ${CONFIG.animation.minBorderWidth}px; }
        50% { border-width: ${CONFIG.animation.maxBorderWidth}px; }
        100% { border-width: ${CONFIG.animation.minBorderWidth}px; }
      }
      
      @keyframes borderRotate {
        0% { border-color: ${CONFIG.animation.activeBorderColor}; }
        25% { border-color: #FFB100; }
        50% { border-color: #00BDA5; }
        75% { border-color: #0091AE; }
        100% { border-color: ${CONFIG.animation.activeBorderColor}; }
      }
      
      @keyframes boxShadowPulse {
        0% { box-shadow: 0 0 5px rgba(255, 124, 32, 0.3); }
        50% { box-shadow: 0 0 15px rgba(255, 124, 32, 0.5); }
        100% { box-shadow: 0 0 5px rgba(255, 124, 32, 0.3); }
      }
      
      /* Apply animation to the tile wrapper (outer card container) */
      .timer-active-card {
  position: relative !important;
  overflow: visible !important;
  border: 3px solid #FF6F00 !important;
  animation: 
    borderPulse 2s infinite ease-in-out,
    borderRotate 8s infinite linear,
    boxShadowPulse 3s infinite ease-in-out !important;
  z-index: 1 !important;
  transition: all 0.3s ease !important;
  border-radius: 5px !important;
  transform: scale(1.01) !important;
}

/* Remove border from inner elements */
.timer-active-card .Card__StyledHoverContainer-w3updy-1 {
  border: none !important;
  box-shadow: none !important;
}

      
      /* Override any conflicting styles */
      .ticket-timer-icon {
        z-index: 100 !important;
      }
      
      /* Improved timer display */
      .ticket-timer-icon .timer-display {
        background: rgba(255, 255, 255, 0.9);
        padding: 2px 5px;
        border-radius: 3px;
        font-weight: 700;
      }
      
      .ticket-timer-icon.active .timer-display {
        background: rgba(255, 111, 0, 0.1);
        color: #FF6F00;
      }
    `;
    document.head.appendChild(style);
  }
}


  /**
 * Quick initialization to be called from console for testing
 */
quickInit() {
    console.log('Performing quick initialization for debugging');
    
    // Inject all styles first
    this.injectStyles();
    
    // Process existing cards
    this.processExistingCards();
    
    // Apply color highlights
    if (window.colorManager) {
      window.colorManager.applyColorHighlights();
    }
    
    return {
      stats: {
        processedCards: document.querySelectorAll('.ticket-timer-icon').length,
        highlightedCards: document.querySelectorAll('.ticket-highlight').length,
        activeCards: document.querySelectorAll('.timer-active-card').length
      }
    };
  }
    
    /**
     * Initialize mutation observer to detect new cards
     */
    initMutationObserver() {
      // Set up a MutationObserver to detect DOM changes
      const observer = new MutationObserver((mutations) => {
        let shouldProcessCards = false;
        
        mutations.forEach(mutation => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // Check if cards were added
            const cardAdded = Array.from(mutation.addedNodes).some(node => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                return node.matches?.(CONFIG.selectors.ticketCardSelector) || 
                  node.querySelector?.(CONFIG.selectors.ticketCardSelector);
              }
              return false;
            });
            
            if (cardAdded) {
              shouldProcessCards = true;
            }
          }
        });
        
        if (shouldProcessCards) {
          setTimeout(() => {
            console.log('Detected new cards, processing...');
            this.processExistingCards();
            
            // Also check phases if PhaseManager exists
            if (window.phaseManager) {
              window.phaseManager.detectAndTrackPhases();
            }
          }, 500);
        }
      });
      
      // Start observing document body
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      console.log('MutationObserver started');
    }

    /**
 * Handle the complete card structure
 * @param {HTMLElement} element - Any element within the card hierarchy
 * @returns {Object} - References to all important elements
 */
findCardElements(element) {
    // Starting point could be any element in the hierarchy
    const result = {
      columnItem: null,
      draggable: null,
      clickable: null,
      tileWrapper: null,
      viewContainer: null,
      ticketCard: null,
      ticketId: null
    };
    
    // Find the column item (outermost container)
    result.columnItem = element.closest(CONFIG.selectors.columnItemSelector);
    
    // If we can't find the column item, try to look for other elements
    if (!result.columnItem) {
      // Try to find the draggable container
      result.draggable = element.closest(CONFIG.selectors.draggableItemSelector);
      
      // If found, try to find the column item from the draggable
      if (result.draggable) {
        result.columnItem = result.draggable.closest(CONFIG.selectors.columnItemSelector);
      }
    } else {
      // If column item was found, find draggable inside it
      result.draggable = result.columnItem.querySelector(CONFIG.selectors.draggableItemSelector);
    }
    
    // Continue finding elements in the hierarchy
    if (result.draggable) {
      result.clickable = result.draggable.querySelector(CONFIG.selectors.clickableSelector);
    }
    
    if (result.clickable) {
      result.tileWrapper = result.clickable.querySelector(CONFIG.selectors.tileWrapperSelector);
    }
    
    if (result.tileWrapper) {
      result.viewContainer = result.tileWrapper.querySelector(CONFIG.selectors.viewSelector);
    }
    
    if (result.viewContainer) {
      result.ticketCard = result.viewContainer.querySelector(CONFIG.selectors.ticketCardSelector);
    }
    
    // Try to get ticket ID
    if (result.ticketCard) {
      result.ticketId = result.ticketCard.getAttribute(CONFIG.selectors.ticketIdAttribute);
    } else if (element.hasAttribute(CONFIG.selectors.ticketIdAttribute)) {
      result.ticketId = element.getAttribute(CONFIG.selectors.ticketIdAttribute);
    }
    
    // If we still don't have the ticket ID, try to find it in other elements
    if (!result.ticketId) {
      const possibleIdElements = [
        result.columnItem,
        result.draggable,
        result.ticketCard
      ];
      
      for (const elem of possibleIdElements) {
        if (elem && elem.hasAttribute(CONFIG.selectors.ticketIdAttribute)) {
          result.ticketId = elem.getAttribute(CONFIG.selectors.ticketIdAttribute);
          break;
        }
      }
    }
    
    return result;
  }
    
    /**
 * Process existing ticket cards in the DOM
 */
processExistingCards() {
    console.log('Processing existing cards...');
    
    // Find all potential card elements by various selectors
    const selectors = [
      CONFIG.selectors.ticketCardSelector,
      `[${CONFIG.selectors.ticketIdAttribute}]`,
      '[data-selenium-info="true"]',
      CONFIG.selectors.columnItemSelector
    ];
    
    const processedIds = new Set();
    
    // Process each selector separately
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      console.log(`Found ${elements.length} elements with selector "${selector}"`);
      
      elements.forEach(element => {
        const cardElements = this.findCardElements(element);
        
        // Skip if we've already processed this ticket or no ID found
        if (!cardElements.ticketId || processedIds.has(cardElements.ticketId)) {
          return;
        }
        
        // Mark as processed
        processedIds.add(cardElements.ticketId);
        
        // Add timer if needed
        if (cardElements.ticketCard && !cardElements.ticketCard.querySelector('.ticket-timer-icon')) {
          console.log(`Adding timer to ticket ${cardElements.ticketId}`);
          this.addTimerToCard(cardElements.ticketCard);
        }
      });
    });
    
    console.log(`Processed ${processedIds.size} unique tickets`);
    
    // Apply color highlights
    if (window.colorManager) {
      window.colorManager.applyColorHighlights();
    }
    
    // Apply active timer styles if there is an active timer
    if (window.timerManager && window.timerManager.activeTicket) {
      this.updateActiveTimerStyles(window.timerManager.activeTicket, true);
    }
  }
    
    /**
     * Add timer icon to a ticket card
     * @param {HTMLElement} card - The ticket card element
     */
    /**
 * Add timer icon to a ticket card
 * @param {HTMLElement} cardElement - Any element within the card hierarchy
 */
addTimerToCard(cardElement) {
    // Find all elements in the card hierarchy
    const elements = this.findCardElements(cardElement);
    
    // If we couldn't find the ticket ID or card, exit
    if (!elements.ticketId || !elements.ticketCard) {
      console.warn('Could not find ticket ID or card element:', cardElement);
      return;
    }
    
    const ticketId = elements.ticketId;
    
    // Check if timer already exists
    if (elements.ticketCard.querySelector('.ticket-timer-icon')) {
      console.log(`Timer already exists for ticket ${ticketId}`);
      return;
    }
    
    // Check if timer data exists for this ticket
    const hasTime = window.timerManager && 
                   window.timerManager.ticketTimers[ticketId] && 
                   window.timerManager.ticketTimers[ticketId] > 0;
    
    const isActive = window.timerManager && 
                     window.timerManager.activeTicket === ticketId;
    
    // Capture ticket title
    const titleElement = elements.ticketCard.querySelector(CONFIG.selectors.cardTitleSelector);
    const ticketTitle = titleElement ? titleElement.textContent.trim() : `Ticket #${ticketId}`;
    
    // Store the title if TimerManager exists
    if (window.timerManager) {
      window.timerManager.ticketTitles[ticketId] = ticketTitle;
      Utils.saveToStorage({ 
        [CONFIG.storageKeys.ticketTitles]: window.timerManager.ticketTitles 
      });
    }
    
    // Create timer icon element
    const timerIcon = document.createElement('div');
    timerIcon.className = `ticket-timer-icon ${hasTime || isActive ? 'expanded' : 'minimized'} ${isActive ? 'active' : ''}`;
    timerIcon.setAttribute('data-tooltip', isActive ? 'Pausar cronômetro' : 'Iniciar cronômetro');
    timerIcon.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Corpo do cronômetro -->
        <circle cx="12" cy="13" r="8" stroke="#FF6F00" stroke-width="2" fill="white"></circle>
  
        <!-- Botão superior -->
        <rect x="10" y="2" width="4" height="2" rx="1" fill="#FF6F00"></rect>
  
        <!-- Alça lateral esquerda -->
        <line x1="5" y1="6" x2="7" y2="8" stroke="#FF6F00" stroke-width="2" stroke-linecap="round"></line>
  
        <!-- Alça lateral direita -->
        <line x1="19" y1="6" x2="17" y2="8" stroke="#FF6F00" stroke-width="2" stroke-linecap="round"></line>
  
        <!-- Ponteiro -->
        <line x1="12" y1="13" x2="15" y2="10" stroke="#FF6F00" stroke-width="2" stroke-linecap="round"></line>
  
        <!-- Centro -->
        <circle cx="12" cy="13" r="1" fill="#FF6F00"></circle>
      </svg>
      <span class="timer-display">${hasTime ? Utils.formatTimeWithSeconds(window.timerManager?.ticketTimers[ticketId] || 0) : '00:00:00'}</span>
    `;
    
    // Add click event with visual feedback
    timerIcon.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent card selection
      
      // Add visual feedback when clicked
      timerIcon.style.transform = 'scale(0.95)';
      setTimeout(() => {
        timerIcon.style.transform = '';
      }, 150);
      
      // Toggle timer if TimerManager exists
      if (window.timerManager) {
        window.timerManager.toggleTimer(ticketId);
      }
    });
    
    // Add right-click event for context menu
    timerIcon.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      this.showTimerContextMenu(e, ticketId);
    });
    
    // Ensure absolute positioning
    timerIcon.style.position = 'absolute';
    timerIcon.style.top = '8px';
    timerIcon.style.right = '8px';
    timerIcon.style.zIndex = '100';
    
    // Position the container
    elements.ticketCard.style.position = 'relative';
    
    // Append to container
    elements.ticketCard.appendChild(timerIcon);
    
    // Track created element
    this.createdElements.timers.add(timerIcon);
    
    console.log(`Timer added to ticket ${ticketId}: "${ticketTitle}"`);
    
    // Apply active timer styles if this is the active ticket
    if (isActive) {
      this.updateActiveTimerStyles(ticketId, true);
    }
    
    return elements;
  }
    
    /**
     * Show context menu for timer
     * @param {Event} event - The triggering event
     * @param {string} ticketId - The ticket ID
     */
    showTimerContextMenu(event, ticketId) {
      // Remove previous menu if exists
      const oldMenu = document.getElementById('timer-context-menu');
      if (oldMenu) {
        oldMenu.remove();
      }
      
      // Get ticket info if TimerManager exists
      const ticketInfo = window.timerManager ? window.timerManager.getTicketInfo(ticketId) : { title: `Ticket #${ticketId}` };
      
      // Create context menu
      const menu = document.createElement('div');
      menu.id = 'timer-context-menu';
      menu.className = 'timer-context-menu';
      menu.style.position = 'absolute';
      menu.style.left = `${event.clientX}px`;
      menu.style.top = `${event.clientY}px`;
      menu.style.zIndex = '10000';
      
      // Menu options
      const menuOptions = [
        {
          label: 'Ver detalhes por fase',
          icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
          action: () => this.showPhaseDetails(ticketId, ticketInfo)
        },
        {
          label: 'Adicionar tempo manualmente',
          icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>',
          action: () => this.showAddTimeManually(ticketId, ticketInfo)
        },
        {
          label: 'Copiar relatório de tempo',
          icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
          action: () => this.copyTimeReport(ticketId, ticketInfo)
        },
        {
          label: 'Resetar timer',
          icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
          action: () => this.confirmResetTimer(ticketId, ticketInfo),
          danger: true
        }
      ];
      
      // Add options to menu
      menuOptions.forEach(option => {
        const menuItem = document.createElement('div');
        menuItem.className = `timer-context-menu-item${option.danger ? ' danger' : ''}`;
        menuItem.innerHTML = `${option.icon} <span>${option.label}</span>`;
        menuItem.addEventListener('click', () => {
          option.action();
          menu.remove();
        });
        menu.appendChild(menuItem);
      });
      
      // Add menu to DOM
      document.body.appendChild(menu);
      
      // Close menu when clicking outside
      const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener('click', closeMenu);
        }
      };
      
      // Short delay to prevent the event itself from closing the menu
      setTimeout(() => {
        document.addEventListener('click', closeMenu);
      }, 100);
    }
    
    /**
     * Show phase details modal
     * @param {string} ticketId - The ticket ID
     * @param {Object} ticketInfo - Ticket information
     */
    showPhaseDetails(ticketId, ticketInfo) {
      // Get phase data if PhaseManager exists
      const phaseData = window.phaseManager ? window.phaseManager.getTicketPhaseData(ticketId).phaseTimers : {};
      
      // Create modal
      const modal = document.createElement('div');
      modal.className = 'time-my-ticket-modal';
      
      // Build modal content
      let modalContent = `
        <div class="modal-header">
          <h3>Tempo por Fase: ${ticketInfo.title}</h3>
          <button class="close-button">&times;</button>
        </div>
        <div class="modal-body">
          <table class="phase-details-table">
            <thead>
              <tr>
                <th>Fase</th>
                <th>Tempo</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      // Add each phase
      let hasFaseData = false;
      CONFIG.knownPhases.forEach(phase => {
        const timeInPhase = phaseData[phase] || 0;
        if (timeInPhase > 0) {
          hasFaseData = true;
          modalContent += `
            <tr>
              <td>${phase}</td>
              <td>${Utils.formatTimeWithSeconds(timeInPhase)}</td>
            </tr>
          `;
        }
      });
      
      // If no phase data
      if (!hasFaseData) {
        modalContent += `
          <tr>
            <td colspan="2" style="text-align: center;">Nenhum dado de fase registrado para este ticket</td>
          </tr>
        `;
      }
      
      // Add total time
      const totalTime = window.timerManager ? window.timerManager.ticketTimers[ticketId] || 0 : 0;
      modalContent += `
            </tbody>
            <tfoot>
              <tr>
                <td><strong>Total</strong></td>
                <td><strong>${Utils.formatTimeWithSeconds(totalTime)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div class="modal-footer">
          <button class="close-modal-btn">Fechar</button>
          <button class="copy-report-btn">Copiar Relatório</button>
        </div>
      `;
      
      modal.innerHTML = modalContent;
      
      // Add backdrop
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      document.body.appendChild(backdrop);
      
      // Add modal to DOM
      document.body.appendChild(modal);
      
      // Close modal functions
      const closeModal = () => {
        modal.remove();
        backdrop.remove();
      };
      
      modal.querySelector('.close-button').addEventListener('click', closeModal);
      modal.querySelector('.close-modal-btn').addEventListener('click', closeModal);
      backdrop.addEventListener('click', closeModal);
      
      // Copy report button
      modal.querySelector('.copy-report-btn').addEventListener('click', () => {
        this.copyTimeReport(ticketId, ticketInfo);
        Utils.showToast('Relatório copiado para a área de transferência', 'success');
      });
    }
    
    /**
     * Show modal to add time manually
     * @param {string} ticketId - The ticket ID
     * @param {Object} ticketInfo - Ticket information
     */
    showAddTimeManually(ticketId, ticketInfo) {
      // Get current phase if PhaseManager exists
      const currentPhase = window.phaseManager ? 
                          window.phaseManager.getTicketPhaseData(ticketId).currentPhase : '';
      
      // Create modal
      const modal = document.createElement('div');
      modal.className = 'time-my-ticket-modal';
      
      // Build modal content
      let modalContent = `
        <div class="modal-header">
          <h3>Adicionar Tempo Manualmente</h3>
          <button class="close-button">&times;</button>
        </div>
        <div class="modal-body">
          <p>Ticket: <strong>${ticketInfo.title}</strong></p>
          
          <div class="form-group">
            <label for="time-phase-select">Fase:</label>
            <select id="time-phase-select" class="form-control">
              ${CONFIG.knownPhases.map(phase => `<option value="${phase}" ${phase === currentPhase ? 'selected' : ''}>${phase}</option>`).join('')}
            </select>
          </div>
          
          <div class="form-group time-inputs">
            <label>Tempo a adicionar:</label>
            <div class="time-input-container">
              <div class="time-input">
                <input type="number" id="hours-input" min="0" value="0" class="form-control">
                <label>horas</label>
              </div>
              <div class="time-input">
                <input type="number" id="minutes-input" min="0" max="59" value="0" class="form-control">
                <label>minutos</label>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="close-modal-btn">Cancelar</button>
          <button class="save-time-btn">Adicionar Tempo</button>
        </div>
      `;
      
      modal.innerHTML = modalContent;
      
      // Add backdrop
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      document.body.appendChild(backdrop);
      
      // Add modal to DOM
      document.body.appendChild(modal);
      
      // Close modal functions
      const closeModal = () => {
        modal.remove();
        backdrop.remove();
      };
      
      modal.querySelector('.close-button').addEventListener('click', closeModal);
      modal.querySelector('.close-modal-btn').addEventListener('click', closeModal);
      backdrop.addEventListener('click', closeModal);
      
      // Add time button
      modal.querySelector('.save-time-btn').addEventListener('click', () => {
        // Get values from inputs
        const phase = modal.querySelector('#time-phase-select').value;
        const hours = parseInt(modal.querySelector('#hours-input').value) || 0;
        const minutes = parseInt(modal.querySelector('#minutes-input').value) || 0;
        
        // Calculate total seconds
        const secondsToAdd = hours * 3600 + minutes * 60;
        
        if (secondsToAdd <= 0) {
          Utils.showToast('Por favor, informe um tempo válido para adicionar', 'error');
          return;
        }
        
        // Add time to phase if PhaseManager exists
        if (window.phaseManager) {
          window.phaseManager.addTimeToPhase(ticketId, phase, secondsToAdd);
        }
        
        // Add time to total if TimerManager exists
        if (window.timerManager) {
          window.timerManager.addTimeManually(ticketId, secondsToAdd);
        }
        
        // Close the modal
        closeModal();
        
        // Show success message
        Utils.showToast(`${Utils.formatTimeWithHoursAndMinutes(secondsToAdd)} adicionado à fase "${phase}"`, 'success');
      });
    }
    
    /**
     * Copy time report to clipboard
     * @param {string} ticketId - The ticket ID
     * @param {Object} ticketInfo - Ticket information
     */
    copyTimeReport(ticketId, ticketInfo) {
      // Obtenha dados de fase se PhaseManager existir
      const phaseData = window.phaseManager ? window.phaseManager.getTicketPhaseData(ticketId).phaseTimers : {};
      
      console.log(`Copiando relatório para o ticket ${ticketId}:`, {
        ticketInfo,
        phaseData
      });
      
      // Construa o relatório
      let report = `Tempo Gasto no Ticket: ${ticketInfo.title}\n`;
      report += `ID: ${ticketId}\n`;
      report += `Proprietário: ${ticketInfo.owner}\n`;
      report += `CDA Responsável: ${ticketInfo.cda}\n`;
      report += `Status: ${ticketInfo.status}\n\n`;
      report += `Fases: \n`;
      
      // Adicione tempo por fase
      let hasFaseData = false;
      let totalFaseTime = 0;
      
      CONFIG.knownPhases.forEach(phase => {
        // Verifique tanto o nome da fase normalizado quanto o original
        const upperPhase = phase.toUpperCase();
        const timeInPhase = (phaseData[upperPhase] || phaseData[phase] || 0);
        
        if (timeInPhase > 0) {
          hasFaseData = true;
          totalFaseTime += timeInPhase;
          report += `- ${phase}: ${Utils.formatTimeWithHoursAndMinutes(timeInPhase)}\n`;
        }
      });
      
      if (!hasFaseData) {
        report += "Nenhuma fase com tempo registrado.\n";
      } else {
        report += `\nTempo Total em Fases: ${Utils.formatTimeWithHoursAndMinutes(totalFaseTime)}\n`;
      }
      
      // Adicione tempo total
      const totalTime = window.timerManager ? window.timerManager.ticketTimers[ticketId] || 0 : 0;
      report += `\nTempo Total Registrado: ${Utils.formatTimeWithHoursAndMinutes(totalTime)}`;
      
      // Se o ticket estiver ativo, adicione o tempo atual
      if (window.timerManager && window.timerManager.activeTicket === ticketId && window.timerManager.timerStartTime) {
        const elapsedSeconds = Math.floor((new Date() - window.timerManager.timerStartTime) / 1000);
        const currentSession = Utils.formatTimeWithHoursAndMinutes(elapsedSeconds);
        report += `\nSessão Atual: ${currentSession}`;
        report += `\nTempo Total (incluindo sessão atual): ${Utils.formatTimeWithHoursAndMinutes(totalTime + elapsedSeconds)}`;
      }
      
      // Adicione timestamp do relatório
      report += `\n\nRelatório gerado em: ${new Date().toLocaleString()}`;
      
      // Copie para área de transferência
      navigator.clipboard.writeText(report)
        .then(() => {
          Utils.showToast('Relatório copiado para a área de transferência', 'success');
          console.log('Relatório copiado com sucesso');
        })
        .catch(err => {
          console.error('Erro ao copiar relatório:', err);
          Utils.showToast('Erro ao copiar relatório', 'error');
        });
    }
    
    /**
     * Confirm and reset timer
     * @param {string} ticketId - The ticket ID
     * @param {Object} ticketInfo - Ticket information
     */
    confirmResetTimer(ticketId, ticketInfo) {
      if (confirm(`Tem certeza que deseja resetar o timer do ticket "${ticketInfo.title}"? Esta ação não pode ser desfeita.`)) {
        // Reset timer if TimerManager exists
        if (window.timerManager) {
          window.timerManager.resetTicketTimer(ticketId);
        }
        
        // Reset phases if PhaseManager exists
        if (window.phaseManager) {
          window.phaseManager.resetTicketPhases(ticketId);
        }
        
        Utils.showToast(`Timer do ticket "${ticketInfo.title}" foi resetado`, 'success');
      }
    }
    
    /**
 * Update active timer styles
 * @param {string} ticketId - The ticket ID
 * @param {boolean} isActive - Whether the timer is active
 */
u/**
 * Update active timer styles
 * @param {string} ticketId - The ticket ID
 * @param {boolean} isActive - Whether the timer is active
 */
updateActiveTimerStyles(ticketId, isActive) {
  // Find all cards with this ticket ID
  const cards = document.querySelectorAll(`[${CONFIG.selectors.ticketIdAttribute}="${ticketId}"]`);
  
  cards.forEach(card => {
    // Find all elements in the card hierarchy
    const elements = this.findCardElements(card);
    if (!elements.ticketCard) return;
    
    const timerIcon = elements.ticketCard.querySelector('.ticket-timer-icon');
    if (!timerIcon) return;
    
    // First, remove active class from all elements
    const allElements = [
      elements.columnItem,
      elements.draggable,
      elements.clickable,
      elements.tileWrapper,
      elements.viewContainer,
      elements.ticketCard
    ].filter(Boolean);
    
    allElements.forEach(element => {
      element.classList.remove('timer-active-card');
    });
    
    // Update tooltip
    timerIcon.setAttribute('data-tooltip', isActive ? 'Pausar cronômetro' : 'Iniciar cronômetro');
    
    // Update active/inactive state
    if (isActive) {
      timerIcon.classList.add('active');
      timerIcon.classList.add('expanded');
      timerIcon.classList.remove('minimized');
      
      // Apply animated border to the tile wrapper (main card container)
      // This is the key fix - target the most visible container
      if (elements.tileWrapper) {
        elements.tileWrapper.classList.add('timer-active-card');
      } else if (elements.viewContainer) {
        elements.viewContainer.classList.add('timer-active-card');
      } else if (elements.ticketCard) {
        elements.ticketCard.classList.add('timer-active-card');
      }
    } else {
      timerIcon.classList.remove('active');
      
      // Check if it should remain expanded (if it has accumulated time)
      const hasTime = window.timerManager && 
                     window.timerManager.ticketTimers[ticketId] && 
                     window.timerManager.ticketTimers[ticketId] > 0;
                      
      if (!hasTime) {
        timerIcon.classList.remove('expanded');
        timerIcon.classList.add('minimized');
      }
    }
  });
}
    
 /**
 * Start border animation for active timer
 * @param {HTMLElement} targetElement - The element to animate
 * @param {string} ticketId - The ticket ID
 */
startBorderAnimation(targetElement, ticketId) {
  // Stop any existing animation for this ticket
  this.stopBorderAnimation(ticketId);
  
  // Store the animation info
  this.createdElements.animations.set(ticketId, {
    element: targetElement,
    running: true
  });
}

/**
 * Stop border animation
 * @param {string} ticketId - The ticket ID
 */
stopBorderAnimation(ticketId) {
  if (this.createdElements.animations.has(ticketId)) {
    const animation = this.createdElements.animations.get(ticketId);
    
    // Mark as not running
    animation.running = false;
    
    // Remove animation class
    if (animation.element) {
      animation.element.classList.remove('timer-active-card');
    }
    
    // Remove from map
    this.createdElements.animations.delete(ticketId);
  }
}
  }
  
  // Create global instance
  window.uiManager = new UIManager();