// ==========================================
// VISTAS: PEDIDOS Y COTIZACIONES
// ==========================================

window.App = window.App || {};
App.views = App.views || {};

// ==========================================
// PEDIDOS
// ==========================================
App.views.pedidos = function() {
    const title = document.getElementById('app-header-title');
    const subtitle = document.getElementById('app-header-subtitle');
    const bottomNav = document.getElementById('bottom-nav');

    if (title) title.innerText = 'Pedidos';
    if (subtitle) subtitle.innerText = 'Gestión de pedidos';
    if (bottomNav) bottomNav.style.display = 'flex';

    return `
        <div class="dm-section" style="padding-bottom:90px;">
            <div class="dm-card dm-mb-4" style="padding:10px;">
                <div class="dm-tabs tabs-pedidos-mobile" style="display:flex; gap:8px; overflow-x:auto; overflow-y:hidden; white-space:nowrap; scrollbar-width:none; -ms-overflow-style:none;">
                    <button class="dm-tab active tab-btn-ped" onclick="window.switchTabPed('activos', this)">🟢 Activos / Taller</button>
                    <button class="dm-tab tab-btn-ped" onclick="window.switchTabPed('listos', this)">🟠 Listos / Cobro</button>
                    <button class="dm-tab tab-btn-ped" onclick="window.switchTabPed('historial', this)">✅ Historial</button>
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
        return p.estado === 'entregado' || p.estado === 'pagado';
    });

    if (pedidos.length === 0) {
        return `<div class="dm-alert dm-alert-info">No hay pedidos aquí.</div>`;
    }

    pedidos.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));

    let html = `<div class="dm-list">`;

    pedidos.forEach(p => {
        const cliente = (App.state.clientes || []).find(x => x.id === p.cliente_id) || {};
        const abonosLista = (App.state.abonos || []).filter(a => a.pedido_id === p.id);
        const abonos = abonosLista.reduce((s, a) => s + parseFloat(a.monto || 0), 0);
        const ultimoAbono = abonosLista.length
            ? [...abonosLista].sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0))[0]
            : null;

        const saldo = parseFloat(p.total || 0) - parseFloat(p.anticipo || 0) - abonos;
        const estado = String(p.estado || '').toLowerCase();
        const fecha = p.fecha_creacion ? String(p.fecha_creacion).split('T')[0] : '';

        let estColor = 'dm-badge-primary';
        if (estado === 'entregado' || estado === 'pagado') estColor = 'dm-badge-success';
        else if (estado === 'listo para entregar') estColor = 'dm-badge-warning';

        html += `
            <div class="dm-list-card">
                <div class="dm-row-between" style="align-items:flex-start; gap:12px;">
                    <div style="flex:1; min-width:0;">
                        <div class="dm-list-card-title">
                            ${App.ui.safe(p.id || '')} - ${App.ui.safe(cliente.nombre || 'STOCK BODEGA')}
                        </div>
                        <div class="dm-list-card-subtitle dm-mt-2">
                            <span class="dm-badge ${estColor}">${App.ui.safe((p.estado || '').toUpperCase())}</span>
                            ${fecha ? `<span class="dm-text-sm dm-muted" style="display:inline-block; margin-left:8px;">${fecha}</span>` : ''}
                        </div>
                    </div>

                    <div style="text-align:right; flex:0 0 auto;">
                        <div class="dm-fw-bold dm-text-lg">$${parseFloat(p.total || 0).toFixed(2)}</div>
                        <div class="dm-text-sm dm-muted">
                            Saldo:
                            <strong style="color:${saldo > 0 ? 'var(--dm-danger)' : 'var(--dm-success)'};">
                                $${saldo.toFixed(2)}
                            </strong>
                        </div>
                    </div>
                </div>

                <div class="dm-card dm-mt-3" style="background:var(--dm-surface-2); padding:10px;">
                    <div class="dm-row-between dm-text-sm">
                        <span class="dm-muted">Anticipo:</span>
                        <strong>$${parseFloat(p.anticipo || 0).toFixed(2)}</strong>
                    </div>
                    <div class="dm-row-between dm-text-sm">
                        <span class="dm-muted">Abonos:</span>
                        <strong>$${abonos.toFixed(2)}</strong>
                    </div>
                </div>

                <div class="dm-list-card-actions">
                    <button class="dm-btn dm-btn-info dm-btn-sm" onclick="App.views.modalDetallesPedido('${p.id}')">📦 Detalles</button>
                    <button class="dm-btn dm-btn-primary dm-btn-sm" onclick="App.views.formPedido('${p.id}')">✏️ Editar</button>
                    <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.modalAbonos('${p.id}')">💳 Abonos</button>
                    <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.logic.imprimirNota('${p.id}')">🖨️ Nota</button>
                    ${ultimoAbono ? `<button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.logic.imprimirReciboAbono('${ultimoAbono.id}')">🧾 Últ. abono</button>` : ''}
                    <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.logic.imprimirReciboLiquidacion('${p.id}')">✅ Liquidación</button>
                    <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.logic.enviarWhatsApp('${p.id}', '${p.estado === 'listo para entregar' ? 'listo' : 'cobro'}')">💬 WhatsApp</button>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    return html;
};

App.views.formPedido = function(id = null) {
    const obj = id ? (App.state.pedidos || []).find(p => p.id === id) : null;

    let htmlClientes = '<option value="STOCK_INTERNO">STOCK BODEGA</option>';
    (App.state.clientes || []).forEach(c => {
        htmlClientes += `<option value="${c.id}" ${obj && obj.cliente_id === c.id ? 'selected' : ''}>${App.ui.safe(c.nombre)}</option>`;
    });

    let htmlProductos = '<option value="">-- Producto --</option>';
    (App.state.productos || []).forEach(p => {
        htmlProductos += `<option value="${p.id}" ${obj && obj.producto_id === p.id ? 'selected' : ''}>${App.ui.safe(p.nombre)}</option>`;
    });

    const formHTML = `
        <form id="dynamic-form">
            <div class="dm-form-group">
                <label class="dm-label">Cliente</label>
                <select class="dm-select" name="cliente_id">
                    ${htmlClientes}
                </select>
            </div>

            <div class="dm-form-group">
                <label class="dm-label">Producto</label>
                <select class="dm-select" name="producto_id" required onchange="window.calcularTotalPedido()">
                    ${htmlProductos}
                </select>
                <div id="info-extra-prod" class="dm-mt-2"></div>
            </div>

            <div class="dm-form-row">
                <div class="dm-form-group">
                    <label class="dm-label">Cantidad</label>
                    <input
                        type="number"
                        class="dm-input"
                        name="cantidad"
                        value="${obj ? obj.cantidad : '1'}"
                        required
                        oninput="window.calcularTotalPedido()"
                    >
                </div>

                <div class="dm-form-group">
                    <label class="dm-label">Fecha de entrega</label>
                    <input
                        type="date"
                        class="dm-input"
                        name="fecha_entrega"
                        value="${obj ? (obj.fecha_entrega || '') : ''}"
                        required
                    >
                </div>
            </div>

            <div class="dm-form-row">
                <div class="dm-form-group">
                    <label class="dm-label">Total ($)</label>
                    <input
                        type="number"
                        step="0.01"
                        class="dm-input"
                        name="total"
                        value="${obj ? (obj.total || '') : ''}"
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
                        value="${obj ? (obj.anticipo || '0') : '0'}"
                        required
                    >
                </div>
            </div>

            <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">
                ${obj ? 'Guardar Cambios' : 'Crear Pedido'}
            </button>
        </form>
    `;

    App.ui.openSheet(obj ? 'Editar Pedido' : 'Nuevo Pedido', formHTML, (data) => {
        if (obj) App.logic.actualizarRegistroGenerico('pedidos', id, data, 'pedidos');
        else App.logic.guardarNuevoPedido(data);
    });

    setTimeout(() => {
        window.calcularTotalPedido();
    }, 150);
};

App.views.modalAbonos = function(pedidoId) {
    const pedido = (App.state.pedidos || []).find(x => x.id === pedidoId);
    if (!pedido) return;

    const abonos = (App.state.abonos || []).filter(a => a.pedido_id === pedidoId);
    const totalAbonos = abonos.reduce((s, a) => s + parseFloat(a.monto || 0), 0);
    const saldo = parseFloat(pedido.total || 0) - parseFloat(pedido.anticipo || 0) - totalAbonos;

    let html = `
        <div class="dm-alert dm-alert-info dm-mb-4">
            Saldo pendiente: $${saldo.toFixed(2)}
        </div>
    `;

    if (abonos.length > 0) {
        html += `<div class="dm-list dm-mb-4">`;
        abonos.forEach(a => {
            const fecha = a.fecha ? String(a.fecha).split('T')[0] : '';
            html += `
                <div class="dm-list-card" style="padding:10px;">
                    <div class="dm-row-between" style="align-items:flex-start; gap:12px;">
                        <div style="flex:1;">
                            <strong>$${parseFloat(a.monto || 0).toFixed(2)}</strong>
                            <div class="dm-text-sm dm-muted">${a.metodo_pago ? App.ui.safe(a.metodo_pago) : ''}</div>
                            ${fecha ? `<div class="dm-text-sm dm-muted">${fecha}</div>` : ''}
                        </div>

                        <div class="dm-list-card-actions" style="margin-top:0; justify-content:flex-end;">
                            <button
                                class="dm-btn dm-btn-secondary dm-btn-sm"
                                onclick="App.logic.imprimirReciboAbono('${a.id}')"
                            >
                                🧾
                            </button>
                            <button
                                class="dm-btn dm-btn-danger dm-btn-sm"
                                onclick="App.logic.eliminarRegistroGenerico('abonos_clientes','${a.id}','abonos')"
                            >
                                X
                            </button>
                        </div>
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
                <input type="hidden" name="cliente_id" value="${pedido.cliente_id || ''}">

                <div class="dm-form-row">
                    <div class="dm-form-group">
                        <label class="dm-label">Abonar ($)</label>
                        <input
                            type="number"
                            step="0.01"
                            class="dm-input"
                            name="monto"
                            max="${saldo}"
                            required
                        >
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

                <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">
                    Registrar Abono
                </button>
            </form>
        `;
    }

    App.ui.openSheet('Abonos del Pedido', html, (data) => {
        if (saldo > 0) {
            App.logic.guardarAbono(data);
        }
    });
};

// ==========================================
// COTIZACIONES
// ==========================================
App.views.cotizaciones = function() {
    App.views.moduloNoDisponible('Cotizaciones');
    return `
        <div class="dm-section" style="padding-bottom:90px;">
            <div class="dm-alert dm-alert-warning">
                El módulo de cotizaciones está pendiente de activación porque aún no existe la hoja correspondiente en Google Sheets.
            </div>
        </div>
    `;
};

App.views.formCotizacion = function(id = null) {
    const obj = id ? (App.state.cotizaciones || []).find(c => c.id === id) : null;

    const formHTML = `
        <form id="dynamic-form">
            <div class="dm-form-group">
                <label class="dm-label">Nombre del Cliente</label>
                <input
                    type="text"
                    class="dm-input"
                    name="cliente_nombre"
                    value="${obj ? App.ui.escapeHTML(obj.cliente_nombre) : ''}"
                    required
                >
            </div>

            <div class="dm-form-group">
                <label class="dm-label">Detalles</label>
                <textarea class="dm-textarea" name="detalles" required>${obj ? App.ui.escapeHTML(obj.detalles) : ''}</textarea>
            </div>

            <div class="dm-form-group">
                <label class="dm-label">Total Presupuestado ($)</label>
                <input
                    type="number"
                    step="0.01"
                    class="dm-input"
                    name="total"
                    value="${obj ? obj.total : ''}"
                    required
                >
            </div>

            <input type="hidden" name="fecha" value="${obj ? obj.fecha : new Date().toISOString()}">

            <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">
                ${obj ? 'Guardar Cambios' : 'Guardar Cotización'}
            </button>
        </form>
    `;

    App.ui.openSheet(obj ? 'Editar Cotización' : 'Nueva Cotización', formHTML, (data) => {
        if (obj) App.logic.actualizarRegistroGenerico('cotizaciones', id, data, 'cotizaciones');
        else App.logic.guardarNuevoGenerico('cotizaciones', data, 'COT', 'cotizaciones');
    });
};

// ==========================================
// DETALLE DE PEDIDO
// ==========================================
App.views.modalDetallesPedido = function(pedidoId) {
    const pedido = (App.state.pedidos || []).find(p => p.id === pedidoId);
    const detalles = (App.state.pedido_detalle || []).filter(d => d.pedido_id === pedidoId);
    const abonosLista = (App.state.abonos || []).filter(a => a.pedido_id === pedidoId);
    const ultimoAbono = abonosLista.length
        ? [...abonosLista].sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0))[0]
        : null;

    if (!pedido || detalles.length === 0) {
        App.ui.toast('No hay detalles guardados para este pedido.');
        return;
    }

    let html = `<div class="dm-list">`;

    detalles.forEach(d => {
        const prod = (App.state.productos || []).find(p => p.id === d.producto_id);
        const nombreProducto = prod ? prod.nombre : 'Producto sin nombre';

        html += `
            <div class="dm-list-card" style="padding:10px;">
                <div class="dm-fw-bold" style="font-size:16px;">${App.ui.safe(nombreProducto)}</div>
                <div class="dm-text-sm dm-muted dm-mt-2">
                    Cantidad comprada: <strong>${App.ui.safe(d.cantidad)}</strong><br>
                    Precio unitario: $${parseFloat(d.precio_unitario || 0).toFixed(2)}
                </div>
            </div>
        `;
    });

    html += `
        </div>
        <div class="dm-list-card-actions dm-mt-3" style="flex-wrap:wrap;">
            <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.logic.imprimirNota('${pedidoId}')">🖨️ Imprimir Nota</button>
            ${ultimoAbono ? `<button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.logic.imprimirReciboAbono('${ultimoAbono.id}')">🧾 Últ. abono</button>` : ''}
            <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.logic.imprimirReciboLiquidacion('${pedidoId}')">✅ Liquidación</button>
            <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.logic.enviarWhatsApp('${pedidoId}', 'cobro')">💬 WhatsApp</button>
        </div>
    `;

    App.ui.openSheet(`Detalles del Pedido: ${pedidoId}`, html, () => {
        App.ui.closeSheet();
    });
};
