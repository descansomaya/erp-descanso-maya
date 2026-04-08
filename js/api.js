// ==========================================
// 2. CONEXIÓN A BASE DE DATOS (api.js)
// ==========================================

App.api = { 
    // Aquí ya está tu enlace real restaurado 👇
    gasUrl: "https://script.google.com/macros/s/AKfycbxL3KzjesyZIfiC-Dyr0SwwzwNnPsv5FgHpt-JhyscNpN1eTvRwAh_rdgoxdVnKTAwu/exec", 
    
    async fetch(action, payload = {}) { 
        try { 
            const response = await fetch(this.gasUrl, { 
                method: 'POST', 
                body: JSON.stringify({ action: action, payload: payload, pin: App.state.pinAcceso }) 
            }); 
            const data = await response.json(); 
            
            // Si la base de datos rechaza el PIN explícitamente
            if (data.message === "Acceso Denegado. PIN incorrecto.") { 
                localStorage.removeItem('erp_pin'); 
                App.state.pinAcceso = null; 
                App.router.handleRoute(); 
            } 
            return data; 
        } 
        catch (error) { 
            // Si no hay internet o el enlace está roto
            return { status: "error", message: "Fallo de conexión." }; 
        } 
    } 
};
