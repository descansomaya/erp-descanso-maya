// ==========================================
// 4. NAVEGACIÓN Y ARRANQUE (main.js) - ADAPTADO AL DESIGN SYSTEM
// ==========================================

window.onerror = function(message, source, lineno) { alert("Hubo un error al cargar: \n" + message + "\nLínea: " + lineno); };

window.cargarTarifas = function(artesanoId) { const tarifas = App.state.tarifas_artesano.filter(t => t.artesano_id === artesanoId); const select = document.getElementById('select-tarifas'); if(!select) return; select.innerHTML = '<option value="">-- Seleccione Trabajo --</option>' + tarifas.map(t => `<option value="${t.monto || 0}">${t.clasificacion || 'Tarea'} ($${t.monto || 0})</option>`).join(''); };
window.calcTotalTrabajo = function() { const sel = document.getElementById('select-tarifas'); const cant = document.getElementById('cant-trabajo').value; const tot = document.getElementById('total-trabajo'); if(sel && cant && tot && sel.value) { tot.value = (parseFloat(sel.value) * parseFloat(cant)).toFixed(2); document.getElementById('tarea_nombre').value = sel.options[sel.selectedIndex].text.split(' ($')[0]; } };
window.filtrarLista = function(inputId, claseItem) { const filtro = document.getElementById(inputId).value.toLowerCase(); const items = document.querySelectorAll('.' + claseItem); items.forEach(item => { const texto = item.innerText.toLowerCase(); item.style.display = texto.includes(filtro) ? '' : 'none'; }); };
window.calcularTotalPedido = function() { const prodSelect = document.querySelector('select[name="producto_id"]'); const cantInput = document.querySelector('input[name="cantidad"]'); const mayoreoCheck = document.querySelector('input[name="es_mayoreo"]'); const totalInput = document.querySelector('input[name="total"]'); const infoExtra = document.getElementById('info-extra-prod'); if(prodSelect && cantInput && totalInput && prodSelect.value) { const prod = App.state.productos.find(p => p.id === prodSelect.value); if(prod) { const cant = parseFloat(cantInput.value) || 1; const pb = mayoreoCheck && mayoreoCheck.checked && parseFloat(prod.precio_mayoreo) > 0 ? parseFloat(prod.precio_mayoreo) : parseFloat(prod.precio_venta); totalInput.value = (pb * cant).toFixed(2); if(infoExtra) infoExtra.innerHTML = `<small style="color:var(--primary);"><strong>Clasificación:</strong> ${prod.clasificacion || 'N/A'} | <strong>Tamaño:</strong> ${prod.tamano || 'N/A'} | <strong>Color:</strong> ${prod.color || 'N/A'}</small>`; } } else { if(infoExtra) infoExtra.innerHTML = ''; } };

window.agregarFilaReceta = function() { const cont = document.getElementById('cont-receta'); const opcMat = App.state.inventario.map(m => `<option value="${m.id}">${m.nombre} (${m.unidad})</option>`).join(''); const div = document.createElement('div'); div.className = 'dm-row dm-mb-3 fila-dinamica'; div.innerHTML = `<div class="dm-w-full"><select class="dm-select" name="mat_id[]" required><option value="">-- Insumo --</option>${opcMat}</select></div><div style="width:100px;"><input type="number" step="0.1" class="dm-input" name="cant[]" placeholder="Cant" required></div><div><select class="dm-select" name="uso[]" required><option value="Cuerpo">Cuerpo</option><option value="Brazos">Brazos</option><option value="Adicional">Otro</option></select></div><button type="button" onclick="this.parentElement.remove()" class="dm-btn dm-btn-danger">X</button>`; cont.appendChild(div); };
window.calcTotalCompra = function() { const cants = document.querySelectorAll('input[name="cant[]"]'); const precios = document.querySelectorAll('input[name="precio_u[]"]'); const totalesFila = document.querySelectorAll('input[name="total_fila[]"]'); let granTotal = 0; for(let i=0; i<cants.length; i++) { const t = (parseFloat(cants[i].value) || 0) * (parseFloat(precios[i].value) || 0); if(totalesFila[i]) totalesFila[i].value = t.toFixed(2); granTotal += t; } const inputGranTotal = document.querySelector('input[name="total"]'); if(inputGranTotal) inputGranTotal.value = granTotal.toFixed(2); const inputMontoPagado = document.querySelector('input[name="monto_pagado"]'); if(inputMontoPagado) inputMontoPagado.value = granTotal.toFixed(2); };

window.agregarFilaCompra = function() { 
    const cont = document.getElementById('cont-compras'); 
    const opcMat = App.state.inventario.map(m => `<option value="${m.id}">${m.nombre} (Físico: ${m.stock_real||0})</option>`).join(''); 
    const div = document.createElement('div'); div.className = 'fila-compra dm-card dm-mb-3'; div.style.padding = '10px'; div.innerHTML = `<div class="dm-mb-2"><select class="dm-select" name="mat_id[]" required><option value="">-- Selecciona Insumo --</option>${opcMat}</select></div><div class="dm-row"><input type="number" step="0.1" class="dm-input" name="cant[]" placeholder="Cant." required oninput="window.calcTotalCompra()"><input type="number" step="0.01" class="dm-input" name="precio_u[]" placeholder="$ Unit." required oninput="window.calcTotalCompra()"><input type="number" step="0.01" class="dm-input" name="total_fila[]" placeholder="$ Tot" readonly style="background:#f3f4f6;"><button type="button" onclick="this.parentElement.parentElement.remove(); window.calcTotalCompra();" class="dm-btn dm-btn-danger">X</button></div>`; cont.appendChild(div); 
};

window.agregarFilaGasto = function() { const cont = document.getElementById('cont-gastos'); const div = document.createElement('div'); div.className = 'dm-row dm-mb-3 fila-dinamica'; div.innerHTML = `<input type="text" class="dm-input" name="descripcion[]" placeholder="Descripción" required style="flex:2;"><input type="number" step="0.01" class="dm-input" name="monto[]" placeholder="$ Monto" required style="flex:1;"><button type="button" onclick="this.parentElement.remove()" class="dm-btn dm-btn-danger">X</button>`; cont.appendChild(div); };

window.generarFilaRecetaProd = function(matId, cant, uso) { 
    const opcMat = App.state.inventario.map(m => `<option value="${m.id}" ${matId === m.id ? 'selected':''}>${m.nombre} (${m.stock_real||0} físicos)</option>`).join(''); 
    return `<div class="dm-row dm-mb-3 fila-dinamica"><div class="dm-w-full"><select class="dm-select" name="mat_id[]" required><option value="">-- Insumo --</option>${opcMat}</select></div><div style="width:100px;"><input type="number" step="0.1" class="dm-input" name="cant[]" value="${cant||''}" placeholder="Cant" required></div><div><select class="dm-select" name="uso[]" required><option value="Cuerpo" ${uso==='Cuerpo'?'selected':''}>Cuerpo</option><option value="Brazos" ${uso==='Brazos'?'selected':''}>Brazos</option><option value="Adicional" ${uso==='Adicional'?'selected':''}>Otro</option></select></div><button type="button" onclick="this.parentElement.remove()" class="dm-btn dm-btn-danger">X</button></div>`; 
};

window.agregarFilaRecetaProd = function() { document.getElementById('cont-receta-prod').insertAdjacentHTML('beforeend', window.generarFilaRecetaProd('', '', 'Cuerpo')); };
window.exportarAExcel = function(datos, nombreArchivo) { if(!datos || datos.length === 0) return alert("No hay datos para exportar"); const cabeceras = Object.keys(datos[0]).join(','); const filas = datos.map(obj => Object.values(obj).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')); const blob = new Blob(["\uFEFF" + cabeceras + '\n' + filas.join('\n')], { type: 'text/csv;charset=utf-8;' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombreArchivo + '.csv'; a.click(); };
window.switchTabProd = function(tabId, btn) { document.querySelectorAll('.tab-content-prod').forEach(el => el.style.display = 'none'); document.querySelectorAll('.tab-btn-prod').forEach(el => { el.classList.remove('active'); }); document.getElementById('tab-' + tabId).style.display = 'block'; btn.classList.add('active'); };
window.switchTabPed = function(tabId, btn) { document.querySelectorAll('.tab-content-ped').forEach(el => el.style.display = 'none'); document.querySelectorAll('.tab-btn-ped').forEach(el => { el.classList.remove('active'); }); document.getElementById('tab-' + tabId).style.display = 'block'; btn.classList.add('active'); };

App.router = { 
    init() { window.addEventListener('hashchange', () => this.handleRoute()); this.handleRoute(); }, 
    navigate(route) { window.location.hash = route; }, 
  handleRoute() { 
        const contentDiv = document.getElementById('app-content');
        const headerTitle = document.getElementById('app-header-title');
        const headerSubtitle = document.getElementById('app-header-subtitle');
        
        // MANEJO DE SESIÓN NO INICIADA (BLINDADO)
        if (!App.state.sessionToken) { 
            App.ui.hideLoader(); 
            if(headerTitle) headerTitle.textContent = "Acceso Restringido"; 
            if(headerSubtitle) headerSubtitle.textContent = "Ingresa tu PIN";
            
            // Salvavidas: Si App.views.login no existe, pintamos un login de emergencia
            if(contentDiv) {
                if (typeof App.views.login === 'function') {
                    contentDiv.innerHTML = App.views.login(); 
                } else {
                    contentDiv.innerHTML = `<div style="text-align:center; padding:40px;"><h2 class="dm-mb-3">Descanso Maya</h2><p class="dm-alert dm-alert-danger dm-mb-3">Archivo de vistas dañado o cargando...</p><input type="password" id="pin-input" class="dm-input dm-mb-3" placeholder="PIN"><button class="dm-btn dm-btn-primary" onclick="App.logic.verificarPIN(document.getElementById('pin-input').value)">Entrar forzado</button></div>`;
                }
            }
            return; 
        } 
        
     
        let hash = window.location.hash.substring(1) || 'inicio'; 
        document.querySelectorAll('.dm-bottom-nav a').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.dm-sidebar-link').forEach(el => el.classList.remove('active'));
        
        const activeMobile = document.querySelector(`.dm-bottom-nav a[onclick*="${hash}"]`);
        const activeDesktop = document.querySelector(`.dm-sidebar-link[onclick*="${hash}"]`);
        
        if(activeMobile) activeMobile.classList.add('active');
        if(activeDesktop) activeDesktop.classList.add('active');
        
        if (App.views[hash]) { 
            if(contentDiv) contentDiv.innerHTML = App.views[hash](); 
            if(headerTitle && hash !== 'inicio' && hash !== 'inventario') {
                headerTitle.textContent = hash.charAt(0).toUpperCase() + hash.slice(1);
                headerSubtitle.textContent = "Gestión de " + hash;
            }
        } else { 
            if(contentDiv) contentDiv.innerHTML = `<div class="dm-card"><p class="dm-center dm-muted">Módulo no encontrado.</p></div>`; 
        } 
    }
};

App.start = function() { 
    // Si la función init existe, la ejecutamos (Evita el error de caché del celular)
    if (this.ui && typeof this.ui.init === 'function') {
        this.ui.init(); 
    }
    
    if (!this.state.sessionToken) { 
        this.router.init(); 
    } else { 
        this.logic.cargarDatosIniciales(); 
    } 
};
document.addEventListener('DOMContentLoaded', () => App.start());

// ==========================================
// PARCHES Y RECONEXIÓN DE MÓDULOS (DISEÑO DM)
// ==========================================

// 1. Reconectar el botón de Iniciar/Terminar Producción
App.logic.cambiarEstadoProduccion = function(id, nuevoEstado) {
    App.ui.showLoader("Actualizando estado...");
    let data = { estado: nuevoEstado };
    if(nuevoEstado === 'proceso') data.fecha_inicio = new Date().toISOString();
    if(nuevoEstado === 'listo') data.fecha_fin = new Date().toISOString();
    
    // Usamos tu función genérica que ya funciona perfecto
    App.logic.actualizarRegistroGenerico('ordenes_produccion', id, data, 'produccion');
};

// ==========================================
// 2. RECUPERAR DETALLES DE PRODUCCIÓN CON LÓGICA ORIGINAL DE TARIFAS
// ==========================================
window.verDetallesProduccion = function(ordenId) {
    const o = App.state.ordenes_produccion.find(x => x.id === ordenId);
    if(!o) return;
    
    // Conexiones de tu base de datos relacional
    const pedDet = App.state.pedido_detalle.find(d => d.id === o.pedido_detalle_id) || {}; 
    const p = App.state.pedidos.find(x => x.id === pedDet.pedido_id) || {}; 
    const cliente = App.state.clientes.find(x => x.id === p.cliente_id) || {};
    const prod = App.state.productos.find(x => x.id === pedDet.producto_id) || {};
    const nomCliente = p.cliente_id === 'STOCK_INTERNO' ? 'STOCK BODEGA' : (cliente.nombre || 'Desconocido');

    // Recuperamos las opciones de artesanos
    let artesanosOpts = '<option value="">-- Sin Asignar --</option>';
    (App.state.artesanos || []).forEach(art => {
        artesanosOpts += `<option value="${art.id}" ${o.artesano_id === art.id ? 'selected' : ''}>${art.nombre}</option>`;
    });

    // Construimos el HTML respetando tus campos originales (tarifa_nombre, pago_estimado, etc.)
    let html = `
    <div class="dm-list-card dm-mb-4" style="background:var(--dm-surface-2); padding:15px; border:none;">
        <div class="dm-row-between dm-mb-2">
            <span class="dm-text-sm dm-muted">Folio / Cliente:</span>
            <strong style="color:var(--dm-primary);">${(p.id||'').replace('PED-','')} - ${nomCliente}</strong>
        </div>
        <div class="dm-row-between">
            <span class="dm-text-sm dm-muted">Producto a tejer:</span>
            <strong>${prod.nombre || 'No definido'}</strong>
        </div>
    </div>
    
    <div class="dm-form-group">
        <label class="dm-label">Notas de Producción</label>
        <div class="dm-alert dm-alert-warning" style="background:#fff;">
            ${p.notas ? App.ui.escapeHTML(p.notas) : '<i>Sin instrucciones especiales.</i>'}
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
                <input type="number" step="0.01" class="dm-input" id="total-trabajo" name="pago_estimado" value="${o.pago_estimado || ''}" readonly style="background:#f3f4f6;">
            </div>
        </div>

        <button type="submit" class="dm-btn dm-btn-primary dm-btn-block dm-mt-4">💾 Guardar Asignación</button>
    </form>
    
    <div class="dm-row-between dm-mt-4">
        <button class="dm-btn dm-btn-secondary" onclick="App.ui.closeSheet()">Cerrar</button>
        ${o.estado !== 'listo' ? `<button class="dm-btn dm-btn-ghost" style="border:1px solid var(--dm-border);" onclick="App.views.modalMateriaPrima('${o.id}')">🧶 Asignar Hilos</button>` : ''}
    </div>`;

    App.ui.openSheet("Detalle de Producción", html, (data) => {
        // Al guardar, usamos tu lógica genérica para actualizar la base de datos
        App.logic.actualizarRegistroGenerico('ordenes_produccion', o.id, data, 'produccion');
        App.ui.toast("Asignación guardada con éxito");
        App.ui.closeSheet();
    });

    // Si ya tenía un artesano asignado, cargamos sus tarifas automáticamente al abrir el modal
    if(o.artesano_id) {
        setTimeout(() => {
            window.cargarTarifas(o.artesano_id);
            // Pre-seleccionar la tarifa que ya tenía guardada si existe
            if(o.pago_estimado) {
                const selectTarifas = document.getElementById('select-tarifas');
                for(let i=0; i<selectTarifas.options.length; i++) {
                    if(selectTarifas.options[i].value == o.pago_estimado) {
                        selectTarifas.selectedIndex = i;
                        break;
                    }
                }
            }
        }, 200);
    }
};

