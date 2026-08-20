// ==========================================
// DESCANSO MAYA
// FUENTE CENTRAL DE ESTADOS Y REGLAS
// ==========================================

window.App = window.App || {};
App.logic = App.logic || {};
App.logic.estado = App.logic.estado || {};

const DM_ESTADOS_PEDIDO = {
    NUEVO: "nuevo",
    TALLER: "taller",
    LISTO: "listo para entregar",
    ENTREGADO: "entregado",
    CANCELADO: "cancelado",
    DEVUELTO: "devuelto"
};

App.logic.estado.normalizar = function(valor) {
    return String(valor || "")
        .toLowerCase()
        .trim();
};

// ==========================================
// TIPO DE PEDIDO
// ==========================================

App.logic.estado.esStockInterno = function(pedido) {
    return String(pedido?.cliente_id || "")
        .toUpperCase()
        .trim() === "STOCK_INTERNO";
};

App.logic.estado.esReventa = function(pedido) {

    if (!pedido) return false;

    // Un pedido interno nunca es una reventa,
    // aunque alguno de sus productos tenga categoría "reventa".
    if (this.esStockInterno(pedido)) {
        return false;
    }

    const detalles = (App.state.pedido_detalle || [])
        .filter(d =>
            String(d.pedido_id) === String(pedido.id)
        );

    if (!detalles.length) return false;

    return detalles.every(detalle => {

        const producto = (App.state.productos || [])
            .find(p =>
                String(p.id) === String(detalle.producto_id)
            );

        return producto &&
            String(producto.categoria || "")
                .toLowerCase()
                .trim() === "reventa";
    });
};

// ==========================================
// TIPO DE PRODUCTO / PRODUCCIÓN
// ==========================================

App.logic.estado.esProductoReventa = function(producto) {
    if (!producto) return false;

    return String(producto.categoria || "")
        .toLowerCase()
        .trim() === "reventa";
};

App.logic.estado.esProductoFabricacion = function(producto) {
    if (!producto) return false;

    const categoria = String(producto.categoria || "")
        .toLowerCase()
        .trim();

    return ["fabricacion", "fabricado"].includes(categoria);
};

App.logic.estado.requiereTallerPorProductos = function(listaProductos) {
    if (!Array.isArray(listaProductos) || !listaProductos.length) {
        return false;
    }

    return listaProductos.some(item => {
        const productoId = item?.producto_id || item?.id;

        const producto = (App.state.productos || [])
            .find(p => String(p.id) === String(productoId));

        return this.esProductoFabricacion(producto);
    });
};

// ==========================================
// ESTADOS OPERATIVOS
// ==========================================

App.logic.estado.esCancelado = function(pedido) {
    return this.normalizar(pedido?.estado) === DM_ESTADOS_PEDIDO.CANCELADO;
};

App.logic.estado.esDevuelto = function(pedido) {
    return this.normalizar(pedido?.estado) === DM_ESTADOS_PEDIDO.DEVUELTO;
};

App.logic.estado.estaEntregado = function(pedido) {
    return this.normalizar(pedido?.estado) === DM_ESTADOS_PEDIDO.ENTREGADO;
};

App.logic.estado.estaActivo = function(pedido) {
    if (!pedido) return false;

    if (this.esStockInterno(pedido)) return false;

    const estado = this.normalizar(pedido.estado);

    return ![
        DM_ESTADOS_PEDIDO.ENTREGADO,
        DM_ESTADOS_PEDIDO.CANCELADO,
        DM_ESTADOS_PEDIDO.DEVUELTO
    ].includes(estado);
};

// ==========================================
// VENTA
// ==========================================

App.logic.estado.esVenta = function(pedido) {
    if (!pedido) return false;

    return (
        !App.logic.estado.esStockInterno(pedido) &&
        App.logic.estado.estaEntregado(pedido) &&
        !App.logic.estado.esCancelado(pedido) &&
        !App.logic.estado.esDevuelto(pedido)
    );
};

// Alias compatible con la lógica anterior
App.logic.esVentaValidaVendedor = function(pedido) {
    return App.logic.estado.esVenta(pedido);
};

// ==========================================
// COBRANZA
// ==========================================

App.logic.estado.getResumenFinanciero = function(pedido) {
    if (!pedido) return null;

    const abonos = (App.state.abonos || [])
        .filter(a => String(a.pedido_id) === String(pedido.id));

    const total = parseFloat(pedido.total || 0) || 0;
    const anticipo = parseFloat(pedido.anticipo || 0) || 0;

    const totalAbonos = abonos.reduce(
        (sum, a) => sum + (parseFloat(a.monto || 0) || 0),
        0
    );

    const pagado = anticipo + totalAbonos;
    const saldo = Math.max(0, total - pagado);

    let estadoFinanciero = "pendiente";

    if (this.esCancelado(pedido)) {
        estadoFinanciero = "cancelado";
    } else if (this.esDevuelto(pedido)) {
        estadoFinanciero = "devuelto";
    } else if (saldo <= 0.05) {
        estadoFinanciero = "liquidado";
    } else if (pagado > 0.05) {
        estadoFinanciero = "parcial";
    }

    return {
        pedido,
        total,
        anticipo,
        abonos: totalAbonos,
        pagado,
        saldo,
        estadoFinanciero
    };
};

App.logic.estado.apareceEnCobranza = function(pedido) {
    if (!pedido) return false;

    if (this.esStockInterno(pedido)) return false;
    if (this.esCancelado(pedido)) return false;
    if (this.esDevuelto(pedido)) return false;

    const resumen = this.getResumenFinanciero(pedido);

    return resumen && resumen.saldo > 0.05;
};

// ==========================================
// COBROS VÁLIDOS PARA FINANZAS
// ==========================================

App.logic.estado.cuentaComoCobro = function(pedido) {
    if (!pedido) return false;

    if (this.esStockInterno(pedido)) return false;
    if (this.esCancelado(pedido)) return false;
    if (this.esDevuelto(pedido)) return false;

    return true;
};

// ==========================================
// REGLAS PARA VENDEDORES
// ==========================================

App.logic.estado.cuentaParaVendedor = function(pedido) {
    return this.esVenta(pedido);
};

App.logic.estado.cuentaComision = function(pedido) {
    return (
        this.esVenta(pedido) &&
        (parseFloat(pedido.comision || 0) || 0) > 0
    );
};

// ==========================================
// REGLAS PARA FINANZAS
// ==========================================

App.logic.estado.cuentaParaFinanzas = function(pedido) {
    return this.esVenta(pedido);
};

// ==========================================
// REGLAS DE PEDIDO
// ==========================================

App.logic.estado.puedeEliminar = function(pedido) {
    if (!pedido) return false;

    const estado = this.normalizar(pedido.estado);

    if ([
        DM_ESTADOS_PEDIDO.ENTREGADO,
        DM_ESTADOS_PEDIDO.CANCELADO,
        DM_ESTADOS_PEDIDO.DEVUELTO
    ].includes(estado)) {
        return false;
    }

    // Reventa lista para entregar sí puede eliminarse
    if (
        estado === DM_ESTADOS_PEDIDO.LISTO &&
        this.esReventa(pedido)
    ) {
        return true;
    }

    // Pedido fabricado listo ya pasó por Taller
    if (
        estado === DM_ESTADOS_PEDIDO.LISTO &&
        !this.esReventa(pedido)
    ) {
        return false;
    }

    return [
        DM_ESTADOS_PEDIDO.NUEVO,
        "pendiente",
        DM_ESTADOS_PEDIDO.TALLER
    ].includes(estado);
};

App.logic.estado.puedeEntregar = function(pedido) {
    if (!pedido) return false;

    const estado = this.normalizar(pedido.estado);

    return (
        estado === DM_ESTADOS_PEDIDO.LISTO
    );
};

App.logic.estado.puedeDevolver = function(pedido) {
    return this.estaEntregado(pedido);
};

App.logic.estado.puedeCancelar = function(pedido) {
    if (!pedido) return false;

    const estado = this.normalizar(pedido.estado);

    return ![
        DM_ESTADOS_PEDIDO.ENTREGADO,
        DM_ESTADOS_PEDIDO.CANCELADO,
        DM_ESTADOS_PEDIDO.DEVUELTO
    ].includes(estado);
};

// ==========================================
// REGLAS DE PRODUCCIÓN
// ==========================================

App.logic.estado.estaProduccionActiva = function(orden) {
    if (!orden) return false;

    const estado = this.normalizar(orden.estado);

    return [
        "pendiente",
        "proceso"
    ].includes(estado);
};

App.logic.estado.produccionesActivas = function(lista) {
    return (lista || []).filter(orden =>
        this.estaProduccionActiva(orden)
    );
};

// ==========================================
// HELPERS PARA LISTADOS
// ==========================================

App.logic.estado.ventasValidas = function(lista) {
    return (lista || []).filter(p => this.esVenta(p));
};

App.logic.estado.pedidosActivos = function(lista) {
    return (lista || []).filter(p => this.estaActivo(p));
};

// ==========================================
// RESUMEN OPERATIVO
// ==========================================

App.logic.estado.pedidosPorEstado = function(lista, estado) {
    const estadoNormalizado = this.normalizar(estado);

    return (lista || []).filter(p =>
        this.estaActivo(p) &&
        this.normalizar(p?.estado) === estadoNormalizado
    );
};

App.logic.estado.pedidosNuevos = function(lista) {
    return this.pedidosPorEstado(
        lista,
        DM_ESTADOS_PEDIDO.NUEVO
    );
};

App.logic.estado.pedidosEnTaller = function(lista) {
    return this.pedidosPorEstado(
        lista,
        DM_ESTADOS_PEDIDO.TALLER
    );
};

App.logic.estado.pedidosListos = function(lista) {
    return this.pedidosPorEstado(
        lista,
        DM_ESTADOS_PEDIDO.LISTO
    );
};

App.logic.estado.getResumenOperativo = function(lista) {
    const pedidos = lista || [];

    const activos = this.pedidosActivos(pedidos);

    const nuevos = this.pedidosNuevos(pedidos);
    const taller = this.pedidosEnTaller(pedidos);
    const listos = this.pedidosListos(pedidos);

    return {
        activos: activos.length,
        nuevos: nuevos.length,
        taller: taller.length,
        listos: listos.length
    };
};

App.logic.estado.pedidosEnCobranza = function(lista) {
    return (lista || []).filter(p => this.apareceEnCobranza(p));
};
