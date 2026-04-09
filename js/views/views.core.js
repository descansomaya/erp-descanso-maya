// ==========================================
// VISTAS: NÚCLEO Y PANTALLAS PRINCIPALES (REDISEÑADAS)
// ==========================================

App.views.login = function() { 
    return `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:80vh; text-align:center; padding:20px;">
        <div style="background:var(--primary-light); color:var(--primary); width:90px; height:90px; border-radius:24px; display:flex; align-items:center; justify-content:center; font-size:2.5rem; margin-bottom:20px; box-shadow:var(--shadow-sm);">🔒</div>
        <h2 style="margin-bottom:10px; font-weight:800; font-size:1.8rem; color:var(--text-main);">Descanso Maya</h2>
        <p style="color:var(--text-muted); margin-bottom:30px;">Gestión y Control Operativo</p>
        <div class="modern-card" style="width:100%; max-width:320px; padding:24px;">
            <input type="password" id="pin-input" class="input-modern" placeholder="Ingresa tu PIN" style="text-align:center; font-size:1.2rem; letter-spacing:4px; font-weight:bold;">
            <button class="btn-modern btn-primary" onclick="App.logic.verificarPIN(document.getElementById('pin-input').value)">Acceder al Sistema</button>
        </div>
    </div>`; 
};

App.views.inicio = function() { 
    document.getElementById('bottom-nav').style.display = 'flex'; 
    const pedidosCount = App.state.pedidos ? App.state.pedidos.length : 0; 
    const prodCount = App.state.ordenes_produccion ? App.state.ordenes_produccion.filter(o => o.estado !== 'listo').length : 0; 
    let alertasHTML = ''; 
    
    const stockBajo = App.state.inventario.filter(i => { const libre = parseFloat(i.stock_real||0) - parseFloat(i.stock_reservado||0) - parseFloat(i.stock_comprometido||0); return parseFloat(i.stock_minimo) > 0 && libre <= parseFloat(i.stock_minimo); }); 
    if(stockBajo.length > 0) { 
        alertasHTML += `<div class="modern-card" style="background:var(--danger-bg); border-color:#FEB2B2;">
            <strong style="color:var(--danger); display:flex; align-items:center; gap:8px;"><span>⚠️</span> Alerta de Insumos Críticos</strong>
            <ul style="margin:8px 0 0 20px; color:#9B2C2C; font-size:0.85rem;">`; 
        stockBajo.forEach(i => { const libre = parseFloat(i.stock_real||0) - parseFloat(i.stock_reservado||0) - parseFloat(i.stock_comprometido||0); alertasHTML += `<li>${App.ui.escapeHTML(i.nombre)}: Quedan ${libre} libres</li>`; }); 
        alertasHTML += `</ul></div>`; 
    } 
    
    let pedAtrasados = 0; let pedUrgentes = 0; const hoy = new Date(); hoy.setHours(0,0,0,0);
    App.state.pedidos.forEach(p => { if(p.estado !== 'listo para entregar' && p.estado !== 'pagado' && p.fecha_entrega) { const fEnt = new Date(p.fecha_entrega+'T00:00:00'); const diffDias = Math.ceil((fEnt - hoy)/(1000*60*60*24)); if(diffDias < 0) pedAtrasados++; else if(diffDias >= 0 && diffDias <= 3) pedUrgentes++; } });
    if(pedAtrasados > 0 || pedUrgentes > 0) {
        alertasHTML += `<div class="modern-card" style="background:var(--warning-bg); border-color:#F6E05E;">
            <strong style="color:#B7791F; display:flex; align-items:center; gap:8px;"><span>🚨</span> Entregas Pendientes</strong>
            <ul style="margin:8px 0 0 20px; color:#975A16; font-size:0.85rem;">`;
        if(pedAtrasados > 0) alertasHTML += `<li>¡Tienes <strong>${pedAtrasados} pedido(s) atrasado(s)</strong>!</li>`;
        if(pedUrgentes > 0) alertasHTML += `<li>Hay ${pedUrgentes} pedido(s) a entregar pronto.</li>`;
        alertasHTML += `</ul></div>`;
    }

    return `<div class="container-app">
        <div class="top-header">
            <div>
                <p style="color:var(--text-muted); margin:0; font-size:0.85rem;">Hola, buen día</p>
                <h2>Panel Principal</h2>
            </div>
            <div class="list-icon" style="cursor:pointer;" onclick="App.views.modalBuscadorGlobal()">🔍</div>
        </div>
        ${alertasHTML}
        <h4 style="color:var(--text-muted); font-size:0.85rem; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px;">Resumen Operativo</h4>
        <div class="grid-2">
            <div class="stat-card-modern" onclick="App.router.navigate('pedidos')">
                <div style="font-size:2rem; margin-bottom:5px;">📦</div>
                <div style="font-size:1.8rem; font-weight:800; color:var(--text-main);">${pedidosCount}</div>
                <div style="color:var(--text-muted); font-size:0.85rem;">Ventas</div>
            </div>
            <div class="stat-card-modern" onclick="App.router.navigate('produccion')">
                <div style="font-size:2rem; margin-bottom:5px;">🔨</div>
                <div style="font-size:1.8rem; font-weight:800; color:var(--text-main);">${prodCount}</div>
                <div style="color:var(--text-muted); font-size:0.85rem;">En Taller</div>
            </div>
            <div class="stat-card-modern" onclick="App.router.navigate('nomina')" style="background:var(--danger-bg); border-color:#FEB2B2;">
                <div style="font-size:1.5rem; margin-bottom:5px;">🧑‍🎨</div>
                <div style="color:var(--danger); font-weight:bold; font-size:1rem;">Nómina</div>
            </div>
            <div class="stat-card-modern" onclick="App.router.navigate('finanzas')" style="background:var(--primary-light); border-color:#E9D8FD;">
                <div style="font-size:1.5rem; margin-bottom:5px;">📊</div>
                <div style="color:var(--primary-dark); font-weight:bold; font-size:1rem;">Finanzas</div>
            </div>
        </div>
    </div>`; 
};

App.views.mas = function() { 
    return `<div class="container-app">
        <div class="top-header"><h2>Menú de Módulos</h2></div>
        
        <div class="modern-card" style="padding:0; overflow:hidden; margin-bottom:20px;">
            <div class="list-item" style="padding:15px; cursor:pointer; background:var(--warning-bg);" onclick="App.router.navigate('cobranza')">
                <div style="display:flex; align-items:center; gap:12px;"><div class="list-icon" style="background:#F6E05E; color:#975A16;">💰</div><strong style="color:#975A16; font-size:1.1rem;">Cobranza (CxC)</strong></div>
            </div>
            <div class="list-item" style="padding:15px; cursor:pointer; background:var(--primary-light);" onclick="App.router.navigate('reportes')">
                <div style="display:flex; align-items:center; gap:12px;"><div class="list-icon" style="background:#E9D8FD; color:var(--primary-dark);">📊</div><strong style="color:var(--primary-dark); font-size:1.1rem;">Centro de Reportes (BI)</strong></div>
            </div>
        </div>

        <h4 style="color:var(--text-muted); font-size:0.85rem; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px;">Catálogos y Operación</h4>
        <div class="modern-card" style="padding:0; overflow:hidden; margin-bottom:20px;">
            <div class="list-item" style="padding:15px; cursor:pointer;" onclick="App.router.navigate('clientes')">
                <div style="display:flex; align-items:center; gap:12px;"><div class="list-icon">👥</div><strong style="color:var(--text-main);">Clientes</strong></div>
            </div>
            <div class="list-item" style="padding:15px; cursor:pointer;" onclick="App.router.navigate('proveedores')">
                <div style="display:flex; align-items:center; gap:12px;"><div class="list-icon">🚚</div><strong style="color:var(--text-main);">Proveedores</strong></div>
            </div>
            <div class="list-item" style="padding:15px; cursor:pointer;" onclick="App.router.navigate('artesanos')">
                <div style="display:flex; align-items:center; gap:12px;"><div class="list-icon">🧑‍🎨</div><strong style="color:var(--text-main);">Artesanos / Tareas</strong></div>
            </div>
            <div class="list-item" style="padding:15px; cursor:pointer;" onclick="App.router.navigate('productos')">
                <div style="display:flex; align-items:center; gap:12px;"><div class="list-icon">🧶</div><strong style="color:var(--text-main);">Catálogo de Productos</strong></div>
            </div>
            <div class="list-item" style="padding:15px; cursor:pointer;" onclick="App.router.navigate('reparaciones')">
                <div style="display:flex; align-items:center; gap:12px;"><div class="list-icon">🪡</div><strong style="color:var(--text-main);">Reparaciones</strong></div>
            </div>
        </div>

        <h4 style="color:var(--text-muted); font-size:0.85rem; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px;">Gestión Externa</h4>
        <div class="modern-card" style="padding:0; overflow:hidden; margin-bottom:20px;">
            <div class="list-item" style="padding:15px; cursor:pointer;" onclick="App.router.navigate('compras')">
                <div style="display:flex; align-items:center; gap:12px;"><div class="list-icon" style="background:var(--success-bg); color:var(--success);">🛒</div><strong style="color:var(--success);">Ingresar Compra CxP</strong></div>
            </div>
            <div class="list-item" style="padding:15px; cursor:pointer;" onclick="App.router.navigate('cotizaciones')">
                <div style="display:flex; align-items:center; gap:12px;"><div class="list-icon">📝</div><strong style="color:var(--text-main);">Cotizaciones</strong></div>
            </div>
            <div class="list-item" style="padding:15px; cursor:pointer; background:#EDF2F7;" onclick="App.router.navigate('configuracion')">
                <div style="display:flex; align-items:center; gap:12px;"><div class="list-icon" style="background:#E2E8F0; color:#4A5568;">⚙️</div><strong style="color:#4A5568;">Configuración del Sistema</strong></div>
            </div>
        </div>
    </div>`; 
};

App.views.configuracion = function() { 
    return `<div class="container-app">
        <div class="top-header"><h2>Configuración</h2></div>
        <div class="modern-card">
            <button class="btn-modern btn-outline" style="margin-bottom: 12px;" onclick="App.logic.descargarRespaldo()">💾 Descargar Respaldo JSON</button>
            <button class="btn-modern btn-ghost" style="margin-bottom: 12px;" onclick="window.exportarAExcel(App.state.movimientos_inventario, 'Kardex_Completo')">📥 Descargar Kardex a Excel</button>
            <button class="btn-modern btn-ghost" style="margin-bottom: 24px;" onclick="App.logic.verDiagnostico()">🛠️ Diagnóstico de Base de Datos</button>
            <button class="btn-modern btn-danger" onclick="localStorage.removeItem('erp_session_token'); location.reload();">🔒 Cerrar Sesión Segura</button>
        </div>
    </div>`; 
};

App.views.modalBuscadorGlobal = function() { 
    let html = `
        <div style="margin-bottom:15px; position: sticky; top: 0; background: var(--surface); padding-bottom: 10px; z-index: 10;">
            <input type="text" id="input-busqueda-global" class="input-modern" placeholder="Buscar folio, cliente o producto..." style="margin:0;" onkeyup="App.logic.ejecutarBusquedaGlobal(this.value)" autocomplete="off">
        </div>
        <div id="resultados-busqueda-global" style="max-height:50vh; overflow-y:auto; padding-bottom: 20px; color: var(--text-muted); text-align: center;">
            Escribe al menos 2 letras para empezar a buscar...
        </div>
    `; 
    App.ui.openSheet("🔍 Buscador", html); 
    setTimeout(() => document.getElementById('input-busqueda-global').focus(), 400);
};
