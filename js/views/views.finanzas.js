window.App = window.App || {};
App.views = App.views || {};

App.views.finanzas = function () {
    const title = document.getElementById('app-header-title');
    const subtitle = document.getElementById('app-header-subtitle');
    const bottomNav = document.getElementById('bottom-nav');

    if (title) title.innerText = 'Finanzas';
    if (subtitle) subtitle.innerText = 'BI Dashboard PRO y flujo de efectivo';
    if (bottomNav) bottomNav.style.display = 'flex';

    setTimeout(() => {
        if (App.logic && App.logic.renderMiniGraficasDashboard) App.logic.renderMiniGraficasDashboard();
        if (App.logic && App.logic.renderGraficasFinanzas) App.logic.renderGraficasFinanzas('mes_actual');
    }, 100);

    return `
        <div class="dm-section" style="padding-bottom:90px;">

            <div class="dm-card dm-mb-4">
                <h3 class="dm-card-title">BI Dashboard PRO</h3>
                <p class="dm-muted">Visualización ejecutiva del negocio</p>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px;" class="dm-mb-4">
                <div class="dm-card">
                    <div class="dm-card-title">Vista rápida</div>
                    <div id="mini-graficas-dashboard" style="min-height:220px;"></div>
                </div>
                <div class="dm-card">
                    <div class="dm-card-title">Tendencias</div>
                    <div id="finanzas-graficas-principales" style="min-height:220px;"></div>
                </div>
            </div>

        </div>
    `;
};