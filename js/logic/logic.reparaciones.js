// ==========================================
// LÓGICA: REPARACIONES
// ==========================================

window.App = window.App || {};
App.logic = App.logic || {};

Object.assign(App.logic, {
    async guardarReparacion(data) {
        try {
            App.ui.showLoader("Guardando reparación...");

            const nueva = {
                id: "REP-" + Date.now(),
                cliente_id: data.cliente_id,
                descripcion: data.descripcion || "",
                precio: parseFloat(data.precio || 0),
                anticipo: parseFloat(data.anticipo || 0),
                fecha_entrega: data.fecha_entrega || "",
                estado: data.estado || "pendiente",
                fecha_creacion: new Date().toISOString()
            };

            const res = await App.api.fetch("guardar_fila", {
                nombreHoja: "reparaciones",
                datos: nueva
            });

            App.ui.hideLoader();

            if (res.status === "success") {
                if (!Array.isArray(App.state.reparaciones)) App.state.reparaciones = [];
                App.state.reparaciones.push(nueva);
                App.ui.toast("Reparación guardada");
                App.router.handleRoute();
            } else {
                App.ui.toast(res.message || "Error al guardar reparación", "danger");
            }
        } catch (e) {
            console.error("Error en guardarReparacion:", e);
            App.ui.hideLoader();
            App.ui.toast(e.message || "Error al guardar reparación", "danger");
        }
    },

    async eliminarReparacion(id) {
        try {
            if (!confirm("⚠️ ¿Eliminar reparación?")) return;

            App.ui.showLoader("Eliminando reparación...");

            const operaciones = [
                { action: "eliminar_fila", nombreHoja: "reparaciones", idFila: id }
            ];

            const res = await App.api.fetch("ejecutar_lote", { operaciones });

            App.ui.hideLoader();

            if (res.status === "success") {
                App.state.reparaciones = (App.state.reparaciones || []).filter(r => r.id !== id);
                App.ui.toast("Reparación eliminada");
                App.router.handleRoute();
            } else {
                App.ui.toast(res.message || "Error al eliminar reparación", "danger");
            }
        } catch (e) {
            console.error("Error en eliminarReparacion:", e);
            App.ui.hideLoader();
            App.ui.toast(e.message || "Error al eliminar reparación", "danger");
        }
    }
});
