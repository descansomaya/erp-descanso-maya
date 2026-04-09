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

// ... MANTÉN TUS FUNCIONES formPedido, guardarPedido, modalAbonos EXACTAMENTE IGUALES POR AHORA (funcionarán bien con los modales nuevos).
