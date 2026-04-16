// ==========================================
// VISTAS: REPARACIONES
// ==========================================

window.App = window.App || {};
App.views = App.views || {};

App.views.reparaciones = function () {
    const title = document.getElementById('app-header-title');
    const subtitle = document.getElementById('app-header-subtitle');
    const bottomNav = document.getElementById('bottom-nav');

    if (title) title.innerText = 'Reparaciones';
    if (subtitle) subtitle.innerText = 'Servicios y arreglos';
    if (bottomNav) bottomNav.style.display = 'flex';

    const reparaciones = [...(App.state.reparaciones || [])].sort((a, b) => {
        return new Date(b.fecha_creacion || b.fecha || 0) - new Date(a.fecha_creacion || a.fecha || 0);
    });

    let html = `
        <div class="dm-section" style="padding-bottom:90px;">
            <div class="dm-card dm-mb-4">
                <h3 class="dm-card-title">Reparaciones</h3>
                <p class="dm-muted dm-mb-3" style="margin-top:6px;">Control de trabajos, anticipos y saldos.</p>

                <input
                    type="text"
                    id="bus-rep"
                    class="dm-input"
                    onkeyup="window.filtrarLista('bus-rep', 'tarj-rep')"
                    placeholder="🔍 Buscar reparación..."
                >
            </div>

            <div class="dm-list">
    `;

    if (reparaciones.length === 0) {
        html += `<div class="dm-alert dm-alert-info">No hay reparaciones registradas.</div>`;
    } else {
        reparaciones.forEach(r => {
            const cliente = (App.state.clientes || []).find(c => c.id === r.cliente_id) || {};
            const total = parseFloat(r.precio || 0);
            const anticipo = parseFloat(r.anticipo || 0);
            const saldo = total - anticipo;
            const fecha = r.fecha_creacion ? String(r.fecha_creacion).split('T')[0] : '';
            const estado = String(r.estado || 'pendiente').toLowerCase();

            let estColor = 'dm-badge-primary';
            if (estado === 'lista' || estado === 'entregada') estColor = 'dm-badge-success';
            else if (estado === 'proceso') estColor = 'dm-badge-warning';

            html += `
                <div class="dm-list-card tarj-rep">
                    <div class="dm-row-between" style="align-items:flex-start; gap:12px;">
                        <div style="flex:1; min-width:0;">
                            <div class="dm-list-card-title">
                                ${App.ui.safe(r.id || '')} - ${App.ui.safe(cliente.nombre || 'Cliente')}
                            </div>
                            <div class="dm-list-card-subtitle dm-mt-2">
                                <span class="dm-badge ${estColor}">${App.ui.safe((r.estado || 'pendiente').toUpperCase())}</span>
                                ${fecha ? `<span class="dm-text-sm dm-muted" style="display:inline-block; margin-left:8px;">${fecha}</span>` : ''}
                            </div>
                            <div class="dm-text-sm dm-muted dm-mt-2">
                                ${App.ui.safe(r.descripcion || 'Sin descripción')}
                            </div>
                        </div>

                        <div style="text-align:right; flex:0 0 auto;">
                            <div class="dm-fw-bold dm-text-lg">$${total.toFixed(2)}</div>
                            <div class="dm-text-sm dm-muted">
                                Saldo:
                                <strong style="color:${saldo > 0 ? 'var(--dm-danger)' : 'var(--dm-success)'};">
                                    $${saldo.toFixed(2)}
                                </strong>
                            </div>
                        </div>
                    </div>

                    <div class="dm-card dm-mt-3 dm-mb-3" style="background:var(--dm-surface-2); padding:10px;">
                        <div class="dm-row-between dm-text-sm">
                            <span class="dm-muted">Anticipo:</span>
                            <strong>$${anticipo.toFixed(2)}</strong>
                        </div>
                    </div>

                    <div class="dm-list-card-actions" style="flex-wrap:wrap;">
                        <button class="dm-btn dm-btn-primary dm-btn-sm" onclick="App.views.formReparacion('${r.id}')">✏️ Editar</button>
                        <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.cambiarEstadoReparacion('${r.id}')">🔄 Estado</button>
                        <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.logic.imprimirNota('${r.id}')">🖨️ Nota</button>
                        <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.logic.imprimirReciboLiquidacion('${r.id}')">✅ Liquidación</button>
                        <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.logic.enviarWhatsApp('${r.id}', 'cobro')">💬 WhatsApp</button>
                        <button class="dm-btn dm-btn-danger dm-btn-sm" onclick="App.logic.eliminarReparacion('${r.id}')">🗑️</button>
                    </div>
                </div>
            `;
        });
    }

    html += `
            </div>
        </div>

        <button class="dm-fab" onclick="App.views.formReparacion()">+</button>
    `;

    return html;
};

App.views.formReparacion = function (id = null) {
    const obj = id ? (App.state.reparaciones || []).find(r => r.id === id) : null;

    let htmlClientes = '<option value="">-- Cliente --</option>';
    (App.state.clientes || []).forEach(c => {
        htmlClientes += `<option value="${c.id}" ${obj && obj.cliente_id === c.id ? 'selected' : ''}>${App.ui.safe(c.nombre)}</option>`;
    });

    const formHTML = `
        <form id="dynamic-form">
            <div class="dm-form-group">
                <label class="dm-label">Cliente</label>
                <select class="dm-select" name="cliente_id" required>
                    ${htmlClientes}
                </select>
            </div>

            <div class="dm-form-group">
                <label class="dm-label">Descripción</label>
                <textarea class="dm-textarea" name="descripcion" required>${obj ? App.ui.escapeHTML(obj.descripcion || '') : ''}</textarea>
            </div>

            <div class="dm-form-row">
                <div class="dm-form-group">
                    <label class="dm-label">Precio ($)</label>
                    <input
                        type="number"
                        step="0.01"
                        class="dm-input"
                        name="precio"
                        value="${obj ? obj.precio : ''}"
                        required
                    >
                </div>

                <div class="dm-form-group">
                    <label class="dm-label">Anticipo ($)</label>
                    <input
                        type="number"
                        step="0.01"
                        class="dm-input"
                        name="anticipo"
                        value="${obj ? (obj.anticipo || 0) : 0}"
                        required
                    >
                </div>
            </div>

            <div class="dm-form-row">
                <div class="dm-form-group">
                    <label class="dm-label">Fecha estimada</label>
                    <input
                        type="date"
                        class="dm-input"
                        name="fecha_entrega"
                        value="${obj ? (obj.fecha_entrega || '') : ''}"
                    >
                </div>

                <div class="dm-form-group">
                    <label class="dm-label">Estado</label>
                    <select class="dm-select" name="estado">
                        <option value="pendiente" ${obj && obj.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                        <option value="proceso" ${obj && obj.estado === 'proceso' ? 'selected' : ''}>Proceso</option>
                        <option value="lista" ${obj && obj.estado === 'lista' ? 'selected' : ''}>Lista</option>
                        <option value="entregada" ${obj && obj.estado === 'entregada' ? 'selected' : ''}>Entregada</option>
                    </select>
                </div>
            </div>

            <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">
                ${obj ? 'Guardar Cambios' : 'Crear Reparación'}
            </button>
        </form>
    `;

    App.ui.openSheet(obj ? 'Editar Reparación' : 'Nueva Reparación', formHTML, (data) => {
        if (obj) {
            App.logic.actualizarRegistroGenerico('reparaciones', id, data, 'reparaciones');
        } else {
            App.logic.guardarReparacion(data);
        }
    });
};

App.views.cambiarEstadoReparacion = function (id) {
    const obj = (App.state.reparaciones || []).find(r => r.id === id);
    if (!obj) return;

    const formHTML = `
        <form id="dynamic-form">
            <div class="dm-form-group">
                <label class="dm-label">Nuevo estado</label>
                <select class="dm-select" name="estado" required>
                    <option value="pendiente" ${obj.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                    <option value="proceso" ${obj.estado === 'proceso' ? 'selected' : ''}>Proceso</option>
                    <option value="lista" ${obj.estado === 'lista' ? 'selected' : ''}>Lista</option>
                    <option value="entregada" ${obj.estado === 'entregada' ? 'selected' : ''}>Entregada</option>
                </select>
            </div>

            <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">
                Guardar Estado
            </button>
        </form>
    `;

    App.ui.openSheet('Cambiar estado', formHTML, (data) => {
        App.logic.actualizarRegistroGenerico('reparaciones', id, data, 'reparaciones');
    });
};
