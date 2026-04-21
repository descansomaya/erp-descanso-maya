window.App = window.App || {};
App.views = App.views || {};

App.views._gastoRowHTML = function(index, data = {}) {
    return `
        <div class="gasto-row dm-card dm-mb-3" data-index="${index}" style="padding:12px; background:var(--dm-surface-2);">
            <div class="dm-form-group">
                <label class="dm-label">Concepto</label>
                <input type="text" class="dm-input gasto-concepto" value="${App.ui.escapeHTML(data.concepto || '')}" placeholder="Ej. Luz, gasolina, papelería" required>
            </div>
            <div class="dm-form-row" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px;">
                <div class="dm-form-group">
                    <label class="dm-label">Monto</label>
                    <input type="number" step="0.01" class="dm-input gasto-monto" value="${data.monto || ''}" placeholder="0.00" required>
                </div>
                <div class="dm-form-group">
                    <label class="dm-label">Categoría</label>
                    <select class="dm-select gasto-categoria">
                        <option value="operativo" ${data.categoria==='operativo'?'selected':''}>Operativo</option>
                        <option value="logistica" ${data.categoria==='logistica'?'selected':''}>Logística</option>
                        <option value="servicios" ${data.categoria==='servicios'?'selected':''}>Servicios</option>
                        <option value="nomina" ${data.categoria==='nomina'?'selected':''}>Nómina</option>
                        <option value="material" ${data.categoria==='material'?'selected':''}>Material</option>
                        <option value="otros" ${data.categoria==='otros'?'selected':''}>Otros</option>
                    </select>
                </div>
            </div>
            <div class="dm-form-group">
                <label class="dm-label">Notas</label>
                <input type="text" class="dm-input gasto-notas" value="${App.ui.escapeHTML(data.notas || '')}" placeholder="Opcional">
            </div>
            <div style="display:flex; justify-content:flex-end;">
                <button type="button" class="dm-btn dm-btn-danger dm-btn-sm" onclick="this.closest('.gasto-row').remove(); App.views.actualizarTotalGastosPRO();">Eliminar partida</button>
            </div>
        </div>
    `;
};

App.views.agregarFilaGastoPRO = function(data = {}) {
    const wrap = document.getElementById('gastos-pro-wrap');
    if (!wrap) return;
    const index = wrap.querySelectorAll('.gasto-row').length;
    wrap.insertAdjacentHTML('beforeend', App.views._gastoRowHTML(index, data));
    wrap.querySelectorAll('.gasto-monto').forEach(inp => {
        inp.removeEventListener('input', App.views.actualizarTotalGastosPRO);
        inp.addEventListener('input', App.views.actualizarTotalGastosPRO);
    });
    App.views.actualizarTotalGastosPRO();
};

App.views.actualizarTotalGastosPRO = function() {
    const total = Array.from(document.querySelectorAll('.gasto-monto')).reduce((acc, el) => acc + (parseFloat(el.value || 0) || 0), 0);
    const box = document.getElementById('gastos-pro-total');
    if (box) box.textContent = App.ui.money ? App.ui.money(total) : '$' + total.toFixed(2);
};

App.views.formGasto = function () {
    const html = `
        <form id="dynamic-form">
            <div class="dm-alert dm-alert-info dm-mb-3">Puedes registrar varios gastos en una sola captura.</div>
            <div class="dm-form-row" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px;">
                <div class="dm-form-group">
                    <label class="dm-label">Fecha</label>
                    <input type="date" class="dm-input" id="gastos-pro-fecha" value="${new Date().toISOString().split('T')[0]}" required>
                </div>
                <div class="dm-form-group">
                    <label class="dm-label">Total capturado</label>
                    <div id="gastos-pro-total" class="dm-card" style="padding:10px 12px; font-weight:700;">${App.ui.money ? App.ui.money(0) : '$0.00'}</div>
                </div>
            </div>
            <div id="gastos-pro-wrap"></div>
            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
                <button type="button" class="dm-btn dm-btn-secondary" onclick="App.views.agregarFilaGastoPRO()">＋ Agregar partida</button>
                <button class="dm-btn dm-btn-primary" type="submit">Guardar gastos</button>
            </div>
        </form>
    `;

    App.ui.openSheet('Nuevo gasto', html, async () => {
        const fecha = document.getElementById('gastos-pro-fecha')?.value || new Date().toISOString().split('T')[0];
        const rows = Array.from(document.querySelectorAll('#gastos-pro-wrap .gasto-row')).map(row => ({
            concepto: row.querySelector('.gasto-concepto')?.value?.trim() || '',
            monto: parseFloat(row.querySelector('.gasto-monto')?.value || 0) || 0,
            categoria: row.querySelector('.gasto-categoria')?.value || 'operativo',
            notas: row.querySelector('.gasto-notas')?.value?.trim() || ''
        })).filter(x => x.concepto && x.monto > 0);

        if (!rows.length) {
            App.ui.toast('Agrega al menos una partida válida', 'warning');
            return false;
        }

        const operaciones = rows.map((r, i) => ({
            action: 'guardar_fila',
            nombreHoja: 'gastos',
            datos: {
                id: 'GAS-' + Date.now() + '-' + i,
                fecha,
                concepto: r.concepto,
                descripcion: r.concepto,
                monto: r.monto,
                categoria: r.categoria,
                notas: r.notas,
                fecha_creacion: new Date().toISOString()
            }
        }));

        const res = await App.api.fetch('ejecutar_lote', { operaciones });
        if (res.status !== 'success') {
            App.ui.toast(res.message || 'Error al guardar gastos', 'danger');
            return false;
        }

        if (!Array.isArray(App.state.gastos)) App.state.gastos = [];
        operaciones.forEach(op => App.state.gastos.push(op.datos));
        App.ui.toast(rows.length + ' gasto(s) registrado(s)');
        App.router.handleRoute();
        return true;
    });

    setTimeout(() => {
        App.views.agregarFilaGastoPRO({ categoria: 'operativo' });
        App.views.actualizarTotalGastosPRO();
    }, 80);
};