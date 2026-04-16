// ==========================================
// VISTAS: CATÁLOGOS
// ==========================================

window.App = window.App || {};
App.views = App.views || {};

// ==========================================
// CLIENTES
// ==========================================
App.views.clientes = function() {
    const bottomNav = document.getElementById('bottom-nav');
    if (bottomNav) bottomNav.style.display = 'flex';

    const clientes = App.state.clientes || [];

    let html = `
        <div class="dm-section" style="padding-bottom:90px;">
            <div class="dm-card dm-mb-4">
                <h3 class="dm-card-title">Directorio de Clientes</h3>

                <button
                    class="dm-btn dm-btn-secondary dm-btn-block dm-mb-3"
                    style="border-color:#38A169; color:#38A169; background:transparent;"
                    onclick="window.exportarAExcel(App.state.clientes, 'Clientes_DescansoMaya')"
                >
                    📥 Descargar Tabla en Excel
                </button>

                <input
                    type="text"
                    id="bus-cli"
                    class="dm-input"
                    onkeyup="window.filtrarLista('bus-cli', 'tarj-cli')"
                    placeholder="🔍 Buscar cliente..."
                >
            </div>

            <div class="dm-list">
    `;

    if (clientes.length === 0) {
        html += `<div class="dm-alert dm-alert-info">No hay clientes registrados.</div>`;
    } else {
        clientes.forEach(c => {
            html += `
                <div class="dm-list-card tarj-cli">
                    <div class="dm-row-between" style="align-items:flex-start; gap:12px;">
                        <div style="flex:1; min-width:0;">
                            <strong style="word-break:break-word;">${App.ui.escapeHTML(c.nombre)}</strong><br>
                            <small class="dm-muted">📞 ${App.ui.safe(c.telefono || 'N/A')}</small>
                        </div>

                        <div class="dm-list-card-actions" style="justify-content:flex-end;">
                            <button class="dm-btn dm-btn-secondary dm-btn-sm" style="border-color:var(--primary); color:var(--primary); background:transparent;" onclick="App.views.modalEstadoCuenta('${c.id}')">📋 Perfil</button>
                            <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.formCliente('${c.id}')">✏️</button>
                            <button class="dm-btn dm-btn-danger dm-btn-sm" onclick="App.logic.eliminarRegistroGenerico('clientes', '${c.id}', 'clientes')">🗑️</button>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    html += `
            </div>
        </div>

        <button class="dm-fab" onclick="App.views.formCliente()">+</button>
    `;

    return html;
};

App.views.modalEstadoCuenta = function(clienteId) {
    const cliente = (App.state.clientes || []).find(c => c.id === clienteId);
    if (!cliente) return;

    const pedidosCliente = (App.state.pedidos || []).filter(p => p.cliente_id === clienteId);
    const reparacionesCliente = (App.state.reparaciones || []).filter(r => r.cliente_id === clienteId);

    let totalComprado = 0;
    let saldoPendiente = 0;
    let listaPedidos = '';

    pedidosCliente.forEach(p => {
        totalComprado += parseFloat(p.total || 0);

        const abonos = (App.state.abonos || [])
            .filter(a => a.pedido_id === p.id)
            .reduce((s, a) => s + parseFloat(a.monto || 0), 0);

        const deuda = parseFloat(p.total || 0) - parseFloat(p.anticipo || 0) - abonos;
        if (deuda > 0) saldoPendiente += deuda;

        const detalle = (App.state.pedido_detalle || []).find(d => d.pedido_id === p.id);
        const prod = detalle ? (App.state.productos || []).find(x => x.id === detalle.producto_id) : null;
        const nombreProd = prod ? App.ui.escapeHTML(prod.nombre) : 'Artículo especial';
        const fecha = p.fecha_creacion ? String(p.fecha_creacion).split('T')[0] : '';

        listaPedidos += `
            <li style="padding:8px 0; border-bottom:1px dashed #ccc; display:flex; justify-content:space-between; gap:12px;">
                <span>
                    <strong>${App.ui.safe((p.id || '').replace('PED-', ''))} (Pedido)</strong> -
                    <small style="color:var(--primary); font-weight:bold;">${nombreProd}</small><br>
                    <small>${fecha}</small>
                </span>
                <span style="color:var(--primary); font-weight:bold;">$${parseFloat(p.total || 0).toFixed(2)}</span>
            </li>
        `;
    });

    reparacionesCliente.forEach(r => {
        totalComprado += parseFloat(r.precio || 0);
        const deuda = parseFloat(r.precio || 0) - parseFloat(r.anticipo || 0);
        if (deuda > 0) saldoPendiente += deuda;

        const fecha = r.fecha_creacion ? String(r.fecha_creacion).split('T')[0] : '';
        listaPedidos += `
            <li style="padding:8px 0; border-bottom:1px dashed #ccc; display:flex; justify-content:space-between; gap:12px;">
                <span>
                    <strong>${App.ui.safe((r.id || '').replace('REP-', ''))} (Reparación)</strong> -
                    <small style="color:#805AD5; font-weight:bold;">${App.ui.escapeHTML(r.descripcion || 'Servicio')}</small><br>
                    <small>${fecha}</small>
                </span>
                <span style="color:var(--primary); font-weight:bold;">$${parseFloat(r.precio || 0).toFixed(2)}</span>
            </li>
        `;
    });

    if (listaPedidos === '') {
        listaPedidos = '<li style="padding:10px; color:var(--text-muted);">No tiene historial de compras ni reparaciones.</li>';
    }

    let html = `
        <div class="dm-grid-2 dm-mb-4">
            <div class="dm-card" style="background:#EBF8FF;">
                <div class="dm-kpi-label" style="color:#2B6CB0;">Total Comprado</div>
                <div class="dm-kpi-value" style="color:#3182CE; font-size:1.2rem;">$${totalComprado.toFixed(2)}</div>
            </div>

            <div class="dm-card" style="background:#FFF5F5;">
                <div class="dm-kpi-label" style="color:#C53030;">Saldo Pendiente</div>
                <div class="dm-kpi-value" style="color:#E53E3E; font-size:1.2rem;">$${saldoPendiente.toFixed(2)}</div>
            </div>
        </div>

        <h4 class="dm-label dm-mb-3">Historial del Cliente</h4>

        <ul style="list-style:none; padding:10px; margin:0; max-height:250px; overflow-y:auto; background:#f9f9f9; border-radius:8px; border:1px solid var(--border);">
            ${listaPedidos}
        </ul>

        <button class="dm-btn dm-btn-primary dm-btn-block dm-mt-3" onclick="App.ui.closeSheet()">Cerrar Perfil</button>
    `;

    App.ui.openSheet(`👤 ${App.ui.escapeHTML(cliente.nombre)}`, html);
};

App.views.formCliente = function(id = null, callback = null) {
    const obj = id ? (App.state.clientes || []).find(c => c.id === id) : null;

    const formHTML = `
        <form id="dynamic-form">
            <div class="dm-form-group">
                <label class="dm-label">Nombre</label>
                <input type="text" class="dm-input" name="nombre" value="${obj ? App.ui.escapeHTML(obj.nombre) : ''}" required>
            </div>

            <div class="dm-form-group">
                <label class="dm-label">Teléfono (10 dígitos)</label>
                <input
                    type="tel"
                    class="dm-input"
                    name="telefono"
                    value="${obj ? App.ui.safe(obj.telefono) : ''}"
                    pattern="\\d{10}"
                    title="El teléfono debe tener exactamente 10 números sin espacios"
                    maxlength="10"
                >
            </div>

            <div class="dm-form-group">
                <label class="dm-label">Dirección</label>
                <input type="text" class="dm-input" name="direccion" value="${obj ? App.ui.escapeHTML(obj.direccion) : ''}">
            </div>

            <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">
                ${obj ? 'Guardar Cambios' : 'Crear Cliente'}
            </button>
        </form>
    `;

    App.ui.openSheet(obj ? 'Editar Cliente' : 'Nuevo Cliente', formHTML, (data) => {
        if (obj) App.logic.actualizarRegistroGenerico('clientes', id, data, 'clientes');
        else App.logic.guardarNuevoGenerico('clientes', data, 'CLI', 'clientes', callback);
    });
};

// ==========================================
// PROVEEDORES
// ==========================================
App.views.proveedores = function() {
    const bottomNav = document.getElementById('bottom-nav');
    if (bottomNav) bottomNav.style.display = 'flex';

    const proveedores = App.state.proveedores || [];

    let html = `
        <div class="dm-section" style="padding-bottom:90px;">
            <div class="dm-card dm-mb-4">
                <h3 class="dm-card-title">Proveedores</h3>
            </div>

            <div class="dm-list">
    `;

    if (proveedores.length === 0) {
        html += `<div class="dm-alert dm-alert-info">No hay proveedores registrados.</div>`;
    } else {
        proveedores.forEach(p => {
            html += `
                <div class="dm-list-card">
                    <div class="dm-row-between" style="align-items:flex-start; gap:12px;">
                        <div style="flex:1; min-width:0;">
                            <strong style="word-break:break-word;">${App.ui.escapeHTML(p.nombre)}</strong><br>
                            <small class="dm-muted">📞 ${App.ui.safe(p.telefono || 'N/A')}</small>
                        </div>

                        <div class="dm-list-card-actions" style="justify-content:flex-end;">
                            <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.formProveedor('${p.id}')">✏️</button>
                            <button class="dm-btn dm-btn-danger dm-btn-sm" onclick="App.logic.eliminarRegistroGenerico('proveedores', '${p.id}', 'proveedores')">🗑️</button>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    html += `
            </div>
        </div>

        <button class="dm-fab" onclick="App.views.formProveedor()">+</button>
    `;

    return html;
};

App.views.formProveedor = function(id = null, callback = null) {
    const obj = id ? (App.state.proveedores || []).find(p => p.id === id) : null;

    const formHTML = `
        <form id="dynamic-form">
            <div class="dm-form-group">
                <label class="dm-label">Nombre del Proveedor</label>
                <input type="text" class="dm-input" name="nombre" value="${obj ? App.ui.escapeHTML(obj.nombre) : ''}" required>
            </div>

            <div class="dm-form-group">
                <label class="dm-label">Teléfono (10 dígitos)</label>
                <input
                    type="tel"
                    class="dm-input"
                    name="telefono"
                    value="${obj ? App.ui.safe(obj.telefono) : ''}"
                    pattern="\\d{10}"
                    title="El teléfono debe tener exactamente 10 números sin espacios"
                    maxlength="10"
                >
            </div>

            <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">
                ${obj ? 'Guardar Cambios' : 'Crear Proveedor'}
            </button>
        </form>
    `;

    App.ui.openSheet(obj ? 'Editar Proveedor' : 'Nuevo Proveedor', formHTML, (data) => {
        if (obj) App.logic.actualizarRegistroGenerico('proveedores', id, data, 'proveedores');
        else App.logic.guardarNuevoGenerico('proveedores', data, 'PRV', 'proveedores', callback);
    });
};

// ==========================================
// PRODUCTOS
// ==========================================
App.views.productos = function() {
    const bottomNav = document.getElementById('bottom-nav');
    if (bottomNav) bottomNav.style.display = 'flex';

    const productos = App.state.productos || [];

    let html = `
        <div class="dm-section" style="padding-bottom:90px;">
            <div class="dm-card dm-mb-4">
                <h3 class="dm-card-title">Catálogo de Productos</h3>
                <p class="dm-muted dm-mb-3" style="margin-top:6px;">Productos de fabricación y reventa.</p>
                <input
                    type="text"
                    id="bus-prod"
                    class="dm-input"
                    onkeyup="window.filtrarLista('bus-prod', 'tarj-prod')"
                    placeholder="🔍 Buscar producto..."
                >
            </div>

            <div class="dm-list">
    `;

    if (productos.length === 0) {
        html += `<div class="dm-alert dm-alert-info">No hay productos registrados.</div>`;
    } else {
        productos.forEach(p => {
            html += `
                <div class="dm-list-card tarj-prod">
                    <div class="dm-row-between" style="align-items:flex-start; gap:12px;">
                        <div style="flex:1; min-width:0;">
                            <div class="dm-fw-bold" style="word-break:break-word;">${App.ui.escapeHTML(p.nombre)}</div>
                            <div class="dm-text-sm dm-muted dm-mt-2">
                                Cat: ${App.ui.escapeHTML(p.categoria || 'General')} |
                                Clasif: ${App.ui.escapeHTML(p.clasificacion || 'Normal')}<br>
                                Tamaño: ${App.ui.escapeHTML(p.tamano || '-')} |
                                Color: ${App.ui.escapeHTML(p.color || '-')}
                            </div>
                        </div>

                        <div style="text-align:right; flex:0 0 auto;">
                            <div style="color:var(--primary); font-weight:bold; margin-bottom:6px;">
                                $${p.precio_venta}
                            </div>
                            <div class="dm-text-sm dm-muted dm-mb-2">
                                Mayoreo: $${p.precio_mayoreo || 'N/A'}
                            </div>
                            <div class="dm-list-card-actions" style="justify-content:flex-end;">
                                <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.formProducto('${p.id}')">✏️</button>
                                <button class="dm-btn dm-btn-danger dm-btn-sm" onclick="App.logic.eliminarRegistroGenerico('productos', '${p.id}', 'productos')">🗑️</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    html += `
            </div>
        </div>

        <button class="dm-fab" onclick="App.views.formProducto()">+</button>
    `;

    return html;
};

App.views.formProducto = function(id = null, callback = null) {
    const obj = id ? (App.state.productos || []).find(p => p.id === id) : null;

    const generarFila = (matId, cant, uso) => {
        const opcMat = (App.state.inventario || [])
            .map(m => `<option value="${m.id}" ${matId === m.id ? 'selected' : ''}>${App.ui.escapeHTML(m.nombre)} (${App.ui.escapeHTML(m.unidad)})</option>`)
            .join('');

        return `
            <div class="fila-dinamica dm-card dm-mb-2" style="padding:10px; background:var(--dm-surface-2);">
                <div class="dm-form-group dm-mb-2">
                    <label class="dm-label">Insumo</label>
                    <select class="dm-select" name="mat_id[]" required>
                        <option value="">-- Insumo --</option>
                        ${opcMat}
                    </select>
                </div>

                <div class="dm-form-row">
                    <div class="dm-form-group">
                        <label class="dm-label">Cantidad</label>
                        <input type="number" step="0.1" class="dm-input" name="cant[]" value="${cant || ''}" placeholder="Cant" required>
                    </div>

                    <div class="dm-form-group">
                        <label class="dm-label">Uso</label>
                        <select class="dm-select" name="uso[]" required>
                            <option value="Cuerpo" ${uso === 'Cuerpo' ? 'selected' : ''}>Cuerpo</option>
                            <option value="Brazos" ${uso === 'Brazos' ? 'selected' : ''}>Brazos</option>
                            <option value="Adicional" ${uso === 'Adicional' ? 'selected' : ''}>Otro</option>
                        </select>
                    </div>
                </div>

                <button
                    type="button"
                    class="dm-btn dm-btn-danger dm-btn-block"
                    style="min-height:36px;"
                    onclick="this.parentElement.remove()"
                >
                    Quitar insumo
                </button>
            </div>
        `;
    };

    let recetaHTML = '';
    let counter = 1;

    if (obj) {
        while (obj[`mat_${counter}`]) {
            recetaHTML += generarFila(obj[`mat_${counter}`], obj[`cant_${counter}`], obj[`uso_${counter}`]);
            counter++;
        }
    }

    if (recetaHTML === '') recetaHTML = generarFila('', '', '');

    const clasif = obj ? obj.clasificacion : '';

    const formHTML = `
        <form id="dynamic-form">
            <div class="dm-form-group">
                <label class="dm-label">Nombre del Producto</label>
                <input type="text" class="dm-input" name="nombre" value="${obj ? App.ui.escapeHTML(obj.nombre) : ''}" required>
            </div>

            <div class="dm-form-row">
                <div class="dm-form-group">
                    <label class="dm-label">Categoría</label>
                    <select class="dm-select" name="categoria">
                        <option value="fabricacion" ${obj && obj.categoria === 'fabricacion' ? 'selected' : ''}>Fabricación</option>
                        <option value="reventa" ${obj && obj.categoria === 'reventa' ? 'selected' : ''}>Reventa</option>
                    </select>
                </div>

                <div class="dm-form-group">
                    <label class="dm-label">Clasificación</label>
                    <select class="dm-select" name="clasificacion">
                        <option value="Unicolor" ${clasif === 'Unicolor' ? 'selected' : ''}>Unicolor</option>
                        <option value="Combinada" ${clasif === 'Combinada' ? 'selected' : ''}>Combinada</option>
                        <option value="Especial" ${clasif === 'Especial' ? 'selected' : ''}>Especial</option>
                        <option value="Reventa" ${clasif === 'Reventa' ? 'selected' : ''}>Reventa</option>
                        <option value="Otro" ${clasif === 'Otro' ? 'selected' : ''}>Otro</option>
                    </select>
                </div>
            </div>

            <div class="dm-form-row">
                <div class="dm-form-group">
                    <label class="dm-label">Tamaño</label>
                    <input type="text" class="dm-input" name="tamano" value="${obj ? App.ui.escapeHTML(obj.tamano || '') : ''}" placeholder="Ej. Matrimonial">
                </div>

                <div class="dm-form-group">
                    <label class="dm-label">Color</label>
                    <input type="text" class="dm-input" name="color" value="${obj ? App.ui.escapeHTML(obj.color || '') : ''}" placeholder="Ej. Rojo/Blanco">
                </div>
            </div>

            <div class="dm-form-row">
                <div class="dm-form-group">
                    <label class="dm-label">Precio Venta ($)</label>
                    <input type="number" class="dm-input" name="precio_venta" value="${obj ? obj.precio_venta : ''}" required>
                </div>

                <div class="dm-form-group">
                    <label class="dm-label">Precio Mayoreo ($)</label>
                    <input type="number" class="dm-input" name="precio_mayoreo" value="${obj ? (obj.precio_mayoreo || '') : ''}">
                </div>
            </div>

            <div class="dm-card dm-mb-3" style="background:#F7FAFC; border:1px solid var(--border);">
                <strong class="dm-label" style="color:var(--primary); display:block; margin-bottom:10px;">📦 Receta de Inventario</strong>
                <div id="cont-receta">${recetaHTML}</div>

                <button
                    type="button"
                    class="dm-btn dm-btn-secondary dm-btn-block"
                    style="margin-top:10px; border:1px dashed var(--primary); color:var(--primary); background:transparent;"
                    onclick="window.agregarFilaReceta()"
                >
                    + Añadir Insumo a la Receta
                </button>
            </div>

            <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">
                ${obj ? 'Guardar Cambios' : 'Crear Producto'}
            </button>
        </form>
    `;

    App.ui.openSheet(obj ? 'Editar Producto' : 'Nuevo Producto', formHTML, (data) => {
        if (data.mat_id && Array.isArray(data.mat_id)) {
            for (let i = 0; i < data.mat_id.length; i++) {
                data[`mat_${i + 1}`] = data.mat_id[i];
                data[`cant_${i + 1}`] = data.cant[i];
                data[`uso_${i + 1}`] = data.uso[i];
            }
            delete data.mat_id;
            delete data.cant;
            delete data.uso;
        } else if (data.mat_id) {
            data.mat_1 = data.mat_id;
            data.cant_1 = data.cant;
            data.uso_1 = data.uso;
            delete data.mat_id;
            delete data.cant;
            delete data.uso;
        }

        if (obj) App.logic.actualizarRegistroGenerico('productos', id, data, 'productos');
        else App.logic.guardarNuevoGenerico('productos', data, 'PROD', 'productos', callback);
    });
};

// ==========================================
// ARTESANOS
// ==========================================
App.views.artesanos = function() {
    const bottomNav = document.getElementById('bottom-nav');
    if (bottomNav) bottomNav.style.display = 'flex';

    const artesanos = App.state.artesanos || [];

    let html = `
        <div class="dm-section" style="padding-bottom:90px;">
            <div class="dm-card dm-mb-4">
                <h3 class="dm-card-title">Artesanos y Tareas</h3>
                <p class="dm-muted dm-mb-2" style="margin-top:6px;">Gestiona artesanos y sus tarifas de trabajo.</p>
            </div>

            <div class="dm-list">
    `;

    if (artesanos.length === 0) {
        html += `<div class="dm-alert dm-alert-info">No hay artesanos registrados.</div>`;
    } else {
        artesanos.forEach(a => {
            html += `
                <div class="dm-list-card">
                    <div class="dm-row-between" style="align-items:flex-start; gap:12px;">
                        <div style="flex:1; min-width:0;">
                            <strong style="word-break:break-word;">${App.ui.escapeHTML(a.nombre)}</strong><br>
                            <small class="dm-muted">📞 ${App.ui.safe(a.telefono || 'N/A')}</small>
                        </div>

                        <div class="dm-list-card-actions" style="justify-content:flex-end;">
                            <button
                                class="dm-btn dm-btn-secondary dm-btn-sm"
                                style="border:1px solid var(--primary); color:var(--primary); background:transparent;"
                                onclick="App.views.verTarifasArtesano('${a.id}')"
                            >
                                Tarifas 💲
                            </button>
                            <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.views.formArtesano('${a.id}')">✏️</button>
                            <button class="dm-btn dm-btn-danger dm-btn-sm" onclick="App.logic.eliminarRegistroGenerico('artesanos', '${a.id}', 'artesanos')">🗑️</button>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    html += `
            </div>
        </div>

        <button class="dm-fab" onclick="App.views.formArtesano()">+</button>
    `;

    return html;
};

App.views.formArtesano = function(id = null) {
    const obj = id ? (App.state.artesanos || []).find(a => a.id === id) : null;

    const formHTML = `
        <form id="dynamic-form">
            <div class="dm-form-group">
                <label class="dm-label">Nombre del Artesano</label>
                <input type="text" class="dm-input" name="nombre" value="${obj ? App.ui.escapeHTML(obj.nombre) : ''}" required>
            </div>

            <div class="dm-form-group">
                <label class="dm-label">Teléfono (10 dígitos)</label>
                <input
                    type="tel"
                    class="dm-input"
                    name="telefono"
                    value="${obj ? App.ui.safe(obj.telefono) : ''}"
                    pattern="\\d{10}"
                    title="El teléfono debe tener exactamente 10 números sin espacios"
                    maxlength="10"
                >
            </div>

            <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">
                ${obj ? 'Guardar Cambios' : 'Crear Artesano'}
            </button>
        </form>
    `;

    App.ui.openSheet(obj ? 'Editar Artesano' : 'Nuevo Artesano', formHTML, (data) => {
        if (obj) App.logic.actualizarRegistroGenerico('artesanos', id, data, 'artesanos');
        else App.logic.guardarNuevoGenerico('artesanos', data, 'ART', 'artesanos');
    });
};

// ==========================================
// TARIFAS DE ARTESANO
// ==========================================
App.views.verTarifasArtesano = function(artesanoId) {
    const artesano = (App.state.artesanos || []).find(a => a.id === artesanoId);
    const tarifas = (App.state.tarifas_artesano || []).filter(t => t.artesano_id === artesanoId);

    let html = `
        <div class="dm-mb-3">
            Gestiona cuánto cobra <strong>${artesano ? App.ui.escapeHTML(artesano.nombre) : 'Artesano'}</strong> por cada tipo de tarea.
        </div>

        <div class="dm-list dm-mb-3">
    `;

    if (tarifas.length === 0) {
        html += `<div class="dm-alert dm-alert-info">Sin tareas configuradas.</div>`;
    } else {
        tarifas.forEach(t => {
            const modoCalculo = t.modo_calculo || 'fijo';
            const aplicaA = t.aplica_a || 'total';

            html += `
                <div class="dm-list-card">
                    <div class="dm-row-between" style="align-items:flex-start; gap:12px;">
                        <div style="flex:1;">
                            <strong>${App.ui.escapeHTML(t.clasificacion || 'Tarea')}</strong>
                            <div class="dm-text-sm dm-muted dm-mt-2">
                                Modo: <strong>${App.ui.escapeHTML(modoCalculo)}</strong><br>
                                Aplica a: <strong>${App.ui.escapeHTML(aplicaA)}</strong>
                            </div>
                        </div>

                        <div style="text-align:right;">
                            <div style="font-weight:bold; color:var(--success); margin-bottom:6px;">$${parseFloat(t.monto || 0).toFixed(2)}</div>
                            <div class="dm-list-card-actions" style="justify-content:flex-end;">
                                <button class="dm-btn dm-btn-secondary dm-btn-sm" onclick="App.ui.closeSheet(); setTimeout(()=>App.views.formTarifa('${artesanoId}', '${t.id}'), 400);">✏️</button>
                                <button class="dm-btn dm-btn-danger dm-btn-sm" onclick="App.logic.eliminarRegistroGenerico('tarifas_artesano', '${t.id}', 'tarifas_artesano'); App.ui.closeSheet();">🗑️</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    html += `
        </div>

        <button class="dm-btn dm-btn-primary dm-btn-block" onclick="App.ui.closeSheet(); setTimeout(()=>App.views.formTarifa('${artesanoId}'), 400);">
            + Agregar Tarea
        </button>
    `;

    App.ui.openSheet(`Tarifas de ${artesano ? App.ui.escapeHTML(artesano.nombre) : 'Artesano'}`, html);
};

App.views.formTarifa = function(artesanoId, tarifaId = null) {
    if (typeof tarifaId !== 'string') tarifaId = null;

    const obj = tarifaId
        ? (App.state.tarifas_artesano || []).find(t => t.id === tarifaId)
        : null;

    const modoCalculo = obj?.modo_calculo || 'fijo';
    const aplicaA = obj?.aplica_a || 'total';

    const formHTML = `
        <form id="dynamic-form">
            <input type="hidden" name="artesano_id" value="${artesanoId}">

            <div class="dm-form-group">
                <label class="dm-label">Tarea a Realizar</label>
                <input
                    type="text"
                    class="dm-input"
                    name="clasificacion"
                    value="${obj ? App.ui.escapeHTML(obj.clasificacion) : ''}"
                    required
                    placeholder="Nombre de la tarea"
                >
            </div>

            <div class="dm-form-group">
                <label class="dm-label">Monto a Pagar ($)</label>
                <input
                    type="number"
                    step="0.01"
                    class="dm-input"
                    name="monto"
                    value="${obj ? (parseFloat(obj.monto || 0) || '') : ''}"
                    required
                >
            </div>

            <div class="dm-form-group">
                <label class="dm-label">Modo de Cálculo</label>
                <select class="dm-select" name="modo_calculo" id="modo-calculo-tarifa">
                    <option value="fijo" ${modoCalculo === 'fijo' ? 'selected' : ''}>Fijo</option>
                    <option value="por_unidad" ${modoCalculo === 'por_unidad' ? 'selected' : ''}>Por unidad</option>
                </select>
                <small class="dm-text-sm dm-muted">
                    Fijo = paga el monto tal cual. Por unidad = multiplica el monto por la base configurada.
                </small>
            </div>

            <div class="dm-form-group">
                <label class="dm-label">Aplica a</label>
                <select class="dm-select" name="aplica_a" id="aplica-a-tarifa">
                    <option value="total" ${aplicaA === 'total' ? 'selected' : ''}>Total de la receta</option>
                    <option value="Cuerpo" ${aplicaA === 'Cuerpo' ? 'selected' : ''}>Cuerpo</option>
                    <option value="Brazos" ${aplicaA === 'Brazos' ? 'selected' : ''}>Brazos</option>
                    <option value="Adicional" ${aplicaA === 'Adicional' ? 'selected' : ''}>Adicional</option>
                </select>
                <small class="dm-text-sm dm-muted">
                    Solo se usa cuando el modo es "por_unidad".
                </small>
            </div>

            <div class="dm-alert dm-alert-info dm-mb-3">
                <strong>Ejemplos:</strong><br>
                • Fijo + total → paga siempre el mismo monto<br>
                • Por unidad + Cuerpo → multiplica por la suma de receta marcada como Cuerpo<br>
                • Por unidad + Brazos → multiplica por la suma marcada como Brazos
            </div>

            <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">
                ${obj ? 'Guardar Cambios' : 'Guardar Tarea'}
            </button>
        </form>
    `;

    App.ui.openSheet(obj ? 'Editar Tarea' : 'Nueva Tarea para Artesano', formHTML, (data) => {
        if (!data.modo_calculo) data.modo_calculo = 'fijo';
        if (!data.aplica_a) data.aplica_a = 'total';

        if (obj) {
            App.logic.actualizarRegistroGenerico('tarifas_artesano', tarifaId, data, 'tarifas_artesano', () => {
                setTimeout(() => App.views.verTarifasArtesano(artesanoId), 400);
            });
        } else {
            App.logic.guardarNuevoGenerico('tarifas_artesano', data, 'TAR', 'tarifas_artesano', () => {
                setTimeout(() => App.views.verTarifasArtesano(artesanoId), 400);
            });
        }
    });
};
