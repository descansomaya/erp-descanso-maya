// ==========================================================
// DESCANSO MAYA - CORRECCIONES ESTABLES DE PEDIDOS
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
    const getOrdenes = id => {
        const detalles = getDetalles(id);
        return (App.state?.ordenes_produccion || []).filter(o => detalles.some(d => d.id === o.pedido_detalle_id));
    };
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

    // Limpia observers/parches históricos que podían agregar botones duplicados.
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

    // La vista original ya pinta los pedidos; solo mantenemos activos/histórico y colores.
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
            return String(html || '')
                .replace(/style="background:var\(--dm-muted\); color:white;">cancelado/g, 'style="background:#dc2626; color:white;">cancelado')
                .replace(/style="background:var\(--dm-muted\); color:white;">devuelto/g, 'style="background:#f59e0b; color:white;">devuelto');
        };
    }

    // ==========================================================
    // CANCELACIÓN SEGURA
    // - nuevo/taller: libera APARTADO.
    // - en proceso/listo: revierte FÍSICO si los materiales ya
    //   fueron descontados; si no, libera APARTADO.
    // - listo para entregar: además retira de inventario el
    //   producto terminado que se ingresó al finalizar el taller.
    // ==========================================================
    const cancelarBase = App.logic.cancelarPedido;
    if (typeof cancelarBase === 'function' && !cancelarBase.__dmEstable) {
        const cancelar = async function (pedidoId) {
            const pedido = getPedido(pedidoId);
            if (!pedido) {
                App.ui.toast('Pedido no encontrado', 'danger');
                return false;
            }

            const estado = norm(pedido.estado);
            const estadosPermitidos = ['nuevo', 'taller', 'en proceso', 'listo para entregar'];
            if (!estadosPermitidos.includes(estado)) {
                return cancelarBase.apply(this, arguments);
            }

            const abonos = (App.state?.abonos || []).filter(a => a.pedido_id === pedidoId);
            const recibido = (parseFloat(pedido.anticipo || 0) || 0) + abonos.reduce((s, a) => s + (parseFloat(a.monto || 0) || 0), 0);
            if (recibido > 0.005) {
                App.ui.toast('No se puede cancelar automáticamente un pedido con dinero recibido. Primero debe gestionarse la devolución del importe.', 'warning');
                return false;
            }

            if (!confirm('¿Cancelar este pedido?\n\nSe revertirá el apartado o el movimiento físico correspondiente y, si ya terminó el taller, se retirará también el producto terminado de inventario.\n\nEl pedido quedará CANCELADO en el histórico.')) return false;

            const detalles = getDetalles(pedidoId);
            const ordenes = getOrdenes(pedidoId);
            const operaciones = [];
            const cambiosMateriales = [];
            const movimientos = [];
            const cambiosOrdenes = [];
            let movIndex = 0;
            const ahora = new Date().toISOString();
            const baseMov = Date.now();

            const pushMovimiento = (mov) => {
                movimientos.push(mov);
                operaciones.push({ action: 'guardar_fila', nombreHoja: 'movimientos_inventario', datos: mov });
            };

            // 1) Revertir materiales de cada orden.
            for (const orden of ordenes) {
                let receta = [];
                try { receta = JSON.parse(orden.receta_personalizada || '[]'); } catch (e) { receta = []; }
                if (!Array.isArray(receta)) receta = [];

                const fisicoDescontado = String(orden.materiales_descontados || '').toLowerCase() === 'true' || orden.materiales_descontados === true;

                for (const item of receta) {
                    const matId = item?.mat_id;
                    const cantidad = parseFloat(item?.cant || 0) || 0;
                    if (!matId || cantidad <= 0) continue;

                    const material = (App.state?.inventario || []).find(m => m.id === matId);
                    if (!material) continue;

                    const stockReal = parseFloat(material.stock_real || 0) || 0;
                    const reservado = parseFloat(material.stock_reservado || 0) || 0;
                    let nuevoReal = stockReal;
                    let nuevoReservado = reservado;

                    if (fisicoDescontado) {
                        nuevoReal = stockReal + cantidad;
                        operaciones.push({
                            action: 'actualizar_fila', nombreHoja: 'materiales', idFila: material.id,
                            datosNuevos: { stock_real: nuevoReal }
                        });
                        cambiosMateriales.push({ material, nuevoReal, nuevoReservado });

                        pushMovimiento({
                            id: `MOV-${baseMov}-${movIndex++}`,
                            fecha: ahora,
                            tipo_movimiento: 'reversa_produccion_cancelacion',
                            origen: 'pedido', origen_id: pedidoId,
                            ref_tipo: 'material', ref_id: material.id, material_id: material.id,
                            tipo: 'entrada', cantidad,
                            costo_unitario: parseFloat(material.costo_unitario || 0) || 0,
                            total: cantidad * (parseFloat(material.costo_unitario || 0) || 0),
                            motivo: 'Reversa física por cancelación de pedido',
                            notas: `Material devuelto de taller por cancelación de ${pedidoId}`
                        });
                    } else {
                        nuevoReservado = Math.max(0, reservado - cantidad);
                        operaciones.push({
                            action: 'actualizar_fila', nombreHoja: 'materiales', idFila: material.id,
                            datosNuevos: { stock_reservado: nuevoReservado }
                        });
                        cambiosMateriales.push({ material, nuevoReal, nuevoReservado });

                        if (reservado !== nuevoReservado) {
                            pushMovimiento({
                                id: `MOV-${baseMov}-${movIndex++}`,
                                fecha: ahora,
                                tipo_movimiento: 'reversa_reserva_venta',
                                origen: 'pedido', origen_id: pedidoId,
                                ref_tipo: 'material', ref_id: material.id, material_id: material.id,
                                tipo: 'entrada', cantidad: cantidad,
                                costo_unitario: parseFloat(material.costo_unitario || 0) || 0,
                                total: cantidad * (parseFloat(material.costo_unitario || 0) || 0),
                                motivo: 'Liberación de apartado por cancelación',
                                notas: `Apartado liberado por cancelación de ${pedidoId}`
                            });
                        }
                    }
                }

                // La orden queda cancelada para que Taller no vuelva a trabajarla.
                operaciones.push({
                    action: 'actualizar_fila', nombreHoja: 'ordenes_produccion', idFila: orden.id,
                    datosNuevos: { estado: 'cancelado', fecha_cancelacion: ahora }
                });
                cambiosOrdenes.push(orden);

                // Los pagos generados al terminar la orden dejan de ser pagables.
                (App.state?.pago_artesanos || []).filter(p => p.orden_id === orden.id).forEach(pago => {
                    operaciones.push({
                        action: 'actualizar_fila', nombreHoja: 'pago_artesanos', idFila: pago.id,
                        datosNuevos: { estado: 'cancelado' }
                    });
                });
            }

            // 2) Si la orden ya terminó, el producto terminado fue ingresado a
            // inventario. Lo retiramos para que la cancelación sea totalmente reversible.
            for (const detalle of detalles) {
                const producto = (App.state?.productos || []).find(p => p.id === detalle.producto_id);
                if (!producto) continue;

                const ordenesDetalle = ordenes.filter(o => o.pedido_detalle_id === detalle.id);
                const ordenLista = ordenesDetalle.some(o => norm(o.estado) === 'listo');
                const eraFabricado = norm(producto.categoria) !== 'reventa';

                if (eraFabricado && ordenLista) {
                    const materialProducto = (App.state?.inventario || []).find(m =>
                        String(m.nombre || '').trim().toLowerCase() === String(producto.nombre || '').trim().toLowerCase()
                    );
                    if (!materialProducto) throw new Error(`No se encontró en inventario el producto terminado ${producto.nombre || producto.id}.`);

                    const cantidad = parseFloat(detalle.cantidad || 1) || 1;
                    const stockReal = parseFloat(materialProducto.stock_real || 0) || 0;
                    if (stockReal < cantidad) {
                        throw new Error(`No se puede cancelar: el producto terminado ${materialProducto.nombre} tiene ${stockReal} en inventario y se necesita revertir ${cantidad}.`);
                    }

                    const nuevoReal = stockReal - cantidad;
                    operaciones.push({
                        action: 'actualizar_fila', nombreHoja: 'materiales', idFila: materialProducto.id,
                        datosNuevos: { stock_real: nuevoReal }
                    });
                    cambiosMateriales.push({ material: materialProducto, nuevoReal, nuevoReservado: parseFloat(materialProducto.stock_reservado || 0) || 0 });

                    pushMovimiento({
                        id: `MOV-${baseMov}-${movIndex++}`,
                        fecha: ahora,
                        tipo_movimiento: 'reversa_entrada_produccion_cancelacion',
                        origen: 'pedido', origen_id: pedidoId,
                        ref_tipo: 'material', ref_id: materialProducto.id, material_id: materialProducto.id,
                        tipo: 'salida', cantidad: -cantidad,
                        costo_unitario: parseFloat(materialProducto.costo_unitario || 0) || 0,
                        total: -(cantidad * (parseFloat(materialProducto.costo_unitario || 0) || 0)),
                        motivo: 'Reversa de producto terminado por cancelación',
                        notas: `Se retira producto terminado ingresado por la orden del pedido ${pedidoId}`
                    });
                }
            }

            operaciones.push({
                action: 'actualizar_fila', nombreHoja: 'pedidos', idFila: pedidoId,
                datosNuevos: { estado: 'cancelado', fecha_cancelacion: ahora }
            });

            App.ui.showLoader('Cancelando pedido y revirtiendo inventario...');
            try {
                const res = await App.api.fetch('ejecutar_lote', { operaciones });
                if (res.status !== 'success') throw new Error(res.message || 'No se pudo cancelar el pedido');

                pedido.estado = 'cancelado';
                pedido.fecha_cancelacion = ahora;
                cambiosMateriales.forEach(c => {
                    c.material.stock_real = c.nuevoReal;
                    c.material.stock_reservado = c.nuevoReservado;
                });
                cambiosOrdenes.forEach(o => {
                    o.estado = 'cancelado';
                    o.fecha_cancelacion = ahora;
                });
                (App.state?.pago_artesanos || []).filter(p => ordenes.some(o => o.id === p.orden_id)).forEach(p => p.estado = 'cancelado');

                if (!Array.isArray(App.state.movimientos_inventario)) App.state.movimientos_inventario = [];
                App.state.movimientos_inventario.push(...movimientos);

                App.ui.toast('Pedido cancelado e inventario revertido correctamente.');
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

    // No permitir eliminar cancelados/devueltos.
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

    // Guardar estado anterior al entregar.
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

    // ==========================================================
    // NORMALIZACIÓN DEL MODAL DE PEDIDOS
    // No agrega observers permanentes. Solo corrige el contenido
    // inmediatamente después de abrir el modal.
    // ==========================================================
    const modalDetallesOriginal = App.views.modalDetallesPedido;
    if (typeof modalDetallesOriginal === 'function' && !modalDetallesOriginal.__dmModalEstadosFix) {
        const modalDetalles = function (pedidoId) {
            const resultado = modalDetallesOriginal.apply(this, arguments);

            const normalizarBotones = () => {
                const root = document.getElementById('sheet-content');
                const pedido = getPedido(pedidoId);
                if (!root || !pedido) return;

                const estado = norm(pedido.estado);
                const botones = Array.from(root.querySelectorAll('button'));
                const texto = b => norm((b.textContent || '').replace(/[^a-záéíóúñü ]/gi, ' '));
                const accion = b => String(b.getAttribute('onclick') || '');

                // Cancelado/devuelto: no deben quedar acciones de avance ni entrega.
                if (['cancelado', 'devuelto'].includes(estado)) {
                    botones.filter(b => {
                        const t = texto(b);
                        const a = accion(b);
                        return /\blisto\b|\bentregado\b|\bentregar\b|\bcerrar\b|\bcancelar\b|\bdevolver\b/.test(t) || /marcarListo|marcarEntregado|cerrarPedido|cancelarPedido|devolverPedido/.test(a);
                    }).forEach(b => b.remove());
                    return;
                }

                // Para cualquier otro estado, nunca debe existir más de un botón de entrega.
                const entregas = botones.filter(b => {
                    const t = texto(b);
                    const a = accion(b);
                    return /\bentregado\b|\bentregar\b/.test(t) || /marcarEntregado/.test(a);
                });
                entregas.slice(1).forEach(b => b.remove());

                // Listo para entregar: debe existir Cancelar y exactamente un Entregado.
                if (estado === 'listo para entregar') {
                    const rootButtons = Array.from(root.querySelectorAll('button'));
                    const yaCancelar = rootButtons.some(b => /\bcancelar\b/.test(texto(b)) || /cancelarPedido/.test(accion(b)));
                    const botonEntrega = rootButtons.find(b => /\bentregado\b|\bentregar\b/.test(texto(b)) || /marcarEntregado/.test(accion(b)));

                    if (!yaCancelar) {
                        const btn = document.createElement('button');
                        btn.className = 'dm-btn dm-btn-secondary dm-btn-sm';
                        btn.textContent = '🚫 Cancelar';
                        btn.onclick = () => App.views.accionPedido(btn, pedidoId, 'cancelarPedido');
                        if (botonEntrega?.parentElement) botonEntrega.parentElement.insertBefore(btn, botonEntrega);
                        else root.appendChild(btn);
                    }
                }

                // Estados normales: "Listo" solo antes de estar listo/entregado/pagado.
                if (['listo para entregar', 'entregado', 'pagado'].includes(estado)) {
                    Array.from(root.querySelectorAll('button')).filter(b => /\blisto\b/.test(texto(b)) || /marcarListo/.test(accion(b))).forEach(b => b.remove());
                }
            };

            // openSheet pinta el contenido en el siguiente ciclo.
            setTimeout(normalizarBotones, 0);
            setTimeout(normalizarBotones, 80);
            setTimeout(normalizarBotones, 250);
            return resultado;
        };
        modalDetalles.__dmModalEstadosFix = true;
        App.views.modalDetallesPedido = modalDetalles;
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
