// ==========================================
// VISTAS: VENTAS Y PEDIDOS
// ==========================================

// ==========================================
// VISTAS: PEDIDOS / VENTAS (REDISEÑADO DM)
// ==========================================

App.views.pedidos = function() { 
    document.getElementById('app-header-title').innerText = "Pedidos";
    document.getElementById('app-header-subtitle').innerText = "Gestión de ventas";

    let html = `<div class="dm-section">
        <div class="dm-tabs dm-mb-4">
            <button class="dm-tab active tab-btn-ped" onclick="window.switchTabPed('activos', this)">🟢 Activos / En Taller</button>
            <button class="dm-tab tab-btn-ped" onclick="window.switchTabPed('listos', this)">🟠 Listos / Por Cobrar</button>
            <button class="dm-tab tab-btn-ped" onclick="window.switchTabPed('historial', this)">✅ Historial (Entregados)</button>
        </div>

        <div class="dm-row-between dm-mb-4">
            <input type="text" id="bus-ped" class="dm-input" onkeyup="window.filtrarLista('bus-ped', 'dm-list-card')" placeholder="🔍 Buscar folio, cliente, prod..." style="max-width: 300px;">
        </div>

        <div id="tab-activos" class="tab-content-ped" style="display:block;">${generarListaPedidos('activos')}</div>
        <div id="tab-listos" class="tab-content-ped" style="display:none;">${generarListaPedidos('listos')}</div>
        <div id="tab-historial" class="tab-content-ped" style="display:none;">${generarListaPedidos('historial')}</div>
    </div>
    <button class="dm-fab" onclick="App.views.formPedido()">+</button>`; 
    return html; 
};

function generarListaPedidos(tipo) { 
    let ped = (App.state.pedidos || []).filter(p => { if(tipo === 'activos') return p.estado !== 'entregado' && p.estado !== 'listo para entregar'; if(tipo === 'listos') return p.estado === 'listo para entregar'; return p.estado === 'entregado'; }); 
    if(ped.length === 0) return `<div class="dm-alert dm-alert-info">No hay pedidos en esta sección.</div>`; 

    ped.sort((a,b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion)); 
    let html = `<div class="dm-list">`; 

    ped.forEach(p => { 
        const c = App.state.clientes.find(x => x.id === p.cliente_id) || {}; 
        const abonos = (App.state.abonos||[]).filter(a=>a.pedido_id===p.id).reduce((s,a)=>s+parseFloat(a.monto),0); 
        const saldo = parseFloat(p.total||0) - parseFloat(p.anticipo||0) - abonos; 
        
        let estColor = 'dm-badge-info'; 
        if(p.estado === 'entregado') estColor = 'dm-badge-success'; 
        else if(p.estado === 'listo para entregar') estColor = 'dm-badge-warning'; 
        else if(p.estado === 'en produccion') estColor = 'dm-badge-primary'; 
        
        const fechaE = p.fecha_entrega ? String(p.fecha_entrega).split('T')[0] : 'N/A'; 
        const clienteNom = p.cliente_id === 'STOCK_INTERNO' ? 'STOCK DE BODEGA' : c.nombre; 
        
        let alertasHTML = ''; const hoy = new Date(); hoy.setHours(0,0,0,0); const fEnt = new Date(p.fecha_entrega+'T00:00:00'); 
        if(p.estado !== 'entregado' && p.estado !== 'listo para entregar') { const diff = Math.ceil((fEnt - hoy)/(1000*60*60*24)); if(diff < 0) alertasHTML = `<span class="dm-badge dm-badge-danger dm-ml-2">🚨 Atrasado</span>`; else if(diff <= 3) alertasHTML = `<span class="dm-badge dm-badge-warning dm-ml-2">⚠️ Urgente</span>`; } 

        html += `
        <div class="dm-list-card">
            <div class="dm-list-card-top">
                <div>
                    <div class="dm-list-card-title">${(p.id||'').replace('PED-','')} - ${App.ui.escapeHTML(clienteNom)}</div>
                    <div class="dm-list-card-subtitle dm-row">
                        <span class="dm-badge ${estColor}">${p.estado.toUpperCase()}</span>
                        ${alertasHTML}
                    </div>
                </div>
                <div class="dm-right">
                    <div class="dm-fw-bold dm-text-lg">$${parseFloat(p.total||0).toFixed(2)}</div>
                    <div class="dm-text-sm dm-muted">Saldo: <strong style="color:${saldo>0?'var(--dm-danger)':'var(--dm-success)'};">$${saldo.toFixed(2)}</strong></div>
                </div>
            </div>

            <div class="dm-list-card-meta dm-mt-3 dm-mb-3">
                <div>📅 Entrega: <strong>${fechaE}</strong></div>
                <div>💬 <i>${App.ui.escapeHTML(p.notas || 'Sin notas')}</i></div>
            </div>

            <div class="dm-list-card-actions">
                <button class="dm-btn dm-btn-primary dm-btn-sm" onclick="App.views.formPedido('${p.id}')">✏️ Editar</button>
                <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.modalAbonos('${p.id}')">💳 Abonos</button>
                <button class="dm-btn dm-btn-ghost dm-btn-sm dm-w-full dm-mt-2" onclick="App.logic.enviarReciboWhatsApp('${p.id}')">📱 Enviar WhatsApp</button>
            </div>
        </div>`; 
    }); 
    html += `</div>`; return html; 
}

App.views.formNuevoPedido = function() { const opcionesClientes = App.state.clientes.map(c => `<option value="${c.id}">${App.ui.escapeHTML(c.nombre)}</option>`).join(''); const opcionesProductos = App.state.productos.map(p => `<option value="${p.id}">${App.ui.escapeHTML(p.nombre)}</option>`).join(''); const hoy = new Date().toISOString().split('T')[0]; const formHTML = `<form id="dynamic-form"><div style="background: #EBF8FF; padding: 8px; border-radius: 6px; margin-bottom: 10px; font-size: 0.8rem; color: #2B6CB0;"><strong>Novedad:</strong> El inventario de reventa se descontará automáticamente aquí. Si es fabricación, se descontará al mandar a Producción.</div><div class="form-group"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;"><label style="margin:0;">Cliente</label><span style="color:var(--primary); font-size:0.8rem; cursor:pointer; font-weight:bold;" onclick="App.ui.closeSheet(); setTimeout(()=>App.views.formCliente(null, () => App.views.formNuevoPedido()), 400);">+ Nuevo Cliente</span></div><select name="cliente_id" required><option value="">-- Elige un cliente --</option>${opcionesClientes}</select></div><div class="form-group"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;"><label style="margin:0;">Producto</label><span style="color:var(--primary); font-size:0.8rem; cursor:pointer; font-weight:bold;" onclick="App.ui.closeSheet(); setTimeout(()=>App.views.formProducto(null, () => App.views.formNuevoPedido()), 400);">+ Nuevo Producto</span></div><select name="producto_id" required onchange="window.calcularTotalPedido()"><option value="">-- Elige un producto --</option>${opcionesProductos}</select></div><div id="info-extra-prod" style="margin-top:-10px; margin-bottom:10px;"></div><div class="form-group"><label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" name="es_mayoreo" value="1" onchange="window.calcularTotalPedido()" style="width:20px; height:20px;"><strong>Aplicar Precio Mayoreo</strong></label></div><div class="grid-2"><div class="form-group"><label>Fecha Solicitud</label><input type="date" name="fecha_creacion" value="${hoy}" required></div><div class="form-group"><label>Fecha Entrega</label><input type="date" name="fecha_entrega" required></div></div><div class="grid-2"><div class="form-group"><label>Cantidad</label><input type="number" name="cantidad" value="1" min="1" required oninput="window.calcularTotalPedido()"></div><div class="form-group"><label>Precio Total ($)</label><input type="number" name="total" required></div></div><div class="form-group"><label>Anticipo ($)</label><input type="number" name="anticipo" value="0" required></div><div class="form-group"><label>Notas</label><input type="text" name="notas" placeholder="Opcional"></div><button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">Crear Pedido</button></form>`; App.ui.openSheet("Nuevo Pedido", formHTML, (data) => App.logic.guardarNuevoPedido(data)); };
App.views.formEditarPedido = function(id) { const p = App.state.pedidos.find(x => x.id === id); const fechaC = p.fecha_creacion ? p.fecha_creacion.split('T')[0] : ''; const formHTML = `<form id="dynamic-form"><div class="form-group"><label>Fecha de Solicitud</label><input type="date" name="fecha_creacion" value="${fechaC}" required></div><div class="form-group"><label>Precio Total ($)</label><input type="number" step="0.01" name="total" value="${p.total}" required></div><div class="form-group"><label>Anticipo Registrado ($)</label><input type="number" step="0.01" name="anticipo" value="${p.anticipo}" required></div><div class="form-group"><label>Fecha de Entrega</label><input type="date" name="fecha_entrega" value="${p.fecha_entrega || ''}"></div><div class="form-group"><label>Notas / Instrucciones</label><textarea name="notas" rows="2">${App.ui.escapeHTML(p.notas || '')}</textarea></div><button type="submit" class="btn btn-primary" style="width: 100%;">Guardar Cambios</button></form>`; App.ui.openSheet("Editar Pedido", formHTML, (data) => { if(data.fecha_creacion) data.fecha_creacion = data.fecha_creacion + "T12:00:00.000Z"; App.logic.actualizarRegistroGenerico("pedidos", id, data, "pedidos"); }); };

App.views.formCobrar = function(pedidoId, clienteId, saldoPendiente) { 
    const formHTML = `<form id="dynamic-form"><input type="hidden" name="pedido_id" value="${pedidoId}"><input type="hidden" name="cliente_id" value="${clienteId}"><div style="background:#EBF8FF; padding:10px; border-radius:8px; margin-bottom:15px; text-align:center;"><span style="color:#2B6CB0; font-size:0.85rem;">Saldo Pendiente a liquidar:</span><br><strong style="font-size:1.5rem; color:#3182CE;">$${saldoPendiente.toFixed(2)}</strong></div><div class="form-group"><label>Monto a Abonar ($)</label><input type="number" step="0.01" name="monto" value="${saldoPendiente}" max="${saldoPendiente}" required></div><div class="form-group"><label>Método de Pago</label><select name="metodo_pago" required><option value="Efectivo">💵 Efectivo</option><option value="Transferencia">📱 Transferencia / SPEI</option><option value="Tarjeta">💳 Tarjeta (Terminal)</option></select></div><div class="form-group"><label>Nota (Opcional)</label><input type="text" name="nota" placeholder="Ej. Pago realizado por su hijo"></div><button type="submit" class="btn btn-primary" style="width: 100%; background:var(--success); border-color:var(--success);">Confirmar Pago</button></form>`; 
    App.ui.openSheet(`Cobrar Pedido ${pedidoId.replace('PED-','')}`, formHTML, (data) => App.logic.guardarAbono(data)); 
};

App.views.modalOpcionesWhatsApp = function(pedidoId) { let html = `<div style="display:flex; flex-direction:column; gap:10px;"><p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:10px;">Elige el tipo de mensaje que deseas enviar al cliente:</p><button class="btn btn-secondary" style="border-color:#38A169; color:#38A169; background:transparent;" onclick="App.logic.enviarWhatsApp('${pedidoId}', 'listo')">✅ Aviso de "Pedido Listo"</button><button class="btn btn-secondary" style="border-color:#D69E2E; color:#D69E2E; background:transparent;" onclick="App.logic.enviarWhatsApp('${pedidoId}', 'cobro')">💰 Recordatorio de Pago</button><button class="btn btn-secondary" style="border-color:var(--primary); color:var(--primary); background:transparent;" onclick="App.logic.enviarWhatsApp('${pedidoId}', 'general')">📝 Detalles del Pedido (General)</button></div>`; App.ui.openSheet("Enviar WhatsApp", html); };

App.views.cotizaciones = function() { document.getElementById('bottom-nav').style.display = 'flex'; let html = `<div class="card"><h3 class="card-title">Cotizaciones Rápidas</h3><p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:15px;">Solo informativas. No afectan inventario ni finanzas.</p>`; if (!App.state.cotizaciones || App.state.cotizaciones.length === 0) { html += `<p>No hay cotizaciones recientes.</p>`; } else { [...App.state.cotizaciones].reverse().forEach(c => { html += `<div class="card" style="border: 1px solid var(--border); box-shadow: none;"><div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><strong>${c.id} - ${App.ui.escapeHTML(c.cliente_nombre)}</strong><span style="color: var(--primary); font-weight: bold;">$${c.total}</span></div><p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 5px;">${App.ui.escapeHTML(c.descripcion)}</p><div style="display:flex; gap:5px; justify-content:flex-end;"><button class="btn btn-secondary" style="padding:4px 8px; font-size:0.8rem; margin-right:4px;" onclick="App.logic.imprimirCotizacion('${c.id}')">🖨️ Imprimir PDF</button><button class="btn btn-secondary" style="padding:4px 8px; font-size:0.8rem; color:red; border-color:red;" onclick="App.logic.eliminarCotizacion('${c.id}')">🗑️</button></div></div>`; }); } html += `</div><button class="fab" onclick="App.views.formNuevaCotizacion()">+</button>`; return html; };
App.views.formNuevaCotizacion = function() { const formHTML = `<form id="dynamic-form"><div style="background: #EEF2FF; padding: 10px; border-radius: 8px; margin-bottom: 15px; font-size: 0.85rem; color: #4C51BF;">📝 Las cotizaciones no restan inventario ni se suman a las finanzas.</div><div class="form-group"><label>Nombre del Cliente</label><input type="text" name="cliente_nombre" required></div><div class="form-group"><label>Descripción (Ej. Hamaca Matrimonial)</label><input type="text" name="descripcion" required></div><div class="form-group"><label>Precio Cotizado ($)</label><input type="number" step="0.01" name="total" required></div><button type="submit" class="btn btn-primary" style="width: 100%;">Generar Cotización y PDF</button></form>`; App.ui.openSheet("Nueva Cotización", formHTML, (data) => App.logic.guardarCotizacion(data)); };
