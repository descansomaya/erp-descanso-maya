window.App = window.App || {};
App.views = App.views || {};

// ==========================================
// HELPERS INTERNOS DE PRODUCCIÓN
// ==========================================
App.views._getAsignacionesOrden = function (ordenId) {
    return (App.state?.ordenes_produccion_artesanos || [])
        .filter(a => a.orden_id === ordenId && String(a.estado || "activo").toLowerCase() !== "cancelado");
};

App.views._getRecetaOrden = function (orden) {
    try {
        const receta = JSON.parse(orden?.receta_personalizada || "[]");
        return Array.isArray(receta) ? receta : [];
    } catch (e) {
        return [];
    }
};

App.views._renderAsignacionesOrden = function (ordenId) {
    const asignaciones = App.views._getAsignacionesOrden(ordenId);

    if (!asignaciones.length) {
        return `<div class="dm-text-sm dm-muted dm-mt-1"><i>Sin artesanos asignados</i></div>`;
    }

    let html = `<ul style="margin:5px 0 0 20px; padding:0; font-size:13px; color:var(--dm-muted);">`;

    asignaciones.forEach(a => {
        const artesano = (App.state?.artesanos || []).find(x => x.id === a.artesano_id);
        const nombreArtesano = artesano ? artesano.nombre : "Artesano";
        const componente = a.componente || a.aplica_a || "Total";
        const pago = parseFloat(a.pago_estimado || 0) || 0;

        html += `<li>${App.ui.safe(nombreArtesano)} · ${App.ui.safe(componente)} · $${pago.toFixed(2)}</li>`;
    });

    html += `</ul>`;
    return html;
};

App.views._totalPagoArtesanosOrden = function (ordenId) {
    const asignaciones = App.views._getAsignacionesOrden(ordenId);
    return asignaciones.reduce((acc, a) => acc + (parseFloat(a.pago_estimado || 0) || 0), 0);
};

App.views._generarListaProd = function (estadoFiltro) {
    const ordenes = (App.state?.ordenes_produccion || [])
        .filter(o => o.estado === estadoFiltro)
        .sort((a, b) => new Date(b.fecha_creacion || 0) - new Date(a.fecha_creacion || 0));

    if (ordenes.length === 0) {
        return `<div class="dm-alert dm-alert-info">No hay órdenes en esta sección.</div>`;
    }

    let html = `<div class="dm-list">`;

    ordenes.forEach(o => {
        const pDetalle = (App.state?.pedido_detalle || []).find(d => d.id === o.pedido_detalle_id) || {};
        const producto = (App.state?.productos || []).find(p => p.id === pDetalle.producto_id) || {};

        const estColor =
            o.estado === "listo"
                ? "dm-badge-success"
                : o.estado === "proceso"
                    ? "dm-badge-warning"
                    : "dm-badge-info";

        let costoMateriales = 0;
        let listaHilosHTML = "";
        const receta = App.views._getRecetaOrden(o);

        if (receta.length > 0) {
            listaHilosHTML += `<ul style="margin:5px 0 0 20px; padding:0; font-size:13px; color:var(--dm-muted);">`;

            receta.forEach(item => {
                const mat = (App.state?.inventario || []).find(m => m.id === item.mat_id);
                if (!mat) return;

                const costoItem =
                    (parseFloat(mat.costo_unitario || 0) || 0) *
                    (parseFloat(item.cant || 0) || 0);

                costoMateriales += costoItem;
                listaHilosHTML += `<li>${App.ui.safe(item.cant)}x ${App.ui.safe(mat.nombre)} (${App.ui.safe(item.uso || "N/A")})</li>`;
            });

            listaHilosHTML += `</ul>`;
        } else {
            listaHilosHTML = `<div class="dm-text-sm dm-muted dm-mt-1"><i>Sin hilos asignados</i></div>`;
        }

        const precioVenta =
            (parseFloat(pDetalle.precio_unitario || 0) || 0) *
            (parseFloat(pDetalle.cantidad || 1) || 1);

        const pagoArtesano = App.views._totalPagoArtesanosOrden(o.id);
        const utilidad = precioVenta - costoMateriales - pagoArtesano;

        const colorUtilidad =
            utilidad > 0
                ? "var(--dm-success)"
                : utilidad === 0
                    ? "var(--dm-warning)"
                    : "var(--dm-danger)";

        const asignacionesHTML = App.views._renderAsignacionesOrden(o.id);

        html += `
            <div class="dm-list-card">
                <div class="dm-list-card-top">
                    <div>
                        <div class="dm-list-card-title">${App.ui.safe(producto.nombre || "Producto")}</div>
                        <div class="dm-list-card-subtitle dm-mt-2">
                            <span class="dm-badge ${estColor}">${App.ui.safe((o.estado || "").toUpperCase())}</span>
                            <span class="dm-badge dm-badge-primary">Folio: ${App.ui.safe((pDetalle.pedido_id || "").replace("PED-", ""))}</span>
                        </div>
                    </div>
                </div>

                <div class="dm-list-card-meta dm-mt-3 dm-mb-3" style="background:var(--dm-surface-2); padding:10px; border-radius:var(--dm-radius-md);">
                    <div class="dm-mt-2">🧑‍🎨 <strong>Asignaciones:</strong>
                        ${asignacionesHTML}
                    </div>

                    <div class="dm-mt-2">🧶 <strong>Hilos Asignados:</strong>
                        ${listaHilosHTML}
                    </div>

                    <hr style="border:0; border-top:1px dashed var(--dm-border); margin:10px 0;">

                    <div class="dm-row-between" style="align-items:center;">
                        <div class="dm-text-sm dm-muted">
                            Venta: $${precioVenta.toFixed(2)}<br>
                            Insumos: $${costoMateriales.toFixed(2)}<br>
                            Artesanos: $${pagoArtesano.toFixed(2)}
                        </div>
                        <div style="text-align:right;">
                            <span class="dm-text-sm dm-muted">Utilidad Neta</span><br>
                            <strong style="color:${colorUtilidad}; font-size:16px;">$${utilidad.toFixed(2)}</strong>
                        </div>
                    </div>
                </div>

                <div class="dm-list-card-actions">
                    <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.verDetallesProduccion('${o.id}')">👁️ Detalles</button>
                    ${o.estado === "pendiente" ? `<button class="dm-btn dm-btn-primary dm-btn-sm" onclick="App.logic.cambiarEstadoProduccion('${o.id}', 'proceso')">▶️ Iniciar</button>` : ""}
                    ${o.estado === "proceso" ? `<button class="dm-btn dm-btn-success dm-btn-sm" onclick="App.logic.cambiarEstadoProduccion('${o.id}', 'listo')">✅ Terminar</button>` : ""}
                    <button class="dm-btn dm-btn-danger dm-btn-sm" onclick="App.logic.eliminarRegistroGenerico('ordenes_produccion', '${o.id}', 'ordenes_produccion')">🗑️</button>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    return html;
};

// ==========================================
// VISTA PRINCIPAL DE PRODUCCIÓN
// ==========================================
App.views.produccion = function () {
    const headerTitle = document.getElementById("app-header-title");
    const headerSubtitle = document.getElementById("app-header-subtitle");

    if (headerTitle) headerTitle.innerText = "Taller";
    if (headerSubtitle) headerSubtitle.innerText = "Órdenes de producción";

    return `
        <div class="dm-section">
            <div class="dm-tabs dm-mb-4">
                <button class="dm-tab active tab-btn-prod" onclick="window.switchTabProd('pendientes', this)">🕒 En Cola</button>
                <button class="dm-tab tab-btn-prod" onclick="window.switchTabProd('proceso', this)">🔥 En Proceso</button>
                <button class="dm-tab tab-btn-prod" onclick="window.switchTabProd('listas', this)">✅ Listas</button>
            </div>

            <input
                type="text"
                id="bus-prod"
                class="dm-input dm-mb-4"
                onkeyup="window.filtrarLista('bus-prod', 'dm-list-card')"
                placeholder="🔍 Buscar orden, producto o artesano..."
            >

            <div id="tab-pendientes" class="tab-content-prod" style="display:block;">
                ${App.views._generarListaProd("pendiente")}
            </div>

            <div id="tab-proceso" class="tab-content-prod" style="display:none;">
                ${App.views._generarListaProd("proceso")}
            </div>

            <div id="tab-listas" class="tab-content-prod" style="display:none;">
                ${App.views._generarListaProd("listo")}
            </div>
        </div>
    `;
};

// ==========================================
// DETALLE DE PRODUCCIÓN
// ==========================================
App.views.verDetallesProduccion = function (ordenId) {
    const o = (App.state?.ordenes_produccion || []).find(x => x.id === ordenId);
    if (!o) return;

    const pedDet = (App.state?.pedido_detalle || []).find(d => d.id === o.pedido_detalle_id) || {};
    const p = (App.state?.pedidos || []).find(x => x.id === pedDet.pedido_id) || {};
    const cliente = (App.state?.clientes || []).find(x => x.id === p.cliente_id) || {};
    const prod = (App.state?.productos || []).find(x => x.id === pedDet.producto_id) || {};
    const nomCliente = p.cliente_id === "STOCK_INTERNO" ? "STOCK BODEGA" : (cliente.nombre || "Desconocido");

    const asignaciones = App.views._getAsignacionesOrden(o.id);

    let asignacionesHtml = "";
    if (!asignaciones.length) {
        asignacionesHtml = `<div class="dm-alert dm-alert-info">Aún no hay asignaciones multiartesano registradas para esta orden.</div>`;
    } else {
        asignacionesHtml = `<div class="dm-list dm-mb-3">` + asignaciones.map(a => {
            const artesano = (App.state?.artesanos || []).find(x => x.id === a.artesano_id);
            const nombreArtesano = artesano ? artesano.nombre : "Artesano";
            return `
                <div class="dm-list-card">
                    <div class="dm-row-between" style="align-items:flex-start; gap:12px;">
                        <div style="flex:1;">
                            <strong>${App.ui.safe(nombreArtesano)}</strong>
                            <div class="dm-text-sm dm-muted dm-mt-2">
                                Componente: ${App.ui.safe(a.componente || a.aplica_a || "Total")}<br>
                                Esquema: ${App.ui.safe(a.esquema_pago || a.modo_calculo || "fijo")}
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <strong>$${(parseFloat(a.pago_estimado || 0) || 0).toFixed(2)}</strong>
                        </div>
                    </div>
                </div>
            `;
        }).join("") + `</div>`;
    }

    const html = `
        <div class="dm-list-card dm-mb-4" style="background:var(--dm-surface-2); padding:15px; border:none;">
            <div class="dm-row-between dm-mb-2">
                <span class="dm-text-sm dm-muted">Folio / Cliente:</span>
                <strong style="color:var(--dm-primary);">${App.ui.safe((p.id || "").replace("PED-", ""))} - ${App.ui.safe(nomCliente)}</strong>
            </div>
            <div class="dm-row-between">
                <span class="dm-text-sm dm-muted">Producto a tejer:</span>
                <strong>${App.ui.safe(prod.nombre || "No definido")}</strong>
            </div>
        </div>

        <div class="dm-form-group">
            <label class="dm-label">Notas de Producción</label>
            <div class="dm-alert dm-alert-warning" style="background:#fff;">
                ${p.notas ? App.ui.escapeHTML(p.notas) : "<i>Sin instrucciones especiales.</i>"}
            </div>
        </div>

        <div class="dm-mb-3">
            <h4 class="dm-label dm-mb-2">Asignaciones registradas</h4>
            ${asignacionesHtml}
        </div>

        <div class="dm-row-between dm-mt-4">
            <button class="dm-btn dm-btn-secondary" onclick="App.ui.closeSheet()">Cerrar</button>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button class="dm-btn dm-btn-primary" onclick="App.ui.closeSheet(); setTimeout(()=>App.views.formAsignacionMultiArtesano('${o.id}'), 250);">+ Asignar artesano</button>
                ${o.estado !== "listo" ? `<button class="dm-btn dm-btn-ghost" style="border:1px solid var(--dm-border);" onclick="App.views.modalMateriaPrima('${o.id}')">🧶 Asignar Hilos</button>` : ""}
            </div>
        </div>
    `;

    App.ui.openSheet("Detalle de Producción", html);
};

window.verDetallesProduccion = function (ordenId) {
    return App.views.verDetallesProduccion(ordenId);
};

// ==========================================
// FORMULARIO MULTIARTESANO
// ==========================================
App.views.formAsignacionMultiArtesano = function (ordenId) {
    const orden = (App.state?.ordenes_produccion || []).find(o => o.id === ordenId);
    if (!orden) return;

    const artesanosOpts = (App.state?.artesanos || []).map(a =>
        `<option value="${a.id}">${App.ui.safe(a.nombre)}</option>`
    ).join("");

    const formHTML = `
        <form id="dynamic-form">
            <input type="hidden" name="orden_id" value="${ordenId}">

            <div class="dm-form-group">
                <label class="dm-label">Artesano</label>
                <select class="dm-select" name="artesano_id" id="select-artesano-multi" required
                    onchange="window.cargarTarifasMulti(this.value)">
                    <option value="">-- Seleccione artesano --</option>
                    ${artesanosOpts}
                </select>
            </div>

            <div class="dm-form-group">
                <label class="dm-label">Tarifa</label>
                <select class="dm-select" name="tarifa_artesano_id" id="select-tarifas-multi" required
                    onchange="window.calcTotalTrabajoMulti()">
                    <option value="">-- Seleccione artesano primero --</option>
                </select>
            </div>

            <div class="dm-form-group">
                <label class="dm-label">Componente</label>
                <select class="dm-select" name="componente" id="componente-multi" onchange="window.calcTotalTrabajoMulti()">
                    <option value="total">Total</option>
                    <option value="Cuerpo">Cuerpo</option>
                    <option value="Brazos">Brazos</option>
                    <option value="Adicional">Adicional</option>
                </select>
            </div>

            <div class="dm-form-row">
                <div class="dm-form-group">
                    <label class="dm-label">Esquema</label>
                    <input type="text" class="dm-input" name="esquema_pago" id="esquema-pago-multi" readonly>
                </div>
                <div class="dm-form-group">
                    <label class="dm-label">Monto base</label>
                    <input type="number" step="0.01" class="dm-input" name="monto_tarifa_apl" id="monto-base-multi" readonly>
                </div>
            </div>

            <div class="dm-form-row">
                <div class="dm-form-group">
                    <label class="dm-label">Factor</label>
                    <input type="number" step="0.01" class="dm-input" name="factor_participac" id="factor-multi" readonly>
                </div>
                <div class="dm-form-group">
                    <label class="dm-label">Pago estimado</label>
                    <input type="number" step="0.01" class="dm-input" name="pago_estimado" id="pago-estimado-multi" readonly>
                </div>
            </div>

            <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">
                Guardar asignación
            </button>
        </form>
    `;

    App.ui.openSheet("Nueva asignación de artesano", formHTML, (data) => {
        App.logic.guardarAsignacionMultiArtesano(data);
    });
};

// ==========================================
// HELPERS GLOBALES MULTIARTESANO
// ==========================================
window.cargarTarifasMulti = function (artesanoId) {
    const tarifas = (App.state?.tarifas_artesano || []).filter(t => t.artesano_id === artesanoId);
    const select = document.getElementById("select-tarifas-multi");
    if (!select) return;

    select.innerHTML =
        '<option value="">-- Seleccione Trabajo --</option>' +
        tarifas.map(t => `
            <option
                value="${t.id || ''}"
                data-monto="${t.monto || 0}"
                data-modo-calculo="${t.modo_calculo || 'fijo'}"
                data-aplica-a="${t.aplica_a || 'total'}"
                data-tarifa-nombre="${App.ui.escapeHTML(t.clasificacion || 'Tarea')}"
            >
                ${App.ui.escapeHTML(t.clasificacion || "Tarea")} ($${t.monto || 0})
            </option>
        `).join("");

    window.calcTotalTrabajoMulti();
};

window.calcTotalTrabajoMulti = function () {
    const sel = document.getElementById("select-tarifas-multi");
    const componenteSel = document.getElementById("componente-multi");
    const montoBase = document.getElementById("monto-base-multi");
    const esquema = document.getElementById("esquema-pago-multi");
    const factor = document.getElementById("factor-multi");
    const pago = document.getElementById("pago-estimado-multi");
    const ordenIdInput = document.querySelector('#dynamic-form input[name="orden_id"]');

    if (!sel || !montoBase || !esquema || !factor || !pago || !ordenIdInput) return;

    if (!sel.value) {
        montoBase.value = "";
        esquema.value = "";
        factor.value = "";
        pago.value = "";
        return;
    }

    const selectedOption = sel.options[sel.selectedIndex];
    const monto = parseFloat(selectedOption?.dataset?.monto || 0) || 0;
    const modoCalculo = selectedOption?.dataset?.modoCalculo || "fijo";
    const aplicaAOriginal = selectedOption?.dataset?.aplicaA || "total";
    const componenteManual = componenteSel?.value || "total";
    const aplicaA = modoCalculo === "por_unidad" ? (componenteManual || aplicaAOriginal) : aplicaAOriginal;

    const orden = (App.state?.ordenes_produccion || []).find(o => o.id === ordenIdInput.value);

    let receta = [];
    try {
        receta = JSON.parse(orden?.receta_personalizada || "[]");
    } catch (e) {
        receta = [];
    }

    let baseCalculo = 1;

    if (modoCalculo === "por_unidad") {
        if (aplicaA === "total") {
            baseCalculo = receta.reduce((acc, item) => acc + (parseFloat(item.cant || 0) || 0), 0);
        } else {
            baseCalculo = receta
                .filter(item => String(item.uso || "").toLowerCase() === String(aplicaA).toLowerCase())
                .reduce((acc, item) => acc + (parseFloat(item.cant || 0) || 0), 0);
        }
    }

    montoBase.value = monto.toFixed(2);
    esquema.value = modoCalculo;
    factor.value = baseCalculo.toFixed(2);
    pago.value = (monto * baseCalculo).toFixed(2);
};

// ==========================================
// MODAL DE MATERIA PRIMA
// ==========================================
App.views.modalMateriaPrima = function (ordenId) {
    const ord = (App.state?.ordenes_produccion || []).find(o => o.id === ordenId);
    if (!ord) return;

    let receta = [];
    try {
        receta = JSON.parse(ord.receta_personalizada || "[]");
    } catch (e) {
        receta = [];
    }

    let html = `
        <form id="dynamic-form">
            <input type="hidden" name="orden_id" value="${ordenId}">
            <div id="cont-receta-prod">
    `;

    if (receta.length > 0) {
        receta.forEach(r => {
            html += window.generarFilaRecetaProd(r.mat_id, r.cant, r.uso);
        });
    } else {
        html += window.generarFilaRecetaProd("", "", "Cuerpo");
    }

    html += `
            </div>

            <button
                type="button"
                class="dm-btn dm-btn-ghost dm-btn-block dm-mb-4"
                onclick="window.agregarFilaRecetaProd()"
            >
                + Añadir hilo
            </button>

            <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">
                💾 Guardar y Descontar Inventario
            </button>
        </form>
    `;

    App.ui.openSheet("Hilos Utilizados", html, (data) => {
        const matIds = Array.isArray(data["mat_id[]"]) ? data["mat_id[]"] : [data["mat_id[]"]];
        const cants = Array.isArray(data["cant[]"]) ? data["cant[]"] : [data["cant[]"]];
        const usos = Array.isArray(data["uso[]"]) ? data["uso[]"] : [data["uso[]"]];

        const recetaFinal = [];

        for (let i = 0; i < matIds.length; i++) {
            if (matIds[i]) {
                recetaFinal.push({
                    mat_id: matIds[i],
                    cant: cants[i],
                    uso: usos[i]
                });
            }
        }

        App.logic.guardarRecetaProduccion(ordenId, recetaFinal);
    });
};
