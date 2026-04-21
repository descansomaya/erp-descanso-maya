// PATCH: agregar módulos faltantes

App.views.formGasto = function(){
  const html = `
    <form id="form-gasto">
      <div id="gastos-wrap"></div>
      <button type="button" class="dm-btn" onclick="addRow()">+ Agregar</button>
      <button type="submit" class="dm-btn dm-btn-primary">Guardar</button>
    </form>
    <script>
      function addRow(){
        const row = `
          <div class='row'>
            <input class='c' placeholder='Concepto'/>
            <input class='m' type='number' placeholder='Monto'/>
          </div>`;
        document.getElementById('gastos-wrap').insertAdjacentHTML('beforeend',row);
      }
      addRow();
      document.getElementById('form-gasto').onsubmit=async(e)=>{
        e.preventDefault();
        const rows=[...document.querySelectorAll('.row')].map(r=>({
          concepto:r.querySelector('.c').value,
          monto:parseFloat(r.querySelector('.m').value||0)
        })).filter(x=>x.concepto && x.monto>0);
        if(!rows.length){alert('Agrega gastos');return}
        const ops=rows.map((r,i)=>({action:'guardar_fila',nombreHoja:'gastos',datos:{id:'GAS-'+Date.now()+'-'+i,fecha:new Date().toISOString(),...r}}));
        await App.api.fetch('ejecutar_lote',{operaciones:ops});
        location.reload();
      }
    <\/script>
  `;
  App.ui.openSheet('Gastos',html);
};

App.views.nomina = function(){
  const pagos=App.state.pago_artesanos||[];
  const pendientes=pagos.filter(p=>p.estado==='pendiente');
  return `
    <div class='dm-section'>
      <h3>Nómina</h3>
      <div>Pendiente: ${pendientes.length}</div>
      ${pendientes.map(p=>`<div>${p.artesano_id} - $${p.total}</div>`).join('')}
    </div>
  `;
};