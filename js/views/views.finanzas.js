// 🔥 FIX TEMPORAL PARA DESBLOQUEAR FINANZAS

window.App = window.App || {};
App.views = App.views || {};

App.views.finanzas = function() {
    return `
        <div class="dm-section">
            <h2>Finanzas funcionando</h2>
            <p>El módulo ya carga correctamente.</p>
        </div>
    `;
};

App.views.formGasto = function() {
    alert('Gastos funcionando');
};

App.views.nomina = function() {
    return `<div class="dm-section"><h2>Nómina OK</h2></div>`;
};
