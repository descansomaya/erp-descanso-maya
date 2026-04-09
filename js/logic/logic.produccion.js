// ==========================================
// LÓGICA: TALLER, PRODUCCIÓN Y REPARACIONES
// ==========================================

Object.assign(App.logic, {
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
        let costoRealMateriales = 0; let desgloseMateriales = { Cuerpo: 0, Brazos: 0, Adicional: 0 }; let nuevaRecetaReal = [];

        for(let i=1; i<=20; i++) { 
            const matId = datosFormulario[`mat_${i}_id`]; const consumoTeorico = parseFloat(datosFormulario[`mat_${i}_teorico`]); const consumoReal = parseFloat(datosFormulario[`mat_${i}_real`]); const usoMat = datosFormulario[`mat_${i}_uso`] || 'Cuerpo';
            if(matId && !isNaN(consumoTeorico) && !isNaN(consumoReal)) { 
                const material = App.state.inventario.find(m => m.id === matId); 
                if(material) { 
                    const diferencia = consumoReal - consumoTeorico; 
                    const nComprometido = Math.max(0, parseFloat(material.stock_comprometido||0) - consumoTeorico);
                    const nReal = parseFloat(material.stock_real||0) - consumoReal;
                    
                    operaciones.push({ action: "actualizar_fila", nombreHoja: "materiales", idFila: material.id, datosNuevos: { stock_comprometido: nComprometido, stock_real: nReal } }); 
                    material.stock_comprometido = nComprometido; material.stock_real = nReal; 
                    
                    const mov = { id: "MOV-" + Date.now() + i, fecha: new Date().toISOString().split('T')[0], tipo_movimiento: "salida_produccion", origen: "orden", origen_id: ordenId, ref_tipo: "material", ref_id: material.id, cantidad: -consumoReal, costo_unitario: material.costo_unitario||0, total: (-consumoReal * (material.costo_unitario||0)), notas: `Consumo real en taller` }; 
                    nuevosMovs.push(mov); operaciones.push({ action: "guardar_fila", nombreHoja: "movimientos_inventario", datos: mov }); 
                    
                    const costoFila = consumoReal * (parseFloat(material.costo_unitario) || 0);
                    costoRealMateriales += costoFila;
                    if(desgloseMateriales[usoMat] !== undefined) desgloseMateriales[usoMat] += costoFila; else desgloseMateriales['Adicional'] += costoFila;
                    nuevaRecetaReal.push({ mat_id: matId, cant: consumoReal, cant_teorica: consumoTeorico, uso: usoMat, costo_unitario: material.costo_unitario });
                } 
            } 
        } 

        const pagos = App.state.pago_artesanos.filter(p => p.orden_id === ordenId);
        const costoManoObra = pagos.reduce((sum, p) => sum + parseFloat(p.total||0), 0);
        const totalVenta = pedidoMaster && pedidoMaster.cliente_id !== "STOCK_INTERNO" ? parseFloat(pedidoMaster.total || 0) : 0;
        const utilidadReal = totalVenta - costoRealMateriales - costoManoObra;
        const costosFinales = { materiales: costoRealMateriales, desglose_materiales: desgloseMateriales, mano_obra: costoManoObra, utilidad: utilidadReal, precio_venta: totalVenta };

        operaciones.push({ action: "actualizar_fila", nombreHoja: "ordenes_produccion", idFila: ordenId, datosNuevos: { estado: 'listo', receta_personalizada: JSON.stringify(nuevaRecetaReal), costos_finales: JSON.stringify(costosFinales) } }); 
        orden.estado = 'listo'; orden.receta_personalizada = JSON.stringify(nuevaRecetaReal); orden.costos_finales = JSON.stringify(costosFinales);

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
        if(pedidoMaster && pedidoMaster.cliente_id !== "STOCK_INTERNO" && pedidoMaster.estado !== 'pagado') { operaciones.push({ action: "actualizar_fila", nombreHoja: "pedidos", idFila: pedidoMaster.id, datosNuevos: { estado: 'listo para entregar' } }); pedidoMaster.estado = 'listo para entregar'; }
        
        await App.api.fetch("ejecutar_lote", { operaciones: operaciones }); 
        if(!App.state.movimientos_inventario) App.state.movimientos_inventario = []; App.state.movimientos_inventario.push(...nuevosMovs); 
        App.ui.hideLoader(); App.ui.toast("¡Terminado y Costeado!"); App.router.handleRoute(); 
    },
    async procesarCambioOrden(ordenId, datos) { if (datos.estado === 'listo') { App.views.formCerrarOrden(ordenId); } else { App.ui.showLoader("Actualizando..."); const res = await App.api.fetch("actualizar_fila", { nombreHoja: "ordenes_produccion", idFila: ordenId, datosNuevos: datos }); App.ui.hideLoader(); if (res.status === "success") { const ordenIndex = App.state.ordenes_produccion.findIndex(o => o.id === ordenId); App.state.ordenes_produccion[ordenIndex] = { ...App.state.ordenes_produccion[ordenIndex], ...datos }; App.ui.toast("Actualizado"); App.router.handleRoute(); } else { App.ui.toast("Error"); } } },
    async guardarOrdenStock(datos) { 
        App.ui.showLoader("Procesando..."); const pedidoId = "PED-STOCK-" + Date.now(); const cantidadNum = parseInt(datos.cantidad) || 1; const datosPedido = { id: pedidoId, cliente_id: "STOCK_INTERNO", total: 0, anticipo: 0, notas: "Producción Interna", fecha_entrega: "", fecha_creacion: new Date().toISOString() }; const datosDetalle = { id: "PDET-" + Date.now(), pedido_id: pedidoId, producto_id: datos.producto_id, cantidad: cantidadNum, precio_unitario: 0 }; 
        let operaciones = []; let nuevosMovs = []; let recetaArray = []; const producto = App.state.productos.find(p => p.id === datos.producto_id); 
        if(producto) { for(let i=1; i<=20; i++) { const matId = producto[`mat_${i}`]; const cantTeorica = parseFloat(producto[`cant_${i}`] || 0) * cantidadNum; const uso = producto[`uso_${i}`] || 'Cuerpo'; if(matId && cantTeorica > 0) { recetaArray.push({ mat_id: matId, cant: cantTeorica, uso: uso }); const material = App.state.inventario.find(m => m.id === matId); if(material) { const nComprometido = parseFloat(material.stock_comprometido||0) + cantTeorica; operaciones.push({ action: "actualizar_fila", nombreHoja: "materiales", idFila: material.id, datosNuevos: { stock_comprometido: nComprometido } }); material.stock_comprometido = nComprometido; const mov = { id: "MOV-" + Date.now() + i, fecha: new Date().toISOString().split('T')[0], tipo_movimiento: "reserva_produccion", origen: "orden", origen_id: "PENDIENTE", ref_tipo: "material", ref_id: material.id, cantidad: cantTeorica, costo_unitario: material.costo_unitario||0, total: (cantTeorica * (material.costo_unitario||0)), notas: "Comprometido Stock Interno" }; nuevosMovs.push(mov); } } } } 
        const nuevaOrden = { id: "ORD-" + Date.now(), pedido_detalle_id: datosDetalle.id, estado: "pendiente", fecha_creacion: new Date().toISOString(), receta_personalizada: JSON.stringify(recetaArray) }; nuevosMovs.forEach(m => { m.origen_id = nuevaOrden.id; operaciones.push({ action: "guardar_fila", nombreHoja: "movimientos_inventario", datos: m }); }); operaciones.push({ action: "guardar_fila", nombreHoja: "pedidos", datos: datosPedido }, { action: "guardar_fila", nombreHoja: "pedido_detalle", datos: datosDetalle }, { action: "guardar_fila", nombreHoja: "ordenes_produccion", datos: nuevaOrden }); 
        await App.api.fetch("ejecutar_lote", { operaciones: operaciones }); App.state.pedidos.push(datosPedido); App.state.pedido_detalle.push(datosDetalle); App.state.ordenes_produccion.push(nuevaOrden); if(!App.state.movimientos_inventario) App.state.movimientos_inventario = []; App.state.movimientos_inventario.push(...nuevosMovs); App.ui.hideLoader(); App.ui.toast("Orden creada"); App.router.handleRoute(); 
    },
    async guardarTrabajoOrden(ordenId, data, esReparacion = false) { App.ui.showLoader("Asignando..."); const sanitizedTaskName = (data.tarea_nombre || "Trabajo").replace(/[^a-zA-Z0-9_ \-]/g, ""); const pagoObj = { id: "PAGO-" + Date.now() + "-" + sanitizedTaskName, artesano_id: data.artesano_id, orden_id: ordenId, monto_unitario: parseFloat(data.tarea_val), total: parseFloat(data.total), estado: "pendiente", fecha: new Date().toISOString() }; const res = await App.api.fetch("guardar_fila", { nombreHoja: "pago_artesanos", datos: pagoObj }); App.ui.hideLoader(); if(res.status === "success") { App.state.pago_artesanos.push(pagoObj); App.ui.toast("Asignado"); if(esReparacion) { App.router.handleRoute(); } else { App.views.modalEditarOrden(ordenId); } } else { App.ui.toast("Error"); App.router.handleRoute(); } },
    async liquidarNomina(artesanoId) { App.ui.showLoader("Liquidando..."); const pagosPendientes = App.state.pago_artesanos.filter(p => p.artesano_id === artesanoId && p.estado === 'pendiente'); let totalPagado = 0; let operaciones = []; for (let pago of pagosPendientes) { operaciones.push({ action: "actualizar_fila", nombreHoja: "pago_artesanos", idFila: pago.id, datosNuevos: { estado: 'pagado' } }); pago.estado = 'pagado'; totalPagado += parseFloat(pago.total || 0); } if (totalPagado > 0) { const artesano = App.state.artesanos.find(a => a.id === artesanoId); const gastoObj = { id: "GAS-" + Date.now(), descripcion: "Nómina - " + (artesano ? artesano.nombre : 'Artesano'), categoria: "Nómina Artesanos", monto: totalPagado, fecha: new Date().toISOString().split('T')[0] }; operaciones.push({ action: "guardar_fila", nombreHoja: "gastos", datos: gastoObj }); App.state.gastos.push(gastoObj); } await App.api.fetch("ejecutar_lote", { operaciones: operaciones }); App.ui.hideLoader(); App.ui.toast(`Liquidados $${totalPagado}`); App.router.handleRoute(); },
    async guardarNuevaReparacion(datos) { App.ui.showLoader("Registrando..."); datos.id = "REP-" + Date.now(); datos.estado = "recibida"; datos.fecha_creacion = new Date().toISOString(); const res = await App.api.fetch("guardar_fila", { nombreHoja: "reparaciones", datos: datos }); App.ui.hideLoader(); if (res.status === "success") { App.state.reparaciones.push(datos); App.ui.toast("Reparación guardada"); App.router.handleRoute(); } else { App.ui.toast("Error al guardar."); } },
    async actualizarReparacion(repId, estado) { App.ui.showLoader("Actualizando..."); await App.api.fetch("actualizar_fila", { nombreHoja: "reparaciones", idFila: repId, datosNuevos: { estado: estado } }); const rep = App.state.reparaciones.find(r => r.id === repId); if(rep) rep.estado = estado; App.ui.hideLoader(); App.ui.toast("Actualizado"); App.router.handleRoute(); },
    async eliminarReparacion(id) {
        if(!confirm("⚠️ ¿Eliminar reparación? Se eliminarán tareas y pagos de artesanos.")) return;
        App.ui.showLoader("Eliminando..."); let operaciones = [{ action: "eliminar_fila", nombreHoja: "reparaciones", idFila: id }]; const pagos = App.state.pago_artesanos.filter(p => p.orden_id === id); pagos.forEach(p => operaciones.push({ action: "eliminar_fila", nombreHoja: "pago_artesanos", idFila: p.id })); const res = await App.api.fetch("ejecutar_lote", { operaciones: operaciones }); App.ui.hideLoader(); if(res.status === "success") { App.state.reparaciones = App.state.reparaciones.filter(r => r.id !== id); App.state.pago_artesanos = App.state.pago_artesanos.filter(p => p.orden_id !== id); App.ui.toast("Reparación eliminada"); App.router.handleRoute(); } else { App.ui.toast("Error al eliminar"); }
    },
    imprimirTicketProduccion(ordenId) {
        const orden = App.state.ordenes_produccion.find(o => o.id === ordenId); const detalle = App.state.pedido_detalle.find(d => d.id === orden.pedido_detalle_id) || App.state.pedido_detalle.find(d => d.pedido_id === orden.pedido_detalle_id) || {}; const pedido = App.state.pedidos.find(p => p.id === detalle.pedido_id) || {}; const producto = detalle.producto_id ? App.state.productos.find(p => p.id === detalle.producto_id) : null; let recetaHTML = ''; let recetaGuardada = null; try { if(orden.receta_personalizada) recetaGuardada = JSON.parse(orden.receta_personalizada); } catch(e){}
        if (recetaGuardada && recetaGuardada.length > 0) { recetaGuardada.forEach(item => { const material = App.state.inventario.find(m => m.id === item.mat_id); if (material) { recetaHTML += `<tr><td style="border-bottom:1px solid #e2e8f0; padding:8px;">${item.cant} <small style="color:#718096">${material.unidad}</small></td><td style="border-bottom:1px solid #e2e8f0; padding:8px; font-weight:bold; color:#2d3748;">${material.nombre}</td><td style="border-bottom:1px solid #e2e8f0; padding:8px; font-weight:bold; color:#4C51BF;">${(item.uso || 'Cuerpo').toUpperCase()}</td></tr>`; } }); } else if (producto) { let counter = 1; while(producto[`mat_${counter}`]) { const matId = producto[`mat_${counter}`]; const cant = parseFloat(producto[`cant_${counter}`]) * parseInt(detalle.cantidad||1); const uso = producto[`uso_${counter}`] || 'Cuerpo'; const material = App.state.inventario.find(m => m.id === matId); if (material) { recetaHTML += `<tr><td style="border-bottom:1px solid #e2e8f0; padding:8px;">${cant} <small style="color:#718096">${material.unidad}</small></td><td style="border-bottom:1px solid #e2e8f0; padding:8px; font-weight:bold; color:#2d3748;">${material.nombre}</td><td style="border-bottom:1px solid #e2e8f0; padding:8px; font-weight:bold; color:#4C51BF;">${uso.toUpperCase()}</td></tr>`; } counter++; } }
        if(recetaHTML === '') recetaHTML = '<tr><td colspan="3" style="padding:10px; text-align:center;">Verificar insumos con el encargado</td></tr>';
        const ventana = window.open('', '_blank'); let htmlNota = `<html><head><title>Orden de Trabajo</title><style>body{font-family:sans-serif;background:#fff;padding:20px;color:#333;}.ticket{max-width:400px;margin:0 auto;padding:20px;border:2px dashed #cbd5e0;border-radius:8px;}.header{text-align:center;border-bottom:2px dashed #cbd5e0;padding-bottom:10px;margin-bottom:15px;position:relative;}.header img.qr{position:absolute; right:0; top:0; width:65px; height:65px; border-radius:4px;}.header h1{margin:0;font-size:22px;color:#2d3748;}.header p.subtitle{margin:4px 0; color:#4a5568; font-size:14px;}.header div.phone{color:#718096;font-size:14px;margin-top:8px;font-weight:bold; letter-spacing: 0.5px; background: #f7fafc; display: inline-block; padding: 4px 12px; border-radius: 12px;}.info{margin-bottom:15px;font-size:14px;}table{width:100%;border-collapse:collapse;margin-top:10px;}th{background:#f7fafc;padding:8px;text-align:left;font-size:13px;border-bottom:2px solid #cbd5e0;}</style></head><body><div class="ticket"><div class="header"><img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${ordenId}" onerror="this.style.display='none'"><h1>ORDEN DE TRABAJO</h1><p class="subtitle">Folio Producción: <strong style="font-size:16px;">${ordenId.replace('ORD-','')}</strong></p><div class="phone">Tel: 999 144 2773</div></div><div class="info"><p><strong>Fecha Entrega Esperada:</strong> <span style="color:#E53E3E; font-weight:bold;">${pedido.fecha_entrega || 'Sin fecha (Lo antes posible)'}</span></p><p><strong>Producto a fabricar:</strong> ${producto ? producto.nombre : 'Artículo especial'}</p><p><strong>Tamaño:</strong> ${producto ? producto.tamano : '-'} | <strong>Color:</strong> ${producto ? producto.color : '-'}</p><p style="background:#FFFBEB; padding:10px; border-left:4px solid #D69E2E; margin-top:10px;"><strong>Notas del Cliente:</strong> ${pedido.notas || 'Ninguna'}</p></div><h3 style="font-size:16px; margin-bottom:5px; margin-top:20px; color:#4a5568;">Insumos / Receta a Utilizar</h3><table><tr><th>Cant</th><th>Material</th><th>Uso en Hamaca</th></tr>${recetaHTML}</table><div style="margin-top:30px; padding-top:15px; border-top:1px dashed #cbd5e0; text-align:center;"><p style="font-size:12px; color:#718096;">Documento de uso interno exclusivo de taller</p><p style="font-size:14px; font-weight:bold; color:#2d3748;">${App.state.config.empresa}</p></div></div><script>setTimeout(()=>{window.print();},500);<\/script></body></html>`;
        ventana.document.write(htmlNota); ventana.document.close();
    },
    imprimirTicketReparacion(repId) {
        const r = App.state.reparaciones.find(x => x.id === repId); const c = App.state.clientes.find(cli => cli.id === r.cliente_id); const saldoReal = parseFloat(r.precio||0) - parseFloat(r.anticipo||0); const ventana = window.open('', '_blank');
        let htmlNota = `<html><head><title>Recepción de Reparación</title><style>body{font-family:sans-serif;background:#f9f9f9;padding:20px;color:#333;}.ticket{background:white;max-width:380px;margin:0 auto;padding:25px;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.05);}.header{text-align:center;border-bottom:2px dashed #cbd5e0;padding-bottom:15px;margin-bottom:15px;position:relative;}.header img.logo{max-height:80px;margin:0 auto 10px auto;display:block;}.header h1{margin:0;color:#2d3748;font-size:24px;text-transform:uppercase;}.header p.subtitle{margin:4px 0; color:#4a5568; font-size:14px;}.info-p{margin:4px 0;font-size:14px;}table{width:100%;border-collapse:collapse;margin-top:15px;margin-bottom:15px;}th{border-bottom:1px solid #e2e8f0;padding:8px 0;text-align:left;font-size:13px;color:#718096;}td{padding:8px 0;font-size:14px;color:#2d3748;}.totales{border-top:2px solid #cbd5e0;padding-top:15px;}.totales-row{display:flex;justify-content:space-between;margin-bottom:5px;font-size:14px;}.saldo-final{display:flex;justify-content:space-between;margin-top:10px;font-size:18px;font-weight:bold;color:#D69E2E;background:#FFFBEB;padding:10px;border-radius:6px;}.footer{text-align:center;margin-top:30px;font-size:12px;color:#a0aec0;}@media print{body{background:white;padding:0;}.ticket{box-shadow:none;border:none;max-width:100%;}}</style></head><body><div class="ticket"><div class="header"><img class="logo" src="${App.state.config.logoUrl}" onerror="this.style.display='none'"><h1>${App.state.config.empresa}</h1><p class="subtitle">Recepción de Reparación</p></div><div style="margin-bottom:20px;"><p class="info-p"><strong>Folio:</strong> ${r.id.replace('REP-','')}</p><p class="info-p"><strong>Fecha:</strong> ${new Date(r.fecha_creacion).toLocaleDateString()}</p><p class="info-p"><strong>Cliente:</strong> ${c?App.ui.escapeHTML(c.nombre):'Cliente'}</p></div><div style="background:#f7fafc; padding:10px; border-radius:6px; margin-bottom:15px; border:1px solid #e2e8f0;"><p style="margin:0; font-size:14px; color:#4a5568;"><strong>Problema a reparar:</strong><br>${App.ui.escapeHTML(r.descripcion)}</p></div><div class="totales"><div class="totales-row"><span>Costo Estimado:</span> <span>$${r.precio}</span></div><div class="totales-row"><span>Anticipo Dejado:</span> <span style="color:#e53e3e;">-$${r.anticipo}</span></div><div class="saldo-final"><span>SALDO PENDIENTE:</span><span>$${saldoReal>0?saldoReal:0}</span></div></div><div class="footer"><p>Guarde este comprobante para recoger su artículo.</p><p style="margin-top:10px;font-weight:bold;color:#4A5568;">${App.state.config.redesSociales}</p></div></div><script>setTimeout(()=>{window.print();},500);<\/script></body></html>`;
        ventana.document.write(htmlNota); ventana.document.close();
    }
});
