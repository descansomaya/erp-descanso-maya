/**
 * DESCANSO MAYA ERP - Motor Principal v5
 * Pedidos con Detalle Relacional (Producto y Cantidad)
 */

const App = {
    state: {
        config: { empresa: "Descanso Maya", moneda: "MXN" },
        pedidos: [],
        pedido_detalle: [], // NUEVO: Guardaremos el detalle de los pedidos
        produccion: [], 
        inventario: [], 
        productos: [],
        clientes: []
    },

    api: {
        gasUrl: "https://script.google.com/macros/s/AKfycbxL3KzjesyZIfiC-Dyr0SwwzwNnPsv5FgHpt-JhyscNpN1eTvRwAh_rdgoxdVnKTAwu/exec", // <-- ¡PEGA TU URL AQUÍ!
        
        async fetch(action, payload = {}) {
            console.log(`[API] Solicitando: ${action}`, payload);
            try {
                const response = await fetch(this.gasUrl, {
                    method: 'POST',
                    body: JSON.stringify({ action: action, payload: payload })
                });

                const text = await response.text(); 
                
                try {
                    return JSON.parse(text);
                } catch (jsonError) {
                    console.error("El servidor NO devolvió un JSON válido. Respuesta:", text);
                    return { status: "error", message: "Error de permisos en Apps Script." };
                }

            } catch (error) {
                console.error("Error fatal de red:", error);
                return { status: "error", message: "Fallo de conexión." };
            }
        }
    },

    ui: {
        container: null,
        init() {
            this.container = document.getElementById('overlays');
            const toastCont = document.createElement('div');
            toastCont.className = 'toast-container';
            toastCont.id = 'toast-container';
            document.body.appendChild(toastCont);

            const loader = document.createElement('div');
            loader.id = 'global-loader';
            loader.innerHTML = `
                <div class="spinner"></div>
                <h2 style="margin: 0; font-weight: 600;">Descanso Maya</h2>
                <p id="loader-text" style="margin-top: 10px; opacity: 0.8; font-size: 0.9rem;">Sincronizando módulos...</p>
                <div id="loader-error" style="color: #FFCDD2; margin-top: 15px; font-size: 0.85rem; max-width: 80%; text-align: center;"></div>
                <button id="btn-reintentar" class="btn btn-secondary hidden" style="margin-top: 20px;" onclick="location.reload()">Reintentar</button>
            `;
            document.body.appendChild(loader);
        },
        toast(message) {
            const cont = document.getElementById('toast-container');
            const t = document.createElement('div');
            t.className = 'toast';
            t.textContent = message;
            cont.appendChild(t);
            setTimeout(() => t.remove(), 4000);
        },
        showErrorEnPantalla(mensaje) {
            document.querySelector('.spinner').style.display = 'none';
            document.getElementById('loader-text').textContent = "Ocurrió un error:";
            document.getElementById('loader-text').style.color = "var(--danger)";
            document.getElementById('loader-error').textContent = mensaje;
            document.getElementById('btn-reintentar').classList.remove('hidden');
        },
        hideGlobalLoader() {
            const loader = document.getElementById('global-loader');
            if(loader) loader.classList.add('hidden');
        },
        showLoader(mensaje = "Procesando...") {
            const loader = document.getElementById('global-loader');
            if(loader) {
                document.getElementById('loader-text').textContent = mensaje;
                loader.classList.remove('hidden');
            }
        },
        hideLoader() {
            this.hideGlobalLoader();
        },
        openSheet(title, contentHTML, onSaveCallback) {
            this.container.innerHTML = `
                <div class="overlay-bg active" id="sheet-bg"></div>
                <div class="bottom-sheet active" id="sheet-content">
                    <div class="sheet-header">
                        <h3>${title}</h3>
                        <button class="sheet-close" id="sheet-close">&times;</button>
                    </div>
                    <div class="sheet-body">${contentHTML}</div>
                </div>
            `;
            document.getElementById('sheet-close').onclick = this.closeSheet.bind(this);
            document.getElementById('sheet-bg').onclick = this.closeSheet.bind(this);
            
            const form = document.getElementById('dynamic-form');
            if(form && onSaveCallback) {
                form.onsubmit = (e) => {
                    e.preventDefault();
                    const formData = new FormData(form);
                    const data = Object.fromEntries(formData.entries());
                    onSaveCallback(data);
                    this.closeSheet();
                };
            }
        },
        closeSheet() {
            this.container.innerHTML = '';
        }
    },

    logic: {
        async cargarDatosIniciales() {
            App.ui.toast("Descargando base de datos...");
            try {
                // NUEVO: Agregamos pedido_detalle a la carga inicial
                const [resMat, resCli, resProd, resPed, resDet] = await Promise.all([
                    App.api.fetch("leer_hoja", { nombreHoja: "materiales" }),
                    App.api.fetch("leer_hoja", { nombreHoja: "clientes" }),
                    App.api.fetch("leer_hoja", { nombreHoja: "productos" }),
                    App.api.fetch("leer_hoja", { nombreHoja: "pedidos" }),
                    App.api.fetch("leer_hoja", { nombreHoja: "pedido_detalle" })
                ]);

                if (resMat.status === "error") throw new Error(resMat.message);

                App.state.inventario = resMat.data || [];
                App.state.clientes = resCli.data || [];
                App.state.productos = resProd.data || [];
                App.state.pedidos = resPed.data || [];
                App.state.pedido_detalle = resDet.data || [];

                App.ui.hideGlobalLoader();
                App.router.init();

            } catch (error) {
                App.ui.showErrorEnPantalla(error.message);
            }
        },

        async guardarNuevoCliente(datos) {
            App.ui.showLoader("Guardando cliente..."); 
            datos.id = "CLI-" + Date.now();
            datos.fecha_creacion = new Date().toISOString();

            const res = await App.api.fetch("guardar_fila", { nombreHoja: "clientes", datos: datos });
            App.ui.hideLoader();

            if (res.status === "success") {
                App.ui.toast("Cliente guardado");
                App.state.clientes.push(datos);
                App.router.handleRoute();
            } else {
                App.ui.toast("Error al guardar: " + res.message);
            }
        },

        async guardarNuevoPedido(datosFormulario) {
            App.ui.showLoader("Creando pedido y detalle...");
            
            // 1. Preparamos los datos del Pedido general
            const pedidoId = "PED-" + Date.now();
            const totalNum = parseFloat(datosFormulario.total) || 0;
            const anticipoNum = parseFloat(datosFormulario.anticipo) || 0;
            const cantidadNum = parseInt(datosFormulario.cantidad) || 1;

            const datosPedido = {
                id: pedidoId,
                cliente_id: datosFormulario.cliente_id,
                estado: "nuevo",
                total: totalNum,
                anticipo: anticipoNum,
                notas: datosFormulario.notas,
                fecha_entrega: datosFormulario.fecha_entrega,
                fecha_creacion: new Date().toISOString()
            };

            // 2. Preparamos los datos del Detalle del producto
            const datosDetalle = {
                id: "PDET-" + Date.now(),
                pedido_id: pedidoId,
                producto_id: datosFormulario.producto_id,
                cantidad: cantidadNum,
                precio_unitario: totalNum / cantidadNum // Cálculo simple de precio unitario
            };

            // 3. Guardamos en cadena (primero pedido, luego detalle)
            const resPedido = await App.api.fetch("guardar_fila", { nombreHoja: "pedidos", datos: datosPedido });
            
            if (resPedido.status === "success") {
                // Si el pedido se guardó, guardamos el producto
                await App.api.fetch("guardar_fila", { nombreHoja: "pedido_detalle", datos: datosDetalle });
                
                // Actualizamos la memoria
                App.state.pedidos.push(datosPedido);
                App.state.pedido_detalle.push(datosDetalle);
                
                App.ui.hideLoader();
                App.ui.toast("Pedido registrado correctamente");
                App.router.handleRoute();
            } else {
                App.ui.hideLoader();
                App.ui.toast("Error al crear pedido");
            }
        }
    },

    views: {
        inicio() {
            return `
                <div class="grid-2">
                    <div class="card stat-card"><div class="label">Pedidos</div><div class="value">${App.state.pedidos.length}</div></div>
                    <div class="card stat-card"><div class="label">Clientes</div><div class="value">${App.state.clientes.length}</div></div>
                    <div class="card stat-card"><div class="label">Materiales</div><div class="value">${App.state.inventario.length}</div></div>
                    <div class="card stat-card"><div class="label">Productos</div><div class="value">${App.state.productos.length}</div></div>
                </div>
            `;
        },
        pedidos() {
            let html = `<div class="card"><h3 class="card-title">Historial de Pedidos</h3>`;
            if (App.state.pedidos.length === 0) {
                html += `<p style="color: var(--text-muted);">No hay pedidos.</p>`;
            } else {
                [...App.state.pedidos].reverse().slice(0, 50).forEach(p => {
                    const c = App.state.clientes.find(cli => cli.id === p.cliente_id);
                    // NUEVO: Buscamos qué producto compraron
                    const detalle = App.state.pedido_detalle.find(d => d.pedido_id === p.id);
                    const producto = detalle ? App.state.productos.find(prod => prod.id === detalle.producto_id) : null;
                    const nombreProducto = producto ? producto.nombre : 'Producto no especificado';

                    // NUEVO: Al hacer clic, abre un modal con detalles (onclick agregado a la tarjeta)
                    html += `
                        <div class="card" style="border: 1px solid var(--border); box-shadow: none; cursor: pointer;" onclick="App.ui.toast('Detalles: ${nombreProducto} (Cant: ${detalle ? detalle.cantidad : 1})')">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <strong>${p.id} - ${c ? c.nombre : 'Cliente'}</strong>
                                <span class="badge ${p.estado || 'nuevo'}">${(p.estado || 'Nuevo').toUpperCase()}</span>
                            </div>
                            <p style="color: var(--primary); font-size: 0.9rem; font-weight: bold; margin-bottom: 5px;">${nombreProducto}</p>
                            <p style="color: var(--text-muted); font-size: 0.85rem;">
                                Total: $${p.total || 0} | Saldo: $${(p.total - p.anticipo) || 0} <br>
                                <small>Entrega: ${p.fecha_entrega || 'Sin fecha'}</small>
                            </p>
                        </div>
                    `;
                });
            }
            html += `</div>`;
            html += `<button class="fab" onclick="App.views.formNuevoPedido()">+</button>`;
            return html;
        },
        
        formNuevoPedido() {
            const opcionesClientes = App.state.clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
            const opcionesProductos = App.state.productos.map(p => `<option value="${p.id}">${p.nombre} ($${p.precio_venta})</option>`).join('');
            
            const formHTML = `
                <form id="dynamic-form">
                    <div class="form-group">
                        <label>Cliente</label>
                        <select name="cliente_id" required>
                            <option value="">-- Elige un cliente --</option>
                            ${opcionesClientes}
                        </select>
                    </div>
                    <div class="form-group" style="border-top: 1px solid var(--border); padding-top: 10px;">
                        <label>Producto a Fabricar/Vender</label>
                        <select name="producto_id" required>
                            <option value="">-- Elige un producto --</option>
                            ${opcionesProductos}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Cantidad</label>
                        <input type="number" name="cantidad" value="1" min="1" required>
                    </div>
                    <div class="form-group" style="border-top: 1px solid var(--border); padding-top: 10px;">
                        <label>Precio Total del Pedido ($)</label>
                        <input type="number" name="total" required placeholder="0.00">
                    </div>
                    <div class="form-group">
                        <label>Anticipo Pagado ($)</label>
                        <input type="number" name="anticipo" value="0" required placeholder="0.00">
                    </div>
                    <div class="form-group">
                        <label>Fecha de Entrega (Opcional)</label>
                        <input type="date" name="fecha_entrega">
                    </div>
                    <div class="form-group">
                        <label>Notas / Colores Deseados</label>
                        <textarea name="notas" rows="2" placeholder="Ej. Hilo principal rojo, bordes amarillos..."></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">Crear Pedido Completo</button>
                </form>
            `;
            App.ui.openSheet("Nuevo Pedido Completo", formHTML, (data) => App.logic.guardarNuevoPedido(data));
        },

        formNuevoCliente() {
            const formHTML = `
                <form id="dynamic-form">
                    <div class="form-group"><label>Nombre</label><input type="text" name="nombre" required></div>
                    <div class="form-group"><label>Teléfono</label><input type="tel" name="telefono"></div>
                    <div class="form-group"><label>Dirección</label><input type="text" name="direccion"></div>
                    <button type="submit" class="btn btn-primary" style="width: 100%;">Guardar Cliente</button>
                </form>
            `;
            App.ui.openSheet("Nuevo Cliente", formHTML, (data) => App.logic.guardarNuevoCliente(data));
        },
        inventario() {
            let html = `<div class="card"><h3 class="card-title">Stock Actual</h3><table style="width:100%; border-collapse: collapse; font-size: 0.9rem;"><tr style="border-bottom: 2px solid var(--border);"><th style="text-align:left; padding:8px;">Material</th><th style="padding:8px;">Stock</th></tr>`;
            App.state.inventario.forEach(i => { html += `<tr style="border-bottom: 1px solid var(--border);"><td style="padding: 10px 5px;">${i.nombre}</td><td style="padding: 10px 5px; text-align:center;">${i.stock_actual} ${i.unidad}</td></tr>`; });
            html += `</table></div>`; return html;
        },
        productos() {
            let html = `<div class="card"><h3 class="card-title">Catálogo</h3>`;
            App.state.productos.forEach(p => {
                html += `<div class="card" style="border: 1px solid var(--border); box-shadow: none; padding: 12px;"><div style="display: flex; justify-content: space-between;"><strong>${p.nombre}</strong><span style="color: var(--primary); font-weight: bold;">$${p.precio_venta}</span></div><p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 5px;">Categoría: ${p.categoria}</p></div>`;
            }); return html += `</div>`;
        },
        clientes() {
            let html = `<div class="card"><h3 class="card-title">Directorio</h3>`;
            App.state.clientes.forEach(c => { html += `<div class="card" style="border: 1px solid var(--border); padding: 10px; margin-bottom: 8px;"><strong>${c.nombre}</strong><br><small style="color: var(--text-muted);">📞 ${c.telefono || 'Sin teléfono'}</small></div>`; });
            html += `</div><button class="fab" onclick="App.views.formNuevoCliente()">+</button>`; return html;
        },
        produccion() {
            return `<div class="card"><h3 class="card-title">Tablero Kanban</h3><p style="font-size: 0.9rem; color: var(--text-muted);">Próximamente conectaremos las órdenes de producción.</p></div>`;
        },
        mas() {
            return `<div class="grid-2">
                <div class="card stat-card" style="cursor:pointer;" onclick="App.router.navigate('clientes')"><div class="label" style="margin-top:0;">Clientes</div></div>
                <div class="card stat-card" style="cursor:pointer;" onclick="App.router.navigate('productos')"><div class="label" style="margin-top:0;">Productos</div></div>
                <div class="card stat-card" style="cursor:pointer;" onclick="App.ui.toast('Próximamente')"><div class="label" style="margin-top:0;">Compras</div></div>
                <div class="card stat-card" style="cursor:pointer;" onclick="App.ui.toast('Próximamente')"><div class="label" style="margin-top:0;">Finanzas</div></div>
            </div>`;
        }
    },
    router: {
        init() { window.addEventListener('hashchange', () => this.handleRoute()); this.handleRoute(); },
        navigate(route) { window.location.hash = route; },
        handleRoute() {
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
    start() { this.ui.init(); this.logic.cargarDatosIniciales(); }
};

document.addEventListener('DOMContentLoaded', () => App.start());