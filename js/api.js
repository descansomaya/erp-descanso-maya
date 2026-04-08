// ==========================================
// 2. CONEXIÓN A BASE DE DATOS (api.js)
// ==========================================

App.api = { 
    gasUrl: "https://script.google.com/macros/s/AKfycbxL3KzjesyZIfiC-Dyr0SwwzwNnPsv5FgHpt-JhyscNpN1eTvRwAh_rdgoxdVnKTAwu/exec",
    async fetch(action, payload = {}) { 
        try { 
            const response = await fetch(this.gasUrl, { 
                method: 'POST', 
                body: JSON.stringify({ action: action, payload: payload, pin: App.state.pinAcceso }) 
            }); 
            const data = await response.json(); 
            if (data.message === "Acceso Denegado. PIN incorrecto.") { 
                localStorage.removeItem('erp_pin'); 
                App.state.pinAcceso = null; 
                App.router.handleRoute(); 
            } 
            return data; 
        } 
        catch (error) { 
            return { status: "error", message: "Fallo de conexión." }; 
        } 
    } 
};
