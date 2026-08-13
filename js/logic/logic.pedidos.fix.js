// ==========================================================
// DESCANSO MAYA - CORRECCIONES FINALES DE PEDIDOS
// ==========================================================
window.App = window.App || {};
App.logic = App.logic || {};
App.views = App.views || {};

(function () {
    if (window.__dmPedidosFixFinal) return;
    window.__dmPedidosFixFinal = true;

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

    // ----------------------------------------------------------
    // ENTREGAR: guardar estado anterior para la devolución.
    // ----------------------------------------------------------
    const entregarOriginal = App.logic.marcarPedidoEntregado;
    if (typeof entregarOriginal === 'function' && !entregarOriginal.__dmFinalEntrega) {
        const entregar = async function (id) {
            const p = getPedido(id);
            const anterior = norm(p?.estado) || 'listo para entregar';
            const ok = await entregarOriginal.apply(this, arguments);
            if (ok === true && p) {
                p.estado_anterior_entrega = anterior;
                try {
                    await App.api.fetch('ejecutar_lote', { operaciones: [{
                        action: 'actualizar_fila', nombreHoja: 'pedidos', idFila: id,
                        datosNuevos: { estado_anterior_entrega: anterior }
                    }] });
                } catch (e) { console.warn('[DM] No se pudo guardar estado anterior:', e); }
            }
            return ok;
        };
        entregar.__dmFinalEntrega = true;
        App.logic.marcarPedidoEntregado = entregar;
    }

    // ----------------------------------------------------------
    // DEVOLVER: reintegra inventario y restaura estado anterior.
    // ----------------------------------------------------------
    const devolverOriginal = App.logic.devolverPedido;
    if (typeof devolverOriginal === 'function' && !devolverOriginal.__dmFinalDevolucion) {
        const devolver = async function (id) {
            const p = getPedido(id);
            const anterior = norm(p?.estado_anterior_entrega) || 'listo para entregar';
            const ok = await devolverOriginal.apply(this, arguments);
            if (ok !== true || !p) return ok;
            const restaurado = ['entregado', 'devuelto', 'cancelado', 'pagado'].includes(anterior) ? 'listo para entregar' : anterior;
            try {
                const res = await App.api.fetch('ejecutar_lote', { operaciones: [{
                    action: 'actualizar_fila', nombreHoja: 'pedidos', idFila: id,
                    datosNuevos: { estado: restaurado, estado_anterior_entrega: '' }
                }] });
                if (res.status !== 'success') throw new Error(res.message || 'No se pudo restaurar el estado');
                p.estado = restaurado;
                p.estado_anterior_entrega = '';
                App.ui.toast(`Devolución registrada. El pedido regresó a ${restaurado.toUpperCase()}.`);
                App.router?.handleRoute?.();
            } catch (e) {
                console.error('[DM] Restaurando devolución:', e);
                App.ui.toast(e.message || 'No se pudo restaurar el estado anterior.', 'danger');
                return false;
            }
            return true;
        };
        devolver.__dmFinalDevolucion = true;
        App.logic.devolverPedido = devolver;
    }

    // ----------------------------------------------------------
    // CANCELAR LISTO: permite cancelar sin dinero recibido y,
    // además, libera las reservas del pedido.
    // ----------------------------------------------------------
    const cancelarOriginal = App.logic.cancelarPedido;
    if (typeof cancelarOriginal === 'function' && !cancelarOriginal.__dmFinalCancelacion) {
        const cancelar = async function (id) {
            const p = getPedido(id);
            if (!p) return false;
            const estadoAntes = norm(p.estado);
            const abonos = (App.state?.abonos || []).filter(a => a.pedido_id === id);
            const recibido = (parseFloat(p.anticipo || 0) || 0) + abonos.reduce((s, a) => s + (parseFloat(a.monto || 0) || 0), 0);

            if (estadoAntes === 'listo para entregar') {
                if (recibido > 0.005) {
                    App.ui.toast('No se puede cancelar automáticamente un pedido con dinero recibido. Primero debe gestionarse la devolución del importe.', 'warning');
                    return false;
                }
                if (!confirm('¿Cancelar este pedido?\n\nEl pedido quedará CANCELADO y se liberarán sus reservas. El historial se conservará.')) return false;

                const detalles = getDetalles(id);
                const operaciones = [{ action: 'actualizar_fila', nombreHoja: 'pedidos', idFila: id, datosNuevos: { estado: 'cancelado' } }];
                const cambios = [];
                const movimientos = [];
                let idx = 0;

                for (const d of detalles) {
                    const prod = (App.state?.productos || []).find(x => x.id === d.producto_id);
                    if (!prod) continue;
                    const factor = parseFloat(d.cantidad || 1) || 1;
                    for (let i = 1; i <= 20; i++) {
                        const matId = prod[`mat_${i}`];
                        const cant = (parseFloat(prod[`cant_${i}`] || 0) || 0) * factor;
                        if (!matId || cant <= 0) continue;
                        const mat = (App.state?.inventario || []).find(m => m.id === matId);
                        if (!mat) continue;
                        const reservado = parseFloat(mat.stock_reservado || 0) || 0;
                        const liberar = Math.min(reservado, cant);
                        if (liberar <= 0) continue;
                        const nuevo = Math.max(0, reservado - liberar);
                        operaciones.push({ action: 'actualizar_fila', nombreHoja: 'materiales', idFila: mat.id, datosNuevos: { stock_reservado: nuevo } });
                        cambios.push({ mat, nuevo });
                        const mov = {
                            id: `MOV-${Date.now()}-${idx++}`, fecha: new Date().toISOString(),
                            tipo_movimiento: 'reversa_reserva_venta', origen: 'pedido', origen_id: id,
                            ref_tipo: 'material', ref_id: mat.id, material_id: mat.id, tipo: 'entrada', cantidad: liberar,
                            costo_unitario: parseFloat(mat.costo_unitario || 0) || 0,
                            total: liberar * (parseFloat(mat.costo_unitario || 0) || 0),
                            motivo: 'Liberación de apartado por cancelación', notas: 'Reserva liberada sin salida física'
                        };
                        movimientos.push(mov);
                        operaciones.push({ action: 'guardar_fila', nombreHoja: 'movimientos_inventario', datos: mov });
                    }
                }
                const ordenes = (App.state?.ordenes_produccion || []).filter(o => detalles.some(d => d.id === o.pedido_detalle_id));
                ordenes.forEach(o => operaciones.push({ action: 'actualizar_fila', nombreHoja: 'ordenes_produccion', idFila: o.id, datosNuevos: { estado: 'cancelado', fecha_cancelacion: new Date().toISOString() } }));

                App.ui.showLoader('Cancelando pedido...');
                try {
                    const res = await App.api.fetch('ejecutar_lote', { operaciones });
                    if (res.status !== 'success') throw new Error(res.message || 'No se pudo cancelar el pedido');
                    p.estado = 'cancelado';
                    cambios.forEach(c => c.mat.stock_reservado = c.nuevo);
                    ordenes.forEach(o => o.estado = 'cancelado');
                    if (!Array.isArray(App.state.movimientos_inventario)) App.state.movimientos_inventario = [];
                    App.state.movimientos_inventario.push(...movimientos);
                    App.ui.toast('Pedido cancelado y apartado liberado correctamente.');
                    App.router?.handleRoute?.();
                    App.logic.revisarAlertasStock?.();
                    return true;
                } catch (e) {
                    App.ui.toast(e.message || 'No se pudo cancelar el pedido', 'danger');
                    return false;
                } finally { App.ui.hideLoader(); }
            }

            const ok = await cancelarOriginal.apply(this, arguments);
            return ok;
        };
        cancelar.__dmFinalCancelacion = true;
        App.logic.cancelarPedido = cancelar;
    }

    // ----------------------------------------------------------
    // ELIMINACIÓN: cancelados y devueltos nunca se eliminan.
    // ----------------------------------------------------------
    const eliminarOriginal = App.logic.eliminarPedido;
    if (typeof eliminarOriginal === 'function' && !eliminarOriginal.__dmFinalEliminar) {
        const eliminar = async function (id) {
            const p = getPedido(id);
            if (inactivos(p)) {
                App.ui.toast('Los pedidos cancelados o devueltos se conservan en el histórico y no se eliminan.', 'warning');
                return false;
            }
            return eliminarOriginal.apply(this, arguments);
        };
        eliminar.__dmFinalEliminar = true;
        App.logic.eliminarPedido = eliminar;
    }

    // ----------------------------------------------------------
    // MODAL: estados visuales y acciones coherentes.
    // ----------------------------------------------------------
    function ajustarModal() {
        const root = document.getElementById('sheet-content');
        if (!root) return;
        const m = (root.innerText || '').match(/PED-\d+/);
        if (!m) return;
        const p = getPedido(m[0]);
        if (!p) return;
        const estado = norm(p.estado);
        const botones = Array.from(root.querySelectorAll('button'));

        if (['cancelado', 'devuelto'].includes(estado)) {
            botones.filter(b => /eliminar/i.test(b.textContent || '')).forEach(b => b.style.display = 'none');
        }
        if (estado === 'entregado') {
            botones.filter(b => /🚚\s*(entregar|entregado)/i.test(b.textContent || '')).forEach(b => b.remove());
        }
        if (['listo para entregar', 'pagado'].includes(estado)) {
            const entregas = botones.filter(b => /🚚\s*(entregar|entregado)/i.test(b.textContent || ''));
            entregas.forEach((b, i) => i ? b.remove() : (b.textContent = '🚚 Entregar'));
        }
    }

    // ----------------------------------------------------------
    // LISTADO: solo activos por defecto; histórico incluye todos.
    // ----------------------------------------------------------
    function cardDe(el, id) {
        let n = el;
        for (let i = 0; i < 10 && n; i++, n = n.parentElement) {
            if ((n.innerText || '').includes(id) && n.querySelectorAll('button').length) return n;
        }
        return el.closest('.dm-card, .card') || el.parentElement;
    }

    function historicoActivo(root) {
        return Array.from(root.querySelectorAll('button')).some(b => /ver\s+solo\s+activos/i.test(b.textContent || ''));
    }

    function badge(card, p) {
        if (!card || !p) return;
        card.style.position = 'relative';
        let b = card.querySelector('[data-dm-estado-pedido]');
        if (!b) { b = document.createElement('span'); b.dataset.dmEstadoPedido = '1'; card.appendChild(b); }
        const e = norm(p.estado);
        const map = {
            entregado:['ENTREGADO','green'], cancelado:['CANCELADO','red'], devuelto:['DEVUELTO','orange'],
            'listo para entregar':['LISTO PARA ENTREGAR','purple'], pagado:['PAGADO','blue'],
            'en proceso':['EN PROCESO','purple'], taller:['EN TALLER','purple'], nuevo:['NUEVO','gray']
        };
        const x = map[e] || [String(p.estado || 'PENDIENTE').toUpperCase(),'gray'];
        b.textContent = x[0]; b.className = `dm-pedido-status dm-pedido-status-${x[1]}`;
    }

    function actualizarListado() {
        const root = document.getElementById('app-content');
        if (!root) return;
        const hist = historicoActivo(root);
        const pedidos = App.state?.pedidos || [];

        Array.from(root.querySelectorAll('button')).filter(b => /\bver\b/i.test(b.textContent || '')).forEach(btn => {
            const card = cardDe(btn, (btn.parentElement?.innerText || '').match(/PED-\d+/)?.[0]);
            const id = (card?.innerText || '').match(/PED-\d+/)?.[0];
            const p = id ? getPedido(id) : null;
            if (p && card) { badge(card, p); card.style.display = (!hist && inactivos(p)) ? 'none' : ''; }
        });

        pedidos.forEach(p => {
            Array.from(root.querySelectorAll('*')).filter(n => n.children.length === 0 && (n.textContent || '').trim() === p.id).forEach(n => {
                const card = cardDe(n, p.id);
                if (card) { badge(card, p); card.style.display = (!hist && inactivos(p)) ? 'none' : ''; }
            });
        });

        const activos = pedidos.filter(p => !inactivos(p)).length;
        root.querySelectorAll('button').forEach(b => {
            const t = String(b.textContent || '');
            if (/hist[oó]rico\s+complet/i.test(t)) b.textContent = `📜 Histórico Completos (${pedidos.length})`;
            if (/ver\s+solo\s+activos/i.test(t)) b.textContent = `📦 Ver Solo Activos (${activos})`;
        });
    }

    function estilos() {
        if (document.getElementById('dm-pedidos-final-style')) return;
        const s = document.createElement('style'); s.id = 'dm-pedidos-final-style';
        s.textContent = `
            .dm-pedido-status{position:absolute;right:18px;top:18px;z-index:5;display:inline-flex;padding:7px 14px;border-radius:999px;font-size:12px;font-weight:800;text-transform:lowercase;box-shadow:0 1px 2px rgba(0,0,0,.06)}
            .dm-pedido-status-green{background:#16a34a;color:#fff}.dm-pedido-status-red{background:#dc2626;color:#fff}.dm-pedido-status-orange{background:#f59e0b;color:#fff}.dm-pedido-status-purple{background:#7c3aed;color:#fff}.dm-pedido-status-blue{background:#2563eb;color:#fff}.dm-pedido-status-gray{background:#64748b;color:#fff}
        `;
        document.head.appendChild(s);
    }

    // Dashboard: nunca contabilizar cancelados, devueltos ni STOCK_INTERNO.
    function corregirVentas() {
        const root = document.getElementById('app-content');
        if (!root) return;
        const h = new Date(), mes = h.getMonth(), anio = h.getFullYear();
        const total = (App.state?.pedidos || []).filter(ventaValida).filter(p => {
            const f = new Date(p.fecha_creacion || p.fecha || p.created_at || '');
            return !Number.isNaN(f.getTime()) && f.getMonth() === mes && f.getFullYear() === anio;
        }).reduce((s,p) => s + (parseFloat(p.total || 0) || 0), 0);
        const titulo = Array.from(root.querySelectorAll('small,div,p,span')).find(e => norm(e.textContent) === 'ventas del mes');
        const valor = titulo?.parentElement?.querySelector('.dm-text-xl,.dm-text-2xl,strong,b');
        if (valor && App.ui?.money) valor.textContent = App.ui.money(total);
    }

    function boot() {
        estilos();
        const app = document.getElementById('app-content');
        const sheet = document.getElementById('sheet-content');
        if (app && !app.__dmPedidosFinalObs) {
            const o = new MutationObserver(() => { clearTimeout(app.__dmPedidosFinalTimer); app.__dmPedidosFinalTimer = setTimeout(() => { actualizarListado(); corregirVentas(); }, 40); });
            o.observe(app, { childList:true, subtree:true }); app.__dmPedidosFinalObs = o;
        }
        if (sheet && !sheet.__dmPedidosFinalObs) { const o = new MutationObserver(ajustarModal); o.observe(sheet,{childList:true,subtree:true}); sheet.__dmPedidosFinalObs=o; }
        actualizarListado(); corregirVentas(); ajustarModal();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
})();
