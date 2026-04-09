// ==========================================
// API / CONEXIÓN A GOOGLE APPS SCRIPT
// ==========================================
window.App = window.App || {};
App.api = App.api || {};

App.api.baseUrl = (App.config && App.config.api && App.config.api.gasUrl) || '';

App.api.fetch = async function (action, payload = {}) {
    try {
        if (!App.api.baseUrl) {
            throw new Error('No hay URL configurada para Apps Script');
        }

        let requestBody = {
            action: action,
            payload: payload
        };

        // Login usa PIN
        if (action === 'login') {
            requestBody.pin = payload.pin;
        } else {
            requestBody.sessionToken = App.state.sessionToken;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), (App.config?.api?.timeoutMs || 30000));

        const response = await fetch(App.api.baseUrl, {
            method: 'POST',
            redirect: 'follow',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });

        clearTimeout(timeout);

        const text = await response.text();

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new Error('Respuesta inválida del servidor');
        }

        // Si el token expiró o sesión inválida
        if (
            data.status === 'error' &&
            (data.code === 'AUTH_REQUIRED' ||
             data.code === 'SESSION_EXPIRED' ||
             data.code === 'SESSION_INVALID')
        ) {
            localStorage.removeItem('erp_session_token');
            App.state.sessionToken = null;
            App.router.handleRoute();
        }

        return data;

    } catch (error) {
        console.error('Detalle del error de red:', error);
        return {
            status: 'error',
            message: error.message || 'Fallo de conexión con Google.'
        };
    }
};
