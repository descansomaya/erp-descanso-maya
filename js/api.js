// ==========================================
// 2. CONEXIÓN A BASE DE DATOS (api.js)
// ==========================================

App.api = { 

    window.App = window.App || {};
App.api = App.api || {};

App.api.baseUrl = (App.config && App.config.api && App.config.api.gasUrl) || '';

App.api.request = async function (action, payload = {}) {
  if (!App.api.baseUrl) {
    throw new Error('No hay URL configurada para Apps Script');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), (App.config?.api?.timeoutMs || 30000));

  try {
    const response = await fetch(App.api.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action,
        ...payload
      }),
      signal: controller.signal
    });

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error('Respuesta inválida del servidor');
    }

    if (!response.ok) {
      throw new Error(data?.message || 'Error en la petición');
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
};
    
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
