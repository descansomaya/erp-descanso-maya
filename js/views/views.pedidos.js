// ==========================================
// VISTAS: PEDIDOS Y COTIZACIONES
// ==========================================

window.App = window.App || {};
App.views = App.views || {};

App.views.pedidos = function() {
    const title = document.getElementById('app-header-title');
    const subtitle = document.getElementById('app-header-subtitle');
    if (title) title.innerText = 'Pedidos';
    if (subtitle) subtitle.innerText = 'Gestión de ventas';

    return `
        <div class="dm-section">
            <div class="dm-card dm-mb-4" style="padding:10px;">
    <div class="dm-tabs" style="display:flex; gap:8px; overflow-x:auto; white-space:nowrap; scrollbar-width:none; -ms-overflow-style:none;">
        <button class="dm-tab active tab-btn-ped" style="flex:0 0 auto; font-size:0.85rem; padding:10px 12px;" onclick="window.switchTabPed('activos', this)">🟢 Activos / Taller</button>
        <button class="dm-tab tab-btn-ped" style="flex:0 0 auto; font-size:0.85rem; padding:10px 12px;" onclick="window.switchTabPed('listos', this)">🟠 Listos / Cobro</button>
        <button class="dm-tab tab-btn-ped" style="flex:0 0 auto; font-size:0.85rem; padding:10px 12px;" onclick="window.switchTabPed('historial', this)">✅ Historial</button>
    </div>
</div>

            <div id="tab-activos" class="tab-content-ped" style="display:block;">
                ${window.generarListaPedidos('activos')}
            </div>

            <div id="tab-listos" class="tab-content-ped" style="display:none;">
                ${window.generarListaPedidos('listos')}
            </div>

            <div id="tab-historial" class="tab-content-ped" style="display:none;">
                ${window.generarListaPedidos('historial')}
            </div>
        </div>

        <button class="dm-fab" onclick="App.views.formPedido()">+</button>
    `;
};

window.generarListaPedidos = function(tipo) {
    let pedidos = (App.state.pedidos || []).filter(p => {
        if (tipo === 'activos') return p.estado !== 'entregado' && p.estado !== 'listo para entregar';
        if (tipo === 'listos') return p.estado === 'listo para entregar';
        return p.estado === 'entregado';
    });

    if (pedidos.length === 0) {
        return `<div class="dm-alert dm-alert-info">No hay pedidos aquí.</div>`;
    }

    pedidos.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));

    let html = `<div class="dm-list">`;

    pedidos.forEach(p => {
        const c = (App.state.clientes || []).find(x => x.id === p.cliente_id) || {};
        const abonos = (App.state.abonos || [])
            .filter(a => a.pedido_id === p.id)
            .reduce((s, a) => s + parseFloat(a.monto || 0), 0);

        const saldo = parseFloat(p.total || 0) - parseFloat(p.anticipo || 0) - abonos;
        const estado = String(p.estado || '').toLowerCase();

        let estColor = 'dm-badge-primary';
        if (estado === 'entregado') estColor = 'dm-badge-success';
        else if (estado === 'listo para entregar') estColor = 'dm-badge-warning';

        html += `
            <div class="dm-list-card">
                <div class="dm-list-card-top">
                    <div>
                        <div class="dm-list-card-title">
                            ${App.ui.safe(p.id || '')} - ${App.ui.safe(c.nombre || 'STOCK')}
                        </div>
                        <div class="dm-list-card-subtitle dm-mt-2">
                            <span class="dm-badge ${estColor}">${App.ui.safe((p.estado || '').toUpperCase())}</span>
                        </div>
                    </div>

                    <div class="dm-right">
                        <div class="dm-fw-bold dm-text-lg">$${parseFloat(p.total || 0).toFixed(2)}</div>
                        <div class="dm-text-sm dm-muted">
                            Saldo:
                            <strong style="color:${saldo > 0 ? 'var(--dm-danger)' : 'var(--dm-success)'};">
                                $${saldo.toFixed(2)}
                            </strong>
                        </div>
                    </div>
                </div>

                <div class="dm-list-card-actions">
                    <button class="dm-btn dm-btn-info dm-btn-sm" onclick="App.views.modalDetallesPedido('${p.id}')">📦 Detalles</button>
                    <button class="dm-btn dm-btn-primary dm-btn-sm" onclick="App.views.formPedido('${p.id}')">✏️ Editar</button>
                    <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.modalAbonos('${p.id}')">💳 Abonos</button>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    return html;
};

App.views.formPedido = function(id = null) {
    const obj = id ? (App.state.pedidos || []).find(p => p.id === id) : null;

    let htmlC = '<option value="STOCK_INTERNO">STOCK BODEGA</option>';
    (App.state.clientes || []).forEach(c => {
        htmlC += `<option value="${c.id}" ${obj && obj.cliente_id === c.id ? 'selected' : ''}>${App.ui.safe(c.nombre)}</option>`;
    });

    let htmlP = '<option value="">-- Producto --</option>';
    (App.state.productos || []).forEach(p => {
        htmlP += `<option value="${p.id}" ${obj && obj.producto_id === p.id ? 'selected' : ''}>${App.ui.safe(p.nombre)}</option>`;
    });

    const formHTML = `
        <form id="dynamic-form">
            <div class="dm-form-group">
                <label class="dm-label">Cliente</label>
                <select class="dm-select" name="cliente_id">${htmlC}</select>
            </div>

            <div class="dm-form-group">
                <label class="dm-label">Producto</label>
                <select class="dm-select" name="producto_id" required onchange="window.calcularTotalPedido()">
                    ${htmlP}
                </select>
                <div id="info-extra-prod" class="dm-mt-2"></div>
            </div>

            <div class="dm-form-row">
                <div class="dm-form-group">
                    <label class="dm-label">Cantidad</label>
                    <input type="number" class="dm-input" name="cantidad" value="${obj ? obj.cantidad : '1'}" required oninput="window.calcularTotalPedido()">
                </div>

                <div class="dm-form-group">
                    <label class="dm-label">Entrega</label>
                    <input type="date" class="dm-input" name="fecha_entrega" value="${obj ? obj.fecha_entrega || '' : ''}" required>
                </div>
            </div>

            <div class="dm-form-row">
                <div class="dm-form-group">
                    <label class="dm-label">Total ($)</label>
                    <input type="number" step="0.01" class="dm-input" name="total" value="${obj ? obj.total || '' : ''}" required>
                </div>

                <div class="dm-form-group">
                    <label class="dm-label">Anticipo</label>
                    <input type="number" step="0.01" class="dm-input" name="anticipo" value="${obj ? obj.anticipo || '0' : '0'}" required>
                </div>
            </div>

            <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">Guardar Pedido</button>
        </form>
    `;

    App.ui.openSheet(obj ? 'Editar Pedido' : 'Nuevo Pedido', formHTML, (d) => {
        if (obj) App.logic.actualizarRegistroGenerico('pedidos', id, d, 'pedidos');
        else App.logic.guardarNuevoPedido(d);
    });

    setTimeout(() => {
        if (!obj) window.calcularTotalPedido();
    }, 150);
};

App.views.modalAbonos = function(pedidoId) {
    const p = (App.state.pedidos || []).find(x => x.id === pedidoId);
    if (!p) return;

    const abs = (App.state.abonos || []).filter(a => a.pedido_id === pedidoId);
    const totalAbonos = abs.reduce((s, a) => s + parseFloat(a.monto || 0), 0);
    const saldo = parseFloat(p.total || 0) - parseFloat(p.anticipo || 0) - totalAbonos;

    let html = `<div class="dm-alert dm-alert-info dm-mb-4">Saldo: $${saldo.toFixed(2)}</div>`;

    if (abs.length > 0) {
        html += `<div class="dm-list dm-mb-4">`;
        abs.forEach(a => {
            html += `
                <div class="dm-list-card" style="padding:10px;">
                    <div class="dm-row-between">
                        <div>
                            <strong>$${parseFloat(a.monto || 0).toFixed(2)}</strong>
                            <div class="dm-text-sm dm-muted">${a.metodo_pago ? App.ui.safe(a.metodo_pago) : ''}</div>
                        </div>
                        <button class="dm-btn dm-btn-danger dm-btn-sm" onclick="App.logic.eliminarRegistroGenerico('abonos_clientes','${a.id}','pedidos')">X</button>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    }

    if (saldo > 0) {
        html += `
            <form id="dynamic-form">
                <input type="hidden" name="pedido_id" value="${pedidoId}">

                <div class="dm-form-row">
                    <div class="dm-form-group">
                        <label class="dm-label">Abonar ($)</label>
                        <input type="number" step="0.01" class="dm-input" name="monto" max="${saldo}" required>
                    </div>

                    <div class="dm-form-group">
                        <label class="dm-label">Método</label>
                        <select class="dm-select" name="metodo_pago">
                            <option value="Efectivo">Efectivo</option>
                            <option value="Transferencia">Transferencia</option>
                            <option value="Tarjeta">Tarjeta</option>
                        </select>
                    </div>
                </div>

                <input type="hidden" name="fecha" value="${new Date().toISOString()}">

                <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">Abonar</button>
            </form>
        `;
    }

    App.ui.openSheet('Abonos', html, (d) => {
        if (saldo > 0) App.logic.guardarNuevoGenerico('abonos_clientes', d, 'ABO', 'pedidos');
    });
};

App.views.cotizaciones = function() {
    const title = document.getElementById('app-header-title');
    const subtitle = document.getElementById('app-header-subtitle');
    if (title) title.innerText = 'Cotizaciones';
    if (subtitle) subtitle.innerText = 'Presupuestos';

    let html = `<div class="dm-section"><div class="dm-list">`;
    let cots = App.state.cotizaciones || [];

    if (cots.length === 0) {
        html += `<div class="dm-alert dm-alert-info">No hay cotizaciones.</div>`;
    }

    cots.forEach(c => {
        html += `
            <div class="dm-list-card">
                <div class="dm-list-card-title">${App.ui.safe(c.cliente_nombre || 'Cliente')}</div>
                <div class="dm-list-card-actions">
                    <button class="dm-btn dm-btn-primary dm-btn-sm" onclick="App.views.formCotizacion('${c.id}')">Ver Detalles</button>
                </div>
            </div>
        `;
    });

    html += `</div></div><button class="dm-fab" onclick="App.views.formCotizacion()">+</button>`;
    return html;
};

App.views.formCotizacion = function(id = null) {
    const obj = id ? (App.state.cotizaciones || []).find(c => c.id === id) : null;

    let formHTML = `
        <form id="dynamic-form">
            <div class="dm-form-group">
                <label class="dm-label">Nombre del Cliente</label>
                <input type="text" class="dm-input" name="cliente_nombre" value="${obj ? App.ui.escapeHTML(obj.cliente_nombre) : ''}" required>
            </div>

            <div class="dm-form-group">
                <label class="dm-label">Detalles (Productos y Precios)</label>
                <textarea class="dm-textarea" name="detalles" required>${obj ? App.ui.escapeHTML(obj.detalles) : ''}</textarea>
            </div>

            <div class="dm-form-group">
                <label class="dm-label">Total Presupuestado ($)</label>
                <input type="number" step="0.01" class="dm-input" name="total" value="${obj ? obj.total : ''}" required>
            </div>

            <input type="hidden" name="fecha" value="${obj ? obj.fecha : new Date().toISOString()}">

            <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">Guardar Cotización</button>
        </form>
    `;

    App.ui.openSheet(obj ? 'Editar Cotización' : 'Nueva Cotización', formHTML, (data) => {
        if (obj) App.logic.actualizarRegistroGenerico('cotizaciones', id, data, 'cotizaciones');
        else App.logic.guardarNuevoGenerico('cotizaciones', data, 'COT', 'cotizaciones');
    });
};

App.views.modalDetallesPedido = function(pedidoId) {
    const detalles = (App.state.pedido_detalle || []).filter(d => d.pedido_id === pedidoId);

    if (detalles.length === 0) {
        App.ui.toast('No hay detalles guardados para este pedido.');
        return;
    }

    let html = '<div class="dm-list">';
    detalles.forEach(d => {
        const prod = (App.state.productos || []).find(p => p.id === d.producto_id);
        const nombreProducto = prod ? prod.nombre : 'Producto sin nombre';

        html += `
            <div class="dm-list-card" style="padding:10px; margin-bottom:10px;">
                <div class="dm-fw-bold" style="font-size:16px;">${App.ui.safe(nombreProducto)}</div>
                <div class="dm-text-sm dm-muted dm-mt-2">
                    Cantidad comprada: <strong>${App.ui.safe(d.cantidad)}</strong><br>
                    Precio Unitario: $${parseFloat(d.precio_unitario || 0).toFixed(2)}
                </div>
            </div>
        `;
    });
    html += '</div>';

    App.ui.openSheet(`Detalles del Pedido: ${pedidoId}`, html, () => {
        App.ui.closeSheet();
    });
};
