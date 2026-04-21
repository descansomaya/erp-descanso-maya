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
    if (subtitle) subtitle.innerText = 'Flujo de efectivo y control financiero';
    if (bottomNav) bottomNav.style.display = 'flex';

    const pedidos = App.state.pedidos || [];
    const reparaciones = App.state.reparaciones || [];
    const gastos = App.state.gastos || [];
    const abonos = App.state.abonos || [];
    const abonosReparaciones = App.state.abonos_reparaciones || [];
    const compras = App.state.compras || [];
    const pagosArtesanos = App.state.pago_artesanos || [];
    const cotizaciones = App.state.cotizaciones || [];

    const totalVentas = pedidos.reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);
    const totalGastos = gastos.reduce((acc, g) => acc + (parseFloat(g.monto || 0) || 0), 0);
    const totalCobradoPedidos = abonos.reduce((acc, a) => acc + (parseFloat(a.monto || 0) || 0), 0) + pedidos.reduce((acc, p) => acc + (parseFloat(p.anticipo || 0) || 0), 0);
    const totalCobradoReparaciones = abonosReparaciones.reduce((acc, a) => acc + (parseFloat(a.monto || 0) || 0), 0) + reparaciones.reduce((acc, r) => acc + (parseFloat(r.anticipo_inicial || r.anticipo || 0) || 0), 0);
    const totalCobrado = totalCobradoPedidos + totalCobradoReparaciones;

    const totalCompras = compras.reduce((acc, c) => acc + (parseFloat(c.total || 0) || 0), 0);
    const totalNomina = pagosArtesanos.reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);
    const totalCotizado = cotizaciones.reduce((acc, c) => acc + (parseFloat(c.total || 0) || 0), 0);

    const porCobrarPedidos = pedidos.reduce((acc, p) => {
        const abonosPedido = abonos.filter(a => a.pedido_id === p.id).reduce((s, a) => s + (parseFloat(a.monto || 0) || 0), 0);
        const saldo = (parseFloat(p.total || 0) || 0) - (parseFloat(p.anticipo || 0) || 0) - abonosPedido;
        return acc + (saldo > 0 ? saldo : 0);
    }, 0);

    const porCobrarReparaciones = reparaciones.reduce((acc, r) => {
        const anticipo = parseFloat(r.anticipo_inicial || 0) || 0;
        const abonosRep = abonosReparaciones.filter(a => a.reparacion_id === r.id).reduce((s, a) => s + (parseFloat(a.monto || 0) || 0), 0);
        const saldo = (parseFloat(r.precio || 0) || 0) - anticipo - abonosRep;
        return acc + (saldo > 0 ? saldo : 0);
    }, 0);

    const dineroEnLaCalle = porCobrarPedidos + porCobrarReparaciones;

    const porPagarCompras = compras.reduce((acc, c) => {
        const total = parseFloat(c.total || 0) || 0;
        const pagado = c.monto_pagado !== undefined && c.monto_pagado !== '' ? parseFloat(c.monto_pagado || 0) : total;
        const deuda = total - pagado;
        return acc + (deuda > 0 ? deuda : 0);
    }, 0);

    const porPagarNomina = pagosArtesanos
        .filter(p => String(p.estado || '').toLowerCase() === 'pendiente')
        .reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);

    const totalPorPagar = porPagarCompras + porPagarNomina;
    const utilidad = totalCobrado - totalGastos;
    const flujoOperativo = totalCobrado - totalGastos - totalCompras - totalNomina;
    const saldoProyectado = dineroEnLaCalle - totalPorPagar;
    const salud = flujoOperativo >= 0 && saldoProyectado >= 0 ? 'Sana' : (flujoOperativo < 0 && saldoProyectado < 0 ? 'Crítica' : 'En observación');
    const saludColor = salud === 'Sana' ? 'green' : (salud === 'Crítica' ? 'red' : '#B7791F');

    return `
        <div class="dm-section" style="padding-bottom:90px;">

            <div class="dm-card dm-mb-4">
                <h3 class="dm-card-title">Flujo de efectivo PRO</h3>
                <p class="dm-muted dm-mt-2">Vista principal del módulo financiero modular con foco en liquidez, cobranza y compromisos.</p>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;" class="dm-mb-4">
                <div class="dm-card">
                    <div class="dm-kpi-label">Cobrado total</div>
                    <div class="dm-kpi-value">$${totalCobrado.toFixed(2)}</div>
                </div>
                <div class="dm-card">
                    <div class="dm-kpi-label">Dinero en la calle</div>
                    <div class="dm-kpi-value">$${dineroEnLaCalle.toFixed(2)}</div>
                </div>
                <div class="dm-card">
                    <div class="dm-kpi-label">Total por pagar</div>
                    <div class="dm-kpi-value">$${totalPorPagar.toFixed(2)}</div>
                </div>
                <div class="dm-card">
                    <div class="dm-kpi-label">Saldo proyectado</div>
                    <div class="dm-kpi-value" style="color:${saldoProyectado >= 0 ? 'green' : 'red'}">$${saldoProyectado.toFixed(2)}</div>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;" class="dm-mb-4">
                <div class="dm-card">
                    <div class="dm-kpi-label">Ventas totales</div>
                    <div class="dm-kpi-value">$${totalVentas.toFixed(2)}</div>
                </div>
                <div class="dm-card">
                    <div class="dm-kpi-label">Gastos</div>
                    <div class="dm-kpi-value">$${totalGastos.toFixed(2)}</div>
                </div>
                <div class="dm-card">
                    <div class="dm-kpi-label">Compras</div>
                    <div class="dm-kpi-value">$${totalCompras.toFixed(2)}</div>
                </div>
                <div class="dm-card">
                    <div class="dm-kpi-label">Nómina</div>
                    <div class="dm-kpi-value">$${totalNomina.toFixed(2)}</div>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;" class="dm-mb-4">
                <div class="dm-card">
                    <div class="dm-kpi-label">Utilidad simple</div>
                    <div class="dm-kpi-value" style="color:${utilidad >= 0 ? 'green' : 'red'}">$${utilidad.toFixed(2)}</div>
                </div>
                <div class="dm-card">
                    <div class="dm-kpi-label">Flujo operativo</div>
                    <div class="dm-kpi-value" style="color:${flujoOperativo >= 0 ? 'green' : 'red'}">$${flujoOperativo.toFixed(2)}</div>
                </div>
                <div class="dm-card">
                    <div class="dm-kpi-label">Cotizado</div>
                    <div class="dm-kpi-value">$${totalCotizado.toFixed(2)}</div>
                </div>
                <div class="dm-card">
                    <div class="dm-kpi-label">Salud financiera</div>
                    <div class="dm-kpi-value" style="color:${saludColor}">${salud}</div>
                </div>
            </div>

            <div class="dm-card dm-mb-4">
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
                    <div>
                        <div class="dm-kpi-label">Por cobrar pedidos</div>
                        <div class="dm-kpi-value">$${porCobrarPedidos.toFixed(2)}</div>
                    </div>
                    <div>
                        <div class="dm-kpi-label">Por cobrar reparaciones</div>
                        <div class="dm-kpi-value">$${porCobrarReparaciones.toFixed(2)}</div>
                    </div>
                    <div>
                        <div class="dm-kpi-label">Por pagar compras</div>
                        <div class="dm-kpi-value">$${porPagarCompras.toFixed(2)}</div>
                    </div>
                    <div>
                        <div class="dm-kpi-label">Por pagar nómina</div>
                        <div class="dm-kpi-value">$${porPagarNomina.toFixed(2)}</div>
                    </div>
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