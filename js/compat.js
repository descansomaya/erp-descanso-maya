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
            if (!el.classList.contains(newClass)) {
                el.classList.add(newClass);
            }
        });
    }
});

// Compatibilidad temporal: la acción "Entregado" de Pedidos debe representar
// la salida física de Bodega. El pago no controla la salida de inventario.
// Se mantiene aquí para no tocar la lógica histórica de Pedidos hasta validar
// el flujo completo de Reventa + Taller.
App.logic.marcarPedidoEntregado = async function (pedidoId) {
    try {
        const pedido = (App.state.pedidos || []).find(p => p.id === pedidoId);
        const detalles = (App.state.pedido_detalle || []).filter(d => d.pedido_id === pedidoId);

        if (!pedido || detalles.length === 0) {
            App.ui.toast("No se encontró el pedido o sus detalles", "danger");
            return false;
        }

        const estado = String(pedido.estado || "").toLowerCase().trim();
        if (estado === "entregado") {
            App.ui.toast("El pedido ya está entregado", "warning");
            return false;
        }

        const productos = detalles.map(detalle => ({
            detalle,
            producto: (App.state.productos || []).find(p => p.id === detalle.producto_id)
        }));

        if (productos.some(x => !x.producto)) {
            App.ui.toast("No se encontró uno de los productos del pedido", "danger");
            return false;
        }

        const esReventa = productos.every(x => String(x.producto.categoria || "").toLowerCase() === "reventa");

        // Los pedidos fabricados solo pueden entregarse cuando Producción los marca como listos.
        // En esos pedidos el consumo de materiales ya ocurrió durante el proceso de Taller.
        if (!esReventa && estado !== "listo para entregar") {
            App.ui.toast("El pedido todavía no está listo para entregar", "warning");
            return false;
        }

        if (!confirm("¿Confirmar entrega física del pedido?\n\nEsta acción descontará de bodega lo que corresponda.")) {
            return false;
        }

        const operaciones = [];
        const movimientos = [];
        const cambiosInventario = [];
        const ahora = new Date().toISOString();
        const baseMov = Date.now();
        let movIndex = 0;

        if (esReventa) {
            for (const item of productos) {
                const cantidadPedido = parseInt(item.detalle.cantidad, 10) || 1;
                let encontroInventario = false;

                for (let i = 1; i <= 20; i++) {
                    const matId = item.producto[`mat_${i}`];
                    const cantidad = (parseFloat(item.producto[`cant_${i}`] || 0) || 0) * cantidadPedido;
                    if (!matId || cantidad <= 0) continue;

                    const material = (App.state.inventario || []).find(m => m.id === matId);
                    if (!material) {
                        throw new Error(`No se encontró el inventario asociado a ${item.producto.nombre || item.producto.id}.`);
                    }

                    encontroInventario = true;
                    const stockReal = parseFloat(material.stock_real || 0) || 0;
                    const stockReservado = parseFloat(material.stock_reservado || 0) || 0;

                    if (stockReal < cantidad) {
                        throw new Error(`Stock insuficiente para ${material.nombre || item.producto.nombre}. Disponible: ${stockReal}, requerido: ${cantidad}.`);
                    }

                    const nuevoReal = stockReal - cantidad;
                    const nuevoReservado = Math.max(0, stockReservado - cantidad);

                    operaciones.push({
                        action: "actualizar_fila",
                        nombreHoja: "materiales",
                        idFila: material.id,
                        datosNuevos: {
                            stock_real: nuevoReal,
                            stock_reservado: nuevoReservado
                        }
                    });

                    cambiosInventario.push({ material, nuevoReal, nuevoReservado });

                    const movimiento = {
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

                    movimientos.push(movimiento);
                    operaciones.push({
                        action: "guardar_fila",
                        nombreHoja: "movimientos_inventario",
                        datos: movimiento
                    });
                }

                if (!encontroInventario) {
                    throw new Error(`El producto ${item.producto.nombre || item.producto.id} no tiene inventario asociado para descontar.`);
                }
            }
        }

        operaciones.push({
            action: "actualizar_fila",
            nombreHoja: "pedidos",
            idFila: pedidoId,
            datosNuevos: { estado: "entregado" }
        });

        App.ui.showLoader("Registrando entrega...");
        const res = await App.api.fetch("ejecutar_lote", { operaciones });
        App.ui.hideLoader();

        if (res.status !== "success") {
            App.ui.toast(res.message || "Error al registrar la entrega", "danger");
            return false;
        }

        pedido.estado = "entregado";

        cambiosInventario.forEach(cambio => {
            cambio.material.stock_real = cambio.nuevoReal;
            cambio.material.stock_reservado = cambio.nuevoReservado;
        });

        if (movimientos.length > 0) {
            if (!Array.isArray(App.state.movimientos_inventario)) {
                App.state.movimientos_inventario = [];
            }
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
