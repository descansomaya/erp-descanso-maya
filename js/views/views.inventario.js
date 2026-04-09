// ==========================================
// VISTAS: INVENTARIO, COMPRAS Y KARDEX (REDISEÑADO)
// ==========================================

App.views.inventario = function() { 
    document.getElementById('app-header-title').innerText = "Inventario";
    document.getElementById('app-header-subtitle').innerText = "Control de insumos y reventa";

    let html = `
    <div class="dm-section">
        <div class="dm-row-between dm-mb-4">
            <input type="text" id="bus-inv" class="dm-input" onkeyup="window.filtrarLista('bus-inv', 'dm-list-card')" placeholder="🔍 Buscar insumo..." style="max-width: 300px;">
            <button class="dm-btn dm-btn-secondary" onclick="window.exportarAExcel(App.state.inventario, 'Inventario')">📥 Exportar</button>
        </div>
        
        <div class="dm-list">`; 

    if (!App.state.inventario || App.state.inventario.length === 0) { 
        html += `<div class="dm-alert dm-alert-info">No hay insumos registrados.</div>`; 
    } else { 
        App.state.inventario.forEach(i => { 
            const real = parseFloat(i.stock_real||0);
            const reservado = parseFloat(i.stock_reservado||0);
            const comprometido = parseFloat(i.stock_comprometido||0);
            const libre = real - reservado - comprometido;
            const badgeClass = (parseFloat(i.stock_minimo)>0 && libre <= parseFloat(i.stock_minimo)) ? 'dm-badge-danger' : 'dm-badge-success';
            
            html += `
            <div class="dm-list-card">
                <div class="dm-list-card-top">
                    <div>
                        <div class="dm-list-card-title">${App.ui.escapeHTML(i.nombre)}</div>
                        <div class="dm-list-card-subtitle">${App.ui.escapeHTML(i.tipo || 'OTRO')}</div>
                    </div>
                    <span class="dm-badge ${badgeClass}">Libre: ${libre} ${i.unidad}</span>
                </div>
                
                <div class="dm-list-card-meta dm-grid-3 dm-mt-3 dm-mb-3" style="background:var(--dm-surface-2); padding:10px; border-radius:var(--dm-radius-md); text-align:center;">
                    <div><small class="dm-muted">Físico</small><br><strong>${real}</strong></div>
                    <div><small class="dm-muted">Vendido</small><br><strong style="color:var(--dm-warning);">${reservado}</strong></div>
                    <div><small class="dm-muted">Taller</small><br><strong style="color:var(--dm-primary);">${comprometido}</strong></div>
                </div>

                <div class="dm-list-card-actions">
                    <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.modalKardex('${i.id}')">📋 Kardex</button>
                    <button class="dm-btn dm-btn-primary dm-btn-sm" onclick="App.views.formMaterial('${i.id}')">✏️ Editar</button>
                </div>
            </div>`; 
        }); 
    } 
    html += `</div></div>
    <button class="dm-fab" onclick="App.views.formMaterial()">+</button>`; 
    return html; 
};

// Formularios usando las clases del sistema de diseño
App.views.formMaterial = function(id = null, callback = null) { 
    const obj = id ? App.state.inventario.find(m => m.id === id) : null; 
    const formHTML = `
    <form id="dynamic-form">
        <div class="dm-form-group">
            <label class="dm-label">Nombre del Insumo</label>
            <input type="text" class="dm-input" name="nombre" value="${obj ? App.ui.escapeHTML(obj.nombre) : ''}" required>
        </div>
        <div class="dm-form-row">
            <div class="dm-form-group">
                <label class="dm-label">Tipo</label>
                <select class="dm-select" name="tipo" required>
                    <option value="hilo" ${obj && obj.tipo === 'hilo' ? 'selected' : ''}>Hilo</option>
                    <option value="accesorio" ${obj && obj.tipo === 'accesorio' ? 'selected' : ''}>Accesorio</option>
                </select>
            </div>
            <div class="dm-form-group">
                <label class="dm-label">Unidad</label>
                <select class="dm-select" name="unidad">
                    <option value="Tubos" ${obj && obj.unidad === 'Tubos' ? 'selected' : ''}>Tubos</option>
                    <option value="Kg" ${obj && obj.unidad === 'Kg' ? 'selected' : ''}>Kg</option>
                </select>
            </div>
        </div>
        <div class="dm-form-row">
            <div class="dm-form-group">
                <label class="dm-label">Stock Físico</label>
                <input type="number" class="dm-input" step="0.1" name="stock_real" value="${obj ? obj.stock_real : '0'}" required>
            </div>
            <div class="dm-form-group">
                <label class="dm-label">Stock Mínimo</label>
                <input type="number" class="dm-input" step="0.1" name="stock_minimo" value="${obj ? (obj.stock_minimo||'0') : '0'}" required>
            </div>
        </div>
        <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">${obj ? 'Guardar Cambios' : 'Crear Insumo'}</button>
    </form>`; 
    
    App.ui.openSheet(obj ? "Editar Insumo" : "Nuevo Insumo", formHTML, (data) => { 
        if (obj) App.logic.actualizarRegistroGenerico("materiales", id, data, "inventario"); 
        else { data.stock_reservado = 0; data.stock_comprometido = 0; App.logic.guardarNuevoGenerico("materiales", data, "MAT", "inventario", callback); } 
    }); 
};

App.views.modalEstadisticas = function() { const valorTotal = App.state.inventario.reduce((sum, item) => sum + (parseFloat(item.stock_real||0) * parseFloat(item.costo_unitario||0)), 0); let consumos = {}; (App.state.movimientos_inventario||[]).forEach(m => { if(m.tipo_movimiento.includes('salida')) { consumos[m.ref_id] = (consumos[m.ref_id] || 0) + Math.abs(parseFloat(m.cantidad)); } }); let topMateriales = Object.entries(consumos).sort((a,b) => b[1] - a[1]).slice(0, 3); let topHtml = topMateriales.map(t => { let mat = App.state.inventario.find(m => m.id === t[0]); return `<li>${mat ? App.ui.escapeHTML(mat.nombre) : 'Desconocido'}: <strong>${t[1]}</strong> uds.</li>`; }).join(''); if(!topHtml) topHtml = "<li>Aún no hay datos de consumo.</li>"; let prodCount = {}; (App.state.pedido_detalle||[]).forEach(d => { prodCount[d.producto_id] = (prodCount[d.producto_id] || 0) + parseInt(d.cantidad||1); }); let topProd = Object.entries(prodCount).sort((a,b) => b[1] - a[1]).slice(0,3); let topProdHtml = topProd.map(t => { let p = App.state.productos.find(x => x.id === t[0]); return `<li>${p ? App.ui.escapeHTML(p.nombre) : 'Desconocido'}: <strong>${t[1]}</strong> pedidos</li>`; }).join(''); if(!topProdHtml) topProdHtml = "<li>Aún no hay pedidos.</li>"; let html = `<div class="grid-2" style="margin-bottom:15px;"><div class="card stat-card" style="background:#EBF8FF;"><div class="label" style="color:#2B6CB0;">Valor del Inventario</div><div class="value" style="color:#2B6CB0; font-size:1.2rem;">$${valorTotal.toFixed(2)}</div></div></div><div style="background:#F7FAFC; padding:10px; border-radius:8px; margin-bottom:10px; border:1px solid var(--border);"><strong style="color:var(--primary);">🧵 Top 3 Insumos más usados</strong><ul style="margin-top:5px; margin-left:20px; font-size:0.85rem;">${topHtml}</ul></div><div style="background:#F7FAFC; padding:10px; border-radius:8px; margin-bottom:15px; border:1px solid var(--border);"><strong style="color:var(--primary);">🏆 Top 3 Productos estrella</strong><ul style="margin-top:5px; margin-left:20px; font-size:0.85rem;">${topProdHtml}</ul></div><button class="btn btn-primary" style="width:100%;" onclick="App.ui.closeSheet()">Cerrar</button>`; App.ui.openSheet("Reporte de Producción", html); };
App.views.modalKardex = function(matId) { const material = App.state.inventario.find(m => m.id === matId); const movs = (App.state.movimientos_inventario || []).filter(m => m.ref_id === matId).reverse(); let html = `<div style="margin-bottom:15px; font-size:0.9rem;">Movimientos de <strong>${App.ui.escapeHTML(material.nombre)}</strong></div>`; html += `<table style="width:100%; font-size:0.8rem; border-collapse:collapse;"><tr style="border-bottom:1px solid #ccc;"><th style="text-align:left;">Fecha</th><th>Mov</th><th>Cant.</th><th>Notas</th></tr>`; if(movs.length===0) html += `<tr><td colspan="4" style="padding:10px;text-align:center;">Sin movimientos</td></tr>`; movs.forEach(m => { const color = parseFloat(m.cantidad) > 0 ? 'var(--success)' : 'var(--danger)'; const signo = parseFloat(m.cantidad) > 0 ? '+' : ''; html += `<tr style="border-bottom:1px dashed #eee;"><td style="padding:5px 0;">${m.fecha.split('T')[0]}</td><td><small>${App.ui.escapeHTML((m.tipo_movimiento||'').replace('_',' '))}</small></td><td style="text-align:center; font-weight:bold; color:${color};">${signo}${m.cantidad}</td><td><small>${App.ui.escapeHTML(m.notas||'')}</small></td></tr>`; }); html += `</table><button class="btn btn-primary" style="width:100%; margin-top:15px;" onclick="App.ui.closeSheet()">Cerrar</button>`; App.ui.openSheet(`Kardex (Auditoría)`, html); };

App.views.compras = function() { 
    document.getElementById('bottom-nav').style.display = 'flex'; let html = `<div class="card"><h3 class="card-title">Historial de Compras</h3>`; 
    [...(App.state.compras||[])].reverse().forEach(c => { 
        const p = App.state.proveedores.find(prv => prv.id === c.proveedor_id); 
        // 👇 SOLUCIÓN AL BUG DE CERO FALSO 👇
        const pagado = c.monto_pagado !== undefined && c.monto_pagado !== "" ? parseFloat(c.monto_pagado) : parseFloat(c.total||0);
        const deuda = parseFloat(c.total||0) - pagado; 
        
        html += `<div class="card" style="border: 1px solid var(--border); box-shadow: none;"><div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><strong>${c.id}</strong>${deuda > 0 ? `<span class="badge" style="background:#FED7D7; color:#E53E3E;">Por pagar: $${deuda.toFixed(2)}</span>` : `<span class="badge" style="background:#C6F6D5; color:#38A169;">Pagado</span>`}</div><p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 5px; cursor:pointer;" onclick="App.views.verDetallesCompra('${c.id}')">Proveedor: ${p ? App.ui.escapeHTML(p.nombre) : 'General'} | Fecha: ${c.fecha}<br><span style="color:var(--primary); font-weight:bold; display:inline-block; margin-top:5px;">👀 Ver artículos y pagos</span></p><div style="text-align: right; border-top:1px dashed #eee; padding-top:8px; margin-top:8px;">${deuda > 0 ? `<button class="btn btn-secondary" style="padding:4px 8px; font-size:0.8rem; margin-right:4px; color:var(--success); border-color:var(--success);" onclick="App.views.formAbonarCompra('${c.id}', ${deuda})">💰 Abonar</button>` : ''}<button class="btn btn-secondary" style="padding:4px 8px; font-size:0.8rem; margin-right:4px;" onclick="App.views.formEditarCompra('${c.id}')">✏️ Editar</button><button class="btn btn-secondary" style="padding:4px 8px; font-size:0.8rem; color:red; border-color:red;" onclick="App.logic.eliminarCompra('${c.id}')">🗑️ Eliminar</button></div></div>`; 
    }); 
    return html += `</div><button class="fab" onclick="App.views.formCompra()">+</button>`; 
};
App.views.formCompra = function() { const opcProv = App.state.proveedores.map(p => `<option value="${p.id}">${App.ui.escapeHTML(p.nombre)}</option>`).join(''); const opcMat = App.state.inventario.map(m => `<option value="${m.id}">${App.ui.escapeHTML(m.nombre)} (Físico: ${m.stock_real||0})</option>`).join(''); const formHTML = `<form id="dynamic-form"><div class="form-group"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;"><label style="margin:0;">Proveedor</label><span style="color:var(--primary); font-size:0.8rem; cursor:pointer; font-weight:bold;" onclick="App.ui.closeSheet(); setTimeout(()=>App.views.formProveedor(null, () => App.views.formCompra()), 400);">+ Nuevo Proveedor</span></div><select name="proveedor_id" required><option value="">-- Elige Proveedor --</option>${opcProv}</select></div><div style="background: #EBF8FF; padding: 10px; border-radius: 8px; margin-bottom: 15px;"><strong style="font-size: 0.9rem; color: var(--primary);">📥 Artículos Comprados (Dinámico)</strong><br><div style="text-align:center; margin:10px 0;"><button type="button" class="btn btn-secondary" style="border:2px dashed var(--primary); color:var(--primary); padding:8px; width:100%; background: transparent;" onclick="App.ui.closeSheet(); setTimeout(()=>App.views.formMaterial(null, () => App.views.formCompra()), 400);">+ Crear Insumo Nuevo</button></div><div id="cont-compras"><div class="fila-compra" style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 10px;"><div style="margin-bottom: 5px;"><select name="mat_id[]" required style="width: 100%;"><option value="">-- Selecciona Insumo --</option>${opcMat}</select></div><div style="display: flex; gap: 5px; align-items: center;"><input type="number" step="0.1" name="cant[]" placeholder="Cant." required oninput="window.calcTotalCompra()" style="flex: 1; padding: 6px; min-width: 0;"><input type="number" step="0.01" name="precio_u[]" placeholder="$ Unit." required oninput="window.calcTotalCompra()" style="flex: 1; padding: 6px; min-width: 0;"><input type="number" step="0.01" name="total_fila[]" placeholder="$ Tot" readonly style="flex: 1; padding: 6px; background: #edf2f7; min-width: 0;"><button type="button" onclick="this.parentElement.parentElement.remove(); window.calcTotalCompra();" style="background: var(--danger); color: white; border: none; border-radius: 4px; padding: 6px 10px; font-weight: bold;">X</button></div></div></div><button type="button" class="btn btn-secondary" style="width:100%; margin-top:10px; border:1px dashed #3182CE; color:#3182CE; background: transparent;" onclick="window.agregarFilaCompra()">+ Añadir otro artículo</button></div><div class="form-group"><label>Fecha</label><input type="date" name="fecha" value="${new Date().toISOString().split('T')[0]}" required></div><div class="grid-2"><div class="form-group"><label>Total Factura ($)</label><input type="number" step="0.01" name="total" required readonly style="background:#f0f0f0; font-weight:bold;"></div><div class="form-group"><label>Monto Pagado Hoy ($) <br><small style="color:var(--danger);font-weight:normal;">Pon 0 si es a crédito</small></label><input type="number" step="0.01" name="monto_pagado" required></div></div><button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px; background: var(--success); border-color: var(--success);">Confirmar Compra</button></form>`; App.ui.openSheet("Ingresar Compra", formHTML, (data) => App.logic.guardarNuevaCompra(data)); };
App.views.formAbonarCompra = function(compraId, saldoPendiente) { const formHTML = `<form id="dynamic-form"><input type="hidden" name="compra_id" value="${compraId}"><div class="form-group"><label>Abonar a Proveedor ($)</label><input type="number" step="0.01" name="monto" value="${saldoPendiente}" max="${saldoPendiente}" required></div><button type="submit" class="btn btn-primary" style="width: 100%;">Registrar Abono</button></form>`; App.ui.openSheet(`Abono a Compra ${compraId.replace('COM-','')}`, formHTML, (data) => App.logic.guardarAbonoCompra(data)); };
App.views.formEditarCompra = function(id) { const obj = App.state.compras.find(c => c.id === id); const opcProv = App.state.proveedores.map(p => `<option value="${p.id}" ${obj.proveedor_id === p.id ? 'selected':''}>${App.ui.escapeHTML(p.nombre)}</option>`).join(''); const formHTML = `<form id="dynamic-form"><div style="background: #F7FAFC; padding: 10px; border-radius: 8px; margin-bottom: 15px; font-size: 0.85rem; border: 1px solid var(--border);"><strong>Nota:</strong> Solo puedes cambiar Proveedor, Fecha y Total. Para cambiar cantidades, ELIMINA la compra y vuelve a hacerla.</div><div class="form-group"><label>Proveedor</label><select name="proveedor_id" required><option value="">-- Elige Proveedor --</option>${opcProv}</select></div><div class="form-group"><label>Fecha</label><input type="date" name="fecha" value="${obj.fecha}" required></div><div class="form-group"><label>Costo Total Pagado ($)</label><input type="number" name="total" value="${obj.total}" required></div><button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">Guardar Cambios</button></form>`; App.ui.openSheet("Editar Compra", formHTML, (data) => App.logic.actualizarRegistroGenerico("compras", id, data, "compras")); };
App.views.verDetallesCompra = function(compraId) { 
    const c = App.state.compras.find(x => x.id === compraId); const p = App.state.proveedores.find(prv => prv.id === c.proveedor_id); let detalles = []; try { detalles = JSON.parse(c.detalles || '[]'); } catch(e){} 
    let detHTML = `<ul style="list-style:none; padding:0; margin:0;">`; if(detalles.length === 0) detHTML += `<li><small style="color:var(--text-muted)">Compra antigua sin detalles.</small></li>`; detalles.forEach(d => { detHTML += `<li style="padding:8px 0; border-bottom:1px dashed #ccc; display:flex; justify-content:space-between; align-items:center;"><span><strong style="color:var(--primary);">${d.cantidad}x</strong> ${App.ui.escapeHTML(d.nombre)}</span><span style="color:var(--text-muted); font-size:0.85rem;">$${parseFloat(d.costo_unitario||0).toFixed(2)} c/u</span></li>`; }); detHTML += `</ul>`; 
    
    const abonosHist = (App.state.abonos_proveedores || []).filter(a => a.compra_id === compraId);
    let htmlAbonos = `<h4 style="margin-top:20px; border-bottom:2px solid #38A169; padding-bottom:5px; color:#276749;">Historial de Pagos</h4><ul style="list-style:none; padding:0; margin:0; font-size:0.85rem; background:#F0FFF4; padding:10px; border-radius:6px; border:1px solid #C6F6D5; margin-bottom:15px;">`;
    if(abonosHist.length === 0) { htmlAbonos += `<li style="color:var(--text-muted);">Sin abonos registrados.</li>`; }
    else { abonosHist.forEach(ab => { htmlAbonos += `<li style="padding:5px 0; border-bottom:1px dashed #9AE6B4; display:flex; justify-content:space-between;"><span>${ab.fecha} - <em>${App.ui.escapeHTML(ab.nota||'Abono')}</em></span><strong style="color:#2F855A;">$${parseFloat(ab.monto||0).toFixed(2)}</strong></li>`; }); }
    htmlAbonos += `</ul>`;

    // 👇 SOLUCIÓN AL BUG DE CERO FALSO 👇
    const pagado = c.monto_pagado !== undefined && c.monto_pagado !== "" ? parseFloat(c.monto_pagado) : parseFloat(c.total||0);
    const deuda = parseFloat(c.total||0) - pagado;

    const botonAbonar = deuda > 0 ? `<button class="btn btn-primary" style="width:100%; margin-bottom:10px; background:var(--success); border-color:var(--success);" onclick="App.ui.closeSheet(); setTimeout(()=>App.views.formAbonarCompra('${c.id}', ${deuda}), 300)">💰 Abonar al Proveedor ($${deuda.toFixed(2)})</button>` : `<div style="text-align:center; color:#38A169; font-weight:bold; margin-bottom:15px;">✅ Factura Liquidada</div>`;

    let html = `<div style="font-size:0.9rem; margin-bottom:15px;"><p style="margin:2px 0;"><strong>Proveedor:</strong> ${p ? App.ui.escapeHTML(p.nombre) : 'General'}</p><p style="margin:2px 0;"><strong>Fecha:</strong> ${c.fecha}</p><p style="margin:2px 0;"><strong>Total Factura:</strong> <span style="font-weight:bold;">$${parseFloat(c.total||0).toFixed(2)}</span></p><p style="margin:2px 0;"><strong>Total Pagado:</strong> <span style="color:var(--success); font-weight:bold;">$${pagado.toFixed(2)}</span></p></div><h4 style="margin-top:15px; border-bottom:2px solid var(--primary); padding-bottom:5px; color:var(--primary-dark);">Artículos Comprados</h4><div style="background:#f9f9f9; padding:10px; border-radius:6px;">${detHTML}</div>${htmlAbonos}${botonAbonar}<button class="btn btn-secondary" style="width:100%;" onclick="App.ui.closeSheet()">Cerrar Ventana</button>`; 
    App.ui.openSheet(`Detalle de Compra`, html); 
};
