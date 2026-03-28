/**
 * DESCANSO MAYA ERP - Motor Principal v8
 * Asignación de Artesanos y Movimiento en Kanban
 */

const App = {
    state: {
        config: { empresa: "Descanso Maya", moneda: "MXN" },
        pedidos: [],
        pedido_detalle: [],
        ordenes_produccion: [],
        artesanos: [],
        inventario: [], 
        productos: [],
        clientes: []
    },

    api: {
        gasUrl: "https://script.google.com/macros/s/AKfycbxL3KzjesyZIfiC-Dyr0SwwzwNnPsv5FgHpt-JhyscNpN1eTvRwAh_rdgoxdVnKTAwu/exec", // <-- ¡PEGA TU URL AQUÍ!
        
        async fetch(action, payload = {}) {
            try {
                const response = await fetch(this.gasUrl, {
                    method: 'POST',
                    body: JSON.stringify({ action: action, payload: payload })
                });
                const text = await response.text(); 
                try { return JSON.parse(text); } 
                catch (e) { return { status: "error", message: "Error de servidor." }; }
            } catch (error) { return { status: "error", message: "Fallo de conexión." }; }
        }
    },

    ui: {
        container: null,
        init() {
            this.container = document.getElementById('overlays');
            const toastCont = document.createElement('div');
            toastCont.className = 'toast-container'; toastCont.id = 'toast-container';
            document.body.appendChild(toastCont);
            const loader = document.createElement('div');
            loader.id = 'global-loader';
            loader.innerHTML = `<div class="spinner"></div><h2 style="margin: 0; font-weight: 600;">Descanso Maya</h2><p id="loader-text" style="margin-top: 10px; opacity: 0.8; font-size: 0.9rem;">Sincronizando módulos...</p><button id="btn-reintentar" class="btn btn-secondary hidden" style="margin-top: 20px;" onclick="location.reload()">Reintentar</button>`;
            document.body.appendChild(loader);
        },
        toast(message) {
            const cont = document.getElementById('toast-container');
            const t = document.createElement('div'); t.className = 'toast'; t.textContent = message;
            cont.appendChild(t); setTimeout(() => t.remove(), 4000);
        },
        showLoader(mensaje = "Procesando...") {
            const loader = document.getElementById('global-loader');
            if(loader) { document.getElementById('loader-text').textContent = mensaje; loader.classList.remove('hidden'); }
        },
        hideLoader() { const loader = document.getElementById('global-loader'); if(loader) loader.classList.add('hidden'); },
        openSheet(title, contentHTML, onSaveCallback) {
            this.container.innerHTML = `<div class="overlay-bg active" id="sheet-bg"></div><div class="bottom-sheet active" id="sheet-content"><div class="sheet-header"><h3>${title}</h3><button class="sheet-close" id="sheet-close">&times;</button></div><div class="sheet-body">${contentHTML}</div></div>`;
            document.getElementById('sheet-close').onclick = this.closeSheet.bind(this);
            document.getElementById('sheet-bg').onclick = this.closeSheet.bind(this);
            const form = document.getElementById('dynamic-form');
            if(form && onSaveCallback) {
                form.onsubmit = (e) => { e.preventDefault(); onSaveCallback(Object.fromEntries(new FormData(form).entries())); this.closeSheet(); };
            }
        },
        closeSheet() { this.container.innerHTML = ''; }
    },

    logic: {
        async cargarDatosIniciales() {
            App.ui.toast("Descargando base de datos...");
            try {
                const [resMat, resCli, resProd, resPed, resDet, resOrd, resArt] = await Promise.all([
                    App.api.fetch("leer_hoja", { nombreHoja: "materiales" }), App.api.fetch("leer_hoja", { nombreHoja: "clientes" }), App.api.fetch("leer_hoja", { nombreHoja: "productos" }), App.api.fetch("leer_hoja", { nombreHoja: "pedidos" }), App.api.fetch("leer_hoja", { nombreHoja: "pedido_detalle" }), App.api.fetch("leer_hoja", { nombreHoja: "ordenes_produccion" }), App.api.fetch("leer_hoja", { nombreHoja: "artesanos" })
                ]);
                if (resMat.status === "error") throw new Error(resMat.message);
                App.state.inventario = resMat.data || []; App.state.clientes = resCli.data || []; App.state.productos = resProd.data || []; App.state.pedidos = resPed.data || []; App.state.pedido_detalle = resDet.data || []; App.state.ordenes_produccion = resOrd.data || []; App.state.artesanos = resArt.data || [];
                App.ui.hideLoader(); App.router.init();
            } catch (error) { App.ui.toast("Error al cargar: " + error.message); document.getElementById('btn-reintentar').classList.remove('hidden'); }
        },
        async guardarNuevoCliente(datos) {
            App.ui.showLoader("Guardando..."); datos.id = "CLI-" + Date.now(); datos.fecha_creacion = new Date().toISOString();
            const res = await App.api.fetch("guardar_fila", { nombreHoja: "clientes", datos: datos });
            App.ui.hideLoader(); if (res.status === "success") { App.ui.toast("Cliente guardado"); App.state.clientes.push(datos); App.router.handleRoute(); } else App.ui.toast("Error");
        },
        async guardarNuevoProducto(datos) {
            App.ui.showLoader("Guardando..."); datos.id = "PROD-" + Date.now(); datos.precio_venta = parseFloat(datos.precio_venta) || 0; datos.activo = "TRUE";
            const res = await App.api.fetch("guardar_fila", { nombreHoja: "productos", datos: datos });
            App.ui.hideLoader(); if (res.status === "success") { App.ui.toast("Producto creado"); App.state.productos.push(datos); App.router.handleRoute(); } else App.ui.toast("Error");
        },
        async guardarNuevoPedido(datosFormulario) {
            App.ui.showLoader("Creando pedido...");
            const pedidoId = "PED-" + Date.now(); const totalNum = parseFloat(datosFormulario.total) || 0; const anticipoNum = parseFloat(datosFormulario.anticipo) || 0; const cantidadNum = parseInt(datosFormulario.cantidad) || 1;
            const datosPedido = { id: pedidoId, cliente_id: datosFormulario.cliente_id, estado: "nuevo", total: totalNum, anticipo: anticipoNum, notas: datosFormulario.notas, fecha_entrega: datosFormulario.fecha_entrega, fecha_creacion: new Date().toISOString() };
            const datosDetalle = { id: "PDET-" + Date.now(), pedido_id: pedidoId, producto_id: datosFormulario.producto_id, cantidad: cantidadNum, precio_unitario: totalNum / cantidadNum };
            const resPedido = await App.api.fetch("guardar_fila", { nombreHoja: "pedidos", datos: datosPedido });
            if (resPedido.status === "success") { await App.api.fetch("guardar_fila", { nombreHoja: "pedido_detalle", datos: datosDetalle }); App.state.pedidos.push(datosPedido); App.state.pedido_detalle.push(datosDetalle); App.ui.hideLoader(); App.ui.toast("Pedido registrado"); App.router.handleRoute(); } else { App.ui.hideLoader(); App.ui.toast("Error"); }
        },
        async mandarAProduccion(pedidoId) {
            App.ui.showLoader("Generando Orden...");
            const detalle = App.state.pedido_detalle.find(d => d.pedido_id === pedidoId);
            if (!detalle) { App.ui.hideLoader(); App.ui.toast("Error: Pedido sin detalle"); return; }
            const nuevaOrden = { id: "ORD-" + Date.now(), pedido_detalle_id: detalle.id, estado: "pendiente", fecha_creacion: new Date().toISOString() };
            const res = await App.api.fetch("guardar_fila", { nombreHoja: "ordenes_produccion", datos: nuevaOrden });
            App.ui.hideLoader(); if (res.status === "success") { App.state.ordenes_produccion.push(nuevaOrden); App.ui.toast("¡Enviado a producción!"); App.router.navigate('produccion'); } else App.ui.toast("Error");
        },
        
        // --- NUEVO: ACTUALIZAR ORDEN KANBAN ---
        async actualizarOrdenProduccion(ordenId, nuevosDatos) {
            App.ui.showLoader("Actualizando...");
            const res = await App.api.fetch("actualizar_fila", { 
                nombreHoja: "ordenes_produccion", 
                idFila: ordenId, 
                datosNuevos: nuevosDatos 
            });
            App.ui.hideLoader();
            
            if (res.status === "success") {
                // Actualizamos el dato en la memoria para que se vea reflejado
                const ordenIndex = App.state.ordenes_produccion.findIndex(o => o.id === ordenId);
                if (ordenIndex !== -1) {
                    App.state.ordenes_produccion[ordenIndex] = { ...App.state.ordenes_produccion[ordenIndex], ...nuevosDatos };
                }
                App.ui.toast("Orden actualizada");
                App.router.handleRoute(); // Refrescamos el Kanban
            } else {
                App.ui.toast("Error al actualizar");
            }
        }
    },

    views: {
        inicio() { return `<div class="grid-2"><div class="card stat-card"><div class="label">Pedidos</div><div class="value">${App.state.pedidos.length}</div></div><div class="card stat-card"><div class="label">Producción</div><div class="value">${App.state.ordenes_produccion.filter(o => o.estado !== 'listo').length}</div></div><div class="card stat-card"><div class="label">Materiales</div><div class="value">${App.state.inventario.length}</div></div><div class="card stat-card"><div class="label">Productos</div><div class="value">${App.state.productos.length}</div></div></div>`; },
        pedidos() {
            let html = `<div class="card"><h3 class="card-title">Historial de Pedidos</h3>`;
            if (App.state.pedidos.length === 0) html += `<p style="color: var(--text-muted);">No hay pedidos.</p>`;
            else {
                [...App.state.pedidos].reverse().slice(0, 50).forEach(p => {
                    const c = App.state.clientes.find(cli => cli.id === p.cliente_id); const detalle = App.state.pedido_detalle.find(d => d.pedido_id === p.id); const producto = detalle ? App.state.productos.find(prod => prod.id === detalle.producto_id) : null; const nombreProducto = producto ? producto.nombre : 'Producto no especificado'; const tieneOrden = detalle ? App.state.ordenes_produccion.some(o => o.pedido_detalle_id === detalle.id) : false;
                    html += `<div class="card" style="border: 1px solid var(--border); box-shadow: none;"><div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><strong>${p.id} - ${c ? c.nombre : 'Cliente'}</strong><span class="badge ${p.estado || 'nuevo'}">${(p.estado || 'Nuevo').toUpperCase()}</span></div><p style="color: var(--primary); font-size: 0.9rem; font-weight: bold; margin-bottom: 5px;">${nombreProducto} (Cant: ${detalle ? detalle.cantidad : 1})</p><div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;"><small style="color: var(--text-muted);">Saldo: $${(p.total - p.anticipo) || 0}</small>${!tieneOrden && detalle ? `<button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="App.logic.mandarAProduccion('${p.id}')">🔨 Producir</button>` : ''}${tieneOrden ? `<span class="badge" style="background: #E2E8F0; color: #4A5568;">En Taller</span>` : ''}</div></div>`;
                });
            } return html += `</div><button class="fab" onclick="App.views.formNuevoPedido()">+</button>`;
        },
        
        produccion() {
            let html = `<div class="card"><h3 class="card-title">Tablero Kanban</h3></div>`;
            const pendientes = App.state.ordenes_produccion.filter(o => o.estado === 'pendiente' || !o.estado);
            const enProceso = App.state.ordenes_produccion.filter(o => o.estado === 'en_proceso');
            const listas = App.state.ordenes_produccion.filter(o => o.estado === 'listo');

            const dibujarTarjeta = (orden) => {
                const detalle = App.state.pedido_detalle.find(d => d.id === orden.pedido_detalle_id);
                const producto = detalle ? App.state.productos.find(p => p.id === detalle.producto_id) : null;
                const artesano = App.state.artesanos.find(a => a.id === orden.artesano_id);
                
                // NUEVO: onclick llama a la vista de detalles
                return `
                    <div class="kanban-card" onclick="App.views.modalEditarOrden('${orden.id}')">
                        <strong>${orden.id}</strong><br>
                        <small style="color: var(--primary); font-weight: 600;">${producto ? producto.nombre : 'Producto interno'}</small>
                        <div style="margin-top: 8px; font-size: 0.8rem; color: var(--text-muted); display:flex; justify-content: space-between;">
                            <span>${artesano ? '👤 ' + artesano.nombre : '👤 Sin asignar'}</span>
                        </div>
                    </div>
                `;
            };

            html += `<div class="kanban-board"><div class="kanban-column"><div class="kanban-header">Pendientes <span>${pendientes.length}</span></div>${pendientes.map(dibujarTarjeta).join('') || '<p style="color:#aaa; font-size:0.8rem; text-align:center;">Vacío</p>'}</div><div class="kanban-column"><div class="kanban-header">En Proceso <span>${enProceso.length}</span></div>${enProceso.map(dibujarTarjeta).join('') || '<p style="color:#aaa; font-size:0.8rem; text-align:center;">Vacío</p>'}</div><div class="kanban-column"><div class="kanban-header">Listas <span>${listas.length}</span></div>${listas.map(dibujarTarjeta).join('') || '<p style="color:#aaa; font-size:0.8rem; text-align:center;">Vacío</p>'}</div></div>`;
            return html;
        },

        // --- NUEVO: MODAL PARA EDITAR LA ORDEN ---
        modalEditarOrden(ordenId) {
            const orden = App.state.ordenes_produccion.find(o => o.id === ordenId);
            const detalle = App.state.pedido_detalle.find(d => d.id === orden.pedido_detalle_id);
            const producto = detalle ? App.state.productos.find(p => p.id === detalle.producto_id) : null;
            
            // Llenar selectores
            const opcionesArtesanos = App.state.artesanos.map(a => `<option value="${a.id}" ${orden.artesano_id === a.id ? 'selected' : ''}>${a.nombre}</option>`).join('');
            
            const formHTML = `
                <div style="margin-bottom: 15px;">
                    <strong>Producto a fabricar:</strong><br>
                    <span style="color: var(--primary);">${producto ? producto.nombre : 'Desconocido'} (Cant: ${detalle ? detalle.cantidad : 1})</span>
                </div>
                <form id="dynamic-form">
                    <div class="form-group">
                        <label>Asignar Artesano</label>
                        <select name="artesano_id">
                            <option value="">-- Sin asignar --</option>
                            ${opcionesArtesanos}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Estado de Producción</label>
                        <select name="estado">
                            <option value="pendiente" ${orden.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                            <option value="en_proceso" ${orden.estado === 'en_proceso' ? 'selected' : ''}>En Proceso</option>
                            <option value="listo" ${orden.estado === 'listo' ? 'selected' : ''}>Listo para entrega</option>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">Guardar Cambios</button>
                </form>
            `;
            App.ui.openSheet(`Actualizar ${ordenId}`, formHTML, (datos) => App.logic.actualizarOrdenProduccion(ordenId, datos));
        },

        formNuevoPedido() { const opcionesClientes = App.state.clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join(''); const opcionesProductos = App.state.productos.map(p => `<option value="${p.id}">${p.nombre} ($${p.precio_venta})</option>`).join(''); const formHTML = `<form id="dynamic-form"><div class="form-group"><label>Cliente</label><select name="cliente_id" required><option value="">-- Elige un cliente --</option>${opcionesClientes}</select></div><div class="form-group"><label>Producto</label><select name="producto_id" required><option value="">-- Elige un producto --</option>${opcionesProductos}</select></div><div class="form-group"><label>Cantidad</label><input type="number" name="cantidad" value="1" min="1" required></div><div class="form-group"><label>Precio Total ($)</label><input type="number" name="total" required></div><div class="form-group"><label>Anticipo Pagado ($)</label><input type="number" name="anticipo" value="0" required></div><button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">Crear Pedido</button></form>`; App.ui.openSheet("Nuevo Pedido", formHTML, (data) => App.logic.guardarNuevoPedido(data)); },
        formNuevoCliente() { const formHTML = `<form id="dynamic-form"><div class="form-group"><label>Nombre</label><input type="text" name="nombre" required></div><div class="form-group"><label>Teléfono</label><input type="tel" name="telefono"></div><div class="form-group"><label>Dirección</label><input type="text" name="direccion"></div><button type="submit" class="btn btn-primary" style="width: 100%;">Guardar Cliente</button></form>`; App.ui.openSheet("Nuevo Cliente", formHTML, (data) => App.logic.guardarNuevoCliente(data)); },
        formNuevoProducto() { const formHTML = `<form id="dynamic-form"><div class="form-group"><label>Nombre del Producto</label><input type="text" name="nombre" required></div><div class="form-group"><label>Categoría</label><select name="categoria"><option value="fabricacion">Fabricación</option><option value="reventa">Reventa</option></select></div><div class="form-group"><label>Precio de Venta ($)</label><input type="number" name="precio_venta" required></div><button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">Guardar Producto</button></form>`; App.ui.openSheet("Nuevo Producto", formHTML, (data) => App.logic.guardarNuevoProducto(data)); },
        inventario() { let html = `<div class="card"><h3 class="card-title">Stock Actual</h3><table style="width:100%; border-collapse: collapse; font-size: 0.9rem;"><tr style="border-bottom: 2px solid var(--border);"><th style="text-align:left; padding:8px;">Material</th><th style="padding:8px;">Stock</th></tr>`; App.state.inventario.forEach(i => { html += `<tr style="border-bottom: 1px solid var(--border);"><td style="padding: 10px 5px;">${i.nombre}</td><td style="padding: 10px 5px; text-align:center;">${i.stock_actual} ${i.unidad}</td></tr>`; }); html += `</table></div>`; return html; },
        productos() { let html = `<div class="card"><h3 class="card-title">Catálogo</h3>`; App.state.productos.forEach(p => { html += `<div class="card" style="border: 1px solid var(--border); box-shadow: none; padding: 12px;"><div style="display: flex; justify-content: space-between;"><strong>${p.nombre}</strong><span style="color: var(--primary); font-weight: bold;">$${p.precio_venta}</span></div><small style="color: var(--text-muted);">${p.categoria}</small></div>`; }); html += `</div><button class="fab" onclick="App.views.formNuevoProducto()">+</button>`; return html; },
        clientes() { let html = `<div class="card"><h3 class="card-title">Directorio</h3>`; App.state.clientes.forEach(c => { html += `<div class="card" style="border: 1px solid var(--border); padding: 10px; margin-bottom: 8px;"><strong>${c.nombre}</strong><br><small style="color: var(--text-muted);">📞 ${c.telefono || 'Sin teléfono'}</small></div>`; }); html += `</div><button class="fab" onclick="App.views.formNuevoCliente()">+</button>`; return html; },
        mas() { return `<div class="grid-2"><div class="card stat-card" style="cursor:pointer;" onclick="App.router.navigate('clientes')"><div class="label" style="margin-top:0;">Clientes</div></div><div class="card stat-card" style="cursor:pointer;" onclick="App.router.navigate('productos')"><div class="label" style="margin-top:0;">Productos</div></div></div>`; }
    },
    router: {
        init() { window.addEventListener('hashchange', () => this.handleRoute()); this.handleRoute(); },
        navigate(route) { window.location.hash = route; },
        handleRoute() { let hash = window.location.hash.substring(1) || 'inicio'; const contentDiv = document.getElementById('app-content'); const titleEl = document.getElementById('header-title'); document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active')); const activeNav = document.querySelector(`.nav-item[data-view="${hash}"]`); if(activeNav) activeNav.classList.add('active'); if (App.views[hash]) { contentDiv.innerHTML = App.views[hash](); titleEl.textContent = hash.charAt(0).toUpperCase() + hash.slice(1); } else { contentDiv.innerHTML = `<div class="card"><p>Módulo en desarrollo.</p></div>`; } }
    },
    start() { this.ui.init(); this.logic.cargarDatosIniciales(); }
};

document.addEventListener('DOMContentLoaded', () => App.start());