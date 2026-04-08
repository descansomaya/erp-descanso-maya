// ==========================================
// 2. CONEXIÓN A BASE DE DATOS (api.js)
// ==========================================

App.api = { 
    // 👇 PEGA TU ENLACE REAL AQUÍ ABAJO 👇
    gasUrl: "https://script.google.com/macros/s/AKfycbxL3KzjesyZIfiC-Dyr0SwwzwNnPsv5FgHpt-JhyscNpN1eTvRwAh_rdgoxdVnKTAwu/exec", 
    
    async fetch(action, payload = {}) { 
        try { 
            let requestBody = { action: action, payload: payload };
            
            // Si es login mandamos el PIN, para todo lo demás mandamos el Token
            if (action === 'login') {
                requestBody.pin = payload.pin;
            } else {
                requestBody.sessionToken = App.state.sessionToken;
            }

            const response = await fetch(this.gasUrl, { 
                method: 'POST', 
                redirect: 'follow', // 🛑 REGLA DE GOOGLE: Seguir redirecciones
                headers: {
                    "Content-Type": "text/plain;charset=utf-8" // 🛑 REGLA DE GOOGLE: Evitar bloqueo CORS
                },
                body: JSON.stringify(requestBody) 
            }); 
            
            const data = await response.json(); 
            
            // Si el token expiró o la sesión es inválida
            if (data.status === 'error' && (data.code === 'AUTH_REQUIRED' || data.code === 'SESSION_EXPIRED' || data.code === 'SESSION_INVALID')) { 
                localStorage.removeItem('erp_session_token'); 
                App.state.sessionToken = null; 
                App.router.handleRoute(); 
            } 
            return data; 
        } 
        catch (error) { 
            console.error("Detalle del error de red:", error);
            return { status: "error", message: "Fallo de conexión con Google." }; 
        } 
    } 
};
