/**
 * DESCANSO MAYA ERP - Motor Principal v55
 * Sistema ensamblado (Lotes, QRs, Diagnóstico, Atajos y Utilidad)
 */

window.onerror = function(message, source, lineno) { alert("Hubo un error al cargar: \n" + message + "\nLínea: " + lineno); };

window.cargarTarifas = function(artesanoId) { const tarifas = App.state.tarifas_artesano.filter(t => t.artesano_id === artesanoId); const select = document.getElementById('select-tarifas'); if(!select) return; select.innerHTML = '<option value="">-- Seleccione Trabajo --</option>' + tarifas.map(t => `<option value="${t.monto}">${t.clasificacion} ($${t.monto})</option>`).join(''); };
window.calcTotalTrabajo = function() { const sel = document.getElementById('select-tarifas'); const cant = document.getElementById('cant-trabajo').value; const tot = document.getElementById('total-trabajo'); if(sel && cant && tot && sel.value) { tot.value = (parseFloat(sel.value) * parseFloat(cant)).toFixed(2); document.getElementById('tarea_nombre').value = sel.options[sel.selectedIndex].text.split(' ($')[0]; } };
window.filtrarLista = function(inputId, claseItem) { const filtro = document.getElementById(inputId).value.toLowerCase(); const items = document.querySelectorAll('.' + claseItem); items.forEach(item => { const texto = item.innerText.toLowerCase(); item.style.display = texto.includes(filtro) ? '' : 'none'; }); };
window.calcularTotalPedido = function() { const prodSelect = document.querySelector('select[name="producto_id"]'); const cantInput = document.querySelector('input[name="cantidad"]'); const mayoreoCheck = document.querySelector('input[name="es_mayoreo"]'); const totalInput = document.querySelector('input[name="total"]'); const infoExtra = document.getElementById('info-extra-prod'); if(prodSelect && cantInput && totalInput && prodSelect.value) { const prod = App.state.productos.find(p => p.id === prodSelect.value); if(prod) { const cant = parseFloat(cantInput.value) || 1; const usaMayoreo = mayoreoCheck && mayoreoCheck.checked; const precioBase = usaMayoreo && parseFloat(prod.precio_mayoreo) > 0 ? parseFloat(prod.precio_mayoreo) : parseFloat(prod.precio_venta); totalInput.value = (precioBase * cant).toFixed(2); if(infoExtra) infoExtra.innerHTML = `<small style="color:var(--primary);"><strong>Clasificación:</strong> ${prod.clasificacion || 'N/A'} | <strong>Tamaño:</strong> ${prod.tamano || 'N/A'} | <strong>Color:</strong> ${prod.color || 'N/A'}</small>`; } } else { if(infoExtra) infoExtra.innerHTML = ''; } };

window.agregarFilaReceta = function() { const cont = document.getElementById('cont-receta'); const opcMat = App.state.inventario.map(m => `<option value="${m.id}">${m.nombre} (${m.unidad})</option>`).join(''); const div = document.createElement('div'); div.className = 'grid-3 fila-dinamica'; div.style.marginBottom = '5px'; div.innerHTML = `<div class="form-group" style="margin:0;"><select name="mat_id[]" required><option value="">-- Insumo --</option>${opcMat}</select></div><div class="form-group" style="margin:0;"><input type="number" step="0.1" name="cant[]" placeholder="Cant" required></div><div class="form-group" style="margin:0; display:flex; gap:5px;"><select name="uso[]" required><option value="Cuerpo">Cuerpo</option><option value="Brazos">Brazos</option><option value="Adicional">Otro</option></select><button type="button" onclick="this.parentElement.parentElement.remove()" style="background:var(--danger); color:white; border:none; border-radius:4px; padding:0 10px;">X</button></div>`; cont.appendChild(div); };
window.agregarFilaCompra = function() { const cont = document.getElementById('cont-compras'); const opcMat = App.state.inventario.map(m => `<option value="${m.id}">${m.nombre} (Stock: ${m.stock_actual})</option>`).join(''); const div = document.createElement('div'); div.className = 'grid-3 fila-dinamica'; div.style.marginBottom = '5px'; div.innerHTML = `<div class="form-group" style="margin:0;"><select name="mat_id[]" required><option value="">-- Seleccionar --</option>${opcMat}</select></div><div class="form-group" style="margin:0;"><input type="number" step="0.1" name="cant[]" placeholder="Cant" required></div><div class="form-group" style="margin:0; display:flex; gap:5px;"><input type="number" step="0.01" name="costo[]" placeholder="$" required><button type="button" onclick="this.parentElement.parentElement.remove()" style="background:var(--danger); color:white; border:none; border-radius:4px; padding:0 10px;">X</button></div>`; cont.appendChild(div); };
window.agregarFilaGasto = function() { const cont = document.getElementById('cont-gastos'); const div = document.createElement('div'); div.className = 'grid-2 fila-dinamica'; div.style.marginBottom = '5px'; div.innerHTML = `<div class="form-group" style="margin:0;"><input type="text" name="descripcion[]" placeholder="Descripción" required></div><div class="form-group" style="margin:0; display:flex; gap:5px;"><input type="number" step="0.01" name="monto[]" placeholder="$ Monto" required><button type="button" onclick="this.parentElement.parentElement.remove()" style="background:var(--danger); color:white; border:none; border-radius:4px; padding:0 10px;">X</button></div>`; cont.appendChild(div); };
window.generarFilaRecetaProd = function(matId, cant, uso) { const opcMat = App.state.inventario.map(m => `<option value="${m.id}" ${matId === m.id ? 'selected':''}>${m.nombre} (${m.stock_actual} en bodega)</option>`).join(''); return `<div class="grid-3 fila-dinamica" style="margin-bottom: 5px;"><div class="form-group" style="margin:0;"><select name="mat_id[]" required><option value="">-- Insumo --</option>${opcMat}</select></div><div class="form-group" style="margin:0;"><input type="number" step="0.1" name="cant[]" value="${cant||''}" placeholder="Cant" required></div><div class="form-group" style="margin:0; display:flex; gap:5px;"><select name="uso[]" required><option value="Cuerpo" ${uso==='Cuerpo'?'selected':''}>Cuerpo</option><option value="Brazos" ${uso==='Brazos'?'selected':''}>Brazos</option><option value="Adicional" ${uso==='Adicional'?'selected':''}>Otro</option></select><button type="button" onclick="this.parentElement.parentElement.remove()" style="background:var(--danger); color:white; border:none; border-radius:4px; padding:0 10px;">X</button></div></div>`; };
window.agregarFilaRecetaProd = function() { const cont = document.getElementById('cont-receta-prod'); cont.insertAdjacentHTML('beforeend', window.generarFilaRecetaProd('', '', 'Cuerpo')); };

window.exportarAExcel = function(datos, nombreArchivo) {
    if(!datos || datos.length === 0) return alert("No hay datos para exportar");
    const cabeceras = Object.keys(datos[0]).join(',');
    const filas = datos.map(obj => Object.values(obj).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = ["\uFEFF" + cabeceras, ...filas].join('\n'); 
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = nombreArchivo + '.csv'; a.click();
};

window.filtrarPedidos = function(estado, btn) {
    document.querySelectorAll('.btn-filtro-ped').forEach(b => { b.style.background = 'transparent'; b.style.color = 'var(--text-muted)'; });
    if(btn) { btn.style.background = 'var(--primary)'; btn.style.color = 'white'; }
    document.querySelectorAll('.tarj-ped').forEach(el => {
        if(estado === 'todo' || el.dataset.estado === estado || (estado === 'listo' && el.dataset.estado === 'listo para entregar') || (estado === 'urgente' && el.dataset.urgente === 'true')) { el.style.display = 'block'; } else { el.style.display = 'none'; }
    });
};

const App = {};

App.state = {
    config: { empresa: "Descanso Maya", moneda: "MXN", logoUrl: "https://i.ibb.co/5h0kNKrZ/DESCANSO-MAYA.png", redesSociales: "@descansomaya.mx" },
    pinAcceso: localStorage.getItem('erp_pin') || null, cotizaciones: JSON.parse(localStorage.getItem('erp_cotizaciones')) || [], 
    pedidos: [], pedido_detalle: [], ordenes_produccion: [], artesanos: [], inventario: [], productos: [], clientes: [], abonos: [], gastos: [], compras: [], proveedores: [], reparaciones: [], tarifas_artesano: [], pago_artesanos: [], consumos_produccion: [], movimientos_inventario: []
};

App.api = {
    gasUrl: "https://script.google.com/macros/s/AKfycbxL3KzjesyZIfiC-Dyr0SwwzwNnPsv5FgHpt-JhyscNpN1eTvRwAh_rdgoxdVnKTAwu/exec", 
    async fetch(action, payload = {}) {
        try { const response = await fetch(this.gasUrl, { method: 'POST', body: JSON.stringify({ action: action, payload: payload, pin: App.state.pinAcceso }) }); const data = await response.json(); if (data.message === "Acceso Denegado. PIN incorrecto.") { localStorage.removeItem('erp_pin'); App.state.pinAcceso = null; App.router.handleRoute(); } return data; } 
        catch (error) { return { status: "error", message: "Fallo de conexión." }; }
    }
};

App.ui = {
    container: null,
    init() { 
        this.container = document.getElementById('overlays'); const toastCont = document.createElement('div'); toastCont.className = 'toast-container'; toastCont.id = 'toast-container'; document.body.appendChild(toastCont); const loader = document.createElement('div'); loader.id = 'global-loader'; loader.innerHTML = `<div class="spinner"></div><h2 style="margin: 0; font-weight: 600;">Descanso Maya</h2><p id="loader-text" style="margin-top: 10px; opacity: 0.8; font-size: 0.9rem;">Sincronizando...</p><button id="btn-reintentar" class="btn btn-secondary hidden" style="margin-top: 20px;" onclick="location.reload()">Reintentar</button>`; document.body.appendChild(loader); 
        const estiloFix = document.createElement('style'); estiloFix.innerHTML = `.fab { position: fixed !important; bottom: 85px !important; right: 20px !important; z-index: 999 !important; width: 56px !important; height: 56px !important; border-radius: 50% !important; background: var(--primary) !important; color: white !important; font-size: 28px !important; box-shadow: 0 4px 10px rgba(0,0,0,0.4) !important; display: flex !important; align-items: center !important; justify-content: center !important; border: none !important; cursor: pointer !important; } .fab:active { transform: scale(0.95); }`; document.head.appendChild(estiloFix);
        const script = document.createElement('script'); script.src = 'https://cdn.jsdelivr.net/npm/chart.js'; document.head.appendChild(script);
    },
    toast(message) { const cont = document.getElementById('toast-container'); const t = document.createElement('div'); t.className = 'toast'; t.textContent = message; cont.appendChild(t); setTimeout(() => t.remove(), 4000); },
    showLoader(mensaje = "Procesando...") { const loader = document.getElementById('global-loader'); if(loader) { document.getElementById('loader-text').textContent = mensaje; loader.classList.remove('hidden'); } },
    hideLoader() { const loader = document.getElementById('global-loader'); if(loader) loader.classList.add('hidden'); },
    openSheet(title, contentHTML, onSaveCallback) { 
        this.container.innerHTML = `<div class="overlay-bg active" id="sheet-bg" style="z-index: 1000;"></div><div class="bottom-sheet active" id="sheet-content" style="z-index: 1001;"><div class="sheet-header"><h3>${title}</h3><button class="sheet-close" id="sheet-close">&times;</button></div><div class="sheet-body">${contentHTML}</div></div>`; 
        document.getElementById('sheet-close').onclick = this.closeSheet.bind(this); document.getElementById('sheet-bg').onclick = this.closeSheet.bind(this); 
        const fab = document.querySelector('.fab'); if(fab) fab.style.display = 'none'; 
        const form = document.getElementById('dynamic-form'); 
        if(form && onSaveCallback) { 
            form.onsubmit = (e) => { 
                e.preventDefault(); const formData = new FormData(form); const data = {};
                for (let [key, value] of formData.entries()) {
                    const isArray = key.endsWith('[]'); const cleanKey = isArray ? key.slice(0, -2) : key;
                    if (data[cleanKey] !== undefined) { if (!Array.isArray(data[cleanKey])) data[cleanKey] = [data[cleanKey]]; data[cleanKey].push(value); } else { data[cleanKey] = isArray ? [value] : value; }
                }
                this.closeSheet(); onSaveCallback(data); 
            }; 
        } 
    },
    closeSheet() { this.container.innerHTML = ''; const fab = document.querySelector('.fab'); if(fab) fab.style.display = 'flex'; }
};

App.logic = {
    async verificarPIN(pin) { App.ui.showLoader("Verificando..."); App.state.pinAcceso = pin; const res = await App.api.fetch("ping"); if (res.status === "success") { localStorage.setItem('erp_pin', pin); App.ui.toast("¡Acceso concedido!"); this.cargarDatosIniciales(); } else { App.state.pinAcceso = null; App.ui.hideLoader(); App.ui.toast("PIN Incorrecto."); } },
    async cargarDatosIniciales() { App.ui.showLoader("Descargando base de datos..."); try { const hojas = ["materiales", "clientes", "productos", "pedidos", "pedido_detalle", "ordenes_produccion", "artesanos", "abonos_clientes", "gastos", "compras", "proveedores", "reparaciones", "tarifas_artesano", "pago_artesanos", "consumos_produccion", "movimientos_inventario"]; const promesas = hojas.map(h => App.api.fetch("leer_hoja", { nombreHoja: h })); const resultados = await Promise.all(promesas); if (resultados[0].status === "error") throw new Error(resultados[0].message); App.state.inventario = resultados[0].data || []; App.state.clientes = resultados[1].data || []; App.state.productos = resultados[2].data || []; App.state.pedidos = resultados[3].data || []; App.state.pedido_detalle = resultados[4].data || []; App.state.ordenes_produccion = resultados[5].data || []; App.state.artesanos = resultados[6].data || []; App.state.abonos = resultados[7].data || []; App.state.gastos = resultados[8].data || []; App.state.compras = resultados[9].data || []; App.state.proveedores = resultados[10].data || []; App.state.reparaciones = resultados[11].data || []; App.state.tarifas_artesano = resultados[12].data || []; App.state.pago_artesanos = resultados[13].data || []; App.state.consumos_produccion = resultados[14].data || []; App.state.movimientos_inventario = resultados[15].data || []; App.ui.hideLoader(); App.router.init(); } catch (error) { App.ui.toast("Error de red."); document.getElementById('btn-reintentar').classList.remove('hidden'); } },
    descargarRespaldo() { const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(App.state, null, 2)); const dlAnchorElem = document.createElement('a'); dlAnchorElem.setAttribute("href", dataStr); dlAnchorElem.setAttribute("download", `Respaldo_ERP_Maya_${new Date().toISOString().split('T')[0]}.json`); dlAnchorElem.click(); App.ui.toast("Respaldo descargado"); },

    async eliminarRegistroGenerico(hoja, id, estado) { if(!confirm("⚠️ ¿Eliminar permanentemente?")) return; App.ui.showLoader("Eliminando..."); const res = await App.api.fetch("eliminar_fila", { nombreHoja: hoja, idFila: id }); App.ui.hideLoader(); if(res.status === "success") { App.state[estado] = App.state[estado].filter(item => item.id !== id); App.ui.toast("Eliminado"); App.router.handleRoute(); } else { App.ui.toast("Error"); } },
    
    async eliminarPedido(id) { 
        if(!confirm("⚠️ ¿Eliminar pedido por completo?\n\nLos hilos que se enviaron a producción se regresarán automáticamente al inventario.")) return; 
        App.ui.showLoader("Procesando eliminación y devolviendo stock..."); 
        const pedido = App.state.pedidos.find(p => p.id === id); const detalle = App.state.pedido_detalle.find(d => d.pedido_id === id); const orden = App.state.ordenes_produccion.find(o => detalle && o.pedido_detalle_id === detalle.id); 
        let operaciones = []; let nuevosMovs = [];

        if(orden && orden.receta_personalizada) {
            try {
                let receta = JSON.parse(orden.receta_personalizada);
                for(let item of receta) {
                    let material = App.state.inventario.find(m => m.id === item.mat_id);
                    if(material && parseFloat(item.cant) > 0) {
                        let nStock = parseFloat(material.stock_actual) + parseFloat(item.cant);
                        operaciones.push({ action: "actualizar_fila", nombreHoja: "materiales", idFila: material.id, datosNuevos: { stock_actual: nStock } });
                        material.stock_actual = nStock; 
                        const mov = { id: "MOV-" + Date.now() + Math.random().toString(36).substr(2,5), fecha: new Date().toISOString().split('T')[0], tipo_movimiento: "entrada_devolucion", origen: "orden", origen_id: orden.id, ref_tipo: "material", ref_id: material.id, cantidad: item.cant, costo_unitario: material.costo_unitario||0, total: (item.cant * (material.costo_unitario||0)), notas: `Devolución por pedido cancelado: ${id.replace('PED-','')}` };
                        nuevosMovs.push(mov); operaciones.push({ action: "guardar_fila", nombreHoja: "movimientos_inventario", datos: mov });
                    }
                }
            } catch(e) {}
        }

        operaciones.push({ action: "eliminar_fila", nombreHoja: "pedidos", idFila: id }); 
        if(detalle) operaciones.push({ action: "eliminar_fila", nombreHoja: "pedido_detalle", idFila: detalle.id }); 
        if(orden) { 
            operaciones.push({ action: "eliminar_fila", nombreHoja: "ordenes_produccion", idFila: orden.id }); 
            const pagosArtesanos = App.state.pago_artesanos.filter(p => p.orden_id === orden.id); 
            for(let pago of pagosArtesanos) operaciones.push({ action: "eliminar_fila", nombreHoja: "pago_artesanos", idFila: pago.id }); 
        }
        const abonos = App.state.abonos.filter(a => a.pedido_id === id); 
        for(let ab of abonos) operaciones.push({ action: "eliminar_fila", nombreHoja: "abonos_clientes", idFila: ab.id });
        
        await App.api.fetch("ejecutar_lote", { operaciones: operaciones });
        
        App.state.pedidos = App.state.pedidos.filter(p => p.id !== id); if(detalle) App.state.pedido_detalle = App.state.pedido_detalle.filter(d => d.id !== detalle.id); 
        if(orden) { App.state.ordenes_produccion = App.state.ordenes_produccion.filter(o => o.id !== orden.id); App.state.pago_artesanos = App.state.pago_artesanos.filter(p => p.orden_id !== orden.id); }
        App.state.abonos = App.state.abonos.filter(a => a.pedido_id !== id);
        if(!App.state.movimientos_inventario) App.state.movimientos_inventario = []; App.state.movimientos_inventario.push(...nuevosMovs);

        App.ui.hideLoader(); App.ui.toast("Pedido eliminado e inventario restaurado"); App.router.handleRoute(); 
    },
    
    async eliminarCompra(id) { if(!confirm("⚠️ ¿Eliminar compra? Ajusta manualmente tu inventario.")) return; App.ui.showLoader("Eliminando..."); const res = await App.api.fetch("eliminar_fila", { nombreHoja: "compras", idFila: id }); App.ui.hideLoader(); if(res.status === "success") { App.state.compras = App.state.compras.filter(c => c.id !== id); App.ui.toast("Compra eliminada."); App.router.handleRoute(); } else { App.ui.toast("Error"); } },
    async actualizarRegistroGenerico(hoja, id, datos, estado) { App.ui.showLoader("Guardando..."); const res = await App.api.fetch("actualizar_fila", { nombreHoja: hoja, idFila: id, datosNuevos: datos }); App.ui.hideLoader(); if (res.status === "success") { const index = App.state[estado].findIndex(item => item.id === id); if (index !== -1) App.state[estado][index] = { ...App.state[estado][index], ...datos }; App.ui.toast("Actualizado"); App.router.handleRoute(); } else { App.ui.toast("Error"); } },
    async guardarNuevoGenerico(hoja, datos, prefijo, estado) { App.ui.showLoader("Registrando..."); datos.id = prefijo + "-" + Date.now(); if(!datos.fecha_creacion) datos.fecha_creacion = new Date().toISOString(); const res = await App.api.fetch("guardar_fila", { nombreHoja: hoja, datos: datos }); App.ui.hideLoader(); if (res.status === "success") { App.state[estado].push(datos); App.ui.toast("Guardado"); App.router.handleRoute(); } else { App.ui.toast("Error"); } },
    guardarCotizacion(datos) { datos.id = "COT-" + Date.now(); datos.fecha_creacion = new Date().toISOString(); App.state.cotizaciones.push(datos); localStorage.setItem('erp_cotizaciones', JSON.stringify(App.state.cotizaciones)); App.ui.toast("Cotización generada"); App.router.handleRoute(); App.logic.imprimirCotizacion(datos.id); },
    eliminarCotizacion(id) { if(!confirm("⚠️ ¿Eliminar cotización?")) return; App.state.cotizaciones = App.state.cotizaciones.filter(c => c.id !== id); localStorage.setItem('erp_cotizaciones', JSON.stringify(App.state.cotizaciones)); App.ui.toast("Eliminada"); App.router.handleRoute(); },

    async guardarNuevoPedido(datosFormulario) { App.ui.showLoader("Procesando pedido..."); const pedidoId = "PED-" + Date.now(); const totalNum = parseFloat(datosFormulario.total) || 0; const anticipoNum = parseFloat(datosFormulario.anticipo) || 0; const cantidadNum = parseInt(datosFormulario.cantidad) || 1; const datosPedido = { id: pedidoId, cliente_id: datosFormulario.cliente_id, estado: "nuevo", total: totalNum, anticipo: anticipoNum, notas: datosFormulario.notas, fecha_entrega: datosFormulario.fecha_entrega, fecha_creacion: new Date().toISOString() }; const datosDetalle = { id: "PDET-" + Date.now(), pedido_id: pedidoId, producto_id: datosFormulario.producto_id, cantidad: cantidadNum, precio_unitario: totalNum / cantidadNum }; 
    let operaciones = [ { action: "guardar_fila", nombreHoja: "pedidos", datos: datosPedido }, { action: "guardar_fila", nombreHoja: "pedido_detalle", datos: datosDetalle } ];
    const resPedido = await App.api.fetch("ejecutar_lote", { operaciones: operaciones }); if (resPedido.status === "success") { App.state.pedidos.push(datosPedido); App.state.pedido_detalle.push(datosDetalle); App.ui.hideLoader(); App.ui.toast("Guardado (Sin mandar a taller)"); App.router.handleRoute(); } else { App.ui.hideLoader(); App.ui.toast("Error"); } },

    async confirmarMandarProduccion(datos) {
        const mats = Array.isArray(datos.mat_id) ? datos.mat_id : (datos.mat_id ? [datos.mat_id] : []); const cants = Array.isArray(datos.cant) ? datos.cant : (datos.cant ? [datos.cant] : []); const usos = Array.isArray(datos.uso) ? datos.uso : (datos.uso ? [datos.uso] : []); let requerimientos = {};
        for(let i=0; i<mats.length; i++){ let mId = mats[i]; let c = parseFloat(cants[i]||0); if(mId && c > 0) requerimientos[mId] = (requerimientos[mId] || 0) + c; }
        let alertasDeStock = []; for(let mId in requerimientos) { let material = App.state.inventario.find(m => m.id === mId); if(material && parseFloat(material.stock_actual) < requerimientos[mId]) { alertasDeStock.push(`❌ ${material.nombre}: Tienes ${material.stock_actual} y necesitas ${requerimientos[mId]}`); } }
        if(alertasDeStock.length > 0) { const continuar = confirm("⚠️ ALERTA: NO TIENES SUFICIENTE MATERIAL EN BODEGA ⚠️\n\n" + alertasDeStock.join("\n") + "\n\n¿Quieres enviarlo a producción de todos modos? (El sistema dejará el stock en números negativos)."); if(!continuar) return; }
        
        App.ui.showLoader("Generando Orden y Descontando Stock..."); let operaciones = []; let nuevosMovs = []; let recetaPersonalizada = [];
        for(let i=0; i<mats.length; i++) {
            const matId = mats[i]; const cant = parseFloat(cants[i] || 0); const usoStr = usos[i] || 'Cuerpo';
            if(matId && cant > 0) {
                recetaPersonalizada.push({ mat_id: matId, cant: cant, uso: usoStr }); const material = App.state.inventario.find(m => m.id === matId);
                if(material) {
                    const nStock = parseFloat(material.stock_actual) - cant; operaciones.push({ action: "actualizar_fila", nombreHoja: "materiales", idFila: material.id, datosNuevos: { stock_actual: nStock } }); material.stock_actual = nStock;
                    const mov = { id: "MOV-" + Date.now() + i, fecha: new Date().toISOString().split('T')[0], tipo_movimiento: "salida_produccion", origen: "orden", origen_id: "PENDIENTE", ref_tipo: "material", ref_id: material.id, cantidad: -cant, costo_unitario: material.costo_unitario||0, total: (-cant * (material.costo_unitario||0)), notas: `Envío a taller de pedido ${datos.pedido_id.replace('PED-','')}` };
                    nuevosMovs.push(mov); 
                }
            }
        }
        const nuevaOrden = { id: "ORD-" + Date.now(), pedido_detalle_id: datos.pedido_detalle_id, estado: "pendiente", fecha_creacion: new Date().toISOString(), receta_personalizada: JSON.stringify(recetaPersonalizada) };
        nuevosMovs.forEach(m => { m.origen_id = nuevaOrden.id; operaciones.push({ action: "guardar_fila", nombreHoja: "movimientos_inventario", datos: m }); });
        operaciones.push({ action: "guardar_fila", nombreHoja: "ordenes_produccion", datos: nuevaOrden });
        
        await App.api.fetch("ejecutar_lote", { operaciones: operaciones }); 
        App.state.ordenes_produccion.push(nuevaOrden); if(!App.state.movimientos_inventario) App.state.movimientos_inventario = []; App.state.movimientos_inventario.push(...nuevosMovs);
        App.ui.hideLoader(); App.ui.toast("Enviado a taller y stock descontado"); App.router.navigate('produccion');
    },

    async guardarOrdenStock(datos) { 
        App.ui.showLoader("Procesando Stock..."); const pedidoId = "PED-STOCK-" + Date.now(); const cantidadNum = parseInt(datos.cantidad) || 1; const datosPedido = { id: pedidoId, cliente_id: "STOCK_INTERNO", estado: "nuevo", total: 0, anticipo: 0, notas: "Producción Interna", fecha_entrega: "", fecha_creacion: new Date().toISOString() }; const datosDetalle = { id: "PDET-" + Date.now(), pedido_id: pedidoId, producto_id: datos.producto_id, cantidad: cantidadNum, precio_unitario: 0 }; 
        let operaciones = []; let nuevosMovs = []; let recetaArray = []; const producto = App.state.productos.find(p => p.id === datos.producto_id); 
        if(producto) { 
            for(let i=1; i<=20; i++) { 
                const matId = producto[`mat_${i}`]; const cantTeorica = parseFloat(producto[`cant_${i}`] || 0) * cantidadNum; const uso = producto[`uso_${i}`] || 'Cuerpo'; 
                if(matId && cantTeorica > 0) { 
                    recetaArray.push({ mat_id: matId, cant: cantTeorica, uso: uso }); const material = App.state.inventario.find(m => m.id === matId); 
                    if(material) { const nStock = parseFloat(material.stock_actual) - cantTeorica; operaciones.push({ action: "actualizar_fila", nombreHoja: "materiales", idFila: material.id, datosNuevos: { stock_actual: nStock } }); material.stock_actual = nStock; const mov = { id: "MOV-" + Date.now() + i, fecha: new Date().toISOString().split('T')[0], tipo_movimiento: "salida_produccion", origen: "orden", origen_id: "PENDIENTE", ref_tipo: "material", ref_id: material.id, cantidad: -cantTeorica, costo_unitario: material.costo_unitario||0, total: (-cantTeorica * (material.costo_unitario||0)), notas: "Stock Interno de Bodega" }; nuevosMovs.push(mov); } 
                } 
            } 
        } 
        const nuevaOrden = { id: "ORD-" + Date.now(), pedido_detalle_id: datosDetalle.id, estado: "pendiente", fecha_creacion: new Date().toISOString(), receta_personalizada: JSON.stringify(recetaArray) }; 
        nuevosMovs.forEach(m => { m.origen_id = nuevaOrden.id; operaciones.push({ action: "guardar_fila", nombreHoja: "movimientos_inventario", datos: m }); });
        operaciones.push({ action: "guardar_fila", nombreHoja: "pedidos", datos: datosPedido }, { action: "guardar_fila", nombreHoja: "pedido_detalle", datos: datosDetalle }, { action: "guardar_fila", nombreHoja: "ordenes_produccion", datos: nuevaOrden }); 
        
        await App.api.fetch("ejecutar_lote", { operaciones: operaciones }); 
        App.state.pedidos.push(datosPedido); App.state.pedido_detalle.push(datosDetalle); App.state.ordenes_produccion.push(nuevaOrden); if(!App.state.movimientos_inventario) App.state.movimientos_inventario = []; App.state.movimientos_inventario.push(...nuevosMovs); App.ui.hideLoader(); App.ui.toast("Orden creada y stock descontado"); App.router.handleRoute(); 
    },
    
    async guardarTrabajoOrden(ordenId, data, esReparacion = false) { App.ui.showLoader("Asignando..."); const sanitizedTaskName = (data.tarea_nombre || "Trabajo").replace(/[^a-zA-Z0-9_ \-]/g, ""); const pagoObj = { id: "PAGO-" + Date.now() + "-" + sanitizedTaskName, artesano_id: data.artesano_id, orden_id: ordenId, monto_unitario: parseFloat(data.tarea_val), total: parseFloat(data.total), estado: "pendiente", fecha: new Date().toISOString() }; const res = await App.api.fetch("guardar_fila", { nombreHoja: "pago_artesanos", datos: pagoObj }); App.ui.hideLoader(); if(res.status === "success") { App.state.pago_artesanos.push(pagoObj); App.ui.toast("Asignado"); if(esReparacion) { App.router.handleRoute(); } else { App.views.modalEditarOrden(ordenId); } } else { App.ui.toast("Error"); App.router.handleRoute(); } },
    
    async cerrarOrdenProduccion(datosFormulario) { 
        App.ui.showLoader("Finalizando..."); const ordenId = datosFormulario.orden_id; const orden = App.state.ordenes_produccion.find(o => o.id === ordenId); const detalle = App.state.pedido_detalle.find(d => d.pedido_id === orden.pedido_detalle_id); const producto = App.state.productos.find(p => p.id === detalle.producto_id); 
        let operaciones = [ { action: "actualizar_fila", nombreHoja: "ordenes_produccion", idFila: ordenId, datosNuevos: { estado: 'listo' } } ]; orden.estado = 'listo'; 
        let nuevosMovs = []; 
        for(let i=1; i<=20; i++) { const matId = datosFormulario[`mat_${i}_id`]; const consumoTeorico = parseFloat(datosFormulario[`mat_${i}_teorico`]); const consumoReal = parseFloat(datosFormulario[`mat_${i}_real`]); if(matId && !isNaN(consumoTeorico) && !isNaN(consumoReal)) { const material = App.state.inventario.find(m => m.id === matId); if(material) { const diferencia = consumoReal - consumoTeorico; if(diferencia !== 0) { const stockAjustado = parseFloat(material.stock_actual) - diferencia; operaciones.push({ action: "actualizar_fila", nombreHoja: "materiales", idFila: material.id, datosNuevos: { stock_actual: stockAjustado } }); material.stock_actual = stockAjustado; const mov = { id: "MOV-" + Date.now() + i, fecha: new Date().toISOString().split('T')[0], tipo_movimiento: diferencia > 0 ? "salida_merma" : "entrada_ajuste", origen: "orden", origen_id: ordenId, ref_tipo: "material", ref_id: material.id, cantidad: -diferencia, costo_unitario: material.costo_unitario||0, total: (-diferencia * (material.costo_unitario||0)), notas: "Ajuste por consumo real vs teórico en taller" }; nuevosMovs.push(mov); operaciones.push({ action: "guardar_fila", nombreHoja: "movimientos_inventario", datos: mov }); } } } } 
        if (datosFormulario.sumar_stock === "1" && producto) { let matHamaca = App.state.inventario.find(m => m.nombre === producto.nombre && m.tipo === 'reventa'); if(matHamaca) { let nStock = parseFloat(matHamaca.stock_actual) + 1; operaciones.push({ action: "actualizar_fila", nombreHoja: "materiales", idFila: matHamaca.id, datosNuevos: { stock_actual: nStock } }); matHamaca.stock_actual = nStock; } else { let nMat = { id: "MAT-" + Date.now() + "REV", nombre: producto.nombre, tipo: "reventa", unidad: "Pzas", stock_actual: 1, fecha_creacion: new Date().toISOString() }; operaciones.push({ action: "guardar_fila", nombreHoja: "materiales", datos: nMat }); App.state.inventario.push(nMat); } App.ui.toast("Guardado en Bodega"); } 
        if(detalle && detalle.pedido_id) { const pedidoMaster = App.state.pedidos.find(p => p.id === detalle.pedido_id); if(pedidoMaster && pedidoMaster.cliente_id !== "STOCK_INTERNO" && pedidoMaster.estado !== 'pagado') { operaciones.push({ action: "actualizar_fila", nombreHoja: "pedidos", idFila: pedidoMaster.id, datosNuevos: { estado: 'listo para entregar' } }); pedidoMaster.estado = 'listo para entregar'; } }
        
        await App.api.fetch("ejecutar_lote", { operaciones: operaciones }); 
        if(!App.state.movimientos_inventario) App.state.movimientos_inventario = []; App.state.movimientos_inventario.push(...nuevosMovs); 
        App.ui.hideLoader(); App.ui.toast("¡Terminado!"); App.router.handleRoute(); 
    },
    
    async procesarCambioOrden(ordenId, datos) { if (datos.estado === 'listo') { App.views.formCerrarOrden(ordenId); } else { App.ui.showLoader("Actualizando..."); const res = await App.api.fetch("actualizar_fila", { nombreHoja: "ordenes_produccion", idFila: ordenId, datosNuevos: datos }); App.ui.hideLoader(); if (res.status === "success") { const ordenIndex = App.state.ordenes_produccion.findIndex(o => o.id === ordenId); App.state.ordenes_produccion[ordenIndex] = { ...App.state.ordenes_produccion[ordenIndex], ...datos }; App.ui.toast("Actualizado"); App.router.handleRoute(); } else { App.ui.toast("Error"); } } },
    
    async liquidarNomina(artesanoId) { 
        App.ui.showLoader("Liquidando..."); const pagosPendientes = App.state.pago_artesanos.filter(p => p.artesano_id === artesanoId && p.estado === 'pendiente'); let totalPagado = 0; let operaciones = []; 
        for (let pago of pagosPendientes) { operaciones.push({ action: "actualizar_fila", nombreHoja: "pago_artesanos", idFila: pago.id, datosNuevos: { estado: 'pagado' } }); pago.estado = 'pagado'; totalPagado += parseFloat(pago.total || 0); } 
        if (totalPagado > 0) { const artesano = App.state.artesanos.find(a => a.id === artesanoId); const gastoObj = { id: "GAS-" + Date.now(), descripcion: "Nómina - " + (artesano ? artesano.nombre : 'Artesano'), categoria: "nomina", monto: totalPagado, fecha: new Date().toISOString().split('T')[0] }; operaciones.push({ action: "guardar_fila", nombreHoja: "gastos", datos: gastoObj }); App.state.gastos.push(gastoObj); } 
        await App.api.fetch("ejecutar_lote", { operaciones: operaciones });
        App.ui.hideLoader(); App.ui.toast(`Liquidados $${totalPagado}`); App.router.handleRoute(); 
    },
    
    async guardarNuevaCompra(datos) { 
        App.ui.showLoader("Comprando..."); const compraId = "COM-" + Date.now(); const detallesCompra = []; let operaciones = []; let nuevosMovs = [];
        const mats = Array.isArray(datos.mat_id) ? datos.mat_id : (datos.mat_id ? [datos.mat_id] : []); const cants = Array.isArray(datos.cant) ? datos.cant : (datos.cant ? [datos.cant] : []); const costos = Array.isArray(datos.costo) ? datos.costo : (datos.costo ? [datos.costo] : []);
        for(let i=0; i<mats.length; i++) { 
            const matId = mats[i]; const cant = parseFloat(cants[i] || 0); const costoU = parseFloat(costos[i] || 0); 
            if(matId && cant > 0) { 
                const material = App.state.inventario.find(m => m.id === matId); 
                if(material) { 
                    detallesCompra.push({ mat_id: matId, nombre: material.nombre, cantidad: cant, costo_unitario: costoU }); 
                    const nuevoStock = parseFloat(material.stock_actual) + cant; 
                    operaciones.push({ action: "actualizar_fila", nombreHoja: "materiales", idFila: material.id, datosNuevos: { stock_actual: nuevoStock } }); material.stock_actual = nuevoStock; 
                    if (material.tipo === 'reventa') { const existeProd = App.state.productos.find(p => p.mat_1 === material.id); if(!existeProd) { const nuevoProd = { id: "PROD-" + Date.now() + i, nombre: material.nombre, categoria: "reventa", clasificacion: "Reventa", precio_venta: 0, mat_1: material.id, cant_1: 1, uso_1: "Completo", activo: "TRUE", fecha_creacion: new Date().toISOString() }; operaciones.push({ action: "guardar_fila", nombreHoja: "productos", datos: nuevoProd }); App.state.productos.push(nuevoProd); } } 
                    const mov = { id: "MOV-" + Date.now() + i, fecha: datos.fecha, tipo_movimiento: "entrada_compra", origen: "compra", origen_id: compraId, ref_tipo: "material", ref_id: material.id, cantidad: cant, costo_unitario: costoU, total: (cant * costoU), notas: "Compra a proveedor" };
                    nuevosMovs.push(mov); operaciones.push({ action: "guardar_fila", nombreHoja: "movimientos_inventario", datos: mov });
                } 
            } 
        } 
        const compra = { id: compraId, proveedor_id: datos.proveedor_id, fecha: datos.fecha, total: parseFloat(datos.total), monto_pagado: parseFloat(datos.total), estado: "pagado", detalles: JSON.stringify(detallesCompra), fecha_creacion: new Date().toISOString() }; 
        operaciones.push({ action: "guardar_fila", nombreHoja: "compras", datos: compra }); 
        
        await App.api.fetch("ejecutar_lote", { operaciones: operaciones }); 
        App.state.compras.push(compra); if(!App.state.movimientos_inventario) App.state.movimientos_inventario=[]; App.state.movimientos_inventario.push(...nuevosMovs); App.ui.hideLoader(); App.ui.toast("Compra registrada"); App.router.handleRoute();  
    },

    async guardarMultiplesGastos(datos) { App.ui.showLoader("Registrando Gastos..."); const descripciones = Array.isArray(datos.descripcion) ? datos.descripcion : [datos.descripcion]; const montos = Array.isArray(datos.monto) ? datos.monto : [datos.monto]; let operaciones = []; let nuevosGastos = []; for(let i=0; i<descripciones.length; i++) { if(!descripciones[i]) continue; const gastoObj = { id: "GAS-" + Date.now() + "-" + i, categoria: datos.categoria, descripcion: descripciones[i], monto: parseFloat(montos[i]), fecha: datos.fecha }; nuevosGastos.push(gastoObj); operaciones.push({ action: "guardar_fila", nombreHoja: "gastos", datos: gastoObj }); } await App.api.fetch("ejecutar_lote", { operaciones: operaciones }); App.state.gastos.push(...nuevosGastos); App.ui.hideLoader(); App.ui.toast("¡Gastos registrados!"); App.router.handleRoute(); },
    async guardarNuevaReparacion(datos) { App.ui.showLoader("Registrando..."); datos.id = "REP-" + Date.now(); datos.estado = "recibida"; datos.fecha_creacion = new Date().toISOString(); const res = await App.api.fetch("guardar_fila", { nombreHoja: "reparaciones", datos: datos }); App.ui.hideLoader(); if (res.status === "success") { App.state.reparaciones.push(datos); App.ui.toast("Reparación guardada"); App.router.handleRoute(); } else { App.ui.toast("Error Sheets."); } },
    async actualizarReparacion(repId, estado) { App.ui.showLoader("Actualizando..."); await App.api.fetch("actualizar_fila", { nombreHoja: "reparaciones", idFila: repId, datosNuevos: { estado: estado } }); const rep = App.state.reparaciones.find(r => r.id === repId); if(rep) rep.estado = estado; App.ui.hideLoader(); App.ui.toast("Actualizado"); App.router.handleRoute(); },
    
    async guardarAbono(datos) { 
        const pedidoObj = App.state.pedidos.find(p => p.id === datos.pedido_id);
        if(pedidoObj) {
            const abonosPrevios = App.state.abonos.filter(a => a.pedido_id === pedidoObj.id).reduce((s, a) => s + parseFloat(a.monto || 0), 0);
            const saldoPendiente = parseFloat(pedidoObj.total) - parseFloat(pedidoObj.anticipo) - abonosPrevios;
            const nuevoMonto = parseFloat(datos.monto) || 0;
            if(nuevoMonto > saldoPendiente + 0.1) { alert("❌ Validación: El monto a abonar es superior a la deuda. ¡Revisa la cantidad!"); return; }
        }
        App.ui.showLoader("Registrando Pago..."); 
        const nuevoAbono = { id: "ABO-" + Date.now(), pedido_id: datos.pedido_id, cliente_id: datos.cliente_id, monto: parseFloat(datos.monto) || 0, nota: datos.nota, fecha: new Date().toISOString() }; 
        const res = await App.api.fetch("guardar_fila", { nombreHoja: "abonos_clientes", datos: nuevoAbono }); 
        if (res.status === "success") { 
            App.state.abonos.push(nuevoAbono); 
            if(pedidoObj) {
                const abonosTotales = App.state.abonos.filter(a => a.pedido_id === pedidoObj.id).reduce((s, a) => s + parseFloat(a.monto || 0), 0);
                const saldoRealFinal = parseFloat(pedidoObj.total) - parseFloat(pedidoObj.anticipo) - abonosTotales;
                if(saldoRealFinal <= 0 && pedidoObj.estado !== 'pagado') {
                    await App.api.fetch("actualizar_fila", { nombreHoja: "pedidos", idFila: pedidoObj.id, datosNuevos: { estado: 'pagado' } });
                    pedidoObj.estado = 'pagado';
                }
            }
            App.ui.hideLoader(); App.ui.toast("Pago registrado exitosamente"); App.router.handleRoute(); 
        } else { App.ui.hideLoader(); App.ui.toast("Error al guardar pago"); }
    },
    
    verDiagnostico() {
        let html = `<table style="width:100%; font-size:0.85rem; border-collapse:collapse;"><tr style="border-bottom:1px solid #ccc; text-align:left;"><th>Tabla (Hoja)</th><th>Estado</th><th>Registros</th></tr>`;
        const tablas = [ { nombre: "materiales", state: "inventario" }, { nombre: "clientes", state: "clientes" }, { nombre: "productos", state: "productos" }, { nombre: "pedidos", state: "pedidos" }, { nombre: "pedido_detalle", state: "pedido_detalle" }, { nombre: "ordenes_produccion", state: "ordenes_produccion" }, { nombre: "artesanos", state: "artesanos" }, { nombre: "abonos_clientes", state: "abonos" }, { nombre: "gastos", state: "gastos" }, { nombre: "compras", state: "compras" }, { nombre: "proveedores", state: "proveedores" }, { nombre: "reparaciones", state: "reparaciones" }, { nombre: "tarifas_artesano", state: "tarifas_artesano" }, { nombre: "pago_artesanos", state: "pago_artesanos" }, { nombre: "movimientos_inventario", state: "movimientos_inventario" } ];
        tablas.forEach(t => {
            const arr = App.state[t.state]; const count = arr ? arr.length : 0; const status = arr ? "✅ OK" : "❌ Error";
            html += `<tr style="border-bottom:1px dashed #eee;"><td style="padding:5px 0;">${t.nombre}</td><td>${status}</td><td>${count}</td></tr>`;
        });
        html += `</table><div style="margin-top:15px; font-size:0.8rem; color:var(--danger); background:#FED7D7; padding:10px; border-radius:6px;"><strong>💡 Tip de solución:</strong> Si una tabla marca "0" y sabes que sí tiene datos en Sheets, ve a tu Google Sheet y asegúrate de que la pestaña se llame <strong>exactamente igual</strong> a lo que dice esta lista (sin mayúsculas ni espacios al final).</div><button class="btn btn-primary" style="width:100%; margin-top:15px;" onclick="App.ui.closeSheet()">Cerrar</button>`;
        App.ui.openSheet("Diagnóstico de Base de Datos", html);
    },

    renderGraficasFinanzas(filtro) {
        const cont = document.getElementById('finanzas-contenedor'); if(!cont) return;
        const hoy = new Date(); let mesActual = hoy.getMonth(); let anioActual = hoy.getFullYear(); 
        let mesPasado = mesActual - 1; let anioPasado = anioActual; if(mesPasado < 0) { mesPasado = 11; anioPasado--; }
        let triActual = Math.floor(mesActual / 3);
        const filtrarFecha = (str) => { if(filtro === 'todo') return true; if(!str) return false; const f = new Date(str); if(filtro === 'mes_actual') return f.getMonth() === mesActual && f.getFullYear() === anioActual; if(filtro === 'mes_pasado') return f.getMonth() === mesPasado && f.getFullYear() === anioPasado; if(filtro === 'trimestre_actual') return Math.floor(f.getMonth() / 3) === triActual && f.getFullYear() === anioActual; if(filtro === 'anio_actual') return f.getFullYear() === anioActual; return true; };
        const pedFiltrados = App.state.pedidos.filter(p => filtrarFecha(p.fecha_creacion)); const aboFiltrados = App.state.abonos.filter(a => filtrarFecha(a.fecha)); const gasFiltrados = App.state.gastos.filter(g => filtrarFecha(g.fecha));
        const tVentas = pedFiltrados.reduce((acc, p) => acc + (parseFloat(p.total) || 0), 0); const tAnticipos = pedFiltrados.reduce((acc, p) => acc + (parseFloat(p.anticipo) || 0), 0); const tAbonos = aboFiltrados.reduce((acc, a) => acc + (parseFloat(a.monto) || 0), 0); const ingReales = tAnticipos + tAbonos; const xCobrar = tVentas - ingReales; const tGastos = gasFiltrados.reduce((acc, g) => acc + (parseFloat(g.monto) || 0), 0); const fNeto = ingReales - tGastos; const labels = { todo: "Todo el historial", mes_actual: "Este Mes", mes_pasado: "Mes Pasado", trimestre_actual: "Este Trimestre", anio_actual: "Este Año" };
        
        let html = `<p style="color:var(--text-muted); font-size:0.85rem; margin-top:-10px; margin-bottom:15px;">Mostrando: <strong>${labels[filtro]}</strong>. <em>Toca una tarjeta para ver detalles.</em></p>`; 
        html += `<div class="grid-2"><div class="card stat-card" style="background:#EBF8FF; cursor:pointer;" onclick="App.views.detalleFinanzas('ventas', '${filtro}')"><div class="label">Ventas Totales</div><div class="value" style="color:#3182CE; font-size:1.2rem;">$${tVentas}</div></div><div class="card stat-card" style="background:#C6F6D5; cursor:pointer;" onclick="App.views.detalleFinanzas('ingresos', '${filtro}')"><div class="label">Ingresos Reales</div><div class="value" style="color:#38A169; font-size:1.2rem;">$${ingReales}</div></div><div class="card stat-card" style="background:#FEFCBF; cursor:pointer;" onclick="App.views.detalleFinanzas('por_cobrar', '${filtro}')"><div class="label">Por Cobrar</div><div class="value" style="color:#D69E2E; font-size:1.2rem;">$${xCobrar}</div></div><div class="card stat-card" style="background:#FED7D7; cursor:pointer;" onclick="App.views.detalleFinanzas('gastos', '${filtro}')"><div class="label">Gastos</div><div class="value" style="color:#E53E3E; font-size:1.2rem;">$${tGastos}</div></div></div><div class="card stat-card" style="margin-top:10px; border:2px solid ${fNeto >= 0 ? 'var(--success)' : 'var(--danger)'}; margin-bottom:15px;"><div class="label">Flujo Neto Efectivo</div><div class="value" style="color:${fNeto >= 0 ? 'var(--success)' : 'var(--danger)'};">$${fNeto}</div></div>`; 
        html += `<div style="background:white; border:1px solid #e2e8f0; border-radius:8px; padding:15px;"><canvas id="graficaFinanzas"></canvas></div>`;
        html += `<button class="btn btn-secondary" style="width:100%; margin-top:15px; border-color:#38A169; color:#38A169; font-weight:bold; background:transparent;" onclick="window.exportarAExcel(App.state.gastos, 'Gastos_${labels[filtro]}')">📥 Exportar Gastos a Excel</button>`;
        cont.innerHTML = html;

        setTimeout(() => {
            const ctx = document.getElementById('graficaFinanzas');
            if(ctx && window.Chart) {
                if(window.graficaActual) window.graficaActual.destroy();
                window.graficaActual = new Chart(ctx, {
                    type: 'bar',
                    data: { labels: ['Ingresos', 'Gastos', 'Por Cobrar'], datasets: [{ label: 'Monto ($)', data: [ingReales, tGastos, xCobrar], backgroundColor: ['#38A169', '#E53E3E', '#D69E2E'], borderRadius: 4 }] },
                    options: { responsive: true, plugins: { legend: { display: false } } }
                });
            }
        }, 300);
    },

    imprimirNota(pedidoId) { 
        const p = App.state.pedidos.find(x => x.id === pedidoId); const c = App.state.clientes.find(cli => cli.id === p.cliente_id); const detalle = App.state.pedido_detalle.find(d => d.pedido_id === p.id); const producto = detalle ? App.state.productos.find(prod => prod.id === detalle.producto_id) : null; const abonosDelPedido = App.state.abonos.filter(a => a.pedido_id === p.id); const totalAbonado = abonosDelPedido.reduce((s, a) => s + parseFloat(a.monto||0), 0); const saldoReal = parseFloat(p.total) - parseFloat(p.anticipo) - totalAbonado; const ventana = window.open('', '_blank'); 
        let htmlNota = `<html><head><title>Nota</title><style>body{font-family:sans-serif;background:#f9f9f9;padding:20px;color:#333;}.ticket{background:white;max-width:380px;margin:0 auto;padding:25px;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.05);}.header{text-align:center;border-bottom:2px dashed #cbd5e0;padding-bottom:15px;margin-bottom:15px;}.header img.logo{max-height:80px;margin-bottom:10px;}.header h1{margin:0;color:#2d3748;font-size:24px;text-transform:uppercase;}.info-p{margin:4px 0;font-size:14px;}table{width:100%;border-collapse:collapse;margin-top:15px;margin-bottom:15px;}th{border-bottom:1px solid #e2e8f0;padding:8px 0;text-align:left;font-size:13px;color:#718096;}td{padding:8px 0;font-size:14px;color:#2d3748;}.totales{border-top:2px solid #cbd5e0;padding-top:15px;}.totales-row{display:flex;justify-content:space-between;margin-bottom:5px;font-size:14px;}.saldo-final{display:flex;justify-content:space-between;margin-top:10px;font-size:18px;font-weight:bold;color:#2d3748;background:${saldoReal<=0?'#f0fff4':'#fff5f5'};padding:10px;border-radius:6px;}.footer{text-align:center;margin-top:30px;font-size:12px;color:#a0aec0;}.social{margin-top:10px;font-weight:bold;color:#4A5568;font-size:13px;}@media print{body{background:white;padding:0;}.ticket{box-shadow:none;border:none;max-width:100%;}}</style></head><body><div class="ticket"><div class="header"><img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://www.facebook.com/descansomaya.mx" style="float:right; width:65px; height:65px; margin-left:10px; border-radius:4px;"><img class="logo" src="${App.state.config.logoUrl}" onerror="this.style.display='none'"><div style="clear:both;"></div><h1>${App.state.config.empresa}</h1><p>Hamacas y Accesorios Artesanales</p></div><div style="margin-bottom:20px;"><p class="info-p"><strong>Folio:</strong> ${p.id.replace('PED-','')}</p><p class="info-p"><strong>Fecha:</strong> ${new Date(p.fecha_creacion).toLocaleDateString()}</p><p class="info-p"><strong>Cliente:</strong> ${c?c.nombre:'Mostrador'}</p></div><table><tr><th>Cant</th><th>Desc</th><th style="text-align:right;">Importe</th></tr><tr><td>${detalle?detalle.cantidad:1}</td><td><strong>${producto?producto.nombre:'Artículo'}</strong>${producto ? `<br><small style="color:#4A5568;">Clasificación: ${producto.clasificacion || 'N/A'}<br>Tamaño: ${producto.tamano || 'N/A'} | Color: ${producto.color || 'N/A'}</small>` : ''}<br><small style="color:#718096;font-size:11px;">${p.notas||''}</small></td><td style="text-align:right;">$${p.total}</td></tr></table><div class="totales"><div class="totales-row"><span>Subtotal:</span> <span>$${p.total}</span></div><div class="totales-row"><span>Anticipo:</span> <span style="color:#e53e3e;">-$${p.anticipo}</span></div>${totalAbonado>0?`<div class="totales-row"><span>Abonos:</span> <span style="color:#e53e3e;">-$${totalAbonado}</span></div>`:''}<div class="saldo-final"><span>SALDO:</span><span>$${saldoReal>0?saldoReal:0}</span></div></div><div class="footer"><p style="font-size:14px;font-weight:bold;color:#E53E3E;">¡Gracias por comprar lo hecho con amor! ❤️</p><p class="social">👉 Escanea el QR para visitar nuestro Facebook<br>${App.state.config.redesSociales}</p><p style="margin-top:15px;">Conserva tu recibo para aclaraciones</p></div></div><script>setTimeout(()=>{window.print();},500);<\/script></body></html>`; 
        ventana.document.write(htmlNota); ventana.document.close(); 
    },
    
    imprimirCotizacion(cotId) { const c = App.state.cotizaciones.find(x => x.id === cotId); const ventana = window.open('', '_blank'); let htmlNota = `<html><head><title>Cotización</title><style>body{font-family:sans-serif;background:#f9f9f9;padding:20px;color:#333;}.ticket{background:white;max-width:380px;margin:0 auto;padding:25px;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.05);}.header{text-align:center;border-bottom:2px dashed #cbd5e0;padding-bottom:15px;margin-bottom:15px;}.header img{max-height:80px;margin-bottom:10px;}.header h1{margin:0;color:#2d3748;font-size:24px;text-transform:uppercase;}.info-p{margin:4px 0;font-size:14px;}table{width:100%;border-collapse:collapse;margin-top:15px;margin-bottom:15px;}th{border-bottom:1px solid #e2e8f0;padding:8px 0;text-align:left;font-size:13px;color:#718096;}td{padding:8px 0;font-size:14px;color:#2d3748;}.totales{border-top:2px solid #cbd5e0;padding-top:15px;}.saldo-final{display:flex;justify-content:space-between;margin-top:10px;font-size:18px;font-weight:bold;color:#4C51BF;background:#EEF2FF;padding:10px;border-radius:6px;}.footer{text-align:center;margin-top:30px;font-size:12px;color:#a0aec0;}.social{margin-top:10px;font-weight:bold;color:#4A5568;font-size:13px;}@media print{body{background:white;padding:0;}.ticket{box-shadow:none;border:none;max-width:100%;}}</style></head><body><div class="ticket"><div class="header"><img src="${App.state.config.logoUrl}" onerror="this.style.display='none'"><h1>${App.state.config.empresa}</h1><h2 style="color:#4C51BF;font-size:18px;">COTIZACIÓN</h2></div><div style="margin-bottom:20px;"><p class="info-p"><strong>Folio:</strong> ${c.id.replace('COT-','')}</p><p class="info-p"><strong>Fecha:</strong> ${new Date(c.fecha_creacion).toLocaleDateString()}</p><p class="info-p"><strong>Cliente:</strong> ${c.cliente_nombre}</p></div><table><tr><th>Cant</th><th>Desc</th><th style="text-align:right;">Importe</th></tr><tr><td>1</td><td>${c.descripcion}</td><td style="text-align:right;">$${c.total}</td></tr></table><div class="totales"><div class="saldo-final"><span>TOTAL COTIZADO:</span><span>$${c.total}</span></div></div><div class="footer"><p>Vigencia de cotización: 15 días.</p><p class="social">👉 siguenos en nuestras redes sociales:<br>${App.state.config.redesSociales}</p></div></div><script>setTimeout(()=>{window.print();},500);<\/script></body></html>`; ventana.document.write(htmlNota); ventana.document.close(); },
    
    enviarWhatsApp(pedidoId, tipoMensaje) { 
        const p = App.state.pedidos.find(x => x.id === pedidoId); const c = App.state.clientes.find(cli => cli.id === p.cliente_id); const detalle = App.state.pedido_detalle.find(d => d.pedido_id === p.id); const producto = detalle ? App.state.productos.find(prod => prod.id === detalle.producto_id) : null; const abonos = App.state.abonos.filter(a => a.pedido_id === p.id).reduce((s, a) => s + parseFloat(a.monto||0), 0); const saldoReal = parseFloat(p.total) - parseFloat(p.anticipo) - abonos; if(!c || !c.telefono) return alert("El cliente no tiene teléfono guardado"); 
        let texto = "";
        if(tipoMensaje === 'cobro') { texto = `Hola *${c.nombre}* 👋,\nTe saludamos de *${App.state.config.empresa}*.\n\nTe recordamos amablemente que tienes un saldo pendiente de *$${saldoReal > 0 ? saldoReal : 0}* por tu pedido de (${producto ? producto.nombre : 'Hamaca'}).\n\nQuedamos a tu disposición para cualquier duda. ¡Gracias por tu preferencia!`; } else if(tipoMensaje === 'listo') { texto = `¡Hola *${c.nombre}*! 🎉\nTe avisamos de *${App.state.config.empresa}* que tu pedido de (${producto ? producto.nombre : 'Hamaca'}) *¡ya está listo para entregarse!*\n\nTu saldo a liquidar es de: *$${saldoReal > 0 ? saldoReal : 0}*.\n\nPor favor confírmanos a qué hora pasarás por ella. ¡Te esperamos!`; } else { texto = `Hola *${c.nombre}* 👋,\nSomos de *${App.state.config.empresa}*.\n\nDetalle de tu pedido:\n📦 *Producto:* ${producto ? producto.nombre : 'Hamaca'}\n💰 *Total:* $${p.total}\n✅ *Abonado:* $${parseFloat(p.anticipo) + abonos}\n⚠️ *Saldo Pendiente:* $${saldoReal > 0 ? saldoReal : 0}\n\n👉 Síguenos: ${App.state.config.redesSociales}\n¡Gracias!`; }
        let tel = String(c.telefono).replace(/\D/g,''); if(tel.length === 10) tel = '52' + tel; App.ui.closeSheet(); window.location.href = `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`; 
    },
    
    imprimirTicketProduccion(ordenId) {
        const orden = App.state.ordenes_produccion.find(o => o.id === ordenId);
        const detalle = App.state.pedido_detalle.find(d => d.id === orden.pedido_detalle_id);
        const pedido = App.state.pedidos.find(p => p.id === detalle.pedido_id);
        const producto = App.state.productos.find(p => p.id === detalle.producto_id);

        let recetaHTML = ''; let recetaGuardada = null;
        try { if(orden.receta_personalizada) recetaGuardada = JSON.parse(orden.receta_personalizada); } catch(e){}

        if (recetaGuardada && recetaGuardada.length > 0) {
            recetaGuardada.forEach(item => { const material = App.state.inventario.find(m => m.id === item.mat_id); if (material) { recetaHTML += `<tr><td style="border-bottom:1px solid #e2e8f0; padding:8px;">${item.cant} <small style="color:#718096">${material.unidad}</small></td><td style="border-bottom:1px solid #e2e8f0; padding:8px; font-weight:bold; color:#2d3748;">${material.nombre}</td><td style="border-bottom:1px solid #e2e8f0; padding:8px; font-weight:bold; color:#4C51BF;">${(item.uso || 'Cuerpo').toUpperCase()}</td></tr>`; } });
        } else if (producto) {
            let counter = 1; while(producto[`mat_${counter}`]) { const matId = producto[`mat_${counter}`]; const cant = parseFloat(producto[`cant_${counter}`]) * parseInt(detalle.cantidad||1); const uso = producto[`uso_${counter}`] || 'Cuerpo'; const material = App.state.inventario.find(m => m.id === matId); if (material) { recetaHTML += `<tr><td style="border-bottom:1px solid #e2e8f0; padding:8px;">${cant} <small style="color:#718096">${material.unidad}</small></td><td style="border-bottom:1px solid #e2e8f0; padding:8px; font-weight:bold; color:#2d3748;">${material.nombre}</td><td style="border-bottom:1px solid #e2e8f0; padding:8px; font-weight:bold; color:#4C51BF;">${uso.toUpperCase()}</td></tr>`; } counter++; }
        }
        if(recetaHTML === '') recetaHTML = '<tr><td colspan="3" style="padding:10px; text-align:center;">Verificar insumos con el encargado</td></tr>';

        const ventana = window.open('', '_blank');
        let htmlNota = `<html><head><title>Orden de Trabajo</title><style>body{font-family:sans-serif;background:#fff;padding:20px;color:#333;}.ticket{max-width:400px;margin:0 auto;padding:20px;border:2px dashed #cbd5e0;border-radius:8px;}.header{text-align:center;border-bottom:2px dashed #cbd5e0;padding-bottom:10px;margin-bottom:15px;}.header h1{margin:0;font-size:22px;color:#2d3748;}.info{margin-bottom:15px;font-size:14px;}table{width:100%;border-collapse:collapse;margin-top:10px;}th{background:#f7fafc;padding:8px;text-align:left;font-size:13px;border-bottom:2px solid #cbd5e0;}</style></head><body><div class="ticket"><div class="header"><img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${ordenId}" style="float:right; width:65px; height:65px; margin-left:10px; border-radius:4px;"><h1>ORDEN DE TRABAJO</h1><p>Folio Producción: <strong style="font-size:16px;">${ordenId.replace('ORD-','')}</strong></p><div style="clear:both;"></div></div><div class="info"><p><strong>Fecha Entrega Esperada:</strong> <span style="color:#E53E3E; font-weight:bold;">${pedido.fecha_entrega || 'Sin fecha (Lo antes posible)'}</span></p><p><strong>Producto a fabricar:</strong> ${producto ? producto.nombre : 'Artículo especial'}</p><p><strong>Tamaño:</strong> ${producto ? producto.tamano : '-'} | <strong>Color:</strong> ${producto ? producto.color : '-'}</p><p style="background:#FFFBEB; padding:10px; border-left:4px solid #D69E2E; margin-top:10px;"><strong>Notas del Cliente:</strong> ${pedido.notas || 'Ninguna'}</p></div><h3 style="font-size:16px; margin-bottom:5px; margin-top:20px; color:#4a5568;">Insumos / Receta a Utilizar</h3><table><tr><th>Cant</th><th>Material</th><th>Uso en Hamaca</th></tr>${recetaHTML}</table><div style="margin-top:30px; padding-top:15px; border-top:1px dashed #cbd5e0; text-align:center;"><p style="font-size:12px; color:#718096;">Documento de uso interno exclusivo de taller</p><p style="font-size:14px; font-weight:bold; color:#2d3748;">${App.state.config.empresa}</p></div></div><script>setTimeout(()=>{window.print();},500);<\/script></body></html>`;
        ventana.document.write(htmlNota); ventana.document.close();
    }
};
App.views = {};

App.views.login = function() { return `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:80vh; text-align:center;"><div style="background:var(--primary); color:white; width:80px; height:80px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:2rem; margin-bottom:20px;">🔒</div><h2 style="margin-bottom:10px; color:var(--primary-dark);">Descanso Maya</h2><p style="color:var(--text-muted); margin-bottom:30px;">Ingresa el PIN</p><div class="card" style="width:100%; max-width:320px;"><input type="password" id="pin-input" placeholder="PIN" style="width:100%; padding:12px; font-size:1.2rem; text-align:center; border:1px solid var(--border); border-radius:8px; margin-bottom:15px;"><button class="btn btn-primary" style="width:100%; padding:12px; font-size:1rem;" onclick="App.logic.verificarPIN(document.getElementById('pin-input').value)">Entrar</button></div></div>`; };

App.views.inicio = function() { 
    document.getElementById('bottom-nav').style.display = 'flex'; 
    const pedidosCount = App.state.pedidos ? App.state.pedidos.length : 0; 
    const prodCount = App.state.ordenes_produccion ? App.state.ordenes_produccion.filter(o => o.estado !== 'listo').length : 0; 
    let alertasHTML = '';
    const stockBajo = App.state.inventario.filter(i => parseFloat(i.stock_minimo) > 0 && parseFloat(i.stock_actual) <= parseFloat(i.stock_minimo));
    if(stockBajo.length > 0) {
        alertasHTML = `<div style="background:#FED7D7; border-left:4px solid #E53E3E; padding:10px; margin-bottom:15px; border-radius:4px;"><strong style="color:#E53E3E;">⚠️ Alerta de Stock Bajo:</strong><ul style="margin:5px 0 0 20px; color:#C53030; font-size:0.85rem;">`;
        stockBajo.forEach(i => { alertasHTML += `<li>${i.nombre}: Quedan ${i.stock_actual} ${i.unidad} (Mínimo: ${i.stock_minimo})</li>`; });
        alertasHTML += `</ul></div>`;
    }
    return `${alertasHTML}<div class="grid-2"><div class="card stat-card"><div class="label">Pedidos</div><div class="value">${pedidosCount}</div></div><div class="card stat-card"><div class="label">Producción</div><div class="value">${prodCount}</div></div><div class="card stat-card" onclick="App.router.navigate('nomina')" style="cursor:pointer; background:#FFF5F5;"><div class="label" style="color:#E53E3E;">Nómina</div><div class="value">🧑‍🎨</div></div><div class="card stat-card" onclick="App.router.navigate('finanzas')" style="cursor:pointer; background:#EBF8FF;"><div class="label" style="color:#3182CE;">Ver Finanzas</div><div class="value">📊</div></div></div>`; 
};

App.views.inventario = function() { 
    document.getElementById('bottom-nav').style.display = 'flex'; 
    let html = `<div class="card"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;"><h3 class="card-title" style="margin:0;">Bodega / Inventario</h3><button class="btn btn-secondary" style="padding:6px 10px; font-size:0.8rem; border-color:var(--primary); color:var(--primary); background:transparent;" onclick="App.views.modalEstadisticas()">📊 Reportes</button></div><button class="btn btn-secondary" style="width:100%; margin-bottom:15px; border-color:#38A169; color:#38A169; background:transparent;" onclick="window.exportarAExcel(App.state.inventario, 'Inventario_DescansoMaya')">📥 Descargar Tabla en Excel</button><input type="text" id="bus-inv" onkeyup="window.filtrarLista('bus-inv', 'fila-inv')" placeholder="🔍 Buscar insumo..." style="width:100%; padding:8px; margin-bottom:15px; border-radius:6px; border:1px solid var(--border);">`; 
    if (!App.state.inventario || App.state.inventario.length === 0) { html += `<p>No hay insumos.</p>`; } else { html += `<table style="width:100%; border-collapse: collapse; font-size: 0.9rem;"><tr style="border-bottom: 2px solid var(--border);"><th style="text-align:left; padding:8px;">Artículo / Tipo</th><th style="padding:8px;">Stock</th><th></th></tr>`; App.state.inventario.forEach(i => { html += `<tr class="fila-inv" style="border-bottom: 1px solid var(--border);"><td style="padding: 10px 5px;"><strong>${i.nombre}</strong><br><small style="color:var(--primary); text-transform:uppercase; font-size:0.75rem;">[${i.tipo || 'OTRO'}]</small> <small style="color:var(--text-muted)">${i.unidad}</small></td><td style="padding: 10px 5px; text-align:center; font-weight:bold; font-size:1.1rem; color:${parseFloat(i.stock_minimo)>0 && parseFloat(i.stock_actual)<=parseFloat(i.stock_minimo) ? 'var(--danger)' : 'var(--text-main)'}">${i.stock_actual}</td><td style="text-align:right;"><button class="btn btn-secondary" style="padding:4px 8px; font-size:0.8rem; margin-right:4px;" onclick="App.views.modalKardex('${i.id}')">📋 Historial</button><button class="btn btn-secondary" style="padding:4px 8px; font-size:0.8rem; margin-right:4px;" onclick="App.views.formMaterial('${i.id}')">✏️</button><button class="btn btn-secondary" style="padding:4px 8px; font-size:0.8rem; color:red; border-color:red;" onclick="App.logic.eliminarRegistroGenerico('materiales', '${i.id}', 'inventario')">🗑️</button></td></tr>`; }); html += `</table>`; } html += `</div><button class="fab" onclick="App.views.formMaterial()">+</button>`; return html; 
};

App.views.modalEstadisticas = function() {
    const valorTotal = App.state.inventario.reduce((sum, item) => sum + (parseFloat(item.stock_actual||0) * parseFloat(item.costo_unitario||0)), 0);
    let consumos = {}; (App.state.movimientos_inventario||[]).forEach(m => { if(m.tipo_movimiento.includes('salida')) { consumos[m.ref_id] = (consumos[m.ref_id] || 0) + Math.abs(parseFloat(m.cantidad)); } });
    let topMateriales = Object.entries(consumos).sort((a,b) => b[1] - a[1]).slice(0, 3);
    let topHtml = topMateriales.map(t => { let mat = App.state.inventario.find(m => m.id === t[0]); return `<li>${mat ? mat.nombre : 'Desconocido'}: <strong>${t[1]}</strong> uds.</li>`; }).join('');
    if(!topHtml) topHtml = "<li>Aún no hay datos de consumo.</li>";
    let prodCount = {}; (App.state.pedido_detalle||[]).forEach(d => { prodCount[d.producto_id] = (prodCount[d.producto_id] || 0) + parseInt(d.cantidad||1); });
    let topProd = Object.entries(prodCount).sort((a,b) => b[1] - a[1]).slice(0,3);
    let topProdHtml = topProd.map(t => { let p = App.state.productos.find(x => x.id === t[0]); return `<li>${p ? p.nombre : 'Desconocido'}: <strong>${t[1]}</strong> pedidos</li>`; }).join('');
    if(!topProdHtml) topProdHtml = "<li>Aún no hay pedidos.</li>";
    let html = `<div class="grid-2" style="margin-bottom:15px;"><div class="card stat-card" style="background:#EBF8FF;"><div class="label" style="color:#2B6CB0;">Valor del Inventario</div><div class="value" style="color:#2B6CB0; font-size:1.2rem;">$${valorTotal.toFixed(2)}</div></div></div><div style="background:#F7FAFC; padding:10px; border-radius:8px; margin-bottom:10px; border:1px solid var(--border);"><strong style="color:var(--primary);">🧵 Top 3 Insumos más usados</strong><ul style="margin-top:5px; margin-left:20px; font-size:0.85rem;">${topHtml}</ul></div><div style="background:#F7FAFC; padding:10px; border-radius:8px; margin-bottom:15px; border:1px solid var(--border);"><strong style="color:var(--primary);">🏆 Top 3 Productos estrella</strong><ul style="margin-top:5px; margin-left:20px; font-size:0.85rem;">${topProdHtml}</ul></div><button class="btn btn-primary" style="width:100%;" onclick="App.ui.closeSheet()">Cerrar</button>`;
    App.ui.openSheet("Reporte de Producción", html);
};

App.views.modalKardex = function(matId) { const material = App.state.inventario.find(m => m.id === matId); const movs = (App.state.movimientos_inventario || []).filter(m => m.ref_id === matId).reverse(); let html = `<div style="margin-bottom:15px; font-size:0.9rem;">Movimientos de <strong>${material.nombre}</strong></div>`; html += `<table style="width:100%; font-size:0.8rem; border-collapse:collapse;"><tr style="border-bottom:1px solid #ccc;"><th style="text-align:left;">Fecha</th><th>Mov</th><th>Cant.</th><th>Notas</th></tr>`; if(movs.length===0) html += `<tr><td colspan="4" style="padding:10px;text-align:center;">Sin movimientos</td></tr>`; movs.forEach(m => { const color = parseFloat(m.cantidad) > 0 ? 'var(--success)' : 'var(--danger)'; const signo = parseFloat(m.cantidad) > 0 ? '+' : ''; html += `<tr style="border-bottom:1px dashed #eee;"><td style="padding:5px 0;">${m.fecha.split('T')[0]}</td><td><small>${m.tipo_movimiento.replace('_',' ')}</small></td><td style="text-align:center; font-weight:bold; color:${color};">${signo}${m.cantidad}</td><td><small>${m.notas||''}</small></td></tr>`; }); html += `</table><button class="btn btn-primary" style="width:100%; margin-top:15px;" onclick="App.ui.closeSheet()">Cerrar</button>`; App.ui.openSheet(`Kardex (Auditoría)`, html); };

App.views.productos = function() { document.getElementById('bottom-nav').style.display = 'flex'; let html = `<div class="card"><h3 class="card-title">Catálogo de Productos</h3><input type="text" id="bus-prod" onkeyup="window.filtrarLista('bus-prod', 'tarj-prod')" placeholder="🔍 Buscar producto..." style="width:100%; padding:8px; margin-bottom:15px; border-radius:6px; border:1px solid var(--border);">`; if (!App.state.productos || App.state.productos.length === 0) { html += `<p style="color: var(--text-muted);">No hay productos registrados.</p>`; } else { App.state.productos.forEach(p => { html += `<div class="card tarj-prod" style="border: 1px solid var(--border); box-shadow: none; padding: 12px; display:flex; justify-content:space-between; align-items:center;"><div style="flex:1;"><strong>${p.nombre}</strong><br><small style="color: var(--text-muted);">Cat: ${p.categoria || 'General'} | Clasif: ${p.clasificacion || 'Normal'}<br>Tamaño: ${p.tamano || '-'} | Color: ${p.color || '-'}</small></div><div style="text-align:right;"><span style="color: var(--primary); font-weight: bold; display:block; margin-bottom:5px;">$${p.precio_venta} <br><small style="color:var(--text-muted);">Mayoreo: $${p.precio_mayoreo||'N/A'}</small></span><div><button class="btn btn-secondary" style="padding:4px 8px; font-size:0.8rem; margin-right:4px;" onclick="App.views.formProducto('${p.id}')">✏️</button><button class="btn btn-secondary" style="padding:4px 8px; font-size:0.8rem; color:red; border-color:red;" onclick="App.logic.eliminarRegistroGenerico('productos', '${p.id}', 'productos')">🗑️</button></div></div></div>`; }); } html += `</div><button class="fab" onclick="App.views.formProducto()">+</button>`; return html; };

App.views.pedidos = function() { 
    document.getElementById('bottom-nav').style.display = 'flex'; 
    let html = `<div class="card"><h3 class="card-title">Historial de Pedidos</h3>`;
    html += `<div style="display:flex; gap:8px; margin-bottom:15px; overflow-x:auto; padding-bottom:5px;">
                <button class="btn btn-secondary btn-filtro-ped" style="background:var(--primary); color:white; white-space:nowrap; padding:4px 10px; font-size:0.8rem;" onclick="window.filtrarPedidos('todo', this)">Todos</button>
                <button class="btn btn-secondary btn-filtro-ped" style="white-space:nowrap; padding:4px 10px; font-size:0.8rem; color:var(--danger); border-color:var(--danger); background:transparent;" onclick="window.filtrarPedidos('urgente', this)">⚠️ Urgentes</button>
                <button class="btn btn-secondary btn-filtro-ped" style="white-space:nowrap; padding:4px 10px; font-size:0.8rem; color:var(--text-muted); background:transparent;" onclick="window.filtrarPedidos('nuevo', this)">Nuevos</button>
                <button class="btn btn-secondary btn-filtro-ped" style="white-space:nowrap; padding:4px 10px; font-size:0.8rem; color:var(--text-muted); background:transparent;" onclick="window.filtrarPedidos('en taller', this)">En Taller</button>
                <button class="btn btn-secondary btn-filtro-ped" style="white-space:nowrap; padding:4px 10px; font-size:0.8rem; color:var(--text-muted); background:transparent;" onclick="window.filtrarPedidos('listo', this)">Listos</button>
                <button class="btn btn-secondary btn-filtro-ped" style="white-space:nowrap; padding:4px 10px; font-size:0.8rem; color:var(--text-muted); background:transparent;" onclick="window.filtrarPedidos('pagado', this)">Pagados</button>
             </div>`;
    html += `<input type="text" id="bus-ped" onkeyup="window.filtrarLista('bus-ped', 'tarj-ped')" placeholder="🔍 Buscar por nombre o folio..." style="width:100%; padding:8px; margin-bottom:15px; border-radius:6px; border:1px solid var(--border);">`; 
    
    [...(App.state.pedidos||[])].reverse().slice(0, 80).forEach(p => { 
        const c = App.state.clientes.find(cli => cli.id === p.cliente_id); 
        const nombreC = p.cliente_id === "STOCK_INTERNO" ? "📦 BODEGA (Stock)" : (c ? c.nombre : 'Mostrador'); 
        const detalle = App.state.pedido_detalle.find(d => d.pedido_id === p.id); 
        const producto = detalle ? App.state.productos.find(prod => prod.id === detalle.producto_id) : null; 
        const tieneOrden = detalle ? App.state.ordenes_produccion.some(o => o.pedido_detalle_id === detalle.id) : false; 
        const abonos = App.state.abonos.filter(a => a.pedido_id === p.id).reduce((sum, a) => sum + parseFloat(a.monto || 0), 0); 
        const saldoReal = parseFloat(p.total || 0) - parseFloat(p.anticipo || 0) - abonos; 
        const estaPagado = saldoReal <= 0; 
        
        let estadoFiltro = p.estado || 'nuevo';
        if (tieneOrden && estadoFiltro !== 'listo para entregar' && estadoFiltro !== 'pagado') estadoFiltro = 'en taller';
        if (estaPagado) estadoFiltro = 'pagado';

        let esUrgente = false;
        if(p.fecha_entrega && estadoFiltro !== 'pagado' && estadoFiltro !== 'listo para entregar') {
            const fEnt = new Date(p.fecha_entrega+'T00:00:00'); const hoy = new Date(); hoy.setHours(0,0,0,0);
            const diasFaltantes = Math.ceil((fEnt - hoy)/(1000*60*60*24));
            if(diasFaltantes <= 7) esUrgente = true;
        }

        html += `<div class="card tarj-ped" data-estado="${estadoFiltro}" data-urgente="${esUrgente}" style="border: ${esUrgente ? '2px solid var(--danger)' : '1px solid var(--border)'}; box-shadow: none;"><div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><strong>${p.id} - ${nombreC}</strong>${estaPagado ? `<span class="badge" style="background: var(--success); color: white;">PAGADO</span>` : `<span class="badge ${p.estado || 'nuevo'}">${(p.estado || 'Nuevo').toUpperCase()}</span>`}</div><p style="color: var(--primary); font-size: 0.9rem; font-weight: bold; margin-bottom: 5px;">${producto ? producto.nombre : 'Desconocido'}</p><div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--border);"><div><strong style="color: ${estaPagado ? 'var(--success)' : 'var(--danger)'};">Saldo: $${saldoReal > 0 ? saldoReal : 0}</strong></div><div style="display: flex; gap: 8px;">${!tieneOrden && detalle && (!producto || producto.categoria !== 'reventa') ? `<button class="btn btn-secondary" style="padding: 6px 10px; border-color:var(--secondary); color:var(--secondary);" onclick="App.views.formMandarProduccion('${p.id}')">🔨 Mandar a taller</button>` : ''}${!estaPagado && p.cliente_id !== "STOCK_INTERNO" ? `<button class="btn btn-primary" style="padding: 6px 10px; background: var(--success); border-color: var(--success);" onclick="App.views.formCobrar('${p.id}', '${c ? c.id : ''}', ${saldoReal})">💰</button>` : ''}</div></div><div style="display: flex; gap: 10px; margin-top: 15px;">${p.cliente_id !== "STOCK_INTERNO" ? `<button class="btn" style="flex: 1; font-size: 0.8rem; border-color: #38A169; color: #38A169;" onclick="App.views.modalOpcionesWhatsApp('${p.id}')">💬 WApp</button><button class="btn" style="flex: 1; font-size: 0.8rem; border-color: var(--primary); color: var(--primary);" onclick="App.logic.imprimirNota('${p.id}')">🖨️ PDF</button>` : ''}<button class="btn btn-secondary" style="font-size: 0.8rem; padding: 6px 10px;" onclick="App.views.formEditarPedido('${p.id}')">✏️</button><button class="btn btn-secondary" style="font-size: 0.8rem; padding: 6px 10px; color: red; border-color: red;" onclick="App.logic.eliminarPedido('${p.id}')">🗑️</button></div></div>`; 
    }); 
    return html += `</div><button class="fab" onclick="App.views.formNuevoPedido()">+</button>`; 
};

App.views.modalOpcionesWhatsApp = function(pedidoId) {
    let html = `<div style="display:flex; flex-direction:column; gap:10px;">
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:10px;">Elige el tipo de mensaje que deseas enviar al cliente:</p>
        <button class="btn btn-secondary" style="border-color:#38A169; color:#38A169; background:transparent;" onclick="App.logic.enviarWhatsApp('${pedidoId}', 'listo')">✅ Aviso de "Pedido Listo"</button>
        <button class="btn btn-secondary" style="border-color:#D69E2E; color:#D69E2E; background:transparent;" onclick="App.logic.enviarWhatsApp('${pedidoId}', 'cobro')">💰 Recordatorio de Pago</button>
        <button class="btn btn-secondary" style="border-color:var(--primary); color:var(--primary); background:transparent;" onclick="App.logic.enviarWhatsApp('${pedidoId}', 'general')">📝 Detalles del Pedido (General)</button>
    </div>`;
    App.ui.openSheet("Enviar WhatsApp", html);
};

App.views.produccion = function() { 
    document.getElementById('bottom-nav').style.display = 'flex'; let html = `<div class="card"><h3 class="card-title">Tablero Kanban</h3><button class="btn btn-secondary" style="width:100%; margin-top:10px; border: 2px dashed var(--primary); color: var(--primary); background: transparent; font-weight: bold;" onclick="App.views.formOrdenStock()">+ 🔨 Fabricar para Bodega</button></div>`; const pendientes = (App.state.ordenes_produccion||[]).filter(o => o.estado === 'pendiente' || !o.estado); const enProceso = (App.state.ordenes_produccion||[]).filter(o => o.estado === 'en_proceso'); const listas = (App.state.ordenes_produccion||[]).filter(o => o.estado === 'listo'); const dibujarTarjeta = (orden) => { const detalle = App.state.pedido_detalle.find(d => d.id === orden.pedido_detalle_id); const producto = detalle ? App.state.productos.find(p => p.id === detalle.producto_id) : null; const pedido = detalle ? App.state.pedidos.find(p => p.id === detalle.pedido_id) : null; let nombreCliente = 'Sin Cliente'; if(pedido && pedido.cliente_id === "STOCK_INTERNO") { nombreCliente = "📦 BODEGA"; } else if (pedido) { const clienteObj = App.state.clientes.find(c => c.id === pedido.cliente_id); if(clienteObj) nombreCliente = clienteObj.nombre; } const pagos = App.state.pago_artesanos.filter(p => p.orden_id === orden.id); let infoArtesanos = pagos.length > 0 ? `🛠️ ${pagos.length} Trabajos` : '👤 Sin asignar'; let semaforo = ''; if(pedido && pedido.fecha_entrega && orden.estado !== 'listo') { const fEnt = new Date(pedido.fecha_entrega+'T00:00:00'); const hoy = new Date(); hoy.setHours(0,0,0,0); const d = Math.ceil((fEnt - hoy)/(1000*60*60*24)); if(d < 0) semaforo = '<span style="background:red; color:white; padding:2px 6px; border-radius:4px; font-size:0.7rem; margin-left:5px;">🔴 Atrasado</span>'; else if(d <= 1) semaforo = '<span style="background:orange; color:white; padding:2px 6px; border-radius:4px; font-size:0.7rem; margin-left:5px;">🟡 Urgente</span>'; else semaforo = '<span style="background:green; color:white; padding:2px 6px; border-radius:4px; font-size:0.7rem; margin-left:5px;">🟢 A tiempo</span>'; } return `<div class="kanban-card" onclick="App.views.modalEditarOrden('${orden.id}')"><div style="display:flex; justify-content:space-between; margin-bottom:5px;"><strong>${orden.id}</strong><div><span style="font-size:0.75rem; color:#718096; font-weight:bold;">${pedido ? pedido.id.replace('PED-','') : ''}</span>${semaforo}</div></div><small style="color: var(--primary); font-weight: 600; display:block;">${producto ? producto.nombre : 'Producto interno'}</small><small style="color: #4A5568; display:block; margin-bottom:5px; font-weight:bold;">👤 ${nombreCliente}</small><div style="margin-top: 8px; font-size: 0.8rem; color: var(--text-muted); display:flex; justify-content: space-between; border-top: 1px dashed #E2E8F0; padding-top: 5px;"><span>${infoArtesanos}</span></div></div>`; }; html += `<div class="kanban-board"><div class="kanban-column"><div class="kanban-header">Pendientes <span>${pendientes.length}</span></div>${pendientes.map(dibujarTarjeta).join('')}</div><div class="kanban-column"><div class="kanban-header">En Proceso <span>${enProceso.length}</span></div>${enProceso.map(dibujarTarjeta).join('')}</div><div class="kanban-column"><div class="kanban-header">Listas <span>${listas.length}</span></div>${listas.map(dibujarTarjeta).join('')}</div></div>`; return html; 
};

App.views.nomina = function() { 
    document.getElementById('bottom-nav').style.display = 'flex'; 
    let html = `<div class="card"><h3 class="card-title">Nómina de Artesanos</h3>`; 
    const pagosPorArtesano = {}; 
    App.state.artesanos.forEach(a => { pagosPorArtesano[a.id] = { nombre: a.nombre, totalPendiente: 0, trabajos: [] }; }); 
    App.state.pago_artesanos.forEach(p => { 
        if (p.estado === 'pendiente' && pagosPorArtesano[p.artesano_id]) { 
            pagosPorArtesano[p.artesano_id].totalPendiente += parseFloat(p.total); 
            pagosPorArtesano[p.artesano_id].trabajos.push(p); 
        } 
    }); 
    let hayPendientes = false; 
    for (const [id, data] of Object.entries(pagosPorArtesano)) { 
        if (data.totalPendiente > 0) { 
            hayPendientes = true; 
            html += `<div class="card" style="border: 1px solid var(--border); box-shadow: none;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <strong>🧑‍🎨 ${data.nombre}</strong>
                            <strong style="color: var(--danger); font-size: 1.1rem;">$${data.totalPendiente}</strong>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button class="btn btn-secondary" style="flex: 1; border-color: var(--primary); color: var(--primary); background: transparent;" onclick="App.views.detalleNominaArtesano('${id}')">📋 Ver Detalles</button>
                            <button class="btn btn-primary" style="flex: 1; background: var(--success); border-color: var(--success);" onclick="if(confirm('¿Liquidar $${data.totalPendiente} a ${data.nombre}?')) App.logic.liquidarNomina('${id}')">💵 Liquidar</button>
                        </div>
                    </div>`; 
        } 
    } 
    if (!hayPendientes) html += `<p style="color: var(--text-muted);">No hay pagos pendientes. Todo está al día. ✨</p>`; 
    html += `</div>`; 
    return html; 
};

App.views.detalleNominaArtesano = function(artesanoId) {
    const artesano = App.state.artesanos.find(a => a.id === artesanoId);
    const pagosPendientes = App.state.pago_artesanos.filter(p => p.artesano_id === artesanoId && p.estado === 'pendiente');
    let html = `<div style="margin-bottom:15px;"><p style="color:var(--text-muted); font-size:0.85rem;">Trabajos sin pagar de <strong>${artesano.nombre}</strong>:</p><ul style="list-style:none; padding:0; margin:0;">`;
    pagosPendientes.forEach(p => {
        const orden = App.state.ordenes_produccion.find(o => o.id === p.orden_id);
        let nombreProducto = 'Orden ' + p.orden_id.replace('ORD-','');
        if(orden) { const detalle = App.state.pedido_detalle.find(d => d.id === orden.pedido_detalle_id); if(detalle) { const prod = App.state.productos.find(pr => pr.id === detalle.producto_id); if(prod) nombreProducto = prod.nombre; } }
        const partesID = p.id.split('-'); const nombreTarea = partesID.length > 2 ? partesID.slice(2).join(' ') : 'Trabajo general';
        html += `<li style="padding:10px 0; border-bottom:1px dashed #ccc; display:flex; justify-content:space-between; align-items:center;"><div><strong>${nombreTarea}</strong><br><small style="color:var(--text-muted);">${nombreProducto}</small><br><small style="color:var(--text-muted);">${p.fecha.split('T')[0]}</small></div><div style="text-align:right;"><span style="color:var(--danger); font-weight:bold; display:block; margin-bottom:5px;">$${p.total}</span><button class="btn btn-secondary" style="padding:2px 6px; font-size:0.7rem; color:red; border-color:red;" onclick="App.ui.closeSheet(); App.logic.eliminarRegistroGenerico('pago_artesanos', '${p.id}', 'pago_artesanos')">🗑️ Cancelar</button></div></li>`;
    });
    html += `</ul><button class="btn btn-primary" style="width:100%; margin-top:15px;" onclick="App.ui.closeSheet()">Cerrar</button></div>`;
    App.ui.openSheet(`Detalle de Nómina`, html);
};

App.views.finanzas = function() { document.getElementById('bottom-nav').style.display = 'flex'; setTimeout(() => App.logic.renderGraficasFinanzas('todo'), 50); return `<div class="card"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;"><h3 class="card-title" style="margin:0;">Finanzas</h3><select id="filtro-finanzas" onchange="App.logic.renderGraficasFinanzas(this.value)" style="padding:5px; border-radius:5px; border:1px solid #CBD5E0;"><option value="todo">Historial</option><option value="mes_actual">Este Mes</option><option value="mes_pasado">Mes Pasado</option><option value="trimestre_actual">Este Trimestre</option><option value="anio_actual">Este Año</option></select></div><div id="finanzas-contenedor">Cargando datos...</div></div><button class="fab" style="background: var(--danger);" onclick="App.views.formGasto()">+</button>`; };

App.views.detalleFinanzas = function(tipo, filtro) {
    const hoy = new Date(); let mesActual = hoy.getMonth(); let anioActual = hoy.getFullYear(); let mesPasado = mesActual - 1; let anioPasado = anioActual; if(mesPasado < 0) { mesPasado = 11; anioPasado--; } let triActual = Math.floor(mesActual / 3);
    const filtrarFecha = (str) => { if(filtro === 'todo') return true; if(!str) return false; const f = new Date(str); if(filtro === 'mes_actual') return f.getMonth() === mesActual && f.getFullYear() === anioActual; if(filtro === 'mes_pasado') return f.getMonth() === mesPasado && f.getFullYear() === anioPasado; if(filtro === 'trimestre_actual') return Math.floor(f.getMonth() / 3) === triActual && f.getFullYear() === anioActual; if(filtro === 'anio_actual') return f.getFullYear() === anioActual; return true; };
    const pedFiltrados = App.state.pedidos.filter(p => filtrarFecha(p.fecha_creacion)); const aboFiltrados = App.state.abonos.filter(a => filtrarFecha(a.fecha)); const gasFiltrados = App.state.gastos.filter(g => filtrarFecha(g.fecha));
    let html = '<ul style="list-style:none; padding:0; margin:0;">';
    if (tipo === 'ventas') { if(pedFiltrados.length===0) html += '<li>No hay ventas.</li>'; pedFiltrados.forEach(p => { html += `<li style="padding:8px 0; border-bottom:1px dashed #ccc; display:flex; justify-content:space-between;"><span><strong>${p.id.replace('PED-','')}</strong><br><small>${p.fecha_creacion.split('T')[0]}</small></span><span style="color:var(--primary); font-weight:bold;">$${p.total}</span></li>`; }); }
    else if (tipo === 'ingresos') { const ants = pedFiltrados.filter(p => parseFloat(p.anticipo)>0); if(ants.length===0 && aboFiltrados.length===0) html += '<li>No hay ingresos.</li>'; ants.forEach(p => { html += `<li style="padding:8px 0; border-bottom:1px dashed #ccc; display:flex; justify-content:space-between;"><span><strong>Anticipo ${p.id.replace('PED-','')}</strong><br><small>${p.fecha_creacion.split('T')[0]}</small></span><span style="color:var(--success); font-weight:bold;">$${p.anticipo}</span></li>`; }); aboFiltrados.forEach(a => { html += `<li style="padding:8px 0; border-bottom:1px dashed #ccc; display:flex; justify-content:space-between;"><span><strong>Abono a ${a.pedido_id.replace('PED-','')}</strong><br><small>${a.fecha.split('T')[0]}</small></span><span style="color:var(--success); font-weight:bold;">$${a.monto}</span></li>`; }); }
    else if (tipo === 'gastos') { 
        if(gasFiltrados.length===0) html += '<li>No hay gastos registrados.</li>'; 
        gasFiltrados.forEach(g => { 
            html += `<li style="padding:8px 0; border-bottom:1px dashed #ccc; display:flex; justify-content:space-between; align-items:center;">
                <span><strong>${g.descripcion}</strong><br><small>${g.fecha.split('T')[0]}</small></span>
                <div style="text-align:right;">
                    <span style="color:var(--danger); font-weight:bold; display:block; margin-bottom:5px;">$${g.monto}</span>
                    <button class="btn btn-secondary" style="padding:2px 6px; font-size:0.7rem; margin-right:4px;" onclick="App.ui.closeSheet(); setTimeout(()=>App.views.formGasto('${g.id}'), 300)">✏️</button>
                    <button class="btn btn-secondary" style="padding:2px 6px; font-size:0.7rem; color:red; border-color:red;" onclick="App.ui.closeSheet(); App.logic.eliminarRegistroGenerico('gastos', '${g.id}', 'gastos')">🗑️</button>
                </div>
            </li>`; 
        }); 
    }
    else if (tipo === 'por_cobrar') { let hayCobros = false; pedFiltrados.forEach(p => { const abonos = App.state.abonos.filter(a => a.pedido_id === p.id).reduce((s,a)=>s+parseFloat(a.monto||0),0); const saldo = parseFloat(p.total) - parseFloat(p.anticipo) - abonos; if(saldo > 0) { hayCobros=true; html += `<li style="padding:8px 0; border-bottom:1px dashed #ccc; display:flex; justify-content:space-between;"><span><strong>${p.id.replace('PED-','')}</strong><br><small>${p.fecha_creacion.split('T')[0]}</small></span><span style="color:#D69E2E; font-weight:bold;">$${saldo}</span></li>`; } }); if(!hayCobros) html += '<li>No hay saldo pendiente.</li>'; }
    html += '</ul><button class="btn btn-primary" style="width:100%; margin-top:15px;" onclick="App.ui.closeSheet()">Cerrar</button>';
    const titulos = { ventas: "Detalle de Ventas", ingresos: "Detalle de Ingresos", gastos: "Detalle de Gastos", por_cobrar: "Saldos Pendientes" };
    App.ui.openSheet(titulos[tipo], html);
};

App.views.mas = function() { 
    return `<div class="grid-2">
        <div class="card stat-card" style="cursor:pointer;" onclick="App.router.navigate('clientes')"><div class="label" style="margin-top:0;">👥 Clientes</div></div>
        <div class="card stat-card" style="cursor:pointer;" onclick="App.router.navigate('proveedores')"><div class="label" style="margin-top:0;">🚚 Proveedores</div></div>
        <div class="card stat-card" style="cursor:pointer;" onclick="App.router.navigate('artesanos')"><div class="label" style="margin-top:0;">🧑‍🎨 Artesanos / Tareas</div></div>
        <div class="card stat-card" style="cursor:pointer; background: #F0FFF4;" onclick="App.router.navigate('inventario')"><div class="label" style="margin-top:0; color:#276749;">📦 Bodega / Insumos</div></div>
        <div class="card stat-card" style="cursor:pointer;" onclick="App.router.navigate('productos')"><div class="label" style="margin-top:0;">🧶 Productos / Recetas</div></div>
        <div class="card stat-card" style="cursor:pointer; background: #EBF8FF;" onclick="App.router.navigate('compras')"><div class="label" style="margin-top:0; color:#3182CE;">🛒 Ingresar Compra</div></div>
        <div class="card stat-card" style="cursor:pointer; background: #FAF5FF;" onclick="App.router.navigate('reparaciones')"><div class="label" style="margin-top:0; color:#6B46C1;">🪡 Reparaciones</div></div>
        <div class="card stat-card" style="cursor:pointer; background: #EEF2FF;" onclick="App.router.navigate('cotizaciones')"><div class="label" style="margin-top:0; color:#4C51BF;">📝 Cotizaciones</div></div>
        <div class="card stat-card" style="cursor:pointer; background: #EDF2F7; grid-column: span 2;" onclick="App.router.navigate('configuracion')"><div class="label" style="margin-top:0; color: #4A5568;">⚙️ Configuración</div></div>
    </div>`; 
};

App.views.modalEstadoCuenta = function(clienteId) {
    const cliente = App.state.clientes.find(c => c.id === clienteId);
    const pedidosCliente = App.state.pedidos.filter(p => p.cliente_id === clienteId);
    let totalComprado = 0; let totalPagado = 0; let listaPedidosHTML = '';
    
    pedidosCliente.forEach(p => {
        const abonos = App.state.abonos.filter(a => a.pedido_id === p.id).reduce((s, a) => s + parseFloat(a.monto || 0), 0);
        const pagadoPedido = parseFloat(p.anticipo || 0) + abonos;
        const saldoPedido = parseFloat(p.total || 0) - pagadoPedido;
        totalComprado += parseFloat(p.total || 0); totalPagado += pagadoPedido;
        
        listaPedidosHTML += `<div style="border-bottom:1px dashed #ccc; padding:8px 0; display:flex; justify-content:space-between; align-items:center;">
            <div><strong>${p.id.replace('PED-','')}</strong><br><small style="color:var(--text-muted);">${p.fecha_creacion.split('T')[0]}</small></div>
            <div style="text-align:right;">
                <span style="font-size:0.85rem;">Total: $${p.total}</span><br>
                <strong style="color:${saldoPedido > 0 ? 'var(--danger)' : 'var(--success)'}">Saldo: $${saldoPedido > 0 ? saldoPedido : 0}</strong>
            </div>
        </div>`;
    });
    
    const deudaTotal = totalComprado - totalPagado;
    if(listaPedidosHTML === '') listaPedidosHTML = '<p style="text-align:center; color:var(--text-muted); margin-top:10px;">Este cliente no tiene pedidos registrados.</p>';

    let html = `<div style="background:#F7FAFC; padding:15px; border-radius:8px; text-align:center; margin-bottom:15px; border:1px solid var(--border);">
        <h2 style="margin:0; color:var(--primary);">${cliente.nombre}</h2>
        <p style="margin:5px 0 0 0; color:var(--text-muted);">📞 ${cliente.telefono || 'Sin teléfono'}</p>
    </div>
    <div class="grid-2" style="margin-bottom:15px;">
        <div class="card stat-card" style="background:#EBF8FF;"><div class="label" style="color:#2B6CB0;">Total Comprado</div><div class="value" style="color:#2B6CB0; font-size:1.1rem;">$${totalComprado}</div></div>
        <div class="card stat-card" style="background:#FEFCBF;"><div class="label" style="color:#D69E2E;">Deuda Actual</div><div class="value" style="color:#D69E2E; font-size:1.1rem;">$${deudaTotal > 0 ? deudaTotal : 0}</div></div>
    </div>
    <h4 style="border-bottom:2px solid var(--border); padding-bottom:5px; margin-bottom:10px;">Historial de Compras</h4>
    <div style="max-height:300px; overflow-y:auto; margin-bottom:15px;">${listaPedidosHTML}</div>
    <button class="btn btn-secondary" style="width:100%; border-color:#38A169; color:#38A169; font-weight:bold; background:transparent;" onclick="window.location.href='https://wa.me/52${String(cliente.telefono).replace(/\\D/g,'')}?text=${encodeURIComponent(`Hola *${cliente.nombre}* 👋,\nTe compartimos tu estado de cuenta en *${App.state.config.empresa}*:\n\n💳 *Total Comprado (Histórico):* $${totalComprado}\n✅ *Total Abonado:* $${totalPagado}\n⚠️ *Saldo Pendiente Global:* $${deudaTotal > 0 ? deudaTotal : 0}\n\nCualquier duda, estamos a tus órdenes.`)}'">📱 Enviar Estado de Cuenta (WhatsApp)</button>`;
    
    App.ui.openSheet("Estado de Cuenta", html);
};

App.views.clientes = function() { document.getElementById('bottom-nav').style.display = 'flex'; let html = `<div class="card"><h3 class="card-title">Directorio de Clientes</h3><button class="btn btn-secondary" style="width:100%; margin-bottom:15px; border-color:#38A169; color:#38A169; background:transparent;" onclick="window.exportarAExcel(App.state.clientes, 'Clientes_DescansoMaya')">📥 Descargar Tabla en Excel</button><input type="text" id="bus-cli" onkeyup="window.filtrarLista('bus-cli', 'tarj-cli')" placeholder="🔍 Buscar cliente..." style="width:100%; padding:8px; margin-bottom:15px; border-radius:6px; border:1px solid var(--border);">`; App.state.clientes.forEach(c => { html += `<div class="card tarj-cli" style="border: 1px solid var(--border); padding: 10px; margin-bottom: 8px; display:flex; justify-content:space-between; align-items:center;"><div><strong>${c.nombre}</strong><br><small style="color: var(--text-muted);">📞 ${c.telefono || 'N/A'}</small></div><div><button class="btn btn-secondary" style="padding:4px 8px; font-size:0.8rem; margin-right:4px;" onclick="App.views.modalEstadoCuenta('${c.id}')">📋 Historial</button><button class="btn btn-secondary" style="padding:4px 8px; font-size:0.8rem; margin-right:4px;" onclick="App.views.formCliente('${c.id}')">✏️</button><button class="btn btn-secondary" style="padding:4px 8px; font-size:0.8rem; color:red; border-color:red;" onclick="App.logic.eliminarRegistroGenerico('clientes', '${c.id}', 'clientes')">🗑️</button></div></div>`; }); html += `</div><button class="fab" onclick="App.views.formCliente()">+</button>`; return html; };
App.views.proveedores = function() { document.getElementById('bottom-nav').style.display = 'flex'; let html = `<div class="card"><h3 class="card-title">Proveedores</h3>`; App.state.proveedores.forEach(p => { html += `<div class="card" style="border: 1px solid var(--border); padding: 10px; margin-bottom: 8px; display:flex; justify-content:space-between; align-items:center;"><div><strong>${p.nombre}</strong><br><small style="color: var(--text-muted);">📞 ${p.telefono || 'N/A'}</small></div><div><button class="btn btn-secondary" style="padding:4px 8px; font-size:0.8rem; margin-right:4px;" onclick="App.views.formProveedor('${p.id}')">✏️</button><button class="btn btn-secondary" style="padding:4px 8px; font-size:0.8rem; color:red; border-color:red;" onclick="App.logic.eliminarRegistroGenerico('proveedores', '${p.id}', 'proveedores')">🗑️</button></div></div>`; }); html += `</div><button class="fab" onclick="App.views.formProveedor()">+</button>`; return html; };
App.views.artesanos = function() { document.getElementById('bottom-nav').style.display = 'flex'; let html = `<div class="card"><h3 class="card-title">Artesanos y Tareas</h3>`; App.state.artesanos.forEach(a => { html += `<div class="card" style="border: 1px solid var(--border); padding: 10px; margin-bottom: 8px; display:flex; justify-content:space-between; align-items:center;"><div><strong>${a.nombre}</strong><br><small style="color: var(--text-muted);">📞 ${a.telefono || 'N/A'}</small></div><div><button class="btn btn-secondary" style="padding:4px 8px; font-size:0.8rem; margin-right:4px; border: 1px solid var(--primary); color: var(--primary); background: transparent;" onclick="App.views.verTarifasArtesano('${a.id}')">Tarifas 💲</button><button class="btn btn-secondary" style="padding:4px 8px; font-size:0.8rem; margin-right:4px;" onclick="App.views.formArtesano('${a.id}')">✏️</button><button class="btn btn-secondary" style="padding:4px 8px; font-size:0.8rem; color:red; border-color:red;" onclick="App.logic.eliminarRegistroGenerico('artesanos', '${a.id}', 'artesanos')">🗑️</button></div></div>`; }); html += `</div><button class="fab" onclick="App.views.formArtesano()">+</button>`; return html; };
App.views.verTarifasArtesano = function(artesanoId) { const artesano = App.state.artesanos.find(a => a.id === artesanoId); const tarifas = App.state.tarifas_artesano.filter(t => t.artesano_id === artesanoId); let html = `<div style="margin-bottom: 15px;">Gestiona cuánto cobra <strong>${artesano.nombre}</strong> por cada tipo de tarea.</div><table style="width:100%; border-collapse: collapse; font-size: 0.9rem; margin-bottom:15px;"><tr style="border-bottom: 2px solid var(--border);"><th style="text-align:left; padding:8px;">Tipo de Trabajo</th><th style="padding:8px;">Monto</th><th></th></tr>`; if(tarifas.length === 0) { html += `<tr><td colspan="3" style="padding:10px; color:#aaa; text-align:center;">Sin tareas configuradas</td></tr>`; } else { tarifas.forEach(t => { html += `<tr style="border-bottom: 1px solid var(--border);"><td style="padding: 10px 5px;">${t.clasificacion}</td><td style="padding: 10px 5px; text-align:center; font-weight:bold; color:var(--success)">$${t.monto}</td><td style="text-align:right;"><button class="btn btn-secondary" style="padding:4px 8px; font-size:0.8rem; color:red; border:color:red;" onclick="App.logic.eliminarRegistroGenerico('tarifas_artesano', '${t.id}', 'tarifas_artesano'); App.ui.closeSheet();">🗑️</button></td></tr>`; }); } html += `</table><button class="btn btn-primary" style="width:100%;" onclick="App.ui.closeSheet(); setTimeout(()=>App.views.formTarifa('${artesanoId}'), 400);">+ Agregar Tarea</button>`; App.ui.openSheet(`Tarifas de ${artesano.nombre}`, html); };
App.views.compras = function() { document.getElementById('bottom-nav').style.display = 'flex'; let html = `<div class="card"><h3 class="card-title">Historial de Compras</h3>`; [...(App.state.compras||[])].reverse().forEach(c => { const p = App.state.proveedores.find(prv => prv.id === c.proveedor_id); html += `<div class="card" style="border: 1px solid var(--border); box-shadow: none;"><div style="display: flex; justify-content: space-between; margin-bottom: 5px; cursor:pointer;" onclick="App.views.verDetallesCompra('${c.id}')"><strong>${c.id}</strong><span style="color: var(--danger); font-weight: bold;">$${c.total}</span></div><p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 5px; cursor:pointer;" onclick="App.views.verDetallesCompra('${c.id}')">Proveedor: ${p ? p.nombre : 'General'} | Fecha: ${c.fecha}<br><span style="color:var(--primary); font-weight:bold; display:inline-block; margin-top:5px;">👀 Ver artículos comprados</span></p><div style="text-align: right; border-top:1px dashed #eee; padding-top:8px; margin-top:8px;"><button class="btn btn-secondary" style="padding:4px 8px; font-size:0.8rem; margin-right:4px;" onclick="App.views.formEditarCompra('${c.id}')">✏️ Editar</button><button class="btn btn-secondary" style="padding:4px 8px; font-size:0.8rem; color:red; border-color:red;" onclick="App.logic.eliminarCompra('${c.id}')">🗑️ Eliminar</button></div></div>`; }); return html += `</div><button class="fab" onclick="App.views.formCompra()">+</button>`; };
App.views.verDetallesCompra = function(compraId) { const c = App.state.compras.find(x => x.id === compraId); const p = App.state.proveedores.find(prv => prv.id === c.proveedor_id); let detalles = []; try { detalles = JSON.parse(c.detalles || '[]'); } catch(e){} let detHTML = `<ul style="list-style:none; padding:0; margin:0;">`; if(detalles.length === 0) detHTML += `<li><small style="color:var(--text-muted)">Compra antigua sin detalles.</small></li>`; detalles.forEach(d => { detHTML += `<li style="padding:8px 0; border-bottom:1px dashed #ccc; display:flex; justify-content:space-between; align-items:center;"><span><strong style="color:var(--primary);">${d.cantidad}x</strong> ${d.nombre}</span><span style="color:var(--text-muted); font-size:0.85rem;">$${d.costo_unitario} c/u</span></li>`; }); detHTML += `</ul>`; let html = `<div style="font-size:0.9rem; margin-bottom:15px;"><p style="margin:2px 0;"><strong>Proveedor:</strong> ${p ? p.nombre : 'General'}</p><p style="margin:2px 0;"><strong>Fecha:</strong> ${c.fecha}</p><p style="margin:2px 0;"><strong>Total Pagado:</strong> <span style="color:var(--danger); font-weight:bold;">$${c.total}</span></p></div><h4 style="margin-top:15px; border-bottom:2px solid var(--primary); padding-bottom:5px; color:var(--primary-dark);">Artículos Comprados</h4><div style="background:#f9f9f9; padding:10px; border-radius:6px; margin-bottom:15px;">${detHTML}</div><button class="btn btn-primary" style="width:100%;" onclick="App.ui.closeSheet()">Cerrar</button>`; App.ui.openSheet(`Detalle de Compra`, html); };
App.views.configuracion = function() { return `<div class="card"><h3 class="card-title">Configuración</h3><button class="btn btn-primary" style="width: 100%; margin-bottom: 15px;" onclick="App.logic.descargarRespaldo()">💾 Descargar Respaldo JSON</button><button class="btn btn-secondary" style="width: 100%; margin-bottom: 15px; border-color:#38A169; color:#38A169; background:transparent;" onclick="window.exportarAExcel(App.state.movimientos_inventario, 'Kardex_Completo')">📥 Descargar Kardex a Excel</button><button class="btn btn-secondary" style="width: 100%; margin-bottom: 15px; border-color:#2B6CB0; color:#2B6CB0; background:transparent;" onclick="App.logic.verDiagnostico()">🛠️ Diagnóstico de Base de Datos</button><button class="btn btn-secondary" style="width: 100%; background: #FED7D7; color: var(--danger); border: none;" onclick="localStorage.removeItem('erp_pin'); location.reload();">🔒 Bloquear Sistema</button></div>`; };
App.views.reparaciones = function() { document.getElementById('bottom-nav').style.display = 'flex'; let html = `<div class="card"><h3 class="card-title">Reparaciones</h3>`; [...App.state.reparaciones].reverse().forEach(r => { const c = App.state.clientes.find(cli => cli.id === r.cliente_id); const pagos = App.state.pago_artesanos.filter(p => p.orden_id === r.id); let infoArtesanos = pagos.length > 0 ? `🛠️ ${pagos.length} Trabajos asignados` : '👤 Sin asignar'; const estaLista = r.estado === 'entregada'; html += `<div class="card" style="border: 1px solid var(--border); box-shadow: none;"><div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><strong>${r.id} - ${c ? c.nombre : 'Cliente'}</strong><span class="badge ${estaLista ? 'listo' : 'pendiente'}">${r.estado.toUpperCase()}</span></div><p style="color: var(--primary); font-size: 0.9rem; font-weight: bold; margin-bottom: 5px;">${r.descripcion}</p><div style="font-size:0.8rem; margin-bottom:10px; color:#4A5568;">${infoArtesanos}</div><div style="display:flex; justify-content:space-between; gap:5px;">`; if(!estaLista) { html += `<button class="btn btn-secondary" style="font-size:0.8rem; padding:6px; flex:1;" onclick="App.views.formAgregarTrabajo('${r.id}', true)">+ Asignar Tarea</button>`; html += `<button class="btn btn-primary" style="font-size:0.8rem; padding:6px; background:var(--success); border-color:var(--success); flex:1;" onclick="App.logic.actualizarReparacion('${r.id}', 'entregada')">✔ Marcar Lista</button>`; } html += `<button class="btn btn-secondary" style="padding:6px; font-size:0.8rem; color:red;" onclick="App.logic.eliminarRegistroGenerico('reparaciones', '${r.id}', 'reparaciones')">🗑️</button></div></div>`; }); return html += `</div><button class="fab" onclick="App.views.formNuevaReparacion()">+</button>`; };
App.views.cotizaciones = function() { document.getElementById('bottom-nav').style.display = 'flex'; let html = `<div class="card"><h3 class="card-title">Cotizaciones Rápidas</h3><p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:15px;">Solo informativas. No afectan inventario ni finanzas.</p>`; if (!App.state.cotizaciones || App.state.cotizaciones.length === 0) { html += `<p>No hay cotizaciones recientes.</p>`; } else { [...App.state.cotizaciones].reverse().forEach(c => { html += `<div class="card" style="border: 1px solid var(--border); box-shadow: none;"><div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><strong>${c.id} - ${c.cliente_nombre}</strong><span style="color: var(--primary); font-weight: bold;">$${c.total}</span></div><p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 5px;">${c.descripcion}</p><div style="display:flex; gap:5px; justify-content:flex-end;"><button class="btn btn-secondary" style="padding:4px 8px; font-size:0.8rem; margin-right:4px;" onclick="App.logic.imprimirCotizacion('${c.id}')">🖨️ Imprimir PDF</button><button class="btn btn-secondary" style="padding:4px 8px; font-size:0.8rem; color:red; border-color:red;" onclick="App.logic.eliminarCotizacion('${c.id}')">🗑️</button></div></div>`; }); } html += `</div><button class="fab" onclick="App.views.formNuevaCotizacion()">+</button>`; return html; };

App.views.modalEditarOrden = function(ordenId) { 
    const orden = App.state.ordenes_produccion.find(o => o.id === ordenId); 
    const detalle = App.state.pedido_detalle.find(d => d.pedido_id === orden.pedido_detalle_id);
    const pedido = App.state.pedidos.find(p => p.id === detalle.pedido_id);
    const pagos = App.state.pago_artesanos.filter(p => p.orden_id === ordenId); 
    const costoManoObra = pagos.reduce((sum, p) => sum + parseFloat(p.total), 0); 

    let costoMateriales = 0;
    try {
        if(orden.receta_personalizada) {
            const receta = JSON.parse(orden.receta_personalizada);
            receta.forEach(item => {
                const mat = App.state.inventario.find(m => m.id === item.mat_id);
                if(mat) costoMateriales += (parseFloat(item.cant) * parseFloat(mat.costo_unitario || 0));
            });
        }
    } catch(e) {}

    const totalVenta = pedido ? parseFloat(pedido.total) : 0;
    const utilidadNeta = totalVenta - costoMateriales - costoManoObra;
    let colorUtilidad = utilidadNeta > 0 ? 'var(--success)' : 'var(--danger)';

    let pagosHTML = `<div style="background:#F0FFF4; padding:10px; border-radius:6px; margin-bottom:15px; border:1px solid #C6F6D5;">
        <h4 style="margin-bottom:5px; color:#276749;">📊 Rentabilidad de esta Hamaca</h4>
        <div style="display:flex; justify-content:space-between; font-size:0.85rem;"><span style="color:var(--text-muted);">Precio Venta:</span> <strong>$${totalVenta.toFixed(2)}</strong></div>
        <div style="display:flex; justify-content:space-between; font-size:0.85rem;"><span style="color:var(--danger);">- Costo Hilos:</span> <strong>$${costoMateriales.toFixed(2)}</strong></div>
        <div style="display:flex; justify-content:space-between; font-size:0.85rem;"><span style="color:var(--danger);">- Mano de Obra:</span> <strong>$${costoManoObra.toFixed(2)}</strong></div>
        <hr style="margin:5px 0; border-top:1px dashed #C6F6D5;">
        <div style="display:flex; justify-content:space-between; font-size:1.1rem; color:${colorUtilidad};"><span>Utilidad Limpia:</span> <strong>$${utilidadNeta.toFixed(2)}</strong></div>
    </div>`;

    pagosHTML += '<div style="margin-bottom:15px;"><strong>🛠️ Trabajos Asignados:</strong><br>'; 
    if(pagos.length === 0) pagosHTML += '<small style="color:var(--text-muted)">Nadie ha trabajado aún.</small>'; 
    pagos.forEach(p => { const art = App.state.artesanos.find(a => a.id === p.artesano_id); const partesID = p.id.split('-'); const nombreTarea = partesID.length > 2 ? partesID.slice(2).join(' ') : 'Trabajo general'; pagosHTML += `<div style="display:flex; justify-content:space-between; background:#F7FAFC; padding:8px; margin-top:5px; border-radius:4px; font-size:0.85rem; border:1px solid #E2E8F0;"><span>🧑‍🎨 <strong>${art ? art.nombre : 'Desc'}</strong> - <em>${nombreTarea}</em></span><span><strong style="color:var(--success); margin-right:8px;">$${p.total}</strong> <span style="cursor:pointer; color:red;" onclick="App.ui.closeSheet(); App.logic.eliminarRegistroGenerico('pago_artesanos', '${p.id}', 'pago_artesanos');">🗑️</span></span></div>`; }); 
    pagosHTML += `</div>`;
    
    pagosHTML += `<button type="button" class="btn btn-secondary" style="width:100%; margin-bottom:10px; border-style:dashed;" onclick="App.ui.closeSheet(); setTimeout(()=>App.views.formAgregarTrabajo('${ordenId}', false), 300);">+ Asignar Tarea / Artesano</button>`;
    pagosHTML += `<button type="button" class="btn btn-secondary" style="width:100%; margin-bottom:15px; border: 1px solid var(--primary); color: var(--primary); background: transparent;" onclick="App.logic.imprimirTicketProduccion('${ordenId}')">🖨️ Imprimir Ticket para Taller</button>`;

    const formHTML = `<form id="dynamic-form">${pagosHTML}<div class="form-group"><label>Estado del Pedido en Taller</label><select name="estado"><option value="pendiente" ${orden.estado === 'pendiente' ? 'selected' : ''}>Pendiente de tejer</option><option value="en_proceso" ${orden.estado === 'en_proceso' ? 'selected' : ''}>En Proceso (Tejiendo)</option><option value="listo" ${orden.estado === 'listo' ? 'selected' : ''}>¡Terminada! (Pasar a cierre)</option></select></div><button type="submit" class="btn btn-primary" style="width: 100%;">Actualizar Estado</button></form>`; App.ui.openSheet(`Orden ${ordenId}`, formHTML, (datos) => App.logic.procesarCambioOrden(ordenId, datos)); 
};

App.views.formMandarProduccion = function(pedidoId) {
    const pedido = App.state.pedidos.find(p => p.id === pedidoId);
    const detalle = App.state.pedido_detalle.find(d => d.pedido_id === pedidoId);
    const producto = App.state.productos.find(p => p.id === detalle.producto_id);

    let recetaHTML = '';
    if (producto) { let counter = 1; while(producto[`mat_${counter}`]) { const matId = producto[`mat_${counter}`]; const cant = parseFloat(producto[`cant_${counter}`]) * (parseInt(detalle.cantidad) || 1); const uso = producto[`uso_${counter}`] || 'Cuerpo'; if(matId) recetaHTML += window.generarFilaRecetaProd(matId, cant, uso); counter++; } }
    if (recetaHTML === '') recetaHTML = window.generarFilaRecetaProd('','','Cuerpo');

    const formHTML = `<form id="dynamic-form"><input type="hidden" name="pedido_id" value="${pedidoId}"><input type="hidden" name="pedido_detalle_id" value="${detalle.id}"><div style="background: #EBF8FF; padding: 10px; border-radius: 8px; margin-bottom: 15px; font-size: 0.85rem; color: #2B6CB0;"><strong>Confirmar Insumos para Producción</strong><br>El inventario se descontará en este momento. Puedes ajustar los colores si el cliente pidió algo especial.</div><div id="cont-receta-prod">${recetaHTML}</div><button type="button" class="btn btn-secondary" style="width:100%; margin-top:10px; border: 1px dashed var(--primary); color: var(--primary); background: transparent;" onclick="window.agregarFilaRecetaProd()">+ Añadir insumo extra</button><button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 15px; background: var(--success); border-color: var(--success);">Confirmar y Enviar a Taller</button></form>`;
    App.ui.openSheet("Mandar a Producción", formHTML, (data) => App.logic.confirmarMandarProduccion(data));
};

App.views.formNuevaCotizacion = function() { const formHTML = `<form id="dynamic-form"><div style="background: #EEF2FF; padding: 10px; border-radius: 8px; margin-bottom: 15px; font-size: 0.85rem; color: #4C51BF;">📝 Las cotizaciones no restan inventario ni se suman a las finanzas.</div><div class="form-group"><label>Nombre del Cliente</label><input type="text" name="cliente_nombre" required></div><div class="form-group"><label>Descripción (Ej. Hamaca Matrimonial)</label><input type="text" name="descripcion" required></div><div class="form-group"><label>Precio Cotizado ($)</label><input type="number" step="0.01" name="total" required></div><button type="submit" class="btn btn-primary" style="width: 100%;">Generar Cotización y PDF</button></form>`; App.ui.openSheet("Nueva Cotización", formHTML, (data) => App.logic.guardarCotizacion(data)); };
App.views.formMaterial = function(id = null) { const obj = id ? App.state.inventario.find(m => m.id === id) : null; const formHTML = `<form id="dynamic-form"><div style="background: #EBF8FF; padding: 10px; border-radius: 8px; margin-bottom: 15px; font-size: 0.85rem; color: #2B6CB0;">Crea un insumo (Ej. Hilo Rojo, Argollas, o Hamaca para Reventa).</div><div class="form-group"><label>Nombre del Insumo / Artículo</label><input type="text" name="nombre" value="${obj ? obj.nombre : ''}" required placeholder="Ej. Hilo Nylon Rojo"></div><div class="form-group"><label>Tipo de Insumo</label><select name="tipo" required><option value="hilo" ${obj && obj.tipo === 'hilo' ? 'selected' : ''}>Hilo para Tejer</option><option value="accesorio" ${obj && obj.tipo === 'accesorio' ? 'selected' : ''}>Accesorios (Argollas, etc)</option><option value="reventa" ${obj && obj.tipo === 'reventa' ? 'selected' : ''}>Hamaca Terminada (Reventa)</option><option value="otro" ${obj && obj.tipo === 'otro' ? 'selected' : ''}>Otro</option></select></div><div class="form-group"><label>Unidad de Medida</label><select name="unidad"><option value="Tubos" ${obj && obj.unidad === 'Tubos' ? 'selected' : ''}>Tubos</option><option value="Kg" ${obj && obj.unidad === 'Kg' ? 'selected' : ''}>Kilogramos (Kg)</option><option value="Pzas" ${obj && obj.unidad === 'Pzas' ? 'selected' : ''}>Piezas (Pzas)</option></select></div><div class="grid-2"><div class="form-group"><label>Stock Actual</label><input type="number" step="0.1" name="stock_actual" value="${obj ? obj.stock_actual : '0'}" required></div><div class="form-group"><label>Stock Mínimo (Alerta)</label><input type="number" step="0.1" name="stock_minimo" value="${obj ? (obj.stock_minimo||'0') : '0'}" required></div></div><button type="submit" class="btn btn-primary" style="width: 100%;">${obj ? 'Guardar Cambios' : 'Crear Insumo'}</button></form>`; App.ui.openSheet(obj ? "Editar Insumo" : "Nuevo Insumo", formHTML, (data) => { if (obj) App.logic.actualizarRegistroGenerico("materiales", id, data, "inventario"); else App.logic.guardarNuevoGenerico("materiales", data, "MAT", "inventario"); }); };

App.views.formProducto = function(id = null) { 
    const obj = id ? App.state.productos.find(p => p.id === id) : null; 
    const generarFila = (matId, cant, uso) => { const opcMat = App.state.inventario.map(m => `<option value="${m.id}" ${matId === m.id ? 'selected':''}>${m.nombre} (${m.unidad})</option>`).join(''); return `<div class="grid-3 fila-dinamica" style="margin-bottom: 5px;"><div class="form-group" style="margin:0;"><select name="mat_id[]" required><option value="">-- Insumo --</option>${opcMat}</select></div><div class="form-group" style="margin:0;"><input type="number" step="0.1" name="cant[]" value="${cant||''}" placeholder="Cant" required></div><div class="form-group" style="margin:0; display:flex; gap:5px;"><select name="uso[]" required><option value="Cuerpo" ${uso==='Cuerpo'?'selected':''}>Cuerpo</option><option value="Brazos" ${uso==='Brazos'?'selected':''}>Brazos</option><option value="Adicional" ${uso==='Adicional'?'selected':''}>Otro</option></select><button type="button" onclick="this.parentElement.parentElement.remove()" style="background:var(--danger); color:white; border:none; border-radius:4px; padding:0 10px;">X</button></div></div>`; };
    let recetaHTML = ''; let counter = 1; if (obj) { while(obj[`mat_${counter}`]) { recetaHTML += generarFila(obj[`mat_${counter}`], obj[`cant_${counter}`], obj[`uso_${counter}`]); counter++; } } if (recetaHTML === '') recetaHTML = generarFila('','',''); 
    const clasif = obj ? obj.clasificacion : ''; 
    const formHTML = `<form id="dynamic-form"><div class="form-group"><label>Nombre del Producto a Vender</label><input type="text" name="nombre" value="${obj ? obj.nombre : ''}" required></div><div class="grid-2"><div class="form-group"><label>Categoría</label><select name="categoria"><option value="fabricacion" ${obj && obj.categoria === 'fabricacion' ? 'selected' : ''}>Fabricación</option><option value="reventa" ${obj && obj.categoria === 'reventa' ? 'selected' : ''}>Reventa</option></select></div><div class="form-group"><label>Clasificación</label><select name="clasificacion"><option value="Unicolor" ${clasif==='Unicolor'?'selected':''}>Unicolor</option><option value="Combinada" ${clasif==='Combinada'?'selected':''}>Combinada</option><option value="Especial" ${clasif==='Especial'?'selected':''}>Especial</option><option value="Reventa" ${clasif==='Reventa'?'selected':''}>Reventa</option><option value="Otro" ${clasif==='Otro'?'selected':''}>Otro</option></select></div></div><div class="grid-2"><div class="form-group"><label>Tamaño</label><input type="text" name="tamano" value="${obj ? (obj.tamano||'') : ''}" placeholder="Ej. Matrimonial"></div><div class="form-group"><label>Color</label><input type="text" name="color" value="${obj ? (obj.color||'') : ''}" placeholder="Ej. Rojo/Blanco"></div></div><div class="grid-2"><div class="form-group"><label>Precio Venta ($)</label><input type="number" name="precio_venta" value="${obj ? obj.precio_venta : ''}" required></div><div class="form-group"><label>Precio Mayoreo ($)</label><input type="number" name="precio_mayoreo" value="${obj ? (obj.precio_mayoreo||'') : ''}"></div></div><div style="background: #F7FAFC; padding: 10px; border-radius: 8px; margin-bottom: 15px; border: 1px solid var(--border);"><strong style="font-size: 0.9rem; color: var(--primary);">📦 Receta de Inventario (Dinámica)</strong><div id="cont-receta" style="margin-top:10px;">${recetaHTML}</div><button type="button" class="btn btn-secondary" style="width:100%; margin-top:10px; border: 1px dashed var(--primary); color: var(--primary); background: transparent;" onclick="window.agregarFilaReceta()">+ Añadir Insumo a la Receta</button></div><button type="submit" class="btn btn-primary" style="width: 100%;">${obj ? 'Guardar Cambios' : 'Crear Producto'}</button></form>`; 
    App.ui.openSheet(obj ? "Editar Producto" : "Nuevo Producto", formHTML, (data) => { 
        if (data.mat_id && Array.isArray(data.mat_id)) { for(let i=0; i<data.mat_id.length; i++) { data[`mat_${i+1}`] = data.mat_id[i]; data[`cant_${i+1}`] = data.cant[i]; data[`uso_${i+1}`] = data.uso[i]; } delete data.mat_id; delete data.cant; delete data.uso; } else if(data.mat_id) { data.mat_1 = data.mat_id; data.cant_1 = data.cant; data.uso_1 = data.uso; delete data.mat_id; delete data.cant; delete data.uso; }
        if (obj) App.logic.actualizarRegistroGenerico("productos", id, data, "productos"); else App.logic.guardarNuevoGenerico("productos", data, "PROD", "productos"); 
    }); 
};

App.views.formCliente = function(id = null) { const obj = id ? App.state.clientes.find(c => c.id === id) : null; const formHTML = `<form id="dynamic-form"><div class="form-group"><label>Nombre</label><input type="text" name="nombre" value="${obj ? obj.nombre : ''}" required></div><div class="form-group"><label>Teléfono (10 dígitos)</label><input type="tel" name="telefono" value="${obj ? obj.telefono : ''}" pattern="\\d{10}" title="El teléfono debe tener exactamente 10 números sin espacios" maxlength="10"></div><div class="form-group"><label>Dirección</label><input type="text" name="direccion" value="${obj ? obj.direccion : ''}"></div><button type="submit" class="btn btn-primary" style="width: 100%;">${obj ? 'Guardar Cambios' : 'Crear Cliente'}</button></form>`; App.ui.openSheet(obj ? "Editar Cliente" : "Nuevo Cliente", formHTML, (data) => { if (obj) App.logic.actualizarRegistroGenerico("clientes", id, data, "clientes"); else App.logic.guardarNuevoGenerico("clientes", data, "CLI", "clientes"); }); };
App.views.formProveedor = function(id = null) { const obj = id ? App.state.proveedores.find(p => p.id === id) : null; const formHTML = `<form id="dynamic-form"><div class="form-group"><label>Nombre del Proveedor</label><input type="text" name="nombre" value="${obj ? obj.nombre : ''}" required></div><div class="form-group"><label>Teléfono (10 dígitos)</label><input type="tel" name="telefono" value="${obj ? obj.telefono : ''}" pattern="\\d{10}" title="El teléfono debe tener exactamente 10 números sin espacios" maxlength="10"></div><button type="submit" class="btn btn-primary" style="width: 100%;">${obj ? 'Guardar Cambios' : 'Crear Proveedor'}</button></form>`; App.ui.openSheet(obj ? "Editar Proveedor" : "Nuevo Proveedor", formHTML, (data) => { if (obj) App.logic.actualizarRegistroGenerico("proveedores", id, data, "proveedores"); else App.logic.guardarNuevoGenerico("proveedores", data, "PRV", "proveedores"); }); };
App.views.formArtesano = function(id = null) { const obj = id ? App.state.artesanos.find(a => a.id === id) : null; const formHTML = `<form id="dynamic-form"><div class="form-group"><label>Nombre del Artesano</label><input type="text" name="nombre" value="${obj ? obj.nombre : ''}" required></div><div class="form-group"><label>Teléfono (10 dígitos)</label><input type="tel" name="telefono" value="${obj ? obj.telefono : ''}" pattern="\\d{10}" title="El teléfono debe tener exactamente 10 números sin espacios" maxlength="10"></div><button type="submit" class="btn btn-primary" style="width: 100%;">${obj ? 'Guardar Cambios' : 'Crear Artesano'}</button></form>`; App.ui.openSheet(obj ? "Editar Artesano" : "Nuevo Artesano", formHTML, (data) => { if (obj) App.logic.actualizarRegistroGenerico("artesanos", id, data, "artesanos"); else App.logic.guardarNuevoGenerico("artesanos", data, "ART", "artesanos"); }); };

App.views.formTarifa = function(artesanoId) { const formHTML = `<form id="dynamic-form"><input type="hidden" name="artesano_id" value="${artesanoId}"><div class="form-group"><label>Tarea a Realizar (Ej. Tejer Cuerpo)</label><input type="text" name="clasificacion" required placeholder="Nombre de la tarea"></div><div class="form-group"><label>Monto a Pagar ($)</label><input type="number" step="0.01" name="monto" required></div><button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">Guardar Tarea</button></form>`; App.ui.openSheet("Nueva Tarea para Artesano", formHTML, (data) => App.logic.guardarNuevoGenerico("tarifas_artesano", data, "TAR", "tarifas_artesano")); };
App.views.formEditarPedido = function(id) { const p = App.state.pedidos.find(x => x.id === id); const formHTML = `<form id="dynamic-form"><div class="form-group"><label>Precio Total ($)</label><input type="number" step="0.01" name="total" value="${p.total}" required></div><div class="form-group"><label>Anticipo Registrado ($)</label><input type="number" step="0.01" name="anticipo" value="${p.anticipo}" required></div><div class="form-group"><label>Fecha de Entrega</label><input type="date" name="fecha_entrega" value="${p.fecha_entrega || ''}"></div><div class="form-group"><label>Notas / Instrucciones</label><textarea name="notas" rows="2">${p.notas || ''}</textarea></div><button type="submit" class="btn btn-primary" style="width: 100%;">Guardar Cambios</button></form>`; App.ui.openSheet("Editar Pedido", formHTML, (data) => { App.logic.actualizarRegistroGenerico("pedidos", id, data, "pedidos"); }); };

App.views.formGasto = function(id = null) { 
    const obj = id ? App.state.gastos.find(g => g.id === id) : null; 
    let htmlGastos = '';
    if(obj) { htmlGastos = `<div class="form-group"><label>Descripción del Gasto</label><input type="text" name="descripcion" value="${obj.descripcion}" required></div><div class="form-group"><label>Monto ($)</label><input type="number" step="0.01" name="monto" value="${obj.monto}" required></div>`; }
    else { htmlGastos = `<div id="cont-gastos"><div class="grid-2 fila-dinamica" style="margin-bottom: 5px;"><div class="form-group" style="margin:0;"><input type="text" name="descripcion[]" placeholder="Descripción" required></div><div class="form-group" style="margin:0; display:flex; gap:5px;"><input type="number" step="0.01" name="monto[]" placeholder="$ Monto" required></div></div></div><button type="button" class="btn btn-secondary" style="width:100%; margin-top:10px; margin-bottom:15px; border:1px dashed var(--danger); color:var(--danger); background: transparent;" onclick="window.agregarFilaGasto()">+ Añadir Gasto a la lista</button>`; }

    const formHTML = `<form id="dynamic-form"><div class="form-group"><label>Categoría Común</label><select name="categoria" required><option value="materiales" ${obj && obj.categoria === 'materiales' ? 'selected' : ''}>Materiales</option><option value="servicios" ${obj && obj.categoria === 'servicios' ? 'selected' : ''}>Servicios</option><option value="nomina" ${obj && obj.categoria === 'nomina' ? 'selected' : ''}>Nómina</option><option value="otro" ${obj && obj.categoria === 'otro' ? 'selected' : ''}>Otro</option></select></div><div class="form-group"><label>Fecha</label><input type="date" name="fecha" value="${obj ? obj.fecha : new Date().toISOString().split('T')[0]}" required></div>${htmlGastos}<button type="submit" class="btn btn-primary" style="width: 100%; background: var(--danger); border-color: var(--danger);">${obj ? 'Guardar Cambios' : 'Registrar Gastos'}</button></form>`; 
    App.ui.openSheet(obj ? "Editar Gasto" : "Nuevos Gastos Múltiples", formHTML, (data) => { if (obj) App.logic.actualizarRegistroGenerico("gastos", id, data, "gastos"); else App.logic.guardarMultiplesGastos(data); }); 
};

App.views.formNuevoPedido = function() { 
    const opcionesClientes = App.state.clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join(''); 
    const opcionesProductos = App.state.productos.map(p => `<option value="${p.id}">${p.nombre}</option>`).join(''); 
    const formHTML = `<form id="dynamic-form">
        <div style="background: #EBF8FF; padding: 8px; border-radius: 6px; margin-bottom: 10px; font-size: 0.8rem; color: #2B6CB0;"><strong>Novedad:</strong> El inventario ya no se descuenta aquí. Se descontará cuando envíes la hamaca a Producción.</div>
        <div class="form-group"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;"><label style="margin:0;">Cliente</label><span style="color:var(--primary); font-size:0.8rem; cursor:pointer; font-weight:bold;" onclick="App.ui.closeSheet(); setTimeout(()=>App.views.formCliente(), 400);">+ Nuevo Cliente</span></div><select name="cliente_id" required><option value="">-- Elige un cliente --</option>${opcionesClientes}</select></div>
        <div class="form-group"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;"><label style="margin:0;">Producto</label><span style="color:var(--primary); font-size:0.8rem; cursor:pointer; font-weight:bold;" onclick="App.ui.closeSheet(); setTimeout(()=>App.views.formProducto(), 400);">+ Nuevo Producto</span></div><select name="producto_id" required onchange="window.calcularTotalPedido()"><option value="">-- Elige un producto --</option>${opcionesProductos}</select></div>
        <div id="info-extra-prod" style="margin-top:-10px; margin-bottom:10px;"></div>
        <div class="form-group"><label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" name="es_mayoreo" value="1" onchange="window.calcularTotalPedido()" style="width:20px; height:20px;"><strong>Aplicar Precio Mayoreo</strong></label></div>
        <div class="form-group"><label>Cantidad</label><input type="number" name="cantidad" value="1" min="1" required oninput="window.calcularTotalPedido()"></div>
        <div class="form-group"><label>Precio Total ($)</label><input type="number" name="total" required></div>
        <div class="form-group"><label>Anticipo ($)</label><input type="number" name="anticipo" value="0" required></div>
        <div class="form-group"><label>Fecha Entrega Estimada</label><input type="date" name="fecha_entrega" required></div>
        <div class="form-group"><label>Notas</label><input type="text" name="notas" placeholder="Opcional"></div>
        <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">Crear Pedido</button>
    </form>`; 
    App.ui.openSheet("Nuevo Pedido", formHTML, (data) => App.logic.guardarNuevoPedido(data)); 
};

App.views.formOrdenStock = function() { const opcionesProductos = App.state.productos.map(p => `<option value="${p.id}">${p.nombre}</option>`).join(''); const formHTML = `<form id="dynamic-form"><div style="background: #F7FAFC; padding: 10px; border-radius: 8px; margin-bottom: 15px; font-size: 0.85rem; border: 1px solid var(--border);"><strong>Fabricar para Bodega</strong><br>Descontará hilos y enviará el trabajo a artesanos.</div><div class="form-group"><label>¿Qué vas a fabricar?</label><select name="producto_id" required><option value="">-- Elige un producto --</option>${opcionesProductos}</select></div><div class="form-group"><label>Cantidad a fabricar</label><input type="number" name="cantidad" value="1" min="1" required></div><button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">Mandar a Producción</button></form>`; App.ui.openSheet("Producir para Stock", formHTML, (data) => App.logic.guardarOrdenStock(data)); };
App.views.formCobrar = function(pedidoId, clienteId, saldoPendiente) { const formHTML = `<form id="dynamic-form"><input type="hidden" name="pedido_id" value="${pedidoId}"><input type="hidden" name="cliente_id" value="${clienteId}"><div class="form-group"><label>Abonar ($)</label><input type="number" name="monto" value="${saldoPendiente}" max="${saldoPendiente}" required></div><div class="form-group"><label>Nota/Método</label><input type="text" name="nota" value="Efectivo" required></div><button type="submit" class="btn btn-primary" style="width: 100%;">Confirmar Pago</button></form>`; App.ui.openSheet(`Pago ${pedidoId}`, formHTML, (data) => App.logic.guardarAbono(data)); };
App.views.formAgregarTrabajo = function(ordenId, esReparacion = false) { const opcArt = App.state.artesanos.map(a => `<option value="${a.id}">${a.nombre}</option>`).join(''); const formHTML = `<form id="dynamic-form"><div class="form-group"><label>Artesano</label><select name="artesano_id" required onchange="window.cargarTarifas(this.value)"><option value="">-- Selecciona --</option>${opcArt}</select></div><div class="form-group"><label>Tarea a Realizar</label><select name="tarea_val" id="select-tarifas" required onchange="window.calcTotalTrabajo()"><option value="">-- Elige un artesano primero --</option></select></div><input type="hidden" name="tarea_nombre" id="tarea_nombre"><div class="form-group"><label>Cantidad (Ej. 7 hilos, o 1 pza)</label><input type="number" step="0.1" name="cantidad" id="cant-trabajo" value="1" required oninput="window.calcTotalTrabajo()"></div><div class="form-group"><label>Total a Pagar ($)</label><input type="number" step="0.01" name="total" id="total-trabajo" required readonly style="background:#f0f0f0;"></div><button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">Guardar Trabajo</button></form>`; App.ui.openSheet("Añadir Tarea", formHTML, (data) => App.logic.guardarTrabajoOrden(ordenId, data, esReparacion)); };

App.views.formCompra = function() { 
    const opcProv = App.state.proveedores.map(p => `<option value="${p.id}">${p.nombre}</option>`).join(''); 
    const opcMat = App.state.inventario.map(m => `<option value="${m.id}">${m.nombre} (Stock: ${m.stock_actual})</option>`).join(''); 
    const formHTML = `<form id="dynamic-form">
        <div class="form-group"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;"><label style="margin:0;">Proveedor</label><span style="color:var(--primary); font-size:0.8rem; cursor:pointer; font-weight:bold;" onclick="App.ui.closeSheet(); setTimeout(()=>App.views.formProveedor(), 400);">+ Nuevo Proveedor</span></div><select name="proveedor_id" required><option value="">-- Elige Proveedor --</option>${opcProv}</select></div>
        <div style="background: #EBF8FF; padding: 10px; border-radius: 8px; margin-bottom: 15px;">
            <strong style="font-size: 0.9rem; color: var(--primary);">📥 Artículos Comprados (Dinámico)</strong><br>
            <div style="text-align:center; margin:10px 0;"><button type="button" class="btn btn-secondary" style="border:2px dashed var(--primary); color:var(--primary); padding:8px; width:100%; background: transparent;" onclick="App.ui.closeSheet(); setTimeout(()=>App.views.formMaterial(), 400);">+ Crear Insumo Nuevo</button></div>
            <div id="cont-compras"><div class="grid-3 fila-dinamica" style="margin-bottom: 5px; gap:5px;"><div class="form-group" style="margin:0;"><select name="mat_id[]" required><option value="">-- Insumo --</option>${opcMat}</select></div><div class="form-group" style="margin:0;"><input type="number" step="0.1" name="cant[]" placeholder="Cant" required></div><div class="form-group" style="margin:0; display:flex; gap:5px;"><input type="number" step="0.01" name="costo[]" placeholder="$ Costo" required></div></div></div>
            <button type="button" class="btn btn-secondary" style="width:100%; margin-top:10px; border:1px dashed #3182CE; color:#3182CE; background: transparent;" onclick="window.agregarFilaCompra()">+ Añadir otro artículo</button>
        </div>
        <div class="form-group"><label>Fecha</label><input type="date" name="fecha" value="${new Date().toISOString().split('T')[0]}" required></div>
        <div class="form-group"><label>Costo Total Factura ($)</label><input type="number" name="total" required></div>
        <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px; background: var(--success); border-color: var(--success);">Confirmar Compra</button>
    </form>`; 
    App.ui.openSheet("Ingresar Compra Múltiple", formHTML, (data) => App.logic.guardarNuevaCompra(data)); 
};

App.views.formEditarCompra = function(id) { 
    const obj = App.state.compras.find(c => c.id === id); 
    const opcProv = App.state.proveedores.map(p => `<option value="${p.id}" ${obj.proveedor_id === p.id ? 'selected':''}>${p.nombre}</option>`).join(''); 
    const formHTML = `<form id="dynamic-form"><div style="background: #F7FAFC; padding: 10px; border-radius: 8px; margin-bottom: 15px; font-size: 0.85rem; border: 1px solid var(--border);"><strong>Nota:</strong> Solo puedes cambiar Proveedor, Fecha y Total. Para cambiar cantidades, ELIMINA la compra y vuelve a hacerla.</div><div class="form-group"><label>Proveedor</label><select name="proveedor_id" required><option value="">-- Elige Proveedor --</option>${opcProv}</select></div><div class="form-group"><label>Fecha</label><input type="date" name="fecha" value="${obj.fecha}" required></div><div class="form-group"><label>Costo Total Pagado ($)</label><input type="number" name="total" value="${obj.total}" required></div><button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">Guardar Cambios</button></form>`; 
    App.ui.openSheet("Editar Compra", formHTML, (data) => App.logic.actualizarRegistroGenerico("compras", id, data, "compras")); 
};

App.views.formNuevaReparacion = function() { 
    const opcionesClientes = App.state.clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join(''); 
    const formHTML = `<form id="dynamic-form"><div class="form-group"><label>Cliente</label><select name="cliente_id" required><option value="">-- Elige un cliente --</option>${opcionesClientes}</select></div><div class="form-group"><label>Descripción del Problema</label><input type="text" name="descripcion" required placeholder="Ej. Cambio de brazos"></div><div class="form-group"><label>Costo Estimado para Cliente ($)</label><input type="number" step="0.01" name="precio" required></div><div class="form-group"><label>Anticipo Dejado ($)</label><input type="number" step="0.01" name="anticipo" value="0" required></div><button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">Registrar Reparación</button></form>`; 
    App.ui.openSheet("Nueva Reparación", formHTML, (data) => App.logic.guardarNuevaReparacion(data)); 
};

App.views.formCerrarOrden = function(ordenId) { 
    const orden = App.state.ordenes_produccion.find(o => o.id === ordenId); 
    const detalle = App.state.pedido_detalle.find(d => d.pedido_id === orden.pedido_detalle_id); 
    const producto = detalle ? App.state.productos.find(p => p.id === detalle.producto_id) : { nombre: 'Hamaca', tubos_hilo: 0 }; 
    
    let materialesHTML = ''; 
    let recetaGuardada = null;
    try { if(orden.receta_personalizada) recetaGuardada = JSON.parse(orden.receta_personalizada); } catch(e){}

    if (recetaGuardada && recetaGuardada.length > 0) {
        recetaGuardada.forEach((item, index) => {
            const material = App.state.inventario.find(m => m.id === item.mat_id);
            if(material) {
                materialesHTML += `<div class="form-group" style="margin-bottom:8px; background: white; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0;"><label>${material.nombre} <strong style="color:var(--primary);">[${(item.uso||'Cuerpo').toUpperCase()}]</strong></label><input type="hidden" name="mat_${index+1}_id" value="${item.mat_id}"><input type="hidden" name="mat_${index+1}_teorico" value="${item.cant}"><div style="display:flex; align-items:center; gap: 10px;"><span style="font-size:0.8rem;">Consumo Real:</span><input type="number" step="0.1" name="mat_${index+1}_real" value="${item.cant}" required style="flex:1;"></div></div>`;
            }
        });
    } else {
        for(let i=1; i<=20; i++){ 
            const matId = producto[`mat_${i}`]; const cant = parseFloat(producto[`cant_${i}`]); const uso = producto[`uso_${i}`] || 'Cuerpo'; 
            if(matId && cant > 0) { 
                const material = App.state.inventario.find(m => m.id === matId); 
                const consumoTeorico = cant * parseInt(detalle ? detalle.cantidad : 1); 
                materialesHTML += `<div class="form-group" style="margin-bottom:8px; background: white; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0;"><label>${material ? material.nombre : 'Insumo'} <strong style="color:var(--primary);">[${uso.toUpperCase()}]</strong></label><input type="hidden" name="mat_${i}_id" value="${matId}"><input type="hidden" name="mat_${i}_teorico" value="${consumoTeorico}"><div style="display:flex; align-items:center; gap: 10px;"><span style="font-size:0.8rem;">Consumo Real:</span><input type="number" step="0.1" name="mat_${i}_real" value="${consumoTeorico}" required style="flex:1;"></div></div>`; 
            } 
        } 
    }
    
    if(materialesHTML === '') materialesHTML = '<p style="color:var(--text-muted); font-size:0.8rem;">No hay insumos a descontar para este producto.</p>'; 
    
    const formHTML = `<div style="background: #EBF8FF; padding: 10px; border-radius: 8px; margin-bottom: 15px; font-size: 0.9rem; color: #2B6CB0;"><strong>Cierre de Producción</strong><br>Producto: ${producto.nombre}</div><form id="dynamic-form"><input type="hidden" name="orden_id" value="${ordenId}"><p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:10px;">Si hubo merma y usaron más hilo del apartado, ajústalo aquí.</p>${materialesHTML}<div style="margin-top: 15px; padding: 10px; background: #E2E8F0; border-radius: 6px;"><label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" name="sumar_stock" value="1" style="width:20px; height:20px;"><strong>Guardar en mi Bodega Física</strong></label><small style="color:var(--text-muted); display:block; margin-top:5px;">Si esta hamaca NO se va a entregar a un cliente hoy, marca esta casilla para guardarla en tu inventario de reventa.</small></div><button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 15px; background: var(--success); border-color: var(--success);">Finalizar Orden</button></form>`; 
    App.ui.openSheet("Cerrar Orden", formHTML, (datos) => App.logic.cerrarOrdenProduccion(datos)); 
};

App.router = { 
    init() { window.addEventListener('hashchange', () => this.handleRoute()); this.handleRoute(); }, 
    navigate(route) { window.location.hash = route; }, 
    handleRoute() { 
        if (!App.state.pinAcceso) { App.ui.hideLoader(); document.getElementById('app-content').innerHTML = App.views.login(); document.getElementById('header-title').textContent = "Acceso Restringido"; return; } 
        let hash = window.location.hash.substring(1) || 'inicio'; const contentDiv = document.getElementById('app-content'); const titleEl = document.getElementById('header-title'); document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active')); const activeNav = document.querySelector(`.nav-item[data-view="${hash}"]`); if(activeNav) activeNav.classList.add('active'); 
        if (App.views[hash]) { contentDiv.innerHTML = App.views[hash](); titleEl.textContent = hash.charAt(0).toUpperCase() + hash.slice(1); } 
        else { contentDiv.innerHTML = `<div class="card"><p>Módulo no encontrado.</p></div>`; } 
    } 
};

App.start = function() { this.ui.init(); if (!this.state.pinAcceso) { this.router.init(); } else { this.logic.cargarDatosIniciales(); } };
document.addEventListener('DOMContentLoaded', () => App.start());
