// ==========================================
// VISTAS: FINANZAS Y GASTOS
// ==========================================

window.App = window.App || {};
App.views = App.views || {};

App.views.finanzas = function () {
    const bottomNav = document.getElementById('bottom-nav');
    if (bottomNav) bottomNav.style.display = 'flex';

    setTimeout(() => {
        if (App.logic?.renderGraficasFinanzas) {
            App.logic.renderGraficasFinanzas('mes_actual');
        }
    }, 50);

    return `
        <div class="dm-card">
            <div class="dm-row-between dm-mb-3" style="align-items:flex-start; gap:12px;">
                <div>
                    <h3 class="dm-card-title" style="margin-bottom:6px;">Dashboard Financiero</h3>
                    <p class="dm-muted" style="margin:0;">Consulta ingresos, gastos, saldos y comportamiento financiero.</p>
                </div>
            </div>

            <div class="pill-fin-container" style="display:flex; gap:8px; overflow-x:auto; padding-bottom:10px; margin-bottom:12px; scrollbar-width:none; -ms-overflow-style:none;">
                <button class="pill-fin active" onclick="App.views.setFiltroFinanzas(this, 'mes_actual', false)">Este Mes</button>
                <button class="pill-fin" onclick="App.views.setFiltroFinanzas(this, 'mes_pasado', false)">Mes Pasado</button>
                <button class="pill-fin" onclick="App.views.setFiltroFinanzas(this, 'trimestre_actual', false)">Trimestre</button>
                <button class="pill-fin" onclick="App.views.setFiltroFinanzas(this, 'anio_actual', false)">Este Año</button>
                <button class="pill-fin" onclick="App.views.setFiltroFinanzas(this, 'todo', false)">Historial</button>
                <button class="pill-fin" onclick="App.views.setFiltroFinanzas(this, 'custom', true)">Personalizado 📅</button>
            </div>

            <div id="filtro-rango-fechas" class="dm-card dm-mb-3" style="display:none; padding:12px; background:#F7FAFC;">
                <div class="dm-form-row">
                    <div class="dm-form-group">
                        <label class="dm-label">Desde</label>
                        <input type="date" id="fecha-desde" class="dm-input">
                    </div>
                    <div class="dm-form-group">
                        <label class="dm-label">Hasta</label>
                        <input type="date" id="fecha-hasta" class="dm-input">
                    </div>
                    <div class="dm-form-group" style="justify-content:end;">
                        <button class="dm-btn dm-btn-primary" type="button" onclick="App.logic.renderGraficasFinanzas('custom')">🔎 Aplicar</button>
                    </div>
                </div>
            </div>

            <div id="finanzas-contenedor">
                <div class="dm-center dm-muted" style="padding:30px;">Cargando finanzas...</div>
            </div>
        </div>

        <button class="fab" style="background: var(--danger);" onclick="App.views.formGasto()">+</button>
    `;
};

App.views.setFiltroFinanzas = function (btn, rango, mostrarCustom) {
    document.querySelectorAll('.pill-fin').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const filtro = document.getElementById('filtro-rango-fechas');
    if (filtro) filtro.style.display = mostrarCustom ? 'block' : 'none';

    if (!mostrarCustom && App.logic?.renderGraficasFinanzas) {
        App.logic.renderGraficasFinanzas(rango);
    }
};

App.views.detalleFinanzas = function (tipo, filtro) {
    const hoy = new Date();
    let mesActual = hoy.getMonth();
    let anioActual = hoy.getFullYear();
    let mesPasado = mesActual - 1;
    let anioPasado = anioActual;

    if (mesPasado < 0) {
        mesPasado = 11;
        anioPasado--;
    }

    const triActual = Math.floor(mesActual / 3);

    const filtrarFecha = (str) => {
        if (filtro === 'todo') return true;
        if (!str) return false;

        const f = new Date(str);
        if (isNaN(f.getTime())) return false;

        if (filtro === 'mes_actual') return f.getMonth() === mesActual && f.getFullYear() === anioActual;
        if (filtro === 'mes_pasado') return f.getMonth() === mesPasado && f.getFullYear() === anioPasado;
        if (filtro === 'trimestre_actual') return Math.floor(f.getMonth() / 3) === triActual && f.getFullYear() === anioActual;
        if (filtro === 'anio_actual') return f.getFullYear() === anioActual;
        return true;
    };

    const pedFiltrados = (App.state.pedidos || []).filter(p => filtrarFecha(p.fecha_creacion));
    const aboFiltrados = (App.state.abonos || []).filter(a => filtrarFecha(a.fecha));
    const gasFiltrados = (App.state.gastos || []).filter(g => filtrarFecha(g.fecha));
    const repFiltradas = (App.state.reparaciones || []).filter(r => filtrarFecha(r.fecha_creacion));

    const getEtiqueta = (clienteId) =>
        clienteId === 'STOCK_INTERNO'
            ? '<span style="color:#D69E2E;">(Bodega)</span>'
            : '<span style="color:#3182CE;">(Pedido)</span>';

    const fmtFecha = (value) => value ? String(value).split('T')[0] : '';
    const fmtMoney = (value) => `$${parseFloat(value || 0).toFixed(2)}`;

    let html = `<div class="dm-list">`;

    if (tipo === 'ventas') {
        if (pedFiltrados.length === 0 && repFiltradas.length === 0) {
            html += `<div class="dm-card"><p class="dm-muted">No hay ventas ni reparaciones registradas.</p></div>`;
        }

        pedFiltrados.forEach(p => {
            html += `
                <div class="dm-list-card">
                    <div class="dm-row-between" style="align-items:flex-start; gap:12px;">
                        <div>
                            <strong>${App.ui.safe((p.id || '').replace('PED-', ''))} ${getEtiqueta(p.cliente_id)}</strong>
                            <div class="dm-text-sm dm-muted">${fmtFecha(p.fecha_creacion)}</div>
                        </div>
                        <strong style="color:var(--primary);">${fmtMoney(p.total)}</strong>
                    </div>
                </div>
            `;
        });

        repFiltradas.forEach(r => {
            html += `
                <div class="dm-list-card">
                    <div class="dm-row-between" style="align-items:flex-start; gap:12px;">
                        <div>
                            <strong>${App.ui.safe((r.id || '').replace('REP-', ''))} <span style="color:#805AD5;">(Rep)</span></strong>
                            <div class="dm-text-sm dm-muted">${fmtFecha(r.fecha_creacion)}</div>
                        </div>
                        <strong style="color:var(--primary);">${fmtMoney(r.precio)}</strong>
                    </div>
                </div>
            `;
        });
    }

    else if (tipo === 'ingresos') {
        const ants = pedFiltrados.filter(p => parseFloat(p.anticipo || 0) > 0);
        const antsRep = repFiltradas.filter(r => parseFloat(r.anticipo || 0) > 0);

        if (ants.length === 0 && aboFiltrados.length === 0 && antsRep.length === 0) {
            html += `<div class="dm-card"><p class="dm-muted">No hay ingresos.</p></div>`;
        }

        ants.forEach(p => {
            html += `
                <div class="dm-list-card">
                    <div class="dm-row-between" style="align-items:flex-start; gap:12px;">
                        <div>
                            <strong>Anticipo ${App.ui.safe((p.id || '').replace('PED-', ''))} ${getEtiqueta(p.cliente_id)}</strong>
                            <div class="dm-text-sm dm-muted">${fmtFecha(p.fecha_creacion)}</div>
                        </div>
                        <strong style="color:var(--success);">${fmtMoney(p.anticipo)}</strong>
                    </div>
                </div>
            `;
        });

        antsRep.forEach(r => {
            html += `
                <div class="dm-list-card">
                    <div class="dm-row-between" style="align-items:flex-start; gap:12px;">
                        <div>
                            <strong>Pago ${App.ui.safe((r.id || '').replace('REP-', ''))} <span style="color:#805AD5;">(Rep)</span></strong>
                            <div class="dm-text-sm dm-muted">${fmtFecha(r.fecha_creacion)}</div>
                        </div>
                        <strong style="color:var(--success);">${fmtMoney(r.anticipo)}</strong>
                    </div>
                </div>
            `;
        });

        aboFiltrados.forEach(a => {
            const p = (App.state.pedidos || []).find(x => x.id === a.pedido_id) || {};
            html += `
                <div class="dm-list-card">
                    <div class="dm-row-between" style="align-items:flex-start; gap:12px;">
                        <div>
                            <strong>Abono a ${App.ui.safe((a.pedido_id || '').replace('PED-', ''))} ${getEtiqueta(p.cliente_id)}</strong>
                            <div class="dm-text-sm dm-muted">${fmtFecha(a.fecha)}</div>
                        </div>
                        <strong style="color:var(--success);">${fmtMoney(a.monto)}</strong>
                    </div>
                </div>
            `;
        });
    }

    else if (tipo === 'gastos') {
        if (gasFiltrados.length === 0) {
            html += `<div class="dm-card"><p class="dm-muted">No hay gastos registrados.</p></div>`;
        }

        gasFiltrados.forEach(g => {
            html += `
                <div class="dm-list-card">
                    <div class="dm-row-between" style="align-items:flex-start; gap:12px;">
                        <div>
                            <strong>${App.ui.escapeHTML(g.descripcion || '')}</strong>
                            <div class="dm-text-sm dm-muted">${fmtFecha(g.fecha)}</div>
                        </div>
                        <div style="text-align:right;">
                            <strong style="color:var(--danger); display:block; margin-bottom:8px;">${fmtMoney(g.monto)}</strong>
                            <div class="dm-row" style="justify-content:flex-end; gap:6px;">
                                <button class="dm-btn dm-btn-secondary" type="button" style="padding:4px 8px; min-height:auto;" onclick="App.ui.closeSheet(); setTimeout(()=>App.views.formGasto('${g.id}'), 300)">✏️</button>
                                <button class="dm-btn dm-btn-danger" type="button" style="padding:4px 8px; min-height:auto;" onclick="App.ui.closeSheet(); App.logic.eliminarRegistroGenerico('gastos', '${g.id}', 'gastos')">🗑️</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    else if (tipo === 'por_cobrar') {
        let hayCobros = false;

        (App.state.pedidos || []).forEach(p => {
            const abonos = (App.state.abonos || [])
                .filter(a => a.pedido_id === p.id)
                .reduce((s, a) => s + parseFloat(a.monto || 0), 0);

            const saldo = parseFloat(p.total || 0) - parseFloat(p.anticipo || 0) - abonos;

            if (saldo > 0) {
                hayCobros = true;
                html += `
                    <div class="dm-list-card">
                        <div class="dm-row-between" style="align-items:flex-start; gap:12px;">
                            <div>
                                <strong>${App.ui.safe((p.id || '').replace('PED-', ''))} ${getEtiqueta(p.cliente_id)}</strong>
                                <div class="dm-text-sm dm-muted">${fmtFecha(p.fecha_creacion)}</div>
                            </div>
                            <strong style="color:#D69E2E;">${fmtMoney(saldo)}</strong>
                        </div>
                    </div>
                `;
            }
        });

        (App.state.reparaciones || []).forEach(r => {
            const saldo = parseFloat(r.precio || 0) - parseFloat(r.anticipo || 0);

            if (saldo > 0) {
                hayCobros = true;
                html += `
                    <div class="dm-list-card">
                        <div class="dm-row-between" style="align-items:flex-start; gap:12px;">
                            <div>
                                <strong>${App.ui.safe((r.id || '').replace('REP-', ''))} <span style="color:#805AD5;">(Rep)</span></strong>
                                <div class="dm-text-sm dm-muted">${fmtFecha(r.fecha_creacion)}</div>
                            </div>
                            <strong style="color:#D69E2E;">${fmtMoney(saldo)}</strong>
                        </div>
                    </div>
                `;
            }
        });

        if (!hayCobros) {
            html += `<div class="dm-card"><p class="dm-muted">No hay saldo pendiente.</p></div>`;
        }
    }

    else if (tipo === 'por_pagar') {
        let hayDeudas = false;

        (App.state.pago_artesanos || []).forEach(pa => {
            if (pa.estado === 'pendiente') {
                hayDeudas = true;
                const a = (App.state.artesanos || []).find(x => x.id === pa.artesano_id);

                html += `
                    <div class="dm-list-card">
                        <div class="dm-row-between" style="align-items:flex-start; gap:12px;">
                            <div>
                                <strong>${App.ui.safe(a ? a.nombre : 'Artesano')} (Nómina)</strong>
                                <div class="dm-text-sm dm-muted">${fmtFecha(pa.fecha)}</div>
                            </div>
                            <strong style="color:#E53E3E;">${fmtMoney(pa.total)}</strong>
                        </div>
                    </div>
                `;
            }
        });

        (App.state.compras || []).forEach(c => {
            const pagado = c.monto_pagado !== undefined && c.monto_pagado !== ''
                ? parseFloat(c.monto_pagado)
                : parseFloat(c.total || 0);

            const deuda = parseFloat(c.total || 0) - pagado;

            if (deuda > 0) {
                hayDeudas = true;
                const pv = (App.state.proveedores || []).find(x => x.id === c.proveedor_id);

                html += `
                    <div class="dm-list-card">
                        <div class="dm-row-between" style="align-items:flex-start; gap:12px;">
                            <div>
                                <strong>${App.ui.safe(pv ? pv.nombre : 'Proveedor')} (Compra)</strong>
                                <div class="dm-text-sm dm-muted">${fmtFecha(c.fecha)}</div>
                            </div>
                            <strong style="color:#E53E3E;">${fmtMoney(deuda)}</strong>
                        </div>
                    </div>
                `;
            }
        });

        if (!hayDeudas) {
            html += `<div class="dm-card"><p class="dm-muted">No hay deudas por pagar. ¡Estás al día!</p></div>`;
        }
    }

    html += `
        </div>
        <button class="dm-btn dm-btn-primary dm-btn-block dm-mt-3" onclick="App.ui.closeSheet()">Cerrar</button>
    `;

    App.ui.openSheet(
        tipo === 'ventas' ? 'Detalle de Ventas'
        : tipo === 'ingresos' ? 'Detalle de Ingresos'
        : tipo === 'gastos' ? 'Detalle de Gastos'
        : tipo === 'por_pagar' ? 'Saldos por Pagar'
        : 'Saldos Históricos',
        html
    );
};

App.views.formGasto = function (id = null) {
    if (typeof id !== 'string') id = null;

    const obj = id ? (App.state.gastos || []).find(g => g.id === id) : null;

    let htmlGastos = '';

    if (obj) {
        htmlGastos = `
            <div class="dm-form-group">
                <label class="dm-label">Descripción del Gasto</label>
                <input type="text" class="dm-input" name="descripcion" value="${App.ui.escapeHTML(obj.descripcion || '')}" required>
            </div>
            <div class="dm-form-group">
                <label class="dm-label">Monto ($)</label>
                <input type="number" step="0.01" class="dm-input" name="monto" value="${obj.monto || ''}" required>
            </div>
        `;
    } else {
        htmlGastos = `
            <div id="cont-gastos">
                <div class="dm-row dm-mb-3 fila-dinamica" style="align-items:flex-start;">
                    <input type="text" class="dm-input" name="descripcion[]" placeholder="Descripción" required style="flex:2;">
                    <input type="number" step="0.01" class="dm-input" name="monto[]" placeholder="$ Monto" required style="flex:1;">
                </div>
            </div>

            <button
                type="button"
                class="dm-btn dm-btn-secondary dm-btn-block dm-mb-3"
                style="border:1px dashed var(--danger); color:var(--danger); background:transparent;"
                onclick="window.agregarFilaGasto()"
            >
                + Añadir Gasto a la lista
            </button>
        `;
    }

    const formHTML = `
        <form id="dynamic-form">
            <div class="dm-form-group">
                <label class="dm-label">Categoría</label>
                <select class="dm-select" name="categoria" required>
                    <option value="Materiales e Insumos" ${obj && obj.categoria === 'Materiales e Insumos' ? 'selected' : ''}>Materiales (Hilos, Accesorios)</option>
                    <option value="Hamacas (Reventa)" ${obj && obj.categoria === 'Hamacas (Reventa)' ? 'selected' : ''}>Hamacas (Reventa)</option>
                    <option value="Servicios y Otros" ${obj && obj.categoria === 'Servicios y Otros' ? 'selected' : ''}>Servicios</option>
                    <option value="Nómina Artesanos" ${obj && obj.categoria === 'Nómina Artesanos' ? 'selected' : ''}>Nómina</option>
                    <option value="Otros Gastos" ${obj && obj.categoria === 'Otros Gastos' ? 'selected' : ''}>Otro</option>
                </select>
            </div>

            <div class="dm-form-group">
                <label class="dm-label">Fecha</label>
                <input type="date" class="dm-input" name="fecha" value="${obj ? obj.fecha : new Date().toISOString().split('T')[0]}" required>
            </div>

            ${htmlGastos}

            <button type="submit" class="dm-btn dm-btn-primary dm-btn-block" style="background:var(--danger); border-color:var(--danger);">
                ${obj ? 'Guardar Cambios' : 'Registrar Gastos'}
            </button>
        </form>
    `;

    App.ui.openSheet(obj ? 'Editar Gasto' : 'Nuevos Gastos Múltiples', formHTML, (data) => {
        if (obj) {
            App.logic.actualizarRegistroGenerico('gastos', id, data, 'gastos');
        } else {
            App.logic.guardarMultiplesGastos(data);
        }
    });
};
