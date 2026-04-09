// ==========================================
// LÓGICA: INTELIGENCIA DE NEGOCIOS Y REPORTES
// ==========================================

Object.assign(App.logic, {
    generarReporteRentabilidad() {
        let stats = {};
        (App.state.ordenes_produccion || []).forEach(o => {
            if(o.estado === 'listo' && o.costos_finales) {
                const detalle = (App.state.pedido_detalle || []).find(d => d.id === o.pedido_detalle_id) || (App.state.pedido_detalle || []).find(d => d.pedido_id === o.pedido_detalle_id);
                if(detalle) {
                    const prod = (App.state.productos || []).find(p => p.id === detalle.producto_id);
                    if(prod) {
                        try {
                            const cf = JSON.parse(o.costos_finales);
                            if(cf.precio_venta > 0) { // Solo contamos los vendidos a clientes, no el stock interno
                                if(!stats[prod.id]) stats[prod.id] = { nombre: prod.nombre, ventas: 0, costo_mat: 0, costo_mo: 0, utilidad: 0, cantidad: 0 };
                                stats[prod.id].ventas += parseFloat(cf.precio_venta||0);
                                stats[prod.id].costo_mat += parseFloat(cf.materiales||0);
                                stats[prod.id].costo_mo += parseFloat(cf.mano_obra||0);
                                stats[prod.id].utilidad += parseFloat(cf.utilidad||0);
                                stats[prod.id].cantidad += 1;
                            }
                        } catch(e){}
                    }
                }
            }
        });
        return Object.values(stats).sort((a, b) => b.utilidad - a.utilidad);
    },

    generarReporteTopProductos() {
        let stats = {};
        (App.state.pedido_detalle || []).forEach(d => {
            const pedido = (App.state.pedidos || []).find(p => p.id === d.pedido_id);
            if(pedido && pedido.cliente_id !== 'STOCK_INTERNO') {
                const prod = (App.state.productos || []).find(p => p.id === d.producto_id);
                if(prod) {
                    if(!stats[prod.id]) stats[prod.id] = { nombre: prod.nombre, cantidad: 0, ingresos: 0 };
                    stats[prod.id].cantidad += parseInt(d.cantidad || 1);
                    stats[prod.id].ingresos += parseFloat(pedido.total || 0);
                }
            }
        });
        return Object.values(stats).sort((a, b) => b.cantidad - a.cantidad);
    },

    generarReporteComprasProv() {
        let stats = {};
        (App.state.compras || []).forEach(c => {
            const prov = (App.state.proveedores || []).find(p => p.id === c.proveedor_id);
            const nombre = prov ? prov.nombre : 'Desconocido';
            if(!stats[nombre]) stats[nombre] = { nombre: nombre, total_comprado: 0, deuda: 0 };
            const total = parseFloat(c.total||0);
            const pagado = c.monto_pagado !== undefined && c.monto_pagado !== "" ? parseFloat(c.monto_pagado) : total;
            stats[nombre].total_comprado += total;
            stats[nombre].deuda += (total - pagado);
        });
        return Object.values(stats).sort((a, b) => b.total_comprado - a.total_comprado);
    }
});
