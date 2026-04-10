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

    imprimirNota(registroId) {
        try {
            const pedido = (App.state.pedidos || []).find(p => p.id === registroId);
            const reparacion = (App.state.reparaciones || []).find(r => r.id === registroId);

            if (!pedido && !reparacion) {
                App.ui.toast("Registro no encontrado", "danger");
                return;
            }

            const esReparacion = !!reparacion;
            const registro = esReparacion ? reparacion : pedido;
            const cliente = (App.state.clientes || []).find(c => c.id === registro.cliente_id);

            const nombreCliente = cliente ? cliente.nombre : "Cliente general";
            const fecha = String(registro.fecha_creacion || registro.fecha || "").split("T")[0];
            const estado = registro.estado || "-";

            let total = 0;
            let anticipo = parseFloat(registro.anticipo || 0);
            let abonos = 0;
            let saldo = 0;
            let detallesHTML = "";

            if (!esReparacion) {
                const detalles = (App.state.pedido_detalle || []).filter(d => d.pedido_id === registroId);

                detallesHTML = detalles.map(d => {
                    const prod = (App.state.productos || []).find(p => p.id === d.producto_id);
                    const nombre = prod ? prod.nombre : "Producto";
                    const cantidad = parseFloat(d.cantidad || 0);
                    const precio = parseFloat(d.precio_unitario || 0);
                    const subtotal = cantidad * precio;
                    total += subtotal;

                    return `
                        <div class="item">
                            <div class="item-main">
                                <div class="item-name">${App.ui.escapeHTML(nombre)}</div>
                                <div class="item-meta">${cantidad} x $${precio.toFixed(2)}</div>
                            </div>
                            <div class="item-total">$${subtotal.toFixed(2)}</div>
                        </div>
                    `;
                }).join("");

                abonos = (App.state.abonos || [])
                    .filter(a => a.pedido_id === registro.id)
                    .reduce((s, a) => s + parseFloat(a.monto || 0), 0);

                if (total <= 0) total = parseFloat(registro.total || 0);
                saldo = total - anticipo - abonos;
            } else {
                total = parseFloat(registro.precio || 0);
                saldo = total - anticipo;

                detallesHTML = `
                    <div class="item">
                        <div class="item-main">
                            <div class="item-name">Servicio de reparación</div>
                            <div class="item-meta">${App.ui.escapeHTML(registro.descripcion || "Sin descripción")}</div>
                        </div>
                        <div class="item-total">$${total.toFixed(2)}</div>
                    </div>
                `;
            }

            const tipoLabel = esReparacion ? "Nota de reparación" : "Nota de pedido";

            const html = `
                <html>
                <head>
                    <title>${tipoLabel}</title>
                    <meta charset="utf-8">
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            background: #fff;
                            padding: 20px;
                            max-width: 380px;
                            margin: auto;
                            color: #222;
                        }
                        .ticket {
                            border: 1px solid #e5e7eb;
                            border-radius: 14px;
                            padding: 18px;
                        }
                        .brand {
                            text-align: center;
                            margin-bottom: 12px;
                        }
                        .brand h1 {
                            margin: 0;
                            font-size: 22px;
                            color: #6D28D9;
                        }
                        .brand p {
                            margin: 4px 0 0 0;
                            color: #666;
                            font-size: 12px;
                        }
                        .line {
                            border-top: 1px dashed #999;
                            margin: 12px 0;
                        }
                        .meta {
                            font-size: 13px;
                            line-height: 1.6;
                        }
                        .meta strong {
                            color: #111;
                        }
                        .section-title {
                            font-size: 13px;
                            font-weight: bold;
                            color: #6D28D9;
                            margin-bottom: 8px;
                            text-transform: uppercase;
                        }
                        .item {
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-start;
                            gap: 10px;
                            font-size: 13px;
                            margin-bottom: 10px;
                        }
                        .item-main {
                            flex: 1;
                            min-width: 0;
                        }
                        .item-name {
                            font-weight: bold;
                            margin-bottom: 3px;
                        }
                        .item-meta {
                            color: #666;
                            font-size: 12px;
                            line-height: 1.4;
                            word-break: break-word;
                        }
                        .item-total {
                            font-weight: bold;
                            white-space: nowrap;
                        }
                        .totales {
                            font-size: 13px;
                        }
                        .totales-row {
                            display: flex;
                            justify-content: space-between;
                            margin: 6px 0;
                        }
                        .saldo {
                            font-weight: bold;
                            font-size: 16px;
                            color: ${saldo > 0 ? "#DC2626" : "#16A34A"};
                        }
                        .footer {
                            text-align: center;
                            font-size: 11px;
                            margin-top: 18px;
                            color: #666;
                            line-height: 1.5;
                        }
                    </style>
                </head>
                <body>
                    <div class="ticket">
                        <div class="brand">
                            <h1>Descanso Maya</h1>
                            <p>@descansomaya.mx</p>
                        </div>

                        <div class="line"></div>

                        <div class="meta">
                            <div><strong>${tipoLabel}:</strong> ${App.ui.escapeHTML(registro.id)}</div>
                            <div><strong>Cliente:</strong> ${App.ui.escapeHTML(nombreCliente)}</div>
                            <div><strong>Fecha:</strong> ${App.ui.escapeHTML(fecha || "-")}</div>
                            <div><strong>Estado:</strong> ${App.ui.escapeHTML(estado)}</div>
                            ${registro.fecha_entrega ? `<div><strong>Entrega:</strong> ${App.ui.escapeHTML(registro.fecha_entrega)}</div>` : ""}
                        </div>

                        <div class="line"></div>

                        <div class="section-title">${esReparacion ? "Servicio" : "Detalle"}</div>
                        ${detallesHTML || `<div class="item"><div class="item-main"><div class="item-meta">Sin detalles</div></div></div>`}

                        <div class="line"></div>

                        <div class="totales">
                            <div class="totales-row"><span>Total:</span><strong>$${total.toFixed(2)}</strong></div>
                            <div class="totales-row"><span>Anticipo:</span><strong>$${anticipo.toFixed(2)}</strong></div>
                            ${!esReparacion && abonos > 0 ? `<div class="totales-row"><span>Abonos:</span><strong>$${abonos.toFixed(2)}</strong></div>` : ""}
                            <div class="totales-row saldo"><span>Saldo:</span><span>$${saldo.toFixed(2)}</span></div>
                        </div>

                        ${registro.notas ? `
                            <div class="line"></div>
                            <div class="section-title">Notas</div>
                            <div class="meta">${App.ui.escapeHTML(registro.notas)}</div>
                        ` : ""}

                        ${esReparacion && registro.descripcion ? `
                            <div class="line"></div>
                            <div class="section-title">Descripción</div>
                            <div class="meta">${App.ui.escapeHTML(registro.descripcion)}</div>
                        ` : ""}

                        <div class="line"></div>

                        <div class="footer">
                            Gracias por su preferencia<br>
                            Descanso Maya
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

            const w = window.open("", "_blank", "width=900,height=700");
            if (!w) {
                App.ui.toast("El navegador bloqueó la ventana de impresión", "warning");
                return;
            }

            w.document.open();
            w.document.write(html);
            w.document.close();
        } catch (error) {
            console.error("Error en imprimirNota:", error);
            App.ui.toast(error.message || "Error al imprimir nota", "danger");
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
