// ==========================================
// VISTAS: FINANZAS Y GASTOS (UI MEJORADA)
// ==========================================

App.views.finanzas = function() { 
    document.getElementById('bottom-nav').style.display = 'flex'; 
    
    // Por defecto, carga "Este Mes" para que sea más útil al abrir
    setTimeout(() => App.logic.renderGraficasFinanzas('mes_actual'), 50); 
    
    return `<div class="card" style="padding-top:15px;">
        <h3 class="card-title" style="margin-bottom:15px;">Dashboard Financiero</h3>
        
        <div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 10px; margin-bottom: 15px; scrollbar-width: none; -ms-overflow-style: none;">
            <style>
                .pill-fin { padding: 8px 16px; border-radius: 20px; font-size: 0.85rem; font-weight: bold; border: 1px solid var(--primary); color: var(--primary); background: transparent; cursor: pointer; white-space: nowrap; transition: 0.2s all; }
                .pill-fin.active { background: var(--primary); color: white; }
                /* Ocultar barra de scroll en Webkit */
                .pill-fin-container::-webkit-scrollbar { display: none; }
            </style>
            <button class="pill-fin active" onclick="document.querySelectorAll('.pill-fin').forEach(b=>b.classList.remove('active')); this.classList.add('active'); App.logic.renderGraficasFinanzas('mes_actual')">Este Mes</button>
            <button class="pill-fin" onclick="document.querySelectorAll('.pill-fin').forEach(b=>b.classList.remove('active')); this.classList.add('active'); App.logic.renderGraficasFinanzas('mes_pasado')">Mes Pasado</button>
            <button class="pill-fin" onclick="document.querySelectorAll('.pill-fin').forEach(b=>b.classList.remove('active')); this.classList.add('active'); App.logic.renderGraficasFinanzas('trimestre_actual')">Este Trimestre</button>
            <button class="pill-fin" onclick="document.querySelectorAll('.pill-fin').forEach(b=>b.classList.remove('active')); this.classList.add('active'); App.logic.renderGraficasFinanzas('anio_actual')">Este Año</button>
            <button class="pill-fin" onclick="document.querySelectorAll('.pill-fin').forEach(b=>b.classList.remove('active')); this.classList.add('active'); App.logic.renderGraficasFinanzas('todo')">Historial Completo</button>
        </div>
        
        <div id="finanzas-contenedor">
            <div style="text-align:center; padding: 30px; color: var(--text-muted);">Cargando finanzas...</div>
        </div>
    </div>
    <button class="fab" style="background: var(--danger);" onclick="App.views.formGasto()">+</button>`; 
};

App.views.detalleFinanzas = function(tipo, filtro) { 
    const hoy = new Date(); let mesActual = hoy.getMonth(); let anioActual = hoy.getFullYear(); let mesPasado = mesActual - 1; let anioPasado = anioActual; if(mesPasado < 0) { mesPasado = 11; anioPasado--; } let triActual = Math.floor(mesActual / 3); 
    const filtrarFecha = (str) => { if(filtro === 'todo') return true; if(!str) return false; const f = new Date(str); if(isNaN(f.getTime())) return false; if(filtro === 'mes_actual') return f.getMonth() === mesActual && f.getFullYear() === anioActual; if(filtro === 'mes_pasado') return f.getMonth() === mesPasado && f.getFullYear() === anioPasado; if(filtro === 'trimestre_actual') return Math.floor(f.getMonth() / 3) === triActual && f.getFullYear() === anioActual; if(filtro === 'anio_actual') return f.getFullYear() === anioActual; return true; }; 
    const pedFiltrados = (App.state.pedidos || []).filter(p => filtrarFecha(p.fecha_creacion)); const aboFiltrados = (App.state.abonos || []).filter(a => filtrarFecha(a.fecha)); const gasFiltrados = (App.state.gastos || []).filter(g => filtrarFecha(g.fecha)); const repFiltradas = (App.state.reparaciones || []).filter(r => filtrarFecha(r.fecha_creacion));
    
    const getEtiqueta = (clienteId) => clienteId === 'STOCK_INTERNO' ? '<span style="color:#D69E2E;">(Bodega)</span>' : '<span style="color:#3182CE;">(Pedido)</span>';

    let html = '<ul style="list-style:none; padding:0; margin:0;">'; 
    if (tipo === 'ventas') { 
        if(pedFiltrados.length===0 && repFiltradas.length===0) html += '<li>No hay ventas ni reparaciones registradas.</li>'; 
        pedFiltrados.forEach(p => { 
            const fecha = p.fecha_creacion ? String(p.fecha_creacion).split('T')[0] : '';
            html += `<li style="padding:8px 0; border-bottom:1px dashed #ccc; display:flex; justify-content:space-between;"><span><strong>${(p.id||'').replace('PED-','')} ${getEtiqueta(p.cliente_id)}</strong><br><small>${fecha}</small></span><span style="color:var(--primary); font-weight:bold;">$${parseFloat(p.total||0).toFixed(2)}</span></li>`; 
        }); 
        repFiltradas.forEach(r => { 
            const fecha = r.fecha_creacion ? String(r.fecha_creacion).split('T')[0] : '';
            html += `<li style="padding:8px 0; border-bottom:1px dashed #ccc; display:flex; justify-content:space-between;"><span><strong>${(r.id||'').replace('REP-','')} <span style="color:#805AD5;">(Rep)</span></strong><br><small>${fecha}</small></span><span style="color:var(--primary); font-weight:bold;">$${parseFloat(r.precio||0).toFixed(2)}</span></li>`; 
        }); 
    } else if (tipo === 'ingresos') { 
        const ants = pedFiltrados.filter(p => parseFloat(p.anticipo||0)>0); const antsRep = repFiltradas.filter(r => parseFloat(r.anticipo||0)>0);
        if(ants.length===0 && aboFiltrados.length===0 && antsRep.length===0) html += '<li>No hay ingresos.</li>'; 
        ants.forEach(p => { 
            const fecha = p.fecha_creacion ? String(p.fecha_creacion).split('T')[0] : '';
            html += `<li style="padding:8px 0; border-bottom:1px dashed #ccc; display:flex; justify-content:space-between;"><span><strong>Anticipo ${(p.id||'').replace('PED-','')} ${getEtiqueta(p.cliente_id)}</strong><br><small>${fecha}</small></span><span style="color:var(--success); font-weight:bold;">$${parseFloat(p.anticipo||0).toFixed(2)}</span></li>`; 
        }); 
        antsRep.forEach(r => { 
            const fecha = r.fecha_creacion ? String(r.fecha_creacion).split('T')[0] : '';
            html += `<li style="padding:8px 0; border-bottom:1px dashed #ccc; display:flex; justify-content:space-between;"><span><strong>Pago ${(r.id||'').replace('REP-','')} <span style="color:#805AD5;">(Rep)</span></strong><br><small>${fecha}</small></span><span style="color:var(--success); font-weight:bold;">$${parseFloat(r.anticipo||0).toFixed(2)}</span></li>`; 
        }); 
        aboFiltrados.forEach(a => { 
            const fecha = a.fecha ? String(a.fecha).split('T')[0] : '';
            const p = (App.state.pedidos || []).find(x => x.id === a.pedido_id) || {};
            html += `<li style="padding:8px 0; border-bottom:1px dashed #ccc; display:flex; justify-content:space-between;"><span><strong>Abono a ${(a.pedido_id||'').replace('PED-','')} ${getEtiqueta(p.cliente_id)}</strong><br><small>${fecha}</small></span><span style="color:var(--success); font-weight:bold;">$${parseFloat(a.monto||0).toFixed(2)}</span></li>`; 
        }); 
    } else if (tipo === 'gastos') { 
        if(gasFiltrados.length===0) html += '<li>No hay gastos registrados.</li>'; 
        gasFiltrados.forEach(g => { 
            const fecha = g.fecha ? String(g.fecha).split('T')[0] : '';
            html += `<li style="padding:8px 0; border-bottom:1px dashed #ccc; display:flex; justify-content:space-between; align-items:center;"><span><strong>${App.ui.escapeHTML(g.descripcion || '')}</strong><br><small>${fecha}</small></span><div style="text-align:right;"><span style="color:var(--danger); font-weight:bold; display:block; margin-bottom:5px;">$${parseFloat(g.monto||0).toFixed(2)}</span><button class="btn btn-secondary" style="padding:2px 6px; font-size:0.7rem; margin-right:4px;" onclick="App.ui.closeSheet(); setTimeout(()=>App.views.formGasto('${g.id}'), 300)">✏️</button><button class="btn btn-secondary" style="padding:2px 6px; font-size:0.7rem; color:red; border-color:red;" onclick="App.ui.closeSheet(); App.logic.eliminarRegistroGenerico('gastos', '${g.id}', 'gastos')">🗑️</button></div></li>`; 
        }); 
    } else if (tipo === 'por_cobrar') { 
        let hayCobros = false; 
        (App.state.pedidos || []).forEach(p => { 
            const abonos = (App.state.abonos || []).filter(a => a.pedido_id === p.id).reduce((s,a)=>s+parseFloat(a.monto||0),0); 
            const saldo = parseFloat(p.total||0) - parseFloat(p.anticipo||0) - abonos; 
            if(saldo > 0) { 
                hayCobros=true; 
                const fecha = p.fecha_creacion ? String(p.fecha_creacion).split('T')[0] : '';
                html += `<li style="padding:8px 0; border-bottom:1px dashed #ccc; display:flex; justify-content:space-between;"><span><strong>${(p.id||'').replace('PED-','')} ${getEtiqueta(p.cliente_id)}</strong><br><small>${fecha}</small></span><span style="color:#D69E2E; font-weight:bold;">$${saldo.toFixed(2)}</span></li>`; 
            } 
        }); 
        (App.state.reparaciones || []).forEach(r => { 
            const saldo = parseFloat(r.precio||0) - parseFloat(r.anticipo||0); 
            if(saldo > 0) { 
                hayCobros=true; 
                const fecha = r.fecha_creacion ? String(r.fecha_creacion).split('T')[0] : '';
                html += `<li style="padding:8px 0; border-bottom:1px dashed #ccc; display:flex; justify-content:space-between;"><span><strong>${(r.id||'').replace('REP-','')} <span style="color:#805AD5;">(Rep)</span></strong><br><small>${fecha}</small></span><span style="color:#D69E2E; font-weight:bold;">$${saldo.toFixed(2)}</span></li>`; 
            } 
        });
        if(!hayCobros) html += '<li>No hay saldo pendiente.</li>'; 
    } else if (tipo === 'por_pagar') { 
        let hayDeudas = false; 
        (App.state.pago_artesanos || []).forEach(pa => { 
            if(pa.estado === 'pendiente') { 
                hayDeudas=true; 
                const a = (App.state.artesanos || []).find(x => x.id === pa.artesano_id); 
                const fecha = pa.fecha ? String(pa.fecha).split('T')[0] : '';
                html += `<li style="padding:8px 0; border-bottom:1px dashed #ccc; display:flex; justify-content:space-between;"><span><strong>${a?a.nombre:'Artesano'} (Nómina)</strong><br><small>${fecha}</small></span><span style="color:#E53E3E; font-weight:bold;">$${parseFloat(pa.total||0).toFixed(2)}</span></li>`; 
            } 
        }); 
        (App.state.compras || []).forEach(c => { 
            const pagado = c.monto_pagado !== undefined && c.monto_pagado !== "" ? parseFloat(c.monto_pagado) : parseFloat(c.total||0);
            const deuda = parseFloat(c.total||0) - pagado; 
            if(deuda > 0) { 
                hayDeudas=true; 
                const pv = (App.state.proveedores || []).find(x => x.id === c.proveedor_id); 
                const fecha = c.fecha ? String(c.fecha).split('T')[0] : '';
                html += `<li style="padding:8px 0; border-bottom:1px dashed #ccc; display:flex; justify-content:space-between;"><span><strong>${pv?pv.nombre:'Proveedor'} (Compra)</strong><br><small>${fecha}</small></span><span style="color:#E53E3E; font-weight:bold;">$${deuda.toFixed(2)}</span></li>`; 
            } 
        });
        if(!hayDeudas) html += '<li>No hay deudas por pagar. ¡Estás al día!</li>'; 
    }
    
    html += '</ul><button class="btn btn-primary" style="width:100%; margin-top:15px;" onclick="App.ui.closeSheet()">Cerrar</button>'; 
    App.ui.openSheet(tipo === 'ventas' ? "Detalle de Ventas" : tipo === 'ingresos' ? "Detalle de Ingresos" : tipo === 'gastos' ? "Detalle de Gastos" : tipo === 'por_pagar' ? "Saldos por Pagar" : "Saldos Históricos", html); 
};

App.views.formGasto = function(id = null) { if (typeof id !== 'string') id = null; const obj = id ? App.state.gastos.find(g => g.id === id) : null; let htmlGastos = ''; if(obj) { htmlGastos = `<div class="form-group"><label>Descripción del Gasto</label><input type="text" name="descripcion" value="${App.ui.escapeHTML(obj.descripcion)}" required></div><div class="form-group"><label>Monto ($)</label><input type="number" step="0.01" name="monto" value="${obj.monto}" required></div>`; } else { htmlGastos = `<div id="cont-gastos"><div class="grid-2 fila-dinamica" style="margin-bottom: 5px;"><div class="form-group" style="margin:0;"><input type="text" name="descripcion[]" placeholder="Descripción" required></div><div class="form-group" style="margin:0; display:flex; gap:5px;"><input type="number" step="0.01" name="monto[]" placeholder="$ Monto" required></div></div></div><button type="button" class="btn btn-secondary" style="width:100%; margin-top:10px; margin-bottom:15px; border:1px dashed var(--danger); color:var(--danger); background: transparent;" onclick="window.agregarFilaGasto()">+ Añadir Gasto a la lista</button>`; } const formHTML = `<form id="dynamic-form"><div class="form-group"><label>Categoría</label><select name="categoria" required><option value="Materiales e Insumos" ${obj && obj.categoria === 'Materiales e Insumos' ? 'selected' : ''}>Materiales (Hilos, Accesorios)</option><option value="Hamacas (Reventa)" ${obj && obj.categoria === 'Hamacas (Reventa)' ? 'selected' : ''}>Hamacas (Reventa)</option><option value="Servicios y Otros" ${obj && obj.categoria === 'Servicios y Otros' ? 'selected' : ''}>Servicios</option><option value="Nómina Artesanos" ${obj && obj.categoria === 'Nómina Artesanos' ? 'selected' : ''}>Nómina</option><option value="Otros Gastos" ${obj && obj.categoria === 'Otros Gastos' ? 'selected' : ''}>Otro</option></select></div><div class="form-group"><label>Fecha</label><input type="date" name="fecha" value="${obj ? obj.fecha : new Date().toISOString().split('T')[0]}" required></div>${htmlGastos}<button type="submit" class="btn btn-primary" style="width: 100%; background: var(--danger); border-color: var(--danger);">${obj ? 'Guardar Cambios' : 'Registrar Gastos'}</button></form>`; App.ui.openSheet(obj ? "Editar Gasto" : "Nuevos Gastos Múltiples", formHTML, (data) => { if (obj) App.logic.actualizarRegistroGenerico("gastos", id, data, "gastos"); else App.logic.guardarMultiplesGastos(data); }); };
