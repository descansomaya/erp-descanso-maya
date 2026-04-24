window.App = window.App || {};
App.views = App.views || {};
App.state = App.state || {};

App.views.detalleFinanzas = function(tipo, filtro) {
    const cont = document.getElementById('finanzas-contenedor');
    if (!cont) return;

    const money = (n) => '$' + ((parseFloat(n || 0) || 0).toFixed(2));

    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    const entraEnFiltro = (fechaStr) => {
        if (!fechaStr) return filtro === 'todo';

        const f = new Date(fechaStr);
        if (isNaN(f.getTime())) return false;

        if (filtro === 'todo') return true;

        if (filtro === 'custom') {
            const desde = App.state.finanzasFechaDesde || '';
            const hasta = App.state.finanzasFechaHasta || '';
            if (!desde || !hasta) return true;

            const d1 = new Date(desde + 'T00:00:00');
            const d2 = new Date(hasta + 'T23:59:59');
            return f >= d1 && f <= d2;
        }

        if (filtro === 'mes_actual') {
            return f.getMonth() === mesActual && f.getFullYear() === anioActual;
        }

        if (filtro === 'trimestre_actual') {
            const trimHoy = Math.floor(mesActual / 3);
            const trimFecha = Math.floor(f.getMonth() / 3);
            return f.getFullYear() === anioActual && trimFecha === trimHoy;
        }

        if (filtro === 'anio_actual') {
            return f.getFullYear() === anioActual;
        }

        return true;
    };

    const renderTabla = (headers, rows) => {
        if (!rows.length) {
            return `<div class="dm-alert dm-alert-info">No hay registros para este filtro.</div>`;
        }

        return `
            <div style="overflow:auto;">
                <table class="dm-table" style="width:100%; min-width:760px;">
                    <thead>
                        <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                    </thead>
                    <tbody>
                        ${rows.join('')}
                    </tbody>
                </table>
            </div>
        `;
    };

    let titulo = 'Detalle financiero';
    let resumen = '';
    let tabla = '';

    if (tipo === 'ventas') {
        titulo = 'Ventas totales';

        const pedidos = (App.state.pedidos || []).filter(p => entraEnFiltro(p.fecha_creacion));
        const total = pedidos.reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);

        resumen = `
            <div class="dm-mb-3" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
                <div class="dm-card" style="background:var(--dm-surface-2);">
                    <div class="dm-kpi-label">Registros</div>
                    <div class="dm-kpi-value">${pedidos.length}</div>
                </div>
                <div class="dm-card" style="background:var(--dm-surface-2);">
                    <div class="dm-kpi-label">Total ventas</div>
                    <div class="dm-kpi-value">${money(total)}</div>
                </div>
            </div>
        `;

        const rows = pedidos.map(p => {
            const cliente = (App.state.clientes || []).find(c => c.id === p.cliente_id);
            const fecha = String(p.fecha_creacion || p.fecha || '').split('T')[0];

            return `
                <tr>
                    <td>${App.ui.safe(p.id || '')}</td>
                    <td>${App.ui.safe(fecha)}</td>
                    <td>${App.ui.safe(cliente?.nombre || p.cliente_nombre || p.cliente_id || '')}</td>
                    <td>${App.ui.safe(p.estado || '')}</td>
                    <td style="text-align:right;">${money(p.total || 0)}</td>
                </tr>
            `;
        });

        tabla = renderTabla(['Pedido', 'Fecha', 'Cliente', 'Estado', 'Total'], rows);
    }

    if (tipo === 'gastos') {
        titulo = 'Gastos';

        const gastos = (App.state.gastos || []).filter(g => entraEnFiltro(g.fecha));
        const total = gastos.reduce((acc, g) => acc + (parseFloat(g.monto || 0) || 0), 0);

        resumen = `
            <div class="dm-mb-3" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
                <div class="dm-card" style="background:var(--dm-surface-2);">
                    <div class="dm-kpi-label">Registros</div>
                    <div class="dm-kpi-value">${gastos.length}</div>
                </div>
                <div class="dm-card" style="background:var(--dm-surface-2);">
                    <div class="dm-kpi-label">Total gastos</div>
                    <div class="dm-kpi-value">${money(total)}</div>
                </div>
            </div>
        `;

        const rows = gastos.map(g => {
            const fecha = String(g.fecha || '').split('T')[0];

            return `
                <tr>
                    <td>${App.ui.safe(g.id || '')}</td>
                    <td>${App.ui.safe(fecha)}</td>
                    <td>${App.ui.safe(g.categoria || g.tipo || '')}</td>
                    <td>${App.ui.safe(g.descripcion || g.concepto || '')}</td>
                    <td style="text-align:right;">${money(g.monto || 0)}</td>
                </tr>
            `;
        });

        tabla = renderTabla(['ID', 'Fecha', 'Categoría', 'Concepto', 'Monto'], rows);
    }

    cont.innerHTML = `
        <div class="dm-card dm-mb-4">
            <div class="dm-row-between" style="gap:12px;align-items:flex-start;flex-wrap:wrap;">
                <div>
                    <div class="dm-card-title">${titulo}</div>
                    <div class="dm-muted dm-mt-2">Filtro aplicado: ${App.ui.safe(filtro || 'actual')}</div>
                </div>
                <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="document.getElementById('finanzas-contenedor').innerHTML=''">Cerrar</button>
            </div>

            <div class="dm-mt-3">
                ${resumen}
                ${tabla}
            </div>
        </div>
    `;
};

App.views.aplicarFiltroFinanzas = function(filtro) {
    App.state.finanzasFiltro = filtro || 'mes_actual';
    App.router.handleRoute();
};

App.views.aplicarFiltroFinanzasCustom = function() {
    const desde = document.getElementById('finanzas-fecha-desde')?.value || '';
    const hasta = document.getElementById('finanzas-fecha-hasta')?.value || '';
    App.state.finanzasFechaDesde = desde;
    App.state.finanzasFechaHasta = hasta;
    App.state.finanzasFiltro = 'custom';
    App.router.handleRoute();
};

App.views.finanzas = function () {
    const title = document.getElementById('app-header-title');
    const subtitle = document.getElementById('app-header-subtitle');
    const bottomNav = document.getElementById('bottom-nav');

    if (title) title.innerText = 'Finanzas';
    if (subtitle) subtitle.innerText = 'Flujo de efectivo, KPIs y BI Dashboard PRO';
    if (bottomNav) bottomNav.style.display = 'flex';

    const filtro = App.state.finanzasFiltro || 'mes_actual';
    const fechaDesde = App.state.finanzasFechaDesde || '';
    const fechaHasta = App.state.finanzasFechaHasta || '';

    const pedidos = App.state.pedidos || [];
    const reparaciones = App.state.reparaciones || [];
    const gastos = App.state.gastos || [];
    const abonos = App.state.abonos || [];
    const abonosReparaciones = App.state.abonos_reparaciones || [];
    const compras = App.state.compras || [];
    const pagosArtesanos = App.state.pago_artesanos || [];
    const cotizaciones = App.state.cotizaciones || [];

    const money = (n) => '$' + ((parseFloat(n || 0) || 0).toFixed(2));

    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    const entraEnFiltro = (fechaStr) => {
        if (!fechaStr) return filtro === 'todo';
        const f = new Date(fechaStr);
        if (isNaN(f.getTime())) return false;

        if (filtro === 'todo') return true;

        if (filtro === 'custom') {
            if (!fechaDesde || !fechaHasta) return true;
            const d1 = new Date(fechaDesde + 'T00:00:00');
            const d2 = new Date(fechaHasta + 'T23:59:59');
            return f >= d1 && f <= d2;
        }

        if (filtro === 'mes_actual') {
            return f.getMonth() === mesActual && f.getFullYear() === anioActual;
        }

        if (filtro === 'trimestre_actual') {
            const trimHoy = Math.floor(mesActual / 3);
            const trimFecha = Math.floor(f.getMonth() / 3);
            return f.getFullYear() === anioActual && trimFecha === trimHoy;
        }

        if (filtro === 'anio_actual') {
            return f.getFullYear() === anioActual;
        }

        return true;
    };

    const pedidosFil = pedidos.filter(p => entraEnFiltro(p.fecha_creacion));
    const reparacionesFil = reparaciones.filter(r => entraEnFiltro(r.fecha_creacion));
    const gastosFil = gastos.filter(g => entraEnFiltro(g.fecha));
    const abonosFil = abonos.filter(a => entraEnFiltro(a.fecha));
    const abonosRepFil = abonosReparaciones.filter(a => entraEnFiltro(a.fecha));
    const comprasFil = compras.filter(c => entraEnFiltro(c.fecha || c.fecha_creacion));
    const pagosArtesanosFil = pagosArtesanos.filter(p => entraEnFiltro(p.fecha_pago || p.fecha || p.fecha_creacion));
    const cotizacionesFil = cotizaciones.filter(c => entraEnFiltro(c.fecha || c.fecha_creacion));

    const totalVentas = pedidosFil.reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);
    const totalGastos = gastosFil.reduce((acc, g) => acc + (parseFloat(g.monto || 0) || 0), 0);
    const totalCobradoPedidos = abonosFil.reduce((acc, a) => acc + (parseFloat(a.monto || 0) || 0), 0) + pedidosFil.reduce((acc, p) => acc + (parseFloat(p.anticipo || 0) || 0), 0);
    const totalCobradoReparaciones = abonosRepFil.reduce((acc, a) => acc + (parseFloat(a.monto || 0) || 0), 0) + reparacionesFil.reduce((acc, r) => acc + (parseFloat(r.anticipo_inicial || r.anticipo || 0) || 0), 0);
    const totalCobrado = totalCobradoPedidos + totalCobradoReparaciones;
    const totalCompras = comprasFil.reduce((acc, c) => acc + (parseFloat(c.total || 0) || 0), 0);
    const totalNomina = pagosArtesanosFil.reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);
    const totalCotizado = cotizacionesFil.reduce((acc, c) => acc + (parseFloat(c.total || 0) || 0), 0);

    const porCobrarPedidos = pedidosFil.reduce((acc, p) => {
        const abonosPedido = abonos.filter(a => a.pedido_id === p.id).reduce((s, a) => s + (parseFloat(a.monto || 0) || 0), 0);
        const saldo = (parseFloat(p.total || 0) || 0) - (parseFloat(p.anticipo || 0) || 0) - abonosPedido;
        return acc + (saldo > 0 ? saldo : 0);
    }, 0);

    const porCobrarReparaciones = reparacionesFil.reduce((acc, r) => {
        const anticipo = parseFloat(r.anticipo_inicial || 0) || 0;
        const abonosRep = abonosReparaciones.filter(a => a.reparacion_id === r.id).reduce((s, a) => s + (parseFloat(a.monto || 0) || 0), 0);
        const saldo = (parseFloat(r.precio || 0) || 0) - anticipo - abonosRep;
        return acc + (saldo > 0 ? saldo : 0);
    }, 0);

    const dineroEnLaCalle = porCobrarPedidos + porCobrarReparaciones;

    const porPagarCompras = comprasFil.reduce((acc, c) => {
        const total = parseFloat(c.total || 0) || 0;
        const pagado = c.monto_pagado !== undefined && c.monto_pagado !== '' ? parseFloat(c.monto_pagado || 0) : total;
        const deuda = total - pagado;
        return acc + (deuda > 0 ? deuda : 0);
    }, 0);

    const porPagarNomina = pagosArtesanos
        .filter(p => String(p.estado || '').toLowerCase() === 'pendiente')
        .reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);

    const totalPorPagar = porPagarCompras + porPagarNomina;
    const utilidad = totalCobrado - totalGastos;
    const flujoOperativo = totalCobrado - totalGastos - totalCompras - totalNomina;
    const saldoProyectado = dineroEnLaCalle - totalPorPagar;
    const salud = flujoOperativo >= 0 && saldoProyectado >= 0 ? 'Sana' : (flujoOperativo < 0 && saldoProyectado < 0 ? 'Crítica' : 'En observación');
    const saludColor = salud === 'Sana' ? 'green' : (salud === 'Crítica' ? 'red' : '#B7791F');

    const pedidosPendientes = pedidosFil.filter(p => !['pagado', 'entregado'].includes(String(p.estado || '').toLowerCase())).length;
    const reparacionesPendientes = reparacionesFil.filter(r => !['entregada'].includes(String(r.estado || '').toLowerCase())).length;
    const cotPendientes = cotizacionesFil.filter(c => String(c.estado_conversion || '').toLowerCase() !== 'convertida').length;
    const registrosGastos = gastosFil.length;

    setTimeout(() => {
        if (App.logic && App.logic.renderMiniGraficasDashboard) App.logic.renderMiniGraficasDashboard();
        if (App.logic && App.logic.renderGraficasFinanzas) App.logic.renderGraficasFinanzas(filtro);
    }, 120);

    const active = (x) => App.state.finanzasFiltro === x ? 'dm-btn-primary' : 'dm-btn-secondary';

    return `
        <div class="dm-section" style="padding-bottom:90px;">

            <div class="dm-card dm-mb-4" style="background:linear-gradient(135deg, #ffffff 0%, #faf7ff 100%);">
                <h3 class="dm-card-title">Finanzas Híbrido PRO</h3>
                <p class="dm-muted dm-mt-2">Combina visibilidad financiera operativa con dashboard BI y gráficas reales.</p>
            </div>

            <div class="dm-card dm-mb-4">
                <div class="dm-card-title">Filtros de fecha PRO</div>
                <div class="dm-mt-3" style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="dm-btn ${active('mes_actual')}" onclick="App.views.aplicarFiltroFinanzas('mes_actual')">Mes actual</button>
                    <button class="dm-btn ${active('trimestre_actual')}" onclick="App.views.aplicarFiltroFinanzas('trimestre_actual')">Trimestre</button>
                    <button class="dm-btn ${active('anio_actual')}" onclick="App.views.aplicarFiltroFinanzas('anio_actual')">Año</button>
                    <button class="dm-btn ${active('todo')}" onclick="App.views.aplicarFiltroFinanzas('todo')">Todo</button>
                </div>
                <div class="dm-mt-3" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px; align-items:end;">
                    <div class="dm-form-group">
                        <label class="dm-label">Desde</label>
                        <input type="date" id="finanzas-fecha-desde" class="dm-input" value="${fechaDesde}">
                    </div>
                    <div class="dm-form-group">
                        <label class="dm-label">Hasta</label>
                        <input type="date" id="finanzas-fecha-hasta" class="dm-input" value="${fechaHasta}">
                    </div>
                    <div>
                        <button class="dm-btn dm-btn-primary" onclick="App.views.aplicarFiltroFinanzasCustom()">Aplicar rango</button>
                    </div>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;" class="dm-mb-4">
                <div class="dm-card">
                    <div class="dm-kpi-label">Cobrado total</div>
                    <div class="dm-kpi-value">${money(totalCobrado)}</div>
                </div>
                <div class="dm-card">
                    <div class="dm-kpi-label">Dinero en la calle</div>
                    <div class="dm-kpi-value">${money(dineroEnLaCalle)}</div>
                </div>
                <div class="dm-card">
                    <div class="dm-kpi-label">Total por pagar</div>
                    <div class="dm-kpi-value">${money(totalPorPagar)}</div>
                </div>
                <div class="dm-card">
                    <div class="dm-kpi-label">Saldo proyectado</div>
                    <div class="dm-kpi-value" style="color:${saldoProyectado >= 0 ? 'green' : 'red'}">${money(saldoProyectado)}</div>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;" class="dm-mb-4">
                <div class="dm-card">
                    <div class="dm-kpi-label">Flujo operativo</div>
                    <div class="dm-kpi-value" style="color:${flujoOperativo >= 0 ? 'green' : 'red'}">${money(flujoOperativo)}</div>
                </div>
                <div class="dm-card">
                    <div class="dm-kpi-label">Utilidad simple</div>
                    <div class="dm-kpi-value" style="color:${utilidad >= 0 ? 'green' : 'red'}">${money(utilidad)}</div>
                </div>
                <div class="dm-card">
                    <div class="dm-kpi-label">Salud financiera</div>
                    <div class="dm-kpi-value" style="color:${saludColor}">${salud}</div>
                </div>
                <div class="dm-card">
                    <div class="dm-kpi-label">Cotizado</div>
                    <div class="dm-kpi-value">${money(totalCotizado)}</div>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;" class="dm-mb-4">
                <div class="dm-card"><div class="dm-kpi-label">Por cobrar pedidos</div><div class="dm-kpi-value">${money(porCobrarPedidos)}</div></div>
                <div class="dm-card"><div class="dm-kpi-label">Por cobrar reparaciones</div><div class="dm-kpi-value">${money(porCobrarReparaciones)}</div></div>
                <div class="dm-card"><div class="dm-kpi-label">Por pagar compras</div><div class="dm-kpi-value">${money(porPagarCompras)}</div></div>
                <div class="dm-card"><div class="dm-kpi-label">Por pagar nómina</div><div class="dm-kpi-value">${money(porPagarNomina)}</div></div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;" class="dm-mb-4">
                <div class="dm-card" onclick="App.views.detalleFinanzas('ventas', '${filtro}')" style="cursor:pointer;"><div class="dm-kpi-label">Ventas totales</div><div class="dm-kpi-value">${money(totalVentas)}</div></div>
<div class="dm-card" onclick="App.views.detalleFinanzas('gastos', '${filtro}')" style="cursor:pointer;"><div class="dm-kpi-label">Gastos</div><div class="dm-kpi-value">${money(totalGastos)}</div></div>
                <div class="dm-card"><div class="dm-kpi-label">Compras</div><div class="dm-kpi-value">${money(totalCompras)}</div></div>
                <div class="dm-card"><div class="dm-kpi-label">Nómina</div><div class="dm-kpi-value">${money(totalNomina)}</div></div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;" class="dm-mb-4">
                <div class="dm-card"><div class="dm-kpi-label">Pedidos pendientes</div><div class="dm-kpi-value">${pedidosPendientes}</div></div>
                <div class="dm-card"><div class="dm-kpi-label">Reparaciones pendientes</div><div class="dm-kpi-value">${reparacionesPendientes}</div></div>
                <div class="dm-card"><div class="dm-kpi-label">Cotizaciones pendientes</div><div class="dm-kpi-value">${cotPendientes}</div></div>
                <div class="dm-card"><div class="dm-kpi-label">Registros de gastos</div><div class="dm-kpi-value">${registrosGastos}</div></div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px;" class="dm-mb-4">
                <div class="dm-card">
                    <div class="dm-card-title">Vista rápida</div>
                    <div class="dm-muted dm-mt-2">Mini gráficas del estado del negocio.</div>
                    <div id="mini-graficas-dashboard" class="dm-mt-3" style="min-height:220px;"></div>
                </div>
                <div class="dm-card">
                    <div class="dm-card-title">Tendencias financieras</div>
                    <div class="dm-muted dm-mt-2">Gráficas ejecutivas con datos reales.</div>
                    <div id="finanzas-graficas-principales" class="dm-mt-3" style="min-height:220px;"></div>
                </div>
            </div>

            <div class="dm-card dm-mb-4">
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="dm-btn dm-btn-danger" onclick="App.views.formGasto()">+ Nuevo gasto</button>
                    <button class="dm-btn dm-btn-secondary" onclick="App.router.navigate('nomina')">Ver nómina</button>
                </div>
            </div>

            <div id="finanzas-contenedor"></div>

        </div>
    `;
};
