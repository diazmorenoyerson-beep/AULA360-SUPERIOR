/* AulaICFES — Asistencia de docentes.
   Rector/coordinador: desde su celular toca "Llegada" o "Salida" junto al nombre del docente (la hora la pone el servidor).
   Todo queda acumulado: lo ve el rector, el coordinador y cada docente (solo lo suyo). */
window.ASIS=(function(){
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isDir=()=>M&&(M.role==='rector'||M.role==='coordinador');
const hoy=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Bogota'});
const hora=d=>new Date(d).toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'America/Bogota'});
const dia=d=>new Date(d).toLocaleDateString('es-CO',{weekday:'short',day:'2-digit',month:'short',year:'numeric',timeZone:'America/Bogota'});
const dk=d=>new Date(d).toLocaleDateString('en-CA',{timeZone:'America/Bogota'});
const R=()=>render();
let Z={docs:[],rows:[],desde:'',hasta:hoy(),doc:'',busy:false,q:'',cc:'',enc:null,ok:null,cedulas:false,mi:null};
function ini(){const d=new Date();d.setDate(d.getDate()-30);return d.toLocaleDateString('en-CA',{timeZone:'America/Bogota'})}
async function load(){
  Z.desde=Z.desde||ini();
  if(isDir()){const r=await sb.rpc('asistencia_docentes');if(r.error)throw r.error;Z.docs=r.data||[];const e2=await sb.rpc('asistencia_estado');Z.est=(e2.data||[])[0]||{cerrada:false}}
  if(!isDir()){const r=await sb.rpc('asistencia_mi_doc');if(!r.error)Z.mi=r.data||null}
  await hist();
}
async function hist(){
  const r=await sb.rpc('asistencia_listar',{p_desde:Z.desde,p_hasta:Z.hasta,p_docente:Z.doc||null});
  if(r.error)throw r.error;Z.rows=r.data||[];
}
function resumen(){
  // agrupa por docente y día: primera entrada, última salida, horas
  const m={};
  Z.rows.slice().reverse().forEach(x=>{
    const k=x.docente_id+'|'+dk(x.at);
    const o=m[k]=m[k]||{n:x.full_name,d:x.at,ent:null,sal:null};
    if(x.tipo==='entrada'&&!o.ent)o.ent=x.at;
    if(x.tipo==='salida')o.sal=x.at;
  });
  return Object.values(m).sort((a,b)=>new Date(b.d)-new Date(a.d));
}
function dur(a,b){if(!a||!b)return'—';const m=Math.round((new Date(b)-new Date(a))/60000);return m<0?'—':Math.floor(m/60)+' h '+String(m%60).padStart(2,'0')+' min'}
const big='style="width:100%;border:2px solid #cbd5e1;border-radius:14px;padding:16px;font-size:24px;text-align:center;letter-spacing:2px"';
function miDoc(){return`<div class="aic-card" style="padding:14px;margin-bottom:14px"><b>🕒 Tu asistencia</b><p style="font-size:13px;color:#64748b;margin:4px 0 0">Aquí ves tu llegada y salida de cada día, tal como las registra el rector o el coordinador. No tienes que hacer nada.</p></div>`}
function docsCard(){
  const L=Z.docs||[],falta=L.filter(d=>!d.documento).length;
  return`<div class="aic-card" style="padding:14px;margin:0 auto 14px;max-width:480px"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><b>🪪 Documentos de los docentes</b><button class="aic-link" onclick="ASIS.togDocs()">${Z.docsOpen?'▲ Ocultar':'▼ Ver'}${falta?' · '+falta+' sin documento':''}</button></div>${Z.docsOpen?`<p style="font-size:12px;color:#64748b;margin:6px 0">Escribe el documento de cada docente una sola vez. Con ese número marcas su llegada y salida.</p>${L.map(d=>`<div style="display:flex;gap:6px;align-items:center;margin-top:6px;flex-wrap:wrap"><span style="flex:1;min-width:150px;font-size:13px">${e(d.full_name)}</span><input id="asd-${d.id}" inputmode="numeric" value="${e(d.documento||'')}" placeholder="Documento" style="width:130px;border:1px solid #cbd5e1;border-radius:8px;padding:6px"><button onclick="ASIS.setDoc('${d.id}')" style="background:#246be0;color:#fff;padding:6px 10px;border-radius:8px;font-weight:700;font-size:12px">Guardar</button></div>`).join('')||'<p style="font-size:13px">No hay docentes aprobados.</p>'}`:''}</div>`}
function marcar(){
  let c;
  const cer=Z.est&&Z.est.cerrada;
  if(Z.ok){
    const sal=Z.ok.tipo==='salida';
    c=`<div style="text-align:center;padding:10px 4px"><div style="font-size:60px">${sal?'👋':'✅'}</div><div style="font-size:22px;font-weight:800;margin-top:6px">Docente ${e(Z.ok.nombre)}</div><div style="font-size:24px;margin-top:6px;font-weight:700">${sal?'Hasta pronto':'Bienvenido(a)'}</div><div style="font-size:16px;margin-top:4px">Tu hora de ${sal?'salida':'llegada'} quedó registrada el</div><div style="font-size:26px;font-weight:800;color:#0b9865;margin-top:4px">${dia(Z.ok.at)}<br>${hora(Z.ok.at)}</div></div>`;
  }else if(cer){
    c=`<div style="text-align:center;padding:16px;font-weight:700;color:#b91c1c">La asistencia de hoy fue cerrada por el rector.</div>`;
  }else{
    const bt=(t,col,tx)=>`<button ${Z.busy?'disabled':''} onclick="ASIS.enviar('${t}')" style="flex:1;background:${col};color:#fff;padding:18px 6px;border-radius:14px;font-size:17px;font-weight:800">${tx}</button>`;
    c=`<label style="display:block;text-align:center;font-weight:700;margin-bottom:8px;font-size:16px">Escribe tu número de documento</label><input id="asis-cc" inputmode="numeric" autocomplete="off" placeholder="Número de documento" value="${e(Z.cc)}" ${big} oninput="ASIS.cc=this.value"><div style="display:flex;gap:10px;margin-top:12px">${bt('entrada','#16a34a','⬇ Hora de llegada')}${bt('salida','#dc2626','⬆ Hora de salida')}</div>${Z.err?`<div style="margin-top:12px;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;border-radius:12px;padding:12px;text-align:center;font-weight:700">${e(Z.err)}</div>`:''}`;
  }
  const rec=M.role==='rector'?`<div style="text-align:center;margin-top:14px"><button onclick="ASIS.cerrarDia(${cer?'false':'true'})" style="padding:10px 14px;border-radius:10px;font-weight:700;font-size:13px;${cer?'background:#e2e8f0':'background:#fee2e2;color:#b91c1c'}">${cer?'🔓 Reabrir asistencia de hoy':'🔒 Cerrar asistencia de hoy'}</button></div>`:'';
  return`<div class="aic-card" style="padding:18px;margin-bottom:14px;max-width:480px;margin-left:auto;margin-right:auto"><h2 style="font-weight:800;font-size:20px;text-align:center">🕒 Asistencia de docentes</h2><p style="font-size:13px;color:#64748b;text-align:center;margin:4px 0 14px">Escribe tu documento y toca la hora de llegada o la hora de salida.</p>${c}${rec}</div>
  <div style="text-align:center;margin-bottom:10px"><button class="aic-link" style="font-size:14px" onclick="ASIS.togHist()">${Z.hist?'▲ Ocultar historial':'📋 Ver historial de asistencias'}</button></div>`;
}
function historial(){
  const rs=resumen();
  const sel=isDir()?`<label style="font-size:12px;font-weight:700">Docente<br><select onchange="ASIS.f('doc',this.value)" style="border:1px solid #cbd5e1;border-radius:8px;padding:8px"><option value="">Todos</option>${Z.docs.map(d=>`<option value="${d.id}" ${d.id===Z.doc?'selected':''}>${e(d.full_name)}</option>`).join('')}</select></label>`:'';
  const inp=(k,v,l)=>`<label style="font-size:12px;font-weight:700">${l}<br><input type="date" value="${v}" onchange="ASIS.f('${k}',this.value)" style="border:1px solid #cbd5e1;border-radius:8px;padding:8px"></label>`;
  return`<div class="aic-card" style="padding:14px"><h2 style="font-weight:800;font-size:18px">📋 Historial acumulado</h2>
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin:10px 0">${inp('desde',Z.desde,'Desde')}${inp('hasta',Z.hasta,'Hasta')}${sel}<button onclick="ASIS.csv()" style="align-self:end;background:#246be0;color:#fff;padding:9px 12px;border-radius:8px;font-weight:700;font-size:13px">⬇ Descargar Excel</button></div>
    <div class="aic-table-wrap"><table style="min-width:520px"><thead><tr>${isDir()?'<th>DOCENTE</th>':''}<th>DÍA</th><th>LLEGADA</th><th>SALIDA</th><th>TIEMPO</th></tr></thead><tbody>${rs.map(o=>`<tr>${isDir()?`<td>${e(o.n)}</td>`:''}<td>${dia(o.d)}</td><td>${o.ent?hora(o.ent):'—'}</td><td>${o.sal?hora(o.sal):'—'}</td><td>${dur(o.ent,o.sal)}</td></tr>`).join('')||`<tr><td colspan="5">No hay marcas en estas fechas.</td></tr>`}</tbody></table></div></div>`;
}
const api={
  load,
  view:()=>`<div>${isDir()?marcar()+docsCard():miDoc()}${!isDir()||Z.hist?historial():''}</div>`,
  togDocs(){Z.docsOpen=!Z.docsOpen;R()},
  async setDoc(id){const v=document.getElementById('asd-'+id).value;const r=await sb.rpc('asistencia_set_doc',{p_docente:id,p_doc:v});if(r.error)return toast('⚠️','No se guardó',r.error.message);toast('✅','Documento guardado','');try{await load()}catch(x){}R()},
  togHist(){Z.hist=!Z.hist;R()},
  async guardarMi(){const v=document.getElementById('asis-mi').value;const r=await sb.rpc('asistencia_mi_doc',{p_doc:v});if(r.error)return toast('⚠️','No se guardó',r.error.message);Z.mi=r.data;toast('✅','Documento registrado','Ya puedes marcar tu llegada y salida en el celular de la entrada.');R()},
  set cc(v){Z.cc=v},
  limpiar(){Z.ok=null;Z.err='';Z.cc='';R()},
  async cerrarDia(c){if(c&&!confirm('¿Cerrar la asistencia de hoy? Nadie podrá registrar llegada ni salida hasta que la reabras.'))return;const r=await sb.rpc('asistencia_cerrar',{p_cerrar:c});if(r.error)return toast('⚠️','No se pudo',r.error.message);await load();R()},
  async enviar(tipo){
    if(Z.busy)return;
    const v=(document.getElementById('asis-cc')?.value||Z.cc||'').trim();Z.cc=v;Z.err='';
    if(v.replace(/\D/g,'').length<5){Z.err='Escribe tu número de documento completo.';return R()}
    Z.busy=true;
    const r=await sb.rpc('asistencia_registrar',{p_doc:v,p_tipo:tipo});
    Z.busy=false;
    if(r.error){Z.err=/no está registrado/.test(r.error.message)?'Ese documento no está registrado. Regístralo abajo, en "Documentos de los docentes".':r.error.message;R();setTimeout(()=>{if(Z.err){Z.err='';Z.cc='';R()}},8000);return}
    const x=(r.data||[])[0];Z.cc='';Z.ok={nombre:x.nombre,tipo:x.tipo,at:x.at};
    try{await load()}catch(y){}R();
    setTimeout(()=>{if(Z.ok&&Z.ok.at===x.at){Z.ok=null;R()}},10000);
  },
  async f(k,v){Z[k]=v;try{await hist()}catch(x){return err(x)}R()},
  csv(){
    const rs=resumen();
    const l=[['Docente','Día','Llegada','Salida','Tiempo'],...rs.map(o=>[o.n,dk(o.d),o.ent?hora(o.ent):'',o.sal?hora(o.sal):'',dur(o.ent,o.sal)])];
    const t='﻿'+l.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(';')).join('\r\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/csv;charset=utf-8'}));a.download='asistencia_docentes.csv';a.click();
  }
};
return api;
})();
