// ==========================================
// LÓGICA DE NEGOCIO: TALLER Y PRODUCCIÓN
// ==========================================

window.App = window.App || {};
App.logic = App.logic || {};
App.logic.produccion = App.logic.produccion || {};

Object.assign(App.logic, {
    // ==========================================
    // 1. CAMBIAR ESTADO DE PRODUCCIÓN
    // ==========================================
    async cambiarEstadoProduccion(ordenId, nuevoEstado) {
        try {
            App.ui.showLoader("Actualizando estado...");

            const orden = (App.state.ordenes_produccion || []).find(o => o.id === ordenId);
            if (!orden) {
                App.ui.hideLoader();
                App.ui.toast("Orden no encontrada", "danger");
                return;
            }

            const dataToUpdate = { estado: nuevoEstado };
            const operaciones = [];
            const nuevosPagos = [];

            if (nuevoEstado === "proceso") {
                dataToUpdate.fecha_inicio = new Date().toISOString();
            }

            if (nuevoEstado === "listo") {
                dataToUpdate.fecha_fin = new Date().toISOString();

                // Generar deuda al artesano solo si hay pago estimado y artesano asignado
                if (orden.artesano_id && parseFloat(orden.pago_estimado || 0) > 0) {
                    const yaExistePago = (App.state.pago_artesanos || []).some(p => p.orden_id === ordenId);

                    if (!yaExistePago) {
                        const idPago = "PAGO-" + Date.now() + "-" + String(orden.tarifa_nombre || "Trabajo").replace(/\s+/g, "");
                        const nuevoPago = {
                            id: idPago,
                            artesano_id: orden.artesano_id,
                            orden_id: ordenId,
                            tipo_trabajo: orden.tarifa_nombre || "Trabajo",
                            monto_unitario: parseFloat(orden.pago_estimado || 0),
                            total: parseFloat(orden.pago_estimado || 0),
                            estado: "pendiente",
                            fecha: new Date().toISOString()
                        };

                        nuevosPagos.push(nuevoPago);

                        operaciones.push({
                            action: "guardar_fila",
                            nombreHoja: "pago_artesanos",
                            datos: nuevoPago
                        });
                    }
                }
            }

            operaciones.push({
                action: "actualizar_fila",
                nombreHoja: "ordenes_produccion",
                idFila: ordenId,
                datosNuevos: dataToUpdate
            });

            const res = await App.api.fetch("ejecutar_lote", { operaciones });
            App.ui.hideLoader();

            if (res.status === "success") {
                Object.assign(orden, dataToUpdate);

                if (!Array.isArray(App.state.pago_artesanos)) App.state.pago_artesanos = [];
                App.state.pago_artesanos.push(...nuevosPagos);

                App.ui.toast("Estado actualizado");
                App.router.handleRoute();
            } else {
                App.ui.toast(res.message || "Error al actualizar estado", "danger");
            }
        } catch (error) {
            console.error("Error en cambiarEstadoProduccion:", error);
            App.ui.hideLoader();
            App.ui.toast(error.message || "Error al actualizar estado", "danger");
        }
    },

    // ==========================================
    // 2. GUARDAR RECETA Y DESCONTAR INVENTARIO
    // ==========================================
    async guardarRecetaProduccion(ordenId, recetaArray) {
        try {
            App.ui.showLoader("Procesando taller...");

            const orden = (App.state.ordenes_produccion || []).find(o => o.id === ordenId);
            if (!orden) {
                App.ui.hideLoader();
                App.ui.toast("Orden no encontrada", "danger");
                return;
            }

            const detalle = (App.state.pedido_detalle || []).find(d => d.id === orden.pedido_detalle_id);
            const pedidoIdLigar = detalle ? detalle.pedido_id : ordenId;

            const hilosYaDescontados = (App.state.movimientos_inventario || []).some(m =>
                (m.origen_id === ordenId || m.origen_id === pedidoIdLigar) &&
                (m.tipo_movimiento === "salida_produccion" || m.motivo === "Envío a taller")
            );

            const recetaJson = JSON.stringify(recetaArray || []);
            const operaciones = [];
            const nuevosMovs = [];

            if (!hilosYaDescontados) {
                (recetaArray || []).forEach((item, idx) => {
                    const mat = (App.state.inventario || []).find(m => m.id === item.mat_id);
                    const cantDeducir = parseFloat(item.cant || 0);

                    if (!mat || cantDeducir <= 0) return;

                    const nuevoStockReal = parseFloat(mat.stock_real || 0) - cantDeducir;

                    operaciones.push({
                        action: "actualizar_fila",
                        nombreHoja: "materiales",
                        idFila: mat.id,
                        datosNuevos: { stock_real: nuevoStockReal }
                    });

                    const mov = {
                        id: "MOV-" + Date.now() + "-" + idx,
                        fecha: new Date().toISOString().split("T")[0],
                        tipo_movimiento: "salida_produccion",
                        origen: "pedido",
                        origen_id: pedidoIdLigar,
                        ref_tipo: "material",
                        ref_id: item.mat_id,
                        material_id: item.mat_id,
                        tipo: "salida",
                        cantidad: -cantDeducir,
                        costo_unitario: parseFloat(mat.costo_unitario || 0),
                        total: -(cantDeducir * parseFloat(mat.costo_unitario || 0)),
                        motivo: "Envío a taller",
                        notas: `Envío a taller de pedido ${pedidoIdLigar}`
                    };

                    nuevosMovs.push(mov);

                    operaciones.push({
                        action: "guardar_fila",
                        nombreHoja: "movimientos_inventario",
                        datos: mov
                    });
                });
            }

            operaciones.push({
                action: "actualizar_fila",
                nombreHoja: "ordenes_produccion",
                idFila: ordenId,
                datosNuevos: { receta_personalizada: recetaJson }
            });

            const res = await App.api.fetch("ejecutar_lote", { operaciones });
            App.ui.hideLoader();

            if (res.status === "success") {
                orden.receta_personalizada = recetaJson;

                if (!hilosYaDescontados) {
                    if (!Array.isArray(App.state.movimientos_inventario)) App.state.movimientos_inventario = [];

                    nuevosMovs.forEach(mov => {
                        const mat = (App.state.inventario || []).find(x => x.id === mov.material_id);
                        if (mat) {
                            mat.stock_real = parseFloat(mat.stock_real || 0) + parseFloat(mov.cantidad || 0);
                        }
                    });

                    App.state.movimientos_inventario.push(...nuevosMovs);
                }

                App.ui.toast(hilosYaDescontados
                    ? "Receta guardada (sin doble descuento)"
                    : "Inventario descontado y receta guardada");

                App.ui.closeSheet();
                App.router.handleRoute();
                App.logic.revisarAlertasStock();
            } else {
                App.ui.toast(res.message || "Error al guardar receta", "danger");
            }
        } catch (error) {
            console.error("Error en guardarRecetaProduccion:", error);
            App.ui.hideLoader();
            App.ui.toast(error.message || "Error al guardar receta", "danger");
        }
    },

    // ==========================================
    // 3. GENERAR ÓRDENES DESDE PEDIDO
    // ==========================================
    async generarOrdenesDesdePedido(detallesArray) {
        try {
            const operaciones = [];
            const nuevasOrdenes = [];

            (detallesArray || []).forEach((det, idx) => {
                const producto = (App.state.productos || []).find(p => p.id === det.producto_id);
                if (!producto) return;

                const recetaBase = [];

                for (let i = 1; i <= 20; i++) {
                    if (producto[`mat_${i}`]) {
                        recetaBase.push({
                            mat_id: producto[`mat_${i}`],
                            cant: producto[`cant_${i}`],
                            uso: producto[`uso_${i}`] || "Cuerpo"
                        });
                    }
                }

                const idOrden = "ORD-" + Date.now() + "-" + idx;

                const nuevaOrden = {
                    id: idOrden,
                    pedido_detalle_id: det.id,
                    estado: "pendiente",
                    receta_personalizada: JSON.stringify(recetaBase),
                    fecha_creacion: new Date().toISOString()
                };

                nuevasOrdenes.push(nuevaOrden);

                operaciones.push({
                    action: "guardar_fila",
                    nombreHoja: "ordenes_produccion",
                    datos: nuevaOrden
                });
            });

            if (operaciones.length === 0) {
                return { status: "success", data: [] };
            }

            const res = await App.api.fetch("ejecutar_lote", { operaciones });

            if (res.status === "success") {
                if (!Array.isArray(App.state.ordenes_produccion)) App.state.ordenes_produccion = [];
                App.state.ordenes_produccion.push(...nuevasOrdenes);
            }

            return res;
        } catch (error) {
            console.error("Error en generarOrdenesDesdePedido:", error);
            return {
                status: "error",
                message: error.message || "Error al generar órdenes de producción"
            };
        }
    }
});
