window.App = window.App || {};
App.views = App.views || {};

// 🔁 NUEVO: reversa de materiales
App.views.revertirProduccionAPendiente = async function (ordenId) {
    const orden = (App.state?.ordenes_produccion || []).find(o => o.id === ordenId);
    if (!orden) throw new Error('Orden no encontrada');

    const ok = window.confirm(`¿Regresar la orden ${ordenId} a pendiente y restaurar materiales?`);
    if (!ok) return false;

    let receta = [];
    try { receta = JSON.parse(orden.receta_personalizada || '[]'); } catch(e) {}

    const operaciones = [];
    const ahora = new Date().toISOString();

    receta.forEach((item, i) => {
        const mat = (App.state?.inventario || []).find(m => m.id === item.mat_id);
        if (!mat) return;

        const cant = parseFloat(item.cant || 0);
        const nuevo = (parseFloat(mat.stock_real || 0) || 0) + cant;

        operaciones.push({ action:'actualizar_fila', nombreHoja:'materiales', idFila:mat.id, datosNuevos:{ stock_real:nuevo }});
        operaciones.push({ action:'guardar_fila', nombreHoja:'movimientos_inventario', datos:{ id:`REV-${Date.now()}-${i}`, material_id:mat.id, tipo:'entrada', cantidad:cant, motivo:`Reversa orden ${ordenId}`, fecha:ahora }});
    });

    operaciones.push({ action:'actualizar_fila', nombreHoja:'ordenes_produccion', idFila:ordenId, datosNuevos:{ estado:'pendiente' }});

    await App.api.fetch('ejecutar_lote',{ operaciones });

    // sync memoria
    receta.forEach(item=>{
        const mat=(App.state?.inventario||[]).find(m=>m.id===item.mat_id);
        if(mat) mat.stock_real=(parseFloat(mat.stock_real||0)||0)+parseFloat(item.cant||0);
    });

    const ordState=(App.state?.ordenes_produccion||[]).find(o=>o.id===ordenId);
    if(ordState) ordState.estado='pendiente';

    return true;
};

// 🔁 PATCH: solo cambiamos esta acción
App.views.accionProduccion = function (button, ordenId, actionName) {
    const actions = {
        iniciar: {
            fn: () => App.logic.cambiarEstadoProduccion(ordenId, 'proceso')
        },
        terminar: {
            fn: () => App.logic.cambiarEstadoProduccion(ordenId, 'listo')
        },
        regresarPendiente: {
            fn: () => App.views.revertirProduccionAPendiente(ordenId)
        },
        eliminar: {
            fn: () => App.logic.eliminarRegistroGenerico('ordenes_produccion', ordenId, 'ordenes_produccion')
        }
    };

    const config = actions[actionName];
    return App.views.runProduccionAction(button, `produccion:${ordenId}:${actionName}`, config.fn, config);
};