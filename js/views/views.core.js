// ==========================================
// VISTAS: NÚCLEO Y PANTALLAS PRINCIPALES
// ==========================================

window.App = window.App || {};
App.views = App.views || {};

App.views.login = function() {
    return `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:80vh; text-align:center; padding:20px;">
            <div style="background:var(--dm-primary-soft); color:var(--dm-primary); width:90px; height:90px; border-radius:24px; display:flex; align-items:center; justify-content:center; font-size:2.5rem; margin-bottom:20px;">🔒</div>
            <h2>Descanso Maya</h2>
            <p>Gestión y Control Operativo</p>
            <div class="dm-card">
                <input type="password" id="pin-input" class="dm-input" placeholder="PIN">
                <button class="dm-btn dm-btn-primary dm-btn-block" onclick="App.logic.verificarPIN(document.getElementById('pin-input').value)">Entrar</button>
            </div>
        </div>
    `;
};

App.views.inicio = function() {
    const pedidos = App.state.pedidos || [];
    const produccion = App.state.ordenes_produccion || [];
    const reparaciones = App.state.reparaciones || [];
    const cotizaciones = App.state.cotizaciones || [];
    const inventario = App.state.inventario || [];

    const pedidosActivos = pedidos.filter(p => !['entregado', 'pagado'].includes(String(p.estado || '').toLowerCase())).length;
    const produccionActiva = produccion.filter(o => String(o.estado || '').toLowerCase() !== 'listo').length;
    const reparacionesActivas = reparaciones.filter(r => String(r.estado || '').toLowerCase() !== 'entregada').length;
    const cotPendientes = cotizaciones.filter(c => String(c.estado_conversion || '').toLowerCase() !== 'convertida').length;

    const ventasMes = pedidos.reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);
    const cotizado = cotizaciones.reduce((acc, c) => acc + (parseFloat(c.total || 0) || 0), 0);

    const stockCritico = inventario.filter(i => {
        const libre = (parseFloat(i.stock_real || 0) || 0) - (parseFloat(i.stock_reservado || 0) || 0) - (parseFloat(i.stock_comprometido || 0) || 0);
        return (parseFloat(i.stock_minimo || 0) || 0) > 0 && libre <= (parseFloat(i.stock_minimo || 0) || 0);
    });

    const pendientesEntrega = pedidos.filter(p => {
        const estado = String(p.estado || '').toLowerCase();
        return !['entregado', 'pagado'].includes(estado);
    }).length;

    let alertas = '';
    if (stockCritico.length > 0) {
        alertas += `
            <div class="dm-alert dm-alert-warning dm-mb-3">
                <strong>⚠️ Stock crítico:</strong> ${stockCritico.length} insumo(s) requieren atención.
            </div>
        `;
    }
    if (cotPendientes > 0) {
        alertas += `
            <div class="dm-alert dm-alert-info dm-mb-3">
                <strong>📝 Cotizaciones pendientes:</strong> ${cotPendientes} por convertir o dar seguimiento.
            </div>
        `;
    }
    if (pendientesEntrega > 0) {
        alertas += `
            <div class="dm-alert dm-alert-danger dm-mb-3">
                <strong>📦 Entregas pendientes:</strong> ${pendientesEntrega} pedido(s) activos.
            </div>
        `;
    }

    return `
        <div class="dm-section" style="padding-bottom:90px;">
            <div class="dm-mb-4">
                <h2 class="dm-card-title" style="font-size:1.6rem;">Dashboard ejecutivo</h2>
                <p class="dm-muted" style="margin-top:6px;">Resumen operativo y comercial de Descanso Maya.</p>
            </div>

            ${alertas}

            <div class="dm-mb-4" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px,1fr)); gap:12px;">
                <div class="dm-card" onclick="App.router.navigate('pedidos')" style="cursor:pointer;">
                    <small class="dm-muted">Pedidos activos</small>
                    <div class="dm-text-xl dm-fw-bold">${pedidosActivos}</div>
                </div>
                <div class="dm-card" onclick="App.router.navigate('produccion')" style="cursor:pointer;">
                    <small class="dm-muted">Producción activa</small>
                    <div class="dm-text-xl dm-fw-bold">${produccionActiva}</div>
                </div>
                <div class="dm-card" onclick="App.router.navigate('reparaciones')" style="cursor:pointer;">
                    <small class="dm-muted">Reparaciones activas</small>
                    <div class="dm-text-xl dm-fw-bold">${reparacionesActivas}</div>
                </div>
                <div class="dm-card" onclick="App.router.navigate('cotizaciones')" style="cursor:pointer;">
                    <small class="dm-muted">Cotizaciones pendientes</small>
                    <div class="dm-text-xl dm-fw-bold">${cotPendientes}</div>
                </div>
            </div>

            <div class="dm-mb-4" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px,1fr)); gap:12px;">
                <div class="dm-card">
                    <small class="dm-muted">Ventas registradas</small>
                    <div class="dm-text-xl dm-fw-bold">${App.ui.money ? App.ui.money(ventasMes) : '$' + ventasMes.toFixed(2)}</div>
                </div>
                <div class="dm-card">
                    <small class="dm-muted">Monto cotizado</small>
                    <div class="dm-text-xl dm-fw-bold">${App.ui.money ? App.ui.money(cotizado) : '$' + cotizado.toFixed(2)}</div>
                </div>
                <div class="dm-card">
                    <small class="dm-muted">Stock crítico</small>
                    <div class="dm-text-xl dm-fw-bold">${stockCritico.length}</div>
                </div>
            </div>

            <div class="dm-card dm-mb-4">
                <h3 class="dm-card-title">Accesos rápidos</h3>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px,1fr)); gap:10px; margin-top:12px;">
                    <button class="dm-btn dm-btn-primary" onclick="App.router.navigate('pedidos')">📦 Pedidos</button>
                    <button class="dm-btn dm-btn-secondary" onclick="App.router.navigate('produccion')">🔨 Taller</button>
                    <button class="dm-btn dm-btn-secondary" onclick="App.router.navigate('inventario')">🧶 Inventario</button>
                    <button class="dm-btn dm-btn-secondary" onclick="App.router.navigate('cotizaciones')">📝 Cotizaciones</button>
                    <button class="dm-btn dm-btn-secondary" onclick="App.router.navigate('reparaciones')">🪡 Reparaciones</button>
                    <button class="dm-btn dm-btn-secondary" onclick="App.router.navigate('finanzas')">📊 Finanzas</button>
                </div>
            </div>
        </div>
    `;
};

App.views.moduloNoDisponible = function(nombre = 'Módulo') {
    App.ui.toast(`${nombre} aún no está disponible`, 'warning');
};

App.views.mas = function() {
    return `
        <div class="dm-section" style="padding-bottom:90px;">
            <h4 class="dm-label dm-mb-3">Módulos disponibles</h4>
            <div class="dm-list dm-mb-5">
                ${card("inventario","🧶","Inventario")}
                ${card("compras","🛒","Compras")}
                ${card("cobranza","💰","Cobranza")}
                ${card("finanzas","📊","Finanzas")}
                ${card("nomina","💵","Nómina")}
                ${card("reportes","📈","Reportes")}
                ${card("clientes","👥","Clientes")}
                ${card("proveedores","🚚","Proveedores")}
                ${card("artesanos","🧑‍🎨","Artesanos")}
                ${card("productos","🧵","Productos")}
                ${card("reparaciones","🪡","Reparaciones")}
                ${card("cotizaciones","📝","Cotizaciones")}
            </div>

            <h4 class="dm-label dm-mb-3">Sistema</h4>
            <div class="dm-list">
                <div class="dm-list-card" onclick="App.router.navigate('configuracion')">
                    ⚙️ Configuración
                </div>
            </div>
        </div>
    `;
};

function card(route, icon, label){
    return `
        <div class="dm-list-card" onclick="App.router.navigate('${route}')">
            <div class="dm-row">
                <div>${icon}</div>
                <strong>${label}</strong>
            </div>
        </div>
    `;
}

App.views.configuracion = function() {
    return `
        <div class="dm-section">
            <div class="dm-card">
                <button class="dm-btn" onclick="App.logic.descargarRespaldo()">💾 Respaldo</button>
                <button class="dm-btn dm-btn-danger" onclick="localStorage.clear(); location.reload();">Cerrar sesión</button>
            </div>
        </div>
    `;
};

App.views.modalBuscadorGlobal = function() {
    const html = `
        <div class="dm-mb-4" style="position: sticky; top: 0; background: var(--dm-surface); padding-bottom: 10px; z-index: 10;">
            <input type="text" id="input-busqueda-global" class="dm-input" placeholder="Buscar folio, cliente o producto..." onkeyup="App.logic.ejecutarBusquedaGlobal(this.value)" autocomplete="off">
        </div>
        <div id="resultados-busqueda-global" style="max-height:50vh; overflow-y:auto; padding-bottom:20px; color: var(--dm-text-soft); text-align: center;">
            Escribe al menos 2 letras para empezar a buscar...
        </div>
    `;
    App.ui.openSheet('🔍 Buscador', html);
    setTimeout(() => document.getElementById('input-busqueda-global')?.focus(), 400);
};