App.views.nomina = function() {
    const contentDiv = document.getElementById("app-content");
    const headerTitle = document.getElementById("app-header-title");
    const headerSubtitle = document.getElementById("app-header-subtitle");

    if (headerTitle) headerTitle.textContent = "Nómina";
    if (headerSubtitle) headerSubtitle.textContent = "Pagos a artesanos";

    const pagos = App.state.pago_artesanos || [];
    const artesanos = App.state.artesanos || [];

    const pendientes = pagos.filter(p => String(p.estado || "").toLowerCase() === "pendiente");
    const pagados = pagos.filter(p => String(p.estado || "").toLowerCase() === "pagado");

    const totalPendiente = pendientes.reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);
    const totalPagado = pagados.reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);

    const renderLista = (items, estado) => {
        if (!items.length) {
            return `<div class="dm-alert dm-alert-info">No hay pagos ${estado}.</div>`;
        }

        return items.map(p => {
            const artesano = artesanos.find(a => a.id === p.artesano_id);
            const nombre = artesano ? artesano.nombre : "Artesano";
            const fecha = p.fecha ? String(p.fecha).split("T")[0] : "";
            const componente = p.componente || "Total";
            const trabajo = p.tipo_trabajo || "Trabajo";

            return `
                <div class="dm-list-card">
                    <div class="dm-row-between" style="align-items:flex-start; gap:12px;">
                        <div style="flex:1;">
                            <strong>${App.ui.escapeHTML(nombre)}</strong>
                            <div class="dm-text-sm dm-muted dm-mt-2">
                                Orden: ${App.ui.safe(p.orden_id || "")}<br>
                                Trabajo: ${App.ui.safe(trabajo)}<br>
                                Componente: ${App.ui.safe(componente)}<br>
                                Fecha: ${App.ui.safe(fecha)}
                            </div>
                        </div>

                        <div style="text-align:right;">
                            <div style="font-weight:bold; color:${estado === "pagado" ? "#2F855A" : "#805AD5"}; margin-bottom:6px;">
                                $${(parseFloat(p.total || 0) || 0).toFixed(2)}
                            </div>
                            ${estado !== "pagado"
                                ? `<button class="dm-btn dm-btn-primary dm-btn-sm" onclick="App.logic.marcarPagoArtesanoPagado('${p.id}')">✔ Pagado</button>`
                                : `<span class="dm-badge dm-badge-success">PAGADO</span>`
                            }
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    };

    const html = `
        <div class="dm-section" style="padding-bottom:90px;">
            <div class="dm-grid dm-grid-2 dm-mb-4">
                <div class="dm-card" style="background:#FAF5FF;">
                    <div class="dm-kpi-label" style="color:#6B46C1;">Pendiente por pagar</div>
                    <div class="dm-kpi-value" style="color:#805AD5; font-size:1.4rem;">$${totalPendiente.toFixed(2)}</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">${pendientes.length} pago(s)</div>
                </div>

                <div class="dm-card" style="background:#F0FFF4;">
                    <div class="dm-kpi-label" style="color:#2F855A;">Pagado acumulado</div>
                    <div class="dm-kpi-value" style="color:#38A169; font-size:1.4rem;">$${totalPagado.toFixed(2)}</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">${pagados.length} pago(s)</div>
                </div>
            </div>

            <h4 class="dm-label dm-mb-3">Pendientes</h4>
            <div class="dm-list dm-mb-5">
                ${renderLista(pendientes, "pendiente")}
            </div>

            <h4 class="dm-label dm-mb-3">Pagados</h4>
            <div class="dm-list">
                ${renderLista(pagados, "pagado")}
            </div>
        </div>
    `;

    if (contentDiv) contentDiv.innerHTML = html;
};
