// ==========================================
// VISTAS: PEDIDOS Y COTIZACIONES
// ==========================================

window.App = window.App || {};
App.views = App.views || {};

App.views.runPedidoAction = async function (button, pedidoId, actionName, actionFn, options = {}) {
    return App.ui.runSafeAction({
        lockKey: options.lockKey || `pedido:${pedidoId}:${actionName}`,
        button,
        loadingText: options.loadingText || "Procesando...",
        loaderMessage: options.loaderMessage || "Actualizando pedido...",
        successMessage: options.successMessage || "Acción completada",
        errorTitle: options.errorTitle || "No se pudo actualizar el pedido",
        toastOnSuccess: options.toastOnSuccess !== false
    }, async () => actionFn());
};

App.views.accionPedido = function (button, pedidoId, actionName) {
    const actions = {
        marcarListo: {
            fn: () => App.logic.marcarPedidoListo(pedidoId),
            loadingText: "Marcando...",
            loaderMessage: "Marcando pedido como listo...",
            successMessage: "Pedido marcado como listo",
            errorTitle: "No se pudo marcar como listo"
        },
        marcarEntregado: {
            fn: () => App.logic.marcarPedidoEntregado(pedidoId),
            loadingText: "Entregando...",
            loaderMessage: "Marcando pedido como entregado...",
            successMessage: "Pedido marcado como entregado",
            errorTitle: "No se pudo marcar como entregado"
        },
        cerrarPedido: {
            fn: () => App.logic.cerrarPedidoSiLiquidado(pedidoId),
            loadingText: "Cerrando...",
            loaderMessage: "Cerrando pedido...",
            successMessage: "Pedido cerrado correctamente",
            errorTitle: "No se pudo cerrar el pedido"
        },
        imprimirNota: {
            fn: () => App.logic.imprimirNota(pedidoId),
            loadingText: "Generando...",
            loaderMessage: "Generando nota...",
            successMessage: "Nota generada",
            errorTitle: "No se pudo generar la nota"
        },
        imprimirLiquidacion: {
            fn: () => App.logic.imprimirReciboLiquidacion(pedidoId),
            loadingText: "Generando...",
            loaderMessage: "Generando recibo de liquidación...",
            successMessage: "Recibo generado",
            errorTitle: "No se pudo generar la liquidación"
        },
        whatsappCobro: {
            fn: () => App.logic.enviarWhatsApp(pedidoId, 'cobro'),
            loadingText: "Preparando...",
            loaderMessage: "Preparando mensaje de WhatsApp...",
            successMessage: "Mensaje preparado",
            errorTitle: "No se pudo preparar WhatsApp"
        },
        whatsappListo: {
            fn: () => App.logic.enviarWhatsApp(pedidoId, 'listo'),
            loadingText: "Preparando...",
            loaderMessage: "Preparando mensaje de WhatsApp...",
            successMessage: "Mensaje preparado",
            errorTitle: "No se pudo preparar WhatsApp"
        }
    };

    const config = actions[actionName];
    if (!config) {
        App.ui.toast('Acción no disponible', 'warning');
        return;
    }

    return App.views.runPedidoAction(button, pedidoId, actionName, config.fn, config);
};

App.views.accionAbono = function (button, abonoId, actionName) {
    const actions = {
        imprimirRecibo: {
            fn: () => App.logic.imprimirReciboAbono(abonoId),
            loadingText: "Generando...",
            loaderMessage: "Generando recibo de abono...",
            successMessage: "Recibo generado",
            errorTitle: "No se pudo generar el recibo"
        },
        eliminarAbono: {
            fn: () => App.logic.eliminarRegistroGenerico('abonos_clientes', abonoId, 'abonos'),
            loadingText: "Eliminando...",
            loaderMessage: "Eliminando abono...",
            successMessage: "Abono eliminado",
            errorTitle: "No se pudo eliminar el abono"
        }
    };

    const config = actions[actionName];
    if (!config) {
        App.ui.toast('Acción no disponible', 'warning');
        return;
    }

    return App.ui.runSafeAction({
        lockKey: `abono:${abonoId}:${actionName}`,
        button,
        loadingText: config.loadingText,
        loaderMessage: config.loaderMessage,
        successMessage: config.successMessage,
        errorTitle: config.errorTitle
    }, async () => config.fn());
};

// ==========================================
// PEDIDOS
// ==========================================
App.views.pedidos = function() {

    const pedidos = App.state.pedidos || [];

    const getColorEstado = (estado) => {
        estado = String(estado || '').toLowerCase();

        if (estado.includes('produccion')) return 'var(--dm-primary)';
        if (estado.includes('listo')) return '#D69E2E';
        if (estado.includes('entregado') || estado.includes('pagado')) return 'var(--dm-success)';
        return 'var(--dm-muted)';
    };

    let html = `
        <div class="dm-section" style="padding-bottom:90px;">

            <div class="dm-card dm-mb-4">
                <h3 class="dm-card-title">Pedidos</h3>
                <input 
                    type="text"
                    id="bus-ped"
                    class="dm-input"
                    placeholder="🔍 Buscar pedido o cliente..."
                    onkeyup="window.filtrarLista('bus-ped','tarj-ped')"
                >
            </div>

            <div class="dm-list">
    `;

    if (pedidos.length === 0) {
        html += `<div class="dm-alert dm-alert-info">No hay pedidos.</div>`;
    }

    pedidos.forEach(p => {

        const colorEstado = getColorEstado(p.estado);

        html += `
            <div class="dm-list-card tarj-ped">

                <div style="display:flex; flex-direction:column; gap:12px;">

                    <!-- HEADER -->
                    <div class="dm-row-between" style="flex-wrap:wrap; gap:10px;">
                        <div>
                            <strong>${App.ui.safe(p.id)}</strong><br>
                            <small class="dm-muted">${App.ui.safe(p.cliente_nombre || '')}</small>
                        </div>

                        <span class="dm-badge" style="background:${colorEstado}; color:white;">
                            ${App.ui.safe(p.estado || 'Pendiente')}
                        </span>
                    </div>

                    <!-- INFO PRINCIPAL -->
                    <div style="
                        display:grid;
                        grid-template-columns:repeat(auto-fit, minmax(120px,1fr));
                        gap:10px;
                        text-align:center;
                    ">
                        <div>
                            <small class="dm-muted">Total</small><br>
                            <strong>${App.ui.money(p.total || 0)}</strong>
                        </div>
                        <div>
                            <small class="dm-muted">Anticipo</small><br>
                            <strong>${App.ui.money(p.anticipo || 0)}</strong>
                        </div>
                        <div>
                            <small class="dm-muted">Fecha</small><br>
                            <strong>${(p.fecha_creacion || '').split('T')[0]}</strong>
                        </div>
                    </div>

                    <!-- ACCIONES -->
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">

                        <button class="dm-btn dm-btn-primary dm-btn-sm"
                            onclick="App.views.detallePedido('${p.id}')">
                            👁️ Ver
                        </button>

                        <button class="dm-btn dm-btn-secondary dm-btn-sm"
                            onclick="App.logic.siguienteEstadoPedido('${p.id}')">
                            ▶️ Avanzar
                        </button>

                        <button class="dm-btn dm-btn-success dm-btn-sm"
                            onclick="App.views.formAbono('${p.id}')">
                            💰 Cobrar
                        </button>

                    </div>

                </div>
            </div>
        `;
    });

    html += `
            </div>
        </div>

        <button class="dm-fab" onclick="App.views.formPedido()">+</button>
    `;

    return html;
};

window.generarListaPedidos = function(tipo) {
    let pedidos = (App.state.pedidos || []).filter(p => {
        const estado = String(p.estado || '').toLowerCase();
        if (tipo === 'activos') return estado !== 'entregado' && estado !== 'listo para entregar' && estado !== 'pagado';
        if (tipo === 'listos') return estado === 'listo para entregar';
        return estado === 'entregado' || estado === 'pagado';
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
        const whatsappAction = p.estado === 'listo para entregar' ? 'whatsappListo' : 'whatsappCobro';

        let estColor = 'dm-badge-primary';
        if (estado === 'entregado' || estado === 'pagado') estColor = 'dm-badge-success';
        else if (estado === 'listo para entregar') estColor = 'dm-badge-warning';

        const accionesOperativas = `
            ${estado !== 'listo para entregar' && estado !== 'entregado' && estado !== 'pagado'
                ? `<button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.accionPedido(this, '${p.id}', 'marcarListo')">📦 Listo</button>`
                : ''
            }

            ${estado === 'listo para entregar' || estado === 'pagado'
                ? `<button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.accionPedido(this, '${p.id}', 'marcarEntregado')">🚚 Entregado</button>`
                : ''
            }

            ${saldo <= 0.05 && estado !== 'pagado'
                ? `<button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.accionPedido(this, '${p.id}', 'cerrarPedido')">🔒 Cerrar</button>`
                : ''
            }
        `;

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

                <div class="dm-list-card-actions" style="flex-wrap:wrap;">
                    <button class="dm-btn dm-btn-info dm-btn-sm" onclick="App.views.modalDetallesPedido('${p.id}')">📦 Detalles</button>
                    <button class="dm-btn dm-btn-primary dm-btn-sm" onclick="App.views.formPedido('${p.id}')">✏️ Editar</button>
                    <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.modalAbonos('${p.id}')">💳 Abonos</button>
                    <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.accionPedido(this, '${p.id}', 'imprimirNota')">🖨️ Nota</button>
                    ${ultimoAbono ? `<button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.accionAbono(this, '${ultimoAbono.id}', 'imprimirRecibo')">🧾 Últ. abono</button>` : ''}
                    <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.accionPedido(this, '${p.id}', 'imprimirLiquidacion')">✅ Liquidación</button>
                    <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.accionPedido(this, '${p.id}', '${whatsappAction}')">💬 WhatsApp</button>
                    ${accionesOperativas}
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

    App.ui.openSheet(obj ? 'Editar Pedido' : 'Nuevo Pedido', formHTML, async (data) => {
        const action = obj
            ? () => App.logic.actualizarRegistroGenerico('pedidos', id, data, 'pedidos')
            : () => App.logic.guardarNuevoPedido(data);

        const result = await App.ui.runSafeAction({
            lockKey: obj ? `pedido:${id}:editar` : 'pedido:nuevo',
            loadingText: obj ? 'Guardando...' : 'Creando...',
            loaderMessage: obj ? 'Guardando pedido...' : 'Creando pedido...',
            successMessage: obj ? 'Pedido actualizado' : 'Pedido creado',
            errorTitle: obj ? 'No se pudo actualizar el pedido' : 'No se pudo crear el pedido',
            closeSheetOnSuccess: true
        }, async () => action());

        return result;
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
                                onclick="App.views.accionAbono(this, '${a.id}', 'imprimirRecibo')"
                            >
                                🧾
                            </button>
                            <button
                                class="dm-btn dm-btn-danger dm-btn-sm"
                                onclick="App.views.accionAbono(this, '${a.id}', 'eliminarAbono')"
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

    App.ui.openSheet('Abonos del Pedido', html, async (data) => {
        if (saldo <= 0) return;

        return App.ui.runSafeAction({
            lockKey: `pedido:${pedidoId}:abono:nuevo`,
            loadingText: 'Registrando...',
            loaderMessage: 'Registrando abono...',
            successMessage: 'Abono registrado',
            errorTitle: 'No se pudo registrar el abono',
            closeSheetOnSuccess: true
        }, async () => App.logic.guardarAbono(data));
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

    const saldo = parseFloat(pedido.total || 0) - parseFloat(pedido.anticipo || 0) -
        abonosLista.reduce((s, a) => s + parseFloat(a.monto || 0), 0);

    const estado = String(pedido.estado || '').toLowerCase();
    const whatsappAction = estado === 'listo para entregar' ? 'whatsappListo' : 'whatsappCobro';

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
            <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.accionPedido(this, '${pedidoId}', 'imprimirNota')">🖨️ Imprimir Nota</button>
            ${ultimoAbono ? `<button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.accionAbono(this, '${ultimoAbono.id}', 'imprimirRecibo')">🧾 Últ. abono</button>` : ''}
            <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.accionPedido(this, '${pedidoId}', 'imprimirLiquidacion')">✅ Liquidación</button>
            <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.accionPedido(this, '${pedidoId}', '${whatsappAction}')">💬 WhatsApp</button>

            ${estado !== 'listo para entregar' && estado !== 'entregado' && estado !== 'pagado'
                ? `<button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.accionPedido(this, '${pedidoId}', 'marcarListo')">📦 Listo</button>`
                : ''
            }

            ${estado === 'listo para entregar' || estado === 'pagado'
                ? `<button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.accionPedido(this, '${pedidoId}', 'marcarEntregado')">🚚 Entregado</button>`
                : ''
            }

            ${saldo <= 0.05 && estado !== 'pagado'
                ? `<button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.accionPedido(this, '${pedidoId}', 'cerrarPedido')">🔒 Cerrar</button>`
                : ''
            }
        </div>
    `;

    App.ui.openSheet(`Detalles del Pedido: ${pedidoId}`, html, () => {
        App.ui.closeSheet();
    });
};
