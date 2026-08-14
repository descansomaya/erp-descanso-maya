// ==========================================
// LÓGICA: VENDEDORES Y COMISIONES
// ==========================================

window.App = window.App || {};
App.logic = App.logic || {};

// ==========================================
// REGLA ÚNICA DE NEGOCIO PARA VENDEDORES
// ==========================================
// Una venta solo genera venta/comisión cuando:
// 1) Es un pedido de cliente real (no STOCK_INTERNO).
// 2) El pedido ya fue ENTREGADO.
// 3) No está cancelado ni devuelto.
//
// IMPORTANTE: conservar el pedido en histórico NO significa que
// siga contando como venta. El histórico y los indicadores son cosas distintas.
App.logic.esVentaValidaVendedor = function (pedido) {
    if (!pedido) return false;

    const estado = String(pedido.estado || '').toLowerCase().trim();
    const clienteId = String(pedido.cliente_id || '').toUpperCase().trim();

    return (
        estado === 'entregado' &&
        clienteId !== 'STOCK_INTERNO'
    );
};

// Alias compartido para que otros módulos puedan usar exactamente
// la misma regla sin duplicar filtros.
window.DM = window.DM || {};
DM.esVentaValida = App.logic.esVentaValidaVendedor;

App.logic.ventasValidasVendedor = function (lista) {
    return (lista || []).filter(App.logic.esVentaValidaVendedor);
};

App.logic.obtenerResumenVentasVendedor = function (vendedorId) {
    const pedidos = App.logic.ventasValidasVendedor(App.state.pedidos || [])
        .filter(p => p.vendedor_id === vendedorId);

    const montoVendido = pedidos.reduce(
        (sum, p) => sum + (parseFloat(p.total || 0) || 0),
        0
    );

    const comisionGenerada = pedidos.reduce(
        (sum, p) => sum + (parseFloat(p.comision || 0) || 0),
        0
    );

    return {
        pedidos,
        cantidadPedidos: pedidos.length,
        montoVendido,
        ticketPromedio: pedidos.length ? montoVendido / pedidos.length : 0,
        comisionGenerada
    };
};

App.logic.obtenerResumenVentasVendedores = function () {
    const pedidos = App.logic.ventasValidasVendedor(App.state.pedidos || []);
    const vendedores = App.state.vendedores || [];

    const resumen = [];
    const usados = new Set();

    vendedores.forEach(v => {
        const ventas = pedidos.filter(p => p.vendedor_id === v.id);
        if (!ventas.length) return;

        usados.add(v.id);

        const monto = ventas.reduce(
            (sum, p) => sum + (parseFloat(p.total || 0) || 0),
            0
        );

        const comision = ventas.reduce(
            (sum, p) => sum + (parseFloat(p.comision || 0) || 0),
            0
        );

        resumen.push({
            vendedor_id: v.id,
            vendedor_nombre: v.nombre || 'Vendedor',
            pedidos: ventas.length,
            monto,
            comision,
            ticketPromedio: ventas.length ? monto / ventas.length : 0
        });
    });

    // Las ventas sin vendedor siguen siendo ventas válidas,
    // pero nunca generan comisión.
    const directas = pedidos.filter(p => !p.vendedor_id);
    if (directas.length) {
        const monto = directas.reduce(
            (sum, p) => sum + (parseFloat(p.total || 0) || 0),
            0
        );

        resumen.push({
            vendedor_id: '',
            vendedor_nombre: 'Venta Directa / Sin Vendedor',
            pedidos: directas.length,
            monto,
            comision: 0,
            ticketPromedio: directas.length ? monto / directas.length : 0
        });
    }

    return resumen;
};

// ==========================================
// ESTADO DE COMISIONES
// ==========================================
App.logic.obtenerEstadoComisiones = function (vendedorId) {
    const todos = App.state.pedidos || [];

    // PENDIENTES: solamente ventas reales ya ENTREGADAS.
    // CANCELADOS, DEVUELTOS, STOCK_INTERNO y pedidos aún no entregados
    // jamás pueden generar una comisión pendiente.
    const pedidosVendedor = todos.filter(p =>
        App.logic.esVentaValidaVendedor(p) &&
        p.vendedor_id === vendedorId &&
        parseFloat(p.comision || 0) > 0
    );

    const pendientes = [];
    const pagadas = [];
    let totalPendiente = 0;
    let totalPagado = 0;

    // El histórico de pagadas conserva los pagos realizados para auditoría.
    // Esto permite que una devolución posterior no borre la evidencia de que
    // una comisión fue realmente liquidada.
    todos.forEach(p => {
        if (
            p.vendedor_id !== vendedorId ||
            parseFloat(p.comision || 0) <= 0 ||
            String(p.comision_pagada || '').toUpperCase() !== 'TRUE'
        ) return;

        pagadas.push(p);
        totalPagado += parseFloat(p.comision || 0) || 0;
    });

    pedidosVendedor.forEach(p => {
        const monto = parseFloat(p.comision || 0) || 0;

        if (String(p.comision_pagada || '').toUpperCase() === 'TRUE') {
            // Ya fue incluida en el histórico de pagadas.
            return;
        }

        pendientes.push(p);
        totalPendiente += monto;
    });

    return {
        pendientes,
        pagadas,
        totalPendiente,
        totalPagado
    };
};

// ==========================================
// PAGO DE COMISIONES
// ==========================================
App.logic.pagarComisionesVendedor = async function (vendedorId, pedidosIds, totalPago) {
    const vendedor = (App.state.vendedores || []).find(v => v.id === vendedorId);
    const nombreVendedor = vendedor ? vendedor.nombre : 'Vendedor';

    try {
        // Nunca confiamos ciegamente en los IDs ni en el total enviado por la vista.
        // Se vuelve a validar todo antes de crear el gasto.
        const ids = Array.isArray(pedidosIds)
            ? pedidosIds.map(String).filter(Boolean)
            : String(pedidosIds || '')
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);

        if (!ids.length) {
            throw new Error('No hay comisiones seleccionadas para pagar.');
        }

        const pendientesValidos = (App.state.pedidos || []).filter(p =>
            ids.includes(String(p.id)) &&
            p.vendedor_id === vendedorId &&
            App.logic.esVentaValidaVendedor(p) &&
            parseFloat(p.comision || 0) > 0 &&
            String(p.comision_pagada || '').toUpperCase() !== 'TRUE'
        );

        if (!pendientesValidos.length) {
            throw new Error('No existen comisiones pendientes válidas para este vendedor.');
        }

        const montoReal = pendientesValidos.reduce(
            (sum, p) => sum + (parseFloat(p.comision || 0) || 0),
            0
        );

        if (montoReal <= 0) {
            throw new Error('El monto de comisión debe ser mayor a cero.');
        }

        // El monto recibido de la vista se usa solo como referencia.
        // El gasto siempre se registra con el total recalculado desde los pedidos.
        const gastoData = {
            fecha: new Date().toISOString(),
            categoria: 'Comisiones de Venta',
            concepto: `Pago de comisiones a ${nombreVendedor} (${pendientesValidos.length} pedidos)`,
            monto: montoReal
        };

        // 1. Registrar el gasto automáticamente en Finanzas.
        await App.logic.guardarNuevoGenerico(
            'gastos',
            gastoData,
            'GST',
            'gastos'
        );

        // 2. Marcar únicamente los pedidos que fueron revalidados.
        for (const pedido of pendientesValidos) {
            await App.logic.actualizarRegistroGenerico(
                'pedidos',
                pedido.id,
                { comision_pagada: 'TRUE' },
                'pedidos'
            );

            // Mantener el estado local sincronizado.
            pedido.comision_pagada = 'TRUE';
        }

        return {
            ok: true,
            totalPago: montoReal,
            pedidosPagados: pendientesValidos.map(p => p.id)
        };
    } catch (error) {
        console.error('Error pagando comisiones:', error);
        throw error;
    }
};
