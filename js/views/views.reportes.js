// ==========================================
// VISTAS: CENTRO DE REPORTES (BI)
// ==========================================

App.views.reportes = function() { 
    document.getElementById('bottom-nav').style.display = 'flex'; 
    let html = `<div class="card"><h3 class="card-title" style="color:#2B6CB0; display:flex; align-items:center; gap:8px;">📊 Centro de Reportes</h3><p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:15px;">Métricas operativas y de rentabilidad en tiempo real.</p>`; 

    // CALCULOS RÁPIDOS PARA BADGES
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    let pedAtrasados = 0;
    (App.state.pedidos || []).forEach(p => { if(p.estado !== 'listo para entregar' && p.estado !== 'pagado' && p.fecha_entrega) { const fEnt = new Date(p.fecha_entrega+'T00:00:00'); const diffDias = Math.ceil((fEnt - hoy)/(1000*60*60*24)); if(diffDias < 0) pedAtrasados++; } });
    const ordPendientes = (App.state.ordenes_produccion||[]).filter(o => o.estado === 'pendiente' || o.estado === 'en_proceso').length;
    
    let deudaArtesanos = 0;
    (App.state.pago_artesanos || []).forEach(pa => { if(pa.estado === 'pendiente') deudaArtesanos += parseFloat(pa.total || 0); });

    html += `<div class="grid-2">
        <div class="card stat-card" style="background:#F0FFF4; border:1px solid #C6F6D5; cursor:pointer;" onclick="App.views.modalReporteRentabilidad()">
            <div class="label" style="color:#276749; font-weight:bold;">📈 Rentabilidad ABC</div>
            <div style="font-size:0.75rem; color:#2F855A; margin-top:5px;">Márgenes reales por producto</div>
        </div>
        <div class="card stat-card" style="background:#EBF8FF; border:1px solid #BEE3F8; cursor:pointer;" onclick="App.views.modalReporteTopProductos()">
            <div class="label" style="color:#2B6CB0; font-weight:bold;">🏆 Top Ventas</div>
            <div style="font-size:0.75rem; color:#3182CE; margin-top:5px;">Productos más vendidos</div>
        </div>
        <div class="card stat-card" style="background:#FAF5FF; border:1px solid #E9D8FD; cursor:pointer;" onclick="App.views.modalReporteProveedores()">
            <div class="label" style="color:#553C9A; font-weight:bold;">🚚 Proveedores</div>
            <div style="font-size:0.75rem; color:#6B46C1; margin-top:5px;">Volumen de compras y deudas</div>
        </div>
        <div class="card stat-card" style="background:#FFF5F5; border:1px solid #FED7D7; cursor:pointer;" onclick="App.router.navigate('pedidos')">
            <div class="label" style="color:#C53030; font-weight:bold;">🚨 Atrasos Ventas</div>
            <div style="font-size:1.2rem; color:#E53E3E; margin-top:5px; font-weight:bold;">${pedAtrasados} <small style="font-size:0.7rem; font-weight:normal;">pedidos</small></div>
        </div>
        <div class="card stat-card" style="background:#FFFAF0; border:1px solid #FEFCBF; cursor:pointer;" onclick="App.router.navigate('produccion')">
            <div class="label" style="color:#B7791F; font-weight:bold;">⏳ Taller</div>
            <div style="font-size:1.2rem; color:#D69E2E; margin-top:5px; font-weight:bold;">${ordPendientes} <small style="font-size:0.7rem; font-weight:normal;">órdenes pendientes</small></div>
        </div>
        <div class="card stat-card" style="background:#EDF2F7; border:1px solid #E2E8F0; cursor:pointer;" onclick="App.router.navigate('nomina')">
            <div class="label" style="color:#4A5568; font-weight:bold;">🧑‍🎨 Deuda Nómina</div>
            <div style="font-size:1.2rem; color:#718096; margin-top:5px; font-weight:bold;">$${deudaArtesanos.toFixed(2)}</div>
        </div>
    </div>`;
    html += `</div>`; return html; 
};

// 1. MODAL: RENTABILIDAD
App.views.modalReporteRentabilidad = function() {
    const data = App.logic.generarReporteRentabilidad();
    let lista = '';
    if(data.length === 0) { lista = '<p style="color:var(--text-muted); text-align:center; padding:20px;">No hay suficientes órdenes cerradas y costeadas para calcular.</p>'; }
    else {
        data.forEach((item, index) => {
            const margen = item.ventas > 0 ? ((item.utilidad / item.ventas) * 100).toFixed(1) : 0;
            const utilPromedio = item.cantidad > 0 ? (item.utilidad / item.cantidad) : 0;
            lista += `<div style="background:white; border:1px solid #e2e8f0; padding:12px; border-radius:8px; margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed #e2e8f0; padding-bottom:5px; margin-bottom:8px;">
                    <strong style="color:var(--text-main); font-size:1rem;">${index+1}. ${App.ui.escapeHTML(item.nombre)}</strong>
                    <span class="badge" style="background:#C6F6D5; color:#276749;">Margen: ${margen}%</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-muted); margin-bottom:2px;">
                    <span>Utilidad Neta Total:</span> <strong style="color:var(--success);">$${item.utilidad.toFixed(2)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-muted); margin-bottom:2px;">
                    <span>Hamacas fabricadas:</span> <strong>${item.cantidad}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-muted);">
                    <span>Utilidad promedio x unidad:</span> <strong style="color:var(--primary);">$${utilPromedio.toFixed(2)}</strong>
                </div>
            </div>`;
        });
    }
    let html = `<div style="background:#F0FFF4; padding:10px; border-radius:8px; margin-bottom:15px; font-size:0.85rem; color:#276749; border:1px solid #C6F6D5;">Calculado basado en los <strong>Costos Reales</strong> sellados al cerrar las órdenes en el taller (Costeo ABC).</div>${lista}<button class="btn btn-primary" style="width:100%; margin-top:10px;" onclick="App.ui.closeSheet()">Cerrar</button>`;
    App.ui.openSheet("📈 Rentabilidad por Producto", html);
};

// 2. MODAL: TOP PRODUCTOS
App.views.modalReporteTopProductos = function() {
    const data = App.logic.generarReporteTopProductos();
    let lista = '';
    if(data.length === 0) { lista = '<p style="color:var(--text-muted); text-align:center; padding:20px;">No hay ventas registradas.</p>'; }
    else {
        data.slice(0, 10).forEach((item, index) => { // Top 10
            lista += `<div style="background:white; border:1px solid #e2e8f0; padding:12px; border-radius:8px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong style="color:var(--text-main); font-size:0.95rem;">${index+1}. ${App.ui.escapeHTML(item.nombre)}</strong><br>
                    <small style="color:var(--text-muted);">Unidades vendidas: <strong>${item.cantidad}</strong></small>
                </div>
                <div style="text-align:right;">
                    <span style="color:var(--primary); font-weight:bold;">$${item.ingresos.toFixed(2)}</span>
                </div>
            </div>`;
        });
    }
    let html = `<div style="background:#EBF8FF; padding:10px; border-radius:8px; margin-bottom:15px; font-size:0.85rem; color:#2B6CB0; border:1px solid #BEE3F8;">Muestra los 10 productos más solicitados históricamente (Sin contar stock interno).</div>${lista}<button class="btn btn-primary" style="width:100%; margin-top:10px;" onclick="App.ui.closeSheet()">Cerrar</button>`;
    App.ui.openSheet("🏆 Top 10 Productos", html);
};

// 3. MODAL: COMPRAS Y PROVEEDORES
App.views.modalReporteProveedores = function() {
    const data = App.logic.generarReporteComprasProv();
    let lista = '';
    if(data.length === 0) { lista = '<p style="color:var(--text-muted); text-align:center; padding:20px;">No hay compras registradas.</p>'; }
    else {
        data.forEach(item => {
            lista += `<div style="background:white; border:1px solid #e2e8f0; padding:12px; border-radius:8px; margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed #e2e8f0; padding-bottom:5px; margin-bottom:8px;">
                    <strong style="color:var(--text-main); font-size:0.95rem;">🚚 ${App.ui.escapeHTML(item.nombre)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:var(--text-muted); margin-bottom:4px;">
                    <span>Total Comprado Histórico:</span> <strong style="color:var(--primary);">$${item.total_comprado.toFixed(2)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:var(--text-muted);">
                    <span>Saldo a Favor del Proveedor:</span> <strong style="color:${item.deuda > 0 ? 'var(--danger)' : 'var(--success)'};">${item.deuda > 0 ? 'Debes: $'+item.deuda.toFixed(2) : 'Liquidado'}</strong>
                </div>
            </div>`;
        });
    }
    let html = `<div style="background:#FAF5FF; padding:10px; border-radius:8px; margin-bottom:15px; font-size:0.85rem; color:#553C9A; border:1px solid #E9D8FD;">Análisis de dependencia de proveedores y cuentas por pagar consolidadas.</div>${lista}<button class="btn btn-primary" style="width:100%; margin-top:10px;" onclick="App.ui.closeSheet()">Cerrar</button>`;
    App.ui.openSheet("📦 Análisis de Proveedores", html);
};
