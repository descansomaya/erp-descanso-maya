// ==========================================
// ESTADO GLOBAL (LIMPIO)
// ==========================================

window.App = window.App || {};
App.views = App.views || {};
App.router = App.router || {};
App.logic = App.logic || {};
App.api = App.api || {};
App.ui = App.ui || {};

App.state = {
    // CONFIG
    config: {
        empresa: "Descanso Maya",
        moneda: "MXN",
        logoUrl: "https://i.ibb.co/5h0kNKrZ/DESCANSO-MAYA.png",
        redesSociales: "@descansomaya.mx"
    },

    // SESIÓN
    sessionToken: localStorage.getItem('erp_session_token') || null,

    // CORE DATA (Sheets)
    inventario: [],
    clientes: [],
    productos: [],
    pedidos: [],
    pedido_detalle: [],
    ordenes_produccion: [],
    artesanos: [],
    abonos: [],
    gastos: [],
    compras: [],
    proveedores: [],
    reparaciones: [],
    tarifas_artesano: [],
    pago_artesanos: [],
    movimientos_inventario: [],
    abonos_proveedores: [],

    // FUTURO / OPCIONAL (no activo aún)
    cotizaciones: []
};
