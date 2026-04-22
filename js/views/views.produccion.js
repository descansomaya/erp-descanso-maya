window.App = window.App || {};
App.views = App.views || {};

// 🔁 NUEVO: reversa de materiales con anti doble reversa
App.views.revertirProduccionAPendiente = async function (ordenId) {
    const orden = (App.state?.ordenes_produccion || []).find(o => o.id === ordenId);
    if (!orden) throw new Error('Orden no encontrada');

    const estadoActual = String(orden.estado || '').toLowerCase();
    const yaRevertida = String(orden.materiales_revertidos || '').toLowerCase() === 'true' || orden.materiales_revertidos === true;

    if (estadoActual === 'pendiente') {
        App.ui.toast('La orden ya está en pendiente', 'warning');
        return false;
    }

    if (yaRevertida) {
        App.ui.toast('Esta orden ya tuvo reversa de materiales', 'warning');
        return false;
    }

    const ok = window.confirm(`¿Regresar la orden ${ordenId} a pendiente y restaurar materiales?`);
    if (!ok) return false;

    let receta = [];
    try { receta = JSON.parse(orden.receta_personalizada || '[]'); } catch(e) {}

    const operaciones = [];
    const ahora = new Date().toISOString();

    receta.forEach((item, i) => {
        const mat = (App.state?.inventario || []).find(m => m.id === item.mat_id);
        if (!mat) return;

        const cant = parseFloat(item.cant || 0) || 0;
        if (cant <= 0) return;
        const nuevo = (parseFloat(mat.stock_real || 0) || 0) + cant;

        operaciones.push({
            action:'actualizar_fila',
            nombreHoja:'materiales',
            idFila:mat.id,
            datosNuevos:{ stock_real:nuevo }
        });

        operaciones.push({
            action:'guardar_fila',
            nombreHoja:'movimientos_inventario',
            datos:{
                id:`REV-${Date.now()}-${i}`,
                material_id:mat.id,
                tipo:'entrada',
                cantidad:cant,
                motivo:`Reversa orden ${ordenId}`,
                referencia_id: ordenId,
                fecha:ahora
            }
        });
    });

    operaciones.push({
        action:'actualizar_fila',
        nombreHoja:'ordenes_produccion',
        idFila:ordenId,
        datosNuevos:{
            estado:'pendiente',
            materiales_revertidos:true,
            fecha_reversa_materiales: ahora
        }
    });

    const res = await App.api.fetch('ejecutar_lote',{ operaciones });
    if (res.status !== 'success') {
        throw new Error(res.message || 'No se pudo ejecutar la reversa');
    }

    receta.forEach(item=>{
        const mat=(App.state?.inventario||[]).find(m=>m.id===item.mat_id);
        if(mat) mat.stock_real=(parseFloat(mat.stock_real||0)||0)+parseFloat(item.cant||0);
    });

    const ordState=(App.state?.ordenes_produccion||[]).find(o=>o.id===ordenId);
    if(ordState){
        ordState.estado='pendiente';
        ordState.materiales_revertidos=true;
        ordState.fecha_reversa_materiales=ahora;
    }

    if (!Array.isArray(App.state.movimientos_inventario)) App.state.movimientos_inventario = [];
    receta.forEach((item, i) => {
        const cant = parseFloat(item.cant || 0) || 0;
        if (!item.mat_id || cant <= 0) return;
        App.state.movimientos_inventario.push({
            id:`REV-${Date.now()}-${i}`,
            material_id:item.mat_id,
            tipo:'entrada',
            cantidad:cant,
            motivo:`Reversa orden ${ordenId}`,
            referencia_id: ordenId,
            fecha:ahora
        });
    });

    return true;
};

App.views.runProduccionAction = async function (button, lockKey, actionFn, options = {}) {
    return App.ui.runSafeAction({
        lockKey,
        button,
        loadingText: options.loadingText || 'Procesando...',
        loaderMessage: options.loaderMessage || 'Actualizando producción...',
        successMessage: options.successMessage || 'Acción completada',
        errorTitle: options.errorTitle || 'No se pudo completar la acción',
        toastOnSuccess: options.toastOnSuccess !== false
    }, async () => actionFn());
};

App.views.accionProduccion = function (button, ordenId, actionName) {
    const actions = {
        iniciar: {
            fn: async () => {
                const orden = (App.state?.ordenes_produccion || []).find(o => o.id === ordenId);
                if (orden) orden.materiales_revertidos = false;
                return App.logic.cambiarEstadoProduccion(ordenId, 'proceso');
            },
            loadingText: 'Iniciando...',
            loaderMessage: 'Moviendo orden a proceso...',
            successMessage: 'Orden iniciada',
            errorTitle: 'No se pudo iniciar la orden'
        },
        terminar: {
            fn: () => App.logic.cambiarEstadoProduccion(ordenId, 'listo'),
            loadingText: 'Terminando...',
            loaderMessage: 'Marcando orden como lista...',
            successMessage: 'Orden terminada',
            errorTitle: 'No se pudo terminar la orden'
        },
        regresarPendiente: {
            fn: () => App.views.revertirProduccionAPendiente(ordenId),
            loadingText: 'Regresando...',
            loaderMessage: 'Regresando orden a pendiente y restaurando materiales...',
            successMessage: 'Orden regresada a pendiente con reversa',
            errorTitle: 'No se pudo regresar la orden a pendiente'
        },
        eliminar: {
            fn: async () => {
                const ok = window.confirm(`¿Eliminar la orden ${ordenId}?`);
                if (!ok) return false;
                return App.logic.eliminarRegistroGenerico('ordenes_produccion', ordenId, 'ordenes_produccion');
            },
            loadingText: 'Eliminando...',
            loaderMessage: 'Eliminando orden de producción...',
            successMessage: 'Orden eliminada',
            errorTitle: 'No se pudo eliminar la orden'
        }
    };

    const config = actions[actionName];
    if (!config) {
        App.ui.toast('Acción no disponible', 'warning');
        return;
    }

    return App.views.runProduccionAction(button, `produccion:${ordenId}:${actionName}`, config.fn, config);
};