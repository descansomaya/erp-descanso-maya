// ==========================================
// 2. CONEXIÓN A BASE DE DATOS (api.js)
// ==========================================

App.api = { 
    // 👇 PON AQUÍ TU ENLACE REAL DE GOOGLE APPS SCRIPT 👇
    gasUrl: "https://script.google.com/macros/s/TU_ENLACE_AQUI/exec", 
    
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
            return { status: "error", message: "Fallo de conexión." }; 
        } 
    } 
};
