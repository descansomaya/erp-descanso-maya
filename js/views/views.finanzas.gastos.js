window.App = window.App || {};
App.views = App.views || {};

App.views.formGasto = function () {
    const html = `
        <form id="dynamic-form">
            <div class="dm-form-group">
                <label>Concepto</label>
                <input class="dm-input" id="gasto-concepto" required>
            </div>
            <div class="dm-form-group">
                <label>Monto</label>
                <input type="number" class="dm-input" id="gasto-monto" required>
            </div>
            <button class="dm-btn dm-btn-primary" type="submit">Guardar</button>
        </form>
    `;

    App.ui.openSheet('Nuevo gasto', html, async () => {
        const concepto = document.getElementById('gasto-concepto').value;
        const monto = parseFloat(document.getElementById('gasto-monto').value || 0);

        await App.api.fetch('guardar_fila', {
            nombreHoja: 'gastos',
            datos: {
                id: 'GAS-' + Date.now(),
                concepto,
                monto,
                fecha: new Date().toISOString()
            }
        });

        App.ui.toast('Gasto guardado');
        App.router.handleRoute();
        return true;
    });
};