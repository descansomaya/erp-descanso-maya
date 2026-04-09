// ==========================================
// VISTAS: PEDIDOS / VENTAS (REDISEÑADO DM)
// ==========================================

App.views.pedidos = function() { 
    document.getElementById('app-header-title').innerText = "Pedidos";
    document.getElementById('app-header-subtitle').innerText = "Gestión de ventas";

    let html = `<div class="dm-section">
        <div class="dm-tabs dm-mb-4">
            <button class="dm-tab active tab-btn-ped" onclick="window.switchTabPed('activos', this)">🟢 Activos / Taller</button>
            <button class="dm-tab tab-btn-ped" onclick="window.switchTabPed('listos', this)">🟠 Listos / Cobro</button>
            <button class="dm-tab tab-btn-ped" onclick="window.switchTabPed('historial', this)">✅ Historial</button>
        </div>

        <div class="dm-row-between dm-mb-4">
            <input type="text" id="bus-ped" class="dm-input" onkeyup="window.filtrarLista('bus-ped', 'dm-list-card')" placeholder="🔍 Buscar folio o cliente..." style="max-width: 300px;">
        </div>

        <div id="tab-activos" class="tab-content-ped" style="display:block;">${window.generarListaPedidos('activos')}</div>
        <div id="tab-listos" class="tab-content-ped" style="display:none;">${window.generarListaPedidos('listos')}</div>
        <div id="tab-historial" class="tab-content-ped" style="display:none;">${window.generarListaPedidos('historial')}</div>
    </div>
    <button class="dm-fab" onclick="App.views.formPedido()">+</button>`; 
    return html; 
};

window.generarListaPedidos = function(tipo) { 
    let ped = (App.state.pedidos || []).filter(p => { 
        if(tipo === 'activos') return p.estado !== 'entregado' && p.estado !== 'listo para entregar'; 
        if(tipo === 'listos') return p.estado === 'listo para entregar'; 
        return p.estado === 'entregado'; 
    }); 
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
        
        let alertasHTML = ''; 
        const hoy = new Date(); hoy.setHours(0,0,0,0); 
        const fEnt = new Date(p.fecha_entrega+'T00:00:00'); 
        if(p.estado !== 'entregado' && p.estado !== 'listo para entregar') { 
            const diff = Math.ceil((fEnt - hoy)/(1000*60*60*24)); 
            if(diff < 0) alertasHTML = `<span class="dm-badge dm-badge-danger dm-ml-2">🚨 Atrasado</span>`; 
            else if(diff <= 3) alertasHTML = `<span class="dm-badge dm-badge-warning dm-ml-2">⚠️ Urgente</span>`; 
        } 

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
                <button class="dm-btn dm-btn-ghost dm-btn-sm dm-w-full dm-mt-2" onclick="App.logic.enviarReciboWhatsApp('${p.id}')">📱 WhatsApp</button>
            </div>
        </div>`; 
    }); 
    html += `</div>`; 
    return html; 
};

// Formulario de Nuevo / Editar Pedido
App.views.formPedido = function(id = null) {
    const obj = id ? App.state.pedidos.find(p => p.id === id) : null;
    let htmlClientes = '<option value="">-- Selecciona Cliente --</option><option value="STOCK_INTERNO" ' + (obj && obj.cliente_id === 'STOCK_INTERNO' ? 'selected' : '') + '>STOCK BODEGA (Sin cliente)</option>';
    (App.state.clientes || []).forEach(c => { htmlClientes += `<option value="${c.id}" ${obj && obj.cliente_id === c.id ? 'selected' : ''}>${c.nombre}</option>`; });

    let htmlProd = '<option value="">-- Selecciona Producto --</option>';
    (App.state.productos || []).forEach(p => { htmlProd += `<option value="${p.id}" ${obj && obj.producto_id === p.id ? 'selected' : ''}>${p.nombre}</option>`; });

    const formHTML = `
    <form id="dynamic-form">
        <div class="dm-form-group">
            <label class="dm-label">Cliente</label>
            <select class="dm-select" name="cliente_id" required>${htmlClientes}</select>
        </div>
        <div class="dm-form-group">
            <label class="dm-label">Producto</label>
            <select class="dm-select" name="producto_id" required onchange="window.calcularTotalPedido()">${htmlProd}</select>
            <div id="info-extra-prod" class="dm-help"></div>
        </div>
        <div class="dm-form-row">
            <div class="dm-form-group">
                <label class="dm-label">Cantidad</label>
                <input type="number" class="dm-input" name="cantidad" value="${obj ? obj.cantidad : '1'}" min="1" required oninput="window.calcularTotalPedido()">
            </div>
            <div class="dm-form-group">
                <label class="dm-label">Fecha de Entrega</label>
                <input type="date" class="dm-input" name="fecha_entrega" value="${obj ? obj.fecha_entrega : ''}" required>
            </div>
        </div>
        
        <label class="dm-check dm-mb-4">
            <input type="checkbox" name="es_mayoreo" onchange="window.calcularTotalPedido()" ${obj && obj.es_mayoreo ? 'checked' : ''}>
            Aplicar precio de Mayoreo
        </label>

        <div class="dm-form-row">
            <div class="dm-form-group">
                <label class="dm-label">Total ($)</label>
                <input type="number" step="0.01" class="dm-input" name="total" value="${obj ? obj.total : ''}" required>
            </div>
            <div class="dm-form-group">
                <label class="dm-label">Anticipo ($)</label>
                <input type="number" step="0.01" class="dm-input" name="anticipo" value="${obj ? obj.anticipo : '0'}" ${obj ? 'readonly style="background:#f3f4f6;"' : 'required'}>
            </div>
        </div>

        <div class="dm-form-group">
            <label class="dm-label">Notas o Detalles</label>
            <textarea class="dm-textarea" name="notas" placeholder="Ej. Hilos combinados, medida especial...">${obj ? obj.notas : ''}</textarea>
        </div>

        <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">${obj ? 'Guardar Cambios' : 'Registrar Pedido'}</button>
    </form>`;

    App.ui.openSheet(obj ? "Editar Pedido" : "Nuevo Pedido", formHTML, (data) => {
        if (data.es_mayoreo === 'on') data.es_mayoreo = true; else data.es_mayoreo = false;
        if (obj) App.logic.actualizarRegistroGenerico("pedidos", id, data, "pedidos");
        else App.logic.guardarNuevoPedido(data);
    });
    setTimeout(() => window.calcularTotalPedido(), 200);
};

// Modal de Historial y Registro de Abonos
App.views.modalAbonos = function(pedidoId) {
    const p = App.state.pedidos.find(x => x.id === pedidoId);
    const abs = (App.state.abonos||[]).filter(a => a.pedido_id === pedidoId);
    const totalAbonado = abs.reduce((s, a) => s + parseFloat(a.monto), 0);
    const saldo = parseFloat(p.total||0) - parseFloat(p.anticipo||0) - totalAbonado;

    let html = `<div class="dm-alert dm-alert-info dm-mb-4"><strong>Total:</strong> $${p.total} | <strong>Anticipo:</strong> $${p.anticipo} | <strong>Saldo:</strong> $${saldo.toFixed(2)}</div>`;
    
    if(abs.length > 0) {
        html += `<h4 class="dm-label dm-mb-2">Historial de Pagos</h4><div class="dm-list dm-mb-4">`;
        abs.forEach(a => {
            const fecha = a.fecha ? String(a.fecha).split('T')[0] : '';
            html += `<div class="dm-list-card" style="padding:10px;">
                <div class="dm-row-between">
                    <div>
                        <strong>$${parseFloat(a.monto).toFixed(2)}</strong><br>
                        <small class="dm-muted">${a.metodo_pago || 'Efectivo'}</small>
                    </div>
                    <div class="dm-right">
                        <span class="dm-text-sm dm-muted">${fecha}</span><br>
                        <button class="dm-btn dm-btn-danger dm-btn-sm" style="padding:4px 8px; min-height:0; margin-top:4px;" onclick="App.logic.eliminarRegistroGenerico('abonos_clientes', '${a.id}', 'pedidos')">Eliminar</button>
                    </div>
                </div>
            </div>`;
        });
        html += `</div>`;
    }

    if(saldo > 0) {
        html += `<h4 class="dm-label dm-mb-2">Registrar Nuevo Abono</h4>
        <form id="dynamic-form">
            <input type="hidden" name="pedido_id" value="${pedidoId}">
            <div class="dm-form-row">
                <div class="dm-form-group">
                    <label class="dm-label">Monto ($)</label>
                    <input type="number" step="0.01" class="dm-input" name="monto" max="${saldo}" required>
                </div>
                <div class="dm-form-group">
                    <label class="dm-label">Método</label>
                    <select class="dm-select" name="metodo_pago" required>
                        <option value="Efectivo">Efectivo</option>
                        <option value="Transferencia">Transferencia</option>
                        <option value="Tarjeta">Tarjeta</option>
                    </select>
                </div>
            </div>
            <div class="dm-form-group">
                <label class="dm-label">Fecha</label>
                <input type="date" class="dm-input" name="fecha" value="${new Date().toISOString().split('T')[0]}" required>
            </div>
            <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">Registrar Abono</button>
        </form>`;
    } else {
        html += `<div class="dm-alert dm-alert-success dm-center">Este pedido está totalmente pagado.</div>`;
    }

    App.ui.openSheet("Abonos del Pedido", html, (data) => {
        if(saldo > 0) App.logic.guardarNuevoGenerico("abonos_clientes", data, "ABO", "pedidos");
    });
};
