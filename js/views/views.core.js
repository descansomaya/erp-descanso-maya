// ==========================================
// VISTAS: NÚCLEO Y PANTALLAS PRINCIPALES
// ==========================================

App.views.login = function() { return `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:80vh; text-align:center;"><div style="background:var(--primary); color:white; width:80px; height:80px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:2rem; margin-bottom:20px;">🔒</div><h2 style="margin-bottom:10px; color:var(--primary-dark);">Descanso Maya</h2><p style="color:var(--text-muted); margin-bottom:30px;">Ingresa el PIN</p><div class="card" style="width:100%; max-width:320px;"><input type="password" id="pin-input" placeholder="PIN" style="width:100%; padding:12px; font-size:1.2rem; text-align:center; border:1px solid var(--border); border-radius:8px; margin-bottom:15px;"><button class="btn btn-primary" style="width:100%; padding:12px; font-size:1rem;" onclick="App.logic.verificarPIN(document.getElementById('pin-input').value)">Entrar</button></div></div>`; };

App.views.inicio = function() { 
    document.getElementById('bottom-nav').style.display = 'flex'; 
    const pedidosCount = App.state.pedidos ? App.state.pedidos.length : 0; 
    const prodCount = App.state.ordenes_produccion ? App.state.ordenes_produccion.filter(o => o.estado !== 'listo').length : 0; 
    let alertasHTML = ''; 
    
    const stockBajo = App.state.inventario.filter(i => {
        const libre = parseFloat(i.stock_real||0) - parseFloat(i.stock_reservado||0) - parseFloat(i.stock_comprometido||0);
        return parseFloat(i.stock_minimo) > 0 && libre <= parseFloat(i.stock_minimo);
    }); 
    
    if(stockBajo.length > 0) { 
        alertasHTML += `<div style="background:#FED7D7; border-left:4px solid #E53E3E; padding:10px; margin-bottom:15px; border-radius:4px;"><strong style="color:#E53E3E;">⚠️ Alerta de Stock Bajo:</strong><ul style="margin:5px 0 0 20px; color:#C53030; font-size:0.85rem;">`; 
        stockBajo.forEach(i => { 
            const libre = parseFloat(i.stock_real||0) - parseFloat(i.stock_reservado||0) - parseFloat(i.stock_comprometido||0);
            alertasHTML += `<li>${App.ui.escapeHTML(i.nombre)}: Quedan ${libre} libres (Mínimo: ${i.stock_minimo})</li>`; 
        }); 
        alertasHTML += `</ul></div>`; 
    } 
    
    let pedAtrasados = 0; let pedUrgentes = 0; const hoy = new Date(); hoy.setHours(0,0,0,0);
    App.state.pedidos.forEach(p => {
        if(p.estado !== 'listo para entregar' && p.estado !== 'pagado' && p.fecha_entrega) {
            const fEnt = new Date(p.fecha_entrega+'T00:00:00'); const diffDias = Math.ceil((fEnt - hoy)/(1000*60*60*24));
            if(diffDias < 0) pedAtrasados++; else if(diffDias >= 0 && diffDias <= 3) pedUrgentes++;
        }
    });
    
    if(pedAtrasados > 0 || pedUrgentes > 0) {
        alertasHTML += `<div style="background:#FFF5F5; border-left:4px solid var(--danger); padding:10px; margin-bottom:15px; border-radius:4px;"><strong style="color:var(--danger);">🚨 Alerta de Entregas:</strong><ul style="margin:5px 0 0 20px; color:var(--danger); font-size:0.85rem;">`;
        if(pedAtrasados > 0) alertasHTML += `<li>¡Tienes <strong>${pedAtrasados} pedido(s) atrasado(s)</strong>!</li>`;
        if(pedUrgentes > 0) alertasHTML += `<li>Hay ${pedUrgentes} pedido(s) a entregar pronto.</li>`;
        alertasHTML += `</ul></div>`;
    }
    return `${alertasHTML}<div class="grid-2"><div class="card stat-card"><div class="label">Pedidos</div><div class="value">${pedidosCount}</div></div><div class="card stat-card"><div class="label">Producción</div><div class="value">${prodCount}</div></div><div class="card stat-card" onclick="App.router.navigate('nomina')" style="cursor:pointer; background:#FFF5F5;"><div class="label" style="color:#E53E3E;">Nómina</div><div class="value">🧑‍🎨</div></div><div class="card stat-card" onclick="App.router.navigate('finanzas')" style="cursor:pointer; background:#EBF8FF;"><div class="label" style="color:#3182CE;">Ver Finanzas</div><div class="value">📊</div></div></div>`; 
};

App.views.mas = function() { 
    return `<div class="grid-2">
        <div class="card stat-card" style="cursor:pointer; background:#FEFCBF; grid-column: span 2;" onclick="App.router.navigate('cobranza')"><div class="label" style="margin-top:0; color:#B7791F; font-size:1.1rem;">💰 Cobranza (CxC)</div></div>
        <div class="card stat-card" style="cursor:pointer; background:#EBF8FF; grid-column: span 2;" onclick="App.router.navigate('reportes')"><div class="label" style="margin-top:0; color:#2B6CB0; font-size:1.1rem;">📊 Centro de Reportes (BI)</div></div>
        <div class="card stat-card" style="cursor:pointer;" onclick="App.router.navigate('clientes')"><div class="label" style="margin-top:0;">👥 Clientes</div></div>
        <div class="card stat-card" style="cursor:pointer;" onclick="App.router.navigate('proveedores')"><div class="label" style="margin-top:0;">🚚 Proveedores</div></div>
        <div class="card stat-card" style="cursor:pointer;" onclick="App.router.navigate('artesanos')"><div class="label" style="margin-top:0;">🧑‍🎨 Artesanos</div></div>
        <div class="card stat-card" style="cursor:pointer; background: #F0FFF4;" onclick="App.router.navigate('inventario')"><div class="label" style="margin-top:0; color:#276749;">📦 Bodega / Insumos</div></div>
        <div class="card stat-card" style="cursor:pointer;" onclick="App.router.navigate('productos')"><div class="label" style="margin-top:0;">🧶 Productos / Recetas</div></div>
        <div class="card stat-card" style="cursor:pointer; background: #EBF8FF;" onclick="App.router.navigate('compras')"><div class="label" style="margin-top:0; color:#3182CE;">🛒 Ingresar Compra</div></div>
        <div class="card stat-card" style="cursor:pointer; background: #FAF5FF;" onclick="App.router.navigate('reparaciones')"><div class="label" style="margin-top:0; color:#6B46C1;">🪡 Reparaciones</div></div>
        <div class="card stat-card" style="cursor:pointer; background: #EEF2FF;" onclick="App.router.navigate('cotizaciones')"><div class="label" style="margin-top:0; color:#4C51BF;">📝 Cotizaciones</div></div>
        <div class="card stat-card" style="cursor:pointer; background: #EDF2F7; grid-column: span 2;" onclick="App.router.navigate('configuracion')"><div class="label" style="margin-top:0; color: #4A5568;">⚙️ Configuración</div></div>
    </div>`; 
};

App.views.configuracion = function() { return `<div class="card"><h3 class="card-title">Configuración</h3><button class="btn btn-primary" style="width: 100%; margin-bottom: 15px;" onclick="App.logic.descargarRespaldo()">💾 Descargar Respaldo JSON</button><button class="btn btn-secondary" style="width: 100%; margin-bottom: 15px; border-color:#38A169; color:#38A169; background:transparent;" onclick="window.exportarAExcel(App.state.movimientos_inventario, 'Kardex_Completo')">📥 Descargar Kardex a Excel</button><button class="btn btn-secondary" style="width: 100%; margin-bottom: 15px; border-color:#2B6CB0; color:#2B6CB0; background:transparent;" onclick="App.logic.verDiagnostico()">🛠️ Diagnóstico de Base de Datos</button><button class="btn btn-secondary" style="width: 100%; background: #FED7D7; color: var(--danger); border: none;" onclick="localStorage.removeItem('erp_session_token'); location.reload();">🔒 Cerrar Sesión</button></div>`; };

App.views.modalBuscadorGlobal = function() { 
    let html = `
        <div style="margin-bottom:15px; position: sticky; top: 0; background: white; padding-bottom: 10px; z-index: 10;">
            <input type="text" id="input-busqueda-global" placeholder="Buscar cliente, pedido o producto..." style="width:100%; padding:12px; border-radius:8px; border:2px solid var(--primary); font-size:1rem; outline: none;" onkeyup="App.logic.ejecutarBusquedaGlobal(this.value)" autocomplete="off">
        </div>
        <div id="resultados-busqueda-global" style="max-height:50vh; overflow-y:auto; padding-bottom: 20px; color: var(--text-muted); text-align: center;">
            Escribe al menos 2 letras para empezar a buscar...
        </div>
    `; 
    App.ui.openSheet("🔍 Buscador", html); 
    setTimeout(() => document.getElementById('input-busqueda-global').focus(), 400);
};
