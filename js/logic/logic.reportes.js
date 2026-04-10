// ==========================================
// LÓGICA: INTELIGENCIA DE NEGOCIOS Y REPORTES
// ==========================================

window.App = window.App || {};
App.logic = App.logic || {};

Object.assign(App.logic, {
    generarReporteRentabilidad() {
        const stats = {};

        (App.state.ordenes_produccion || []).forEach((orden) => {
            if (orden.estado !== "listo" || !orden.costos_finales) return;

            const detalle = (App.state.pedido_detalle || []).find(d => d.id === orden.pedido_detalle_id);
            if (!detalle) return;

            const producto = (App.state.productos || []).find(p => p.id === detalle.producto_id);
            if (!producto) return;

            try {
                const cf = JSON.parse(orden.costos_finales);

                if (parseFloat(cf.precio_venta || 0) <= 0) return;

                if (!stats[producto.id]) {
                    stats[producto.id] = {
                        nombre: producto.nombre,
                        ventas: 0,
                        costo_mat: 0,
                        costo_mo: 0,
                        utilidad: 0,
                        cantidad: 0
                    };
                }

                stats[producto.id].ventas += parseFloat(cf.precio_venta || 0);
                stats[producto.id].costo_mat += parseFloat(cf.materiales || 0);
                stats[producto.id].costo_mo += parseFloat(cf.mano_obra || 0);
                stats[producto.id].utilidad += parseFloat(cf.utilidad || 0);
                stats[producto.id].cantidad += 1;
            } catch (e) {
                console.warn("No se pudo interpretar costos_finales en orden:", orden.id, e);
            }
        });

        return Object.values(stats).sort((a, b) => b.utilidad - a.utilidad);
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
