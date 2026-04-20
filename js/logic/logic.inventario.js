// ==========================================
// LÓGICA: INVENTARIO, COMPRAS Y CUENTAS POR PAGAR
// ==========================================

window.App = window.App || {};
App.logic = App.logic || {};

Object.assign(App.logic, {
    async guardarNuevaCompra(datos) {
        try {
            App.ui.showLoader("Comprando...");

            const compraId = "COM-" + Date.now();
            const detallesCompra = [];
            const operaciones = [];
            const nuevosAbonosProv = [];
            const nuevosProductos = [];
            const productosActualizados = [];

            const mats = Array.isArray(datos["mat_id[]"])
                ? datos["mat_id[]"]
                : (datos["mat_id[]"] ? [datos["mat_id[]"]] : []);

            const cants = Array.isArray(datos["cant[]"])
                ? datos["cant[]"]
                : (datos["cant[]"] ? [datos["cant[]"]] : []);

            const precios = Array.isArray(datos["precio_u[]"])
                ? datos["precio_u[]"]
                : (datos["precio_u[]"] ? [datos["precio_u[]"]] : []);

            const gastoPorTipo = {};
            const movimientosCompra = [];

            for (let i = 0; i < mats.length; i++) {
                const matId = mats[i];
                const cant = parseFloat(cants[i] || 0);
                const precioUnitario = parseFloat(precios[i] || 0);
                const totalFila = cant * precioUnitario;

                if (!matId || cant <= 0) continue;

                const material = (App.state.inventario || []).find(m => m.id === matId);
                if (!material) continue;

                const tipoMat = material.tipo || "otro";
                let catGasto = "Materiales e Insumos";
                if (tipoMat === "reventa") catGasto = "Hamacas (Reventa)";

                gastoPorTipo[catGasto] = (gastoPorTipo[catGasto] || 0) + totalFila;

                detallesCompra.push({
                    mat_id: matId,
                    nombre: material.nombre,
                    cantidad: cant,
                    costo_unitario: precioUnitario
                });

                if (App.logic.movimientos?.crearLoteMovimientos) {
                    movimientosCompra.push({
                        tipo_movimiento: "entrada_compra",
                        origen: "compra",
                        origen_id: compraId,
                        ref_tipo: "material",
                        ref_id: material.id,
                        material_id: material.id,
                        tipo: "entrada",
                        cantidad: cant,
                        costo_unitario: precioUnitario,
                        motivo: "Compra a proveedor",
                        notas: "Compra a proveedor",
                        fecha: datos.fecha,
                        actualizar_costo_unitario: true
                    });
                } else {
                    const nuevoStock = (parseFloat(material.stock_real || 0) || 0) + cant;
                    operaciones.push({
                        action: "actualizar_fila",
                        nombreHoja: "materiales",
                        idFila: material.id,
                        datosNuevos: {
                            stock_real: nuevoStock,
                            costo_unitario: precioUnitario
                        }
                    });
                    operaciones.push({
                        action: "guardar_fila",
                        nombreHoja: "movimientos_inventario",
                        datos: {
                            id: "MOV-" + Date.now() + "-" + i,
                            fecha: datos.fecha || new Date().toISOString().split("T")[0],
                            tipo_movimiento: "entrada_compra",
                            origen: "compra",
                            origen_id: compraId,
                            ref_tipo: "material",
                            ref_id: material.id,
                            material_id: material.id,
                            tipo: "entrada",
                            cantidad: cant,
                            costo_unitario: precioUnitario,
                            total: cant * precioUnitario,
                            motivo: "Compra a proveedor",
                            notas: "Compra a proveedor"
                        }
                    });
                }
            }

            let resultadoLote = null;
            if (movimientosCompra.length && App.logic.movimientos?.crearLoteMovimientos) {
                resultadoLote = App.logic.movimientos.crearLoteMovimientos(movimientosCompra);
                operaciones.push(...resultadoLote.operaciones);
            }

            for (let i = 0; i < mats.length; i++) {
                const matId = mats[i];
                if (!matId) continue;

                const material = (App.state.inventario || []).find(m => m.id === matId);
                if (!material || material.tipo !== "reventa") continue;

                const existeProd = (App.state.productos || []).find(
                    p => p.mat_1 === material.id || String(p.nombre || "").toLowerCase() === String(material.nombre || "").toLowerCase()
                );

                if (!existeProd) {
                    const nuevoProd = {
                        id: "PROD-" + Date.now() + "-" + i,
                        nombre: material.nombre,
                        categoria: "reventa",
                        clasificacion: "Reventa",
                        precio_venta: 0,
                        mat_1: material.id,
                        cant_1: 1,
                        uso_1: "Completo",
                        activo: "TRUE",
                        fecha_creacion: new Date().toISOString()
                    };

                    operaciones.push({
                        action: "guardar_fila",
                        nombreHoja: "productos",
                        datos: nuevoProd
                    });

                    nuevosProductos.push(nuevoProd);
                } else if (existeProd.mat_1 !== material.id) {
                    operaciones.push({
                        action: "actualizar_fila",
                        nombreHoja: "productos",
                        idFila: existeProd.id,
                        datosNuevos: { mat_1: material.id }
                    });

                    productosActualizados.push({ id: existeProd.id, mat_1: material.id });
                }
            }

            const totalNum = parseFloat(datos.total || 0);
            const montoPagadoNum = parseFloat(datos.monto_pagado || 0);
            const estadoCompra = montoPagadoNum >= totalNum ? "pagado" : "credito";

            const compra = {
                id: compraId,
                proveedor_id: datos.proveedor_id,
                fecha: datos.fecha,
                total: totalNum,
                monto_pagado: montoPagadoNum,
                estado: estadoCompra,
                detalles: JSON.stringify(detallesCompra),
                fecha_creacion: new Date().toISOString()
            };

            operaciones.push({
                action: "guardar_fila",
                nombreHoja: "compras",
                datos: compra
            });

            const proveedor = (App.state.proveedores || []).find(p => p.id === datos.proveedor_id);
            const nombreProv = proveedor ? proveedor.nombre : "Proveedor";

            if (montoPagadoNum > 0) {
                const abonoInicial = {
                    id: "ABO-P-" + Date.now(),
                    compra_id: compraId,
                    proveedor_id: datos.proveedor_id,
                    monto: montoPagadoNum,
                    nota: "Pago inicial de compra",
                    fecha: new Date().toISOString().split("T")[0]
                };

                operaciones.push({
                    action: "guardar_fila",
                    nombreHoja: "abonos_proveedores",
                    datos: abonoInicial
                });

                nuevosAbonosProv.push(abonoInicial);

                Object.keys(gastoPorTipo).forEach((cat, idx) => {
                    const proporcion = totalNum > 0 ? (gastoPorTipo[cat] / totalNum) : 0;
                    const montoCat = montoPagadoNum * proporcion;

                    const nuevoGasto = {
                        id: "GAS-" + Date.now() + "-" + idx,
                        categoria: cat,
                        descripcion: `Pago inicial compra a ${nombreProv} (${compraId})`,
                        monto: montoCat.toFixed(2),
                        fecha: datos.fecha
                    };

                    operaciones.push({
                        action: "guardar_fila",
                        nombreHoja: "gastos",
                        datos: nuevoGasto
                    });

                    if (!Array.isArray(App.state.gastos)) App.state.gastos = [];
                    App.state.gastos.push(nuevoGasto);
                });
            }

            const res = await App.api.fetch("ejecutar_lote", { operaciones });
            App.ui.hideLoader();

            if (res.status === "success") {
                if (!Array.isArray(App.state.compras)) App.state.compras = [];
                if (!Array.isArray(App.state.abonos_proveedores)) App.state.abonos_proveedores = [];
                if (!Array.isArray(App.state.productos)) App.state.productos = [];

                if (resultadoLote && App.logic.movimientos?.aplicarEnEstado) {
                    App.logic.movimientos.aplicarEnEstado(resultadoLote);
                } else {
                    detallesCompra.forEach(det => {
                        const mat = (App.state.inventario || []).find(m => m.id === det.mat_id);
                        if (mat) {
                            mat.stock_real = (parseFloat(mat.stock_real || 0) || 0) + (parseFloat(det.cantidad || 0) || 0);
                            mat.costo_unitario = parseFloat(det.costo_unitario || 0) || 0;
                        }
                    });
                }

                App.state.compras.push(compra);
                App.state.abonos_proveedores.push(...nuevosAbonosProv);
                App.state.productos.push(...nuevosProductos);

                productosActualizados.forEach(update => {
                    const prod = (App.state.productos || []).find(p => p.id === update.id);
                    if (prod) prod.mat_1 = update.mat_1;
                });

                App.ui.toast("Compra registrada");
                App.router.handleRoute();
                if (App.logic.revisarAlertasStock) App.logic.revisarAlertasStock();
            } else {
                App.ui.toast(res.message || "Error al registrar compra", "danger");
            }
        } catch (error) {
            console.error("Error en guardarNuevaCompra:", error);
            App.ui.hideLoader();
            App.ui.toast(error.message || "Error al registrar compra", "danger");
        }
    },

    async guardarAbonoCompra(datos) {
        try {
            const compra = (App.state.compras || []).find(c => c.id === datos.compra_id);
            if (!compra) return;

            const abonoFormateado = parseFloat(datos.monto || 0);
            const deudaActual = parseFloat(compra.total || 0) - parseFloat(compra.monto_pagado || 0);

            if (abonoFormateado > deudaActual + 0.1) {
                alert(`❌ No puedes abonar más del saldo pendiente ($${deudaActual.toFixed(2)})`);
                return;
            }

            App.ui.showLoader("Registrando Abono...");

            const nuevoPagado = parseFloat(compra.monto_pagado || 0) + abonoFormateado;
            const proveedor = (App.state.proveedores || []).find(p => p.id === compra.proveedor_id);
            const nombreProv = proveedor ? proveedor.nombre : "Proveedor";

            const operaciones = [];

            operaciones.push({
                action: "actualizar_fila",
                nombreHoja: "compras",
                idFila: compra.id,
                datosNuevos: {
                    monto_pagado: nuevoPagado,
                    estado: nuevoPagado >= parseFloat(compra.total || 0) ? "pagado" : "credito"
                }
            });

            const nuevoAbonoProv = {
                id: "ABO-P-" + Date.now(),
                compra_id: compra.id,
                proveedor_id: compra.proveedor_id,
                monto: abonoFormateado,
                nota: "Abono parcial",
                fecha: new Date().toISOString().split("T")[0]
            };

            operaciones.push({
                action: "guardar_fila",
                nombreHoja: "abonos_proveedores",
                datos: nuevoAbonoProv
            });

            const nuevoGasto = {
                id: "GAS-" + Date.now(),
                categoria: "Materiales e Insumos",
                descripcion: `Abono Compra a ${nombreProv} (${compra.id})`,
                monto: abonoFormateado,
                fecha: new Date().toISOString().split("T")[0]
            };

            operaciones.push({
                action: "guardar_fila",
                nombreHoja: "gastos",
                datos: nuevoGasto
            });

            const res = await App.api.fetch("ejecutar_lote", { operaciones });
            App.ui.hideLoader();

            if (res.status === "success") {
                compra.monto_pagado = nuevoPagado;
                if (nuevoPagado >= parseFloat(compra.total || 0)) {
                    compra.estado = "pagado";
                }

                if (!Array.isArray(App.state.gastos)) App.state.gastos = [];
                if (!Array.isArray(App.state.abonos_proveedores)) App.state.abonos_proveedores = [];

                App.state.gastos.push(nuevoGasto);
                App.state.abonos_proveedores.push(nuevoAbonoProv);

                App.ui.toast("Abono registrado");
                App.router.handleRoute();

                const sheetBg = document.getElementById("sheet-bg");
                if (sheetBg && !sheetBg.classList.contains("hidden") && App.views.verDetallesCompra) {
                    App.views.verDetallesCompra(compra.id);
                }
            } else {
                App.ui.toast(res.message || "Error al registrar abono", "danger");
            }
        } catch (error) {
            console.error("Error en guardarAbonoCompra:", error);
            App.ui.hideLoader();
            App.ui.toast(error.message || "Error al registrar abono", "danger");
        }
    },

    async eliminarCompra(id) {
        try {
            if (!confirm("⚠️ ¿Eliminar compra? Se revertirá el inventario automáticamente.")) return;

            App.ui.showLoader("Revirtiendo compra...");

            const operaciones = [
                { action: "eliminar_fila", nombreHoja: "compras", idFila: id }
            ];

            const resultadoReversa = App.logic.movimientos?.revertirMovimientosPorOrigen
                ? App.logic.movimientos.revertirMovimientosPorOrigen(id, {
                    origen: "reversa_compra",
                    tipo_movimiento_reversa: "reversa_compra",
                    motivo: "Cancelación de compra"
                })
                : { operaciones: [] };

            operaciones.push(...(resultadoReversa.operaciones || []));

            if (App.logic.movimientos?.eliminarMovimientosOriginalesPorOrigen) {
                operaciones.push(...App.logic.movimientos.eliminarMovimientosOriginalesPorOrigen(id));
            }

            const gastosAsociados = (App.state.gastos || []).filter(g => String(g.descripcion || "").includes(id));
            gastosAsociados.forEach(g => {
                operaciones.push({ action: "eliminar_fila", nombreHoja: "gastos", idFila: g.id });
            });

            const abonosAsociados = (App.state.abonos_proveedores || []).filter(a => a.compra_id === id);
            abonosAsociados.forEach(ab => {
                operaciones.push({ action: "eliminar_fila", nombreHoja: "abonos_proveedores", idFila: ab.id });
            });

            const res = await App.api.fetch("ejecutar_lote", { operaciones });
            App.ui.hideLoader();

            if (res.status === "success") {
                if (resultadoReversa && App.logic.movimientos?.aplicarEnEstado) {
                    App.logic.movimientos.aplicarEnEstado(resultadoReversa);
                }

                App.state.compras = (App.state.compras || []).filter(c => c.id !== id);
                App.state.gastos = (App.state.gastos || []).filter(g => !String(g.descripcion || "").includes(id));
                App.state.movimientos_inventario = (App.state.movimientos_inventario || []).filter(m => m.origen_id !== id);
                App.state.abonos_proveedores = (App.state.abonos_proveedores || []).filter(a => a.compra_id !== id);

                App.ui.toast("Compra revertida correctamente");
                App.router.handleRoute();
                if (App.logic.revisarAlertasStock) App.logic.revisarAlertasStock();
            } else {
                App.ui.toast(res.message || "Error al revertir compra", "danger");
            }
        } catch (error) {
            console.error("Error en eliminarCompra:", error);
            App.ui.hideLoader();
            App.ui.toast(error.message || "Error al eliminar compra", "danger");
        }
    }
});