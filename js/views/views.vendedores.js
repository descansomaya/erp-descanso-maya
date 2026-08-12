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
                <p class="dm-muted dm-mb-2" style="margin-top:6px;">Gestiona a tus vendedores y promotores.</p>
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
                            <button class="dm-btn dm-btn-secondary dm-btn-sm" style="border:1px solid var(--primary); color:var(--primary); background:transparent;" onclick="App.ui.toast('El estado de cuenta se habilitará en la Fase 5', 'info')">
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
