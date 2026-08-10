// FASE 1 runtime: Pedidos -> Producción
// Se ejecuta después de main.js para envolver funciones ya registradas.
(() => {
    if (window.__fase1PedidosRuntime) return;
    window.__fase1PedidosRuntime = true;

    const STOCK = 'STOCK_INTERNO';
    const interno = p => String(p?.cliente_id || '').toUpperCase() === STOCK;
    const reventa = p => String(p?.categoria || '').toLowerCase() === 'reventa';
    const detalles = id => (App.state?.pedido_detalle || []).filter(d => d.pedido_id === id);
    const producto = d => (App.state?.productos || []).find(p => p.id === d.producto_id);
    const fabrica = id => detalles(id).some(d => { const p = producto(d); return p && !reventa(p); });

    // Crear orden de producción si todavía no existe.
    const asegurarOrden = async (pedidoId, d) => {
        const p = producto(d);
        if (!p || reventa(p)) return null;
        const existe = (App.state?.ordenes_produccion || []).find(o => o.pedido_detalle_id === d.id);
        if (existe) return existe;

        const receta = [];
        const factor = parseFloat(d.cantidad || 1) || 1;
        for (let i = 1; i <= 20; i++) {
            const mat = p[`mat_${i}`];
            const cant = parseFloat(p[`cant_${i}`] || 0) || 0;
            if (mat && cant > 0) receta.push({ mat_id: mat, cant: cant * factor, uso: p[`uso_${i}`] || 'Total' });
        }

        const orden = {
            id: `OP-${Date.now()}-${String(d.id).replace(/[^a-zA-Z0-9_-]/g, '')}`,
            pedido_detalle_id: d.id,
            pedido_id: pedidoId,
            producto_id: p.id,
            producto_nombre: p.nombre || '',
            cantidad: parseInt(d.cantidad || 1, 10) || 1,
            estado: 'pendiente',
            receta_personalizada: JSON.stringify(receta),
            materiales_descontados: false,
            materiales_revertidos: false,
            fecha_creacion: new Date().toISOString()
        };

        const res = await App.api.fetch('ejecutar_lote', { operaciones: [{ action: 'guardar_fila', nombreHoja: 'ordenes_produccion', datos: orden }] });
        if (res.status !== 'success') throw new Error(res.message || `No se pudo crear Taller para ${p.nombre}`);
        if (!Array.isArray(App.state.ordenes_produccion)) App.state.ordenes_produccion = [];
        App.state.ordenes_produccion.push(orden);
        return orden;
    };

    const asegurarProduccion = async id => {
        const out = [];
        for (const d of detalles(id)) {
            const o = await asegurarOrden(id, d);
            if (o) out.push(o);
        }
        return out;
    };
    window.asegurarProduccionPedido = asegurarProduccion;

    // 1) Stock interno: cero cobro y cero reserva de venta.
    const guardarOriginal = App.logic.guardarNuevoPedido;
    App.logic.guardarNuevoPedido = async function(data) {
        if (!interno(data)) return guardarOriginal.apply(this, arguments);

        const payload = { ...(data || {}), total: 0, anticipo: 0 };
        const antes = new Set((App.state?.pedidos || []).map(p => p.id));
        const apiOriginal = App.api.fetch;

        App.api.fetch = async function(endpoint, body) {
            if (endpoint === 'ejecutar_lote' && Array.isArray(body?.operaciones)) {
                const ops = body.operaciones.filter(op => {
                    if (op.nombreHoja === 'movimientos_inventario' && String(op.datos?.tipo_movimiento || '') === 'reserva_venta') return false;
                    if (op.nombreHoja === 'materiales' && Object.prototype.hasOwnProperty.call(op.datosNuevos || {}, 'stock_reservado')) return false;
                    return true;
                });
                return apiOriginal.call(this, endpoint, { ...body, operaciones: ops });
            }
            return apiOriginal.apply(this, arguments);
        };

        try { await guardarOriginal.call(this, payload); }
        finally { App.api.fetch = apiOriginal; }

        const pedido = (App.state?.pedidos || []).find(p => !antes.has(p.id));
        if (!pedido) return;

        pedido.total = 0;
        pedido.anticipo = 0;
        App.state.movimientos_inventario = (App.state.movimientos_inventario || []).filter(m => !(m.origen_id === pedido.id && String(m.tipo_movimiento || '') === 'reserva_venta'));

        if (fabrica(pedido.id)) {
            try {
                const ordenes = await asegurarProduccion(pedido.id);
                pedido.estado = 'nuevo';
                await App.api.fetch('actualizar_fila', { nombreHoja: 'pedidos', idFila: pedido.id, datosNuevos: { estado: 'nuevo', total: 0, anticipo: 0 } });
                App.ui.toast(`Pedido interno enviado a Taller (${ordenes.length} orden${ordenes.length === 1 ? '' : 'es'})`);
            } catch (e) {
                console.error('[Fase1] Taller:', e);
                App.ui.toast('El pedido se creó sin cobro, pero no se pudo generar Taller.', 'warning');
            }
        } else {
            pedido.estado = 'listo para entregar';
            await App.api.fetch('actualizar_fila', { nombreHoja: 'pedidos', idFila: pedido.id, datosNuevos: { estado: 'listo para entregar', total: 0, anticipo: 0 } });
        }
        if (App.router?.handleRoute) App.router.handleRoute();
    };

    // 2) Impedir saltar Taller con el botón Listo.
    const listoOriginal = App.logic.marcarPedidoListo;
    App.logic.marcarPedidoListo = async function(id) {
        if (!fabrica(id)) return listoOriginal.apply(this, arguments);
        let ordenes = (App.state?.ordenes_produccion || []).filter(o => detalles(id).some(d => d.id === o.pedido_detalle_id));
        if (!ordenes.length) ordenes = await asegurarProduccion(id);
        if (ordenes.some(o => String(o.estado || '').toLowerCase() !== 'listo')) {
            App.ui.toast('Este pedido debe terminarse en Taller antes de marcarlo como listo.', 'warning');
            return;
        }
        return listoOriginal.apply(this, arguments);
    };

    // 3) Eliminar con limpieza especializada.
    const accionOriginal = App.views.accionPedido;
    App.views.accionPedido = function(button, id, action) {
        if (action !== 'eliminarPedido') return accionOriginal.apply(this, arguments);
        return App.views.runPedidoAction(button, id, action, () => App.logic.eliminarPedido(id), {
            loadingText: 'Eliminando...', loaderMessage: 'Eliminando pedido y relaciones...', successMessage: 'Pedido eliminado', errorTitle: 'No se pudo eliminar el pedido'
        });
    };

    // 4) Bloquear cobros de stock interno.
    const abonosOriginal = App.views.modalAbonos;
    App.views.modalAbonos = function(id) {
        const p = (App.state?.pedidos || []).find(x => x.id === id);
        if (p && interno(p)) {
            App.ui.openSheet('Stock interno', '<div class="dm-alert dm-alert-info">Este pedido no genera cobro, anticipo ni cuenta por cobrar.</div><button class="dm-btn dm-btn-primary dm-btn-block dm-mt-3" onclick="App.ui.closeSheet()">Cerrar</button>');
            return;
        }
        return abonosOriginal.apply(this, arguments);
    };

    // 5) Formulario seguro: el modo interno oculta los importes de venta.
    App.views._formPedidoInterno = function(obj = null, prefill = null) {
        const base = Object.assign({ cantidad: 1, anticipo: 0 }, prefill || {}, obj || {});
        const esInt = String(base.cliente_id || '').toUpperCase() === STOCK;
        let clientes = '<option value="STOCK_INTERNO">STOCK BODEGA</option>';
        (App.state.clientes || []).forEach(c => { clientes += `<option value="${c.id}" ${base.cliente_id === c.id ? 'selected' : ''}>${App.ui.safe(c.nombre)}</option>`; });
        let productos = '<option value="">-- Producto --</option>';
        (App.state.productos || []).forEach(p => { productos += `<option value="${p.id}" ${base.producto_id === p.id ? 'selected' : ''}>${App.ui.safe(p.nombre)}</option>`; });

        const html = `<form id="dynamic-form">
            <div class="dm-form-group"><label class="dm-label">Cliente / destino</label><select class="dm-select" name="cliente_id" onchange="window.actualizarModoPedidoFase1()">${clientes}</select><div id="pedido-modo-info" class="dm-alert dm-alert-info dm-mt-2" style="${esInt ? '' : 'display:none;'}">📦 <strong>Stock interno:</strong> no genera cobro. Los productos de fabricación pasan a Taller.</div></div>
            <div class="dm-form-group"><label class="dm-label">Producto</label><select class="dm-select" name="producto_id" required onchange="window.calcularTotalPedido()">${productos}</select></div>
            <div class="dm-form-row"><div class="dm-form-group"><label class="dm-label">Cantidad</label><input type="number" min="1" class="dm-input" name="cantidad" value="${base.cantidad || 1}" required></div><div class="dm-form-group"><label class="dm-label">Fecha de entrega</label><input type="date" class="dm-input" name="fecha_entrega" value="${base.fecha_entrega || ''}" required></div></div>
            <div id="pedido-venta-fields" class="dm-form-row" style="${esInt ? 'display:none;' : ''}"><div class="dm-form-group"><label class="dm-label">Total ($)</label><input type="number" step="0.01" min="0" class="dm-input" name="total" value="${esInt ? 0 : (base.total || '')}" ${esInt ? '' : 'required'}></div><div class="dm-form-group"><label class="dm-label">Anticipo ($)</label><input type="number" step="0.01" min="0" class="dm-input" name="anticipo" value="${esInt ? 0 : (base.anticipo || 0)}" ${esInt ? '' : 'required'}></div></div>
            <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">${obj ? 'Guardar Cambios' : 'Crear Pedido'}</button></form>`;

        App.ui.openSheet(obj ? 'Editar Pedido' : 'Nuevo Pedido', html, async data => {
            const internal = String(data.cliente_id || '').toUpperCase() === STOCK;
            if (internal) { data.total = 0; data.anticipo = 0; }
            const action = obj ? () => App.logic.actualizarRegistroGenerico('pedidos', obj.id, data, 'pedidos') : () => App.logic.guardarNuevoPedido(data);
            return App.ui.runSafeAction({ lockKey: obj ? `pedido:${obj.id}:editar` : 'pedido:nuevo', loadingText: obj ? 'Guardando...' : 'Creando...', loaderMessage: obj ? 'Guardando pedido...' : 'Creando pedido...', successMessage: obj ? 'Pedido actualizado' : 'Pedido creado', errorTitle: 'No se pudo guardar el pedido', closeSheetOnSuccess: true }, action);
        });
    };

    App.views.formPedido = function(id = null) {
        const obj = id ? (App.state.pedidos || []).find(p => p.id === id) : null;
        return App.views._formPedidoInterno(obj, null);
    };

    window.actualizarModoPedidoFase1 = function() {
        const s = document.querySelector('#dynamic-form select[name="cliente_id"]');
        if (!s) return;
        const internal = String(s.value || '').toUpperCase() === STOCK;
        const fields = document.getElementById('pedido-venta-fields');
        const info = document.getElementById('pedido-modo-info');
        const total = document.querySelector('#dynamic-form input[name="total"]');
        const anticipo = document.querySelector('#dynamic-form input[name="anticipo"]');
        if (fields) fields.style.display = internal ? 'none' : '';
        if (info) info.style.display = internal ? '' : 'none';
        if (internal) { if (total) total.value = 0; if (anticipo) anticipo.value = 0; }
    };

    console.info('[Fase1] Runtime de Pedidos -> Producción activo.');
})();