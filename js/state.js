// ==========================================
// 1. ESTADO GLOBAL Y MEMORIA (state.js)
// ==========================================

const App = { views: {}, router: {}, logic: {}, api: {}, ui: {} };

App.state = { 
    config: { 
        empresa: "Descanso Maya", 
        moneda: "MXN", 
        logoUrl: "https://i.ibb.co/5h0kNKrZ/DESCANSO-MAYA.png", 
        redesSociales: "@descansomaya.mx" 
    }, 
    pinAcceso: localStorage.getItem('erp_pin') || null, 
    cotizaciones: JSON.parse(localStorage.getItem('erp_cotizaciones')) || [], 
    pedidos: [], 
    pedido_detalle: [], 
    ordenes_produccion: [], 
    artesanos: [], 
    inventario: [], 
    productos: [], 
    clientes: [], 
    abonos: [], 
    gastos: [], 
    compras: [], 
    proveedores: [], 
    reparaciones: [], 
    tarifas_artesano: [], 
    pago_artesanos: [], 
    movimientos_inventario: [] 
};
