/**
 * ColorManager handles card color highlighting
 */
class ColorManager {
    constructor() {
      // Color settings
      this.settings = {
        lanes: { ...CONFIG.cardHighlight.defaultColors.lanes },
        owners: { ...CONFIG.cardHighlight.defaultColors.owners },
        customOwners: {}
      };
      
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
    }
    
    /**
     * Load color settings from storage
     */
    async loadColorSettings() {
      try {
        const savedSettings = localStorage.getItem(CONFIG.storageKeys.colorSettings);
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          
          // Merge saved settings with defaults
          this.settings = {
            lanes: { ...CONFIG.cardHighlight.defaultColors.lanes, ...parsedSettings.lanes },
            owners: { ...CONFIG.cardHighlight.defaultColors.owners, ...parsedSettings.owners },
            customOwners: parsedSettings.customOwners || {}
          };
          
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
        localStorage.setItem(CONFIG.storageKeys.colorSettings, JSON.stringify(this.settings));
        console.log('Color settings saved');
      } catch (error) {
        console.error('Error saving color settings:', error);
      }
    }
    
    /**
     * Apply color highlighting to cards
     */
    /**
 * Apply color highlights to the card's containers
 */
/**
 * Apply color highlights to the card's containers
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
          if (phaseName === 'Entregues' && this.settings.lanes['Entregues']) {
            highlightClass = 'lane-highlight-entregues';
            highlightColor = this.settings.lanes['Entregues'];
          } else if (phaseName === 'Dispensados' && this.settings.lanes['Dispensados']) {
            highlightClass = 'lane-highlight-dispensados';
            highlightColor = this.settings.lanes['Dispensados'];
          } else if (phaseName === 'Impedidos' && this.settings.lanes['Impedidos']) {
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
        
        // Check predefined owners
        if (this.settings.owners[ownerName]) {
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
        customOwners: {}
      };
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