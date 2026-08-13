// ==========================================================
// DESCANSO MAYA - CORRECCIONES DE FLUJO DE PEDIDOS
// ==========================================================
// Este archivo se carga al final de la aplicación para corregir
// compatibilidades de versiones anteriores sin duplicar lógica.

window.App = window.App || {};
App.logic = App.logic || {};
App.views = App.views || {};

(function instalarCorreccionesPedidos() {
    const normalizar = valor => String(valor || '').toLowerCase().trim();

    const obtenerPedido = pedidoId =>
        (App.state.pedidos || []).find(p => p.id === pedidoId) || null;

    const esVentaValida = pedido => {
        if (!pedido) return false;
        const estado = normalizar(pedido.estado);
        return pedido.cliente_id !== 'STOCK_INTERNO' &&
            !['cancelado', 'devuelto'].includes(estado);
    };

    // ----------------------------------------------------------
    // 1) Guardar el estado anterior antes de entregar.
    //    Esto permite que una devolución regrese al flujo anterior.
    // ----------------------------------------------------------
    const entregaOriginal = App.logic.marcarPedidoEntregado;
    if (typeof entregaOriginal === 'function' && !entregaOriginal.__dmEstadoAnteriorFix) {
        const entregaPatched = async function (pedidoId) {
            const pedido = obtenerPedido(pedidoId);
            const estadoAnterior = normalizar(pedido?.estado) || 'listo para entregar';
            const resultado = await entregaOriginal.apply(this, arguments);

            if (resultado === true && pedido) {
                pedido.estado_anterior_entrega = estadoAnterior;
                try {
                    await App.api.fetch('ejecutar_lote', {
                        operaciones: [{
                            action: 'actualizar_fila',
                            nombreHoja: 'pedidos',
                            idFila: pedidoId,
                            datosNuevos: { estado_anterior_entrega: estadoAnterior }
                        }]
                    });
                } catch (e) {
                    console.warn('No se pudo guardar el estado anterior de entrega:', e);
                }
            }
            return resultado;
        };
        entregaPatched.__dmEstadoAnteriorFix = true;
        App.logic.marcarPedidoEntregado = entregaPatched;
    }

    // ----------------------------------------------------------
    // 2) Devolución: reintegra el producto y regresa el pedido
    //    al estado que tenía antes de la entrega.
    // ----------------------------------------------------------
    const devolverOriginal = App.logic.devolverPedido;
    if (typeof devolverOriginal === 'function' && !devolverOriginal.__dmEstadoAnteriorFix) {
        const devolverPatched = async function (pedidoId) {
            const pedido = obtenerPedido(pedidoId);
            const estadoAnterior = normalizar(pedido?.estado_anterior_entrega) || 'listo para entregar';
            const resultado = await devolverOriginal.apply(this, arguments);
            if (resultado !== true || !pedido) return resultado;

            const estadoRestaurado = ['entregado', 'devuelto', 'cancelado', 'pagado'].includes(estadoAnterior)
                ? 'listo para entregar'
                : estadoAnterior;

            try {
                const res = await App.api.fetch('ejecutar_lote', {
                    operaciones: [{
                        action: 'actualizar_fila',
                        nombreHoja: 'pedidos',
                        idFila: pedidoId,
                        datosNuevos: {
                            estado: estadoRestaurado,
                            estado_anterior_entrega: ''
                        }
                    }]
                });

                if (res.status !== 'success') {
                    throw new Error(res.message || 'No se pudo restaurar el estado anterior');
                }

                pedido.estado = estadoRestaurado;
                pedido.estado_anterior_entrega = '';
                App.ui.toast(`Devolución registrada. El pedido regresó a ${estadoRestaurado.toUpperCase()}.`);
                if (App.router?.handleRoute) App.router.handleRoute();
                return true;
            } catch (error) {
                console.error('Error restaurando estado después de devolución:', error);
                App.ui.toast(error.message || 'La devolución se registró, pero no se pudo restaurar el estado anterior.', 'danger');
                return false;
            }
        };
        devolverPatched.__dmEstadoAnteriorFix = true;
        App.logic.devolverPedido = devolverPatched;
    }

    // ----------------------------------------------------------
    // 3) Cancelación de un pedido que ya llegó a LISTO PARA ENTREGAR.
    //    Se permite únicamente sin dinero recibido. La producción
    //    queda como CANCELADA para conservar trazabilidad.
    // ----------------------------------------------------------
    const cancelarOriginal = App.logic.cancelarPedido;
    if (typeof cancelarOriginal === 'function' && !cancelarOriginal.__dmListoFix) {
        const cancelarPatched = async function (pedidoId) {
            const pedido = obtenerPedido(pedidoId);
            if (!pedido) return false;

            const estado = normalizar(pedido.estado);
            if (estado !== 'listo para entregar') {
                return cancelarOriginal.apply(this, arguments);
            }

            const detalles = (App.state.pedido_detalle || []).filter(d => d.pedido_id === pedidoId);
            const ordenes = (App.state.ordenes_produccion || []).filter(o =>
                detalles.some(d => d.id === o.pedido_detalle_id)
            );
            const abonos = (App.state.abonos || []).filter(a => a.pedido_id === pedidoId);
            const totalRecibido =
                (parseFloat(pedido.anticipo || 0) || 0) +
                abonos.reduce((s, a) => s + (parseFloat(a.monto || 0) || 0), 0);

            if (totalRecibido > 0.005) {
                App.ui.toast('No se puede cancelar automáticamente un pedido con dinero recibido. Primero debe gestionarse la devolución del importe.', 'warning');
                return false;
            }

            if (!confirm('¿Cancelar este pedido listo para entregar?\n\nEl pedido quedará CANCELADO para conservar el historial. Las órdenes de Taller quedarán CANCELADAS y no se eliminará la trazabilidad.')) {
                return false;
            }

            const operaciones = [
                {
                    action: 'actualizar_fila',
                    nombreHoja: 'pedidos',
                    idFila: pedidoId,
                    datosNuevos: { estado: 'cancelado' }
                }
            ];

            ordenes.forEach(o => {
                operaciones.push({
                    action: 'actualizar_fila',
                    nombreHoja: 'ordenes_produccion',
                    idFila: o.id,
                    datosNuevos: { estado: 'cancelado', fecha_cancelacion: new Date().toISOString() }
                });
            });

            (App.state.pago_artesanos || [])
                .filter(p => ordenes.some(o => o.id === p.orden_id) && normalizar(p.estado) !== 'pagado')
                .forEach(p => {
                    operaciones.push({
                        action: 'actualizar_fila',
                        nombreHoja: 'pago_artesanos',
                        idFila: p.id,
                        datosNuevos: { estado: 'cancelado' }
                    });
                });

            try {
                App.ui.showLoader('Cancelando pedido...');
                const res = await App.api.fetch('ejecutar_lote', { operaciones });
                App.ui.hideLoader();
                if (res.status !== 'success') throw new Error(res.message || 'No se pudo cancelar el pedido');

                pedido.estado = 'cancelado';
                ordenes.forEach(o => { o.estado = 'cancelado'; });
                (App.state.pago_artesanos || [])
                    .filter(p => ordenes.some(o => o.id === p.orden_id) && normalizar(p.estado) !== 'pagado')
                    .forEach(p => { p.estado = 'cancelado'; });

                App.ui.toast('Pedido cancelado correctamente. Se conservó el historial.');
                if (App.router?.handleRoute) App.router.handleRoute();
                return true;
            } catch (error) {
                App.ui.hideLoader();
                console.error('Error cancelando pedido listo:', error);
                App.ui.toast(error.message || 'No se pudo cancelar el pedido', 'danger');
                return false;
            }
        };
        cancelarPatched.__dmListoFix = true;
        App.logic.cancelarPedido = cancelarPatched;
    }

    // ----------------------------------------------------------
    // 4) Un solo botón Entregar + botón Cancelar cuando corresponde.
    //    Corrige el botón duplicado inyectado por compat.js.
    // ----------------------------------------------------------
    function ajustarModalPedido() {
        const root = document.getElementById('sheet-content');
        if (!root) return;

        const texto = root.innerText || '';
        const match = texto.match(/PED-\d+/);
        if (!match) return;

        const pedido = obtenerPedido(match[0]);
        if (!pedido) return;

        const estado = normalizar(pedido.estado);
        let botones = Array.from(root.querySelectorAll('button'));

        // El estado LISTO/PAGADO debe tener una sola acción Entregar.
        if (['listo para entregar', 'pagado'].includes(estado)) {
            const entregas = botones.filter(b =>
                /🚚\s*(Entregar|Entregado)/i.test(String(b.textContent || ''))
            );

            if (entregas.length) {
                entregas.forEach((b, index) => {
                    if (index === 0) {
                        b.textContent = '🚚 Entregar';
                        b.dataset.dmEntregaUnica = 'true';
                    } else {
                        b.remove();
                    }
                });
            }
        } else {
            botones.filter(b => /🚚\s*(Entregar|Entregado)/i.test(String(b.textContent || '')))
                .forEach(b => b.remove());
        }

        botones = Array.from(root.querySelectorAll('button'));

        // Cancelar: estados nuevos y LISTO PARA ENTREGAR sin importe recibido.
        const totalRecibido =
            (parseFloat(pedido.anticipo || 0) || 0) +
            (App.state.abonos || [])
                .filter(a => a.pedido_id === pedido.id)
                .reduce((s, a) => s + (parseFloat(a.monto || 0) || 0), 0);

        const puedeCancelar =
            ['nuevo', 'taller', 'en proceso'].includes(estado) ||
            (estado === 'listo para entregar' && totalRecibido <= 0.005);

        const yaTieneCancelar = botones.some(b => b.dataset.dmCancelacionFix === 'true');
        if (puedeCancelar && !yaTieneCancelar) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'dm-btn dm-btn-secondary dm-btn-sm';
            btn.textContent = '🚫 Cancelar';
            btn.dataset.dmCancelacionFix = 'true';
            btn.onclick = () => App.views.runPedidoAction(
                btn,
                pedido.id,
                'cancelarPedidoFix',
                () => App.logic.cancelarPedido(pedido.id),
                {
                    loadingText: 'Cancelando...',
                    loaderMessage: 'Cancelando pedido...',
                    successMessage: 'Pedido cancelado',
                    errorTitle: 'No se pudo cancelar el pedido'
                }
            );
            const eliminar = botones.find(b => /eliminar/i.test(String(b.textContent || '')));
            (eliminar?.parentElement || root).appendChild(btn);
        }

        // Cancelado/devuelto: nunca permitir eliminar desde este modal.
        if (['cancelado', 'devuelto'].includes(estado)) {
            botones.filter(b => /eliminar/i.test(String(b.textContent || '')))
                .forEach(b => { b.style.display = 'none'; });
        }

        // Entregado: no debe existir Entregar; sí puede existir Devolver.
        if (estado === 'entregado') {
            Array.from(root.querySelectorAll('button'))
                .filter(b => /🚚\s*(Entregar|Entregado)/i.test(String(b.textContent || '')))
                .forEach(b => b.remove());
        }
    }

    function instalarObserverModal() {
        const root = document.getElementById('sheet-content');
        if (!root || root.__dmPedidosFixObserver) return;
        const observer = new MutationObserver(() => {
            clearTimeout(root.__dmPedidosFixTimer);
            root.__dmPedidosFixTimer = setTimeout(ajustarModalPedido, 20);
        });
        observer.observe(root, { childList: true, subtree: true });
        root.__dmPedidosFixObserver = observer;
        ajustarModalPedido();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', instalarObserverModal, { once: true });
    } else {
        instalarObserverModal();
    }

    // ----------------------------------------------------------
    // 5) Dashboard: ventas del mes excluye STOCK_INTERNO, CANCELADO
    //    y DEVUELTO. No modifica el historial de pedidos.
    // ----------------------------------------------------------
    function corregirVentasDashboard() {
        const root = document.getElementById('app-content');
        if (!root) return;
        const titulo = Array.from(root.querySelectorAll('small')).find(el =>
            normalizar(el.textContent) === 'ventas del mes'
        );
        if (!titulo) return;

        const hoy = new Date();
        const mes = hoy.getMonth();
        const anio = hoy.getFullYear();
        const mismoMes = fecha => {
            if (!fecha) return false;
            const f = new Date(fecha);
            return !Number.isNaN(f.getTime()) && f.getMonth() === mes && f.getFullYear() === anio;
        };

        const ventas = (App.state.pedidos || [])
            .filter(p => esVentaValida(p) && mismoMes(p.fecha_creacion))
            .reduce((s, p) => s + (parseFloat(p.total || 0) || 0), 0);

        const valor = titulo.parentElement?.querySelector('.dm-text-xl');
        if (valor && typeof App.ui.money === 'function') valor.textContent = App.ui.money(ventas);
    }

    const appContent = document.getElementById('app-content');
    if (appContent) {
        const observerDashboard = new MutationObserver(() => {
            clearTimeout(appContent.__dmVentasTimer);
            appContent.__dmVentasTimer = setTimeout(corregirVentasDashboard, 40);
        });
        observerDashboard.observe(appContent, { childList: true, subtree: true });
    }

    window.DM = window.DM || {};
    DM.esVentaValida = esVentaValida;
})();
