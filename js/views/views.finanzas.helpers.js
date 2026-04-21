window.App = window.App || {};
App.views = App.views || {};

App.views._resumenCosteoPlaneacion = function () {
    const pedidos = App.state.pedidos || [];
    const detalles = App.state.pedido_detalle || [];
    const ordenes = App.state.ordenes_produccion || [];
    const inventario = App.state.inventario || [];
    const asignaciones = App.state.ordenes_produccion_artesanos || [];
    const compras = App.state.compras || [];
    const abonos = App.state.abonos || [];
    const abonosRep = App.state.abonos_reparaciones || [];
    const reparaciones = App.state.reparaciones || [];
    const pagosArtesanos = App.state.pago_artesanos || [];

    const detallePedidos = pedidos.map(p => {
        const detallesPedido = detalles.filter(d => d.pedido_id === p.id);
        let costoMateriales = 0;
        let costoArtesanos = 0;

        detallesPedido.forEach(d => {
            const orden = ordenes.find(o => o.pedido_detalle_id === d.id);
            if (!orden) return;

            let receta = [];
            try { receta = JSON.parse(orden.receta_personalizada || '[]'); } catch (e) { receta = []; }

            receta.forEach(item => {
                const mat = inventario.find(m => m.id === item.mat_id);
                if (!mat) return;
                costoMateriales += (parseFloat(item.cant || 0) || 0) * (parseFloat(mat.costo_unitario || 0) || 0);
            });

            costoArtesanos += asignaciones
                .filter(a => a.orden_id === orden.id && String(a.estado || '').toLowerCase() !== 'cancelado')
                .reduce((acc, a) => acc + (parseFloat(a.pago_estimado || 0) || 0), 0);
        });

        const venta = parseFloat(p.total || 0) || 0;
        const costoTotal = costoMateriales + costoArtesanos;
        const utilidad = venta - costoTotal;
        const margen = venta > 0 ? (utilidad / venta) * 100 : 0;

        return { pedido_id: p.id, estado: p.estado || '', venta, costoMateriales, costoArtesanos, costoTotal, utilidad, margen };
    });

    const totalEntradasEsperadas = pedidos.reduce((acc, p) => {
        const totalAbonos = abonos.filter(a => a.pedido_id === p.id).reduce((s, a) => s + (parseFloat(a.monto || 0) || 0), 0);
        const saldo = (parseFloat(p.total || 0) || 0) - (parseFloat(p.anticipo || 0) || 0) - totalAbonos;
        return acc + (saldo > 0 ? saldo : 0);
    }, 0) + reparaciones.reduce((acc, r) => {
        const anticipo = parseFloat(r.anticipo_inicial || 0) || 0;
        const totalAbonos = abonosRep.filter(a => a.reparacion_id === r.id).reduce((s, a) => s + (parseFloat(a.monto || 0) || 0), 0);
        const saldo = (parseFloat(r.precio || 0) || 0) - anticipo - totalAbonos;
        return acc + (saldo > 0 ? saldo : 0);
    }, 0);

    const totalSalidasComprometidas = compras.reduce((acc, c) => {
        const total = parseFloat(c.total || 0) || 0;
        const pagado = c.monto_pagado !== undefined && c.monto_pagado !== '' ? parseFloat(c.monto_pagado || 0) : total;
        const deuda = total - pagado;
        return acc + (deuda > 0 ? deuda : 0);
    }, 0) + pagosArtesanos.filter(p => String(p.estado || '').toLowerCase() === 'pendiente').reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);

    return {
        totalUtilidad: detallePedidos.reduce((acc, x) => acc + x.utilidad, 0),
        totalVentas: detallePedidos.reduce((acc, x) => acc + x.venta, 0),
        totalCosto: detallePedidos.reduce((acc, x) => acc + x.costoTotal, 0),
        margenPromedio: detallePedidos.length ? detallePedidos.reduce((acc, x) => acc + x.margen, 0) / detallePedidos.length : 0,
        topRentables: [...detallePedidos].sort((a, b) => b.utilidad - a.utilidad).slice(0, 5),
        topBajoMargen: [...detallePedidos].sort((a, b) => a.margen - b.margen).slice(0, 5),
        entradasEsperadas: totalEntradasEsperadas,
        salidasComprometidas: totalSalidasComprometidas,
        saldoProyectado: totalEntradasEsperadas - totalSalidasComprometidas
    };
};