window.App = window.App || {};
App.logic = App.logic || {};
App.logic.movimientos = App.logic.movimientos || {};

Object.assign(App.logic.movimientos, {
    generarId(prefijo = "MOV") {
        return `${prefijo}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    },

    toNumber(value, fallback = 0) {
        const n = parseFloat(value);
        return Number.isFinite(n) ? n : fallback;
    },

    normalizarTipo(tipo) {
        const t = String(tipo || "").toLowerCase().trim();
        if (["entrada", "salida", "ajuste"].includes(t)) return t;
        throw new Error(`Tipo de movimiento inválido: ${tipo}`);
    },

    normalizarMovimiento(data = {}) {
        const tipo = this.normalizarTipo(data.tipo);
        const cantidadBase = this.toNumber(data.cantidad, 0);

        if (cantidadBase <= 0) {
            throw new Error("La cantidad del movimiento debe ser mayor a 0");
        }

        const cantidadFirmada = tipo === "salida"
            ? -Math.abs(cantidadBase)
            : Math.abs(cantidadBase);

        const costoUnitario = this.toNumber(data.costo_unitario, 0);

        return {
            id: data.id || this.generarId("MOV"),
            fecha: data.fecha || new Date().toISOString().split("T")[0],
            tipo_movimiento: data.tipo_movimiento || "ajuste_manual",
            origen: data.origen || "sistema",
            origen_id: data.origen_id || "",
            ref_tipo: data.ref_tipo || "material",
            ref_id: data.ref_id || data.material_id || "",
            material_id: data.material_id || data.ref_id || "",
            tipo,
            cantidad: cantidadFirmada,
            costo_unitario: costoUnitario,
            total: cantidadFirmada * costoUnitario,
            motivo: data.motivo || "",
            notas: data.notas || ""
        };
    },

    calcularNuevoStock(stockActual, cantidadFirmada) {
        return this.toNumber(stockActual, 0) + this.toNumber(cantidadFirmada, 0);
    },

    crearOperacionMovimiento(data = {}) {
        const movimiento = this.normalizarMovimiento(data);

        const material = (App.state?.inventario || []).find(m => m.id === movimiento.material_id);
        if (!material) {
            throw new Error(`Material no encontrado: ${movimiento.material_id}`);
        }

        const stockActual = this.toNumber(material.stock_real, 0);
        const nuevoStock = this.calcularNuevoStock(stockActual, movimiento.cantidad);

        if (movimiento.tipo === "salida" && nuevoStock < 0) {
            throw new Error(
                `Stock insuficiente para ${material.nombre || movimiento.material_id}. Disponible: ${stockActual}, requerido: ${Math.abs(movimiento.cantidad)}`
            );
        }

        const operacionStock = {
            action: "actualizar_fila",
            nombreHoja: "materiales",
            idFila: material.id,
            datosNuevos: {
                stock_real: nuevoStock
            }
        };

        if (data.actualizar_costo_unitario === true) {
            operacionStock.datosNuevos.costo_unitario = movimiento.costo_unitario;
        }

        const operacionMovimiento = {
            action: "guardar_fila",
            nombreHoja: "movimientos_inventario",
            datos: movimiento
        };

        return {
            ok: true,
            materialId: material.id,
            materialNombre: material.nombre || material.id,
            stockAnterior: stockActual,
            stockNuevo: nuevoStock,
            movimiento,
            operacionStock,
            operacionMovimiento
        };
    },

    crearLoteMovimientos(lista = []) {
        const operaciones = [];
        const resultados = [];
        const acumulado = new Map();

        (Array.isArray(lista) ? lista : []).forEach(item => {
            const materialId = item.material_id || item.ref_id;
            if (!materialId) return;

            const key = [
                materialId,
                item.tipo || "",
                item.tipo_movimiento || "",
                item.origen || "",
                item.origen_id || "",
                item.motivo || ""
            ].join("|");

            if (!acumulado.has(key)) {
                acumulado.set(key, {
                    ...item,
                    cantidad: this.toNumber(item.cantidad, 0)
                });
            } else {
                const prev = acumulado.get(key);
                prev.cantidad = this.toNumber(prev.cantidad, 0) + this.toNumber(item.cantidad, 0);
            }
        });

        for (const item of acumulado.values()) {
            const resultado = this.crearOperacionMovimiento(item);
            resultados.push(resultado);
            operaciones.push(resultado.operacionStock, resultado.operacionMovimiento);
        }

        return {
            ok: true,
            resultados,
            operaciones,
            movimientos: resultados.map(r => r.movimiento)
        };
    },

    aplicarEnEstado(resultadoLote) {
        if (!resultadoLote || !Array.isArray(resultadoLote.resultados)) return;

        if (!Array.isArray(App.state.movimientos_inventario)) {
            App.state.movimientos_inventario = [];
        }

        resultadoLote.resultados.forEach(r => {
            const material = (App.state?.inventario || []).find(m => m.id === r.materialId);
            if (material) {
                material.stock_real = r.stockNuevo;
                if (r.operacionStock?.datosNuevos?.costo_unitario !== undefined) {
                    material.costo_unitario = r.operacionStock.datosNuevos.costo_unitario;
                }
            }

            App.state.movimientos_inventario.push(r.movimiento);
        });
    },

    buscarMovimientosPorOrigen(origenId, tipoMovimiento = null) {
        return (App.state?.movimientos_inventario || []).filter(m => {
            if (m.origen_id !== origenId) return false;
            if (!tipoMovimiento) return true;
            return m.tipo_movimiento === tipoMovimiento;
        });
    }
});
