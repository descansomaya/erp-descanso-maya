window.App = window.App || {};
App.api = App.api || {};

App.api.getBaseUrl = function () {
    return window.App?.config?.api?.gasUrl || '';
};

App.api.fetch = async function (action, payload = {}) {
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
            alert('DEBUG URL GAS\\n' + JSON.stringify(debugInfo, null, 2));

            throw new Error('No hay URL configurada para Apps Script');
        }

        let requestBody = {
            action: action,
            payload: payload
        };

        if (action === 'login') {
            requestBody.pin = payload.pin;
        } else {
            requestBody.sessionToken = App.state?.sessionToken || null;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), (App.config?.api?.timeoutMs || 30000));

        const response = await fetch(baseUrl, {
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
            console.error('Respuesta cruda del servidor:', text);
            throw new Error('Respuesta inválida del servidor');
        }

        if (
            data.status === 'error' &&
            (data.code === 'AUTH_REQUIRED' ||
             data.code === 'SESSION_EXPIRED' ||
             data.code === 'SESSION_INVALID')
        ) {
            localStorage.removeItem('erp_session_token');
            if (App.state) App.state.sessionToken = null;
            if (App.router?.handleRoute) App.router.handleRoute();
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
