// ==========================================
// LÓGICA: VENDEDORES Y COMISIONES
// ==========================================

window.App = window.App || {};
App.logic = App.logic || {};

// Aquí prepararemos el terreno para la Fase 5 (Corte de caja de comisiones).
// Por ahora, las funciones CRUD de crear/editar ya las maneja tu lógica genérica
// (guardarNuevoGenerico y actualizarRegistroGenerico).

App.logic.calcularComisionesPendientes = function(vendedorId) {
    // Esta función la programaremos en la siguiente etapa.
    // Sumará los pedidos entregados/pagados que tengan el vendedor_id 
    // y que no tengan una marca de "comisión pagada".
    console.log("Calculando comisiones para el vendedor: ", vendedorId);
    return 0;
};
