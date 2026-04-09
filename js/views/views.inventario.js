// ==========================================
// VISTAS: INVENTARIO Y COMPRAS
// ==========================================

App.views.inventario = function() { 
    document.getElementById('app-header-title').innerText = "Inventario";
    document.getElementById('app-header-subtitle').innerText = "Insumos y reventa";
    let html = `<div class="dm-section"><div class="dm-row-between dm-mb-4"><input type="text" id="bus-inv" class="dm-input" onkeyup="window.filtrarLista('bus-inv', 'dm-list-card')" placeholder="🔍 Buscar insumo..."></div><div class="dm-list">`; 
    if (!App.state.inventario || App.state.inventario.length === 0) html += `<div class="dm-alert dm-alert-info">No hay insumos.</div>`; 
    else { 
        App.state.inventario.forEach(i => { 
            const real = parseFloat(i.stock_real||0); const reservado = parseFloat(i.stock_reservado||0); const comprometido = parseFloat(i.stock_comprometido||0); const libre = real - reservado - comprometido;
            const badgeClass = (parseFloat(i.stock_minimo)>0 && libre <= parseFloat(i.stock_minimo)) ? 'dm-badge-danger' : 'dm-badge-success';
            html += `<div class="dm-list-card"><div class="dm-list-card-top"><div><div class="dm-list-card-title">${App.ui.escapeHTML(i.nombre)}</div><div class="dm-list-card-subtitle">${i.tipo||'OTRO'}</div></div><span class="dm-badge ${badgeClass}">Libre: ${libre} ${i.unidad}</span></div>
            <div class="dm-list-card-meta dm-grid-3 dm-mt-3 dm-mb-3" style="background:var(--dm-surface-2); padding:10px; border-radius:var(--dm-radius-md); text-align:center;">
                <div><small class="dm-muted">Físico</small><br><strong>${real}</strong></div><div><small class="dm-muted">Apartado</small><br><strong style="color:var(--dm-warning);">${reservado}</strong></div><div><small class="dm-muted">Taller</small><br><strong style="color:var(--dm-primary);">${comprometido}</strong></div>
            </div><div class="dm-list-card-actions"><button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.modalKardex('${i.id}')">📋 Kardex</button><button class="dm-btn dm-btn-primary dm-btn-sm" onclick="App.views.formMaterial('${i.id}')">✏️ Editar</button></div></div>`; 
        }); 
    } 
    html += `</div></div><button class="dm-fab" onclick="App.views.formMaterial()">+</button>`; return html; 
};

App.views.formMaterial = function(id = null, callback = null) { 
    const obj = id ? App.state.inventario.find(m => m.id === id) : null; 
    const formHTML = `<form id="dynamic-form"><div class="dm-form-group"><label class="dm-label">Nombre</label><input type="text" class="dm-input" name="nombre" value="${obj?obj.nombre:''}" required></div><div class="dm-form-row"><div class="dm-form-group"><label class="dm-label">Tipo</label><select class="dm-select" name="tipo"><option value="hilo" ${obj&&obj.tipo==='hilo'?'selected':''}>Hilo</option><option value="accesorio" ${obj&&obj.tipo==='accesorio'?'selected':''}>Accesorio</option><option value="reventa" ${obj&&obj.tipo==='reventa'?'selected':''}>Reventa</option></select></div><div class="dm-form-group"><label class="dm-label">Unidad</label><select class="dm-select" name="unidad"><option value="Tubos" ${obj&&obj.unidad==='Tubos'?'selected':''}>Tubos</option><option value="Kg" ${obj&&obj.unidad==='Kg'?'selected':''}>Kg</option><option value="Pzas" ${obj&&obj.unidad==='Pzas'?'selected':''}>Pzas</option></select></div></div><div class="dm-form-row"><div class="dm-form-group"><label class="dm-label">Stock Físico</label><input type="number" step="0.1" class="dm-input" name="stock_real" value="${obj?obj.stock_real:'0'}" required></div><div class="dm-form-group"><label class="dm-label">Minimo</label><input type="number" step="0.1" class="dm-input" name="stock_minimo" value="${obj?obj.stock_minimo:'0'}" required></div></div><button type="submit" class="dm-btn dm-btn-primary dm-btn-block">Guardar</button></form>`; 
    App.ui.openSheet(obj?"Editar Insumo":"Nuevo Insumo", formHTML, (data) => { if(obj) App.logic.actualizarRegistroGenerico("materiales", id, data, "inventario"); else App.logic.guardarNuevoGenerico("materiales", data, "MAT", "inventario", callback); }); 
};

App.views.modalKardex = function(matId) { 
    const movs = (App.state.movimientos_inventario || []).filter(m => m.material_id === matId).sort((a,b) => new Date(b.fecha) - new Date(a.fecha)); 
    let html = `<div class="dm-list">`; if(movs.length === 0) html += `<div class="dm-alert dm-alert-info">No hay movimientos.</div>`; 
    movs.forEach(m => { html += `<div class="dm-list-card dm-mb-2" style="padding:10px;"><div class="dm-row-between"><div><strong style="color:${m.tipo==='entrada'?'var(--dm-success)':'var(--dm-danger)'};">${m.tipo==='entrada'?'+':'-'} ${m.cantidad}</strong><br><small class="dm-muted">${m.motivo}</small></div><div class="dm-right"><small class="dm-muted">${String(m.fecha).split('T')[0]}</small></div></div></div>`; }); 
    html += `</div>`; App.ui.openSheet("Kardex", html); 
};

App.views.compras = function() { 
    document.getElementById('app-header-title').innerText = "Compras"; document.getElementById('app-header-subtitle').innerText = "Cuentas por Pagar";
    let html = `<div class="dm-section"><div class="dm-list">`; 
    let c = [...(App.state.compras||[])].sort((a,b)=>new Date(b.fecha)-new Date(a.fecha));
    if(c.length===0) html+=`<div class="dm-alert dm-alert-info">No hay compras registradas.</div>`;
    c.forEach(comp => { 
        const prov = App.state.proveedores.find(x => x.id === comp.proveedor_id) || {}; 
        const pag = parseFloat(comp.monto_pagado !== undefined ? comp.monto_pagado : comp.total||0); const tot = parseFloat(comp.total||0); const deu = tot - pag;
        html += `<div class="dm-list-card"><div class="dm-list-card-top"><div><div class="dm-list-card-title">${prov.nombre||'Proveedor'}</div><div class="dm-list-card-subtitle dm-mt-2"><span class="dm-badge ${deu>0?'dm-badge-danger':'dm-badge-success'}">${deu>0?'DEUDA':'PAGADO'}</span></div></div><div class="dm-right"><div class="dm-fw-bold dm-text-lg">$${tot.toFixed(2)}</div><div class="dm-text-sm dm-muted">Resta: <strong style="color:${deu>0?'var(--dm-danger)':'var(--dm-success)'};">$${deu.toFixed(2)}</strong></div></div></div><div class="dm-list-card-actions"><button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.verDetallesCompra('${comp.id}')">Ver Detalles / Abonar</button></div></div>`; 
    }); 
    html += `</div></div><button class="dm-fab" onclick="App.views.formCompra()">+</button>`; return html; 
};

App.views.formCompra = function() { 
    let hProv = '<option value="">-- Proveedor --</option>'; (App.state.proveedores||[]).forEach(p => hProv+=`<option value="${p.id}">${p.nombre}</option>`);
    let html = `<form id="dynamic-form"><div class="dm-form-group"><label class="dm-label">Proveedor</label><select class="dm-select" name="proveedor_id" required>${hProv}</select></div><div class="dm-form-group"><label class="dm-label">Fecha</label><input type="date" class="dm-input" name="fecha" value="${new Date().toISOString().split('T')[0]}" required></div><h4 class="dm-label dm-mb-2">Insumos</h4><div id="cont-compras"></div><button type="button" class="dm-btn dm-btn-ghost dm-btn-block dm-mb-4" onclick="window.agregarFilaCompra()">+ Añadir Insumo</button><div class="dm-form-row"><div class="dm-form-group"><label class="dm-label">Total ($)</label><input type="number" step="0.01" class="dm-input" name="total" readonly style="background:#f3f4f6;"></div><div class="dm-form-group"><label class="dm-label">Pagado Hoy ($)</label><input type="number" step="0.01" class="dm-input" name="monto_pagado" required></div></div><button type="submit" class="dm-btn dm-btn-primary dm-btn-block">Registrar Compra</button></form>`; 
    App.ui.openSheet("Nueva Compra", html, (d) => App.logic.guardarNuevaCompra(d)); setTimeout(()=>window.agregarFilaCompra(), 200);
};

App.views.verDetallesCompra = function(id) { 
    const c = App.state.compras.find(x => x.id === id); if(!c) return; 
    let html = `<div class="dm-list">`; 
    try { const det = JSON.parse(c.detalles); det.forEach(d => { html += `<div class="dm-list-card" style="padding:10px;"><div class="dm-row-between"><div><strong>${d.nombre}</strong><br><small class="dm-muted">${d.cantidad} uds x $${d.costo_unitario}</small></div><div class="dm-fw-bold">$${(d.cantidad*d.costo_unitario).toFixed(2)}</div></div></div>`; }); } catch(e){} 
    html += `</div>`; App.ui.openSheet("Detalles de Compra", html); 
};
