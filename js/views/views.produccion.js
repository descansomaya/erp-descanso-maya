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

// Se mantienen intactos: formOrdenStock, formCerrarOrden, nomina, detalleNomina, reparaciones, formNuevaReparacion.
// Asegúrate de copiar el resto del código que ya tenías en views.produccion.js aquí abajo.
