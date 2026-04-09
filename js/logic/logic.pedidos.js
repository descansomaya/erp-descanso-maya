// ==========================================
// LÓGICA: PEDIDOS, COBROS Y VENTAS
// ==========================================

Object.assign(App.logic, {
    async guardarNuevoPedido(datosFormulario) { 
        App.ui.showLoader("Procesando pedido..."); const pedidoId = "PED-" + Date.now(); const totalNum = parseFloat(datosFormulario.total) || 0; const anticipoNum = parseFloat(datosFormulario.anticipo) || 0; const cantidadNum = parseInt(datosFormulario.cantidad) || 1; const fechaC = datosFormulario.fecha_creacion ? datosFormulario.fecha_creacion + "T12:00:00.000Z" : new Date().toISOString(); const producto = App.state.productos.find(p => p.id === datosFormulario.producto_id); const esReventa = producto && producto.categoria === 'reventa'; const datosPedido = { id: pedidoId, cliente_id: datosFormulario.cliente_id, estado: esReventa ? "listo para entregar" : "nuevo", total: totalNum, anticipo: anticipoNum, notas: datosFormulario.notas, fecha_entrega: datosFormulario.fecha_entrega, fecha_creacion: fechaC }; const datosDetalle = { id: "PDET-" + Date.now(), pedido_id: pedidoId, producto_id: datosFormulario.producto_id, cantidad: cantidadNum, precio_unitario: totalNum / cantidadNum }; let operaciones = [ { action: "guardar_fila", nombreHoja: "pedidos", datos: datosPedido }, { action: "guardar_fila", nombreHoja: "pedido_detalle", datos: datosDetalle } ]; let nuevosMovs = [];
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
        const resPedido = await App.api.fetch("ejecutar_lote", { operaciones: operaciones }); if (resPedido.status === "success") { App.state.pedidos.push(datosPedido); App.state.pedido_detalle.push(datosDetalle); if(nuevosMovs.length > 0) { if(!App.state.movimientos_inventario) App.state.movimientos_inventario = []; App.state.movimientos_inventario.push(...nuevosMovs); } App.ui.hideLoader(); App.ui.toast(esReventa ? "Pedido guardado y stock apartado" : "Guardado (Sin mandar a taller)"); App.router.handleRoute(); } else { App.ui.hideLoader(); App.ui.toast("Error"); } 
    },
    async eliminarPedido(id) { 
        if(!confirm("⚠️ ¿Eliminar pedido por completo?\n\nLos insumos volverán a estar libres en el inventario.")) return; 
        App.ui.showLoader("Procesando eliminación..."); const pedido = App.state.pedidos.find(p => p.id === id); const detalle = App.state.pedido_detalle.find(d => d.pedido_id === id); const orden = App.state.ordenes_produccion.find(o => detalle && o.pedido_detalle_id === detalle.id); const producto = detalle ? App.state.productos.find(p => p.id === detalle.producto_id) : null;
        let operaciones = []; let nuevosMovs = [];

        if(orden && orden.estado !== 'listo' && orden.receta_personalizada) {
            try { JSON.parse(orden.receta_personalizada).forEach(item => {
                let mat = App.state.inventario.find(m => m.id === item.mat_id);
                if(mat && parseFloat(item.cant) > 0) {
                    let nComp = Math.max(0, parseFloat(mat.stock_comprometido||0) - parseFloat(item.cant));
                    operaciones.push({action: "actualizar_fila", nombreHoja: "materiales", idFila: mat.id, datosNuevos: {stock_comprometido: nComp}}); mat.stock_comprometido = nComp;
                }
            }); } catch(e){}
        } else if (producto && producto.categoria === 'reventa' && pedido.estado !== 'listo para entregar' && pedido.estado !== 'pagado') {
            for(let i=1; i<=20; i++) {
                const matId = producto[`mat_${i}`]; const cantTeorica = parseFloat(producto[`cant_${i}`] || 0) * (parseInt(detalle.cantidad)||1);
                if(matId && cantTeorica > 0) { let mat = App.state.inventario.find(m => m.id === matId); if(mat) { let nRes = Math.max(0, parseFloat(mat.stock_reservado||0) - cantTeorica); operaciones.push({action: "actualizar_fila", nombreHoja: "materiales", idFila: mat.id, datosNuevos: {stock_reservado: nRes}}); mat.stock_reservado = nRes; } }
            }
        } else if (pedido.estado === 'listo para entregar' || pedido.estado === 'pagado') {
            if(producto && producto.categoria === 'reventa') {
                for(let i=1; i<=20; i++) {
                    const matId = producto[`mat_${i}`]; const cantTeorica = parseFloat(producto[`cant_${i}`] || 0) * (parseInt(detalle.cantidad)||1);
                    if(matId && cantTeorica > 0) { let mat = App.state.inventario.find(m => m.id === matId); if(mat) { let nReal = parseFloat(mat.stock_real||0) + cantTeorica; operaciones.push({action: "actualizar_fila", nombreHoja: "materiales", idFila: mat.id, datosNuevos: {stock_real: nReal}}); mat.stock_real = nReal; } }
                }
            }
        }
        operaciones.push({ action: "eliminar_fila", nombreHoja: "pedidos", idFila: id }); if(detalle) operaciones.push({ action: "eliminar_fila", nombreHoja: "pedido_detalle", idFila: detalle.id }); if(orden) { operaciones.push({ action: "eliminar_fila", nombreHoja: "ordenes_produccion", idFila: orden.id }); App.state.pago_artesanos.filter(p => p.orden_id === orden.id).forEach(pago => operaciones.push({ action: "eliminar_fila", nombreHoja: "pago_artesanos", idFila: pago.id })); } App.state.abonos.filter(a => a.pedido_id === id).forEach(ab => operaciones.push({ action: "eliminar_fila", nombreHoja: "abonos_clientes", idFila: ab.id }));
        await App.api.fetch("ejecutar_lote", { operaciones: operaciones }); App.state.pedidos = App.state.pedidos.filter(p => p.id !== id); if(detalle) App.state.pedido_detalle = App.state.pedido_detalle.filter(d => d.id !== detalle.id); if(orden) { App.state.ordenes_produccion = App.state.ordenes_produccion.filter(o => o.id !== orden.id); App.state.pago_artesanos = App.state.pago_artesanos.filter(p => p.orden_id !== orden.id); } App.state.abonos = App.state.abonos.filter(a => a.pedido_id !== id); App.ui.hideLoader(); App.ui.toast("Pedido eliminado"); App.router.handleRoute(); 
    },
    async entregarDeBodega(pedidoId) {
        const pedido = App.state.pedidos.find(p => p.id === pedidoId); const detalle = App.state.pedido_detalle.find(d => d.pedido_id === pedidoId); const producto = App.state.productos.find(p => p.id === detalle.producto_id); if(!confirm(`¿Marcar ${producto.nombre} como entregada y sacarla físicamente de la bodega?`)) return;
        let operaciones = []; let nuevosMovs = []; let cantPedida = parseInt(detalle.cantidad) || 1;
        for(let i=1; i<=20; i++) { 
            const matId = producto[`mat_${i}`]; const cantTeorica = parseFloat(producto[`cant_${i}`] || 0) * cantPedida; 
            if(matId && cantTeorica > 0) { 
                const material = App.state.inventario.find(m => m.id === matId); 
                if(material) { 
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
    async guardarAbono(datos) { 
        const pedidoObj = App.state.pedidos.find(p => p.id === datos.pedido_id);
        if(!pedidoObj) { App.ui.toast("Error: Pedido no encontrado"); return; }
        
        // 1. Calcular Saldo Exacto
        const abonosPrevios = App.state.abonos.filter(a => a.pedido_id === pedidoObj.id).reduce((s, a) => s + parseFloat(a.monto || 0), 0); 
        const saldoPendiente = parseFloat(pedidoObj.total) - parseFloat(pedidoObj.anticipo) - abonosPrevios; 
        const nuevoMonto = parseFloat(datos.monto) || 0; 
        
        // 2. Validación Anti-Fraude/Error
        if(nuevoMonto <= 0) { alert("❌ El abono debe ser mayor a $0."); return; }
        if(nuevoMonto > saldoPendiente + 0.05) { alert(`❌ No puedes abonar más del saldo pendiente ($${saldoPendiente.toFixed(2)}).`); return; }
        
        App.ui.showLoader("Procesando Pago..."); 
        const nuevoAbono = { 
            id: "ABO-" + Date.now(), 
            pedido_id: datos.pedido_id, 
            cliente_id: datos.cliente_id, 
            monto: nuevoMonto, 
            nota: datos.nota || 'Abono en caja', 
            metodo_pago: datos.metodo_pago || 'Efectivo', // NUEVO CAMPO
            fecha: new Date().toISOString() 
        }; 
        
        let operaciones = [{ action: "guardar_fila", nombreHoja: "abonos_clientes", datos: nuevoAbono }];

        // 3. Reglas Automáticas de Estado
        const saldoRealFinal = saldoPendiente - nuevoMonto; 
        if(saldoRealFinal <= 0.05 && pedidoObj.estado !== 'pagado') { 
            // Si liquida la deuda, marcar como pagado automáticamente
            operaciones.push({ action: "actualizar_fila", nombreHoja: "pedidos", idFila: pedidoObj.id, datosNuevos: { estado: 'pagado' } }); 
            pedidoObj.estado = 'pagado'; 
        } 
        
        const res = await App.api.fetch("ejecutar_lote", { operaciones: operaciones }); 
        if (res.status === "success") { 
            App.state.abonos.push(nuevoAbono); 
            App.ui.hideLoader(); 
            App.ui.toast("Pago registrado exitosamente"); 
            App.router.handleRoute(); 
        } else { 
            App.ui.hideLoader(); App.ui.toast("Error al guardar el pago"); 
        }
    },
    guardarCotizacion(datos) { datos.id = "COT-" + Date.now(); datos.fecha_creacion = new Date().toISOString(); App.state.cotizaciones.push(datos); localStorage.setItem('erp_cotizaciones', JSON.stringify(App.state.cotizaciones)); App.ui.toast("Cotización generada"); App.router.handleRoute(); App.logic.imprimirCotizacion(datos.id); },
    eliminarCotizacion(id) { if(!confirm("⚠️ ¿Eliminar cotización?")) return; App.state.cotizaciones = App.state.cotizaciones.filter(c => c.id !== id); localStorage.setItem('erp_cotizaciones', JSON.stringify(App.state.cotizaciones)); App.ui.toast("Eliminada"); App.router.handleRoute(); },
    imprimirNota(pedidoId) { 
        const p = App.state.pedidos.find(x => x.id === pedidoId); const c = App.state.clientes.find(cli => cli.id === p.cliente_id); const detalle = App.state.pedido_detalle.find(d => d.pedido_id === p.id); const producto = detalle ? App.state.productos.find(prod => prod.id === detalle.producto_id) : null; const abonosDelPedido = App.state.abonos.filter(a => a.pedido_id === p.id); const totalAbonado = abonosDelPedido.reduce((s, a) => s + parseFloat(a.monto||0), 0); const saldoReal = parseFloat(p.total) - parseFloat(p.anticipo) - totalAbonado; const ventana = window.open('', '_blank'); 
        let htmlNota = `<html><head><title>Nota de Remisión</title><style>body{font-family:sans-serif;background:#f9f9f9;padding:20px;color:#333;}.ticket{background:white;max-width:380px;margin:0 auto;padding:25px;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.05);}.header{text-align:center;border-bottom:2px dashed #cbd5e0;padding-bottom:15px;margin-bottom:15px;position:relative;}.header img.qr{position:absolute; right:0; top:0; width:65px; height:65px; border-radius:4px;}.header img.logo{max-height:80px;margin:0 auto 10px auto;display:block;}.header h1{margin:0;color:#2d3748;font-size:24px;text-transform:uppercase;}.header p.subtitle{margin:4px 0; color:#4a5568; font-size:14px;}.header div.phone{color:#718096;font-size:14px;margin-top:8px;font-weight:bold; letter-spacing: 0.5px; background: #f7fafc; display: inline-block; padding: 4px 12px; border-radius: 12px;}.info-p{margin:4px 0;font-size:14px;}table{width:100%;border-collapse:collapse;margin-top:15px;margin-bottom:15px;}th{border-bottom:1px solid #e2e8f0;padding:8px 0;text-align:left;font-size:13px;color:#718096;}td{padding:8px 0;font-size:14px;color:#2d3748;}.totales{border-top:2px solid #cbd5e0;padding-top:15px;}.totales-row{display:flex;justify-content:space-between;margin-bottom:5px;font-size:14px;}.saldo-final{display:flex;justify-content:space-between;margin-top:10px;font-size:18px;font-weight:bold;color:#2d3748;background:${saldoReal<=0?'#f0fff4':'#fff5f5'};padding:10px;border-radius:6px;}.footer{text-align:center;margin-top:30px;font-size:12px;color:#a0aec0;}.social{margin-top:10px;font-weight:bold;color:#4A5568;font-size:13px;}@media print{body{background:white;padding:0;}.ticket{box-shadow:none;border:none;max-width:100%;}}</style></head><body><div class="ticket"><div class="header"><img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://www.facebook.com/descansomaya.mx" onerror="this.style.display='none'"><img class="logo" src="${App.state.config.logoUrl}" onerror="this.style.display='none'"><h1>${App.state.config.empresa}</h1><p class="subtitle">Hamacas y Accesorios Artesanales</p><div class="phone">Tel: 999 144 2773</div></div><div style="margin-bottom:20px;"><p class="info-p"><strong>Folio:</strong> ${p.id.replace('PED-','')}</p><p class="info-p"><strong>Fecha:</strong> ${new Date(p.fecha_creacion).toLocaleDateString()}</p><p class="info-p"><strong>Cliente:</strong> ${c?c.nombre:'Mostrador'}</p></div><table><tr><th>Cant</th><th>Desc</th><th style="text-align:right;">Importe</th></tr><tr><td>${detalle?detalle.cantidad:1}</td><td><strong>${producto?producto.nombre:'Artículo'}</strong>${producto ? `<br><small style="color:#4A5568;">Clasificación: ${producto.clasificacion || 'N/A'}<br>Tamaño: ${producto.tamano || 'N/A'} | Color: ${producto.color || 'N/A'}</small>` : ''}<br><small style="color:#718096;font-size:11px;">${p.notas||''}</small></td><td style="text-align:right;">$${p.total}</td></tr></table><div class="totales"><div class="totales-row"><span>Subtotal:</span> <span>$${p.total}</span></div><div class="totales-row"><span>Anticipo:</span> <span style="color:#e53e3e;">-$${p.anticipo}</span></div>${totalAbonado>0?`<div class="totales-row"><span>Abonos:</span> <span style="color:#e53e3e;">-$${totalAbonado}</span></div>`:''}<div class="saldo-final"><span>SALDO:</span><span>$${saldoReal>0?saldoReal:0}</span></div></div><div class="footer"><p style="font-size:14px;font-weight:bold;color:#E53E3E;">¡Gracias por comprar lo hecho con amor! ❤️</p><p class="social">👉 Escanea el QR para visitar nuestro Facebook<br>${App.state.config.redesSociales}</p><p style="margin-top:15px;">Conserva tu recibo para aclaraciones</p></div></div><script>setTimeout(()=>{window.print();},500);<\/script></body></html>`; 
        ventana.document.write(htmlNota); ventana.document.close(); 
    },
    imprimirCotizacion(cotId) { const c = App.state.cotizaciones.find(x => x.id === cotId); const ventana = window.open('', '_blank'); let htmlNota = `<html><head><title>Cotización</title><style>body{font-family:sans-serif;background:#f9f9f9;padding:20px;color:#333;}.ticket{background:white;max-width:380px;margin:0 auto;padding:25px;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.05);}.header{text-align:center;border-bottom:2px dashed #cbd5e0;padding-bottom:15px;margin-bottom:15px;position:relative;}.header img.logo{max-height:80px;margin:0 auto 10px auto;display:block;}.header h1{margin:0;color:#2d3748;font-size:24px;text-transform:uppercase;}.header p.subtitle{margin:4px 0; color:#4a5568; font-size:14px;}.header div.phone{color:#718096;font-size:14px;margin-top:8px;font-weight:bold; letter-spacing: 0.5px; background: #f7fafc; display: inline-block; padding: 4px 12px; border-radius: 12px;}.info-p{margin:4px 0;font-size:14px;}table{width:100%;border-collapse:collapse;margin-top:15px;margin-bottom:15px;}th{border-bottom:1px solid #e2e8f0;padding:8px 0;text-align:left;font-size:13px;color:#718096;}td{padding:8px 0;font-size:14px;color:#2d3748;}.totales{border-top:2px solid #cbd5e0;padding-top:15px;}.saldo-final{display:flex;justify-content:space-between;margin-top:10px;font-size:18px;font-weight:bold;color:#4C51BF;background:#EEF2FF;padding:10px;border-radius:6px;}.footer{text-align:center;margin-top:30px;font-size:12px;color:#a0aec0;}.social{margin-top:10px;font-weight:bold;color:#4A5568;font-size:13px;}@media print{body{background:white;padding:0;}.ticket{box-shadow:none;border:none;max-width:100%;}}</style></head><body><div class="ticket"><div class="header"><img class="logo" src="${App.state.config.logoUrl}" onerror="this.style.display='none'"><h1>${App.state.config.empresa}</h1><p class="subtitle">Hamacas y Accesorios Artesanales</p><div class="phone">Tel: 999 144 2773</div><h2 style="color:#4C51BF;font-size:18px;margin-top:15px;">COTIZACIÓN</h2></div><div style="margin-bottom:20px;"><p class="info-p"><strong>Folio:</strong> ${c.id.replace('COT-','')}</p><p class="info-p"><strong>Fecha:</strong> ${new Date(c.fecha_creacion).toLocaleDateString()}</p><p class="info-p"><strong>Cliente:</strong> ${c.cliente_nombre}</p></div><table><tr><th>Cant</th><th>Desc</th><th style="text-align:right;">Importe</th></tr><tr><td>1</td><td>${c.descripcion}</td><td style="text-align:right;">$${c.total}</td></tr></table><div class="totales"><div class="saldo-final"><span>TOTAL COTIZADO:</span><span>$${c.total}</span></div></div><div class="footer"><p>Vigencia de cotización: 15 días.</p><p class="social">👉 Síguenos en nuestras redes sociales:<br>${App.state.config.redesSociales}</p></div></div><script>setTimeout(()=>{window.print();},500);<\/script></body></html>`; ventana.document.write(htmlNota); ventana.document.close(); },
    enviarWhatsApp(pedidoId, tipoMensaje) { const p = App.state.pedidos.find(x => x.id === pedidoId); const c = App.state.clientes.find(cli => cli.id === p.cliente_id); const detalle = App.state.pedido_detalle.find(d => d.pedido_id === p.id); const producto = detalle ? App.state.productos.find(prod => prod.id === detalle.producto_id) : null; const abonos = App.state.abonos.filter(a => a.pedido_id === p.id).reduce((s, a) => s + parseFloat(a.monto||0), 0); const saldoReal = parseFloat(p.total) - parseFloat(p.anticipo) - abonos; if(!c || !c.telefono) return alert("El cliente no tiene teléfono guardado"); let texto = ""; if(tipoMensaje === 'cobro') { texto = `Hola *${c.nombre}* 👋,\nTe saludamos de *${App.state.config.empresa}*.\n\nTe recordamos amablemente que tienes un saldo pendiente de *$${saldoReal > 0 ? saldoReal : 0}* por tu pedido de (${producto ? producto.nombre : 'Hamaca'}).\n\nQuedamos a tu disposición para cualquier duda. ¡Gracias por tu preferencia!`; } else if(tipoMensaje === 'listo') { texto = `¡Hola *${c.nombre}*! 🎉\nTe avisamos de *${App.state.config.empresa}* que tu pedido de (${producto ? producto.nombre : 'Hamaca'}) *¡ya está listo para entregarse!*\n\nTu saldo a liquidar es de: *$${saldoReal > 0 ? saldoReal : 0}*.\n\nPor favor confírmanos a qué hora pasarás por ella. ¡Te esperamos!`; } else { texto = `Hola *${c.nombre}* 👋,\nSomos de *${App.state.config.empresa}*.\n\nDetalle de tu pedido:\n📦 *Producto:* ${producto ? producto.nombre : 'Hamaca'}\n💰 *Total:* $${p.total}\n✅ *Abonado:* $${parseFloat(p.anticipo) + abonos}\n⚠️ *Saldo Pendiente:* $${saldoReal > 0 ? saldoReal : 0}\n\n👉 Síguenos: ${App.state.config.redesSociales}\n¡Gracias!`; } let tel = String(c.telefono).replace(/\D/g,''); if(tel.length === 10) tel = '52' + tel; App.ui.closeSheet(); window.location.href = `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`; }
});
