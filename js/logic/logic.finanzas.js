// ==========================================
// LÓGICA: FINANZAS, GASTOS Y DASHBOARD (V61 - GRADO CONTABLE)
// ==========================================

Object.assign(App.logic, {
    async guardarMultiplesGastos(datos) { App.ui.showLoader("Registrando Gastos..."); const descripciones = Array.isArray(datos.descripcion) ? datos.descripcion : [datos.descripcion]; const montos = Array.isArray(datos.monto) ? datos.monto : [datos.monto]; let operaciones = []; let nuevosGastos = []; for(let i=0; i<descripciones.length; i++) { if(!descripciones[i]) continue; const gastoObj = { id: "GAS-" + Date.now() + "-" + i, categoria: datos.categoria, descripcion: descripciones[i], monto: parseFloat(montos[i]), fecha: datos.fecha }; nuevosGastos.push(gastoObj); operaciones.push({ action: "guardar_fila", nombreHoja: "gastos", datos: gastoObj }); } await App.api.fetch("ejecutar_lote", { operaciones: operaciones }); App.state.gastos.push(...nuevosGastos); App.ui.hideLoader(); App.ui.toast("¡Gastos registrados!"); App.router.handleRoute(); },
    
    renderGraficasFinanzas(filtro) {
        const cont = document.getElementById('finanzas-contenedor'); if(!cont) return; 
        const hoy = new Date(); let mAct = hoy.getMonth(); let aAct = hoy.getFullYear(); 

        // Helper para saber a qué periodo pertenece una fecha (Actual, Previo, o Fuera)
        const clasificarFecha = (fechaStr) => {
            if(!fechaStr) return 'fuera';
            const f = new Date(fechaStr); if(isNaN(f.getTime())) return 'fuera';
            const m = f.getMonth(); const a = f.getFullYear();
            
            if(filtro === 'todo') return 'actual';
            if(filtro === 'mes_actual') {
                if(a === aAct && m === mAct) return 'actual';
                let mPrev = mAct - 1; let aPrev = aAct; if(mPrev < 0) { mPrev = 11; aPrev--; }
                if(a === aPrev && m === mPrev) return 'previo';
            }
            if(filtro === 'mes_pasado') {
                let mPrev = mAct - 1; let aPrev = aAct; if(mPrev < 0) { mPrev = 11; aPrev--; }
                if(a === aPrev && m === mPrev) return 'actual';
                let mPrev2 = mPrev - 1; let aPrev2 = aPrev; if(mPrev2 < 0) { mPrev2 = 11; aPrev2--; }
                if(a === aPrev2 && m === mPrev2) return 'previo';
            }
            if(filtro === 'trimestre_actual') {
                const tAct = Math.floor(mAct / 3); const tFecha = Math.floor(m / 3);
                if(a === aAct && tFecha === tAct) return 'actual';
                let tPrev = tAct - 1; let aPrev = aAct; if(tPrev < 0) { tPrev = 3; aPrev--; }
                if(a === aPrev && tFecha === tPrev) return 'previo';
            }
            if(filtro === 'anio_actual') {
                if(a === aAct) return 'actual';
                if(a === aAct - 1) return 'previo';
            }
            return 'fuera';
        };

        // 1. SEPARACIÓN DE DATOS (ACTUAL VS PREVIO)
        let metrics = { 
            actual: { ventas: 0, ingresos: 0, gastos: 0, neto: 0, desglGastos: {}, desglVentas: {} }, 
            previo: { ventas: 0, ingresos: 0, gastos: 0, neto: 0 } 
        };

        // Análisis de Pedidos (Afecta Ventas e Ingresos)
        (App.state.pedidos || []).forEach(p => {
            const clase = clasificarFecha(p.fecha_creacion);
            if(clase !== 'fuera') {
                metrics[clase].ventas += parseFloat(p.total || 0);
                metrics[clase].ingresos += parseFloat(p.anticipo || 0);
                
                // Desglose Ventas (Solo Actual)
                if(clase === 'actual') {
                    const det = App.state.pedido_detalle.find(d => d.pedido_id === p.id); 
                    const prod = det ? App.state.productos.find(x => x.id === det.producto_id) : null; 
                    let cat = prod ? prod.nombre.toLowerCase() : 'otros';
                    let key = 'Hamacas';
                    if(cat.includes('silla')) key = 'Sillas'; else if(cat.includes('cojin') || cat.includes('cojín')) key = 'Cojines'; else if(cat.includes('accesorio') || cat.includes('hilo')) key = 'Insumos/Accesorios';
                    metrics.actual.desglVentas[key] = (metrics.actual.desglVentas[key] || 0) + parseFloat(p.total||0);
                }
            }
        });

        // Análisis de Reparaciones (Afecta Ventas e Ingresos)
        (App.state.reparaciones || []).forEach(r => {
            const clase = clasificarFecha(r.fecha_creacion);
            if(clase !== 'fuera') {
                metrics[clase].ventas += parseFloat(r.precio || 0);
                metrics[clase].ingresos += parseFloat(r.anticipo || 0);
                if(clase === 'actual') metrics.actual.desglVentas['Reparaciones'] = (metrics.actual.desglVentas['Reparaciones'] || 0) + parseFloat(r.precio||0);
            }
        });

        // Análisis de Abonos Clientes (Afecta Ingresos)
        (App.state.abonos || []).forEach(a => {
            const clase = clasificarFecha(a.fecha);
            if(clase !== 'fuera') metrics[clase].ingresos += parseFloat(a.monto || 0);
        });

        // Análisis de Gastos Operativos (Nómina, Compras, Insumos, Servicios)
        (App.state.gastos || []).forEach(g => {
            const clase = clasificarFecha(g.fecha);
            if(clase !== 'fuera') {
                metrics[clase].gastos += parseFloat(g.monto || 0);
                if(clase === 'actual') {
                    let cat = (g.categoria || 'Otro');
                    metrics.actual.desglGastos[cat] = (metrics.actual.desglGastos[cat] || 0) + parseFloat(g.monto||0);
                }
            }
        });

        // Calculamos el Flujo Neto de ambos periodos
        metrics.actual.neto = metrics.actual.ingresos - metrics.actual.gastos;
        metrics.previo.neto = metrics.previo.ingresos - metrics.previo.gastos;

        // 2. SALDOS GLOBALES (Fotos al día de hoy, sin importar el filtro de fecha)
        let xCobrarGlobal = 0; let xPagarGlobal = 0;
        (App.state.pedidos || []).forEach(p => { const abs = (App.state.abonos||[]).filter(a=>a.pedido_id===p.id).reduce((s,a)=>s+parseFloat(a.monto||0),0); const sal = parseFloat(p.total||0)-parseFloat(p.anticipo||0)-abs; if(sal>0) xCobrarGlobal+=sal; });
        (App.state.reparaciones || []).forEach(r => { const sal = parseFloat(r.precio||0)-parseFloat(r.anticipo||0); if(sal>0) xCobrarGlobal+=sal; });
        (App.state.pago_artesanos || []).forEach(pa => { if(pa.estado === 'pendiente') xPagarGlobal += parseFloat(pa.total||0); });
        (App.state.compras || []).forEach(c => { const pg = c.monto_pagado !== undefined && c.monto_pagado !== "" ? parseFloat(c.monto_pagado) : parseFloat(c.total||0); const deu = parseFloat(c.total||0)-pg; if(deu>0) xPagarGlobal+=deu; });

        // 3. GENERADOR DE TENDENCIAS (Flechitas)
        const getTendencia = (act, prev, inverso = false) => {
            if(filtro === 'todo') return ''; // No hay comparativo
            if(prev === 0 && act === 0) return '<span style="font-size:0.7rem; color:#718096; margin-left:5px;">Igual</span>';
            if(prev === 0 && act > 0) return `<span style="font-size:0.7rem; color:${inverso ? '#E53E3E' : '#38A169'}; margin-left:5px;">⬆️ 100%</span>`;
            const varPorc = ((act - prev) / prev) * 100;
            const dir = varPorc >= 0 ? '⬆️' : '⬇️';
            // Si es inverso (ej. Gastos), subir es malo (rojo), bajar es bueno (verde)
            let color = '#718096';
            if(varPorc > 0) color = inverso ? '#E53E3E' : '#38A169';
            else if(varPorc < 0) color = inverso ? '#38A169' : '#E53E3E';
            
            return `<span style="font-size:0.7rem; color:${color}; margin-left:5px; font-weight:bold;">${dir} ${Math.abs(varPorc).toFixed(1)}% vs ant.</span>`;
        };

        const labels = { todo: "Todo el historial", mes_actual: "Este Mes", mes_pasado: "Mes Pasado", trimestre_actual: "Este Trimestre", anio_actual: "Este Año" };
        const act = metrics.actual; const prev = metrics.previo;

        let html = `<p style="color:var(--text-muted); font-size:0.85rem; margin-top:-10px; margin-bottom:15px; text-transform:uppercase; font-weight:bold;">Periodo: <strong style="color:var(--primary);">${labels[filtro]}</strong></p>`;
        
        // SECCIÓN A: FLUJO DE CAJA (P&L)
        html += `<h4 style="margin-bottom:10px; color:#2D3748; font-size:0.9rem;">1. Rendimiento del Periodo</h4>
        <div class="grid-2">
            <div class="card stat-card" style="background:#EBF8FF; cursor:pointer; padding:15px;" onclick="App.views.detalleFinanzas('ventas', '${filtro}')">
                <div class="label" style="margin-bottom:2px;">Ventas Totales (Comercial)</div>
                <div class="value" style="color:#3182CE; font-size:1.3rem;">$${act.ventas.toFixed(2)}</div>
                ${getTendencia(act.ventas, prev.ventas)}
            </div>
            <div class="card stat-card" style="background:#C6F6D5; cursor:pointer; padding:15px;" onclick="App.views.detalleFinanzas('ingresos', '${filtro}')">
                <div class="label" style="margin-bottom:2px; color:#276749;">Ingresos Reales (Caja)</div>
                <div class="value" style="color:#2F855A; font-size:1.3rem;">$${act.ingresos.toFixed(2)}</div>
                ${getTendencia(act.ingresos, prev.ingresos)}
            </div>
            <div class="card stat-card" style="background:#EDF2F7; cursor:pointer; padding:15px; grid-column: span 2;" onclick="App.views.detalleFinanzas('gastos', '${filtro}')">
                <div class="label" style="margin-bottom:2px;">Gastos Operativos (Pagados)</div>
                <div class="value" style="color:#4A5568; font-size:1.3rem;">$${act.gastos.toFixed(2)}</div>
                ${getTendencia(act.gastos, prev.gastos, true)}
            </div>
        </div>
        <div class="card stat-card" style="margin-top:10px; border:2px solid ${act.neto >= 0 ? '#38A169' : '#E53E3E'}; margin-bottom:25px; padding:15px;">
            <div class="label" style="color:${act.neto >= 0 ? '#276749' : '#9B2C2C'};">Flujo Neto Efectivo (Lo que te quedó en la bolsa)</div>
            <div class="value" style="color:${act.neto >= 0 ? '#38A169' : '#E53E3E'}; font-size:1.5rem;">$${act.neto.toFixed(2)}</div>
            ${getTendencia(act.neto, prev.neto)}
        </div>`;

        // SECCIÓN B: SALDOS (Balance General)
        html += `<h4 style="margin-bottom:10px; color:#2D3748; font-size:0.9rem;">2. Salud Financiera Actual (Global)</h4>
        <div class="grid-2" style="margin-bottom:20px;">
            <div class="card stat-card" style="background:#FEFCBF; cursor:pointer; padding:15px;" onclick="App.views.detalleFinanzas('por_cobrar', 'todo')">
                <div class="label" style="color:#B7791F;">Cuentas por Cobrar (CxC)</div>
                <div class="value" style="color:#D69E2E; font-size:1.2rem;">$${xCobrarGlobal.toFixed(2)}</div>
                <div style="font-size:0.7rem; color:#B7791F; margin-top:5px;">Dinero en la calle</div>
            </div>
            <div class="card stat-card" style="background:#FFF5F5; cursor:pointer; padding:15px;" onclick="App.views.detalleFinanzas('por_pagar', 'todo')">
                <div class="label" style="color:#C53030;">Cuentas por Pagar (CxP)</div>
                <div class="value" style="color:#E53E3E; font-size:1.2rem;">$${xPagarGlobal.toFixed(2)}</div>
                <div style="font-size:0.7rem; color:#C53030; margin-top:5px;">Deuda a proveedores/taller</div>
            </div>
        </div>`;

        // SECCIÓN C: GRÁFICAS
        html += `<div style="background:white; border:1px solid #e2e8f0; border-radius:8px; padding:15px;"><canvas id="graficaFinanzas"></canvas></div>`;
        html += `<div style="display:flex; flex-direction:column; gap:15px; margin-top:15px;"><div style="background:white; border:1px solid #e2e8f0; border-radius:8px; padding:15px; display:flex; flex-direction:column; align-items:center;"><h4 style="text-align:center; margin-bottom:15px; color:var(--text-muted); font-size:0.9rem;">Categorías de Venta 📈</h4><div style="position:relative; width:100%; max-width:280px; aspect-ratio:1;"><canvas id="graficaVentasCanvas"></canvas></div></div><div style="background:white; border:1px solid #e2e8f0; border-radius:8px; padding:15px; display:flex; flex-direction:column; align-items:center;"><h4 style="text-align:center; margin-bottom:15px; color:var(--text-muted); font-size:0.9rem;">Destino de los Gastos 📉</h4><div style="position:relative; width:100%; max-width:280px; aspect-ratio:1;"><canvas id="graficaGastosCanvas"></canvas></div></div></div><button class="btn btn-secondary" style="width:100%; margin-top:15px; border-color:#38A169; color:#38A169; font-weight:bold; background:transparent;" onclick="window.exportarAExcel(App.state.gastos, 'Gastos_${labels[filtro]}')">📥 Exportar Gastos a Excel</button>`;
        
        cont.innerHTML = html;
        
        setTimeout(() => { 
            if(window.Chart) { 
                const colores = ['#4C51BF', '#ED8936', '#38B2AC', '#E53E3E', '#ECC94B', '#805AD5', '#3182CE'];
                const ctx1 = document.getElementById('graficaFinanzas');
                if(ctx1) { if(window.graficaActual) window.graficaActual.destroy(); window.graficaActual = new Chart(ctx1, { type: 'bar', data: { labels: ['Ingresos Caja', 'Salidas Caja'], datasets: [{ label: 'Monto ($)', data: [act.ingresos, act.gastos], backgroundColor: ['#38A169', '#E53E3E'], borderRadius: 4 }] }, options: { responsive: true, plugins: { legend: { display: false } } } }); } 
                const ctxV = document.getElementById('graficaVentasCanvas');
                if(ctxV) { if(window.graficaVentasD) window.graficaVentasD.destroy(); window.graficaVentasD = new Chart(ctxV, { type: 'doughnut', data: { labels: Object.keys(act.desglVentas).map(k=>k.toUpperCase()), datasets: [{ data: Object.values(act.desglVentas), backgroundColor: colores }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels:{font:{size:11}, padding: 15} } } } }); }
                const ctxG = document.getElementById('graficaGastosCanvas');
                if(ctxG) { if(window.graficaGastosD) window.graficaGastosD.destroy(); window.graficaGastosD = new Chart(ctxG, { type: 'doughnut', data: { labels: Object.keys(act.desglGastos).map(k=>k.toUpperCase()), datasets: [{ data: Object.values(act.desglGastos), backgroundColor: colores }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels:{font:{size:11}, padding: 15} } } } }); }
            } 
        }, 300);
    }
});
