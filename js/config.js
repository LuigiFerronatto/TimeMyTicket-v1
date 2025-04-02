/**
 * Configuration settings for TimeMyTicket extension
 */
const CONFIG = {
    // HubSpot DOM selectors
    selectors: {
              // Outermost item container
              columnItemSelector: '[data-test-id="cdb-column-item"]',
        
              // Draggable container
              draggableItemSelector: '[data-rbd-draggable-id]',
              
              // Clickable container
              clickableSelector: '.UIClickable-w869x8-0',
              
              // Card containers (multiple levels)
              tileWrapperSelector: '[data-test-id="cdb-card"]',
              viewSelector: '.View__StyledView-rufepw-0',
              
              // The actual card with content
              ticketCardSelector: '[data-test-id="cdbc-card"]',
              
              // ID attribute and other selectors
              ticketIdAttribute: 'data-selenium-id',
              phaseNameSelector: '[data-test-id="cdb-column-name"]',
              cardTitleSelector: '[data-test-id="cdbc-title"] .TitleProperty__TwoLines-sc-1e9uvz9-0 span',
              cardOwnerSelector: '[data-test-id="cdbc-property-0"] [data-test-id="cdbc-property-value"] span',
              cdaResponsibleSelector: '[data-test-id="cdbc-property-1"] [data-test-id="cdbc-property-value"] span'
    },
    
    // Phase settings
    knownPhases: [
      'NOVO', 'TRIAGEM', 'BACKLOG', 'DESCOBERTA E IDEAÇÃO',
      'DESENVOLVIMENTO', 'PREENCHIMENTO DE RFP', 'VALIDAÇÃO INICIAL',
      'APRESENTAÇÃO', 'REFINAMENTO E CONSOLIDAÇÃO', 'IMPEDIDOS', 
      'ENTREGUES', 'DISPENSADOS'
    ],
    
    // Colors for phases (corresponding to knownPhases)
    phaseColors: [
      '#FF5C35', '#FFB100', '#F2854C', '#00A4BD', 
      '#00BDA5', '#6A78D1', '#7C98B6', '#0091AE', 
      '#9FB5C9', '#D5DAE0', '#516F90', '#32373C'
    ],
    
    // Card highlight settings
    cardHighlight: {
      defaultColors: {
        lanes: {
          'Entregues': '#00bda5', 
          'Dispensados': '#ff5c35', 
          'Impedidos': '#ffab00'
        },
        owners: {
          'Thaila Bahiense': '#FF8A00',
          'Marcos Rodrigues': '#00A4BD',
          'Pablo Sathler': '#6A78D1',
          'Luigi Ferronatto': '#00BDA5',
          'Pedro Nascimento': '#F2854C',
          'Fabricio Lago': '#9FB5C9',
          'Fernanda Cupertino': '#FFB100'
        }
      }
    },
    
    // Animation settings
    animation: {
      activeBorderColor: 'rgb(255, 124, 32)',
      pulseInterval: 2, // in seconds
      minBorderWidth: 1, // in pixels
      maxBorderWidth: 5  // in pixels
    },
    
    // Storage keys
    storageKeys: {
      ticketTimers: 'ticketTimers',
      activeTicket: 'activeTicket',
      timerStartTime: 'timerStartTime',
      ticketTitles: 'ticketTitles',
      phaseTimers: 'phaseTimers',
      currentPhases: 'currentPhases',
      lastPhaseChange: 'lastPhaseChange',
      colorSettings: 'timeMyTicket_colorSettings'
    }
  };