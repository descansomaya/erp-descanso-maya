window.App = window.App || {};
App.ui = App.ui || {};

Object.assign(App.ui, {
    init() {
        // Punto de inicialización UI
        console.log("UI iniciada");
    },

    showLoader(mensaje = "Procesando...") {
        const loader = document.getElementById("loader");
        if (!loader) return;

        loader.innerHTML = `
            <div class="dm-loader dm-loader-lg dm-mb-3"></div>
            <div style="color:white; font-weight:600;">${this.escapeHTML(mensaje)}</div>
        `;
        loader.classList.remove("hidden");
    },

    hideLoader() {
        document.getElementById("loader")?.classList.add("hidden");
    },

    toast(mensaje, tipo = "success") {
        const existing = document.querySelector(".toast-container");
        if (existing) existing.remove();

        const toast = document.createElement("div");
        toast.className = `toast-container dm-alert dm-alert-${tipo}`;
        toast.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 9999;
            animation: slideUp 0.3s ease;
            box-shadow: var(--dm-shadow-lg);
            max-width: min(92vw, 520px);
            text-align: center;
        `;
        toast.innerHTML = `<strong>${this.escapeHTML(mensaje)}</strong>`;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transition = "opacity 0.3s ease";
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    openSheet(titulo, contenidoHTML, callbackFormulario = null) {
        const bg = document.getElementById("sheet-bg");
        const sheet = document.getElementById("sheet-content");

        if (!bg || !sheet) return;

        sheet.innerHTML = `
            <div class="dm-modal-header">
                <div>
                    <h2 class="dm-modal-title">${this.escapeHTML(titulo)}</h2>
                </div>
                <button class="dm-btn dm-btn-ghost" type="button" onclick="App.ui.closeSheet()">✕</button>
            </div>
            <div class="dm-modal-body">
                ${contenidoHTML}
            </div>
        `;

        bg.classList.remove("hidden");

        // cerrar al tocar fondo
        bg.onclick = (e) => {
            if (e.target === bg) this.closeSheet();
        };

        if (callbackFormulario) {
            const form = document.getElementById("dynamic-form");
            if (form) {
                form.onsubmit = (e) => {
                    e.preventDefault();
                    const data = this.serializeForm(form);
                    callbackFormulario(data);
                };
            }
        }
    },

    closeSheet() {
        const bg = document.getElementById("sheet-bg");
        const sheet = document.getElementById("sheet-content");

        if (bg) bg.classList.add("hidden");
        if (sheet) sheet.innerHTML = "";
    },

    serializeForm(form) {
        const formData = new FormData(form);
        const result = {};

        for (const [key, value] of formData.entries()) {
            const isArrayField = key.endsWith("[]");

            if (isArrayField) {
                const cleanKey = key;
                if (!Array.isArray(result[cleanKey])) {
                    result[cleanKey] = [];
                }
                result[cleanKey].push(value);
            } else if (result[key] !== undefined) {
                if (!Array.isArray(result[key])) {
                    result[key] = [result[key]];
                }
                result[key].push(value);
            } else {
                result[key] = value;
            }
        }

        return result;
    },

    escapeHTML(str) {
        return str
            ? str.toString().replace(/[&<>'"]/g, (tag) => ({
                  "&": "&amp;",
                  "<": "&lt;",
                  ">": "&gt;",
                  "'": "&#39;",
                  '"': "&quot;"
              }[tag]))
            : "";
    },

    safe(value) {
        return this.escapeHTML(value);
    },

    text(value, fallback = "—") {
        const v = String(value ?? "").trim();
        return v ? this.escapeHTML(v) : fallback;
    },

    money(value) {
        const n = Number(value || 0);
        return new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN"
        }).format(n);
    },

    number(value, decimals = 2) {
        const n = Number(value || 0);
        return n.toFixed(decimals);
    }
});
