// ==========================================
// VISTAS: MÓDULO DE COBRANZA Y CXC
// ==========================================

window.App = window.App || {};
App.views = App.views || {};

App.views.cobranza = function() {
    const bottomNav = document.getElementById('bottom-nav');
    if (bottomNav) bottomNav.style.display = 'flex';

    const pedidos = App.state.pedidos || [];
    const clientes = App.state.clientes || [];
    const abonos = App.state.abonos || [];
    const reparaciones = App.state.reparaciones || [];

    let listosConDeuda = [];
    let enProcesoConDeuda = [];
    let totalPorCobrar = 0;

    pedidos.forEach(p => {
        const abonosPedido = abonos
            .filter(a => a.pedido_id === p.id)
            .reduce((s, a) => s + parseFloat(a.monto || 0), 0);

        const saldo = parseFloat(p.total || 0) - parseFloat(p.anticipo || 0) - abonosPedido;

        if (saldo > 0) {
            totalPorCobrar += saldo;

            const c = clientes.find(cli => cli.id === p.cliente_id);
            const nombreCli = c
                ? c.nombre
                : (p.cliente_id === 'STOCK_INTERNO' ? 'Bodega' : 'Cliente');

            const tarjeta = `
                <div class="dm-list-card">
                    <div class="dm-row-between" style="align-items:flex-start; gap:12px; margin-bottom:8px;">
                        <div style="flex:1; min-width:0;">
                            <div class="dm-fw-bold" style="word-break:break-word;">
                                ${App.ui.safe((p.id || '').replace('PED-', ''))} - ${App.ui.safe(nombreCli)}
                            </div>
                            <div class="dm-text-sm dm-muted">
                                Estado: ${App.ui.safe(p.estado || 'Sin estado')}
                            </div>
                        </div>

                        <div style="text-align:right; flex:0 0 auto;">
                            <div style="color:#D69E2E; font-weight:700; font-size:1.1rem;">
                                $${saldo.toFixed(2)}
                            </div>
                            <div class="dm-text-sm dm-muted">Pendiente</div>
                        </div>
                    </div>

                    <div class="dm-card dm-mb-3" style="background:var(--dm-surface-2); padding:10px;">
                        <div class="dm-row-between dm-text-sm">
                            <span class="dm-muted">Total:</span>
                            <strong>$${parseFloat(p.total || 0).toFixed(2)}</strong>
                        </div>
                        <div class="dm-row-between dm-text-sm">
                            <span class="dm-muted">Pagado:</span>
                            <strong>$${(parseFloat(p.anticipo || 0) + abonosPedido).toFixed(2)}</strong>
                        </div>
                    </div>

                    <div class="dm-list-card-actions">
                        <button
                            class="dm-btn dm-btn-primary dm-btn-sm"
                            style="background:var(--success); border-color:var(--success);"
                            onclick="App.views.abrirCobroSeguro('${p.id}', '${p.cliente_id}', ${saldo})"
                        >
                            💰 Cobrar
                        </button>

                        <button
                            class="dm-btn dm-btn-secondary dm-btn-sm"
                            onclick="App.logic.imprimirNota('${p.id}')"
                        >
                            🖨️ Nota
                        </button>

                        ${c && c.telefono ? `
                            <button
                                class="dm-btn dm-btn-secondary dm-btn-sm"
                                style="color:#38A169; border-color:#38A169;"
                                onclick="App.views.enviarRecordatorioSeguro('${p.id}', '${p.estado === 'listo para entregar' ? 'listo' : 'cobro'}')"
                            >
                                💬 Recordatorio
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;

            if (p.estado === 'listo para entregar') listosConDeuda.push(tarjeta);
            else enProcesoConDeuda.push(tarjeta);
        }
    });

    reparaciones.forEach(r => {
        const saldo = parseFloat(r.precio || 0) - parseFloat(r.anticipo || 0);

        if (saldo > 0) {
            totalPorCobrar += saldo;

            const c = clientes.find(cli => cli.id === r.cliente_id);

            const tarjeta = `
                <div class="dm-list-card" style="border:1px dashed #805AD5; background:#FAF5FF;">
                    <div class="dm-row-between" style="align-items:flex-start; gap:12px; margin-bottom:8px;">
                        <div style="flex:1; min-width:0;">
                            <div class="dm-fw-bold" style="color:#6B46C1; word-break:break-word;">
                                ${App.ui.safe((r.id || '').replace('REP-', ''))} (Rep) - ${App.ui.safe(c ? c.nombre : 'Cliente')}
                            </div>
                            <div class="dm-text-sm dm-muted">
                                ${App.ui.safe(r.descripcion || 'Servicio')}
                            </div>
                        </div>

                        <div style="text-align:right; flex:0 0 auto;">
                            <div style="color:#D69E2E; font-weight:700; font-size:1.1rem;">
                                $${saldo.toFixed(2)}
                            </div>
                            <div class="dm-text-sm dm-muted">Pendiente</div>
                        </div>
                    </div>

                    <div class="dm-card dm-mb-3" style="background:#fff; padding:10px;">
                        <div class="dm-row-between dm-text-sm">
                            <span class="dm-muted">Total:</span>
                            <strong>$${parseFloat(r.precio || 0).toFixed(2)}</strong>
                        </div>
                        <div class="dm-row-between dm-text-sm">
                            <span class="dm-muted">Anticipo:</span>
                            <strong>$${parseFloat(r.anticipo || 0).toFixed(2)}</strong>
                        </div>
                    </div>

                    <div class="dm-list-card-actions">
                        <button
                            class="dm-btn dm-btn-secondary dm-btn-sm"
                            style="color:#6B46C1; border-color:#6B46C1;"
                            onclick="App.views.moduloNoDisponible('Reparaciones')"
                        >
                            🪡 Reparación pendiente
                        </button>
                    </div>
                </div>
            `;

            if (r.estado === 'entregada') listosConDeuda.push(tarjeta);
            else enProcesoConDeuda.push(tarjeta);
        }
    });

    let html = `
        <div class="dm-section" style="padding-bottom:90px;">
            <div class="dm-card dm-mb-4">
                <h3 class="dm-card-title">Cuentas por Cobrar (CxC)</h3>
                <p class="dm-muted" style="font-size:0.9rem; margin-bottom:0;">
                    Gestiona los saldos pendientes de tus clientes.
                </p>
            </div>

            <div class="dm-card dm-mb-4" style="background:#FEFCBF;">
                <div class="dm-kpi-label" style="color:#B7791F;">Dinero Total en la Calle</div>
                <div class="dm-kpi-value" style="color:#D69E2E; font-size:1.7rem;">$${totalPorCobrar.toFixed(2)}</div>
            </div>

            <div class="dm-mb-4">
                <h4 style="margin-bottom:10px; color:#C53030; display:flex; align-items:center; gap:8px;">
                    🚨 Listos para Entregar (Prioridad)
                    <span class="dm-badge dm-badge-danger">${listosConDeuda.length}</span>
                </h4>

                ${listosConDeuda.length === 0
                    ? `<div class="dm-alert dm-alert-info">No hay pedidos listos pendientes de pago.</div>`
                    : `<div class="dm-list">${listosConDeuda.join('')}</div>`
                }
            </div>

            <div class="dm-mb-4">
                <h4 style="margin-bottom:10px; color:#2B6CB0; display:flex; align-items:center; gap:8px;">
                    ⏳ En Producción (Abonos Pendientes)
                    <span class="dm-badge dm-badge-primary">${enProcesoConDeuda.length}</span>
                </h4>

                ${enProcesoConDeuda.length === 0
                    ? `<div class="dm-alert dm-alert-info">No hay deudas en taller.</div>`
                    : `<div class="dm-list">${enProcesoConDeuda.join('')}</div>`
                }
            </div>
        </div>
    `;

    return html;
};

// ==========================================
// Helpers seguros del módulo
// ==========================================

App.views.abrirCobroSeguro = function(pedidoId, clienteId, saldo) {
    if (typeof App.views.formCobrar === 'function') {
        App.views.formCobrar(pedidoId, clienteId, saldo);
        return;
    }

    if (typeof App.views.modalAbonos === 'function') {
        App.views.modalAbonos(pedidoId);
        return;
    }

    App.ui.toast('No está disponible la captura de cobro en esta versión.', 'warning');
};

App.views.enviarRecordatorioSeguro = function(pedidoId, tipo) {
    if (App.logic && typeof App.logic.enviarWhatsApp === 'function') {
        App.logic.enviarWhatsApp(pedidoId, tipo);
        return;
    }

    App.ui.toast('La función de WhatsApp no está disponible en esta versión.', 'warning');
};
