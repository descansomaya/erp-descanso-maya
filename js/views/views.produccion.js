// ==========================================
// VISTAS: TALLER Y PRODUCCIÓN
// ==========================================

// ==========================================
// VISTAS: TALLER Y PRODUCCIÓN (V60 - ROBUSTO)
// ==========================================

App.views.produccion = function() { 
    document.getElementById('bottom-nav').style.display = 'flex'; 
    const pendientes = (App.state.ordenes_produccion||[]).filter(o => o.estado === 'pendiente' || !o.estado); 
    const enProceso = (App.state.ordenes_produccion||[]).filter(o => o.estado === 'en_proceso'); 
    const enRevision = (App.state.ordenes_produccion||[]).filter(o => o.estado === 'revision'); 
    const listas = (App.state.ordenes_produccion||[]).filter(o => o.estado === 'listo'); 
    
    const dibujarTarjeta = (orden) => { 
        const detalle = App.state.pedido_detalle.find(d => d.id === orden.pedido_detalle_id) || App.state.pedido_detalle.find(d => d.pedido_id === orden.pedido_detalle_id) || {}; 
        const producto = detalle.producto_id ? App.state.productos.find(p => p.id === detalle.producto_id) : null; 
        const pedido = App.state.pedidos.find(p => p.id === detalle.pedido_id) || {}; 
        
        let nombreCliente = 'Sin Cliente'; let badgeDestino = '';
        if(pedido.cliente_id === "STOCK_INTERNO") { 
            nombreCliente = "📦 BODEGA"; 
            badgeDestino = '<span style="background:#EBF8FF; color:#2B6CB0; padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:bold; border: 1px solid #90CDF4;">PARA STOCK</span>';
        } else if (pedido.cliente_id) { 
            const clienteObj = App.state.clientes.find(c => c.id === pedido.cliente_id); 
            if(clienteObj) nombreCliente = App.ui.escapeHTML(clienteObj.nombre); 
            badgeDestino = '<span style="background:#FFF5F5; color:#C53030; padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:bold; border: 1px solid #FEB2B2;">PARA CLIENTE</span>';
        } 
        
        const pagos = App.state.pago_artesanos.filter(p => p.orden_id === orden.id); 
        let infoArtesanos = pagos.length > 0 ? `🛠️ ${pagos.length} Asignaciones` : '<span style="color:#E53E3E;">⚠️ Sin artesanos asignados</span>'; 
        
        let semaforo = ''; 
        if(pedido.fecha_entrega && orden.estado !== 'listo') { 
            const fEnt = new Date(pedido.fecha_entrega+'T00:00:00'); const hoy = new Date(); hoy.setHours(0,0,0,0); const d = Math.ceil((fEnt - hoy)/(1000*60*60*24)); 
            if(d < 0) semaforo = '<span style="background:red; color:white; padding:2px 6px; border-radius:4px; font-size:0.7rem; margin-left:5px;">🔴 Atrasado</span>'; 
            else if(d <= 1) semaforo = '<span style="background:orange; color:white; padding:2px 6px; border-radius:4px; font-size:0.7rem; margin-left:5px;">🟡 Urgente</span>'; 
            else semaforo = '<span style="background:green; color:white; padding:2px 6px; border-radius:4px; font-size:0.7rem; margin-left:5px;">🟢 A tiempo</span>'; 
        } 
        
        return `<div class="card" style="border: 1px solid var(--border); box-shadow: none; cursor: pointer; margin-bottom: 10px;" onclick="App.views.modalEditarOrden('${orden.id}')"><div style="display:flex; justify-content:space-between; margin-bottom:5px;"><strong>${orden.id}</strong><div>${badgeDestino}${semaforo}</div></div><small style="color: var(--primary); font-weight: 600; display:block; font-size:1rem; margin-bottom:2px;">${producto ? App.ui.escapeHTML(producto.nombre) : 'Producto interno'}</small><small style="color: #4A5568; display:block; margin-bottom:5px; font-weight:bold;">👤 ${nombreCliente}</small><div style="margin-top: 8px; font-size: 0.85rem; color: var(--text-muted); display:flex; justify-content: space-between; border-top: 1px dashed #E2E8F0; padding-top: 8px;"><span>${infoArtesanos}</span><span style="color:var(--primary);">Configurar ➔</span></div></div>`; 
    }; 
    
    let html = `<div class="card"><h3 class="card-title">Taller de Producción</h3><button class="btn btn-secondary" style="width:100%; margin-top:5px; border: 2px dashed var(--primary); color: var(--primary); background: transparent; font-weight: bold;" onclick="App.views.formOrdenStock()">+ 🔨 Fabricar para Bodega</button></div>
    <div style="display: flex; margin-bottom: 15px; background: white; border-radius: 8px; overflow: hidden; border: 1px solid var(--border); overflow-x: auto;">
        <button class="tab-btn-prod" style="flex:1; min-width:80px; padding: 12px 5px; border:none; background:#F3F0FF; color:var(--primary); font-weight:bold; font-size:0.85rem; border-bottom: 2px solid var(--primary);" onclick="window.switchTabProd('pendientes', this)">Pendiente (${pendientes.length})</button>
        <button class="tab-btn-prod" style="flex:1; min-width:80px; padding: 12px 5px; border:none; background:transparent; color:var(--text-muted); font-weight:bold; font-size:0.85rem; border-bottom: 2px solid transparent;" onclick="window.switchTabProd('en_proceso', this)">Taller (${enProceso.length})</button>
        <button class="tab-btn-prod" style="flex:1; min-width:80px; padding: 12px 5px; border:none; background:transparent; color:var(--text-muted); font-weight:bold; font-size:0.85rem; border-bottom: 2px solid transparent;" onclick="window.switchTabProd('revision', this)">Calidad (${enRevision.length})</button>
        <button class="tab-btn-prod" style="flex:1; min-width:80px; padding: 12px 5px; border:none; background:transparent; color:var(--text-muted); font-weight:bold; font-size:0.85rem; border-bottom: 2px solid transparent;" onclick="window.switchTabProd('listas', this)">Listo (${listas.length})</button>
    </div>
    <div id="tab-pendientes" class="tab-content-prod" style="display:block;">${pendientes.length === 0 ? '<div class="card" style="text-align:center; color:var(--text-muted); padding:30px;">Todo asignado.</div>' : pendientes.map(dibujarTarjeta).join('')}</div>
    <div id="tab-en_proceso" class="tab-content-prod" style="display:none;">${enProceso.length === 0 ? '<div class="card" style="text-align:center; color:var(--text-muted); padding:30px;">Nadie está tejiendo.</div>' : enProceso.map(dibujarTarjeta).join('')}</div>
    <div id="tab-revision" class="tab-content-prod" style="display:none;">${enRevision.length === 0 ? '<div class="card" style="text-align:center; color:var(--text-muted); padding:30px;">No hay hamacas para revisar.</div>' : enRevision.map(dibujarTarjeta).join('')}</div>
    <div id="tab-listas" class="tab-content-prod" style="display:none;">${listas.length === 0 ? '<div class="card" style="text-align:center; color:var(--text-muted); padding:30px;">Historial vacío.</div>' : listas.map(dibujarTarjeta).join('')}</div>`; 
    return html; 
};

App.views.formOrdenStock = function() { const opcionesProductos = App.state.productos.map(p => `<option value="${p.id}">${App.ui.escapeHTML(p.nombre)}</option>`).join(''); const formHTML = `<form id="dynamic-form"><div style="background: #F7FAFC; padding: 10px; border-radius: 8px; margin-bottom: 15px; font-size: 0.85rem; border: 1px solid var(--border);"><strong>Fabricar para Bodega</strong><br>Descontará hilos y enviará el trabajo a artesanos.</div><div class="form-group"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;"><label style="margin:0;">¿Qué vas a fabricar?</label><span style="color:var(--primary); font-size:0.8rem; cursor:pointer; font-weight:bold;" onclick="App.ui.closeSheet(); setTimeout(()=>App.views.formProducto(null, () => App.views.formOrdenStock()), 400);">+ Nuevo Producto</span></div><select name="producto_id" required><option value="">-- Elige un producto --</option>${opcionesProductos}</select></div><div class="form-group"><label>Cantidad a fabricar</label><input type="number" name="cantidad" value="1" min="1" required></div><button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">Mandar a Producción</button></form>`; App.ui.openSheet("Producir para Stock", formHTML, (data) => App.logic.guardarOrdenStock(data)); };
App.views.formMandarProduccion = function(pedidoId) { const pedido = App.state.pedidos.find(p => p.id === pedidoId); const detalle = App.state.pedido_detalle.find(d => d.pedido_id === pedidoId); const producto = App.state.productos.find(p => p.id === detalle.producto_id); let recetaHTML = ''; if (producto) { let counter = 1; while(producto[`mat_${counter}`]) { const matId = producto[`mat_${counter}`]; const cant = parseFloat(producto[`cant_${counter}`]) * (parseInt(detalle.cantidad) || 1); const uso = producto[`uso_${counter}`] || 'Cuerpo'; if(matId) recetaHTML += window.generarFilaRecetaProd(matId, cant, uso); counter++; } } if (recetaHTML === '') recetaHTML = window.generarFilaRecetaProd('','','Cuerpo'); const formHTML = `<form id="dynamic-form"><input type="hidden" name="pedido_id" value="${pedidoId}"><input type="hidden" name="pedido_detalle_id" value="${detalle.id}"><div style="background: #EBF8FF; padding: 10px; border-radius: 8px; margin-bottom: 15px; font-size: 0.85rem; color: #2B6CB0;"><strong>Confirmar Insumos para Producción</strong><br>El inventario se descontará en este momento. Puedes ajustar los colores si el cliente pidió algo especial.</div><div id="cont-receta-prod">${recetaHTML}</div><button type="button" class="btn btn-secondary" style="width:100%; margin-top:10px; border: 1px dashed var(--primary); color: var(--primary); background: transparent;" onclick="window.agregarFilaRecetaProd()">+ Añadir insumo extra</button><button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 15px; background: var(--success); border-color: var(--success);">Confirmar y Enviar a Taller</button></form>`; App.ui.openSheet("Mandar a Producción", formHTML, (data) => App.logic.confirmarMandarProduccion(data)); };

App.views.modalEditarOrden = function(ordenId) { 
    const orden = App.state.ordenes_produccion.find(o => o.id === ordenId); if(!orden) return App.ui.toast("Orden no encontrada."); 
    const detalle = App.state.pedido_detalle.find(d => d.id === orden.pedido_detalle_id) || App.state.pedido_detalle.find(d => d.pedido_id === orden.pedido_detalle_id) || {}; 
    const pedido = App.state.pedidos.find(p => p.id === detalle.pedido_id) || { total: 0, cliente_id: '' }; 
    const pagos = App.state.pago_artesanos.filter(p => p.orden_id === ordenId); 
    
    let costos = { materiales: 0, mano_obra: 0, utilidad: 0, desglose: {Cuerpo:0, Brazos:0, Adicional:0}, totalVenta: 0 };
    costos.totalVenta = pedido.cliente_id === "STOCK_INTERNO" ? 0 : parseFloat(pedido.total || 0);
    costos.mano_obra = pagos.reduce((sum, p) => sum + parseFloat(p.total), 0);

    let htmlCostos = `<div style="background:#F0FFF4; padding:10px; border-radius:6px; margin-bottom:15px; border:1px solid #C6F6D5;"><h4 style="margin-bottom:5px; color:#276749;">📊 Rentabilidad de la Orden</h4>`;

    if (orden.estado === 'listo' && orden.costos_finales) {
        try {
            const cf = JSON.parse(orden.costos_finales); costos.materiales = cf.materiales; costos.desglose = cf.desglose_materiales || costos.desglose; costos.utilidad = cf.utilidad; costos.totalVenta = cf.precio_venta !== undefined ? cf.precio_venta : costos.totalVenta;
        } catch(e) {}
        htmlCostos += `<div style="background:#C6F6D5; color:#276749; padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:bold; margin-bottom:10px; display:inline-block;">✅ COSTEO REAL (CERRADO)</div>`;
    } else {
        try {
            if(orden.receta_personalizada) {
                const receta = JSON.parse(orden.receta_personalizada);
                receta.forEach(item => {
                    const mat = App.state.inventario.find(m => m.id === item.mat_id);
                    if(mat) { let c = (parseFloat(item.cant) * parseFloat(mat.costo_unitario || 0)); costos.materiales += c; const u = item.uso || 'Cuerpo'; if(costos.desglose[u] !== undefined) costos.desglose[u] += c; else costos.desglose['Adicional'] += c; }
                });
            }
        } catch(e) {}
        costos.utilidad = costos.totalVenta - costos.materiales - costos.mano_obra;
        htmlCostos += `<div style="background:#FEFCBF; color:#B7791F; padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:bold; margin-bottom:10px; display:inline-block;">⏳ ESTIMACIÓN TEÓRICA</div>`;
    }

    let margen = costos.totalVenta > 0 ? ((costos.utilidad / costos.totalVenta) * 100).toFixed(1) : 0;
    let colorUtilidad = costos.utilidad > 0 ? 'var(--success)' : 'var(--danger)';
    let textoVenta = pedido.cliente_id === "STOCK_INTERNO" ? '<span style="color:#D69E2E">Inversión a Bodega</span>' : `$${costos.totalVenta.toFixed(2)}`;

    htmlCostos += `
        <div style="display:flex; justify-content:space-between; font-size:0.85rem;"><span style="color:var(--text-muted);">Precio Venta:</span> <strong>${textoVenta}</strong></div>
        <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-top:6px;"><span style="color:var(--danger);">- Hilos (Materiales):</span> <strong style="color:var(--danger);">-$${costos.materiales.toFixed(2)}</strong></div>
        <div style="display:flex; justify-content:space-between; font-size:0.85rem;"><span style="color:var(--danger);">- Mano de Obra:</span> <strong style="color:var(--danger);">-$${costos.mano_obra.toFixed(2)}</strong></div>
        <hr style="margin:10px 0; border-top:1px dashed #9AE6B4;">
        <div style="display:flex; justify-content:space-between; font-size:1.1rem; color:${colorUtilidad};"><span>${pedido.cliente_id === "STOCK_INTERNO" ? 'Costo de Producción:' : 'Utilidad Limpia:'}</span> <strong>$${Math.abs(costos.utilidad).toFixed(2)} <small style="font-size:0.8rem;">${pedido.cliente_id !== "STOCK_INTERNO" ? '('+margen+'%)':''}</small></strong></div>
    </div>`;

    // Visor de Historial (Trazabilidad)
    let htmlHistorial = '';
    try {
        if(orden.historial_eventos) {
            const histArray = JSON.parse(orden.historial_eventos);
            htmlHistorial = `<div style="margin-bottom:15px; font-size:0.8rem; background:#f7fafc; padding:10px; border-radius:6px; border:1px solid #e2e8f0;"><strong style="color:#4A5568;">🕒 Bitácora de Trazabilidad:</strong><ul style="margin-top:5px; padding-left:20px; color:#718096;">`;
            histArray.slice(-3).forEach(h => { // Mostrar solo los últimos 3
                const fStr = new Date(h.fecha).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
                htmlHistorial += `<li><strong>${fStr}</strong>: ${App.ui.escapeHTML(h.nota)}</li>`;
            });
            htmlHistorial += `</ul></div>`;
        }
    } catch(e) {}

    let pagosHTML = '<div style="margin-bottom:15px;"><strong>🛠️ Trabajos Asignados:</strong><br>'; 
    if(pagos.length === 0) pagosHTML += '<small style="color:#E53E3E; font-weight:bold;">¡Atención! No has asignado artesanos.</small>'; 
    pagos.forEach(p => { 
        const art = App.state.artesanos.find(a => a.id === p.artesano_id); 
        const partesID = p.id.split('-'); const nombreTarea = partesID.length > 2 ? partesID.slice(2).join(' ') : 'Trabajo general'; 
        pagosHTML += `<div style="display:flex; justify-content:space-between; background:#F7FAFC; padding:8px; margin-top:5px; border-radius:4px; font-size:0.85rem; border:1px solid #E2E8F0;"><span>🧑‍🎨 <strong>${art ? App.ui.escapeHTML(art.nombre) : 'Desc'}</strong> - <em>${App.ui.escapeHTML(nombreTarea)}</em></span><span><strong style="color:var(--success); margin-right:8px;">$${p.total}</strong> <span style="cursor:pointer; color:red;" onclick="App.ui.closeSheet(); App.logic.eliminarRegistroGenerico('pago_artesanos', '${p.id}', 'pago_artesanos');">🗑️</span></span></div>`; 
    }); 
    pagosHTML += `</div>`; 
    pagosHTML += `<button type="button" class="btn btn-secondary" style="width:100%; margin-bottom:10px; border-style:dashed;" onclick="App.ui.closeSheet(); setTimeout(()=>App.views.formAgregarTrabajo('${ordenId}', false), 300);">+ Asignar Tarea / Artesano</button>`; 
    
    // Ocultar cambiar estado si ya está listo
    let selectorEstado = '';
    if(orden.estado !== 'listo') {
        selectorEstado = `<div class="form-group"><label>Mover Orden de Taller a:</label><select name="estado"><option value="pendiente" ${orden.estado === 'pendiente' ? 'selected' : ''}>⏳ Pendiente (Cola de trabajo)</option><option value="en_proceso" ${orden.estado === 'en_proceso' ? 'selected' : ''}>🏃 En Proceso (Tejiendo)</option><option value="revision" ${orden.estado === 'revision' ? 'selected' : ''}>🔍 Control de Calidad</option><option value="listo" ${orden.estado === 'listo' ? 'selected' : ''}>✅ ¡Aprobar y Cerrar Producción!</option></select></div><button type="submit" class="btn btn-primary" style="width: 100%;">Cambiar Fase</button>`;
    } else {
        selectorEstado = `<button type="button" class="btn btn-secondary" style="width: 100%; background:#f0f0f0; color:#aaa; cursor:not-allowed;" disabled>Esta orden ya fue costeada y cerrada.</button>`;
    }

    const formHTML = `<form id="dynamic-form">${htmlHistorial}${htmlCostos}${pagosHTML}${selectorEstado}</form>`; 
    App.ui.openSheet(`Ficha de Producción`, formHTML, (datos) => App.logic.procesarCambioOrden(ordenId, datos)); 
};

App.views.formAgregarTrabajo = function(ordenId, esReparacion = false) { const opcArt = App.state.artesanos.map(a => `<option value="${a.id}">${App.ui.escapeHTML(a.nombre)}</option>`).join(''); const formHTML = `<form id="dynamic-form"><div class="form-group"><label>Artesano</label><select name="artesano_id" required onchange="window.cargarTarifas(this.value)"><option value="">-- Selecciona --</option>${opcArt}</select></div><div class="form-group"><label>Tarea a Realizar</label><select name="tarea_val" id="select-tarifas" required onchange="window.calcTotalTrabajo()"><option value="">-- Elige un artesano primero --</option></select></div><input type="hidden" name="tarea_nombre" id="tarea_nombre"><div class="form-group"><label>Cantidad (Ej. 7 hilos, o 1 pza)</label><input type="number" step="0.1" name="cantidad" id="cant-trabajo" value="1" required oninput="window.calcTotalTrabajo()"></div><div class="form-group"><label>Total a Pagar ($)</label><input type="number" step="0.01" name="total" id="total-trabajo" required readonly style="background:#f0f0f0;"></div><button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">Guardar Trabajo</button></form>`; App.ui.openSheet("Añadir Tarea", formHTML, (data) => App.logic.guardarTrabajoOrden(ordenId, data, esReparacion)); };

App.views.formCerrarOrden = function(ordenId) { 
    const orden = App.state.ordenes_produccion.find(o => o.id === ordenId); 
    const detalle = App.state.pedido_detalle.find(d => d.id === orden.pedido_detalle_id) || App.state.pedido_detalle.find(d => d.pedido_id === orden.pedido_detalle_id) || {}; 
    const producto = detalle.producto_id ? App.state.productos.find(p => p.id === detalle.producto_id) : { nombre: 'Hamaca', tubos_hilo: 0 }; 
    let materialesHTML = ''; let recetaGuardada = null; try { if(orden.receta_personalizada) recetaGuardada = JSON.parse(orden.receta_personalizada); } catch(e){} 
    
    if (recetaGuardada && recetaGuardada.length > 0) { 
        recetaGuardada.forEach((item, index) => { 
            const material = App.state.inventario.find(m => m.id === item.mat_id); 
            if(material) { 
                const usoMat = item.uso || 'Cuerpo';
                materialesHTML += `<div class="form-group" style="margin-bottom:8px; background: white; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0;"><label>${App.ui.escapeHTML(material.nombre)} <strong style="color:var(--primary);">[${usoMat.toUpperCase()}]</strong></label><input type="hidden" name="mat_${index+1}_id" value="${item.mat_id}"><input type="hidden" name="mat_${index+1}_teorico" value="${item.cant}"><input type="hidden" name="mat_${index+1}_uso" value="${usoMat}"><div style="display:flex; align-items:center; gap: 10px;"><span style="font-size:0.8rem;">Consumo Real:</span><input type="number" step="0.1" name="mat_${index+1}_real" value="${item.cant}" required style="flex:1;"></div></div>`; 
            } 
        }); 
    } else { 
        for(let i=1; i<=20; i++){ 
            const matId = producto[`mat_${i}`]; const cant = parseFloat(producto[`cant_${i}`]); const uso = producto[`uso_${i}`] || 'Cuerpo'; 
            if(matId && cant > 0) { 
                const material = App.state.inventario.find(m => m.id === matId); const consumoTeorico = cant * parseInt(detalle.cantidad || 1); 
                materialesHTML += `<div class="form-group" style="margin-bottom:8px; background: white; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0;"><label>${material ? App.ui.escapeHTML(material.nombre) : 'Insumo'} <strong style="color:var(--primary);">[${uso.toUpperCase()}]</strong></label><input type="hidden" name="mat_${i}_id" value="${matId}"><input type="hidden" name="mat_${i}_teorico" value="${consumoTeorico}"><input type="hidden" name="mat_${i}_uso" value="${uso}"><div style="display:flex; align-items:center; gap: 10px;"><span style="font-size:0.8rem;">Consumo Real:</span><input type="number" step="0.1" name="mat_${i}_real" value="${consumoTeorico}" required style="flex:1;"></div></div>`; 
            } 
        } 
    } 
    if(materialesHTML === '') materialesHTML = '<p style="color:var(--text-muted); font-size:0.8rem;">No hay insumos a descontar para este producto.</p>'; 
    const formHTML = `<div style="background: #EBF8FF; padding: 10px; border-radius: 8px; margin-bottom: 15px; font-size: 0.9rem; color: #2B6CB0;"><strong>Cierre de Producción</strong><br>Producto: ${App.ui.escapeHTML(producto.nombre)}</div><form id="dynamic-form"><input type="hidden" name="orden_id" value="${ordenId}"><p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:10px;">Si hubo merma y usaron más hilo del apartado, ajústalo aquí para el costeo final.</p>${materialesHTML}<div style="margin-top: 15px; padding: 10px; background: #E2E8F0; border-radius: 6px;"><label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" name="sumar_stock" value="1" style="width:20px; height:20px;"><strong>Guardar en mi Bodega Física</strong></label><small style="color:var(--text-muted); display:block; margin-top:5px;">Márcalo si esta hamaca es para stock interno de reventa.</small></div><button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 15px; background: var(--success); border-color: var(--success);">Finalizar Orden</button></form>`; 
    App.ui.openSheet("Cerrar Orden", formHTML, (datos) => App.logic.cerrarOrdenProduccion(datos)); 
};

App.views.nomina = function() { document.getElementById('bottom-nav').style.display = 'flex'; let html = `<div class="card"><h3 class="card-title">Nómina de Artesanos</h3>`; const pagosPorArtesano = {}; App.state.artesanos.forEach(a => { pagosPorArtesano[a.id] = { nombre: a.nombre, totalPendiente: 0, trabajos: [] }; }); App.state.pago_artesanos.forEach(p => { if (p.estado === 'pendiente' && pagosPorArtesano[p.artesano_id]) { pagosPorArtesano[p.artesano_id].totalPendiente += parseFloat(p.total); pagosPorArtesano[p.artesano_id].trabajos.push(p); } }); let hayPendientes = false; for (const [id, data] of Object.entries(pagosPorArtesano)) { if (data.totalPendiente > 0) { hayPendientes = true; html += `<div class="card" style="border: 1px solid var(--border); box-shadow: none;"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;"><strong>🧑‍🎨 ${App.ui.escapeHTML(data.nombre)}</strong><strong style="color: var(--danger); font-size: 1.1rem;">$${data.totalPendiente}</strong></div><div style="display: flex; gap: 10px;"><button class="btn btn-secondary" style="flex: 1; border-color: var(--primary); color: var(--primary); background: transparent;" onclick="App.views.detalleNominaArtesano('${id}')">📋 Ver Detalles</button><button class="btn btn-primary" style="flex: 1; background: var(--success); border-color: var(--success);" onclick="if(confirm('¿Liquidar $${data.totalPendiente} a ${App.ui.escapeHTML(data.nombre)}?')) App.logic.liquidarNomina('${id}')">💵 Liquidar</button></div></div>`; } } if (!hayPendientes) html += `<p style="color: var(--text-muted);">No hay pagos pendientes. Todo está al día. ✨</p>`; html += `</div>`; return html; };
App.views.detalleNominaArtesano = function(artesanoId) { const artesano = App.state.artesanos.find(a => a.id === artesanoId); const pagosPendientes = App.state.pago_artesanos.filter(p => p.artesano_id === artesanoId && p.estado === 'pendiente'); let html = `<div style="margin-bottom:15px;"><p style="color:var(--text-muted); font-size:0.85rem;">Trabajos sin pagar de <strong>${App.ui.escapeHTML(artesano.nombre)}</strong>:</p><ul style="list-style:none; padding:0; margin:0;">`; pagosPendientes.forEach(p => { const orden = App.state.ordenes_produccion.find(o => o.id === p.orden_id); let nombreProducto = 'Orden ' + p.orden_id.replace('ORD-',''); if(orden) { const detalle = App.state.pedido_detalle.find(d => d.id === orden.pedido_detalle_id); if(detalle) { const prod = App.state.productos.find(pr => pr.id === detalle.producto_id); if(prod) nombreProducto = App.ui.escapeHTML(prod.nombre); } } const partesID = p.id.split('-'); const nombreTarea = partesID.length > 2 ? partesID.slice(2).join(' ') : 'Trabajo general'; html += `<li style="padding:10px 0; border-bottom:1px dashed #ccc; display:flex; justify-content:space-between; align-items:center;"><div><strong>${App.ui.escapeHTML(nombreTarea)}</strong><br><small style="color:var(--text-muted);">${nombreProducto}</small><br><small style="color:var(--text-muted);">${p.fecha.split('T')[0]}</small></div><div style="text-align:right;"><span style="color:var(--danger); font-weight:bold; display:block; margin-bottom:5px;">$${p.total}</span><button class="btn btn-secondary" style="padding:2px 6px; font-size:0.7rem; color:red; border-color:red;" onclick="App.ui.closeSheet(); App.logic.eliminarRegistroGenerico('pago_artesanos', '${p.id}', 'pago_artesanos')">🗑️ Cancelar</button></div></li>`; }); html += `</ul><button class="btn btn-primary" style="width:100%; margin-top:15px;" onclick="App.ui.closeSheet()">Cerrar</button></div>`; App.ui.openSheet(`Detalle de Nómina`, html); };

App.views.reparaciones = function() { 
    document.getElementById('bottom-nav').style.display = 'flex'; 
    let html = `<div class="card"><h3 class="card-title">Reparaciones</h3>`; 
    [...App.state.reparaciones].reverse().forEach(r => { 
        const c = App.state.clientes.find(cli => cli.id === r.cliente_id); 
        const pagos = App.state.pago_artesanos.filter(p => p.orden_id === r.id); 
        let infoArtesanos = pagos.length > 0 ? `🛠️ ${pagos.length} Trabajos asignados` : '👤 Sin asignar'; 
        const estaLista = r.estado === 'entregada'; 
        html += `<div class="card" style="border: 1px solid var(--border); box-shadow: none;"><div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><strong>${r.id} - ${c ? App.ui.escapeHTML(c.nombre) : 'Cliente'}</strong><span class="badge ${estaLista ? 'listo' : 'pendiente'}">${String(r.estado || 'recibida').toUpperCase()}</span></div><p style="color: var(--primary); font-size: 0.9rem; font-weight: bold; margin-bottom: 5px;">${App.ui.escapeHTML(r.descripcion) || 'Reparación'}</p><div style="font-size:0.8rem; margin-bottom:5px; color:#4A5568; display:flex; justify-content:space-between;"><span>Cobro: <strong>$${r.precio || 0}</strong></span> <span>Pagado: <strong style="color:var(--success);">$${r.anticipo||0}</strong></span></div><div style="font-size:0.8rem; margin-bottom:10px; color:#4A5568;">${infoArtesanos}</div><div style="display:flex; justify-content:space-between; gap:5px; margin-bottom: 8px;">`; 
        if(!estaLista) { 
            html += `<button class="btn btn-secondary" style="font-size:0.8rem; padding:6px; flex:1;" onclick="App.views.formAgregarTrabajo('${r.id}', true)">+ Tarea Artesano</button>`; 
            html += `<button class="btn btn-primary" style="font-size:0.8rem; padding:6px; background:var(--success); border-color:var(--success); flex:1;" onclick="App.logic.actualizarReparacion('${r.id}', 'entregada')">✔ Marcar Lista</button>`; 
        } 
        html += `</div><div style="display:flex; gap:5px;"><button class="btn btn-secondary" style="padding:6px; font-size:0.8rem; flex:1; color:var(--primary); border-color:var(--primary);" onclick="App.logic.imprimirTicketReparacion('${r.id}')">🖨️ Ticket</button><button class="btn btn-secondary" style="padding:6px; font-size:0.8rem; flex:1;" onclick="App.views.formNuevaReparacion('${r.id}')">✏️ Editar</button><button class="btn btn-secondary" style="padding:6px; font-size:0.8rem; color:red;" onclick="App.logic.eliminarReparacion('${r.id}')">🗑️</button></div></div>`; 
    }); 
    return html += `</div><button class="fab" onclick="App.views.formNuevaReparacion()">+</button>`; 
};
App.views.formNuevaReparacion = function(id = null) { const obj = id ? App.state.reparaciones.find(r => r.id === id) : null; const opcionesClientes = App.state.clientes.map(c => `<option value="${c.id}" ${obj && obj.cliente_id === c.id ? 'selected' : ''}>${App.ui.escapeHTML(c.nombre)}</option>`).join(''); const formHTML = `<form id="dynamic-form"><div class="form-group"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;"><label style="margin:0;">Cliente</label><span style="color:var(--primary); font-size:0.8rem; cursor:pointer; font-weight:bold;" onclick="App.ui.closeSheet(); setTimeout(()=>App.views.formCliente(null, () => App.views.formNuevaReparacion('${id||''}')), 400);">+ Nuevo Cliente</span></div><select name="cliente_id" required><option value="">-- Elige un cliente --</option>${opcionesClientes}</select></div><div class="form-group"><label>Descripción del Problema</label><input type="text" name="descripcion" value="${obj ? App.ui.escapeHTML(obj.descripcion) : ''}" required placeholder="Ej. Cambio de brazos"></div><div class="form-group"><label>Costo Total de la Reparación ($)</label><input type="number" step="0.01" name="precio" value="${obj ? obj.precio : ''}" required></div><div class="form-group"><label>Importe Pagado / Anticipo ($)</label><input type="number" step="0.01" name="anticipo" value="${obj ? obj.anticipo : '0'}" required></div>${obj ? `<div class="form-group"><label>Estado</label><select name="estado"><option value="recibida" ${obj.estado === 'recibida' ? 'selected' : ''}>Recibida / Pendiente</option><option value="entregada" ${obj.estado === 'entregada' ? 'selected' : ''}>Lista / Entregada</option></select></div>` : ''}<button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">${obj ? 'Guardar Cambios' : 'Registrar Reparación'}</button></form>`; App.ui.openSheet(obj ? "Editar Reparación" : "Nueva Reparación", formHTML, (data) => { if (obj) App.logic.actualizarRegistroGenerico("reparaciones", id, data, "reparaciones"); else App.logic.guardarNuevaReparacion(data); }); };
