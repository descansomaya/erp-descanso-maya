// ==========================================
// LÓGICA DE NEGOCIO: TALLER Y PRODUCCIÓN
// ==========================================

App.logic.produccion = {}; // Espacio de nombres si se requiere a futuro

// 1. CAMBIAR ESTADO (Y GENERAR PAGO AUTOMÁTICO AL ARTESANO)
App.logic.cambiarEstadoProduccion = function(ordenId, nuevoEstado) {
    App.ui.showLoader("Actualizando estado...");
    const orden = App.state.ordenes_produccion.find(o => o.id === ordenId);
    if(!orden) { App.ui.hideLoader(); return; }

    let dataToUpdate = { estado: nuevoEstado };
    
    if (nuevoEstado === 'proceso') {
        dataToUpdate.fecha_inicio = new Date().toISOString();
    } else if (nuevoEstado === 'listo') {
        dataToUpdate.fecha_fin = new Date().toISOString();

        // MAGIA RELACIONAL: Si se terminó y tiene un pago asignado, crear la deuda en pago_artesanos
        if(orden.artesano_id && orden.pago_estimado) {
            const id_pago = 'PAGO-' + Date.now() + '-' + (orden.tarifa_nombre || 'Trabajo').replace(/\s+/g, '');
            const nuevoPago = {
                id: id_pago,
                artesano_id: orden.artesano_id,
                orden_id: ordenId,
                tipo_trabajo: orden.tarifa_nombre,
                monto_unitario: orden.pago_estimado,
                total: orden.pago_estimado,
                estado: 'pendiente',
                fecha: new Date().toISOString()
            };
            
            // Lo guardamos en la memoria local
            App.state.pago_artesanos.push(nuevoPago);
            // Lo mandamos a la base de datos silenciosamente
            App.api.fetch("guardar_nuevo", { hoja: "pago_artesanos", datos: nuevoPago });
        }
    }

    // Actualizamos la orden usando la función principal
    App.logic.actualizarRegistroGenerico('ordenes_produccion', ordenId, dataToUpdate, 'produccion');
};

// 2. GUARDAR RECETA Y DESCONTAR INVENTARIO (KARDEX)
App.logic.guardarRecetaProduccion = async function(ordenId, recetaArray) {
    App.ui.showLoader("Descontando inventario...");
    const orden = App.state.ordenes_produccion.find(o => o.id === ordenId);
    if(!orden) { App.ui.hideLoader(); return; }

    const recetaJson = JSON.stringify(recetaArray);
    const promesasMovimientos = [];
    const fechaHoy = new Date().toISOString().split('T')[0];

    // Por cada hilo usado, hacemos un movimiento de salida
    recetaArray.forEach(item => {
        const mat = App.state.inventario.find(m => m.id === item.mat_id);
        if(mat) {
            const cantDeducir = parseFloat(item.cant);
            // 2.1 Actualizar stock real localmente
            mat.stock_real = (parseFloat(mat.stock_real || 0) - cantDeducir).toFixed(2);

            // 2.2 Crear el registro exacto para tu Excel (movimientos_inventario)
            const id_mov = 'MOV-' + Date.now() + Math.floor(Math.random() * 1000);
            const costoItem = parseFloat(mat.costo_unitario || 0);
            const totalCosto = -(cantDeducir * costoItem);

            const mov = {
                id: id_mov,
                fecha: fechaHoy,
                tipo_movimiento: 'salida_produccion',
                origen: 'orden',
                origen_id: ordenId,
                ref_tipo: 'material',
                ref_id: item.mat_id,
                cantidad: -cantDeducir,
                costo_unitario: costoItem,
                total: totalCosto,
                notas: `Envío a taller de pedido ${(orden.pedido_detalle_id||'').replace('PDET-','')}`
            };
            
            App.state.movimientos_inventario.push(mov);
            
            // Mandar a guardar a Sheets (Movimiento + Actualización de Material)
            promesasMovimientos.push(App.api.fetch("guardar_nuevo", { hoja: "movimientos_inventario", datos: mov }));
            promesasMovimientos.push(App.api.fetch("actualizar_registro", { hoja: "materiales", id: mat.id, datos: { stock_real: mat.stock_real } }));
        }
    });

    // 3. Guardar la receta en la orden de producción
    promesasMovimientos.push(App.api.fetch("actualizar_registro", { hoja: "ordenes_produccion", id: ordenId, datos: { receta_personalizada: recetaJson } }));
    orden.receta_personalizada = recetaJson;

    try {
        await Promise.all(promesasMovimientos);
        App.ui.hideLoader();
        App.ui.toast("Inventario descontado y receta guardada");
        App.ui.closeSheet();
        App.router.handleRoute(); // Refrescar la pantalla
    } catch (error) {
        console.error("Error al descontar:", error);
        App.ui.hideLoader();
        App.ui.toast("Error al guardar movimientos en la nube", "danger");
    }
};

// 3. EXTRACCIÓN AUTOMÁTICA DE RECETA (Llamada cuando se crea un pedido)
App.logic.generarOrdenesDesdePedido = async function(detallesArray) {
    // Esta función recibe el "pedido_detalle" recién creado y arma las órdenes de taller.
    const promesas = [];

    detallesArray.forEach(det => {
        const producto = App.state.productos.find(p => p.id === det.producto_id);
        if(!producto) return;

        // Bucle para extraer mat_1, cant_1, mat_2, cant_2 ... de tu tabla de productos
        let recetaBase = [];
        for(let i=1; i<=10; i++) {
            if(producto[`mat_${i}`]) {
                recetaBase.push({
                    mat_id: producto[`mat_${i}`],
                    cant: producto[`cant_${i}`],
                    uso: producto[`uso_${i}`] || 'Cuerpo'
                });
            }
        }

        const id_orden = 'ORD-' + Date.now() + Math.floor(Math.random() * 1000);
        const nuevaOrden = {
            id: id_orden,
            pedido_detalle_id: det.id,
            estado: 'pendiente',
            receta_personalizada: JSON.stringify(recetaBase),
            fecha_creacion: new Date().toISOString()
        };

        App.state.ordenes_produccion.push(nuevaOrden);
        promesas.push(App.api.fetch("guardar_nuevo", { hoja: "ordenes_produccion", datos: nuevaOrden }));
    });

    return Promise.all(promesas);
};
