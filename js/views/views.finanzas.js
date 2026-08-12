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
        
        // 1. Obtenemos pedidos (excluyendo STOCK_INTERNO)
        const pedidos = (App.state.pedidos || []).filter(p => p.cliente_id !== 'STOCK_INTERNO' && entraEnFiltro(p.fecha_creacion || p.fecha));
        // 2. Obtenemos reparaciones
        const reparaciones = (App.state.reparaciones || []).filter(r => entraEnFiltro(r.fecha_creacion || r.fecha));
        
        const totalPedidos = pedidos.reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);
        const totalReparaciones = reparaciones.reduce((acc, r) => acc + (parseFloat(r.precio || 0) || 0), 0);
        const granTotal = totalPedidos + totalReparaciones;
        const totalRegistros = pedidos.length + reparaciones.length;

        resumen = `
            <div class="dm-mb-3" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
                <div class="dm-card" style="background:var(--dm-surface-2);">
                    <div class="dm-kpi-label">Registros</div>
                    <div class="dm-kpi-value">${totalRegistros}</div>
                </div>
                <div class="dm-card" style="background:var(--dm-surface-2);">
                    <div class="dm-kpi-label">Total ventas</div>
                    <div class="dm-kpi-value">${money(granTotal)}</div>
                </div>
            </div>`;
            
        // Dibujamos las filas de pedidos
        const rowsPedidos = pedidos.map(p => {
            const cliente = (App.state.clientes || []).find(c => c.id === p.cliente_id);
            const fecha = String(p.fecha_creacion || p.fecha || '').split('T')[0];
            return `<tr><td>${App.ui.safe(p.id || '')}</td><td>${App.ui.safe(fecha)}</td><td>${App.ui.safe(cliente?.nombre || p.cliente_nombre || p.cliente_id || '')}</td><td>${App.ui.safe(p.estado || '')}</td><td style="text-align:right;">${money(p.total || 0)}</td></tr>`;
        });

        // Dibujamos las filas de reparaciones
        const rowsReparaciones = reparaciones.map(r => {
            const cliente = (App.state.clientes || []).find(c => c.id === r.cliente_id);
            const fecha = String(r.fecha_creacion || r.fecha || '').split('T')[0];
            return `<tr><td>${App.ui.safe(r.id || '')} (Rep)</td><td>${App.ui.safe(fecha)}</td><td>${App.ui.safe(cliente?.nombre || r.cliente_nombre || r.cliente_id || '')}</td><td>${App.ui.safe(r.estado || '')}</td><td style="text-align:right; color:#805AD5; font-weight:bold;">${money(r.precio || 0)}</td></tr>`;
        });

        const rows = [...rowsPedidos, ...rowsReparaciones];
        tabla = renderTabla(['Folio', 'Fecha', 'Cliente', 'Estado', 'Total'], rows);
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
        titulo = 'Costo real por artículo (Fabricación y Reventa)';
        const datos = App.views.calcularCostoRealHamacas ? App.views.calcularCostoRealHamacas(filtro) : { ordenes: [], resumen: {} };
        const rows = datos.ordenes.map(o => `<tr><td>${App.ui.safe(o.orden_id)}</td><td>${App.ui.safe(o.pedido_id)}</td><td>${App.ui.safe(o.producto)} <br><strong style="font-size:0.8em; color:gray;">(${App.ui.safe(o.tipo)})</strong></td><td>${App.ui.safe(o.cliente)}</td><td style="text-align:right;">${money(o.venta)}</td><td style="text-align:right;">${money(o.costo_materiales)}</td><td style="text-align:right;">${money(o.mano_obra)}</td><td style="text-align:right;">${money(o.costo_real)}</td><td style="text-align:right;color:${o.utilidad >= 0 ? 'green' : 'red'};">${money(o.utilidad)}</td><td style="text-align:right;">${((o.margen || 0) * 100).toFixed(1)}%</td></tr>`);
        resumen = `<div class="dm-mb-3" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;"><div class="dm-card" style="background:var(--dm-surface-2);"><div class="dm-kpi-label">Artículos costeados</div><div class="dm-kpi-value">${datos.resumen?.ordenes || 0}</div></div><div class="dm-card" style="background:var(--dm-surface-2);"><div class="dm-kpi-label">Venta total</div><div class="dm-kpi-value">${money(datos.resumen?.venta || 0)}</div></div><div class="dm-card" style="background:var(--dm-surface-2);"><div class="dm-kpi-label">Costo total</div><div class="dm-kpi-value">${money(datos.resumen?.costo_real || 0)}</div></div><div class="dm-card" style="background:var(--dm-surface-2);"><div class="dm-kpi-label">Utilidad total</div><div class="dm-kpi-value" style="color:${(datos.resumen?.utilidad || 0) >= 0 ? 'green' : 'red'};">${money(datos.resumen?.utilidad || 0)}</div></div></div>`;
        tabla = renderTabla(['Referencia', 'Pedido', 'Producto', 'Cliente', 'Venta', 'Costo material/compra', 'Mano obra', 'Costo real', 'Utilidad', 'Margen'], rows);
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
    
    const resultado = [];
    const resFab = { ordenes: 0, venta: 0, costo_materiales: 0, mano_obra: 0, costo_real: 0, utilidad: 0, margen: 0 };
    const resRev = { ordenes: 0, venta: 0, costo_materiales: 0, mano_obra: 0, costo_real: 0, utilidad: 0, margen: 0 };

    const pedidosValidos = pedidos.filter(p => p.cliente_id !== 'STOCK_INTERNO' && entraEnFiltro(p.fecha_creacion || p.fecha));

    pedidosValidos.forEach(p => {
        const cliente = clientes.find(c => c.id === p.cliente_id) || {};
        const nombreCliente = cliente.nombre || p.cliente_nombre || p.cliente_id || 'Cliente';
        const detallesDelPedido = detalle.filter(d => d.pedido_id === p.id);
        
        const comisionPedido = parseFloat(p.comision || 0) || 0;
        const totalVentaPedido = detallesDelPedido.reduce((acc, d) => acc + ((parseFloat(d.precio_unitario || 0) || 0) * (parseFloat(d.cantidad || 1) || 1)), 0);

        detallesDelPedido.forEach(det => {
            const producto = productos.find(prod => prod.id === det.producto_id) || {};
            const cantidad = parseFloat(det.cantidad || 1) || 1;
            const venta = (parseFloat(det.precio_unitario || 0) || 0) * cantidad;
            
            const porcionComision = totalVentaPedido > 0 ? (venta / totalVentaPedido) * comisionPedido : 0;

const orden = ordenes.find(o => o.pedido_detalle_id === det.id);
            const esReventa = (producto.categoria === 'reventa' || producto.clasificacion === 'Reventa');

            let costoMateriales = 0;
            let manoObra = 0;
            let costoReal = 0;
            let tipo = '';
            let folio = '';

            // BLINDAJE: Si existe una orden en el taller, OBLIGATORIAMENTE es fabricada, nunca reventa
           if (orden) {
                // 1. FABRICACIÓN SOBRE PEDIDO (Taller) -> Forzamos a que lea exactamente la misma receta del Taller
                tipo = 'Fabricado (Taller)';
                folio = orden.id;

                const receta = parseReceta(orden);
                costoMateriales = receta.reduce((acc, item) => {
                    const mat = materiales.find(m => m.id === item.mat_id) || {};
                    return acc + ((parseFloat(item.cant || 0) || 0) * (parseFloat(mat.costo_unitario || 0) || 0));
                }, 0);

                const pagoArtesano = asignaciones.filter(a => a.orden_id === orden.id && String(a.estado || 'activo').toLowerCase() !== 'cancelado')
                                       .reduce((acc, a) => acc + (parseFloat(a.pago_estimado || a.total || 0) || 0), 0);
                
                manoObra = pagoArtesano + porcionComision;
                costoReal = costoMateriales + manoObra;

                resFab.ordenes += 1;
                resFab.venta += venta;
                resFab.costo_materiales += costoMateriales;
                resFab.mano_obra += manoObra;
                resFab.costo_real += costoReal;
                resFab.utilidad += (venta - costoReal);

            } else if (!esReventa) {
                // 2. FABRICACIÓN DESDE STOCK (Bodega)
                tipo = 'Fabricado (Bodega)';
                folio = p.id;
                
                if (det.costo_mat_historico || det.costo_mo_historico) {
                    costoMateriales = parseFloat(det.costo_mat_historico || 0) * cantidad;
                    const pagoHistoricoMo = parseFloat(det.costo_mo_historico || 0) * cantidad;
                    manoObra = pagoHistoricoMo + porcionComision;
                } else {
                    let costoMatEstandar = 0;
                    for (let i = 1; i <= 20; i++) {
                        if (producto[`mat_${i}`]) {
                            const mat = materiales.find(m => m.id === producto[`mat_${i}`]) || {};
                            costoMatEstandar += (parseFloat(producto[`cant_${i}`] || 0) * (parseFloat(mat.costo_unitario || 0) || 0));
                        }
                    }
                    costoMateriales = costoMatEstandar * cantidad;

                    const ultimaOrdenProd = ordenes.filter(o => {
                        const dRef = detalle.find(dt => dt.id === o.pedido_detalle_id);
                        return dRef && dRef.producto_id === producto.id;
                    }).sort((a, b) => new Date(b.fecha_creacion || 0) - new Date(a.fecha_creacion || 0))[0];

                    let ultimoPagoMo = 0;
                    if (ultimaOrdenProd) {
                        ultimoPagoMo = asignaciones.filter(a => a.orden_id === ultimaOrdenProd.id && String(a.estado || 'activo').toLowerCase() !== 'cancelado')
                                                   .reduce((acc, a) => acc + (parseFloat(a.pago_estimado || a.total || 0) || 0), 0);
                    }
                    manoObra = ultimoPagoMo + porcionComision;
                }

                costoReal = costoMateriales + manoObra;

                resFab.ordenes += 1;
                resFab.venta += venta;
                resFab.costo_materiales += costoMateriales;
                resFab.mano_obra += manoObra;
                resFab.costo_real += costoReal;
                resFab.utilidad += (venta - costoReal);

            } else {
                // 3. REVENTA PURA
                tipo = 'Reventa';
                folio = p.id;
                
                const costoUnitario = parseFloat(producto.costo_unitario || producto.precio_compra || producto.costo || 0);
                costoMateriales = costoUnitario * cantidad; 
                manoObra = porcionComision; 
                costoReal = costoMateriales + manoObra;

                resRev.ordenes += 1; 
                resRev.venta += venta;
                resRev.costo_real += costoReal;
                resRev.costo_materiales += costoMateriales;
                resRev.mano_obra += manoObra;
                resRev.utilidad += (venta - costoReal);
            }

            const utilidad = venta - costoReal;
            const margen = venta > 0 ? utilidad / venta : 0;

            if(venta > 0 || costoReal > 0) {
                resultado.push({
                    orden_id: folio,
                    pedido_id: p.id,
                    producto: producto.nombre || det.producto_nombre || 'Producto',
                    cliente: nombreCliente,
                    tipo,
                    venta,
                    costo_materiales: costoMateriales,
                    mano_obra: manoObra,
                    costo_real: costoReal,
                    utilidad,
                    margen
                });
            }
        });
    });

    resFab.margen = resFab.venta > 0 ? resFab.utilidad / resFab.venta : 0;
    resRev.margen = resRev.venta > 0 ? resRev.utilidad / resRev.venta : 0;

    const resumenGlobal = {
        ordenes: resFab.ordenes + resRev.ordenes,
        venta: resFab.venta + resRev.venta,
        costo_materiales: resFab.costo_materiales + resRev.costo_materiales,
        mano_obra: resFab.mano_obra + resRev.mano_obra,
        costo_real: resFab.costo_real + resRev.costo_real,
        utilidad: resFab.utilidad + resRev.utilidad,
        margen: (resFab.venta + resRev.venta) > 0 ? (resFab.utilidad + resRev.utilidad) / (resFab.venta + resRev.venta) : 0
    };

    return { ordenes: resultado, resumen: resumenGlobal, resFab, resRev };
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
    
    const pedidosFil = pedidos.filter(p => p.cliente_id !== 'STOCK_INTERNO' && entraEnFiltro(p.fecha_creacion || p.fecha));
    const reparacionesFil = reparaciones.filter(r => entraEnFiltro(r.fecha_creacion || r.fecha));
    const gastosFil = gastos.filter(g => entraEnFiltro(g.fecha));
    const abonosFil = abonos.filter(a => entraEnFiltro(a.fecha));
    const abonosRepFil = abonosReparaciones.filter(a => entraEnFiltro(a.fecha));
    const comprasFil = compras.filter(c => entraEnFiltro(c.fecha || c.fecha_creacion));
    const pagosArtesanosFil = pagosArtesanos.filter(p => entraEnFiltro(p.fecha_pago || p.fecha || p.fecha_creacion));
    const cotizacionesFil = cotizaciones.filter(c => entraEnFiltro(c.fecha || c.fecha_creacion));
    
    const totalVentas = pedidosFil.reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0) + reparacionesFil.reduce((acc, r) => acc + (parseFloat(r.precio || 0) || 0), 0);
    const totalCobradoPedidos = abonosFil.reduce((acc, a) => acc + (parseFloat(a.monto || 0) || 0), 0) + pedidosFil.reduce((acc, p) => acc + (parseFloat(p.anticipo || 0) || 0), 0);
    const totalCobradoReparaciones = abonosRepFil.reduce((acc, a) => acc + (parseFloat(a.monto || 0) || 0), 0) + reparacionesFil.reduce((acc, r) => acc + (parseFloat(r.anticipo_inicial || r.anticipo || 0) || 0), 0);
    const totalCobrado = totalCobradoPedidos + totalCobradoReparaciones;
    const totalCompras = comprasFil.reduce((acc, c) => acc + (parseFloat(c.total || 0) || 0), 0);
    const totalNomina = pagosArtesanosFil.reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);
    const totalCotizado = cotizacionesFil.reduce((acc, c) => acc + (parseFloat(c.total || 0) || 0), 0);
    
    const totalGastosCrudo = gastosFil.reduce((acc, g) => acc + (parseFloat(g.monto || 0) || 0), 0); 
    const gastosOperativosPuros = gastosFil
        .filter(g => {
            const desc = String(g.concepto || g.descripcion || '').toLowerCase();
            return !desc.includes('compra') && !desc.includes('materiales y insumos') && !desc.includes('hilo');
        })
        .reduce((acc, g) => acc + (parseFloat(g.monto || 0) || 0), 0);
    
    const porCobrarPedidos = pedidosFil.reduce((acc, p) => { const ab = abonos.filter(a => a.pedido_id === p.id).reduce((s, a) => s + (parseFloat(a.monto || 0) || 0), 0); const saldo = (parseFloat(p.total || 0) || 0) - (parseFloat(p.anticipo || 0) || 0) - ab; return acc + (saldo > 0 ? saldo : 0); }, 0);
    const porCobrarReparaciones = reparacionesFil.reduce((acc, r) => { const ant = parseFloat(r.anticipo_inicial || 0) || 0; const ab = abonosReparaciones.filter(a => a.reparacion_id === r.id).reduce((s, a) => s + (parseFloat(a.monto || 0) || 0), 0); const saldo = (parseFloat(r.precio || 0) || 0) - ant - ab; return acc + (saldo > 0 ? saldo : 0); }, 0);
    const dineroEnLaCalle = porCobrarPedidos + porCobrarReparaciones;
    const porPagarCompras = comprasFil.reduce((acc, c) => { const total = parseFloat(c.total || 0) || 0; const pagado = c.monto_pagado !== undefined && c.monto_pagado !== '' ? parseFloat(c.monto_pagado || 0) : total; const deuda = total - pagado; return acc + (deuda > 0 ? deuda : 0); }, 0);
    const porPagarNomina = pagosArtesanos.filter(p => String(p.estado || '').toLowerCase() === 'pendiente').reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);
    const totalPorPagar = porPagarCompras + porPagarNomina;
    
    // RENTABILIDAD
    const costoRealData = App.views.calcularCostoRealHamacas(filtro);
    const resGlobal = costoRealData.resumen;
    const resFab = costoRealData.resFab;
    const resRev = costoRealData.resRev;
    
    const resultadoCaja = totalCobrado - gastosOperativosPuros;
    const flujoOperativo = totalCobrado - gastosOperativosPuros - totalCompras - totalNomina;
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
            ${sectionTitle('Flujo de caja', 'Mide dinero cobrado, deudas y presión de efectivo.')}
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
            ${sectionTitle('1. Rentabilidad: Producción (Taller)', 'Ganancia exclusiva de las hamacas que fabricas.')}
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
                ${kpi('Artículos costeados', resFab.ordenes)}
                ${kpi('Venta (Fabricación)', money(resFab.venta))}
                ${kpi('Costo real', money(resFab.costo_real))}
                ${kpi('Utilidad', money(resFab.utilidad), resFab.utilidad >= 0 ? 'green' : 'red')}
                ${kpi('Margen', ((resFab.margen || 0) * 100).toFixed(1) + '%', resFab.margen >= 0 ? 'green' : 'red')}
            </div>
        </div>

        <div class="dm-card dm-mb-4">
            ${sectionTitle('2. Rentabilidad: Reventa', 'Ganancia de comercialización pura. *Requiere costo en catálogo.*')}
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
                ${kpi('Artículos revendidos', resRev.ordenes)}
                ${kpi('Venta (Reventa)', money(resRev.venta))}
                ${kpi('Costo de compra', money(resRev.costo_real))}
                ${kpi('Utilidad', money(resRev.utilidad), resRev.utilidad >= 0 ? 'green' : 'red')}
                ${kpi('Margen', ((resRev.margen || 0) * 100).toFixed(1) + '%', resRev.margen >= 0 ? 'green' : 'red')}
            </div>
        </div>

        <div class="dm-card dm-mb-4" style="background:#F0FFF4; border:1px solid #C6F6D5;">
            ${sectionTitle('3. Rentabilidad: GLOBAL', 'El panorama completo (Producción + Reventa).')}
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
                ${kpi('Ventas Totales', money(resGlobal.venta))}
                ${kpi('Costo Total', money(resGlobal.costo_real))}
                ${kpi('Utilidad Neta', money(resGlobal.utilidad), resGlobal.utilidad >= 0 ? 'green' : 'red')}
                ${kpi('Margen Promedio', ((resGlobal.margen || 0) * 100).toFixed(1) + '%', resGlobal.margen >= 0 ? 'green' : 'red')}
            </div>
        </div>`;
        
    const cobranzaHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;" class="dm-mb-4">${kpi('Por cobrar pedidos', money(porCobrarPedidos))}${kpi('Por cobrar reparaciones', money(porCobrarReparaciones))}${kpi('Pedidos pendientes', pedidosPendientes)}${kpi('Reparaciones pendientes', reparacionesPendientes)}${kpi('Ventas totales', money(totalVentas))}${kpi('Cotizado', money(totalCotizado))}${kpi('Cotizaciones pendientes', cotPendientes)}</div><div class="dm-card dm-mb-4"><button class="dm-btn dm-btn-primary" onclick="App.views.detalleFinanzas('ventas', '${filtro}')">Ver detalle de ventas</button></div>`;
    const egresosHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;" class="dm-mb-4">${kpi('Gastos operativos', money(gastosOperativosPuros))}${kpi('Compras', money(totalCompras))}${kpi('Por pagar compras', money(porPagarCompras))}${kpi('Registros de gastos', registrosGastos)}</div><div class="dm-card dm-mb-4" style="display:flex; gap:8px; flex-wrap:wrap;"><button class="dm-btn dm-btn-danger" onclick="App.views.formGasto()">+ Nuevo gasto</button><button class="dm-btn dm-btn-secondary" onclick="App.views.detalleFinanzas('gastos', '${filtro}')">Ver detalle de gastos</button><button class="dm-btn dm-btn-secondary" onclick="App.router.navigate('compras')">Ver compras</button></div>`;
    const nominaHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;" class="dm-mb-4">${kpi('Nómina filtrada', money(totalNomina))}${kpi('Por pagar nómina', money(porPagarNomina))}</div><div class="dm-card dm-mb-4"><button class="dm-btn dm-btn-primary" onclick="App.router.navigate('nomina')">Ver nómina completa</button></div>`;
    
    const costosHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;" class="dm-mb-4">
            ${kpi('Artículos totales', resGlobal.ordenes)}
            ${kpi('Venta global', money(resGlobal.venta))}
            ${kpi('Costo global', money(resGlobal.costo_real))}
            ${kpi('Utilidad global', money(resGlobal.utilidad), resGlobal.utilidad >= 0 ? 'green' : 'red')}
            ${kpi('Margen promedio', ((resGlobal.margen || 0) * 100).toFixed(1) + '%', resGlobal.margen >= 0 ? 'green' : 'red')}
        </div>
        <div class="dm-card dm-mb-4">
            <button class="dm-btn dm-btn-primary" onclick="App.views.detalleFinanzas('costo_real', '${filtro}')">Ver costo detallado por artículo</button>
        </div>`;

    const reportesHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px;" class="dm-mb-4"><div class="dm-card"><div class="dm-card-title">Vista rápida</div><div class="dm-muted dm-mt-2">Mini gráficas del estado del negocio.</div><div class="dm-mt-3" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;"><div style="height:220px;"><canvas id="miniGraficaIngresosGastos"></canvas></div><div style="height:220px;"><canvas id="miniGraficaCobrarPagar"></canvas></div><div style="height:220px;"><canvas id="miniGraficaOperacion"></canvas></div></div></div><div class="dm-card"><div class="dm-card-title">Tendencias financieras</div><div class="dm-muted dm-mt-2">Gráficas ejecutivas con datos reales.</div><div class="dm-mt-3" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;"><div style="height:240px;"><canvas id="graficaFinanzasIngresosGastos"></canvas></div><div style="height:240px;"><canvas id="graficaFinanzasFlujo"></canvas></div></div></div></div>`;
    
    const body = tab === 'cobranza' ? cobranzaHTML : tab === 'egresos' ? egresosHTML : tab === 'nomina' ? nominaHTML : tab === 'costos' ? costosHTML : tab === 'reportes' ? reportesHTML : resumenHTML;
    return `<div class="dm-section" style="padding-bottom:90px;"><div class="dm-card dm-mb-4" style="background:linear-gradient(135deg, #ffffff 0%, #faf7ff 100%);"><h3 class="dm-card-title">Finanzas por pestañas PRO</h3><p class="dm-muted dm-mt-2">Vista ejecutiva separada en flujo de caja y rentabilidad de producción.</p></div>${filtrosHTML}${tabsHTML}${body}<div id="finanzas-contenedor"></div></div>`;
};
