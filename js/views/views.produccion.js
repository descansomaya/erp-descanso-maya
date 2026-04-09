// ==========================================
// VISTAS: PRODUCCIÓN (TALLER)
// ==========================================

App.views.produccion = function() { 
    document.getElementById('app-header-title').innerText = "Taller";
    document.getElementById('app-header-subtitle').innerText = "Órdenes de producción";

    let html = `<div class="dm-section">
        <div class="dm-tabs dm-mb-4">
            <button class="dm-tab active tab-btn-prod" onclick="window.switchTabProd('pendientes', this)">🕒 En Cola</button>
            <button class="dm-tab tab-btn-prod" onclick="window.switchTabProd('proceso', this)">🔥 En Proceso</button>
            <button class="dm-tab tab-btn-prod" onclick="window.switchTabProd('listas', this)">✅ Listas</button>
        </div>
        <input type="text" id="bus-prod" class="dm-input dm-mb-4" onkeyup="window.filtrarLista('bus-prod', 'dm-list-card')" placeholder="🔍 Buscar orden o artesano...">
        <div id="tab-pendientes" class="tab-content-prod" style="display:block;">${generarListaProd('pendiente')}</div>
        <div id="tab-proceso" class="tab-content-prod" style="display:none;">${generarListaProd('proceso')}</div>
        <div id="tab-listas" class="tab-content-prod" style="display:none;">${generarListaProd('listo')}</div>
    </div>`; 
    return html; 
};

function generarListaProd(estadoFiltro) { 
    let ords = (App.state.ordenes_produccion || []).filter(o => o.estado === estadoFiltro); 
    if(ords.length === 0) return `<div class="dm-alert dm-alert-info">No hay órdenes aquí.</div>`; 
    ords.sort((a,b) => new Date(b.fecha_inicio) - new Date(a.fecha_inicio)); 
    let html = `<div class="dm-list">`; 

// Dentro de generarListaProd...
ords.forEach(o => { 
    // BUSQUEDA CORRECTA DEL ARTESANO ASIGNADO EN SHEETS 
    const artesanoAsignado = App.state.artesanos.find(a => a.id === o.artesano_id);
    const nombreArtesano = artesanoAsignado ? artesanoAsignado.nombre : '⚠️ Sin asignar';
    
    // Vinculación con el detalle del producto 
    const pDetalle = App.state.pedido_detalle.find(d => d.id === o.pedido_detalle_id) || {};
    const producto = App.state.productos.find(p => p.id === pDetalle.producto_id) || {};

    html += `
    <div class="dm-list-card">
        <div class="dm-list-card-top">
            <div>
                <div class="dm-list-card-title">${producto.nombre || 'Producto'}</div>
                <div class="dm-list-card-subtitle">Artesano: <strong>${nombreArtesano}</strong></div>
            </div>
            <span class="dm-badge dm-badge-primary">Folio: ${o.id.split('-')[1]}</span>
        </div>
        </div>`;
});
    
    html += `</div>`; return html; 
}

App.views.modalMateriaPrima = function(ordenId) { 
    const ord = App.state.ordenes_produccion.find(o => o.id === ordenId); if(!ord) return; 
    let html = `<form id="dynamic-form"><input type="hidden" name="orden_id" value="${ordenId}"><div id="cont-receta-prod">`; 
    let receta = []; try { receta = JSON.parse(ord.receta_usada || '[]'); } catch(e){} 
    if(receta.length > 0) receta.forEach(r => { html += window.generarFilaRecetaProd(r.mat_id, r.cant, r.uso); }); 
    else html += window.generarFilaRecetaProd('', '', 'Cuerpo'); 
    html += `</div><button type="button" class="dm-btn dm-btn-ghost dm-btn-block dm-mb-4" onclick="window.agregarFilaRecetaProd()">+ Añadir hilo</button>
    <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">💾 Guardar y Descontar</button></form>`; 
    App.ui.openSheet("Hilos Utilizados", html, (data) => { 
        const matIds = Array.isArray(data['mat_id[]']) ? data['mat_id[]'] : [data['mat_id[]']]; 
        const cants = Array.isArray(data['cant[]']) ? data['cant[]'] : [data['cant[]']]; 
        const usos = Array.isArray(data['uso[]']) ? data['uso[]'] : [data['uso[]']]; 
        let rFinal = []; for(let i=0; i<matIds.length; i++) { if(matIds[i]) rFinal.push({ mat_id: matIds[i], cant: cants[i], uso: usos[i] }); } 
        App.logic.guardarRecetaProduccion(ordenId, rFinal); 
    }); 
};
