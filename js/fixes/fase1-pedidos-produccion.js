window.App = window.App || {};
App.logic = App.logic || {};
App.views = App.views || {};

// FASE 1 - Capa de compatibilidad para corregir el flujo Pedidos -> Producción.
// Se mantiene la lógica existente y se interceptan únicamente los puntos de entrada.
(() => {
    const STOCK_INTERNO = 'STOCK_INTERNO';

    const isInternal = pedido => String(pedido?.cliente_id || '').toUpperCase() === STOCK_INTERNO;
    const isReventa = producto => String(producto?.categoria || '').toLowerCase() === 'reventa';

    function getPedidoDetalles(pedidoId) {
        return (App.state?.pedido_detalle || []).filter(d => d.pedido_id === pedidoId);
    }

    function getOrdenesPedido(pedidoId) {
        const detalles = getPedidoDetalles(pedidoId);
        return (App.state?.ordenes_produccion || []).filter(o =>
            detalles.some(d => d.id === o.pedido_detalle_id)
        );
    }

    function recetaProducto(producto, cantidad) {
        const receta = [];
        const factor = parseFloat(cantidad || 1) || 1;

        for (let i = 1; i <= 20; i++) {
            const matId = producto?.[`mat_${i}`];
            const cantBase = parseFloat(producto?.[`cant_${i}`] || 0) || 0;
            if (!matId || cantBase <= 0) continue;

            receta.push({
                mat_id: matId,
                cant: cantBase * factor,
                uso: producto?.[`uso_${i}`] || 'Total'
            });
        }

        return receta;
    }

    async function asegurarOrdenProduccion(pedidoId, detalle) {
        const producto = (App.state?.productos || []).find(p => p.id === detalle.producto_id);
        if (!producto || isReventa(producto)) return null;

        const existente = (App.state?.ordenes_produccion || []).find(o => o.pedido_detalle_id === detalle.id);
        if (existente) return existente;

        const receta = recetaProducto(producto, detalle.cantidad);
        const ahora = new Date().toISOString();
        const ordenId = `OP-${Date.now()}-${String(detalle.id).replace(/[^a-zA-Z0-9_-]/g, '')}`;

        const orden = {
            id: ordenId,
            pedido_detalle_id: detalle.id,
            pedido_id: pedidoId,
            producto_id: producto.id,
            producto_nombre: producto.nombre || '',
            cantidad: parseInt(detalle.cantidad || 1, 10) || 1,
            estado: 'pendiente',
            receta_personalizada: JSON.stringify(receta),
            materiales_descontados: false,
            materiales_revertidos: false,
            fecha_creacion: ahora
        };

        const res = await App.api.fetch('ejecutar_lote', {
            operaciones: [{
                action: 'guardar_fila',
                nombreHoja: 'ordenes_produccion',
                datos: orden
            }]
        });

        if (res.status !== 'success') {
            throw new Error(res.message || `No se pudo crear la orden de producción para ${producto.nombre}`);
        }

        if (!Array.isArray(App.state.ordenes_produccion)) App.state.ordenes_produccion = [];
        App.state.ordenes_produccion.push(orden);
        return orden;
    }

    async function asegurarProduccionPedido(pedidoId) {
        const detalles = getPedidoDetalles(pedidoId);
        const ordenesCreadas = [];

        for (const detalle of detalles) {
            const producto = (App.state?.productos || []).find(p => p.id === detalle.producto_id);
            if (!producto || isReventa(producto)) continue;
            const orden = await asegurarOrdenProduccion(pedidoId, detalle);
            if (orden) ordenesCreadas.push(orden);
        }

        return ordenesCreadas;
    }

    // 1) Crear automáticamente las órdenes de fabricación después de crear el pedido.
    const guardarNuevoPedidoOriginal = App.logic.guardarNuevoPedido;
    if (typeof guardarNuevoPedidoOriginal === 'function') {
        App.logic.guardarNuevoPedido = async function(datosFormulario) {
            const datos = { ...(datosFormulario || {}) };
            const idsAntes = new Set((App.state?.pedidos || []).map(p => p.id));
            const interno = String(datos.cliente_id || '').toUpperCase() === STOCK_INTERNO;

            if (interno) {
                datos.total = 0;
                datos.anticipo = 0;
            }

            const resultado = await guardarNuevoPedidoOriginal.call(this, datos);
            const pedido = (App.state?.pedidos || []).find(p => !idsAntes.has(p.id));
            if (!pedido) return resultado;

            if (interno) {
                const detalles = getPedidoDetalles(pedido.id);
                const hayFabricacion = detalles.some(d => {
                    const p = (App.state?.productos || []).find(x => x.id === d.producto_id);
                    return p && !isReventa(p);
                });

                const estadoInterno = hayFabricacion ? 'nuevo' : 'listo para entregar';
                if (pedido.estado !== estadoInterno || parseFloat(pedido.total || 0) !== 0 || parseFloat(pedido.anticipo || 0) !== 0) {
                    const resEstado = await App.api.fetch('actualizar_fila', {
                        nombreHoja: 'pedidos',
                        idFila: pedido.id,
                        datosNuevos: { estado: estadoInterno, total: 0, anticipo: 0 }
                    });
                    if (resEstado.status !== 'success') {
                        throw new Error(resEstado.message || 'No se pudo normalizar el pedido interno');
                    }
                    Object.assign(pedido, { estado: estadoInterno, total: 0, anticipo: 0 });
                }
            }

            try {
                const ordenes = await asegurarProduccionPedido(pedido.id);
                if (ordenes.length > 0) {
                    App.ui.toast(`Pedido creado y enviado a taller (${ordenes.length} orden${ordenes.length === 1 ? '' : 'es'})`);
                    if (App.router?.handleRoute) App.router.handleRoute();
                }
            } catch (error) {
                console.error('Error creando orden de producción después de crear pedido:', error);
                App.ui.toast(error.message || 'El pedido se creó, pero no se pudo generar la orden de Taller. Puedes reintentar desde el pedido.', 'warning');
            }

            return resultado;
        };
    }

    // 2) Un pedido de fabricación no puede saltarse Taller mediante "Listo".
    const marcarPedidoListoOriginal = App.logic.marcarPedidoListo;
    if (typeof marcarPedidoListoOriginal === 'function') {
        App.logic.marcarPedidoListo = async function(pedidoId) {
            const pedido = (App.state?.pedidos || []).find(p => p.id === pedidoId);
            if (!pedido) {
                App.ui.toast('Pedido no encontrado', 'danger');
                return;
            }

            const detalles = getPedidoDetalles(pedidoId);
            const productosFabricacion = detalles
                .map(d => (App.state?.productos || []).find(p => p.id === d.producto_id))
                .filter(Boolean)
                .filter(p => !isReventa(p));

            if (productosFabricacion.length > 0) {
                const ordenes = getOrdenesPedido(pedidoId);
                const faltantes = detalles.filter(d => {
                    const producto = (App.state?.productos || []).find(p => p.id === d.producto_id);
                    return producto && !isReventa(producto) && !ordenes.some(o => o.pedido_detalle_id === d.id);
                });

                if (faltantes.length > 0) {
                    try {
                        await asegurarProduccionPedido(pedidoId);
                    } catch (error) {
                        App.ui.toast(error.message || 'No se pudo crear la orden de producción', 'danger');
                        return;
                    }
                }

                const ordenesActualizadas = getOrdenesPedido(pedidoId);
                const noTerminadas = ordenesActualizadas.filter(o => String(o.estado || '').toLowerCase() !== 'listo');
                if (noTerminadas.length > 0) {
                    App.ui.toast('Este pedido debe terminarse en Taller antes de marcarlo como listo.', 'warning');
                    return;
                }
            }

            return marcarPedidoListoOriginal.call(this, pedidoId);
        };
    }

    // 3) Eliminar siempre usa la rutina especializada que limpia las relaciones del pedido.
    const accionPedidoOriginal = App.views.accionPedido;
    if (typeof accionPedidoOriginal === 'function') {
        App.views.accionPedido = function(button, pedidoId, actionName) {
            if (actionName !== 'eliminarPedido') {
                return accionPedidoOriginal.apply(this, arguments);
            }

            return App.views.runPedidoAction(button, pedidoId, actionName, () => {
                return App.logic.eliminarPedido(pedidoId);
            }, {
                loadingText: 'Eliminando...',
                loaderMessage: 'Eliminando pedido y sus registros relacionados...',
                successMessage: 'Pedido eliminado',
                errorTitle: 'No se pudo eliminar el pedido'
            });
        };
    }

    // 4) Stock interno nunca acepta abonos/cobros.
    const modalAbonosOriginal = App.views.modalAbonos;
    if (typeof modalAbonosOriginal === 'function') {
        App.views.modalAbonos = function(pedidoId) {
            const pedido = (App.state?.pedidos || []).find(p => p.id === pedidoId);
            if (pedido && isInternal(pedido)) {
                App.ui.openSheet('Stock interno', `
                    <div class="dm-alert dm-alert-info">
                        Este pedido es para inventario interno. No genera anticipo, saldo ni cuentas por cobrar.
                    </div>
                    <button class="dm-btn dm-btn-primary dm-btn-block dm-mt-3" onclick="App.ui.closeSheet()">Cerrar</button>
                `);
                return;
            }
            return modalAbonosOriginal.apply(this, arguments);
        };
    }
})();

const STOCK_INTERNO = 'STOCK_INTERNO';

// 5) Formulario de pedido: stock interno no muestra campos de venta/cobro.
const formPedidoOriginal = App.views._formPedidoInterno;
if (typeof formPedidoOriginal === 'function') {
    App.views._formPedidoInterno = function(obj = null, prefill = null) {
        const dataBase = Object.assign({ cantidad: 1, anticipo: 0 }, prefill || {}, obj || {});
        const internal = String(dataBase.cliente_id || '').toUpperCase() === STOCK_INTERNO;

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
                    <label class="dm-label">Cliente / destino</label>
                    <select class="dm-select" name="cliente_id" id="pedido-cliente-select" onchange="window.actualizarModoPedidoFase1()">${htmlClientes}</select>
                    <div id="pedido-modo-info" class="dm-alert dm-alert-info dm-mt-2" style="${internal ? '' : 'display:none;'}">
                        📦 <strong>Stock interno:</strong> este pedido no genera cobro ni cuenta por cobrar. Si es de fabricación, se enviará a Taller.
                    </div>
                </div>

                <div class="dm-form-group">
                    <label class="dm-label">Producto</label>
                    <div style="display:flex; gap:8px; align-items:flex-start;">
                        <select class="dm-select" name="producto_id" required onchange="window.calcularTotalPedido()" style="flex:1;">${htmlProductos}</select>
                        <button type="button" class="dm-btn dm-btn-secondary dm-btn-sm" onclick="window.crearProductoDesdePedidoFase1()">+ Producto</button>
                    </div>
                    <div id="info-extra-prod" class="dm-mt-2"></div>
                </div>

                <div class="dm-form-row">
                    <div class="dm-form-group">
                        <label class="dm-label">Cantidad</label>
                        <input type="number" min="1" class="dm-input" name="cantidad" value="${dataBase.cantidad || 1}" required oninput="window.calcularTotalPedido()">
                    </div>
                    <div class="dm-form-group">
                        <label class="dm-label">Fecha de entrega</label>
                        <input type="date" class="dm-input" name="fecha_entrega" value="${dataBase.fecha_entrega || ''}" required>
                    </div>
                </div>

                <div id="pedido-venta-fields" class="dm-form-row" style="${internal ? 'display:none;' : ''}">
                    <div class="dm-form-group">
                        <label class="dm-label">Total ($)</label>
                        <input type="number" step="0.01" min="0" class="dm-input" name="total" value="${internal ? 0 : (dataBase.total || '')}" ${internal ? '' : 'required'}>
                    </div>
                    <div class="dm-form-group">
                        <label class="dm-label">Anticipo ($)</label>
                        <input type="number" step="0.01" min="0" class="dm-input" name="anticipo" value="${internal ? 0 : (dataBase.anticipo || '0')}" ${internal ? '' : 'required'}>
                    </div>
                </div>

                <input type="hidden" name="total_interno" value="${internal ? 0 : ''}">
                <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">${obj ? 'Guardar Cambios' : 'Crear Pedido'}</button>
            </form>
        `;

        App.ui.openSheet(obj ? 'Editar Pedido' : 'Nuevo Pedido', formHTML, async (data) => {
            const esInterno = String(data.cliente_id || '').toUpperCase() === STOCK_INTERNO;
            if (esInterno) {
                data.total = 0;
                data.anticipo = 0;
            }

            const action = obj
                ? async () => {
                    if (esInterno) {
                        data.total = 0;
                        data.anticipo = 0;
                    }
                    await App.logic.actualizarRegistroGenerico('pedidos', obj.id, data, 'pedidos');
                    const pedidoActual = (App.state?.pedidos || []).find(p => p.id === obj.id);
                    if (pedidoActual) {
                        const detalles = getPedidoDetalles(obj.id);
                        const hayFabricacion = detalles.some(d => {
                            const p = (App.state?.productos || []).find(x => x.id === d.producto_id);
                            return p && !isReventa(p);
                        });
                        if (esInterno && (pedidoActual.total != 0 || pedidoActual.anticipo != 0 || pedidoActual.estado === 'pagado')) {
                            const resEstado = await App.api.fetch('actualizar_fila', {
                                nombreHoja: 'pedidos',
                                idFila: obj.id,
                                datosNuevos: { total: 0, anticipo: 0, estado: hayFabricacion ? 'nuevo' : 'listo para entregar' }
                            });
                            if (resEstado.status === 'success') {
                                Object.assign(pedidoActual, { total: 0, anticipo: 0, estado: hayFabricacion ? 'nuevo' : 'listo para entregar' });
                            }
                        }
                        if (hayFabricacion) {
                            try { await asegurarProduccionPedido(obj.id); }
                            catch (error) { App.ui.toast(error.message || 'No se pudo sincronizar la orden de Taller', 'warning'); }
                        }
                    }
                }
                : () => App.logic.guardarNuevoPedido(data);

            return App.ui.runSafeAction({
                lockKey: obj ? `pedido:${obj.id}:editar` : 'pedido:nuevo',
                loadingText: obj ? 'Guardando...' : 'Creando...',
                loaderMessage: obj ? 'Guardando pedido...' : 'Creando pedido...',
                successMessage: obj ? 'Pedido actualizado' : 'Pedido creado',
                errorTitle: obj ? 'No se pudo actualizar el pedido' : 'No se pudo crear el pedido',
                closeSheetOnSuccess: true
            }, async () => action());
        });

        setTimeout(() => {
            if (typeof window.actualizarModoPedidoFase1 === 'function') window.actualizarModoPedidoFase1();
            if (!internal && typeof window.calcularTotalPedido === 'function') window.calcularTotalPedido();
        }, 150);
    };
}

window.crearProductoDesdePedidoFase1 = function() {
    App.views.formProducto(null, () => {
        const select = document.querySelector('#dynamic-form select[name="producto_id"]');
        const ultimo = (App.state?.productos || []).slice().sort((a, b) => String(b.id).localeCompare(String(a.id)))[0];
        if (!select || !ultimo) return;

        if (![...select.options].some(o => o.value === ultimo.id)) {
            select.insertAdjacentHTML('beforeend', `<option value="${ultimo.id}">${App.ui.safe(ultimo.nombre)}</option>`);
        }
        select.value = ultimo.id;
        if (typeof window.calcularTotalPedido === 'function') window.calcularTotalPedido();
    });
};

window.actualizarModoPedidoFase1 = function() {
    const select = document.querySelector('#dynamic-form select[name="cliente_id"]');
    const ventaFields = document.getElementById('pedido-venta-fields');
    const info = document.getElementById('pedido-modo-info');
    const total = document.querySelector('#dynamic-form input[name="total"]');
    const anticipo = document.querySelector('#dynamic-form input[name="anticipo"]');
    if (!select) return;

    const interno = String(select.value || '').toUpperCase() === STOCK_INTERNO;
    if (ventaFields) ventaFields.style.display = interno ? 'none' : '';
    if (info) info.style.display = interno ? '' : 'none';

    if (interno) {
        if (total) total.value = '0';
        if (anticipo) anticipo.value = '0';
    } else if (total && !total.value) {
        if (typeof window.calcularTotalPedido === 'function') window.calcularTotalPedido();
    }
};

// 6) Ocultar acciones de cobro para stock interno en los listados de pedidos.
const pedidosVistaFase1 = App.views.pedidos;
if (typeof pedidosVistaFase1 === 'function') {
    App.views.pedidos = function() {
        let html = pedidosVistaFase1.apply(this, arguments);
        (App.state?.pedidos || []).filter(p => String(p?.cliente_id || '').toUpperCase() === STOCK_INTERNO).forEach(p => {
            const id = String(p.id || '');
            const botonCobrar = `<button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.modalAbonos('${id}')">💰 Cobrar</button>`;
            const botonAbonos = `<button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.modalAbonos('${id}')">💳 Abonos</button>`;
            html = html.split(botonCobrar).join('');
            html = html.split(botonAbonos).join('');
        });
        return html;
    };
}

const generarListaPedidosFase1 = window.generarListaPedidos;
if (typeof generarListaPedidosFase1 === 'function') {
    window.generarListaPedidos = function(tipo) {
        let html = generarListaPedidosFase1.apply(this, arguments);
        (App.state?.pedidos || []).filter(p => String(p?.cliente_id || '').toUpperCase() === STOCK_INTERNO).forEach(p => {
            const id = String(p.id || '');
            const botonAbonos = `<button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.modalAbonos('${id}')">💳 Abonos</button>`;
            html = html.split(botonAbonos).join('');
        });
        return html;
    };
}
