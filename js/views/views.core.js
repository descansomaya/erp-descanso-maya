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
    const clientes = App.state.clientes || [];
    const abonos = App.state.abonos || [];
    const abonosReparaciones = App.state.abonos_reparaciones || [];

    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();
    const esMismoMes = (fechaStr) => {
        if (!fechaStr) return false;
        const f = new Date(fechaStr);
        return !isNaN(f.getTime()) && f.getMonth() === mesActual && f.getFullYear() === anioActual;
    };

    const pedidosActivos = pedidos.filter(p => !['entregado', 'pagado'].includes(String(p.estado || '').toLowerCase())).length;
    const produccionActiva = produccion.filter(o => String(o.estado || '').toLowerCase() !== 'listo').length;
    const reparacionesActivas = reparaciones.filter(r => String(r.estado || '').toLowerCase() !== 'entregada').length;
    const cotPendientes = cotizaciones.filter(c => String(c.estado_conversion || '').toLowerCase() !== 'convertida').length;
    const cotConvertidas = cotizaciones.filter(c => String(c.estado_conversion || '').toLowerCase() === 'convertida').length;
    const tasaConversion = cotizaciones.length ? (cotConvertidas / cotizaciones.length) * 100 : 0;

    const ventasMes = pedidos.filter(p => esMismoMes(p.fecha_creacion)).reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);
    const cobradoMes =
        pedidos.filter(p => esMismoMes(p.fecha_creacion)).reduce((acc, p) => acc + (parseFloat(p.anticipo || 0) || 0), 0) +
        abonos.filter(a => esMismoMes(a.fecha)).reduce((acc, a) => acc + (parseFloat(a.monto || 0) || 0), 0) +
        reparaciones.filter(r => esMismoMes(r.fecha_creacion)).reduce((acc, r) => acc + (parseFloat(r.anticipo_inicial || r.anticipo || 0) || 0), 0) +
        abonosReparaciones.filter(a => esMismoMes(a.fecha)).reduce((acc, a) => acc + (parseFloat(a.monto || 0) || 0), 0);

    const cotizado = cotizaciones.reduce((acc, c) => acc + (parseFloat(c.total || 0) || 0), 0);
    const montoConvertido = cotizaciones
        .filter(c => String(c.estado_conversion || '').toLowerCase() === 'convertida')
        .reduce((acc, c) => acc + (parseFloat(c.total || 0) || 0), 0);

    const stockCritico = inventario.filter(i => {
        const libre = (parseFloat(i.stock_real || 0) || 0) - (parseFloat(i.stock_reservado || 0) || 0) - (parseFloat(i.stock_comprometido || 0) || 0);
        return (parseFloat(i.stock_minimo || 0) || 0) > 0 && libre <= (parseFloat(i.stock_minimo || 0) || 0);
    });

    const pendientesEntrega = pedidos.filter(p => {
        const estado = String(p.estado || '').toLowerCase();
        return !['entregado', 'pagado'].includes(estado);
    }).length;

    const topClientes = clientes.map(c => {
        const ventasCliente = pedidos
            .filter(p => p.cliente_id === c.id)
            .reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);
        const cotCliente = cotizaciones
            .filter(ct => ct.cliente_id === c.id)
            .reduce((acc, ct) => acc + (parseFloat(ct.total || 0) || 0), 0);
        return {
            nombre: c.nombre || 'Cliente',
            ventas: ventasCliente,
            cotizado: cotCliente
        };
    }).filter(x => x.ventas > 0 || x.cotizado > 0)
      .sort((a, b) => (b.ventas + b.cotizado) - (a.ventas + a.cotizado))
      .slice(0, 5);

    const cotizacionesRecientes = [...cotizaciones]
        .sort((a, b) => new Date(b.fecha || b.fecha_creacion || 0) - new Date(a.fecha || a.fecha_creacion || 0))
        .slice(0, 5);

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

    const topClientesHTML = topClientes.length
        ? topClientes.map(c => `
            <div class="dm-row-between dm-mb-2" style="gap:10px; align-items:flex-start;">
                <div style="flex:1; min-width:0;">
                    <strong>${App.ui.safe(c.nombre)}</strong><br>
                    <small class="dm-muted">Cotizado: ${App.ui.money(c.cotizado || 0)}</small>
                </div>
                <div style="text-align:right;">
                    <strong>${App.ui.money(c.ventas || 0)}</strong><br>
                    <small class="dm-muted">Ventas</small>
                </div>
            </div>
        `).join('')
        : `<div class="dm-alert dm-alert-info">Aún no hay clientes con movimiento suficiente.</div>`;

    const recientesHTML = cotizacionesRecientes.length
        ? cotizacionesRecientes.map(c => `
            <div class="dm-row-between dm-mb-2" style="gap:10px; align-items:flex-start;">
                <div style="flex:1; min-width:0;">
                    <strong>${App.ui.safe(c.id || '')}</strong><br>
                    <small class="dm-muted">${App.ui.safe(c.cliente_nombre || 'Cliente')}</small>
                </div>
                <div style="text-align:right;">
                    <strong>${App.ui.money(c.total || 0)}</strong><br>
                    <small class="dm-muted">${App.ui.safe(String(c.estado_conversion || 'pendiente').toUpperCase())}</small>
                </div>
            </div>
        `).join('')
        : `<div class="dm-alert dm-alert-info">No hay cotizaciones recientes.</div>`;

    return `
        <div class="dm-section" style="padding-bottom:90px;">
            <div class="dm-card dm-mb-4" style="background:linear-gradient(135deg, #ffffff 0%, #faf7ff 100%);">
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <div>
                        <h2 class="dm-card-title" style="font-size:1.7rem;">Dashboard</h2>
                        <p class="dm-muted" style="margin-top:6px; max-width:760px;">Resumen ejecutivo del negocio: operación, ventas, cotizaciones, cobranza y foco comercial en un solo panel.</p>
                    </div>
                    <div class="dm-list-card-actions" style="margin-top:0; display:flex; gap:8px; flex-wrap:wrap;">
                        <button class="dm-btn dm-btn-primary dm-btn-sm" onclick="App.router.navigate('pedidos')">📦 Pedidos</button>
                        <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.router.navigate('produccion')">🔨 Taller</button>
                        <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.router.navigate('inventario')">🧶 Inventario</button>
                        <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.router.navigate('cotizaciones')">📝 Cotizaciones</button>
                        <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.router.navigate('reparaciones')">🪡 Reparaciones</button>
                        <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.router.navigate('finanzas')">📊 Finanzas</button>
                    </div>
                </div>
            </div>

            ${alertas}

            <div class="dm-mb-4" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(190px,1fr)); gap:12px;">
                <div class="dm-card" onclick="App.router.navigate('pedidos')" style="cursor:pointer;">
                    <small class="dm-muted">Ventas del mes</small>
                    <div class="dm-text-xl dm-fw-bold">${App.ui.money(ventasMes)}</div>
                </div>
                <div class="dm-card" onclick="App.router.navigate('cobranza')" style="cursor:pointer;">
                    <small class="dm-muted">Cobrado del mes</small>
                    <div class="dm-text-xl dm-fw-bold">${App.ui.money(cobradoMes)}</div>
                </div>
                <div class="dm-card" onclick="App.router.navigate('cotizaciones')" style="cursor:pointer;">
                    <small class="dm-muted">Monto cotizado</small>
                    <div class="dm-text-xl dm-fw-bold">${App.ui.money(cotizado)}</div>
                </div>
                <div class="dm-card" onclick="App.router.navigate('cotizaciones')" style="cursor:pointer;">
                    <small class="dm-muted">Monto convertido</small>
                    <div class="dm-text-xl dm-fw-bold">${App.ui.money(montoConvertido)}</div>
                </div>
            </div>

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
                <div class="dm-card" onclick="App.router.navigate('inventario')" style="cursor:pointer;">
                    <small class="dm-muted">Stock crítico</small>
                    <div class="dm-text-xl dm-fw-bold">${stockCritico.length}</div>
                </div>
            </div>

            <div class="dm-mb-4" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px,1fr)); gap:12px;">
                <div class="dm-card" style="background:#F0FFF4;">
                    <small class="dm-muted">Cotizaciones convertidas</small>
                    <div class="dm-text-xl dm-fw-bold" style="color:#2F855A;">${cotConvertidas}</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Total histórico convertido</div>
                </div>
                <div class="dm-card" style="background:#FFFBEA;">
                    <small class="dm-muted">Cotizaciones pendientes</small>
                    <div class="dm-text-xl dm-fw-bold" style="color:#B7791F;">${cotPendientes}</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Requieren seguimiento</div>
                </div>
                <div class="dm-card" style="background:${tasaConversion >= 50 ? '#F0FFF4' : '#FFF5F5'};">
                    <small class="dm-muted">Tasa de conversión</small>
                    <div class="dm-text-xl dm-fw-bold" style="color:${tasaConversion >= 50 ? '#2F855A' : '#C53030'};">${tasaConversion.toFixed(1)}%</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Cotizaciones convertidas / total</div>
                </div>
            </div>

            <div class="dm-mb-4" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px,1fr)); gap:12px;">
                <div class="dm-card">
                    <h3 class="dm-card-title">Top clientes</h3>
                    <div class="dm-mt-3">${topClientesHTML}</div>
                </div>
                <div class="dm-card">
                    <h3 class="dm-card-title">Cotizaciones recientes</h3>
                    <div class="dm-mt-3">${recientesHTML}</div>
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