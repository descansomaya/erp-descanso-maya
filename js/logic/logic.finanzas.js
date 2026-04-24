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

    renderMiniGraficasDashboard() {
        if (!window.Chart) {
            console.warn("Chart.js no está cargado para mini gráficas.");
            return;
        }

        window.miniGraficaIG = window.miniGraficaIG || null;
        window.miniGraficaCP = window.miniGraficaCP || null;
        window.miniGraficaOperacion = window.miniGraficaOperacion || null;

        const hoy = new Date();
        const mesActual = hoy.getMonth();
        const anioActual = hoy.getFullYear();

        const esMismoMes = (fechaStr) => {
            if (!fechaStr) return false;
            const f = new Date(fechaStr);
            return !isNaN(f.getTime()) && f.getMonth() === mesActual && f.getFullYear() === anioActual;
        };

        const pedidos = App.state.pedidos || [];
        const reparaciones = App.state.reparaciones || [];
        const abonos = App.state.abonos || [];
        const abonosReparaciones = App.state.abonos_reparaciones || [];
        const gastos = App.state.gastos || [];
        const pagosArtesanos = App.state.pago_artesanos || [];
        const compras = App.state.compras || [];

        const ingresosMesPedidos = pedidos
            .filter(p => esMismoMes(p.fecha_creacion))
            .reduce((acc, p) => acc + (parseFloat(p.anticipo || 0) || 0), 0);

        const ingresosMesAbonos = abonos
            .filter(a => esMismoMes(a.fecha))
            .reduce((acc, a) => acc + (parseFloat(a.monto || 0) || 0), 0);

        const ingresosMesReparacionesInicial = reparaciones
            .filter(r => esMismoMes(r.fecha_creacion))
            .reduce((acc, r) => acc + (parseFloat(r.anticipo_inicial || r.anticipo || 0) || 0), 0);

        const ingresosMesAbonosReparacion = abonosReparaciones
            .filter(a => esMismoMes(a.fecha))
            .reduce((acc, a) => acc + (parseFloat(a.monto || 0) || 0), 0);

        const ingresosMes = ingresosMesPedidos + ingresosMesAbonos + ingresosMesReparacionesInicial + ingresosMesAbonosReparacion;

        const gastosMes = gastos
            .filter(g => esMismoMes(g.fecha))
            .reduce((acc, g) => acc + (parseFloat(g.monto || 0) || 0), 0);

        const porCobrarPedidos = pedidos.reduce((acc, p) => {
            const totalAbonos = abonos
                .filter(a => a.pedido_id === p.id)
                .reduce((s, a) => s + (parseFloat(a.monto || 0) || 0), 0);

            const saldo = (parseFloat(p.total || 0) || 0) - (parseFloat(p.anticipo || 0) || 0) - totalAbonos;
            return acc + (saldo > 0 ? saldo : 0);
        }, 0);

        const porCobrarReparaciones = reparaciones.reduce((acc, r) => {
            const anticipoInicial = parseFloat(r.anticipo_inicial || 0) || 0;
            const totalAbonosRep = abonosReparaciones
                .filter(a => a.reparacion_id === r.id)
                .reduce((s, a) => s + (parseFloat(a.monto || 0) || 0), 0);

            const saldo = (parseFloat(r.precio || 0) || 0) - anticipoInicial - totalAbonosRep;
            return acc + (saldo > 0 ? saldo : 0);
        }, 0);

        const porPagarArtesanos = pagosArtesanos
            .filter(p => String(p.estado || '').toLowerCase() === 'pendiente')
            .reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);

        const porPagarCompras = compras.reduce((acc, c) => {
            const total = parseFloat(c.total || 0) || 0;
            const pagado = c.monto_pagado !== undefined && c.monto_pagado !== ''
                ? parseFloat(c.monto_pagado || 0)
                : total;
            const deuda = total - pagado;
            return acc + (deuda > 0 ? deuda : 0);
        }, 0);

        const totalPorCobrar = porCobrarPedidos + porCobrarReparaciones;
        const totalPorPagar = porPagarArtesanos + porPagarCompras;

        const pedidosActivos = pedidos.filter(p => {
            const e = String(p.estado || '').toLowerCase();
            return e !== 'entregado' && e !== 'pagado';
        }).length;

        const reparacionesActivas = reparaciones.filter(r => {
            const e = String(r.estado || '').toLowerCase();
            return e !== 'entregada';
        }).length;

        const listos = pedidos.filter(p => String(p.estado || '').toLowerCase() === 'listo para entregar').length
            + reparaciones.filter(r => String(r.estado || '').toLowerCase() === 'lista').length;

        const baseOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            }
        };

        const ctxIG = document.getElementById("miniGraficaIngresosGastos");
        if (ctxIG) {
            if (window.miniGraficaIG && typeof window.miniGraficaIG.destroy === 'function') {
                window.miniGraficaIG.destroy();
            }
            window.miniGraficaIG = new Chart(ctxIG, {
                type: "bar",
                data: {
                    labels: ["Ingresos", "Gastos"],
                    datasets: [{
                        data: [ingresosMes, gastosMes],
                        backgroundColor: ["#38A169", "#E53E3E"],
                        borderRadius: 8
                    }]
                },
                options: {
                    ...baseOptions,
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }

        const ctxCP = document.getElementById("miniGraficaCobrarPagar");
        if (ctxCP) {
            if (window.miniGraficaCP && typeof window.miniGraficaCP.destroy === 'function') {
                window.miniGraficaCP.destroy();
            }
            window.miniGraficaCP = new Chart(ctxCP, {
                type: "doughnut",
                data: {
                    labels: ["Por cobrar", "Por pagar"],
                    datasets: [{
                        data: [totalPorCobrar, totalPorPagar],
                        backgroundColor: ["#D69E2E", "#805AD5"]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: "bottom",
                            labels: { boxWidth: 12, font: { size: 11 } }
                        }
                    }
                }
            });
        }

        const ctxOp = document.getElementById("miniGraficaOperacion");
        if (ctxOp) {
            if (window.miniGraficaOperacion && typeof window.miniGraficaOperacion.destroy === 'function') {
                window.miniGraficaOperacion.destroy();
            }
            window.miniGraficaOperacion = new Chart(ctxOp, {
                type: "bar",
                data: {
                    labels: ["Pedidos", "Reparaciones", "Listos"],
                    datasets: [{
                        data: [pedidosActivos, reparacionesActivas, listos],
                        backgroundColor: ["#3182CE", "#805AD5", "#D69E2E"],
                        borderRadius: 8
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: { beginAtZero: true }
                    }
                }
            });
        }
    },

   renderGraficasFinanzas(filtro) {
    if (!window.Chart) {
        console.warn("Chart.js no está cargado para gráficas financieras.");
        return;
    }

    const ctxIngresosGastos = document.getElementById("graficaFinanzasIngresosGastos");
    const ctxFlujo = document.getElementById("graficaFinanzasFlujo");

    if (!ctxIngresosGastos && !ctxFlujo) return;

    window.graficaFinanzasIngresosGastos = window.graficaFinanzasIngresosGastos || null;
    window.graficaFinanzasFlujo = window.graficaFinanzasFlujo || null;

    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    const fechaDesde = App.state.finanzasFechaDesde || "";
    const fechaHasta = App.state.finanzasFechaHasta || "";

    const entraEnFiltro = (fechaStr) => {
        if (!fechaStr) return filtro === "todo";

        const f = new Date(fechaStr);
        if (isNaN(f.getTime())) return false;

        if (filtro === "todo") return true;

        if (filtro === "custom") {
            if (!fechaDesde || !fechaHasta) return true;

            const d1 = new Date(fechaDesde + "T00:00:00");
            const d2 = new Date(fechaHasta + "T23:59:59");
            return f >= d1 && f <= d2;
        }

        if (filtro === "mes_actual") {
            return f.getMonth() === mesActual && f.getFullYear() === anioActual;
        }

        if (filtro === "trimestre_actual") {
            const trimHoy = Math.floor(mesActual / 3);
            const trimFecha = Math.floor(f.getMonth() / 3);
            return f.getFullYear() === anioActual && trimFecha === trimHoy;
        }

        if (filtro === "anio_actual") {
            return f.getFullYear() === anioActual;
        }

        return true;
    };

    const pedidos = App.state.pedidos || [];
    const reparaciones = App.state.reparaciones || [];
    const abonos = App.state.abonos || [];
    const abonosReparaciones = App.state.abonos_reparaciones || [];
    const gastos = App.state.gastos || [];
    const compras = App.state.compras || [];
    const pagosArtesanos = App.state.pago_artesanos || [];

    const pedidosFil = pedidos.filter(p => entraEnFiltro(p.fecha_creacion || p.fecha));
    const reparacionesFil = reparaciones.filter(r => entraEnFiltro(r.fecha_creacion || r.fecha));
    const abonosFil = abonos.filter(a => entraEnFiltro(a.fecha));
    const abonosRepFil = abonosReparaciones.filter(a => entraEnFiltro(a.fecha));
    const gastosFil = gastos.filter(g => entraEnFiltro(g.fecha));
    const comprasFil = compras.filter(c => entraEnFiltro(c.fecha || c.fecha_creacion));
    const pagosArtesanosFil = pagosArtesanos.filter(p => entraEnFiltro(p.fecha_pago || p.fecha || p.fecha_creacion));

    const ventas = pedidosFil.reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0)
        + reparacionesFil.reduce((acc, r) => acc + (parseFloat(r.precio || 0) || 0), 0);

    const ingresos = abonosFil.reduce((acc, a) => acc + (parseFloat(a.monto || 0) || 0), 0)
        + pedidosFil.reduce((acc, p) => acc + (parseFloat(p.anticipo || 0) || 0), 0)
        + abonosRepFil.reduce((acc, a) => acc + (parseFloat(a.monto || 0) || 0), 0)
        + reparacionesFil.reduce((acc, r) => acc + (parseFloat(r.anticipo_inicial || r.anticipo || 0) || 0), 0);

    const totalGastos = gastosFil.reduce((acc, g) => acc + (parseFloat(g.monto || 0) || 0), 0);
    const totalCompras = comprasFil.reduce((acc, c) => acc + (parseFloat(c.total || 0) || 0), 0);
    const totalNomina = pagosArtesanosFil.reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);
    const egresos = totalGastos + totalCompras + totalNomina;
    const flujoNeto = ingresos - egresos;

    if (ctxIngresosGastos) {
        if (window.graficaFinanzasIngresosGastos && typeof window.graficaFinanzasIngresosGastos.destroy === "function") {
            window.graficaFinanzasIngresosGastos.destroy();
        }

        window.graficaFinanzasIngresosGastos = new Chart(ctxIngresosGastos, {
            type: "bar",
            data: {
                labels: ["Ventas", "Ingresos", "Egresos"],
                datasets: [{
                    label: "Monto",
                    data: [ventas, ingresos, egresos],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    if (ctxFlujo) {
        if (window.graficaFinanzasFlujo && typeof window.graficaFinanzasFlujo.destroy === "function") {
            window.graficaFinanzasFlujo.destroy();
        }

        window.graficaFinanzasFlujo = new Chart(ctxFlujo, {
            type: "doughnut",
            data: {
                labels: ["Ingresos", "Egresos", "Flujo neto"],
                datasets: [{
                    data: [
                        Math.max(ingresos, 0),
                        Math.max(egresos, 0),
                        Math.max(flujoNeto, 0)
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: "bottom"
                    }
                }
            }
        });
    }
},
});
