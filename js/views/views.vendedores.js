// ==========================================
// VISTAS: VENDEDORES
// ==========================================

window.App = window.App || {};
App.views = App.views || {};

App.views.vendedores = function() {
    const bottomNav = document.getElementById('bottom-nav');
    if (bottomNav) bottomNav.style.display = 'flex';

    const vendedores = App.state.vendedores || [];

    let html = `
        <div class="dm-section" style="padding-bottom:90px;">
            <div class="dm-card dm-mb-4">
                <h3 class="dm-card-title">Equipo de Ventas</h3>
                <p class="dm-muted dm-mb-2" style="margin-top:6px;">Gestiona a tus vendedores y paga sus comisiones.</p>
            </div>
            <div class="dm-list">
    `;

    if (vendedores.length === 0) {
        html += `<div class="dm-alert dm-alert-info">No hay vendedores registrados.</div>`;
    } else {
        vendedores.forEach(v => {
            html += `
                <div class="dm-list-card">
                    <div class="dm-row-between" style="align-items:flex-start; gap:12px;">
                        <div style="flex:1; min-width:0;">
                            <strong style="word-break:break-word;">${App.ui.escapeHTML(v.nombre)}</strong><br>
                            <small class="dm-muted">📞 ${App.ui.safe(v.telefono || 'N/A')}</small>
                        </div>
                        <div class="dm-list-card-actions" style="justify-content:flex-end;">
                            <button class="dm-btn dm-btn-secondary dm-btn-sm" style="border:1px solid var(--primary); color:var(--primary); background:transparent;" onclick="App.views.estadoCuentaVendedor('${v.id}')">
                                💰 Comisiones
                            </button>
                            <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.formVendedor('${v.id}')">✏️</button>
                            <button class="dm-btn dm-btn-danger dm-btn-sm" onclick="App.logic.eliminarRegistroGenerico('vendedores', '${v.id}', 'vendedores')">🗑️</button>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    html += `
            </div>
        </div>
        <button class="dm-fab" onclick="App.views.formVendedor()">+</button>
    `;

    return html;
};

App.views.estadoCuentaVendedor = function(vendedorId) {
    const vendedor = (App.state.vendedores || []).find(v => v.id === vendedorId);
    if (!vendedor) return;

    const estadoComisiones = App.logic.obtenerEstadoComisiones(vendedorId);
    const pendientes = estadoComisiones.pendientes;
    const totalPendiente = estadoComisiones.totalPendiente;
    
    let html = `
        <div class="dm-grid-2 dm-mb-4">
            <div class="dm-card" style="background:#EBF8FF;">
                <div class="dm-kpi-label" style="color:#2B6CB0;">Comisiones Pendientes</div>
                <div class="dm-kpi-value" style="color:#3182CE; font-size:1.2rem;">$${totalPendiente.toFixed(2)}</div>
            </div>
            <div class="dm-card" style="background:#F0FFF4;">
                <div class="dm-kpi-label" style="color:#276749;">Comisiones Pagadas (Histórico)</div>
                <div class="dm-kpi-value" style="color:#2F855A; font-size:1.2rem;">$${estadoComisiones.totalPagado.toFixed(2)}</div>
            </div>
        </div>
    `;

    if (pendientes.length === 0) {
        html += `<div class="dm-alert dm-alert-success dm-mb-3">No hay comisiones pendientes de pago. ¡Todo al corriente!</div>`;
    } else {
        html += `<h4 class="dm-label dm-mb-3">Ventas por liquidar:</h4>
                 <ul style="list-style:none; padding:10px; margin:0 0 15px 0; max-height:250px; overflow-y:auto; background:#f9f9f9; border-radius:8px; border:1px solid var(--border);">`;
        
        pendientes.forEach(p => {
            const estadoPed = String(p.estado || '').toUpperCase();
            html += `
                <li style="padding:8px 0; border-bottom:1px dashed #ccc; display:flex; justify-content:space-between; gap:12px;">
                    <span>
                        <strong>${App.ui.safe(p.id)}</strong> - <small>${App.ui.safe(p.cliente_nombre || 'Cliente')}</small><br>
                        <small class="dm-muted">Estado del pedido: ${estadoPed}</small>
                    </span>
                    <span style="color:var(--primary); font-weight:bold;">$${parseFloat(p.comision).toFixed(2)}</span>
                </li>
            `;
        });
        html += `</ul>`;

        // Extraemos los IDs de los pedidos para mandarlos a pagar
        const idsPendientes = pendientes.map(p => p.id).join(',');

        html += `
            <button class="dm-btn dm-btn-success dm-btn-block dm-mt-3" 
                    onclick="App.views.pagarComisionesVendedor('${vendedorId}', '${idsPendientes}', ${totalPendiente})">
                💸 Registrar Pago por $${totalPendiente.toFixed(2)}
            </button>
            <div class="dm-text-sm dm-muted dm-mt-2" style="text-align:center;">Al hacer clic, este monto se registrará automáticamente en tu módulo de Gastos Operativos.</div>
        `;
    }

    html += `<button class="dm-btn dm-btn-secondary dm-btn-block dm-mt-3" onclick="App.ui.closeSheet()">Cerrar</button>`;

    App.ui.openSheet(`💰 Estado de Cuenta: ${App.ui.escapeHTML(vendedor.nombre)}`, html);
};

App.views.pagarComisionesVendedor = async function(vendedorId, idsString, totalPago) {
    const ids = idsString.split(',');
    const ok = window.confirm(`¿Estás seguro de registrar un GASTO por $${totalPago.toFixed(2)} para liquidar estas comisiones?`);
    if (!ok) return;

    return App.ui.runSafeAction({
        lockKey: `pagar_comisiones:${vendedorId}`,
        loadingText: 'Registrando pago...',
        loaderMessage: 'Creando gasto y actualizando pedidos...',
        successMessage: 'Comisiones pagadas y registradas en Finanzas',
        errorTitle: 'Error al pagar comisiones',
        closeSheetOnSuccess: true
    }, async () => {
        await App.logic.pagarComisionesVendedor(vendedorId, ids, totalPago);
        if (App.router && App.router.handleRoute) {
            setTimeout(() => App.router.handleRoute(), 400);
        }
    });
};

App.views.formVendedor = function(id = null, callback = null) {
    const obj = id ? (App.state.vendedores || []).find(v => v.id === id) : null;

    const formHTML = `
        <form id="dynamic-form">
            <div class="dm-form-group">
                <label class="dm-label">Nombre del Vendedor</label>
                <input type="text" class="dm-input" name="nombre" value="${obj ? App.ui.escapeHTML(obj.nombre) : ''}" required>
            </div>
            <div class="dm-form-row">
                <div class="dm-form-group">
                    <label class="dm-label">Teléfono (10 dígitos)</label>
                    <input type="tel" class="dm-input" name="telefono" value="${obj ? App.ui.safe(obj.telefono) : ''}" pattern="\\d{10}" maxlength="10">
                </div>
                <div class="dm-form-group">
                    <label class="dm-label">Correo electrónico</label>
                    <input type="email" class="dm-input" name="correo" value="${obj ? App.ui.safe(obj.correo) : ''}">
                </div>
            </div>
            <input type="hidden" name="activo" value="TRUE">
            <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">
                ${obj ? 'Guardar Cambios' : 'Registrar Vendedor'}
            </button>
        </form>
    `;

    App.ui.openSheet(obj ? 'Editar Vendedor' : 'Nuevo Vendedor', formHTML, (data) => {
        if (obj) App.logic.actualizarRegistroGenerico('vendedores', id, data, 'vendedores', callback);
        else App.logic.guardarNuevoGenerico('vendedores', data, 'VEND', 'vendedores', callback);
    });
};
