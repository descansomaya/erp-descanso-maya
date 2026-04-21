window.App = window.App || {};
App.views = App.views || {};

// =============================
// FINANZAS BASE ESTABLE
// =============================
App.views.finanzas = function () {
    const title = document.getElementById('app-header-title');
    const subtitle = document.getElementById('app-header-subtitle');

    if (title) title.innerText = 'Finanzas';
    if (subtitle) subtitle.innerText = 'Control financiero del negocio';

    const pedidos = App.state.pedidos || [];
    const gastos = App.state.gastos || [];
    const abonos = App.state.abonos || [];

    const totalVentas = pedidos.reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);
    const totalGastos = gastos.reduce((acc, g) => acc + (parseFloat(g.monto || 0) || 0), 0);
    const totalCobrado = abonos.reduce((acc, a) => acc + (parseFloat(a.monto || 0) || 0), 0);

    const utilidad = totalCobrado - totalGastos;

    return `
        <div class="dm-section">

            <div class="dm-card dm-mb-4">
                <h3 class="dm-card-title">Resumen financiero</h3>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">

                <div class="dm-card">
                    <div class="dm-kpi-label">Ventas totales</div>
                    <div class="dm-kpi-value">$${totalVentas.toFixed(2)}</div>
                </div>

                <div class="dm-card">
                    <div class="dm-kpi-label">Cobrado</div>
                    <div class="dm-kpi-value">$${totalCobrado.toFixed(2)}</div>
                </div>

                <div class="dm-card">
                    <div class="dm-kpi-label">Gastos</div>
                    <div class="dm-kpi-value">$${totalGastos.toFixed(2)}</div>
                </div>

                <div class="dm-card">
                    <div class="dm-kpi-label">Utilidad</div>
                    <div class="dm-kpi-value" style="color:${utilidad >= 0 ? 'green' : 'red'}">
                        $${utilidad.toFixed(2)}
                    </div>
                </div>

            </div>

            <div class="dm-mt-4">
                <button class="dm-btn dm-btn-danger" onclick="App.views.formGasto()">+ Nuevo gasto</button>
            </div>

        </div>
    `;
};
