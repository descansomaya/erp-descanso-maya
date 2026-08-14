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
    const detalles = (App.state.pedido_detalle || [])
        .filter(d => d.pedido_id === pedido?.id);

    if (!detalles.length) return false;

    return detalles.every(detalle => {
        const producto = (App.state.productos || [])
            .find(p => p.id === detalle.producto_id);

        return producto &&
            String(producto.categoria || "")
                .toLowerCase()
                .trim() === "reventa";
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
    const estado = this.normalizar(pedido?.estado);

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
        !this.esStockInterno(pedido) &&
        this.estaEntregado(pedido) &&
        !this.esCancelado(pedido) &&
        !this.esDevuelto(pedido)
    );
};

// Alias compatible con la lógica anterior
App.logic.esVentaValidaVendedor = App.logic.estado.esVenta;

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
// HELPERS PARA LISTADOS
// ==========================================

App.logic.estado.ventasValidas = function(lista) {
    return (lista || []).filter(p => this.esVenta(p));
};

App.logic.estado.pedidosActivos = function(lista) {
    return (lista || []).filter(p => this.estaActivo(p));
};

App.logic.estado.pedidosEnCobranza = function(lista) {
    return (lista || []).filter(p => this.apareceEnCobranza(p));
};
