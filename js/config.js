window.App = window.App || {};

App.config = {
    version: '11.6.1-debug',
    appName: 'ERP Descanso Maya',
    debug: true,

    api: {
        gasUrl: 'https://script.google.com/macros/s/AKfycbxL3KzjesyZIfiC-Dyr0SwwzwNnPsv5FgHpt-JhyscNpN1eTvRwAh_rdgoxdVnKTAwu/exec',
        timeoutMs: 30000
    },

    ui: {
        defaultView: 'inicio',
        enableCompatStyles: true,
        useSafeHTML: true
    }
};

window.__CONFIG_LOADED__ = true;
console.log('CONFIG CARGADO OK', App.config);
