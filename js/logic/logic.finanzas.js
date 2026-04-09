// ==========================================
// LÓGICA: FINANZAS Y GASTOS
// ==========================================

Object.assign(App.logic, {
    async guardarMultiplesGastos(datos) { App.ui.showLoader("Registrando Gastos..."); const descripciones = Array.isArray(datos.descripcion) ? datos.descripcion : [datos.descripcion]; const montos = Array.isArray(datos.monto) ? datos.monto : [datos.monto]; let operaciones = []; let nuevosGastos = []; for(let i=0; i<descripciones.length; i++) { if(!descripciones[i]) continue; const gastoObj = { id: "GAS-" + Date.now() + "-" + i, categoria: datos.categoria, descripcion: descripciones[i], monto: parseFloat(montos[i]), fecha: datos.fecha }; nuevosGastos.push(gastoObj); operaciones.push({ action: "guardar_fila", nombreHoja: "gastos", datos: gastoObj }); } await App.api.fetch("ejecutar_lote", { operaciones: operaciones }); App.state.gastos.push(...nuevosGastos); App.ui.hideLoader(); App.ui.toast("¡Gastos registrados!"); App.router.handleRoute(); },
    renderGraficasFinanzas(filtro) {
        const cont = document.getElementById('finanzas-contenedor'); if(!cont) return; const hoy = new Date(); let mesActual = hoy.getMonth(); let anioActual = hoy.getFullYear(); let mesPasado = mesActual - 1; let anioPasado = anioActual; if(mesPasado < 0) { mesPasado = 11; anioPasado--; } let triActual = Math.floor(mesActual / 3);
        const filtrarFecha = (str) => { if(filtro === 'todo') return true; if(!str) return false; const f = new Date(str); if(filtro === 'mes_actual') return f.getMonth() === mesActual && f.getFullYear() === anioActual; if(filtro === 'mes_pasado') return f.getMonth() === mesPasado && f.getFullYear() === anioPasado; if(filtro === 'trimestre_actual') return Math.floor(f.getMonth() / 3) === triActual && f.getFullYear() === anioActual; if(filtro === 'anio_actual') return f.getFullYear() === anioActual; return true; };
        const pedFiltrados = App.state.pedidos.filter(p => filtrarFecha(p.fecha_creacion)); const aboFiltrados = App.state.abonos.filter(a => filtrarFecha(a.fecha)); const gasFiltrados = App.state.gastos.filter(g => filtrarFecha(g.fecha)); const repFiltradas = App.state.reparaciones.filter(r => filtrarFecha(r.fecha_creacion));

        let xCobrarGlobal = 0;
        App.state.pedidos.forEach(p => { const abonos = App.state.abonos.filter(a => a.pedido_id === p.id).reduce((s,a) => s + parseFloat(a.monto||0), 0); const saldo = parseFloat(p.total||0) - parseFloat(p.anticipo||0) - abonos; if(saldo > 0) xCobrarGlobal += saldo; });
        App.state.reparaciones.forEach(r => { const saldo = parseFloat(r.precio||0) - parseFloat(r.anticipo||0); if(saldo > 0) xCobrarGlobal += saldo; });

        let xPagarGlobal = 0;
        App.state.pago_artesanos.forEach(pa => { if(pa.estado === 'pendiente') xPagarGlobal += parseFloat(pa.total || 0); });
        App.state.compras.forEach(c => { const deuda = parseFloat(c.total || 0) - parseFloat(c.monto_pagado || c.total); if(deuda > 0) xPagarGlobal += deuda; });

        const tVentasPed = pedFiltrados.reduce((acc, p) => acc + (parseFloat(p.total) || 0), 0); const tVentasRep = repFiltradas.reduce((acc, r) => acc + (parseFloat(r.precio) || 0), 0); const tVentas = tVentasPed + tVentasRep;
        const tAnticiposPed = pedFiltrados.reduce((acc, p) => acc + (parseFloat(p.anticipo) || 0), 0); const tAnticiposRep = repFiltradas.reduce((acc, r) => acc + (parseFloat(r.anticipo) || 0), 0); const tAbonos = aboFiltrados.reduce((acc, a) => acc + (parseFloat(a.monto) || 0), 0); const ingReales = tAnticiposPed + tAnticiposRep + tAbonos; 
        const tGastos = gasFiltrados.reduce((acc, g) => acc + (parseFloat(g.monto) || 0), 0); const fNeto = ingReales - tGastos; const labels = { todo: "Todo el historial", mes_actual: "Este Mes", mes_pasado: "Mes Pasado", trimestre_actual: "Este Trimestre", anio_actual: "Este Año" };
        
        let expPorCat = {}; 
        gasFiltrados.forEach(g => { 
            let cat = (g.categoria || 'otro'); 
            if (cat.toLowerCase() === 'materiales') { const desc = (g.descripcion || '').toLowerCase(); if (desc.includes('reventa') || desc.includes('hamaca')) cat = 'Hamacas (Reventa)'; else cat = 'Materiales e Insumos'; }
            else if (cat.toLowerCase() === 'nomina') cat = 'Nómina Artesanos'; else if (cat.toLowerCase() === 'servicios') cat = 'Servicios y Otros';
            expPorCat[cat] = (expPorCat[cat] || 0) + parseFloat(g.monto||0); 
        });
        
        let ventasPorCat = { 'Hamacas': 0, 'Sillas': 0, 'Cojines': 0, 'Accesorios': 0, 'Reparaciones': 0, 'Otros': 0 };
        pedFiltrados.forEach(p => { const det = App.state.pedido_detalle.find(d => d.pedido_id === p.id); const prod = det ? App.state.productos.find(x => x.id === det.producto_id) : null; const n = prod ? prod.nombre.toLowerCase() : ''; const t = parseFloat(p.total||0); if(n.includes('silla')) ventasPorCat['Sillas'] += t; else if(n.includes('cojin') || n.includes('cojín')) ventasPorCat['Cojines'] += t; else if(n.includes('accesorio') || n.includes('soga') || n.includes('brazo') || n.includes('argolla') || n.includes('hilo')) ventasPorCat['Accesorios'] += t; else if(n.includes('hamaca') || n.includes('tejido')) ventasPorCat['Hamacas'] += t; else ventasPorCat['Hamacas'] += t; });
        repFiltradas.forEach(r => { ventasPorCat['Reparaciones'] += parseFloat(r.precio||0); });
        Object.keys(ventasPorCat).forEach(k => { if(ventasPorCat[k] === 0) delete ventasPorCat[k]; });

        const coloresVentas = ['#4C51BF', '#ED8936', '#38B2AC', '#E53E3E', '#ECC94B', '#A0AEC0']; 
        const coloresGastos = ['#E53E3E', '#D69E2E', '#3182CE', '#805AD5', '#38A169', '#718096']; 

        let html = `<p style="color:var(--text-muted); font-size:0.85rem; margin-top:-10px; margin-bottom:15px;">Mostrando: <strong>${labels[filtro]}</strong></p><div class="grid-2"><div class="card stat-card" style="background:#EBF8FF; cursor:pointer;" onclick="App.views.detalleFinanzas('ventas', '${filtro}')"><div class="label">Ventas Totales</div><div class="value" style="color:#3182CE; font-size:1.2rem;">$${tVentas.toFixed(2)}</div></div><div class="card stat-card" style="background:#C6F6D5; cursor:pointer;" onclick="App.views.detalleFinanzas('ingresos', '${filtro}')"><div class="label">Ingresos Reales</div><div class="value" style="color:#38A169; font-size:1.2rem;">$${ingReales.toFixed(2)}</div></div><div class="card stat-card" style="background:#FEFCBF; cursor:pointer;" onclick="App.views.detalleFinanzas('por_cobrar', '${filtro}')"><div class="label">Por Cobrar (Global)</div><div class="value" style="color:#D69E2E; font-size:1.2rem;">$${xCobrarGlobal.toFixed(2)}</div></div><div class="card stat-card" style="background:#FFF5F5; cursor:pointer;" onclick="App.views.detalleFinanzas('por_pagar', '${filtro}')"><div class="label">Por Pagar (Global)</div><div class="value" style="color:#E53E3E; font-size:1.2rem;">$${xPagarGlobal.toFixed(2)}</div></div><div class="card stat-card" style="background:#EDF2F7; cursor:pointer; grid-column: span 2;" onclick="App.views.detalleFinanzas('gastos', '${filtro}')"><div class="label">Gastos Operativos</div><div class="value" style="color:#4A5568; font-size:1.2rem;">$${tGastos.toFixed(2)}</div></div></div><div class="card stat-card" style="margin-top:10px; border:2px solid ${fNeto >= 0 ? 'var(--success)' : 'var(--danger)'}; margin-bottom:15px;"><div class="label">Flujo Neto Efectivo (Caja Fuerte)</div><div class="value" style="color:${fNeto >= 0 ? 'var(--success)' : 'var(--danger)'};">$${fNeto.toFixed(2)}</div></div><div style="background:white; border:1px solid #e2e8f0; border-radius:8px; padding:15px;"><canvas id="graficaFinanzas"></canvas></div>`;
        html += `<div style="display:flex; flex-direction:column; gap:15px; margin-top:15px;"><div style="background:white; border:1px solid #e2e8f0; border-radius:8px; padding:15px; display:flex; flex-direction:column; align-items:center;"><h4 style="text-align:center; margin-bottom:15px; color:var(--text-muted); font-size:0.9rem;">De dónde ingresa 📈</h4><div style="position:relative; width:100%; max-width:280px; aspect-ratio:1;"><canvas id="graficaVentasCanvas"></canvas></div></div><div style="background:white; border:1px solid #e2e8f0; border-radius:8px; padding:15px; display:flex; flex-direction:column; align-items:center;"><h4 style="text-align:center; margin-bottom:15px; color:var(--text-muted); font-size:0.9rem;">En qué se gasta 📉</h4><div style="position:relative; width:100%; max-width:280px; aspect-ratio:1;"><canvas id="graficaGastosCanvas"></canvas></div></div></div><button class="btn btn-secondary" style="width:100%; margin-top:15px; border-color:#38A169; color:#38A169; font-weight:bold; background:transparent;" onclick="window.exportarAExcel(App.state.gastos, 'Gastos_${labels[filtro]}')">📥 Exportar Gastos a Excel</button>`;
        cont.innerHTML = html;
        
        setTimeout(() => { 
            if(window.Chart) { 
                const ctx1 = document.getElementById('graficaFinanzas');
                if(ctx1) { if(window.graficaActual) window.graficaActual.destroy(); window.graficaActual = new Chart(ctx1, { type: 'bar', data: { labels: ['Ingresos Real', 'Gastos'], datasets: [{ label: 'Monto ($)', data: [ingReales, tGastos], backgroundColor: ['#38A169', '#E53E3E'], borderRadius: 4 }] }, options: { responsive: true, plugins: { legend: { display: false } } } }); } 
                const ctxV = document.getElementById('graficaVentasCanvas');
                if(ctxV) { if(window.graficaVentasD) window.graficaVentasD.destroy(); window.graficaVentasD = new Chart(ctxV, { type: 'doughnut', data: { labels: Object.keys(ventasPorCat).map(k=>k.toUpperCase()), datasets: [{ data: Object.values(ventasPorCat), backgroundColor: coloresVentas }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels:{font:{size:11}, padding: 15} } } } }); }
                const ctxG = document.getElementById('graficaGastosCanvas');
                if(ctxG) { if(window.graficaGastosD) window.graficaGastosD.destroy(); window.graficaGastosD = new Chart(ctxG, { type: 'doughnut', data: { labels: Object.keys(expPorCat).map(k=>k.toUpperCase()), datasets: [{ data: Object.values(expPorCat), backgroundColor: coloresGastos }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels:{font:{size:11}, padding: 15} } } } }); }
            } 
        }, 300);
    }
});
