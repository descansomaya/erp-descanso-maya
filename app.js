/**
 * DESCANSO MAYA ERP - Motor Principal v13
 * Sistema de Seguridad con PIN (Login)
 */

const App = {
    state: {
        config: { empresa: "Descanso Maya", moneda: "MXN" },
        pinAcceso: localStorage.getItem('erp_pin') || null, // Recupera el PIN si ya inició sesión antes
        pedidos: [], pedido_detalle: [], ordenes_produccion: [],
        artesanos: [], inventario: [], productos: [], clientes: [], abonos: [], gastos: []
    },

    api: {
        gasUrl: "https://script.google.com/macros/s/AKfycbxL3KzjesyZIfiC-Dyr0SwwzwNnPsv5FgHpt-JhyscNpN1eTvRwAh_rdgoxdVnKTAwu/exec", // <-- ¡PEGA TU URL AQUÍ!
        
        async fetch(action, payload = {}) {
            try {
                // NUEVO: Agregamos el PIN a todas las peticiones
                const bodyRequest = { 
                    action: action, 
                    payload: payload, 
                    pin: App.state.pinAcceso 
                };
                
                const response = await fetch(this.gasUrl, { method: 'POST', body: JSON.stringify(bodyRequest) });
                const text = await response.text(); 
                try { 
                    const data = JSON.parse(text); 
                    // Si el servidor nos rechaza por el PIN, borramos el PIN viejo
                    if (data.message === "Acceso Denegado. PIN incorrecto.") {
                        localStorage.removeItem('erp_pin');
                        App.state.pinAcceso = null;
                        App.router.handleRoute(); // Forzamos la pantalla de login
                    }
                    return data;
                } catch (e) { return { status: "error", message: "Error de servidor." }; }
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
        // --- NUEVO: FUNCIÓN PARA VALIDAR EL PIN ---
        async verificarPIN(pinIngresado) {
            App.ui.showLoader("Verificando acceso...");
            App.state.pinAcceso = pinIngresado; // Lo guardamos temporalmente para hacer la prueba
            
            // Hacemos un "ping" al servidor para ver si la llave abre la puerta
            const res = await App.api.fetch("ping");
            
            if (res.status === "success") {
                // Si la puerta se abre, lo guardamos permanentemente en el celular
                localStorage.setItem('erp_pin', pinIngresado);
                App.ui.toast("¡Acceso concedido!");
                // Ahora sí, descargamos la información
                this.cargarDatosIniciales();
            } else {
                // Si la puerta no abre, borramos el temporal y mostramos error
                App.state.pinAcceso = null;
                App.ui.hideLoader();
                App.ui.toast("PIN Incorrecto. Intenta de nuevo.");
            }
        },
        
        async cargarDatosIniciales() {
            App.ui.toast("Descargando base de datos...");
            try {
                const [resMat, resCli, resProd, resPed, resDet, resOrd, resArt, resAbo, resGas] = await Promise.all([
                    App.api.fetch("leer_hoja", { nombreHoja: "materiales" }), App.api.fetch("leer_hoja", { nombreHoja: "clientes" }), App.api.fetch("leer_hoja", { nombreHoja: "productos" }), App.api.fetch("leer_hoja", { nombreHoja: "pedidos" }), App.api.fetch("leer_hoja", { nombreHoja: "pedido_detalle" }), App.api.fetch("leer_hoja", { nombreHoja: "ordenes_produccion" }), App.api.fetch("leer_hoja", { nombreHoja: "artesanos" }), App.api.fetch("leer_hoja", { nombreHoja: "abonos_clientes" }), App.api.fetch("leer_hoja", { nombreHoja: "gastos" })
                ]);
                if (resMat.status === "error") throw new Error(resMat.message);
                App.state.inventario = resMat.data || []; App.state.clientes = resCli.data || []; App.state.productos = resProd.data || []; App.state.pedidos = resPed.data || []; App.state.pedido_detalle = resDet.data || []; App.state.ordenes_produccion = resOrd.data || []; App.state.artesanos = resArt.data || []; App.state.abonos = resAbo.data || []; App.state.gastos = resGas.data || [];
                App.ui.hideLoader(); App.router.init();
            } catch (error) { App.ui.toast("Error: " + error.message); document.getElementById('btn-reintentar').classList.remove('hidden'); }
        },

        enviarWhatsApp(pedidoId) { const p = App.state.pedidos.find(x => x.id === pedidoId); const c = App.state.clientes.find(cli => cli.id === p.cliente_id); const detalle = App.state.pedido_detalle.find(d => d.pedido_id === p.id); const producto = detalle ? App.state.productos.find(prod => prod.id === detalle.producto_id) : null; const abonos = App.state.abonos.filter(a => a.pedido_id === p.id).reduce((s, a) => s + parseFloat(a.monto||0), 0); const saldoReal = parseFloat(p.total) - parseFloat(p.anticipo) - abonos; if(!c || !c.telefono) { App.ui.toast("El cliente no tiene teléfono registrado."); return; } let texto = `Hola *${c.nombre}* 👋,\nSomos de *Descanso Maya*.\n\nTe compartimos el detalle de tu pedido:\n📦 *Producto:* ${producto ? producto.nombre : 'Hamaca'}\n${p.notas ? `📝 *Detalles:* ${p.notas}\n` : ''}\n💰 *Total:* $${p.total}\n✅ *Anticipo/Abonos:* $${parseFloat(p.anticipo) + abonos}\n⚠️ *Saldo Pendiente:* $${saldoReal > 0 ? saldoReal : 0}\n${p.fecha_entrega ? `\n📅 *Fecha de entrega:* ${p.fecha_entrega}\n` : ''}\n¡Gracias por tu preferencia! ✨`; let tel = String(c.telefono).replace(/\D/g,''); if(tel.length === 10) tel = '52' + tel; window.location.href = `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`; },
        imprimirNota(pedidoId) { const p = App.state.pedidos.find(x => x.id === pedidoId); const c = App.state.clientes.find(cli => cli.id === p.cliente_id); const detalle = App.state.pedido_detalle.find(d => d.pedido_id === p.id); const producto = detalle ? App.state.productos.find(prod => prod.id === detalle.producto_id) : null; const abonosDelPedido = App.state.abonos.filter(a => a.pedido_id === p.id); const totalAbonado = abonosDelPedido.reduce((s, a) => s + parseFloat(a.monto||0), 0); const saldoReal = parseFloat(p.total) - parseFloat(p.anticipo) - totalAbonado; const ventana = window.open('', '_blank'); let htmlNota = `<html><head><title>Nota ${p.id}</title><style>body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; color: #333; } .header { text-align: center; border-bottom: 2px dashed #ccc; padding-bottom: 10px; margin-bottom: 20px; } .header h1 { margin: 0; font-size: 24px; color: #6B46C1; } .header p { margin: 5px 0; font-size: 14px; color: #666; } .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; } .total-box { border-top: 2px solid #333; margin-top: 15px; padding-top: 15px; } .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; margin-bottom: 10px;} .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #777; border-top: 1px dashed #ccc; padding-top: 15px;} @media print { body { padding: 0; } }</style></head><body><div class="header"><h1>Descanso Maya</h1><p>Nota de Pedido</p><p><strong>Folio:</strong> ${p.id.replace('PED-','')}</p><p><strong>Fecha:</strong> ${new Date(p.fecha_creacion).toLocaleDateString()}</p></div><div class="row"><span><strong>Cliente:</strong></span> <span>${c.nombre}</span></div><div class="row"><span><strong>Teléfono:</strong></span> <span>${c.telefono || 'N/A'}</span></div>${p.fecha_entrega ? `<div class="row"><span><strong>Entrega:</strong></span> <span>${p.fecha_entrega}</span></div>` : ''}<h3 style="font-size: 16px; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 20px;">Detalle del Artículo</h3><div class="row"><span>${detalle ? detalle.cantidad : 1}x ${producto ? producto.nombre : 'Artículo general'}</span> <span>$${p.total}</span></div>${p.notas ? `<p style="font-size: 13px; font-style: italic; color: #555;">Notas: ${p.notas}</p>` : ''}<div class="total-box"><div class="row"><span>Subtotal:</span> <span>$${p.total}</span></div><div class="row"><span>Anticipo:</span> <span>-$${p.anticipo}</span></div>${totalAbonado > 0 ? `<div class="row"><span>Abonos Posteriores:</span> <span>-$${totalAbonado}</span></div>` : ''}<div class="total-row" style="font-size: 18px; margin-top: 15px;"><span>Saldo a Pagar:</span> <span>$${saldoReal > 0 ? saldoReal : 0}</span></div></div><div class="footer"><p>¡Gracias por tu compra y por apoyar lo hecho a mano! 🧶</p><p>Síguenos en nuestras redes sociales.</p></div><script>window.onload = function() { window.print(); }</script></body></html>`; ventana.document.write(htmlNota); ventana.document.close(); },

        async guardarAbono(datos) { App.ui.showLoader("Registrando pago..."); const nuevoAbono = { id: "ABO-" + Date.now(), pedido_id: datos.pedido_id, cliente_id: datos.cliente_id, monto: parseFloat(datos.monto) || 0, nota: datos.nota || "Pago de saldo", fecha: new Date().toISOString() }; const res = await App.api.fetch("guardar_fila", { nombreHoja: "abonos_clientes", datos: nuevoAbono }); App.ui.hideLoader(); if (res.status === "success") { App.state.abonos.push(nuevoAbono); App.ui.toast("¡Pago registrado!"); App.router.handleRoute(); } else { App.ui.toast("Error al guardar"); } },
        async guardarNuevoGasto(datos) { App.ui.showLoader("Registrando gasto..."); datos.id = "GAS-" + Date.now(); datos.monto = parseFloat(datos.monto) || 0; const res = await App.api.fetch("guardar_fila", { nombreHoja: "gastos", datos: datos }); App.ui.hideLoader(); if (res.status === "success") { App.state.gastos.push(datos); App.ui.toast("Gasto registrado"); App.router.handleRoute(); } else { App.ui.toast("Error al guardar"); } },
        async guardarNuevoCliente(datos) { App.ui.showLoader("Guardando..."); datos.id = "CLI-" + Date.now(); datos.fecha_creacion = new Date().toISOString(); const res = await App.api.fetch("guardar_fila", { nombreHoja: "clientes", datos: datos }); App.ui.hideLoader(); if (res.status === "success") { App.ui.toast("Cliente guardado"); App.state.clientes.push(datos); App.router.handleRoute(); } else App.ui.toast("Error"); },
        async guardarNuevoProducto(datos) { App.ui.showLoader("Guardando..."); datos.id = "PROD-" + Date.now(); datos.precio_venta = parseFloat(datos.precio_venta) || 0; datos.activo = "TRUE"; const res = await App.api.fetch("guardar_fila", { nombreHoja: "productos", datos: datos }); App.ui.hideLoader(); if (res.status === "success") { App.ui.toast("Producto creado"); App.state.productos.push(datos); App.router.handleRoute(); } else App.ui.toast("Error"); },
        async guardarNuevoPedido(datosFormulario) { App.ui.showLoader("Creando pedido..."); const pedidoId = "PED-" + Date.now(); const totalNum = parseFloat(datosFormulario.total) || 0; const anticipoNum = parseFloat(datosFormulario.anticipo) || 0; const cantidadNum = parseInt(datosFormulario.cantidad) || 1; const datosPedido = { id: pedidoId, cliente_id: datosFormulario.cliente_id, estado: "nuevo", total: totalNum, anticipo: anticipoNum, notas: datosFormulario.notas, fecha_entrega: datosFormulario.fecha_entrega, fecha_creacion: new Date().toISOString() }; const datosDetalle = { id: "PDET-" + Date.now(), pedido_id: pedidoId, producto_id: datosFormulario.producto_id, cantidad: cantidadNum, precio_unitario: totalNum / cantidadNum }; const resPedido = await App.api.fetch("guardar_fila", { nombreHoja: "pedidos", datos: datosPedido }); if (resPedido.status === "success") { await App.api.fetch("guardar_fila", { nombreHoja: "pedido_detalle", datos: datosDetalle }); App.state.pedidos.push(datosPedido); App.state.pedido_detalle.push(datosDetalle); App.ui.hideLoader(); App.ui.toast("Pedido registrado"); App.router.handleRoute(); } else { App.ui.hideLoader(); App.ui.toast("Error"); } },
        async mandarAProduccion(pedidoId) { App.ui.showLoader("Generando Orden..."); const detalle = App.state.pedido_detalle.find(d => d.pedido_id === pedidoId); if (!detalle) { App.ui.hideLoader(); App.ui.toast("Error: Pedido sin detalle"); return; } const nuevaOrden = { id: "ORD-" + Date.now(), pedido_detalle_id: detalle.id, estado: "pendiente", fecha_creacion: new Date().toISOString() }; const res = await App.api.fetch("guardar_fila", { nombreHoja: "ordenes_produccion", datos: nuevaOrden }); App.ui.hideLoader(); if (res.status === "success") { App.state.ordenes_produccion.push(nuevaOrden); App.ui.toast("¡Enviado a producción!"); App.router.navigate('produccion'); } else App.ui.toast("Error"); },
        async actualizarOrdenProduccion(ordenId, nuevosDatos) { App.ui.showLoader("Actualizando..."); const res = await App.api.fetch("actualizar_fila", { nombreHoja: "ordenes_produccion", idFila: ordenId, datosNuevos: nuevosDatos }); App.ui.hideLoader(); if (res.status === "success") { const ordenIndex = App.state.ordenes_produccion.findIndex(o => o.id === ordenId); if (ordenIndex !== -1) { App.state.ordenes_produccion[ordenIndex] = { ...App.state.ordenes_produccion[ordenIndex], ...nuevosDatos }; } App.ui.toast("Orden actualizada"); App.router.handleRoute(); } else { App.ui.toast("Error al actualizar"); } }
    },

    views: {
        // --- NUEVA VISTA: PANTALLA DE LOGIN ---
        login() {
            // Ocultar la barra de navegación inferior mientras estamos en el login
            document.getElementById('bottom-nav').style.display = 'none';
            
            return `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 80vh; text-align: center;">
                    <div style="background: var(--primary); color: white; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin-bottom: 20px;">🔒</div>
                    <h2 style="margin-bottom: 10px; color: var(--primary-dark);">Descanso Maya</h2>
                    <p style="color: var(--text-muted); margin-bottom: 30px;">Ingresa el PIN de acceso al sistema ERP</p>
                    
                    <div class="card" style="width: 100%; max-width: 320px;">
                        <input type="password" id="pin-input" placeholder="Ingresa el PIN" style="width: 100%; padding: 12px; font-size: 1.2rem; text-align: center; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 15px;">
                        <button class="btn btn-primary" style="width: 100%; padding: 12px; font-size: 1rem;" onclick="App.logic.verificarPIN(document.getElementById('pin-input').value)">Entrar al Sistema</button>
                    </div>
                </div>
            `;
        },

        inicio() { document.getElementById('bottom-nav').style.display = 'flex'; return `<div class="grid-2"><div class="card stat-card"><div class="label">Pedidos</div><div class="value">${App.state.pedidos.length}</div></div><div class="card stat-card"><div class="label">Producción</div><div class="value">${App.state.ordenes_produccion.filter(o => o.estado !== 'listo').length}</div></div><div class="card stat-card"><div class="label">Materiales</div><div class="value">${App.state.inventario.length}</div></div><div class="card stat-card" onclick="App.router.navigate('finanzas')" style="cursor:pointer; background: #EBF8FF;"><div class="label" style="color:#3182CE;">Ver Finanzas</div><div class="value">📊</div></div></div>`; },
        finanzas() { const totalVentas = App.state.pedidos.reduce((acc, p) => acc + (parseFloat(p.total) || 0), 0); const totalAnticipos = App.state.pedidos.reduce((acc, p) => acc + (parseFloat(p.anticipo) || 0), 0); const totalAbonos = App.state.abonos.reduce((acc, a) => acc + (parseFloat(a.monto) || 0), 0); const ingresosReales = totalAnticipos + totalAbonos; const porCobrar = totalVentas - ingresosReales; const totalGastos = App.state.gastos.reduce((acc, g) => acc + (parseFloat(g.monto) || 0), 0); const balanceNeto = ingresosReales - totalGastos; let html = `<div class="card"><h3 class="card-title">Dashboard Financiero</h3><div class="grid-2"><div class="card stat-card" style="background: #EBF8FF;"><div class="label">Ventas Totales</div><div class="value" style="color: #3182CE; font-size: 1.2rem;">$${totalVentas}</div></div><div class="card stat-card" style="background: #C6F6D5;"><div class="label">Cobrado (Ingresos)</div><div class="value" style="color: #38A169; font-size: 1.2rem;">$${ingresosReales}</div></div><div class="card stat-card" style="background: #FEFCBF;"><div class="label">Por Cobrar</div><div class="value" style="color: #D69E2E; font-size: 1.2rem;">$${porCobrar}</div></div><div class="card stat-card" style="background: #FED7D7;"><div class="label">Gastos Totales</div><div class="value" style="color: #E53E3E; font-size: 1.2rem;">$${totalGastos}</div></div></div><div class="card stat-card" style="margin-top:10px; border: 2px solid ${balanceNeto >= 0 ? 'var(--success)' : 'var(--danger)'};"><div class="label">Flujo Neto Efectivo</div><div class="value" style="color: ${balanceNeto >= 0 ? 'var(--success)' : 'var(--danger)'};">$${balanceNeto}</div></div></div><div class="card"><h3 class="card-title">Últimos Gastos Registrados</h3>`; if (App.state.gastos.length === 0) { html += `<p style="color: var(--text-muted); font-size: 0.9rem;">No hay gastos registrados aún.</p>`; } else { [...App.state.gastos].reverse().slice(0, 15).forEach(g => { html += `<div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding: 10px 0;"><div><strong style="font-size: 0.95rem;">${g.descripcion}</strong><br><small style="color: var(--text-muted);">${g.categoria} | ${g.fecha}</small></div><strong style="color: var(--danger); font-size: 1rem;">-$${g.monto}</strong></div>`; }); } html += `</div><button class="fab" style="background: var(--danger);" onclick="App.views.formNuevoGasto()">+</button>`; return html; },
        formNuevoGasto() { const formHTML = `<form id="dynamic-form"><div class="form-group"><label>Descripción del Gasto</label><input type="text" name="descripcion" required></div><div class="form-group"><label>Categoría</label><select name="categoria" required><option value="materiales">Materiales</option><option value="servicios">Servicios</option><option value="herramientas">Herramientas</option><option value="otro">Otro</option></select></div><div class="form-group"><label>Monto ($)</label><input type="number" name="monto" required></div><div class="form-group"><label>Fecha</label><input type="date" name="fecha" value="${new Date().toISOString().split('T')[0]}" required></div><button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px; background: var(--danger); border-color: var(--danger);">Registrar Gasto</button></form>`; App.ui.openSheet("Nuevo Gasto", formHTML, (data) => App.logic.guardarNuevoGasto(data)); },
        pedidos() {
            document.getElementById('bottom-nav').style.display = 'flex';
            let html = `<div class="card"><h3 class="card-title">Historial de Pedidos</h3>`;
            if (App.state.pedidos.length === 0) html += `<p style="color: var(--text-muted);">No hay pedidos.</p>`;
            else {
                [...App.state.pedidos].reverse().slice(0, 50).forEach(p => {
                    const c = App.state.clientes.find(cli => cli.id === p.cliente_id); const detalle = App.state.pedido_detalle.find(d => d.pedido_id === p.id); const producto = detalle ? App.state.productos.find(prod => prod.id === detalle.producto_id) : null; const nombreProducto = producto ? producto.nombre : 'Producto no especificado'; const tieneOrden = detalle ? App.state.ordenes_produccion.some(o => o.pedido_detalle_id === detalle.id) : false;
                    const abonosDelPedido = App.state.abonos.filter(a => a.pedido_id === p.id); const totalAbonado = abonosDelPedido.reduce((sum, a) => sum + parseFloat(a.monto || 0), 0); const saldoReal = parseFloat(p.total || 0) - parseFloat(p.anticipo || 0) - totalAbonado; const estaPagado = saldoReal <= 0;
                    html += `<div class="card" style="border: 1px solid var(--border); box-shadow: none;"><div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><strong>${p.id} - ${c ? c.nombre : 'Cliente'}</strong>${estaPagado ? `<span class="badge" style="background: var(--success); color: white;">PAGADO</span>` : `<span class="badge ${p.estado || 'nuevo'}">${(p.estado || 'Nuevo').toUpperCase()}</span>`}</div><p style="color: var(--primary); font-size: 0.9rem; font-weight: bold; margin-bottom: 5px;">${nombreProducto}</p><div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--border);"><div><small style="color: var(--text-muted); display: block;">Total: $${p.total || 0}</small><strong style="color: ${estaPagado ? 'var(--success)' : 'var(--danger)'}; font-size: 0.95rem;">Saldo: $${saldoReal > 0 ? saldoReal : 0}</strong></div><div style="display: flex; gap: 8px;">${!tieneOrden && detalle ? `<button class="btn btn-secondary" style="padding: 6px 10px; font-size: 0.8rem;" onclick="App.logic.mandarAProduccion('${p.id}')">🔨</button>` : ''}${!estaPagado ? `<button class="btn btn-primary" style="padding: 6px 10px; font-size: 0.8rem; background: var(--success); border-color: var(--success);" onclick="App.views.formCobrar('${p.id}', '${c.id}', ${saldoReal})">💰</button>` : ''}</div></div><div style="display: flex; gap: 10px; margin-top: 15px;"><button class="btn" style="flex: 1; font-size: 0.8rem; border-color: #38A169; color: #38A169;" onclick="App.logic.enviarWhatsApp('${p.id}')">💬 WhatsApp</button><button class="btn" style="flex: 1; font-size: 0.8rem; border-color: var(--primary); color: var(--primary);" onclick="App.logic.imprimirNota('${p.id}')">🖨️ PDF</button></div></div>`;
                });
            } return html += `</div><button class="fab" onclick="App.views.formNuevoPedido()">+</button>`;
        },
        formCobrar(pedidoId, clienteId, saldoPendiente) { const formHTML = `<form id="dynamic-form"><input type="hidden" name="pedido_id" value="${pedidoId}"><input type="hidden" name="cliente_id" value="${clienteId}"><div style="text-align: center; margin-bottom: 15px;"><p style="color: var(--text-muted); font-size: 0.9rem;">Saldo pendiente</p><h2 style="color: var(--danger);">$${saldoPendiente}</h2></div><div class="form-group"><label>Monto a abonar ($)</label><input type="number" name="monto" value="${saldoPendiente}" max="${saldoPendiente}" required></div><div class="form-group"><label>Método de pago / Nota</label><input type="text" name="nota" placeholder="Ej. Efectivo..." required></div><button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px; background: var(--success); border-color: var(--success);">Confirmar Pago</button></form>`; App.ui.openSheet(`Pago ${pedidoId}`, formHTML, (data) => App.logic.guardarAbono(data)); },
        produccion() { document.getElementById('bottom-nav').style.display = 'flex'; let html = `<div class="card"><h3 class="card-title">Tablero Kanban</h3></div>`; const pendientes = App.state.ordenes_produccion.filter(o => o.estado === 'pendiente' || !o.estado); const enProceso = App.state.ordenes_produccion.filter(o => o.estado === 'en_proceso'); const listas = App.state.ordenes_produccion.filter(o => o.estado === 'listo'); const dibujarTarjeta = (orden) => { const detalle = App.state.pedido_detalle.find(d => d.id === orden.pedido_detalle_id); const producto = detalle ? App.state.productos.find(p => p.id === detalle.producto_id) : null; const artesano = App.state.artesanos.find(a => a.id === orden.artesano_id); return `<div class="kanban-card" onclick="App.views.modalEditarOrden('${orden.id}')"><strong>${orden.id}</strong><br><small style="color: var(--primary); font-weight: 600;">${producto ? producto.nombre : 'Producto interno'}</small><div style="margin-top: 8px; font-size: 0.8rem; color: var(--text-muted); display:flex; justify-content: space-between;"><span>${artesano ? '👤 ' + artesano.nombre : '👤 Sin asignar'}</span></div></div>`; }; html += `<div class="kanban-board"><div class="kanban-column"><div class="kanban-header">Pendientes <span>${pendientes.length}</span></div>${pendientes.map(dibujarTarjeta).join('') || '<p style="color:#aaa; text-align:center;">Vacío</p>'}</div><div class="kanban-column"><div class="kanban-header">En Proceso <span>${enProceso.length}</span></div>${enProceso.map(dibujarTarjeta).join('') || '<p style="color:#aaa; text-align:center;">Vacío</p>'}</div><div class="kanban-column"><div class="kanban-header">Listas <span>${listas.length}</span></div>${listas.map(dibujarTarjeta).join('') || '<p style="color:#aaa; text-align:center;">Vacío</p>'}</div></div>`; return html; },
        modalEditarOrden(ordenId) { const orden = App.state.ordenes_produccion.find(o => o.id === ordenId); const detalle = App.state.pedido_detalle.find(d => d.id === orden.pedido_detalle_id); const producto = detalle ? App.state.productos.find(p => p.id === detalle.producto_id) : null; const opcionesArtesanos = App.state.artesanos.map(a => `<option value="${a.id}" ${orden.artesano_id === a.id ? 'selected' : ''}>${a.nombre}</option>`).join(''); const formHTML = `<div style="margin-bottom: 15px;"><strong>Producto a fabricar:</strong><br><span style="color: var(--primary);">${producto ? producto.nombre : 'Desconocido'}</span></div><form id="dynamic-form"><div class="form-group"><label>Asignar Artesano</label><select name="artesano_id"><option value="">-- Sin asignar --</option>${opcionesArtesanos}</select></div><div class="form-group"><label>Estado</label><select name="estado"><option value="pendiente" ${orden.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option><option value="en_proceso" ${orden.estado === 'en_proceso' ? 'selected' : ''}>En Proceso</option><option value="listo" ${orden.estado === 'listo' ? 'selected' : ''}>Listo para entrega</option></select></div><button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">Guardar Cambios</button></form>`; App.ui.openSheet(`Actualizar ${ordenId}`, formHTML, (datos) => App.logic.actualizarOrdenProduccion(ordenId, datos)); },
        formNuevoPedido() { const opcionesClientes = App.state.clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join(''); const opcionesProductos = App.state.productos.map(p => `<option value="${p.id}">${p.nombre} ($${p.precio_venta})</option>`).join(''); const formHTML = `<form id="dynamic-form"><div class="form-group"><label>Cliente</label><select name="cliente_id" required><option value="">-- Elige un cliente --</option>${opcionesClientes}</select></div><div class="form-group"><label>Producto</label><select name="producto_id" required><option value="">-- Elige un producto --</option>${opcionesProductos}</select></div><div class="form-group"><label>Cantidad</label><input type="number" name="cantidad" value="1" min="1" required></div><div class="form-group"><label>Precio Total ($)</label><input type="number" name="total" required></div><div class="form-group"><label>Anticipo Pagado ($)</label><input type="number" name="anticipo" value="0" required></div><button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">Crear Pedido</button></form>`; App.ui.openSheet("Nuevo Pedido", formHTML, (data) => App.logic.guardarNuevoPedido(data)); },
        formNuevoCliente() { const formHTML = `<form id="dynamic-form"><div class="form-group"><label>Nombre</label><input type="text" name="nombre" required></div><div class="form-group"><label>Teléfono</label><input type="tel" name="telefono" placeholder="Ej. 9991234567" required></div><div class="form-group"><label>Dirección</label><input type="text" name="direccion"></div><button type="submit" class="btn btn-primary" style="width: 100%;">Guardar Cliente</button></form>`; App.ui.openSheet("Nuevo Cliente", formHTML, (data) => App.logic.guardarNuevoCliente(data)); },
        formNuevoProducto() { const formHTML = `<form id="dynamic-form"><div class="form-group"><label>Nombre del Producto</label><input type="text" name="nombre" required></div><div class="form-group"><label>Categoría</label><select name="categoria"><option value="fabricacion">Fabricación</option><option value="reventa">Reventa</option></select></div><div class="form-group"><label>Precio de Venta ($)</label><input type="number" name="precio_venta" required></div><button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">Guardar Producto</button></form>`; App.ui.openSheet("Nuevo Producto", formHTML, (data) => App.logic.guardarNuevoProducto(data)); },
        inventario() { document.getElementById('bottom-nav').style.display = 'flex'; let html = `<div class="card"><h3 class="card-title">Stock Actual</h3><table style="width:100%; border-collapse: collapse; font-size: 0.9rem;"><tr style="border-bottom: 2px solid var(--border);"><th style="text-align:left; padding:8px;">Material</th><th style="padding:8px;">Stock</th></tr>`; App.state.inventario.forEach(i => { html += `<tr style="border-bottom: 1px solid var(--border);"><td style="padding: 10px 5px;">${i.nombre}</td><td style="padding: 10px 5px; text-align:center;">${i.stock_actual} ${i.unidad}</td></tr>`; }); html += `</table></div>`; return html; },
        productos() { document.getElementById('bottom-nav').style.display = 'flex'; let html = `<div class="card"><h3 class="card-title">Catálogo</h3>`; App.state.productos.forEach(p => { html += `<div class="card" style="border: 1px solid var(--border); box-shadow: none; padding: 12px;"><div style="display: flex; justify-content: space-between;"><strong>${p.nombre}</strong><span style="color: var(--primary); font-weight: bold;">$${p.precio_venta}</span></div><small style="color: var(--text-muted);">${p.categoria}</small></div>`; }); html += `</div><button class="fab" onclick="App.views.formNuevoProducto()">+</button>`; return html; },
        clientes() { document.getElementById('bottom-nav').style.display = 'flex'; let html = `<div class="card"><h3 class="card-title">Directorio</h3>`; App.state.clientes.forEach(c => { html += `<div class="card" style="border: 1px solid var(--border); padding: 10px; margin-bottom: 8px;"><strong>${c.nombre}</strong><br><small style="color: var(--text-muted);">📞 ${c.telefono || 'Sin teléfono'}</small></div>`; }); html += `</div><button class="fab" onclick="App.views.formNuevoCliente()">+</button>`; return html; },
        mas() { document.getElementById('bottom-nav').style.display = 'flex'; return `<div class="grid-2"><div class="card stat-card" style="cursor:pointer;" onclick="App.router.navigate('clientes')"><div class="label" style="margin-top:0;">Clientes</div></div><div class="card stat-card" style="cursor:pointer;" onclick="App.router.navigate('productos')"><div class="label" style="margin-top:0;">Productos</div></div><div class="card stat-card" style="cursor:pointer; background: #EBF8FF;" onclick="App.router.navigate('finanzas')"><div class="label" style="margin-top:0; color:#3182CE;">Finanzas y Gastos</div></div><div class="card stat-card" style="cursor:pointer; background: #FED7D7;" onclick="localStorage.removeItem('erp_pin'); location.reload();"><div class="label" style="margin-top:0; color:var(--danger);">Cerrar Sesión</div></div></div>`; }
    },
    router: { 
        init() { window.addEventListener('hashchange', () => this.handleRoute()); this.handleRoute(); }, 
        navigate(route) { window.location.hash = route; }, 
        handleRoute() { 
            // NUEVO: Redirigir siempre a login si no hay PIN
            if (!App.state.pinAcceso) {
                document.getElementById('app-content').innerHTML = App.views.login();
                document.getElementById('header-title').textContent = "Acceso";
                return;
            }

            let hash = window.location.hash.substring(1) || 'inicio'; 
            const contentDiv = document.getElementById('app-content'); 
            const titleEl = document.getElementById('header-title'); 
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active')); 
            const activeNav = document.querySelector(`.nav-item[data-view="${hash}"]`); 
            if(activeNav) activeNav.classList.add('active'); 
            if (App.views[hash]) { contentDiv.innerHTML = App.views[hash](); titleEl.textContent = hash.charAt(0).toUpperCase() + hash.slice(1); } 
            else { contentDiv.innerHTML = `<div class="card"><p>Módulo en desarrollo.</p></div>`; } 
        } 
    },
    start() { 
        this.ui.init(); 
        // NUEVO: Si no hay PIN, mostramos pantalla de login, si sí hay, descargamos datos
        if (!this.state.pinAcceso) {
            this.router.init(); // El router lo mandará a login automáticamente
        } else {
            this.logic.cargarDatosIniciales(); 
        }
    }
};
document.addEventListener('DOMContentLoaded', () => App.start());