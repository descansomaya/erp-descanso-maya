// ==========================================
// 4. MANEJO DE INTERFAZ DE USUARIO (ui.js) - REDISEÑADO
// ==========================================

App.ui = {
    showLoader(mensaje = "Cargando...") {
        const loader = document.getElementById('loader');
        if(loader) {
            loader.innerHTML = `<div class="spinner" style="border: 4px solid rgba(255,255,255,0.3); border-top: 4px solid white; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom:15px;"></div><p style="font-weight:bold; font-size:1.1rem;">${this.escapeHTML(mensaje)}</p><style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>`;
            loader.style.display = 'flex';
        }
    },
    hideLoader() { const loader = document.getElementById('loader'); if(loader) loader.style.display = 'none'; },
    
    toast(mensaje) {
        const existingToast = document.querySelector('.toast-modern');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = 'toast-modern';
        toast.style.cssText = 'position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%); background: #1A202C; color: white; padding: 12px 24px; border-radius: 30px; font-size: 0.9rem; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 9999; animation: slideUp 0.3s ease; text-align: center; width:max-content; max-width:90%;';
        toast.innerHTML = this.escapeHTML(mensaje);
        
        const style = document.createElement('style');
        style.innerHTML = `@keyframes slideUp { from { bottom: 60px; opacity: 0; } to { bottom: 90px; opacity: 1; } }`;
        document.head.appendChild(style);

        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
    },

    openSheet(titulo, contenidoHTML, callbackFormulario = null) {
        const bg = document.getElementById('sheet-bg');
        const sheet = document.getElementById('sheet-content');
        
        sheet.innerHTML = `
            <div class="drag-handle"></div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h2 style="margin:0; font-size:1.3rem; color:var(--text-main); font-weight:800;">${titulo}</h2>
                <span style="font-size:1.5rem; color:var(--text-muted); cursor:pointer; padding:5px; line-height:1;" onclick="App.ui.closeSheet()">&times;</span>
            </div>
            <div style="max-height: 75vh; overflow-y: auto; padding-bottom: 20px; scrollbar-width: none;">
                ${contenidoHTML}
            </div>
        `;
        
        bg.style.display = 'block';
        setTimeout(() => { bg.style.opacity = '1'; sheet.style.transform = 'translateY(0)'; }, 10);

        if (callbackFormulario) {
            const form = document.getElementById('dynamic-form');
            if(form) {
                form.onsubmit = (e) => {
                    e.preventDefault();
                    const formData = new FormData(form);
                    const data = Object.fromEntries(formData.entries());
                    callbackFormulario(data);
                };
            }
        }
    },
    
    closeSheet() {
        const bg = document.getElementById('sheet-bg');
        const sheet = document.getElementById('sheet-content');
        sheet.style.transform = 'translateY(100%)';
        bg.style.opacity = '0';
        setTimeout(() => { bg.style.display = 'none'; }, 300);
    },
    
    escapeHTML(str) { if (!str) return ''; return str.toString().replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag])); }
};
