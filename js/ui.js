App.ui = {
    init() { console.log("UI Iniciada con CSS Maestro"); },

    showLoader(mensaje = "Procesando...") {
        const loader = document.getElementById('loader');
        if(loader) {
            loader.innerHTML = `<div class="dm-loader dm-loader-lg dm-mb-3"></div><div style="color:white; font-weight:600;">${this.escapeHTML(mensaje)}</div>`;
            loader.classList.remove('hidden');
        }
    },
    hideLoader() { document.getElementById('loader')?.classList.add('hidden'); },

    toast(mensaje, tipo = 'success') {
        const existing = document.querySelector('.toast-container');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `toast-container dm-alert dm-alert-${tipo}`;
        toast.style.cssText = 'position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%); z-index: 9999; animation: slideUp 0.3s ease; box-shadow: var(--dm-shadow-lg);';
        toast.innerHTML = `<strong>${this.escapeHTML(mensaje)}</strong>`;
        
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
    },

    openSheet(titulo, contenidoHTML, callbackFormulario = null) {
        const bg = document.getElementById('sheet-bg');
        const sheet = document.getElementById('sheet-content');
        
        sheet.innerHTML = `
            <div class="dm-modal-header">
                <div><h2 class="dm-modal-title">${titulo}</h2></div>
                <button class="dm-btn dm-btn-ghost" onclick="App.ui.closeSheet()">✕</button>
            </div>
            <div class="dm-modal-body">
                ${contenidoHTML}
            </div>
        `;
        
        bg.classList.remove('hidden');

        if (callbackFormulario) {
            const form = document.getElementById('dynamic-form');
            if(form) {
                form.onsubmit = (e) => {
                    e.preventDefault();
                    callbackFormulario(Object.fromEntries(new FormData(form).entries()));
                };
            }
        }
    },
    
    closeSheet() { document.getElementById('sheet-bg')?.classList.add('hidden'); },
    escapeHTML(str) { return str ? str.toString().replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag])) : ''; }
};
