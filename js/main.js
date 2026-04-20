window.App = window.App || {};
App.actions = App.actions || {};
App.forms = App.forms || {};
App.debug = App.debug || {};
App.logic = App.logic || {};
App.router = App.router || {};
App.views = App.views || {};

// ==========================================
// DEBUG / UTILIDADES DE ARRANQUE
// ==========================================
App.debug.lastError = App.debug.lastError || null;
App.debug.bootLog = App.debug.bootLog || [];

App.logBootStep = function (step, extra) {
    const entry = {
        step,
        extra: extra || null,
        at: new Date().toISOString()
    };

    App.debug.bootLog.push(entry);
    console.info("[BOOT]", step, extra || "");
    return entry;
};

App.safeEscape = function (value) {
    const text = String(value ?? "");

    if (App.ui && typeof App.ui.escapeHTML === "function") {
        return App.ui.escapeHTML(text);
    }

    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

App.setLastError = function (payload) {
    App.debug.lastError = {
        ...payload,
        at: new Date().toISOString()
    };
    return App.debug.lastError;
};

App.renderFatalError = function (title, error, options) {
    const opts = options || {};
    const content = document.getElementById("app-content");
    const headerTitle = document.getElementById("app-header-title");
    const headerSubtitle = document.getElementById("app-header-subtitle");

    const message = error?.message || error || "Error desconocido";
    const source = opts.source || error?.source || "app";
    const detail = opts.detail || error?.stack || "Sin detalle adicional";

    App.setLastError({
        title,
        message,
        source,
        detail
    });

    console.error("[FATAL]", title, { message, source, detail, error });

    if (headerTitle) headerTitle.textContent = "Error de aplicación";
    if (headerSubtitle) headerSubtitle.textContent = "Se detuvo el arranque de Descanso Maya ERP";

    if (!content) return;

    content.innerHTML = `
        <div class="dm-card" style="max-width:920px; margin:24px auto; border:1px solid rgba(220,38,38,.18);">
            <div class="dm-alert dm-alert-danger dm-mb-3">
                <strong>${App.safeEscape(title || "No se pudo iniciar Descanso Maya ERP")}</strong>
            </div>

            <p class="dm-mb-2"><strong>Mensaje:</strong> ${App.safeEscape(message)}</p>
            <p class="dm-mb-3"><strong>Origen:</strong> ${App.safeEscape(source)}</p>

            <div class="dm-row dm-mb-3" style="gap:12px; flex-wrap:wrap;">
                <button class="dm-btn dm-btn-primary" onclick="window.location.reload()">Reintentar</button>
                <button class="dm-btn dm-btn-ghost" onclick="window.location.hash='inicio'; window.location.reload();">Ir a inicio</button>
            </div>

            <details>
                <summary style="cursor:pointer;"><strong>Ver detalle técnico</strong></summary>
                <pre style="white-space:pre-wrap; word-break:break-word; background:#f8fafc; padding:12px; border-radius:10px; margin-top:12px; font-size:12px;">${App.safeEscape(detail)}</pre>
            </details>
        </div>
    `;
};

App.handleGlobalError = function (kind, payload) {
    const normalized = {
        kind,
        message: payload?.message || payload?.reason?.message || payload || "Error desconocido",
        source: payload?.source || payload?.filename || kind,
        lineno: payload?.lineno || null,
        colno: payload?.colno || null,
        stack: payload?.error?.stack || payload?.reason?.stack || null
    };

    App.setLastError(normalized);
    console.error(`[${kind}]`, normalized);

    const detailParts = [
        normalized.stack,
        normalized.lineno ? `Línea: ${normalized.lineno}` : null,
        normalized.colno ? `Columna: ${normalized.colno}` : null
    ].filter(Boolean);

    App.renderFatalError(
        kind === "unhandledrejection" ? "Promesa no controlada durante el arranque" : "Error global durante el arranque",
        normalized.message,
        {
            source: normalized.source,
            detail: detailParts.join("\n") || "Sin stack trace disponible"
        }
    );
};

// ==========================================
// MANEJO GLOBAL DE ERRORES
// ==========================================
window.onerror = function (message, source, lineno, colno, error) {
    App.handleGlobalError("onerror", {
        message,
        source,
        lineno,
        colno,
        error
    });
    return false;
};

window.onunhandledrejection = function (event) {
    App.handleGlobalError("unhandledrejection", {
        reason: event?.reason
    });
};

// ==========================================
// VALIDACIÓN DE DEPENDENCIAS
// ==========================================
App.checkDependencies = function () {
    const checks = [
        { label: "App.state", ok: !!App.state },
        { label: "App.ui", ok: !!App.ui },
        { label: "App.views", ok: !!App.views },
        { label: "App.logic", ok: !!App.logic },
        { label: "App.router", ok: !!App.router },
        { label: "App.router.init", ok: typeof App.router?.init === "function" },
        { label: "App.router.handleRoute", ok: typeof App.router?.handleRoute === "function" }
    ];

    const missing = checks.filter(item => !item.ok).map(item => item.label);

    if (missing.length) {
        throw new Error(`Dependencias faltantes: ${missing.join(", ")}`);
    }

    return true;
};

// ==========================================
// HELPERS GLOBALES COMPATIBLES
// ==========================================

window.cargarTarifas = function (artesanoId) {
    const tarifas = (App.state?.tarifas_artesano || []).filter(t => t.artesano_id === artesanoId);
    const select = document.getElementById("select-tarifas");
    if (!select) return;

    select.innerHTML =
        '<option value="">-- Seleccione Trabajo --</option>' +
        tarifas.map(t => `
            <option
                value="${t.id || ''}"
                data-monto="${t.monto || 0}"
                data-modo-calculo="${t.modo_calculo || 'fijo'}"
                data-aplica-a="${t.aplica_a || 'total'}"
            >
                ${App.ui.escapeHTML(t.clasificacion || "Tarea")} ($${t.monto || 0})
            </option>
        `).join("");
};

window.calcTotalTrabajo = function () {
    const sel = document.getElementById("select-tarifas");
    const tot = document.getElementById("total-trabajo");
    const tareaNombre = document.getElementById("tarea_nombre");
    const ordenIdInput = document.querySelector('#dynamic-form input[name="id"]');

    if (!sel || !tot || !sel.value) {
        if (tot) tot.value = "";
        if (tareaNombre) tareaNombre.value = "";
        return;
    }

    const selectedOption = sel.options[sel.selectedIndex];
    const monto = parseFloat(selectedOption?.dataset?.monto || 0) || 0;
    const modoCalculo = selectedOption?.dataset?.modoCalculo || "fijo";
    const aplicaA = selectedOption?.dataset?.aplicaA || "total";

    let baseCalculo = 1;

    if (ordenIdInput?.value && modoCalculo === "por_unidad") {
        const orden = (App.state?.ordenes_produccion || []).find(o => o.id === ordenIdInput.value);

        let receta = [];
        try {
            receta = JSON.parse(orden?.receta_personalizada || "[]");
        } catch (e) {
            receta = [];
        }

        if (aplicaA === "total") {
            baseCalculo = receta.reduce((acc, item) => acc + (parseFloat(item.cant || 0) || 0), 0);
        } else {
            baseCalculo = receta
                .filter(item => String(item.uso || "").toLowerCase() === String(aplicaA).toLowerCase())
                .reduce((acc, item) => acc + (parseFloat(item.cant || 0) || 0), 0);
        }
    }

    tot.value = (monto * baseCalculo).toFixed(2);

    if (tareaNombre) {
        tareaNombre.value = selectedOption?.text?.split(" ($")[0] || "";
    }
};

window.filtrarLista = function (inputId, claseItem) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const filtro = input.value.toLowerCase();
    const items = document.querySelectorAll("." + claseItem);

    items.forEach(item => {
        const texto = (item.innerText || "").toLowerCase();
        item.style.display = texto.includes(filtro) ? "" : "none";
    });
};

// ==========================================
// FORM HELPERS
// ==========================================
App.forms.calcularTotalPedido = function () {
    const prodSelect = document.querySelector('select[name="producto_id"]');
    const cantInput = document.querySelector('input[name="cantidad"]');
    const mayoreoCheck = document.querySelector('input[name="es_mayoreo"]');
    const totalInput = document.querySelector('input[name="total"]');
    const infoExtra = document.getElementById("info-extra-prod");

    if (!prodSelect || !cantInput || !totalInput || !prodSelect.value) {
        if (infoExtra) infoExtra.innerHTML = "";
        return;
    }

    const prod = (App.state?.productos || []).find(p => p.id === prodSelect.value);
    if (!prod) {
        if (infoExtra) infoExtra.innerHTML = "";
        return;
    }

    const cant = parseFloat(cantInput.value) || 1;
    const precioBase =
        mayoreoCheck && mayoreoCheck.checked && parseFloat(prod.precio_mayoreo) > 0
            ? parseFloat(prod.precio_mayoreo)
            : parseFloat(prod.precio_venta || 0);

    totalInput.value = (precioBase * cant).toFixed(2);

    if (infoExtra) {
        infoExtra.innerHTML = `
            <small style="color:var(--primary);">
                <strong>Clasificación:</strong> ${App.ui.safe(prod.clasificacion || "N/A")} |
                <strong>Tamaño:</strong> ${App.ui.safe(prod.tamano || "N/A")} |
                <strong>Color:</strong> ${App.ui.safe(prod.color || "N/A")}
            </small>
        `;
    }
};

window.calcularTotalPedido = function () {
    App.forms.calcularTotalPedido();
};

App.forms.agregarFilaReceta = function () {
    const cont = document.getElementById("cont-receta");
    if (!cont) return;

    const opcMat = (App.state?.inventario || [])
        .map(m => `<option value="${m.id}">${App.ui.safe(m.nombre)} (${App.ui.safe(m.unidad)})</option>`)
        .join("");

    const div = document.createElement("div");
    div.className = "dm-row dm-mb-3 fila-dinamica";
    div.innerHTML = `
        <div class="dm-w-full">
            <select class="dm-select" name="mat_id[]" required>
                <option value="">-- Insumo --</option>
                ${opcMat}
            </select>
        </div>
        <div style="width:100px;">
            <input type="number" step="0.1" class="dm-input" name="cant[]" placeholder="Cant" required>
        </div>
        <div>
            <select class="dm-select" name="uso[]" required>
                <option value="Cuerpo">Cuerpo</option>
                <option value="Brazos">Brazos</option>
                <option value="Adicional">Otro</option>
            </select>
        </div>
        <button type="button" onclick="this.parentElement.remove()" class="dm-btn dm-btn-danger">X</button>
    `;
    cont.appendChild(div);
};

window.agregarFilaReceta = function () {
    App.forms.agregarFilaReceta();
};

window.calcTotalCompra = function () {
    const cants = document.querySelectorAll('input[name="cant[]"]');
    const precios = document.querySelectorAll('input[name="precio_u[]"]');
    const totalesFila = document.querySelectorAll('input[name="total_fila[]"]');
    let granTotal = 0;

    for (let i = 0; i < cants.length; i++) {
        const t = (parseFloat(cants[i].value) || 0) * (parseFloat(precios[i].value) || 0);
        if (totalesFila[i]) totalesFila[i].value = t.toFixed(2);
        granTotal += t;
    }

    const inputGranTotal = document.querySelector('input[name="total"]');
    if (inputGranTotal) inputGranTotal.value = granTotal.toFixed(2);

    const inputMontoPagado = document.querySelector('input[name="monto_pagado"]');
    if (inputMontoPagado) inputMontoPagado.value = granTotal.toFixed(2);
};

App.forms.agregarFilaCompra = function () {
    const cont = document.getElementById("cont-compras");
    if (!cont) return;

    const opcMat = (App.state?.inventario || [])
        .map(m => `<option value="${m.id}">${App.ui.safe(m.nombre)} (Físico: ${m.stock_real || 0})</option>`)
        .join("");

    const div = document.createElement("div");
    div.className = "fila-compra dm-card dm-mb-3";
    div.style.padding = "10px";
    div.innerHTML = `
        <div class="dm-mb-2">
            <select class="dm-select" name="mat_id[]" required>
                <option value="">-- Selecciona Insumo --</option>
                ${opcMat}
            </select>
        </div>
        <div class="dm-row">
            <input type="number" step="0.1" class="dm-input" name="cant[]" placeholder="Cant." required oninput="window.calcTotalCompra()">
            <input type="number" step="0.01" class="dm-input" name="precio_u[]" placeholder="$ Unit." required oninput="window.calcTotalCompra()">
            <input type="number" step="0.01" class="dm-input" name="total_fila[]" placeholder="$ Tot" readonly style="background:#f3f4f6;">
            <button type="button" onclick="this.parentElement.parentElement.remove(); window.calcTotalCompra();" class="dm-btn dm-btn-danger">X</button>
        </div>
    `;
    cont.appendChild(div);
};

window.agregarFilaCompra = function () {
    App.forms.agregarFilaCompra();
};

App.forms.agregarFilaGasto = function () {
    const cont = document.getElementById("cont-gastos");
    if (!cont) return;

    const div = document.createElement("div");
    div.className = "dm-row dm-mb-3 fila-dinamica";
    div.innerHTML = `
        <input type="text" class="dm-input" name="descripcion[]" placeholder="Descripción" required style="flex:2;">
        <input type="number" step="0.01" class="dm-input" name="monto[]" placeholder="$ Monto" required style="flex:1;">
        <button type="button" onclick="this.parentElement.remove()" class="dm-btn dm-btn-danger">X</button>
    `;
    cont.appendChild(div);
};

window.agregarFilaGasto = function () {
    App.forms.agregarFilaGasto();
};

window.generarFilaRecetaProd = function (matId, cant, uso) {
    const opcMat = (App.state?.inventario || [])
        .map(m => `<option value="${m.id}" ${matId === m.id ? "selected" : ""}>${App.ui.safe(m.nombre)} (${m.stock_real || 0} físicos)</option>`)
        .join("");

    return `
        <div class="dm-row dm-mb-3 fila-dinamica">
            <div class="dm-w-full">
                <select class="dm-select" name="mat_id[]" required>
                    <option value="">-- Insumo --</option>
                    ${opcMat}
                </select>
            </div>
            <div style="width:100px;">
                <input type="number" step="0.1" class="dm-input" name="cant[]" value="${cant || ""}" placeholder="Cant" required>
            </div>
            <div>
                <select class="dm-select" name="uso[]" required>
                    <option value="Cuerpo" ${uso === "Cuerpo" ? "selected" : ""}>Cuerpo</option>
                    <option value="Brazos" ${uso === "Brazos" ? "selected" : ""}>Brazos</option>
                    <option value="Adicional" ${uso === "Adicional" ? "selected" : ""}>Otro</option>
                </select>
            </div>
            <button type="button" onclick="this.parentElement.remove()" class="dm-btn dm-btn-danger">X</button>
        </div>
    `;
};

window.agregarFilaRecetaProd = function () {
    const cont = document.getElementById("cont-receta-prod");
    if (!cont) return;
    cont.insertAdjacentHTML("beforeend", window.generarFilaRecetaProd("", "", "Cuerpo"));
};

window.exportarAExcel = function (datos, nombreArchivo) {
    if (!datos || datos.length === 0) {
        alert("No hay datos para exportar");
        return;
    }

    const cabeceras = Object.keys(datos[0]).join(",");
    const filas = datos.map(obj =>
        Object.values(obj)
            .map(v => `"${String(v ?? "").replace(/"/g, '""')}"`)
            .join(",")
    );

    const blob = new Blob(["\uFEFF" + cabeceras + "\n" + filas.join("\n")], {
        type: "text/csv;charset=utf-8;"
    });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nombreArchivo + ".csv";
    a.click();
};

window.switchTabProd = function (tabId, btn) {
    document.querySelectorAll(".tab-content-prod").forEach(el => {
        el.style.display = "none";
    });

    document.querySelectorAll(".tab-btn-prod").forEach(el => {
        el.classList.remove("active");
    });

    const tab = document.getElementById("tab-" + tabId);
    if (tab) tab.style.display = "block";
    if (btn) btn.classList.add("active");
};

window.switchTabPed = function (tabId, btn) {
    document.querySelectorAll(".tab-content-ped").forEach(el => {
        el.style.display = "none";
    });

    document.querySelectorAll(".tab-btn-ped").forEach(el => {
        el.classList.remove("active");
    });

    const tab = document.getElementById("tab-" + tabId);
    if (tab) tab.style.display = "block";
    if (btn) btn.classList.add("active");
};

// ==========================================
// ROUTER
// ==========================================
App.router = {
    init() {
        if (this._boundHandleRoute) {
            window.removeEventListener("hashchange", this._boundHandleRoute);
        }

        this._boundHandleRoute = () => this.handleRoute();
        window.addEventListener("hashchange", this._boundHandleRoute);
        this.handleRoute();
    },

    navigate(route) {
        window.location.hash = route;
    },

    getTitleConfig(hash) {
        const map = {
            inicio: { title: "Inicio", subtitle: "Resumen general" },
            inventario: { title: "Inventario", subtitle: "Control de materiales" },
            mas: { title: "Más", subtitle: "Accesos y configuración" },
            nomina: { title: "Nómina", subtitle: "Pagos a artesanos" },
            finanzas: { title: "Finanzas", subtitle: "Dashboard ejecutivo y flujo de caja" }
        };

        return map[hash] || {
            title: hash.charAt(0).toUpperCase() + hash.slice(1),
            subtitle: "Gestión de " + hash
        };
    },

    handleRoute() {
        try {
            const contentDiv = document.getElementById("app-content");
            const headerTitle = document.getElementById("app-header-title");
            const headerSubtitle = document.getElementById("app-header-subtitle");

            if (!App.state?.sessionToken) {
                if (typeof App.ui?.hideLoader === "function") {
                    App.ui.hideLoader();
                }

                if (headerTitle) headerTitle.textContent = "Acceso Restringido";
                if (headerSubtitle) headerSubtitle.textContent = "Ingresa tu PIN";

                if (contentDiv) {
                    if (typeof App.views?.login === "function") {
                        contentDiv.innerHTML = App.views.login();
                    } else {
                        contentDiv.innerHTML = `
                            <div style="text-align:center; padding:40px;">
                                <h2 class="dm-mb-3">Descanso Maya</h2>
                                <p class="dm-alert dm-alert-danger dm-mb-3">Archivo de vistas dañado o cargando...</p>
                                <input type="password" id="pin-input" class="dm-input dm-mb-3" placeholder="PIN">
                                <button class="dm-btn dm-btn-primary" onclick="App.logic.verificarPIN(document.getElementById('pin-input').value)">Entrar</button>
                            </div>
                        `;
                    }
                }
                return;
            }

            const hash = window.location.hash.substring(1) || "inicio";

            document.querySelectorAll(".dm-bottom-nav a").forEach(el => el.classList.remove("active"));
            document.querySelectorAll(".dm-sidebar-link").forEach(el => el.classList.remove("active"));

            const activeMobile = document.querySelector(`.dm-bottom-nav a[onclick*="${hash}"]`);
            const activeDesktop = document.querySelector(`.dm-sidebar-link[onclick*="${hash}"]`);

            if (activeMobile) activeMobile.classList.add("active");
            if (activeDesktop) activeDesktop.classList.add("active");

            if (App.views && typeof App.views[hash] === "function") {
                if (contentDiv) contentDiv.innerHTML = App.views[hash]();

                const titleConfig = this.getTitleConfig(hash);
                if (headerTitle) headerTitle.textContent = titleConfig.title;
                if (headerSubtitle) headerSubtitle.textContent = titleConfig.subtitle;
            } else if (contentDiv) {
                contentDiv.innerHTML = `<div class="dm-card"><p class="dm-center dm-muted">Módulo no encontrado.</p></div>`;
            }
        } catch (error) {
            App.renderFatalError("Falló el router al cargar la vista", error, {
                source: "App.router.handleRoute",
                detail: error?.stack || "Sin stack trace"
            });
        }
    }
};

// ==========================================
// APP START
// ==========================================
App.start = function () {
    try {
        App.logBootStep("start.begin");
        App.checkDependencies();
        App.logBootStep("dependencies.ok");

        if (this.ui && typeof this.ui.init === "function") {
            App.logBootStep("ui.init.begin");
            this.ui.init();
            App.logBootStep("ui.init.ok");
        }

        if (App.compat?.init) {
            App.logBootStep("compat.init.begin");
            App.compat.init();
            App.logBootStep("compat.init.ok");
        }

        if (!this.state?.sessionToken) {
            App.logBootStep("router.init.no-session");
            this.router.init();
            return;
        }

        if (this.logic && typeof this.logic.cargarDatosIniciales === "function") {
            App.logBootStep("logic.cargarDatosIniciales.begin");
            this.logic.cargarDatosIniciales();
            App.logBootStep("logic.cargarDatosIniciales.ok");
        } else {
            App.logBootStep("router.init.fallback");
            this.router.init();
        }
    } catch (error) {
        App.renderFatalError("Error al iniciar la aplicación", error, {
            source: "App.start",
            detail: error?.stack || "Sin stack trace"
        });
    }
};

document.addEventListener("DOMContentLoaded", () => App.start());
