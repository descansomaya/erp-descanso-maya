/**
 * DESCANSO MAYA ERP - Motor Principal
 * Arquitectura modular Vanilla JS conectada a Google Sheets
 */

const App = {
    // 1. ESTADO GLOBAL (Aquí vivirá la información real de tu Sheets)
    state: {
        config: { empresa: "Descanso Maya", moneda: "MXN" },
        pedidos: [],
        produccion: [], // Más adelante conectaremos las hojas de producción
        inventario: [], // Se llenará con tu hoja "materiales"
        productos: [],
        clientes: []
    },

    // 2. CAPA API (Conexión real a Google Apps Script)
    api: {
        gasUrl: "AKfycbxL3KzjesyZIfiC-Dyr0SwwzwNnPsv5FgHpt-JhyscNpN1eTvRwAh_rdgoxdVnKTAwu", // <-- ¡PEGAR TU URL DE APPS SCRIPT AQUÍ!
        
        async fetch(action, payload = {}) {
            console.log(`[API] Solicitando: ${action}`, payload);
            try {
                const response = await fetch(this.gasUrl, {
                    method: 'POST',
                    body: JSON.stringify({ action: action, payload: payload })
                });
                const result = await response.json();
                return result;
            } catch (error) {
                console.error("Error de conexión:", error);
                return { status: "error", message: error.message };
            }
        }
    },

    // 3. CAPA UI (Utilidades de Interfaz)
    ui: {
        container: null,
        init() {
            this.container = document.getElementById('overlays');
            
            // Crear contenedor de Toasts
            const toastCont = document.createElement('div');
            toastCont.className = 'toast-container';
            toastCont.id = 'toast-container';
            document.body.appendChild(toastCont);

            // Crear pantalla de carga global (Splash screen)
            const loader = document.createElement('div');
            loader.id = 'global-loader';
            loader.innerHTML = `
                <div class="spinner"></div>
                <h2 style="margin: 0; font-weight: 600;">Descanso Maya</h2>
                <p id="loader-text" style="margin-top: 10px; opacity: 0.8; font-size: 0.9rem;">Conectando con el servidor...</p>
            `;
            document.body.appendChild(loader);
        },
        toast(message) {
            const cont = document.getElementById('toast-container');
            const t = document.createElement('div');
            t.className = 'toast';
            t.textContent = message;
            cont.appendChild(t);
            setTimeout(() => t.remove(), 3000);
        },
        updateLoaderText(text) {
            const textEl = document.getElementById('loader-text');
            if(textEl) textEl.textContent = text;
        },
        hideGlobalLoader() {
            const loader = document.getElementById('global-loader');
            if(loader) loader.classList.add('hidden');
        },
        showLoader() { /* Loader pequeño para acciones internas (opcional) */ },
        hideLoader() { /* Ocultar loader pequeño */ },
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

    // 4. LÓGICA DE NEGOCIO Y SINCRONIZACIÓN
    logic: {
        // Función maestra que descarga los datos al abrir la app
        async cargarDatosIniciales() {
            App.ui.updateLoaderText("Descargando base de datos...");
            
            try {
                // Hacemos las peticiones en PARALELO para que sea mucho más rápido
                const [resMateriales, resClientes, resProductos, resPedidos] = await Promise.all([
                    App.api.fetch("leer_hoja", { nombreHoja: "materiales" }),
                    App.api.fetch("leer_hoja", { nombreHoja: "clientes" }),
                    App.api.fetch("leer_hoja", { nombreHoja: "productos" }),
                    App.api.fetch("leer_hoja", { nombreHoja: "pedidos" })
                ]);

                // Asignamos los datos al estado global si la respuesta fue exitosa
                if (resMateriales.status === "success") App.state.inventario = resMateriales.data;
                if (resClientes.status === "success") App.state.clientes = resClientes.data;
                if (resProductos.status === "success") App.state.productos = resProductos.data;
                if (resPedidos.status === "success") App.state.pedidos = resPedidos.data;

                console.log("Datos cargados exitosamente:", App.state);
                
                // Ocultamos la pantalla de carga y arrancamos el enrutador
                App.ui.hideGlobalLoader();
                App.ui.toast("Sincronización completa");
                App.router.init();

            } catch (error) {
                App.ui.updateLoaderText("Error de conexión. Intenta recargar.");
                console.error("Fallo al inicializar datos:", error);
                App.ui.toast("Error al cargar datos desde Google Sheets.");
            }
        },

        crearPedido(datosFormulario) {
            // Esto lo conectaremos al backend más adelante. Por ahora lo dejamos simulado visualmente.
            App.ui.toast(`Función de guardado en la nube en construcción...`);
            App.router.navigate('pedidos');
        }
    },

    // 5. VISTAS (Renderizado de módulos usando datos reales)
    views: {
        inicio() {
            return `
                <div class="grid-2">
                    <div class="card stat-card">
                        <div class="label">Pedidos Registrados</div>
                        <div class="value">${App.state.pedidos.length}</div>
                    </div>
                    <div class="card stat-card">
                        <div class="label">Clientes</div>
                        <div class="value">${App.state.clientes.length}</div>
                    </div>
                </div>
                <div class="grid-2">
                    <div class="card stat-card">
                        <div class="label">Tipos de Material</div>
                        <div class="value">${App.state.inventario.length}</div>
                    </div>
                    <div class="card stat-card">
                        <div class="label">Catálogo de Prod.</div>
                        <div class="value">${App.state.productos.length}</div>
                    </div>
                </div>
                <div class="card">
                    <h3 class="card-title">Acciones Rápidas</h3>
                    <div style="display: flex; gap: 10px; margin-top: 10px;">
                        <button class="btn btn-primary" onclick="window.location.hash='#nuevo_pedido'">+ Nuevo Pedido</button>
                    </div>
                </div>
            `;
        },
        pedidos() {
            let html = `<div class="card"><h3 class="card-title">Historial de Pedidos</h3>`;
            
            if (App.state.pedidos.length === 0) {
                html += `<p style="color: var(--text-muted);">No hay pedidos registrados.</p>`;
            } else {
                // Invertimos para mostrar los más recientes arriba
                const pedidosRecientes = [...App.state.pedidos].reverse().slice(0, 50); 
                
                pedidosRecientes.forEach(p => {
                    // Buscar nombre de cliente cruzando con el ID
                    const clienteObjeto = App.state.clientes.find(c => c.id === p.cliente_id);
                    const nombreCliente = clienteObjeto ? clienteObjeto.nombre : "Cliente Desconocido";

                    html += `
                        <div class="card" style="border: 1px solid var(--border); box-shadow: none;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <strong>${p.id} - ${nombreCliente}</strong>
                                <span class="badge ${p.estado || 'nuevo'}">${(p.estado || 'Nuevo').toUpperCase()}</span>
                            </div>
                            <p style="color: var(--text-muted); font-size: 0.85rem;">
                                Fecha: ${new Date(p.fecha_creacion).toLocaleDateString()} | Total: $${p.total || 0}
                            </p>
                        </div>
                    `;
                });
            }
            html += `</div><button class="fab" onclick="window.location.hash='#nuevo_pedido'">+</button>`;
            return html;
        },
        formNuevoPedido() {
            // Generar opciones de clientes reales
            let opcionesClientes = App.state.clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
            // Generar opciones de productos reales
            let opcionesProductos = App.state.productos.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');

            const formHTML = `
                <form id="dynamic-form">
                    <div class="form-group">
                        <label>Cliente</label>
                        <select name="cliente_id" required>
                            <option value="">-- Selecciona un cliente --</option>
                            ${opcionesClientes}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Producto Base</label>
                        <select name="producto_id" required>
                            <option value="">-- Selecciona un producto --</option>
                            ${opcionesProductos}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Anticipo ($)</label>
                        <input type="number" name="anticipo" value="0" required>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">Continuar</button>
                </form>
            `;
            App.ui.openSheet("Crear Nuevo Pedido", formHTML, (data) => App.logic.crearPedido(data));
        },
        inventario() {
            let html = `<div class="card"><h3 class="card-title">Inventario de Materiales</h3>
                <div style="overflow-x: auto;">
                <table style="width:100%; text-align:left; border-collapse: collapse; font-size: 0.9rem;">
                <tr style="border-bottom: 2px solid var(--border);">
                    <th style="padding: 10px 5px;">Material</th>
                    <th style="padding: 10px 5px;">Stock</th>
                    <th style="padding: 10px 5px;">Costo</th>
                </tr>`;
            
            App.state.inventario.forEach(i => {
                // Resaltar en rojo si está bajo el mínimo
                const colorStock = Number(i.stock_actual) <= Number(i.stock_minimo) ? 'color: var(--danger); font-weight: bold;' : '';
                
                html += `
                <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 12px 5px;">${i.nombre}</td>
                    <td style="padding: 12px 5px; ${colorStock}">${i.stock_actual} ${i.unidad}</td>
                    <td style="padding: 12px 5px;">$${i.costo_unitario}</td>
                </tr>`;
            });
            html += `</table></div></div>`;
            return html;
        },
        produccion() {
            return `<div class="card"><p>El módulo Kanban de producción se conectará próximamente con la hoja de órdenes de trabajo.</p></div>`;
        },
        mas() {
            const modulos = ['Clientes', 'Reparaciones', 'Productos', 'Compras', 'Artesanos', 'Proveedores', 'Gastos', 'Finanzas', 'Configuración'];
            let html = `<div class="grid-2">`;
            modulos.forEach(m => {
                html += `<div class="card stat-card" style="cursor:pointer; background: #fff;" onclick="App.ui.toast('Módulo ${m} en construcción')">
                            <div class="label" style="margin-top:0; font-size: 0.9rem;">${m}</div>
                         </div>`;
            });
            html += `</div>`;
            return html;
        }
    },

    // 6. ENRUTADOR PRINCIPAL
    router: {
        init() {
            window.addEventListener('hashchange', () => this.handleRoute());
            this.handleRoute(); // Cargar la vista basada en la URL actual
        },
        navigate(route) {
            window.location.hash = route;
        },
        handleRoute() {
            let hash = window.location.hash.substring(1) || 'inicio';
            const contentDiv = document.getElementById('app-content');
            const titleEl = document.getElementById('header-title');
            
            // Actualizar navegación visual (menú inferior)
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            const activeNav = document.querySelector(`.nav-item[data-view="${hash}"]`);
            if(activeNav) activeNav.classList.add('active');

            // Renderizar la vista correspondiente
            if (App.views[hash]) {
                contentDiv.innerHTML = App.views[hash]();
                titleEl.textContent = hash.charAt(0).toUpperCase() + hash.slice(1);
            } else if (hash === 'nuevo_pedido') {
                 App.views.formNuevoPedido();
                 window.history.back(); // Limpiar hash para no romper botón de atrás en móviles
            } else {
                contentDiv.innerHTML = `<div class="card"><p>Vista <b>${hash}</b> no implementada aún.</p></div>`;
            }
        }
    },

    // 7. ARRANQUE DE LA APLICACIÓN
    start() {
        this.ui.init();
        // En lugar de iniciar el router de inmediato, primero descargamos los datos
        this.logic.cargarDatosIniciales();
    }
};

// Arrancar App al cargar la página
document.addEventListener('DOMContentLoaded', () => App.start());