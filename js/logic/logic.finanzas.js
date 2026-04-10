// ==========================================
// LÓGICA: FINANZAS Y GASTOS
// ==========================================

window.App = window.App || {};
App.logic = App.logic || {};

Object.assign(App.logic, {
    async guardarMultiplesGastos(datos) {
        try {
            App.ui.showLoader("Registrando gastos...");

            const descripciones = Array.isArray(datos["descripcion[]"])
                ? datos["descripcion[]"]
                : (datos["descripcion[]"] ? [datos["descripcion[]"]] : []);

            const montos = Array.isArray(datos["monto[]"])
                ? datos["monto[]"]
                : (datos["monto[]"] ? [datos["monto[]"]] : []);

            const operaciones = [];
            const nuevosGastos = [];

            for (let i = 0; i < descripciones.length; i++) {
                if (!descripciones[i]) continue;

                const gastoObj = {
                    id: "GAS-" + Date.now() + "-" + i,
                    categoria: datos.categoria,
                    descripcion: descripciones[i],
                    monto: parseFloat(montos[i] || 0),
                    fecha: datos.fecha
                };

                nuevosGastos.push(gastoObj);

                operaciones.push({
                    action: "guardar_fila",
                    nombreHoja: "gastos",
                    datos: gastoObj
                });
            }

            const res = await App.api.fetch("ejecutar_lote", { operaciones });
            App.ui.hideLoader();

            if (res.status === "success") {
                if (!Array.isArray(App.state.gastos)) App.state.gastos = [];
                App.state.gastos.push(...nuevosGastos);

                App.ui.toast("¡Gastos registrados!");
                App.router.handleRoute();
            } else {
                App.ui.toast(res.message || "Error al registrar gastos", "danger");
            }
        } catch (error) {
            console.error("Error en guardarMultiplesGastos:", error);
            App.ui.hideLoader();
            App.ui.toast(error.message || "Error al registrar gastos", "danger");
        }
    },

    renderGraficasFinanzas(filtro) {
        const cont = document.getElementById("finanzas-contenedor");
        if (!cont) return;

        const hoy = new Date();
        const mesActual = hoy.getMonth();
        const anioActual = hoy.getFullYear();

        const inputDesde = document.getElementById("fecha-desde");
        const inputHasta = document.getElementById("fecha-hasta");
        const fechaDesde = inputDesde ? inputDesde.value : null;
        const fechaHasta = inputHasta ? inputHasta.value : null;

        const metrics = {
            actual: {
                ventas: 0,
                ingresos: 0,
                gastos: 0,
                neto: 0,
                desglGastos: {},
                desglVentas: {}
            },
            previo: {
                ventas: 0,
                ingresos: 0,
                gastos: 0,
                neto: 0
            }
        };

        const clasificarFecha = (fechaStr) => {
            if (!fechaStr) return "fuera";
            const f = new Date(fechaStr);
            if (isNaN(f.getTime())) return "fuera";

            if (filtro === "custom") {
                if (!fechaDesde || !fechaHasta) return "actual";
                const dInicio = new Date(fechaDesde + "T00:00:00");
                const dFin = new Date(fechaHasta + "T23:59:59");
                return (f >= dInicio && f <= dFin) ? "actual" : "fuera";
            }

            const m = f.getMonth();
            const a = f.getFullYear();

            if (filtro === "todo") return "actual";

            if (filtro === "mes_actual") {
                if (a === anioActual && m === mesActual) return "actual";
                let mesPrev = mesActual - 1;
                let anioPrev = anioActual;
                if (mesPrev < 0) { mesPrev = 11; anioPrev--; }
                if (a === anioPrev && m === mesPrev) return "previo";
            }

            if (filtro === "mes_pasado") {
                let mesPrev = mesActual - 1;
                let anioPrev = anioActual;
                if (mesPrev < 0) { mesPrev = 11; anioPrev--; }
                if (a === anioPrev && m === mesPrev) return "actual";

                let mesPrev2 = mesPrev - 1;
                let anioPrev2 = anioPrev;
                if (mesPrev2 < 0) { mesPrev2 = 11; anioPrev2--; }
                if (a === anioPrev2 && m === mesPrev2) return "previo";
            }

            if (filtro === "trimestre_actual") {
                const trimActual = Math.floor(mesActual / 3);
                const trimFecha = Math.floor(m / 3);

                if (a === anioActual && trimFecha === trimActual) return "actual";

                let trimPrev = trimActual - 1;
                let anioPrev = anioActual;
                if (trimPrev < 0) { trimPrev = 3; anioPrev--; }

                if (a === anioPrev && trimFecha === trimPrev) return "previo";
            }

            if (filtro === "anio_actual") {
                if (a === anioActual) return "actual";
                if (a === anioActual - 1) return "previo";
            }

            return "fuera";
        };

        const obtenerEtiquetaFiltro = () => {
            if (filtro === "custom") {
                return (fechaDesde && fechaHasta)
                    ? `Del ${fechaDesde} al ${fechaHasta}`
                    : "Rango Personalizado";
            }

            const labels = {
                todo: "Todo el historial",
                mes_actual: "Este mes",
                mes_pasado: "Mes pasado",
                trimestre_actual: "Este trimestre",
                anio_actual: "Este año"
            };

            return labels[filtro] || filtro;
        };

        const categorizarVenta = (nombreProducto) => {
            const cat = String(nombreProducto || "").toLowerCase();
            if (cat.includes("silla")) return "Sillas";
            if (cat.includes("cojin") || cat.includes("cojín")) return "Cojines";
            if (cat.includes("accesorio") || cat.includes("hilo")) return "Insumos/Accesorios";
            return "Hamacas";
        };

        const categorizarGastoNormal = (categoria, descripcion) => {
            const catOriginal = String(categoria || "").toLowerCase();
            const desc = String(descripcion || "").toLowerCase();

            if (catOriginal.includes("reventa") || desc.includes("reventa") || desc.includes("hamaca")) return "Hamacas (Reventa)";
            if (desc.includes("silla")) return "Sillas";
            if (desc.includes("cojin") || desc.includes("cojín")) return "Cojines";
            if (catOriginal.includes("accesorio") || desc.includes("accesorio") || desc.includes("argolla") || desc.includes("guardacabo") || desc.includes("madera") || desc.includes("palo")) return "Accesorios";
            if (catOriginal.includes("material") || desc.includes("hilo") || desc.includes("nylon") || desc.includes("algodon") || desc.includes("crochet")) return "Materiales (Hilos)";
            if (catOriginal.includes("nomina") || catOriginal.includes("nómina") || desc.includes("nomina") || desc.includes("artesano") || desc.includes("pago a")) return "Nómina Artesanos";
            if (catOriginal.includes("servicio") || desc.includes("luz") || desc.includes("agua") || desc.includes("renta")) return "Servicios y Otros";

            return "Otros Gastos";
        };

        (App.state.pedidos || []).forEach((p) => {
            const clase = clasificarFecha(p.fecha_creacion);
            if (clase === "fuera") return;

            metrics[clase].ventas += parseFloat(p.total || 0);
            metrics[clase].ingresos += parseFloat(p.anticipo || 0);

            if (clase === "actual") {
                const detalles = (App.state.pedido_detalle || []).filter(d => d.pedido_id === p.id);

                if (detalles.length === 0) {
                    metrics.actual.desglVentas["Hamacas"] = (metrics.actual.desglVentas["Hamacas"] || 0) + parseFloat(p.total || 0);
                } else {
                    const totalPedido = parseFloat(p.total || 0);
                    const totalCant = detalles.reduce((s, d) => s + (parseFloat(d.cantidad || 0) || 1), 0) || 1;

                    detalles.forEach(det => {
                        const prod = (App.state.productos || []).find(x => x.id === det.producto_id);
                        const key = categorizarVenta(prod ? prod.nombre : "Hamaca");
                        const proporcion = (parseFloat(det.cantidad || 0) || 1) / totalCant;
                        metrics.actual.desglVentas[key] = (metrics.actual.desglVentas[key] || 0) + (totalPedido * proporcion);
                    });
                }
            }
        });

        (App.state.reparaciones || []).forEach((r) => {
            const clase = clasificarFecha(r.fecha_creacion);
            if (clase === "fuera") return;

            metrics[clase].ventas += parseFloat(r.precio || 0);
            metrics[clase].ingresos += parseFloat(r.anticipo || 0);

            if (clase === "actual") {
                metrics.actual.desglVentas["Reparaciones"] = (metrics.actual.desglVentas["Reparaciones"] || 0) + parseFloat(r.precio || 0);
            }
        });

        (App.state.abonos || []).forEach((a) => {
            const clase = clasificarFecha(a.fecha);
            if (clase !== "fuera") {
                metrics[clase].ingresos += parseFloat(a.monto || 0);
            }
        });

        (App.state.gastos || []).forEach((g) => {
            const clase = clasificarFecha(g.fecha);
            if (clase === "fuera") return;

            const montoGasto = parseFloat(g.monto || 0);
            metrics[clase].gastos += montoGasto;

            if (clase !== "actual") return;

            let isCompra = false;
            const desc = String(g.descripcion || "").toLowerCase();
            const compraIdMatch = desc.match(/(com-\d+)/i);

            if (compraIdMatch) {
                const compraId = compraIdMatch[1].toUpperCase();
                const compra = (App.state.compras || []).find(c => c.id === compraId);

                if (compra && compra.detalles) {
                    isCompra = true;

                    try {
                        const detalles = JSON.parse(compra.detalles);
                        const subTotales = {};
                        let totalCompraCalc = 0;

                        detalles.forEach(d => {
                            const mat = (App.state.inventario || []).find(m => m.id === d.mat_id);
                            const dNombre = String(d.nombre || "").toLowerCase();
                            const dTipo = mat ? String(mat.tipo || "").toLowerCase() : "";

                            let catAsignada = "Materiales (Hilos)";
                            if (dTipo === "reventa" || dNombre.includes("reventa") || dNombre.includes("hamaca")) catAsignada = "Hamacas (Reventa)";
                            else if (dNombre.includes("silla")) catAsignada = "Sillas";
                            else if (dNombre.includes("cojin") || dNombre.includes("cojín")) catAsignada = "Cojines";
                            else if (dTipo === "accesorio" || dNombre.includes("accesorio") || dNombre.includes("argolla") || dNombre.includes("guardacabo") || dNombre.includes("madera")) catAsignada = "Accesorios";

                            const costoFila = parseFloat(d.cantidad || 0) * parseFloat(d.costo_unitario || 0);
                            subTotales[catAsignada] = (subTotales[catAsignada] || 0) + costoFila;
                            totalCompraCalc += costoFila;
                        });

                        if (totalCompraCalc > 0) {
                            Object.keys(subTotales).forEach(cat => {
                                const proporcion = subTotales[cat] / totalCompraCalc;
                                metrics.actual.desglGastos[cat] = (metrics.actual.desglGastos[cat] || 0) + (montoGasto * proporcion);
                            });
                        } else {
                            metrics.actual.desglGastos["Materiales (Hilos)"] = (metrics.actual.desglGastos["Materiales (Hilos)"] || 0) + montoGasto;
                        }
                    } catch (e) {
                        metrics.actual.desglGastos["Materiales (Hilos)"] = (metrics.actual.desglGastos["Materiales (Hilos)"] || 0) + montoGasto;
                    }
                }
            }

            if (!isCompra) {
                const catAsignada = categorizarGastoNormal(g.categoria, g.descripcion);
                metrics.actual.desglGastos[catAsignada] = (metrics.actual.desglGastos[catAsignada] || 0) + montoGasto;
            }
        });

        metrics.actual.neto = metrics.actual.ingresos - metrics.actual.gastos;
        metrics.previo.neto = metrics.previo.ingresos - metrics.previo.gastos;

        let xCobrarGlobal = 0;
        let xPagarGlobal = 0;

        (App.state.pedidos || []).forEach((p) => {
            const abs = (App.state.abonos || [])
                .filter(a => a.pedido_id === p.id)
                .reduce((s, a) => s + parseFloat(a.monto || 0), 0);

            const sal = parseFloat(p.total || 0) - parseFloat(p.anticipo || 0) - abs;
            if (sal > 0) xCobrarGlobal += sal;
        });

        (App.state.reparaciones || []).forEach((r) => {
            const sal = parseFloat(r.precio || 0) - parseFloat(r.anticipo || 0);
            if (sal > 0) xCobrarGlobal += sal;
        });

        (App.state.pago_artesanos || []).forEach((pa) => {
            if (pa.estado === "pendiente") xPagarGlobal += parseFloat(pa.total || 0);
        });

        (App.state.compras || []).forEach((c) => {
            const pagado = c.monto_pagado !== undefined && c.monto_pagado !== ""
                ? parseFloat(c.monto_pagado)
                : parseFloat(c.total || 0);

            const deuda = parseFloat(c.total || 0) - pagado;
            if (deuda > 0) xPagarGlobal += deuda;
        });

        const getTendencia = (act, prev, inverso = false) => {
            if (filtro === "todo" || filtro === "custom") return "";

            if (prev === 0 && act === 0) {
                return `<span class="dm-text-sm dm-muted">Sin cambio</span>`;
            }

            if (prev === 0 && act > 0) {
                return `<span class="dm-text-sm" style="color:${inverso ? "#E53E3E" : "#38A169"}; font-weight:700;">⬆ 100%</span>`;
            }

            const varPorc = ((act - prev) / prev) * 100;
            const dir = varPorc >= 0 ? "⬆" : "⬇";
            let color = "#718096";

            if (varPorc > 0) color = inverso ? "#E53E3E" : "#38A169";
            else if (varPorc < 0) color = inverso ? "#38A169" : "#E53E3E";

            return `<span class="dm-text-sm" style="color:${color}; font-weight:700;">${dir} ${Math.abs(varPorc).toFixed(1)}%</span>`;
        };

        const act = metrics.actual;
        const prev = metrics.previo;
        const etiquetaFiltro = obtenerEtiquetaFiltro();

        const colorNeto = act.neto >= 0 ? "var(--dm-success)" : "var(--dm-danger)";
        const colorNetoSoft = act.neto >= 0 ? "var(--dm-success-soft)" : "var(--dm-danger-soft)";

        let html = `
            <div class="dm-card dm-mb-4" style="background:linear-gradient(135deg, #ffffff 0%, #faf7ff 100%);">
                <div class="dm-row-between dm-wrap" style="align-items:flex-start; gap:12px;">
                    <div>
                        <div class="dm-text-sm dm-muted">Periodo analizado</div>
                        <div class="dm-fw-bold dm-text-lg">${etiquetaFiltro}</div>
                    </div>
                    <div class="dm-badge dm-badge-primary">Actualizado con datos vivos</div>
                </div>
            </div>

            <div class="dm-grid dm-grid-kpi dm-mb-4">
                <div class="dm-kpi" onclick="App.views.detalleFinanzas('ventas', '${filtro}')" style="cursor:pointer;">
                    <div class="dm-kpi-label">Ventas totales</div>
                    <div class="dm-kpi-value" style="color:#3182CE;">$${act.ventas.toFixed(2)}</div>
                    <div class="dm-kpi-meta">${getTendencia(act.ventas, prev.ventas)}</div>
                </div>

                <div class="dm-kpi" onclick="App.views.detalleFinanzas('ingresos', '${filtro}')" style="cursor:pointer;">
                    <div class="dm-kpi-label">Ingresos reales</div>
                    <div class="dm-kpi-value" style="color:#2F855A;">$${act.ingresos.toFixed(2)}</div>
                    <div class="dm-kpi-meta">${getTendencia(act.ingresos, prev.ingresos)}</div>
                </div>

                <div class="dm-kpi" onclick="App.views.detalleFinanzas('gastos', '${filtro}')" style="cursor:pointer;">
                    <div class="dm-kpi-label">Gastos pagados</div>
                    <div class="dm-kpi-value" style="color:#4A5568;">$${act.gastos.toFixed(2)}</div>
                    <div class="dm-kpi-meta">${getTendencia(act.gastos, prev.gastos, true)}</div>
                </div>

                <div class="dm-kpi" style="background:${colorNetoSoft}; border-color:transparent;">
                    <div class="dm-kpi-label">Flujo neto</div>
                    <div class="dm-kpi-value" style="color:${colorNeto};">$${act.neto.toFixed(2)}</div>
                    <div class="dm-kpi-meta">${getTendencia(act.neto, prev.neto)}</div>
                </div>
            </div>

            <div class="dm-grid dm-grid-2 dm-mb-4">
                <div class="dm-card" onclick="App.views.detalleFinanzas('por_cobrar', 'todo')" style="cursor:pointer; background:#FFFBEB;">
                    <div class="dm-kpi-label" style="color:#B7791F;">Cuentas por cobrar</div>
                    <div class="dm-kpi-value" style="color:#D69E2E; font-size:1.4rem;">$${xCobrarGlobal.toFixed(2)}</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Dinero pendiente con clientes</div>
                </div>

                <div class="dm-card" onclick="App.views.detalleFinanzas('por_pagar', 'todo')" style="cursor:pointer; background:#FFF5F5;">
                    <div class="dm-kpi-label" style="color:#C53030;">Cuentas por pagar</div>
                    <div class="dm-kpi-value" style="color:#E53E3E; font-size:1.4rem;">$${xPagarGlobal.toFixed(2)}</div>
                    <div class="dm-text-sm dm-muted dm-mt-2">Deuda con proveedores y taller</div>
                </div>
            </div>

            <div class="dm-card dm-mb-4">
                <div class="dm-card-header">
                    <div>
                        <div class="dm-card-title">Comparativo de caja</div>
                        <div class="dm-card-subtitle">Ingresos vs salidas del periodo</div>
                    </div>
                </div>
                <canvas id="graficaFinanzas"></canvas>
            </div>

            <div class="dm-grid dm-grid-2 dm-mb-4">
                <div class="dm-card">
                    <div class="dm-card-header">
                        <div>
                            <div class="dm-card-title">Categorías de venta</div>
                            <div class="dm-card-subtitle">Distribución comercial</div>
                        </div>
                    </div>
                    <div style="position:relative; width:100%; min-height:280px;">
                        <canvas id="graficaVentasCanvas"></canvas>
                    </div>
                </div>

                <div class="dm-card">
                    <div class="dm-card-header">
                        <div>
                            <div class="dm-card-title">Destino de gastos</div>
                            <div class="dm-card-subtitle">Distribución del gasto pagado</div>
                        </div>
                    </div>
                    <div style="position:relative; width:100%; min-height:280px;">
                        <canvas id="graficaGastosCanvas"></canvas>
                    </div>
                </div>
            </div>

            <div class="dm-card">
                <div class="dm-row-between dm-wrap" style="gap:12px;">
                    <div>
                        <div class="dm-card-title">Exportación rápida</div>
                        <div class="dm-card-subtitle">Descarga la base de gastos del periodo actual</div>
                    </div>
                    <button class="dm-btn dm-btn-secondary" style="border-color:#38A169; color:#38A169; background:transparent;" onclick="window.exportarAExcel(App.state.gastos, 'Gastos_${etiquetaFiltro.replace(/ /g, "_")}')">
                        📥 Exportar gastos
                    </button>
                </div>
            </div>
        `;

        cont.innerHTML = html;

        setTimeout(() => {
            if (!window.Chart) return;

            const colores = ["#4C51BF", "#ED8936", "#38B2AC", "#E53E3E", "#ECC94B", "#805AD5", "#3182CE", "#2F855A"];

            const totalVentasCat = Object.values(act.desglVentas).reduce((a, b) => a + b, 0);
            const labelsVentas = Object.keys(act.desglVentas).map(k =>
                `${k} (${totalVentasCat > 0 ? ((act.desglVentas[k] / totalVentasCat) * 100).toFixed(1) : 0}%)`
            );

            const totalGastosCat = Object.values(act.desglGastos).reduce((a, b) => a + b, 0);
            const labelsGastos = Object.keys(act.desglGastos).map(k =>
                `${k} (${totalGastosCat > 0 ? ((act.desglGastos[k] / totalGastosCat) * 100).toFixed(1) : 0}%)`
            );

            const pluginPorcentajes = {
                id: "pluginPorcentajes",
                afterDatasetsDraw(chart) {
                    const { ctx, data } = chart;
                    ctx.save();
                    ctx.font = "bold 12px sans-serif";
                    ctx.fillStyle = "white";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.shadowColor = "rgba(0,0,0,0.55)";
                    ctx.shadowBlur = 4;

                    const meta = chart.getDatasetMeta(0);
                    const total = data.datasets[0].data.reduce((a, b) => a + b, 0);

                    meta.data.forEach((element, index) => {
                        const val = data.datasets[0].data[index];
                        if (val > 0 && total > 0) {
                            const porcentaje = Math.round((val / total) * 100);
                            if (porcentaje > 4) {
                                const pos = element.tooltipPosition();
                                ctx.fillText(porcentaje + "%", pos.x, pos.y);
                            }
                        }
                    });

                    ctx.restore();
                }
            };

            const ctx1 = document.getElementById("graficaFinanzas");
            if (ctx1) {
                if (window.graficaActual) window.graficaActual.destroy();
                window.graficaActual = new Chart(ctx1, {
                    type: "bar",
                    data: {
                        labels: ["Ingresos caja", "Salidas caja"],
                        datasets: [{
                            label: "Monto ($)",
                            data: [act.ingresos, act.gastos],
                            backgroundColor: ["#38A169", "#E53E3E"],
                            borderRadius: 8
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { display: false } }
                    }
                });
            }

            const ctxV = document.getElementById("graficaVentasCanvas");
            if (ctxV) {
                if (window.graficaVentasD) window.graficaVentasD.destroy();
                window.graficaVentasD = new Chart(ctxV, {
                    type: "doughnut",
                    data: {
                        labels: labelsVentas,
                        datasets: [{
                            data: Object.values(act.desglVentas),
                            backgroundColor: colores
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: "bottom",
                                labels: { font: { size: 11 }, padding: 15 }
                            }
                        }
                    },
                    plugins: [pluginPorcentajes]
                });
            }

            const ctxG = document.getElementById("graficaGastosCanvas");
            if (ctxG) {
                if (window.graficaGastosD) window.graficaGastosD.destroy();
                window.graficaGastosD = new Chart(ctxG, {
                    type: "doughnut",
                    data: {
                        labels: labelsGastos,
                        datasets: [{
                            data: Object.values(act.desglGastos),
                            backgroundColor: colores
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: "bottom",
                                labels: { font: { size: 11 }, padding: 15 }
                            }
                        }
                    },
                    plugins: [pluginPorcentajes]
                });
            }
        }, 300);
    }
});
