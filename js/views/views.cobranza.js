// ==========================================
// VISTAS: MÓDULO DE COBRANZA Y CXC
// ==========================================

App.views.cobranza = function() { 
    document.getElementById('bottom-nav').style.display = 'flex'; 
    let html = `<div class="card"><h3 class="card-title">Cuentas por Cobrar (CxC)</h3><p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:15px;">Gestiona los saldos pendientes de tus clientes.</p>`; 

    let listosConDeuda = [];
    let enProcesoConDeuda = [];
    let totalPorCobrar = 0;

    // 1. Analizar Pedidos
    (App.state.pedidos || []).forEach(p => { 
        const abonos = (App.state.abonos || []).filter(a => a.pedido_id === p.id).reduce((s,a)=>s+parseFloat(a.monto||0),0); 
        const saldo = parseFloat(p.total||0) - parseFloat(p.anticipo||0) - abonos; 
        
        if(saldo > 0) { 
            totalPorCobrar += saldo;
            const c = App.state.clientes.find(cli => cli.id === p.cliente_id);
            const nombreCli = c ? c.nombre : (p.cliente_id === 'STOCK_INTERNO' ? 'Bodega' : 'Cliente');
            
            const tarjeta = `<div class="card" style="border: 1px solid var(--border); box-shadow: none; margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <strong>${(p.id||'').replace('PED-','')} - ${App.ui.escapeHTML(nombreCli)}</strong>
                    <span style="color:#D69E2E; font-weight:bold; font-size:1.1rem;">$${saldo.toFixed(2)}</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-muted); margin-bottom:10px;">
                    <span>Total: $${parseFloat(p.total||0).toFixed(2)}</span>
                    <span>Pagado: $${(parseFloat(p.anticipo||0) + abonos).toFixed(2)}</span>
                </div>
                <div style="display:flex; gap:5px;">
                    <button class="btn btn-primary" style="flex:1; padding:6px; font-size:0.8rem; background:var(--success); border-color:var(--success);" onclick="App.views.formCobrar('${p.id}', '${p.cliente_id}', ${saldo})">💰 Cobrar</button>
                    ${c && c.telefono ? `<button class="btn btn-secondary" style="flex:1; padding:6px; font-size:0.8rem; color:#38A169; border-color:#38A169;" onclick="App.logic.enviarWhatsApp('${p.id}', '${p.estado === 'listo para entregar' ? 'listo' : 'cobro'}')">💬 Recordatorio</button>` : ''}
                </div>
            </div>`;

            if(p.estado === 'listo para entregar') listosConDeuda.push(tarjeta);
            else enProcesoConDeuda.push(tarjeta);
        } 
    }); 

    // 2. Analizar Reparaciones
    (App.state.reparaciones || []).forEach(r => { 
        const saldo = parseFloat(r.precio||0) - parseFloat(r.anticipo||0); 
        if(saldo > 0) { 
            totalPorCobrar += saldo;
            const c = App.state.clientes.find(cli => cli.id === r.cliente_id);
            
            const tarjeta = `<div class="card" style="border: 1px dashed #805AD5; box-shadow: none; margin-bottom:10px; background:#FAF5FF;">
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <strong style="color:#6B46C1;">${(r.id||'').replace('REP-','')} (Rep) - ${c ? App.ui.escapeHTML(c.nombre) : 'Cliente'}</strong>
                    <span style="color:#D69E2E; font-weight:bold; font-size:1.1rem;">$${saldo.toFixed(2)}</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-muted); margin-bottom:10px;">
                    <span>Total: $${parseFloat(r.precio||0).toFixed(2)}</span>
                    <span>Anticipo: $${parseFloat(r.anticipo||0).toFixed(2)}</span>
                </div>
                <div style="display:flex; gap:5px;">
                    <button class="btn btn-secondary" style="flex:1; padding:6px; font-size:0.8rem; color:#6B46C1; border-color:#6B46C1;" onclick="App.router.navigate('reparaciones')">Ir a Reparaciones ➔</button>
                </div>
            </div>`;

            if(r.estado === 'entregada') listosConDeuda.push(tarjeta);
            else enProcesoConDeuda.push(tarjeta);
        } 
    });

    html += `<div class="card stat-card" style="background:#FEFCBF; margin-bottom:20px;"><div class="label" style="color:#B7791F;">Dinero Total en la Calle</div><div class="value" style="color:#D69E2E; font-size:1.5rem;">$${totalPorCobrar.toFixed(2)}</div></div>`;

    html += `<h4 style="margin-bottom:10px; color:#C53030; display:flex; align-items:center; gap:5px;">🚨 Listos para Entregar (Prioridad) <span class="badge" style="background:#E53E3E; color:white;">${listosConDeuda.length}</span></h4>`;
    if(listosConDeuda.length === 0) html += `<p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:20px;">No hay pedidos listos pendientes de pago.</p>`;
    else html += `<div style="margin-bottom:20px;">${listosConDeuda.join('')}</div>`;

    html += `<h4 style="margin-bottom:10px; color:#2B6CB0; display:flex; align-items:center; gap:5px;">⏳ En Producción (Abonos Pendientes) <span class="badge" style="background:#3182CE; color:white;">${enProcesoConDeuda.length}</span></h4>`;
    if(enProcesoConDeuda.length === 0) html += `<p style="color:var(--text-muted); font-size:0.85rem;">No hay deudas en taller.</p>`;
    else html += `<div>${enProcesoConDeuda.join('')}</div>`;

    html += `</div>`; return html; 
};
