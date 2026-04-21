// ==========================================
// VISTAS: FINANZAS Y GASTOS
// ==========================================

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
            try {
                receta = JSON.parse(orden.receta_personalizada || '[]');
            } catch (e) {
                receta = [];
            }

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

        return {
            pedido_id: p.id,
            estado: p.estado || '',
            venta,
            costoMateriales,
            costoArtesanos,
            costoTotal,
            utilidad,
            margen
        };
    });

    const totalEntradasEsperadas =
        pedidos.reduce((acc, p) => {
            const totalAbonos = abonos
                .filter(a => a.pedido_id === p.id)
                .reduce((s, a) => s + (parseFloat(a.monto || 0) || 0), 0);
            const saldo = (parseFloat(p.total || 0) || 0) - (parseFloat(p.anticipo || 0) || 0) - totalAbonos;
            return acc + (saldo > 0 ? saldo : 0);
        }, 0) +
        reparaciones.reduce((acc, r) => {
            const anticipo = parseFloat(r.anticipo_inicial || 0) || 0;
            const totalAbonos = abonosRep
                .filter(a => a.reparacion_id === r.id)
                .reduce((s, a) => s + (parseFloat(a.monto || 0) || 0), 0);
            const saldo = (parseFloat(r.precio || 0) || 0) - anticipo - totalAbonos;
            return acc + (saldo > 0 ? saldo : 0);
        }, 0);

    const totalSalidasComprometidas =
        compras.reduce((acc, c) => {
            const total = parseFloat(c.total || 0) || 0;
            const pagado = c.monto_pagado !== undefined && c.monto_pagado !== ''
                ? parseFloat(c.monto_pagado || 0)
                : total;
            const deuda = total - pagado;
            return acc + (deuda > 0 ? deuda : 0);
        }, 0) +
        pagosArtesanos
            .filter(p => String(p.estado || '').toLowerCase() === 'pendiente')
            .reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);

    return {
        totalUtilidad: detallePedidos.reduce((acc, x) => acc + x.utilidad, 0),
        totalVentas: detallePedidos.reduce((acc, x) => acc + x.venta, 0),
        totalCosto: detallePedidos.reduce((acc, x) => acc + x.costoTotal, 0),
        margenPromedio: detallePedidos.length
            ? detallePedidos.reduce((acc, x) => acc + x.margen, 0) / detallePedidos.length
            : 0,
        topRentables: [...detallePedidos].sort((a, b) => b.utilidad - a.utilidad).slice(0, 5),
        topBajoMargen: [...detallePedidos].sort((a, b) => a.margen - b.margen).slice(0, 5),
        entradasEsperadas: totalEntradasEsperadas,
        salidasComprometidas: totalSalidasComprometidas,
        saldoProyectado: totalEntradasEsperadas - totalSalidasComprometidas
    };
};

App.views.finanzas = function() {
    const bottomNav = document.getElementById('bottom-nav');
    const title = document.getElementById('app-header-title');
    const subtitle = document.getElementById('app-header-subtitle');

    if (bottomNav) bottomNav.style.display = 'flex';
    if (title) title.innerText = 'Finanzas';
    if (subtitle) subtitle.innerText = 'Dashboard ejecutivo y flujo de caja';

    setTimeout(() => {
        if (App.logic?.renderMiniGraficasDashboard) {
            App.logic.renderMiniGraficasDashboard();
        }
        if (App.logic?.renderGraficasFinanzas) {
            App.logic.renderGraficasFinanzas('mes_actual');
        }
    }, 80);

    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    const esMismoMes = (fechaStr) => {
        if (!fechaStr) return false;
        const f = new Date(fechaStr);
        return !isNaN(f.getTime()) && f.getMonth() === mesActual && f.getFullYear() === anioActual;
    };

    const pedidos = App.state.pedidos || [];
    const reparaciones = App.state.reparaciones || [];
    const abonos = App.state.abonos || [];
    const abonosReparaciones = App.state.abonos_reparaciones || [];
    const gastos = App.state.gastos || [];
    const pagosArtesanos = App.state.pago_artesanos || [];
    const compras = App.state.compras || [];
    const inventario = App.state.inventario || [];
    const cotizaciones = App.state.cotizaciones || [];

    const valorInventario = inventario.reduce((acc, i) => {
        const stock = parseFloat(i.stock_real || 0) || 0;
        const costo = parseFloat(i.costo_unitario || 0) || 0;
        return acc + (stock * costo);
    }, 0);

    const costeo = App.views._resumenCosteoPlaneacion();

    const pedidosActivos = pedidos.filter(p => {
        const e = String(p.estado || '').toLowerCase();
        return e !== 'entregado' && e !== 'pagado';
    }).length;

    const reparacionesActivas = reparaciones.filter(r => {
        const e = String(r.estado || '').toLowerCase();
        return e !== 'entregada';
    }).length;

    const pedidosListos = pedidos.filter(p => String(p.estado || '').toLowerCase() === 'listo para entregar').length;
    const reparacionesListas = reparaciones.filter(r => String(r.estado || '').toLowerCase() === 'lista').length;
    const cotPendientes = cotizaciones.filter(c => String(c.estado_conversion || '').toLowerCase() !== 'convertida').length;
    const cotConvertidas = cotizaciones.filter(c => String(c.estado_conversion || '').toLowerCase() === 'convertida').length;
    const cotMonto = cotizaciones.reduce((acc, c) => acc + (parseFloat(c.total || 0) || 0), 0);

    const porCobrarPedidos = pedidos.reduce((acc, p) => {
        const totalAbonos = abonos
            .filter(a => a.pedido_id === p.id)
            .reduce((s, a) => s + (parseFloat(a.monto || 0) || 0), 0);

        const saldo = (parseFloat(p.total || 0) || 0) - (parseFloat(p.anticipo || 0) || 0) - totalAbonos;
        return acc + (saldo > 0 ? saldo : 0);
    }, 0);

    const porCobrarReparaciones = reparaciones.reduce((acc, r) => {
        const anticipoInicial = parseFloat(r.anticipo_inicial || 0) || 0;
        const totalAbonosRep = abonosReparaciones
            .filter(a => a.reparacion_id === r.id)
            .reduce((s, a) => s + (parseFloat(a.monto || 0) || 0), 0);

        const saldo = (parseFloat(r.precio || 0) || 0) - anticipoInicial - totalAbonosRep;
        return acc + (saldo > 0 ? saldo : 0);
    }, 0);

    const dineroEnLaCalle = porCobrarPedidos + porCobrarReparaciones;

    const ingresosMes =
        pedidos.filter(p => esMismoMes(p.fecha_creacion)).reduce((acc, p) => acc + (parseFloat(p.anticipo || 0) || 0), 0) +
        abonos.filter(a => esMismoMes(a.fecha)).reduce((acc, a) => acc + (parseFloat(a.monto || 0) || 0), 0) +
        reparaciones.filter(r => esMismoMes(r.fecha_creacion)).reduce((acc, r) => acc + (parseFloat(r.anticipo_inicial || r.anticipo || 0) || 0), 0) +
        abonosReparaciones.filter(a => esMismoMes(a.fecha)).reduce((acc, a) => acc + (parseFloat(a.monto || 0) || 0), 0);

    const gastosMes = gastos
        .filter(g => esMismoMes(g.fecha))
        .reduce((acc, g) => acc + (parseFloat(g.monto || 0) || 0), 0);

    const porPagarArtesanos = pagosArtesanos
        .filter(p => String(p.estado || '').toLowerCase() === 'pendiente')
        .reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);

    const porPagarCompras = compras.reduce((acc, c) => {
        const total = parseFloat(c.total || 0) || 0;
        const pagado = c.monto_pagado !== undefined && c.monto_pagado !== ''
            ? parseFloat(c.monto_pagado || 0)
            : total;
        const deuda = total - pagado;
        return acc + (deuda > 0 ? deuda : 0);
    }, 0);

    const totalPorPagar = porPagarArtesanos + porPagarCompras;

    const insumosCriticos = inventario.filter(i => {
        const libre =
            (parseFloat(i.stock_real || 0) || 0) -
            (parseFloat(i.stock_reservado || 0) || 0) -
            (parseFloat(i.stock_comprometido || 0) || 0);

        return (parseFloat(i.stock_minimo || 0) || 0) > 0 &&
            libre <= (parseFloat(i.stock_minimo || 0) || 0);
    }).length;

    const topRentablesHTML = costeo.topRentables.length
        ? costeo.topRentables.map(x => `
            <div class="dm-row-between dm-mb-2" style="gap:12px; align-items:flex-start;">
                <div style="flex:1; min-width:0;">
                    <strong>${App.ui.safe((x.pedido_id || '').replace('PED-', ''))}</strong><br>
                    <small class="dm-muted">Venta: ${App.ui.money(x.venta)} · Costo: ${App.ui.money(x.costoTotal)}</small>
                </div>
                <div style="text-align:right;">
                    <strong style="color:var(--dm-success);">${App.ui.money(x.utilidad)}</strong><br>
                    <small class="dm-muted">${App.ui.number(x.margen, 1)}%</small>
                </div>
            </div>
        `).join('')
        : `<div class="dm-alert dm-alert-info">Sin pedidos suficientes.</div>`;

    const topBajoMargenHTML = costeo.topBajoMargen.length
        ? costeo.topBajoMargen.map(x => `
            <div class="dm-row-between dm-mb-2" style="gap:12px; align-items:flex-start;">
                <div style="flex:1; min-width:0;">
                    <strong>${App.ui.safe((x.pedido_id || '').replace('PED-', ''))}</strong><br>
                    <small class="dm-muted">Venta: ${App.ui.money(x.venta)} · Costo: ${App.ui.money(x.costoTotal)}</small>
                </div>
                <div style="text-align:right;">
                    <strong style="color:${x.utilidad >= 0 ? 'var(--dm-warning)' : 'var(--dm-danger)'};">${App.ui.money(x.utilidad)}</strong><br>
                    <small class="dm-muted">${App.ui.number(x.margen, 1)}%</small>
                </div>
            </div>
        `).join('')
        : `<div class="dm-alert dm-alert-info">Sin pedidos suficientes.</div>`;

    const cardAction = (onclick) => `
        onclick="${onclick}"
        style="cursor:pointer; transition:all .2s ease;"
        onmouseover="this.style.transform='translateY(-2px)'"
        onmouseout="this.style.transform='translateY(0)'"
    `;

    return `
        <div class="dm-section" style="padding-bottom:90px;">
            <div class="dm-card dm-mb-4" style="background:linear-gradient(135deg, #ffffff 0%, #faf7ff 100%);">
                <div style="display:flex; flex-direction:column; gap:14px;">
                    <div>
                        <h3 class="dm-card-title">Dashboard Ejecutivo</h3>
                        <p class="dm-muted dm-mt-2" style="max-width:680px;">
                            Consulta operación, cobranza, caja, pagos pendientes, margen real, desempeño comercial y planeación financiera.
                        </p>
                    </div>

                    <div class="dm-list-card-actions" style="margin-top:0; display:flex; gap:8px; flex-wrap:wrap;">
                        <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.router.navigate('cobranza')" style="border-color:#D69E2E; color:#B7791F;">Cobranza</button>
                        <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.router.navigate('pedidos')" style="border-color:#3182CE; color:#3182CE;">Pedidos</button>
                        <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.router.navigate('inventario')" style="border-color:#2F855A; color:#2F855A;">Inventario</button>
                        <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.router.navigate('cotizaciones')" style="border-color:#6D28D9; color:#6D28D9;">Cotizaciones</button>
                        <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.router.navigate('nomina')" style="border-color:#805AD5; color:#805AD5;">Nómina</button>
                        <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.formGasto()" style="border-color:var(--dm-danger); color:var(--dm-danger);">＋ Gasto</button>
                    </div>
                </div>
            </div>

            <div class="dm-mb-4" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px,1fr)); gap:12px;">
                <div class="dm-card" ${cardAction(`App.router.navigate('cobranza')`)} style="background:#FFFBEA;">
                    <div class="dm-kpi-label" style="color:#B7791F;">Dinero en la calle</div>
                    <div class="dm-kpi-value" style="color:#D69E2E; font-size:1.45rem;">$${dineroEnLaCalle.toFixed(2)}</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Pedidos + reparaciones pendientes por cobrar</div>
                </div>

                <div class="dm-card" ${cardAction(`App.views.detalleFinanzas('ingresos','mes_actual')`)} style="background:#F0FFF4;">
                    <div class="dm-kpi-label" style="color:#2F855A;">Ingresos del mes</div>
                    <div class="dm-kpi-value" style="color:#38A169; font-size:1.45rem;">$${ingresosMes.toFixed(2)}</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Anticipos y abonos registrados en el mes</div>
                </div>
            </div>

            <div class="dm-mb-4" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px,1fr)); gap:12px;">
                <div class="dm-card" ${cardAction(`App.router.navigate('inventario')`)}>
                    <div class="dm-kpi-label">Valor inventario</div>
                    <div class="dm-kpi-value">$${valorInventario.toFixed(2)}</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Stock físico valuado a costo promedio actual</div>
                </div>

                <div class="dm-card" ${cardAction(`App.router.navigate('pedidos')`)}>
                    <div class="dm-kpi-label">Utilidad total estimada</div>
                    <div class="dm-kpi-value" style="color:${costeo.totalUtilidad >= 0 ? 'var(--dm-success)' : 'var(--dm-danger)'};">
                        $${costeo.totalUtilidad.toFixed(2)}
                    </div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Venta menos costo de materiales y artesanos</div>
                </div>

                <div class="dm-card">
                    <div class="dm-kpi-label">Costo total estimado</div>
                    <div class="dm-kpi-value">$${costeo.totalCosto.toFixed(2)}</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Costo operativo de pedidos</div>
                </div>

                <div class="dm-card">
                    <div class="dm-kpi-label">Margen promedio</div>
                    <div class="dm-kpi-value" style="color:${costeo.margenPromedio >= 0 ? 'var(--dm-success)' : 'var(--dm-danger)'};">
                        ${costeo.margenPromedio.toFixed(1)}%
                    </div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Margen promedio por pedido</div>
                </div>
            </div>

            <div class="dm-mb-4" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px,1fr)); gap:12px;">
                <div class="dm-card" style="background:#FAF5FF;">
                    <div class="dm-kpi-label" style="color:#6D28D9;">Cotizaciones</div>
                    <div class="dm-kpi-value" style="color:#6D28D9;">${cotizaciones.length}</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Total registradas</div>
                </div>
                <div class="dm-card" style="background:#FFFBEA;">
                    <div class="dm-kpi-label" style="color:#B7791F;">Pendientes</div>
                    <div class="dm-kpi-value" style="color:#B7791F;">${cotPendientes}</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Por seguimiento o cierre</div>
                </div>
                <div class="dm-card" style="background:#F0FFF4;">
                    <div class="dm-kpi-label" style="color:#2F855A;">Convertidas</div>
                    <div class="dm-kpi-value" style="color:#38A169;">${cotConvertidas}</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Ya convertidas a operación</div>
                </div>
                <div class="dm-card">
                    <div class="dm-kpi-label">Monto cotizado</div>
                    <div class="dm-kpi-value">$${cotMonto.toFixed(2)}</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Potencial comercial total</div>
                </div>
            </div>

            <div class="dm-mb-4" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px,1fr)); gap:12px;">
                <div class="dm-card">
                    <div class="dm-card-title">📊 Vista rápida</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Indicadores visuales resumidos del negocio.</div>
                    <div id="mini-graficas-dashboard" class="dm-mt-3" style="min-height:220px;"></div>
                </div>
                <div class="dm-card">
                    <div class="dm-card-title">📈 Tendencias financieras</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Comportamiento de ingresos, gastos y flujo.</div>
                    <div id="finanzas-graficas-principales" class="dm-mt-3" style="min-height:220px;"></div>
                </div>
            </div>

            <div class="dm-mb-4" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px,1fr)); gap:12px;">
                <div class="dm-card">
                    <div class="dm-card-title">Top pedidos rentables</div>
                    <div class="dm-mt-3">${topRentablesHTML}</div>
                </div>

                <div class="dm-card">
                    <div class="dm-card-title">Top bajo margen</div>
                    <div class="dm-mt-3">${topBajoMargenHTML}</div>
                </div>

                <div class="dm-card" style="border-left:4px solid #E53E3E;">
                    <div class="dm-card-title">Alertas</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Pedidos listos: ${pedidosListos}</div>
                    <div class="dm-text-sm dm-muted">Reparaciones listas: ${reparacionesListas}</div>
                    <div class="dm-text-sm dm-muted">Insumos críticos: ${insumosCriticos}</div>
                    <div class="dm-text-sm dm-muted">Por pagar: $${totalPorPagar.toFixed(2)}</div>
                </div>
            </div>

            <div class="dm-mb-4" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px,1fr)); gap:12px;">
                <div class="dm-card" style="background:#F0FFF4;">
                    <div class="dm-kpi-label" style="color:#2F855A;">Entradas esperadas</div>
                    <div class="dm-kpi-value" style="color:#38A169;">$${costeo.entradasEsperadas.toFixed(2)}</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Cobranza pendiente estimada</div>
                </div>

                <div class="dm-card" style="background:#FFF5F5;">
                    <div class="dm-kpi-label" style="color:#C53030;">Salidas comprometidas</div>
                    <div class="dm-kpi-value" style="color:#E53E3E;">$${costeo.salidasComprometidas.toFixed(2)}</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Compras + nómina pendientes</div>
                </div>

                <div class="dm-card" style="background:${costeo.saldoProyectado >= 0 ? '#F0FFF4' : '#FFF5F5'};">
                    <div class="dm-kpi-label" style="color:${costeo.saldoProyectado >= 0 ? '#2F855A' : '#C53030'};">Saldo proyectado</div>
                    <div class="dm-kpi-value" style="color:${costeo.saldoProyectado >= 0 ? '#38A169' : '#E53E3E'};">
                        $${costeo.saldoProyectado.toFixed(2)}
                    </div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Entradas esperadas menos salidas comprometidas</div>
                </div>
            </div>

            <div class="dm-mb-4" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px,1fr)); gap:12px;">
                <div class="dm-card" ${cardAction(`App.router.navigate('pedidos')`)}>
                    <div class="dm-kpi-label">Pedidos activos</div>
                    <div class="dm-kpi-value">${pedidosActivos}</div>
                </div>

                <div class="dm-card" ${cardAction(`App.router.navigate('reparaciones')`)}>
                    <div class="dm-kpi-label">Reparaciones activas</div>
                    <div class="dm-kpi-value">${reparacionesActivas}</div>
                </div>

                <div class="dm-card" ${cardAction(`App.router.navigate('cobranza')`)}>
                    <div class="dm-kpi-label">Listos por entregar</div>
                    <div class="dm-kpi-value">${pedidosListos + reparacionesListas}</div>
                </div>

                <div class="dm-card" ${cardAction(`App.views.detalleFinanzas('gastos','mes_actual')`)}>
                    <div class="dm-kpi-label">Gastos del mes</div>
                    <div class="dm-kpi-value">$${gastosMes.toFixed(2)}</div>
                </div>
            </div>

            <div id="finanzas-contenedor">
                <div class="dm-card">
                    <div class="dm-center dm-muted" style="padding:36px 0;">
                        Cargando finanzas...
                    </div>
                </div>
            </div>
        </div>

        <button class="dm-fab" style="background:var(--dm-danger);" onclick="App.views.formGasto()">+</button>
    `;
};