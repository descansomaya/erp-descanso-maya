// ==========================================
// LÓGICA: INVENTARIO, COMPRAS Y CUENTAS POR PAGAR
// ==========================================

Object.assign(App.logic, {
    async guardarNuevaCompra(datos) { 
        App.ui.showLoader("Comprando..."); const compraId = "COM-" + Date.now(); const detallesCompra = []; let operaciones = []; let nuevosMovs = []; const mats = Array.isArray(datos.mat_id) ? datos.mat_id : (datos.mat_id ? [datos.mat_id] : []); const cants = Array.isArray(datos.cant) ? datos.cant : (datos.cant ? [datos.cant] : []); const precios = Array.isArray(datos.precio_u) ? datos.precio_u : (datos.precio_u ? [datos.precio_u] : []);
        let gastoPorTipo = {};
        for(let i=0; i<mats.length; i++) { 
            const matId = mats[i]; const cant = parseFloat(cants[i] || 0); const precioUnitario = parseFloat(precios[i] || 0); const totalFila = cant * precioUnitario; 
            if(matId && cant > 0) { 
                const material = App.state.inventario.find(m => m.id === matId); 
                if(material) { 
                    const tipoMat = material.tipo || 'otro'; let catGasto = 'Materiales e Insumos'; if(tipoMat === 'reventa') catGasto = 'Hamacas (Reventa)';
                    gastoPorTipo[catGasto] = (gastoPorTipo[catGasto] || 0) + totalFila;
                    detallesCompra.push({ mat_id: matId, nombre: material.nombre, cantidad: cant, costo_unitario: precioUnitario }); 
                    
                    const nuevoStockReal = parseFloat(material.stock_real||0) + cant; 
                    operaciones.push({ action: "actualizar_fila", nombreHoja: "materiales", idFila: material.id, datosNuevos: { stock_real: nuevoStockReal, costo_unitario: precioUnitario } }); 
                    material.stock_real = nuevoStockReal; material.costo_unitario = precioUnitario; 
                    
                    if (material.tipo === 'reventa') { const existeProd = App.state.productos.find(p => p.mat_1 === material.id || p.nombre.toLowerCase() === material.nombre.toLowerCase()); if(!existeProd) { const nuevoProd = { id: "PROD-" + Date.now() + i, nombre: material.nombre, categoria: "reventa", clasificacion: "Reventa", precio_venta: 0, mat_1: material.id, cant_1: 1, uso_1: "Completo", activo: "TRUE", fecha_creacion: new Date().toISOString() }; operaciones.push({ action: "guardar_fila", nombreHoja: "productos", datos: nuevoProd }); App.state.productos.push(nuevoProd); } else if (existeProd.mat_1 !== material.id) { operaciones.push({ action: "actualizar_fila", nombreHoja: "productos", idFila: existeProd.id, datosNuevos: { mat_1: material.id } }); existeProd.mat_1 = material.id; } } 
                    const mov = { id: "MOV-" + Date.now() + i, fecha: datos.fecha, tipo_movimiento: "entrada_compra", origen: "compra", origen_id: compraId, ref_tipo: "material", ref_id: material.id, cantidad: cant, costo_unitario: precioUnitario, total: totalFila, notas: "Compra a proveedor" }; nuevosMovs.push(mov); operaciones.push({ action: "guardar_fila", nombreHoja: "movimientos_inventario", datos: mov }); 
                } 
            } 
        } 
        const totalNum = parseFloat(datos.total); const montoPagadoNum = parseFloat(datos.monto_pagado) || 0; const estadoCompra = montoPagadoNum >= totalNum ? 'pagado' : 'credito';
        const compra = { id: compraId, proveedor_id: datos.proveedor_id, fecha: datos.fecha, total: totalNum, monto_pagado: montoPagadoNum, estado: estadoCompra, detalles: JSON.stringify(detallesCompra), fecha_creacion: new Date().toISOString() }; operaciones.push({ action: "guardar_fila", nombreHoja: "compras", datos: compra }); const proveedor = App.state.proveedores.find(p => p.id === datos.proveedor_id); const nombreProv = proveedor ? proveedor.nombre : "Proveedor"; 
        
        let nuevosAbonosProv = [];
        if(montoPagadoNum > 0) { 
            // 1. Registrar en la nueva tabla de historial de abonos a proveedores
            const abonoInicial = { id: "ABO-P-" + Date.now(), compra_id: compraId, proveedor_id: datos.proveedor_id, monto: montoPagadoNum, nota: "Pago inicial de compra", fecha: new Date().toISOString().split('T')[0] };
            operaciones.push({ action: "guardar_fila", nombreHoja: "abonos_proveedores", datos: abonoInicial });
            nuevosAbonosProv.push(abonoInicial);

            // 2. Registrar los gastos en caja
            Object.keys(gastoPorTipo).forEach((cat, idx) => { const proporcion = gastoPorTipo[cat] / totalNum; const montoCat = montoPagadoNum * proporcion; const nuevoGasto = { id: "GAS-" + Date.now() + "-" + idx, categoria: cat, descripcion: `Pago inicial compra a ${nombreProv} (${compraId})`, monto: montoCat.toFixed(2), fecha: datos.fecha }; operaciones.push({ action: "guardar_fila", nombreHoja: "gastos", datos: nuevoGasto }); App.state.gastos.push(nuevoGasto); }); 
        }

        await App.api.fetch("ejecutar_lote", { operaciones: operaciones }); 
        App.state.compras.push(compra); 
        if(!App.state.abonos_proveedores) App.state.abonos_proveedores = []; App.state.abonos_proveedores.push(...nuevosAbonosProv);
        if(!App.state.movimientos_inventario) App.state.movimientos_inventario=[]; App.state.movimientos_inventario.push(...nuevosMovs); App.ui.hideLoader(); App.ui.toast("Compra registrada"); App.router.handleRoute();  
    },

    async guardarAbonoCompra(datos) { 
        const compra = App.state.compras.find(c => c.id === datos.compra_id); if(!compra) return;
        const abonoFormateado = parseFloat(datos.monto) || 0;
        const deudaActual = parseFloat(compra.total||0) - parseFloat(compra.monto_pagado||0);
        
        // 🔒 CANDADO: Evitar sobrepagos
        if(abonoFormateado > deudaActual + 0.1) { alert(`❌ No puedes abonar más del saldo pendiente ($${deudaActual.toFixed(2)})`); return; }

        App.ui.showLoader("Registrando Abono..."); 
        const nuevoPagado = parseFloat(compra.monto_pagado || 0) + abonoFormateado; 
        const proveedor = App.state.proveedores.find(p => p.id === compra.proveedor_id); const nombreProv = proveedor ? proveedor.nombre : "Proveedor"; let operaciones = []; 
        
        // 1. Actualizar Maestro de Compras
        operaciones.push({action: "actualizar_fila", nombreHoja: "compras", idFila: compra.id, datosNuevos: { monto_pagado: nuevoPagado, estado: nuevoPagado >= parseFloat(compra.total) ? 'pagado' : 'credito' }}); 
        
        // 2. Historial en Abonos a Proveedores
        const nuevoAbonoProv = { id: "ABO-P-" + Date.now(), compra_id: compra.id, proveedor_id: compra.proveedor_id, monto: abonoFormateado, nota: "Abono parcial", fecha: new Date().toISOString().split('T')[0] };
        operaciones.push({ action: "guardar_fila", nombreHoja: "abonos_proveedores", datos: nuevoAbonoProv });

        // 3. Salida de Dinero (Gasto)
        const nuevoGasto = { id: "GAS-" + Date.now(), categoria: "Materiales e Insumos", descripcion: `Abono Compra a ${nombreProv} (${compra.id})`, monto: abonoFormateado, fecha: new Date().toISOString().split('T')[0] }; operaciones.push({ action: "guardar_fila", nombreHoja: "gastos", datos: nuevoGasto }); 
        
        const res = await App.api.fetch("ejecutar_lote", { operaciones: operaciones }); 
        if(res.status === 'success') { 
            compra.monto_pagado = nuevoPagado; if(nuevoPagado >= parseFloat(compra.total)) compra.estado = 'pagado'; 
            App.state.gastos.push(nuevoGasto); 
            if(!App.state.abonos_proveedores) App.state.abonos_proveedores = []; App.state.abonos_proveedores.push(nuevoAbonoProv);
            App.ui.hideLoader(); App.ui.toast("Abono registrado"); App.router.handleRoute(); 
            // Si estábamos en el detalle de la compra, refrescarlo
            const sheetBg = document.getElementById('sheet-bg'); if(sheetBg) App.views.verDetallesCompra(compra.id);
        } else { App.ui.hideLoader(); App.ui.toast("Error"); } 
    },

    async eliminarCompra(id) { 
        if(!confirm("⚠️ ¿Eliminar compra? Se restará el stock físico ingresado, se borrarán todos los pagos realizados y el gasto de caja regresará.")) return; 
        App.ui.showLoader("Eliminando en cascada..."); let operaciones = [ { action: "eliminar_fila", nombreHoja: "compras", idFila: id } ]; 
        
        // Revertir inventario
        const movimientosAsociados = (App.state.movimientos_inventario || []).filter(m => m.origen_id === id); 
        movimientosAsociados.forEach(m => {
            const material = App.state.inventario.find(mat => mat.id === m.ref_id);
            if(material) {
                let nReal = Math.max(0, parseFloat(material.stock_real||0) - parseFloat(m.cantidad||0));
                operaciones.push({ action: "actualizar_fila", nombreHoja: "materiales", idFila: material.id, datosNuevos: { stock_real: nReal } });
                material.stock_real = nReal;
            }
            operaciones.push({ action: "eliminar_fila", nombreHoja: "movimientos_inventario", idFila: m.id });
        });
        
        // Revertir gastos (dinero)
        const gastosAsociados = App.state.gastos.filter(g => g.descripcion.includes(id)); gastosAsociados.forEach(gastoAsociado => operaciones.push({ action: "eliminar_fila", nombreHoja: "gastos", idFila: gastoAsociado.id })); 
        
        // Eliminar historial de abonos
        const abonosAsociados = (App.state.abonos_proveedores || []).filter(a => a.compra_id === id); abonosAsociados.forEach(ab => operaciones.push({ action: "eliminar_fila", nombreHoja: "abonos_proveedores", idFila: ab.id }));

        const res = await App.api.fetch("ejecutar_lote", { operaciones: operaciones }); App.ui.hideLoader(); 
        if(res.status === "success") { 
            App.state.compras = App.state.compras.filter(c => c.id !== id); 
            App.state.gastos = App.state.gastos.filter(g => !g.descripcion.includes(id)); 
            App.state.movimientos_inventario = App.state.movimientos_inventario.filter(m => m.origen_id !== id); 
            App.state.abonos_proveedores = (App.state.abonos_proveedores || []).filter(a => a.compra_id !== id);
            App.ui.toast("Compra eliminada."); App.router.handleRoute(); 
        } else { App.ui.toast("Error al eliminar"); } 
    }
});
