// ==========================================
// VISTAS: FINANZAS, GASTOS Y NÓMINA
// ==========================================

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
  if (box) box.textContent = App.ui.money ? App.ui.money(total) : `$${total.toFixed(2)}`;
};

App.views.formGasto = function() {
  const html = `
    <form id="dynamic-form">
      <div class="dm-alert dm-alert-info dm-mb-3">Puedes registrar varios gastos en una sola captura sin perder el flujo actual.</div>

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
        <button type="submit" class="dm-btn dm-btn-primary">Guardar gastos</button>
      </div>
    </form>
  `;

  App.ui.openSheet('Gastos PRO', html, async () => {
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
        id: `GAS-${Date.now()}-${i}`,
        fecha,
        concepto: r.concepto,
        monto: r.monto,
        categoria: r.categoria,
        notas: r.notas,
        fecha_creacion: new Date().toISOString()
      }
    }));

    return App.ui.runSafeAction({
      lockKey: 'gastos:pro:lote',
      loadingText: 'Guardando...',
      loaderMessage: 'Registrando gastos...',
      successMessage: `${rows.length} gasto(s) registrado(s)`,
      errorTitle: 'No se pudieron registrar los gastos',
      closeSheetOnSuccess: true
    }, async () => {
      const res = await App.api.fetch('ejecutar_lote', { operaciones });
      if (res.status !== 'success') throw new Error(res.message || 'Error al guardar gastos');
      if (!Array.isArray(App.state.gastos)) App.state.gastos = [];
      operaciones.forEach(op => App.state.gastos.push(op.datos));
      App.router.handleRoute();
      return true;
    });
  });

  setTimeout(() => {
    App.views.agregarFilaGastoPRO({ categoria: 'operativo' });
    App.views.actualizarTotalGastosPRO();
  }, 80);
};

App.views.nomina = function() {
  const pagos = App.state.pago_artesanos || [];
  const artesanos = App.state.artesanos || [];
  const pendientes = pagos.filter(p => String(p.estado || '').toLowerCase() === 'pendiente');
  const pagados = pagos.filter(p => String(p.estado || '').toLowerCase() === 'pagado');
  const totalPendiente = pendientes.reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);
  const totalPagado = pagados.reduce((acc, p) => acc + (parseFloat(p.total || 0) || 0), 0);

  const listaPendientes = pendientes.length ? pendientes.map(p => {
    const art = artesanos.find(a => a.id === p.artesano_id);
    return `
      <div class="dm-list-card">
        <div class="dm-row-between" style="gap:12px; align-items:flex-start;">
          <div style="flex:1; min-width:0;">
            <strong>${App.ui.safe(art?.nombre || p.artesano_nombre || 'Artesano')}</strong><br>
            <small class="dm-muted">${App.ui.safe(p.id || '')}</small>
          </div>
          <div style="text-align:right;">
            <strong>${App.ui.money ? App.ui.money(p.total || 0) : `$${parseFloat(p.total||0).toFixed(2)}`}</strong><br>
            <small class="dm-muted">Pendiente</small>
          </div>
        </div>
      </div>
    `;
  }).join('') : `<div class="dm-alert dm-alert-success">No hay pagos pendientes.</div>`;

  return `
    <div class="dm-section" style="padding-bottom:90px;">
      <div class="dm-card dm-mb-4">
        <h3 class="dm-card-title">Nómina / pagos a artesanos</h3>
        <p class="dm-muted dm-mt-2">Resumen ejecutivo de pagos pendientes y pagados.</p>
      </div>

      <div class="dm-mb-4" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px;">
        <div class="dm-card" style="background:#FFF5F5;">
          <div class="dm-kpi-label" style="color:#C53030;">Pendiente por pagar</div>
          <div class="dm-kpi-value" style="color:#E53E3E;">${App.ui.money ? App.ui.money(totalPendiente) : `$${totalPendiente.toFixed(2)}`}</div>
        </div>
        <div class="dm-card" style="background:#F0FFF4;">
          <div class="dm-kpi-label" style="color:#2F855A;">Pagado acumulado</div>
          <div class="dm-kpi-value" style="color:#38A169;">${App.ui.money ? App.ui.money(totalPagado) : `$${totalPagado.toFixed(2)}`}</div>
        </div>
        <div class="dm-card">
          <div class="dm-kpi-label">Pendientes</div>
          <div class="dm-kpi-value">${pendientes.length}</div>
        </div>
        <div class="dm-card">
          <div class="dm-kpi-label">Pagados</div>
          <div class="dm-kpi-value">${pagados.length}</div>
        </div>
      </div>

      <div class="dm-card">
        <div class="dm-card-title">Pagos pendientes</div>
        <div class="dm-list dm-mt-3">${listaPendientes}</div>
      </div>
    </div>
  `;
};