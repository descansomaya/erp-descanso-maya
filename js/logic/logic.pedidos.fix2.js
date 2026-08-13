// ==========================================================
// DESCANSO MAYA - FIX 2 PEDIDOS
// Activos vs historial + estados visuales + reservas + ventas
// ==========================================================
window.App = window.App || {};
App.logic = App.logic || {};
App.views = App.views || {};

(function instalarFix2Pedidos() {
    if (window.__dmFix2Pedidos) return;
    window.__dmFix2Pedidos = true;

    const norm = v => String(v || '').toLowerCase().trim();
    const pedido = id => (App.state?.pedidos || []).find(p => p.id === id) || null;
    const detalles = id => (App.state?.pedido_detalle || []).filter(d => d.pedido_id === id);
    const esInactivo = p => ['cancelado', 'devuelto'].includes(norm(p?.estado));
    const esVentaValida = p => !!p && String(p.cliente_id || '').toUpperCase() !== 'STOCK_INTERNO' && !esInactivo(p);

    // Exponer una sola regla para que Dashboard/reportes puedan reutilizarla.
    window.DM = window.DM || {};
    DM.esVentaValida = esVentaValida;
    DM.ventasValidas = function(lista) {
        return (lista || []).filter(esVentaValida);
    };
    DM.totalVentasValidas = function(lista, fechaInicio, fechaFin) {
        return DM.ventasValidas(lista).filter(p => {
            const fecha = new Date(p.fecha_creacion || p.fecha || p.created_at || '');
            if (Number.isNaN(fecha.getTime())) return true;
            if (fechaInicio && fecha < fechaInicio) return false;
            if (fechaFin && fecha >= fechaFin) return false;
            return true;
        }).reduce((s, p) => s + (parseFloat(p.total || 0) || 0), 0);
    };

    // ----------------------------------------------------------
    // 1. CANCELACIÓN: si estaba LISTO PARA ENTREGAR, también
    //    libera las reservas que dejó el pedido.
    // ----------------------------------------------------------
    const cancelarAnterior = App.logic.cancelarPedido;
    if (typeof cancelarAnterior === 'function' && !cancelarAnterior.__dmFix2) {
        const cancelar = async function(id) {
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
                        operaciones.push({
                            action: 'actualizar_fila', nombreHoja: 'materiales', idFila: mat.id,
                            datosNuevos: { stock_reservado: nuevoReservado }
                        });
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
                            motivo: 'Liberación de apartado por cancelación',
                            notas: 'Reserva liberada sin salida física'
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
                App.ui.toast('El pedido quedó cancelado, pero hubo un problema al liberar las reservas. Revisa Inventario.', 'danger');
            }
            return true;
        };
        cancelar.__dmFix2 = true;
        App.logic.cancelarPedido = cancelar;
    }

    // ----------------------------------------------------------
    // 2. LISTADO DE PEDIDOS: activos = todo excepto CANCELADO y
    //    DEVUELTO. Historial = absolutamente todos.
    // ----------------------------------------------------------
    function buscarCardPedido(el, id) {
        let n = el;
        for (let i = 0; i < 8 && n; i++, n = n.parentElement) {
            const txt = n.innerText || '';
            if (txt.includes(id) && n.querySelectorAll('button').length >= 1) return n;
        }
        return el.closest('.dm-card, .card') || el.parentElement;
    }

    function estaEnHistorico(root) {
        return Array.from(root.querySelectorAll('button')).some(b => /ver\s+solo\s+activos/i.test(b.textContent || ''));
    }

    function insertarBadge(card, p) {
        if (!card || !p) return;
        card.style.position = 'relative';
        let badge = card.querySelector('[data-dm-estado-pedido]');
        if (!badge) {
            badge = document.createElement('span');
            badge.dataset.dmEstadoPedido = 'true';
            card.appendChild(badge);
        }

        const estado = norm(p.estado);
        const mapa = {
            entregado: ['ENTREGADO', 'entregado'],
            cancelado: ['CANCELADO', 'cancelado'],
            devuelto: ['DEVUELTO', 'devuelto'],
            'listo para entregar': ['LISTO PARA ENTREGAR', 'listo'],
            pagado: ['PAGADO', 'pagado'],
            'en proceso': ['EN PROCESO', 'proceso'],
            taller: ['EN TALLER', 'proceso'],
            nuevo: ['NUEVO', 'nuevo']
        };
        const info = mapa[estado] || [String(p.estado || 'PENDIENTE').toUpperCase(), 'pendiente'];
        badge.textContent = info[0];
        badge.className = `dm-estado-pedido dm-estado-${info[1]}`;
    }

    function actualizarListadoPedidos() {
        const root = document.getElementById('app-content');
        if (!root) return;
        const pedidos = App.state?.pedidos || [];
        const historico = estaEnHistorico(root);
        const ids = new Set();

        Array.from(root.querySelectorAll('button')).forEach(btn => {
            if (!/\bver\b/i.test(btn.textContent || '')) return;
            const holder = buscarCardPedido(btn, null);
            const txt = holder?.innerText || btn.parentElement?.innerText || '';
            const m = txt.match(/PED-\d+/);
            if (m) ids.add(m[0]);
        });

        ids.forEach(id => {
            const p = pedido(id);
            if (!p) return;
            const card = buscarCardPedido(root.querySelector('button') || root, id);
            if (!card) return;
            insertarBadge(card, p);
            card.style.display = (!historico && esInactivo(p)) ? 'none' : '';
        });

        // También detectamos cualquier nodo que contenga el folio, aunque el
        // botón "Ver" cambie en futuras versiones.
        pedidos.forEach(p => {
            const nodos = Array.from(root.querySelectorAll('*')).filter(n =>
                n.children.length === 0 && (n.textContent || '').trim() === p.id
            );
            nodos.forEach(n => {
                const card = buscarCardPedido(n, p.id);
                if (card) {
                    insertarBadge(card, p);
                    card.style.display = (!historico && esInactivo(p)) ? 'none' : '';
                }
            });
        });

        const activos = pedidos.filter(p => !esInactivo(p)).length;
        const total = pedidos.length;
        Array.from(root.querySelectorAll('button')).forEach(b => {
            const t = String(b.textContent || '');
            if (/hist[oó]rico\s+complet/i.test(t)) b.textContent = `📜 Histórico Completos (${total})`;
            else if (/ver\s+solo\s+activos/i.test(t)) b.textContent = `📦 Ver Solo Activos (${activos})`;
        });
    }

    function instalarObserverPedidos() {
        const root = document.getElementById('app-content');
        if (!root || root.__dmFix2Observer) return;
        const observer = new MutationObserver(() => {
            clearTimeout(root.__dmFix2Timer);
            root.__dmFix2Timer = setTimeout(actualizarListadoPedidos, 30);
        });
        observer.observe(root, { childList: true, subtree: true });
        root.__dmFix2Observer = observer;
        actualizarListadoPedidos();
    }

    // ----------------------------------------------------------
    // 3. CSS de estados. Cancelado/devuelto deben verse igual de
    //    claramente que ENTREGADO.
    // ----------------------------------------------------------
    function instalarEstilos() {
        if (document.getElementById('dm-fix2-styles')) return;
        const style = document.createElement('style');
        style.id = 'dm-fix2-styles';
        style.textContent = `
            .dm-estado-pedido {
                position:absolute; right:18px; top:18px; z-index:3;
                display:inline-flex; align-items:center; justify-content:center;
                padding:7px 14px; border-radius:999px; font-size:12px;
                font-weight:800; letter-spacing:.2px; text-transform:lowercase;
                box-shadow:0 1px 2px rgba(0,0,0,.06);
            }
            .dm-estado-entregado { background:#16a34a; color:#fff; }
            .dm-estado-cancelado { background:#dc2626; color:#fff; }
            .dm-estado-devuelto { background:#f59e0b; color:#fff; }
            .dm-estado-listo { background:#7c3aed; color:#fff; }
            .dm-estado-pagado { background:#2563eb; color:#fff; }
            .dm-estado-proceso { background:#8b5cf6; color:#fff; }
            .dm-estado-nuevo { background:#64748b; color:#fff; }
            .dm-estado-pendiente { background:#94a3b8; color:#fff; }
            @media(max-width:700px){ .dm-estado-pedido{right:12px;top:12px;font-size:10px;padding:5px 9px;} }
        `;
        document.head.appendChild(style);
    }

    // ----------------------------------------------------------
    // 4. DASHBOARD: recalcular Ventas del mes con la regla válida.
    //    Se usa fecha_creacion, fecha o created_at.
    // ----------------------------------------------------------
    function corregirVentasDashboard() {
        const root = document.getElementById('app-content');
        if (!root) return;
        const hoy = new Date();
        const mes = hoy.getMonth();
        const anio = hoy.getFullYear();
        const ventas = (App.state?.pedidos || []).filter(esVentaValida).filter(p => {
            const f = new Date(p.fecha_creacion || p.fecha || p.created_at || '');
            return !Number.isNaN(f.getTime()) && f.getMonth() === mes && f.getFullYear() === anio;
        }).reduce((s,p) => s + (parseFloat(p.total || 0) || 0), 0);

        const titulo = Array.from(root.querySelectorAll('small,div,p,span')).find(el => norm(el.textContent) === 'ventas del mes');
        const valor = titulo?.parentElement?.querySelector('.dm-text-xl, .dm-text-2xl, strong, b');
        if (valor && typeof App.ui.money === 'function') valor.textContent = App.ui.money(ventas);
    }

    // ----------------------------------------------------------
    // 5. Evitar que el botón Eliminar aparezca en cancelados/devueltos
    //    incluso en Histórico.
    // ----------------------------------------------------------
    function ajustarModalEstados() {
        const root = document.getElementById('sheet-content');
        if (!root) return;
        const m = (root.innerText || '').match(/PED-\d+/);
        if (!m) return;
        const p = pedido(m[0]);
        if (!p) return;
        const estado = norm(p.estado);
        if (['cancelado','devuelto'].includes(estado)) {
            Array.from(root.querySelectorAll('button')).filter(b => /eliminar/i.test(b.textContent || '')).forEach(b => {
                b.style.display = 'none';
            });
        }
    }

    function boot() {
        instalarEstilos();
        instalarObserverPedidos();
        const app = document.getElementById('app-content');
        const sheet = document.getElementById('sheet-content');
        if (app && !app.__dmFix2Dash) {
            const o = new MutationObserver(() => {
                clearTimeout(app.__dmFix2DashTimer);
                app.__dmFix2DashTimer = setTimeout(() => { actualizarListadoPedidos(); corregirVentasDashboard(); }, 50);
            });
            o.observe(app, { childList:true, subtree:true });
            app.__dmFix2Dash = true;
        }
        if (sheet && !sheet.__dmFix2Sheet) {
            const o = new MutationObserver(ajustarModalEstados);
            o.observe(sheet, { childList:true, subtree:true });
            sheet.__dmFix2Sheet = true;
        }
        actualizarListadoPedidos();
        corregirVentasDashboard();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
    else boot();
})();
