// ==========================================
// VISTAS: NÚCLEO Y PANTALLAS PRINCIPALES
// ==========================================

window.App = window.App || {};
App.views = App.views || {};

App.views.login = function() {
    return `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:80vh; text-align:center; padding:20px;">
            <div style="background:var(--dm-primary-soft); color:var(--dm-primary); width:90px; height:90px; border-radius:24px; display:flex; align-items:center; justify-content:center; font-size:2.5rem; margin-bottom:20px;">🔒</div>
            <h2>Descanso Maya</h2>
            <p>Gestión y Control Operativo</p>
            <div class="dm-card">
                <input type="password" id="pin-input" class="dm-input" placeholder="PIN">
                <button class="dm-btn dm-btn-primary dm-btn-block" onclick="App.logic.verificarPIN(document.getElementById('pin-input').value)">Entrar</button>
            </div>
        </div>
    `;
};

App.views.moduloNoDisponible = function(nombre = 'Módulo') {
    App.ui.toast(`${nombre} aún no está disponible`, 'warning');
};

// ==========================================
// MENÚ MÁS (CORREGIDO)
// ==========================================

App.views.mas = function() {
    return `
        <div class="dm-section" style="padding-bottom:90px;">

            <h4 class="dm-label dm-mb-3">Módulos disponibles</h4>
            <div class="dm-list dm-mb-5">

                ${card("inventario","🧶","Inventario")}
                ${card("compras","🛒","Compras")}
                ${card("cobranza","💰","Cobranza")}
                ${card("finanzas","📊","Finanzas")}
                ${card("nomina","💵","Nómina")}
                ${card("reportes","📈","Reportes")}
                ${card("clientes","👥","Clientes")}
                ${card("proveedores","🚚","Proveedores")}
                ${card("artesanos","🧑‍🎨","Artesanos")}
                ${card("productos","🧵","Productos")}
                ${card("reparaciones","🪡","Reparaciones")}

                <!-- 🔥 YA ACTIVADO CORRECTAMENTE -->
                ${card("cotizaciones","📝","Cotizaciones")}

            </div>

            <h4 class="dm-label dm-mb-3">Sistema</h4>
            <div class="dm-list">
                <div class="dm-list-card" onclick="App.router.navigate('configuracion')">
                    ⚙️ Configuración
                </div>
            </div>

        </div>
    `;
};

// helper para no repetir código
function card(route, icon, label){
    return `
        <div class="dm-list-card" onclick="App.router.navigate('${route}')">
            <div class="dm-row">
                <div>${icon}</div>
                <strong>${label}</strong>
            </div>
        </div>
    `;
}

// ==========================================
// CONFIGURACIÓN
// ==========================================

App.views.configuracion = function() {
    return `
        <div class="dm-section">
            <div class="dm-card">
                <button class="dm-btn" onclick="App.logic.descargarRespaldo()">💾 Respaldo</button>
                <button class="dm-btn dm-btn-danger" onclick="localStorage.clear(); location.reload();">Cerrar sesión</button>
            </div>
        </div>
    `;
};
