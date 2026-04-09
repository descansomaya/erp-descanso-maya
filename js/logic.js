// ==========================================
// 5. LÓGICA DE NEGOCIO (logic.js) - INVENTARIO INTELIGENTE V58
// ==========================================

App.logic = {
    async verificarPIN(pin) { 
        App.ui.showLoader("Verificando..."); 
        const res = await App.api.fetch("login", { pin: pin }); 
        if (res.status === "success" && res.data.sessionToken) { 
            App.state.sessionToken = res.data.sessionToken;
            localStorage.setItem('erp_session_token', res.data.sessionToken); 
            App.ui.toast("¡Acceso concedido!"); 
            this.cargarDatosIniciales(); 
        } else { 
            App.state.sessionToken = null; 
            App.ui.hideLoader(); 
            App.ui.toast(res.message || "PIN Incorrecto."); 
        } 
    },
    async cargarDatosIniciales() { 
        App.ui.showLoader("Sincronizando Base de Datos..."); 
        try { 
            if (!App.state.sessionToken) { App.ui.hideLoader(); return; }
            const hojas = ["materiales", "clientes", "productos", "pedidos", "pedido_detalle", "ordenes_produccion", "artesanos", "abonos_clientes", "gastos", "compras", "proveedores", "reparaciones", "tarifas_artesano", "pago_artesanos", "movimientos_inventario"]; 
            const res = await App.api.fetch("leer_todo", { hojas: hojas }); 
            if (res.status === "error") throw new Error(res.message); 
            const bd = res.data;
            App.state.inventario = bd["materiales"] || []; App.state.clientes = bd["clientes"] || []; App.state.productos = bd["productos"] || []; App.state.pedidos = bd["pedidos"] || []; App.state.pedido_detalle = bd["pedido_detalle"] || []; App.state.ordenes_produccion = bd["ordenes_produccion"] || []; App.state.artesanos = bd["artesanos"] || []; App.state.abonos = bd["abonos_clientes"] || []; App.state.gastos = bd["gastos"] || []; App.state.compras = bd["compras"] || []; App.state.proveedores = bd["proveedores"] || []; App.state.reparaciones = bd["reparaciones"] || []; App.state.tarifas_artesano = bd["tarifas_artesano"] || []; App.state.pago_artesanos = bd["pago_artesanos"] || []; App.state.movimientos_inventario = bd["movimientos_inventario"] || []; 
            App.ui.hideLoader(); App.router.init(); 
        } catch (error) { 
            console.error("Fallo de conexión:", error); 
            if (App.state.sessionToken) {
                App.ui.toast("Señal débil. Reintentando..."); 
                setTimeout(() => App.logic.cargarDatosIniciales(), 3000); 
            } else { App.ui.hideLoader(); }
        } 
    },
    descargarRespaldo() { const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(App.state, null, 2)); const dlAnchorElem = document.createElement('a'); dlAnchorElem.setAttribute("href", dataStr); dlAnchorElem.setAttribute("download", `Respaldo_ERP_Maya_${new Date().toISOString().split('T')[0]}.json`); dlAnchorElem.click(); App.ui.toast("Respaldo descargado"); },
    async eliminarRegistroGenerico(hoja, id, estado) { if(!confirm("⚠️ ¿Eliminar permanentemente?")) return; App.ui.showLoader("Eliminando..."); const res = await App.api.fetch("eliminar_fila", { nombreHoja: hoja, idFila: id }); App.ui.hideLoader(); if(res.status === "success") { App.state[estado] = App.state[estado].filter(item => item.id !== id); App.ui.toast("Eliminado"); App.router.handleRoute(); } else { App.ui.toast("Error"); } },
    
    // ==========================================
    // NUEVO MOTOR DE INVENTARIO INTELIGENTE
    // ==========================================
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
                    
                    // Solo sube el REAL físico
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
        if(montoPagadoNum > 0) { Object.keys(gastoPorTipo).forEach((cat, idx) => { const proporcion = gastoPorTipo[cat] / totalNum; const montoCat = montoPagadoNum * proporcion; const nuevoGasto = { id: "GAS-" + Date.now() + "-" + idx, categoria: cat, descripcion: `Compra a ${nombreProv} (${compraId})`, monto: montoCat.toFixed(2), fecha: datos.fecha }; operaciones.push({ action: "guardar_fila", nombreHoja: "gastos", datos: nuevoGasto }); App.state.gastos.push(nuevoGasto); }); }
        await App.api.fetch("ejecutar_lote", { operaciones: operaciones }); App.state.compras.push(compra); if(!App.state.movimientos_inventario) App.state.movimientos_inventario=[]; App.state.movimientos_inventario.push(...nuevosMovs); App.ui.hideLoader(); App.ui.toast("Compra registrada"); App.router.handleRoute();  
    },

    async guardarNuevoPedido(datosFormulario) { 
        App.ui.showLoader("Procesando pedido..."); const pedidoId = "PED-" + Date.now(); const totalNum = parseFloat(datosFormulario.total) || 0; const anticipoNum = parseFloat(datosFormulario.anticipo) || 0; const cantidadNum = parseInt(datosFormulario.cantidad) || 1; const fechaC = datosFormulario.fecha_creacion ? datosFormulario.fecha_creacion + "T12:00:00.000Z" : new Date().toISOString(); const producto = App.state.productos.find(p => p.id === datosFormulario.producto_id); const esReventa = producto && producto.categoria === 'reventa'; const datosPedido = { id: pedidoId, cliente_id: datosFormulario.cliente_id, estado: esReventa ? "listo para entregar" : "nuevo", total: totalNum, anticipo: anticipoNum, notas: datosFormulario.notas, fecha_entrega: datosFormulario.fecha_entrega, fecha_creacion: fechaC }; const datosDetalle = { id: "PDET-" + Date.now(), pedido_id: pedidoId, producto_id: datosFormulario.producto_id, cantidad: cantidadNum, precio_unitario: totalNum / cantidadNum }; let operaciones = [ { action: "guardar_fila", nombreHoja: "pedidos", datos: datosPedido }, { action: "guardar_fila", nombreHoja: "pedido_detalle", datos: datosDetalle } ]; let nuevosMovs = [];
        if (esReventa) { 
            for(let i=1; i<=20; i++) { 
                const matId = producto[`mat_${i}`]; const cantTeorica = parseFloat(producto[`cant_${i}`] || 0) * cantidadNum; 
                if(matId && cantTeorica > 0) { 
                    const material = App.state.inventario.find(m => m.id === matId); 
                    if(material) { 
                        // Solo sube el RESERVADO (La hamaca sigue físicamente en la tienda)
                        const nReservado = parseFloat(material.stock_reservado||0) + cantTeorica; 
                        operaciones.push({ action: "actualizar_fila", nombreHoja: "materiales", idFila: material.id, datosNuevos: { stock_reservado: nReservado } }); 
                        material.stock_reservado = nReservado; 
                        const mov = { id: "MOV-" + Date.now() + i, fecha: new Date().toISOString().split('T')[0], tipo_movimiento: "reserva_venta", origen: "pedido", origen_id: pedidoId, ref_tipo: "material", ref_id: material.id, cantidad: cantTeorica, costo_unitario: material.costo_unitario||0, total: (cantTeorica * (material.costo_unitario||0)), notas: `Apartado por venta` }; nuevosMovs.push(mov); operaciones.push({ action: "guardar_fila", nombreHoja: "movimientos_inventario", datos: mov }); 
                    } 
                } 
            } 
        }
        const resPedido = await App.api.fetch("ejecutar_lote", { operaciones: operaciones }); if (resPedido.status === "success") { App.state.pedidos.push(datosPedido); App.state.pedido_detalle.push(datosDetalle); if(nuevosMovs.length > 0) { if(!App.state.movimientos_inventario) App.state.movimientos_inventario = []; App.state.movimientos_inventario.push(...nuevosMovs); } App.ui.hideLoader(); App.ui.toast(esReventa ? "Pedido guardado y stock apartado" : "Guardado (Sin mandar a taller)"); App.router.handleRoute(); } else { App.ui.hideLoader(); App.ui.toast("Error"); } 
    },

    async entregarDeBodega(pedidoId) {
        const pedido = App.state.pedidos.find(p => p.id === pedidoId); const detalle = App.state.pedido_detalle.find(d => d.pedido_id === pedidoId); const producto = App.state.productos.find(p => p.id === detalle.producto_id); if(!confirm(`¿Marcar ${producto.nombre} como entregada y sacarla físicamente de la bodega?`)) return;
        let operaciones = []; let nuevosMovs = []; let cantPedida = parseInt(detalle.cantidad) || 1;
        for(let i=1; i<=20; i++) { 
            const matId = producto[`mat_${i}`]; const cantTeorica = parseFloat(producto[`cant_${i}`] || 0) * cantPedida; 
            if(matId && cantTeorica > 0) { 
                const material = App.state.inventario.find(m => m.id === matId); 
                if(material) { 
                    // Baja el Reservado y baja el Real (Salió por la puerta)
                    const nReservado = Math.max(0, parseFloat(material.stock_reservado||0) - cantTeorica);
                    const nReal = parseFloat(material.stock_real||0) - cantTeorica; 
                    operaciones.push({ action: "actualizar_fila", nombreHoja: "materiales", idFila: material.id, datosNuevos: { stock_reservado: nReservado, stock_real: nReal } }); 
                    material.stock_reservado = nReservado; material.stock_real = nReal; 
                    const mov = { id: "MOV-" + Date.now() + i, fecha: new Date().toISOString().split('T')[0], tipo_movimiento: "salida_venta", origen: "pedido", origen_id: pedidoId, ref_tipo: "material", ref_id: material.id, cantidad: -cantTeorica, costo_unitario: material.costo_unitario||0, total: (-cantTeorica * (material.costo_unitario||0)), notas: `Entrega física al cliente` }; nuevosMovs.push(mov); operaciones.push({ action: "guardar_fila", nombreHoja: "movimientos_inventario", datos: mov }); 
                } 
            } 
        }
        operaciones.push({ action: "actualizar_fila", nombreHoja: "pedidos", idFila: pedidoId, datosNuevos: { estado: 'listo para entregar' } }); App.ui.showLoader("Entregando..."); await App.api.fetch("ejecutar_lote", { operaciones: operaciones }); pedido.estado = 'listo para entregar'; if(!App.state.movimientos_inventario) App.state.movimientos_inventario = []; App.state.movimientos_inventario.push(...nuevosMovs); App.ui.hideLoader(); App.ui.toast("Descontado de bodega"); App.router.handleRoute();
    },

    async confirmarMandarProduccion(datos) {
        const mats = Array.isArray(datos.mat_id) ? datos.mat_id : (datos.mat_id ? [datos.mat_id] : []); const cants = Array.isArray(datos.cant) ? datos.cant : (datos.cant ? [datos.cant] : []); const usos = Array.isArray(datos.uso) ? datos.uso : (datos.uso ? [datos.uso] : []); let requerimientos = {}; for(let i=0; i<mats.length; i++){ let mId = mats[i]; let c = parseFloat(cants[i]||0); if(mId && c > 0) requerimientos[mId] = (requerimientos[mId] || 0) + c; } 
        let alertasDeStock = []; 
        for(let mId in requerimientos) { 
            let material = App.state.inventario.find(m => m.id === mId); 
            if(material) {
                let disponible = parseFloat(material.stock_real||0) - parseFloat(material.stock_reservado||0) - parseFloat(material.stock_comprometido||0);
                if (disponible < requerimientos[mId]) { alertasDeStock.push(`❌ ${material.nombre}: Necesitas ${requerimientos[mId]} pero solo tienes ${disponible.toFixed(2)} libres.`); } 
            }
        } 
        if(alertasDeStock.length > 0) { const continuar = confirm("⚠️ ALERTA DE INVENTARIO ⚠️\n\n" + alertasDeStock.join("\n") + "\n\n¿Forzar envío a taller de todos modos?"); if(!continuar) return; }
        
        App.ui.showLoader("Generando Orden..."); let operaciones = []; let nuevosMovs = []; let recetaPersonalizada = [];
        for(let i=0; i<mats.length; i++) { 
            const matId = mats[i]; const cant = parseFloat(cants[i] || 0); const usoStr = usos[i] || 'Cuerpo'; 
            if(matId && cant > 0) { 
                recetaPersonalizada.push({ mat_id: matId, cant: cant, uso: usoStr }); 
                const material = App.state.inventario.find(m => m.id === matId); 
                if(material) { 
                    // Sube el COMPROMETIDO (El hilo sigue en la tienda, pero es del taller)
                    const nComprometido = parseFloat(material.stock_comprometido||0) + cant; 
                    operaciones.push({ action: "actualizar_fila", nombreHoja: "materiales", idFila: material.id, datosNuevos: { stock_comprometido: nComprometido } }); 
                    material.stock_comprometido = nComprometido; 
                    const mov = { id: "MOV-" + Date.now() + i, fecha: new Date().toISOString().split('T')[0], tipo_movimiento: "reserva_produccion", origen: "orden", origen_id: "PENDIENTE", ref_tipo: "material", ref_id: material.id, cantidad: cant, costo_unitario: material.costo_unitario||0, total: (cant * (material.costo_unitario||0)), notas: `Hilo comprometido para taller` }; nuevosMovs.push(mov); 
                } 
            } 
        }
        const nuevaOrden = { id: "ORD-" + Date.now(), pedido_detalle_id: datos.pedido_detalle_id, estado: "pendiente", fecha_creacion: new Date().toISOString(), receta_personalizada: JSON.stringify(recetaPersonalizada) }; nuevosMovs.forEach(m => { m.origen_id = nuevaOrden.id; operaciones.push({ action: "guardar_fila", nombreHoja: "movimientos_inventario", datos: m }); }); operaciones.push({ action: "guardar_fila", nombreHoja: "ordenes_produccion", datos: nuevaOrden });
        await App.api.fetch("ejecutar_lote", { operaciones: operaciones }); App.state.ordenes_produccion.push(nuevaOrden); if(!App.state.movimientos_inventario) App.state.movimientos_inventario = []; App.state.movimientos_inventario.push(...nuevosMovs); App.ui.hideLoader(); App.ui.toast("Enviado a taller"); App.router.navigate('produccion');
    },

    async cerrarOrdenProduccion(datosFormulario) { 
        App.ui.showLoader("Costeando y Finalizando..."); 
        const ordenId = datosFormulario.orden_id; 
        const orden = App.state.ordenes_produccion.find(o => o.id === ordenId); 
        const detalle = App.state.pedido_detalle.find(d => d.id === orden.pedido_detalle_id) || App.state.pedido_detalle.find(d => d.pedido_id === orden.pedido_detalle_id) || {}; 
        const pedidoMaster = App.state.pedidos.find(p => p.id === detalle.pedido_id);
        const producto = App.state.productos.find(p => p.id === detalle.producto_id); 
        
        let operaciones = []; let nuevosMovs = []; 
        let costoRealMateriales = 0;
        let desgloseMateriales = { Cuerpo: 0, Brazos: 0, Adicional: 0 };
        let nuevaRecetaReal = [];

        for(let i=1; i<=20; i++) { 
            const matId = datosFormulario[`mat_${i}_id`]; 
            const consumoTeorico = parseFloat(datosFormulario[`mat_${i}_teorico`]); 
            const consumoReal = parseFloat(datosFormulario[`mat_${i}_real`]); 
            const usoMat = datosFormulario[`mat_${i}_uso`] || 'Cuerpo';

            if(matId && !isNaN(consumoTeorico) && !isNaN(consumoReal)) { 
                const material = App.state.inventario.find(m => m.id === matId); 
                if(material) { 
                    // 1. Ajuste Inteligente de Inventario (Teórico vs Real)
                    const diferencia = consumoReal - consumoTeorico; 
                    const nComprometido = Math.max(0, parseFloat(material.stock_comprometido||0) - consumoTeorico);
                    const nReal = parseFloat(material.stock_real||0) - consumoReal;
                    
                    operaciones.push({ action: "actualizar_fila", nombreHoja: "materiales", idFila: material.id, datosNuevos: { stock_comprometido: nComprometido, stock_real: nReal } }); 
                    material.stock_comprometido = nComprometido; material.stock_real = nReal; 
                    
                    const mov = { id: "MOV-" + Date.now() + i, fecha: new Date().toISOString().split('T')[0], tipo_movimiento: "salida_produccion", origen: "orden", origen_id: ordenId, ref_tipo: "material", ref_id: material.id, cantidad: -consumoReal, costo_unitario: material.costo_unitario||0, total: (-consumoReal * (material.costo_unitario||0)), notas: `Consumo real en taller` }; 
                    nuevosMovs.push(mov); operaciones.push({ action: "guardar_fila", nombreHoja: "movimientos_inventario", datos: mov }); 
                    
                    // 2. Costeo Real Congelado
                    const costoFila = consumoReal * (parseFloat(material.costo_unitario) || 0);
                    costoRealMateriales += costoFila;
                    if(desgloseMateriales[usoMat] !== undefined) desgloseMateriales[usoMat] += costoFila; else desgloseMateriales['Adicional'] += costoFila;
                    
                    // Guardamos la receta final con su costo unitario del día de hoy
                    nuevaRecetaReal.push({ mat_id: matId, cant: consumoReal, cant_teorica: consumoTeorico, uso: usoMat, costo_unitario: material.costo_unitario });
                } 
            } 
        } 

        // 3. Rentabilidad Definitiva
        const pagos = App.state.pago_artesanos.filter(p => p.orden_id === ordenId);
        const costoManoObra = pagos.reduce((sum, p) => sum + parseFloat(p.total||0), 0);
        const totalVenta = pedidoMaster && pedidoMaster.cliente_id !== "STOCK_INTERNO" ? parseFloat(pedidoMaster.total || 0) : 0;
        const utilidadReal = totalVenta - costoRealMateriales - costoManoObra;

        const costosFinales = { materiales: costoRealMateriales, desglose_materiales: desgloseMateriales, mano_obra: costoManoObra, utilidad: utilidadReal, precio_venta: totalVenta };

        // 4. Sellar la Orden
        operaciones.push({ action: "actualizar_fila", nombreHoja: "ordenes_produccion", idFila: ordenId, datosNuevos: { estado: 'listo', receta_personalizada: JSON.stringify(nuevaRecetaReal), costos_finales: JSON.stringify(costosFinales) } }); 
        orden.estado = 'listo'; orden.receta_personalizada = JSON.stringify(nuevaRecetaReal); orden.costos_finales = JSON.stringify(costosFinales);

        // Devolución a Bodega Terminada (Stock Interno)
        if (datosFormulario.sumar_stock === "1" && producto) { 
            let matHamaca = App.state.inventario.find(m => m.nombre === producto.nombre && m.tipo === 'reventa'); 
            if(matHamaca) { 
                let nStockReal = parseFloat(matHamaca.stock_real||0) + 1; 
                operaciones.push({ action: "actualizar_fila", nombreHoja: "materiales", idFila: matHamaca.id, datosNuevos: { stock_real: nStockReal } }); matHamaca.stock_real = nStockReal; 
            } else { 
                let nMat = { id: "MAT-" + Date.now() + "REV", nombre: producto.nombre, tipo: "reventa", unidad: "Pzas", stock_real: 1, stock_reservado: 0, stock_comprometido: 0, fecha_creacion: new Date().toISOString() }; 
                operaciones.push({ action: "guardar_fila", nombreHoja: "materiales", datos: nMat }); App.state.inventario.push(nMat); 
            } 
            App.ui.toast("Guardado en Bodega"); 
        } 
        
        if(pedidoMaster && pedidoMaster.cliente_id !== "STOCK_INTERNO" && pedidoMaster.estado !== 'pagado') { 
            operaciones.push({ action: "actualizar_fila", nombreHoja: "pedidos", idFila: pedidoMaster.id, datosNuevos: { estado: 'listo para entregar' } }); 
            pedidoMaster.estado = 'listo para entregar'; 
        }
        
        await App.api.fetch("ejecutar_lote", { operaciones: operaciones }); 
        if(!App.state.movimientos_inventario) App.state.movimientos_inventario = []; App.state.movimientos_inventario.push(...nuevosMovs); 
        App.ui.hideLoader(); App.ui.toast("¡Terminado y Costeado!"); App.router.handleRoute(); 
    },
    
    // ... [Se mantienen intactas las demás funciones: eliminarPedido, guardarAbono, etc.]
    async guardarOrdenStock(datos) { 
        App.ui.showLoader("Procesando..."); const pedidoId = "PED-STOCK-" + Date.now(); const cantidadNum = parseInt(datos.cantidad) || 1; const datosPedido = { id: pedidoId, cliente_id: "STOCK_INTERNO", total: 0, anticipo: 0, notas: "Producción Interna", fecha_entrega: "", fecha_creacion: new Date().toISOString() }; const datosDetalle = { id: "PDET-" + Date.now(), pedido_id: pedidoId, producto_id: datos.producto_id, cantidad: cantidadNum, precio_unitario: 0 }; 
        let operaciones = []; let nuevosMovs = []; let recetaArray = []; const producto = App.state.productos.find(p => p.id === datos.producto_id); 
        if(producto) { for(let i=1; i<=20; i++) { const matId = producto[`mat_${i}`]; const cantTeorica = parseFloat(producto[`cant_${i}`] || 0) * cantidadNum; const uso = producto[`uso_${i}`] || 'Cuerpo'; if(matId && cantTeorica > 0) { recetaArray.push({ mat_id: matId, cant: cantTeorica, uso: uso }); const material = App.state.inventario.find(m => m.id === matId); if(material) { const nComprometido = parseFloat(material.stock_comprometido||0) + cantTeorica; operaciones.push({ action: "actualizar_fila", nombreHoja: "materiales", idFila: material.id, datosNuevos: { stock_comprometido: nComprometido } }); material.stock_comprometido = nComprometido; const mov = { id: "MOV-" + Date.now() + i, fecha: new Date().toISOString().split('T')[0], tipo_movimiento: "reserva_produccion", origen: "orden", origen_id: "PENDIENTE", ref_tipo: "material", ref_id: material.id, cantidad: cantTeorica, costo_unitario: material.costo_unitario||0, total: (cantTeorica * (material.costo_unitario||0)), notas: "Comprometido Stock Interno" }; nuevosMovs.push(mov); } } } } 
        const nuevaOrden = { id: "ORD-" + Date.now(), pedido_detalle_id: datosDetalle.id, estado: "pendiente", fecha_creacion: new Date().toISOString(), receta_personalizada: JSON.stringify(recetaArray) }; nuevosMovs.forEach(m => { m.origen_id = nuevaOrden.id; operaciones.push({ action: "guardar_fila", nombreHoja: "movimientos_inventario", datos: m }); }); operaciones.push({ action: "guardar_fila", nombreHoja: "pedidos", datos: datosPedido }, { action: "guardar_fila", nombreHoja: "pedido_detalle", datos: datosDetalle }, { action: "guardar_fila", nombreHoja: "ordenes_produccion", datos: nuevaOrden }); 
        await App.api.fetch("ejecutar_lote", { operaciones: operaciones }); App.state.pedidos.push(datosPedido); App.state.pedido_detalle.push(datosDetalle); App.state.ordenes_produccion.push(nuevaOrden); if(!App.state.movimientos_inventario) App.state.movimientos_inventario = []; App.state.movimientos_inventario.push(...nuevosMovs); App.ui.hideLoader(); App.ui.toast("Orden creada"); App.router.handleRoute(); 
    },
    async procesarCambioOrden(ordenId, datos) { if (datos.estado === 'listo') { App.views.formCerrarOrden(ordenId); } else { App.ui.showLoader("Actualizando..."); const res = await App.api.fetch("actualizar_fila", { nombreHoja: "ordenes_produccion", idFila: ordenId, datosNuevos: datos }); App.ui.hideLoader(); if (res.status === "success") { const ordenIndex = App.state.ordenes_produccion.findIndex(o => o.id === ordenId); App.state.ordenes_produccion[ordenIndex] = { ...App.state.ordenes_produccion[ordenIndex], ...datos }; App.ui.toast("Actualizado"); App.router.handleRoute(); } else { App.ui.toast("Error"); } } },
    async guardarTrabajoOrden(ordenId, data, esReparacion = false) { App.ui.showLoader("Asignando..."); const sanitizedTaskName = (data.tarea_nombre || "Trabajo").replace(/[^a-zA-Z0-9_ \-]/g, ""); const pagoObj = { id: "PAGO-" + Date.now() + "-" + sanitizedTaskName, artesano_id: data.artesano_id, orden_id: ordenId, monto_unitario: parseFloat(data.tarea_val), total: parseFloat(data.total), estado: "pendiente", fecha: new Date().toISOString() }; const res = await App.api.fetch("guardar_fila", { nombreHoja: "pago_artesanos", datos: pagoObj }); App.ui.hideLoader(); if(res.status === "success") { App.state.pago_artesanos.push(pagoObj); App.ui.toast("Asignado"); if(esReparacion) { App.router.handleRoute(); } else { App.views.modalEditarOrden(ordenId); } } else { App.ui.toast("Error"); App.router.handleRoute(); } },
    async liquidarNomina(artesanoId) { App.ui.showLoader("Liquidando..."); const pagosPendientes = App.state.pago_artesanos.filter(p => p.artesano_id === artesanoId && p.estado === 'pendiente'); let totalPagado = 0; let operaciones = []; for (let pago of pagosPendientes) { operaciones.push({ action: "actualizar_fila", nombreHoja: "pago_artesanos", idFila: pago.id, datosNuevos: { estado: 'pagado' } }); pago.estado = 'pagado'; totalPagado += parseFloat(pago.total || 0); } if (totalPagado > 0) { const artesano = App.state.artesanos.find(a => a.id === artesanoId); const gastoObj = { id: "GAS-" + Date.now(), descripcion: "Nómina - " + (artesano ? artesano.nombre : 'Artesano'), categoria: "Nómina Artesanos", monto: totalPagado, fecha: new Date().toISOString().split('T')[0] }; operaciones.push({ action: "guardar_fila", nombreHoja: "gastos", datos: gastoObj }); App.state.gastos.push(gastoObj); } await App.api.fetch("ejecutar_lote", { operaciones: operaciones }); App.ui.hideLoader(); App.ui.toast(`Liquidados $${totalPagado}`); App.router.handleRoute(); },
    async guardarAbonoCompra(datos) { App.ui.showLoader("Registrando..."); const compra = App.state.compras.find(c => c.id === datos.compra_id); if(compra) { const nuevoPagado = parseFloat(compra.monto_pagado || 0) + parseFloat(datos.monto); const proveedor = App.state.proveedores.find(p => p.id === compra.proveedor_id); const nombreProv = proveedor ? proveedor.nombre : "Proveedor"; let operaciones = []; operaciones.push({action: "actualizar_fila", nombreHoja: "compras", idFila: compra.id, datosNuevos: { monto_pagado: nuevoPagado, estado: nuevoPagado >= parseFloat(compra.total) ? 'pagado' : 'credito' }}); const nuevoGasto = { id: "GAS-" + Date.now(), categoria: "Materiales e Insumos", descripcion: `Abono Compra a ${nombreProv} (${compra.id})`, monto: parseFloat(datos.monto), fecha: new Date().toISOString().split('T')[0] }; operaciones.push({ action: "guardar_fila", nombreHoja: "gastos", datos: nuevoGasto }); const res = await App.api.fetch("ejecutar_lote", { operaciones: operaciones }); if(res.status === 'success') { compra.monto_pagado = nuevoPagado; if(nuevoPagado >= parseFloat(compra.total)) compra.estado = 'pagado'; App.state.gastos.push(nuevoGasto); App.ui.hideLoader(); App.ui.toast("Abono registrado"); App.router.handleRoute(); } else { App.ui.hideLoader(); App.ui.toast("Error"); } } },
    async guardarMultiplesGastos(datos) { App.ui.showLoader("Registrando Gastos..."); const descripciones = Array.isArray(datos.descripcion) ? datos.descripcion : [datos.descripcion]; const montos = Array.isArray(datos.monto) ? datos.monto : [datos.monto]; let operaciones = []; let nuevosGastos = []; for(let i=0; i<descripciones.length; i++) { if(!descripciones[i]) continue; const gastoObj = { id: "GAS-" + Date.now() + "-" + i, categoria: datos.categoria, descripcion: descripciones[i], monto: parseFloat(montos[i]), fecha: datos.fecha }; nuevosGastos.push(gastoObj); operaciones.push({ action: "guardar_fila", nombreHoja: "gastos", datos: gastoObj }); } await App.api.fetch("ejecutar_lote", { operaciones: operaciones }); App.state.gastos.push(...nuevosGastos); App.ui.hideLoader(); App.ui.toast("¡Gastos registrados!"); App.router.handleRoute(); },
    async guardarNuevaReparacion(datos) { App.ui.showLoader("Registrando..."); datos.id = "REP-" + Date.now(); datos.estado = "recibida"; datos.fecha_creacion = new Date().toISOString(); const res = await App.api.fetch("guardar_fila", { nombreHoja: "reparaciones", datos: datos }); App.ui.hideLoader(); if (res.status === "success") { App.state.reparaciones.push(datos); App.ui.toast("Reparación guardada"); App.router.handleRoute(); } else { App.ui.toast("Error al guardar."); } },
    async actualizarReparacion(repId, estado) { App.ui.showLoader("Actualizando..."); await App.api.fetch("actualizar_fila", { nombreHoja: "reparaciones", idFila: repId, datosNuevos: { estado: estado } }); const rep = App.state.reparaciones.find(r => r.id === repId); if(rep) rep.estado = estado; App.ui.hideLoader(); App.ui.toast("Actualizado"); App.router.handleRoute(); },
    async guardarAbono(datos) { const pedidoObj = App.state.pedidos.find(p => p.id === datos.pedido_id); if(pedidoObj) { const abonosPrevios = App.state.abonos.filter(a => a.pedido_id === pedidoObj.id).reduce((s, a) => s + parseFloat(a.monto || 0), 0); const saldoPendiente = parseFloat(pedidoObj.total) - parseFloat(pedidoObj.anticipo) - abonosPrevios; const nuevoMonto = parseFloat(datos.monto) || 0; if(nuevoMonto > saldoPendiente + 0.1) { alert("❌ Validación: El monto a abonar es superior a la deuda. ¡Revisa la cantidad!"); return; } } App.ui.showLoader("Registrando Pago..."); const nuevoAbono = { id: "ABO-" + Date.now(), pedido_id: datos.pedido_id, cliente_id: datos.cliente_id, monto: parseFloat(datos.monto) || 0, nota: datos.nota, fecha: new Date().toISOString() }; const res = await App.api.fetch("guardar_fila", { nombreHoja: "abonos_clientes", datos: nuevoAbono }); if (res.status === "success") { App.state.abonos.push(nuevoAbono); if(pedidoObj) { const abonosTotales = App.state.abonos.filter(a => a.pedido_id === pedidoObj.id).reduce((s, a) => s + parseFloat(a.monto || 0), 0); const saldoRealFinal = parseFloat(pedidoObj.total) - parseFloat(pedidoObj.anticipo) - abonosTotales; if(saldoRealFinal <= 0 && pedidoObj.estado !== 'pagado') { await App.api.fetch("actualizar_fila", { nombreHoja: "pedidos", idFila: pedidoObj.id, datosNuevos: { estado: 'pagado' } }); pedidoObj.estado = 'pagado'; } } App.ui.hideLoader(); App.ui.toast("Pago registrado exitosamente"); App.router.handleRoute(); } else { App.ui.hideLoader(); App.ui.toast("Error al guardar pago"); } },
    guardarCotizacion(datos) { datos.id = "COT-" + Date.now(); datos.fecha_creacion = new Date().toISOString(); App.state.cotizaciones.push(datos); localStorage.setItem('erp_cotizaciones', JSON.stringify(App.state.cotizaciones)); App.ui.toast("Cotización generada"); App.router.handleRoute(); App.logic.imprimirCotizacion(datos.id); },
    eliminarCotizacion(id) { if(!confirm("⚠️ ¿Eliminar cotización?")) return; App.state.cotizaciones = App.state.cotizaciones.filter(c => c.id !== id); localStorage.setItem('erp_cotizaciones', JSON.stringify(App.state.cotizaciones)); App.ui.toast("Eliminada"); App.router.handleRoute(); },
    

    verDiagnostico() {
        let html = `<table style="width:100%; font-size:0.85rem; border-collapse:collapse;"><tr style="border-bottom:1px solid #ccc; text-align:left;"><th>Tabla (Hoja)</th><th>Estado</th><th>Registros</th></tr>`;
        const tablas = [ { nombre: "materiales", state: "inventario" }, { nombre: "clientes", state: "clientes" }, { nombre: "productos", state: "productos" }, { nombre: "pedidos", state: "pedidos" }, { nombre: "pedido_detalle", state: "pedido_detalle" }, { nombre: "ordenes_produccion", state: "ordenes_produccion" }, { nombre: "artesanos", state: "artesanos" }, { nombre: "abonos_clientes", state: "abonos" }, { nombre: "gastos", state: "gastos" }, { nombre: "compras", state: "compras" }, { nombre: "proveedores", state: "proveedores" }, { nombre: "reparaciones", state: "reparaciones" }, { nombre: "tarifas_artesano", state: "tarifas_artesano" }, { nombre: "pago_artesanos", state: "pago_artesanos" }, { nombre: "movimientos_inventario", state: "movimientos_inventario" } ];
        tablas.forEach(t => { const arr = App.state[t.state]; const count = arr ? arr.length : 0; const status = arr ? "✅ OK" : "❌ Error"; html += `<tr style="border-bottom:1px dashed #eee;"><td style="padding:5px 0;">${t.nombre}</td><td>${status}</td><td>${count}</td></tr>`; });
        html += `</table><button class="btn btn-primary" style="width:100%; margin-top:15px;" onclick="App.ui.closeSheet()">Cerrar</button>`; App.ui.openSheet("Diagnóstico de Base de Datos", html);
    },
    renderGraficasFinanzas(filtro) {
        const cont = document.getElementById('finanzas-contenedor'); if(!cont) return; const hoy = new Date(); let mesActual = hoy.getMonth(); let anioActual = hoy.getFullYear(); let mesPasado = mesActual - 1; let anioPasado = anioActual; if(mesPasado < 0) { mesPasado = 11; anioPasado--; } let triActual = Math.floor(mesActual / 3);
        const filtrarFecha = (str) => { if(filtro === 'todo') return true; if(!str) return false; const f = new Date(str); if(filtro === 'mes_actual') return f.getMonth() === mesActual && f.getFullYear() === anioActual; if(filtro === 'mes_pasado') return f.getMonth() === mesPasado && f.getFullYear() === anioPasado; if(filtro === 'trimestre_actual') return Math.floor(f.getMonth() / 3) === triActual && f.getFullYear() === anioActual; if(filtro === 'anio_actual') return f.getFullYear() === anioActual; return true; };
        const pedFiltrados = App.state.pedidos.filter(p => filtrarFecha(p.fecha_creacion)); const aboFiltrados = App.state.abonos.filter(a => filtrarFecha(a.fecha)); const gasFiltrados = App.state.gastos.filter(g => filtrarFecha(g.fecha)); const repFiltradas = App.state.reparaciones.filter(r => filtrarFecha(r.fecha_creacion));

        let xCobrarGlobal = 0;
        App.state.pedidos.forEach(p => { const abonos = App.state.abonos.filter(a => a.pedido_id === p.id).reduce((s,a) => s + parseFloat(a.monto||0), 0); const saldo = parseFloat(p.total||0) - parseFloat(p.anticipo||0) - abonos; if(saldo > 0) xCobrarGlobal += saldo; });
        App.state.reparaciones.forEach(r => { const saldo = parseFloat(r.precio||0) - parseFloat(r.anticipo||0); if(saldo > 0) xCobrarGlobal += saldo; });

        let xPagarGlobal = 0;
        App.state.pago_artesanos.forEach(pa => { if(pa.estado === 'pendiente') xPagarGlobal += parseFloat(pa.total || 0); });
        App.state.compras.forEach(c => { const deuda = parseFloat(c.total || 0) - parseFloat(c.monto_pagado || c.total); if(deuda > 0) xPagarGlobal += deuda; });

        const tVentasPed = pedFiltrados.reduce((acc, p) => acc + (parseFloat(p.total) || 0), 0); const tVentasRep = repFiltradas.reduce((acc, r) => acc + (parseFloat(r.precio) || 0), 0); const tVentas = tVentasPed + tVentasRep;
        const tAnticiposPed = pedFiltrados.reduce((acc, p) => acc + (parseFloat(p.anticipo) || 0), 0); const tAnticiposRep = repFiltradas.reduce((acc, r) => acc + (parseFloat(r.anticipo) || 0), 0); const tAbonos = aboFiltrados.reduce((acc, a) => acc + (parseFloat(a.monto) || 0), 0); const ingReales = tAnticiposPed + tAnticiposRep + tAbonos; 
        const tGastos = gasFiltrados.reduce((acc, g) => acc + (parseFloat(g.monto) || 0), 0); const fNeto = ingReales - tGastos; const labels = { todo: "Todo el historial", mes_actual: "Este Mes", mes_pasado: "Mes Pasado", trimestre_actual: "Este Trimestre", anio_actual: "Este Año" };
        
        let expPorCat = {}; 
        gasFiltrados.forEach(g => { 
            let cat = (g.categoria || 'otro'); 
            if (cat.toLowerCase() === 'materiales') { const desc = (g.descripcion || '').toLowerCase(); if (desc.includes('reventa') || desc.includes('hamaca')) cat = 'Hamacas (Reventa)'; else cat = 'Materiales e Insumos'; }
            else if (cat.toLowerCase() === 'nomina') cat = 'Nómina Artesanos'; else if (cat.toLowerCase() === 'servicios') cat = 'Servicios y Otros';
            expPorCat[cat] = (expPorCat[cat] || 0) + parseFloat(g.monto||0); 
        });
        
        let ventasPorCat = { 'Hamacas': 0, 'Sillas': 0, 'Cojines': 0, 'Accesorios': 0, 'Reparaciones': 0, 'Otros': 0 };
        pedFiltrados.forEach(p => { const det = App.state.pedido_detalle.find(d => d.pedido_id === p.id); const prod = det ? App.state.productos.find(x => x.id === det.producto_id) : null; const n = prod ? prod.nombre.toLowerCase() : ''; const t = parseFloat(p.total||0); if(n.includes('silla')) ventasPorCat['Sillas'] += t; else if(n.includes('cojin') || n.includes('cojín')) ventasPorCat['Cojines'] += t; else if(n.includes('accesorio') || n.includes('soga') || n.includes('brazo') || n.includes('argolla') || n.includes('hilo')) ventasPorCat['Accesorios'] += t; else if(n.includes('hamaca') || n.includes('tejido')) ventasPorCat['Hamacas'] += t; else ventasPorCat['Hamacas'] += t; });
        repFiltradas.forEach(r => { ventasPorCat['Reparaciones'] += parseFloat(r.precio||0); });
        Object.keys(ventasPorCat).forEach(k => { if(ventasPorCat[k] === 0) delete ventasPorCat[k]; });

        const coloresVentas = ['#4C51BF', '#ED8936', '#38B2AC', '#E53E3E', '#ECC94B', '#A0AEC0']; 
        const coloresGastos = ['#E53E3E', '#D69E2E', '#3182CE', '#805AD5', '#38A169', '#718096']; 

        let html = `<p style="color:var(--text-muted); font-size:0.85rem; margin-top:-10px; margin-bottom:15px;">Mostrando: <strong>${labels[filtro]}</strong></p><div class="grid-2"><div class="card stat-card" style="background:#EBF8FF; cursor:pointer;" onclick="App.views.detalleFinanzas('ventas', '${filtro}')"><div class="label">Ventas Totales</div><div class="value" style="color:#3182CE; font-size:1.2rem;">$${tVentas.toFixed(2)}</div></div><div class="card stat-card" style="background:#C6F6D5; cursor:pointer;" onclick="App.views.detalleFinanzas('ingresos', '${filtro}')"><div class="label">Ingresos Reales</div><div class="value" style="color:#38A169; font-size:1.2rem;">$${ingReales.toFixed(2)}</div></div><div class="card stat-card" style="background:#FEFCBF; cursor:pointer;" onclick="App.views.detalleFinanzas('por_cobrar', '${filtro}')"><div class="label">Por Cobrar (Global)</div><div class="value" style="color:#D69E2E; font-size:1.2rem;">$${xCobrarGlobal.toFixed(2)}</div></div><div class="card stat-card" style="background:#FFF5F5; cursor:pointer;" onclick="App.views.detalleFinanzas('por_pagar', '${filtro}')"><div class="label">Por Pagar (Global)</div><div class="value" style="color:#E53E3E; font-size:1.2rem;">$${xPagarGlobal.toFixed(2)}</div></div><div class="card stat-card" style="background:#EDF2F7; cursor:pointer; grid-column: span 2;" onclick="App.views.detalleFinanzas('gastos', '${filtro}')"><div class="label">Gastos Operativos</div><div class="value" style="color:#4A5568; font-size:1.2rem;">$${tGastos.toFixed(2)}</div></div></div><div class="card stat-card" style="margin-top:10px; border:2px solid ${fNeto >= 0 ? 'var(--success)' : 'var(--danger)'}; margin-bottom:15px;"><div class="label">Flujo Neto Efectivo (Caja Fuerte)</div><div class="value" style="color:${fNeto >= 0 ? 'var(--success)' : 'var(--danger)'};">$${fNeto.toFixed(2)}</div></div><div style="background:white; border:1px solid #e2e8f0; border-radius:8px; padding:15px;"><canvas id="graficaFinanzas"></canvas></div>`;
        html += `<div style="display:flex; flex-direction:column; gap:15px; margin-top:15px;"><div style="background:white; border:1px solid #e2e8f0; border-radius:8px; padding:15px; display:flex; flex-direction:column; align-items:center;"><h4 style="text-align:center; margin-bottom:15px; color:var(--text-muted); font-size:0.9rem;">De dónde ingresa 📈</h4><div style="position:relative; width:100%; max-width:280px; aspect-ratio:1;"><canvas id="graficaVentasCanvas"></canvas></div></div><div style="background:white; border:1px solid #e2e8f0; border-radius:8px; padding:15px; display:flex; flex-direction:column; align-items:center;"><h4 style="text-align:center; margin-bottom:15px; color:var(--text-muted); font-size:0.9rem;">En qué se gasta 📉</h4><div style="position:relative; width:100%; max-width:280px; aspect-ratio:1;"><canvas id="graficaGastosCanvas"></canvas></div></div></div><button class="btn btn-secondary" style="width:100%; margin-top:15px; border-color:#38A169; color:#38A169; font-weight:bold; background:transparent;" onclick="window.exportarAExcel(App.state.gastos, 'Gastos_${labels[filtro]}')">📥 Exportar Gastos a Excel</button>`;
        cont.innerHTML = html;
        
        setTimeout(() => { 
            if(window.Chart) { 
                const ctx1 = document.getElementById('graficaFinanzas');
                if(ctx1) { if(window.graficaActual) window.graficaActual.destroy(); window.graficaActual = new Chart(ctx1, { type: 'bar', data: { labels: ['Ingresos Real', 'Gastos'], datasets: [{ label: 'Monto ($)', data: [ingReales, tGastos], backgroundColor: ['#38A169', '#E53E3E'], borderRadius: 4 }] }, options: { responsive: true, plugins: { legend: { display: false } } } }); } 
                const ctxV = document.getElementById('graficaVentasCanvas');
                if(ctxV) { if(window.graficaVentasD) window.graficaVentasD.destroy(); window.graficaVentasD = new Chart(ctxV, { type: 'doughnut', data: { labels: Object.keys(ventasPorCat).map(k=>k.toUpperCase()), datasets: [{ data: Object.values(ventasPorCat), backgroundColor: coloresVentas }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels:{font:{size:11}, padding: 15} } } } }); }
                const ctxG = document.getElementById('graficaGastosCanvas');
                if(ctxG) { if(window.graficaGastosD) window.graficaGastosD.destroy(); window.graficaGastosD = new Chart(ctxG, { type: 'doughnut', data: { labels: Object.keys(expPorCat).map(k=>k.toUpperCase()), datasets: [{ data: Object.values(expPorCat), backgroundColor: coloresGastos }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels:{font:{size:11}, padding: 15} } } } }); }
            } 
        }, 300);
    },
    imprimirNota(pedidoId) { 
        const p = App.state.pedidos.find(x => x.id === pedidoId); const c = App.state.clientes.find(cli => cli.id === p.cliente_id); const detalle = App.state.pedido_detalle.find(d => d.pedido_id === p.id); const producto = detalle ? App.state.productos.find(prod => prod.id === detalle.producto_id) : null; const abonosDelPedido = App.state.abonos.filter(a => a.pedido_id === p.id); const totalAbonado = abonosDelPedido.reduce((s, a) => s + parseFloat(a.monto||0), 0); const saldoReal = parseFloat(p.total) - parseFloat(p.anticipo) - totalAbonado; const ventana = window.open('', '_blank'); 
        let htmlNota = `<html><head><title>Nota de Remisión</title><style>body{font-family:sans-serif;background:#f9f9f9;padding:20px;color:#333;}.ticket{background:white;max-width:380px;margin:0 auto;padding:25px;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.05);}.header{text-align:center;border-bottom:2px dashed #cbd5e0;padding-bottom:15px;margin-bottom:15px;position:relative;}.header img.qr{position:absolute; right:0; top:0; width:65px; height:65px; border-radius:4px;}.header img.logo{max-height:80px;margin:0 auto 10px auto;display:block;}.header h1{margin:0;color:#2d3748;font-size:24px;text-transform:uppercase;}.header p.subtitle{margin:4px 0; color:#4a5568; font-size:14px;}.header div.phone{color:#718096;font-size:14px;margin-top:8px;font-weight:bold; letter-spacing: 0.5px; background: #f7fafc; display: inline-block; padding: 4px 12px; border-radius: 12px;}.info-p{margin:4px 0;font-size:14px;}table{width:100%;border-collapse:collapse;margin-top:15px;margin-bottom:15px;}th{border-bottom:1px solid #e2e8f0;padding:8px 0;text-align:left;font-size:13px;color:#718096;}td{padding:8px 0;font-size:14px;color:#2d3748;}.totales{border-top:2px solid #cbd5e0;padding-top:15px;}.totales-row{display:flex;justify-content:space-between;margin-bottom:5px;font-size:14px;}.saldo-final{display:flex;justify-content:space-between;margin-top:10px;font-size:18px;font-weight:bold;color:#2d3748;background:${saldoReal<=0?'#f0fff4':'#fff5f5'};padding:10px;border-radius:6px;}.footer{text-align:center;margin-top:30px;font-size:12px;color:#a0aec0;}.social{margin-top:10px;font-weight:bold;color:#4A5568;font-size:13px;}@media print{body{background:white;padding:0;}.ticket{box-shadow:none;border:none;max-width:100%;}}</style></head><body><div class="ticket"><div class="header"><img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://www.facebook.com/descansomaya.mx" onerror="this.style.display='none'"><img class="logo" src="${App.state.config.logoUrl}" onerror="this.style.display='none'"><h1>${App.state.config.empresa}</h1><p class="subtitle">Hamacas y Accesorios Artesanales</p><div class="phone">Tel: 999 144 2773</div></div><div style="margin-bottom:20px;"><p class="info-p"><strong>Folio:</strong> ${p.id.replace('PED-','')}</p><p class="info-p"><strong>Fecha:</strong> ${new Date(p.fecha_creacion).toLocaleDateString()}</p><p class="info-p"><strong>Cliente:</strong> ${c?c.nombre:'Mostrador'}</p></div><table><tr><th>Cant</th><th>Desc</th><th style="text-align:right;">Importe</th></tr><tr><td>${detalle?detalle.cantidad:1}</td><td><strong>${producto?producto.nombre:'Artículo'}</strong>${producto ? `<br><small style="color:#4A5568;">Clasificación: ${producto.clasificacion || 'N/A'}<br>Tamaño: ${producto.tamano || 'N/A'} | Color: ${producto.color || 'N/A'}</small>` : ''}<br><small style="color:#718096;font-size:11px;">${p.notas||''}</small></td><td style="text-align:right;">$${p.total}</td></tr></table><div class="totales"><div class="totales-row"><span>Subtotal:</span> <span>$${p.total}</span></div><div class="totales-row"><span>Anticipo:</span> <span style="color:#e53e3e;">-$${p.anticipo}</span></div>${totalAbonado>0?`<div class="totales-row"><span>Abonos:</span> <span style="color:#e53e3e;">-$${totalAbonado}</span></div>`:''}<div class="saldo-final"><span>SALDO:</span><span>$${saldoReal>0?saldoReal:0}</span></div></div><div class="footer"><p style="font-size:14px;font-weight:bold;color:#E53E3E;">¡Gracias por comprar lo hecho con amor! ❤️</p><p class="social">👉 Escanea el QR para visitar nuestro Facebook<br>${App.state.config.redesSociales}</p><p style="margin-top:15px;">Conserva tu recibo para aclaraciones</p></div></div><script>setTimeout(()=>{window.print();},500);<\/script></body></html>`; 
        ventana.document.write(htmlNota); ventana.document.close(); 
    },
    imprimirCotizacion(cotId) { const c = App.state.cotizaciones.find(x => x.id === cotId); const ventana = window.open('', '_blank'); let htmlNota = `<html><head><title>Cotización</title><style>body{font-family:sans-serif;background:#f9f9f9;padding:20px;color:#333;}.ticket{background:white;max-width:380px;margin:0 auto;padding:25px;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.05);}.header{text-align:center;border-bottom:2px dashed #cbd5e0;padding-bottom:15px;margin-bottom:15px;position:relative;}.header img.logo{max-height:80px;margin:0 auto 10px auto;display:block;}.header h1{margin:0;color:#2d3748;font-size:24px;text-transform:uppercase;}.header p.subtitle{margin:4px 0; color:#4a5568; font-size:14px;}.header div.phone{color:#718096;font-size:14px;margin-top:8px;font-weight:bold; letter-spacing: 0.5px; background: #f7fafc; display: inline-block; padding: 4px 12px; border-radius: 12px;}.info-p{margin:4px 0;font-size:14px;}table{width:100%;border-collapse:collapse;margin-top:15px;margin-bottom:15px;}th{border-bottom:1px solid #e2e8f0;padding:8px 0;text-align:left;font-size:13px;color:#718096;}td{padding:8px 0;font-size:14px;color:#2d3748;}.totales{border-top:2px solid #cbd5e0;padding-top:15px;}.saldo-final{display:flex;justify-content:space-between;margin-top:10px;font-size:18px;font-weight:bold;color:#4C51BF;background:#EEF2FF;padding:10px;border-radius:6px;}.footer{text-align:center;margin-top:30px;font-size:12px;color:#a0aec0;}.social{margin-top:10px;font-weight:bold;color:#4A5568;font-size:13px;}@media print{body{background:white;padding:0;}.ticket{box-shadow:none;border:none;max-width:100%;}}</style></head><body><div class="ticket"><div class="header"><img class="logo" src="${App.state.config.logoUrl}" onerror="this.style.display='none'"><h1>${App.state.config.empresa}</h1><p class="subtitle">Hamacas y Accesorios Artesanales</p><div class="phone">Tel: 999 144 2773</div><h2 style="color:#4C51BF;font-size:18px;margin-top:15px;">COTIZACIÓN</h2></div><div style="margin-bottom:20px;"><p class="info-p"><strong>Folio:</strong> ${c.id.replace('COT-','')}</p><p class="info-p"><strong>Fecha:</strong> ${new Date(c.fecha_creacion).toLocaleDateString()}</p><p class="info-p"><strong>Cliente:</strong> ${c.cliente_nombre}</p></div><table><tr><th>Cant</th><th>Desc</th><th style="text-align:right;">Importe</th></tr><tr><td>1</td><td>${c.descripcion}</td><td style="text-align:right;">$${c.total}</td></tr></table><div class="totales"><div class="saldo-final"><span>TOTAL COTIZADO:</span><span>$${c.total}</span></div></div><div class="footer"><p>Vigencia de cotización: 15 días.</p><p class="social">👉 Síguenos en nuestras redes sociales:<br>${App.state.config.redesSociales}</p></div></div><script>setTimeout(()=>{window.print();},500);<\/script></body></html>`; ventana.document.write(htmlNota); ventana.document.close(); },
    enviarWhatsApp(pedidoId, tipoMensaje) { const p = App.state.pedidos.find(x => x.id === pedidoId); const c = App.state.clientes.find(cli => cli.id === p.cliente_id); const detalle = App.state.pedido_detalle.find(d => d.pedido_id === p.id); const producto = detalle ? App.state.productos.find(prod => prod.id === detalle.producto_id) : null; const abonos = App.state.abonos.filter(a => a.pedido_id === p.id).reduce((s, a) => s + parseFloat(a.monto||0), 0); const saldoReal = parseFloat(p.total) - parseFloat(p.anticipo) - abonos; if(!c || !c.telefono) return alert("El cliente no tiene teléfono guardado"); let texto = ""; if(tipoMensaje === 'cobro') { texto = `Hola *${c.nombre}* 👋,\nTe saludamos de *${App.state.config.empresa}*.\n\nTe recordamos amablemente que tienes un saldo pendiente de *$${saldoReal > 0 ? saldoReal : 0}* por tu pedido de (${producto ? producto.nombre : 'Hamaca'}).\n\nQuedamos a tu disposición para cualquier duda. ¡Gracias por tu preferencia!`; } else if(tipoMensaje === 'listo') { texto = `¡Hola *${c.nombre}*! 🎉\nTe avisamos de *${App.state.config.empresa}* que tu pedido de (${producto ? producto.nombre : 'Hamaca'}) *¡ya está listo para entregarse!*\n\nTu saldo a liquidar es de: *$${saldoReal > 0 ? saldoReal : 0}*.\n\nPor favor confírmanos a qué hora pasarás por ella. ¡Te esperamos!`; } else { texto = `Hola *${c.nombre}* 👋,\nSomos de *${App.state.config.empresa}*.\n\nDetalle de tu pedido:\n📦 *Producto:* ${producto ? producto.nombre : 'Hamaca'}\n💰 *Total:* $${p.total}\n✅ *Abonado:* $${parseFloat(p.anticipo) + abonos}\n⚠️ *Saldo Pendiente:* $${saldoReal > 0 ? saldoReal : 0}\n\n👉 Síguenos: ${App.state.config.redesSociales}\n¡Gracias!`; } let tel = String(c.telefono).replace(/\D/g,''); if(tel.length === 10) tel = '52' + tel; App.ui.closeSheet(); window.location.href = `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`; },
    imprimirTicketProduccion(ordenId) {
        const orden = App.state.ordenes_produccion.find(o => o.id === ordenId); const detalle = App.state.pedido_detalle.find(d => d.id === orden.pedido_detalle_id) || App.state.pedido_detalle.find(d => d.pedido_id === orden.pedido_detalle_id) || {}; const pedido = App.state.pedidos.find(p => p.id === detalle.pedido_id) || {}; const producto = detalle.producto_id ? App.state.productos.find(p => p.id === detalle.producto_id) : null; let recetaHTML = ''; let recetaGuardada = null; try { if(orden.receta_personalizada) recetaGuardada = JSON.parse(orden.receta_personalizada); } catch(e){}
        if (recetaGuardada && recetaGuardada.length > 0) { recetaGuardada.forEach(item => { const material = App.state.inventario.find(m => m.id === item.mat_id); if (material) { recetaHTML += `<tr><td style="border-bottom:1px solid #e2e8f0; padding:8px;">${item.cant} <small style="color:#718096">${material.unidad}</small></td><td style="border-bottom:1px solid #e2e8f0; padding:8px; font-weight:bold; color:#2d3748;">${material.nombre}</td><td style="border-bottom:1px solid #e2e8f0; padding:8px; font-weight:bold; color:#4C51BF;">${(item.uso || 'Cuerpo').toUpperCase()}</td></tr>`; } }); } else if (producto) { let counter = 1; while(producto[`mat_${counter}`]) { const matId = producto[`mat_${counter}`]; const cant = parseFloat(producto[`cant_${counter}`]) * parseInt(detalle.cantidad||1); const uso = producto[`uso_${counter}`] || 'Cuerpo'; const material = App.state.inventario.find(m => m.id === matId); if (material) { recetaHTML += `<tr><td style="border-bottom:1px solid #e2e8f0; padding:8px;">${cant} <small style="color:#718096">${material.unidad}</small></td><td style="border-bottom:1px solid #e2e8f0; padding:8px; font-weight:bold; color:#2d3748;">${material.nombre}</td><td style="border-bottom:1px solid #e2e8f0; padding:8px; font-weight:bold; color:#4C51BF;">${uso.toUpperCase()}</td></tr>`; } counter++; } }
        if(recetaHTML === '') recetaHTML = '<tr><td colspan="3" style="padding:10px; text-align:center;">Verificar insumos con el encargado</td></tr>';
        const ventana = window.open('', '_blank'); let htmlNota = `<html><head><title>Orden de Trabajo</title><style>body{font-family:sans-serif;background:#fff;padding:20px;color:#333;}.ticket{max-width:400px;margin:0 auto;padding:20px;border:2px dashed #cbd5e0;border-radius:8px;}.header{text-align:center;border-bottom:2px dashed #cbd5e0;padding-bottom:10px;margin-bottom:15px;position:relative;}.header img.qr{position:absolute; right:0; top:0; width:65px; height:65px; border-radius:4px;}.header h1{margin:0;font-size:22px;color:#2d3748;}.header p.subtitle{margin:4px 0; color:#4a5568; font-size:14px;}.header div.phone{color:#718096;font-size:14px;margin-top:8px;font-weight:bold; letter-spacing: 0.5px; background: #f7fafc; display: inline-block; padding: 4px 12px; border-radius: 12px;}.info{margin-bottom:15px;font-size:14px;}table{width:100%;border-collapse:collapse;margin-top:10px;}th{background:#f7fafc;padding:8px;text-align:left;font-size:13px;border-bottom:2px solid #cbd5e0;}</style></head><body><div class="ticket"><div class="header"><img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${ordenId}" onerror="this.style.display='none'"><h1>ORDEN DE TRABAJO</h1><p class="subtitle">Folio Producción: <strong style="font-size:16px;">${ordenId.replace('ORD-','')}</strong></p><div class="phone">Tel: 999 144 2773</div></div><div class="info"><p><strong>Fecha Entrega Esperada:</strong> <span style="color:#E53E3E; font-weight:bold;">${pedido.fecha_entrega || 'Sin fecha (Lo antes posible)'}</span></p><p><strong>Producto a fabricar:</strong> ${producto ? producto.nombre : 'Artículo especial'}</p><p><strong>Tamaño:</strong> ${producto ? producto.tamano : '-'} | <strong>Color:</strong> ${producto ? producto.color : '-'}</p><p style="background:#FFFBEB; padding:10px; border-left:4px solid #D69E2E; margin-top:10px;"><strong>Notas del Cliente:</strong> ${pedido.notas || 'Ninguna'}</p></div><h3 style="font-size:16px; margin-bottom:5px; margin-top:20px; color:#4a5568;">Insumos / Receta a Utilizar</h3><table><tr><th>Cant</th><th>Material</th><th>Uso en Hamaca</th></tr>${recetaHTML}</table><div style="margin-top:30px; padding-top:15px; border-top:1px dashed #cbd5e0; text-align:center;"><p style="font-size:12px; color:#718096;">Documento de uso interno exclusivo de taller</p><p style="font-size:14px; font-weight:bold; color:#2d3748;">${App.state.config.empresa}</p></div></div><script>setTimeout(()=>{window.print();},500);<\/script></body></html>`;
        ventana.document.write(htmlNota); ventana.document.close();
    },
    imprimirTicketReparacion(repId) {
        const r = App.state.reparaciones.find(x => x.id === repId);
        const c = App.state.clientes.find(cli => cli.id === r.cliente_id);
        const saldoReal = parseFloat(r.precio||0) - parseFloat(r.anticipo||0);
        const ventana = window.open('', '_blank');
        let htmlNota = `<html><head><title>Recepción de Reparación</title><style>body{font-family:sans-serif;background:#f9f9f9;padding:20px;color:#333;}.ticket{background:white;max-width:380px;margin:0 auto;padding:25px;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.05);}.header{text-align:center;border-bottom:2px dashed #cbd5e0;padding-bottom:15px;margin-bottom:15px;position:relative;}.header img.logo{max-height:80px;margin:0 auto 10px auto;display:block;}.header h1{margin:0;color:#2d3748;font-size:24px;text-transform:uppercase;}.header p.subtitle{margin:4px 0; color:#4a5568; font-size:14px;}.info-p{margin:4px 0;font-size:14px;}table{width:100%;border-collapse:collapse;margin-top:15px;margin-bottom:15px;}th{border-bottom:1px solid #e2e8f0;padding:8px 0;text-align:left;font-size:13px;color:#718096;}td{padding:8px 0;font-size:14px;color:#2d3748;}.totales{border-top:2px solid #cbd5e0;padding-top:15px;}.totales-row{display:flex;justify-content:space-between;margin-bottom:5px;font-size:14px;}.saldo-final{display:flex;justify-content:space-between;margin-top:10px;font-size:18px;font-weight:bold;color:#D69E2E;background:#FFFBEB;padding:10px;border-radius:6px;}.footer{text-align:center;margin-top:30px;font-size:12px;color:#a0aec0;}@media print{body{background:white;padding:0;}.ticket{box-shadow:none;border:none;max-width:100%;}}</style></head><body><div class="ticket"><div class="header"><img class="logo" src="${App.state.config.logoUrl}" onerror="this.style.display='none'"><h1>${App.state.config.empresa}</h1><p class="subtitle">Recepción de Reparación</p></div><div style="margin-bottom:20px;"><p class="info-p"><strong>Folio:</strong> ${r.id.replace('REP-','')}</p><p class="info-p"><strong>Fecha:</strong> ${new Date(r.fecha_creacion).toLocaleDateString()}</p><p class="info-p"><strong>Cliente:</strong> ${c?App.ui.escapeHTML(c.nombre):'Cliente'}</p></div><div style="background:#f7fafc; padding:10px; border-radius:6px; margin-bottom:15px; border:1px solid #e2e8f0;"><p style="margin:0; font-size:14px; color:#4a5568;"><strong>Problema a reparar:</strong><br>${App.ui.escapeHTML(r.descripcion)}</p></div><div class="totales"><div class="totales-row"><span>Costo Estimado:</span> <span>$${r.precio}</span></div><div class="totales-row"><span>Anticipo Dejado:</span> <span style="color:#e53e3e;">-$${r.anticipo}</span></div><div class="saldo-final"><span>SALDO PENDIENTE:</span><span>$${saldoReal>0?saldoReal:0}</span></div></div><div class="footer"><p>Guarde este comprobante para recoger su artículo.</p><p style="margin-top:10px;font-weight:bold;color:#4A5568;">${App.state.config.redesSociales}</p></div></div><script>setTimeout(()=>{window.print();},500);<\/script></body></html>`;
        ventana.document.write(htmlNota); ventana.document.close();
    },
   ejecutarBusquedaGlobal(query) {
        const cont = document.getElementById('resultados-busqueda-global');
        if(!cont) return;
        if(!query || query.length < 2) { cont.innerHTML = 'Escribe al menos 2 letras para empezar a buscar...'; return; }
        
        const q = String(query).toLowerCase();
        let resultados = [];
        
        // 1. Buscar en Clientes
        (App.state.clientes || []).forEach(c => {
            const nombre = String(c.nombre || '').toLowerCase();
            const telefono = String(c.telefono || '').toLowerCase();
            if(nombre.includes(q) || telefono.includes(q)) {
                resultados.push(`<div style="padding:12px; border-bottom:1px solid #edf2f7; cursor:pointer; display: flex; align-items: center; gap: 10px;" onclick="App.ui.closeSheet(); App.router.navigate('clientes'); setTimeout(()=>App.views.modalEstadoCuenta('${c.id}'), 500);"><span style="font-size: 1.5rem;">👤</span> <div><strong style="color:var(--text-main);">${App.ui.escapeHTML(c.nombre)}</strong><br><small style="color:var(--text-muted);">Cliente (Ver estado de cuenta)</small></div></div>`);
            }
        });
        
        // 2. Buscar en Pedidos
        (App.state.pedidos || []).forEach(p => {
            const idPed = String(p.id || '').toLowerCase();
            const notas = String(p.notas || '').toLowerCase();
            if(idPed.includes(q) || notas.includes(q)) {
                resultados.push(`<div style="padding:12px; border-bottom:1px solid #edf2f7; cursor:pointer; display: flex; align-items: center; gap: 10px;" onclick="App.ui.closeSheet(); App.router.navigate('pedidos');"><span style="font-size: 1.5rem;">📦</span> <div><strong style="color:var(--primary);">${p.id}</strong><br><small style="color:var(--text-muted);">Pedido en estado: ${p.estado}</small></div></div>`);
            }
        });
        
        // 3. Buscar en Productos
        (App.state.productos || []).forEach(p => {
            const nombreProd = String(p.nombre || '').toLowerCase();
            if(nombreProd.includes(q)) {
                resultados.push(`<div style="padding:12px; border-bottom:1px solid #edf2f7; cursor:pointer; display: flex; align-items: center; gap: 10px;" onclick="App.ui.closeSheet(); App.router.navigate('productos');"><span style="font-size: 1.5rem;">🧶</span> <div><strong style="color:var(--success);">${App.ui.escapeHTML(p.nombre)}</strong><br><small style="color:var(--text-muted);">Producto del catálogo</small></div></div>`);
            }
        });

        // 4. Buscar en Artesanos (NUEVO)
        (App.state.artesanos || []).forEach(a => {
            const nombreArt = String(a.nombre || '').toLowerCase();
            const telArt = String(a.telefono || '').toLowerCase();
            if(nombreArt.includes(q) || telArt.includes(q)) {
                resultados.push(`<div style="padding:12px; border-bottom:1px solid #edf2f7; cursor:pointer; display: flex; align-items: center; gap: 10px;" onclick="App.ui.closeSheet(); App.router.navigate('artesanos');"><span style="font-size: 1.5rem;">🧑‍🎨</span> <div><strong style="color:#D69E2E;">${App.ui.escapeHTML(a.nombre)}</strong><br><small style="color:var(--text-muted);">Artesano</small></div></div>`);
            }
        });

        // 5. Buscar en Proveedores (NUEVO)
        (App.state.proveedores || []).forEach(prv => {
            const nombreProv = String(prv.nombre || '').toLowerCase();
            const telProv = String(prv.telefono || '').toLowerCase();
            if(nombreProv.includes(q) || telProv.includes(q)) {
                resultados.push(`<div style="padding:12px; border-bottom:1px solid #edf2f7; cursor:pointer; display: flex; align-items: center; gap: 10px;" onclick="App.ui.closeSheet(); App.router.navigate('proveedores');"><span style="font-size: 1.5rem;">🚚</span> <div><strong style="color:#805AD5;">${App.ui.escapeHTML(prv.nombre)}</strong><br><small style="color:var(--text-muted);">Proveedor</small></div></div>`);
            }
        });
        
        if(resultados.length === 0) {
            cont.innerHTML = '<p style="color:var(--danger); margin-top:20px;">No se encontró nada con esa búsqueda 😔</p>';
        } else {
            cont.innerHTML = resultados.join('');
        }
    }
};
