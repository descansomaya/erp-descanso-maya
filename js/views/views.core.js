// ==========================================
// VISTAS: NÚCLEO Y PANTALLAS PRINCIPALES
// ==========================================

window.App = window.App || {};
App.views = App.views || {};

App.views.login = function() {
    return `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:80vh; text-align:center; padding:20px;">
            <div style="background:var(--dm-primary-soft); color:var(--dm-primary); width:90px; height:90px; border-radius:24px; display:flex; align-items:center; justify-content:center; font-size:2.5rem; margin-bottom:20px; box-shadow:var(--dm-shadow-sm);">🔒</div>
            <h2 style="margin-bottom:10px; font-weight:800; font-size:1.8rem; color:var(--dm-text);">Descanso Maya</h2>
            <p style="color:var(--dm-text-soft); margin-bottom:30px;">Gestión y Control Operativo</p>
            <div class="dm-card" style="width:100%; max-width:320px; padding:24px;">
                <input type="password" id="pin-input" class="dm-input" placeholder="Ingresa tu PIN" style="text-align:center; font-size:1.2rem; letter-spacing:4px; font-weight:bold; margin-bottom:20px;">
                <button class="dm-btn dm-btn-primary dm-btn-block" onclick="App.logic.verificarPIN(document.getElementById('pin-input').value)">Acceder al Sistema</button>
            </div>
        </div>
    `;
};

App.views.inicio = function() {
    const elTitle = document.getElementById('app-header-title');
    const elSubtitle = document.getElementById('app-header-subtitle');
    if (elTitle) elTitle.innerText = 'Dashboard';
    if (elSubtitle) elSubtitle.innerText = 'Resumen Operativo';

    const pedidosCount = App.state.pedidos ? App.state.pedidos.length : 0;
    const prodCount = App.state.ordenes_produccion
        ? App.state.ordenes_produccion.filter(o => o.estado !== 'listo').length
        : 0;

    let alertasHTML = '';

    const stockBajo = (App.state.inventario || []).filter(i => {
        const libre =
            parseFloat(i.stock_real || 0) -
            parseFloat(i.stock_reservado || 0) -
            parseFloat(i.stock_comprometido || 0);

        return parseFloat(i.stock_minimo || 0) > 0 && libre <= parseFloat(i.stock_minimo || 0);
    });

    if (stockBajo.length > 0) {
        alertasHTML += `
            <div class="dm-alert dm-alert-danger dm-mb-4">
                <strong>⚠️ Alerta de Insumos Críticos</strong>
                <ul style="margin:8px 0 0 20px; font-size:var(--dm-fs-sm);">
                    ${stockBajo.map(i => {
                        const libre =
                            parseFloat(i.stock_real || 0) -
                            parseFloat(i.stock_reservado || 0) -
                            parseFloat(i.stock_comprometido || 0);
                        return `<li>${App.ui.escapeHTML(i.nombre)}: Quedan ${libre} libres</li>`;
                    }).join('')}
                </ul>
            </div>
        `;
    }

    let pedAtrasados = 0;
    let pedUrgentes = 0;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    (App.state.pedidos || []).forEach(p => {
        if (p.estado !== 'entregado' && p.estado !== 'listo para entregar' && p.fecha_entrega) {
            const fEnt = new Date(p.fecha_entrega + 'T00:00:00');
            const diffDias = Math.ceil((fEnt - hoy) / (1000 * 60 * 60 * 24));
            if (diffDias < 0) pedAtrasados++;
            else if (diffDias >= 0 && diffDias <= 3) pedUrgentes++;
        }
    });

    if (pedAtrasados > 0 || pedUrgentes > 0) {
        alertasHTML += `
            <div class="dm-alert dm-alert-warning dm-mb-4">
                <strong>🚨 Entregas Pendientes</strong>
                <ul style="margin:8px 0 0 20px; font-size:var(--dm-fs-sm);">
                    ${pedAtrasados > 0 ? `<li>¡Tienes <strong>${pedAtrasados} pedido(s) atrasado(s)</strong>!</li>` : ''}
                    ${pedUrgentes > 0 ? `<li>Hay ${pedUrgentes} pedido(s) a entregar pronto.</li>` : ''}
                </ul>
            </div>
        `;
    }

    return `
        <div class="dm-section">
            ${alertasHTML}

            <div class="dm-section-header">
                <h2 class="dm-section-title">Métricas Principales</h2>
            </div>

            <div class="dm-grid dm-grid-kpi">
                <div class="dm-kpi" onclick="App.router.navigate('pedidos')" style="cursor:pointer;">
                    <div class="dm-kpi-label">Ventas Totales</div>
                    <div class="dm-kpi-value">${pedidosCount}</div>
                    <div class="dm-kpi-meta"><span class="dm-badge dm-badge-info">📦 Pedidos</span></div>
                </div>

                <div class="dm-kpi" onclick="App.router.navigate('produccion')" style="cursor:pointer;">
                    <div class="dm-kpi-label">En Taller</div>
                    <div class="dm-kpi-value">${prodCount}</div>
                    <div class="dm-kpi-meta"><span class="dm-badge dm-badge-warning">🔨 Producción</span></div>
                </div>

                <div class="dm-kpi" onclick="App.router.navigate('reparaciones')" style="cursor:pointer;">
                    <div class="dm-kpi-label">Reparaciones</div>
                    <div class="dm-kpi-value">${(App.state.reparaciones || []).length}</div>
                    <div class="dm-kpi-meta"><span class="dm-badge dm-badge-info">🪡 Servicio</span></div>
                </div>

                <div class="dm-kpi" onclick="App.router.navigate('finanzas')" style="cursor:pointer;">
                    <div class="dm-kpi-label">Flujos</div>
                    <div class="dm-kpi-value" style="color:var(--dm-success);">Ver</div>
                    <div class="dm-kpi-meta"><span class="dm-badge dm-badge-success">📊 Finanzas</span></div>
                </div>
            </div>
        </div>
    `;
};

App.views.moduloNoDisponible = function(nombre = 'Módulo') {
    App.ui.toast(`${nombre} aún no está disponible en esta versión.`, 'warning');
};

App.views.mas = function() {
    const elTitle = document.getElementById('app-header-title');
    const elSubtitle = document.getElementById('app-header-subtitle');
    if (elTitle) elTitle.innerText = 'Menú Adicional';
    if (elSubtitle) elSubtitle.innerText = 'Accesos y configuración';

    return `
        <div class="dm-section" style="padding-bottom:90px;">
            <h4 class="dm-label dm-mb-3">Módulos disponibles</h4>
            <div class="dm-list dm-mb-5">

                <div class="dm-list-card" style="padding:15px; cursor:pointer;" onclick="App.router.navigate('inventario')">
                    <div class="dm-row">
                        <div class="dm-badge dm-badge-primary" style="font-size:1.2rem; padding:10px;">🧶</div>
                        <strong class="dm-text-lg">Inventario</strong>
                    </div>
                </div>

                <div class="dm-list-card" style="padding:15px; cursor:pointer;" onclick="App.router.navigate('compras')">
                    <div class="dm-row">
                        <div class="dm-badge dm-badge-success" style="font-size:1.2rem; padding:10px;">🛒</div>
                        <strong class="dm-text-lg">Compras</strong>
                    </div>
                </div>

                <div class="dm-list-card" style="padding:15px; cursor:pointer;" onclick="App.router.navigate('cobranza')">
                    <div class="dm-row">
                        <div class="dm-badge dm-badge-warning" style="font-size:1.2rem; padding:10px;">💰</div>
                        <strong class="dm-text-lg">Cobranza</strong>
                    </div>
                </div>

                <div class="dm-list-card" style="padding:15px; cursor:pointer;" onclick="App.router.navigate('finanzas')">
                    <div class="dm-row">
                        <div class="dm-badge dm-badge-success" style="font-size:1.2rem; padding:10px;">📊</div>
                        <strong class="dm-text-lg">Finanzas</strong>
                    </div>
                </div>

                <div class="dm-list-card" style="padding:15px; cursor:pointer;" onclick="App.router.navigate('reportes')">
                    <div class="dm-row">
                        <div class="dm-badge dm-badge-primary" style="font-size:1.2rem; padding:10px;">📈</div>
                        <strong class="dm-text-lg">Reportes</strong>
                    </div>
                </div>

                <div class="dm-list-card" style="padding:15px; cursor:pointer;" onclick="App.router.navigate('clientes')">
                    <div class="dm-row">
                        <div class="dm-badge dm-badge-info" style="font-size:1.2rem; padding:10px;">👥</div>
                        <strong class="dm-text-lg">Clientes</strong>
                    </div>
                </div>

                <div class="dm-list-card" style="padding:15px; cursor:pointer;" onclick="App.router.navigate('proveedores')">
                    <div class="dm-row">
                        <div class="dm-badge dm-badge-info" style="font-size:1.2rem; padding:10px;">🚚</div>
                        <strong class="dm-text-lg">Proveedores</strong>
                    </div>
                </div>

                <div class="dm-list-card" style="padding:15px; cursor:pointer;" onclick="App.router.navigate('artesanos')">
                    <div class="dm-row">
                        <div class="dm-badge dm-badge-info" style="font-size:1.2rem; padding:10px;">🧑‍🎨</div>
                        <strong class="dm-text-lg">Artesanos / Tareas</strong>
                    </div>
                </div>

                <div class="dm-list-card" style="padding:15px; cursor:pointer;" onclick="App.router.navigate('productos')">
                    <div class="dm-row">
                        <div class="dm-badge dm-badge-info" style="font-size:1.2rem; padding:10px;">🧵</div>
                        <strong class="dm-text-lg">Productos</strong>
                    </div>
                </div>

                <div class="dm-list-card" style="padding:15px; cursor:pointer;" onclick="App.router.navigate('reparaciones')">
                    <div class="dm-row">
                        <div class="dm-badge dm-badge-info" style="font-size:1.2rem; padding:10px;">🪡</div>
                        <strong class="dm-text-lg">Reparaciones</strong>
                    </div>
                </div>
            </div>

            <h4 class="dm-label dm-mb-3">Pendiente de activación</h4>
            <div class="dm-list dm-mb-5">

                <div class="dm-list-card" style="padding:15px; opacity:.75; cursor:pointer;" onclick="App.views.moduloNoDisponible('Cotizaciones')">
                    <div class="dm-row-between">
                        <div class="dm-row">
                            <div class="dm-badge dm-badge-info" style="font-size:1.2rem; padding:10px;">📝</div>
                            <strong class="dm-text-lg">Cotizaciones</strong>
                        </div>
                        <span class="dm-badge dm-badge-warning">Próx.</span>
                    </div>
                </div>

                <div class="dm-list-card" style="padding:15px; opacity:.75; cursor:pointer;" onclick="App.views.moduloNoDisponible('Nómina')">
                    <div class="dm-row-between">
                        <div class="dm-row">
                            <div class="dm-badge dm-badge-danger" style="font-size:1.2rem; padding:10px;">💵</div>
                            <strong class="dm-text-lg">Nómina</strong>
                        </div>
                        <span class="dm-badge dm-badge-warning">Próx.</span>
                    </div>
                </div>
            </div>

            <h4 class="dm-label dm-mb-3">Sistema</h4>
            <div class="dm-list dm-mb-5">
                <div class="dm-list-card" style="padding:15px; cursor:pointer; background:var(--dm-surface-2);" onclick="App.router.navigate('configuracion')">
                    <div class="dm-row">
                        <div class="dm-badge dm-badge-info" style="font-size:1.2rem; padding:10px; background:#D1D5DB; color:#374151;">⚙️</div>
                        <strong class="dm-text-lg" style="color:#374151;">Configuración del Sistema</strong>
                    </div>
                </div>
            </div>
        </div>
    `;
};

App.views.configuracion = function() {
    const elTitle = document.getElementById('app-header-title');
    const elSubtitle = document.getElementById('app-header-subtitle');
    if (elTitle) elTitle.innerText = 'Configuración';
    if (elSubtitle) elSubtitle.innerText = 'Ajustes del sistema';

    return `
        <div class="dm-section">
            <div class="dm-card">
                <button class="dm-btn dm-btn-secondary dm-btn-block dm-mb-3" onclick="App.logic.descargarRespaldo()">💾 Descargar Respaldo JSON</button>
                <button class="dm-btn dm-btn-ghost dm-btn-block dm-mb-4" onclick="window.exportarAExcel(App.state.movimientos_inventario, 'Kardex_Completo')">📥 Descargar Kardex a Excel</button>
                <button class="dm-btn dm-btn-ghost dm-btn-block dm-mb-4" onclick="App.logic.verDiagnostico()">🛠️ Diagnóstico de Base de Datos</button>
                <button class="dm-btn dm-btn-danger dm-btn-block" onclick="localStorage.removeItem('erp_session_token'); location.reload();">🔒 Cerrar Sesión Segura</button>
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
