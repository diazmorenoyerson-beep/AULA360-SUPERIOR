/* AULA360 — Banco con IA (administrador): enciende la generación diaria y muestra el avance. */
window.BIA=(function(){
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let Z={d:null,t:null};
async function load(){
  clearInterval(Z.t);
  const r=await sb.rpc('banco_ia_resumen');if(r.error)throw r.error;Z.d=r.data;
  Z.t=setInterval(async()=>{if(tab!=='bancoia'){clearInterval(Z.t);return}try{const q=await sb.rpc('banco_ia_resumen');if(!q.error){Z.d=q.data;render()}}catch(x){}},30000);
}
function view(){
  const d=Z.d;if(!d)return'<div class="aic-card" style="padding:16px">Cargando…</div>';
  const c=d.config||{},min=c.por_asignatura||50;
  const tot=d.filas.reduce((a,x)=>a+Number(x.hoy),0),meta=d.filas.length*min;
  const pct=meta?Math.min(100,Math.round(100*tot/meta)):0;
  const areas={};d.filas.forEach(x=>{areas[x.area]=(areas[x.area]||0)+Number(x.hoy)});
  return`<div style="display:grid;gap:14px">
  <div class="aic-card" style="padding:16px;border:2px solid ${c.activo?'#16a34a':'#cbd5e1'}">
   <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px"><div><h2 style="font-weight:800;font-size:20px">🤖 Banco de preguntas con IA</h2>
   <p style="font-size:13px;color:#64748b;margin-top:4px">Cada noche la IA crea <b>${min} preguntas nuevas por asignatura</b> (y por lo tanto más de ${min} por área). Se revisan solas y entran directo al banco.</p></div>
   <button onclick="BIA.activar(${!c.activo})" style="background:${c.activo?'#dc2626':'#16a34a'};color:#fff;padding:12px 18px;border-radius:10px;font-weight:800">${c.activo?'■ Apagar':'▶ Encender'}</button></div>
   <div style="margin-top:10px;font-size:14px">Estado: <b style="color:${c.activo?'#15803d':'#64748b'}">${c.activo?'ENCENDIDO':'APAGADO'}</b>${d.pendientes?` · quedan <b>${d.pendientes}</b> lotes por hacer hoy`:''}${d.errores?` · <span style="color:#b91c1c"><b>${d.errores}</b> con error (revisa la clave de la IA)</span>`:''}</div>
   <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">
    <div style="flex:1;min-width:110px;background:#f0fdf4;border-radius:12px;padding:10px;text-align:center"><div style="font-size:26px;font-weight:800;color:#15803d">${tot}</div><div style="font-size:12px;font-weight:700">Creadas hoy</div></div>
    <div style="flex:1;min-width:110px;background:#eff6ff;border-radius:12px;padding:10px;text-align:center"><div style="font-size:26px;font-weight:800;color:#1d4ed8">${meta}</div><div style="font-size:12px;font-weight:700">Meta de hoy</div></div>
    <div style="flex:1;min-width:110px;background:#faf5ff;border-radius:12px;padding:10px;text-align:center"><div style="font-size:26px;font-weight:800;color:#7e22ce">${d.filas.reduce((a,x)=>a+Number(x.total_ia),0)}</div><div style="font-size:12px;font-weight:700">Creadas en total</div></div></div>
   <div style="height:10px;background:#e2e8f0;border-radius:999px;margin:12px 0;overflow:hidden"><div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#22c55e,#16a34a)"></div></div>
   <button onclick="BIA.ahora()" class="aic-link">⚡ Empezar el lote de hoy ahora</button> <span style="font-size:12px;color:#64748b">(solo si está encendido)</span>
   <div style="margin-top:12px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:13px">Máximo de preguntas por asignatura y grado: <input id="bia_tope" type="number" min="0" value="${Number(c.tope_por_grado??400)}" style="width:80px;padding:4px 6px;border:1px solid #cbd5e1;border-radius:8px"> <button onclick="BIA.tope()" class="aic-link">Guardar</button><br><span style="font-size:12px;color:#64748b">Cuando una asignatura llega a ese número en un grado, la IA deja de crear ahí. Pon 0 para no tener límite.</span></div></div>
  <div class="aic-card" style="padding:16px"><h3 style="font-weight:800;margin-bottom:8px">Avance de hoy por asignatura</h3>
   <div class="aic-table-wrap"><table style="min-width:420px"><thead><tr><th>ÁREA</th><th>ASIGNATURA</th><th>HOY</th><th>TOTAL IA</th></tr></thead><tbody>${d.filas.map(x=>`<tr><td>${e(x.area)}</td><td style="font-weight:600">${e(x.asignatura)}</td><td><span style="display:inline-block;border-radius:999px;padding:2px 10px;font-weight:800;font-size:12px;background:${x.hoy>=min?'#dcfce7':'#fef3c7'};color:${x.hoy>=min?'#166534':'#92400e'}">${x.hoy} / ${min}</span></td><td>${x.total_ia}</td></tr>`).join('')}</tbody></table></div>
   <p style="font-size:12px;color:#64748b;margin-top:8px">Por área hoy: ${Object.entries(areas).map(([a,n])=>e(a)+' <b>'+n+'</b>').join(' · ')}</p></div></div>`;
}
const api={load,view,
  async activar(v){const r=await sb.rpc('banco_ia_config_set',{p_activo:v});if(r.error)return err(r.error);toast(v?'🟢':'⏸','Banco con IA '+(v?'encendido':'apagado'),v?'Empieza a generar en unos minutos.':'');await load();render()},
  async tope(){const v=parseInt(document.getElementById('bia_tope').value,10);if(!(v>=0))return toast('⚠','Número no válido','Escribe 0 o un número mayor.');const r=await sb.rpc('banco_ia_tope_set',{p_tope:v});if(r.error)return err(r.error);toast('✅','Guardado','Máximo: '+(v||'sin límite'));await load();render()},
  async ahora(){const r=await sb.rpc('banco_ia_generar_ahora');if(r.error)return err(r.error);toast('⚡','Listo',r.data?'Se programaron '+r.data+' lotes.':'Ya estaba programado.');await load();render()}
};
return api})();
