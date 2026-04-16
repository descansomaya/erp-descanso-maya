window.App = window.App || {};
App.logic = App.logic || {};
App.logic.produccion = App.logic.produccion || {};

Object.assign(App.logic, {
    // ==========================================
    // HELPERS INTERNOS DE PRODUCCIÓN
    // ==========================================
    obtenerOrdenProduccion(ordenId) {
        return (App.state?.ordenes_produccion || []).find(o => o.id === ordenId) || null;
    },

    obtenerDetalleDeOrden(orden) {
        if (!orden) return null;
        return (App.state?.pedido_detalle || []).find(d => d.id === orden.pedido_detalle_id) || null;
    },

    obtenerRecetaOrden(orden) {
        if (!orden) return [];

        try {
            const receta = JSON.parse(orden.receta_personalizada || "[]");
            return Array.isArray(receta) ? receta : [];
        } catch (e) {
            return [];
        }
    },

    obtenerTarifaArtesanoPorId(tarifaId) {
        return (App.state?.tarifas_artesano || []).find(t => t.id === tarifaId) || null;
    },

    calcularBaseTarifaDesdeReceta(receta, aplicaA = "total") {
        const recetaSegura = Array.isArray(receta) ? receta : [];

        if (aplicaA === "total") {
            return recetaSegura.reduce((acc, item) => acc + (parseFloat(item.cant || 0) || 0), 0);
        }

        return recetaSegura
            .filter(item => String(item.uso || "").toLowerCase() === String(aplicaA || "").toLowerCase())
            .reduce((acc, item) => acc + (parseFloat(item.cant || 0) || 0), 0);
    },

    calcularPagoArtesanoDesdeTarifa(orden, tarifaId) {
        const tarifa = this.obtenerTarifaArtesanoPorId(tarifaId);
        if (!tarifa) {
            return {
                tarifa: null,
                monto_unitario: 0,
                base_calculo: 1,
                total: 0,
                modo_calculo: "fijo",
                aplica_a: "total"
            };
        }

        const monto = parseFloat(tarifa.monto || 0) || 0;
        const modoCalculo = String(tarifa.modo_calculo || "fijo").trim() || "fijo";
        const aplicaA = String(tarifa.aplica_a || "total").trim() || "total";
        const receta = this.obtenerRecetaOrden(orden);

        let baseCalculo = 1;
        let total = monto;

        if (modoCalculo === "por_unidad") {
            baseCalculo = this.calcularBaseTarifaDesdeReceta(receta, aplicaA);
            total = monto * baseCalculo;
        }

        return {
            tarifa,
            monto_unitario: monto,
            base_calculo: baseCalculo,
            total,
            modo_calculo: modoCalculo,
            aplica_a: aplicaA
        };
    },

    // ==========================================
    // 1. CAMBIAR ESTADO DE PRODUCCIÓN
    // ==========================================
    async cambiarEstadoProduccion(ordenId, nuevoEstado) {
    try {
        App.ui.showLoader("Actualizando estado...");

        const orden = this.obtenerOrdenProduccion
            ? this.obtenerOrdenProduccion(ordenId)
            : (App.state?.ordenes_produccion || []).find(o => o.id === ordenId);

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

            const asignacionesActivas = (App.state?.ordenes_produccion_artesanos || [])
                .filter(a =>
                    a.orden_id === ordenId &&
                    String(a.estado || "activo").toLowerCase() !== "cancelado"
                );

            asignacionesActivas.forEach((asig, idx) => {
                const totalAsignacion = parseFloat(asig.pago_estimado || 0) || 0;
                if (totalAsignacion <= 0 || !asig.artesano_id) return;

                const yaExistePago = (App.state?.pago_artesanos || []).some(p =>
                    p.orden_id === ordenId &&
                    p.artesano_id === asig.artesano_id &&
                    String(p.tipo_trabajo || "") === String(asig.tipo_trabajo || asig.tarifa_nombre || "") &&
                    String(p.componente || "") === String(asig.componente || "")
                );

                if (yaExistePago) return;

                const idPago =
                    "PAGO-" +
                    Date.now() +
                    "-" +
                    idx +
                    "-" +
                    String(asig.artesano_id || "").replace(/\s+/g, "");

                const nuevoPago = {
                    id: idPago,
                    artesano_id: asig.artesano_id,
                    orden_id: ordenId,
                    tipo_trabajo: asig.tipo_trabajo || asig.tarifa_nombre || "Trabajo",
                    componente: asig.componente || "Total",
                    monto_unitario: parseFloat(asig.monto_tarifa_apl || 0) || 0,
                    base_calculo: parseFloat(asig.factor_participac || 1) || 1,
                    modo_calculo: asig.esquema_pago || "fijo",
                    aplica_a: asig.componente || "Total",
                    total: totalAsignacion,
                    estado: "pendiente",
                    fecha: new Date().toISOString()
                };

                nuevosPagos.push(nuevoPago);

                operaciones.push({
                    action: "guardar_fila",
                    nombreHoja: "pago_artesanos",
                    datos: nuevoPago
                });
            });
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

            if (!Array.isArray(App.state.pago_artesanos)) {
                App.state.pago_artesanos = [];
            }

            App.state.pago_artesanos.push(...nuevosPagos);

            App.ui.toast(
                nuevoEstado === "listo" && nuevosPagos.length > 0
                    ? `Orden finalizada y ${nuevosPagos.length} pago(s) generado(s)`
                    : "Estado actualizado"
            );

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

            const orden = this.obtenerOrdenProduccion(ordenId);
            if (!orden) {
                App.ui.hideLoader();
                App.ui.toast("Orden no encontrada", "danger");
                return;
            }

            const detalle = this.obtenerDetalleDeOrden(orden);
            const pedidoIdLigar = detalle ? detalle.pedido_id : ordenId;

            const hilosYaDescontados = (App.state?.movimientos_inventario || []).some(m =>
                (m.origen_id === ordenId || m.origen_id === pedidoIdLigar) &&
                (m.tipo_movimiento === "salida_produccion" || m.motivo === "Envío a taller")
            );

            const recetaLimpia = Array.isArray(recetaArray) ? recetaArray.filter(item =>
                item &&
                item.mat_id &&
                (parseFloat(item.cant || 0) || 0) > 0
            ) : [];

            const recetaJson = JSON.stringify(recetaLimpia);
            const operaciones = [];
            const nuevosMovs = [];

            if (!hilosYaDescontados) {
                recetaLimpia.forEach((item, idx) => {
                    const mat = (App.state?.inventario || []).find(m => m.id === item.mat_id);
                    const cantDeducir = parseFloat(item.cant || 0) || 0;

                    if (!mat || cantDeducir <= 0) return;

                    const stockActual = parseFloat(mat.stock_real || 0) || 0;
                    const nuevoStockReal = stockActual - cantDeducir;

                    operaciones.push({
                        action: "actualizar_fila",
                        nombreHoja: "materiales",
                        idFila: mat.id,
                        datosNuevos: { stock_real: nuevoStockReal }
                    });

                    const costoUnitario = parseFloat(mat.costo_unitario || 0) || 0;

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
                        costo_unitario: costoUnitario,
                        total: -(cantDeducir * costoUnitario),
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

            const datosOrdenUpdate = {
                receta_personalizada: recetaJson
            };

            // Si la orden ya tiene tarifa asignada, recalcula el pago automáticamente
            if (orden.tarifa_artesano_id) {
                const calculoPago = this.calcularPagoArtesanoDesdeTarifa(
                    { ...orden, receta_personalizada: recetaJson },
                    orden.tarifa_artesano_id
                );

                datosOrdenUpdate.pago_estimado = calculoPago.total;
                datosOrdenUpdate.monto_unitario_artesano = calculoPago.monto_unitario;
                datosOrdenUpdate.base_calculo_artesano = calculoPago.base_calculo;
                datosOrdenUpdate.modo_calculo_artesano = calculoPago.modo_calculo;
                datosOrdenUpdate.aplica_a_artesano = calculoPago.aplica_a;
            }

            operaciones.push({
                action: "actualizar_fila",
                nombreHoja: "ordenes_produccion",
                idFila: ordenId,
                datosNuevos: datosOrdenUpdate
            });

            const res = await App.api.fetch("ejecutar_lote", { operaciones });
            App.ui.hideLoader();

            if (res.status === "success") {
                Object.assign(orden, datosOrdenUpdate);

                if (!hilosYaDescontados) {
                    if (!Array.isArray(App.state.movimientos_inventario)) {
                        App.state.movimientos_inventario = [];
                    }

                    nuevosMovs.forEach(mov => {
                        const mat = (App.state?.inventario || []).find(x => x.id === mov.material_id);
                        if (mat) {
                            mat.stock_real = (parseFloat(mat.stock_real || 0) || 0) + (parseFloat(mov.cantidad || 0) || 0);
                        }
                    });

                    App.state.movimientos_inventario.push(...nuevosMovs);
                }

                App.ui.toast(
                    hilosYaDescontados
                        ? "Receta guardada (sin doble descuento)"
                        : "Inventario descontado y receta guardada"
                );

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
    // 3. ACTUALIZAR ASIGNACIÓN DE ARTESANO Y TARIFA
    // ==========================================
    async guardarAsignacionProduccion(ordenId, data) {
        try {
            App.ui.showLoader("Guardando asignación...");

            const orden = this.obtenerOrdenProduccion(ordenId);
            if (!orden) {
                App.ui.hideLoader();
                App.ui.toast("Orden no encontrada", "danger");
                return;
            }

            const datosFinales = {
                artesano_id: data.artesano_id || "",
                tarifa_artesano_id: data.tarifa_artesano_id || "",
                tarifa_nombre: data.tarifa_nombre || "",
                pago_estimado: 0,
                monto_unitario_artesano: 0,
                base_calculo_artesano: 1,
                modo_calculo_artesano: "fijo",
                aplica_a_artesano: "total"
            };

            if (datosFinales.tarifa_artesano_id) {
                const calculoPago = this.calcularPagoArtesanoDesdeTarifa(orden, datosFinales.tarifa_artesano_id);

                datosFinales.pago_estimado = calculoPago.total;
                datosFinales.monto_unitario_artesano = calculoPago.monto_unitario;
                datosFinales.base_calculo_artesano = calculoPago.base_calculo;
                datosFinales.modo_calculo_artesano = calculoPago.modo_calculo;
                datosFinales.aplica_a_artesano = calculoPago.aplica_a;

                if (!datosFinales.tarifa_nombre && calculoPago.tarifa) {
                    datosFinales.tarifa_nombre = calculoPago.tarifa.clasificacion || "Trabajo";
                }
            }

            const res = await App.api.fetch("actualizar_fila", {
                nombreHoja: "ordenes_produccion",
                idFila: ordenId,
                datosNuevos: datosFinales
            });

            App.ui.hideLoader();

            if (res.status === "success") {
                Object.assign(orden, datosFinales);
                App.ui.toast("Asignación guardada con éxito");
                App.ui.closeSheet();
                App.router.handleRoute();
            } else {
                App.ui.toast(res.message || "Error al guardar asignación", "danger");
            }
        } catch (error) {
            console.error("Error en guardarAsignacionProduccion:", error);
            App.ui.hideLoader();
            App.ui.toast(error.message || "Error al guardar asignación", "danger");
        }
    },

async guardarAsignacionMultiArtesano(data) {
    try {
        App.ui.showLoader("Guardando asignación...");

        const ordenId = data.orden_id;
        const orden = (App.state?.ordenes_produccion || []).find(o => o.id === ordenId);
        if (!orden) {
            App.ui.hideLoader();
            App.ui.toast("Orden no encontrada", "danger");
            return;
        }

        const tarifa = (App.state?.tarifas_artesano || []).find(t => t.id === data.tarifa_artesano_id);
        if (!tarifa) {
            App.ui.hideLoader();
            App.ui.toast("Tarifa no encontrada", "danger");
            return;
        }

        const receta = (() => {
            try {
                const r = JSON.parse(orden.receta_personalizada || "[]");
                return Array.isArray(r) ? r : [];
            } catch (e) {
                return [];
            }
        })();

        const esquemaPago = tarifa.modo_calculo || "fijo";
        const componente = data.componente || tarifa.aplica_a || "total";
        const montoTarifa = parseFloat(tarifa.monto || 0) || 0;

        let factorParticipac = 1;

        if (esquemaPago === "por_unidad") {
            if (String(componente).toLowerCase() === "total") {
                factorParticipac = receta.reduce((acc, item) => acc + (parseFloat(item.cant || 0) || 0), 0);
            } else {
                factorParticipac = receta
                    .filter(item => String(item.uso || "").toLowerCase() === String(componente).toLowerCase())
                    .reduce((acc, item) => acc + (parseFloat(item.cant || 0) || 0), 0);
            }
        }

        const pagoEstimado = montoTarifa * factorParticipac;

        const nuevaAsignacion = {
            id: "OPA-" + Date.now(),
            orden_id: ordenId,
            artesano_id: data.artesano_id || "",
            tarifa_artesano_id: data.tarifa_artesano_id || "",
            tarifa_nombre: tarifa.clasificacion || "Trabajo",
            tipo_trabajo: tarifa.clasificacion || "Trabajo",
            componente: componente,
            esquema_pago: esquemaPago,
            monto_tarifa_apl: montoTarifa,
            factor_participac: factorParticipac,
            pago_estimado: pagoEstimado,
            estado: "activo",
            fecha_creacion: new Date().toISOString()
        };

        const res = await App.api.fetch("guardar_fila", {
            nombreHoja: "ordenes_produccion_artesanos",
            datos: nuevaAsignacion
        });

        App.ui.hideLoader();

        if (res.status === "success") {
            if (!Array.isArray(App.state.ordenes_produccion_artesanos)) {
                App.state.ordenes_produccion_artesanos = [];
            }

            App.state.ordenes_produccion_artesanos.push(nuevaAsignacion);
            App.ui.toast("Asignación guardada");
            App.ui.closeSheet();
            App.router.handleRoute();
        } else {
            App.ui.toast(res.message || "Error al guardar asignación", "danger");
        }
    } catch (error) {
        console.error("Error en guardarAsignacionMultiArtesano:", error);
        App.ui.hideLoader();
        App.ui.toast(error.message || "Error al guardar asignación", "danger");
    }
},
    
    // ==========================================
    // 4. GENERAR ÓRDENES DESDE PEDIDO
    // ==========================================
    async generarOrdenesDesdePedido(detallesArray) {
        try {
            const operaciones = [];
            const nuevasOrdenes = [];

            (detallesArray || []).forEach((det, idx) => {
                const producto = (App.state?.productos || []).find(p => p.id === det.producto_id);
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
                    fecha_creacion: new Date().toISOString(),
                    artesano_id: "",
                    tarifa_artesano_id: "",
                    tarifa_nombre: "",
                    pago_estimado: 0,
                    monto_unitario_artesano: 0,
                    base_calculo_artesano: 1,
                    modo_calculo_artesano: "fijo",
                    aplica_a_artesano: "total"
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
                if (!Array.isArray(App.state.ordenes_produccion)) {
                    App.state.ordenes_produccion = [];
                }
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
