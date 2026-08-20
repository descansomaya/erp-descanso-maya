window.App=window.App||{};App.logic=App.logic||{};App.views=App.views||{};
(function(){
const money=n=>'$'+((parseFloat(n||0)||0).toFixed(2));
const original=App.views.finanzas;
if(typeof original!=='function') return;
App.views.finanzas=function(){
    const html=original.apply(this,arguments);
    const filtro=App.state.finanzasFiltro||'mes_actual';
    const resumen=typeof App.logic.obtenerResumenFinancieroCentral==='function'
        ? App.logic.obtenerResumenFinancieroCentral(filtro)
        : null;
    if(!resumen) return html;
    const salidasReales=parseFloat(resumen.salidasRegistradas||0)||0;
    return html.replace(
        /(<div class=\"dm-kpi-label\">Salidas registradas<\\/div><div class=\"dm-kpi-value\">)\\$[0-9,.]+(<\\/div>)/,
        '$1'+money(salidasReales)+'$2'
    );
};
})();
