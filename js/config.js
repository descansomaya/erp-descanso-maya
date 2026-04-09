window.App = window.App || {};

App.config = {
  version: '11.6.0',
  appName: 'ERP Descanso Maya',
  debug: true,

  api: {
    gasUrl: 'https://script.google.com/macros/s/TU_DEPLOYMENT_ID/exec',
    timeoutMs: 30000
  },

  ui: {
    defaultView: 'inicio',
    enableCompatStyles: true,
    useSafeHTML: true
  }
};
