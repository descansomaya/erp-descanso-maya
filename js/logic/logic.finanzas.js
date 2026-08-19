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

    // ==========================================
// MOTOR FINANCIERO CENTRAL
// ==========================================
// VENTA:
//   Solo pedidos entregados válidos.
//
// COBRADO:
//   Anticipos + abonos de pedidos válidos,
//   aunque todavía no estén entregados.
//
// STOCK INTERNO:
//   Nunca genera venta ni cobro.
//
// CANCELADO / DEVUELTO:
//   No cuentan como venta ni cobro.
// ==========================================

obtenerResumenFinancieroCentral(filtro = 'todo') {

    const pedidos = App.state.pedidos || [];
    const abonos = App.state.abonos || [];
    const reparaciones = App.state.reparaciones || [];
    const gastos = App.state.gastos || [];

    const entraEnFiltro = (fechaStr) => {

        if (!fechaStr) {
            return filtro === 'todo';
        }

        const fecha = new Date(fechaStr);

        if (isNaN(fecha.getTime())) {
            return false;
        }

        if (filtro === 'todo') {
            return true;
        }

        const hoy = new Date();
        const mesActual = hoy.getMonth();
        const anioActual = hoy.getFullYear();

        if (filtro === 'mes_actual') {
            return (
                fecha.getMonth() === mesActual &&
                fecha.getFullYear() === anioActual
            );
        }

        if (filtro === 'trimestre_actual') {
            return (
                fecha.getFullYear() === anioActual &&
                Math.floor(fecha.getMonth() / 3) ===
                Math.floor(mesActual / 3)
            );
        }

        if (filtro === 'anio_actual') {
            return fecha.getFullYear() === anioActual;
        }

        if (filtro === 'custom') {

            const desde = App.state.finanzasFechaDesde || '';
            const hasta = App.state.finanzasFechaHasta || '';

            if (!desde || !hasta) {
                return true;
            }

            const fechaDesde =
                new Date(desde + 'T00:00:00');

            const fechaHasta =
                new Date(hasta + 'T23:59:59');

            return (
                fecha >= fechaDesde &&
                fecha <= fechaHasta
            );
        }

        return true;
    };

    // ==========================================
    // PEDIDOS VÁLIDOS PARA COBROS
    // ==========================================

    const pedidosCobro = pedidos.filter(p => {

        if (!p) return false;

        return (
            App.logic.estado.cuentaComoCobro(p) &&
            entraEnFiltro(
                p.fecha_creacion ||
                p.fecha_pedido ||
                p.fecha
            )
        );
    });

    // ==========================================
    // VENTAS VÁLIDAS
    // ==========================================

    const pedidosVenta = pedidosCobro.filter(p =>
        App.logic.estado.esVenta(p)
    );

    const ventasPedidos = pedidosVenta.reduce(
        (sum, p) =>
            sum + (parseFloat(p.total || 0) || 0),
        0
    );

    // ==========================================
    // ANTICIPOS
    // ==========================================

    const anticipos = pedidosCobro.reduce(
        (sum, p) =>
            sum + (parseFloat(p.anticipo || 0) || 0),
        0
    );

    // ==========================================
    // ABONOS
    // ==========================================

    const pedidosCobroIds = new Set(
        pedidosCobro.map(p => String(p.id))
    );

    const abonosValidos = abonos.filter(a => {

        if (!a) return false;

        if (!pedidosCobroIds.has(String(a.pedido_id))) {
            return false;
        }

        return entraEnFiltro(
            a.fecha ||
            a.fecha_creacion
        );
    });

    const totalAbonos = abonosValidos.reduce(
        (sum, a) =>
            sum + (parseFloat(a.monto || 0) || 0),
        0
    );

    // ==========================================
    // COBRADO REAL
    // ==========================================

    const cobrado =
        anticipos +
        totalAbonos;

    // ==========================================
    // REPARACIONES ENTREGADAS
    // ==========================================

    const reparacionesValidas = reparaciones.filter(r => {

        if (!r) return false;

        const estado = String(r.estado || '')
            .toLowerCase()
            .trim();

        return (
            estado === 'entregado' ||
            estado === 'entregada'
        ) &&
        entraEnFiltro(
            r.fecha_entrega ||
            r.fecha_creacion ||
            r.fecha
        );
    });

    const ventasReparaciones =
        reparacionesValidas.reduce(
            (sum, r) =>
                sum + (parseFloat(r.precio || 0) || 0),
            0
        );

    // ==========================================
    // VENTAS TOTALES
    // ==========================================

    const ventas =
        ventasPedidos +
        ventasReparaciones;

    // ==========================================
    // POR COBRAR
    // ==========================================

    const porCobrar = Math.max(
        0,
        ventas - cobrado
    );

    // ==========================================
    // GASTOS
    // ==========================================

    const gastosValidos = gastos.filter(g =>
        entraEnFiltro(g.fecha)
    );

    const totalGastos = gastosValidos.reduce(
        (sum, g) =>
            sum + (parseFloat(g.monto || 0) || 0),
        0
    );

    return {
        ventas,

        ventasPedidos,
        ventasReparaciones,

        anticipos,
        abonos: totalAbonos,

        cobrado,
        porCobrar,

        gastos: totalGastos,

        pedidosVenta: pedidosVenta.length,
        pedidosCobro: pedidosCobro.length,

        abonosValidos: abonosValidos.length,
        reparacionesVenta: reparacionesValidas.length,

        detalle: {
            pedidosVenta,
            pedidosCobro,
            abonosValidos,
            reparacionesValidas,
            gastosValidos
        }
    };
},

    // ==========================================
// MOTOR CENTRAL DE COBRANZA / CxC
// ==========================================
//
// VENTA:
//   Solo pedido entregado.
//
// COBRADO:
//   Anticipo + abonos de pedidos válidos,
//   aunque todavía no estén entregados.
//
// CxC:
//   Saldo pendiente de pedidos válidos.
//
// STOCK INTERNO:
//   Nunca genera cobro.
//
// CANCELADO / DEVUELTO:
//   No generan cobro ni CxC.
// ==========================================

obtenerResumenCobranzaCentral(filtro = 'todo') {

    const pedidos = App.state.pedidos || [];
    const abonos = App.state.abonos || [];
    const reparaciones = App.state.reparaciones || [];
    const abonosReparaciones = App.state.abonos_reparaciones || [];

    const entraEnFiltro = (fechaStr) => {

        if (!fechaStr) {
            return filtro === 'todo';
        }

        const fecha = new Date(fechaStr);

        if (isNaN(fecha.getTime())) {
            return false;
        }

        if (filtro === 'todo') {
            return true;
        }

        const hoy = new Date();
        const mesActual = hoy.getMonth();
        const anioActual = hoy.getFullYear();

        if (filtro === 'mes_actual') {
            return (
                fecha.getMonth() === mesActual &&
                fecha.getFullYear() === anioActual
            );
        }

        if (filtro === 'trimestre_actual') {
            return (
                fecha.getFullYear() === anioActual &&
                Math.floor(fecha.getMonth() / 3) ===
                Math.floor(mesActual / 3)
            );
        }

        if (filtro === 'anio_actual') {
            return (
                fecha.getFullYear() === anioActual
            );
        }

        if (filtro === 'custom') {

            const desde = App.state.finanzasFechaDesde || '';
            const hasta = App.state.finanzasFechaHasta || '';

            if (!desde || !hasta) {
                return true;
            }

            const fechaDesde =
                new Date(desde + 'T00:00:00');

            const fechaHasta =
                new Date(hasta + 'T23:59:59');

            return (
                fecha >= fechaDesde &&
                fecha <= fechaHasta
            );
        }

        return true;
    };

    // ==========================================
    // PEDIDOS VÁLIDOS PARA COBRANZA
    // ==========================================

    const pedidosValidos = pedidos.filter(p =>
        App.logic.estado.cuentaComoCobro(p)
    );

    // ==========================================
    // ANTICIPOS
    // ==========================================

    const pedidosAnticipo = pedidosValidos.filter(p =>
        entraEnFiltro(
            p.fecha_creacion ||
            p.fecha_pedido ||
            p.fecha
        )
    );

    const anticiposPedidos =
        pedidosAnticipo.reduce(
            (sum, p) =>
                sum +
                (parseFloat(p.anticipo || 0) || 0),
            0
        );

    // ==========================================
    // ABONOS DE PEDIDOS
    // ==========================================

    const pedidosValidosIds = new Set(
        pedidosValidos.map(p => String(p.id))
    );

    const abonosPedidosValidos = abonos.filter(a => {

        if (!a) return false;

        if (!pedidosValidosIds.has(String(a.pedido_id))) {
            return false;
        }

        return entraEnFiltro(
            a.fecha ||
            a.fecha_creacion
        );
    });

    const totalAbonosPedidos =
        abonosPedidosValidos.reduce(
            (sum, a) =>
                sum +
                (parseFloat(a.monto || 0) || 0),
            0
        );

    // ==========================================
    // COBRADO DE PEDIDOS
    // ==========================================

    const cobradoPedidos =
        anticiposPedidos +
        totalAbonosPedidos;

    // ==========================================
    // CxC PEDIDOS
    // ==========================================

    const cuentasPorCobrarPedidos =
        pedidosAnticipo.reduce(
            (sum, p) => {

                const abonosPedido =
                    abonos
                        .filter(a =>
                            String(a.pedido_id) === String(p.id)
                        )
                        .reduce(
                            (s, a) =>
                                s +
                                (parseFloat(a.monto || 0) || 0),
                            0
                        );

                const total =
                    parseFloat(p.total || 0) || 0;

                const anticipo =
                    parseFloat(p.anticipo || 0) || 0;

                const saldo =
                    Math.max(
                        0,
                        total -
                        anticipo -
                        abonosPedido
                    );

                return sum + saldo;
            },
            0
        );

    // ==========================================
    // REPARACIONES
    // ==========================================

    const reparacionesValidas =
        reparaciones.filter(r => {

            if (!r) return false;

            return ![
                'cancelada',
                'cancelado',
                'devuelta',
                'devuelto'
            ].includes(
                String(r.estado || '')
                    .toLowerCase()
                    .trim()
            );
        });

    const reparacionesFiltro =
        reparacionesValidas.filter(r =>
            entraEnFiltro(
                r.fecha_creacion ||
                r.fecha
            )
        );

    const anticiposReparaciones =
        reparacionesFiltro.reduce(
            (sum, r) =>
                sum +
                (
                    parseFloat(
                        r.anticipo_inicial ||
                        r.anticipo ||
                        0
                    ) || 0
                ),
            0
        );

    const reparacionesIds = new Set(
        reparacionesValidas.map(r => String(r.id))
    );

    const abonosReparacionesValidos =
        abonosReparaciones.filter(a => {

            if (!a) return false;

            if (!reparacionesIds.has(
                String(a.reparacion_id)
            )) {
                return false;
            }

            return entraEnFiltro(
                a.fecha ||
                a.fecha_creacion
            );
        });

    const totalAbonosReparaciones =
        abonosReparacionesValidos.reduce(
            (sum, a) =>
                sum +
                (parseFloat(a.monto || 0) || 0),
            0
        );

    const cobradoReparaciones =
        anticiposReparaciones +
        totalAbonosReparaciones;

    const cuentasPorCobrarReparaciones =
        reparacionesFiltro.reduce(
            (sum, r) => {

                const anticipo =
                    parseFloat(
                        r.anticipo_inicial ||
                        r.anticipo ||
                        0
                    ) || 0;

                const abonos =
                    abonosReparaciones
                        .filter(a =>
                            String(a.reparacion_id) ===
                            String(r.id)
                        )
                        .reduce(
                            (s, a) =>
                                s +
                                (
                                    parseFloat(
                                        a.monto || 0
                                    ) || 0
                                ),
                            0
                        );

                const total =
                    parseFloat(r.precio || 0) || 0;

                const saldo =
                    Math.max(
                        0,
                        total -
                        anticipo -
                        abonos
                    );

                return sum + saldo;
            },
            0
        );

    // ==========================================
    // TOTALES
    // ==========================================

    const cobrado =
        cobradoPedidos +
        cobradoReparaciones;

    const porCobrar =
        cuentasPorCobrarPedidos +
        cuentasPorCobrarReparaciones;

    return {

        cobrado,

        porCobrar,

        anticipos:
            anticiposPedidos +
            anticiposReparaciones,

        abonos:
            totalAbonosPedidos +
            totalAbonosReparaciones,

        cobradoPedidos,

        cobradoReparaciones,

        porCobrarPedidos:
            cuentasPorCobrarPedidos,

        porCobrarReparaciones:
            cuentasPorCobrarReparaciones,

        anticiposPedidos,

        anticiposReparaciones,

        abonosPedidos:
            totalAbonosPedidos,

        abonosReparaciones:
            totalAbonosReparaciones,

        pedidosCobranza:
            pedidosAnticipo,

        reparacionesCobranza:
            reparacionesFiltro,

        abonosPedidosValidos,

        abonosReparacionesValidos
    };
},

   renderMiniGraficasDashboard() {
    if (!window.Chart) {
        console.warn("Chart.js no está cargado para indicadores operativos.");
        return;
    }

    window.miniGraficaOperacion = window.miniGraficaOperacion || null;

    const pedidos = App.state.pedidos || [];

    // ==========================================
    // FUENTE CENTRAL DE ESTADOS
    // ==========================================

    const pedidosActivos = App.logic.estado.pedidosActivos(pedidos);

    const normalizarEstado = (pedido) =>
        App.logic.estado.normalizar(pedido?.estado);

    // ==========================================
    // DISTRIBUCIÓN OPERATIVA
    // ==========================================

    const pedidosNuevos = pedidosActivos.filter(p => {
        const estado = normalizarEstado(p);

        return (
            estado === "nuevo" ||
            estado === "pendiente"
        );
    });

    const pedidosTaller = pedidosActivos.filter(p =>
        normalizarEstado(p) === "taller"
    );

    const pedidosListos = pedidosActivos.filter(p =>
        normalizarEstado(p) === "listo para entregar"
    );

    const pedidosActivosTotal = pedidosActivos.length;

    // ==========================================
    // ELEMENTOS RESUMEN
    // ==========================================

    const actualizarTexto = (id, valor) => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = valor;
    };

    actualizarTexto(
        "finanzasPedidosActivos",
        pedidosActivosTotal
    );

    actualizarTexto(
        "finanzasPedidosTaller",
        pedidosTaller.length
    );

    actualizarTexto(
        "finanzasPedidosListos",
        pedidosListos.length
    );

    actualizarTexto(
        "finanzasPedidosNuevos",
        pedidosNuevos.length
    );

    // ==========================================
    // GRÁFICA DE ESTADO OPERATIVO
    // ==========================================

    const ctxOp = document.getElementById("miniGraficaOperacion");

    if (!ctxOp) return;

    if (
        window.miniGraficaOperacion &&
        typeof window.miniGraficaOperacion.destroy === "function"
    ) {
        window.miniGraficaOperacion.destroy();
    }

    window.miniGraficaOperacion = new Chart(ctxOp, {
        type: "bar",

        data: {
            labels: [
                "Nuevos",
                "En taller",
                "Listos para entregar"
            ],

            datasets: [{
                label: "Pedidos",
                data: [
                    pedidosNuevos.length,
                    pedidosTaller.length,
                    pedidosListos.length
                ],

                backgroundColor: [
                    "#3182CE",
                    "#805AD5",
                    "#D69E2E"
                ],

                borderRadius: 8
            }]
        },

        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    display: false
                },

                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.raw} pedido(s)`;
                        }
                    }
                }
            },

            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
      });
},

    renderGraficasFinanzas(filtro) {

    console.log("========== GRÁFICAS FINANZAS ==========");
    console.log("1. renderGraficasFinanzas fue llamado");
    console.log("Filtro:", filtro);
    console.log("Chart disponible:", typeof window.Chart);

    if (!window.Chart) {
        console.error("❌ Chart.js NO está disponible");
        return;
    }

    const ctxIngresosGastos = document.getElementById(
        "graficaFinanzasIngresosGastos"
    );

    const ctxFlujo = document.getElementById(
        "graficaFinanzasFlujo"
    );

    console.log(
        "2. Canvas ingresos/gastos:",
        ctxIngresosGastos
    );

    console.log(
        "3. Canvas flujo:",
        ctxFlujo
    );

    if (!ctxIngresosGastos && !ctxFlujo) {
        console.error(
            "❌ No existen los canvas cuando se ejecutó renderGraficasFinanzas"
        );
        return;
    }

    console.log("4. Canvas encontrados. Continuando...");

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

                // ==========================================
        // FUENTE FINANCIERA CENTRAL
        // ==========================================
        // Las gráficas utilizan exactamente el mismo
        // motor que utiliza el Resumen financiero.
        // ==========================================

        const resumen =
            App.logic.obtenerResumenFinancieroCentral(filtro);

        const ventas = resumen.ventas;
        const ingresos = resumen.cobrado;

        // ==========================================
        // EGRESOS
        // ==========================================

        const gastos = App.state.gastos || [];
        const compras = App.state.compras || [];
        const pagosArtesanos = App.state.pago_artesanos || [];

        const gastosFil = gastos.filter(g =>
            entraEnFiltro(g.fecha)
        );

        const comprasFil = compras.filter(c =>
            entraEnFiltro(
                c.fecha ||
                c.fecha_creacion
            )
        );

        const pagosArtesanosFil =
            pagosArtesanos.filter(p =>
                entraEnFiltro(
                    p.fecha_pago ||
                    p.fecha ||
                    p.fecha_creacion
                )
            );

        // ==========================================
        // COMPRAS PAGADAS
        // ==========================================

        const totalCompras =
            comprasFil.reduce(
                (acc, c) => {

                    const pagado =
                        c.monto_pagado !== undefined &&
                        c.monto_pagado !== ""
                            ? parseFloat(c.monto_pagado || 0)
                            : 0;

                    return acc + pagado;

                },
                0
            );

        // ==========================================
        // NÓMINA PAGADA
        // ==========================================

        const totalNomina =
            pagosArtesanosFil
                .filter(p =>
                    String(p.estado || "")
                        .toLowerCase()
                        .trim() === "pagado"
                )
                .reduce(
                    (acc, p) =>
                        acc +
                        (parseFloat(p.total || 0) || 0),
                    0
                );

        // ==========================================
        // GASTOS OPERATIVOS
        // ==========================================

        const gastosOperativosPuros =
            gastosFil
                .filter(g => {

                    const desc =
                        String(
                            g.concepto ||
                            g.descripcion ||
                            ""
                        ).toLowerCase();

                    return (
                        !desc.includes("compra") &&
                        !desc.includes("materiales y insumos") &&
                        !desc.includes("hilo")
                    );
                })
                .reduce(
                    (acc, g) =>
                        acc +
                        (parseFloat(g.monto || 0) || 0),
                    0
                );

        // ==========================================
        // EGRESOS TOTALES
        // ==========================================

        const egresos =
            gastosOperativosPuros +
            totalCompras +
            totalNomina;

        // ==========================================
        // FLUJO NETO
        // ==========================================

        const flujoNeto =
            ingresos - egresos;

        if (ctxIngresosGastos) {
            if (window.graficaFinanzasIngresosGastos && typeof window.graficaFinanzasIngresosGastos.destroy === "function") {
                window.graficaFinanzasIngresosGastos.destroy();
            }

            window.graficaFinanzasIngresosGastos = new Chart(ctxIngresosGastos, {
                type: "bar",
                data: {
                    labels: ["Ventas", "Ingresos", "Gastos Op.", "Compras", "Nómina"],
                    datasets: [{
                        label: "Monto ($)",
                        data: [ventas, ingresos, gastosOperativosPuros, totalCompras, totalNomina],
                        backgroundColor: ["#3182CE", "#38A169", "#E53E3E", "#D69E2E", "#805AD5"],
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
                    labels: ["Ingresos", "Egresos totales", "Flujo neto"],
                    datasets: [{
                        data: [
                            Math.max(ingresos, 0),
                            Math.max(egresos, 0),
                            Math.max(flujoNeto, 0)
                        ],
                        backgroundColor: ["#38A169", "#E53E3E", "#3182CE"]
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
    }
});
