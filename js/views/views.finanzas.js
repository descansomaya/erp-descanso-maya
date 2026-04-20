// ==========================================
// VISTAS: FINANZAS Y GASTOS
// ==========================================

window.App = window.App || {};
App.views = App.views || {};

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
    const ordenesProduccion = App.state.ordenes_produccion || [];
    const pedidoDetalle = App.state.pedido_detalle || [];

    const valorInventario = inventario.reduce((acc, i) => {
        const stock = parseFloat(i.stock_real || 0) || 0;
        const costo = parseFloat(i.costo_unitario || 0) || 0;
        return acc + (stock * costo);
    }, 0);

    const utilidadPedidos = pedidos.reduce((acc, p) => {
        const totalVenta = parseFloat(p.total || 0) || 0;
        const detalles = pedidoDetalle.filter(d => d.pedido_id === p.id);

        let costoMateriales = 0;
        let costoArtesanos = 0;

        detalles.forEach(d => {
            const orden = ordenesProduccion.find(o => o.pedido_detalle_id === d.id);
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

            costoArtesanos += (App.state.ordenes_produccion_artesanos || [])
                .filter(a => a.orden_id === orden.id && String(a.estado || '').toLowerCase() !== 'cancelado')
                .reduce((s, a) => s + (parseFloat(a.pago_estimado || 0) || 0), 0);
        });

        return acc + (totalVenta - costoMateriales - costoArtesanos);
    }, 0);

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

    const ingresosMesPedidos = pedidos
        .filter(p => esMismoMes(p.fecha_creacion))
        .reduce((acc, p) => acc + (parseFloat(p.anticipo || 0) || 0), 0);

    const ingresosMesAbonos = abonos
        .filter(a => esMismoMes(a.fecha))
        .reduce((acc, a) => acc + (parseFloat(a.monto || 0) || 0), 0);

    const ingresosMesReparacionesInicial = reparaciones
        .filter(r => esMismoMes(r.fecha_creacion))
        .reduce((acc, r) => acc + (parseFloat(r.anticipo_inicial || r.anticipo || 0) || 0), 0);

    const ingresosMesAbonosReparacion = abonosReparaciones
        .filter(a => esMismoMes(a.fecha))
        .reduce((acc, a) => acc + (parseFloat(a.monto || 0) || 0), 0);

    const ingresosMes = ingresosMesPedidos + ingresosMesAbonos + ingresosMesReparacionesInicial + ingresosMesAbonosReparacion;

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

        return (parseFloat(i.stock_minimo || 0) || 0) > 0 && libre <= (parseFloat(i.stock_minimo || 0) || 0);
    }).length;

    const cardAction = (onclick) => `
        onclick="${onclick}"
        style="cursor:pointer; transition:all .2s ease;"
        onmouseover="this.style.transform='translateY(-2px)'"
        onmouseout="this.style.transform='translateY(0)'"
    `;

    return `
        <div class="dm-section" style="padding-bottom:90px;">
            <div class="dm-card dm-mb-4" style="background:linear-gradient(135deg, #ffffff 0%, #faf7ff 100%);">
                <div class="dm-row-between" style="align-items:flex-start; gap:16px; flex-wrap:wrap;">
                    <div>
                        <h3 class="dm-card-title">Dashboard Ejecutivo</h3>
                        <p class="dm-muted dm-mt-2" style="max-width:680px;">
                            Consulta operación, cobranza, caja, pagos pendientes, utilidad y alertas clave del negocio.
                        </p>
                    </div>

                    <div class="dm-list-card-actions" style="margin-top:0; display:flex; gap:8px; flex-wrap:wrap;">
                        <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.router.navigate('cobranza')" style="border-color:#D69E2E; color:#B7791F;">Cobranza</button>
                        <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.router.navigate('pedidos')" style="border-color:#3182CE; color:#3182CE;">Pedidos</button>
                        <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.router.navigate('reparaciones')" style="border-color:#805AD5; color:#805AD5;">Reparaciones</button>
                        <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.router.navigate('nomina')" style="border-color:#805AD5; color:#805AD5;">Nómina artesanos</button>
                        <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.formGasto()" style="border-color:var(--dm-danger); color:var(--dm-danger);">＋ Gasto</button>
                    </div>
                </div>
            </div>

            <div class="dm-grid dm-grid-2 dm-mb-4">
                <div class="dm-card" ${cardAction(`App.router.navigate('cobranza')`)} style="background:#FFFBEA; cursor:pointer;">
                    <div class="dm-kpi-label" style="color:#B7791F;">Dinero en la calle</div>
                    <div class="dm-kpi-value" style="color:#D69E2E; font-size:1.5rem;">$${dineroEnLaCalle.toFixed(2)}</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Pedidos + reparaciones pendientes por cobrar</div>
                </div>

                <div class="dm-card" ${cardAction(`App.views.detalleFinanzas('ingresos','mes_actual')`)} style="background:#F0FFF4; cursor:pointer;">
                    <div class="dm-kpi-label" style="color:#2F855A;">Ingresos del mes</div>
                    <div class="dm-kpi-value" style="color:#38A169; font-size:1.5rem;">$${ingresosMes.toFixed(2)}</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Anticipos y abonos registrados en el mes</div>
                </div>
            </div>

            <div class="dm-grid dm-grid-3 dm-mb-4">
                <div class="dm-card">
                    <div class="dm-card-header"><div><div class="dm-card-title">Mini: ingresos vs gastos</div><div class="dm-card-subtitle">Visión rápida del mes</div></div></div>
                    <div style="position:relative; width:100%; height:180px;"><canvas id="miniGraficaIngresosGastos"></canvas></div>
                </div>
                <div class="dm-card">
                    <div class="dm-card-header"><div><div class="dm-card-title">Mini: por cobrar vs por pagar</div><div class="dm-card-subtitle">Presión financiera</div></div></div>
                    <div style="position:relative; width:100%; height:180px;"><canvas id="miniGraficaCobrarPagar"></canvas></div>
                </div>
                <div class="dm-card">
                    <div class="dm-card-header"><div><div class="dm-card-title">Mini: operación activa</div><div class="dm-card-subtitle">Pedidos, reparaciones y listos</div></div></div>
                    <div style="position:relative; width:100%; height:180px;"><canvas id="miniGraficaOperacion"></canvas></div>
                </div>
            </div>

            <div class="dm-grid dm-grid-3 dm-mb-4">
                <div class="dm-card" ${cardAction(`App.router.navigate('inventario')`)}>
                    <div class="dm-kpi-label">Valor inventario</div>
                    <div class="dm-kpi-value">$${valorInventario.toFixed(2)}</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Stock físico valuado a costo actual</div>
                </div>
                <div class="dm-card" ${cardAction(`App.router.navigate('pedidos')`)}>
                    <div class="dm-kpi-label">Utilidad estimada pedidos</div>
                    <div class="dm-kpi-value" style="color:${utilidadPedidos >= 0 ? 'var(--dm-success)' : 'var(--dm-danger)'};">$${utilidadPedidos.toFixed(2)}</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Venta menos materiales y artesanos</div>
                </div>
                <div class="dm-card" ${cardAction(`App.router.navigate('inventario')`)}>
                    <div class="dm-kpi-label">Insumos críticos</div>
                    <div class="dm-kpi-value" style="color:${insumosCriticos > 0 ? 'var(--dm-danger)' : 'var(--dm-success)'};">${insumosCriticos}</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Materiales debajo del mínimo</div>
                </div>
            </div>

            <div class="dm-grid dm-grid-4 dm-mb-4">
                <div class="dm-card" ${cardAction(`App.router.navigate('pedidos')`)}><div class="dm-kpi-label">Pedidos activos</div><div class="dm-kpi-value">${pedidosActivos}</div></div>
                <div class="dm-card" ${cardAction(`App.router.navigate('reparaciones')`)}><div class="dm-kpi-label">Reparaciones activas</div><div class="dm-kpi-value">${reparacionesActivas}</div></div>
                <div class="dm-card" ${cardAction(`App.router.navigate('cobranza')`)}><div class="dm-kpi-label">Listos por entregar</div><div class="dm-kpi-value">${pedidosListos + reparacionesListas}</div></div>
                <div class="dm-card" ${cardAction(`App.views.detalleFinanzas('gastos','mes_actual')`)}><div class="dm-kpi-label">Gastos del mes</div><div class="dm-kpi-value">$${gastosMes.toFixed(2)}</div></div>
            </div>

            <div class="dm-grid dm-grid-3 dm-mb-4">
                <div class="dm-card" style="border-left:4px solid #D69E2E;">
                    <div class="dm-card-title">Cobranza pendiente</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Pedidos: $${porCobrarPedidos.toFixed(2)}</div>
                    <div class="dm-text-sm dm-muted">Reparaciones: $${porCobrarReparaciones.toFixed(2)}</div>
                    <div class="dm-list-card-actions dm-mt-3"><button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.router.navigate('cobranza')">Ir a cobranza</button></div>
                </div>
                <div class="dm-card" style="border-left:4px solid #805AD5;">
                    <div class="dm-card-title">Por pagar</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Artesanos: $${porPagarArtesanos.toFixed(2)}</div>
                    <div class="dm-text-sm dm-muted">Compras: $${porPagarCompras.toFixed(2)}</div>
                    <div class="dm-text-sm dm-mt-2" style="font-weight:600;">Total: $${totalPorPagar.toFixed(2)}</div>
                    <div class="dm-list-card-actions dm-mt-3"><button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.router.navigate('nomina')">Ir a nómina</button></div>
                </div>
                <div class="dm-card" style="border-left:4px solid #E53E3E;">
                    <div class="dm-card-title">Alertas</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Pedidos listos: ${pedidosListos}</div>
                    <div class="dm-text-sm dm-muted">Reparaciones listas: ${reparacionesListas}</div>
                    <div class="dm-text-sm dm-muted">Insumos críticos: ${insumosCriticos}</div>
                    <div class="dm-list-card-actions dm-mt-3" style="flex-wrap:wrap;"><button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.router.navigate('cobranza')">Ver listos</button><button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.router.navigate('inventario')">Ver insumos</button></div>
                </div>
            </div>

            <div class="dm-card dm-mb-4">
                <div class="dm-card-title dm-mb-3">Acciones rápidas</div>
                <div class="dm-list-card-actions" style="flex-wrap:wrap;">
                    <button class="dm-btn dm-btn-primary dm-btn-sm" onclick="App.router.navigate('cobranza')">💰 Cobranza</button>
                    <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.router.navigate('pedidos')">📦 Pedidos</button>
                    <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.router.navigate('reparaciones')">🪡 Reparaciones</button>
                    <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.router.navigate('nomina')">🧵 Nómina</button>
                    <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.formGasto()">➕ Gasto</button>
                    <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.detalleFinanzas('por_cobrar','todo')">📋 Ver por cobrar</button>
                    <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.detalleFinanzas('por_pagar','todo')">📋 Ver por pagar</button>
                </div>
            </div>

            <div class="dm-card dm-mb-4" style="padding:12px;">
                <div class="dm-card-title dm-mb-3">Filtros del panel financiero</div>
                <div class="dm-tabs" style="display:flex; gap:8px; overflow-x:auto; flex-wrap:nowrap; white-space:nowrap;">
                    <button class="dm-tab active pill-fin" onclick="App.views.activarFiltroFinanzas(this, 'mes_actual', false)">Este mes</button>
                    <button class="dm-tab pill-fin" onclick="App.views.activarFiltroFinanzas(this, 'mes_pasado', false)">Mes pasado</button>
                    <button class="dm-tab pill-fin" onclick="App.views.activarFiltroFinanzas(this, 'trimestre_actual', false)">Trimestre</button>
                    <button class="dm-tab pill-fin" onclick="App.views.activarFiltroFinanzas(this, 'anio_actual', false)">Este año</button>
                    <button class="dm-tab pill-fin" onclick="App.views.activarFiltroFinanzas(this, 'todo', false)">Historial</button>
                    <button class="dm-tab pill-fin" onclick="App.views.activarFiltroFinanzas(this, 'custom', true)">Personalizado 📅</button>
                </div>
                <div id="filtro-rango-fechas" class="dm-card dm-mt-3" style="display:none; background:var(--dm-surface-2); border:1px solid var(--dm-border); padding:12px;">
                    <div class="dm-form-row">
                        <div class="dm-form-group"><label class="dm-label">Desde</label><input type="date" id="fecha-desde" class="dm-input"></div>
                        <div class="dm-form-group"><label class="dm-label">Hasta</label><input type="date" id="fecha-hasta" class="dm-input"></div>
                    </div>
                    <button class="dm-btn dm-btn-primary dm-btn-block" onclick="App.logic.renderGraficasFinanzas('custom')">Aplicar rango</button>
                </div>
            </div>

            <div id="finanzas-contenedor"><div class="dm-card"><div class="dm-center dm-muted" style="padding:36px 0;">Cargando finanzas...</div></div></div>
        </div>

        <button class="dm-fab" style="background:var(--dm-danger);" onclick="App.views.formGasto()">+</button>
    `;
};
