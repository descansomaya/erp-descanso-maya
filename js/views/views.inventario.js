// ==========================================
// VISTAS: INVENTARIO Y COMPRAS
// ==========================================

window.App = window.App || {};
App.views = App.views || {};

App.views._resumenInventario = function () {
    const inventario = App.state.inventario || [];
    const movimientos = App.state.movimientos_inventario || [];

    const resumen = {
        totalItems: inventario.length,
        stockTotal: 0,
        stockLibre: 0,
        itemsCriticos: 0,
        itemsEnCero: 0,
        valorInventario: 0,
        entradas30d: 0,
        salidas30d: 0,
        topCriticos: [],
        topValor: [],
        topRotacion: []
    };

    const hoy = new Date();
    const hace30 = new Date();
    hace30.setDate(hoy.getDate() - 30);

    inventario.forEach(i => {
        const real = parseFloat(i.stock_real || 0) || 0;
        const reservado = parseFloat(i.stock_reservado || 0) || 0;
        const comprometido = parseFloat(i.stock_comprometido || 0) || 0;
        const libre = real - reservado - comprometido;
        const minimo = parseFloat(i.stock_minimo || 0) || 0;
        const costo = parseFloat(i.costo_unitario || 0) || 0;
        const valor = real * costo;

        const salidasItem30d = movimientos
            .filter(m => m.material_id === i.id)
            .filter(m => {
                const fechaMov = m.fecha ? new Date(m.fecha) : null;
                return fechaMov && !isNaN(fechaMov.getTime()) && fechaMov >= hace30 && String(m.tipo || '').toLowerCase() === 'salida';
            })
            .reduce((acc, m) => acc + Math.abs(parseFloat(m.cantidad || 0) || 0), 0);

        const diasCobertura = salidasItem30d > 0 ? (real / salidasItem30d) * 30 : null;

        resumen.stockTotal += real;
        resumen.stockLibre += libre;
        resumen.valorInventario += valor;

        if (real <= 0) resumen.itemsEnCero += 1;
        if (minimo > 0 && libre <= minimo) resumen.itemsCriticos += 1;

        resumen.topCriticos.push({
            id: i.id,
            nombre: i.nombre,
            libre,
            minimo,
            unidad: i.unidad || "",
            tipo: i.tipo || "otro"
        });

        resumen.topValor.push({
            id: i.id,
            nombre: i.nombre,
            valor,
            stock: real,
            costo,
            unidad: i.unidad || ""
        });

        resumen.topRotacion.push({
            id: i.id,
            nombre: i.nombre,
            salidas30d: salidasItem30d,
            stock: real,
            diasCobertura,
            unidad: i.unidad || ''
        });
    });

    movimientos.forEach(m => {
        const fechaMov = m.fecha ? new Date(m.fecha) : null;
        if (!fechaMov || isNaN(fechaMov.getTime()) || fechaMov < hace30) return;

        const cantidad = Math.abs(parseFloat(m.cantidad || 0) || 0);
        if (String(m.tipo || "").toLowerCase() === "entrada") resumen.entradas30d += cantidad;
        if (String(m.tipo || "").toLowerCase() === "salida") resumen.salidas30d += cantidad;
    });

    resumen.topCriticos = resumen.topCriticos
        .filter(x => x.minimo > 0)
        .sort((a, b) => (a.libre - a.minimo) - (b.libre - b.minimo))
        .slice(0, 5);

    resumen.topValor = resumen.topValor
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 5);

    resumen.topRotacion = resumen.topRotacion
        .sort((a, b) => b.salidas30d - a.salidas30d)
        .slice(0, 5);

    return resumen;
};

App.views._renderDashboardInventario = function () {
    const r = App.views._resumenInventario();

    const topCriticosHTML = r.topCriticos.length
        ? r.topCriticos.map(x => `
            <div class="dm-row-between dm-mb-2" style="gap:12px; align-items:flex-start;">
                <div style="flex:1; min-width:0;">
                    <strong style="word-break:break-word;">${App.ui.safe(x.nombre)}</strong><br>
                    <small class="dm-muted">${App.ui.safe(x.tipo)} · ${App.ui.safe(x.unidad)}</small>
                </div>
                <div style="text-align:right; flex:0 0 auto;">
                    <strong style="color:var(--dm-danger);">${App.ui.number(x.libre, 1)}</strong><br>
                    <small class="dm-muted">Mín: ${App.ui.number(x.minimo, 1)}</small>
                </div>
            </div>
        `).join("")
        : `<div class="dm-alert dm-alert-success">Sin materiales críticos.</div>`;

    const topValorHTML = r.topValor.length
        ? r.topValor.map(x => `
            <div class="dm-row-between dm-mb-2" style="gap:12px; align-items:flex-start;">
                <div style="flex:1; min-width:0;">
                    <strong style="word-break:break-word;">${App.ui.safe(x.nombre)}</strong><br>
                    <small class="dm-muted">Stock: ${App.ui.number(x.stock, 1)} ${App.ui.safe(x.unidad)}</small>
                </div>
                <div style="text-align:right; flex:0 0 auto;">
                    <strong>${App.ui.money(x.valor)}</strong><br>
                    <small class="dm-muted">Costo: ${App.ui.money(x.costo)}</small>
                </div>
            </div>
        `).join("")
        : `<div class="dm-alert dm-alert-info">Sin datos suficientes.</div>`;

    const topRotacionHTML = r.topRotacion.length
        ? r.topRotacion.map(x => `
            <div class="dm-row-between dm-mb-2" style="gap:12px; align-items:flex-start;">
                <div style="flex:1; min-width:0;">
                    <strong style="word-break:break-word;">${App.ui.safe(x.nombre)}</strong><br>
                    <small class="dm-muted">Salidas 30d: ${App.ui.number(x.salidas30d, 1)} ${App.ui.safe(x.unidad)}</small>
                </div>
                <div style="text-align:right; flex:0 0 auto;">
                    <strong>${x.diasCobertura !== null ? App.ui.number(x.diasCobertura, 1) + ' días' : 'Sin rotación'}</strong><br>
                    <small class="dm-muted">Stock: ${App.ui.number(x.stock, 1)}</small>
                </div>
            </div>
        `).join("")
        : `<div class="dm-alert dm-alert-info">Sin movimientos suficientes.</div>`;

    return `
        <div class="dm-card dm-mb-4">
            <div style="display:flex; flex-direction:column; gap:10px;">
                <div>
                    <h3 class="dm-card-title">Dashboard de Inventario</h3>
                    <p class="dm-muted" style="margin-top:6px;">Vista ejecutiva tipo Power BI para control de stock, riesgo, valor y rotación.</p>
                </div>
                <div class="dm-text-sm dm-muted">Últimos 30 días</div>
            </div>
        </div>

        <div class="dm-mb-4" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(170px,1fr)); gap:12px;">
            <div class="dm-card"><small class="dm-muted">Valor inventario</small><div class="dm-text-xl dm-fw-bold">${App.ui.money(r.valorInventario)}</div></div>
            <div class="dm-card"><small class="dm-muted">Stock libre total</small><div class="dm-text-xl dm-fw-bold">${App.ui.number(r.stockLibre, 1)}</div></div>
            <div class="dm-card"><small class="dm-muted">Items críticos</small><div class="dm-text-xl dm-fw-bold" style="color:${r.itemsCriticos > 0 ? 'var(--dm-danger)' : 'var(--dm-success)'};">${r.itemsCriticos}</div></div>
            <div class="dm-card"><small class="dm-muted">Items en cero</small><div class="dm-text-xl dm-fw-bold" style="color:${r.itemsEnCero > 0 ? 'var(--dm-danger)' : 'var(--dm-success)'};">${r.itemsEnCero}</div></div>
        </div>

        <div class="dm-mb-4" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px,1fr)); gap:12px;">
            <div class="dm-card">
                <h4 class="dm-card-title">Flujo 30 días</h4>
                <div class="dm-row-between dm-mt-3">
                    <div><small class="dm-muted">Entradas</small><br><strong style="color:var(--dm-success); font-size:18px;">${App.ui.number(r.entradas30d, 1)}</strong></div>
                    <div><small class="dm-muted">Salidas</small><br><strong style="color:var(--dm-danger); font-size:18px;">${App.ui.number(r.salidas30d, 1)}</strong></div>
                </div>
                <div class="dm-mt-3" style="height:10px; background:var(--dm-surface-2); border-radius:999px; overflow:hidden; display:flex; margin-bottom:16px;">
                    <div style="width:${(r.entradas30d + r.salidas30d) > 0 ? ((r.entradas30d / (r.entradas30d + r.salidas30d)) * 100) : 50}%; background:var(--dm-success);"></div>
                    <div style="width:${(r.entradas30d + r.salidas30d) > 0 ? ((r.salidas30d / (r.entradas30d + r.salidas30d)) * 100) : 50}%; background:var(--dm-danger);"></div>
                </div>
                <div style="position:relative; width:100%; height:220px;"><canvas id="chartInventarioFlujo"></canvas></div>
            </div>

            <div class="dm-card">
                <h4 class="dm-card-title">Cobertura del inventario</h4>
                <div class="dm-mt-3" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(120px,1fr)); gap:10px;">
                    <div><small class="dm-muted">Items totales</small><br><strong style="font-size:18px;">${r.totalItems}</strong></div>
                    <div><small class="dm-muted">Stock físico</small><br><strong style="font-size:18px;">${App.ui.number(r.stockTotal, 1)}</strong></div>
                </div>
            </div>
        </div>

        <div class="dm-mb-4" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px,1fr)); gap:12px;">
            <div class="dm-card"><h4 class="dm-card-title">Top materiales críticos</h4><div class="dm-mt-3">${topCriticosHTML}</div></div>
            <div class="dm-card"><h4 class="dm-card-title">Top valor en inventario</h4><div class="dm-mt-3">${topValorHTML}</div></div>
            <div class="dm-card"><h4 class="dm-card-title">Rotación y cobertura</h4><div class="dm-mt-3">${topRotacionHTML}</div></div>
        </div>
    `;
};

App.views.renderChartInventario = function () {
    if (typeof Chart === 'undefined') return;

    const r = App.views._resumenInventario();
    const ctx = document.getElementById('chartInventarioFlujo');
    if (!ctx) return;

    if (App.views._chartInventarioFlujo) {
        App.views._chartInventarioFlujo.destroy();
    }

    App.views._chartInventarioFlujo = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Entradas 30d', 'Salidas 30d'],
            datasets: [{
                label: 'Movimientos',
                data: [r.entradas30d, r.salidas30d]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
};

// ==========================================
// INVENTARIO
// ==========================================
App.views.inventario = function() {
    const title = document.getElementById('app-header-title');
    const subtitle = document.getElementById('app-header-subtitle');
    const bottomNav = document.getElementById('bottom-nav');

    if (title) title.innerText = 'Inventario';
    if (subtitle) subtitle.innerText = 'Control ejecutivo y operativo';
    if (bottomNav) bottomNav.style.display = 'flex';

    const inventario = App.state.inventario || [];

    setTimeout(() => {
        App.views.renderChartInventario();
    }, 100);

    let html = `
        <div class="dm-section" style="padding-bottom:90px;">
            ${App.views._renderDashboardInventario()}

            <div class="dm-card dm-mb-4">
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <div>
                        <h3 class="dm-card-title">Inventario operativo</h3>
                        <p class="dm-muted dm-mb-0" style="margin-top:6px;">Consulta stock físico, apartado y comprometido.</p>
                    </div>
                    <input
                        type="text"
                        id="bus-inv"
                        class="dm-input"
                        onkeyup="window.filtrarLista('bus-inv', 'tarj-inv')"
                        placeholder="🔍 Buscar insumo..."
                    >
                </div>
            </div>

            <div class="dm-list">
    `;

    if (inventario.length === 0) {
        html += `<div class="dm-alert dm-alert-info">No hay insumos registrados.</div>`;
    } else {
        inventario.forEach(i => {
            const real = parseFloat(i.stock_real || 0);
            const reservado = parseFloat(i.stock_reservado || 0);
            const comprometido = parseFloat(i.stock_comprometido || 0);
            const libre = real - reservado - comprometido;
            const minimo = parseFloat(i.stock_minimo || 0);
            const badgeClass = (minimo > 0 && libre <= minimo) ? 'dm-badge-danger' : 'dm-badge-success';

            html += `
                <div class="dm-list-card tarj-inv">
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <div class="dm-row-between" style="align-items:flex-start; gap:12px; flex-wrap:wrap;">
                            <div style="flex:1; min-width:0;">
                                <div class="dm-list-card-title" style="word-break:break-word;">${App.ui.escapeHTML(i.nombre)}</div>
                                <div class="dm-list-card-subtitle">${App.ui.safe(i.tipo || 'OTRO')} · ${App.ui.safe(i.unidad || '')}</div>
                            </div>
                            <div style="flex:0 0 auto;"><span class="dm-badge ${badgeClass}">Libre: ${App.ui.number(libre, 1)} ${App.ui.safe(i.unidad || '')}</span></div>
                        </div>

                        <div class="dm-card" style="background:var(--dm-surface-2); padding:10px;">
                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(90px,1fr)); gap:10px; text-align:center;">
                                <div><small class="dm-muted">Físico</small><br><strong>${App.ui.number(real, 1)}</strong></div>
                                <div><small class="dm-muted">Apartado</small><br><strong style="color:var(--dm-warning);">${App.ui.number(reservado, 1)}</strong></div>
                                <div><small class="dm-muted">Taller</small><br><strong style="color:var(--dm-primary);">${App.ui.number(comprometido, 1)}</strong></div>
                            </div>
                        </div>

                        <div class="dm-text-sm dm-muted">Stock mínimo: <strong>${App.ui.number(minimo, 1)}</strong></div>

                        <div class="dm-list-card-actions" style="display:flex; gap:8px; flex-wrap:wrap;">
                            <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.modalKardex('${i.id}')">📋 Kardex</button>
                            <button class="dm-btn dm-btn-primary dm-btn-sm" onclick="App.views.formMaterial('${i.id}')">✏️ Editar</button>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    html += `
            </div>
        </div>

        <button class="dm-fab" onclick="App.views.formMaterial()">+</button>
    `;

    return html;
};

// ==========================================
// FORMULARIO DE INSUMO
// ==========================================
App.views.formMaterial = function(id = null, callback = null) {
    const obj = id ? (App.state.inventario || []).find(m => m.id === id) : null;

    const formHTML = `
        <form id="dynamic-form">
            <div class="dm-form-group">
                <label class="dm-label">Nombre</label>
                <input type="text" class="dm-input" name="nombre" value="${obj ? App.ui.escapeHTML(obj.nombre) : ''}" required>
            </div>

            <div class="dm-form-row" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px,1fr)); gap:12px;">
                <div class="dm-form-group">
                    <label class="dm-label">Tipo</label>
                    <select class="dm-select" name="tipo">
                        <option value="hilo" ${obj && obj.tipo === 'hilo' ? 'selected' : ''}>Hilo</option>
                        <option value="accesorio" ${obj && obj.tipo === 'accesorio' ? 'selected' : ''}>Accesorio</option>
                        <option value="reventa" ${obj && obj.tipo === 'reventa' ? 'selected' : ''}>Reventa</option>
                    </select>
                </div>

                <div class="dm-form-group">
                    <label class="dm-label">Unidad</label>
                    <select class="dm-select" name="unidad">
                        <option value="Tubos" ${obj && obj.unidad === 'Tubos' ? 'selected' : ''}>Tubos</option>
                        <option value="Kg" ${obj && obj.unidad === 'Kg' ? 'selected' : ''}>Kg</option>
                        <option value="Pzas" ${obj && obj.unidad === 'Pzas' ? 'selected' : ''}>Pzas</option>
                    </select>
                </div>
            </div>

            <div class="dm-form-row" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px,1fr)); gap:12px;">
                <div class="dm-form-group">
                    <label class="dm-label">Stock físico</label>
                    <input type="number" step="0.1" class="dm-input" name="stock_real" value="${obj ? obj.stock_real : '0'}" required>
                </div>

                <div class="dm-form-group">
                    <label class="dm-label">Stock mínimo</label>
                    <input type="number" step="0.1" class="dm-input" name="stock_minimo" value="${obj ? obj.stock_minimo : '0'}" required>
                </div>
            </div>

            <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">${obj ? 'Guardar Cambios' : 'Crear Insumo'}</button>
        </form>
    `;

    App.ui.openSheet(obj ? 'Editar Insumo' : 'Nuevo Insumo', formHTML, (data) => {
        if (obj) {
            App.logic.actualizarRegistroGenerico('materiales', id, data, 'inventario');
        } else {
            App.logic.guardarNuevoGenerico('materiales', data, 'MAT', 'inventario', callback);
        }
    });
};

// ==========================================
// KARDEX
// ==========================================
App.views.modalKardex = function(matId) {
    const movs = (App.state.movimientos_inventario || [])
        .filter(m => m.material_id === matId)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    let html = `<div class="dm-list">`;

    if (movs.length === 0) {
        html += `<div class="dm-alert dm-alert-info">No hay movimientos para este insumo.</div>`;
    }

    movs.forEach(m => {
        const fecha = m.fecha ? String(m.fecha).split('T')[0] : '';
        const esEntrada = m.tipo === 'entrada';

        html += `
            <div class="dm-list-card" style="padding:10px;">
                <div class="dm-row-between" style="align-items:flex-start; gap:12px; flex-wrap:wrap;">
                    <div style="flex:1; min-width:0;">
                        <strong style="color:${esEntrada ? 'var(--dm-success)' : 'var(--dm-danger)'};">${esEntrada ? '+' : '-'} ${App.ui.safe(m.cantidad)}</strong><br>
                        <small class="dm-muted">${App.ui.safe(m.motivo || '')}</small>
                    </div>
                    <div style="text-align:right;"><small class="dm-muted">${fecha}</small></div>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    App.ui.openSheet('Kardex del Insumo', html);
};

App.views.compras = function() {
    return `
        <div class="dm-section">
            <div class="dm-card">
                <h3 class="dm-card-title">Compras</h3>
                <p class="dm-muted">Módulo activo ✅</p>
                <button class="dm-btn dm-btn-primary" onclick="App.views.formCompra()">Nueva compra</button>
            </div>
        </div>
    `;
};
