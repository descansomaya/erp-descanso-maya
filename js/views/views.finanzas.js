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
            return f >= new Date(desde + 'T00:00:00') && f <= new Date(hasta + 'T23:59:59');
        }
        if (filtro === 'mes_actual') return f.getMonth() === mesActual && f.getFullYear() === anioActual;
        if (filtro === 'trimestre_actual') return f.getFullYear() === anioActual && Math.floor(f.getMonth() / 3) === Math.floor(mesActual / 3);
        if (filtro === 'anio_actual') return f.getFullYear() === anioActual;
        return true;
    };
    const renderTabla = (headers, rows) => {
        if (!rows.length) return `<div class="dm-alert dm-alert-info">No hay registros para este filtro.</div>`;
        return `<div style="overflow:auto;"><table class="dm-table" style="width:100%; min-width:760px;"><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
    };
    let titulo = 'Detalle financiero';
    let resumen = '';
    let tabla = '';
    if (tipo === 'ventas') {
        titulo = 'Ventas totales';
        const pedidos = (App.state.pedidos || []).filter(p => entraEnFiltro(p.fecha_creacion || p.fecha));
        const total = pedidos.reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);
        resumen = `<div class="dm-mb-3" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;"><div class="dm-card" style="background:var(--dm-surface-2);"><div class="dm-kpi-label">Registros</div><div class="dm-kpi-value">${pedidos.length}</div></div><div class="dm-card" style="background:var(--dm-surface-2);"><div class="dm-kpi-label">Total ventas</div><div class="dm-kpi-value">${money(total)}</div></div></div>`;
        const rows = pedidos.map(p => {
            const cliente = (App.state.clientes || []).find(c => c.id === p.cliente_id);
            const fecha = String(p.fecha_creacion || p.fecha || '').split('T')[0];
            return `<tr><td>${App.ui.safe(p.id || '')}</td><td>${App.ui.safe(fecha)}</td><td>${App.ui.safe(cliente?.nombre || p.cliente_nombre || p.cliente_id || '')}</td><td>${App.ui.safe(p.estado || '')}</td><td style="text-align:right;">${money(p.total || 0)}</td></tr>`;
        });
        tabla = renderTabla(['Pedido', 'Fecha', 'Cliente', 'Estado', 'Total'], rows);
    }
    if (tipo === 'gastos') {
        titulo = 'Gastos';
        const gastos = (App.state.gastos || []).filter(g => entraEnFiltro(g.fecha));
        const total = gastos.reduce((acc, g) => acc + (parseFloat(g.monto || 0) || 0), 0);
        resumen = `<div class="dm-mb-3" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;"><div class="dm-card" style="background:var(--dm-surface-2);"><div class="dm-kpi-label">Registros</div><div class="dm-kpi-value">${gastos.length}</div></div><div class="dm-card" style="background:var(--dm-surface-2);"><div class="dm-kpi-label">Total gastos</div><div class="dm-kpi-value">${money(total)}</div></div></div>`;
        const rows = gastos.map(g => `<tr><td>${App.ui.safe(g.id || '')}</td><td>${App.ui.safe(String(g.fecha || '').split('T')[0])}</td><td>${App.ui.safe(g.categoria || g.tipo || '')}</td><td>${App.ui.safe(g.descripcion || g.concepto || '')}</td><td style="text-align:right;">${money(g.monto || 0)}</td></tr>`);
        tabla = renderTabla(['ID', 'Fecha', 'Categoría', 'Concepto', 'Monto'], rows);
    }
    if (tipo === 'costo_real') {
        titulo = 'Costo real por hamaca';
        const datos = App.views.calcularCostoRealHamacas ? App.views.calcularCostoRealHamacas(filtro) : { ordenes: [], resumen: {} };
        const rows = datos.ordenes.map(o => `<tr><td>${App.ui.safe(o.orden_id)}</td><td>${App.ui.safe(o.pedido_id)}</td><td>${App.ui.safe(o.producto)}</td><td>${App.ui.safe(o.cliente)}</td><td style="text-align:right;">${money(o.venta)}</td><td style="text-align:right;">${money(o.costo_materiales)}</td><td style="text-align:right;">${money(o.mano_obra)}</td><td style="text-align:right;">${money(o.costo_real)}</td><td style="text-align:right;color:${o.utilidad >= 0 ? 'green' : 'red'};">${money(o.utilidad)}</td><td style="text-align:right;">${((o.margen || 0) * 100).toFixed(1)}%</td></tr>`);
        resumen = `<div class="dm-mb-3" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;"><div class="dm-card" style="background:var(--dm-surface-2);"><div class="dm-kpi-label">Órdenes</div><div class="dm-kpi-value">${datos.resumen?.ordenes || 0}</div></div><div class="dm-card" style="background:var(--dm-surface-2);"><div class="dm-kpi-label">Venta</div><div class="dm-kpi-value">${money(datos.resumen?.venta || 0)}</div></div><div class="dm-card" style="background:var(--dm-surface-2);"><div class="dm-kpi-label">Costo real</div><div class="dm-kpi-value">${money(datos.resumen?.costo_real || 0)}</div></div><div class="dm-card" style="background:var(--dm-surface-2);"><div class="dm-kpi-label">Utilidad real</div><div class="dm-kpi-value" style="color:${(datos.resumen?.utilidad || 0) >= 0 ? 'green' : 'red'};">${money(datos.resumen?.utilidad || 0)}</div></div></div>`;
        tabla = renderTabla(['Orden', 'Pedido', 'Producto', 'Cliente', 'Venta', 'Materiales', 'Mano obra', 'Costo real', 'Utilidad', 'Margen'], rows);
    }
    cont.innerHTML = `<div class="dm-card dm-mb-4"><div class="dm-row-between" style="gap:12px;align-items:flex-start;flex-wrap:wrap;"><div><div class="dm-card-title">${titulo}</div><div class="dm-muted dm-mt-2">Filtro aplicado: ${App.ui.safe(filtro || 'actual')}</div></div><button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="document.getElementById('finanzas-contenedor').innerHTML=''">Cerrar</button></div><div class="dm-mt-3">${resumen}${tabla}</div></div>`;
};

App.views.aplicarFiltroFinanzas = function(filtro) { App.state.finanzasFiltro = filtro || 'mes_actual'; App.router.handleRoute(); };
App.views.aplicarFiltroFinanzasCustom = function() { App.state.finanzasFechaDesde = document.getElementById('finanzas-fecha-desde')?.value || ''; App.state.finanzasFechaHasta = document.getElementById('finanzas-fecha-hasta')?.value || ''; App.state.finanzasFiltro = 'custom'; App.router.handleRoute(); };
App.views.setFinanzasTab = function(tab) { App.state.finanzasTab = tab || 'resumen'; App.router.handleRoute(); };

App.views.calcularCostoRealHamacas = function(filtro = App.state.finanzasFiltro || 'mes_actual') {
    const pedidos = App.state.pedidos || [];
    const clientes = App.state.clientes || [];
    const detalle = App.state.pedido_detalle || [];
    const productos = App.state.productos || [];
    const ordenes = App.state.ordenes_produccion || [];
    const asignaciones = App.state.ordenes_produccion_artesanos || [];
    const materiales = App.state.inventario || [];
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();
    const fechaDesde = App.state.finanzasFechaDesde || '';
    const fechaHasta = App.state.finanzasFechaHasta || '';
    const entraEnFiltro = (fechaStr) => {
        if (!fechaStr) return filtro === 'todo';
        const f = new Date(fechaStr);
        if (isNaN(f.getTime())) return false;
        if (filtro === 'todo') return true;
        if (filtro === 'custom') { if (!fechaDesde || !fechaHasta) return true; return f >= new Date(fechaDesde + 'T00:00:00') && f <= new Date(fechaHasta + 'T23:59:59'); }
        if (filtro === 'mes_actual') return f.getMonth() === mesActual && f.getFullYear() === anioActual;
        if (filtro === 'trimestre_actual') return f.getFullYear() === anioActual && Math.floor(f.getMonth() / 3) === Math.floor(mesActual / 3);
        if (filtro === 'anio_actual') return f.getFullYear() === anioActual;
        return true;
    };
    const parseReceta = (orden) => { try { const r = JSON.parse(orden?.receta_personalizada || '[]'); return Array.isArray(r) ? r : []; } catch(e) { return []; } };
    const resultado = ordenes.filter(o => entraEnFiltro(o.fecha_creacion || o.fecha_inicio || o.fecha_descuento_materiales)).map(o => {
        const det = detalle.find(d => d.id === o.pedido_detalle_id) || {};
        const pedido = pedidos.find(p => p.id === det.pedido_id) || {};
        const cliente = clientes.find(c => c.id === pedido.cliente_id) || {};
        const producto = productos.find(p => p.id === det.producto_id) || {};
        const cantidad = parseFloat(det.cantidad || 1) || 1;
        const venta = (parseFloat(det.precio_unitario || 0) || 0) * cantidad;
        const receta = parseReceta(o);
        const costoMateriales = receta.reduce((acc, item) => {
            const mat = materiales.find(m => m.id === item.mat_id) || {};
            return acc + ((parseFloat(item.cant || 0) || 0) * (parseFloat(mat.costo_unitario || 0) || 0));
        }, 0);
        const manoObra = asignaciones.filter(a => a.orden_id === o.id && String(a.estado || 'activo').toLowerCase() !== 'cancelado').reduce((acc, a) => acc + (parseFloat(a.pago_estimado || a.total || 0) || 0), 0);
        const costoReal = costoMateriales + manoObra;
        const utilidad = venta - costoReal;
        const margen = venta > 0 ? utilidad / venta : 0;
        return { orden_id: o.id, pedido_id: det.pedido_id || '', producto: producto.nombre || det.producto_nombre || 'Producto', cliente: pedido.cliente_id === 'STOCK_INTERNO' ? 'STOCK BODEGA' : (cliente.nombre || pedido.cliente_nombre || pedido.cliente_id || ''), venta, costo_materiales: costoMateriales, mano_obra: manoObra, costo_real: costoReal, utilidad, margen };
    });
    const resumen = resultado.reduce((acc, x) => { acc.ordenes += 1; acc.venta += x.venta; acc.costo_materiales += x.costo_materiales; acc.mano_obra += x.mano_obra; acc.costo_real += x.costo_real; acc.utilidad += x.utilidad; return acc; }, { ordenes: 0, venta: 0, costo_materiales: 0, mano_obra: 0, costo_real: 0, utilidad: 0 });
    resumen.margen = resumen.venta > 0 ? resumen.utilidad / resumen.venta : 0;
    return { ordenes: resultado, resumen };
};

App.views.finanzas = function () {
    const title = document.getElementById('app-header-title');
    const subtitle = document.getElementById('app-header-subtitle');
    const bottomNav = document.getElementById('bottom-nav');
    if (title) title.innerText = 'Finanzas';
    if (subtitle) subtitle.innerText = 'Dashboard ejecutivo y flujo de caja';
    if (bottomNav) bottomNav.style.display = 'flex';
    const filtro = App.state.finanzasFiltro || 'mes_actual';
    const tab = App.state.finanzasTab || 'resumen';
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
        if (filtro === 'custom') { if (!fechaDesde || !fechaHasta) return true; return f >= new Date(fechaDesde + 'T00:00:00') && f <= new Date(fechaHasta + 'T23:59:59'); }
        if (filtro === 'mes_actual') return f.getMonth() === mesActual && f.getFullYear() === anioActual;
        if (filtro === 'trimestre_actual') return f.getFullYear() === anioActual && Math.floor(f.getMonth() / 3) === Math.floor(mesActual / 3);
        if (filtro === 'anio_actual') return f.getFullYear() === anioActual;
        return true;
    };
    const pedidosFil = pedidos.filter(p => entraEnFiltro(p.fecha_creacion || p.fecha));
    const reparacionesFil = reparaciones.filter(r => entraEnFiltro(r.fecha_creacion || r.fecha));
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
    const porCobrarPedidos = pedidosFil.reduce((acc, p) => { const ab = abonos.filter(a => a.pedido_id === p.id).reduce((s, a) => s + (parseFloat(a.monto || 0) || 0), 0); const saldo = (parseFloat(p.total || 0) || 0) - (parseFloat(p.anticipo || 0) || 0) - ab; return acc + (saldo > 0 ? saldo : 0); }, 0);
    const porCobrarReparaciones = reparacionesFil.reduce((acc, r) => { const ant = parseFloat(r.anticipo_inicial || 0) || 0; const ab = abonosReparaciones.filter(a => a.reparacion_id === r.id).reduce((s, a) => s + (parseFloat(a.monto || 0) || 0), 0); const saldo = (parseFloat(r.precio || 0) || 0) - ant - ab; return acc + (saldo > 0 ? saldo : 0); }, 0);
    const dineroEnLaCalle = porCobrarPedidos + porCobrarReparaciones;
    const porPagarCompras = comprasFil.reduce((acc, c) => { const total = parseFloat(c.total || 0) || 0; const pagado = c.monto_pagado !== undefined && c.monto_pagado !== '' ? parseFloat(c.monto_pagado || 0) : total; const deuda = total - pagado; return acc + (deuda > 0 ? deuda : 0); }, 0);
    const porPagarNomina = pagosArtesanos.filter(p => String(p.estado || '').toLowerCase() === 'pendiente').reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);
    const totalPorPagar = porPagarCompras + porPagarNomina;
    const costoRealData = App.views.calcularCostoRealHamacas(filtro);
    const costoRealResumen = costoRealData.resumen;
    const utilidadReal = costoRealResumen.utilidad;
    const margenReal = costoRealResumen.margen;
    const resultadoCaja = totalCobrado - totalGastos;
    const flujoOperativo = totalCobrado - totalGastos - totalCompras - totalNomina;
    const saldoProyectado = dineroEnLaCalle - totalPorPagar;
    const salud = flujoOperativo >= 0 && saldoProyectado >= 0 ? 'Sana' : (flujoOperativo < 0 && saldoProyectado < 0 ? 'Crítica' : 'En observación');
    const saludColor = salud === 'Sana' ? 'green' : (salud === 'Crítica' ? 'red' : '#B7791F');
    const pedidosPendientes = pedidosFil.filter(p => !['pagado', 'entregado'].includes(String(p.estado || '').toLowerCase())).length;
    const reparacionesPendientes = reparacionesFil.filter(r => !['entregada'].includes(String(r.estado || '').toLowerCase())).length;
    const cotPendientes = cotizacionesFil.filter(c => String(c.estado_conversion || '').toLowerCase() !== 'convertida').length;
    const registrosGastos = gastosFil.length;
    setTimeout(() => { if (App.logic && App.logic.renderMiniGraficasDashboard) App.logic.renderMiniGraficasDashboard(); if (App.logic && App.logic.renderGraficasFinanzas) App.logic.renderGraficasFinanzas(filtro); }, 120);
    const activeFiltro = (x) => filtro === x ? 'dm-btn-primary' : 'dm-btn-secondary';
    const activeTab = (x) => tab === x ? 'dm-btn-primary' : 'dm-btn-secondary';
    const kpi = (label, value, color = '') => `<div class="dm-card"><div class="dm-kpi-label">${label}</div><div class="dm-kpi-value" ${color ? `style="color:${color};"` : ''}>${value}</div></div>`;
    const sectionTitle = (title, desc) => `<div class="dm-mb-2"><h3 class="dm-card-title">${title}</h3>${desc ? `<p class="dm-muted dm-mt-1">${desc}</p>` : ''}</div>`;
    const filtrosHTML = `<div class="dm-card dm-mb-4"><div class="dm-card-title">Filtros de fecha</div><div class="dm-mt-3" style="display:flex; gap:8px; flex-wrap:wrap;"><button class="dm-btn ${activeFiltro('mes_actual')}" onclick="App.views.aplicarFiltroFinanzas('mes_actual')">Mes actual</button><button class="dm-btn ${activeFiltro('trimestre_actual')}" onclick="App.views.aplicarFiltroFinanzas('trimestre_actual')">Trimestre</button><button class="dm-btn ${activeFiltro('anio_actual')}" onclick="App.views.aplicarFiltroFinanzas('anio_actual')">Año</button><button class="dm-btn ${activeFiltro('todo')}" onclick="App.views.aplicarFiltroFinanzas('todo')">Todo</button></div><div class="dm-mt-3" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px; align-items:end;"><div class="dm-form-group"><label class="dm-label">Desde</label><input type="date" id="finanzas-fecha-desde" class="dm-input" value="${fechaDesde}"></div><div class="dm-form-group"><label class="dm-label">Hasta</label><input type="date" id="finanzas-fecha-hasta" class="dm-input" value="${fechaHasta}"></div><div><button class="dm-btn dm-btn-primary" onclick="App.views.aplicarFiltroFinanzasCustom()">Aplicar rango</button></div></div></div>`;
    const tabsHTML = `<div class="dm-card dm-mb-4"><div style="display:flex; gap:8px; flex-wrap:wrap;"><button class="dm-btn ${activeTab('resumen')}" onclick="App.views.setFinanzasTab('resumen')">📊 Resumen</button><button class="dm-btn ${activeTab('cobranza')}" onclick="App.views.setFinanzasTab('cobranza')">💰 Cobranza</button><button class="dm-btn ${activeTab('egresos')}" onclick="App.views.setFinanzasTab('egresos')">💸 Egresos</button><button class="dm-btn ${activeTab('nomina')}" onclick="App.views.setFinanzasTab('nomina')">👷 Nómina</button><button class="dm-btn ${activeTab('costos')}" onclick="App.views.setFinanzasTab('costos')">🧮 Costos reales</button><button class="dm-btn ${activeTab('reportes')}" onclick="App.views.setFinanzasTab('reportes')">📈 Reportes</button></div></div>`;
    const resumenHTML = `
        <div class="dm-card dm-mb-4">
            ${sectionTitle('Flujo de caja', 'Mide dinero cobrado, deudas y presión de efectivo. Puede ser negativo aunque la producción sea rentable.')}
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
                ${kpi('Cobrado total', money(totalCobrado))}
                ${kpi('Dinero en la calle', money(dineroEnLaCalle))}
                ${kpi('Total por pagar', money(totalPorPagar))}
                ${kpi('Saldo proyectado', money(saldoProyectado), saldoProyectado >= 0 ? 'green' : 'red')}
                ${kpi('Flujo operativo', money(flujoOperativo), flujoOperativo >= 0 ? 'green' : 'red')}
                ${kpi('Resultado caja simple', money(resultadoCaja), resultadoCaja >= 0 ? 'green' : 'red')}
                ${kpi('Salud financiera', salud, saludColor)}
            </div>
        </div>
        <div class="dm-card dm-mb-4">
            ${sectionTitle('Rentabilidad de producción', 'Mide si las hamacas dejan utilidad: venta menos materiales y mano de obra.')}
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
                ${kpi('Órdenes costeadas', costoRealResumen.ordenes)}
                ${kpi('Venta producción', money(costoRealResumen.venta))}
                ${kpi('Costo real producción', money(costoRealResumen.costo_real))}
                ${kpi('Utilidad real producción', money(utilidadReal), utilidadReal >= 0 ? 'green' : 'red')}
                ${kpi('Margen real', ((margenReal || 0) * 100).toFixed(1) + '%', margenReal >= 0 ? 'green' : 'red')}
            </div>
        </div>`;
    const cobranzaHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;" class="dm-mb-4">${kpi('Por cobrar pedidos', money(porCobrarPedidos))}${kpi('Por cobrar reparaciones', money(porCobrarReparaciones))}${kpi('Pedidos pendientes', pedidosPendientes)}${kpi('Reparaciones pendientes', reparacionesPendientes)}${kpi('Ventas totales', money(totalVentas))}${kpi('Cotizado', money(totalCotizado))}${kpi('Cotizaciones pendientes', cotPendientes)}</div><div class="dm-card dm-mb-4"><button class="dm-btn dm-btn-primary" onclick="App.views.detalleFinanzas('ventas', '${filtro}')">Ver detalle de ventas</button></div>`;
    const egresosHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;" class="dm-mb-4">${kpi('Gastos', money(totalGastos))}${kpi('Compras', money(totalCompras))}${kpi('Por pagar compras', money(porPagarCompras))}${kpi('Registros de gastos', registrosGastos)}</div><div class="dm-card dm-mb-4" style="display:flex; gap:8px; flex-wrap:wrap;"><button class="dm-btn dm-btn-danger" onclick="App.views.formGasto()">+ Nuevo gasto</button><button class="dm-btn dm-btn-secondary" onclick="App.views.detalleFinanzas('gastos', '${filtro}')">Ver detalle de gastos</button><button class="dm-btn dm-btn-secondary" onclick="App.router.navigate('compras')">Ver compras</button></div>`;
    const nominaHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;" class="dm-mb-4">${kpi('Nómina filtrada', money(totalNomina))}${kpi('Por pagar nómina', money(porPagarNomina))}</div><div class="dm-card dm-mb-4"><button class="dm-btn dm-btn-primary" onclick="App.router.navigate('nomina')">Ver nómina completa</button></div>`;
    const costosHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;" class="dm-mb-4">${kpi('Órdenes costeadas', costoRealResumen.ordenes)}${kpi('Venta producción', money(costoRealResumen.venta))}${kpi('Materiales', money(costoRealResumen.costo_materiales))}${kpi('Mano de obra', money(costoRealResumen.mano_obra))}${kpi('Costo real total', money(costoRealResumen.costo_real))}${kpi('Utilidad real', money(costoRealResumen.utilidad), costoRealResumen.utilidad >= 0 ? 'green' : 'red')}${kpi('Margen real', ((costoRealResumen.margen || 0) * 100).toFixed(1) + '%', costoRealResumen.margen >= 0 ? 'green' : 'red')}</div><div class="dm-card dm-mb-4"><button class="dm-btn dm-btn-primary" onclick="App.views.detalleFinanzas('costo_real', '${filtro}')">Ver costo por hamaca</button></div>`;
    const reportesHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px;" class="dm-mb-4"><div class="dm-card"><div class="dm-card-title">Vista rápida</div><div class="dm-muted dm-mt-2">Mini gráficas del estado del negocio.</div><div class="dm-mt-3" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;"><div style="height:220px;"><canvas id="miniGraficaIngresosGastos"></canvas></div><div style="height:220px;"><canvas id="miniGraficaCobrarPagar"></canvas></div><div style="height:220px;"><canvas id="miniGraficaOperacion"></canvas></div></div></div><div class="dm-card"><div class="dm-card-title">Tendencias financieras</div><div class="dm-muted dm-mt-2">Gráficas ejecutivas con datos reales.</div><div class="dm-mt-3" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;"><div style="height:240px;"><canvas id="graficaFinanzasIngresosGastos"></canvas></div><div style="height:240px;"><canvas id="graficaFinanzasFlujo"></canvas></div></div></div></div>`;
    const body = tab === 'cobranza' ? cobranzaHTML : tab === 'egresos' ? egresosHTML : tab === 'nomina' ? nominaHTML : tab === 'costos' ? costosHTML : tab === 'reportes' ? reportesHTML : resumenHTML;
    return `<div class="dm-section" style="padding-bottom:90px;"><div class="dm-card dm-mb-4" style="background:linear-gradient(135deg, #ffffff 0%, #faf7ff 100%);"><h3 class="dm-card-title">Finanzas por pestañas PRO</h3><p class="dm-muted dm-mt-2">Vista ejecutiva separada en flujo de caja y rentabilidad de producción.</p></div>${filtrosHTML}${tabsHTML}${body}<div id="finanzas-contenedor"></div></div>`;
};