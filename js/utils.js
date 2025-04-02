/**
 * Utility functions for TimeMyTicket extension
 */
const Utils = {
    /**
     * Format time in seconds to HH:MM:SS format
     * @param {number} seconds - Total time in seconds
     * @returns {string} Formatted time string
     */
    formatTimeWithSeconds(seconds) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },
    
    /**
     * Format time in seconds to a human-readable format (Xh Ymin)
     * @param {number} seconds - Total time in seconds
     * @returns {string} Formatted time string
     */
    formatTimeWithHoursAndMinutes(seconds) {
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
    },
    
    /**
     * Format date to locale string
     * @param {Date} date - Date object
     * @returns {string} Formatted date string
     */
    formatDate(date) {
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    
    /**
     * Get data from chrome.storage.local
     * @param {Array<string>} keys - Array of keys to retrieve
     * @returns {Promise<Object>} Object with the retrieved data
     */
    getFromStorage(keys) {
      return new Promise(resolve => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.get(keys, resolve);
        } else {
          // Fallback to localStorage
          const result = {};
          keys.forEach(key => {
            const value = localStorage.getItem(`hubspot_timer_${key}`);
            result[key] = value ? JSON.parse(value) : null;
          });
          resolve(result);
        }
      });
    },
    
    /**
     * Save data to chrome.storage.local
     * @param {Object} data - Data to save
     * @returns {Promise<void>}
     */
    saveToStorage(data) {
      return new Promise(resolve => {
        try {
          if (typeof chrome !== 'undefined' && chrome?.runtime?.id && chrome.storage) {
            chrome.storage.local.set(data, resolve);
          } else {
            throw new Error('Contexto inválido');
          }
        } catch (e) {
          // Fallback
          console.warn('[Fallback] Usando localStorage:', e);
          Object.keys(data).forEach(key => {
            localStorage.setItem(`hubspot_timer_${key}`, JSON.stringify(data[key]));
          });
          resolve();
        }
      });
    }
    ,
    
    /**
     * Debounce function to limit how often a function is called
     * @param {Function} func - The function to debounce
     * @param {number} wait - The debounce time in milliseconds
     * @returns {Function} The debounced function
     */
    debounce(func, wait) {
      let timeout;
      return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
      };
    },
    
    /**
     * Create and show a toast notification
     * @param {string} message - Message to display
     * @param {string} type - Toast type (success, info, warning, error)
     */
    showToast(message, type = 'info') {
      // Create the element toast if it doesn't exist
      let toast = document.getElementById('ticket-timer-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'ticket-timer-toast';
        document.body.appendChild(toast);
      }
      
      // Set the class and content
      toast.className = `ticket-timer-toast ${type}`;
      toast.textContent = message;
      
      // Show the toast
      toast.classList.add('show');
      
      // Remove after 3 seconds
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3000);
    },
    
    /**
     * Generate a unique ID
     * @returns {string} A unique ID
     */
    generateId() {
      return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
  };