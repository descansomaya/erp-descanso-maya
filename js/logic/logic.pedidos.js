// ==========================================
// LÓGICA: PEDIDOS, COBROS Y VENTAS (V62 - AUTOMATIZADO)
// ==========================================

Object.assign(App.logic, {
    async guardarNuevoPedido(datosFormulario) { 
        App.ui.showLoader("Procesando pedido..."); const pedidoId = "PED-" + Date.now(); const totalNum = parseFloat(datosFormulario.total) || 0; const anticipoNum = parseFloat(datosFormulario.anticipo) || 0; const cantidadNum = parseInt(datosFormulario.cantidad) || 1; const fechaC = datosFormulario.fecha_creacion ? datosFormulario.fecha_creacion + "T12:00:00.000Z" : new Date().toISOString(); const producto = App.state.productos.find(p => p.id === datosFormulario.producto_id); const esReventa = producto && producto.categoria === 'reventa'; 
        // 🤖 AUTOMATIZACIÓN: Si pagó el 100% de anticipo de una reventa, se va a pagado directo.
        let estadoCalculado = esReventa ? "listo para entregar" : "nuevo";
        if(esReventa && anticipoNum >= totalNum) estadoCalculado = "pagado";
        
        const datosPedido = { id: pedidoId, cliente_id: datosFormulario.cliente_id, estado: estadoCalculado, total: totalNum, anticipo: anticipoNum, notas: datosFormulario.notas, fecha_entrega: datosFormulario.fecha_entrega, fecha_creacion: fechaC }; const datosDetalle = { id: "PDET-" + Date.now(), pedido_id: pedidoId, producto_id: datosFormulario.producto_id, cantidad: cantidadNum, precio_unitario: totalNum / cantidadNum }; let operaciones = [ { action: "guardar_fila", nombreHoja: "pedidos", datos: datosPedido }, { action: "guardar_fila", nombreHoja: "pedido_detalle", datos: datosDetalle } ]; let nuevosMovs = [];
        if (esReventa) { 
            for(let i=1; i<=20; i++) { 
                const matId = producto[`mat_${i}`]; const cantTeorica = parseFloat(producto[`cant_${i}`] || 0) * cantidadNum; 
                if(matId && cantTeorica > 0) { 
                    const material = App.state.inventario.find(m => m.id === matId); 
                    if(material) { 
                        const nReservado = parseFloat(material.stock_reservado||0) + cantTeorica; 
                        operaciones.push({ action: "actualizar_fila", nombreHoja: "materiales", idFila: material.id, datosNuevos: { stock_reservado: nReservado } }); 
                        material.stock_reservado = nReservado; 
                        const mov = { id: "MOV-" + Date.now() + i, fecha: new Date().toISOString().split('T')[0], tipo_movimiento: "reserva_venta", origen: "pedido", origen_id: pedidoId, ref_tipo: "material", ref_id: material.id, cantidad: cantTeorica, costo_unitario: material.costo_unitario||0, total: (cantTeorica * (material.costo_unitario||0)), notas: `Apartado por venta` }; nuevosMovs.push(mov); operaciones.push({ action: "guardar_fila", nombreHoja: "movimientos_inventario", datos: mov }); 
                    } 
                } 
            } 
        }
        const resPedido = await App.api.fetch("ejecutar_lote", { operaciones: operaciones }); if (resPedido.status === "success") { App.state.pedidos.push(datosPedido); App.state.pedido_detalle.push(datosDetalle); if(nuevosMovs.length > 0) { if(!App.state.movimientos_inventario) App.state.movimientos_inventario = []; App.state.movimientos_inventario.push(...nuevosMovs); } App.ui.hideLoader(); App.ui.toast(esReventa ? "Pedido guardado y stock apartado" : "Guardado (Sin mandar a taller)"); App.router.handleRoute(); App.logic.revisarAlertasStock(); } else { App.ui.hideLoader(); App.ui.toast("Error"); } 
    },
    async eliminarPedido(id) { 
        if(!confirm("⚠️ ¿Eliminar pedido por completo?\n\nLos insumos volverán a estar libres en el inventario.")) return; 
        App.ui.showLoader("Procesando eliminación..."); const pedido = App.state.pedidos.find(p => p.id === id); const detalle = App.state.pedido_detalle.find(d => d.pedido_id === id); const orden = App.state.ordenes_produccion.find(o => detalle && o.pedido_detalle_id === detalle.id); const producto = detalle ? App.state.productos.find(p => p.id === detalle.producto_id) : null; let operaciones = []; let nuevosMovs = [];
        if(orden && orden.estado !== 'listo' && orden.receta_personalizada) { try { JSON.parse(orden.receta_personalizada).forEach(item => { let mat = App.state.inventario.find(m => m.id === item.mat_id); if(mat && parseFloat(item.cant) > 0) { let nComp = Math.max(0, parseFloat(mat.stock_comprometido||0) - parseFloat(item.cant)); operaciones.push({action: "actualizar_fila", nombreHoja: "materiales", idFila: mat.id, datosNuevos: {stock_comprometido: nComp}}); mat.stock_comprometido = nComp; } }); } catch(e){} } else if (producto && producto.categoria === 'reventa' && pedido.estado !== 'listo para entregar' && pedido.estado !== 'pagado') { for(let i=1; i<=20; i++) { const matId = producto[`mat_${i}`]; const cantTeorica = parseFloat(producto[`cant_${i}`] || 0) * (parseInt(detalle.cantidad)||1); if(matId && cantTeorica > 0) { let mat = App.state.inventario.find(m => m.id === matId); if(mat) { let nRes = Math.max(0, parseFloat(mat.stock_reservado||0) - cantTeorica); operaciones.push({action: "actualizar_fila", nombreHoja: "materiales", idFila: mat.id, datosNuevos: {stock_reservado: nRes}}); mat.stock_reservado = nRes; } } } } else if (pedido.estado === 'listo para entregar' || pedido.estado === 'pagado') { if(producto && producto.categoria === 'reventa') { for(let i=1; i<=20; i++) { const matId = producto[`mat_${i}`]; const cantTeorica = parseFloat(producto[`cant_${i}`] || 0) * (parseInt(detalle.cantidad)||1); if(matId && cantTeorica > 0) { let mat = App.state.inventario.find(m => m.id === matId); if(mat) { let nReal = parseFloat(mat.stock_real||0) + cantTeorica; operaciones.push({action: "actualizar_fila", nombreHoja: "materiales", idFila: mat.id, datosNuevos: {stock_real: nReal}}); mat.stock_real = nReal; } } } } }
        operaciones.push({ action: "eliminar_fila", nombreHoja: "pedidos", idFila: id }); if(detalle) operaciones.push({ action: "eliminar_fila", nombreHoja: "pedido_detalle", idFila: detalle.id }); if(orden) { operaciones.push({ action: "eliminar_fila", nombreHoja: "ordenes_produccion", idFila: orden.id }); App.state.pago_artesanos.filter(p => p.orden_id === orden.id).forEach(pago => operaciones.push({ action: "eliminar_fila", nombreHoja: "pago_artesanos", idFila: pago.id })); } App.state.abonos.filter(a => a.pedido_id === id).forEach(ab => operaciones.push({ action: "eliminar_fila", nombreHoja: "abonos_clientes", idFila: ab.id }));
        await App.api.fetch("ejecutar_lote", { operaciones: operaciones }); App.state.pedidos = App.state.pedidos.filter(p => p.id !== id); if(detalle) App.state.pedido_detalle = App.state.pedido_detalle.filter(d => d.id !== detalle.id); if(orden) { App.state.ordenes_produccion = App.state.ordenes_produccion.filter(o => o.id !== orden.id); App.state.pago_artesanos = App.state.pago_artesanos.filter(p => p.orden_id !== orden.id); } App.state.abonos = App.state.abonos.filter(a => a.pedido_id !== id); App.ui.hideLoader(); App.ui.toast("Pedido eliminado"); App.router.handleRoute(); 
    },
    async entregarDeBodega(pedidoId) {
        const pedido = App.state.pedidos.find(p => p.id === pedidoId); const detalle = App.state.pedido_detalle.find(d => d.pedido_id === pedidoId); const producto = App.state.productos.find(p => p.id === detalle.producto_id); if(!confirm(`¿Marcar ${producto.nombre} como entregada y sacarla físicamente de la bodega?`)) return;
        let operaciones = []; let nuevosMovs = []; let cantPedida = parseInt(detalle.cantidad) || 1;
        for(let i=1; i<=20; i++) { const matId = producto[`mat_${i}`]; const cantTeorica = parseFloat(producto[`cant_${i}`] || 0) * cantPedida; if(matId && cantTeorica > 0) { const material = App.state.inventario.find(m => m.id === matId); if(material) { const nReservado = Math.max(0, parseFloat(material.stock_reservado||0) - cantTeorica); const nReal = parseFloat(material.stock_real||0) - cantTeorica; operaciones.push({ action: "actualizar_fila", nombreHoja: "materiales", idFila: material.id, datosNuevos: { stock_reservado: nReservado, stock_real: nReal } }); material.stock_reservado = nReservado; material.stock_real = nReal; const mov = { id: "MOV-" + Date.now() + i, fecha: new Date().toISOString().split('T')[0], tipo_movimiento: "salida_venta", origen: "pedido", origen_id: pedidoId, ref_tipo: "material", ref_id: material.id, cantidad: -cantTeorica, costo_unitario: material.costo_unitario||0, total: (-cantTeorica * (material.costo_unitario||0)), notas: `Entrega física al cliente` }; nuevosMovs.push(mov); operaciones.push({ action: "guardar_fila", nombreHoja: "movimientos_inventario", datos: mov }); } } }
        operaciones.push({ action: "actualizar_fila", nombreHoja: "pedidos", idFila: pedidoId, datosNuevos: { estado: 'listo para entregar' } }); App.ui.showLoader("Entregando..."); await App.api.fetch("ejecutar_lote", { operaciones: operaciones }); pedido.estado = 'listo para entregar'; if(!App.state.movimientos_inventario) App.state.movimientos_inventario = []; App.state.movimientos_inventario.push(...nuevosMovs); App.ui.hideLoader(); App.ui.toast("Descontado de bodega"); App.router.handleRoute(); App.logic.revisarAlertasStock();
    },

    // 🤖 AUTOMATIZACIÓN: Cobranza Universal y Auto-Cierre
    async guardarAbono(datos) { 
        const esReparacion = datos.pedido_id.startsWith('REP-');
        const nuevoMonto = parseFloat(datos.monto) || 0; 
        if(nuevoMonto <= 0) { alert("❌ El abono debe ser mayor a $0."); return; }

        let operaciones = [];
        let saldoRealFinal = 0;

        if(!esReparacion) {
            const pedidoObj = App.state.pedidos.find(p => p.id === datos.pedido_id);
            if(!pedidoObj) return;
            const abonosPrevios = App.state.abonos.filter(a => a.pedido_id === pedidoObj.id).reduce((s, a) => s + parseFloat(a.monto || 0), 0); 
            const saldoPendiente = parseFloat(pedidoObj.total) - parseFloat(pedidoObj.anticipo) - abonosPrevios; 
            if(nuevoMonto > saldoPendiente + 0.05) { alert(`❌ No puedes abonar más del saldo pendiente ($${saldoPendiente.toFixed(2)}).`); return; }
            
            saldoRealFinal = saldoPendiente - nuevoMonto;
            if(saldoRealFinal <= 0.05 && pedidoObj.estado !== 'pagado') { 
                operaciones.push({ action: "actualizar_fila", nombreHoja: "pedidos", idFila: pedidoObj.id, datosNuevos: { estado: 'pagado' } }); 
                pedidoObj.estado = 'pagado'; 
            } 
        } else {
            const repObj = App.state.reparaciones.find(r => r.id === datos.pedido_id);
            if(!repObj) return;
            const saldoPendiente = parseFloat(repObj.precio) - parseFloat(repObj.anticipo);
            if(nuevoMonto > saldoPendiente + 0.05) { alert(`❌ No puedes abonar más del saldo pendiente ($${saldoPendiente.toFixed(2)}).`); return; }
            
            saldoRealFinal = saldoPendiente - nuevoMonto;
            const nAnticipo = parseFloat(repObj.anticipo) + nuevoMonto;
            
            let datosUpd = { anticipo: nAnticipo };
            if(saldoRealFinal <= 0.05 && repObj.estado === 'entregada') datosUpd.estado = 'entregada'; // Se mantiene, solo es pago
            
            operaciones.push({ action: "actualizar_fila", nombreHoja: "reparaciones", idFila: repObj.id, datosNuevos: datosUpd });
            repObj.anticipo = nAnticipo;
        }
        
        App.ui.showLoader("Registrando Pago..."); 
        const nuevoAbono = { id: "ABO-" + Date.now(), pedido_id: datos.pedido_id, cliente_id: datos.cliente_id, monto: nuevoMonto, nota: datos.nota || 'Abono en caja', metodo_pago: datos.metodo_pago || 'Efectivo', fecha: new Date().toISOString() }; 
        operaciones.push({ action: "guardar_fila", nombreHoja: "abonos_clientes", datos: nuevoAbono });

        const res = await App.api.fetch("ejecutar_lote", { operaciones: operaciones }); 
        if (res.status === "success") { 
            App.state.abonos.push(nuevoAbono); 
            App.ui.hideLoader(); 
            App.ui.toast(saldoRealFinal <= 0.05 ? "✅ Deuda Liquidada" : "Pago registrado"); 
            App.router.handleRoute(); 
        } else { App.ui.hideLoader(); App.ui.toast("Error al guardar el pago"); }
    },

    guardarCotizacion(datos) { datos.id = "COT-" + Date.now(); datos.fecha_creacion = new Date().toISOString(); App.state.cotizaciones.push(datos); localStorage.setItem('erp_cotizaciones', JSON.stringify(App.state.cotizaciones)); App.ui.toast("Cotización generada"); App.router.handleRoute(); App.logic.imprimirCotizacion(datos.id); },
    eliminarCotizacion(id) { if(!confirm("⚠️ ¿Eliminar cotización?")) return; App.state.cotizaciones = App.state.cotizaciones.filter(c => c.id !== id); localStorage.setItem('erp_cotizaciones', JSON.stringify(App.state.cotizaciones)); App.ui.toast("Eliminada"); App.router.handleRoute(); },
    imprimirNota(pedidoId) { /* Sin cambios, mantenlo igual */ },
    imprimirCotizacion(cotId) { /* Sin cambios, mantenlo igual */ },
    enviarWhatsApp(pedidoId, tipoMensaje) { /* Sin cambios, mantenlo igual */ }
});
