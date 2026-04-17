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
        if (App.logic?.renderGraficasFinanzas) {
            App.logic.renderGraficasFinanzas('mes_actual');
        }
    }, 60);

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
                            Consulta operación, cobranza, caja, pagos pendientes y alertas clave del negocio.
                        </p>
                    </div>

                    <div class="dm-list-card-actions" style="margin-top:0; display:flex; gap:8px; flex-wrap:wrap;">
                        <button
                            class="dm-btn dm-btn-secondary dm-btn-sm"
                            onclick="App.router.navigate('cobranza')"
                            style="border-color:#D69E2E; color:#B7791F;"
                        >
                            Cobranza
                        </button>

                        <button
                            class="dm-btn dm-btn-secondary dm-btn-sm"
                            onclick="App.router.navigate('pedidos')"
                            style="border-color:#3182CE; color:#3182CE;"
                        >
                            Pedidos
                        </button>

                        <button
                            class="dm-btn dm-btn-secondary dm-btn-sm"
                            onclick="App.router.navigate('reparaciones')"
                            style="border-color:#805AD5; color:#805AD5;"
                        >
                            Reparaciones
                        </button>

                        <button
                            class="dm-btn dm-btn-secondary dm-btn-sm"
                            onclick="App.router.navigate('nomina')"
                            style="border-color:#805AD5; color:#805AD5;"
                        >
                            Nómina artesanos
                        </button>

                        <button
                            class="dm-btn dm-btn-secondary dm-btn-sm"
                            onclick="App.views.formGasto()"
                            style="border-color:var(--dm-danger); color:var(--dm-danger);"
                        >
                            ＋ Gasto
                        </button>
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

            <div class="dm-grid dm-grid-4 dm-mb-4">
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

            <div class="dm-grid dm-grid-3 dm-mb-4">
                <div class="dm-card" style="border-left:4px solid #D69E2E;">
                    <div class="dm-card-title">Cobranza pendiente</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Pedidos: $${porCobrarPedidos.toFixed(2)}</div>
                    <div class="dm-text-sm dm-muted">Reparaciones: $${porCobrarReparaciones.toFixed(2)}</div>
                    <div class="dm-list-card-actions dm-mt-3">
                        <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.router.navigate('cobranza')">Ir a cobranza</button>
                    </div>
                </div>

                <div class="dm-card" style="border-left:4px solid #805AD5;">
                    <div class="dm-card-title">Por pagar</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Artesanos: $${porPagarArtesanos.toFixed(2)}</div>
                    <div class="dm-text-sm dm-muted">Compras: $${porPagarCompras.toFixed(2)}</div>
                    <div class="dm-text-sm dm-mt-2" style="font-weight:600;">Total: $${totalPorPagar.toFixed(2)}</div>
                    <div class="dm-list-card-actions dm-mt-3">
                        <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.router.navigate('nomina')">Ir a nómina</button>
                    </div>
                </div>

                <div class="dm-card" style="border-left:4px solid #E53E3E;">
                    <div class="dm-card-title">Alertas</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Pedidos listos: ${pedidosListos}</div>
                    <div class="dm-text-sm dm-muted">Reparaciones listas: ${reparacionesListas}</div>
                    <div class="dm-text-sm dm-muted">Insumos críticos: ${insumosCriticos}</div>
                    <div class="dm-list-card-actions dm-mt-3" style="flex-wrap:wrap;">
                        <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.router.navigate('cobranza')">Ver listos</button>
                        <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.router.navigate('catalogos')">Ver insumos</button>
                    </div>
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

                <div
                    id="filtro-rango-fechas"
                    class="dm-card dm-mt-3"
                    style="display:none; background:var(--dm-surface-2); border:1px solid var(--dm-border); padding:12px;"
                >
                    <div class="dm-form-row">
                        <div class="dm-form-group">
                            <label class="dm-label">Desde</label>
                            <input type="date" id="fecha-desde" class="dm-input">
                        </div>

                        <div class="dm-form-group">
                            <label class="dm-label">Hasta</label>
                            <input type="date" id="fecha-hasta" class="dm-input">
                        </div>
                    </div>

                    <button class="dm-btn dm-btn-primary dm-btn-block" onclick="App.logic.renderGraficasFinanzas('custom')">
                        Aplicar rango
                    </button>
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

App.views.activarFiltroFinanzas = function(btn, filtro, mostrarCustom) {
    document.querySelectorAll('.pill-fin').forEach(b => {
        b.classList.remove('active');
        b.classList.remove('dm-tab-active');
    });

    if (btn) btn.classList.add('active');

    const rango = document.getElementById('filtro-rango-fechas');
    if (rango) {
        rango.style.display = mostrarCustom ? 'block' : 'none';
    }

    if (!mostrarCustom && App.logic?.renderGraficasFinanzas) {
        App.logic.renderGraficasFinanzas(filtro);
    }
};

App.views._filtrarPagosArtesanos = function(estado = 'pendiente', query = '', artesanoId = '') {
    const q = String(query || '').trim().toLowerCase();

    return (App.state.pago_artesanos || []).filter(pa => {
        const coincideEstado = estado === 'todos'
            ? true
            : String(pa.estado || '').toLowerCase() === estado.toLowerCase();

        if (!coincideEstado) return false;
        if (artesanoId && pa.artesano_id !== artesanoId) return false;
        if (!q) return true;

        const artesano = (App.state.artesanos || []).find(a => a.id === pa.artesano_id);
        const nombreArtesano = String(artesano?.nombre || '').toLowerCase();
        const orden = String(pa.orden_id || '').toLowerCase();
        const trabajo = String(pa.tipo_trabajo || '').toLowerCase();
        const componente = String(pa.componente || '').toLowerCase();

        return (
            nombreArtesano.includes(q) ||
            orden.includes(q) ||
            trabajo.includes(q) ||
            componente.includes(q)
        );
    });
};

App.views._renderListaPagosArtesanos = function(estado = 'pendiente', query = '', artesanoId = '') {
    const pagos = App.views._filtrarPagosArtesanos(estado, query, artesanoId);

    if (!pagos.length) {
        return `<div class="dm-alert dm-alert-info">No hay pagos en esta vista.</div>`;
    }

    const obtenerOrigenPago = (pa) => {
        const ordenId = pa.orden_id || "";
        if (!ordenId) {
            return { etiqueta: "Sin orden vinculada", detalle: pa.tipo_trabajo || "Trabajo" };
        }

        const orden = (App.state.ordenes_produccion || []).find(o => o.id === ordenId);
        if (!orden) {
            return { etiqueta: ordenId, detalle: pa.tipo_trabajo || "Trabajo" };
        }

        const pedidoDetalle = (App.state.pedido_detalle || []).find(d => d.id === orden.pedido_detalle_id);
        const pedido = pedidoDetalle
            ? (App.state.pedidos || []).find(p => p.id === pedidoDetalle.pedido_id)
            : null;

        const producto = pedidoDetalle
            ? (App.state.productos || []).find(p => p.id === pedidoDetalle.producto_id)
            : null;

        if (producto) {
            return {
                etiqueta: pedido ? String(pedido.id || "") : ordenId,
                detalle: producto.nombre || pa.tipo_trabajo || "Producto"
            };
        }

        const reparacion = (App.state.reparaciones || []).find(r =>
            r.id === ordenId ||
            r.orden_produccion_id === ordenId ||
            r.pedido_detalle_id === orden.pedido_detalle_id
        );

        if (reparacion) {
            return {
                etiqueta: String(reparacion.id || ""),
                detalle: reparacion.descripcion || pa.tipo_trabajo || "Reparación"
            };
        }

        return {
            etiqueta: ordenId,
            detalle: pa.tipo_trabajo || "Trabajo"
        };
    };

    return pagos.map(pa => {
        const artesano = (App.state.artesanos || []).find(a => a.id === pa.artesano_id);
        const nombreArtesano = artesano ? artesano.nombre : 'Artesano';
        const total = parseFloat(pa.total || 0) || 0;
        const montoUnit = parseFloat(pa.monto_unitario || 0) || 0;
        const base = parseFloat(pa.base_calculo || 1) || 1;
        const fecha = pa.fecha ? String(pa.fecha).split('T')[0] : '';
        const estadoPago = String(pa.estado || 'pendiente').toLowerCase();

        const origen = obtenerOrigenPago(pa);

        return `
            <div class="dm-list-card">
                <div class="dm-row-between" style="align-items:flex-start; gap:12px;">
                    <div style="flex:1;">
                        ${estadoPago !== 'pagado'
                            ? `<label style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                                    <input type="checkbox" class="chk-pago-artesano" value="${pa.id}">
                                    <span class="dm-text-sm dm-muted">Seleccionar</span>
                               </label>`
                            : ''
                        }
                        <strong>${App.ui.safe(nombreArtesano)}</strong>
                        <div class="dm-text-sm dm-mt-2" style="color:var(--dm-primary); font-weight:600;">
                            ${App.ui.safe(origen.etiqueta)} · ${App.ui.safe(origen.detalle)}
                        </div>
                        <div class="dm-text-sm dm-muted dm-mt-2">
                            Componente: ${App.ui.safe(pa.componente || 'Total')}<br>
                            Cálculo: $${montoUnit.toFixed(2)} × ${base.toFixed(2)}<br>
                            Fecha: ${App.ui.safe(fecha)}
                        </div>
                    </div>

                    <div style="text-align:right;">
                        <div style="font-weight:bold; color:${estadoPago === 'pagado' ? '#2F855A' : '#805AD5'}; margin-bottom:6px;">
                            $${total.toFixed(2)}
                        </div>
                        <div class="dm-badge ${estadoPago === 'pagado' ? 'dm-badge-success' : 'dm-badge-warning'}">
                            ${App.ui.safe(estadoPago.toUpperCase())}
                        </div>
                        <div class="dm-list-card-actions" style="justify-content:flex-end; margin-top:8px; flex-wrap:wrap;">
                            ${estadoPago !== 'pagado'
                                ? `<button class="dm-btn dm-btn-primary dm-btn-sm" onclick="App.logic.marcarPagoArtesanoPagado('${pa.id}')">✔ Pagado</button>`
                                : ''
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
};

App.views._opcionesArtesanosNomina = function() {
    const artesanos = App.state.artesanos || [];
    return `
        <option value="">Todos los artesanos</option>
        ${artesanos.map(a => `<option value="${a.id}">${App.ui.safe(a.nombre)}</option>`).join('')}
    `;
};

App.views.pagoArtesanos = function() {
    const pendientes = (App.state.pago_artesanos || []).filter(p => String(p.estado || '').toLowerCase() === 'pendiente');
    const pagados = (App.state.pago_artesanos || []).filter(p => String(p.estado || '').toLowerCase() === 'pagado');

    const totalPendiente = pendientes.reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);
    const totalPagado = pagados.reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);

    return `
        <div class="dm-section">
            <div class="dm-grid dm-grid-2 dm-mb-4">
                <div class="dm-card" style="background:#FAF5FF;">
                    <div class="dm-kpi-label" style="color:#6B46C1;">Pendiente por pagar</div>
                    <div class="dm-kpi-value" style="color:#805AD5; font-size:1.4rem;">$${totalPendiente.toFixed(2)}</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">${pendientes.length} pago(s) pendiente(s)</div>
                </div>

                <div class="dm-card" style="background:#F0FFF4;">
                    <div class="dm-kpi-label" style="color:#2F855A;">Pagado acumulado</div>
                    <div class="dm-kpi-value" style="color:#38A169; font-size:1.4rem;">$${totalPagado.toFixed(2)}</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">${pagados.length} pago(s) pagado(s)</div>
                </div>
            </div>

            <div class="dm-card dm-mb-3">
                <div class="dm-form-row">
                    <div class="dm-form-group">
                        <label class="dm-label">Filtrar por artesano</label>
                        <select id="filtro-artesano-nomina" class="dm-select" onchange="App.views.actualizarListaPagoArtesanos()">
                            ${App.views._opcionesArtesanosNomina()}
                        </select>
                    </div>

                    <div class="dm-form-group">
                        <label class="dm-label">Buscar</label>
                        <input
                            type="text"
                            id="bus-pagos-art"
                            class="dm-input"
                            placeholder="Orden, trabajo o componente..."
                            onkeyup="App.views.actualizarListaPagoArtesanos()"
                        >
                    </div>
                </div>

                <div class="dm-tabs" style="display:flex; gap:8px; overflow-x:auto; white-space:nowrap;">
                    <button class="dm-tab active tab-pago-art" onclick="App.views.filtrarVistaPagoArtesanos(this, 'pendiente')">Pendientes</button>
                    <button class="dm-tab tab-pago-art" onclick="App.views.filtrarVistaPagoArtesanos(this, 'pagado')">Pagados</button>
                    <button class="dm-tab tab-pago-art" onclick="App.views.filtrarVistaPagoArtesanos(this, 'todos')">Todos</button>
                </div>
            </div>

            <div class="dm-card dm-mb-3" style="background:var(--dm-surface-2);">
                <div class="dm-row-between" style="align-items:flex-start; gap:12px; flex-wrap:wrap;">
                    <div>
                        <div class="dm-card-title">Acciones masivas</div>
                        <div class="dm-text-sm dm-muted">Puedes pagar e imprimir por artesano o por selección.</div>
                    </div>

                    <div class="dm-list-card-actions" style="margin-top:0; flex-wrap:wrap;">
                        <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.logic.pagarPendientesArtesanoSeleccionado()">💵 Pagar pendientes del artesano</button>
                        <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.logic.imprimirComprobanteArtesanoSeleccionado()">🖨️ Comprobante artesano</button>
                        <button class="dm-btn dm-btn-primary dm-btn-sm" onclick="App.logic.pagarSeleccionNomina()">✔ Pagar selección</button>
                        <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.logic.imprimirSeleccionNomina()">🧾 Imprimir selección</button>
                    </div>
                </div>
            </div>

            <div id="lista-pagos-artesanos" data-estado="pendiente">
                ${App.views._renderListaPagosArtesanos('pendiente', '', '')}
            </div>

            <div class="dm-row-between dm-mt-4">
                <button class="dm-btn dm-btn-secondary" onclick="App.router.navigate('finanzas')">← Volver a Finanzas</button>
                <button class="dm-btn dm-btn-secondary" style="border-color:#38A169; color:#38A169; background:transparent;" onclick="window.exportarAExcel(App.state.pago_artesanos || [], 'Pago_Artesanos')">
                    📥 Exportar
                </button>
            </div>
        </div>
    `;
};

App.views.filtrarVistaPagoArtesanos = function(btn, estado) {
    document.querySelectorAll('.tab-pago-art').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const lista = document.getElementById('lista-pagos-artesanos');
    const busqueda = document.getElementById('bus-pagos-art')?.value || '';
    const artesanoId = document.getElementById('filtro-artesano-nomina')?.value || '';

    if (lista) {
        lista.innerHTML = App.views._renderListaPagosArtesanos(estado, busqueda, artesanoId);
        lista.dataset.estado = estado;
    }
};

App.views.actualizarListaPagoArtesanos = function() {
    const lista = document.getElementById('lista-pagos-artesanos');
    if (!lista) return;

    const estado = lista.dataset.estado || 'pendiente';
    const busqueda = document.getElementById('bus-pagos-art')?.value || '';
    const artesanoId = document.getElementById('filtro-artesano-nomina')?.value || '';

    lista.innerHTML = App.views._renderListaPagosArtesanos(estado, busqueda, artesanoId);
};

App.views.nomina = function() {
    return App.views.pagoArtesanos();
};

App.views.detalleFinanzas = function(tipo, filtro) {
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    let mesPasado = mesActual - 1;
    let anioPasado = anioActual;
    if (mesPasado < 0) {
        mesPasado = 11;
        anioPasado--;
    }

    const triActual = Math.floor(mesActual / 3);

    const filtrarFecha = (str) => {
        if (filtro === 'todo') return true;
        if (!str) return false;

        const f = new Date(str);
        if (isNaN(f.getTime())) return false;

        if (filtro === 'mes_actual') return f.getMonth() === mesActual && f.getFullYear() === anioActual;
        if (filtro === 'mes_pasado') return f.getMonth() === mesPasado && f.getFullYear() === anioPasado;
        if (filtro === 'trimestre_actual') return Math.floor(f.getMonth() / 3) === triActual && f.getFullYear() === anioActual;
        if (filtro === 'anio_actual') return f.getFullYear() === anioActual;

        return true;
    };

    const pedFiltrados = (App.state.pedidos || []).filter(p => filtrarFecha(p.fecha_creacion));
    const aboFiltrados = (App.state.abonos || []).filter(a => filtrarFecha(a.fecha));
    const aboRepFiltrados = (App.state.abonos_reparaciones || []).filter(a => filtrarFecha(a.fecha));
    const gasFiltrados = (App.state.gastos || []).filter(g => filtrarFecha(g.fecha));
    const repFiltradas = (App.state.reparaciones || []).filter(r => filtrarFecha(r.fecha_creacion));

    const getEtiqueta = (clienteId) =>
        clienteId === 'STOCK_INTERNO'
            ? '<span style="color:#D69E2E;">(Bodega)</span>'
            : '<span style="color:#3182CE;">(Pedido)</span>';

    let html = `<div class="dm-list">`;

    if (tipo === 'ventas') {
        if (pedFiltrados.length === 0 && repFiltradas.length === 0) {
            html += `<div class="dm-alert dm-alert-info">No hay ventas ni reparaciones registradas.</div>`;
        }

        pedFiltrados.forEach(p => {
            const fecha = p.fecha_creacion ? String(p.fecha_creacion).split('T')[0] : '';
            html += `
                <div class="dm-list-card">
                    <div class="dm-row-between" style="align-items:flex-start; gap:12px;">
                        <div>
                            <strong>${App.ui.safe((p.id || '').replace('PED-', ''))} ${getEtiqueta(p.cliente_id)}</strong><br>
                            <small class="dm-muted">${fecha}</small>
                        </div>
                        <div style="color:var(--primary); font-weight:bold;">$${parseFloat(p.total || 0).toFixed(2)}</div>
                    </div>
                </div>
            `;
        });

        repFiltradas.forEach(r => {
            const fecha = r.fecha_creacion ? String(r.fecha_creacion).split('T')[0] : '';
            html += `
                <div class="dm-list-card">
                    <div class="dm-row-between" style="align-items:flex-start; gap:12px;">
                        <div>
                            <strong>${App.ui.safe((r.id || '').replace('REP-', ''))} <span style="color:#805AD5;">(Rep)</span></strong><br>
                            <small class="dm-muted">${fecha}</small>
                        </div>
                        <div style="color:var(--primary); font-weight:bold;">$${parseFloat(r.precio || 0).toFixed(2)}</div>
                    </div>
                </div>
            `;
        });
    }

    else if (tipo === 'ingresos') {
        const ants = pedFiltrados.filter(p => parseFloat(p.anticipo || 0) > 0);
        const antsRep = repFiltradas.filter(r => parseFloat(r.anticipo_inicial || r.anticipo || 0) > 0);

        if (ants.length === 0 && aboFiltrados.length === 0 && antsRep.length === 0 && aboRepFiltrados.length === 0) {
            html += `<div class="dm-alert dm-alert-info">No hay ingresos.</div>`;
        }

        ants.forEach(p => {
            const fecha = p.fecha_creacion ? String(p.fecha_creacion).split('T')[0] : '';
            html += `
                <div class="dm-list-card">
                    <div class="dm-row-between">
                        <div>
                            <strong>Anticipo ${App.ui.safe((p.id || '').replace('PED-', ''))} ${getEtiqueta(p.cliente_id)}</strong><br>
                            <small class="dm-muted">${fecha}</small>
                        </div>
                        <div style="color:var(--success); font-weight:bold;">$${parseFloat(p.anticipo || 0).toFixed(2)}</div>
                    </div>
                </div>
            `;
        });

        antsRep.forEach(r => {
            const fecha = r.fecha_creacion ? String(r.fecha_creacion).split('T')[0] : '';
            html += `
                <div class="dm-list-card">
                    <div class="dm-row-between">
                        <div>
                            <strong>Anticipo ${App.ui.safe((r.id || '').replace('REP-', ''))} <span style="color:#805AD5;">(Rep)</span></strong><br>
                            <small class="dm-muted">${fecha}</small>
                        </div>
                        <div style="color:var(--success); font-weight:bold;">$${parseFloat(r.anticipo_inicial || r.anticipo || 0).toFixed(2)}</div>
                    </div>
                </div>
            `;
        });

        aboFiltrados.forEach(a => {
            const fecha = a.fecha ? String(a.fecha).split('T')[0] : '';
            const p = (App.state.pedidos || []).find(x => x.id === a.pedido_id) || {};
            html += `
                <div class="dm-list-card">
                    <div class="dm-row-between">
                        <div>
                            <strong>Abono a ${App.ui.safe((a.pedido_id || '').replace('PED-', ''))} ${getEtiqueta(p.cliente_id)}</strong><br>
                            <small class="dm-muted">${fecha}</small>
                        </div>
                        <div style="color:var(--success); font-weight:bold;">$${parseFloat(a.monto || 0).toFixed(2)}</div>
                    </div>
                </div>
            `;
        });

        aboRepFiltrados.forEach(a => {
            const fecha = a.fecha ? String(a.fecha).split('T')[0] : '';
            html += `
                <div class="dm-list-card">
                    <div class="dm-row-between">
                        <div>
                            <strong>Abono a ${App.ui.safe((a.reparacion_id || '').replace('REP-', ''))} <span style="color:#805AD5;">(Rep)</span></strong><br>
                            <small class="dm-muted">${fecha}</small>
                        </div>
                        <div style="color:var(--success); font-weight:bold;">$${parseFloat(a.monto || 0).toFixed(2)}</div>
                    </div>
                </div>
            `;
        });
    }

    else if (tipo === 'gastos') {
        if (gasFiltrados.length === 0) {
            html += `<div class="dm-alert dm-alert-info">No hay gastos registrados.</div>`;
        }

        gasFiltrados.forEach(g => {
            const fecha = g.fecha ? String(g.fecha).split('T')[0] : '';
            html += `
                <div class="dm-list-card">
                    <div class="dm-row-between" style="align-items:flex-start; gap:12px;">
                        <div style="flex:1;">
                            <strong>${App.ui.escapeHTML(g.descripcion || '')}</strong><br>
                            <small class="dm-muted">${fecha}</small>
                        </div>
                        <div style="text-align:right;">
                            <div style="color:var(--danger); font-weight:bold; margin-bottom:6px;">$${parseFloat(g.monto || 0).toFixed(2)}</div>
                            <div class="dm-list-card-actions" style="margin-top:0; justify-content:flex-end;">
                                <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.ui.closeSheet(); setTimeout(()=>App.views.formGasto('${g.id}'), 300)">✏️</button>
                                <button class="dm-btn dm-btn-danger dm-btn-sm" onclick="App.ui.closeSheet(); App.logic.eliminarRegistroGenerico('gastos', '${g.id}', 'gastos')">🗑️</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    else if (tipo === 'por_cobrar') {
        let hayCobros = false;

        (App.state.pedidos || []).forEach(p => {
            const abonosPedido = (App.state.abonos || [])
                .filter(a => a.pedido_id === p.id)
                .reduce((s, a) => s + parseFloat(a.monto || 0), 0);

            const saldo = parseFloat(p.total || 0) - parseFloat(p.anticipo || 0) - abonosPedido;

            if (saldo > 0) {
                hayCobros = true;
                const fecha = p.fecha_creacion ? String(p.fecha_creacion).split('T')[0] : '';
                html += `
                    <div class="dm-list-card">
                        <div class="dm-row-between">
                            <div>
                                <strong>${App.ui.safe((p.id || '').replace('PED-', ''))} ${getEtiqueta(p.cliente_id)}</strong><br>
                                <small class="dm-muted">${fecha}</small>
                            </div>
                            <div style="color:#D69E2E; font-weight:bold;">$${saldo.toFixed(2)}</div>
                        </div>
                    </div>
                `;
            }
        });

        (App.state.reparaciones || []).forEach(r => {
            const anticipoInicial = parseFloat(r.anticipo_inicial || 0) || 0;
            const abonosRep = (App.state.abonos_reparaciones || [])
                .filter(a => a.reparacion_id === r.id)
                .reduce((s, a) => s + parseFloat(a.monto || 0), 0);

            const saldo = parseFloat(r.precio || 0) - anticipoInicial - abonosRep;

            if (saldo > 0) {
                hayCobros = true;
                const fecha = r.fecha_creacion ? String(r.fecha_creacion).split('T')[0] : '';
                html += `
                    <div class="dm-list-card">
                        <div class="dm-row-between">
                            <div>
                                <strong>${App.ui.safe((r.id || '').replace('REP-', ''))} <span style="color:#805AD5;">(Rep)</span></strong><br>
                                <small class="dm-muted">${fecha}</small>
                            </div>
                            <div style="color:#D69E2E; font-weight:bold;">$${saldo.toFixed(2)}</div>
                        </div>
                    </div>
                `;
            }
        });

        if (!hayCobros) html += `<div class="dm-alert dm-alert-info">No hay saldo pendiente.</div>`;
    }

    else if (tipo === 'por_pagar') {
        let hayDeudas = false;

        (App.state.pago_artesanos || []).forEach(pa => {
            if (String(pa.estado || '').toLowerCase() === 'pendiente') {
                hayDeudas = true;
                const a = (App.state.artesanos || []).find(x => x.id === pa.artesano_id);
                const fecha = pa.fecha ? String(pa.fecha).split('T')[0] : '';
                html += `
                    <div class="dm-list-card">
                        <div class="dm-row-between">
                            <div>
                                <strong>${App.ui.safe(a ? a.nombre : 'Artesano')} (Nómina)</strong><br>
                                <small class="dm-muted">${fecha}</small>
                            </div>
                            <div style="color:#E53E3E; font-weight:bold;">$${parseFloat(pa.total || 0).toFixed(2)}</div>
                        </div>
                    </div>
                `;
            }
        });

        (App.state.compras || []).forEach(c => {
            const pagado = c.monto_pagado !== undefined && c.monto_pagado !== ""
                ? parseFloat(c.monto_pagado)
                : parseFloat(c.total || 0);

            const deuda = parseFloat(c.total || 0) - pagado;

            if (deuda > 0) {
                hayDeudas = true;
                const pv = (App.state.proveedores || []).find(x => x.id === c.proveedor_id);
                const fecha = c.fecha ? String(c.fecha).split('T')[0] : '';
                html += `
                    <div class="dm-list-card">
                        <div class="dm-row-between">
                            <div>
                                <strong>${App.ui.safe(pv ? pv.nombre : 'Proveedor')} (Compra)</strong><br>
                                <small class="dm-muted">${fecha}</small>
                            </div>
                            <div style="color:#E53E3E; font-weight:bold;">$${deuda.toFixed(2)}</div>
                        </div>
                    </div>
                `;
            }
        });

        if (!hayDeudas) html += `<div class="dm-alert dm-alert-info">No hay deudas por pagar. ¡Estás al día!</div>`;
    }

    html += `</div><button class="dm-btn dm-btn-primary dm-btn-block dm-mt-3" onclick="App.ui.closeSheet()">Cerrar</button>`;

    App.ui.openSheet(
        tipo === 'ventas' ? 'Detalle de Ventas'
        : tipo === 'ingresos' ? 'Detalle de Ingresos'
        : tipo === 'gastos' ? 'Detalle de Gastos'
        : tipo === 'por_pagar' ? 'Saldos por Pagar'
        : 'Saldos Históricos',
        html
    );
};

App.views.formGasto = function(id = null) {
    if (typeof id !== 'string') id = null;

    const obj = id ? (App.state.gastos || []).find(g => g.id === id) : null;
    let htmlGastos = '';

    if (obj) {
        htmlGastos = `
            <div class="dm-form-group">
                <label class="dm-label">Descripción del gasto</label>
                <input type="text" class="dm-input" name="descripcion" value="${App.ui.escapeHTML(obj.descripcion || '')}" required>
            </div>
            <div class="dm-form-group">
                <label class="dm-label">Monto ($)</label>
                <input type="number" step="0.01" class="dm-input" name="monto" value="${obj.monto || ''}" required>
            </div>
        `;
    } else {
        htmlGastos = `
            <div id="cont-gastos">
                <div class="dm-form-row fila-dinamica dm-mb-2">
                    <div class="dm-form-group">
                        <input type="text" class="dm-input" name="descripcion[]" placeholder="Descripción" required>
                    </div>
                    <div class="dm-form-group">
                        <input type="number" step="0.01" class="dm-input" name="monto[]" placeholder="$ Monto" required>
                    </div>
                </div>
            </div>
            <button
                type="button"
                class="dm-btn dm-btn-secondary dm-btn-block dm-mb-4"
                style="border:1px dashed var(--dm-danger); color:var(--dm-danger); background:transparent;"
                onclick="window.agregarFilaGasto()"
            >
                + Añadir gasto a la lista
            </button>
        `;
    }

    const formHTML = `
        <form id="dynamic-form">
            <div class="dm-form-group">
                <label class="dm-label">Categoría</label>
                <select class="dm-select" name="categoria" required>
                    <option value="Materiales e Insumos" ${obj && obj.categoria === 'Materiales e Insumos' ? 'selected' : ''}>Materiales (Hilos, Accesorios)</option>
                    <option value="Hamacas (Reventa)" ${obj && obj.categoria === 'Hamacas (Reventa)' ? 'selected' : ''}>Hamacas (Reventa)</option>
                    <option value="Servicios y Otros" ${obj && obj.categoria === 'Servicios y Otros' ? 'selected' : ''}>Servicios</option>
                    <option value="Nómina Artesanos" ${obj && obj.categoria === 'Nómina Artesanos' ? 'selected' : ''}>Nómina</option>
                    <option value="Otros Gastos" ${obj && obj.categoria === 'Otros Gastos' ? 'selected' : ''}>Otro</option>
                </select>
            </div>

            <div class="dm-form-group">
                <label class="dm-label">Fecha</label>
                <input type="date" class="dm-input" name="fecha" value="${obj ? obj.fecha : new Date().toISOString().split('T')[0]}" required>
            </div>

            ${htmlGastos}

            <button type="submit" class="dm-btn dm-btn-primary dm-btn-block" style="background:var(--dm-danger); border-color:var(--dm-danger);">
                ${obj ? 'Guardar Cambios' : 'Registrar Gastos'}
            </button>
        </form>
    `;

    App.ui.openSheet(
        obj ? 'Editar Gasto' : 'Nuevos Gastos',
        formHTML,
        (data) => {
            if (obj) App.logic.actualizarRegistroGenerico('gastos', id, data, 'gastos');
            else App.logic.guardarMultiplesGastos(data);
        }
    );
};
