// ==========================================
// VISTAS: PEDIDOS Y COTIZACIONES (CORREGIDO Y OFICIAL)
// ==========================================

window.App = window.App || {};
App.views = App.views || {};

App.views.runPedidoAction = async function (button, pedidoId, actionName, actionFn, options = {}) {
    return App.ui.runSafeAction({
        lockKey: options.lockKey || `pedido:${pedidoId}:${actionName}`,
        button,
        loadingText: options.loadingText || "Procesando...",
        loaderMessage: options.loaderMessage || "Actualizando pedido...",
        successMessage: options.successMessage || "Acción completada",
        errorTitle: options.errorTitle || "No se pudo actualizar el pedido",
        toastOnSuccess: options.toastOnSuccess !== false
    }, async () => actionFn());
};

// ==========================================
// FUNCIONES AUXILIARES DE COTIZACIONES
// ==========================================
App.views._resumenConversionCotizaciones = function () {
    const cotizaciones = App.state.cotizaciones || [];
    const total = cotizaciones.length;
    const convertidas = cotizaciones.filter(c => String(c.estado_conversion || '').toLowerCase() === 'convertida').length;
    const pendientes = total - convertidas;
    const montoCotizado = cotizaciones.reduce((acc, c) => acc + (parseFloat(c.total || 0) || 0), 0);
    const montoConvertido = cotizaciones
        .filter(c => String(c.estado_conversion || '').toLowerCase() === 'convertida')
        .reduce((acc, c) => acc + (parseFloat(c.total || 0) || 0), 0);
    const tasa = total > 0 ? (convertidas / total) * 100 : 0;
    return { total, convertidas, pendientes, montoCotizado, montoConvertido, tasa };
};

App.views._cotizacionPuedeImprimir = function () {
    return !!(App.logic && (App.logic.imprimirCotizacion || App.logic.imprimirNota || App.logic.imprimirReciboLiquidacion));
};

// ==========================================
// PLANTILLA DE IMPRESIÓN OFICIAL DESCANSO MAYA
// ==========================================

App.views._generarHTMLDocumentoOficial = function ({
    tituloDoc,
    folio,
    fecha,
    clienteNombre,
    fechaEntrega,
    estado,
    filasTabla,
    total,
    anticipo,
    abonos,
    saldo
}) {

    const esCotizacion =
        String(tituloDoc || '')
            .toLowerCase()
            .includes('cotiz');

    const estadoTexto =
        String(estado || 'PENDIENTE')
            .toUpperCase();

    const estadoLower =
        String(estado || '')
            .toLowerCase();

    let estadoClase = 'status-pendiente';

    if (estadoLower.includes('produccion')) {
        estadoClase = 'status-produccion';
    } else if (estadoLower.includes('listo')) {
        estadoClase = 'status-listo';
    } else if (
        estadoLower.includes('entregado') ||
        estadoLower.includes('pagado')
    ) {
        estadoClase = 'status-entregado';
    }

    const fechaEntregaHTML = fechaEntrega
        ? `
            <div class="info-card">

                <div class="info-label">
                    Fecha de entrega
                </div>

                <div class="info-value">
                    ${App.ui.safe(fechaEntrega)}
                </div>

            </div>
        `
        : '';

    /*
     * IMPORTANTE:
     * Guarda el logo en:
     *
     * assets/logo-descanso-maya.png
     *
     * El QR apunta directamente al Facebook oficial.
     */

    const logoURL =
        'assets/logo-descanso-maya.png';

    const facebookURL =
        'https://www.facebook.com/descansomaya.mx/';

    const qrURL =
        'https://quickchart.io/qr?size=180&text=' +
        encodeURIComponent(facebookURL);


    return `
<!DOCTYPE html>

<html lang="es">

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>
        ${App.ui.safe(tituloDoc)}
        -
        ${App.ui.safe(folio)}
    </title>


    <style>

        @page {

            size: Letter;

            margin: 0;

        }


        * {

            box-sizing: border-box;

        }


        html,
        body {

            margin: 0;

            padding: 0;

            width: 100%;

            min-height: 100%;

            background: #ffffff;

            color: #1f2937;

            font-family:
                "Segoe UI",
                Arial,
                Helvetica,
                sans-serif;

            -webkit-print-color-adjust:
                exact !important;

            print-color-adjust:
                exact !important;

        }


        body {

            font-size: 12px;

        }


        .page {

            width: 8.5in;

            min-height: 11in;

            padding:
                0.45in
                0.48in
                0.40in
                0.48in;

            background: #ffffff;

        }


        /* =====================================
           ENCABEZADO
        ===================================== */

        .header {

            display: flex;

            justify-content:
                space-between;

            align-items:
                flex-start;

            padding-bottom:
                14px;

            border-bottom:
                2px solid #6b46c1;

            margin-bottom:
                22px;

        }


        .brand {

            display: flex;

            align-items:
                center;

            gap: 14px;

        }


        .logo {

            width: 145px;

            height: 70px;

            object-fit:
                contain;

            object-position:
                left center;

        }


        .brand-text {

            padding-top:
                2px;

        }


        .brand-name {

            color:
                #6b46c1;

            font-size:
                22px;

            font-weight:
                800;

            line-height:
                1.05;

        }


        .brand-sub {

            margin-top:
                5px;

            color:
                #718096;

            font-size:
                11px;

        }


        .document-info {

            text-align:
                right;

            min-width:
                190px;

        }


        .document-title {

            color:
                #2d3748;

            font-size:
                17px;

            font-weight:
                800;

            text-transform:
                uppercase;

            margin-bottom:
                8px;

        }


        .document-meta {

            color:
                #718096;

            font-size:
                11px;

            line-height:
                1.6;

        }


        .document-meta strong {

            color:
                #2d3748;

        }


        /* =====================================
           DATOS DEL CLIENTE
        ===================================== */

        .info-grid {

            display:
                grid;

            grid-template-columns:
                repeat(3, 1fr);

            gap:
                12px;

            margin-bottom:
                22px;

        }


        .info-card {

            border:
                1px solid #e2e8f0;

            border-radius:
                10px;

            padding:
                11px 13px;

            background:
                #f8fafc;

            min-height:
                65px;

        }


        .info-label {

            color:
                #a0aec0;

            font-size:
                9px;

            font-weight:
                800;

            text-transform:
                uppercase;

            margin-bottom:
                5px;

        }


        .info-value {

            color:
                #2d3748;

            font-size:
                12px;

            font-weight:
                600;

            line-height:
                1.3;

            word-break:
                break-word;

        }


        /* =====================================
           ESTADOS
        ===================================== */

        .status-badge {

            display:
                inline-block;

            padding:
                4px 9px;

            border-radius:
                999px;

            font-size:
                9px;

            font-weight:
                800;

            text-transform:
                uppercase;

        }


        .status-pendiente {

            background:
                #feebc8;

            color:
                #744210;

        }


        .status-produccion {

            background:
                #e9d8fd;

            color:
                #553c9a;

        }


        .status-listo {

            background:
                #fef3c7;

            color:
                #92400e;

        }


        .status-entregado {

            background:
                #c6f6d5;

            color:
                #22543d;

        }


        /* =====================================
           TABLA
        ===================================== */

        .table-container {

            width: 100%;

            margin-bottom:
                20px;

        }


        table {

            width: 100%;

            border-collapse:
                collapse;

            table-layout:
                fixed;

        }


        thead {

            display:
                table-header-group;

        }


        tr {

            page-break-inside:
                avoid;

        }


        th {

            background:
                #f1f5f9;

            color:
                #4a5568;

            font-size:
                10px;

            font-weight:
                800;

            text-transform:
                uppercase;

            padding:
                9px 8px;

            border-bottom:
                2px solid #cbd5e1;

        }


        td {

            color:
                #2d3748;

            font-size:
                11px;

            padding:
                9px 8px;

            border-bottom:
                1px solid #e2e8f0;

            vertical-align:
                middle;

        }


        th:nth-child(1),
        td:nth-child(1) {

            width:
                7%;

        }


        th:nth-child(2),
        td:nth-child(2) {

            width:
                43%;

        }


        th:nth-child(3),
        td:nth-child(3) {

            width:
                13%;

        }


        th:nth-child(4),
        td:nth-child(4) {

            width:
                18%;

        }


        th:nth-child(5),
        td:nth-child(5) {

            width:
                19%;

        }


        .text-center {

            text-align:
                center;

        }


        .text-right {

            text-align:
                right;

        }


        /* =====================================
           TOTALES
        ===================================== */

        .totals-wrapper {

            display:
                flex;

            justify-content:
                flex-end;

            margin-top:
                15px;

        }


        .totals-box {

            width:
                285px;

            border:
                1px solid #e2e8f0;

            border-radius:
                10px;

            padding:
                12px 15px;

            background:
                #f8fafc;

        }


        .total-row {

            display:
                flex;

            justify-content:
                space-between;

            align-items:
                center;

            padding:
                4px 0;

            color:
                #4a5568;

            font-size:
                11px;

        }


        .total-row strong {

            color:
                #2d3748;

        }


        .total-row.saldo {

            margin-top:
                6px;

            padding-top:
                9px;

            border-top:
                2px solid #cbd5e1;

            color:
                #e53e3e;

            font-size:
                15px;

            font-weight:
                800;

        }


        .total-row.saldo span:last-child {

            color:
                #e53e3e;

            font-weight:
                800;

        }


        /* =====================================
           PIE
        ===================================== */

        .footer {

            display:
                flex;

            justify-content:
                space-between;

            align-items:
                flex-end;

            gap:
                25px;

            margin-top:
                30px;

            padding-top:
                15px;

            border-top:
                1px solid #e2e8f0;

        }


        .footer-text {

            flex:
                1;

            color:
                #718096;

            font-size:
                10px;

            line-height:
                1.6;

        }


        .footer-text strong {

            color:
                #4a5568;

        }


        .footer-social {

            width:
                125px;

            text-align:
                center;

        }


        .qr {

            width:
                80px;

            height:
                80px;

            display:
                block;

            margin:
                0 auto 6px;

        }


        .facebook {

            color:
                #4a5568;

            font-size:
                9px;

            white-space:
                nowrap;

        }


        /* =====================================
           IMPRESIÓN
        ===================================== */

        @media print {

            html,
            body {

                width:
                    8.5in;

                min-height:
                    11in;

            }


            .page {

                width:
                    8.5in;

                min-height:
                    11in;

            }

        }

    </style>

</head>


<body>

    <div class="page">


        <!-- =================================
             ENCABEZADO
        ================================= -->

        <div class="header">


            <div class="brand">

                <img
                    class="logo"
                    src="${logoURL}"
                    alt="Descanso Maya"
                >


                <div class="brand-text">

                    <div class="brand-name">
                        Descanso Maya
                    </div>

                    <div class="brand-sub">
                        Hamacas y Accesorios Artesanales
                    </div>

                </div>

            </div>


            <div class="document-info">

                <div class="document-title">
                    ${App.ui.safe(tituloDoc)}
                </div>


                <div class="document-meta">

                    Fecha:
                    <strong>
                        ${App.ui.safe(fecha)}
                    </strong>

                </div>


                <div class="document-meta">

                    Folio:
                    <strong>
                        ${App.ui.safe(folio)}
                    </strong>

                </div>

            </div>

        </div>


        <!-- =================================
             INFORMACIÓN
        ================================= -->

        <div class="info-grid">


            <div class="info-card">

                <div class="info-label">
                    Cliente
                </div>

                <div class="info-value">
                    ${App.ui.safe(
                        clienteNombre ||
                        'Cliente General'
                    )}
                </div>

            </div>


            <div class="info-card">

                <div class="info-label">
                    Estado
                </div>

                <div class="info-value">

                    <span
                        class="status-badge ${estadoClase}"
                    >
                        ${App.ui.safe(estadoTexto)}
                    </span>

                </div>

            </div>


            ${fechaEntregaHTML}


        </div>


        <!-- =================================
             TABLA
        ================================= -->

        <div class="table-container">

            <table>

                <thead>

                    <tr>

                        <th
                            class="text-center"
                        >
                            #
                        </th>

                        <th>
                            Concepto
                        </th>

                        <th
                            class="text-center"
                        >
                            Cant.
                        </th>

                        <th
                            class="text-right"
                        >
                            Unitario
                        </th>

                        <th
                            class="text-right"
                        >
                            Importe
                        </th>

                    </tr>

                </thead>


                <tbody>

                    ${filasTabla}

                </tbody>

            </table>

        </div>


        <!-- =================================
             TOTALES
        ================================= -->

        <div class="totals-wrapper">

            <div class="totals-box">


                <div class="total-row">

                    <span>
                        Total
                    </span>

                    <strong>
                        ${App.ui.money(total)}
                    </strong>

                </div>


                <div class="total-row">

                    <span>
                        Anticipo
                    </span>

                    <strong>
                        ${App.ui.money(anticipo)}
                    </strong>

                </div>


                ${
                    parseFloat(abonos || 0) > 0
                        ? `
                            <div class="total-row">

                                <span>
                                    Abonos
                                </span>

                                <strong>
                                    ${App.ui.money(abonos)}
                                </strong>

                            </div>
                        `
                        : ''
                }


                <div class="total-row saldo">

                    <span>
                        Saldo
                    </span>

                    <span>
                        ${App.ui.money(saldo)}
                    </span>

                </div>


            </div>

        </div>


        <!-- =================================
             PIE
        ================================= -->

        <div class="footer">


            <div class="footer-text">

                <strong>
                    Gracias por su preferencia ❤️
                </strong>

                <br>

                Conserva este comprobante para cualquier
                aclaración o seguimiento de tu pedido.

            </div>


            <div class="footer-social">


                <img
                    class="qr"
                    src="${qrURL}"
                    alt="QR Facebook Descanso Maya"
                >


                <div class="facebook">

                    facebook.com/descansomaya.mx

                </div>


            </div>


        </div>


    </div>


    <script>

        window.onload = function () {

            setTimeout(function () {

                window.print();

            }, 300);

        };


        window.onafterprint = function () {

            setTimeout(function () {

                window.close();

            }, 150);

        };

    </script>


</body>

</html>
    `;
};


// ==========================================
// IMPRIMIR PEDIDO
// ==========================================

App.views.imprimirNotaPedido = function (pedidoId) {

    const pedido =
        (App.state.pedidos || [])
            .find(
                p => p.id === pedidoId
            );

    if (!pedido) {

        App.ui.toast(
            'Pedido no encontrado',
            'danger'
        );

        return;

    }


    const cliente =
        (App.state.clientes || [])
            .find(
                c =>
                    c.id === pedido.cliente_id
            ) || {};


    const detalles =
        (App.state.pedido_detalle || [])
            .filter(
                d =>
                    d.pedido_id === pedidoId
            );


    const abonosLista =
        (App.state.abonos || [])
            .filter(
                a =>
                    a.pedido_id === pedidoId
            );


    const totalAbonos =
        abonosLista.reduce(
            (s, a) =>
                s +
                (parseFloat(a.monto || 0) || 0),
            0
        );


    const totalPed =
        parseFloat(
            pedido.total || 0
        ) || 0;


    const anticipoPed =
        parseFloat(
            pedido.anticipo || 0
        ) || 0;


    const saldo =
        Math.max(
            0,
            totalPed -
            anticipoPed -
            totalAbonos
        );


    let filasTabla = '';


    detalles.forEach(
        (d, idx) => {

            const prod =
                (App.state.productos || [])
                    .find(
                        p =>
                            p.id === d.producto_id
                    );


            const cant =
                parseFloat(
                    d.cantidad || 1
                ) || 1;


            const unit =
                parseFloat(
                    d.precio_unitario || 0
                ) || 0;


            const sub =
                cant * unit;


            filasTabla += `

                <tr>

                    <td class="text-center">
                        ${idx + 1}
                    </td>

                    <td>
                        ${App.ui.safe(
                            prod
                                ? prod.nombre
                                : 'Artículo'
                        )}
                    </td>

                    <td class="text-center">
                        ${cant}
                    </td>

                    <td class="text-right">
                        ${App.ui.money(unit)}
                    </td>

                    <td class="text-right">
                        ${App.ui.money(sub)}
                    </td>

                </tr>

            `;

        }
    );


    const esInterno =
        pedido.cliente_id ===
        'STOCK_INTERNO';


    const nombreCliente =
        esInterno
            ? 'STOCK BODEGA'
            : (
                cliente.nombre ||
                pedido.cliente_nombre ||
                'Cliente General'
            );


    const html =
        App.views._generarHTMLDocumentoOficial({

            tituloDoc:
                'Nota de pedido',

            folio:
                pedido.id,

            fecha:
                String(
                    pedido.fecha_creacion ||
                    ''
                ).split('T')[0] ||
                new Date()
                    .toISOString()
                    .split('T')[0],

            clienteNombre:
                nombreCliente,

            fechaEntrega:
                pedido.fecha_entrega
                    ? String(
                        pedido.fecha_entrega
                    ).split('T')[0]
                    : '',

            estado:
                pedido.estado ||
                'Pendiente',

            filasTabla:
                filasTabla ||
                `
                    <tr>
                        <td
                            colspan="5"
                            class="text-center"
                        >
                            Sin detalles
                        </td>
                    </tr>
                `,

            total:
                totalPed,

            anticipo:
                anticipoPed,

            abonos:
                totalAbonos,

            saldo:
                saldo

        });


    const w =
        window.open(
            '',
            '_blank'
        );


    if (!w) {

        App.ui.toast(
            'El navegador bloqueó la ventana de impresión',
            'warning'
        );

        return;

    }


    w.document.open();

    w.document.write(html);

    w.document.close();

};


// ==========================================
// IMPRIMIR COTIZACIÓN
// ==========================================

App.views.imprimirCotizacion = function (
    cotizacionId
) {

    const c =
        (App.state.cotizaciones || [])
            .find(
                x =>
                    x.id === cotizacionId
            );


    if (!c) {

        App.ui.toast(
            'Cotización no encontrada',
            'danger'
        );

        return;

    }


    const prod =
        (App.state.productos || [])
            .find(
                p =>
                    p.id === c.producto_id
            );


    const cant =
        parseFloat(
            c.cantidad || 1
        ) || 1;


    const totalCot =
        parseFloat(
            c.total || 0
        ) || 0;


    const unit =
        cant > 0
            ? totalCot / cant
            : totalCot;


    const filasTabla = `

        <tr>

            <td class="text-center">
                1
            </td>

            <td>

                ${App.ui.safe(
                    c.concepto ||
                    (
                        prod
                            ? prod.nombre
                            : 'Cotización'
                    )
                )}

            </td>

            <td class="text-center">
                ${cant}
            </td>

            <td class="text-right">
                ${App.ui.money(unit)}
            </td>

            <td class="text-right">
                ${App.ui.money(totalCot)}
            </td>

        </tr>

    `;


    const convertida =
        String(
            c.estado_conversion || ''
        ).toLowerCase() ===
        'convertida';


    const html =
        App.views._generarHTMLDocumentoOficial({

            tituloDoc:
                'Cotización',

            folio:
                c.id,

            fecha:
                String(
                    c.fecha ||
                    c.fecha_creacion ||
                    ''
                ).split('T')[0] ||
                new Date()
                    .toISOString()
                    .split('T')[0],

            clienteNombre:
                c.cliente_nombre ||
                'Cliente General',

            fechaEntrega:
                '',

            estado:
                convertida
                    ? 'CONVERTIDA A PEDIDO'
                    : 'COTIZACIÓN',

            filasTabla:
                filasTabla,

            total:
                totalCot,

            anticipo:
                0,

            abonos:
                0,

            saldo:
                totalCot

        });


    const w =
        window.open(
            '',
            '_blank'
        );


    if (!w) {

        App.ui.toast(
            'El navegador bloqueó la ventana de impresión',
            'warning'
        );

        return;

    }


    w.document.open();

    w.document.write(html);

    w.document.close();

};

App.views.accionPedido = function (button, pedidoId, actionName) {
    const actions = {
        cancelarPedido: { fn: () => App.logic.cancelarPedido(pedidoId), loadingText: "Cancelando...", loaderMessage: "Cancelando pedido y revirtiendo inventario...", successMessage: "Pedido cancelado", errorTitle: "No se pudo cancelar el pedido" },
        devolverPedido: { fn: () => App.logic.devolverPedido(pedidoId), loadingText: "Devolviendo...", loaderMessage: "Registrando devolución...", successMessage: "Devolución registrada", errorTitle: "No se pudo registrar la devolución" },
        marcarListo: {
            fn: () => App.logic.marcarPedidoListo(pedidoId),
            loadingText: "Marcando...",
            loaderMessage: "Marcando pedido como listo...",
            successMessage: "Pedido marcado como listo",
            errorTitle: "No se pudo marcar como listo"
        },
        marcarEntregado: {
            fn: () => App.logic.marcarPedidoEntregado(pedidoId),
            loadingText: "Entregando...",
            loaderMessage: "Marcando pedido como entregado...",
            successMessage: "Pedido marcado como entregado",
            errorTitle: "No se pudo marcar como entregado"
        },
        cerrarPedido: {
            fn: () => App.logic.cerrarPedidoSiLiquidado(pedidoId),
            loadingText: "Cerrando...",
            loaderMessage: "Cerrando pedido...",
            successMessage: "Pedido cerrado correctamente",
            errorTitle: "No se pudo cerrar el pedido"
        },
        imprimirNota: {
            fn: async () => App.views.imprimirNotaPedido(pedidoId),
            loadingText: "Generando...",
            loaderMessage: "Generando nota...",
            successMessage: "Nota generada",
            errorTitle: "No se pudo generar la nota"
        },
        imprimirLiquidacion: {
            fn: async () => App.views.imprimirNotaPedido(pedidoId),
            loadingText: "Generando...",
            loaderMessage: "Generando recibo de liquidación...",
            successMessage: "Recibo generado",
            errorTitle: "No se pudo generar la liquidación"
        },
        whatsappCobro: {
            fn: () => App.logic.enviarWhatsApp(pedidoId, 'cobro'),
            loadingText: "Preparando...",
            loaderMessage: "Preparando mensaje de WhatsApp...",
            successMessage: "Mensaje preparado",
            errorTitle: "No se pudo preparar WhatsApp"
        },
        whatsappListo: {
            fn: () => App.logic.enviarWhatsApp(pedidoId, 'listo'),
            loadingText: "Preparando...",
            loaderMessage: "Preparando mensaje de WhatsApp...",
            successMessage: "Mensaje preparado",
            errorTitle: "No se pudo preparar WhatsApp"
        },
        eliminarPedido: {
            fn: () => App.logic.eliminarPedido(pedidoId),
            loadingText: "Eliminando...",
            loaderMessage: "Validando taller y eliminando pedido...",
            toastOnSuccess: false,
            errorTitle: "No se pudo eliminar el pedido"
        }
    };

    const config = actions[actionName];
    if (!config) {
        App.ui.toast('Acción no disponible', 'warning');
        return;
    }

    return App.views.runPedidoAction(button, pedidoId, actionName, config.fn, config);
};

App.views.accionAbono = function (button, abonoId, actionName) {
    const actions = {
        imprimirRecibo: {
            fn: () => App.views.imprimirNotaPedido(abonoId),
            loadingText: "Generando...",
            loaderMessage: "Generando recibo de abono...",
            successMessage: "Recibo generado",
            errorTitle: "No se pudo generar el recibo"
        },
        eliminarAbono: {
            fn: () => App.logic.eliminarRegistroGenerico('abonos_clientes', abonoId, 'abonos'),
            loadingText: "Eliminando...",
            loaderMessage: "Eliminando abono...",
            successMessage: "Abono eliminado",
            errorTitle: "No se pudo eliminar el abono"
        }
    };

    const config = actions[actionName];
    if (!config) {
        App.ui.toast('Acción no disponible', 'warning');
        return;
    }

    return App.ui.runSafeAction({
        lockKey: `abono:${abonoId}:${actionName}`,
        button,
        loadingText: config.loadingText,
        loaderMessage: config.loaderMessage,
        successMessage: config.successMessage,
        errorTitle: config.errorTitle
    }, async () => config.fn());
};

// ==========================================
// PEDIDOS Y COTIZACIONES
// ==========================================
App.views.pedidos = function() {
    const todosPedidos = App.state.pedidos || [];
    const mostrarHistorico = App.state.mostrarHistoricoPedidos || false;

const activos = todosPedidos.filter(p => {
    const est = String(p.estado || '').toLowerCase().trim();
    return !['entregado','cancelado','devuelto'].includes(est);
});

const entregados = todosPedidos.filter(p => {
    const est = String(p.estado || '').toLowerCase().trim();
    return ['entregado','cancelado','devuelto'].includes(est);
});

    const listaAMostrar = mostrarHistorico ? todosPedidos : activos;

    const getColorEstado = (estado) => {
        estado = String(estado || '').toLowerCase();
        if (estado.includes('produccion') || estado.includes('taller')) return 'var(--dm-primary)';
        if (estado.includes('listo')) return '#D69E2E';
        if (estado.includes('entregado')) return 'var(--dm-success)';
        if (estado.includes('cancelado')) return '#dc2626';
        if (estado.includes('devuelto')) return '#f59e0b';
        return 'var(--dm-muted)';
    };

    let html = `
        <div class="dm-section" style="padding-bottom:90px;">
            <div class="dm-card dm-mb-4">
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <div class="dm-row-between" style="align-items:center; flex-wrap:wrap; gap:10px;">
                        <h3 class="dm-card-title">Pedidos</h3>
                        <div style="display:flex; gap:8px;">
                            <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.modalRendimientoVendedores()">👔 Vendedores</button>
                            <button class="dm-btn ${mostrarHistorico ? 'dm-btn-primary' : 'dm-btn-ghost'} dm-btn-sm" style="border:1px solid var(--dm-border);" onclick="App.state.mostrarHistoricoPedidos = !App.state.mostrarHistoricoPedidos; App.router.handleRoute();">
                                ${mostrarHistorico ? '📦 Ver Solo Activos (' + activos.length + ')' : '📜 Histórico Completos (' + entregados.length + ')'}
                            </button>
                        </div>
                    </div>
                    <input type="text" id="bus-ped" class="dm-input" placeholder="🔍 Buscar pedido o cliente..." onkeyup="window.filtrarLista('bus-ped','tarj-ped')">
                </div>
            </div>

            <div class="dm-list">
    `;

    if (listaAMostrar.length === 0) {
        html += `<div class="dm-alert dm-alert-info">${mostrarHistorico ? 'No hay pedidos en el histórico.' : 'No hay pedidos activos pendientes.'}</div>`;
    }

    listaAMostrar.forEach(p => {
        const colorEstado = getColorEstado(p.estado);
        const esInterno = p.cliente_id === 'STOCK_INTERNO';

        html += `
            <div class="dm-list-card tarj-ped">
                <div style="display:flex; flex-direction:column; gap:12px;">
                    <div class="dm-row-between" style="flex-wrap:wrap; gap:10px; align-items:flex-start;">
                        <div style="flex:1; min-width:0;">
                            <strong>${App.ui.safe(p.id)}</strong><br>
                            <small class="dm-muted">${App.ui.safe(esInterno ? 'STOCK BODEGA' : (p.cliente_nombre || ''))}</small>
                        </div>

                        <span class="dm-badge" style="background:${colorEstado}; color:white;">${App.ui.safe(p.estado || 'Pendiente')}</span>
                    </div>

                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(110px,1fr)); gap:10px; text-align:center;">
                        <div><small class="dm-muted">Total</small><br><strong>${App.ui.money(p.total || 0)}</strong></div>
                        <div><small class="dm-muted">Anticipo</small><br><strong>${App.ui.money(p.anticipo || 0)}</strong></div>
                        <div><small class="dm-muted">Fecha</small><br><strong>${(p.fecha_creacion || '').split('T')[0]}</strong></div>
                    </div>

                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button class="dm-btn dm-btn-primary dm-btn-sm" onclick="App.views.modalDetallesPedido('${p.id}')">👁️ Ver</button>
                        ${!esInterno && !['pagado','cancelado','devuelto','entregado'].includes(String(p.estado || '').toLowerCase()) ? `<button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.modalAbonos('${p.id}')">💰 Cobrar</button>` : ''}
                        ${!['cancelado','devuelto','entregado','pagado'].includes(String(p.estado || '').toLowerCase()) ? `<button class="dm-btn dm-btn-danger dm-btn-sm" onclick="App.views.accionPedido(this, '${p.id}', 'eliminarPedido')">🗑️ Eliminar</button>` : ''}
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div></div><button class="dm-fab" onclick="App.views.formPedido()">+</button>`;
    return html;
};

App.views.cotizaciones = function() {
    const cotizaciones = [...(App.state.cotizaciones || [])].sort((a, b) => new Date(b.fecha || b.fecha_creacion || 0) - new Date(a.fecha || a.fecha_creacion || 0));
    const resumen = App.views._resumenConversionCotizaciones();
    const fabricado = cotizaciones.filter(c => String(c.tipo || '').toLowerCase() === 'fabricado').length;
    const reventa = cotizaciones.filter(c => String(c.tipo || '').toLowerCase() === 'reventa').length;
    const reparacion = cotizaciones.filter(c => String(c.tipo || '').toLowerCase() === 'reparacion').length;

    let html = `
        <div class="dm-section" style="padding-bottom:90px;">
            <div class="dm-mb-4" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px,1fr)); gap:12px;">
                <div class="dm-card"><small class="dm-muted">Total cotizado</small><div class="dm-text-xl dm-fw-bold">${App.ui.money(resumen.montoCotizado)}</div></div>
                <div class="dm-card"><small class="dm-muted">Monto convertido</small><div class="dm-text-xl dm-fw-bold" style="color:var(--dm-success);">${App.ui.money(resumen.montoConvertido)}</div></div>
                <div class="dm-card"><small class="dm-muted">Tasa conversión</small><div class="dm-text-xl dm-fw-bold">${resumen.tasa.toFixed(1)}%</div></div>
                <div class="dm-card"><small class="dm-muted">Pendientes</small><div class="dm-text-xl dm-fw-bold" style="color:${resumen.pendientes > 0 ? 'var(--dm-warning)' : 'var(--dm-success)'};">${resumen.pendientes}</div></div>
            </div>

            <div class="dm-mb-4" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px,1fr)); gap:12px;">
                <div class="dm-card"><small class="dm-muted">Fabricado</small><div class="dm-text-xl dm-fw-bold">${fabricado}</div></div>
                <div class="dm-card"><small class="dm-muted">Reventa</small><div class="dm-text-xl dm-fw-bold">${reventa}</div></div>
                <div class="dm-card"><small class="dm-muted">Reparación</small><div class="dm-text-xl dm-fw-bold">${reparacion}</div></div>
                <div class="dm-card"><small class="dm-muted">Convertidas</small><div class="dm-text-xl dm-fw-bold" style="color:var(--dm-success);">${resumen.convertidas}</div></div>
            </div>

            <div class="dm-card dm-mb-4">
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <div>
                        <h3 class="dm-card-title">Cotizaciones PRO</h3>
                        <p class="dm-muted" style="margin-top:6px;">Cotiza fabricado, reventa y reparación desde un solo módulo.</p>
                    </div>
                    <input type="text" id="bus-cot" class="dm-input" onkeyup="window.filtrarLista('bus-cot', 'tarj-cot')" placeholder="🔍 Buscar cotización o cliente...">
                </div>
            </div>

            <div class="dm-list">
    `;

    if (!cotizaciones.length) {
        html += `<div class="dm-alert dm-alert-info">No hay cotizaciones registradas.</div>`;
    } else {
        cotizaciones.forEach(c => {
            const fecha = String(c.fecha || c.fecha_creacion || '').split('T')[0];
            const tipo = String(c.tipo || 'general').toLowerCase();
            const badgeClass = tipo === 'fabricado' ? 'dm-badge-primary' : tipo === 'reventa' ? 'dm-badge-success' : 'dm-badge-warning';
            const yaConvertida = String(c.estado_conversion || '').toLowerCase() === 'convertida';

            html += `
                <div class="dm-list-card tarj-cot">
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <div class="dm-row-between" style="align-items:flex-start; gap:12px; flex-wrap:wrap;">
                            <div style="flex:1; min-width:0;">
                                <div class="dm-list-card-title">${App.ui.safe(c.id || '')}</div>
                                <div class="dm-list-card-subtitle">${App.ui.safe(c.cliente_nombre || 'Cliente')}</div>
                                <div class="dm-text-sm dm-muted">${fecha}</div>
                            </div>
                            <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end;">
                                <span class="dm-badge ${badgeClass}">${App.ui.safe((c.tipo || 'general').toUpperCase())}</span>
                                ${yaConvertida ? `<span class="dm-badge dm-badge-success">CONVERTIDA</span>` : `<span class="dm-badge dm-badge-warning">PENDIENTE</span>`}
                            </div>
                        </div>

                        <div class="dm-card" style="background:var(--dm-surface-2); padding:10px;">
                            <div class="dm-row-between"><small class="dm-muted">Concepto</small><strong>${App.ui.safe(c.concepto || c.detalles || 'Cotización')}</strong></div>
                            <div class="dm-row-between"><small class="dm-muted">Total</small><strong>${App.ui.money(c.total || 0)}</strong></div>
                        </div>

                        <div class="dm-list-card-actions" style="display:flex; gap:8px; flex-wrap:wrap;">
                            <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.verCotizacion('${c.id}')">👁️ Ver</button>
                            <button class="dm-btn dm-btn-primary dm-btn-sm" onclick="App.views.formCotizacion('${c.id}')">✏️ Editar</button>
                            <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.imprimirCotizacion('${c.id}')">🖨️ Imprimir</button>
                            <button class="dm-btn dm-btn-success dm-btn-sm" onclick="App.views.convertirCotizacion('${c.id}')">🔁 Convertir</button>
                            ${!yaConvertida ? `<button class="dm-btn dm-btn-success dm-btn-sm" onclick="App.views.autoConvertirCotizacion('${c.id}')">⚡ Directo</button>` : ''}
                            <button class="dm-btn dm-btn-danger dm-btn-sm" onclick="App.views.eliminarCotizacion('${c.id}')">🗑️ Eliminar</button>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    html += `</div></div><button class="dm-fab" onclick="App.views.formCotizacion()">+</button>`;
    return html;
};

App.views._formPedidoInterno = function(obj = null, prefill = null) {
    const dataBase = Object.assign({ cantidad: 1, anticipo: 0, comision: 0, vendedor_id: '' }, prefill || {}, obj || {});

    if (!obj) {
        window._carritoTemp = Array.isArray(dataBase.carrito) ? [...dataBase.carrito] : [];
    }

    let htmlClientes = '<option value="STOCK_INTERNO">STOCK BODEGA</option>';
    (App.state.clientes || []).forEach(c => {
        const selected = dataBase.cliente_id === c.id ? 'selected' : '';
        htmlClientes += `<option value="${c.id}" ${selected}>${App.ui.safe(c.nombre)}</option>`;
    });

    let htmlVendedores = '<option value="">-- Venta Directa (Sin Vendedor) --</option>';
    (App.state.vendedores || []).forEach(v => {
        const selected = dataBase.vendedor_id === v.id ? 'selected' : '';
        htmlVendedores += `<option value="${v.id}" ${selected}>${App.ui.safe(v.nombre)}</option>`;
    });

    let htmlProductos = '<option value="">-- Seleccionar producto --</option>';
    (App.state.productos || []).forEach(p => {
        const precio = p.precio_venta || 0;
        htmlProductos += `<option value="${p.id}" data-precio="${precio}">${App.ui.safe(p.nombre)}</option>`;
    });

    let htmlCarrito = '';

    if (!obj) {
        htmlCarrito = `
            <div class="dm-form-group">
                <label class="dm-label">Artículos del pedido</label>
                <div class="dm-card dm-mb-2" style="background:var(--dm-surface-2); padding:12px;">
                    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px;">
                        <select id="cart-prod-select" class="dm-select" style="flex:1; min-width:180px;" onchange="document.getElementById('cart-price').value = this.options[this.selectedIndex].getAttribute('data-precio') || 0;">
                            ${htmlProductos}
                        </select>
                        <button type="button" class="dm-btn dm-btn-secondary" style="padding: 0 12px;" onclick="App.views.formProductoRapidoDesdeCotizacion()">+ Prod</button>
                    </div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:end;">
                        <div style="width:70px;">
                            <label class="dm-text-sm dm-muted">Cant.</label>
                            <input type="number" id="cart-qty" class="dm-input" value="1" min="1">
                        </div>
                        <div style="flex:1; min-width:100px;">
                            <label class="dm-text-sm dm-muted">Precio Unit.</label>
                            <input type="number" step="0.01" id="cart-price" class="dm-input" placeholder="0.00">
                        </div>
                        <button type="button" class="dm-btn dm-btn-info" onclick="window.agregarAlCarrito()">🛒 Agregar</button>
                    </div>
                </div>
                <div id="cart-items-container">
                    <!-- Artículos dinámicos o precargados -->
                </div>
            </div>
        `;
    } else {
        const detalles = (App.state.pedido_detalle || []).filter(d => d.pedido_id === obj.id);
        let itemsHtml = detalles.map(d => {
            const p = (App.state.productos || []).find(x => x.id === d.producto_id);
            return `<div class="dm-text-sm dm-mb-1">✔️ <strong>${d.cantidad}x</strong> ${p ? p.nombre : 'Producto'} - <strong>$${(parseFloat(d.precio_unitario)*d.cantidad).toFixed(2)}</strong></div>`;
        }).join('');
        
        htmlCarrito = `
            <div class="dm-form-group">
                <label class="dm-label">Artículos Registrados</label>
                <div class="dm-card" style="background:var(--dm-surface-2); padding:10px;">
                    ${itemsHtml || '<i>Sin artículos</i>'}
                    <div class="dm-text-sm dm-muted dm-mt-2">*Para cambiar productos o cantidades, elimina este pedido y crea uno nuevo.</div>
                </div>
            </div>
        `;
    }

    const formHTML = `
        <form id="dynamic-form">
            <div class="dm-form-row">
                <div class="dm-form-group">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <label class="dm-label" style="margin:0;">Cliente / Destino</label>
                        <button type="button" class="dm-btn dm-btn-ghost dm-btn-sm" style="padding:0 4px; font-size:12px; color:var(--dm-primary);" onclick="App.views.formClienteRapidoDesdeCotizacion()">+ Cliente</button>
                    </div>
                    <select class="dm-select" name="cliente_id" id="select-cliente-pedido" onchange="window.verificarStockInterno()">${htmlClientes}</select>
                </div>
                <div class="dm-form-group">
                    <label class="dm-label" style="color: #2B6CB0;">¿Quién cerró la venta?</label>
                    <select class="dm-select" name="vendedor_id" style="border-color: #bee3f8; background-color: #ebf8ff;">
                        ${htmlVendedores}
                    </select>
                </div>
            </div>

            ${htmlCarrito}

            <div class="dm-form-group">
                <label class="dm-label">Fecha estimada de entrega</label>
                <input type="date" class="dm-input" name="fecha_entrega" value="${dataBase.fecha_entrega || ''}">
            </div>

            <div class="dm-form-row">
                <div class="dm-form-group">
                    <label class="dm-label">Total Pedido ($)</label>
                    <input type="number" step="0.01" class="dm-input" name="total" value="${dataBase.total || ''}" required ${!obj ? 'readonly' : ''} style="${!obj ? 'background:#e5e7eb; color:#6b7280; cursor:not-allowed;' : ''}">
                </div>
                <div class="dm-form-group">
                    <label class="dm-label">Anticipo Recibido ($)</label>
                    <input type="number" step="0.01" class="dm-input" name="anticipo" value="${dataBase.anticipo || '0'}" required>
                </div>
            </div>
            
            <div class="dm-form-row">
                <div class="dm-form-group" style="background: #EBF8FF; padding: 10px; border-radius: 6px; border: 1px dashed #3182CE;">
                    <label class="dm-label" style="color: #2B6CB0; margin-bottom:4px;">Comisión por venta ($)</label>
                    <input type="number" step="0.01" class="dm-input" name="comision" value="${dataBase.comision || '0'}" placeholder="0.00">
                    <small style="color: #3182CE; font-size: 0.75rem; display: block; margin-top: 4px; line-height:1.2;">Se restará de la utilidad. Si no pagas comisión, déjalo en 0.</small>
                </div>
            </div>
            
            <div class="dm-form-group">
                <label class="dm-label">Notas o instrucciones generales</label>
                <textarea class="dm-textarea" name="notas">${App.ui.escapeHTML(dataBase.notas || '')}</textarea>
            </div>

            <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">${obj ? 'Guardar Cambios Generales' : 'Confirmar Pedido'}</button>
        </form>
    `;

    App.ui.openSheet(obj ? 'Editar Pedido' : 'Nuevo Pedido', formHTML, async (data) => {
        if (!obj) {
            if (window._carritoTemp.length === 0) {
                App.ui.toast("Debes agregar al menos un artículo a la lista", "warning");
                throw new Error("Carrito vacío");
            }
            data.carrito = window._carritoTemp;
        }

        const action = obj ? () => App.logic.actualizarRegistroGenerico('pedidos', obj.id, data, 'pedidos') : () => App.logic.guardarNuevoPedido(data);
        return App.ui.runSafeAction({
            lockKey: obj ? `pedido:${obj.id}:editar` : 'pedido:nuevo',
            loadingText: obj ? 'Guardando...' : 'Creando...',
            loaderMessage: obj ? 'Guardando cambios...' : 'Creando pedido y apartando inventario para todos los artículos...',
            successMessage: obj ? 'Pedido actualizado' : 'Pedido registrado correctamente',
            errorTitle: obj ? 'No se pudo actualizar' : 'No se pudo crear el pedido',
            closeSheetOnSuccess: true
        }, async () => action());
    });

    if (!obj) {
        window.agregarAlCarrito = function() {
            const prodSel = document.getElementById('cart-prod-select');
            const qtyInp = document.getElementById('cart-qty');
            const priceInp = document.getElementById('cart-price');
            
            const prodId = prodSel.value;
            const qty = parseFloat(qtyInp.value) || 0;
            const price = parseFloat(priceInp.value) || 0;
            
            if (!prodId || qty <= 0) {
                App.ui.toast("Selecciona un producto y una cantidad válida", "warning");
                return;
            }
            
            const prod = (App.state.productos || []).find(p => p.id === prodId);
            window._carritoTemp.push({
                producto_id: prodId,
                nombre: prod ? prod.nombre : 'Producto',
                cantidad: qty,
                precio_unitario: price,
                subtotal: qty * price
            });
            
            qtyInp.value = 1;
            priceInp.value = '';
            prodSel.value = '';
            
            window.renderCarrito();
        };

        window.eliminarDelCarrito = function(index) {
            window._carritoTemp.splice(index, 1);
            window.renderCarrito();
        };

        window.renderCarrito = function() {
            const cont = document.getElementById('cart-items-container');
            const totalInp = document.querySelector('#dynamic-form input[name="total"]');
            const clienteSel = document.querySelector('#dynamic-form select[name="cliente_id"]');
            
            if (!cont) return;
            
            let html = '';
            let sumTotal = 0;
            
            if (window._carritoTemp.length === 0) {
                html = '<div class="dm-alert dm-alert-warning" style="padding:8px; font-size:13px; text-align:center;">Agrega artículos al pedido usando el botón de arriba.</div>';
            } else {
                window._carritoTemp.forEach((item, idx) => {
                    sumTotal += item.subtotal;
                    html += `
                        <div class="dm-list-card" style="padding:10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                            <div style="line-height:1.3;">
                                <strong>${item.cantidad}x</strong> ${App.ui.safe(item.nombre)}<br>
                                <small class="dm-muted">$${item.precio_unitario.toFixed(2)} precio unitario</small>
                            </div>
                            <div style="display:flex; align-items:center; gap:12px;">
                                <strong style="font-size:16px;">$${item.subtotal.toFixed(2)}</strong>
                                <button type="button" class="dm-btn dm-btn-danger dm-btn-sm" style="padding:4px 8px; font-weight:bold;" onclick="window.eliminarDelCarrito(${idx})">X</button>
                            </div>
                        </div>
                    `;
                });
            }
            
            cont.innerHTML = html;
            
            if (totalInp) {
                if (clienteSel && clienteSel.value === 'STOCK_INTERNO') {
                    totalInp.value = 0;
                } else {
                    totalInp.value = sumTotal.toFixed(2);
                }
            }
        };

        setTimeout(() => window.renderCarrito(), 150);
    }

    setTimeout(() => {
        if(typeof window.verificarStockInterno === 'function') window.verificarStockInterno();
    }, 150);
};

App.views.formPedido = function(id = null) {
    const obj = id ? (App.state.pedidos || []).find(p => p.id === id) : null;
    return App.views._formPedidoInterno(obj, null);
};

App.views.modalAbonos = function(pedidoId) {
    const pedido = (App.state.pedidos || []).find(x => x.id === pedidoId);
    if (!pedido) return;

    const abonos = (App.state.abonos || []).filter(a => a.pedido_id === pedidoId);
    const totalAbonos = abonos.reduce((s, a) => s + parseFloat(a.monto || 0), 0);
    const saldo = parseFloat(pedido.total || 0) - parseFloat(pedido.anticipo || 0) - totalAbonos;

    let html = `<div class="dm-alert dm-alert-info dm-mb-4">Saldo pendiente: $${saldo.toFixed(2)}</div>`;

    if (abonos.length > 0) {
        html += `<div class="dm-list dm-mb-4">`;
        abonos.forEach(a => {
            const fecha = a.fecha ? String(a.fecha).split('T')[0] : '';
            html += `
                <div class="dm-list-card" style="padding:10px;">
                    <div class="dm-row-between" style="align-items:flex-start; gap:12px;">
                        <div style="flex:1;">
                            <strong>$${parseFloat(a.monto || 0).toFixed(2)}</strong>
                            <div class="dm-text-sm dm-muted">${a.metodo_pago ? App.ui.safe(a.metodo_pago) : ''}</div>
                            ${fecha ? `<div class="dm-text-sm dm-muted">${fecha}</div>` : ''}
                        </div>
                        <div class="dm-list-card-actions" style="margin-top:0; justify-content:flex-end;">
                            <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.accionAbono(this, '${a.id}', 'imprimirRecibo')">🧾</button>
                            <button class="dm-btn dm-btn-danger dm-btn-sm" onclick="App.views.accionAbono(this, '${a.id}', 'eliminarAbono')">X</button>
                        </div>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    }

    if (saldo > 0) {
        html += `
            <form id="dynamic-form">
                <input type="hidden" name="pedido_id" value="${pedidoId}">
                <input type="hidden" name="cliente_id" value="${pedido.cliente_id || ''}">
                <div class="dm-form-row">
                    <div class="dm-form-group">
                        <label class="dm-label">Abonar ($)</label>
                        <input type="number" step="0.01" class="dm-input" name="monto" max="${saldo}" required>
                    </div>
                    <div class="dm-form-group">
                        <label class="dm-label">Método</label>
                        <select class="dm-select" name="metodo_pago">
                            <option value="Efectivo">Efectivo</option>
                            <option value="Transferencia">Transferencia</option>
                            <option value="Tarjeta">Tarjeta</option>
                        </select>
                    </div>
                </div>
                <input type="hidden" name="fecha" value="${new Date().toISOString()}">
                <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">Registrar Abono</button>
            </form>
        `;
    }

    App.ui.openSheet('Abonos del Pedido', html, async (data) => {
        if (saldo <= 0) return;
        return App.ui.runSafeAction({
            lockKey: `pedido:${pedidoId}:abono:nuevo`,
            loadingText: 'Registrando...',
            loaderMessage: 'Registrando abono...',
            successMessage: 'Abono registrado',
            errorTitle: 'No se pudo registrar el abono',
            closeSheetOnSuccess: true
        }, async () => App.logic.guardarAbono(data));
    });
};

App.views.syncCotizacionCliente = function () {
    const select = document.querySelector('#dynamic-form select[name="cliente_id"]');
    const input = document.querySelector('#dynamic-form input[name="cliente_nombre"]');
    if (!select || !input) return;

    const cliente = (App.state.clientes || []).find(c => c.id === select.value);
    if (cliente) {
        input.value = cliente.nombre || '';
        input.dataset.autofill = 'true';
    } else {
        input.dataset.autofill = 'false';
    }
};

App.views.syncCotizacionProducto = function () {
    const select = document.querySelector('#dynamic-form select[name="producto_id"]');
    const concepto = document.querySelector('#dynamic-form input[name="concepto"]');
    const tipoSel = document.querySelector('#dynamic-form select[name="tipo"]');
    if (!select || !concepto || !tipoSel) return;

    const tipo = String(tipoSel.value || '').toLowerCase();
    if (tipo === 'reparacion') return;

    const producto = (App.state.productos || []).find(p => p.id === select.value);
    if (producto && (!concepto.value || !String(concepto.value).trim() || concepto.dataset.autofill === 'true')) {
        concepto.value = producto.nombre || '';
        concepto.dataset.autofill = 'true';
    }
};

App.views.toggleCamposCotizacion = function () {
    const tipoSel = document.querySelector('#dynamic-form select[name="tipo"]');
    const prodWrap = document.getElementById('cotizacion-producto-wrap');
    const prodSel = document.querySelector('#dynamic-form select[name="producto_id"]');
    const conceptoLabel = document.getElementById('cotizacion-concepto-label');

    if (!tipoSel) return;
    const tipo = String(tipoSel.value || '').toLowerCase();
    const esReparacion = tipo === 'reparacion';

    if (prodWrap) prodWrap.style.display = esReparacion ? 'none' : '';
    if (prodSel) {
        prodSel.required = !esReparacion;
        if (esReparacion) prodSel.value = '';
    }
    if (conceptoLabel) {
        conceptoLabel.textContent = esReparacion ? 'Servicio / reparación' : 'Concepto';
    }
};

App.views.formClienteRapidoDesdeCotizacion = function () {
    const formHTML = `
        <form id="dynamic-form-cliente-rapido">
            <div class="dm-form-group">
                <label class="dm-label">Nombre del cliente</label>
                <input type="text" class="dm-input" name="nombre" required>
            </div>
            <div class="dm-form-group">
                <label class="dm-label">Teléfono</label>
                <input type="text" class="dm-input" name="telefono">
            </div>
            <div class="dm-form-group">
                <label class="dm-label">Correo</label>
                <input type="email" class="dm-input" name="correo">
            </div>
            <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">Guardar cliente</button>
        </form>
    `;

    App.ui.openSheet('Nuevo cliente', formHTML, async (data) => {
        return App.ui.runSafeAction({
            lockKey: 'cliente:nuevo:rapido',
            loadingText: 'Guardando...',
            loaderMessage: 'Guardando cliente...',
            successMessage: 'Cliente guardado correctamente',
            errorTitle: 'No se pudo guardar el cliente',
            closeSheetOnSuccess: true
        }, async () => {
            const res = await App.logic.guardarNuevoGenerico('clientes', data, 'CLI', 'clientes');
            
            setTimeout(() => {
                const ultimo = (App.state.clientes || []).slice().sort((a, b) => String(b.id).localeCompare(String(a.id)))[0];
                if (ultimo) {
                    const selectPedido = document.getElementById('select-cliente-pedido');
                    if (selectPedido) {
                        selectPedido.insertAdjacentHTML('beforeend', `<option value="${ultimo.id}">${App.ui.safe(ultimo.nombre)}</option>`);
                        selectPedido.value = ultimo.id;
                    }

                    const selectCot = document.querySelector('#dynamic-form select[name="cliente_id"]');
                    const inputCot = document.querySelector('#dynamic-form input[name="cliente_nombre"]');
                    if (selectCot) {
                        selectCot.insertAdjacentHTML('beforeend', `<option value="${ultimo.id}">${App.ui.safe(ultimo.nombre)}</option>`);
                        selectCot.value = ultimo.id;
                    }
                    if (inputCot) inputCot.value = ultimo.nombre || '';
                }
            }, 200);

            return res;
        });
    });
};

App.views.formProductoRapidoDesdeCotizacion = function () {
    const formHTML = `
        <form id="dynamic-form-producto-rapido">
            <div class="dm-form-group">
                <label class="dm-label">Nombre del producto</label>
                <input type="text" class="dm-input" name="nombre" required>
            </div>
            <div class="dm-form-group">
                <label class="dm-label">Categoría</label>
                <select class="dm-select" name="categoria">
                    <option value="fabricado">Fabricado / Producción</option>
                    <option value="reventa">Reventa Directa</option>
                </select>
            </div>
            <div class="dm-form-group">
                <label class="dm-label">Precio sugerido de venta ($)</label>
                <input type="number" step="0.01" class="dm-input" name="precio_venta" value="0">
            </div>
            <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">Guardar producto</button>
        </form>
    `;

    App.ui.openSheet('Nuevo producto', formHTML, async (data) => {
        return App.ui.runSafeAction({
            lockKey: 'producto:nuevo:rapido',
            loadingText: 'Guardando...',
            loaderMessage: 'Guardando producto...',
            successMessage: 'Producto guardado correctamente',
            errorTitle: 'No se pudo guardar el producto',
            closeSheetOnSuccess: true
        }, async () => {
            const payload = Object.assign({ activo: 'TRUE' }, data);
            const res = await App.logic.guardarNuevoGenerico('productos', payload, 'PROD', 'productos');
            
            setTimeout(() => {
                const ultimo = (App.state.productos || []).slice().sort((a, b) => String(b.id).localeCompare(String(a.id)))[0];
                
                if (ultimo) {
                    const selectCarrito = document.getElementById('cart-prod-select');
                    if (selectCarrito) {
                        const precio = ultimo.precio_venta || 0;
                        selectCarrito.insertAdjacentHTML('beforeend', `<option value="${ultimo.id}" data-precio="${precio}">${App.ui.safe(ultimo.nombre)}</option>`);
                        selectCarrito.value = ultimo.id;
                        
                        const priceInp = document.getElementById('cart-price');
                        if(priceInp) priceInp.value = precio;
                    }

                    const selectCotizacion = document.querySelector('#dynamic-form select[name="producto_id"]');
                    if (selectCotizacion && !selectCarrito) {
                        selectCotizacion.insertAdjacentHTML('beforeend', `<option value="${ultimo.id}">${App.ui.safe(ultimo.nombre)}</option>`);
                        selectCotizacion.value = ultimo.id;
                        if (typeof App.views.syncCotizacionProducto === 'function') {
                            App.views.syncCotizacionProducto();
                        }
                    }
                }
            }, 200);

            return res;
        });
    });
};

App.views.formCotizacion = function(id = null) {
    const obj = id ? (App.state.cotizaciones || []).find(c => c.id === id) : null;

    let htmlClientes = '<option value="">-- Cliente --</option>';
    (App.state.clientes || []).forEach(c => {
        htmlClientes += `<option value="${c.id}" ${obj && obj.cliente_id === c.id ? 'selected' : ''}>${App.ui.safe(c.nombre)}</option>`;
    });

    let htmlProductos = '<option value="">-- Producto / reventa --</option>';
    (App.state.productos || []).forEach(p => {
        htmlProductos += `<option value="${p.id}" ${obj && obj.producto_id === p.id ? 'selected' : ''}>${App.ui.safe(p.nombre)}</option>`;
    });

    const formHTML = `
        <form id="dynamic-form">
            <div class="dm-form-group">
                <label class="dm-label">Tipo de cotización</label>
                <select class="dm-select" name="tipo" onchange="App.views.toggleCamposCotizacion()">
                    <option value="fabricado" ${obj && obj.tipo === 'fabricado' ? 'selected' : ''}>Fabricado</option>
                    <option value="reventa" ${obj && obj.tipo === 'reventa' ? 'selected' : ''}>Reventa</option>
                    <option value="reparacion" ${obj && obj.tipo === 'reparacion' ? 'selected' : ''}>Reparación</option>
                </select>
            </div>

            <div class="dm-form-group">
                <label class="dm-label">Cliente</label>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <select class="dm-select" name="cliente_id" onchange="App.views.syncCotizacionCliente()" style="flex:1; min-width:180px;">
                        ${htmlClientes}
                    </select>
                    <button type="button" class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.formClienteRapidoDesdeCotizacion()">+ Cliente</button>
                </div>
            </div>

            <div class="dm-form-group">
                <label class="dm-label">Nombre del cliente</label>
                <input type="text" class="dm-input" name="cliente_nombre" value="${obj ? App.ui.escapeHTML(obj.cliente_nombre || '') : ''}" required>
            </div>

            <div class="dm-form-group" id="cotizacion-producto-wrap">
                <label class="dm-label">Producto / artículo</label>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <select class="dm-select" name="producto_id" onchange="App.views.syncCotizacionProducto()" style="flex:1; min-width:180px;">
                        ${htmlProductos}
                    </select>
                    <button type="button" class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.formProductoRapidoDesdeCotizacion()">+ Producto</button>
                </div>
            </div>

            <div class="dm-form-row" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px,1fr)); gap:12px;">
                <div class="dm-form-group">
                    <label class="dm-label">Cantidad</label>
                    <input type="number" class="dm-input" name="cantidad" value="${obj ? (obj.cantidad || 1) : 1}" required>
                </div>
                <div class="dm-form-group">
                    <label class="dm-label">Total</label>
                    <input type="number" step="0.01" class="dm-input" name="total" value="${obj ? (obj.total || '') : ''}" required>
                </div>
            </div>

            <div class="dm-form-group">
                <label class="dm-label" id="cotizacion-concepto-label">Concepto</label>
                <input type="text" class="dm-input" name="concepto" value="${obj ? App.ui.escapeHTML(obj.concepto || '') : ''}" required>
            </div>

            <div class="dm-form-group">
                <label class="dm-label">Detalles</label>
                <textarea class="dm-textarea" name="detalles">${obj ? App.ui.escapeHTML(obj.detalles || '') : ''}</textarea>
            </div>

            <input type="hidden" name="fecha" value="${obj ? (obj.fecha || new Date().toISOString()) : new Date().toISOString()}">
            <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">${obj ? 'Guardar Cambios' : 'Guardar Cotización'}</button>
        </form>
    `;

    App.ui.openSheet(obj ? 'Editar Cotización' : 'Nueva Cotización', formHTML, async (data) => {
        const clienteSel = document.querySelector('#dynamic-form select[name="cliente_id"]');
        const cliente = (App.state.clientes || []).find(c => c.id === (clienteSel?.value || data.cliente_id || ''));

        if ((!data.cliente_nombre || !String(data.cliente_nombre).trim()) && cliente) {
            data.cliente_nombre = cliente.nombre || '';
        }

        if (String(data.tipo || '').toLowerCase() === 'reparacion') {
            data.producto_id = '';
        }

        const accion = obj
            ? () => App.logic.actualizarRegistroGenerico('cotizaciones', id, data, 'cotizaciones')
            : () => App.logic.guardarNuevoGenerico('cotizaciones', data, 'COT', 'cotizaciones');

        return App.ui.runSafeAction({
            lockKey: obj ? `cotizacion:${id}:editar` : 'cotizacion:nueva',
            loadingText: obj ? 'Guardando...' : 'Creando...',
            loaderMessage: obj ? 'Guardando cotización...' : 'Guardando cotización...',
            successMessage: obj ? 'Cotización actualizada' : 'Cotización guardada',
            errorTitle: obj ? 'No se pudo actualizar la cotización' : 'No se pudo guardar la cotización',
            closeSheetOnSuccess: true
        }, async () => accion());
    });

    setTimeout(() => {
        App.views.syncCotizacionCliente();
        App.views.syncCotizacionProducto();
        App.views.toggleCamposCotizacion();
    }, 150);
};

App.views.eliminarCotizacion = async function (cotizacionId) {
    const c = (App.state.cotizaciones || []).find(x => x.id === cotizacionId);
    if (!c) return;
    const ok = window.confirm(`¿Eliminar la cotización ${c.id || ''}?`);
    if (!ok) return;

    return App.ui.runSafeAction({
        lockKey: `cotizacion:${cotizacionId}:eliminar`,
        loadingText: 'Eliminando...',
        loaderMessage: 'Eliminando cotización...',
        successMessage: 'Cotización eliminada',
        errorTitle: 'No se pudo eliminar la cotización'
    }, async () => App.logic.eliminarRegistroGenerico('cotizaciones', cotizacionId, 'cotizaciones'));
};

App.views.verCotizacion = function(cotizacionId) {
    const c = (App.state.cotizaciones || []).find(x => x.id === cotizacionId);
    if (!c) return;

    const html = `
        <div class="dm-list">
            <div class="dm-list-card">
                <div class="dm-fw-bold">${App.ui.safe(c.cliente_nombre || 'Cliente')}</div>
                <div class="dm-text-sm dm-muted dm-mt-2">Tipo: <strong>${App.ui.safe(c.tipo || 'general')}</strong></div>
                <div class="dm-text-sm dm-muted">Concepto: <strong>${App.ui.safe(c.concepto || '')}</strong></div>
                <div class="dm-text-sm dm-muted">Total: <strong>${App.ui.money(c.total || 0)}</strong></div>
                <div class="dm-text-sm dm-muted">Fecha: <strong>${String(c.fecha || c.fecha_creacion || '').split('T')[0]}</strong></div>
            </div>
            <div class="dm-list-card">
                <div class="dm-fw-bold">Detalles</div>
                <div class="dm-text-sm dm-muted dm-mt-2">${App.ui.safe(c.detalles || 'Sin detalles')}</div>
            </div>
        </div>
    `;

    App.ui.openSheet(`Cotización ${cotizacionId}`, html);
};

App.views._marcarCotizacionConvertida = async function (cotizacionId, extras = {}) {
    const cot = (App.state.cotizaciones || []).find(x => x.id === cotizacionId);
    if (!cot) return;

    const payload = Object.assign({
        estado_conversion: 'convertida',
        fecha_conversion: new Date().toISOString()
    }, extras);

    try {
        await App.logic.actualizarRegistroGenerico('cotizaciones', cotizacionId, payload, 'cotizaciones');
    } catch (e) {
        Object.assign(cot, payload);
    }
};

App.views.autoConvertirCotizacion = async function (cotizacionId) {
    const c = (App.state.cotizaciones || []).find(x => x.id === cotizacionId);
    if (!c) return;

    const tipo = String(c.tipo || '').toLowerCase();
    
    const formHTML = `
        <form id="dynamic-form">
            <div class="dm-alert dm-alert-info dm-mb-3">
                Convirtiendo cotización <strong>${App.ui.safe(c.id)}</strong> (${App.ui.safe(c.cliente_nombre || 'Cliente')}) por <strong>${App.ui.money(c.total || 0)}</strong>.
            </div>
            
            <div class="dm-form-row" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px,1fr)); gap:12px;">
                <div class="dm-form-group">
                    <label class="dm-label">Anticipo Recibido ($)</label>
                    <input type="number" step="0.01" class="dm-input" name="anticipo" value="0" max="${c.total || 0}">
                </div>
                <div class="dm-form-group">
                    <label class="dm-label">Método de Pago</label>
                    <select class="dm-select" name="metodo_pago">
                        <option value="Efectivo">Efectivo</option>
                        <option value="Transferencia">Transferencia</option>
                        <option value="Tarjeta">Tarjeta</option>
                    </select>
                </div>
            </div>

            <button type="submit" class="dm-btn dm-btn-success dm-btn-block">⚡ Confirmar y Convertir</button>
        </form>
    `;

    App.ui.openSheet('Convertir Cotización a ' + (tipo === 'reparacion' ? 'Reparación' : 'Pedido'), formHTML, async (data) => {
        return App.ui.runSafeAction({
            lockKey: `cotizacion:${cotizacionId}:convertir:directo`,
            loadingText: 'Convertidor...',
            loaderMessage: 'Generando registro y abono de anticipo...',
            successMessage: 'Cotización convertida con éxito',
            closeSheetOnSuccess: true
        }, async () => {
            const anticipoMonto = parseFloat(data.anticipo || 0) || 0;
            const metodoPago = data.metodo_pago || 'Efectivo';
            const ahora = new Date().toISOString();

            if (tipo === 'reparacion') {
                const dataRep = {
                    cliente_nombre: c.cliente_nombre || 'Cliente',
                    descripcion: c.concepto || c.detalles || 'Reparación desde cotización',
                    precio: c.total || 0,
                    anticipo_inicial: anticipoMonto,
                    fecha_creacion: ahora
                };
                const resRep = await App.logic.guardarNuevoGenerico('reparaciones', dataRep, 'REP', 'reparaciones');

                if (anticipoMonto > 0 && resRep?.id) {
                    await App.logic.guardarNuevoGenerico('abonos_reparaciones', {
                        reparacion_id: resRep.id,
                        monto: anticipoMonto,
                        metodo_pago: metodoPago,
                        fecha: ahora
                    }, 'ABR', 'abonos_reparaciones');
                }
                
                await App.views._marcarCotizacionConvertida(cotizacionId, { convertido_a: 'reparacion' });

            } else {
                const prod = (App.state.productos || []).find(p => p.id === c.producto_id);
                const cant = parseFloat(c.cantidad || 1) || 1;
                const totalCot = parseFloat(c.total || 0) || 0;
                const precioUnitario = cant > 0 ? (totalCot / cant) : totalCot;

                const dataPedido = {
                    cliente_id: c.cliente_id || 'STOCK_INTERNO',
                    total: totalCot,
                    anticipo: anticipoMonto,
                    fecha_entrega: new Date().toISOString().split('T')[0],
                    carrito: c.producto_id ? [{
                        producto_id: c.producto_id,
                        nombre: prod ? prod.nombre : (c.concepto || 'Producto Cotizado'),
                        cantidad: cant,
                        precio_unitario: precioUnitario,
                        subtotal: totalCot
                    }] : []
                };
                const resPed = await App.logic.guardarNuevoPedido(dataPedido);

                if (anticipoMonto > 0 && resPed?.id) {
                    await App.logic.guardarNuevoGenerico('abonos_clientes', {
                        pedido_id: resPed.id,
                        cliente_id: c.cliente_id || '',
                        monto: anticipoMonto,
                        metodo_pago: metodoPago,
                        fecha: ahora
                    }, 'ABO', 'abonos');
                }

                await App.views._marcarCotizacionConvertida(cotizacionId, { convertido_a: 'pedido' });
            }

            if (App.router?.handleRoute) App.router.handleRoute();
            return { status: 'success' };
        });
    });
};

App.views.convertirCotizacion = function(cotizacionId) {
    const c = (App.state.cotizaciones || []).find(x => x.id === cotizacionId);
    if (!c) return;

    const tipo = String(c.tipo || '').toLowerCase();
    if (tipo === 'reparacion') return App.views.formReparacionDesdeCotizacion(cotizacionId);
    return App.views.formPedidoDesdeCotizacion(cotizacionId);
};

App.views.formPedidoDesdeCotizacion = function(cotizacionId) {
    const c = (App.state.cotizaciones || []).find(x => x.id === cotizacionId);
    if (!c) return;

    const prod = (App.state.productos || []).find(p => p.id === c.producto_id);
    const cant = parseFloat(c.cantidad || 1) || 1;
    const totalCot = parseFloat(c.total || 0) || 0;
    const precioUnitario = cant > 0 ? (totalCot / cant) : totalCot;

    const prefill = {
        cliente_id: c.cliente_id || '',
        cliente_nombre: c.cliente_nombre || '',
        total: totalCot,
        anticipo: 0,
        fecha_entrega: '',
        notas: c.detalles || c.concepto || '',
        carrito: c.producto_id ? [{
            producto_id: c.producto_id,
            nombre: prod ? prod.nombre : (c.concepto || 'Producto Cotizado'),
            cantidad: cant,
            precio_unitario: precioUnitario,
            subtotal: totalCot
        }] : []
    };

    App.views._formPedidoInterno(null, prefill);
};

App.views.formReparacionDesdeCotizacion = function(cotizacionId) {
    const c = (App.state.cotizaciones || []).find(x => x.id === cotizacionId);
    if (!c) return;

    const formHTML = `
        <form id="dynamic-form">
            <div class="dm-alert dm-alert-info dm-mb-3">Conversión desde cotización ${App.ui.safe(c.id || '')}</div>
            <div class="dm-form-group">
                <label class="dm-label">Cliente</label>
                <input type="text" class="dm-input" name="cliente_nombre" value="${App.ui.escapeHTML(c.cliente_nombre || '')}" required>
            </div>
            <div class="dm-form-group">
                <label class="dm-label">Descripción reparación</label>
                <textarea class="dm-textarea" name="descripcion" required>${App.ui.escapeHTML(c.concepto || c.detalles || '')}</textarea>
            </div>
            <div class="dm-form-row">
                <div class="dm-form-group">
                    <label class="dm-label">Precio</label>
                    <input type="number" step="0.01" class="dm-input" name="precio" value="${c.total || ''}" required>
                </div>
                <div class="dm-form-group">
                    <label class="dm-label">Anticipo inicial</label>
                    <input type="number" step="0.01" class="dm-input" name="anticipo_inicial" value="0">
                </div>
            </div>
            <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">Crear reparación</button>
        </form>
    `;

    App.ui.openSheet('Convertir a reparación', formHTML, async (data) => {
        return App.ui.runSafeAction({
            lockKey: `cotizacion:${cotizacionId}:convertir:reparacion`,
            loadingText: 'Creando...',
            loaderMessage: 'Creando reparación...',
            successMessage: 'Reparación creada correctamente',
            closeSheetOnSuccess: true
        }, async () => {
            const res = await App.logic.guardarNuevoGenerico('reparaciones', data, 'REP', 'reparaciones');
            await App.views._marcarCotizacionConvertida(cotizacionId, { convertido_a: 'reparacion' });
            return res;
        });
    });
};

App.views.modalDetallesPedido = function(pedidoId) {
    const pedido = (App.state.pedidos || []).find(p => p.id === pedidoId);
    const detalles = (App.state.pedido_detalle || []).filter(d => d.pedido_id === pedidoId);
    const abonosLista = (App.state.abonos || []).filter(a => a.pedido_id === pedidoId);
    const ultimoAbono = abonosLista.length ? [...abonosLista].sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0))[0] : null;

    if (!pedido || detalles.length === 0) {
        App.ui.toast('No hay detalles guardados para este pedido.');
        return;
    }

    const saldo = parseFloat(pedido.total || 0) - parseFloat(pedido.anticipo || 0) - abonosLista.reduce((s, a) => s + parseFloat(a.monto || 0), 0);
    const estado = String(pedido.estado || '').toLowerCase();
    const whatsappAction = estado === 'listo para entregar' ? 'whatsappListo' : 'whatsappCobro';

    const cliente = (App.state.clientes || []).find(c => c.id === pedido.cliente_id);
    const esInterno = pedido.cliente_id === "STOCK_INTERNO";
    const nombreCliente = esInterno ? "STOCK BODEGA" : (cliente ? cliente.nombre : "Cliente no encontrado");
    const telCliente = !esInterno && cliente && cliente.telefono ? cliente.telefono : "N/A";

    let html = `
        <div class="dm-card dm-mb-3" style="background:var(--dm-surface-2); padding:15px; border:none;">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                <span class="dm-text-sm dm-muted">Cliente:</span>
                <strong>${App.ui.escapeHTML(nombreCliente)}</strong>
            </div>
            ${!esInterno ? `
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                <span class="dm-text-sm dm-muted">Teléfono:</span>
                <span>${App.ui.escapeHTML(telCliente)}</span>
            </div>` : ''}
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                <span class="dm-text-sm dm-muted">Fecha Creado:</span>
                <span>${String(pedido.fecha_creacion || '').split('T')[0]}</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
                <span class="dm-text-sm dm-muted">Estado:</span>
                <span class="dm-badge" style="background: ${estado.includes('cancelado') ? '#dc2626' : estado.includes('devuelto') ? '#f59e0b' : estado.includes('entregado') || estado.includes('pagado') ? 'var(--dm-success)' : estado.includes('listo') ? '#D69E2E' : 'var(--dm-primary)'}; color:white;">${App.ui.escapeHTML((pedido.estado || '').toUpperCase())}</span>
            </div>
        </div>
        <h4 class="dm-label dm-mb-2">Artículos del pedido:</h4>
        <div class="dm-list">
    `;

    detalles.forEach(d => {
        const prod = (App.state.productos || []).find(p => p.id === d.producto_id);
        const nombreProducto = prod ? prod.nombre : 'Producto sin nombre';
        html += `
            <div class="dm-list-card" style="padding:10px;">
                <div class="dm-fw-bold" style="font-size:16px;">${App.ui.safe(nombreProducto)}</div>
                <div class="dm-text-sm dm-muted dm-mt-2">Cantidad comprada: <strong>${App.ui.safe(d.cantidad)}</strong><br>Precio unitario: $${parseFloat(d.precio_unitario || 0).toFixed(2)}</div>
            </div>
        `;
    });

    html += `
        </div>
        <div class="dm-list-card-actions dm-mt-3" style="flex-wrap:wrap;">
            ${!esInterno && !['cancelado','devuelto'].includes(estado) ? `
                <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.accionPedido(this, '${pedidoId}', 'imprimirNota')">🖨️ Imprimir Nota</button>
                ${ultimoAbono ? `<button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.accionAbono(this, '${ultimoAbono.id}', 'imprimirRecibo')">🧾 Últ. abono</button>` : ''}
                <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.accionPedido(this, '${pedidoId}', 'imprimirLiquidacion')">✅ Liquidación</button>
                <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.accionPedido(this, '${pedidoId}', '${whatsappAction}')">💬 WhatsApp</button>
            ` : ''}
            ${!['cancelado','devuelto','entregado','pagado'].includes(estado) ? `<button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.accionPedido(this, '${pedidoId}', 'marcarListo')">📦 Listo</button>` : ''}
            ${estado === 'listo para entregar' || estado === 'pagado' ? `<button class="dm-btn dm-btn-success dm-btn-sm" onclick="App.views.accionPedido(this, '${pedidoId}', 'marcarEntregado')">🚚 Entregar</button>` : ''}
            ${estado === 'listo para entregar' ? `<button class="dm-btn dm-btn-danger dm-btn-sm" onclick="App.views.accionPedido(this, '${pedidoId}', 'cancelarPedido')">🚫 Cancelar</button>` : ''}
            ${estado === 'entregado' ? `<button class="dm-btn dm-btn-warning dm-btn-sm" onclick="App.views.accionPedido(this, '${pedidoId}', 'devolverPedido')">↩️ Devolver</button>` : ''}
            ${saldo <= 0.05 && !['pagado','entregado','cancelado','devuelto'].includes(estado) ? `<button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.accionPedido(this, '${pedidoId}', 'cerrarPedido')">🔒 Cerrar</button>` : ''}

    ${(() => {

    const detallesPedido =
        (App.state.pedido_detalle || [])
            .filter(d => d.pedido_id === pedidoId);

    const esReventa =
        detallesPedido.length > 0 &&
        detallesPedido.every(detalle => {

            const producto =
                (App.state.productos || [])
                    .find(p =>
                        p.id === detalle.producto_id
                    );

            return producto &&
                String(producto.categoria || '')
                    .toLowerCase()
                    .trim() === 'reventa';
        });

    const ordenesPedido =
        (App.state.ordenes_produccion || [])
            .filter(o =>
                detallesPedido.some(d =>
                    d.id === o.pedido_detalle_id
                )
            );

    const tieneOrdenEnTaller =
        ordenesPedido.some(o => {

            const estadoTaller =
                String(o.estado || '')
                    .toLowerCase()
                    .trim();

            return (
                estadoTaller === 'proceso' ||
                estadoTaller === 'listo'
            );
        });

    const puedeEliminar =
        !['entregado', 'cancelado', 'devuelto']
            .includes(estado) &&

        (
            estado === 'nuevo' ||
            estado === 'pendiente' ||

            (
                estado === 'listo para entregar' &&
                esReventa &&
                !tieneOrdenEnTaller
            ) ||

            (
                estado === 'pagado' &&
                esReventa &&
                !tieneOrdenEnTaller
            )
        );

    return puedeEliminar
        ? `<button
                class="dm-btn dm-btn-danger dm-btn-sm"
                onclick="App.views.accionPedido(
                    this,
                    '${pedidoId}',
                    'eliminarPedido'
                )">
                🗑️ Eliminar
           </button>`
        : '';

})()}
            
        </div>
    `;

    App.ui.openSheet(`Detalles del Pedido: ${pedidoId}`, html, () => App.ui.closeSheet());
};

window.verificarStockInterno = function() {
    const clienteSel = document.querySelector('#dynamic-form select[name="cliente_id"]');
    const vendedorSel = document.querySelector('#dynamic-form select[name="vendedor_id"]');
    const comisionInp = document.querySelector('#dynamic-form input[name="comision"]');
    const totalInp = document.querySelector('#dynamic-form input[name="total"]');
    const antInp = document.querySelector('#dynamic-form input[name="anticipo"]');
    
    const vendedorWrap = vendedorSel ? vendedorSel.closest('.dm-form-group') : null;
    const comisionWrap = comisionInp ? comisionInp.closest('.dm-form-row') : null;

    if (clienteSel && clienteSel.value === 'STOCK_INTERNO') {
        if (totalInp) { 
            totalInp.value = 0; 
            totalInp.readOnly = true; 
            totalInp.style.backgroundColor = '#e5e7eb'; 
            totalInp.style.color = '#6b7280'; 
            totalInp.style.cursor = 'not-allowed'; 
        }
        if (antInp) { 
            antInp.value = 0; 
            antInp.readOnly = true; 
            antInp.style.backgroundColor = '#e5e7eb';
            antInp.style.color = '#6b7280';
            antInp.style.cursor = 'not-allowed';
        }

        if (vendedorSel) vendedorSel.value = '';
        if (comisionInp) comisionInp.value = 0;

        if (vendedorWrap) vendedorWrap.style.display = 'none';
        if (comisionWrap) comisionWrap.style.display = 'none';

    } else {
        if (totalInp) { 
            totalInp.readOnly = window._carritoTemp ? true : false; 
            totalInp.style.backgroundColor = window._carritoTemp ? '#e5e7eb' : ''; 
            totalInp.style.color = window._carritoTemp ? '#6b7280' : ''; 
            totalInp.style.cursor = window._carritoTemp ? 'not-allowed' : ''; 
            if (typeof window.renderCarrito === 'function') window.renderCarrito(); 
        }
        if (antInp) { 
            antInp.readOnly = false; 
            antInp.style.backgroundColor = '';
            antInp.style.color = '';
            antInp.style.cursor = '';
        }

        if (vendedorWrap) vendedorWrap.style.display = '';
        if (comisionWrap) comisionWrap.style.display = '';
    }
};

App.views._resumenRendimientoVendedores = function () {
    const vendedores = App.state.vendedores || [];
    const pedidos = App.state.pedidos || [];
    const cotizaciones = App.state.cotizaciones || [];

    const reporte = [];

    const listaVendedores = [
        { id: '', nombre: 'Venta Directa / Sin Vendedor' },
        ...vendedores
    ];

    // SOLO LOS PEDIDOS QUE REALMENTE SON VENTAS
    // Regla:
    // - Deben estar ENTREGADOS
    // - No deben ser STOCK_INTERNO
    // - Cancelados y devueltos quedan fuera automáticamente
    const pedidosValidos = pedidos.filter(p => {
        const estado = String(p.estado || '').toLowerCase().trim();

        return (
            estado === 'entregado' &&
            p.cliente_id !== 'STOCK_INTERNO'
        );
    });

    listaVendedores.forEach(v => {

        const pedVend = pedidosValidos.filter(p =>
            String(p.vendedor_id || '') === String(v.id || '')
        );

        const cotVend = cotizaciones.filter(c =>
            String(c.vendedor_id || '') === String(v.id || '')
        );

        const ventasTotales = pedVend.reduce(
            (acc, p) =>
                acc +
                (parseFloat(p.total || 0) || 0),
            0
        );

        const comisionesTotales = pedVend.reduce(
            (acc, p) =>
                acc +
                (parseFloat(p.comision || 0) || 0),
            0
        );

        const pzasVendidas = pedVend.length;

        const ticketPromedio =
            pzasVendidas > 0
                ? ventasTotales / pzasVendidas
                : 0;

        if (
            pzasVendidas > 0 ||
            (v.id !== '' && cotVend.length > 0)
        ) {
            reporte.push({
                id: v.id,
                nombre: v.nombre,
                pzasVendidas,
                ventasTotales,
                comisionesTotales,
                ticketPromedio,
                cotizacionesTotal: cotVend.length
            });
        }
    });

    return reporte.sort(
        (a, b) =>
            b.ventasTotales -
            a.ventasTotales
    );
};
App.views.modalRendimientoVendedores = function () {
    const reporte = App.views._resumenRendimientoVendedores();

    let html = `
        <div class="dm-card dm-mb-4">
            <h3 class="dm-card-title">Rendimiento de Ventas por Vendedor</h3>
            <p class="dm-muted dm-mt-1" style="font-size:13px;">Resumen de volumen comercial, comisiones acumuladas y ticket promedio.</p>
        </div>

        <div class="dm-list">
    `;

    if (!reporte.length) {
        html += `<div class="dm-alert dm-alert-info">No hay ventas registradas con vendedores asignados.</div>`;
    } else {
        reporte.forEach(v => {
            html += `
                <div class="dm-list-card dm-mb-3">
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <div class="dm-row-between" style="align-items:flex-start;">
                            <div>
                                <strong style="font-size:16px;">👔 ${App.ui.safe(v.nombre)}</strong>
                            </div>
                            <span class="dm-badge dm-badge-primary">${v.pzasVendidas} pedidos</span>
                        </div>

                        <div class="dm-card" style="background:var(--dm-surface-2); padding:10px;">
                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(110px,1fr)); gap:10px; text-align:center;">
                                <div><small class="dm-muted">Monto Vendido</small><br><strong style="color:var(--dm-success); font-size:15px;">${App.ui.money(v.ventasTotales)}</strong></div>
                                <div><small class="dm-muted">Comisiones</small><br><strong style="color:#3182CE; font-size:15px;">${App.ui.money(v.comisionesTotales)}</strong></div>
                                <div><small class="dm-muted">Ticket Promedio</small><br><strong>${App.ui.money(v.ticketPromedio)}</strong></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    html += `</div>`;
    App.ui.openSheet('Rendimiento de Vendedores', html);
};
