// ==========================================
// LÓGICA: PEDIDOS, COBROS Y VENTAS
// ==========================================

window.App = window.App || {};
App.logic = App.logic || {};

Object.assign(App.logic, {
    async guardarNuevoPedido(datosFormulario) {
        try {
            App.ui.showLoader("Procesando pedido...");

            const pedidoId = "PED-" + Date.now();
            const totalNum = parseFloat(datosFormulario.total) || 0;
            const anticipoNum = parseFloat(datosFormulario.anticipo) || 0;
            const fechaC = datosFormulario.fecha_creacion
                ? datosFormulario.fecha_creacion + "T12:00:00.000Z"
                : new Date().toISOString();

            const listaProductos = Array.isArray(datosFormulario.carrito) && datosFormulario.carrito.length > 0
                ? datosFormulario.carrito
                : [{
                    producto_id: datosFormulario.producto_id,
                    cantidad: parseInt(datosFormulario.cantidad) || 1,
                    precio_unitario: totalNum / (parseInt(datosFormulario.cantidad) || 1)
                }];

            const todosReventa = listaProductos.every(item => {
                const p = (App.state.productos || []).find(prod => prod.id === item.producto_id);
                return p && p.categoria === "reventa";
            });

            let estadoCalculado = todosReventa ? "listo para entregar" : "nuevo";
            if (todosReventa && anticipoNum >= totalNum) estadoCalculado = "pagado";

            const datosPedido = {
                id: pedidoId,
                cliente_id: datosFormulario.cliente_id,
                estado: estadoCalculado,
                total: totalNum,
                anticipo: anticipoNum,
                notas: datosFormulario.notas || "",
                fecha_entrega: datosFormulario.fecha_entrega || "",
                fecha_creacion: fechaC
            };

            const operaciones = [
                { action: "guardar_fila", nombreHoja: "pedidos", datos: datosPedido }
            ];

            const nuevosMovs = [];
            const nuevosDetallesMemoria = [];

            listaProductos.forEach((itemCarro, index) => {
                const idDetalle = "PDET-" + Date.now() + "-" + index;

                const datosDetalle = {
                    id: idDetalle,
                    pedido_id: pedidoId,
                    producto_id: itemCarro.producto_id,
                    cantidad: parseInt(itemCarro.cantidad) || 1,
                    precio_unitario: parseFloat(itemCarro.precio_unitario || 0)
                };

                operaciones.push({
                    action: "guardar_fila",
                    nombreHoja: "pedido_detalle",
                    datos: datosDetalle
                });

                nuevosDetallesMemoria.push(datosDetalle);

                const producto = (App.state.productos || []).find(p => p.id === itemCarro.producto_id);

                if (producto && producto.categoria === "reventa") {
                    for (let i = 1; i <= 20; i++) {
                        const matId = producto[`mat_${i}`];
                        const cantTeorica = (parseFloat(producto[`cant_${i}`] || 0)) * (parseInt(itemCarro.cantidad) || 1);

                        if (matId && cantTeorica > 0) {
                            const material = (App.state.inventario || []).find(m => m.id === matId);

                            if (material) {
                                const stockReservadoActual = parseFloat(material.stock_reservado || 0);
                                const nuevoReservado = stockReservadoActual + cantTeorica;

                                operaciones.push({
                                    action: "actualizar_fila",
                                    nombreHoja: "materiales",
                                    idFila: material.id,
                                    datosNuevos: { stock_reservado: nuevoReservado }
                                });

                                material.stock_reservado = nuevoReservado;

                                const mov = {
                                    id: "MOV-" + Date.now() + "-" + i + "-" + index,
                                    fecha: new Date().toISOString().split("T")[0],
                                    tipo_movimiento: "reserva_venta",
                                    origen: "pedido",
                                    origen_id: pedidoId,
                                    ref_tipo: "material",
                                    ref_id: material.id,
                                    material_id: material.id,
                                    tipo: "salida",
                                    cantidad: cantTeorica,
                                    costo_unitario: material.costo_unitario || 0,
                                    total: cantTeorica * (material.costo_unitario || 0),
                                    motivo: "Apartado por venta",
                                    notas: "Apartado por venta"
                                };

                                nuevosMovs.push(mov);

                                operaciones.push({
                                    action: "guardar_fila",
                                    nombreHoja: "movimientos_inventario",
                                    datos: mov
                                });
                            }
                        }
                    }
                }
            });

            const resPedido = await App.api.fetch("ejecutar_lote", { operaciones });

            App.ui.hideLoader();

            if (resPedido.status === "success") {
                if (!Array.isArray(App.state.pedidos)) App.state.pedidos = [];
                if (!Array.isArray(App.state.pedido_detalle)) App.state.pedido_detalle = [];
                if (!Array.isArray(App.state.movimientos_inventario)) App.state.movimientos_inventario = [];

                App.state.pedidos.push(datosPedido);
                App.state.pedido_detalle.push(...nuevosDetallesMemoria);
                App.state.movimientos_inventario.push(...nuevosMovs);

                App.ui.toast(todosReventa ? "Pedido guardado y stock apartado" : "Pedido guardado");
                App.router.handleRoute();
                App.logic.revisarAlertasStock();
            } else {
                App.ui.toast(resPedido.message || "Error al guardar pedido", "danger");
            }
        } catch (error) {
            console.error("Error en guardarNuevoPedido:", error);
            App.ui.hideLoader();
            App.ui.toast(error.message || "Error al procesar pedido", "danger");
        }
    },

    async eliminarPedido(id) {
        try {
            if (!confirm("⚠️ ¿Eliminar pedido por completo?\n\nLos insumos volverán a estar libres en el inventario.")) return;

            App.ui.showLoader("Procesando eliminación...");

            const pedido = (App.state.pedidos || []).find(p => p.id === id);
            if (!pedido) {
                App.ui.hideLoader();
                App.ui.toast("Pedido no encontrado", "danger");
                return;
            }

            const detalles = (App.state.pedido_detalle || []).filter(d => d.pedido_id === id);
            const ordenes = (App.state.ordenes_produccion || []).filter(o =>
                detalles.some(d => d.id === o.pedido_detalle_id)
            );

            const operaciones = [];

            detalles.forEach(detalle => {
                const producto = (App.state.productos || []).find(p => p.id === detalle.producto_id);
                const cantidadDetalle = parseInt(detalle.cantidad) || 1;

                if (!producto) return;

                if (producto.categoria === "reventa") {
                    for (let i = 1; i <= 20; i++) {
                        const matId = producto[`mat_${i}`];
                        const cantTeorica = (parseFloat(producto[`cant_${i}`] || 0)) * cantidadDetalle;

                        if (matId && cantTeorica > 0) {
                            const mat = (App.state.inventario || []).find(m => m.id === matId);
                            if (!mat) continue;

                            if (pedido.estado === "listo para entregar" || pedido.estado === "pagado") {
                                const nuevoReal = parseFloat(mat.stock_real || 0) + cantTeorica;
                                operaciones.push({
                                    action: "actualizar_fila",
                                    nombreHoja: "materiales",
                                    idFila: mat.id,
                                    datosNuevos: { stock_real: nuevoReal }
                                });
                                mat.stock_real = nuevoReal;
                            } else {
                                const nuevoReservado = Math.max(0, parseFloat(mat.stock_reservado || 0) - cantTeorica);
                                operaciones.push({
                                    action: "actualizar_fila",
                                    nombreHoja: "materiales",
                                    idFila: mat.id,
                                    datosNuevos: { stock_reservado: nuevoReservado }
                                });
                                mat.stock_reservado = nuevoReservado;
                            }
                        }
                    }
                }
            });

            operaciones.push({ action: "eliminar_fila", nombreHoja: "pedidos", idFila: id });

            detalles.forEach(det => {
                operaciones.push({ action: "eliminar_fila", nombreHoja: "pedido_detalle", idFila: det.id });
            });

            ordenes.forEach(orden => {
                operaciones.push({ action: "eliminar_fila", nombreHoja: "ordenes_produccion", idFila: orden.id });

                (App.state.pago_artesanos || [])
                    .filter(p => p.orden_id === orden.id)
                    .forEach(pago => {
                        operaciones.push({ action: "eliminar_fila", nombreHoja: "pago_artesanos", idFila: pago.id });
                    });
            });

            (App.state.abonos || [])
                .filter(a => a.pedido_id === id)
                .forEach(ab => {
                    operaciones.push({ action: "eliminar_fila", nombreHoja: "abonos_clientes", idFila: ab.id });
                });

            const res = await App.api.fetch("ejecutar_lote", { operaciones });

            App.ui.hideLoader();

            if (res.status === "success") {
                App.state.pedidos = (App.state.pedidos || []).filter(p => p.id !== id);
                App.state.pedido_detalle = (App.state.pedido_detalle || []).filter(d => d.pedido_id !== id);
                App.state.ordenes_produccion = (App.state.ordenes_produccion || []).filter(o =>
                    !ordenes.some(ord => ord.id === o.id)
                );
                App.state.pago_artesanos = (App.state.pago_artesanos || []).filter(p =>
                    !ordenes.some(ord => ord.id === p.orden_id)
                );
                App.state.abonos = (App.state.abonos || []).filter(a => a.pedido_id !== id);

                App.ui.toast("Pedido eliminado");
                App.router.handleRoute();
                App.logic.revisarAlertasStock();
            } else {
                App.ui.toast(res.message || "Error al eliminar pedido", "danger");
            }
        } catch (error) {
            console.error("Error en eliminarPedido:", error);
            App.ui.hideLoader();
            App.ui.toast(error.message || "Error al eliminar pedido", "danger");
        }
    },

    async entregarDeBodega(pedidoId) {
        try {
            const pedido = (App.state.pedidos || []).find(p => p.id === pedidoId);
            const detalles = (App.state.pedido_detalle || []).filter(d => d.pedido_id === pedidoId);

            if (!pedido || detalles.length === 0) {
                App.ui.toast("No se encontró el pedido o sus detalles", "danger");
                return;
            }

            if (!confirm("¿Marcar pedido como entregado y descontarlo físicamente de la bodega?")) return;

            const operaciones = [];
            const nuevosMovs = [];

            detalles.forEach((detalle, detIndex) => {
                const producto = (App.state.productos || []).find(p => p.id === detalle.producto_id);
                if (!producto || producto.categoria !== "reventa") return;

                const cantPedida = parseInt(detalle.cantidad) || 1;

                for (let i = 1; i <= 20; i++) {
                    const matId = producto[`mat_${i}`];
                    const cantTeorica = parseFloat(producto[`cant_${i}`] || 0) * cantPedida;

                    if (matId && cantTeorica > 0) {
                        const material = (App.state.inventario || []).find(m => m.id === matId);
                        if (!material) continue;

                        const nuevoReservado = Math.max(0, parseFloat(material.stock_reservado || 0) - cantTeorica);
                        const nuevoReal = parseFloat(material.stock_real || 0) - cantTeorica;

                        operaciones.push({
                            action: "actualizar_fila",
                            nombreHoja: "materiales",
                            idFila: material.id,
                            datosNuevos: {
                                stock_reservado: nuevoReservado,
                                stock_real: nuevoReal
                            }
                        });

                        material.stock_reservado = nuevoReservado;
                        material.stock_real = nuevoReal;

                        const mov = {
                            id: "MOV-" + Date.now() + "-" + i + "-" + detIndex,
                            fecha: new Date().toISOString().split("T")[0],
                            tipo_movimiento: "salida_venta",
                            origen: "pedido",
                            origen_id: pedidoId,
                            ref_tipo: "material",
                            ref_id: material.id,
                            material_id: material.id,
                            tipo: "salida",
                            cantidad: -cantTeorica,
                            costo_unitario: material.costo_unitario || 0,
                            total: -cantTeorica * (material.costo_unitario || 0),
                            motivo: "Entrega física al cliente",
                            notas: "Entrega física al cliente"
                        };

                        nuevosMovs.push(mov);

                        operaciones.push({
                            action: "guardar_fila",
                            nombreHoja: "movimientos_inventario",
                            datos: mov
                        });
                    }
                }
            });

            operaciones.push({
                action: "actualizar_fila",
                nombreHoja: "pedidos",
                idFila: pedidoId,
                datosNuevos: { estado: "listo para entregar" }
            });

            App.ui.showLoader("Entregando...");
            const res = await App.api.fetch("ejecutar_lote", { operaciones });
            App.ui.hideLoader();

            if (res.status === "success") {
                pedido.estado = "listo para entregar";

                if (!Array.isArray(App.state.movimientos_inventario)) {
                    App.state.movimientos_inventario = [];
                }
                App.state.movimientos_inventario.push(...nuevosMovs);

                App.ui.toast("Descontado de bodega");
                App.router.handleRoute();
                App.logic.revisarAlertasStock();
            } else {
                App.ui.toast(res.message || "Error al entregar pedido", "danger");
            }
        } catch (error) {
            console.error("Error en entregarDeBodega:", error);
            App.ui.hideLoader();
            App.ui.toast(error.message || "Error al entregar pedido", "danger");
        }
    },

    async guardarAbono(datos) {
        try {
            const pedidoId = datos.pedido_id || "";
            const esReparacion = pedidoId.startsWith("REP-");
            const nuevoMonto = parseFloat(datos.monto) || 0;

            if (nuevoMonto <= 0) {
                alert("❌ El abono debe ser mayor a $0.");
                return;
            }

            const operaciones = [];
            let saldoRealFinal = 0;

            if (!esReparacion) {
                const pedidoObj = (App.state.pedidos || []).find(p => p.id === pedidoId);
                if (!pedidoObj) return;

                const abonosPrevios = (App.state.abonos || [])
                    .filter(a => a.pedido_id === pedidoObj.id)
                    .reduce((s, a) => s + parseFloat(a.monto || 0), 0);

                const saldoPendiente = parseFloat(pedidoObj.total || 0) - parseFloat(pedidoObj.anticipo || 0) - abonosPrevios;

                if (nuevoMonto > saldoPendiente + 0.05) {
                    alert(`❌ No puedes abonar más del saldo pendiente ($${saldoPendiente.toFixed(2)}).`);
                    return;
                }

                saldoRealFinal = saldoPendiente - nuevoMonto;

                if (saldoRealFinal <= 0.05 && pedidoObj.estado !== "pagado") {
                    operaciones.push({
                        action: "actualizar_fila",
                        nombreHoja: "pedidos",
                        idFila: pedidoObj.id,
                        datosNuevos: { estado: "pagado" }
                    });
                    pedidoObj.estado = "pagado";
                }
            } else {
                const repObj = (App.state.reparaciones || []).find(r => r.id === pedidoId);
                if (!repObj) return;

                const saldoPendiente = parseFloat(repObj.precio || 0) - parseFloat(repObj.anticipo || 0);

                if (nuevoMonto > saldoPendiente + 0.05) {
                    alert(`❌ No puedes abonar más del saldo pendiente ($${saldoPendiente.toFixed(2)}).`);
                    return;
                }

                saldoRealFinal = saldoPendiente - nuevoMonto;
                const nuevoAnticipo = parseFloat(repObj.anticipo || 0) + nuevoMonto;

                const datosUpd = { anticipo: nuevoAnticipo };
                operaciones.push({
                    action: "actualizar_fila",
                    nombreHoja: "reparaciones",
                    idFila: repObj.id,
                    datosNuevos: datosUpd
                });

                repObj.anticipo = nuevoAnticipo;
            }

            App.ui.showLoader("Registrando pago...");

            const nuevoAbono = {
                id: "ABO-" + Date.now(),
                pedido_id: pedidoId,
                cliente_id: datos.cliente_id,
                monto: nuevoMonto,
                nota: datos.nota || "Abono en caja",
                metodo_pago: datos.metodo_pago || "Efectivo",
                fecha: new Date().toISOString()
            };

            operaciones.push({
                action: "guardar_fila",
                nombreHoja: "abonos_clientes",
                datos: nuevoAbono
            });

            const res = await App.api.fetch("ejecutar_lote", { operaciones });

            App.ui.hideLoader();

            if (res.status === "success") {
                if (!Array.isArray(App.state.abonos)) App.state.abonos = [];
                App.state.abonos.push(nuevoAbono);

                App.ui.toast(saldoRealFinal <= 0.05 ? "✅ Deuda liquidada" : "Pago registrado");
                App.router.handleRoute();
            } else {
                App.ui.toast(res.message || "Error al guardar el pago", "danger");
            }
        } catch (error) {
            console.error("Error en guardarAbono:", error);
            App.ui.hideLoader();
            App.ui.toast(error.message || "Error al registrar abono", "danger");
        }
    },

    _getClientePorRegistro(registro) {
        return (App.state.clientes || []).find(c => c.id === registro?.cliente_id) || null;
    },

    _getDetallesPedidoParaComprobante(pedidoId) {
        return (App.state.pedido_detalle || [])
            .filter(d => d.pedido_id === pedidoId)
            .map(d => {
                const prod = (App.state.productos || []).find(p => p.id === d.producto_id);
                const nombre = prod ? prod.nombre : "Producto";
                const cantidad = parseFloat(d.cantidad || 0) || 0;
                const precio = parseFloat(d.precio_unitario || 0) || 0;
                const subtotal = cantidad * precio;
                return {
                    nombre,
                    cantidad,
                    precio,
                    subtotal
                };
            });
    },

    _getResumenFinancieroRegistro(registroId) {
        const pedido = (App.state.pedidos || []).find(p => p.id === registroId);
        const reparacion = (App.state.reparaciones || []).find(r => r.id === registroId);
        const esReparacion = !!reparacion;
        const registro = esReparacion ? reparacion : pedido;

        if (!registro) return null;

        let total = 0;
        let anticipo = parseFloat(registro.anticipo || 0) || 0;
        let abonos = 0;
        let saldo = 0;
        let detalles = [];

        if (!esReparacion) {
            detalles = this._getDetallesPedidoParaComprobante(registroId);
            total = detalles.reduce((s, d) => s + d.subtotal, 0);
            if (total <= 0) total = parseFloat(registro.total || 0) || 0;

            abonos = (App.state.abonos || [])
                .filter(a => a.pedido_id === registroId)
                .reduce((s, a) => s + (parseFloat(a.monto || 0) || 0), 0);

            saldo = total - anticipo - abonos;
        } else {
            total = parseFloat(registro.precio || 0) || 0;
            saldo = total - anticipo;
        }

        return {
            esReparacion,
            registro,
            total,
            anticipo,
            abonos,
            saldo,
            detalles
        };
    },

    _abrirVentanaComprobante(html, titulo = "Comprobante") {
        const w = window.open("", "_blank", "width=1000,height=800");
        if (!w) {
            App.ui.toast("El navegador bloqueó la ventana de impresión", "warning");
            return;
        }
        w.document.open();
        w.document.write(html);
        w.document.close();
    },

    _generarHTMLComprobanteComercial({
        titulo,
        subtitulo = "",
        folio = "",
        clienteNombre = "",
        fecha = "",
        estado = "",
        fechaEntrega = "",
        lineItems = [],
        total = 0,
        anticipo = 0,
        abonos = 0,
        saldo = 0,
        notas = "",
        descripcion = "",
        etiquetaSaldo = "Saldo",
        referencia = ""
    }) {
        const rows = lineItems.map((item, idx) => `
            <tr>
                <td>${idx + 1}</td>
                <td>${App.ui.escapeHTML(item.nombre || "")}</td>
                <td>${item.cantidad !== undefined ? App.ui.escapeHTML(String(item.cantidad)) : "-"}</td>
                <td>$${(parseFloat(item.precio || 0) || 0).toFixed(2)}</td>
                <td>$${(parseFloat(item.subtotal || 0) || 0).toFixed(2)}</td>
            </tr>
        `).join("");

        return `
            <html>
            <head>
                <meta charset="utf-8">
                <title>${App.ui.escapeHTML(titulo)}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        color: #1f2937;
                        background: #fff;
                        margin: 0;
                        padding: 24px;
                    }
                    .sheet {
                        max-width: 920px;
                        margin: auto;
                        border: 1px solid #e5e7eb;
                        border-radius: 18px;
                        overflow: hidden;
                    }
                    .header {
                        background: linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%);
                        padding: 24px;
                        border-bottom: 1px solid #e5e7eb;
                        display: flex;
                        justify-content: space-between;
                        gap: 20px;
                        align-items: center;
                        flex-wrap: wrap;
                    }
                    .brand {
                        display: flex;
                        align-items: center;
                        gap: 16px;
                    }
                    .brand img {
                        width: 82px;
                        height: 82px;
                        object-fit: contain;
                        border-radius: 14px;
                        background: #fff;
                    }
                    .brand h1 {
                        margin: 0;
                        color: #6D28D9;
                        font-size: 26px;
                    }
                    .brand p {
                        margin: 4px 0 0 0;
                        color: #6b7280;
                        font-size: 13px;
                    }
                    .meta {
                        text-align: right;
                        font-size: 13px;
                        line-height: 1.7;
                    }
                    .content {
                        padding: 24px;
                    }
                    .title {
                        font-size: 24px;
                        font-weight: 700;
                        color: #111827;
                        margin-bottom: 4px;
                    }
                    .subtitle {
                        color: #6b7280;
                        margin-bottom: 18px;
                        font-size: 14px;
                    }
                    .info-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                        gap: 12px;
                        margin-bottom: 20px;
                    }
                    .info-box {
                        background: #faf5ff;
                        border: 1px solid #e9d8fd;
                        border-radius: 14px;
                        padding: 14px;
                        font-size: 13px;
                        line-height: 1.6;
                    }
                    .info-box strong {
                        color: #6D28D9;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 12px;
                    }
                    th, td {
                        border-bottom: 1px solid #e5e7eb;
                        padding: 10px 8px;
                        text-align: left;
                        font-size: 13px;
                        vertical-align: top;
                    }
                    th {
                        background: #f9fafb;
                        color: #374151;
                    }
                    .desc-box {
                        background: #fff;
                        border: 1px solid #e5e7eb;
                        border-radius: 14px;
                        padding: 14px;
                        margin-top: 18px;
                        font-size: 14px;
                        line-height: 1.6;
                    }
                    .totales {
                        margin-top: 22px;
                        display: flex;
                        justify-content: flex-end;
                    }
                    .totales-box {
                        width: 320px;
                        border: 1px solid #e5e7eb;
                        border-radius: 14px;
                        padding: 16px;
                        background: #fff;
                    }
                    .totales-row {
                        display: flex;
                        justify-content: space-between;
                        margin: 8px 0;
                        font-size: 14px;
                    }
                    .saldo {
                        font-size: 18px;
                        font-weight: 700;
                        color: ${saldo > 0 ? "#DC2626" : "#16A34A"};
                    }
                    .footer {
                        padding: 20px 24px 26px 24px;
                        border-top: 1px solid #e5e7eb;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        gap: 20px;
                        flex-wrap: wrap;
                    }
                    .footer-note {
                        color: #6b7280;
                        font-size: 12px;
                        line-height: 1.6;
                    }
                    .qr-box {
                        text-align: center;
                    }
                    .qr-box img {
                        width: 92px;
                        height: 92px;
                        object-fit: contain;
                    }
                    .qr-box div {
                        font-size: 11px;
                        color: #6b7280;
                        margin-top: 6px;
                    }
                    @media print {
                        body { padding: 0; }
                        .sheet { border: none; border-radius: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="sheet">
                    <div class="header">
                        <div class="brand">
                            <img src="https://i.ibb.co/5h0kNKrZ/DESCANSO-MAYA.png" alt="Descanso Maya">
                            <div>
                                <h1>Descanso Maya</h1>
                                <p>Hamacas y Accesorios Artesanales</p>
                            </div>
                        </div>
                        <div class="meta">
                            <div><strong>${App.ui.escapeHTML(titulo)}</strong></div>
                            <div>Fecha: ${App.ui.escapeHTML(fecha || "-")}</div>
                            ${folio ? `<div>Folio: ${App.ui.escapeHTML(folio)}</div>` : ""}
                            ${referencia ? `<div>Referencia: ${App.ui.escapeHTML(referencia)}</div>` : ""}
                        </div>
                    </div>

                    <div class="content">
                        <div class="title">${App.ui.escapeHTML(titulo)}</div>
                        ${subtitulo ? `<div class="subtitle">${App.ui.escapeHTML(subtitulo)}</div>` : ""}

                        <div class="info-grid">
                            <div class="info-box">
                                <strong>Cliente</strong><br>
                                ${App.ui.escapeHTML(clienteNombre || "Cliente general")}
                            </div>
                            <div class="info-box">
                                <strong>Estado</strong><br>
                                ${App.ui.escapeHTML(estado || "-")}
                            </div>
                            ${fechaEntrega ? `
                                <div class="info-box">
                                    <strong>Fecha de entrega</strong><br>
                                    ${App.ui.escapeHTML(fechaEntrega)}
                                </div>
                            ` : ""}
                        </div>

                        ${lineItems.length ? `
                            <table>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Concepto</th>
                                        <th>Cant.</th>
                                        <th>Unitario</th>
                                        <th>Importe</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rows}
                                </tbody>
                            </table>
                        ` : ""}

                        ${descripcion ? `
                            <div class="desc-box">
                                <strong style="color:#6D28D9;">Descripción</strong><br>
                                ${App.ui.escapeHTML(descripcion)}
                            </div>
                        ` : ""}

                        ${notas ? `
                            <div class="desc-box">
                                <strong style="color:#6D28D9;">Notas</strong><br>
                                ${App.ui.escapeHTML(notas)}
                            </div>
                        ` : ""}

                        <div class="totales">
                            <div class="totales-box">
                                <div class="totales-row"><span>Total</span><strong>$${(parseFloat(total || 0) || 0).toFixed(2)}</strong></div>
                                <div class="totales-row"><span>Anticipo</span><strong>$${(parseFloat(anticipo || 0) || 0).toFixed(2)}</strong></div>
                                ${parseFloat(abonos || 0) > 0 ? `<div class="totales-row"><span>Abonos</span><strong>$${(parseFloat(abonos || 0) || 0).toFixed(2)}</strong></div>` : ""}
                                <div class="totales-row saldo"><span>${App.ui.escapeHTML(etiquetaSaldo)}</span><span>$${(parseFloat(saldo || 0) || 0).toFixed(2)}</span></div>
                            </div>
                        </div>
                    </div>

                    <div class="footer">
                        <div class="footer-note">
                            Gracias por su preferencia ❤️<br>
                            Conserva este comprobante para cualquier aclaración.
                        </div>
                        <div class="qr-box">
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent("https://www.facebook.com/descansomaya.mx")}" alt="QR Facebook">
                            <div>facebook.com/descansomaya.mx</div>
                        </div>
                    </div>
                </div>

                <script>
                    window.onload = function () {
                        window.print();
                    };
                </script>
            </body>
            </html>
        `;
    },

    imprimirNota(registroId) {
        try {
            const resumen = this._getResumenFinancieroRegistro(registroId);
            if (!resumen) {
                App.ui.toast("Registro no encontrado", "danger");
                return;
            }

            const { esReparacion, registro, total, anticipo, abonos, saldo, detalles } = resumen;
            const cliente = this._getClientePorRegistro(registro);
            const nombreCliente = cliente ? cliente.nombre : "Cliente general";
            const fecha = String(registro.fecha_creacion || registro.fecha || "").split("T")[0];
            const estado = registro.estado || "-";

            const html = this._generarHTMLComprobanteComercial({
                titulo: esReparacion ? "Nota de reparación" : "Nota de pedido",
                subtitulo: esReparacion ? "Comprobante de servicio" : "Comprobante de venta",
                folio: registro.id || "",
                clienteNombre: nombreCliente,
                fecha,
                estado,
                fechaEntrega: registro.fecha_entrega || "",
                lineItems: esReparacion ? [] : detalles,
                total,
                anticipo,
                abonos,
                saldo,
                notas: registro.notas || "",
                descripcion: esReparacion ? (registro.descripcion || "") : "",
                etiquetaSaldo: "Saldo"
            });

            this._abrirVentanaComprobante(html, esReparacion ? "Nota de reparación" : "Nota de pedido");
        } catch (error) {
            console.error("Error en imprimirNota:", error);
            App.ui.toast(error.message || "Error al imprimir nota", "danger");
        }
    },

    imprimirReciboAbono(abonoId) {
        try {
            const abono = (App.state.abonos || []).find(a => a.id === abonoId);
            if (!abono) {
                App.ui.toast("Abono no encontrado", "danger");
                return;
            }

            const resumen = this._getResumenFinancieroRegistro(abono.pedido_id);
            if (!resumen) {
                App.ui.toast("Registro relacionado no encontrado", "danger");
                return;
            }

            const { esReparacion, registro, total, anticipo, abonos, saldo, detalles } = resumen;
            const cliente = this._getClientePorRegistro(registro);
            const nombreCliente = cliente ? cliente.nombre : "Cliente general";
            const fecha = String(abono.fecha || "").split("T")[0];

            const html = this._generarHTMLComprobanteComercial({
                titulo: "Recibo de abono",
                subtitulo: esReparacion ? "Pago recibido para reparación" : "Pago recibido para pedido",
                folio: abono.id || "",
                clienteNombre: nombreCliente,
                fecha,
                estado: registro.estado || "-",
                fechaEntrega: registro.fecha_entrega || "",
                lineItems: [{
                    nombre: esReparacion ? (registro.descripcion || "Servicio de reparación") : `Abono aplicado a ${registro.id}`,
                    cantidad: 1,
                    precio: parseFloat(abono.monto || 0) || 0,
                    subtotal: parseFloat(abono.monto || 0) || 0
                }],
                total,
                anticipo,
                abonos,
                saldo,
                notas: abono.nota || "",
                descripcion: esReparacion ? (registro.descripcion || "") : "",
                etiquetaSaldo: "Saldo restante",
                referencia: abono.metodo_pago || ""
            });

            this._abrirVentanaComprobante(html, "Recibo de abono");
        } catch (error) {
            console.error("Error en imprimirReciboAbono:", error);
            App.ui.toast(error.message || "Error al imprimir recibo de abono", "danger");
        }
    },

    imprimirReciboLiquidacion(registroId) {
        try {
            const resumen = this._getResumenFinancieroRegistro(registroId);
            if (!resumen) {
                App.ui.toast("Registro no encontrado", "danger");
                return;
            }

            const { esReparacion, registro, total, anticipo, abonos, saldo, detalles } = resumen;
            const cliente = this._getClientePorRegistro(registro);
            const nombreCliente = cliente ? cliente.nombre : "Cliente general";
            const fecha = new Date().toISOString().split("T")[0];

            const html = this._generarHTMLComprobanteComercial({
                titulo: "Recibo de liquidación",
                subtitulo: esReparacion ? "Cuenta liquidada de reparación" : "Cuenta liquidada de pedido",
                folio: registro.id || "",
                clienteNombre: nombreCliente,
                fecha,
                estado: "LIQUIDADO",
                fechaEntrega: registro.fecha_entrega || "",
                lineItems: esReparacion
                    ? [{
                        nombre: registro.descripcion || "Servicio de reparación",
                        cantidad: 1,
                        precio: total,
                        subtotal: total
                    }]
                    : detalles,
                total,
                anticipo,
                abonos,
                saldo,
                notas: registro.notas || "",
                descripcion: esReparacion ? (registro.descripcion || "") : "",
                etiquetaSaldo: "Saldo final"
            });

            this._abrirVentanaComprobante(html, "Recibo de liquidación");
        } catch (error) {
            console.error("Error en imprimirReciboLiquidacion:", error);
            App.ui.toast(error.message || "Error al imprimir liquidación", "danger");
        }
    },

    imprimirCotizacion(cotId) {
        App.ui.toast("Cotizaciones impresas sigue pendiente de activación.", "warning");
    },

    enviarWhatsApp(pedidoId, tipoMensaje) {
        try {
            const pedido = (App.state.pedidos || []).find(p => p.id === pedidoId)
                || (App.state.reparaciones || []).find(r => r.id === pedidoId);

            if (!pedido) {
                App.ui.toast("Registro no encontrado", "danger");
                return;
            }

            const cliente = (App.state.clientes || []).find(c => c.id === pedido.cliente_id);
            if (!cliente || !cliente.telefono) {
                App.ui.toast("El cliente no tiene teléfono registrado", "warning");
                return;
            }

            const telefono = String(cliente.telefono).replace(/\D/g, "");
            if (!telefono) {
                App.ui.toast("Teléfono inválido", "warning");
                return;
            }

            const esReparacion = String(pedido.id || "").startsWith("REP-");
            const total = parseFloat(esReparacion ? pedido.precio : pedido.total || 0);
            const anticipo = parseFloat(pedido.anticipo || 0);

            const abonosExtra = esReparacion
                ? 0
                : (App.state.abonos || [])
                    .filter(a => a.pedido_id === pedido.id)
                    .reduce((s, a) => s + parseFloat(a.monto || 0), 0);

            const saldo = total - anticipo - abonosExtra;

            let mensaje = "";

            if (tipoMensaje === "listo") {
                mensaje = `Hola ${cliente.nombre || ""}, tu ${esReparacion ? "reparación" : "pedido"} ${pedido.id} ya está listo para entregar.`;
                if (saldo > 0) {
                    mensaje += ` Tu saldo pendiente es de $${saldo.toFixed(2)} MXN.`;
                }
                mensaje += ` Quedamos atentos. Descanso Maya.`;
            } else {
                mensaje = `Hola ${cliente.nombre || ""}, te contactamos de Descanso Maya sobre tu ${esReparacion ? "reparación" : "pedido"} ${pedido.id}.`;
                if (saldo > 0) {
                    mensaje += ` Tienes un saldo pendiente de $${saldo.toFixed(2)} MXN.`;
                }
                mensaje += ` Quedamos atentos para apoyarte.`;
            }

            const waUrl = `https://wa.me/52${telefono}?text=${encodeURIComponent(mensaje)}`;
            window.open(waUrl, "_blank");
        } catch (error) {
            console.error("Error en enviarWhatsApp:", error);
            App.ui.toast(error.message || "Error al abrir WhatsApp", "danger");
        }
    },

    // ==========================================
    // LEGACY: COTIZACIONES EN LOCALSTORAGE
    // ==========================================
    guardarCotizacion(datos) {
        datos.id = "COT-" + Date.now();
        datos.fecha_creacion = new Date().toISOString();

        if (!Array.isArray(App.state.cotizaciones)) {
            App.state.cotizaciones = [];
        }

        App.state.cotizaciones.push(datos);
        localStorage.setItem("erp_cotizaciones", JSON.stringify(App.state.cotizaciones));
        App.ui.toast("Cotización generada");
        App.router.handleRoute();

        if (typeof App.logic.imprimirCotizacion === "function") {
            App.logic.imprimirCotizacion(datos.id);
        }
    },

    eliminarCotizacion(id) {
        if (!confirm("⚠️ ¿Eliminar cotización?")) return;

        App.state.cotizaciones = (App.state.cotizaciones || []).filter(c => c.id !== id);
        localStorage.setItem("erp_cotizaciones", JSON.stringify(App.state.cotizaciones));
        App.ui.toast("Eliminada");
        App.router.handleRoute();
    }
});
