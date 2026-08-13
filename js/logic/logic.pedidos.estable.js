// ==========================================================
// DESCANSO MAYA - ESTABILIZADOR DE PEDIDOS
// Sin MutationObserver sobre las vistas/modales.
// ==========================================================
window.App = window.App || {};
App.logic = App.logic || {};
App.views = App.views || {};

(function instalarEstabilizadorPedidos() {
    if (window.__dmPedidosEstable) return;
    window.__dmPedidosEstable = true;

    const norm = v => String(v || '').toLowerCase().trim();
    const inactivo = p => ['cancelado', 'devuelto'].includes(norm(p?.estado));

    // Desconectar observers antiguos que podían reaccionar a sus propios cambios.
    function desconectarObserversPedidos() {
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

    // La vista original ya dibuja un solo badge. Solo corregimos el filtro
    // de activos/histórico y los colores de cancelado/devuelto.
    const pedidosOriginal = App.views.pedidos;
    if (typeof pedidosOriginal === 'function') {
        App.views.pedidos = function () {
            const todos = App.state?.pedidos || [];
            const activos = todos.filter(p => !inactivo(p));
            const historico = !!App.state?.mostrarHistoricoPedidos;
            const anterior = App.state.pedidos;
            let html;

            App.state.pedidos = historico ? todos : activos;
            try {
                html = pedidosOriginal.apply(this, arguments);
            } finally {
                App.state.pedidos = anterior;
            }

            html = String(html || '')
                .replace(/style="background:var\(--dm-muted\); color:white;">cancelado/g, 'style="background:#dc2626; color:white;">cancelado')
                .replace(/style="background:var\(--dm-muted\); color:white;">devuelto/g, 'style="background:#f59e0b; color:white;">devuelto');

            return html;
        };
    }

    // Mantener la regla de ventas reutilizable sin observar el DOM.
    window.DM = window.DM || {};
    DM.esVentaValida = p => !!p && String(p.cliente_id || '').toUpperCase() !== 'STOCK_INTERNO' && !inactivo(p);
    DM.ventasValidas = lista => (lista || []).filter(DM.esVentaValida);

    // Permitir cancelar un pedido LISTO PARA ENTREGAR cuando no se ha recibido dinero.
    // Se ejecuta de forma directa; no necesita observar el modal.
    const cancelarBase = App.logic.cancelarPedido;
    if (typeof cancelarBase === 'function' && !cancelarBase.__dmEstable) {
        const cancelar = async function (pedidoId) {
            const pedido = (App.state?.pedidos || []).find(p => p.id === pedidoId);
            const estado = norm(pedido?.estado);
            if (estado !== 'listo para entregar') return cancelarBase.apply(this, arguments);

            const abonos = (App.state?.abonos || []).filter(a => a.pedido_id === pedidoId);
            const recibido = (parseFloat(pedido.anticipo || 0) || 0) + abonos.reduce((s, a) => s + (parseFloat(a.monto || 0) || 0), 0);
            if (recibido > 0.005) {
                App.ui.toast('No se puede cancelar automáticamente un pedido con dinero recibido. Primero debe gestionarse la devolución del importe.', 'warning');
                return false;
            }
            if (!confirm('¿Cancelar este pedido?\n\nEl pedido quedará CANCELADO y se conservará en el histórico.')) return false;

            const detalles = (App.state?.pedido_detalle || []).filter(d => d.pedido_id === pedidoId);
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

    function boot() {
        desconectarObserversPedidos();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})();
