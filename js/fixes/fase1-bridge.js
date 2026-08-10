// Puente de compatibilidad de Fase 1.
// index.html carga este archivo antes de main.js; por eso esperamos a que el ERP
// termine de registrar sus módulos y luego cargamos el runtime de Fase 1.
window.App = window.App || {};
App.logic = App.logic || {};
App.views = App.views || {};

window.getPedidoDetalles = window.getPedidoDetalles || function(pedidoId) {
    return (App.state?.pedido_detalle || []).filter(d => d.pedido_id === pedidoId);
};

window.isReventa = window.isReventa || function(producto) {
    return String(producto?.categoria || '').toLowerCase() === 'reventa';
};

window.asegurarProduccionPedido = window.asegurarProduccionPedido || async function(pedidoId) {
    const detalles = window.getPedidoDetalles(pedidoId);
    const ordenesCreadas = [];

    for (const detalle of detalles) {
        const producto = (App.state?.productos || []).find(p => p.id === detalle.producto_id);
        if (!producto || window.isReventa(producto)) continue;
        const existente = (App.state?.ordenes_produccion || []).find(o => o.pedido_detalle_id === detalle.id);
        if (existente) continue;

        const receta = [];
        const factor = parseFloat(detalle.cantidad || 1) || 1;
        for (let i = 1; i <= 20; i++) {
            const matId = producto?.[`mat_${i}`];
            const cantBase = parseFloat(producto?.[`cant_${i}`] || 0) || 0;
            if (!matId || cantBase <= 0) continue;
            receta.push({ mat_id: matId, cant: cantBase * factor, uso: producto?.[`uso_${i}`] || 'Total' });
        }

        const orden = {
            id: `OP-${Date.now()}-${String(detalle.id).replace(/[^a-zA-Z0-9_-]/g, '')}`,
            pedido_detalle_id: detalle.id,
            pedido_id: pedidoId,
            producto_id: producto.id,
            producto_nombre: producto.nombre || '',
            cantidad: parseInt(detalle.cantidad || 1, 10) || 1,
            estado: 'pendiente',
            receta_personalizada: JSON.stringify(receta),
            materiales_descontados: false,
            materiales_revertidos: false,
            fecha_creacion: new Date().toISOString()
        };

        const res = await App.api.fetch('ejecutar_lote', {
            operaciones: [{ action: 'guardar_fila', nombreHoja: 'ordenes_produccion', datos: orden }]
        });
        if (res.status !== 'success') throw new Error(res.message || `No se pudo crear la orden de producción para ${producto.nombre}`);

        if (!Array.isArray(App.state.ordenes_produccion)) App.state.ordenes_produccion = [];
        App.state.ordenes_produccion.push(orden);
        ordenesCreadas.push(orden);
    }
    return ordenesCreadas;
};

setTimeout(() => {
    if (window.__fase1RuntimeCargado) return;
    const script = document.createElement('script');
    script.src = 'js/fixes/fase1-runtime.js?v=2';
    script.onload = () => { window.__fase1RuntimeCargado = true; };
    script.onerror = e => console.error('[Fase1] No se pudo cargar el runtime', e);
    document.head.appendChild(script);
}, 0);