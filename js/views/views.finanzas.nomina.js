window.App = window.App || {};
App.views = App.views || {};

App.views.setNominaTab = function (tab) {
    App.state.nominaTab = tab || 'pagos';
    App.router.handleRoute();
};

App.views.marcarPagoArtesanoPagado = async function (pagoId) {
    try {
        const fechaPago = new Date().toISOString();
        const res = await App.api.fetch('actualizar_fila', {
            nombreHoja: 'pago_artesanos',
            idFila: pagoId,
            datosNuevos: {
                estado: 'pagado',
                fecha_pago: fechaPago
            }
        });

        if (res.status !== 'success') {
            App.ui.toast(res.message || 'No se pudo actualizar el pago', 'danger');
            return;
        }

        const arr = App.state.pago_artesanos || [];
        const idx = arr.findIndex(x => String(x.id) === String(pagoId));
        if (idx >= 0) {
            arr[idx].estado = 'pagado';
            arr[idx].fecha_pago = fechaPago;
        }

        App.ui.toast('Pago marcado como pagado');
        App.router.handleRoute();
    } catch (err) {
        App.ui.toast(String(err), 'danger');
    }
};

// ==========================================
// FASE 4: RESUMEN Y CALCULOS DE RENDIMIENTO (BLINDADO)
// ==========================================
App.views._resumenRendimientoArtesanos = function () {
    const artesanos = App.state.artesanos || [];
    const asignaciones = App.state.ordenes_produccion_artesanos || [];
    const ordenes = App.state.ordenes_produccion || [];
    const pagos = App.state.pago_artesanos || [];

    const reporte = [];

    artesanos.forEach(art => {
        // Filtrar asignaciones activas de este artesano
        const asigArt = asignaciones.filter(a => String(a.artesano_id) === String(art.id) && String(a.estado || 'activo').toLowerCase() !== 'cancelado');
        
        let completadas = 0;
        let enProceso = 0;
        let diasTotales = 0;
        let ordenesConTiempo = 0;
        let asignacionesValidasCount = 0;

        asigArt.forEach(a => {
            const ord = ordenes.find(o => String(o.id) === String(a.orden_id));
            
            // BLINDAJE: Solo procesa asignaciones cuyas órdenes existan activas en el taller
            if (ord) {
                asignacionesValidasCount += 1;
                const estOrd = String(ord.estado || '').toLowerCase().trim();

                if (estOrd === 'listo') {
                    completadas += 1;
                    
                    if (ord.fecha_creacion && (ord.fecha_descuento_materiales || ord.fecha_reversa_materiales)) {
                        const inicio = new Date(ord.fecha_descuento_materiales || ord.fecha_creacion);
                        const fin = new Date(ord.fecha_reversa_materiales || ord.fecha_creacion);
                        const diffDias = Math.max(1, Math.round((fin - inicio) / (1000 * 60 * 60 * 24)));
                        diasTotales += diffDias;
                        ordenesConTiempo += 1;
                    }
                } else if (estOrd === 'proceso') {
                    enProceso += 1;
                }
            }
        });

        const tiempoPromedio = ordenesConTiempo > 0 ? (diasTotales / ordenesConTiempo).toFixed(1) : 'N/A';

        const pagosArt = pagos.filter(p => String(p.artesano_id) === String(art.id));
        const totalPagado = pagosArt
            .filter(p => String(p.estado || '').toLowerCase() === 'pagado')
            .reduce((acc, p) => acc + (parseFloat(p.total || p.monto || 0) || 0), 0);

        const pendientePagar = pagosArt
            .filter(p => String(p.estado || '').toLowerCase() !== 'pagado')
            .reduce((acc, p) => acc + (parseFloat(p.total || p.monto || 0) || 0), 0);

        const totalGanadoHist = totalPagado + pendientePagar;

        reporte.push({
            id: art.id,
            nombre: art.nombre,
            especialidad: art.especialidad || 'Tejedor',
            totalTrabajos: asignacionesValidasCount,
            completadas,
            enProceso, // Muestra exactamente las órdenes con estado 'proceso'
            tiempoPromedio,
            totalPagado,
            pendientePagar,
            totalGanadoHist
        });
    });

    return reporte.sort((a, b) => b.completadas - a.completadas);
};

App.views._renderTabRendimientoArtesanos = function () {
    const reporte = App.views._resumenRendimientoArtesanos();
    const money = (n) => '$' + ((parseFloat(n || 0) || 0).toFixed(2));

    let html = `
        <div class="dm-card dm-mb-4">
            <div class="dm-card-title">Eficiencia y Desempeño del Taller</div>
            <p class="dm-muted dm-mt-1" style="font-size:13px;">Métricas de productividad, tiempos de entrega y acumulados por artesano.</p>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:12px;">
    `;

    if (!reporte.length) {
        html += `<div class="dm-alert dm-alert-info">No hay artesanos registrados.</div>`;
    } else {
        reporte.forEach(art => {
            const tieneDeuda = art.pendientePagar > 0;

            html += `
                <div class="dm-card" style="padding:16px;">
                    <div class="dm-row-between" style="align-items:flex-start; margin-bottom:10px;">
                        <div>
                            <strong style="font-size:16px;">👤 ${App.ui.safe(art.nombre)}</strong><br>
                            <small class="dm-muted">${App.ui.safe(art.especialidad)}</small>
                        </div>
                        <span class="dm-badge ${tieneDeuda ? 'dm-badge-warning' : 'dm-badge-success'}" style="font-size:11px;">
                            ${tieneDeuda ? 'Por pagar: ' + money(art.pendientePagar) : 'Al día'}
                        </span>
                    </div>

                    <div class="dm-card" style="background:var(--dm-surface-2); padding:10px; margin-bottom:10px;">
                        <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:8px; text-align:center;">
                            <div>
                                <small class="dm-muted">Completadas</small><br>
                                <strong style="color:var(--dm-success); font-size:15px;">${art.completadas} pzas</strong>
                            </div>
                            <div>
                                <small class="dm-muted">En proceso</small><br>
                                <strong style="color:#B7791F; font-size:15px;">${art.enProceso} pzas</strong>
                            </div>
                            <div style="margin-top:4px;">
                                <small class="dm-muted">Promedio entrega</small><br>
                                <strong>${art.tiempoPromedio !== 'N/A' ? art.tiempoPromedio + ' días' : 'N/A'}</strong>
                            </div>
                            <div style="margin-top:4px;">
                                <small class="dm-muted">Total histórico</small><br>
                                <strong>${money(art.totalGanadoHist)}</strong>
                            </div>
                        </div>
                    </div>

                    <div class="dm-row-between dm-text-sm" style="color:var(--dm-muted); font-size:12px;">
                        <span>Asignaciones: <strong>${art.totalTrabajos}</strong></span>
                        <span>Pagado: <strong style="color:green;">${money(art.totalPagado)}</strong></span>
                    </div>
                </div>
            `;
        });
    }

    html += `</div>`;
    return html;
};

App.views.nomina = function () {
    const tab = App.state.nominaTab || 'pagos';

    const activeTabPagos = tab === 'pagos' ? 'dm-btn-primary' : 'dm-btn-secondary';
    const activeTabRendimiento = tab === 'rendimiento' ? 'dm-btn-primary' : 'dm-btn-secondary';

    const selectorTabs = `
        <div class="dm-card dm-mb-4">
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button class="dm-btn ${activeTabPagos}" onclick="App.views.setNominaTab('pagos')">💰 Detalle de Pagos</button>
                <button class="dm-btn ${activeTabRendimiento}" onclick="App.views.setNominaTab('rendimiento')">📊 Rendimiento de Artesanos</button>
            </div>
        </div>
    `;

    if (tab === 'rendimiento') {
        return `
            <div class="dm-section" style="padding-bottom:90px;">
                ${selectorTabs}
                ${App.views._renderTabRendimientoArtesanos()}
            </div>
        `;
    }

    // VISTA ORIGINAL DE PAGOS
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

    const cardsResumen = Object.keys(resumen).map(n => `
        <div class="dm-card">
            <div class="dm-kpi-label">${n}</div>
            <div>Total: ${money(resumen[n].total)}</div>
            <div style="color:green">Pagado: ${money(resumen[n].pagado)}</div>
            <div style="color:#B7791F">Pendiente: ${money(resumen[n].pendiente)}</div>
        </div>
    `).join('');

    const detalleRows = pagos.map(p => {
        const art = artesanos.find(a => String(a.id) === String(p.artesano_id));
        const nombre = art?.nombre || p.artesano_id || 'Sin artesano';
        const esPendiente = norm(p.estado) !== 'pagado';
        return `
            <tr>
                <td>${nombre}</td>
                <td>${p.tipo_trabajo || '-'}</td>
                <td>${p.componente || '-'}</td>
                <td>${money(p.total)}</td>
                <td>${p.estado || '-'}</td>
                <td>${p.fecha || '-'}</td>
                <td>${p.fecha_pago || '-'}</td>
                <td>${esPendiente ? `<button class="dm-btn dm-btn-primary dm-btn-sm" onclick="App.views.marcarPagoArtesanoPagado('${p.id}')">Marcar pagado</button>` : '<span style="color:green;font-weight:600;">Pagado</span>'}</td>
            </tr>
        `;
    }).join('');

    const detalleCardsMobile = pagos.map(p => {
        const art = artesanos.find(a => String(a.id) === String(p.artesano_id));
        const nombre = art?.nombre || p.artesano_id || 'Sin artesano';
        const estado = norm(p.estado) === 'pagado' ? 'Pagado' : 'Pendiente';
        const estadoColor = norm(p.estado) === 'pagado' ? 'green' : '#B7791F';
        const accion = norm(p.estado) === 'pagado'
            ? '<span style="color:green; font-weight:600;">Pagado</span>'
            : `<button class="dm-btn dm-btn-primary dm-btn-sm" onclick="App.views.marcarPagoArtesanoPagado('${p.id}')">Marcar pagado</button>`;
        return `
            <div class="dm-card dm-mb-3" style="padding:14px;">
                <div class="dm-kpi-label">${nombre}</div>
                <div class="dm-mt-2"><strong>Total:</strong> ${money(p.total)}</div>
                <div><strong>Tipo:</strong> ${p.tipo_trabajo || '-'}</div>
                <div><strong>Componente:</strong> ${p.componente || '-'}</div>
                <div><strong>Estado:</strong> <span style="color:${estadoColor}; font-weight:600;">${estado}</span></div>
                <div><strong>Fecha:</strong> ${p.fecha || '-'}</div>
                <div><strong>Fecha pago:</strong> ${p.fecha_pago || '-'}</div>
                <div class="dm-mt-3">${accion}</div>
            </div>
        `;
    }).join('');

    return `
        <div class="dm-section" style="padding-bottom:90px;">
            ${selectorTabs}

            <div class="dm-card dm-mb-4">
                <h3 class="dm-card-title">Nómina real</h3>
                <div>Total pagado: ${money(totalPagado)}</div>
                <div>Pendiente: ${money(totalPendiente)}</div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;" class="dm-mb-4">
                ${cardsResumen}
            </div>

            <div class="dm-card dm-mb-4 hide-mobile" style="overflow:auto;">
                <div class="dm-card-title" style="margin-bottom:12px;">Detalle de pagos</div>
                <table class="dm-table" style="width:100%; min-width:900px;">
                    <thead>
                        <tr>
                            <th>Artesano</th>
                            <th>Tipo</th>
                            <th>Componente</th>
                            <th>Total</th>
                            <th>Estado</th>
                            <th>Fecha</th>
                            <th>Fecha pago</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${detalleRows || '<tr><td colspan="8">Sin registros</td></tr>'}
                    </tbody>
                </table>
            </div>

            <div class="show-mobile">
                <div class="dm-card dm-mb-4">
                    <div class="dm-card-title">Detalle de pagos</div>
                </div>
                ${detalleCardsMobile || '<div class="dm-muted">Sin registros</div>'}
            </div>

            <style>
                .show-mobile { display:none; }
                .hide-mobile { display:block; }
                @media (max-width: 768px) {
                    .show-mobile { display:block; }
                    .hide-mobile { display:none; }
                }
            </style>
        </div>
    `;
};
