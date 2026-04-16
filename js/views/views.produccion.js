window.App = window.App || {};
App.views = App.views || {};

// ==========================================
// HELPERS INTERNOS DE PRODUCCIÓN
// ==========================================
App.views._generarListaProd = function (estadoFiltro) {
    const ordenes = (App.state?.ordenes_produccion || [])
        .filter(o => o.estado === estadoFiltro)
        .sort((a, b) => new Date(b.fecha_creacion || 0) - new Date(a.fecha_creacion || 0));

    if (ordenes.length === 0) {
        return `<div class="dm-alert dm-alert-info">No hay órdenes en esta sección.</div>`;
    }

    let html = `<div class="dm-list">`;

    ordenes.forEach(o => {
        const artesanoAsignado = (App.state?.artesanos || []).find(a => a.id === o.artesano_id);
        const nombreArtesano = artesanoAsignado ? App.ui.safe(artesanoAsignado.nombre) : "⚠️ Sin asignar";

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
        let receta = [];

        try {
            receta = JSON.parse(o.receta_personalizada || "[]");
        } catch (e) {
            receta = [];
        }

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

        const pagoArtesano = parseFloat(o.pago_estimado || 0) || 0;
        const utilidad = precioVenta - costoMateriales - pagoArtesano;

        const colorUtilidad =
            utilidad > 0
                ? "var(--dm-success)"
                : utilidad === 0
                    ? "var(--dm-warning)"
                    : "var(--dm-danger)";

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
                    <div class="dm-mb-2">🧑‍🎨 <strong>Artesano:</strong> ${nombreArtesano}</div>
                    ${o.pago_estimado ? `<div>💰 <strong>Pago Asignado:</strong> $${pagoArtesano.toFixed(2)}</div>` : ""}

                    <div class="dm-mt-2">🧶 <strong>Hilos Asignados:</strong>
                        ${listaHilosHTML}
                    </div>

                    <hr style="border:0; border-top:1px dashed var(--dm-border); margin:10px 0;">

                    <div class="dm-row-between" style="align-items:center;">
                        <div class="dm-text-sm dm-muted">
                            Venta: $${precioVenta.toFixed(2)}<br>
                            Insumos: $${costoMateriales.toFixed(2)}
                        </div>
                        <div style="text-align:right;">
                            <span class="dm-text-sm dm-muted">Utilidad Neta</span><br>
                            <strong style="color:${colorUtilidad}; font-size:16px;">$${utilidad.toFixed(2)}</strong>
                        </div>
                    </div>
                </div>

                <div class="dm-list-card-actions">
                    <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.verDetallesProduccion('${o.id}')">👁️ Detalles y Asignar</button>
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
                placeholder="🔍 Buscar orden o artesano..."
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
    const nomCliente = p.cliente_id === "STOCK_INTERNO"
        ? "STOCK BODEGA"
        : (cliente.nombre || "Desconocido");

    let artesanosOpts = '<option value="">-- Sin Asignar --</option>';
    (App.state?.artesanos || []).forEach(art => {
        artesanosOpts += `<option value="${art.id}" ${o.artesano_id === art.id ? "selected" : ""}>${App.ui.safe(art.nombre)}</option>`;
    });

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

        <form id="dynamic-form">
            <input type="hidden" name="id" value="${o.id}">
            <h4 class="dm-label dm-mb-3">Asignación y Tabulador</h4>

            <div class="dm-form-group">
                <label class="dm-label">Seleccionar Artesano</label>
                <select class="dm-select" name="artesano_id" id="select-artesano" onchange="window.cargarTarifas(this.value)" required>
                    ${artesanosOpts}
                </select>
            </div>

            <div class="dm-form-row">
                <div class="dm-form-group">
                    <label class="dm-label">Tipo de Trabajo (Tarifa)</label>
                    <select class="dm-select" id="select-tarifas" name="tarifa_artesano_id" onchange="window.calcTotalTrabajo()" required>
                        <option value="">-- Seleccione Artesano Primero --</option>
                    </select>
                </div>

                <div class="dm-form-group hidden">
                    <input type="number" id="cant-trabajo" value="1" oninput="window.calcTotalTrabajo()">
                    <input type="hidden" id="tarea_nombre" name="tarifa_nombre">
                </div>

                <div class="dm-form-group">
                    <label class="dm-label">Pago Estimado ($)</label>
                    <input type="number" step="0.01" class="dm-input" id="total-trabajo" name="pago_estimado" value="${o.pago_estimado || ""}" readonly style="background:#f3f4f6;">
                </div>
            </div>

            <button type="submit" class="dm-btn dm-btn-primary dm-btn-block dm-mt-4">💾 Guardar Asignación</button>
        </form>

        <div class="dm-row-between dm-mt-4">
            <button class="dm-btn dm-btn-secondary" onclick="App.ui.closeSheet()">Cerrar</button>
            ${o.estado !== "listo"
                ? `<button class="dm-btn dm-btn-ghost" style="border:1px solid var(--dm-border);" onclick="App.views.modalMateriaPrima('${o.id}')">🧶 Asignar Hilos</button>`
                : ""}
        </div>
    `;

    App.ui.openSheet("Detalle de Producción", html, (data) => {
        App.logic.guardarAsignacionProduccion(o.id, data);
        App.ui.toast("Asignación guardada con éxito");
        App.ui.closeSheet();
    });

    if (o.artesano_id) {
        setTimeout(() => {
            window.cargarTarifas(o.artesano_id);

            if (o.pago_estimado) {
                const selectTarifas = document.getElementById("select-tarifas");
                if (!selectTarifas) return;

                for (let i = 0; i < selectTarifas.options.length; i++) {
                    if (selectTarifas.options[i].value == o.pago_estimado) {
                        selectTarifas.selectedIndex = i;
                        break;
                    }
                }
            }
        }, 200);
    }
};

// Compatibilidad temporal con llamadas antiguas
window.verDetallesProduccion = function (ordenId) {
    return App.views.verDetallesProduccion(ordenId);
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
