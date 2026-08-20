window.App = window.App || {};
App.views = App.views || {};
App.state = App.state || {};

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

// ==========================================================
// MOTOR FINANCIERO CENTRAL: SALIDAS REALES Y REEMBOLSOS
// ==========================================================

App.logic = App.logic || {};

App.logic._resumenReembolsosFinanzas = function (filtro = 'todo') {
    const reembolsos = Array.isArray(App.state.reembolsos) ? App.state.reembolsos : [];

    const entraEnFiltro = (fechaStr) => {
        if (!fechaStr) return filtro === 'todo';
        const fecha = new Date(fechaStr);
        if (isNaN(fecha.getTime())) return false;
        if (filtro === 'todo') return true;
        const hoy = new Date();
        const mesActual = hoy.getMonth();
        const anioActual = hoy.getFullYear();
        if (filtro === 'mes_actual') return fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual;
        if (filtro === 'trimestre_actual') return fecha.getFullYear() === anioActual && Math.floor(fecha.getMonth() / 3) === Math.floor(mesActual / 3);
        if (filtro === 'anio_actual') return fecha.getFullYear() === anioActual;
        if (filtro === 'custom') {
            const desde = App.state.finanzasFechaDesde || '';
            const hasta = App.state.finanzasFechaHasta || '';
            if (!desde || !hasta) return true;
            return fecha >= new Date(desde + 'T00:00:00') && fecha <= new Date(hasta + 'T23:59:59');
        }
        return true;
    };

    const rows = reembolsos.filter(r => {
        const estado = String(r.estado || '').toLowerCase().trim();
        const fecha = estado === 'pagado'
            ? (r.fecha_pago || r.fecha || r.fecha_creacion)
            : (r.fecha || r.fecha_creacion || r.fecha_pago);
        return entraEnFiltro(fecha);
    });

    const pagados = rows.filter(r => String(r.estado || '').toLowerCase().trim() === 'pagado');
    const pendientes = rows.filter(r => String(r.estado || '').toLowerCase().trim() === 'pendiente');

    return {
        rows,
        pagados,
        pendientes,
        totalPagados: pagados.reduce((sum, r) => sum + (parseFloat(r.monto || 0) || 0), 0),
        totalPendientes: pendientes.reduce((sum, r) => sum + (parseFloat(r.monto || 0) || 0), 0)
    };
};

App.logic.obtenerResumenReembolsosFinanzas = App.logic._resumenReembolsosFinanzas;

if (typeof App.logic.obtenerResumenFinancieroCentral === 'function' && !App.logic.__finanzasIntegradas) {
    const resumenFinancieroOriginal = App.logic.obtenerResumenFinancieroCentral;

    App.logic.obtenerResumenFinancieroCentral = function (filtro = 'todo') {
        const resumen = resumenFinancieroOriginal.call(this, filtro);
        const reembolsos = App.logic._resumenReembolsosFinanzas(filtro);

        resumen.totalReembolsosPagados = reembolsos.totalPagados;
        resumen.totalReembolsosPendientes = reembolsos.totalPendientes;
        resumen.reembolsos = reembolsos.rows;
        resumen.reembolsosPagados = reembolsos.pagados;
        resumen.reembolsosPendientes = reembolsos.pendientes;

        // Una devolución pendiente todavía NO es salida de caja.
        // Una devolución pagada SÍ es salida real.
        resumen.salidasRegistradas = (parseFloat(resumen.salidasRegistradas || 0) || 0) + reembolsos.totalPagados;
        resumen.reembolsosPagados = reembolsos.pagados;
        resumen.flujoOperativo = (parseFloat(resumen.cobrado || 0) || 0) - resumen.salidasRegistradas;
        resumen.resultadoCajaReal = resumen.flujoOperativo;
        resumen.saldoProyectado = (parseFloat(resumen.saldoProyectado || 0) || 0) - reembolsos.totalPendientes;

        return resumen;
    };

    App.logic.__finanzasIntegradas = true;
}

// ==========================================================
// PRESENTACIÓN DE REEMBOLSOS EN FINANZAS > EGRESOS
// ==========================================================

setTimeout(() => {
    if (typeof App.views.finanzas !== 'function' || App.views.__reembolsosIntegrados) return;

    const finanzasOriginal = App.views.finanzas;

    App.views.finanzas = function () {
        let html = finanzasOriginal.apply(this, arguments);
        const filtro = App.state.finanzasFiltro || 'mes_actual';
        const resumen = typeof App.logic.obtenerResumenFinancieroCentral === 'function'
            ? App.logic.obtenerResumenFinancieroCentral(filtro)
            : null;

        if (!resumen || (App.state.finanzasTab || 'resumen') !== 'egresos') return html;

        const money = n => '$' + ((parseFloat(n || 0) || 0).toFixed(2));
        const reembolsos = App.logic._resumenReembolsosFinanzas(filtro);
        const salidasReales = parseFloat(resumen.salidasRegistradas || 0) || 0;

        const block = `
            <div class="dm-mb-4">
                <div class="dm-card" style="border:1px solid #FEB2B2;background:#FFF5F5">
                    <div class="dm-card-title" style="color:#C53030">💸 Reembolsos</div>
                    <div class="dm-muted dm-mt-2">Devoluciones de dinero registradas.</div>
                    <div class="dm-mt-3" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px">
                        <div class="dm-card"><div class="dm-kpi-label">Pagados</div><div class="dm-kpi-value" style="color:#C53030">${money(reembolsos.totalPagados)}</div></div>
                        <div class="dm-card"><div class="dm-kpi-label">Pendientes</div><div class="dm-kpi-value" style="color:#B7791F">${money(reembolsos.totalPendientes)}</div></div>
                        <div class="dm-card"><div class="dm-kpi-label">Salidas por reembolso</div><div class="dm-kpi-value">${money(salidasReales)}</div></div>
                    </div>
                    <div class="dm-mt-3" style="overflow:auto">
                        ${reembolsos.rows.length ? `
                            <table class="dm-table" style="width:100%;min-width:720px">
                                <thead><tr><th>Reembolso</th><th>Pedido</th><th>Fecha</th><th>Estado</th><th>Motivo</th><th>Monto</th></tr></thead>
                                <tbody>${reembolsos.rows.map(r => {
                                    const estado = String(r.estado || '').toLowerCase().trim();
                                    const fecha = estado === 'pagado' ? (r.fecha_pago || r.fecha || r.fecha_creacion) : (r.fecha || r.fecha_creacion || r.fecha_pago);
                                    return `<tr style="background:${estado === 'pagado' ? '#FFF5F5' : '#FFFBEB'}">
                                        <td>${App.ui.safe(r.id || '')}</td>
                                        <td>${App.ui.safe(r.pedido_id || '')}</td>
                                        <td>${App.ui.safe(String(fecha || '').split('T')[0])}</td>
                                        <td>${App.ui.safe(r.estado || '')}</td>
                                        <td>${App.ui.safe(r.motivo || 'Devolución de pedido')}</td>
                                        <td style="text-align:right;font-weight:700">${money(r.monto)}</td>
                                    </tr>`;
                                }).join('')}</tbody>
                            </table>` : '<div class="dm-alert dm-alert-info">No hay reembolsos para este filtro.</div>'}
                    </div>
                </div>
            </div>`;

        const marker = '<div class="dm-card dm-mb-4" style="display:flex; gap:8px; flex-wrap:wrap;">';
        return html.includes(marker) ? html.replace(marker, block + marker) : html;
    };

    App.views.__reembolsosIntegrados = true;

    try {
        if (App.router && typeof App.router.handleRoute === 'function') App.router.handleRoute();
    } catch (e) {
        console.warn('[FINANZAS] No se pudo refrescar la vista inicial:', e);
    }
}, 0);

// La gráfica usa exactamente la misma salida real que los KPIs.
if (typeof App.logic.renderGraficasFinanzas === 'function' && !App.logic.__graficaFinanzasIntegrada) {
    const renderGraficasOriginal = App.logic.renderGraficasFinanzas;

    App.logic.renderGraficasFinanzas = function (filtro) {
        renderGraficasOriginal.call(this, filtro);
        const resumen = App.logic.obtenerResumenFinancieroCentral(filtro);
        const grafica = window.graficaFinanzasFlujo;

        if (grafica && grafica.data && grafica.data.datasets && grafica.data.datasets[0]) {
            const ingresos = parseFloat(resumen.cobrado || 0) || 0;
            const salidas = parseFloat(resumen.salidasRegistradas || 0) || 0;
            const flujo = ingresos - salidas;
            grafica.data.datasets[0].data = [Math.max(ingresos, 0), Math.max(salidas, 0), Math.max(flujo, 0)];
            grafica.update();
        }
    };

    App.logic.__graficaFinanzasIntegrada = true;
}
