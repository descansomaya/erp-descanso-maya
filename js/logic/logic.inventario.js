// ==========================================
// LÓGICA: INVENTARIO, COMPRAS Y CUENTAS POR PAGAR
// ==========================================

window.App = window.App || {};
App.logic = App.logic || {};

Object.assign(App.logic, {

    async eliminarCompra(id) {
        try {
            if (!confirm("⚠️ ¿Eliminar compra? Se revertirá el inventario automáticamente.")) return;

            App.ui.showLoader("Revirtiendo compra...");

            const operaciones = [
                { action: "eliminar_fila", nombreHoja: "compras", idFila: id }
            ];

            // 🔥 REVERSA AUTOMÁTICA
            const resultadoReversa = App.logic.movimientos.revertirMovimientosPorOrigen(id, {
                origen: "reversa_compra",
                tipo_movimiento_reversa: "reversa_compra",
                motivo: "Cancelación de compra"
            });

            operaciones.push(...resultadoReversa.operaciones);

            // eliminar movimientos originales
            operaciones.push(...App.logic.movimientos.eliminarMovimientosOriginalesPorOrigen(id));

            const gastosAsociados = (App.state.gastos || []).filter(g => String(g.descripcion || "").includes(id));
            gastosAsociados.forEach(g => {
                operaciones.push({ action: "eliminar_fila", nombreHoja: "gastos", idFila: g.id });
            });

            const abonosAsociados = (App.state.abonos_proveedores || []).filter(a => a.compra_id === id);
            abonosAsociados.forEach(ab => {
                operaciones.push({ action: "eliminar_fila", nombreHoja: "abonos_proveedores", idFila: ab.id });
            });

            const res = await App.api.fetch("ejecutar_lote", { operaciones });
            App.ui.hideLoader();

            if (res.status === "success") {
                App.logic.movimientos.aplicarEnEstado(resultadoReversa);

                App.state.compras = (App.state.compras || []).filter(c => c.id !== id);
                App.state.gastos = (App.state.gastos || []).filter(g => !String(g.descripcion || "").includes(id));
                App.state.movimientos_inventario = (App.state.movimientos_inventario || []).filter(m => m.origen_id !== id);
                App.state.abonos_proveedores = (App.state.abonos_proveedores || []).filter(a => a.compra_id !== id);

                App.ui.toast("Compra revertida correctamente");
                App.router.handleRoute();
                App.logic.revisarAlertasStock();
            } else {
                App.ui.toast(res.message || "Error al revertir compra", "danger");
            }
        } catch (error) {
            console.error("Error en eliminarCompra:", error);
            App.ui.hideLoader();
            App.ui.toast(error.message || "Error al eliminar compra", "danger");
        }
    }
});
