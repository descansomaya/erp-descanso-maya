window.App = window.App || {};

App.config = {
    version: '11.6.0',
    appName: 'ERP Descanso Maya',
    debug: true,

    api: {
        gasUrl: "https://script.google.com/macros/s/AKfycbxL3KzjesyZIfiC-Dyr0SwwzwNnPsv5FgHpt-JhyscNpN1eTvRwAh_rdgoxdVnKTAwu/exec",
        timeoutMs: 30000
    },

    ui: {
        defaultView: 'inicio',
        enableCompatStyles: true,
        useSafeHTML: true
    }
};
