// ==========================================
// LÓGICA: NÚCLEO, SEGURIDAD Y BUSCADOR
// ==========================================

window.App = window.App || {};
App.logic = App.logic || {};

Object.assign(App.logic, {
    async verificarPIN(pin) {
        App.ui.showLoader("Verificando...");
        const res = await App.api.fetch("login", { pin: pin });

        if (res.status === "success" && res.data && res.data.sessionToken) {
            App.state.sessionToken = res.data.sessionToken;
            localStorage.setItem("erp_session_token", res.data.sessionToken);
            App.ui.toast("¡Acceso concedido!");
            this.cargarDatosIniciales();
        } else {
            App.state.sessionToken = null;
            App.ui.hideLoader();
            App.ui.toast(res.message || "PIN incorrecto.", "danger");
        }
    },

    async cargarDatosIniciales() {
        App.ui.showLoader("Sincronizando Base de Datos...");

        try {
            if (!App.state.sessionToken) {
                App.ui.hideLoader();
                return;
            }

            const hojas = [
                "materiales",
                "clientes",
                "productos",
                "pedidos",
                "pedido_detalle",
                "ordenes_produccion",
                "artesanos",
                "abonos_clientes",
                "gastos",
                "compras",
                "proveedores",
                "reparaciones",
                "tarifas_artesano",
                "pago_artesanos",
                "movimientos_inventario",
                "ordenes_produccion_artesanos",
                "abonos_proveedores"
            ];

            const res = await App.api.fetch("leer_todo", { hojas });

            if (res.status === "error") {
                throw new Error(res.message || "Error al leer la base de datos");
            }

            const bd = res.data || {};

            App.state.inventario = bd["materiales"] || [];
            App.state.clientes = bd["clientes"] || [];
            App.state.productos = bd["productos"] || [];
            App.state.pedidos = bd["pedidos"] || [];
            App.state.pedido_detalle = bd["pedido_detalle"] || [];
            App.state.ordenes_produccion = bd["ordenes_produccion"] || [];
            App.state.artesanos = bd["artesanos"] || [];
            App.state.abonos = bd["abonos_clientes"] || [];
            App.state.gastos = bd["gastos"] || [];
            App.state.compras = bd["compras"] || [];
            App.state.proveedores = bd["proveedores"] || [];
            App.state.reparaciones = bd["reparaciones"] || [];
            App.state.tarifas_artesano = bd["tarifas_artesano"] || [];
            App.state.pago_artesanos = bd["pago_artesanos"] || [];
            App.state.movimientos_inventario = bd["movimientos_inventario"] || [];
            App.state.abonos_proveedores = bd["abonos_proveedores"] || [];

            App.ui.hideLoader();
            App.router.init();
            this.revisarAlertasStock(true);

        } catch (error) {
            console.error("Fallo de conexión:", error);

            if (App.state.sessionToken) {
                App.ui.toast("ERROR REAL: " + error.message, "danger");
                setTimeout(() => App.logic.cargarDatosIniciales(), 6000);
            } else {
                App.ui.hideLoader();
            }
        }
    },

    descargarRespaldo() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(App.state, null, 2));
        const dlAnchorElem = document.createElement("a");
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", `Respaldo_ERP_Maya_${new Date().toISOString().split("T")[0]}.json`);
        dlAnchorElem.click();
        App.ui.toast("Respaldo descargado");
    },

    verDiagnostico() {
        let html = `<table style="width:100%; font-size:0.85rem; border-collapse:collapse;"><tr style="border-bottom:1px solid #ccc; text-align:left;"><th>Tabla (Hoja)</th><th>Estado</th><th>Registros</th></tr>`;
        const tablas = [
            { nombre: "materiales", state: "inventario" },
            { nombre: "clientes", state: "clientes" },
            { nombre: "productos", state: "productos" },
            { nombre: "pedidos", state: "pedidos" },
            { nombre: "pedido_detalle", state: "pedido_detalle" },
            { nombre: "ordenes_produccion", state: "ordenes_produccion" },
            { nombre: "artesanos", state: "artesanos" },
            { nombre: "abonos_clientes", state: "abonos" },
            { nombre: "gastos", state: "gastos" },
            { nombre: "compras", state: "compras" },
            { nombre: "proveedores", state: "proveedores" },
            { nombre: "reparaciones", state: "reparaciones" },
            { nombre: "tarifas_artesano", state: "tarifas_artesano" },
            { nombre: "pago_artesanos", state: "pago_artesanos" },
            { nombre: "movimientos_inventario", state: "movimientos_inventario" },
            { nombre: "abonos_proveedores", state: "abonos_proveedores" }
        ];

        tablas.forEach(t => {
            const arr = App.state[t.state];
            const count = arr ? arr.length : 0;
            const status = arr ? "✅ OK" : "❌ Error";
            html += `<tr style="border-bottom:1px dashed #eee;"><td style="padding:5px 0;">${t.nombre}</td><td>${status}</td><td>${count}</td></tr>`;
        });

        html += `</table><button class="btn btn-primary" style="width:100%; margin-top:15px;" onclick="App.ui.closeSheet()">Cerrar</button>`;
        App.ui.openSheet("Diagnóstico de Base de Datos", html);
    },

    async eliminarRegistroGenerico(hoja, id, estado) {
        if (!confirm("⚠️ ¿Eliminar permanentemente?")) return;

        App.ui.showLoader("Eliminando...");
        const res = await App.api.fetch("eliminar_fila", { nombreHoja: hoja, idFila: id });
        App.ui.hideLoader();

        if (res.status === "success") {
            App.state[estado] = (App.state[estado] || []).filter(item => item.id !== id);
            App.ui.toast("Eliminado");
            App.router.handleRoute();
        } else {
            App.ui.toast(res.message || "Error", "danger");
        }
    },

    async actualizarRegistroGenerico(hoja, id, datos, estado, callback = null) {
        App.ui.showLoader("Guardando...");
        const res = await App.api.fetch("actualizar_fila", { nombreHoja: hoja, idFila: id, datosNuevos: datos });
        App.ui.hideLoader();

        if (res.status === "success") {
            const arr = App.state[estado] || [];
            const index = arr.findIndex(item => item.id === id);
            if (index !== -1) arr[index] = { ...arr[index], ...datos };
            App.ui.toast("Actualizado");
            if (callback) callback();
            else App.router.handleRoute();
        } else {
            App.ui.toast(res.message || "Error", "danger");
        }
    },

    async guardarNuevoGenerico(hoja, datos, prefijo, estado, callback = null) {
        App.ui.showLoader("Registrando...");
        datos.id = prefijo + "-" + Date.now();
        if (!datos.fecha_creacion) datos.fecha_creacion = new Date().toISOString();

        const res = await App.api.fetch("guardar_fila", { nombreHoja: hoja, datos: datos });
        App.ui.hideLoader();

        if (res.status === "success") {
            if (!Array.isArray(App.state[estado])) {
                App.state[estado] = [];
            }

            App.state[estado].push(datos);
            App.ui.toast("Guardado exitosamente");

            if (callback) callback();
            else App.router.handleRoute();
        } else {
            App.ui.toast(res.message || "Error al guardar", "danger");
        }
    },

    revisarAlertasStock(esArranque = false) {
        const bajos = (App.state.inventario || []).filter(i => {
            const libre = parseFloat(i.stock_real || 0) - parseFloat(i.stock_reservado || 0) - parseFloat(i.stock_comprometido || 0);
            return parseFloat(i.stock_minimo || 0) > 0 && libre <= parseFloat(i.stock_minimo || 0);
        });

        if (bajos.length > 0 && !esArranque) {
            App.ui.toast(`⚠️ ALERTA: Tienes ${bajos.length} insumos en nivel crítico.`, "warning");
        }
    },

    ejecutarBusquedaGlobal(query) {
        const cont = document.getElementById("resultados-busqueda-global");
        if (!cont) return;

        if (!query || query.length < 2) {
            cont.innerHTML = "Escribe al menos 2 letras para empezar a buscar...";
            return;
        }

        const q = String(query).toLowerCase();
        let resultados = [];

        (App.state.clientes || []).forEach(c => {
            const nombre = String(c.nombre || "").toLowerCase();
            const telefono = String(c.telefono || "").toLowerCase();
            if (nombre.includes(q) || telefono.includes(q)) {
                resultados.push(`<div style="padding:12px; border-bottom:1px solid #edf2f7; cursor:pointer; display:flex; align-items:center; gap:10px;" onclick="App.ui.closeSheet(); App.router.navigate('clientes'); setTimeout(()=>App.views.modalEstadoCuenta('${c.id}'), 500);"><span style="font-size:1.5rem;">👤</span> <div><strong style="color:var(--text-main);">${App.ui.escapeHTML(c.nombre)}</strong><br><small style="color:var(--text-muted);">Cliente</small></div></div>`);
            }
        });

        (App.state.pedidos || []).forEach(p => {
            const idPed = String(p.id || "").toLowerCase();
            const notas = String(p.notas || "").toLowerCase();
            if (idPed.includes(q) || notas.includes(q)) {
                resultados.push(`<div style="padding:12px; border-bottom:1px solid #edf2f7; cursor:pointer; display:flex; align-items:center; gap:10px;" onclick="App.ui.closeSheet(); App.router.navigate('pedidos');"><span style="font-size:1.5rem;">📦</span> <div><strong style="color:var(--primary);">${p.id}</strong><br><small style="color:var(--text-muted);">Pedido en estado: ${p.estado}</small></div></div>`);
            }
        });

        (App.state.productos || []).forEach(p => {
            const nombreProd = String(p.nombre || "").toLowerCase();
            if (nombreProd.includes(q)) {
                resultados.push(`<div style="padding:12px; border-bottom:1px solid #edf2f7; cursor:pointer; display:flex; align-items:center; gap:10px;" onclick="App.ui.closeSheet(); App.router.navigate('productos');"><span style="font-size:1.5rem;">🧶</span> <div><strong style="color:var(--success);">${App.ui.escapeHTML(p.nombre)}</strong><br><small style="color:var(--text-muted);">Producto del catálogo</small></div></div>`);
            }
        });

        (App.state.artesanos || []).forEach(a => {
            const nombreArt = String(a.nombre || "").toLowerCase();
            const telArt = String(a.telefono || "").toLowerCase();
            if (nombreArt.includes(q) || telArt.includes(q)) {
                resultados.push(`<div style="padding:12px; border-bottom:1px solid #edf2f7; cursor:pointer; display:flex; align-items:center; gap:10px;" onclick="App.ui.closeSheet(); App.router.navigate('artesanos');"><span style="font-size:1.5rem;">🧑‍🎨</span> <div><strong style="color:#D69E2E;">${App.ui.escapeHTML(a.nombre)}</strong><br><small style="color:var(--text-muted);">Artesano</small></div></div>`);
            }
        });

        (App.state.proveedores || []).forEach(prv => {
            const nombreProv = String(prv.nombre || "").toLowerCase();
            const telProv = String(prv.telefono || "").toLowerCase();
            if (nombreProv.includes(q) || telProv.includes(q)) {
                resultados.push(`<div style="padding:12px; border-bottom:1px solid #edf2f7; cursor:pointer; display:flex; align-items:center; gap:10px;" onclick="App.ui.closeSheet(); App.router.navigate('proveedores');"><span style="font-size:1.5rem;">🚚</span> <div><strong style="color:#805AD5;">${App.ui.escapeHTML(prv.nombre)}</strong><br><small style="color:var(--text-muted);">Proveedor</small></div></div>`);
            }
        });

        cont.innerHTML = resultados.length === 0
            ? '<p style="color:var(--danger); margin-top:20px;">No se encontró nada con esa búsqueda 😔</p>'
            : resultados.join("");
    }
});
