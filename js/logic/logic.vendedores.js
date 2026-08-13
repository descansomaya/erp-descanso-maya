// ==========================================
// LÓGICA: VENDEDORES Y COMISIONES
// ==========================================

window.App = window.App || {};
App.logic = App.logic || {};

Object.assign(App.logic, {

App.logic.obtenerEstadoComisiones = function(vendedorId) {
    // Filtramos los pedidos asignados a este vendedor que tengan alguna comisión
    const pedidosVendedor = (App.state.pedidos || []).filter(p => p.vendedor_id === vendedorId && parseFloat(p.comision || 0) > 0);
    
    const pendientes = [];
    const pagadas = [];
    let totalPendiente = 0;
    let totalPagado = 0;

    pedidosVendedor.forEach(p => {
        const monto = parseFloat(p.comision || 0);
        // Si la columna dice "TRUE" o "true", ya se pagó
        if (String(p.comision_pagada || '').toUpperCase() === 'TRUE') {
            pagadas.push(p);
            totalPagado += monto;
        } else {
            pendientes.push(p);
            totalPendiente += monto;
        }
    });

    return { pendientes, pagadas, totalPendiente, totalPagado };
};

App.logic.pagarComisionesVendedor = async function(vendedorId, pedidosIds, totalPago) {
    const vendedor = (App.state.vendedores || []).find(v => v.id === vendedorId);
    const nombreVendedor = vendedor ? vendedor.nombre : 'Vendedor';

    try {
        // 1. Registrar el Gasto automáticamente en la pestaña de Egresos
        const gastoData = {
            fecha: new Date().toISOString(),
            categoria: 'Comisiones de Venta',
            concepto: `Pago de comisiones a ${nombreVendedor} (${pedidosIds.length} pedidos)`,
            monto: totalPago
        };
        await App.logic.guardarNuevoGenerico('gastos', gastoData, 'GST', 'gastos');

        // 2. Actualizar los pedidos en Google Sheets para marcarlos como "Pagados"
        for (let pedId of pedidosIds) {
            await App.logic.actualizarRegistroGenerico('pedidos', pedId, { comision_pagada: 'TRUE' }, 'pedidos');
        }

        return true;
    } catch (error) {
        console.error("Error pagando comisiones:", error);
        throw error;
    }
}
};
