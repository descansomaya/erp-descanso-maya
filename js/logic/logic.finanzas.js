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
                mes_actual: "Este Mes",
                mes_pasado: "Mes Pasado",
                trimestre_actual: "Este Trimestre",
                anio_actual: "Este Año"
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

        // =========================
        // Ventas y reparaciones
        // =========================
        (App.state.pedidos || []).forEach(p => {
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

        (App.state.reparaciones || []).forEach(r => {
            const clase = clasificarFecha(r.fecha_creacion);
            if (clase === "fuera") return;

            metrics[clase].ventas += parseFloat(r.precio || 0);
            metrics[clase].ingresos += parseFloat(r.anticipo || 0);

            if (clase === "actual") {
                metrics.actual.desglVentas["Reparaciones"] = (metrics.actual.desglVentas["Reparaciones"] || 0) + parseFloat(r.precio || 0);
            }
        });

        (App.state.abonos || []).forEach(a => {
            const clase = clasificarFecha(a.fecha);
            if (clase !== "fuera") {
                metrics[clase].ingresos += parseFloat(a.monto || 0);
            }
        });

        // =========================
        // Gastos
        // =========================
        (App.state.gastos || []).forEach(g => {
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

        // =========================
        // CxC / CxP globales
        // =========================
        let xCobrarGlobal = 0;
        let xPagarGlobal = 0;

        (App.state.pedidos || []).forEach(p => {
            const abs = (App.state.abonos || [])
                .filter(a => a.pedido_id === p.id)
                .reduce((s, a) => s + parseFloat(a.monto || 0), 0);

            const sal = parseFloat(p.total || 0) - parseFloat(p.anticipo || 0) - abs;
            if (sal > 0) xCobrarGlobal += sal;
        });

        (App.state.reparaciones || []).forEach(r => {
            const sal = parseFloat(r.precio || 0) - parseFloat(r.anticipo || 0);
            if (sal > 0) xCobrarGlobal += sal;
        });

        (App.state.pago_artesanos || []).forEach(pa => {
            if (pa.estado === "pendiente") xPagarGlobal += parseFloat(pa.total || 0);
        });

        (App.state.compras || []).forEach(c => {
            const pagado = c.monto_pagado !== undefined && c.monto_pagado !== ""
                ? parseFloat(c.monto_pagado)
                : parseFloat(c.total || 0);

            const deuda = parseFloat(c.total || 0) - pagado;
            if (deuda > 0) xPagarGlobal += deuda;
        });

        const getTendencia = (act, prev, inverso = false) => {
            if (filtro === "todo" || filtro === "custom") return "";

            if (prev === 0 && act === 0) {
                return `<span style="font-size:0.7rem; color:#718096; margin-left:5px;">Igual</span>`;
            }

            if (prev === 0 && act > 0) {
                return `<span style="font-size:0.7rem; color:${inverso ? "#E53E3E" : "#38A169"}; margin-left:5px;">⬆️ 100%</span>`;
            }

            const varPorc = ((act - prev) / prev) * 100;
            const dir = varPorc >= 0 ? "⬆️" : "⬇️";
            let color = "#718096";

            if (varPorc > 0) color = inverso ? "#E53E3E" : "#38A169";
            else if (varPorc < 0) color = inverso ? "#38A169" : "#E53E3E";

            return `<span style="font-size:0.7rem; color:${color}; margin-left:5px; font-weight:bold;">${dir} ${Math.abs(varPorc).toFixed(1)}% vs ant.</span>`;
        };

        const act = metrics.actual;
        const prev = metrics.previo;
        const etiquetaFiltro = obtenerEtiquetaFiltro();

        let html = `
            <p style="color:var(--text-muted); font-size:0.85rem; margin-top:-10px; margin-bottom:15px; text-transform:uppercase; font-weight:bold;">
                Periodo: <strong style="color:var(--primary);">${etiquetaFiltro}</strong>
            </p>
        `;

        html += `
            <h4 style="margin-bottom:10px; color:#2D3748; font-size:0.9rem;">1. Rendimiento del Periodo</h4>
            <div class="grid-2">
                <div class="card stat-card" style="background:#EBF8FF; cursor:pointer; padding:15px;" onclick="App.views.detalleFinanzas('ventas', '${filtro}')">
                    <div class="label" style="margin-bottom:2px;">Ventas Totales (Comercial)</div>
                    <div class="value" style="color:#3182CE; font-size:1.3rem;">$${act.ventas.toFixed(2)}</div>
                    ${getTendencia(act.ventas, prev.ventas)}
                </div>
                <div class="card stat-card" style="background:#C6F6D5; cursor:pointer; padding:15px;" onclick="App.views.detalleFinanzas('ingresos', '${filtro}')">
                    <div class="label" style="margin-bottom:2px; color:#276749;">Ingresos Reales (Caja)</div>
                    <div class="value" style="color:#2F855A; font-size:1.3rem;">$${act.ingresos.toFixed(2)}</div>
                    ${getTendencia(act.ingresos, prev.ingresos)}
                </div>
                <div class="card stat-card" style="background:#EDF2F7; cursor:pointer; padding:15px; grid-column: span 2;" onclick="App.views.detalleFinanzas('gastos', '${filtro}')">
                    <div class="label" style="margin-bottom:2px;">Gastos Operativos (Pagados)</div>
                    <div class="value" style="color:#4A5568; font-size:1.3rem;">$${act.gastos.toFixed(2)}</div>
                    ${getTendencia(act.gastos, prev.gastos, true)}
                </div>
            </div>

            <div class="card stat-card" style="margin-top:10px; border:2px solid ${act.neto >= 0 ? '#38A169' : '#E53E3E'}; margin-bottom:25px; padding:15px;">
                <div class="label" style="color:${act.neto >= 0 ? '#276749' : '#9B2C2C'};">Flujo Neto Efectivo (Caja)</div>
                <div class="value" style="color:${act.neto >= 0 ? '#38A169' : '#E53E3E'}; font-size:1.5rem;">$${act.neto.toFixed(2)}</div>
                ${getTendencia(act.neto, prev.neto)}
            </div>
        `;

        html += `
            <h4 style="margin-bottom:10px; color:#2D3748; font-size:0.9rem;">2. Salud Financiera Actual (Global)</h4>
            <div class="grid-2" style="margin-bottom:20px;">
                <div class="card stat-card" style="background:#FEFCBF; cursor:pointer; padding:15px;" onclick="App.views.detalleFinanzas('por_cobrar', 'todo')">
                    <div class="label" style="color:#B7791F;">Cuentas por Cobrar (CxC)</div>
                    <div class="value" style="color:#D69E2E; font-size:1.2rem;">$${xCobrarGlobal.toFixed(2)}</div>
                    <div style="font-size:0.7rem; color:#B7791F; margin-top:5px;">Dinero en la calle</div>
                </div>
                <div class="card stat-card" style="background:#FFF5F5; cursor:pointer; padding:15px;" onclick="App.views.detalleFinanzas('por_pagar', 'todo')">
                    <div class="label" style="color:#C53030;">Cuentas por Pagar (CxP)</div>
                    <div class="value" style="color:#E53E3E; font-size:1.2rem;">$${xPagarGlobal.toFixed(2)}</div>
                    <div style="font-size:0.7rem; color:#C53030; margin-top:5px;">Deuda proveedores/taller</div>
                </div>
            </div>
        `;

        html += `
            <div style="background:white; border:1px solid #e2e8f0; border-radius:8px; padding:15px;">
                <canvas id="graficaFinanzas"></canvas>
            </div>

            <div style="display:flex; flex-direction:column; gap:15px; margin-top:15px;">
                <div style="background:white; border:1px solid #e2e8f0; border-radius:8px; padding:15px; display:flex; flex-direction:column; align-items:center;">
                    <h4 style="text-align:center; margin-bottom:15px; color:var(--text-muted); font-size:0.9rem;">Categorías de Venta 📈</h4>
                    <div style="position:relative; width:100%; max-width:280px; aspect-ratio:1;">
                        <canvas id="graficaVentasCanvas"></canvas>
                    </div>
                </div>

                <div style="background:white; border:1px solid #e2e8f0; border-radius:8px; padding:15px; display:flex; flex-direction:column; align-items:center;">
                    <h4 style="text-align:center; margin-bottom:15px; color:var(--text-muted); font-size:0.9rem;">Destino de los Gastos 📉</h4>
                    <div style="position:relative; width:100%; max-width:280px; aspect-ratio:1;">
                        <canvas id="graficaGastosCanvas"></canvas>
                    </div>
                </div>
            </div>

            <button class="btn btn-secondary" style="width:100%; margin-top:15px; border-color:#38A169; color:#38A169; font-weight:bold; background:transparent;" onclick="window.exportarAExcel(App.state.gastos, 'Gastos_${etiquetaFiltro.replace(/ /g, "_")}')">
                📥 Exportar Gastos a Excel
            </button>
        `;

        cont.innerHTML = html;

        setTimeout(() => {
            if (!window.Chart) return;

            const colores = ["#4C51BF", "#ED8936", "#38B2AC", "#E53E3E", "#ECC94B", "#805AD5", "#3182CE"];

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
                    ctx.shadowColor = "rgba(0,0,0,0.6)";
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
                        labels: ["Ingresos Caja", "Salidas Caja"],
                        datasets: [{
                            label: "Monto ($)",
                            data: [act.ingresos, act.gastos],
                            backgroundColor: ["#38A169", "#E53E3E"],
                            borderRadius: 4
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
