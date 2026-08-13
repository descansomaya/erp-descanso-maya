// ==========================================
// PEDIDOS: CANCELACIONES Y DEVOLUCIONES
// ==========================================

window.App = window.App || {};
App.logic = App.logic || {};

(function instalarCancelacionesYDevoluciones() {
    const normalizar = valor => String(valor || "").toLowerCase().trim();

    function obtenerPedido(pedidoId) {
        return (App.state.pedidos || []).find(p => p.id === pedidoId) || null;
    }

    function obtenerDetalles(pedidoId) {
        return (App.state.pedido_detalle || []).filter(d => d.pedido_id === pedidoId);
    }

    function obtenerOrdenes(pedidoId) {
        const detalles = obtenerDetalles(pedidoId);
        return (App.state.ordenes_produccion || []).filter(o =>
            detalles.some(d => d.id === o.pedido_detalle_id)
        );
    }

    function agregarMovimiento(operaciones, movimientos, movimiento) {
        movimientos.push(movimiento);
        operaciones.push({
            action: "guardar_fila",
            nombreHoja: "movimientos_inventario",
            datos: movimiento
        });
    }

    // --------------------------------------------------
    // CANCELAR: pedido todavía no entregado
    // --------------------------------------------------
    App.logic.cancelarPedido = async function (pedidoId) {
        try {
            const pedido = obtenerPedido(pedidoId);
            if (!pedido) throw new Error("Pedido no encontrado");

            const estado = normalizar(pedido.estado);
            const estadosNoCancelables = ["entregado", "devuelto", "cancelado", "pagado"];
            if (estadosNoCancelables.includes(estado)) {
                throw new Error("Este pedido ya no puede cancelarse desde esta etapa. Use Devolver si ya fue entregado.");
            }

            const detalles = obtenerDetalles(pedidoId);
            const ordenes = obtenerOrdenes(pedidoId);
            const ordenActiva = ordenes.some(o => ["proceso", "listo"].includes(normalizar(o.estado)));
            if (ordenActiva) {
                throw new Error("No se puede cancelar porque el Taller ya inició o terminó una orden. Primero debe gestionarse la orden de producción.");
            }

            if (!confirm("¿Cancelar este pedido?\n\nSe liberarán las reservas, pero el pedido se conservará como CANCELADO para mantener el historial.")) return false;

            const operaciones = [];
            const movimientos = [];
            const cambiosInventario = [];
            const baseMov = Date.now();
            let idx = 0;

            for (const detalle of detalles) {
                const producto = (App.state.productos || []).find(p => p.id === detalle.producto_id);
                if (!producto) continue;
                const cantidadPedido = parseFloat(detalle.cantidad || 1) || 1;

                for (let i = 1; i <= 20; i++) {
                    const matId = producto[`mat_${i}`];
                    const cantidad = (parseFloat(producto[`cant_${i}`] || 0) || 0) * cantidadPedido;
                    if (!matId || cantidad <= 0) continue;

                    const material = (App.state.inventario || []).find(m => m.id === matId);
                    if (!material) continue;

                    const reservadoActual = parseFloat(material.stock_reservado || 0) || 0;
                    const liberado = Math.min(reservadoActual, cantidad);
                    const nuevoReservado = Math.max(0, reservadoActual - liberado);
                    if (nuevoReservado !== reservadoActual) {
                        operaciones.push({
                            action: "actualizar_fila",
                            nombreHoja: "materiales",
                            idFila: material.id,
                            datosNuevos: { stock_reservado: nuevoReservado }
                        });
                        cambiosInventario.push({ material, nuevoReservado });
                    }

                    if (liberado > 0) {
                        agregarMovimiento(operaciones, movimientos, {
                            id: `MOV-${baseMov}-${idx++}`,
                            fecha: new Date().toISOString(),
                            tipo_movimiento: "reversa_reserva_venta",
                            origen: "pedido",
                            origen_id: pedidoId,
                            ref_tipo: "material",
                            ref_id: material.id,
                            material_id: material.id,
                            tipo: "entrada",
                            cantidad: liberado,
                            costo_unitario: parseFloat(material.costo_unitario || 0) || 0,
                            total: liberado * (parseFloat(material.costo_unitario || 0) || 0),
                            motivo: "Liberación de apartado por cancelación",
                            notas: "Reserva liberada sin salida física"
                        });
                    }
                }
            }

            operaciones.push({
                action: "actualizar_fila",
                nombreHoja: "pedidos",
                idFila: pedidoId,
                datosNuevos: { estado: "cancelado" }
            });

            App.ui.showLoader("Cancelando pedido...");
            const res = await App.api.fetch("ejecutar_lote", { operaciones });
            App.ui.hideLoader();
            if (res.status !== "success") throw new Error(res.message || "No se pudo cancelar el pedido");

            pedido.estado = "cancelado";
            cambiosInventario.forEach(c => { c.material.stock_reservado = c.nuevoReservado; });
            if (movimientos.length) {
                if (!Array.isArray(App.state.movimientos_inventario)) App.state.movimientos_inventario = [];
                App.state.movimientos_inventario.push(...movimientos);
            }
            App.ui.toast("Pedido cancelado y reservas liberadas");
            App.router.handleRoute();
            App.logic.revisarAlertasStock();
            return true;
        } catch (error) {
            console.error("Error en cancelarPedido:", error);
            App.ui.hideLoader();
            App.ui.toast(error.message || "Error al cancelar pedido", "danger");
            return false;
        }
    };

    // --------------------------------------------------
    // DEVOLVER: pedido ya entregado
    // --------------------------------------------------
    App.logic.devolverPedido = async function (pedidoId) {
        try {
            const pedido = obtenerPedido(pedidoId);
            if (!pedido) throw new Error("Pedido no encontrado");
            if (normalizar(pedido.estado) !== "entregado") {
                throw new Error("Solo se puede registrar una devolución de un pedido ENTREGADO.");
            }

            const detalles = obtenerDetalles(pedidoId);
            if (!detalles.length) throw new Error("El pedido no tiene detalles para devolver.");

            if (!confirm("¿Registrar devolución de este pedido?\n\nEl producto regresará a inventario y se conservará el historial de la venta.")) return false;

            const operaciones = [];
            const movimientos = [];
            const cambiosInventario = [];
            const baseMov = Date.now();
            let idx = 0;

            for (const detalle of detalles) {
                const producto = (App.state.productos || []).find(p => p.id === detalle.producto_id);
                if (!producto) throw new Error(`No se encontró el producto ${detalle.producto_id}.`);
                const cantidad = parseFloat(detalle.cantidad || 1) || 1;
                const esReventa = normalizar(producto.categoria) === "reventa";

                if (esReventa) {
                    let encontro = false;
                    for (let i = 1; i <= 20; i++) {
                        const matId = producto[`mat_${i}`];
                        const cantidadComponente = (parseFloat(producto[`cant_${i}`] || 0) || 0) * cantidad;
                        if (!matId || cantidadComponente <= 0) continue;

                        const material = (App.state.inventario || []).find(m => m.id === matId);
                        if (!material) throw new Error(`No se encontró el inventario asociado a ${producto.nombre || producto.id}.`);
                        encontro = true;

                        const nuevoReal = (parseFloat(material.stock_real || 0) || 0) + cantidadComponente;
                        operaciones.push({
                            action: "actualizar_fila",
                            nombreHoja: "materiales",
                            idFila: material.id,
                            datosNuevos: { stock_real: nuevoReal }
                        });
                        cambiosInventario.push({ material, nuevoReal });

                        agregarMovimiento(operaciones, movimientos, {
                            id: `MOV-${baseMov}-${idx++}`,
                            fecha: new Date().toISOString(),
                            tipo_movimiento: "devolucion_venta",
                            origen: "pedido",
                            origen_id: pedidoId,
                            ref_tipo: "material",
                            ref_id: material.id,
                            material_id: material.id,
                            tipo: "entrada",
                            cantidad: cantidadComponente,
                            costo_unitario: parseFloat(material.costo_unitario || 0) || 0,
                            total: cantidadComponente * (parseFloat(material.costo_unitario || 0) || 0),
                            motivo: "Devolución de venta",
                            notas: "Producto devuelto por cliente"
                        });
                    }
                    if (!encontro) throw new Error(`El producto ${producto.nombre || producto.id} no tiene inventario asociado para registrar la devolución.`);
                } else {
                    // Fabricado: vuelve el PRODUCTO TERMINADO, nunca la receta de materiales.
                    const material = (App.state.inventario || []).find(m =>
                        String(m.nombre || "").trim().toLowerCase() === String(producto.nombre || "").trim().toLowerCase()
                    );
                    if (!material) throw new Error(`El producto terminado ${producto.nombre || producto.id} no existe en inventario.`);

                    const nuevoReal = (parseFloat(material.stock_real || 0) || 0) + cantidad;
                    operaciones.push({
                        action: "actualizar_fila",
                        nombreHoja: "materiales",
                        idFila: material.id,
                        datosNuevos: { stock_real: nuevoReal }
                    });
                    cambiosInventario.push({ material, nuevoReal });

                    agregarMovimiento(operaciones, movimientos, {
                        id: `MOV-${baseMov}-${idx++}`,
                        fecha: new Date().toISOString(),
                        tipo_movimiento: "devolucion_venta",
                        origen: "pedido",
                        origen_id: pedidoId,
                        ref_tipo: "material",
                        ref_id: material.id,
                        material_id: material.id,
                        tipo: "entrada",
                        cantidad,
                        costo_unitario: parseFloat(material.costo_unitario || 0) || 0,
                        total: cantidad * (parseFloat(material.costo_unitario || 0) || 0),
                        motivo: "Devolución de producto terminado",
                        notas: "Producto terminado devuelto por cliente"
                    });
                }
            }

            operaciones.push({
                action: "actualizar_fila",
                nombreHoja: "pedidos",
                idFila: pedidoId,
                datosNuevos: { estado: "devuelto" }
            });

            App.ui.showLoader("Registrando devolución...");
            const res = await App.api.fetch("ejecutar_lote", { operaciones });
            App.ui.hideLoader();
            if (res.status !== "success") throw new Error(res.message || "No se pudo registrar la devolución");

            pedido.estado = "devuelto";
            cambiosInventario.forEach(c => { c.material.stock_real = c.nuevoReal; });
            if (movimientos.length) {
                if (!Array.isArray(App.state.movimientos_inventario)) App.state.movimientos_inventario = [];
                App.state.movimientos_inventario.push(...movimientos);
            }
            App.ui.toast("Devolución registrada y producto reintegrado a inventario");
            App.router.handleRoute();
            App.logic.revisarAlertasStock();
            return true;
        } catch (error) {
            console.error("Error en devolverPedido:", error);
            App.ui.hideLoader();
            App.ui.toast(error.message || "Error al registrar devolución", "danger");
            return false;
        }
    };

    // Mantener historial: un pedido cancelado/devuelto tampoco se elimina.
    const eliminarOriginal = App.logic.eliminarPedido;
    if (typeof eliminarOriginal === "function" && !eliminarOriginal.__dmCancelacionGuard) {
        const eliminarSeguro = async function (pedidoId) {
            const pedido = obtenerPedido(pedidoId);
            const estado = normalizar(pedido?.estado);
            if (["cancelado", "devuelto"].includes(estado)) {
                App.ui.toast("No se puede eliminar un pedido cancelado o devuelto. El historial debe conservarse.", "warning");
                return false;
            }
            return eliminarOriginal.apply(this, arguments);
        };
        eliminarSeguro.__dmCancelacionGuard = true;
        App.logic.eliminarPedido = eliminarSeguro;
    }

    // --------------------------------------------------
    // Botones en el modal existente de pedidos.
    // No reemplazamos la vista: añadimos las acciones según el estado.
    // --------------------------------------------------
    function instalarBotonesModal() {
        const root = document.getElementById("sheet-content");
        if (!root || root.__dmCancelacionesObserver) return;

        const actualizar = () => {
            const texto = root.innerText || "";
            const match = texto.match(/PED-\d+/);
            if (!match) return;
            const pedido = obtenerPedido(match[0]);
            if (!pedido) return;

            const footer = Array.from(root.querySelectorAll("button"));
            if (!footer.length) return;

            const estado = normalizar(pedido.estado);
            const yaTieneCancelar = footer.some(b => b.dataset.dmCancelacion === "cancelar");
            const yaTieneDevolver = footer.some(b => b.dataset.dmCancelacion === "devolver");

            if (["nuevo", "taller", "en proceso"].includes(estado) && !yaTieneCancelar) {
                const btn = document.createElement("button");
                btn.className = "dm-btn dm-btn-secondary";
                btn.textContent = "🚫 Cancelar";
                btn.dataset.dmCancelacion = "cancelar";
                btn.onclick = () => App.logic.cancelarPedido(pedido.id);
                const eliminar = footer.find(b => /eliminar/i.test(b.textContent || ""));
                (eliminar?.parentElement || root).appendChild(btn);
            }

            if (estado === "entregado" && !yaTieneDevolver) {
                const btn = document.createElement("button");
                btn.className = "dm-btn dm-btn-secondary";
                btn.textContent = "↩️ Devolver";
                btn.dataset.dmCancelacion = "devolver";
                btn.onclick = () => App.logic.devolverPedido(pedido.id);
                const eliminar = footer.find(b => /eliminar/i.test(b.textContent || ""));
                (eliminar?.parentElement || root).appendChild(btn);
            }
        };

        const observer = new MutationObserver(actualizar);
        observer.observe(root, { childList: true, subtree: true });
        root.__dmCancelacionesObserver = observer;
        actualizar();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", instalarBotonesModal, { once: true });
    } else {
        instalarBotonesModal();
    }
})();
