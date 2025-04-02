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
    console.log('Detectando e rastreando fases...');
    
    // Find all columns/phases with better selector
    const columns = document.querySelectorAll('[data-test-id="cdb-column"]');
    console.log(`Encontrou ${columns.length} colunas/fases`);
    
    if (columns.length === 0) {
      console.warn('Nenhuma coluna encontrada. Verificando estrutura DOM...');
      this.logDOMStructure();
      return;
    }
    
    // Track visible tickets to detect removed ones
    const visibleTickets = new Set();
    
    // Process each column with detailed logging
    columns.forEach((column, index) => {
      // Get phase name with multiple fallback options
      let phaseName = null;
      const phaseNameElement = column.querySelector(CONFIG.selectors.phaseNameSelector);
      
      if (phaseNameElement) {
        phaseName = phaseNameElement.textContent.trim().toUpperCase();
      } else {
        // Tente seletores alternativos
        const altSelector1 = column.querySelector('h6[data-test-id="cdb-column-name"] span');
        const altSelector2 = column.querySelector('h6[data-test-id="cdb-column-name"]');
        
        if (altSelector1) {
          phaseName = altSelector1.textContent.trim().toUpperCase();
        } else if (altSelector2) {
          phaseName = altSelector2.textContent.trim().toUpperCase();
        } else {
          console.warn(`Nome da fase não encontrado na coluna ${index}`, column);
          // Use um identificador baseado no índice como última opção
          phaseName = `FASE_${index}`;
        }
      }
      
      console.log(`Processando fase: "${phaseName}"`);
      
      // Get all tickets in this phase with more robust selector
      const ticketCards = column.querySelectorAll(CONFIG.selectors.ticketCardSelector);
      if (ticketCards.length === 0) {
        console.warn(`Nenhum ticket encontrado na fase "${phaseName}". Tentando seletor alternativo...`);
        // Tente um seletor alternativo
        const altTickets = column.querySelectorAll('[data-selenium-info="true"]');
        console.log(`Encontrou ${altTickets.length} tickets com seletor alternativo`);
        
        this.processTicketsInPhase(altTickets, phaseName, visibleTickets);
      } else {
        console.log(`Encontrou ${ticketCards.length} tickets na fase "${phaseName}"`);
        this.processTicketsInPhase(ticketCards, phaseName, visibleTickets);
      }
    });
    
    // Check for tickets that were removed from the DOM
    Object.keys(this.currentPhases).forEach(ticketId => {
      if (!visibleTickets.has(ticketId)) {
        console.log(`Ticket ${ticketId} não está mais visível no board`);
        // Optionally handle tickets that are no longer visible
      }
    });
    
    // Check current phase of active ticket
    if (window.timerManager && window.timerManager.activeTicket) {
      this.checkTicketPhase(window.timerManager.activeTicket);
    }
    
    // Save phase data to ensure it's persisted
    this.savePhaseData();
  }

  processTicketsInPhase(ticketCards, phaseName, visibleTickets) {
    ticketCards.forEach(card => {
      // Tente vários métodos para obter o ID do ticket
      let ticketId = card.getAttribute(CONFIG.selectors.ticketIdAttribute);
      
      if (!ticketId) {
        // Tente obter do atributo data-rbd-draggable-id
        const draggableParent = card.closest('[data-rbd-draggable-id]');
        if (draggableParent) {
          ticketId = draggableParent.getAttribute('data-rbd-draggable-id');
        }
      }
      
      if (!ticketId) {
        console.warn('ID do ticket não encontrado para o card', card);
        return;
      }
      
      // Mark this ticket as seen
      visibleTickets.add(ticketId);
      
      // Initialize phase tracking if this is the first encounter with the ticket
      if (!this.currentPhases[ticketId]) {
        console.log(`Inicializando rastreamento para o ticket ${ticketId} na fase "${phaseName}"`);
        this.currentPhases[ticketId] = phaseName;
        this.lastPhaseChange[ticketId] = new Date().toISOString();
        
        // Criar estrutura para o ticket nas fases, se ainda não existir
        if (!this.phaseTimers[ticketId]) {
          this.phaseTimers[ticketId] = {};
        }
        
        // Save to storage
        this.savePhaseData();
      }
      // Check if the ticket has changed phase
      else if (this.currentPhases[ticketId] !== phaseName) {
        console.log(`Ticket ${ticketId} mudou da fase "${this.currentPhases[ticketId]}" para "${phaseName}"`);
        this.handlePhaseChange(ticketId, phaseName);
      }
    });
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
  // Melhore o método handlePhaseChange no PhaseManager.js
// In PhaseManager.js, update the handlePhaseChange method
handlePhaseChange(ticketId, newPhase) {
  console.log(`Ticket ${ticketId} movido para fase: ${newPhase}`);
  
  const now = new Date();
  const oldPhase = this.currentPhases[ticketId];
  
  // Se o ticket já estava sendo rastreado, contabilize o tempo na fase anterior
  if (oldPhase && this.lastPhaseChange[ticketId]) {
    const previousStartTime = new Date(this.lastPhaseChange[ticketId]);
    const timeInPreviousPhase = Math.floor((now - previousStartTime) / 1000);
    
    // Só contabilize o tempo se for razoável (evite problemas com timestamps incorretos)
    if (timeInPreviousPhase > 0 && timeInPreviousPhase < 86400 * 30) { // Não mais que 30 dias
      console.log(`Calculando tempo na fase anterior: ${oldPhase}, tempo: ${timeInPreviousPhase} segundos`);
      
      // Inicialize a estrutura se necessário
      if (!this.phaseTimers[ticketId]) {
        this.phaseTimers[ticketId] = {};
      }
      
      // Normalize phase names to uppercase for consistent comparisons
      const normalizedOldPhase = oldPhase.toUpperCase();
      
      // Acumule tempo na fase anterior
      this.phaseTimers[ticketId][normalizedOldPhase] = (this.phaseTimers[ticketId][normalizedOldPhase] || 0) + timeInPreviousPhase;
      
      console.log(`Adicionado ${Utils.formatTimeWithSeconds(timeInPreviousPhase)} à fase "${normalizedOldPhase}" para o ticket ${ticketId}`);
      console.log(`Total na fase "${normalizedOldPhase}": ${Utils.formatTimeWithSeconds(this.phaseTimers[ticketId][normalizedOldPhase])}`);
      
      // Save phase data immediately
      this.savePhaseData();
      
      // Se o ticket está ativo, não adicione ao tempo total (o timer lidará com isso)
      if (window.timerManager && window.timerManager.activeTicket === ticketId) {
        console.log(`Ticket ${ticketId} está ativo. Timer lidará com o tempo total.`);
      } else {
        // Se o ticket não está ativo, adicione o tempo gasto ao tempo total
        if (window.timerManager) {
          window.timerManager.addTimeManually(ticketId, timeInPreviousPhase);
        }
      }
    } else {
      console.warn(`Tempo inválido calculado para fase anterior: ${timeInPreviousPhase}s. Ignorando.`);
    }
  }
  
  // Normalize new phase name
  const normalizedNewPhase = newPhase.toUpperCase();
  
  // Atualize a fase atual e o timestamp
  this.currentPhases[ticketId] = normalizedNewPhase;
  this.lastPhaseChange[ticketId] = now.toISOString();
  
  // Salve no armazenamento imediatamente
  this.savePhaseData();
  
  // Exiba notificação
  Utils.showToast(`Ticket movido para "${newPhase}"`, 'info');
  
  // Atualize a UI se necessário
  if (window.timerManager) {
    window.timerManager.updateTimerDisplay(ticketId, window.timerManager.ticketTimers[ticketId] || 0);
  }
  
  // Notificar outras abas sobre a mudança de fase
  chrome.runtime.sendMessage({
    action: 'phaseChanged',
    ticketId: ticketId,
    oldPhase: oldPhase,
    newPhase: normalizedNewPhase
  });
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

  // Método auxiliar para log da estrutura DOM - ajuda a depurar seletores
logDOMStructure() {
  console.log('Analisando estrutura DOM para identificar fases...');
  
  // Log de todos os elementos que podem conter nomes de fase
  const headings = document.querySelectorAll('h6');
  console.log(`Encontrou ${headings.length} elementos h6 que podem ser cabeçalhos de fase:`);
  headings.forEach((h, i) => {
    console.log(`Cabeçalho ${i}:`, h.textContent.trim(), h);
  });
  
  // Log de todos os elementos de coluna potenciais
  const potentialColumns = document.querySelectorAll('[data-test-id*="column"]');
  console.log(`Encontrou ${potentialColumns.length} potenciais elementos de coluna:`);
  potentialColumns.forEach((col, i) => {
    console.log(`Coluna ${i}:`, col);
  });
}
  
  /**
   * Save phase data to storage
   */
  /**
 * Save phase data to storage
 */
savePhaseData() {
  console.log('Salvando dados de fase:', {
    phaseTimers: this.phaseTimers,
    currentPhases: this.currentPhases,
    lastPhaseChange: this.lastPhaseChange
  });
  
  return new Promise((resolve, reject) => {
    try {
      // Save phase data to both chrome.storage.local and localStorage for redundancy
      chrome.storage.local.set({
        [CONFIG.storageKeys.phaseTimers]: this.phaseTimers,
        [CONFIG.storageKeys.currentPhases]: this.currentPhases,
        [CONFIG.storageKeys.lastPhaseChange]: this.lastPhaseChange
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('Erro ao salvar dados de fase no chrome.storage:', chrome.runtime.lastError);
          // Fall back to localStorage if chrome.storage fails
          localStorage.setItem(`hubspot_timer_${CONFIG.storageKeys.phaseTimers}`, JSON.stringify(this.phaseTimers));
          localStorage.setItem(`hubspot_timer_${CONFIG.storageKeys.currentPhases}`, JSON.stringify(this.currentPhases));
          localStorage.setItem(`hubspot_timer_${CONFIG.storageKeys.lastPhaseChange}`, JSON.stringify(this.lastPhaseChange));
        }
        
        console.log('Dados de fase salvos com sucesso');
        resolve();
      });
    } catch (error) {
      console.error('Erro ao salvar dados de fase:', error);
      // Fallback para local storage no caso de erro
      localStorage.setItem(`hubspot_timer_${CONFIG.storageKeys.phaseTimers}`, JSON.stringify(this.phaseTimers));
      localStorage.setItem(`hubspot_timer_${CONFIG.storageKeys.currentPhases}`, JSON.stringify(this.currentPhases));
      localStorage.setItem(`hubspot_timer_${CONFIG.storageKeys.lastPhaseChange}`, JSON.stringify(this.lastPhaseChange));
      resolve();
    }
  });
}
}

// Create global instance
window.phaseManager = new PhaseManager();