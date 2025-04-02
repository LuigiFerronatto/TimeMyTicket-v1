// Global configuration for TimeMyTicket extension
window.CONFIG = {

  version: '1.1.0',
  // HubSpot DOM selectors
  selectors: {
      columnItemSelector: '[data-test-id="cdb-column-item"]',
      draggableItemSelector: '[data-rbd-draggable-id]',
      clickableSelector: '.UIClickable-w869x8-0',
      tileWrapperSelector: '.CardContent__StyledTileWrapper-sc-10aeu2l-0',
      viewSelector: '.View__StyledView-rufepw-0',
      ticketCardSelector: '[data-test-id="cdbc-card"]',
      ticketIdAttribute: 'data-selenium-id',
      phaseNameSelector: '[data-test-id="cdb-column-name"] span span span',
      cardTitleSelector: '[data-test-id="cdbc-title"] span span span',
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
  
  // Colors for phases
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
      pulseInterval: 3,
      minBorderWidth: 1,
      maxBorderWidth: 6
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