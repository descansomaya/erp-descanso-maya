// ==========================================
// 3. INTERFAZ Y ALERTAS (ui.js)
// ==========================================

App.ui = {
    container: null,
    init() { 
        this.container = document.getElementById('overlays'); 
        const toastCont = document.createElement('div'); toastCont.className = 'toast-container'; toastCont.id = 'toast-container'; document.body.appendChild(toastCont); 
        const loader = document.createElement('div'); loader.id = 'global-loader'; loader.innerHTML = `<div class="spinner"></div><h2 style="margin: 0; font-weight: 600;">Descanso Maya</h2><p id="loader-text" style="margin-top: 10px; opacity: 0.8; font-size: 0.9rem;">Sincronizando...</p><button id="btn-reintentar" class="btn btn-secondary hidden" style="margin-top: 20px;" onclick="location.reload()">Reintentar</button>`; document.body.appendChild(loader); 
        const estiloFix = document.createElement('style'); estiloFix.innerHTML = `.fab { position: fixed !important; bottom: 85px !important; right: 20px !important; z-index: 999 !important; width: 56px !important; height: 56px !important; border-radius: 50% !important; background: var(--primary) !important; color: white !important; font-size: 28px !important; box-shadow: 0 4px 10px rgba(0,0,0,0.4) !important; display: flex !important; align-items: center !important; justify-content: center !important; border: none !important; cursor: pointer !important; } .fab:active { transform: scale(0.95); }`; document.head.appendChild(estiloFix);
        const script = document.createElement('script'); script.src = 'https://cdn.jsdelivr.net/npm/chart.js'; document.head.appendChild(script);
    },
    toast(message) { const cont = document.getElementById('toast-container'); const t = document.createElement('div'); t.className = 'toast'; t.textContent = message; cont.appendChild(t); setTimeout(() => t.remove(), 4000); },
    showLoader(mensaje = "Procesando...") { const loader = document.getElementById('global-loader'); if(loader) { document.getElementById('loader-text').textContent = mensaje; loader.classList.remove('hidden'); } },
    hideLoader() { const loader = document.getElementById('global-loader'); if(loader) loader.classList.add('hidden'); },
    openSheet(title, contentHTML, onSaveCallback) { 
        this.container.innerHTML = `<div class="overlay-bg active" id="sheet-bg" style="z-index: 1000;"></div><div class="bottom-sheet active" id="sheet-content" style="z-index: 1001;"><div class="sheet-header"><h3>${title}</h3><button class="sheet-close" id="sheet-close">&times;</button></div><div class="sheet-body">${contentHTML}</div></div>`; 
        document.getElementById('sheet-close').onclick = this.closeSheet.bind(this); document.getElementById('sheet-bg').onclick = this.closeSheet.bind(this); const fab = document.querySelector('.fab'); if(fab) fab.style.display = 'none'; const form = document.getElementById('dynamic-form'); 
        if(form && onSaveCallback) { form.onsubmit = (e) => { e.preventDefault(); const formData = new FormData(form); const data = {}; for (let [key, value] of formData.entries()) { const isArray = key.endsWith('[]'); const cleanKey = isArray ? key.slice(0, -2) : key; if (data[cleanKey] !== undefined) { if (!Array.isArray(data[cleanKey])) data[cleanKey] = [data[cleanKey]]; data[cleanKey].push(value); } else { data[cleanKey] = isArray ? [value] : value; } } this.closeSheet(); onSaveCallback(data); }; } 
    },
    closeSheet() { this.container.innerHTML = ''; const fab = document.querySelector('.fab'); if(fab) fab.style.display = 'flex'; }
};
