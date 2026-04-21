window.App = window.App || {};
App.views = App.views || {};

App.views.nomina = function () {
    const pagos = App.state.pago_artesanos || [];

    const money = (n) => '$' + ((parseFloat(n || 0) || 0).toFixed(2));

    const totalPagado = pagos
        .filter(p => String(p.estado || '').toLowerCase() === 'pagado')
        .reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);

    const totalPendiente = pagos
        .filter(p => String(p.estado || '').toLowerCase() !== 'pagado')
        .reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);

    const resumen = {};
    pagos.forEach(p => {
        const nombre = p.artesano || 'Sin nombre';
        if (!resumen[nombre]) resumen[nombre] = { total: 0, pendiente: 0 };
        resumen[nombre].total += parseFloat(p.total || 0) || 0;
        if (String(p.estado || '').toLowerCase() !== 'pagado') {
            resumen[nombre].pendiente += parseFloat(p.total || 0) || 0;
        }
    });

    const lista = Object.keys(resumen).map(nombre => `
        <div class="dm-card dm-mb-2">
            <div class="dm-kpi-label">${nombre}</div>
            <div>Total: ${money(resumen[nombre].total)}</div>
            <div>Pendiente: ${money(resumen[nombre].pendiente)}</div>
        </div>
    `).join('');

    return `
        <div class="dm-section">
            <div class="dm-card dm-mb-4">
                <h3 class="dm-card-title">Nómina PRO</h3>
                <div>Total pagado: ${money(totalPagado)}</div>
                <div>Pendiente: ${money(totalPendiente)}</div>
            </div>
            ${lista || '<div class="dm-muted">Sin registros</div>'}
        </div>
    `;
};