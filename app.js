/**
 * DESCANSO MAYA ERP - Motor Principal v18
 * Corrección Definitiva: Cierre de Orden y Mermas
 */

const App = {
    state: {
        config: { empresa: "Descanso Maya", moneda: "MXN" },
        pinAcceso: localStorage.getItem('erp_pin') || null, 
        pedidos: [], pedido_detalle: [], ordenes_produccion: [], artesanos: [], 
        inventario: [], productos: [], clientes: [], abonos: [], gastos: [],
        compras: [], proveedores: [], reparaciones: [], 
        tarifas_artesano: [], pago_artesanos: [], consumos_produccion: []
    },

    api: {
        gasUrl: "https://script.google.com/macros/s/AKfycbxL3KzjesyZIfiC-Dyr0SwwzwNnPsv5FgHpt-JhyscNpN1eTvRwAh_rdgoxdVnKTAwu/exec", // <-- ¡PEGA TU URL AQUÍ!
        
        async fetch(action, payload = {}) {
            try {
                const response = await fetch(this.gasUrl, { method: 'POST', body: JSON.stringify({ action: action, payload: payload, pin: App.state.pinAcceso }) });
                const data = await response.json(); 
                if (data.message === "Acceso Denegado. PIN incorrecto.") { localStorage.removeItem('erp_pin'); App.state.pinAcceso = null; App.router.handleRoute(); }
                return data;
            } catch (error) { return { status: "error", message: "Fallo de conexión." }; }
        }
    },

    ui: {
        container: null,
        init() {
            this.container = document.getElementById('overlays');
            const toastCont = document.createElement('div'); toastCont.className = 'toast-container'; toastCont.id = 'toast-container'; document.body.appendChild(toastCont);
            const loader = document.createElement('div'); loader.id = 'global-loader';
            loader.innerHTML = `<div class="spinner"></div><h2 style="margin: 0; font-weight: 600;">Descanso Maya</h2><p id="loader-text" style="margin-top: 10px; opacity: 0.8; font-size: 0.9rem;">Sincronizando módulos...</p><button id="btn-reintentar" class="btn btn-secondary hidden" style="margin-top: 20px;" onclick="location.reload()">Reintentar</button>`;
            document.body.appendChild(loader);
        },
        toast(message) { const cont = document.getElementById('toast-container'); const t = document.createElement('div'); t.className = 'toast'; t.textContent = message; cont.appendChild(t); setTimeout(() => t.remove(), 4000); },
        showLoader(mensaje = "Procesando...") { const loader = document.getElementById('global-loader'); if(loader) { document.getElementById('loader-text').textContent = mensaje; loader.classList.remove('hidden'); } },
        hideLoader() { const loader = document.getElementById('global-loader'); if(loader) loader.classList.add('hidden'); },
        openSheet(title, contentHTML, onSaveCallback) {
            this.container.innerHTML = `<div class="overlay-bg active" id="sheet-bg"></div><div class="bottom-sheet active" id="sheet-content"><div class="sheet-header"><h3>${title}</h3><button class="sheet-close" id="sheet-close">&times;</button></div><div class="sheet-body">${contentHTML}</div></div>`;
            document.getElementById('sheet-close').onclick = this.closeSheet.bind(this); document.getElementById('sheet-bg').onclick = this.closeSheet.bind(this);
            const form = document.getElementById('dynamic-form');
            if(form && onSaveCallback) { form.onsubmit = (e) => { e.preventDefault(); onSaveCallback(Object.fromEntries(new FormData(form).entries())); this.closeSheet(); }; }
        },
        closeSheet() { this.container.innerHTML = ''; }
    },

    logic: {
        async verificarPIN(pinIngresado) {
            App.ui.showLoader("Verificando acceso..."); App.state.pinAcceso = pinIngresado; 
            const res = await App.api.fetch("ping");
            if (res.status === "success") { localStorage.setItem('erp_pin', pinIngresado); App.ui.toast("¡Acceso concedido!"); this.cargarDatosIniciales(); } 
            else { App.state.pinAcceso = null; App.ui.hideLoader(); App.ui.toast("PIN Incorrecto."); }
        },
        
        async cargarDatosIniciales() {
            App.ui.showLoader("Descargando bases de datos...");
            try {
                const hojas = ["materiales", "clientes", "productos", "pedidos", "pedido_detalle", "ordenes_produccion", "artesanos", "abonos_clientes", "gastos", "compras", "proveedores", "reparaciones", "tarifas_artesano", "pago_artesanos", "consumos_produccion"];
                const promesas = hojas.map(h => App.api.fetch("leer_hoja", { nombreHoja: h }));
                const resultados = await Promise.all(promesas);
                if (resultados[0].status === "error") throw new Error(resultados[0].message);
                
                App.state.inventario = resultados[0].data || []; App.state.clientes = resultados[1].data || []; App.state.productos = resultados[2].data || []; App.state.pedidos = resultados[3].data || []; App.state.pedido_detalle = resultados[4].data || []; App.state.ordenes_produccion = resultados[5].data || []; App.state.artesanos = resultados[6].data || []; App.state.abonos = resultados[7].data || []; App.state.gastos = resultados[8].data || []; App.state.compras = resultados[9].data || []; App.state.proveedores = resultados[10].data || []; App.state.reparaciones = resultados[11].data || []; App.state.tarifas_artesano = resultados[12].data || []; App.state.pago_artesanos = resultados[13].data || []; App.state.consumos_produccion = resultados[14].data || [];
                
                App.ui.hideLoader(); App.router.init();
            } catch (error) { App.ui.toast("Error de red."); document.getElementById('btn-reintentar').classList.remove('hidden'); }
        },

        descargarRespaldo() {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(App.state, null, 2));
            const dlAnchorElem = document.createElement('a'); dlAnchorElem.setAttribute("href", dataStr); dlAnchorElem.setAttribute("download", `Respaldo_ERP_Maya_${new Date().toISOString().split('T')[0]}.json`); dlAnchorElem.click(); App.ui.toast("Respaldo descargado exitosamente");
        },

        // --- LA MAGIA ESTÁ AQUÍ ---
        async procesarCambioOrden(ordenId, datos) {
            // Si eligen LISTO, abrimos el modal de cierre
            if (datos.estado === 'listo') {
                App.ui.closeSheet(); 
                App.views.formCerrarOrden(ordenId, datos.artesano_id); 
            } else {
                App.ui.showLoader("Actualizando orden...");
                const res = await App.api.fetch("actualizar_fila", { nombreHoja: "ordenes_produccion", idFila: ordenId, datosNuevos: datos }); 
                App.ui.hideLoader();
                if (res.status === "success") { 
                    const ordenIndex = App.state.ordenes_produccion.findIndex(o => o.id === ordenId);
                    App.state.ordenes_produccion[ordenIndex] = { ...App.state.ordenes_produccion[ordenIndex], ...datos }; 
                    App.ui.toast("Orden actualizada"); App.router.handleRoute(); 
                } else { App.ui.toast("Error al actualizar"); }
            }
        },

        async cerrarOrdenProduccion(datosFormulario) {
            App.ui.showLoader("Cerrando orden, descontando stock y registrando pago...");
            const ordenId = datosFormulario.orden_id;
            const consumoReal = parseFloat(datosFormulario.consumo_real) || 0;
            const pagoArtesano = parseFloat(datosFormulario.pago_artesano) || 0;
            const orden = App.state.ordenes_produccion.find(o => o.id === ordenId);
            const detalle = App.state.pedido_detalle.find(d => d.id === orden.pedido_detalle_id);
            const producto = App.state.productos.find(p => p.id === detalle.producto_id);
            const material = producto ? App.state.inventario.find(m => m.id === producto.material_hilo_id) : null;

            // 1. Marca como listo
            await App.api.fetch("actualizar_fila", { nombreHoja: "ordenes_produccion", idFila: ordenId, datosNuevos: { estado: 'listo' } });
            orden.estado = 'listo';

            // 2. Descuenta inventario real si aplica
            if (material && consumoReal > 0) {
                const nuevoStock = parseFloat(material.stock_actual) - consumoReal;
                await App.api.fetch("actualizar_fila", { nombreHoja: "materiales", idFila: material.id, datosNuevos: { stock_actual: nuevoStock } });
                material.stock_actual = nuevoStock;
                const consumoObj = { id: "CONS-" + Date.now(), orden_id: ordenId, material_id: material.id, cantidad_teorica: datosFormulario.consumo_teorico, cantidad_real: consumoReal, fecha: new Date().toISOString() };
                await App.api.fetch("guardar_fila", { nombreHoja: "consumos_produccion", datos: consumoObj });
                App.state.consumos_produccion.push(consumoObj);
            }

            // 3. Nómina de artesano
            if (orden.artesano_id && pagoArtesano > 0) {
                const pagoObj = { id: "PAGO-" + Date.now(), artesano_id: orden.artesano_id, orden_id: ordenId, monto_unitario: pagoArtesano, total: pagoArtesano, estado: "pendiente", fecha: new Date().toISOString() };
                await App.api.fetch("guardar_fila", { nombreHoja: "pago_artesanos", datos: pagoObj });
                App.state.pago_artesanos.push(pagoObj);
            }

            App.ui.hideLoader(); App.ui.toast("¡Orden finalizada con éxito!"); App.router.handleRoute();
        },

        // --- RESTO DE FUNCIONES ---
        async guardarNuevaCompra(datos) { App.ui.showLoader("Registrando..."); const compra = { id: "COM-" + Date.now(), proveedor_id: datos.proveedor_id, fecha: new Date().toISOString().split('T')[0], total: parseFloat(datos.total), monto_pagado: parseFloat(datos.total), estado: "pagado", fecha_creacion: new Date().toISOString() }; const res = await App.api.fetch("guardar_fila", { nombreHoja: "compras", datos: compra }); if (res.status === "success") { App.state.compras.push(compra); const material = App.state.inventario.find(m => m.id === datos.material_id); if(material) { const nuevoStock = parseFloat(material.stock_actual) + parseFloat(datos.cantidad); await App.api.fetch("actualizar_fila", { nombreHoja: "materiales", idFila: material.id, datosNuevos: { stock_actual: nuevoStock } }); material.stock_actual = nuevoStock; } App.ui.hideLoader(); App.ui.toast("Compra y stock actualizados"); App.router.handleRoute(); } else { App.ui.hideLoader(); App.ui.toast("Error"); } },
        async guardarNuevaReparacion(datos) { App.ui.showLoader("Registrando..."); datos.id = "REP-" + Date.now(); datos.estado = "recibida"; datos.fecha_creacion = new Date().toISOString(); const res = await App.api.fetch("guardar_fila", { nombreHoja: "reparaciones", datos: datos }); App.ui.hideLoader(); if (res.status === "success") { App.state.reparaciones.push(datos); App.ui.toast("Reparación registrada"); App.router.handleRoute(); } else { App.ui.toast("Error"); } },
        enviarWhatsApp(pedidoId) { const p = App.state.pedidos.find(x => x.id === pedidoId); const c = App.state.clientes.find(cli => cli.id === p.cliente_id); const detalle = App.state.pedido_detalle.find(d => d.pedido_id === p.id); const producto = detalle ? App.state.productos.find(prod => prod.id === detalle.producto_id) : null; const abonos = App.state.abonos.filter(a => a.pedido_id === p.id).reduce((s, a) => s + parseFloat(a.monto||0), 0); const saldoReal = parseFloat(p.total) - parseFloat(p.anticipo) - abonos; if(!c || !c.telefono) return; let texto = `Hola *${c.nombre}* 👋,\nTe compartimos el detalle de tu pedido:\n📦 *Producto:* ${producto ? producto.nombre : 'Hamaca'}\n💰 *Total:* $${p.total}\n✅ *Abonado:* $${parseFloat(p.anticipo) + abonos}\n⚠️ *Saldo Pendiente:* $${saldoReal > 0 ? saldoReal : 0}\n¡Gracias por tu compra!`; let tel = String(c.telefono).replace(/\D/g,''); if(tel.length === 10) tel = '52' + tel; window.location.href = `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`; },
        imprimirNota(pedidoId) { const p = App.state.pedidos.find(x => x.id === pedidoId); const c = App.state.clientes.find(cli => cli.id === p.cliente_id); const detalle = App.state.pedido_detalle.find(d => d.pedido_id === p.id); const producto = detalle ? App.state.productos.find(prod => prod.id === detalle.producto_id) : null; const abonosDelPedido = App.state.abonos.filter(a => a.pedido_id === p.id); const totalAbonado = abonosDelPedido.reduce((s, a) => s + parseFloat(a.monto||0), 0); const saldoReal = parseFloat(p.total) - parseFloat(p.anticipo) - totalAbonado; const ventana = window.open('', '_blank'); let htmlNota = `<html><body style="font-family:sans-serif; padding:20px; max-width:400px; margin:auto;"><h2 style="text-align:center;">Descanso Maya</h2><p><strong>Cliente:</strong> ${c.nombre}</p><p><strong>Producto:</strong> ${producto ? producto.nombre : 'Hamaca'}</p><p><strong>Total:</strong> $${p.total}</p><p><strong>Abonado:</strong> $${parseFloat(p.anticipo) + totalAbonado}</p><h3><strong>Saldo a pagar: $${saldoReal > 0 ? saldoReal : 0}</strong></h3><script>window.onload=function(){window.print();}</script></body></html>`; ventana.document.write(htmlNota); ventana.document.close(); },
        async guardarAbono(datos) { App.ui.showLoader("Registrando..."); const nuevoAbono = { id: "ABO-" + Date.now(), pedido_id: datos.pedido_id, cliente_id: datos.cliente_id, monto: parseFloat(datos.monto) || 0, nota: datos.nota, fecha: new Date().toISOString() }; const res = await App.api.fetch("guardar_fila", { nombreHoja: "abonos_clientes", datos: nuevoAbono }); App.ui.hideLoader(); if (res.status === "success") { App.state.abonos.push(nuevoAbono); App.ui.toast("Pago registrado"); App.router.handleRoute(); } else App.ui.toast("Error"); },
        async guardarNuevoGasto(datos) { App.ui.showLoader("Registrando..."); datos.id = "GAS-" + Date.now(); datos.monto = parseFloat(datos.monto) || 0; const res = await App.api.fetch("guardar_fila", { nombreHoja: "gastos", datos: datos }); App.ui.hideLoader(); if (res.status === "success") { App.state.gastos.push(datos); App.ui.toast("Gasto registrado"); App.router.handleRoute(); } else App.ui.toast("Error"); },
        async guardarNuevoCliente(datos) { App.ui.showLoader("Guardando..."); datos.id = "CLI-" + Date.now(); datos.fecha_creacion = new Date().toISOString(); const res = await App.api.fetch("guardar_fila", { nombreHoja: "clientes", datos: datos }); App.ui.hideLoader(); if (res.status === "success") { App.ui.toast("Cliente guardado"); App.state.clientes.push(datos); App.router.handleRoute(); } else App.ui.toast("Error"); },
        async guardarNuevoProducto(datos) { App.ui.showLoader("Guardando..."); datos.id = "PROD-" + Date.now(); datos.precio_venta = parseFloat(datos.precio_venta) || 0; datos.activo = "TRUE"; const res = await App.api.fetch("guardar_fila", { nombreHoja: "productos", datos: datos }); App.ui.hideLoader(); if (res.status === "success") { App.ui.toast("Producto creado"); App.state.productos.push(datos); App.router.handleRoute(); } else App.ui.toast("Error"); },
        async guardarNuevoPedido(datosFormulario) { App.ui.showLoader("Creando pedido..."); const pedidoId = "PED-" + Date.now(); const totalNum = parseFloat(datosFormulario.total) || 0; const anticipoNum = parseFloat(datosFormulario.anticipo) || 0; const cantidadNum = parseInt(datosFormulario.cantidad) || 1; const datosPedido = { id: pedidoId, cliente_id: datosFormulario.cliente_id, estado: "nuevo", total: totalNum, anticipo: anticipoNum, notas: datosFormulario.notas, fecha_entrega: datosFormulario.fecha_entrega, fecha_creacion: new Date().toISOString() }; const datosDetalle = { id: "PDET-" + Date.now(), pedido_id: pedidoId, producto_id: datosFormulario.producto_id, cantidad: cantidadNum, precio_unitario: totalNum / cantidadNum }; const resPedido = await App.api.fetch("guardar_fila", { nombreHoja: "pedidos", datos: datosPedido }); if (resPedido.status === "success") { await App.api.fetch("guardar_fila", { nombreHoja: "pedido_detalle", datos: datosDetalle }); App.state.pedidos.push(datosPedido); App.state.pedido_detalle.push(datosDetalle); App.ui.hideLoader(); App.ui.toast("Pedido registrado"); App.router.handleRoute(); } else App.ui.toast("Error"); },
        async mandarAProduccion(pedidoId) { App.ui.showLoader("Generando Orden..."); const detalle = App.state.pedido_detalle.find(d => d.pedido_id === pedidoId); if (!detalle) return; const nuevaOrden = { id: "ORD-" + Date.now(), pedido_detalle_id: detalle.id, estado: "pendiente", fecha_creacion: new Date().toISOString() }; const res = await App.api.fetch("guardar_fila", { nombreHoja: "ordenes_produccion", datos: nuevaOrden }); App.ui.hideLoader(); if (res.status === "success") { App.state.ordenes_produccion.push(nuevaOrden); App.ui.toast("Enviado a producción"); App.router.navigate('produccion'); } }
    },

    views: {
        login() { document.getElementById('bottom-nav').style.display = 'none'; return `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:80vh; text-align:center;"><div style="background:var(--primary); color:white; width:80px; height:80px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:2rem; margin-bottom:20px;">🔒</div><h2 style="margin-bottom:10px; color:var(--primary-dark);">Descanso Maya</h2><p style="color:var(--text-muted); margin-bottom:30px;">Ingresa el PIN</p><div class="card" style="width:100%; max-width:320px;"><input type="password" id="pin-input" placeholder="PIN" style="width:100%; padding:12px; font-size:1.2rem; text-align:center; border:1px solid var(--border); border-radius:8px; margin-bottom:15px;"><button class="btn btn-primary" style="width:100%; padding:12px; font-size:1rem;" onclick="App.logic.verificarPIN(document.getElementById('pin-input').value)">Entrar</button></div></div>`; },
        inicio() { document.getElementById('bottom-nav').style.display = 'flex'; return `<div class="grid-2"><div class="card stat-card"><div class="label">Pedidos</div><div class="value">${App.state.pedidos.length}</div></div><div class="card stat-card"><div class="label">Producción</div><div class="value">${App.state.ordenes_produccion.filter(o => o.estado !== 'listo').length}</div></div><div class="card stat-card" onclick="App.router.navigate('reparaciones')" style="cursor:pointer; background:#FAF5FF;"><div class="label" style="color:#6B46C1;">Reparaciones</div><div class="value">🪡 ${App.state.reparaciones.length}</div></div><div class="card stat-card" onclick="App.router.navigate('finanzas')" style="cursor:pointer; background:#EBF8FF;"><div class="label" style="color:#3182CE;">Ver Finanzas</div><div class="value">📊</div></div></div>`; },
        
        configuracion() { document.getElementById('bottom-nav').style.display = 'flex'; return `<div class="card"><h3 class="card-title">Configuración</h3><p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 20px;">Administra tu información.</p><button class="btn btn-primary" style="width: 100%; margin-bottom: 15px; display: flex; align-items: center; justify-content: center; gap: 10px;" onclick="App.logic.descargarRespaldo()"><span>💾</span> Descargar Respaldo Total</button><button class="btn btn-secondary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; background: #FED7D7; color: var(--danger); border: none;" onclick="localStorage.removeItem('erp_pin'); location.reload();"><span>🔒</span> Bloquear Sistema</button></div>`; },
        reparaciones() { document.getElementById('bottom-nav').style.display = 'flex'; let html = `<div class="card"><h3 class="card-title">Módulo de Reparaciones</h3>`; if (App.state.reparaciones.length === 0) html += `<p style="color: var(--text-muted);">No hay reparaciones registradas.</p>`; else { [...App.state.reparaciones].reverse().forEach(r => { const c = App.state.clientes.find(cli => cli.id === r.cliente_id); html += `<div class="card" style="border: 1px solid var(--border); box-shadow: none;"><div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><strong>${r.id} - ${c ? c.nombre : 'Cliente'}</strong><span class="badge ${r.estado}">${r.estado.toUpperCase()}</span></div><p style="color: var(--primary); font-size: 0.9rem; font-weight: bold; margin-bottom: 5px;">${r.descripcion}</p><p style="color: var(--text-muted); font-size: 0.85rem;">Precio: $${r.precio} | Anticipo: $${r.anticipo}</p></div>`; }); } return html += `</div><button class="fab" onclick="App.views.formNuevaReparacion()">+</button>`; },
        compras() { document.getElementById('bottom-nav').style.display = 'flex'; let html = `<div class="card"><h3 class="card-title">Historial de Compras</h3>`; if (App.state.compras.length === 0) html += `<p style="color: var(--text-muted);">No hay compras registradas.</p>`; else { [...App.state.compras].reverse().forEach(c => { const p = App.state.proveedores.find(prv => prv.id === c.proveedor_id); html += `<div class="card" style="border: 1px solid var(--border); box-shadow: none;"><div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><strong>${c.id}</strong><span style="color: var(--danger); font-weight: bold;">$${c.total}</span></div><p style="color: var(--text-muted); font-size: 0.85rem;">Proveedor: ${p ? p.nombre : 'General'} | Fecha: ${c.fecha}</p></div>`; }); } return html += `</div><button class="fab" onclick="App.views.formNuevaCompra()">+</button>`; },
        
        formNuevaReparacion() { const opcionesClientes = App.state.clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join(''); const formHTML = `<form id="dynamic-form"><div class="form-group"><label>Cliente</label><select name="cliente_id" required><option value="">-- Elige un cliente --</option>${opcionesClientes}</select></div><div class="form-group"><label>Descripción del Daño</label><input type="text" name="descripcion" required placeholder="Ej. Cambio de brazos"></div><div class="form-group"><label>Precio Acordado ($)</label><input type="number" name="precio" required></div><div class="form-group"><label>Anticipo Pagado ($)</label><input type="number" name="anticipo" value="0" required></div><button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">Registrar Reparación</button></form>`; App.ui.openSheet("Nueva Reparación", formHTML, (data) => App.logic.guardarNuevaReparacion(data)); },
        formNuevaCompra() { const opcProv = App.state.proveedores.map(p => `<option value="${p.id}">${p.nombre}</option>`).join(''); const opcMat = App.state.inventario.map(m => `<option value="${m.id}">${m.nombre} (Stock actual: ${m.stock_actual})</option>`).join(''); const formHTML = `<form id="dynamic-form"><div class="form-group"><label>Proveedor</label><select name="proveedor_id" required><option value="">-- Elige Proveedor --</option>${opcProv}</select></div><div class="form-group"><label>Material a sumar al stock</label><select name="material_id" required><option value="">-- Elige Material --</option>${opcMat}</select></div><div class="form-group"><label>Cantidad Comprada</label><input type="number" name="cantidad" step="0.1" required></div><div class="form-group"><label>Costo Total ($)</label><input type="number" name="total" required></div><button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px; background: var(--success); border-color: var(--success);">Sumar Stock</button></form>`; App.ui.openSheet("Comprar Material", formHTML, (data) => App.logic.guardarNuevaCompra(data)); },
        finanzas() { const totalVentas = App.state.pedidos.reduce((acc, p) => acc + (parseFloat(p.total) || 0), 0); const totalAnticipos = App.state.pedidos.reduce((acc, p) => acc + (parseFloat(p.anticipo) || 0), 0); const totalAbonos = App.state.abonos.reduce((acc, a) => acc + (parseFloat(a.monto) || 0), 0); const ingresosReales = totalAnticipos + totalAbonos; const porCobrar = totalVentas - ingresosReales; const totalGastos = App.state.gastos.reduce((acc, g) => acc + (parseFloat(g.monto) || 0), 0); const balanceNeto = ingresosReales - totalGastos; let html = `<div class="card"><h3 class="card-title">Dashboard Financiero</h3><div class="grid-2"><div class="card stat-card" style="background: #EBF8FF;"><div class="label">Ventas</div><div class="value" style="color: #3182CE; font-size: 1.2rem;">$${totalVentas}</div></div><div class="card stat-card" style="background: #C6F6D5;"><div class="label">Ingresos</div><div class="value" style="color: #38A169; font-size: 1.2rem;">$${ingresosReales}</div></div><div class="card stat-card" style="background: #FEFCBF;"><div class="label">Por Cobrar</div><div class="value" style="color: #D69E2E; font-size: 1.2rem;">$${porCobrar}</div></div><div class="card stat-card" style="background: #FED7D7;"><div class="label">Gastos</div><div class="value" style="color: #E53E3E; font-size: 1.2rem;">$${totalGastos}</div></div></div><div class="card stat-card" style="margin-top:10px; border: 2px solid ${balanceNeto >= 0 ? 'var(--success)' : 'var(--danger)'};"><div class="label">Flujo Neto Efectivo</div><div class="value" style="color: ${balanceNeto >= 0 ? 'var(--success)' : 'var(--danger)'};">$${balanceNeto}</div></div></div>`; return html; },
        pedidos() { document.getElementById('bottom-nav').style.display = 'flex'; let html = `<div class="card"><h3 class="card-title">Historial de Pedidos</h3>`; [...App.state.pedidos].reverse().slice(0, 50).forEach(p => { const c = App.state.clientes.find(cli => cli.id === p.cliente_id); const detalle = App.state.pedido_detalle.find(d => d.pedido_id === p.id); const producto = detalle ? App.state.productos.find(prod => prod.id === detalle.producto_id) : null; const tieneOrden = detalle ? App.state.ordenes_produccion.some(o => o.pedido_detalle_id === detalle.id) : false; const abonos = App.state.abonos.filter(a => a.pedido_id === p.id).reduce((sum, a) => sum + parseFloat(a.monto || 0), 0); const saldoReal = parseFloat(p.total || 0) - parseFloat(p.anticipo || 0) - abonos; const estaPagado = saldoReal <= 0; html += `<div class="card" style="border: 1px solid var(--border); box-shadow: none;"><div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><strong>${p.id} - ${c ? c.nombre : 'Cliente'}</strong>${estaPagado ? `<span class="badge" style="background: var(--success); color: white;">PAGADO</span>` : `<span class="badge ${p.estado || 'nuevo'}">${(p.estado || 'Nuevo').toUpperCase()}</span>`}</div><p style="color: var(--primary); font-size: 0.9rem; font-weight: bold; margin-bottom: 5px;">${producto ? producto.nombre : 'Desconocido'}</p><div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--border);"><div><strong style="color: ${estaPagado ? 'var(--success)' : 'var(--danger)'};">Saldo: $${saldoReal > 0 ? saldoReal : 0}</strong></div><div style="display: flex; gap: 8px;">${!tieneOrden && detalle ? `<button class="btn btn-secondary" style="padding: 6px 10px;" onclick="App.logic.mandarAProduccion('${p.id}')">🔨</button>` : ''}${!estaPagado ? `<button class="btn btn-primary" style="padding: 6px 10px; background: var(--success); border-color: var(--success);" onclick="App.views.formCobrar('${p.id}', '${c.id}', ${saldoReal})">💰</button>` : ''}</div></div></div>`; }); return html += `</div><button class="fab" onclick="App.views.formNuevoPedido()">+</button>`; },
        
        produccion() { document.getElementById('bottom-nav').style.display = 'flex'; let html = `<div class="card"><h3 class="card-title">Tablero Kanban</h3></div>`; const pendientes = App.state.ordenes_produccion.filter(o => o.estado === 'pendiente' || !o.estado); const enProceso = App.state.ordenes_produccion.filter(o => o.estado === 'en_proceso'); const listas = App.state.ordenes_produccion.filter(o => o.estado === 'listo'); const dibujarTarjeta = (orden) => { const detalle = App.state.pedido_detalle.find(d => d.id === orden.pedido_detalle_id); const producto = detalle ? App.state.productos.find(p => p.id === detalle.producto_id) : null; return `<div class="kanban-card" onclick="App.views.modalEditarOrden('${orden.id}')"><strong>${orden.id}</strong><br><small style="color: var(--primary); font-weight: 600;">${producto ? producto.nombre : 'Producto interno'}</small></div>`; }; html += `<div class="kanban-board"><div class="kanban-column"><div class="kanban-header">Pendientes <span>${pendientes.length}</span></div>${pendientes.map(dibujarTarjeta).join('')}</div><div class="kanban-column"><div class="kanban-header">En Proceso <span>${enProceso.length}</span></div>${enProceso.map(dibujarTarjeta).join('')}</div><div class="kanban-column"><div class="kanban-header">Listas <span>${listas.length}</span></div>${listas.map(dibujarTarjeta).join('')}</div></div>`; return html; },
        
        // --- AQUÍ ESTÁN LAS VISTAS DEL KANBAN ---
        modalEditarOrden(ordenId) { 
            const orden = App.state.ordenes_produccion.find(o => o.id === ordenId); 
            const opcionesArtesanos = App.state.artesanos.map(a => `<option value="${a.id}" ${orden.artesano_id === a.id ? 'selected' : ''}>${a.nombre}</option>`).join(''); 
            const formHTML = `<form id="dynamic-form"><div class="form-group"><label>Artesano Asignado</label><select name="artesano_id"><option value="">-- Sin asignar --</option>${opcionesArtesanos}</select></div><div class="form-group"><label>Estado del Trabajo</label><select name="estado"><option value="pendiente" ${orden.estado === 'pendiente' ? 'selected' : ''}>Pendiente de tejer</option><option value="en_proceso" ${orden.estado === 'en_proceso' ? 'selected' : ''}>En Proceso (Tejiendo)</option><option value="listo" ${orden.estado === 'listo' ? 'selected' : ''}>¡Terminada! (Pasar a cierre)</option></select></div><button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">Guardar Cambios</button></form>`; 
            App.ui.openSheet(`Actualizar Orden`, formHTML, (datos) => App.logic.procesarCambioOrden(ordenId, datos)); 
        },

        formCerrarOrden(ordenId, artesanoAsignadoId) {
            const orden = App.state.ordenes_produccion.find(o => o.id === ordenId);
            const detalle = App.state.pedido_detalle.find(d => d.id === orden.pedido_detalle_id);
            const producto = detalle ? App.state.productos.find(p => p.id === detalle.producto_id) : { nombre: 'Hamaca Gral.', tubos_hilo: 0 };
            const consumoTeorico = parseFloat(producto.tubos_hilo || 0) * parseInt(detalle ? detalle.cantidad : 1);
            const artesano = App.state.artesanos.find(a => a.id === artesanoAsignadoId);
            const tarifa = App.state.tarifas_artesano.find(t => t.artesano_id === artesanoAsignadoId);
            const pagoSugerido = tarifa ? tarifa.monto : 0;
            const formHTML = `<div style="background: #FEFCBF; padding: 10px; border-radius: 8px; margin-bottom: 15px; font-size: 0.9rem;"><strong>Cierre de Producción</strong><br>Producto: ${producto.nombre}<br>Artesano: ${artesano ? artesano.nombre : 'General'}</div><form id="dynamic-form"><input type="hidden" name="orden_id" value="${ordenId}"><input type="hidden" name="consumo_teorico" value="${consumoTeorico}"><div class="form-group"><label>Consumo de Hilo/Material Reales</label><input type="number" step="0.1" name="consumo_real" value="${consumoTeorico}" required><small style="color: var(--text-muted);">El sistema esperaba gastar ${consumoTeorico}. Puedes ajustar si gastó más o menos.</small></div><div class="form-group"><label>Monto a pagar al Artesano ($)</label><input type="number" name="pago_artesano" value="${pagoSugerido}" required></div><button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px; background: var(--success); border-color: var(--success);">Finalizar y Descontar Stock</button></form>`;
            App.ui.openSheet("Cerrar Orden", formHTML, (datos) => App.logic.cerrarOrdenProduccion(datos));
        },

        formCobrar(pedidoId, clienteId, saldoPendiente) { const formHTML = `<form id="dynamic-form"><input type="hidden" name="pedido_id" value="${pedidoId}"><input type="hidden" name="cliente_id" value="${clienteId}"><div class="form-group"><label>Abonar ($)</label><input type="number" name="monto" value="${saldoPendiente}" max="${saldoPendiente}" required></div><button type="submit" class="btn btn-primary" style="width: 100%;">Confirmar Pago</button></form>`; App.ui.openSheet(`Pago ${pedidoId}`, formHTML, (data) => App.logic.guardarAbono(data)); },
        formNuevoPedido() { const opcionesClientes = App.state.clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join(''); const opcionesProductos = App.state.productos.map(p => `<option value="${p.id}">${p.nombre} ($${p.precio_venta})</option>`).join(''); const formHTML = `<form id="dynamic-form"><div class="form-group"><label>Cliente</label><select name="cliente_id" required><option value="">-- Elige un cliente --</option>${opcionesClientes}</select></div><div class="form-group"><label>Producto</label><select name="producto_id" required><option value="">-- Elige un producto --</option>${opcionesProductos}</select></div><div class="form-group"><label>Cantidad</label><input type="number" name="cantidad" value="1" min="1" required></div><div class="form-group"><label>Precio Total ($)</label><input type="number" name="total" required></div><div class="form-group"><label>Anticipo ($)</label><input type="number" name="anticipo" value="0" required></div><button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">Crear Pedido</button></form>`; App.ui.openSheet("Nuevo Pedido", formHTML, (data) => App.logic.guardarNuevoPedido(data)); },
        inventario() { document.getElementById('bottom-nav').style.display = 'flex'; let html = `<div class="card"><h3 class="card-title">Stock Actual</h3><table style="width:100%; border-collapse: collapse; font-size: 0.9rem;"><tr style="border-bottom: 2px solid var(--border);"><th style="text-align:left; padding:8px;">Material</th><th style="padding:8px;">Stock</th></tr>`; App.state.inventario.forEach(i => { html += `<tr style="border-bottom: 1px solid var(--border);"><td style="padding: 10px 5px;">${i.nombre}</td><td style="padding: 10px 5px; text-align:center; font-weight:bold; color:${i.stock_actual < 5 ? 'var(--danger)' : 'var(--text-main)'}">${i.stock_actual}</td></tr>`; }); html += `</table></div>`; return html; },
        productos() { document.getElementById('bottom-nav').style.display = 'flex'; let html = `<div class="card"><h3 class="card-title">Catálogo</h3>`; App.state.productos.forEach(p => { html += `<div class="card" style="border: 1px solid var(--border); box-shadow: none; padding: 12px;"><div style="display: flex; justify-content: space-between;"><strong>${p.nombre}</strong><span style="color: var(--primary); font-weight: bold;">$${p.precio_venta}</span></div></div>`; }); html += `</div>`; return html; },
        clientes() { document.getElementById('bottom-nav').style.display = 'flex'; let html = `<div class="card"><h3 class="card-title">Directorio</h3>`; App.state.clientes.forEach(c => { html += `<div class="card" style="border: 1px solid var(--border); padding: 10px; margin-bottom: 8px;"><strong>${c.nombre}</strong></div>`; }); html += `</div>`; return html; },
        mas() { document.getElementById('bottom-nav').style.display = 'flex'; return `<div class="grid-2"><div class="card stat-card" style="cursor:pointer;" onclick="App.router.navigate('clientes')"><div class="label" style="margin-top:0;">Clientes</div></div><div class="card stat-card" style="cursor:pointer;" onclick="App.router.navigate('productos')"><div class="label" style="margin-top:0;">Productos</div></div><div class="card stat-card" style="cursor:pointer; background: #EBF8FF;" onclick="App.router.navigate('compras')"><div class="label" style="margin-top:0; color:#3182CE;">📦 Compras</div></div><div class="card stat-card" style="cursor:pointer; background: #FAF5FF;" onclick="App.router.navigate('reparaciones')"><div class="label" style="margin-top:0; color:#6B46C1;">🪡 Reparaciones</div></div><div class="card stat-card" style="cursor:pointer; background: #EDF2F7; grid-column: span 2;" onclick="App.router.navigate('configuracion')"><div class="label" style="margin-top:0; color: #4A5568;">⚙️ Configuración y Respaldos</div></div></div>`; }
    },
    router: { 
        init() { window.addEventListener('hashchange', () => this.handleRoute()); this.handleRoute(); }, 
        navigate(route) { window.location.hash = route; }, 
        handleRoute() { 
            if (!App.state.pinAcceso) { App.ui.hideLoader(); document.getElementById('app-content').innerHTML = App.views.login(); document.getElementById('header-title').textContent = "Acceso"; return; }
            let hash = window.location.hash.substring(1) || 'inicio'; const contentDiv = document.getElementById('app-content'); const titleEl = document.getElementById('header-title'); document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active')); const activeNav = document.querySelector(`.nav-item[data-view="${hash}"]`); if(activeNav) activeNav.classList.add('active'); if (App.views[hash]) { contentDiv.innerHTML = App.views[hash](); titleEl.textContent = hash.charAt(0).toUpperCase() + hash.slice(1); } else { contentDiv.innerHTML = `<div class="card"><p>Módulo en desarrollo.</p></div>`; } 
        } 
    },
    start() { this.ui.init(); if (!this.state.pinAcceso) { this.router.init(); } else { this.logic.cargarDatosIniciales(); } }
};
document.addEventListener('DOMContentLoaded', () => App.start());
