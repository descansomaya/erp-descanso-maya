// ==========================================
// LÓGICA: INTELIGENCIA DE NEGOCIOS Y REPORTES
// ==========================================

window.App = window.App || {};
App.logic = App.logic || {};

Object.assign(App.logic, {
    
    generarReporteRentabilidad() {
        // Conectamos el reporte con el nuevo motor de costeo que incluye Reventa y Fabricación
        // Validamos que exista la función antes de llamarla para evitar errores
        if (typeof App.views.calcularCostoRealHamacas !== 'function') {
            console.warn("La función calcularCostoRealHamacas no está definida. Asegúrate de actualizar views.finanzas.js");
            return [];
        }

        const datosCosteo = App.views.calcularCostoRealHamacas('todo').ordenes;
        const agrupado = {};

        // Agrupamos la rentabilidad por producto
        datosCosteo.forEach(item => {
            if (!agrupado[item.producto]) {
                agrupado[item.producto] = { 
                    nombre: item.producto, 
                    ventas: 0, 
                    costo_mat: 0, // Usaremos esto para el modal si es necesario
                    costo_mo: 0,  // Usaremos esto para el modal si es necesario
                    utilidad: 0, 
                    cantidad: 0 
                };
            }
            
            agrupado[item.producto].ventas += item.venta;
            agrupado[item.producto].costo_mat += item.costo_materiales;
            agrupado[item.producto].costo_mo += item.mano_obra;
            agrupado[item.producto].utilidad += item.utilidad;
            agrupado[item.producto].cantidad += item.cantidad;
        });

        // Retornamos el arreglo ordenado por los productos que dejan más ganancia neta
        return Object.values(agrupado).sort((a, b) => b.utilidad - a.utilidad);
    },

    generarReporteTopProductos() {
        const stats = {};

        (App.state.pedido_detalle || []).forEach((detalle) => {
            const pedido = (App.state.pedidos || []).find(p => p.id === detalle.pedido_id);
            if (!pedido || pedido.cliente_id === "STOCK_INTERNO") return;

            const producto = (App.state.productos || []).find(p => p.id === detalle.producto_id);
            if (!producto) return;

            if (!stats[producto.id]) {
                stats[producto.id] = {
                    nombre: producto.nombre,
                    cantidad: 0,
                    ingresos: 0
                };
            }

            const cantidadDetalle = parseInt(detalle.cantidad || 1);
            const precioUnitario = parseFloat(detalle.precio_unitario || 0);

            stats[producto.id].cantidad += cantidadDetalle;
            stats[producto.id].ingresos += cantidadDetalle * precioUnitario;
        });

        return Object.values(stats).sort((a, b) => b.cantidad - a.cantidad);
    },

    generarReporteComprasProv() {
        const stats = {};

        (App.state.compras || []).forEach((compra) => {
            const prov = (App.state.proveedores || []).find(p => p.id === compra.proveedor_id);
            const nombre = prov ? prov.nombre : "Desconocido";

            if (!stats[nombre]) {
                stats[nombre] = {
                    nombre,
                    total_comprado: 0,
                    deuda: 0
                };
            }

            const total = parseFloat(compra.total || 0);
            const pagado = compra.monto_pagado !== undefined && compra.monto_pagado !== ""
                ? parseFloat(compra.monto_pagado)
                : total;

            stats[nombre].total_comprado += total;
            stats[nombre].deuda += (total - pagado);
        });

        return Object.values(stats).sort((a, b) => b.total_comprado - a.total_comprado);
    }
});
