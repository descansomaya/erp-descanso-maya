window.App = window.App || {};
App.views = App.views || {};

App.views.revertirProduccionAPendiente = async function (ordenId) {
    const orden = (App.state?.ordenes_produccion || []).find(o => o.id === ordenId);
    if (!orden) throw new Error('Orden no encontrada');

    const estadoActual = String(orden.estado || '').toLowerCase();
    const yaRevertida =
        String(orden.materiales_revertidos || '').toLowerCase() === 'true' ||
        orden.materiales_revertidos === true;

    if (estadoActual === 'pendiente') {
        App.ui.toast('La orden ya está en pendiente', 'warning');
        return false;
    }

    if (yaRevertida) {
        App.ui.toast('Esta orden ya tuvo reversa de materiales', 'warning');
        return false;
    }

    const ok = window.confirm(`¿Regresar la orden ${ordenId} a pendiente y restaurar materiales?`);
    if (!ok) return false;

    let receta = [];
    try {
        receta = JSON.parse(orden.receta_personalizada || '[]');
        if (!Array.isArray(receta)) receta = [];
    } catch (e) {
        receta = [];
    }

    const operaciones = [];
    const ahora = new Date().toISOString();
    const movBase = Date.now();

    receta.forEach((item, i) => {
        const matId = item.mat_id;
        const cant = parseFloat(item.cant || 0) || 0;
        if (!matId || cant <= 0) return;

        const mat = (App.state?.inventario || []).find(m => m.id === matId);
        if (!mat) return;

        const stockActual = parseFloat(mat.stock_real || 0) || 0;
        const nuevoStock = stockActual + cant;
        const costoUnitario = parseFloat(mat.costo_unitario || 0) || 0;
        const totalMovimiento = cant * costoUnitario;

        operaciones.push({
            action: 'actualizar_fila',
            nombreHoja: 'materiales',
            idFila: matId,
            datosNuevos: {
                stock_real: nuevoStock
            }
        });

        operaciones.push({
            action: 'guardar_fila',
            nombreHoja: 'movimientos_inventario',
            datos: {
                id: `REV-${movBase}-${i}`,
                fecha: ahora,
                tipo_movimiento: 'reversa_produccion',
                origen: 'orden',
                origen_id: ordenId,
                ref_tipo: 'material',
                ref_id: matId,
                cantidad: cant,
                costo_unitario: costoUnitario,
                total: totalMovimiento,
                notas: `Reversa por regresar orden ${ordenId} a pendiente`
            }
        });
    });

    operaciones.push({
        action: 'actualizar_fila',
        nombreHoja: 'ordenes_produccion',
        idFila: ordenId,
        datosNuevos: {
            estado: 'pendiente',
            materiales_revertidos: true,
            materiales_descontados: false,
            fecha_reversa_materiales: ahora
        }
    });

    const res = await App.api.fetch('ejecutar_lote', { operaciones });
    if (res.status !== 'success') {
        throw new Error(res.message || 'No se pudo ejecutar la reversa');
    }

    receta.forEach((item) => {
        const matId = item.mat_id;
        const cant = parseFloat(item.cant || 0) || 0;
        if (!matId || cant <= 0) return;

        const mat = (App.state?.inventario || []).find(m => m.id === matId);
        if (mat) {
            mat.stock_real = (parseFloat(mat.stock_real || 0) || 0) + cant;
        }
    });

    const ordState = (App.state?.ordenes_produccion || []).find(o => o.id === ordenId);
    if (ordState) {
        ordState.estado = 'pendiente';
        ordState.materiales_revertidos = true;
        ordState.materiales_descontados = false;
        ordState.fecha_reversa_materiales = ahora;
    }

    if (!Array.isArray(App.state.movimientos_inventario)) {
        App.state.movimientos_inventario = [];
    }

    receta.forEach((item, i) => {
        const matId = item.mat_id;
        const cant = parseFloat(item.cant || 0) || 0;
        if (!matId || cant <= 0) return;

        const mat = (App.state?.inventario || []).find(m => m.id === matId);
        const costoUnitario = parseFloat(mat?.costo_unitario || 0) || 0;

        App.state.movimientos_inventario.push({
            id: `REV-${movBase}-${i}`,
            fecha: ahora,
            tipo_movimiento: 'reversa_produccion',
            origen: 'orden',
            origen_id: ordenId,
            ref_tipo: 'material',
            ref_id: matId,
            cantidad: cant,
            costo_unitario: costoUnitario,
            total: cant * costoUnitario,
            notas: `Reversa por regresar orden ${ordenId} a pendiente`
        });
    });

    if (App.router?.handleRoute) App.router.handleRoute();

    return true;
};

App.views.runProduccionAction = async function (button, lockKey, actionFn, options = {}) {
    return App.ui.runSafeAction({
        lockKey,
        button,
        loadingText: options.loadingText || "Procesando...",
        loaderMessage: options.loaderMessage || "Actualizando producción...",
        successMessage: options.successMessage || "Acción completada",
        errorTitle: options.errorTitle || "No se pudo completar la acción",
        toastOnSuccess: options.toastOnSuccess !== false
    }, async () => actionFn());
};

App.views.descontarMaterialesProduccion = async function (ordenId) {
    const orden = (App.state?.ordenes_produccion || []).find(o => o.id === ordenId);
    if (!orden) throw new Error('Orden no encontrada');

    const yaDescontada =
        String(orden.materiales_descontados || '').toLowerCase() === 'true' ||
        orden.materiales_descontados === true;

    if (yaDescontada) return true;

    let receta = [];
    try {
        receta = JSON.parse(orden.receta_personalizada || '[]');
        if (!Array.isArray(receta)) receta = [];
    } catch (e) {
        receta = [];
    }

    if (!receta.length) return true;

    const operaciones = [];
    const ahora = new Date().toISOString();
    const movBase = Date.now();

    receta.forEach((item, i) => {
        const matId = item.mat_id;
        const cant = parseFloat(item.cant || 0) || 0;
        if (!matId || cant <= 0) return;

        const mat = (App.state?.inventario || []).find(m => m.id === matId);
        if (!mat) return;

        const stockActual = parseFloat(mat.stock_real || 0) || 0;
        const nuevoStock = stockActual - cant;

        if (nuevoStock < 0) {
            throw new Error(`Stock insuficiente: ${mat.nombre || matId}`);
        }

        const costoUnitario = parseFloat(mat.costo_unitario || 0) || 0;
        const totalMovimiento = -(cant * costoUnitario);

        operaciones.push({
            action: 'actualizar_fila',
            nombreHoja: 'materiales',
            idFila: matId,
            datosNuevos: {
                stock_real: nuevoStock
            }
        });

        operaciones.push({
            action: 'guardar_fila',
            nombreHoja: 'movimientos_inventario',
            datos: {
                id: `SAL-${movBase}-${i}`,
                fecha: ahora,
                tipo_movimiento: 'salida_produccion',
                origen: 'orden',
                origen_id: ordenId,
                ref_tipo: 'material',
                ref_id: matId,
                cantidad: -cant,
                costo_unitario: costoUnitario,
                total: totalMovimiento,
                notas: `Envío a taller de orden ${ordenId}`
            }
        });
    });

    operaciones.push({
        action: 'actualizar_fila',
        nombreHoja: 'ordenes_produccion',
        idFila: ordenId,
        datosNuevos: {
            materiales_descontados: true,
            materiales_revertidos: false,
            fecha_descuento_materiales: ahora
        }
    });

    const res = await App.api.fetch('ejecutar_lote', { operaciones });
    if (res.status !== 'success') {
        throw new Error(res.message || 'No se pudieron descontar materiales');
    }

    receta.forEach((item) => {
        const matId = item.mat_id;
        const cant = parseFloat(item.cant || 0) || 0;
        if (!matId || cant <= 0) return;

        const mat = (App.state?.inventario || []).find(m => m.id === matId);
        if (mat) {
            mat.stock_real = (parseFloat(mat.stock_real || 0) || 0) - cant;
        }
    });

    orden.materiales_descontados = true;
    orden.materiales_revertidos = false;
    orden.fecha_descuento_materiales = ahora;

    if (!Array.isArray(App.state.movimientos_inventario)) {
        App.state.movimientos_inventario = [];
    }

    receta.forEach((item, i) => {
        const matId = item.mat_id;
        const cant = parseFloat(item.cant || 0) || 0;
        if (!matId || cant <= 0) return;

        const mat = (App.state?.inventario || []).find(m => m.id === matId);
        const costoUnitario = parseFloat(mat?.costo_unitario || 0) || 0;

        App.state.movimientos_inventario.push({
            id: `SAL-${movBase}-${i}`,
            fecha: ahora,
            tipo_movimiento: 'salida_produccion',
            origen: 'orden',
            origen_id: ordenId,
            ref_tipo: 'material',
            ref_id: matId,
            cantidad: -cant,
            costo_unitario: costoUnitario,
            total: -(cant * costoUnitario),
            notas: `Envío a taller de orden ${ordenId}`
        });
    });

    return true;
};

App.views.accionProduccion = function (button, ordenId, actionName) {
    const actions = {
    iniciar: {
    fn: async () => {
        // 1. Descontar primero, con el estado todavía estable
        await App.views.descontarMaterialesProduccion(ordenId);

        // 2. Luego cambiar estado a proceso
        await App.logic.cambiarEstadoProduccion(ordenId, 'proceso');

        // 3. Forzar estado local para que se vea de inmediato
        const orden = App.state?.ordenes_produccion?.find(o => o.id === ordenId);
        if (orden) {
            orden.estado = 'proceso';
            orden.materiales_descontados = true;
            orden.materiales_revertidos = false;
        }

        // 4. Refrescar UI
        if (App.router?.handleRoute) App.router.handleRoute();

        return true;
    },
 
            loadingText: 'Iniciando...',
            loaderMessage: 'Moviendo orden a proceso...',
            successMessage: 'Orden iniciada',
            errorTitle: 'No se pudo iniciar la orden'
        },
        terminar: {
            fn: () => App.logic.cambiarEstadoProduccion(ordenId, 'listo'),
            loadingText: 'Terminando...',
            loaderMessage: 'Marcando orden como lista...',
            successMessage: 'Orden terminada',
            errorTitle: 'No se pudo terminar la orden'
        },
        regresarPendiente: {
            fn: () => App.views.revertirProduccionAPendiente(ordenId),
            loadingText: 'Regresando...',
            loaderMessage: 'Regresando orden a pendiente y restaurando materiales...',
            successMessage: 'Orden regresada a pendiente con reversa',
            errorTitle: 'No se pudo regresar la orden a pendiente'
        },
        eliminar: {
            fn: async () => {
                const ok = window.confirm(`¿Eliminar la orden ${ordenId}?`);
                if (!ok) return false;
                return App.logic.eliminarRegistroGenerico('ordenes_produccion', ordenId, 'ordenes_produccion');
            },
            loadingText: 'Eliminando...',
            loaderMessage: 'Eliminando orden de producción...',
            successMessage: 'Orden eliminada',
            errorTitle: 'No se pudo eliminar la orden'
        }
    };

    const config = actions[actionName];
    if (!config) {
        App.ui.toast('Acción no disponible', 'warning');
        return;
    }

    return App.views.runProduccionAction(button, `produccion:${ordenId}:${actionName}`, config.fn, config);
};

App.views.accionAsignacionProduccion = function (button, ordenId, asignacionId, actionName) {
    const actions = {
        cancelar: {
            fn: () => App.logic.cancelarAsignacionMultiArtesano(asignacionId),
            loadingText: 'Eliminando...',
            loaderMessage: 'Cancelando asignación...',
            successMessage: 'Asignación cancelada',
            errorTitle: 'No se pudo cancelar la asignación'
        }
    };

    const config = actions[actionName];
    if (!config) {
        App.ui.toast('Acción no disponible', 'warning');
        return;
    }

    return App.views.runProduccionAction(button, `produccion:${ordenId}:asignacion:${asignacionId}:${actionName}`, config.fn, config);
};

App.views._getAsignacionesOrden = function (ordenId) {
    return (App.state?.ordenes_produccion_artesanos || [])
        .filter(a => a.orden_id === ordenId && String(a.estado || 'activo').toLowerCase() !== 'cancelado');
};

App.views._getRecetaOrden = function (orden) {
    try {
        const receta = JSON.parse(orden?.receta_personalizada || '[]');
        return Array.isArray(receta) ? receta : [];
    } catch (e) {
        return [];
    }
};

App.views._renderAsignacionesOrden = function (ordenId) {
    const asignaciones = App.views._getAsignacionesOrden(ordenId);
    if (!asignaciones.length) return `<div class="dm-text-sm dm-muted dm-mt-1"><i>Sin artesanos asignados</i></div>`;

    let html = `<ul style="margin:5px 0 0 20px; padding:0; font-size:13px; color:var(--dm-muted);">`;
    asignaciones.forEach(a => {
        const artesano = (App.state?.artesanos || []).find(x => x.id === a.artesano_id);
        const nombreArtesano = artesano ? artesano.nombre : 'Artesano';
        const componente = a.componente || a.aplica_a || 'Total';
        const pago = parseFloat(a.pago_estimado || 0) || 0;
        html += `<li>${App.ui.safe(nombreArtesano)} · ${App.ui.safe(componente)} · $${pago.toFixed(2)}</li>`;
    });
    html += `</ul>`;
    return html;
};

App.views._totalPagoArtesanosOrden = function (ordenId) {
    const asignaciones = App.views._getAsignacionesOrden(ordenId);
    return asignaciones.reduce((acc, a) => acc + (parseFloat(a.pago_estimado || 0) || 0), 0);
};

App.views._buildOrdenCard = function (o) {
    const pDetalle = (App.state?.pedido_detalle || []).find(d => d.id === o.pedido_detalle_id) || {};
    const producto = (App.state?.productos || []).find(p => p.id === pDetalle.producto_id) || {};
    const pedido = (App.state?.pedidos || []).find(p => p.id === pDetalle.pedido_id) || {};
    const cliente = (App.state?.clientes || []).find(c => c.id === pedido.cliente_id) || {};
    const nombreCliente = pedido.cliente_id === 'STOCK_INTERNO' ? 'STOCK BODEGA' : (cliente.nombre || 'Cliente');

    const badgeClass = o.estado === 'listo' ? 'dm-badge-success' : o.estado === 'proceso' ? 'dm-badge-warning' : 'dm-badge-info';

    let costoMateriales = 0;
    const receta = App.views._getRecetaOrden(o);
    const resumenReceta = receta.slice(0, 3).map(item => {
        const mat = (App.state?.inventario || []).find(m => m.id === item.mat_id);
        if (mat) costoMateriales += (parseFloat(mat.costo_unitario || 0) || 0) * (parseFloat(item.cant || 0) || 0);
        return mat ? `${App.ui.safe(item.cant)}x ${App.ui.safe(mat.nombre)}` : null;
    }).filter(Boolean);

    const precioVenta = (parseFloat(pDetalle.precio_unitario || 0) || 0) * (parseFloat(pDetalle.cantidad || 1) || 1);
    const pagoArtesano = App.views._totalPagoArtesanosOrden(o.id);
    const utilidad = precioVenta - costoMateriales - pagoArtesano;
    const colorUtilidad = utilidad > 0 ? 'var(--dm-success)' : utilidad === 0 ? 'var(--dm-warning)' : 'var(--dm-danger)';

    return `
        <div class="dm-list-card">
            <div style="display:flex; flex-direction:column; gap:10px;">
                <div class="dm-row-between" style="align-items:flex-start; gap:10px; flex-wrap:wrap;">
                    <div style="flex:1; min-width:0;">
                        <div class="dm-list-card-title" style="word-break:break-word;">${App.ui.safe(producto.nombre || 'Producto')}</div>
                        <div class="dm-list-card-subtitle">${App.ui.safe(nombreCliente)} · Folio ${App.ui.safe((pDetalle.pedido_id || '').replace('PED-', ''))}</div>
                    </div>
                    <span class="dm-badge ${badgeClass}">${App.ui.safe((o.estado || '').toUpperCase())}</span>
                </div>

                <div class="dm-card" style="background:var(--dm-surface-2); padding:10px;">
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(110px,1fr)); gap:10px; text-align:center;">
                        <div><small class="dm-muted">Venta</small><br><strong>$${precioVenta.toFixed(2)}</strong></div>
                        <div><small class="dm-muted">Insumos</small><br><strong>$${costoMateriales.toFixed(2)}</strong></div>
                        <div><small class="dm-muted">Artesanos</small><br><strong>$${pagoArtesano.toFixed(2)}</strong></div>
                        <div><small class="dm-muted">Utilidad</small><br><strong style="color:${colorUtilidad};">$${utilidad.toFixed(2)}</strong></div>
                    </div>
                </div>

                <div class="dm-text-sm dm-muted">
                    <strong>Artesanos:</strong> ${App.views._getAsignacionesOrden(o.id).length || 0}
                    ${resumenReceta.length ? `<br><strong>Hilos:</strong> ${resumenReceta.join(' · ')}` : '<br><strong>Hilos:</strong> Sin asignar'}
                </div>

                <div class="dm-list-card-actions" style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.verDetallesProduccion('${o.id}')">👁️ Detalles</button>
                    ${o.estado === 'pendiente' ? `<button class="dm-btn dm-btn-primary dm-btn-sm" onclick="App.views.accionProduccion(this, '${o.id}', 'iniciar')">▶️ Iniciar</button>` : ''}
                    ${o.estado === 'proceso' ? `<button class="dm-btn dm-btn-success dm-btn-sm" onclick="App.views.accionProduccion(this, '${o.id}', 'terminar')">✅ Terminar</button>` : ''}
                    ${o.estado !== 'pendiente' ? `<button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.accionProduccion(this, '${o.id}', 'regresarPendiente')">↩️ Pendiente</button>` : ''}
                    <button class="dm-btn dm-btn-danger dm-btn-sm" onclick="App.views.accionProduccion(this, '${o.id}', 'eliminar')">🗑️</button>
                </div>
            </div>
        </div>
    `;
};

App.views._renderProduccionColumn = function (estado, titulo, icono, badgeClass) {
    const ordenes = (App.state?.ordenes_produccion || []).filter(o => o.estado === estado).sort((a, b) => new Date(b.fecha_creacion || 0) - new Date(a.fecha_creacion || 0));
    const contenido = ordenes.length ? ordenes.map(o => App.views._buildOrdenCard(o)).join('') : `<div class="dm-alert dm-alert-info">No hay órdenes en esta sección.</div>`;
    return `
        <div class="dm-card">
            <div class="dm-row-between" style="align-items:center; gap:10px; margin-bottom:12px;">
                <div class="dm-card-title">${icono} ${titulo}</div>
                <span class="dm-badge ${badgeClass}">${ordenes.length}</span>
            </div>
            <div class="dm-list">${contenido}</div>
        </div>
    `;
};

App.views.produccion = function () {
    const headerTitle = document.getElementById('app-header-title');
    const headerSubtitle = document.getElementById('app-header-subtitle');
    const bottomNav = document.getElementById('bottom-nav');
    if (headerTitle) headerTitle.innerText = 'Taller';
    if (headerSubtitle) headerSubtitle.innerText = 'Órdenes de producción';
    if (bottomNav) bottomNav.style.display = 'flex';

    const ordenes = App.state?.ordenes_produccion || [];
    const pendientes = ordenes.filter(o => o.estado === 'pendiente').length;
    const proceso = ordenes.filter(o => o.estado === 'proceso').length;
    const listas = ordenes.filter(o => o.estado === 'listo').length;

    return `
        <div class="dm-section" style="padding-bottom:90px;">
            <div class="dm-card dm-mb-4" style="background:linear-gradient(135deg, #ffffff 0%, #faf7ff 100%);">
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <div>
                        <h3 class="dm-card-title">Producción</h3>
                        <p class="dm-muted" style="margin-top:6px;">Control visual del taller, carga operativa y avance por orden sin perder la lógica actual.</p>
                    </div>
                    <input type="text" id="bus-prod-pro" class="dm-input" onkeyup="window.filtrarLista('bus-prod-pro', 'dm-list-card')" placeholder="🔍 Buscar orden, producto o artesano...">
                </div>
            </div>

            <div class="dm-mb-4" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(170px,1fr)); gap:12px;">
                <div class="dm-card"><small class="dm-muted">En cola</small><div class="dm-text-xl dm-fw-bold">${pendientes}</div></div>
                <div class="dm-card"><small class="dm-muted">En proceso</small><div class="dm-text-xl dm-fw-bold" style="color:var(--dm-warning);">${proceso}</div></div>
                <div class="dm-card"><small class="dm-muted">Listas</small><div class="dm-text-xl dm-fw-bold" style="color:var(--dm-success);">${listas}</div></div>
            </div>

            <div class="dm-mb-4" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px,1fr)); gap:12px; align-items:start;">
                ${App.views._renderProduccionColumn('pendiente', 'En cola', '🕒', 'dm-badge-info')}
                ${App.views._renderProduccionColumn('proceso', 'En proceso', '🔥', 'dm-badge-warning')}
                ${App.views._renderProduccionColumn('listo', 'Listas', '✅', 'dm-badge-success')}
            </div>
        </div>
    `;
};

App.views.verDetallesProduccion = function (ordenId) {
    const o = (App.state?.ordenes_produccion || []).find(x => x.id === ordenId);
    if (!o) return;

    const pedDet = (App.state?.pedido_detalle || []).find(d => d.id === o.pedido_detalle_id) || {};
    const p = (App.state?.pedidos || []).find(x => x.id === pedDet.pedido_id) || {};
    const cliente = (App.state?.clientes || []).find(x => x.id === p.cliente_id) || {};
    const prod = (App.state?.productos || []).find(x => x.id === pedDet.producto_id) || {};
    const nomCliente = p.cliente_id === 'STOCK_INTERNO' ? 'STOCK BODEGA' : (cliente.nombre || 'Desconocido');

    const asignaciones = App.views._getAsignacionesOrden(o.id);
    let asignacionesHtml = '';
    if (!asignaciones.length) {
        asignacionesHtml = `<div class="dm-alert dm-alert-info">Aún no hay asignaciones multiartesano registradas para esta orden.</div>`;
    } else {
        asignacionesHtml = `<div class="dm-list dm-mb-3">` + asignaciones.map(a => {
            const artesano = (App.state?.artesanos || []).find(x => x.id === a.artesano_id);
            const nombreArtesano = artesano ? artesano.nombre : 'Artesano';
            return `
                <div class="dm-list-card">
                    <div class="dm-row-between" style="align-items:flex-start; gap:12px;">
                        <div style="flex:1;">
                            <strong>${App.ui.safe(nombreArtesano)}</strong>
                            <div class="dm-text-sm dm-muted dm-mt-2">
                                Componente: ${App.ui.safe(a.componente || a.aplica_a || 'Total')}<br>
                                Esquema: ${App.ui.safe(a.esquema_pago || a.modo_calculo || 'fijo')}<br>
                                Tarifa: $${(parseFloat(a.monto_tarifa_apl || 0) || 0).toFixed(2)} ·
                                Factor: ${(parseFloat(a.factor_participac || 1) || 1).toFixed(2)}
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <strong>$${(parseFloat(a.pago_estimado || 0) || 0).toFixed(2)}</strong>
                            <div class="dm-list-card-actions" style="justify-content:flex-end; margin-top:8px;">
                                <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.ui.closeSheet(); setTimeout(()=>App.views.formAsignacionMultiArtesano('${o.id}', '${a.id}'), 250);">✏️</button>
                                <button class="dm-btn dm-btn-danger dm-btn-sm" onclick="App.views.accionAsignacionProduccion(this, '${o.id}', '${a.id}', 'cancelar')">🗑️</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('') + `</div>`;
    }

    const html = `
        <div class="dm-list-card dm-mb-4" style="background:var(--dm-surface-2); padding:15px; border:none;">
            <div class="dm-row-between dm-mb-2">
                <span class="dm-text-sm dm-muted">Folio / Cliente:</span>
                <strong style="color:var(--dm-primary);">${App.ui.safe((p.id || '').replace('PED-', ''))} - ${App.ui.safe(nomCliente)}</strong>
            </div>
            <div class="dm-row-between">
                <span class="dm-text-sm dm-muted">Producto a tejer:</span>
                <strong>${App.ui.safe(prod.nombre || 'No definido')}</strong>
            </div>
        </div>

        <div class="dm-form-group">
            <label class="dm-label">Notas de Producción</label>
            <div class="dm-alert dm-alert-warning" style="background:#fff;">
                ${p.notas ? App.ui.escapeHTML(p.notas) : '<i>Sin instrucciones especiales.</i>'}
            </div>
        </div>

        <div class="dm-mb-3">
            <h4 class="dm-label dm-mb-2">Asignaciones registradas</h4>
            ${asignacionesHtml}
        </div>

        <div class="dm-row-between dm-mt-4">
            <button class="dm-btn dm-btn-secondary" onclick="App.ui.closeSheet()">Cerrar</button>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button class="dm-btn dm-btn-primary" onclick="App.ui.closeSheet(); setTimeout(()=>App.views.formAsignacionMultiArtesano('${o.id}'), 250);">+ Asignar artesano</button>
                ${o.estado !== 'listo' ? `<button class="dm-btn dm-btn-ghost" style="border:1px solid var(--dm-border);" onclick="App.views.modalMateriaPrima('${o.id}')">🧶 Asignar Hilos</button>` : ''}
                ${o.estado !== 'pendiente' ? `<button class="dm-btn dm-btn-secondary" onclick="App.views.accionProduccion(this, '${o.id}', 'regresarPendiente')">↩️ Pendiente</button>` : ''}
            </div>
        </div>
    `;

    App.ui.openSheet('Detalle de Producción', html);
};

window.verDetallesProduccion = function (ordenId) {
    return App.views.verDetallesProduccion(ordenId);
};

App.views.formAsignacionMultiArtesano = function (ordenId, asignacionId = null) {
    const orden = (App.state?.ordenes_produccion || []).find(o => o.id === ordenId);
    if (!orden) return;

    const asignacion = asignacionId ? (App.state?.ordenes_produccion_artesanos || []).find(a => a.id === asignacionId) : null;
    const artesanosOpts = (App.state?.artesanos || []).map(a => `<option value="${a.id}" ${asignacion?.artesano_id === a.id ? 'selected' : ''}>${App.ui.safe(a.nombre)}</option>`).join('');

    const formHTML = `
        <form id="dynamic-form">
            <input type="hidden" name="orden_id" value="${ordenId}">
            ${asignacion ? `<input type="hidden" name="id" value="${asignacion.id}">` : ''}

            <div class="dm-form-group">
                <label class="dm-label">Artesano</label>
                <select class="dm-select" name="artesano_id" id="select-artesano-multi" required onchange="window.cargarTarifasMulti(this.value)">
                    <option value="">-- Seleccione artesano --</option>
                    ${artesanosOpts}
                </select>
            </div>

            <div class="dm-form-group">
                <label class="dm-label">Tarifa</label>
                <select class="dm-select" name="tarifa_artesano_id" id="select-tarifas-multi" required onchange="window.calcTotalTrabajoMulti()">
                    <option value="">-- Seleccione artesano primero --</option>
                </select>
            </div>

            <div class="dm-form-group">
                <label class="dm-label">Componente</label>
                <select class="dm-select" name="componente" id="componente-multi" onchange="window.calcTotalTrabajoMulti()">
                    <option value="total" ${(asignacion?.componente || 'total') === 'total' ? 'selected' : ''}>Total</option>
                    <option value="Cuerpo" ${asignacion?.componente === 'Cuerpo' ? 'selected' : ''}>Cuerpo</option>
                    <option value="Brazos" ${asignacion?.componente === 'Brazos' ? 'selected' : ''}>Brazos</option>
                    <option value="Adicional" ${asignacion?.componente === 'Adicional' ? 'selected' : ''}>Adicional</option>
                </select>
            </div>

            <div class="dm-form-row">
                <div class="dm-form-group">
                    <label class="dm-label">Esquema</label>
                    <input type="text" class="dm-input" name="esquema_pago" id="esquema-pago-multi" readonly>
                </div>
                <div class="dm-form-group">
                    <label class="dm-label">Monto base</label>
                    <input type="number" step="0.01" class="dm-input" name="monto_tarifa_apl" id="monto-base-multi" readonly>
                </div>
            </div>

            <div class="dm-form-row">
                <div class="dm-form-group">
                    <label class="dm-label">Factor</label>
                    <input type="number" step="0.01" class="dm-input" name="factor_participac" id="factor-multi" readonly>
                </div>
                <div class="dm-form-group">
                    <label class="dm-label">Pago estimado</label>
                    <input type="number" step="0.01" class="dm-input" name="pago_estimado" id="pago-estimado-multi" readonly>
                </div>
            </div>

            <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">${asignacion ? 'Guardar cambios' : 'Guardar asignación'}</button>
        </form>
    `;

    App.ui.openSheet(asignacion ? 'Editar asignación' : 'Nueva asignación de artesano', formHTML, async (data) => {
        return App.ui.runSafeAction({
            lockKey: asignacion ? `produccion:${ordenId}:asignacion:${asignacion.id}:editar` : `produccion:${ordenId}:asignacion:nueva`,
            loadingText: asignacion ? 'Guardando...' : 'Asignando...',
            loaderMessage: asignacion ? 'Guardando asignación...' : 'Guardando asignación de artesano...',
            successMessage: asignacion ? 'Asignación actualizada' : 'Asignación guardada',
            errorTitle: asignacion ? 'No se pudo actualizar la asignación' : 'No se pudo guardar la asignación',
            closeSheetOnSuccess: true
        }, async () => asignacion ? App.logic.editarAsignacionMultiArtesano(data) : App.logic.guardarAsignacionMultiArtesano(data));
    });

    if (asignacion?.artesano_id) {
        setTimeout(() => {
            window.cargarTarifasMulti(asignacion.artesano_id);
            const selectTarifas = document.getElementById('select-tarifas-multi');
            if (selectTarifas && asignacion.tarifa_artesano_id) selectTarifas.value = asignacion.tarifa_artesano_id;
            window.calcTotalTrabajoMulti();
        }, 150);
    }
};

window.cargarTarifasMulti = function (artesanoId) {
    const tarifas = (App.state?.tarifas_artesano || []).filter(t => t.artesano_id === artesanoId);
    const select = document.getElementById('select-tarifas-multi');
    if (!select) return;

    select.innerHTML = '<option value="">-- Seleccione Trabajo --</option>' + tarifas.map(t => `
        <option value="${t.id || ''}" data-monto="${t.monto || 0}" data-modo-calculo="${t.modo_calculo || 'fijo'}" data-aplica-a="${t.aplica_a || 'total'}" data-tarifa-nombre="${App.ui.escapeHTML(t.clasificacion || 'Tarea')}">
            ${App.ui.escapeHTML(t.clasificacion || 'Tarea')} ($${t.monto || 0})
        </option>
    `).join('');

    window.calcTotalTrabajoMulti();
};

window.calcTotalTrabajoMulti = function () {
    const sel = document.getElementById('select-tarifas-multi');
    const componenteSel = document.getElementById('componente-multi');
    const montoBase = document.getElementById('monto-base-multi');
    const esquema = document.getElementById('esquema-pago-multi');
    const factor = document.getElementById('factor-multi');
    const pago = document.getElementById('pago-estimado-multi');
    const ordenIdInput = document.querySelector('#dynamic-form input[name="orden_id"]');
    if (!sel || !montoBase || !esquema || !factor || !pago || !ordenIdInput) return;

    if (!sel.value) {
        montoBase.value = '';
        esquema.value = '';
        factor.value = '';
        pago.value = '';
        return;
    }

    const selectedOption = sel.options[sel.selectedIndex];
    const monto = parseFloat(selectedOption?.dataset?.monto || 0) || 0;
    const modoCalculo = selectedOption?.dataset?.modoCalculo || 'fijo';
    const aplicaAOriginal = selectedOption?.dataset?.aplicaA || 'total';
    const componenteManual = componenteSel?.value || 'total';
    const aplicaA = modoCalculo === 'por_unidad' ? (componenteManual || aplicaAOriginal) : aplicaAOriginal;

    const orden = (App.state?.ordenes_produccion || []).find(o => o.id === ordenIdInput.value);
    let receta = [];
    try { receta = JSON.parse(orden?.receta_personalizada || '[]'); } catch (e) { receta = []; }

    let baseCalculo = 1;
    if (modoCalculo === 'por_unidad') {
        if (aplicaA === 'total') {
            baseCalculo = receta.reduce((acc, item) => acc + (parseFloat(item.cant || 0) || 0), 0);
        } else {
            baseCalculo = receta.filter(item => String(item.uso || '').toLowerCase() === String(aplicaA).toLowerCase()).reduce((acc, item) => acc + (parseFloat(item.cant || 0) || 0), 0);
        }
    }

    montoBase.value = monto.toFixed(2);
    esquema.value = modoCalculo;
    factor.value = baseCalculo.toFixed(2);
    pago.value = (monto * baseCalculo).toFixed(2);
};

App.views.modalMateriaPrima = function (ordenId) {
    const ord = (App.state?.ordenes_produccion || []).find(o => o.id === ordenId);
    if (!ord) return;

    let receta = [];
    try { receta = JSON.parse(ord.receta_personalizada || '[]'); } catch (e) { receta = []; }

    let html = `
        <form id="dynamic-form">
            <input type="hidden" name="orden_id" value="${ordenId}">
            <div id="cont-receta-prod">
    `;

    if (receta.length > 0) receta.forEach(r => { html += window.generarFilaRecetaProd(r.mat_id, r.cant, r.uso); });
    else html += window.generarFilaRecetaProd('', '', 'Cuerpo');

    html += `
            </div>
            <button type="button" class="dm-btn dm-btn-ghost dm-btn-block dm-mb-4" onclick="window.agregarFilaRecetaProd()">+ Añadir hilo</button>
            <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">💾 Guardar y Descontar Inventario</button>
        </form>
    `;

    App.ui.openSheet('Hilos Utilizados', html, async (data) => {
        const matIds = Array.isArray(data['mat_id[]']) ? data['mat_id[]'] : [data['mat_id[]']];
        const cants = Array.isArray(data['cant[]']) ? data['cant[]'] : [data['cant[]']];
        const usos = Array.isArray(data['uso[]']) ? data['uso[]'] : [data['uso[]']];
        const recetaFinal = [];
        for (let i = 0; i < matIds.length; i++) if (matIds[i]) recetaFinal.push({ mat_id: matIds[i], cant: cants[i], uso: usos[i] });

        return App.ui.runSafeAction({
            lockKey: `produccion:${ordenId}:receta:guardar`,
            loadingText: 'Guardando...',
            loaderMessage: 'Guardando receta y descontando inventario...',
            successMessage: 'Hilos asignados correctamente',
            errorTitle: 'No se pudieron guardar los hilos',
            closeSheetOnSuccess: true
        }, async () => App.logic.guardarRecetaProduccion(ordenId, recetaFinal));
    });
};
