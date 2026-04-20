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
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <h3 class="dm-card-title">Pedidos</h3>
                    <input type="text" id="bus-ped" class="dm-input" placeholder="🔍 Buscar pedido o cliente..." onkeyup="window.filtrarLista('bus-ped','tarj-ped')">
                </div>
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
                    <div class="dm-row-between" style="flex-wrap:wrap; gap:10px; align-items:flex-start;">
                        <div style="flex:1; min-width:0;">
                            <strong>${App.ui.safe(p.id)}</strong><br>
                            <small class="dm-muted">${App.ui.safe(p.cliente_nombre || '')}</small>
                        </div>

                        <span class="dm-badge" style="background:${colorEstado}; color:white;">${App.ui.safe(p.estado || 'Pendiente')}</span>
                    </div>

                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(110px,1fr)); gap:10px; text-align:center;">
                        <div><small class="dm-muted">Total</small><br><strong>${App.ui.money(p.total || 0)}</strong></div>
                        <div><small class="dm-muted">Anticipo</small><br><strong>${App.ui.money(p.anticipo || 0)}</strong></div>
                        <div><small class="dm-muted">Fecha</small><br><strong>${(p.fecha_creacion || '').split('T')[0]}</strong></div>
                    </div>

                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button class="dm-btn dm-btn-primary dm-btn-sm" onclick="App.views.modalDetallesPedido('${p.id}')">👁️ Ver</button>
                        <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.modalAbonos('${p.id}')">💰 Cobrar</button>
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div></div><button class="dm-fab" onclick="App.views.formPedido()">+</button>`;
    return html;
};

window.generarListaPedidos = function(tipo) {
    let pedidos = (App.state.pedidos || []).filter(p => {
        const estado = String(p.estado || '').toLowerCase();
        if (tipo === 'activos') return estado !== 'entregado' && estado !== 'listo para entregar' && estado !== 'pagado';
        if (tipo === 'listos') return estado === 'listo para entregar';
        return estado === 'entregado' || estado === 'pagado';
    });

    if (pedidos.length === 0) return `<div class="dm-alert dm-alert-info">No hay pedidos aquí.</div>`;
    pedidos.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));

    let html = `<div class="dm-list">`;

    pedidos.forEach(p => {
        const cliente = (App.state.clientes || []).find(x => x.id === p.cliente_id) || {};
        const abonosLista = (App.state.abonos || []).filter(a => a.pedido_id === p.id);
        const abonos = abonosLista.reduce((s, a) => s + parseFloat(a.monto || 0), 0);
        const ultimoAbono = abonosLista.length ? [...abonosLista].sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0))[0] : null;

        const saldo = parseFloat(p.total || 0) - parseFloat(p.anticipo || 0) - abonos;
        const estado = String(p.estado || '').toLowerCase();
        const fecha = p.fecha_creacion ? String(p.fecha_creacion).split('T')[0] : '';
        const whatsappAction = p.estado === 'listo para entregar' ? 'whatsappListo' : 'whatsappCobro';

        let estColor = 'dm-badge-primary';
        if (estado === 'entregado' || estado === 'pagado') estColor = 'dm-badge-success';
        else if (estado === 'listo para entregar') estColor = 'dm-badge-warning';

        const accionesOperativas = `
            ${estado !== 'listo para entregar' && estado !== 'entregado' && estado !== 'pagado' ? `<button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.accionPedido(this, '${p.id}', 'marcarListo')">📦 Listo</button>` : ''}
            ${estado === 'listo para entregar' || estado === 'pagado' ? `<button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.accionPedido(this, '${p.id}', 'marcarEntregado')">🚚 Entregado</button>` : ''}
            ${saldo <= 0.05 && estado !== 'pagado' ? `<button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.accionPedido(this, '${p.id}', 'cerrarPedido')">🔒 Cerrar</button>` : ''}
        `;

        html += `
            <div class="dm-list-card">
                <div class="dm-row-between" style="align-items:flex-start; gap:12px;">
                    <div style="flex:1; min-width:0;">
                        <div class="dm-list-card-title">${App.ui.safe(p.id || '')} - ${App.ui.safe(cliente.nombre || 'STOCK BODEGA')}</div>
                        <div class="dm-list-card-subtitle dm-mt-2">
                            <span class="dm-badge ${estColor}">${App.ui.safe((p.estado || '').toUpperCase())}</span>
                            ${fecha ? `<span class="dm-text-sm dm-muted" style="display:inline-block; margin-left:8px;">${fecha}</span>` : ''}
                        </div>
                    </div>
                    <div style="text-align:right; flex:0 0 auto;">
                        <div class="dm-fw-bold dm-text-lg">$${parseFloat(p.total || 0).toFixed(2)}</div>
                        <div class="dm-text-sm dm-muted">Saldo: <strong style="color:${saldo > 0 ? 'var(--dm-danger)' : 'var(--dm-success)'};">$${saldo.toFixed(2)}</strong></div>
                    </div>
                </div>

                <div class="dm-card dm-mt-3" style="background:var(--dm-surface-2); padding:10px;">
                    <div class="dm-row-between dm-text-sm"><span class="dm-muted">Anticipo:</span><strong>$${parseFloat(p.anticipo || 0).toFixed(2)}</strong></div>
                    <div class="dm-row-between dm-text-sm"><span class="dm-muted">Abonos:</span><strong>$${abonos.toFixed(2)}</strong></div>
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

App.views._formPedidoInterno = function(obj = null, prefill = null) {
    const dataBase = Object.assign({ cantidad: 1, anticipo: 0 }, prefill || {}, obj || {});

    let htmlClientes = '<option value="STOCK_INTERNO">STOCK BODEGA</option>';
    (App.state.clientes || []).forEach(c => {
        const selected = dataBase.cliente_id === c.id ? 'selected' : '';
        htmlClientes += `<option value="${c.id}" ${selected}>${App.ui.safe(c.nombre)}</option>`;
    });

    let htmlProductos = '<option value="">-- Producto --</option>';
    (App.state.productos || []).forEach(p => {
        const selected = dataBase.producto_id === p.id ? 'selected' : '';
        htmlProductos += `<option value="${p.id}" ${selected}>${App.ui.safe(p.nombre)}</option>`;
    });

    const formHTML = `
        <form id="dynamic-form">
            <div class="dm-form-group">
                <label class="dm-label">Cliente</label>
                <select class="dm-select" name="cliente_id">${htmlClientes}</select>
            </div>

            <div class="dm-form-group">
                <label class="dm-label">Producto</label>
                <select class="dm-select" name="producto_id" required onchange="window.calcularTotalPedido()">${htmlProductos}</select>
                <div id="info-extra-prod" class="dm-mt-2"></div>
            </div>

            <div class="dm-form-row">
                <div class="dm-form-group">
                    <label class="dm-label">Cantidad</label>
                    <input type="number" class="dm-input" name="cantidad" value="${dataBase.cantidad || 1}" required oninput="window.calcularTotalPedido()">
                </div>
                <div class="dm-form-group">
                    <label class="dm-label">Fecha de entrega</label>
                    <input type="date" class="dm-input" name="fecha_entrega" value="${dataBase.fecha_entrega || ''}" required>
                </div>
            </div>

            <div class="dm-form-row">
                <div class="dm-form-group">
                    <label class="dm-label">Total ($)</label>
                    <input type="number" step="0.01" class="dm-input" name="total" value="${dataBase.total || ''}" required>
                </div>
                <div class="dm-form-group">
                    <label class="dm-label">Anticipo ($)</label>
                    <input type="number" step="0.01" class="dm-input" name="anticipo" value="${dataBase.anticipo || '0'}" required>
                </div>
            </div>

            <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">${obj ? 'Guardar Cambios' : 'Crear Pedido'}</button>
        </form>
    `;

    App.ui.openSheet(obj ? 'Editar Pedido' : 'Nuevo Pedido', formHTML, async (data) => {
        const action = obj ? () => App.logic.actualizarRegistroGenerico('pedidos', obj.id, data, 'pedidos') : () => App.logic.guardarNuevoPedido(data);
        return App.ui.runSafeAction({
            lockKey: obj ? `pedido:${obj.id}:editar` : 'pedido:nuevo',
            loadingText: obj ? 'Guardando...' : 'Creando...',
            loaderMessage: obj ? 'Guardando pedido...' : 'Creando pedido...',
            successMessage: obj ? 'Pedido actualizado' : 'Pedido creado',
            errorTitle: obj ? 'No se pudo actualizar el pedido' : 'No se pudo crear el pedido',
            closeSheetOnSuccess: true
        }, async () => action());
    });

    setTimeout(() => window.calcularTotalPedido(), 150);
};

App.views.formPedido = function(id = null) {
    const obj = id ? (App.state.pedidos || []).find(p => p.id === id) : null;
    return App.views._formPedidoInterno(obj, null);
};

App.views.modalAbonos = function(pedidoId) {
    const pedido = (App.state.pedidos || []).find(x => x.id === pedidoId);
    if (!pedido) return;

    const abonos = (App.state.abonos || []).filter(a => a.pedido_id === pedidoId);
    const totalAbonos = abonos.reduce((s, a) => s + parseFloat(a.monto || 0), 0);
    const saldo = parseFloat(pedido.total || 0) - parseFloat(pedido.anticipo || 0) - totalAbonos;

    let html = `<div class="dm-alert dm-alert-info dm-mb-4">Saldo pendiente: $${saldo.toFixed(2)}</div>`;

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
                            <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.accionAbono(this, '${a.id}', 'imprimirRecibo')">🧾</button>
                            <button class="dm-btn dm-btn-danger dm-btn-sm" onclick="App.views.accionAbono(this, '${a.id}', 'eliminarAbono')">X</button>
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
                <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">Registrar Abono</button>
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
App.views._resumenConversionCotizaciones = function () {
    const cotizaciones = App.state.cotizaciones || [];
    const total = cotizaciones.length;
    const convertidas = cotizaciones.filter(c => String(c.estado_conversion || '').toLowerCase() === 'convertida').length;
    const pendientes = total - convertidas;
    const montoCotizado = cotizaciones.reduce((acc, c) => acc + (parseFloat(c.total || 0) || 0), 0);
    const montoConvertido = cotizaciones
        .filter(c => String(c.estado_conversion || '').toLowerCase() === 'convertida')
        .reduce((acc, c) => acc + (parseFloat(c.total || 0) || 0), 0);
    const tasa = total > 0 ? (convertidas / total) * 100 : 0;
    return { total, convertidas, pendientes, montoCotizado, montoConvertido, tasa };
};

App.views.cotizaciones = function() {
    const cotizaciones = [...(App.state.cotizaciones || [])].sort((a, b) => new Date(b.fecha || b.fecha_creacion || 0) - new Date(a.fecha || a.fecha_creacion || 0));
    const resumen = App.views._resumenConversionCotizaciones();
    const fabricado = cotizaciones.filter(c => String(c.tipo || '').toLowerCase() === 'fabricado').length;
    const reventa = cotizaciones.filter(c => String(c.tipo || '').toLowerCase() === 'reventa').length;
    const reparacion = cotizaciones.filter(c => String(c.tipo || '').toLowerCase() === 'reparacion').length;

    let html = `
        <div class="dm-section" style="padding-bottom:90px;">
            <div class="dm-mb-4" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px,1fr)); gap:12px;">
                <div class="dm-card"><small class="dm-muted">Total cotizado</small><div class="dm-text-xl dm-fw-bold">${App.ui.money(resumen.montoCotizado)}</div></div>
                <div class="dm-card"><small class="dm-muted">Monto convertido</small><div class="dm-text-xl dm-fw-bold" style="color:var(--dm-success);">${App.ui.money(resumen.montoConvertido)}</div></div>
                <div class="dm-card"><small class="dm-muted">Tasa conversión</small><div class="dm-text-xl dm-fw-bold">${resumen.tasa.toFixed(1)}%</div></div>
                <div class="dm-card"><small class="dm-muted">Pendientes</small><div class="dm-text-xl dm-fw-bold" style="color:${resumen.pendientes > 0 ? 'var(--dm-warning)' : 'var(--dm-success)'};">${resumen.pendientes}</div></div>
            </div>

            <div class="dm-mb-4" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px,1fr)); gap:12px;">
                <div class="dm-card"><small class="dm-muted">Fabricado</small><div class="dm-text-xl dm-fw-bold">${fabricado}</div></div>
                <div class="dm-card"><small class="dm-muted">Reventa</small><div class="dm-text-xl dm-fw-bold">${reventa}</div></div>
                <div class="dm-card"><small class="dm-muted">Reparación</small><div class="dm-text-xl dm-fw-bold">${reparacion}</div></div>
                <div class="dm-card"><small class="dm-muted">Convertidas</small><div class="dm-text-xl dm-fw-bold" style="color:var(--dm-success);">${resumen.convertidas}</div></div>
            </div>

            <div class="dm-card dm-mb-4">
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <div>
                        <h3 class="dm-card-title">Cotizaciones PRO</h3>
                        <p class="dm-muted" style="margin-top:6px;">Cotiza fabricado, reventa y reparación desde un solo módulo.</p>
                    </div>
                    <input type="text" id="bus-cot" class="dm-input" onkeyup="window.filtrarLista('bus-cot', 'tarj-cot')" placeholder="🔍 Buscar cotización o cliente...">
                </div>
            </div>

            <div class="dm-list">
    `;

    if (!cotizaciones.length) {
        html += `<div class="dm-alert dm-alert-info">No hay cotizaciones registradas.</div>`;
    } else {
        cotizaciones.forEach(c => {
            const fecha = String(c.fecha || c.fecha_creacion || '').split('T')[0];
            const tipo = String(c.tipo || 'general').toLowerCase();
            const badgeClass = tipo === 'fabricado' ? 'dm-badge-primary' : tipo === 'reventa' ? 'dm-badge-success' : 'dm-badge-warning';
            const yaConvertida = String(c.estado_conversion || '').toLowerCase() === 'convertida';

            html += `
                <div class="dm-list-card tarj-cot">
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <div class="dm-row-between" style="align-items:flex-start; gap:12px; flex-wrap:wrap;">
                            <div style="flex:1; min-width:0;">
                                <div class="dm-list-card-title">${App.ui.safe(c.id || '')}</div>
                                <div class="dm-list-card-subtitle">${App.ui.safe(c.cliente_nombre || 'Cliente')}</div>
                                <div class="dm-text-sm dm-muted">${fecha}</div>
                            </div>
                            <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end;">
                                <span class="dm-badge ${badgeClass}">${App.ui.safe((c.tipo || 'general').toUpperCase())}</span>
                                ${yaConvertida ? `<span class="dm-badge dm-badge-success">CONVERTIDA</span>` : `<span class="dm-badge dm-badge-warning">PENDIENTE</span>`}
                            </div>
                        </div>

                        <div class="dm-card" style="background:var(--dm-surface-2); padding:10px;">
                            <div class="dm-row-between"><small class="dm-muted">Concepto</small><strong>${App.ui.safe(c.concepto || c.detalles || 'Cotización')}</strong></div>
                            <div class="dm-row-between"><small class="dm-muted">Total</small><strong>${App.ui.money(c.total || 0)}</strong></div>
                        </div>

                        <div class="dm-list-card-actions" style="display:flex; gap:8px; flex-wrap:wrap;">
                            <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.verCotizacion('${c.id}')">👁️ Ver</button>
                            <button class="dm-btn dm-btn-primary dm-btn-sm" onclick="App.views.formCotizacion('${c.id}')">✏️ Editar</button>
                            <button class="dm-btn dm-btn-success dm-btn-sm" onclick="App.views.convertirCotizacion('${c.id}')">🔁 Convertir</button>
                            ${!yaConvertida ? `<button class="dm-btn dm-btn-success dm-btn-sm" onclick="App.views.autoConvertirCotizacion('${c.id}')">⚡ Directo</button>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
    }

    html += `</div></div><button class="dm-fab" onclick="App.views.formCotizacion()">+</button>`;
    return html;
};

App.views.formCotizacion = function(id = null) {
    const obj = id ? (App.state.cotizaciones || []).find(c => c.id === id) : null;

    let htmlClientes = '<option value="">-- Cliente --</option>';
    (App.state.clientes || []).forEach(c => {
        htmlClientes += `<option value="${c.id}" ${obj && obj.cliente_id === c.id ? 'selected' : ''}>${App.ui.safe(c.nombre)}</option>`;
    });

    let htmlProductos = '<option value="">-- Producto / reventa --</option>';
    (App.state.productos || []).forEach(p => {
        htmlProductos += `<option value="${p.id}" ${obj && obj.producto_id === p.id ? 'selected' : ''}>${App.ui.safe(p.nombre)}</option>`;
    });

    const formHTML = `
        <form id="dynamic-form">
            <div class="dm-form-group">
                <label class="dm-label">Tipo de cotización</label>
                <select class="dm-select" name="tipo">
                    <option value="fabricado" ${obj && obj.tipo === 'fabricado' ? 'selected' : ''}>Fabricado</option>
                    <option value="reventa" ${obj && obj.tipo === 'reventa' ? 'selected' : ''}>Reventa</option>
                    <option value="reparacion" ${obj && obj.tipo === 'reparacion' ? 'selected' : ''}>Reparación</option>
                </select>
            </div>

            <div class="dm-form-group">
                <label class="dm-label">Cliente</label>
                <select class="dm-select" name="cliente_id">${htmlClientes}</select>
            </div>

            <div class="dm-form-group">
                <label class="dm-label">Nombre del cliente</label>
                <input type="text" class="dm-input" name="cliente_nombre" value="${obj ? App.ui.escapeHTML(obj.cliente_nombre || '') : ''}" required>
            </div>

            <div class="dm-form-group">
                <label class="dm-label">Producto / artículo</label>
                <select class="dm-select" name="producto_id">${htmlProductos}</select>
            </div>

            <div class="dm-form-row" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px,1fr)); gap:12px;">
                <div class="dm-form-group">
                    <label class="dm-label">Cantidad</label>
                    <input type="number" class="dm-input" name="cantidad" value="${obj ? (obj.cantidad || 1) : 1}" required>
                </div>
                <div class="dm-form-group">
                    <label class="dm-label">Total</label>
                    <input type="number" step="0.01" class="dm-input" name="total" value="${obj ? (obj.total || '') : ''}" required>
                </div>
            </div>

            <div class="dm-form-group">
                <label class="dm-label">Concepto</label>
                <input type="text" class="dm-input" name="concepto" value="${obj ? App.ui.escapeHTML(obj.concepto || '') : ''}" required>
            </div>

            <div class="dm-form-group">
                <label class="dm-label">Detalles</label>
                <textarea class="dm-textarea" name="detalles">${obj ? App.ui.escapeHTML(obj.detalles || '') : ''}</textarea>
            </div>

            <input type="hidden" name="fecha" value="${obj ? (obj.fecha || new Date().toISOString()) : new Date().toISOString()}">
            <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">${obj ? 'Guardar Cambios' : 'Guardar Cotización'}</button>
        </form>
    `;

    App.ui.openSheet(obj ? 'Editar Cotización' : 'Nueva Cotización', formHTML, async (data) => {
        if (obj) return App.logic.actualizarRegistroGenerico('cotizaciones', id, data, 'cotizaciones');
        return App.logic.guardarNuevoGenerico('cotizaciones', data, 'COT', 'cotizaciones');
    });
};

App.views.verCotizacion = function(cotizacionId) {
    const c = (App.state.cotizaciones || []).find(x => x.id === cotizacionId);
    if (!c) return;

    const html = `
        <div class="dm-list">
            <div class="dm-list-card">
                <div class="dm-fw-bold">${App.ui.safe(c.cliente_nombre || 'Cliente')}</div>
                <div class="dm-text-sm dm-muted dm-mt-2">Tipo: <strong>${App.ui.safe(c.tipo || 'general')}</strong></div>
                <div class="dm-text-sm dm-muted">Concepto: <strong>${App.ui.safe(c.concepto || '')}</strong></div>
                <div class="dm-text-sm dm-muted">Total: <strong>${App.ui.money(c.total || 0)}</strong></div>
                <div class="dm-text-sm dm-muted">Fecha: <strong>${String(c.fecha || c.fecha_creacion || '').split('T')[0]}</strong></div>
            </div>
            <div class="dm-list-card">
                <div class="dm-fw-bold">Detalles</div>
                <div class="dm-text-sm dm-muted dm-mt-2">${App.ui.safe(c.detalles || 'Sin detalles')}</div>
            </div>
        </div>
    `;

    App.ui.openSheet(`Cotización ${cotizacionId}`, html);
};

App.views._marcarCotizacionConvertida = async function (cotizacionId, extras = {}) {
    const cot = (App.state.cotizaciones || []).find(x => x.id === cotizacionId);
    if (!cot) return;

    const payload = Object.assign({
        estado_conversion: 'convertida',
        fecha_conversion: new Date().toISOString()
    }, extras);

    try {
        await App.logic.actualizarRegistroGenerico('cotizaciones', cotizacionId, payload, 'cotizaciones');
    } catch (e) {
        Object.assign(cot, payload);
    }
};

App.views.autoConvertirCotizacion = async function (cotizacionId) {
    const c = (App.state.cotizaciones || []).find(x => x.id === cotizacionId);
    if (!c) return;

    const tipo = String(c.tipo || '').toLowerCase();
    try {
        App.ui.showLoader('Auto-convirtiendo cotización...');

        if (tipo === 'reparacion') {
            const dataRep = {
                cliente_nombre: c.cliente_nombre || 'Cliente',
                descripcion: c.concepto || c.detalles || 'Reparación desde cotización',
                precio: c.total || 0,
                anticipo_inicial: 0
            };
            await App.logic.guardarNuevoGenerico('reparaciones', dataRep, 'REP', 'reparaciones');
            await App.views._marcarCotizacionConvertida(cotizacionId, { convertido_a: 'reparacion' });
        } else {
            const dataPedido = {
                cliente_id: c.cliente_id || 'STOCK_INTERNO',
                producto_id: c.producto_id || '',
                cantidad: c.cantidad || 1,
                total: c.total || 0,
                anticipo: 0,
                fecha_entrega: new Date().toISOString().split('T')[0]
            };
            await App.logic.guardarNuevoPedido(dataPedido);
            await App.views._marcarCotizacionConvertida(cotizacionId, { convertido_a: 'pedido' });
        }

        App.ui.hideLoader();
        App.ui.toast('Cotización convertida automáticamente');
        if (App.router?.handleRoute) App.router.handleRoute();
    } catch (error) {
        console.error('Error en autoConvertirCotizacion:', error);
        App.ui.hideLoader();
        App.ui.toast(error.message || 'No se pudo auto-convertir la cotización', 'danger');
    }
};

App.views.convertirCotizacion = function(cotizacionId) {
    const c = (App.state.cotizaciones || []).find(x => x.id === cotizacionId);
    if (!c) return;

    const tipo = String(c.tipo || '').toLowerCase();
    if (tipo === 'reparacion') return App.views.formReparacionDesdeCotizacion(cotizacionId);
    return App.views.formPedidoDesdeCotizacion(cotizacionId);
};

App.views.formPedidoDesdeCotizacion = function(cotizacionId) {
    const c = (App.state.cotizaciones || []).find(x => x.id === cotizacionId);
    if (!c) return;

    const prefill = {
        cliente_id: c.cliente_id || '',
        producto_id: c.producto_id || '',
        cantidad: c.cantidad || 1,
        total: c.total || '',
        anticipo: 0,
        fecha_entrega: '',
        notas: c.detalles || '',
        cliente_nombre: c.cliente_nombre || ''
    };

    App.views._formPedidoInterno(null, prefill);
};

App.views.formReparacionDesdeCotizacion = function(cotizacionId) {
    const c = (App.state.cotizaciones || []).find(x => x.id === cotizacionId);
    if (!c) return;

    const formHTML = `
        <form id="dynamic-form">
            <div class="dm-alert dm-alert-info dm-mb-3">Conversión desde cotización ${App.ui.safe(c.id || '')}</div>
            <div class="dm-form-group">
                <label class="dm-label">Cliente</label>
                <input type="text" class="dm-input" name="cliente_nombre" value="${App.ui.escapeHTML(c.cliente_nombre || '')}" required>
            </div>
            <div class="dm-form-group">
                <label class="dm-label">Descripción reparación</label>
                <textarea class="dm-textarea" name="descripcion" required>${App.ui.escapeHTML(c.concepto || c.detalles || '')}</textarea>
            </div>
            <div class="dm-form-row">
                <div class="dm-form-group">
                    <label class="dm-label">Precio</label>
                    <input type="number" step="0.01" class="dm-input" name="precio" value="${c.total || ''}" required>
                </div>
                <div class="dm-form-group">
                    <label class="dm-label">Anticipo inicial</label>
                    <input type="number" step="0.01" class="dm-input" name="anticipo_inicial" value="0">
                </div>
            </div>
            <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">Crear reparación</button>
        </form>
    `;

    App.ui.openSheet('Convertir a reparación', formHTML, async (data) => {
        const res = await App.logic.guardarNuevoGenerico('reparaciones', data, 'REP', 'reparaciones');
        await App.views._marcarCotizacionConvertida(cotizacionId, { convertido_a: 'reparacion' });
        return res;
    });
};

// ==========================================
// DETALLE DE PEDIDO
// ==========================================
App.views.modalDetallesPedido = function(pedidoId) {
    const pedido = (App.state.pedidos || []).find(p => p.id === pedidoId);
    const detalles = (App.state.pedido_detalle || []).filter(d => d.pedido_id === pedidoId);
    const abonosLista = (App.state.abonos || []).filter(a => a.pedido_id === pedidoId);
    const ultimoAbono = abonosLista.length ? [...abonosLista].sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0))[0] : null;

    if (!pedido || detalles.length === 0) {
        App.ui.toast('No hay detalles guardados para este pedido.');
        return;
    }

    const saldo = parseFloat(pedido.total || 0) - parseFloat(pedido.anticipo || 0) - abonosLista.reduce((s, a) => s + parseFloat(a.monto || 0), 0);
    const estado = String(pedido.estado || '').toLowerCase();
    const whatsappAction = estado === 'listo para entregar' ? 'whatsappListo' : 'whatsappCobro';

    let html = `<div class="dm-list">`;
    detalles.forEach(d => {
        const prod = (App.state.productos || []).find(p => p.id === d.producto_id);
        const nombreProducto = prod ? prod.nombre : 'Producto sin nombre';
        html += `
            <div class="dm-list-card" style="padding:10px;">
                <div class="dm-fw-bold" style="font-size:16px;">${App.ui.safe(nombreProducto)}</div>
                <div class="dm-text-sm dm-muted dm-mt-2">Cantidad comprada: <strong>${App.ui.safe(d.cantidad)}</strong><br>Precio unitario: $${parseFloat(d.precio_unitario || 0).toFixed(2)}</div>
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
            ${estado !== 'listo para entregar' && estado !== 'entregado' && estado !== 'pagado' ? `<button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.accionPedido(this, '${pedidoId}', 'marcarListo')">📦 Listo</button>` : ''}
            ${estado === 'listo para entregar' || estado === 'pagado' ? `<button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.accionPedido(this, '${pedidoId}', 'marcarEntregado')">🚚 Entregado</button>` : ''}
            ${saldo <= 0.05 && estado !== 'pagado' ? `<button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.accionPedido(this, '${pedidoId}', 'cerrarPedido')">🔒 Cerrar</button>` : ''}
        </div>
    `;

    App.ui.openSheet(`Detalles del Pedido: ${pedidoId}`, html, () => App.ui.closeSheet());
};