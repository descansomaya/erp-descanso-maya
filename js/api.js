window.App = window.App || {};
App.api = App.api || {};

App.api.getBaseUrl = function () {
    return window.App?.config?.api?.gasUrl || '';
};

App.api.fetch = async function (action, payload = {}) {
    let timeoutId = null;
    let controller = null;

    try {
        const baseUrl = App.api.getBaseUrl();

        if (!baseUrl) {
            const debugInfo = {
                hasWindowApp: !!window.App,
                hasConfig: !!window.App?.config,
                hasApiConfig: !!window.App?.config?.api,
                gasUrl: window.App?.config?.api?.gasUrl || null
            };

            console.error('DEBUG App config:', debugInfo);
            throw new Error('No hay URL configurada para Apps Script');
        }

        const requestBody = {
            action: action,
            payload: payload
        };

        if (action === 'login') {
            requestBody.pin = payload.pin;
        } else {
            requestBody.sessionToken = App.state?.sessionToken || null;
        }

        controller = new AbortController();
        const timeoutMs = App.config?.api?.timeoutMs || 30000;

        timeoutId = setTimeout(() => {
            controller.abort();
        }, timeoutMs);

        const response = await fetch(baseUrl, {
            method: 'POST',
            redirect: 'follow',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        timeoutId = null;

        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status}: ${response.statusText || 'Respuesta no válida del servidor'}`);
        }

        const text = await response.text();

        if (!text || !text.trim()) {
            throw new Error('El servidor no devolvió información');
        }

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('Respuesta cruda del servidor:', text);
            throw new Error('Respuesta inválida del servidor');
        }

        if (
            data.status === 'error' &&
            (
                data.code === 'AUTH_REQUIRED' ||
                data.code === 'SESSION_EXPIRED' ||
                data.code === 'SESSION_INVALID'
            )
        ) {
            localStorage.removeItem('erp_session_token');

            if (App.state) {
                App.state.sessionToken = null;
            }

            if (App.router?.handleRoute) {
                App.router.handleRoute();
            }
        }

        return data;

    } catch (error) {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        console.error('Detalle del error de red:', error);

        let message = 'Fallo de conexión con Google.';

        if (error?.name === 'AbortError') {
            message = 'La solicitud tardó demasiado y fue cancelada por tiempo de espera.';
        } else if (
            error?.message === 'Failed to fetch' ||
            error?.message === 'NetworkError when attempting to fetch resource.'
        ) {
            message = 'No se pudo conectar con Apps Script. Revisa internet, permisos o la URL del Web App.';
        } else if (error?.message) {
            message = error.message;
        }

        return {
            status: 'error',
            message: message
        };
    }
};
