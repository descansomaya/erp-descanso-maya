// ==========================================================
// DESCANSO MAYA - CORRECCIONES ESTABLES DE PEDIDOS
// Sin MutationObserver sobre app-content ni sheet-content.
// ==========================================================
window.App = window.App || {};
App.logic = App.logic || {};
App.views = App.views || {};

(function () {
    if (window.__dmPedidosFixEstable) return;
    window.__dmPedidosFixEstable = true;

    const norm = v => String(v || '').toLowerCase().trim();
    const getPedido = id => (App.state?.pedidos || []).find(p => p.id === id) || null;
    const getDetalles = id => (App.state?.pedido_detalle || []).filter(d => d.pedido_id === id);
    const inactivos = p => ['cancelado', 'devuelto'].includes(norm(p?.estado));
    const ventaValida = p => !!p && String(p.cliente_id || '').toUpperCase() !== 'STOCK_INTERNO' && !inactivos(p);

    window.DM = window.DM || {};
    DM.esVentaValida = ventaValida;
    DM.ventasValidas = lista => (lista || []).filter(ventaValida);
    DM.totalVentasValidas = (lista, inicio, fin) => DM.ventasValidas(lista).filter(p => {
        const f = new Date(p.fecha_creacion || p.fecha || p.created_at || '');
        if (Number.isNaN(f.getTime())) return true;
        if (inicio && f < inicio) return false;
        if (fin && f >= fin) return false;
        return true;
    }).reduce((s, p) => s + (parseFloat(p.total || 0) || 0), 0);

    // Eliminar observers de parches anteriores que podían reaccionar a sus propios cambios.
    function desconectarObservers() {
        ['app-content', 'sheet-content'].forEach(id => {
            const root = document.getElementById(id);
            if (!root) return;
            [
                '__dmPedidosFinalObs',
                '__dmCancelacionesObserver',
                '__dmFix2Observer',
                '__dmFix2DashObserver',
                '__dmFix2SheetObserver'
            ].forEach(prop => {
                try { root[prop]?.disconnect?.(); } catch (e) {}
                try { delete root[prop]; } catch (e) {}
            });
            ['__dmPedidosFinalTimer', '__dmCancelacionesTimer', '__dmFix2Timer', '__dmFix2DashTimer'].forEach(prop => {
                try { clearTimeout(root[prop]); } catch (e) {}
                try { delete root[prop]; } catch (e) {}
            });
            root.querySelectorAll('[data-dm-estado-pedido]').forEach(el => el.remove());
        });
    }

    // La vista original ya pinta un estado. Solo se corrige el filtro activos/histórico.
    // No se agregan badges adicionales.
    const pedidosOriginal = App.views.pedidos;
    if (typeof pedidosOriginal === 'function') {
        App.views.pedidos = function () {
            const todos = App.state?.pedidos || [];
            const activos = todos.filter(p => !inactivos(p));
            const historico = !!App.state?.mostrarHistoricoPedidos;
            const anterior = App.state.pedidos;
            let html;

            App.state.pedidos = historico ? todos : activos;
            try {
                html = pedidosOriginal.apply(this, arguments);
            } finally {
                App.state.pedidos = anterior;
            }

            // Colores correctos para cancelado/devuelto, sin insertar elementos nuevos.
            html = String(html || '')
                .replace(/style="background:var\(--dm-muted\); color:white;">cancelado/g, 'style="background:#dc2626; color:white;">cancelado')
                .replace(/style="background:var\(--dm-muted\); color:white;">devuelto/g, 'style="background:#f59e0b; color:white;">devuelto');

            return html;
        };
    }

    // Cancelar un pedido LISTO PARA ENTREGAR sin dinero recibido.
    // Se ejecuta directamente desde el botón, sin observar el modal.
    const cancelarBase = App.logic.cancelarPedido;
    if (typeof cancelarBase === 'function' && !cancelarBase.__dmEstable) {
        const cancelar = async function (pedidoId) {
            const pedido = getPedido(pedidoId);
            const estado = norm(pedido?.estado);
            if (estado !== 'listo para entregar') return cancelarBase.apply(this, arguments);

            const abonos = (App.state?.abonos || []).filter(a => a.pedido_id === pedidoId);
            const recibido = (parseFloat(pedido.anticipo || 0) || 0) + abonos.reduce((s, a) => s + (parseFloat(a.monto || 0) || 0), 0);
            if (recibido > 0.005) {
                App.ui.toast('No se puede cancelar automáticamente un pedido con dinero recibido. Primero debe gestionarse la devolución del importe.', 'warning');
                return false;
            }
            if (!confirm('¿Cancelar este pedido?\n\nEl pedido quedará CANCELADO y se conservará en el histórico.')) return false;

            const detalles = getDetalles(pedidoId);
            const operaciones = [{
                action: 'actualizar_fila', nombreHoja: 'pedidos', idFila: pedidoId,
                datosNuevos: { estado: 'cancelado' }
            }];
            const cambios = [];
            const movimientos = [];
            let idx = 0;

            for (const detalle of detalles) {
                const producto = (App.state?.productos || []).find(p => p.id === detalle.producto_id);
                if (!producto) continue;
                const factor = parseFloat(detalle.cantidad || 1) || 1;
                for (let i = 1; i <= 20; i++) {
                    const matId = producto[`mat_${i}`];
                    const cantidad = (parseFloat(producto[`cant_${i}`] || 0) || 0) * factor;
                    if (!matId || cantidad <= 0) continue;
                    const material = (App.state?.inventario || []).find(m => m.id === matId);
                    if (!material) continue;
                    const reservado = parseFloat(material.stock_reservado || 0) || 0;
                    const liberar = Math.min(reservado, cantidad);
                    if (liberar <= 0) continue;
                    const nuevo = Math.max(0, reservado - liberar);
                    operaciones.push({
                        action: 'actualizar_fila', nombreHoja: 'materiales', idFila: material.id,
                        datosNuevos: { stock_reservado: nuevo }
                    });
                    cambios.push({ material, nuevo });
                    const mov = {
                        id: `MOV-${Date.now()}-${idx++}`,
                        fecha: new Date().toISOString(),
                        tipo_movimiento: 'reversa_reserva_venta',
                        origen: 'pedido', origen_id: pedidoId,
                        ref_tipo: 'material', ref_id: material.id, material_id: material.id,
                        tipo: 'entrada', cantidad: liberar,
                        costo_unitario: parseFloat(material.costo_unitario || 0) || 0,
                        total: liberar * (parseFloat(material.costo_unitario || 0) || 0),
                        motivo: 'Liberación de apartado por cancelación',
                        notas: 'Reserva liberada sin salida física'
                    };
                    movimientos.push(mov);
                    operaciones.push({ action: 'guardar_fila', nombreHoja: 'movimientos_inventario', datos: mov });
                }
            }

            App.ui.showLoader('Cancelando pedido...');
            try {
                const res = await App.api.fetch('ejecutar_lote', { operaciones });
                if (res.status !== 'success') throw new Error(res.message || 'No se pudo cancelar el pedido');
                pedido.estado = 'cancelado';
                cambios.forEach(c => { c.material.stock_reservado = c.nuevo; });
                if (!Array.isArray(App.state.movimientos_inventario)) App.state.movimientos_inventario = [];
                App.state.movimientos_inventario.push(...movimientos);
                App.ui.toast('Pedido cancelado y reservas liberadas correctamente.');
                App.router?.handleRoute?.();
                App.logic.revisarAlertasStock?.();
                return true;
            } catch (error) {
                console.error('[DM Estable] cancelar pedido:', error);
                App.ui.toast(error.message || 'No se pudo cancelar el pedido', 'danger');
                return false;
            } finally {
                App.ui.hideLoader();
            }
        };
        cancelar.__dmEstable = true;
        App.logic.cancelarPedido = cancelar;
    }

    // Evitar eliminar cancelados/devueltos.
    const eliminarBase = App.logic.eliminarPedido;
    if (typeof eliminarBase === 'function' && !eliminarBase.__dmEstableEliminar) {
        const eliminar = async function (pedidoId) {
            if (inactivos(getPedido(pedidoId))) {
                App.ui.toast('Los pedidos cancelados o devueltos se conservan en el histórico y no se eliminan.', 'warning');
                return false;
            }
            return eliminarBase.apply(this, arguments);
        };
        eliminar.__dmEstableEliminar = true;
        App.logic.eliminarPedido = eliminar;
    }

    // Guardar el estado anterior al entregar, sin observar el DOM.
    const entregarBase = App.logic.marcarPedidoEntregado;
    if (typeof entregarBase === 'function' && !entregarBase.__dmEstableEntrega) {
        const entregar = async function (pedidoId) {
            const pedido = getPedido(pedidoId);
            const estadoAnterior = norm(pedido?.estado) || 'listo para entregar';
            const ok = await entregarBase.apply(this, arguments);
            if (ok === true && pedido) {
                pedido.estado_anterior_entrega = estadoAnterior;
                try {
                    await App.api.fetch('ejecutar_lote', {
                        operaciones: [{
                            action: 'actualizar_fila', nombreHoja: 'pedidos', idFila: pedidoId,
                            datosNuevos: { estado_anterior_entrega: estadoAnterior }
                        }]
                    });
                } catch (e) {
                    console.warn('[DM Estable] No se pudo guardar estado anterior:', e);
                }
            }
            return ok;
        };
        entregar.__dmEstableEntrega = true;
        App.logic.marcarPedidoEntregado = entregar;
    }

    function boot() {
        desconectarObservers();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})();
