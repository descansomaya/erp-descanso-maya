// ==========================================================
// DESCANSO MAYA - FIX 2 PEDIDOS
// Activos vs historial + ventas + liberacion de reservas
// ==========================================================
window.App = window.App || {};
App.logic = App.logic || {};
App.views = App.views || {};

(function () {
    if (window.__dmFix2Pedidos) return;
    window.__dmFix2Pedidos = true;

    const norm = v => String(v || '').toLowerCase().trim();
    const pedido = id => (App.state?.pedidos || []).find(p => p.id === id) || null;
    const detalles = id => (App.state?.pedido_detalle || []).filter(d => d.pedido_id === id);
    const esInactivo = p => ['cancelado', 'devuelto'].includes(norm(p?.estado));
    const esVentaValida = p => !!p && String(p.cliente_id || '').toUpperCase() !== 'STOCK_INTERNO' && !esInactivo(p);

    window.DM = window.DM || {};
    DM.esVentaValida = esVentaValida;
    DM.ventasValidas = lista => (lista || []).filter(esVentaValida);
    DM.totalVentasValidas = function (lista, fechaInicio, fechaFin) {
        return DM.ventasValidas(lista).filter(p => {
            const fecha = new Date(p.fecha_creacion || p.fecha || p.created_at || '');
            if (Number.isNaN(fecha.getTime())) return true;
            if (fechaInicio && fecha < fechaInicio) return false;
            if (fechaFin && fecha >= fechaFin) return false;
            return true;
        }).reduce((s, p) => s + (parseFloat(p.total || 0) || 0), 0);
    };

    // Cancelar un pedido listo tambien libera las reservas de materiales.
    const cancelarAnterior = App.logic.cancelarPedido;
    if (typeof cancelarAnterior === 'function' && !cancelarAnterior.__dmFix2) {
        const cancelar = async function (id) {
            const p = pedido(id);
            const estadoAntes = norm(p?.estado);
            const resultado = await cancelarAnterior.apply(this, arguments);
            if (resultado !== true || !p || estadoAntes !== 'listo para entregar') return resultado;

            try {
                const operaciones = [];
                const cambios = [];
                const movimientos = [];
                const ahora = new Date().toISOString();
                let idx = 0;

                for (const d of detalles(id)) {
                    const prod = (App.state?.productos || []).find(x => x.id === d.producto_id);
                    if (!prod) continue;
                    const cantidadPedido = parseFloat(d.cantidad || 1) || 1;

                    for (let i = 1; i <= 20; i++) {
                        const matId = prod[`mat_${i}`];
                        const cantidad = (parseFloat(prod[`cant_${i}`] || 0) || 0) * cantidadPedido;
                        if (!matId || cantidad <= 0) continue;
                        const mat = (App.state?.inventario || []).find(m => m.id === matId);
                        if (!mat) continue;

                        const reservadoActual = parseFloat(mat.stock_reservado || 0) || 0;
                        const liberado = Math.min(reservadoActual, cantidad);
                        if (liberado <= 0) continue;

                        const nuevoReservado = Math.max(0, reservadoActual - liberado);
                        operaciones.push({ action: 'actualizar_fila', nombreHoja: 'materiales', idFila: mat.id, datosNuevos: { stock_reservado: nuevoReservado } });
                        cambios.push({ mat, nuevoReservado });

                        const mov = {
                            id: `MOV-${Date.now()}-${idx++}`,
                            fecha: ahora,
                            tipo_movimiento: 'reversa_reserva_venta',
                            origen: 'pedido', origen_id: id,
                            ref_tipo: 'material', ref_id: mat.id, material_id: mat.id,
                            tipo: 'entrada', cantidad: liberado,
                            costo_unitario: parseFloat(mat.costo_unitario || 0) || 0,
                            total: liberado * (parseFloat(mat.costo_unitario || 0) || 0),
                            motivo: 'Liberacion de apartado por cancelacion',
                            notas: 'Reserva liberada sin salida fisica'
                        };
                        movimientos.push(mov);
                        operaciones.push({ action: 'guardar_fila', nombreHoja: 'movimientos_inventario', datos: mov });
                    }
                }

                if (operaciones.length) {
                    const res = await App.api.fetch('ejecutar_lote', { operaciones });
                    if (res.status !== 'success') throw new Error(res.message || 'No se pudieron liberar las reservas');
                    cambios.forEach(c => { c.mat.stock_reservado = c.nuevoReservado; });
                    if (!Array.isArray(App.state.movimientos_inventario)) App.state.movimientos_inventario = [];
                    App.state.movimientos_inventario.push(...movimientos);
                }
                App.ui.toast('Pedido cancelado: reservas liberadas correctamente.');
                App.logic.revisarAlertasStock?.();
            } catch (e) {
                console.error('[DM Fix2] Error liberando reservas al cancelar:', e);
                App.ui.toast('El pedido quedo cancelado, pero hubo un problema al liberar las reservas. Revisa Inventario.', 'danger');
            }
            return true;
        };
        cancelar.__dmFix2 = true;
        App.logic.cancelarPedido = cancelar;
    }

    // La vista oficial ya pinta los badges. Solo se corrige su fuente de datos,
    // contadores y colores, sin modificar el DOM despues del render.
    const pedidosOriginal = App.views.pedidos;
    if (typeof pedidosOriginal === 'function') {
        App.views.pedidos = function () {
            const todos = App.state?.pedidos || [];
            const activos = todos.filter(p => !esInactivo(p));
            const historico = !!App.state?.mostrarHistoricoPedidos;
            const estadoOriginal = App.state.pedidos;
            App.state.pedidos = historico ? todos : activos;
            let html;
            try { html = pedidosOriginal.apply(this, arguments); }
            finally { App.state.pedidos = estadoOriginal; }

            html = html.replace(/📜 Histórico Completos \(\d+\)/g, `📜 Histórico Completos (${todos.length})`);
            html = html.replace(/📦 Ver Solo Activos \(\d+\)/g, `📦 Ver Solo Activos (${activos.length})`);
            html = html.replace(/style="background:var\(--dm-muted\); color:white;">cancelado/g, 'style="background:#dc2626; color:white;">cancelado');
            html = html.replace(/style="background:var\(--dm-muted\); color:white;">devuelto/g, 'style="background:#f59e0b; color:white;">devuelto');
            return html;
        };
    }

    // Dashboard: ventas solo considera ventas reales y no canceladas/devueltas.
    const inicioOriginal = App.views.inicio;
    if (typeof inicioOriginal === 'function') {
        App.views.inicio = function () {
            let html = inicioOriginal.apply(this, arguments);
            const hoy = new Date();
            const ventas = DM.ventasValidas(App.state?.pedidos || []).filter(p => {
                const f = new Date(p.fecha_creacion || p.fecha || p.created_at || '');
                return !Number.isNaN(f.getTime()) && f.getMonth() === hoy.getMonth() && f.getFullYear() === hoy.getFullYear();
            }).reduce((s, p) => s + (parseFloat(p.total || 0) || 0), 0);
            const activos = (App.state?.pedidos || []).filter(p => !esInactivo(p) && !['entregado','pagado'].includes(norm(p.estado))).length;
            html = html.replace(/(Ventas del mes<\/small>\s*<div[^>]*>)[\s\S]*?(<\/div>)/, `$1${App.ui.money(ventas)}$2`);
            html = html.replace(/(Pedidos activos<\/small>\s*<div[^>]*>)[\s\S]*?(<\/div>)/, `$1${activos}$2`);
            return html;
        };
    }

    // Importante: no se instalan MutationObserver. Las vistas se regeneran
    // normalmente mediante el router despues de cada accion.
})();
