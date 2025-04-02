/**
 * TimeMyTicket - Popup Script
 * Handles the functionality of the extension popup
 */

document.addEventListener('DOMContentLoaded', () => {
    // ===== DOM Elements =====
    // Main sections
    const activeTimerInfo = document.getElementById('active-timer-info');
    const timerList = document.getElementById('timer-list');
    const phaseList = document.getElementById('phase-list');
    const phaseBar = document.getElementById('phase-bar');
    const phaseLegend = document.getElementById('phase-legend');
    const phaseTicketSelector = document.getElementById('phase-ticket-selector');
    
    // Buttons
    const exportBtn = document.getElementById('export-btn');
    const resetAllBtn = document.getElementById('reset-all-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    
    // Tabs
    const tabTickets = document.getElementById('tab-tickets');
    const tabPhases = document.getElementById('tab-phases');
    const tabSettings = document.getElementById('tab-settings');
    const ticketsTabContent = document.getElementById('tickets-tab-content');
    const phasesTabContent = document.getElementById('phases-tab-content');
    const settingsTabContent = document.getElementById('settings-tab-content');
    
    // Context menu
    const contextMenu = document.getElementById('context-menu');
    const viewPhasesOption = document.getElementById('view-phases');
    const addTimeOption = document.getElementById('add-time');
    const copyTimeOption = document.getElementById('copy-time');
    const goToTicketOption = document.getElementById('go-to-ticket');
    const resetTimerOption = document.getElementById('reset-timer');
    
    // Add time modal
    const addTimeModal = document.getElementById('add-time-modal');
    const modalTicketName = document.getElementById('modal-ticket-name');
    const modalTicketId = document.getElementById('modal-ticket-id');
    const phaseSelect = document.getElementById('phase-select');
    const hoursInput = document.getElementById('hours-input');
    const minutesInput = document.getElementById('minutes-input');
    const modalCancelBtn = document.getElementById('modal-cancel');
    const modalSaveBtn = document.getElementById('modal-save');
    const modalCloseBtn = document.querySelector('.modal-close');
    
    // Settings elements
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const resetAllSettingsBtn = document.getElementById('reset-all-settings-btn');
    const colorPickers = document.querySelectorAll('.color-picker');
    const resetColorBtns = document.querySelectorAll('.reset-color-btn');
    const customOwnerName = document.getElementById('custom-owner-name');
    const customOwnerColor = document.getElementById('custom-owner-color');
    const addCustomOwnerBtn = document.getElementById('add-custom-owner-btn');
    const customOwnersList = document.getElementById('custom-owners-list');
    
    // ===== App State =====
    let currentContextTicketId = null;
    let currentContextTicketInfo = null;
    let currentTimerData = null;
    let activeTimerUpdater = null;
    let colorSettings = {
      lanes: {},
      owners: {},
      customOwners: {}
    };
    
    // ===== Phase Colors =====
    const phaseColors = [
      '#FF5C35', '#FFB100', '#F2854C', '#00A4BD', 
      '#00BDA5', '#6A78D1', '#7C98B6', '#0091AE', 
      '#9FB5C9', '#D5DAE0', '#516F90', '#32373C'
    ];
    
    // Known phases
    const knownPhases = [
      'Novo', 'Triagem', 'Backlog', 'Descoberta e Ideação',
      'Desenvolvimento', 'Preenchimento de RFP', 'Validação Inicial',
      'Apresentação', 'Refinamento e Consolidação', 'Impedidos', 
      'Entregues', 'Dispensados'
    ];
    
    // Map phases to colors
    const phaseColorMap = {};
    knownPhases.forEach((phase, index) => {
      phaseColorMap[phase] = phaseColors[index % phaseColors.length];
    });
    
    // ===== Initialization =====
    loadData();
    setupEventListeners();
    
    // ===== Core Functions =====
    /**
     * Load data from background/content scripts
     */
    async function loadData() {
      try {
        // Get active tab
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || !tabs[0] || !tabs[0].id) {
          showError('Não foi possível encontrar a aba ativa.');
          return;
        }
        
        // Request timer data
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getTimerData' }, (response) => {
          if (!response) {
            showError('Extension não está ativa nesta página. Abra uma página do HubSpot para usar a extensão.');
            return;
          }
          
          currentTimerData = response;
          
          // Update UI with data
          renderActiveTimer(response);
          renderTicketList(response);
          populateTicketSelector(response);
          loadColorSettings(response.colorSettings);
          
          console.log('Data loaded:', response);
        });
      } catch (error) {
        console.error('Error loading data:', error);
        showError('Erro ao carregar dados. Verifique se a extensão tem permissão para acessar esta página.');
      }
    }
    
    /**
     * Set up event listeners
     */
    function setupEventListeners() {
      // Main buttons
      exportBtn.addEventListener('click', handleExport);
      resetAllBtn.addEventListener('click', confirmResetAll);
      refreshBtn.addEventListener('click', handleRefresh);
      
      // Tab navigation
      tabTickets.addEventListener('click', () => switchTab('tickets'));
      tabPhases.addEventListener('click', () => switchTab('phases'));
      tabSettings.addEventListener('click', () => switchTab('settings'));
      
      // Phase ticket selector
      phaseTicketSelector.addEventListener('change', renderPhaseData);
      
      // Context menu options
      viewPhasesOption.addEventListener('click', handleViewPhases);
      addTimeOption.addEventListener('click', handleAddTime);
      copyTimeOption.addEventListener('click', handleCopyTimeReport);
      goToTicketOption.addEventListener('click', handleGoToTicket);
      resetTimerOption.addEventListener('click', handleResetTimer);
      
      // Add time modal
      modalCancelBtn.addEventListener('click', hideAddTimeModal);
      modalCloseBtn.addEventListener('click', hideAddTimeModal);
      modalSaveBtn.addEventListener('click', handleAddTimeSubmit);
      
      // Settings
      saveSettingsBtn.addEventListener('click', saveSettings);
      resetAllSettingsBtn.addEventListener('click', resetAllSettings);
      
      // Color pickers
      colorPickers.forEach(picker => {
        picker.addEventListener('change', handleColorChange);
      });
      
      // Reset color buttons
      resetColorBtns.forEach(btn => {
        btn.addEventListener('click', handleResetColor);
      });
      
      // Custom owner buttons
      addCustomOwnerBtn.addEventListener('click', addCustomOwner);
      
      // Close context menu on outside click
      document.addEventListener('click', (e) => {
        if (!contextMenu.contains(e.target)) {
          hideContextMenu();
        }
      });
    }
    
    /**
     * Render active timer information
     * @param {Object} data - Timer data
     */
    function renderActiveTimer(data) {
      // Clear any existing timer updater
      if (activeTimerUpdater) {
        clearInterval(activeTimerUpdater);
        activeTimerUpdater = null;
      }
      
      if (data.activeTicket && data.timerStartTime) {
        const ticketId = data.activeTicket;
        const startTime = new Date(data.timerStartTime);
        const ticketTitle = data.ticketTitles[ticketId] || `Ticket #${ticketId}`;
        const baseSeconds = data.ticketTimers[ticketId] || 0;
        
        // Get current phase
        const currentPhase = data.currentPhases[ticketId] || 'Desconhecido';
        
        activeTimerInfo.classList.remove('no-active-timer');
        activeTimerInfo.innerHTML = `
          <div class="section-title">
            Timer Atual 
            <span class="badge badge-active">Ativo</span>
          </div>
          <div class="active-timer-content">
            <div class="timer-info">
              <div class="ticket-title">${ticketTitle}</div>
              <div class="ticket-id">#${ticketId}</div>
            </div>
            <div class="ticket-meta">
              <span class="ticket-tag">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 2px; vertical-align: middle;">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                </svg>
                ${currentPhase}
              </span>
            </div>
            <div class="timer-info">
              <div class="timer-label">Tempo atual</div>
              <div id="active-timer-value" class="timer-value">${formatTimeWithSeconds(baseSeconds)}</div>
            </div>
            <div class="timer-info">
              <div class="timer-label">Iniciado em</div>
              <div>${formatDate(startTime)}</div>
            </div>
            <button id="pause-timer-btn" class="btn btn-secondary" style="margin-top: 8px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
              </svg>
              Pausar Timer
            </button>
          </div>
        `;
        
        // Add event to pause button
        document.getElementById('pause-timer-btn').addEventListener('click', pauseActiveTimer);
        
        // Start timer updater
        startActiveTimerUpdater(baseSeconds, startTime);
      } else {
        activeTimerInfo.classList.add('no-active-timer');
        activeTimerInfo.innerHTML = `
          <div class="section-title">Timer Atual</div>
          <div class="active-timer-content">
            <div class="timer-info" style="text-align: center;">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 8px; color: #7c98b6;">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <p>Nenhum timer ativo no momento.</p>
              <p style="font-size: 11px; color: #7c98b6; margin-top: 8px;">
                Clique no ícone do cronômetro em um ticket para iniciar o monitoramento.
              </p>
            </div>
          </div>
        `;
      }
    }
    
    /**
     * Render the list of monitored tickets
     * @param {Object} data - Timer data
     */
    function renderTicketList(data) {
      const ticketTimers = data.ticketTimers || {};
      
      if (Object.keys(ticketTimers).length === 0) {
        timerList.innerHTML = `
          <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="empty-state-icon">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            Nenhum ticket monitorado ainda.
            <p style="font-size: 11px; margin-top: 8px; color: #7c98b6;">
              Para iniciar o monitoramento, navegue até um ticket e clique no ícone do cronômetro.
            </p>
          </div>
        `;
        return;
      }
      
      // Sort tickets by time (descending)
      const sortedTickets = Object.entries(ticketTimers)
        .sort(([, timeA], [, timeB]) => timeB - timeA);
      
      timerList.innerHTML = '';
      
      sortedTickets.forEach(([ticketId, seconds]) => {
        const isActive = ticketId === data.activeTicket;
        const ticketTitle = data.ticketTitles[ticketId] || `Ticket #${ticketId}`;
        const currentPhase = data.currentPhases[ticketId] || 'Desconhecido';
        
        // Calculate total time (including active time)
        let totalSeconds = seconds;
        if (isActive && data.timerStartTime) {
          const elapsedSeconds = Math.floor((new Date() - new Date(data.timerStartTime)) / 1000);
          totalSeconds += elapsedSeconds;
        }
        
        const itemEl = document.createElement('div');
        itemEl.className = `timer-item ${isActive ? 'active' : ''}`;
        itemEl.dataset.ticketId = ticketId;
        
        itemEl.innerHTML = `
          <div class="timer-details">
            <div class="ticket-title">${ticketTitle}</div>
            <div class="ticket-id">#${ticketId}</div>
            <div class="ticket-phase">Fase atual: ${currentPhase}</div>
          </div>
          <div class="timer-value-display" ${isActive ? `id="timer-list-${ticketId}"` : ''}>
            ${formatTimeWithSeconds(totalSeconds)}
          </div>
        `;
        
        // Add contextmenu event
        itemEl.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          const ticketInfo = {
            id: ticketId,
            title: ticketTitle,
            phase: currentPhase
          };
          showContextMenu(e, ticketId, ticketInfo);
        });
        
        timerList.appendChild(itemEl);
      });
    }
    
    /**
     * Populate the ticket selector dropdown in the phases tab
     * @param {Object} data - Timer data
     */
    function populateTicketSelector(data) {
      const ticketTimers = data.ticketTimers || {};
      const ticketTitles = data.ticketTitles || {};
      
      // Clear current options except "All tickets"
      while (phaseTicketSelector.options.length > 1) {
        phaseTicketSelector.options.remove(1);
      }
      
      // Add each ticket
      Object.keys(ticketTimers).forEach(ticketId => {
        const option = document.createElement('option');
        option.value = ticketId;
        option.textContent = ticketTitles[ticketId] || `Ticket #${ticketId}`;
        phaseTicketSelector.appendChild(option);
      });
    }
    
    /**
     * Render phase data in the phases tab
     */
    function renderPhaseData() {
      if (!currentTimerData) return;
      
      const phaseTimers = currentTimerData.phaseTimers || {};
      const selectedTicketId = phaseTicketSelector.value;
      
      // Clear phase data displays
      phaseList.innerHTML = '';
      phaseBar.innerHTML = '';
      phaseLegend.innerHTML = '';
      
      // If no phase data
      if (Object.keys(phaseTimers).length === 0) {
        phaseList.innerHTML = `
          <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="empty-state-icon">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            Nenhum dado de fase registrado.
            <p style="font-size: 11px; margin-top: 8px; color: #7c98b6;">
              Os dados de fase são coletados automaticamente conforme os tickets são movidos entre as colunas do pipeline.
            </p>
          </div>
        `;
        return;
      }
      
      // Calculate phase totals
      let phaseTotals = {};
      let totalTime = 0;
      
      if (selectedTicketId === 'all') {
        // Calculate totals for all tickets
        Object.keys(phaseTimers).forEach(ticketId => {
          const phases = phaseTimers[ticketId];
          Object.entries(phases).forEach(([phase, time]) => {
            phaseTotals[phase] = (phaseTotals[phase] || 0) + time;
            totalTime += time;
          });
        });
      } else {
        // Calculate for selected ticket only
        const phases = phaseTimers[selectedTicketId] || {};
        Object.entries(phases).forEach(([phase, time]) => {
          phaseTotals[phase] = time;
          totalTime += time;
        });
      }
      
      // If no time recorded
      if (totalTime === 0) {
        phaseList.innerHTML = `
          <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="empty-state-icon">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            Nenhum tempo registrado em fases.
            <p style="font-size: 11px; margin-top: 8px; color: #7c98b6;">
              ${selectedTicketId === 'all' ? 
                'Nenhum ticket tem tempo registrado em fases.' : 
                `O ticket "${currentTimerData.ticketTitles[selectedTicketId] || '#' + selectedTicketId}" não tem tempo registrado em fases.`}
            </p>
          </div>
        `;
        return;
      }
      
      // Sort phases by time (descending)
      const sortedPhases = Object.entries(phaseTotals)
        .sort(([, timeA], [, timeB]) => timeB - timeA);
      
      // Render phase list
      sortedPhases.forEach(([phase, time]) => {
        const percentage = Math.round((time / totalTime) * 100);
        const phaseItem = document.createElement('div');
        phaseItem.className = 'phase-item';
        phaseItem.innerHTML = `
          <div>
            <div class="phase-item-name">
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${phaseColorMap[phase] || '#7c98b6'}; margin-right: 5px;"></span>
              ${phase}
            </div>
            <div style="font-size: 11px; color: #7c98b6;">${percentage}% do tempo total</div>
          </div>
          <div class="phase-item-time">${formatTimeWithSeconds(time)}</div>
        `;
        phaseList.appendChild(phaseItem);
      });
      
      // Render phase bar
      sortedPhases.forEach(([phase, time]) => {
        const percentage = (time / totalTime) * 100;
        const segment = document.createElement('div');
        segment.className = 'phase-segment';
        segment.style.width = `${percentage}%`;
        segment.style.backgroundColor = phaseColorMap[phase] || '#7c98b6';
        segment.setAttribute('title', `${phase}: ${formatTimeWithSeconds(time)} (${Math.round(percentage)}%)`);
        phaseBar.appendChild(segment);
      });
      
      // Render legend (top 5 phases)
      const topPhases = sortedPhases.slice(0, 5);
      topPhases.forEach(([phase, time]) => {
        const percentage = Math.round((time / totalTime) * 100);
        const legendItem = document.createElement('div');
        legendItem.className = 'phase-legend-item';
        legendItem.innerHTML = `
          <span class="phase-color" style="background-color: ${phaseColorMap[phase] || '#7c98b6'};"></span>
          <span>${phase} (${percentage}%)</span>
        `;
        phaseLegend.appendChild(legendItem);
      });
    }
    
    /**
     * Load color settings from data
     * @param {Object} settings - Color settings
     */
    function loadColorSettings(settings) {
      if (!settings) return;
      
      colorSettings = settings;
      
      // Update lane color pickers
      if (settings.lanes) {
        for (const [lane, color] of Object.entries(settings.lanes)) {
          const picker = document.querySelector(`[data-type="lane"][data-name="${lane}"]`);
          if (picker) picker.value = color;
        }
      }
      
      // Update owner color pickers
      if (settings.owners) {
        for (const [owner, color] of Object.entries(settings.owners)) {
          const picker = document.querySelector(`[data-type="owner"][data-name="${owner}"]`);
          if (picker) picker.value = color;
        }
      }
      
      // Render custom owners
      renderCustomOwners(settings.customOwners || {});
    }
    
    /**
     * Render custom owners in settings
     * @param {Object} customOwners - Custom owners data
     */
    function renderCustomOwners(customOwners) {
      customOwnersList.innerHTML = '';
      
      for (const [name, color] of Object.entries(customOwners)) {
        const item = document.createElement('div');
        item.className = 'custom-owner-item';
        item.innerHTML = `
          <span class="color-preview" style="background-color: ${color};"></span>
          <span class="name">${name}</span>
          <button class="remove-btn" data-name="${name}">&times;</button>
        `;
        
        // Add remove event
        item.querySelector('.remove-btn').addEventListener('click', (e) => {
          const name = e.target.dataset.name;
          removeCustomOwner(name);
        });
        
        customOwnersList.appendChild(item);
      }
    }
    
    /**
     * Start updater for active timer display
     * @param {number} baseSeconds - Base seconds already elapsed
     * @param {Date} startTime - Timer start time
     */
    function startActiveTimerUpdater(baseSeconds, startTime) {
      // Clear any existing updater
      if (activeTimerUpdater) {
        clearInterval(activeTimerUpdater);
      }
      
      // Update every second
      activeTimerUpdater = setInterval(() => {
        // Calculate current elapsed time
        const elapsedSeconds = Math.floor((new Date() - startTime) / 1000);
        const totalSeconds = baseSeconds + elapsedSeconds;
        
        // Update main display
        const timerValue = document.getElementById('active-timer-value');
        if (timerValue) {
          timerValue.textContent = formatTimeWithSeconds(totalSeconds);
        }
        
        // Update list display
        const ticketId = currentTimerData.activeTicket;
        const listTimer = document.getElementById(`timer-list-${ticketId}`);
        if (listTimer) {
          listTimer.textContent = formatTimeWithSeconds(totalSeconds);
        }
      }, 1000);
    }
    
    // ===== Event Handlers =====
    /**
     * Handle export button click
     */
    function handleExport() {
      exportBtn.disabled = true;
      exportBtn.innerHTML = `
        <span class="loading-spinner" style="width:14px;height:14px;margin-right:8px;"></span>
        Exportando...
      `;
      
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "exportTimerReport" }, function(response) {
          setTimeout(() => {
            exportBtn.disabled = false;
            exportBtn.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Exportar Relatório
            `;
            
            if (response && response.success) {
              showSuccessMessage('Relatório exportado com sucesso!');
            } else {
              showSuccessMessage('Erro ao exportar relatório', true);
            }
          }, 1000);
        });
      });
    }
    
    /**
     * Handle refresh button click
     */
    function handleRefresh() {
      refreshBtn.disabled = true;
      refreshBtn.innerHTML = `
        <span class="loading-spinner" style="width:14px;height:14px;margin-right:8px;"></span>
        Atualizando...
      `;
      
      // Show loading states
      timerList.innerHTML = '<div class="loading"><span class="loading-spinner"></span><p>Atualizando dados...</p></div>';
      phaseList.innerHTML = '<div class="loading"><span class="loading-spinner"></span><p>Atualizando dados...</p></div>';
      
      // Request refresh in content script
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "refreshTimers" }, function() {
          // Reload data
          loadData();
          
          setTimeout(() => {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M23 4v6h-6"></path>
                <path d="M1 20v-6h6"></path>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              Atualizar
            `;
          }, 1000);
        });
      });
    }
    
    /**
     * Confirm and reset all timers
     */
    function confirmResetAll() {
      if (confirm('Tem certeza que deseja resetar todos os timers? Esta ação não pode ser desfeita.')) {
        resetAllBtn.disabled = true;
        resetAllBtn.innerHTML = `
          <span class="loading-spinner" style="width:14px;height:14px;margin-right:8px;"></span>
          Processando...
        `;
        
        chrome.storage.local.set({
          ticketTimers: {},
          activeTicket: null,
          timerStartTime: null,
          phaseTimers: {},
          currentPhases: {},
          lastPhaseChange: {}
        }, () => {
          // Notify content script
          chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "refreshTimers" });
          });
          
          setTimeout(() => {
            loadData();
            showSuccessMessage('Todos os timers foram resetados!');
            
            resetAllBtn.disabled = false;
            resetAllBtn.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Resetar
            `;
          }, 500);
        });
      }
    }
    
    /**
     * Pause active timer
     */
    function pauseActiveTimer() {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "pauseTimer" }, function() {
          // Stop updater
          if (activeTimerUpdater) {
            clearInterval(activeTimerUpdater);
            activeTimerUpdater = null;
          }
          
          // Reload data
          loadData();
        });
      });
    }
    
    /**
     * Switch between tabs
     * @param {string} tab - Tab name to switch to
     */
    function switchTab(tab) {
      // Update tab buttons
      tabTickets.classList.toggle('active', tab === 'tickets');
      tabPhases.classList.toggle('active', tab === 'phases');
      tabSettings.classList.toggle('active', tab === 'settings');
      
      // Update tab content visibility
      ticketsTabContent.style.display = tab === 'tickets' ? 'block' : 'none';
      phasesTabContent.style.display = tab === 'phases' ? 'block' : 'none';
      settingsTabContent.style.display = tab === 'settings' ? 'block' : 'none';
      
      // If switching to phases tab, render phase data
      if (tab === 'phases') {
        renderPhaseData();
      }
    }
    
    /**
     * Show context menu for a ticket
     * @param {Event} event - The triggering event
     * @param {string} ticketId - The ticket ID
     * @param {Object} ticketInfo - Ticket information
     */
    function showContextMenu(event, ticketId, ticketInfo) {
      currentContextTicketId = ticketId;
      currentContextTicketInfo = ticketInfo;
      
      const rect = contextMenu.getBoundingClientRect();
      const x = event.clientX;
      const y = event.clientY;
      
      // Adjust position to keep menu in view
      const adjustedX = Math.min(x, window.innerWidth - rect.width - 5);
      const adjustedY = Math.min(y, window.innerHeight - rect.height - 5);
      
      contextMenu.style.left = `${adjustedX}px`;
      contextMenu.style.top = `${adjustedY}px`;
      contextMenu.classList.add('show');
      
      event.preventDefault();
      event.stopPropagation();
    }
    
    /**
     * Hide context menu
     */
    function hideContextMenu() {
      contextMenu.classList.remove('show');
    }
    
    /**
     * Handle View Phases context menu option
     */
    function handleViewPhases() {
      if (currentContextTicketId) {
        // Switch to phases tab
        switchTab('phases');
        
        // Select the ticket
        phaseTicketSelector.value = currentContextTicketId;
        
        // Render phase data
        renderPhaseData();
        
        // Hide context menu
        hideContextMenu();
      }
    }
    
    /**
     * Handle Add Time context menu option
     */
    function handleAddTime() {
      if (currentContextTicketId && currentContextTicketInfo) {
        showAddTimeModal();
        hideContextMenu();
      }
    }
    
    /**
     * Show modal to add time
     */
    function showAddTimeModal() {
      // Set ticket info
      modalTicketName.textContent = currentContextTicketInfo.title || `Ticket #${currentContextTicketId}`;
      modalTicketId.textContent = `#${currentContextTicketId}`;
      
      // Fill phase select options
      phaseSelect.innerHTML = '';
      knownPhases.forEach(phase => {
        const option = document.createElement('option');
        option.value = phase;
        option.textContent = phase;
        if (phase === currentContextTicketInfo.phase) {
          option.selected = true;
        }
        phaseSelect.appendChild(option);
      });
      
      // Reset time inputs
      hoursInput.value = '0';
      minutesInput.value = '0';
      
      // Show modal
      addTimeModal.classList.add('show');
    }
    
    /**
     * Hide modal
     */
    function hideAddTimeModal() {
      addTimeModal.classList.remove('show');
    }
    
    /**
     * Handle submit of add time form
     */
    function handleAddTimeSubmit() {
      const phase = phaseSelect.value;
      const hours = parseInt(hoursInput.value) || 0;
      const minutes = parseInt(minutesInput.value) || 0;
      
      // Calculate total seconds
      const secondsToAdd = hours * 3600 + minutes * 60;
      
      if (secondsToAdd <= 0) {
        showSuccessMessage('Por favor, informe um tempo válido', true);
        return;
      }
      
      // Send message to add time
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'addTimeToPhase',
          ticketId: currentContextTicketId,
          phase: phase,
          seconds: secondsToAdd
        }, function(response) {
          if (response && response.success) {
            hideAddTimeModal();
            loadData();
            showSuccessMessage(`Tempo adicionado com sucesso: ${formatTimeWithHoursAndMinutes(secondsToAdd)}`);
          } else {
            showSuccessMessage('Erro ao adicionar tempo', true);
          }
        });
      });
    }
    
    /**
     * Handle Copy Time Report context menu option
     */
    function handleCopyTimeReport() {
      if (!currentContextTicketId || !currentTimerData) return;
      
      const phaseData = currentTimerData.phaseTimers[currentContextTicketId] || {};
      const ticketTitle = currentTimerData.ticketTitles[currentContextTicketId] || `Ticket #${currentContextTicketId}`;
      
      // Build report
      let report = `Tempo Gasto no Ticket: ${ticketTitle}\n`;
      report += `ID: ${currentContextTicketId}\n`;
      report += `Fases: `;
      
      // Add time per phase
      let hasFaseData = false;
      knownPhases.forEach(phase => {
        const timeInPhase = phaseData[phase] || 0;
        if (timeInPhase > 0) {
          hasFaseData = true;
          report += `${phase}: ${formatTimeWithHoursAndMinutes(timeInPhase)} `;
        }
      });
      
      if (!hasFaseData) {
        report += "Nenhuma fase com tempo registrado. ";
      }
      
      // Add total time
      const totalTime = currentTimerData.ticketTimers[currentContextTicketId] || 0;
      report += `\nTempo Total: ${formatTimeWithHoursAndMinutes(totalTime)}`;
      
      // Copy to clipboard
      navigator.clipboard.writeText(report)
        .then(() => {
          showSuccessMessage('Relatório copiado para a área de transferência');
        })
        .catch(err => {
          console.error('Erro ao copiar relatório:', err);
          showSuccessMessage('Erro ao copiar relatório', true);
        });
      
      hideContextMenu();
    }
    
    /**
     * Handle Go To Ticket context menu option
     */
    function handleGoToTicket() {
      if (currentContextTicketId) {
        chrome.tabs.create({
          url: `https://app.hubspot.com/contacts/1796841/ticket/${currentContextTicketId}/`
        });
        hideContextMenu();
      }
    }
    
    /**
     * Handle Reset Timer context menu option
     */
    function handleResetTimer() {
      if (!currentContextTicketId) return;
      
      if (confirm(`Tem certeza que deseja resetar o timer do ticket "${currentContextTicketInfo.title}"? Esta ação não pode ser desfeita.`)) {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'resetTicketTimer',
            ticketId: currentContextTicketId
          }, function(response) {
            if (response && response.success) {
              loadData();
              showSuccessMessage('Timer resetado com sucesso');
            } else {
              showSuccessMessage('Erro ao resetar timer', true);
            }
          });
        });
      }
      
      hideContextMenu();
    }
    
    /**
     * Handle color picker change
     * @param {Event} e - The change event
     */
    function handleColorChange(e) {
      const type = e.target.dataset.type;
      const name = e.target.dataset.name;
      const color = e.target.value;
      
      if (type === 'lane') {
        colorSettings.lanes[name] = color;
      } else if (type === 'owner') {
        colorSettings.owners[name] = color;
      }
    }
    
    /**
     * Handle reset color button click
     * @param {Event} e - The click event
     */
    function handleResetColor(e) {
      const targetId = e.target.dataset.target;
      const colorPicker = document.getElementById(targetId);
      
      if (colorPicker) {
        const type = colorPicker.dataset.type;
        const name = colorPicker.dataset.name;
        
        // Reset to default color
        if (type === 'lane') {
          colorPicker.value = '#' + Math.floor(Math.random()*16777215).toString(16); // Random color as placeholder
        } else if (type === 'owner') {
          colorPicker.value = '#' + Math.floor(Math.random()*16777215).toString(16); // Random color as placeholder
        }
        
        // Apply the change event
        colorPicker.dispatchEvent(new Event('change'));
      }
    }
    
    /**
     * Save color settings
     */
    function saveSettings() {
      // Update content script with new settings
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        // Save to local storage
        localStorage.setItem('timeMyTicket_colorSettings', JSON.stringify(colorSettings));
        
        // Apply settings in content script
        chrome.tabs.sendMessage(tabs[0].id, { action: 'applyColorSettings' }, function() {
          showSuccessMessage('Configurações salvas com sucesso');
        });
      });
    }
    
    /**
     * Reset all settings to defaults
     */
    function resetAllSettings() {
      if (confirm('Tem certeza que deseja resetar todas as configurações? Esta ação não pode ser desfeita.')) {
        colorSettings = {
          lanes: {},
          owners: {},
          customOwners: {}
        };
        
        // Reset all color pickers
        colorPickers.forEach(picker => {
          picker.value = '#' + Math.floor(Math.random()*16777215).toString(16); // Random color as placeholder
        });
        
        // Clear custom owners
        customOwnersList.innerHTML = '';
        
        // Save settings
        saveSettings();
      }
    }
    
    /**
     * Add custom owner
     */
    function addCustomOwner() {
      const name = customOwnerName.value.trim();
      const color = customOwnerColor.value;
      
      if (!name) {
        showSuccessMessage('Por favor, informe um nome para o responsável', true);
        return;
      }
      
      // Add to settings
      colorSettings.customOwners[name] = color;
      
      // Update UI
      renderCustomOwners(colorSettings.customOwners);
      
      // Clear inputs
      customOwnerName.value = '';
      customOwnerColor.value = '#' + Math.floor(Math.random()*16777215).toString(16); // Random color
      
      // Show success message
      showSuccessMessage(`Responsável "${name}" adicionado com sucesso`);
    }
    
    /**
     * Remove custom owner
     * @param {string} name - Owner name to remove
     */
    function removeCustomOwner(name) {
      if (colorSettings.customOwners[name]) {
        delete colorSettings.customOwners[name];
        renderCustomOwners(colorSettings.customOwners);
      }
    }
    
    // ===== Helper Functions =====
    /**
     * Format time in seconds to HH:MM:SS format
     * @param {number} seconds - Total time in seconds
     * @returns {string} Formatted time string
     */
    function formatTimeWithSeconds(seconds) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    /**
     * Format time in seconds to a human-readable format (Xh Ymin)
     * @param {number} seconds - Total time in seconds
     * @returns {string} Formatted time string
     */
    function formatTimeWithHoursAndMinutes(seconds) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      
      if (hours === 0 && minutes === 0) {
        return "menos de 1min";
      }
      
      let result = "";
      if (hours > 0) {
        result += `${hours}h `;
      }
      if (minutes > 0 || hours === 0) {
        result += `${minutes}min`;
      }
      
      return result.trim();
    }
    
    /**
     * Format date to locale string
     * @param {Date} date - Date object
     * @returns {string} Formatted date string
     */
    function formatDate(date) {
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    /**
     * Show success or error message
     * @param {string} message - Message to show
     * @param {boolean} isError - Whether this is an error message
     */
    function showSuccessMessage(message, isError = false) {
      // Remove any existing message
      const existingMsg = document.querySelector('.success-message');
      if (existingMsg) {
        existingMsg.remove();
      }
      
      // Create new message
      const msgEl = document.createElement('div');
      msgEl.className = 'success-message';
      msgEl.textContent = message;
      
      if (isError) {
        msgEl.style.backgroundColor = '#ff5c35';
      }
      
      document.body.appendChild(msgEl);
      
      // Remove after 3 seconds
      setTimeout(() => {
        msgEl.style.opacity = '0';
        msgEl.style.transform = 'translateY(10px)';
        setTimeout(() => msgEl.remove(), 300);
      }, 2700);
    }
    
    /**
     * Show error when unable to load data
     * @param {string} message - Error message
     */
    function showError(message) {
      activeTimerInfo.innerHTML = `
        <div class="section-title">Timer Atual</div>
        <div class="active-timer-content">
          <div class="timer-info" style="text-align: center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff5c35" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 8px;">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p style="color: #ff5c35;">${message}</p>
          </div>
        </div>
      `;
      
      timerList.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ff5c35" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="empty-state-icon">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p style="color: #ff5c35;">${message}</p>
        </div>
      `;
    }
  });