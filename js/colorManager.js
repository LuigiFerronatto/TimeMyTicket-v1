/**
 * ColorManager handles card color highlighting
 */
class ColorManager {
  constructor() {
    // Color settings
    this.settings = {
      lanes: { ...CONFIG.cardHighlight.defaultColors.lanes },
      owners: { ...CONFIG.cardHighlight.defaultColors.owners },
      customOwners: {},
      enabledOwners: {}, // Track which owners have colors enabled
      enabledLanes: {}   // Track which lanes have colors enabled
    };
    
    // Set default enabled states for owners and lanes
    Object.keys(this.settings.lanes).forEach(lane => {
      this.settings.enabledLanes[lane] = true;
    });
    
    Object.keys(this.settings.owners).forEach(owner => {
      this.settings.enabledOwners[owner] = true;
    });
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize the color manager
   */
  async init() {
    console.log('Initializing ColorManager');
    
    // Load color settings
    await this.loadColorSettings();
    
    // Apply color highlights
    this.applyColorHighlights();

    // Set up interval to periodically reapply highlights (helps with dynamic content)
    setInterval(() => {
      this.applyColorHighlights();
    }, 30000); // Every 30 seconds
  }
  
  /**
   * Load color settings from storage
   */
  async loadColorSettings() {
    try {
      // Try to get settings from chrome.storage first
      const storedSettings = await new Promise(resolve => {
        chrome.storage.local.get(CONFIG.storageKeys.colorSettings, resolve);
      });
      
      let parsedSettings;
      if (storedSettings[CONFIG.storageKeys.colorSettings]) {
        parsedSettings = storedSettings[CONFIG.storageKeys.colorSettings];
      } else {
        // Fallback to localStorage
        const savedSettings = localStorage.getItem(CONFIG.storageKeys.colorSettings);
        if (savedSettings) {
          parsedSettings = JSON.parse(savedSettings);
        }
      }
      
      if (parsedSettings) {
        // Merge saved settings with defaults
        this.settings = {
          lanes: { ...CONFIG.cardHighlight.defaultColors.lanes, ...parsedSettings.lanes },
          owners: { ...CONFIG.cardHighlight.defaultColors.owners, ...parsedSettings.owners },
          customOwners: parsedSettings.customOwners || {},
          enabledLanes: parsedSettings.enabledLanes || {},
          enabledOwners: parsedSettings.enabledOwners || {}
        };
        
        // Set default enabled states if they don't exist
        Object.keys(this.settings.lanes).forEach(lane => {
          if (typeof this.settings.enabledLanes[lane] === 'undefined') {
            this.settings.enabledLanes[lane] = true;
          }
        });
        
        Object.keys(this.settings.owners).forEach(owner => {
          if (typeof this.settings.enabledOwners[owner] === 'undefined') {
            this.settings.enabledOwners[owner] = true;
          }
        });
        
        console.log('Color settings loaded:', this.settings);
      }
    } catch (error) {
      console.error('Error loading color settings:', error);
    }
  }
  
  /**
   * Save color settings to storage
   */
  saveColorSettings() {
    try {
      // Save to both storage methods for redundancy
      chrome.storage.local.set({
        [CONFIG.storageKeys.colorSettings]: this.settings
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('Error saving to chrome.storage:', chrome.runtime.lastError);
        } else {
          console.log('Color settings saved to chrome.storage');
        }
      });
      
      // Also save to localStorage
      localStorage.setItem(CONFIG.storageKeys.colorSettings, JSON.stringify(this.settings));
      console.log('Color settings saved to localStorage');
      
      // Notify all tabs to refresh
      chrome.runtime.sendMessage({ action: 'syncData' });
    } catch (error) {
      console.error('Error saving color settings:', error);
    }
  }
  
  /**
   * Apply color highlighting to cards
   */
  applyColorHighlights() {
    console.log('Applying color highlights to cards');
    
    // Find all ticket cards
    const cards = document.querySelectorAll(CONFIG.selectors.ticketCardSelector);
    console.log(`Found ${cards.length} cards to highlight`);
    
    cards.forEach(card => {
      // Find all elements in the card hierarchy
      const elements = window.uiManager.findCardElements(card);
      if (!elements.ticketId) return;
      
      // First, remove highlight classes from all elements in the hierarchy
      const allElements = [
        elements.columnItem,
        elements.draggable,
        elements.clickable,
        elements.tileWrapper,
        elements.viewContainer,
        elements.ticketCard
      ].filter(Boolean);
      
      allElements.forEach(element => {
        element.classList.remove('ticket-highlight', 'lane-highlight-entregues', 
          'lane-highlight-dispensados', 'lane-highlight-impedidos', 'owner-highlight');
        element.style.removeProperty('--highlight-color');
      });
      
      // Choose ONLY ONE element to apply the highlight to (the viewContainer is best)
      const targetElement = elements.viewContainer || elements.ticketCard;
      if (!targetElement) return;
      
      // Get ticket information
      const ticketInfo = window.timerManager ? 
        window.timerManager.getTicketInfo(elements.ticketId) : 
        { status: '', cda: '' };
      
      // Check for lane-based highlighting
      const column = card.closest('[data-test-id="cdb-column"]');
      if (column) {
        const phaseNameElement = column.querySelector(CONFIG.selectors.phaseNameSelector);
        if (phaseNameElement) {
          const phaseName = phaseNameElement.textContent.trim();
          
          let highlightClass = '';
          let highlightColor = '';
          
          // Determine highlight class and color based on phase
          if (phaseName === 'Entregues' && this.settings.lanes['Entregues'] && this.settings.enabledLanes['Entregues']) {
            highlightClass = 'lane-highlight-entregues';
            highlightColor = this.settings.lanes['Entregues'];
          } else if (phaseName === 'Dispensados' && this.settings.lanes['Dispensados'] && this.settings.enabledLanes['Dispensados']) {
            highlightClass = 'lane-highlight-dispensados';
            highlightColor = this.settings.lanes['Dispensados'];
          } else if (phaseName === 'Impedidos' && this.settings.lanes['Impedidos'] && this.settings.enabledLanes['Impedidos']) {
            highlightClass = 'lane-highlight-impedidos';
            highlightColor = this.settings.lanes['Impedidos'];
          }
          
          // Apply lane-based highlighting if applicable (ONLY to target element)
          if (highlightClass && highlightColor) {
            targetElement.classList.add('ticket-highlight', highlightClass);
            targetElement.style.setProperty('--highlight-color', highlightColor);
          }
        }
      }
      
      // Check for owner-based highlighting (only if not already highlighted by lane)
      if (!targetElement.classList.contains('ticket-highlight')) {
        const ownerName = ticketInfo.cda || '';
        
        let ownerColor = '';
        
        // Check predefined owners (only if enabled)
        if (this.settings.owners[ownerName] && this.settings.enabledOwners[ownerName]) {
          ownerColor = this.settings.owners[ownerName];
        }
        // Check custom owners
        else if (this.settings.customOwners) {
          // Check for exact match
          if (this.settings.customOwners[ownerName]) {
            ownerColor = this.settings.customOwners[ownerName];
          }
          // Check for partial matches (for email addresses)
          else {
            for (const [name, color] of Object.entries(this.settings.customOwners)) {
              if (ownerName.toLowerCase().includes(name.toLowerCase()) ||
                  name.toLowerCase().includes(ownerName.toLowerCase())) {
                ownerColor = color;
                break;
              }
            }
          }
        }
        
        // Apply owner-based highlighting if applicable (ONLY to target element)
        if (ownerColor) {
          targetElement.classList.add('ticket-highlight', 'owner-highlight');
          targetElement.style.setProperty('--highlight-color', ownerColor);
        }
      }
    });
  }
  
  /**
   * Update lane color
   * @param {string} lane - Lane name
   * @param {string} color - Color value
   */
  updateLaneColor(lane, color) {
    this.settings.lanes[lane] = color;
    this.saveColorSettings();
    this.applyColorHighlights();
  }
  
  /**
   * Toggle lane color enabling
   * @param {string} lane - Lane name
   * @param {boolean} enabled - Whether color is enabled
   */
  toggleLaneColor(lane, enabled) {
    this.settings.enabledLanes[lane] = enabled;
    this.saveColorSettings();
    this.applyColorHighlights();
  }
  
  /**
   * Update owner color
   * @param {string} owner - Owner name
   * @param {string} color - Color value
   */
  updateOwnerColor(owner, color) {
    this.settings.owners[owner] = color;
    this.saveColorSettings();
    this.applyColorHighlights();
  }
  
  /**
   * Toggle owner color enabling
   * @param {string} owner - Owner name
   * @param {boolean} enabled - Whether color is enabled
   */
  toggleOwnerColor(owner, enabled) {
    this.settings.enabledOwners[owner] = enabled;
    this.saveColorSettings();
    this.applyColorHighlights();
  }
  
  /**
   * Add custom owner color
   * @param {string} owner - Owner name
   * @param {string} color - Color value
   */
  addCustomOwner(owner, color) {
    this.settings.customOwners[owner] = color;
    this.saveColorSettings();
    this.applyColorHighlights();
  }
  
  /**
   * Remove custom owner
   * @param {string} owner - Owner name
   */
  removeCustomOwner(owner) {
    delete this.settings.customOwners[owner];
    this.saveColorSettings();
    this.applyColorHighlights();
  }
  
  /**
   * Reset lane color to default
   * @param {string} lane - Lane name
   */
  resetLaneColor(lane) {
    this.settings.lanes[lane] = CONFIG.cardHighlight.defaultColors.lanes[lane];
    this.saveColorSettings();
    this.applyColorHighlights();
  }
  
  /**
   * Reset owner color to default
   * @param {string} owner - Owner name
   */
  resetOwnerColor(owner) {
    this.settings.owners[owner] = CONFIG.cardHighlight.defaultColors.owners[owner];
    this.saveColorSettings();
    this.applyColorHighlights();
  }
  
  /**
   * Reset all color settings to defaults
   */
  resetAllColors() {
    this.settings = {
      lanes: { ...CONFIG.cardHighlight.defaultColors.lanes },
      owners: { ...CONFIG.cardHighlight.defaultColors.owners },
      customOwners: {},
      enabledOwners: {},
      enabledLanes: {}
    };
    
    // Re-enable all lanes and owners
    Object.keys(this.settings.lanes).forEach(lane => {
      this.settings.enabledLanes[lane] = true;
    });
    
    Object.keys(this.settings.owners).forEach(owner => {
      this.settings.enabledOwners[owner] = true;
    });
    
    this.saveColorSettings();
    this.applyColorHighlights();
  }
  
  /**
   * Get current color settings
   * @returns {Object} Color settings
   */
  getColorSettings() {
    return { ...this.settings };
  }
}

// Create global instance
window.colorManager = new ColorManager();