window.App = window.App || {};
App.views = App.views || {};

// =============================
// FINANZAS PRINCIPAL (MODULAR)
// =============================
App.views.finanzas = function () {
    const title = document.getElementById('app-header-title');
    const subtitle = document.getElementById('app-header-subtitle');
    const bottomNav = document.getElementById('bottom-nav');

    if (title) title.innerText = 'Finanzas';
    if (subtitle) subtitle.innerText = 'Control financiero del negocio';
    if (bottomNav) bottomNav.style.display = 'flex';

    const pedidos = App.state.pedidos || [];
    const gastos = App.state.gastos || [];
    const abonos = App.state.abonos || [];
    const compras = App.state.compras || [];
    const pagosArtesanos = App.state.pago_artesanos || [];
    const cotizaciones = App.state.cotizaciones || [];

    const totalVentas = pedidos.reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);
    const totalGastos = gastos.reduce((acc, g) => acc + (parseFloat(g.monto || 0) || 0), 0);
    const totalCobrado = abonos.reduce((acc, a) => acc + (parseFloat(a.monto || 0) || 0), 0);
    const totalCompras = compras.reduce((acc, c) => acc + (parseFloat(c.total || 0) || 0), 0);
    const totalNomina = pagosArtesanos.reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);
    const totalCotizado = cotizaciones.reduce((acc, c) => acc + (parseFloat(c.total || 0) || 0), 0);

    const utilidad = totalCobrado - totalGastos;

    return `
        <div class="dm-section" style="padding-bottom:90px;">

            <div class="dm-card dm-mb-4">
                <h3 class="dm-card-title">Resumen financiero</h3>
                <p class="dm-muted dm-mt-2">Vista principal del módulo financiero modular.</p>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;" class="dm-mb-4">

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

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;" class="dm-mb-4">

                <div class="dm-card">
                    <div class="dm-kpi-label">Compras</div>
                    <div class="dm-kpi-value">$${totalCompras.toFixed(2)}</div>
                </div>

                <div class="dm-card">
                    <div class="dm-kpi-label">Nómina</div>
                    <div class="dm-kpi-value">$${totalNomina.toFixed(2)}</div>
                </div>

                <div class="dm-card">
                    <div class="dm-kpi-label">Cotizado</div>
                    <div class="dm-kpi-value">$${totalCotizado.toFixed(2)}</div>
                </div>

                <div class="dm-card">
                    <div class="dm-kpi-label">Registros de gastos</div>
                    <div class="dm-kpi-value">${gastos.length}</div>
                </div>

            </div>

            <div class="dm-card dm-mb-4">
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="dm-btn dm-btn-danger" onclick="App.views.formGasto()">+ Nuevo gasto</button>
                    <button class="dm-btn dm-btn-secondary" onclick="App.router.navigate('nomina')">Ver nómina</button>
                </div>
            </div>

        </div>
    `;
};