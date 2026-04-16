// ==========================================
// LÓGICA: FINANZAS Y GASTOS
// ==========================================

window.App = window.App || {};
App.logic = App.logic || {};

Object.assign(App.logic, {
    async guardarMultiplesGastos(datos) {
        try {
            App.ui.showLoader("Registrando gastos...");

            const descripciones = Array.isArray(datos["descripcion[]"])
                ? datos["descripcion[]"]
                : (datos["descripcion[]"] ? [datos["descripcion[]"]] : []);

            const montos = Array.isArray(datos["monto[]"])
                ? datos["monto[]"]
                : (datos["monto[]"] ? [datos["monto[]"]] : []);

            const operaciones = [];
            const nuevosGastos = [];

            for (let i = 0; i < descripciones.length; i++) {
                if (!descripciones[i]) continue;

                const gastoObj = {
                    id: "GAS-" + Date.now() + "-" + i,
                    categoria: datos.categoria,
                    descripcion: descripciones[i],
                    monto: parseFloat(montos[i] || 0),
                    fecha: datos.fecha
                };

                nuevosGastos.push(gastoObj);

                operaciones.push({
                    action: "guardar_fila",
                    nombreHoja: "gastos",
                    datos: gastoObj
                });
            }

            const res = await App.api.fetch("ejecutar_lote", { operaciones });
            App.ui.hideLoader();

            if (res.status === "success") {
                if (!Array.isArray(App.state.gastos)) App.state.gastos = [];
                App.state.gastos.push(...nuevosGastos);

                App.ui.toast("¡Gastos registrados!");
                App.router.handleRoute();
            } else {
                App.ui.toast(res.message || "Error al registrar gastos", "danger");
            }
        } catch (error) {
            console.error("Error en guardarMultiplesGastos:", error);
            App.ui.hideLoader();
            App.ui.toast(error.message || "Error al registrar gastos", "danger");
        }
    },

    async marcarPagoArtesanoPagado(pagoId) {
        try {
            if (!confirm("¿Marcar este pago como pagado?")) return;

            App.ui.showLoader("Actualizando pago...");

            const pago = (App.state?.pago_artesanos || []).find(p => p.id === pagoId);
            if (!pago) {
                App.ui.hideLoader();
                App.ui.toast("Pago no encontrado", "danger");
                return;
            }

            const datosActualizados = {
                estado: "pagado",
                fecha_pago: new Date().toISOString()
            };

            const res = await App.api.fetch("actualizar_fila", {
                nombreHoja: "pago_artesanos",
                idFila: pagoId,
                datosNuevos: datosActualizados
            });

            App.ui.hideLoader();

            if (res.status === "success") {
                Object.assign(pago, datosActualizados);
                App.ui.toast("Pago marcado como pagado");
                App.router.handleRoute();
            } else {
                App.ui.toast(res.message || "Error al actualizar pago", "danger");
            }
        } catch (error) {
            console.error("Error en marcarPagoArtesanoPagado:", error);
            App.ui.hideLoader();
            App.ui.toast(error.message || "Error al actualizar pago", "danger");
        }
    },

    _getPagoIdsSeleccionadosNomina() {
        return Array.from(document.querySelectorAll('.chk-pago-artesano:checked'))
            .map(chk => chk.value)
            .filter(Boolean);
    },

    _getArtesanoSeleccionadoNomina() {
        return document.getElementById('filtro-artesano-nomina')?.value || '';
    },

    _getPagosPendientesPorArtesano(artesanoId) {
        return (App.state.pago_artesanos || []).filter(p =>
            p.artesano_id === artesanoId &&
            String(p.estado || '').toLowerCase() === 'pendiente'
        );
    },

    async marcarPagosArtesanoPagadosMasivo(pagoIds, referencia = "") {
        try {
            const ids = Array.isArray(pagoIds) ? pagoIds.filter(Boolean) : [];
            if (!ids.length) {
                App.ui.toast("No seleccionaste pagos", "warning");
                return false;
            }

            App.ui.showLoader("Procesando pagos...");

            const fechaPago = new Date().toISOString();
            const operaciones = [];

            ids.forEach(id => {
                operaciones.push({
                    action: "actualizar_fila",
                    nombreHoja: "pago_artesanos",
                    idFila: id,
                    datosNuevos: {
                        estado: "pagado",
                        fecha_pago: fechaPago,
                        referencia_pago: referencia || ""
                    }
                });
            });

            const res = await App.api.fetch("ejecutar_lote", { operaciones });
            App.ui.hideLoader();

            if (res.status === "success") {
                (App.state.pago_artesanos || []).forEach(p => {
                    if (ids.includes(p.id)) {
                        p.estado = "pagado";
                        p.fecha_pago = fechaPago;
                        p.referencia_pago = referencia || "";
                    }
                });

                App.ui.toast(`${ids.length} pago(s) marcados como pagados`);
                App.router.handleRoute();
                return true;
            } else {
                App.ui.toast(res.message || "Error al actualizar pagos", "danger");
                return false;
            }
        } catch (error) {
            console.error("Error en marcarPagosArtesanoPagadosMasivo:", error);
            App.ui.hideLoader();
            App.ui.toast(error.message || "Error al procesar pagos", "danger");
            return false;
        }
    },

    async pagarSeleccionNomina() {
        const ids = this._getPagoIdsSeleccionadosNomina();
        if (!ids.length) {
            App.ui.toast("Selecciona al menos un pago", "warning");
            return;
        }

        if (!confirm(`¿Marcar ${ids.length} pago(s) como pagados?`)) return;
        await this.marcarPagosArtesanoPagadosMasivo(ids);
    },

    async pagarPendientesArtesanoSeleccionado() {
        const artesanoId = this._getArtesanoSeleccionadoNomina();
        if (!artesanoId) {
            App.ui.toast("Selecciona un artesano", "warning");
            return;
        }

        const pagos = this._getPagosPendientesPorArtesano(artesanoId);
        if (!pagos.length) {
            App.ui.toast("Ese artesano no tiene pagos pendientes", "warning");
            return;
        }

        if (!confirm(`¿Marcar ${pagos.length} pago(s) pendientes como pagados?`)) return;
        await this.marcarPagosArtesanoPagadosMasivo(pagos.map(p => p.id));
    },

    _getOrigenNomina(pa) {
        const ordenId = pa.orden_id || "";
        if (!ordenId) {
            return {
                folio: "SIN-ORDEN",
                detalle: pa.tipo_trabajo || "Trabajo"
            };
        }

        const orden = (App.state.ordenes_produccion || []).find(o => o.id === ordenId);
        if (!orden) {
            return {
                folio: ordenId,
                detalle: pa.tipo_trabajo || "Trabajo"
            };
        }

        const pedidoDetalle = (App.state.pedido_detalle || []).find(d => d.id === orden.pedido_detalle_id);
        const pedido = pedidoDetalle
            ? (App.state.pedidos || []).find(p => p.id === pedidoDetalle.pedido_id)
            : null;

        const producto = pedidoDetalle
            ? (App.state.productos || []).find(p => p.id === pedidoDetalle.producto_id)
            : null;

        if (producto) {
            return {
                folio: pedido ? (pedido.id || ordenId) : ordenId,
                detalle: producto.nombre || pa.tipo_trabajo || "Producto"
            };
        }

        const reparacion = (App.state.reparaciones || []).find(r =>
            r.id === ordenId ||
            r.orden_produccion_id === ordenId ||
            r.pedido_detalle_id === orden.pedido_detalle_id
        );

        if (reparacion) {
            return {
                folio: reparacion.id || ordenId,
                detalle: reparacion.descripcion || pa.tipo_trabajo || "Reparación"
            };
        }

        return {
            folio: ordenId,
            detalle: pa.tipo_trabajo || "Trabajo"
        };
    },

    _abrirVentanaImpresionHTML(html, titulo = "Comprobante") {
        const w = window.open("", "_blank", "width=1000,height=800");
        if (!w) {
            App.ui.toast("El navegador bloqueó la ventana de impresión", "warning");
            return;
        }

        w.document.open();
        w.document.write(html);
        w.document.close();
    },

    _generarHTMLComprobanteNomina({ titulo, subtitulo, artesanoNombre, pagos, total, referencia = "" }) {
        const fecha = new Date().toLocaleDateString("es-MX");
        const filas = pagos.map((p, idx) => {
            const origen = this._getOrigenNomina(p);
            const monto = parseFloat(p.total || 0) || 0;
            const unitario = parseFloat(p.monto_unitario || 0) || 0;
            const base = parseFloat(p.base_calculo || 1) || 1;

            return `
                <tr>
                    <td>${idx + 1}</td>
                    <td>${App.ui.escapeHTML(origen.folio)}</td>
                    <td>${App.ui.escapeHTML(origen.detalle)}</td>
                    <td>${App.ui.escapeHTML(p.componente || "Total")}</td>
                    <td>$${unitario.toFixed(2)} × ${base.toFixed(2)}</td>
                    <td>$${monto.toFixed(2)}</td>
                </tr>
            `;
        }).join("");

        return `
            <html>
            <head>
                <meta charset="utf-8">
                <title>${titulo}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        color: #1f2937;
                        background: #fff;
                        margin: 0;
                        padding: 24px;
                    }
                    .sheet {
                        max-width: 900px;
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
                        width: 78px;
                        height: 78px;
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
                        font-size: 22px;
                        font-weight: 700;
                        color: #111827;
                        margin-bottom: 6px;
                    }
                    .subtitle {
                        color: #6b7280;
                        margin-bottom: 18px;
                        font-size: 14px;
                    }
                    .box {
                        background: #faf5ff;
                        border: 1px solid #e9d8fd;
                        border-radius: 14px;
                        padding: 16px;
                        margin-bottom: 20px;
                    }
                    .box strong {
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
                    .totales {
                        margin-top: 20px;
                        display: flex;
                        justify-content: flex-end;
                    }
                    .totales-box {
                        width: 280px;
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
                    .total-final {
                        font-size: 18px;
                        font-weight: 700;
                        color: #6D28D9;
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
                        width: 90px;
                        height: 90px;
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
                            <div>Fecha: ${App.ui.escapeHTML(fecha)}</div>
                            ${referencia ? `<div>Referencia: ${App.ui.escapeHTML(referencia)}</div>` : ""}
                        </div>
                    </div>

                    <div class="content">
                        <div class="title">${App.ui.escapeHTML(titulo)}</div>
                        <div class="subtitle">${App.ui.escapeHTML(subtitulo || "")}</div>

                        <div class="box">
                            <div><strong>Artesano:</strong> ${App.ui.escapeHTML(artesanoNombre || "Varios")}</div>
                            <div><strong>Pagos incluidos:</strong> ${pagos.length}</div>
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Folio</th>
                                    <th>Trabajo</th>
                                    <th>Componente</th>
                                    <th>Cálculo</th>
                                    <th>Importe</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filas}
                            </tbody>
                        </table>

                        <div class="totales">
                            <div class="totales-box">
                                <div class="totales-row total-final">
                                    <span>Total</span>
                                    <span>$${(parseFloat(total || 0) || 0).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="footer">
                        <div class="footer-note">
                            Gracias por formar parte de Descanso Maya ❤️<br>
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

    imprimirComprobanteNominaArtesano(artesanoId, incluirPagados = false) {
        const artesano = (App.state.artesanos || []).find(a => a.id === artesanoId);
        if (!artesano) {
            App.ui.toast("Artesano no encontrado", "danger");
            return;
        }

        const pagos = (App.state.pago_artesanos || []).filter(p =>
            p.artesano_id === artesanoId &&
            (incluirPagados ? true : String(p.estado || '').toLowerCase() === 'pendiente')
        );

        if (!pagos.length) {
            App.ui.toast("No hay pagos para imprimir", "warning");
            return;
        }

        const total = pagos.reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);

        const html = this._generarHTMLComprobanteNomina({
            titulo: "Comprobante de nómina",
            subtitulo: incluirPagados ? "Histórico de pagos del artesano" : "Pagos pendientes del artesano",
            artesanoNombre: artesano.nombre,
            pagos,
            total
        });

        this._abrirVentanaImpresionHTML(html, "Comprobante de nómina");
    },

    imprimirComprobantePagoMasivo(pagoIds, titulo = "Comprobante de pago masivo") {
        const ids = Array.isArray(pagoIds) ? pagoIds.filter(Boolean) : [];
        if (!ids.length) {
            App.ui.toast("No seleccionaste pagos", "warning");
            return;
        }

        const pagos = (App.state.pago_artesanos || []).filter(p => ids.includes(p.id));
        if (!pagos.length) {
            App.ui.toast("No se encontraron pagos", "warning");
            return;
        }

        const artesanoIds = [...new Set(pagos.map(p => p.artesano_id).filter(Boolean))];
        const artesanoNombre = artesanoIds.length === 1
            ? ((App.state.artesanos || []).find(a => a.id === artesanoIds[0])?.nombre || "Artesano")
            : "Varios artesanos";

        const total = pagos.reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);

        const html = this._generarHTMLComprobanteNomina({
            titulo,
            subtitulo: "Relación de pagos incluidos en el lote",
            artesanoNombre,
            pagos,
            total
        });

        this._abrirVentanaImpresionHTML(html, titulo);
    },

    imprimirComprobanteArtesanoSeleccionado() {
        const artesanoId = this._getArtesanoSeleccionadoNomina();
        if (!artesanoId) {
            App.ui.toast("Selecciona un artesano", "warning");
            return;
        }

        this.imprimirComprobanteNominaArtesano(artesanoId, false);
    },

    imprimirSeleccionNomina() {
        const ids = this._getPagoIdsSeleccionadosNomina();
        if (!ids.length) {
            App.ui.toast("Selecciona al menos un pago", "warning");
            return;
        }

        this.imprimirComprobantePagoMasivo(ids, "Comprobante de pagos seleccionados");
    },

    renderGraficasFinanzas(filtro) {
        const cont = document.getElementById("finanzas-contenedor");
        if (!cont) return;

        const hoy = new Date();
        const mesActual = hoy.getMonth();
        const anioActual = hoy.getFullYear();

        const inputDesde = document.getElementById("fecha-desde");
        const inputHasta = document.getElementById("fecha-hasta");
        const fechaDesde = inputDesde ? inputDesde.value : null;
        const fechaHasta = inputHasta ? inputHasta.value : null;

        const metrics = {
            actual: {
                ventas: 0,
                ingresos: 0,
                gastos: 0,
                neto: 0,
                desglGastos: {},
                desglVentas: {}
            },
            previo: {
                ventas: 0,
                ingresos: 0,
                gastos: 0,
                neto: 0
            }
        };

        const clasificarFecha = (fechaStr) => {
            if (!fechaStr) return "fuera";
            const f = new Date(fechaStr);
            if (isNaN(f.getTime())) return "fuera";

            if (filtro === "custom") {
                if (!fechaDesde || !fechaHasta) return "actual";
                const dInicio = new Date(fechaDesde + "T00:00:00");
                const dFin = new Date(fechaHasta + "T23:59:59");
                return (f >= dInicio && f <= dFin) ? "actual" : "fuera";
            }

            const m = f.getMonth();
            const a = f.getFullYear();

            if (filtro === "todo") return "actual";

            if (filtro === "mes_actual") {
                if (a === anioActual && m === mesActual) return "actual";
                let mesPrev = mesActual - 1;
                let anioPrev = anioActual;
                if (mesPrev < 0) { mesPrev = 11; anioPrev--; }
                if (a === anioPrev && m === mesPrev) return "previo";
            }

            if (filtro === "mes_pasado") {
                let mesPrev = mesActual - 1;
                let anioPrev = anioActual;
                if (mesPrev < 0) { mesPrev = 11; anioPrev--; }
                if (a === anioPrev && m === mesPrev) return "actual";

                let mesPrev2 = mesPrev - 1;
                let anioPrev2 = anioPrev;
                if (mesPrev2 < 0) { mesPrev2 = 11; anioPrev2--; }
                if (a === anioPrev2 && m === mesPrev2) return "previo";
            }

            if (filtro === "trimestre_actual") {
                const trimActual = Math.floor(mesActual / 3);
                const trimFecha = Math.floor(m / 3);

                if (a === anioActual && trimFecha === trimActual) return "actual";

                let trimPrev = trimActual - 1;
                let anioPrev = anioActual;
                if (trimPrev < 0) { trimPrev = 3; anioPrev--; }

                if (a === anioPrev && trimFecha === trimPrev) return "previo";
            }

            if (filtro === "anio_actual") {
                if (a === anioActual) return "actual";
                if (a === anioActual - 1) return "previo";
            }

            return "fuera";
        };

        const obtenerEtiquetaFiltro = () => {
            if (filtro === "custom") {
                return (fechaDesde && fechaHasta)
                    ? `Del ${fechaDesde} al ${fechaHasta}`
                    : "Rango Personalizado";
            }

            const labels = {
                todo: "Todo el historial",
                mes_actual: "Este mes",
                mes_pasado: "Mes pasado",
                trimestre_actual: "Este trimestre",
                anio_actual: "Este año"
            };

            return labels[filtro] || filtro;
        };

        const categorizarVenta = (nombreProducto) => {
            const cat = String(nombreProducto || "").toLowerCase();
            if (cat.includes("silla")) return "Sillas";
            if (cat.includes("cojin") || cat.includes("cojín")) return "Cojines";
            if (cat.includes("accesorio") || cat.includes("hilo")) return "Insumos/Accesorios";
            return "Hamacas";
        };

        const categorizarGastoNormal = (categoria, descripcion) => {
            const catOriginal = String(categoria || "").toLowerCase();
            const desc = String(descripcion || "").toLowerCase();

            if (catOriginal.includes("reventa") || desc.includes("reventa") || desc.includes("hamaca")) return "Hamacas (Reventa)";
            if (desc.includes("silla")) return "Sillas";
            if (desc.includes("cojin") || desc.includes("cojín")) return "Cojines";
            if (catOriginal.includes("accesorio") || desc.includes("accesorio") || desc.includes("argolla") || desc.includes("guardacabo") || desc.includes("madera") || desc.includes("palo")) return "Accesorios";
            if (catOriginal.includes("material") || desc.includes("hilo") || desc.includes("nylon") || desc.includes("algodon") || desc.includes("crochet")) return "Materiales (Hilos)";
            if (catOriginal.includes("nomina") || catOriginal.includes("nómina") || desc.includes("nomina") || desc.includes("artesano") || desc.includes("pago a")) return "Nómina Artesanos";
            if (catOriginal.includes("servicio") || desc.includes("luz") || desc.includes("agua") || desc.includes("renta")) return "Servicios y Otros";

            return "Otros Gastos";
        };

        (App.state.pedidos || []).forEach((p) => {
            const clase = clasificarFecha(p.fecha_creacion);
            if (clase === "fuera") return;

            metrics[clase].ventas += parseFloat(p.total || 0);
            metrics[clase].ingresos += parseFloat(p.anticipo || 0);

            if (clase === "actual") {
                const detalles = (App.state.pedido_detalle || []).filter(d => d.pedido_id === p.id);

                if (detalles.length === 0) {
                    metrics.actual.desglVentas["Hamacas"] = (metrics.actual.desglVentas["Hamacas"] || 0) + parseFloat(p.total || 0);
                } else {
                    const totalPedido = parseFloat(p.total || 0);
                    const totalCant = detalles.reduce((s, d) => s + (parseFloat(d.cantidad || 0) || 1), 0) || 1;

                    detalles.forEach(det => {
                        const prod = (App.state.productos || []).find(x => x.id === det.producto_id);
                        const key = categorizarVenta(prod ? prod.nombre : "Hamaca");
                        const proporcion = (parseFloat(det.cantidad || 0) || 1) / totalCant;
                        metrics.actual.desglVentas[key] = (metrics.actual.desglVentas[key] || 0) + (totalPedido * proporcion);
                    });
                }
            }
        });

        (App.state.reparaciones || []).forEach((r) => {
            const clase = clasificarFecha(r.fecha_creacion);
            if (clase === "fuera") return;

            metrics[clase].ventas += parseFloat(r.precio || 0);
            metrics[clase].ingresos += parseFloat(r.anticipo || 0);

            if (clase === "actual") {
                metrics.actual.desglVentas["Reparaciones"] = (metrics.actual.desglVentas["Reparaciones"] || 0) + parseFloat(r.precio || 0);
            }
        });

        (App.state.abonos || []).forEach((a) => {
            const clase = clasificarFecha(a.fecha);
            if (clase !== "fuera") {
                metrics[clase].ingresos += parseFloat(a.monto || 0);
            }
        });

        (App.state.gastos || []).forEach((g) => {
            const clase = clasificarFecha(g.fecha);
            if (clase === "fuera") return;

            const montoGasto = parseFloat(g.monto || 0);
            metrics[clase].gastos += montoGasto;

            if (clase !== "actual") return;

            let isCompra = false;
            const desc = String(g.descripcion || "").toLowerCase();
            const compraIdMatch = desc.match(/(com-\d+)/i);

            if (compraIdMatch) {
                const compraId = compraIdMatch[1].toUpperCase();
                const compra = (App.state.compras || []).find(c => c.id === compraId);

                if (compra && compra.detalles) {
                    isCompra = true;

                    try {
                        const detalles = JSON.parse(compra.detalles);
                        const subTotales = {};
                        let totalCompraCalc = 0;

                        detalles.forEach(d => {
                            const mat = (App.state.inventario || []).find(m => m.id === d.mat_id);
                            const dNombre = String(d.nombre || "").toLowerCase();
                            const dTipo = mat ? String(mat.tipo || "").toLowerCase() : "";

                            let catAsignada = "Materiales (Hilos)";
                            if (dTipo === "reventa" || dNombre.includes("reventa") || dNombre.includes("hamaca")) catAsignada = "Hamacas (Reventa)";
                            else if (dNombre.includes("silla")) catAsignada = "Sillas";
                            else if (dNombre.includes("cojin") || dNombre.includes("cojín")) catAsignada = "Cojines";
                            else if (dTipo === "accesorio" || dNombre.includes("accesorio") || dNombre.includes("argolla") || dNombre.includes("guardacabo") || dNombre.includes("madera")) catAsignada = "Accesorios";

                            const costoFila = parseFloat(d.cantidad || 0) * parseFloat(d.costo_unitario || 0);
                            subTotales[catAsignada] = (subTotales[catAsignada] || 0) + costoFila;
                            totalCompraCalc += costoFila;
                        });

                        if (totalCompraCalc > 0) {
                            Object.keys(subTotales).forEach(cat => {
                                const proporcion = subTotales[cat] / totalCompraCalc;
                                metrics.actual.desglGastos[cat] = (metrics.actual.desglGastos[cat] || 0) + (montoGasto * proporcion);
                            });
                        } else {
                            metrics.actual.desglGastos["Materiales (Hilos)"] = (metrics.actual.desglGastos["Materiales (Hilos)"] || 0) + montoGasto;
                        }
                    } catch (e) {
                        metrics.actual.desglGastos["Materiales (Hilos)"] = (metrics.actual.desglGastos["Materiales (Hilos)"] || 0) + montoGasto;
                    }
                }
            }

            if (!isCompra) {
                const catAsignada = categorizarGastoNormal(g.categoria, g.descripcion);
                metrics.actual.desglGastos[catAsignada] = (metrics.actual.desglGastos[catAsignada] || 0) + montoGasto;
            }
        });

        metrics.actual.neto = metrics.actual.ingresos - metrics.actual.gastos;
        metrics.previo.neto = metrics.previo.ingresos - metrics.previo.gastos;

        let xCobrarGlobal = 0;
        let xPagarGlobal = 0;

        (App.state.pedidos || []).forEach((p) => {
            const abs = (App.state.abonos || [])
                .filter(a => a.pedido_id === p.id)
                .reduce((s, a) => s + parseFloat(a.monto || 0), 0);

            const sal = parseFloat(p.total || 0) - parseFloat(p.anticipo || 0) - abs;
            if (sal > 0) xCobrarGlobal += sal;
        });

        (App.state.reparaciones || []).forEach((r) => {
            const sal = parseFloat(r.precio || 0) - parseFloat(r.anticipo || 0);
            if (sal > 0) xCobrarGlobal += sal;
        });

        (App.state.pago_artesanos || []).forEach((pa) => {
            if (pa.estado === "pendiente") xPagarGlobal += parseFloat(pa.total || 0);
        });

        (App.state.compras || []).forEach((c) => {
            const pagado = c.monto_pagado !== undefined && c.monto_pagado !== ""
                ? parseFloat(c.monto_pagado)
                : parseFloat(c.total || 0);

            const deuda = parseFloat(c.total || 0) - pagado;
            if (deuda > 0) xPagarGlobal += deuda;
        });

        const getTendencia = (act, prev, inverso = false) => {
            if (filtro === "todo" || filtro === "custom") return "";

            if (prev === 0 && act === 0) {
                return `<span class="dm-text-sm dm-muted">Sin cambio</span>`;
            }

            if (prev === 0 && act > 0) {
                return `<span class="dm-text-sm" style="color:${inverso ? "#E53E3E" : "#38A169"}; font-weight:700;">⬆ 100%</span>`;
            }

            const varPorc = ((act - prev) / prev) * 100;
            const dir = varPorc >= 0 ? "⬆" : "⬇";
            let color = "#718096";

            if (varPorc > 0) color = inverso ? "#E53E3E" : "#38A169";
            else if (varPorc < 0) color = inverso ? "#38A169" : "#E53E3E";

            return `<span class="dm-text-sm" style="color:${color}; font-weight:700;">${dir} ${Math.abs(varPorc).toFixed(1)}%</span>`;
        };

        const act = metrics.actual;
        const prev = metrics.previo;
        const etiquetaFiltro = obtenerEtiquetaFiltro();

        const colorNeto = act.neto >= 0 ? "var(--dm-success)" : "var(--dm-danger)";
        const colorNetoSoft = act.neto >= 0 ? "var(--dm-success-soft)" : "var(--dm-danger-soft)";

        let html = `
            <div class="dm-card dm-mb-4" style="background:linear-gradient(135deg, #ffffff 0%, #faf7ff 100%);">
                <div class="dm-row-between dm-wrap" style="align-items:flex-start; gap:12px;">
                    <div>
                        <div class="dm-text-sm dm-muted">Periodo analizado</div>
                        <div class="dm-fw-bold dm-text-lg">${etiquetaFiltro}</div>
                    </div>
                    <div class="dm-badge dm-badge-primary">Actualizado con datos vivos</div>
                </div>
            </div>

            <div class="dm-grid dm-grid-kpi dm-mb-4">
                <div class="dm-kpi" onclick="App.views.detalleFinanzas('ventas', '${filtro}')" style="cursor:pointer;">
                    <div class="dm-kpi-label">Ventas totales</div>
                    <div class="dm-kpi-value" style="color:#3182CE;">$${act.ventas.toFixed(2)}</div>
                    <div class="dm-kpi-meta">${getTendencia(act.ventas, prev.ventas)}</div>
                </div>

                <div class="dm-kpi" onclick="App.views.detalleFinanzas('ingresos', '${filtro}')" style="cursor:pointer;">
                    <div class="dm-kpi-label">Ingresos reales</div>
                    <div class="dm-kpi-value" style="color:#2F855A;">$${act.ingresos.toFixed(2)}</div>
                    <div class="dm-kpi-meta">${getTendencia(act.ingresos, prev.ingresos)}</div>
                </div>

                <div class="dm-kpi" onclick="App.views.detalleFinanzas('gastos', '${filtro}')" style="cursor:pointer;">
                    <div class="dm-kpi-label">Gastos pagados</div>
                    <div class="dm-kpi-value" style="color:#4A5568;">$${act.gastos.toFixed(2)}</div>
                    <div class="dm-kpi-meta">${getTendencia(act.gastos, prev.gastos, true)}</div>
                </div>

                <div class="dm-kpi" style="background:${colorNetoSoft}; border-color:transparent;">
                    <div class="dm-kpi-label">Flujo neto</div>
                    <div class="dm-kpi-value" style="color:${colorNeto};">$${act.neto.toFixed(2)}</div>
                    <div class="dm-kpi-meta">${getTendencia(act.neto, prev.neto)}</div>
                </div>
            </div>

            <div class="dm-grid dm-grid-2 dm-mb-4">
                <div class="dm-card" onclick="App.views.detalleFinanzas('por_cobrar', 'todo')" style="cursor:pointer; background:#FFFBEB;">
                    <div class="dm-kpi-label" style="color:#B7791F;">Cuentas por cobrar</div>
                    <div class="dm-kpi-value" style="color:#D69E2E; font-size:1.4rem;">$${xCobrarGlobal.toFixed(2)}</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Dinero pendiente con clientes</div>
                </div>

                <div class="dm-card" onclick="App.views.detalleFinanzas('por_pagar', 'todo')" style="cursor:pointer; background:#FFF5F5;">
                    <div class="dm-kpi-label" style="color:#C53030;">Cuentas por pagar</div>
                    <div class="dm-kpi-value" style="color:#E53E3E; font-size:1.4rem;">$${xPagarGlobal.toFixed(2)}</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Deuda con proveedores y taller</div>
                </div>
            </div>

            <div class="dm-card dm-mb-4">
                <div class="dm-card-header">
                    <div>
                        <div class="dm-card-title">Comparativo de caja</div>
                        <div class="dm-card-subtitle">Ingresos vs salidas del periodo</div>
                    </div>
                </div>
                <canvas id="graficaFinanzas"></canvas>
            </div>

            <div class="dm-grid dm-grid-2 dm-mb-4">
                <div class="dm-card">
                    <div class="dm-card-header">
                        <div>
                            <div class="dm-card-title">Categorías de venta</div>
                            <div class="dm-card-subtitle">Distribución comercial</div>
                        </div>
                    </div>
                    <div style="position:relative; width:100%; min-height:280px;">
                        <canvas id="graficaVentasCanvas"></canvas>
                    </div>
                </div>

                <div class="dm-card">
                    <div class="dm-card-header">
                        <div>
                            <div class="dm-card-title">Destino de gastos</div>
                            <div class="dm-card-subtitle">Distribución del gasto pagado</div>
                        </div>
                    </div>
                    <div style="position:relative; width:100%; min-height:280px;">
                        <canvas id="graficaGastosCanvas"></canvas>
                    </div>
                </div>
            </div>

            <div class="dm-card">
                <div class="dm-row-between dm-wrap" style="gap:12px;">
                    <div>
                        <div class="dm-card-title">Exportación rápida</div>
                        <div class="dm-card-subtitle">Descarga la base de gastos del periodo actual</div>
                    </div>
                    <button class="dm-btn dm-btn-secondary" style="border-color:#38A169; color:#38A169; background:transparent;" onclick="window.exportarAExcel(App.state.gastos, 'Gastos_${etiquetaFiltro.replace(/ /g, "_")}')">
                        📥 Exportar gastos
                    </button>
                </div>
            </div>
        `;

        cont.innerHTML = html;

        setTimeout(() => {
            if (!window.Chart) return;

            const colores = ["#4C51BF", "#ED8936", "#38B2AC", "#E53E3E", "#ECC94B", "#805AD5", "#3182CE", "#2F855A"];

            const totalVentasCat = Object.values(act.desglVentas).reduce((a, b) => a + b, 0);
            const labelsVentas = Object.keys(act.desglVentas).map(k =>
                `${k} (${totalVentasCat > 0 ? ((act.desglVentas[k] / totalVentasCat) * 100).toFixed(1) : 0}%)`
            );

            const totalGastosCat = Object.values(act.desglGastos).reduce((a, b) => a + b, 0);
            const labelsGastos = Object.keys(act.desglGastos).map(k =>
                `${k} (${totalGastosCat > 0 ? ((act.desglGastos[k] / totalGastosCat) * 100).toFixed(1) : 0}%)`
            );

            const pluginPorcentajes = {
                id: "pluginPorcentajes",
                afterDatasetsDraw(chart) {
                    const { ctx, data } = chart;
                    ctx.save();
                    ctx.font = "bold 12px sans-serif";
                    ctx.fillStyle = "white";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.shadowColor = "rgba(0,0,0,0.55)";
                    ctx.shadowBlur = 4;

                    const meta = chart.getDatasetMeta(0);
                    const total = data.datasets[0].data.reduce((a, b) => a + b, 0);

                    meta.data.forEach((element, index) => {
                        const val = data.datasets[0].data[index];
                        if (val > 0 && total > 0) {
                            const porcentaje = Math.round((val / total) * 100);
                            if (porcentaje > 4) {
                                const pos = element.tooltipPosition();
                                ctx.fillText(porcentaje + "%", pos.x, pos.y);
                            }
                        }
                    });

                    ctx.restore();
                }
            };

            const ctx1 = document.getElementById("graficaFinanzas");
            if (ctx1) {
                if (window.graficaActual) window.graficaActual.destroy();
                window.graficaActual = new Chart(ctx1, {
                    type: "bar",
                    data: {
                        labels: ["Ingresos caja", "Salidas caja"],
                        datasets: [{
                            label: "Monto ($)",
                            data: [act.ingresos, act.gastos],
                            backgroundColor: ["#38A169", "#E53E3E"],
                            borderRadius: 8
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { display: false } }
                    }
                });
            }

            const ctxV = document.getElementById("graficaVentasCanvas");
            if (ctxV) {
                if (window.graficaVentasD) window.graficaVentasD.destroy();
                window.graficaVentasD = new Chart(ctxV, {
                    type: "doughnut",
                    data: {
                        labels: labelsVentas,
                        datasets: [{
                            data: Object.values(act.desglVentas),
                            backgroundColor: colores
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: "bottom",
                                labels: { font: { size: 11 }, padding: 15 }
                            }
                        }
                    },
                    plugins: [pluginPorcentajes]
                });
            }

            const ctxG = document.getElementById("graficaGastosCanvas");
            if (ctxG) {
                if (window.graficaGastosD) window.graficaGastosD.destroy();
                window.graficaGastosD = new Chart(ctxG, {
                    type: "doughnut",
                    data: {
                        labels: labelsGastos,
                        datasets: [{
                            data: Object.values(act.desglGastos),
                            backgroundColor: colores
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: "bottom",
                                labels: { font: { size: 11 }, padding: 15 }
                            }
                        }
                    },
                    plugins: [pluginPorcentajes]
                });
            }
        }, 300);
    }
});
