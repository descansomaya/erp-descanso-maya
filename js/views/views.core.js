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
    // Actualizar Header
    document.getElementById('app-header-title').innerText = "Dashboard";
    document.getElementById('app-header-subtitle').innerText = "Resumen de operación";

    const pedidosCount = App.state.pedidos ? App.state.pedidos.length : 0; 
    const prodCount = App.state.ordenes_produccion ? App.state.ordenes_produccion.filter(o => o.estado !== 'listo').length : 0; 
    
    return `
    <div class="dm-section">
        <div class="dm-section-header">
            <h2 class="dm-section-title">Métricas Principales</h2>
        </div>
        
        <div class="dm-grid dm-grid-kpi">
            <div class="dm-kpi" onclick="App.router.navigate('pedidos')" style="cursor:pointer;">
                <div class="dm-kpi-label">Total Pedidos</div>
                <div class="dm-kpi-value">${pedidosCount}</div>
                <div class="dm-kpi-meta"><span class="dm-badge dm-badge-info">📦 Ventas</span></div>
            </div>
            
            <div class="dm-kpi" onclick="App.router.navigate('produccion')" style="cursor:pointer;">
                <div class="dm-kpi-label">En Taller</div>
                <div class="dm-kpi-value">${prodCount}</div>
                <div class="dm-kpi-meta"><span class="dm-badge dm-badge-warning">🔨 Producción</span></div>
            </div>
            
            <div class="dm-kpi" onclick="App.router.navigate('nomina')" style="cursor:pointer;">
                <div class="dm-kpi-label">Nómina</div>
                <div class="dm-kpi-value" style="color:var(--dm-danger);">Pago</div>
                <div class="dm-kpi-meta"><span class="dm-badge dm-badge-danger">🧑‍🎨 Artesanos</span></div>
            </div>
            
            <div class="dm-kpi" onclick="App.router.navigate('finanzas')" style="cursor:pointer;">
                <div class="dm-kpi-label">Flujo de Caja</div>
                <div class="dm-kpi-value" style="color:var(--dm-success);">Ver</div>
                <div class="dm-kpi-meta"><span class="dm-badge dm-badge-success">📊 Finanzas</span></div>
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
