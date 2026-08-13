window.App = window.App || {};
App.compat = App.compat || {};

Object.assign(App.compat, {
    init() {
        if (!App.config?.ui?.enableCompatStyles) return;
        this.apply(document);
    },
    apply(root = document) {
        if (!root || typeof root.querySelectorAll !== "function") return;
        this.aliasClass(root, ".btn", "dm-btn");
        this.aliasClass(root, ".btn-primary", "dm-btn-primary");
        this.aliasClass(root, ".btn-secondary", "dm-btn-secondary");
        this.aliasClass(root, ".card", "dm-card");
        this.aliasClass(root, ".form-group", "dm-form-group");
        this.aliasClass(root, ".grid-2", "dm-grid-2");
        this.aliasClass(root, ".grid-3", "dm-grid-3");
    },
    aliasClass(root, selector, newClass) {
        root.querySelectorAll(selector).forEach(el => {
            if (!el.classList.contains(newClass)) el.classList.add(newClass);
        });
    }
});

// ==========================================================
// PRODUCCIÓN: INGRESO DE PRODUCTO TERMINADO PARA CLIENTE
// ==========================================================
// Producción ya ingresa producto terminado a inventario cuando
// el pedido es STOCK_INTERNO. Para pedidos de cliente también
// necesitamos ese ingreso para que la posterior entrega pueda
// descontar físicamente la pieza terminada.
(function instalarIngresoProductoTerminado() {
    if (!App.logic || typeof App.logic.cambiarEstadoProduccion !== "function") return;
    const original = App.logic.cambiarEstadoProduccion;
    if (original.__dmProductoTerminadoPatched) return;

    const patched = async function (ordenId, nuevoEstado) {
        const resultado = await original.apply(this, arguments);
        if (String(nuevoEstado || "").toLowerCase() !== "listo") return resultado;

        try {
            const orden = (App.state.ordenes_produccion || []).find(o => o.id === ordenId);
            const detalle = orden ? (App.state.pedido_detalle || []).find(d => d.id === orden.pedido_detalle_id) : null;
            const pedido = detalle ? (App.state.pedidos || []).find(p => p.id === detalle.pedido_id) : null;
            if (!orden || !detalle || !pedido || pedido.cliente_id === "STOCK_INTERNO") return resultado;

            const producto = (App.state.productos || []).find(p => p.id === detalle.producto_id);
            if (!producto) return resultado;

            const yaIngresado = (App.state.movimientos_inventario || []).some(m =>
                m.origen_id === ordenId && String(m.tipo_movimiento || "") === "entrada_produccion"
            );
            if (yaIngresado) return resultado;

            const cantidad = parseFloat(detalle.cantidad || 1) || 1;
            const nombre = String(producto.nombre || "").trim();
            let material = (App.state.inventario || []).find(m =>
                String(m.nombre || "").trim().toLowerCase() === nombre.toLowerCase()
            );

            const ahora = new Date().toISOString();
            const movId = `ENT-${Date.now()}-${String(ordenId).replace(/\W/g, "")}`;
            const operaciones = [];
            let nuevoMaterial = null;
            let nuevoStock = 0;

            if (material) {
                nuevoStock = (parseFloat(material.stock_real || 0) || 0) + cantidad;
                operaciones.push({
                    action: "actualizar_fila",
                    nombreHoja: "materiales",
                    idFila: material.id,
                    datosNuevos: { stock_real: nuevoStock }
                });
            } else {
                const nuevoId = `MAT-${Date.now()}-PROD`;
                nuevoMaterial = {
                    id: nuevoId,
                    nombre,
                    tipo: "reventa",
                    unidad: "Pzas",
                    stock_real: cantidad,
                    stock_minimo: 0,
                    stock_reservado: 0,
                    stock_comprometido: 0,
                    costo_unitario: 0
                };
                material = nuevoMaterial;
                operaciones.push({ action: "guardar_fila", nombreHoja: "materiales", datos: nuevoMaterial });
            }

            const movimiento = {
                id: movId,
                fecha: ahora,
                tipo_movimiento: "entrada_produccion",
                origen: "orden",
                origen_id: ordenId,
                ref_tipo: "material",
                ref_id: material.id,
                material_id: material.id,
                tipo: "entrada",
                cantidad,
                costo_unitario: parseFloat(material.costo_unitario || 0) || 0,
                total: cantidad * (parseFloat(material.costo_unitario || 0) || 0),
                motivo: `Ingreso de producto terminado por finalización de orden (${ordenId})`,
                notas: `Producto terminado disponible para entrega (${pedido.id})`
            };
            operaciones.push({ action: "guardar_fila", nombreHoja: "movimientos_inventario", datos: movimiento });

            const res = await App.api.fetch("ejecutar_lote", { operaciones });
            if (res.status !== "success") {
                throw new Error(res.message || "No se pudo ingresar el producto terminado a inventario");
            }

            if (nuevoMaterial) {
                if (!Array.isArray(App.state.inventario)) App.state.inventario = [];
                App.state.inventario.push(nuevoMaterial);
            } else if (material) {
                material.stock_real = nuevoStock;
            }
            if (!Array.isArray(App.state.movimientos_inventario)) App.state.movimientos_inventario = [];
            App.state.movimientos_inventario.push(movimiento);
        } catch (error) {
            console.error("Error ingresando producto terminado:", error);
            App.ui.toast(error.message || "La producción terminó, pero no se pudo ingresar el producto terminado a inventario", "danger");
        }

        return resultado;
    };

    patched.__dmProductoTerminadoPatched = true;
    App.logic.cambiarEstadoProduccion = patched;
})();

// ==========================================================
// PEDIDOS: ENTREGA FÍSICA
// ==========================================================
App.logic.marcarPedidoEntregado = async function (pedidoId) {
    try {
        const pedido = (App.state.pedidos || []).find(p => p.id === pedidoId);
        const detalles = (App.state.pedido_detalle || []).filter(d => d.pedido_id === pedidoId);
        if (!pedido || !detalles.length) {
            App.ui.toast("No se encontró el pedido o sus detalles", "danger");
            return false;
        }

        const estado = String(pedido.estado || "").toLowerCase().trim();
        if (estado === "entregado") {
            App.ui.toast("El pedido ya está entregado", "warning");
            return false;
        }

        const items = detalles.map(detalle => ({
            detalle,
            producto: (App.state.productos || []).find(p => p.id === detalle.producto_id)
        }));
        if (items.some(x => !x.producto)) {
            App.ui.toast("No se encontró uno de los productos del pedido", "danger");
            return false;
        }

        // Fabricación: todos los detalles fabricados deben tener sus órdenes listas.
        const ordenesPedido = (App.state.ordenes_produccion || []).filter(o =>
            detalles.some(d => d.id === o.pedido_detalle_id)
        );
        const fabricados = items.filter(x => String(x.producto.categoria || "").toLowerCase().trim() !== "reventa");
        const fabricacionLista = fabricados.length > 0 && fabricados.every(item => {
            const ordenes = ordenesPedido.filter(o => o.pedido_detalle_id === item.detalle.id);
            return ordenes.length > 0 && ordenes.every(o => String(o.estado || "").toLowerCase().trim() === "listo");
        });
        const todosReventa = fabricados.length === 0;

        if (!todosReventa && !fabricacionLista) {
            App.ui.toast("El pedido todavía no está listo para entregar", "warning");
            return false;
        }

        if (!confirm("¿Confirmar entrega física del pedido?\n\nEsta acción descontará de bodega lo que corresponda.")) return false;

        const operaciones = [];
        const movimientos = [];
        const cambiosInventario = [];
        const ahora = new Date().toISOString();
        const baseMov = Date.now();
        let movIndex = 0;

        for (const item of items) {
            const producto = item.producto;
            const cantidadPedido = parseFloat(item.detalle.cantidad || 1) || 1;
            const esReventa = String(producto.categoria || "").toLowerCase().trim() === "reventa";
            let material;
            let cantidadSalida = cantidadPedido;

            if (esReventa) {
                // Reventa: el producto se vincula al inventario por mat_1..mat_20.
                let encontro = false;
                for (let i = 1; i <= 20; i++) {
                    const matId = producto[`mat_${i}`];
                    const cantidad = (parseFloat(producto[`cant_${i}`] || 0) || 0) * cantidadPedido;
                    if (!matId || cantidad <= 0) continue;

                    material = (App.state.inventario || []).find(m => m.id === matId);
                    if (!material) throw new Error(`No se encontró el inventario asociado a ${producto.nombre || producto.id}.`);
                    encontro = true;

                    const stockReal = parseFloat(material.stock_real || 0) || 0;
                    const reservado = parseFloat(material.stock_reservado || 0) || 0;
                    if (stockReal < cantidad) throw new Error(`Stock insuficiente para ${material.nombre || producto.nombre}. Disponible: ${stockReal}, requerido: ${cantidad}.`);

                    const nuevoReal = stockReal - cantidad;
                    const nuevoReservado = Math.max(0, reservado - cantidad);
                    operaciones.push({ action: "actualizar_fila", nombreHoja: "materiales", idFila: material.id, datosNuevos: { stock_real: nuevoReal, stock_reservado: nuevoReservado } });
                    cambiosInventario.push({ material, nuevoReal, nuevoReservado });

                    const mov = {
                        id: `MOV-${baseMov}-${movIndex++}`,
                        fecha: ahora,
                        tipo_movimiento: "salida_venta",
                        origen: "pedido",
                        origen_id: pedidoId,
                        ref_tipo: "material",
                        ref_id: material.id,
                        material_id: material.id,
                        tipo: "salida",
                        cantidad: -cantidad,
                        costo_unitario: parseFloat(material.costo_unitario || 0) || 0,
                        total: -(cantidad * (parseFloat(material.costo_unitario || 0) || 0)),
                        motivo: "Entrega física al cliente",
                        notas: "Entrega física al cliente"
                    };
                    movimientos.push(mov);
                    operaciones.push({ action: "guardar_fila", nombreHoja: "movimientos_inventario", datos: mov });
                }
                if (!encontro) throw new Error(`El producto ${producto.nombre || producto.id} no tiene inventario asociado para descontar.`);
            } else {
                // Fabricado: descontamos el producto terminado, NO la receta de materias primas.
                material = (App.state.inventario || []).find(m =>
                    String(m.nombre || "").trim().toLowerCase() === String(producto.nombre || "").trim().toLowerCase()
                );
                if (!material) throw new Error(`El producto terminado ${producto.nombre || producto.id} no existe en inventario.`);

                const stockReal = parseFloat(material.stock_real || 0) || 0;
                const reservado = parseFloat(material.stock_reservado || 0) || 0;
                if (stockReal < cantidadSalida) throw new Error(`Stock insuficiente de producto terminado ${material.nombre}. Disponible: ${stockReal}, requerido: ${cantidadSalida}.`);

                const nuevoReal = stockReal - cantidadSalida;
                const nuevoReservado = Math.max(0, reservado - cantidadSalida);
                operaciones.push({ action: "actualizar_fila", nombreHoja: "materiales", idFila: material.id, datosNuevos: { stock_real: nuevoReal, stock_reservado: nuevoReservado } });
                cambiosInventario.push({ material, nuevoReal, nuevoReservado });

                const mov = {
                    id: `MOV-${baseMov}-${movIndex++}`,
                    fecha: ahora,
                    tipo_movimiento: "salida_venta",
                    origen: "pedido",
                    origen_id: pedidoId,
                    ref_tipo: "material",
                    ref_id: material.id,
                    material_id: material.id,
                    tipo: "salida",
                    cantidad: -cantidadSalida,
                    costo_unitario: parseFloat(material.costo_unitario || 0) || 0,
                    total: -(cantidadSalida * (parseFloat(material.costo_unitario || 0) || 0)),
                    motivo: "Entrega física de producto terminado",
                    notas: "Entrega física de producto terminado"
                };
                movimientos.push(mov);
                operaciones.push({ action: "guardar_fila", nombreHoja: "movimientos_inventario", datos: mov });
            }
        }

        operaciones.push({ action: "actualizar_fila", nombreHoja: "pedidos", idFila: pedidoId, datosNuevos: { estado: "entregado" } });
        App.ui.showLoader("Registrando entrega...");
        const res = await App.api.fetch("ejecutar_lote", { operaciones });
        App.ui.hideLoader();
        if (res.status !== "success") {
            App.ui.toast(res.message || "Error al registrar la entrega", "danger");
            return false;
        }

        pedido.estado = "entregado";
        cambiosInventario.forEach(c => { c.material.stock_real = c.nuevoReal; c.material.stock_reservado = c.nuevoReservado; });
        if (movimientos.length) {
            if (!Array.isArray(App.state.movimientos_inventario)) App.state.movimientos_inventario = [];
            App.state.movimientos_inventario.push(...movimientos);
        }
        App.ui.toast("Pedido entregado y salida de bodega registrada");
        App.router.handleRoute();
        App.logic.revisarAlertasStock();
        return true;
    } catch (error) {
        console.error("Error en marcarPedidoEntregado:", error);
        App.ui.hideLoader();
        App.ui.toast(error.message || "Error al registrar la entrega", "danger");
        return false;
    }
};

// ==========================================================
// PEDIDOS: ELIMINACIÓN SEGURA
// ==========================================================
App.logic.eliminarPedido = async function (pedidoId) {
    try {
        const pedido = (App.state.pedidos || []).find(p => p.id === pedidoId);
        if (!pedido) { App.ui.toast("Pedido no encontrado", "danger"); return false; }

        const estado = String(pedido.estado || "").toLowerCase().trim();
        if (["listo para entregar", "pagado", "entregado"].includes(estado)) {
            App.ui.toast(
                estado === "entregado"
                    ? "No se puede eliminar un pedido ya entregado. Debe manejarse como devolución/cancelación."
                    : "No se puede eliminar un pedido que ya está listo, pagado o en entrega.",
                "warning"
            );
            return false;
        }
        if (!confirm("⚠️ ¿Eliminar pedido por completo?\n\nSe liberarán las reservas de inventario y se eliminarán sus registros asociados.")) return false;

        App.ui.showLoader("Procesando eliminación...");
        const detalles = (App.state.pedido_detalle || []).filter(d => d.pedido_id === pedidoId);
        const ordenes = (App.state.ordenes_produccion || []).filter(o => detalles.some(d => d.id === o.pedido_detalle_id));
        if (ordenes.some(o => ["proceso", "listo"].includes(String(o.estado || "").toLowerCase().trim()))) {
            App.ui.hideLoader();
            App.ui.toast("No se puede eliminar: la orden de Taller ya inició o terminó. Primero debe cancelarse/revertirse la producción.", "warning");
            return false;
        }

        const operaciones = [];
        const reversas = [];
        const cambiosInventario = [];
        const ahora = new Date().toISOString();
        const baseMov = Date.now();
        let movIndex = 0;

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
                const reservado = parseFloat(material.stock_reservado || 0) || 0;
                const nuevoReservado = Math.max(0, reservado - cantidad);
                operaciones.push({ action: "actualizar_fila", nombreHoja: "materiales", idFila: material.id, datosNuevos: { stock_reservado: nuevoReservado } });
                cambiosInventario.push({ material, nuevoReservado });
                const mov = {
                    id: `MOV-${baseMov}-${movIndex++}`,
                    fecha: ahora,
                    tipo_movimiento: "reversa_reserva_venta",
                    origen: "pedido",
                    origen_id: pedidoId,
                    ref_tipo: "material",
                    ref_id: material.id,
                    material_id: material.id,
                    tipo: "entrada",
                    cantidad,
                    costo_unitario: parseFloat(material.costo_unitario || 0) || 0,
                    total: cantidad * (parseFloat(material.costo_unitario || 0) || 0),
                    motivo: "Liberación de apartado por eliminación de pedido",
                    notas: "Liberación de apartado por eliminación de pedido"
                };
                reversas.push(mov);
                operaciones.push({ action: "guardar_fila", nombreHoja: "movimientos_inventario", datos: mov });
            }
        }

        operaciones.push({ action: "eliminar_fila", nombreHoja: "pedidos", idFila: pedidoId });
        detalles.forEach(d => operaciones.push({ action: "eliminar_fila", nombreHoja: "pedido_detalle", idFila: d.id }));
        ordenes.forEach(o => {
            operaciones.push({ action: "eliminar_fila", nombreHoja: "ordenes_produccion", idFila: o.id });
            (App.state.pago_artesanos || []).filter(p => p.orden_id === o.id).forEach(p => operaciones.push({ action: "eliminar_fila", nombreHoja: "pago_artesanos", idFila: p.id }));
        });
        (App.state.abonos || []).filter(a => a.pedido_id === pedidoId).forEach(a => operaciones.push({ action: "eliminar_fila", nombreHoja: "abonos_clientes", idFila: a.id }));

        const res = await App.api.fetch("ejecutar_lote", { operaciones });
        App.ui.hideLoader();
        if (res.status !== "success") throw new Error(res.message || "Error al eliminar pedido");

        cambiosInventario.forEach(c => { c.material.stock_reservado = c.nuevoReservado; });
        App.state.pedidos = (App.state.pedidos || []).filter(p => p.id !== pedidoId);
        App.state.pedido_detalle = (App.state.pedido_detalle || []).filter(d => d.pedido_id !== pedidoId);
        App.state.ordenes_produccion = (App.state.ordenes_produccion || []).filter(o => !ordenes.some(x => x.id === o.id));
        App.state.pago_artesanos = (App.state.pago_artesanos || []).filter(p => !ordenes.some(x => x.id === p.orden_id));
        App.state.abonos = (App.state.abonos || []).filter(a => a.pedido_id !== pedidoId);
        if (reversas.length) {
            if (!Array.isArray(App.state.movimientos_inventario)) App.state.movimientos_inventario = [];
            App.state.movimientos_inventario.push(...reversas);
        }
        App.ui.toast("Pedido eliminado y apartados liberados correctamente");
        App.router.handleRoute();
        App.logic.revisarAlertasStock();
        return true;
    } catch (error) {
        console.error("Error en eliminarPedido:", error);
        App.ui.hideLoader();
        App.ui.toast(error.message || "Error al eliminar pedido", "danger");
        return false;
    }
};

// ==========================================================
// PEDIDOS: BOTÓN ENTREGAR EN EL MODAL
// ==========================================================
(function instalarAccionEntregaPedidos() {
    if (!App.views || typeof App.views.modalDetallesPedido !== "function") return;
    const original = App.views.modalDetallesPedido;
    if (original.__dmEntregaPatched) return;

    const patched = function (pedidoId) {
        const resultado = original.apply(this, arguments);
        setTimeout(() => {
            try {
                const pedido = (App.state.pedidos || []).find(p => p.id === pedidoId);
                const detalles = (App.state.pedido_detalle || []).filter(d => d.pedido_id === pedidoId);
                const sheet = document.getElementById("sheet-content");
                if (!pedido || !detalles.length || !sheet) return;

                const estado = String(pedido.estado || "").toLowerCase().trim();
                const items = detalles.map(d => ({ detalle: d, producto: (App.state.productos || []).find(p => p.id === d.producto_id) }));
                if (items.some(x => !x.producto)) return;

                const fabricados = items.filter(x => String(x.producto.categoria || "").toLowerCase().trim() !== "reventa");
                const ordenes = (App.state.ordenes_produccion || []).filter(o => detalles.some(d => d.id === o.pedido_detalle_id));
                const fabricacionLista = fabricados.length > 0 && fabricados.every(x => {
                    const os = ordenes.filter(o => o.pedido_detalle_id === x.detalle.id);
                    return os.length > 0 && os.every(o => String(o.estado || "").toLowerCase().trim() === "listo");
                });
                const todosReventa = fabricados.length === 0;
                const puedeEntregar = estado !== "entregado" && (todosReventa || fabricacionLista);

                const botones = Array.from(sheet.querySelectorAll("button"));
                const botonEliminar = botones.find(b => String(b.textContent || "").includes("🗑️ Eliminar"));
                const yaExisteEntrega = botones.some(b => String(b.textContent || "").includes("🚚 Entregar"));

                if (puedeEntregar && !yaExisteEntrega && botonEliminar) {
                    const boton = document.createElement("button");
                    boton.type = "button";
                    boton.className = "dm-btn dm-btn-secondary dm-btn-sm";
                    boton.textContent = "🚚 Entregar";
                    boton.onclick = () => App.views.accionPedido(boton, pedidoId, "marcarEntregado");
                    botonEliminar.parentNode.insertBefore(boton, botonEliminar);
                }

                if (estado === "entregado" && botonEliminar) botonEliminar.style.display = "none";
            } catch (error) {
                console.warn("No se pudo ajustar las acciones del pedido:", error);
            }
        }, 80);
        return resultado;
    };

    patched.__dmEntregaPatched = true;
    App.views.modalDetallesPedido = patched;
})();
