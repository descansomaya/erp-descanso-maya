window.App = window.App || {};
App.views = App.views || {};

App.views.nomina = function () {
    const pagos = App.state.pago_artesanos || [];
    const artesanos = App.state.artesanos || [];

    const money = (n) => '$' + ((parseFloat(n || 0) || 0).toFixed(2));
    const norm = (v) => String(v || '').toLowerCase();

    const pendientes = pagos.filter(p => norm(p.estado) !== 'pagado');
    const pagados = pagos.filter(p => norm(p.estado) === 'pagado');

    const totalPagado = pagados.reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);
    const totalPendiente = pendientes.reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);

    const resumen = {};
    pagos.forEach(p => {
        const art = artesanos.find(a => String(a.id) === String(p.artesano_id));
        const nombre = art?.nombre || p.artesano_id || 'Sin artesano';

        if (!resumen[nombre]) {
            resumen[nombre] = { total: 0, pendiente: 0, pagado: 0 };
        }

        const total = parseFloat(p.total || 0) || 0;
        resumen[nombre].total += total;

        if (norm(p.estado) === 'pagado') resumen[nombre].pagado += total;
        else resumen[nombre].pendiente += total;
    });

    const cards = Object.keys(resumen).map(n => `
        <div class="dm-card">
            <div class="dm-kpi-label">${n}</div>
            <div>Total: ${money(resumen[n].total)}</div>
            <div style="color:green">Pagado: ${money(resumen[n].pagado)}</div>
            <div style="color:#B7791F">Pendiente: ${money(resumen[n].pendiente)}</div>
        </div>
    `).join('');

    const detalle = pagos.map(p => {
        const art = artesanos.find(a => String(a.id) === String(p.artesano_id));
        const nombre = art?.nombre || p.artesano_id;
        return `
            <tr>
                <td>${nombre}</td>
                <td>${p.tipo_trabajo || '-'}</td>
                <td>${p.componente || '-'}</td>
                <td>${money(p.total)}</td>
                <td>${p.estado}</td>
                <td>${p.fecha || '-'}</td>
                <td>${p.fecha_pago || '-'}</td>
            </tr>
        `;
    }).join('');

    return `
        <div class="dm-section">
            <div class="dm-card dm-mb-4">
                <h3 class="dm-card-title">Nómina real</h3>
                <div>Total pagado: ${money(totalPagado)}</div>
                <div>Pendiente: ${money(totalPendiente)}</div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;" class="dm-mb-4">
                ${cards}
            </div>

            <div class="dm-card">
                <table class="dm-table" style="width:100%">
                    <thead>
                        <tr>
                            <th>Artesano</th>
                            <th>Tipo</th>
                            <th>Componente</th>
                            <th>Total</th>
                            <th>Estado</th>
                            <th>Fecha</th>
                            <th>Fecha pago</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${detalle}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};