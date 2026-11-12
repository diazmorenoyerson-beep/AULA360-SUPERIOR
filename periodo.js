/* AulaICFES — Pruebas y exámenes (pruebas de periodo): el docente escoge preguntas del banco,
   ve la vista previa (cuadernillo tipo ICFES), publica como examen virtual o imprime. El estudiante la presenta aquí. */
window.PER=(function(){
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const IM=()=>typeof IMG!=='undefined'?IMG:'';
const isEst=()=>!(M&&(M.role==='prof'||M.role==='rector'||M.role==='coordinador'));
let Z={lista:[],subs:[],res:null,f:null,banco:[],sel:new Set(),q:'',R:null,timer:null,det:null};
const fmtF=d=>d?new Date(d).toLocaleString('es-CO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'—';
const nuevoF=()=>({titulo:'',asig:'',periodo:1,min:60,intentos:1,abre:'',cierra:'',cursos:[]});
async function load(){
  if(!isEst()&&!window.CUAD)await loadScript('cuadernillo.js?v=1');
  if(isEst()){
    const r=await sb.from('periodo_pruebas').select('id,titulo,asignatura,periodo,minutos,max_intentos,abre,cierra').eq('estado','publicada').order('created_at',{ascending:false});
    if(r.error)throw r.error;Z.lista=r.data||[];
    const a=await sb.from('periodo_intentos').select('prueba_id,score,correct,total,created_at').eq('user_id',M.id);
    Z.mios=a.data||[];return;
  }
  const r=await sb.from('periodo_pruebas').select('*,periodo_targets(course_id),periodo_items(count)').order('created_at',{ascending:false});
  if(r.error)throw r.error;Z.lista=r.data||[];
  const s=await sb.from('asignaturas').select('nombre,banco_subject').order('nombre');
  Z.subs=(s.data||[]).filter(x=>x.banco_subject&&(M.is_admin||!(M.asignaturas&&M.asignaturas.length)||M.asignaturas.includes(x.nombre)||(M.banco_subjects||[]).includes(x.banco_subject)));
  try{const pl=await sb.from('planes_area').select('asignatura,grado,malla').eq('docente_id',M.id);Z.plan=pl.data||[]}catch(x){Z.plan=[]}
  if(!Z.f)Z.f=nuevoF();
}
function rerender(){render()}
/* ---------- helpers de docente ---------- */
async function cargarBanco(){
  const sub=Z.subs.find(x=>x.nombre===Z.f.asig);if(!sub){Z.banco=[];return rerender()}
  toast('⏳','Cargando preguntas…',sub.nombre);
  const r=await sb.rpc('periodo_banco',{p_subject:sub.banco_subject,p_grade:null});
  if(r.error)return err(r.error);
  Z.banco=r.data||[];Z.sel=new Set();rerender();
}
function seleccionadas(){return Z.banco.filter(q=>Z.sel.has(q.id))}
function specDe(p,preguntas){
  const L=typeof LH==='function'?LH():{l1:'',logo:''};
  const cs=(D.courses||[]).filter(c=>(p.cursos||[]).includes(c.id)).map(c=>c.grade+'° '+c.name).join(', ');
  return{titulo:p.titulo,tipo:'Prueba de periodo '+p.periodo,colegio:L.l1,logo:L.logo?LOGO+encodeURI(L.logo):'',asignatura:p.asig,curso:cs,fecha:p.cierra?new Date(p.cierra).toLocaleDateString('es-CO'):'',minutos:p.min,preguntas,codigo:'P'+p.periodo};
}
function validar(){
  const f=Z.f;
  if(!f.titulo.trim())return'Escribe el nombre de la prueba.';
  if(!f.asig)return'Elige la asignatura.';
  if(!Z.sel.size)return'Marca al menos una pregunta del banco.';
  return null;
}
async function guardar(publicar){
  const v=validar();if(v)return toast('⚠️','Falta algo',v);
  if(publicar&&!Z.f.cursos.length)return toast('⚠️','Elige los cursos','Marca los cursos que la presentarán.');
  const f=Z.f,qs=seleccionadas();
  const r=await sb.from('periodo_pruebas').insert({titulo:f.titulo.trim(),asignatura:f.asig,grado:11,periodo:+f.periodo,minutos:+f.min,max_intentos:+f.intentos,abre:f.abre?new Date(f.abre).toISOString():null,cierra:f.cierra?new Date(f.cierra).toISOString():null,estado:publicar?'publicada':'borrador'}).select('id').single();
  if(r.error)return err(r.error);
  const id=r.data.id;
  const it=await sb.from('periodo_items').insert(qs.map((q,i)=>({prueba_id:id,pos:i+1,question_id:q.id})));
  if(it.error){await sb.from('periodo_pruebas').delete().eq('id',id);return err(it.error)}
  if(f.cursos.length){const t=await sb.from('periodo_targets').insert(f.cursos.map(c=>({prueba_id:id,course_id:c})));if(t.error)return err(t.error)}
  toast('✅',publicar?'Prueba publicada':'Borrador guardado',f.titulo);
  Z.f=nuevoF();Z.banco=[];Z.sel=new Set();await load();rerender();
}
function previa(){
  const v=validar();if(v)return toast('⚠️','Falta algo',v);
  const vm=!!(Z.virt&&window.VMODE&&VMODE.on());
  CUAD.vistaPrevia(specDe(Z.f,seleccionadas()),vm?{onPublicar:()=>guardar(true),textoPublicar:'✅ Publicar como examen virtual'}:{onPublicar:()=>CUAD.imprimir(specDe(Z.f,seleccionadas()),false),textoPublicar:'🖨️ Imprimir'});
}
async function cargarCuad(id){
  const p=Z.lista.find(x=>x.id===id);
  const it=await sb.from('periodo_items').select('pos,question_id').eq('prueba_id',id).order('pos');
  if(it.error)throw it.error;
  const ids=it.data.map(x=>x.question_id),m={};
  for(let i=0;i<ids.length;i+=60){const r=await sb.from('questions').select('id,body,options,image_path,stimulus_title,stimulus_content,grupo_key').in('id',ids.slice(i,i+60));if(r.error)throw r.error;r.data.forEach(q=>m[q.id]=q)}
  return specDe({titulo:p.titulo,asig:p.asignatura,periodo:p.periodo,min:p.minutos,cierra:p.cierra,cursos:(p.periodo_targets||[]).map(t=>t.course_id)},ids.map(i=>m[i]).filter(Boolean));
}
/* ---------- vista docente ---------- */
function viewDoc(){
  const virt=!!(Z.virt&&window.VMODE&&VMODE.on());
  const f=Z.f||nuevoF(),q=(Z.q||'').toLowerCase();
  const ws=q.split(/\s+/).filter(w=>w.length>=4);
  const banco=Z.banco.filter(x=>{if(!q)return true;const t=(x.body+' '+(x.stimulus_title||'')+' '+(x.topic||'')).toLowerCase();return t.includes(q)||(ws.length>0&&ws.some(w=>t.includes(w)))});
  const temas=(()=>{if(!Z.plan||!f.asig)return[];const out=[];Z.plan.filter(p=>p.asignatura===f.asig).forEach(p=>{((p.malla&&p.malla.periodos)||[]).filter(x=>String(x.n)===String(f.periodo)).forEach(x=>(x.filas||[]).forEach(r=>{if(r.tema&&!out.includes(r.tema))out.push(r.tema)}))});return out})();
  const grupos=[];let last=null;
  banco.forEach(x=>{const k=x.grupo_key&&x.stimulus_content?x.grupo_key:null;if(k&&last&&last.k===k)last.items.push(x);else{last={k,items:[x]};grupos.push(last)}});
  const lista=Z.lista.map(p=>`<div class="aic-card" style="padding:14px;margin-bottom:10px"><div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between">
    <div><b>${e(p.titulo)}</b> <span style="font-size:12px;padding:2px 8px;border-radius:99px;background:${p.estado==='publicada'?'#dcfce7':p.estado==='cerrada'?'#fee2e2':'#e2e8f0'}">${p.estado}</span><div style="font-size:12px;color:#64748b">${e(p.asignatura)} · Periodo ${p.periodo} · ${p.periodo_items?.[0]?.count||0} preguntas · ${p.minutos} min · ${p.max_intentos} intento(s) · cierra ${fmtF(p.cierra)}</div></div>
    <div style="display:flex;flex-wrap:wrap;gap:6px">
      <button class="aic-link" onclick="PER.ver('${p.id}')">👁 Vista previa</button>
      <button class="aic-link" onclick="PER.imp('${p.id}')">🖨️ Imprimir</button>
      <button class="aic-link" onclick="PER.resultados('${p.id}')">📊 Resultados</button>
      ${p.estado==='publicada'?`<button class="aic-link" onclick="PER.estado('${p.id}','cerrada')">⛔ Cerrar</button>`:`<button class="aic-link" onclick="PER.estado('${p.id}','publicada')">✅ Publicar</button>`}
      <button class="aic-link" style="color:#b91c1c" onclick="PER.borrar('${p.id}')">🗑</button></div></div>
    ${Z.det&&Z.det.id===p.id?detHtml():''}</div>`).join('')||'<p style="color:#64748b">Aún no has creado pruebas.</p>';
  const cursos=(D.courses||[]).map(c=>`<label style="display:inline-flex;gap:4px;align-items:center;margin-right:10px;font-size:13px"><input type="checkbox" ${f.cursos.includes(c.id)?'checked':''} onchange="PER.curso('${c.id}',this.checked)">${c.grade}° ${e(c.name)}</label>`).join('')||'<span style="font-size:13px;color:#64748b">Primero crea un curso.</span>';
  const inp='style="width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:8px"';
  return`<div style="display:grid;gap:16px">
  <div class="aic-card" style="padding:18px"><h2 style="font-weight:800;font-size:18px">🧾 Nueva prueba de periodo o examen</h2>
   <p style="font-size:13px;color:#64748b;margin:4px 0 12px">1) Llena los datos. 2) Marca las preguntas del banco. 3) Mira la vista previa. 4) Imprímela desde la vista previa.${virt?' Como estás en el Aula virtual, también puedes publicarla como examen virtual y programar cuándo empieza y cuándo termina.':''}</p>
   <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">
    <label style="font-size:13px">Nombre<input ${inp} value="${e(f.titulo)}" oninput="PER.set('titulo',this.value)" placeholder="Ej. Prueba del 2.º periodo"></label>
    <label style="font-size:13px">Asignatura<select ${inp} onchange="PER.set('asig',this.value);PER.banco()"><option value="">— Elegir —</option>${Z.subs.map(s=>`<option ${s.nombre===f.asig?'selected':''}>${e(s.nombre)}</option>`).join('')}</select></label>
    <label style="font-size:13px">Periodo<select ${inp} onchange="PER.set('periodo',this.value)">${[1,2,3,4].map(n=>`<option ${+f.periodo===n?'selected':''}>${n}</option>`).join('')}</select></label>
    ${virt?`<label style="font-size:13px">Minutos<input type="number" min="5" max="300" ${inp} value="${f.min}" oninput="PER.set('min',this.value)"></label>`:''}
    ${virt?`<label style="font-size:13px">Intentos<input type="number" min="1" max="5" ${inp} value="${f.intentos}" oninput="PER.set('intentos',this.value)"></label>`:''}
    ${virt?`<label style="font-size:13px">Abre<input type="datetime-local" ${inp} value="${f.abre}" onchange="PER.set('abre',this.value)"></label>`:''}
    ${virt?`<label style="font-size:13px">Cierra<input type="datetime-local" ${inp} value="${f.cierra}" onchange="PER.set('cierra',this.value)"></label>`:''}</div>
   <div style="margin-top:10px;font-size:13px"><b>Cursos que la presentan:</b> ${cursos}</div></div>
  ${f.asig?`<div class="aic-card" style="padding:18px"><div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between"><h3 style="font-weight:800">📚 Preguntas del banco · ${e(f.asig)} <span style="color:#4f46e5">(${Z.sel.size} marcadas)</span></h3>
    <input placeholder="Buscar…" value="${e(Z.q)}" oninput="PER.buscar(this.value)" style="border:1px solid #cbd5e1;border-radius:8px;padding:6px 10px"></div>
    ${temas.length?`<div style="margin-top:8px;font-size:13px"><b>Según tu plan de área (periodo ${f.periodo}):</b> <select onchange="PER.buscar(this.value)" style="border:1px solid #cbd5e1;border-radius:8px;padding:6px"><option value="">Ver todas las preguntas</option>${temas.map(t=>`<option value="${e(t)}">${e(t)}</option>`).join('')}</select></div>`:`<div style="margin-top:8px;font-size:12px;color:#b45309">Sube tu plan de área (menú “Plan de área”) y aquí podrás filtrar las preguntas por los temas de tu plan.</div>`}
    <div style="max-height:460px;overflow:auto;margin-top:10px;display:grid;gap:8px">
    ${grupos.map(g=>`<div style="border:1px solid #e2e8f0;border-radius:12px;padding:8px">${g.k?`<div style="background:#f8fafc;border-radius:8px;padding:8px;font-size:13px;margin-bottom:6px"><b>${e(g.items[0].stimulus_title||'Contexto compartido')}</b> <button class="aic-link" onclick="PER.grupo('${g.k}')">☑ Marcar todo el grupo (${g.items.length})</button><div style="white-space:pre-wrap;color:#475569;margin-top:4px">${e(g.items[0].stimulus_content)}</div></div>`:''}
      ${g.items.map(x=>`<label style="display:flex;gap:8px;align-items:flex-start;padding:4px 2px;font-size:13px;cursor:pointer"><input type="checkbox" ${Z.sel.has(x.id)?'checked':''} onchange="PER.marca('${x.id}',this.checked)"><span>${x.image_path?`<img src="${IM()}${encodeURI(x.image_path)}" style="max-width:340px;max-height:140px;object-fit:contain;display:block">`:e(x.body)}${x.difficulty?` <small style="color:#64748b">(${x.difficulty})</small>`:''}</span></label>`).join('')}</div>`).join('')||'<p style="color:#64748b;font-size:13px">No hay preguntas para esta asignatura.</p>'}</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">
     <button onclick="PER.previa()" style="padding:10px 16px;border-radius:10px;background:#4f46e5;color:#fff;font-weight:700;border:0">👁 Vista previa</button>
     <button onclick="PER.guardar(false)" style="padding:10px 16px;border-radius:10px;background:#e2e8f0;font-weight:700;border:0">💾 Guardar borrador</button>
     ${virt?`<button onclick="PER.guardar(true)" style="padding:10px 16px;border-radius:10px;background:#059669;color:#fff;font-weight:700;border:0">✅ Guardar y publicar</button>`:`<button onclick="PER.previa()" style="padding:10px 16px;border-radius:10px;background:#059669;color:#fff;font-weight:700;border:0">🖨️ Imprimir esta prueba</button>`}</div></div>`:''}
  <div class="aic-card" style="padding:18px"><h3 style="font-weight:800;margin-bottom:10px">Mis pruebas</h3>${lista}</div></div>`;
}
function detHtml(){
  const d=Z.det;if(!d.rows)return'<p style="font-size:13px">Cargando…</p>';
  return`<div class="aic-table-wrap" style="margin-top:10px"><table><thead><tr><th>ESTUDIANTE</th><th>ACIERTOS</th><th>NOTA /100</th><th>FECHA</th></tr></thead><tbody>${d.rows.map(r=>`<tr><td>${e(r.profiles?.full_name||'')}</td><td>${r.correct}/${r.total}</td><td><b>${r.score}</b></td><td>${fmtF(r.created_at)}</td></tr>`).join('')||'<tr><td colspan="4">Nadie la ha presentado.</td></tr>'}</tbody></table></div>`;
}
/* ---------- vista estudiante ---------- */
function viewEst(){
  if(Z.res){const r=Z.res;return`<div class="aic-card" style="padding:20px"><h2 style="font-weight:800;font-size:20px">Resultado: ${e(r.titulo)}</h2><p style="font-size:34px;font-weight:900;color:#4f46e5">${r.score} <small style="font-size:14px;color:#64748b">/ 100 · ${r.correct} de ${r.total}</small></p>
   ${r.qs.map((q,i)=>{const c=r.key[q.id],ok=r.ans[q.id]===c;return`<div style="padding:10px;border-radius:10px;margin:8px 0;background:${ok?'#ecfdf5':'#fff1f2'};font-size:13px"><b>${i+1}.</b> ${q.image_path?`<img src="${IM()}${encodeURI(q.image_path)}" style="max-width:100%">`:e(q.body)}<div>Correcta: <b>${'ABCD'[c]??'—'}</b> · Tu respuesta: <b>${r.ans[q.id]==null?'—':'ABCD'[r.ans[q.id]]}</b></div>${r.exp[q.id]?`<div style="color:#475569">💡 ${e(r.exp[q.id])}</div>`:''}</div>`}).join('')}
   <button onclick="PER.volver()" style="padding:10px 16px;border-radius:10px;background:#4f46e5;color:#fff;border:0;font-weight:700">Volver</button></div>`}
  const R=Z.R;
  if(R){
    const q=R.qs[R.i],prev=R.qs[R.i-1],nuevoCtx=q.stimulus_content&&!(prev&&prev.grupo_key&&prev.grupo_key===q.grupo_key);
    const mm=Math.floor(R.left/60),ss=String(R.left%60).padStart(2,'0');
    const ctx=q.stimulus_content&&!q.image_path?`<div style="border:1px solid #cbd5e1;background:#f8fafc;border-radius:12px;padding:12px;margin-bottom:10px;font-size:14px;white-space:pre-wrap">${q.stimulus_title?`<b>${e(q.stimulus_title)}</b><br>`:''}${e(q.stimulus_content)}</div>`:'';
    return`<div class="aic-card" style="padding:18px"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><b>${e(R.p.titulo)} · Pregunta ${R.i+1} de ${R.qs.length}</b><span id="perclk" style="font-family:monospace;font-size:22px;font-weight:800;color:${R.left<60?'#dc2626':'#4338ca'}">${mm}:${ss}</span></div>
    <div style="display:flex;flex-wrap:wrap;gap:4px;margin:10px 0">${R.qs.map((x,k)=>`<button onclick="PER.ir(${k})" style="width:32px;height:32px;border-radius:8px;border:2px solid ${k===R.i?'#1d4ed8':'transparent'};background:${R.ans[x.id]!=null?'#2864e8':'#e2e8f0'};color:${R.ans[x.id]!=null?'#fff':'#334155'};font-weight:700;font-size:12px">${k+1}</button>`).join('')}</div>
    ${ctx}${q.image_path?`<img src="${IM()}${encodeURI(q.image_path)}" style="max-width:100%;display:block;margin:0 auto 10px">`:`<p style="font-weight:600;margin-bottom:10px">${e(q.body)}</p>`}
    <div style="display:grid;gap:8px">${(q.options||[]).map((o,k)=>`<button onclick="PER.resp('${q.id}',${k})" style="text-align:left;padding:12px;border-radius:12px;border:2px solid ${R.ans[q.id]===k?'#2864e8':'#e2e8f0'};background:${R.ans[q.id]===k?'#eff6ff':'#fff'}"><b>${'ABCD'[k]}.</b> ${q.image_path&&/^[A-D]$/.test(o)?'':e(o)}</button>`).join('')}</div>
    <div style="display:flex;justify-content:space-between;gap:8px;margin-top:14px"><button ${R.i?'':'disabled'} onclick="PER.ir(${R.i-1})" style="padding:8px 14px;border-radius:10px;background:#e2e8f0;border:0">← Anterior</button><button onclick="PER.fin()" style="padding:8px 14px;border-radius:10px;background:#059669;color:#fff;border:0;font-weight:700">Entregar</button><button ${R.i<R.qs.length-1?'':'disabled'} onclick="PER.ir(${R.i+1})" style="padding:8px 14px;border-radius:10px;background:#4f46e5;color:#fff;border:0">Siguiente →</button></div></div>`;
  }
  const rows=Z.lista.map(p=>{const m=(Z.mios||[]).filter(x=>x.prueba_id===p.id),usados=m.length;
    return`<div class="aic-card" style="padding:14px;margin-bottom:10px;display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center"><div><b>${e(p.titulo)}</b><div style="font-size:12px;color:#64748b">${e(p.asignatura)} · Periodo ${p.periodo} · ${p.minutos} min · cierra ${fmtF(p.cierra)}${m.length?` · mejor nota ${Math.max(...m.map(x=>+x.score))}`:''}</div></div>
    <button ${usados>=p.max_intentos?'disabled':''} onclick="PER.empezar('${p.id}')" style="padding:9px 16px;border-radius:10px;background:#4f46e5;color:#fff;border:0;font-weight:700;opacity:${usados>=p.max_intentos?.4:1}">${usados>=p.max_intentos?'Intentos agotados':'▶ Presentar'}</button></div>`}).join('')||'<p style="color:#64748b">Tu docente aún no ha publicado exámenes.</p>';
  return`<div><h2 style="font-weight:800;font-size:20px;margin-bottom:10px">🧾 Mis exámenes virtuales</h2>${rows}</div>`;
}
function view(v){Z.virt=!!v;return isEst()?viewEst():viewDoc()}
/* ---------- acciones ---------- */
const api={
  load,view,
  set(k,v){Z.f[k]=v;if(['asig','periodo'].includes(k))rerender()},
  curso(id,on){const s=new Set(Z.f.cursos);on?s.add(id):s.delete(id);Z.f.cursos=[...s]},
  banco:cargarBanco,
  buscar(v){Z.q=v;rerender();setTimeout(()=>{const i=document.querySelector('input[placeholder="Buscar…"]');if(i){i.focus();i.setSelectionRange(v.length,v.length)}},0)},
  marca(id,on){on?Z.sel.add(id):Z.sel.delete(id);rerender()},
  grupo(k){Z.banco.filter(x=>x.grupo_key===k).forEach(x=>Z.sel.add(x.id));rerender()},
  previa,guardar,
  async ver(id){try{CUAD.vistaPrevia(await cargarCuad(id))}catch(x){err(x)}},
  async imp(id){try{await CUAD.imprimir(await cargarCuad(id),true)}catch(x){err(x)}},
  async estado(id,s){const r=await sb.from('periodo_pruebas').update({estado:s}).eq('id',id);if(r.error)return err(r.error);await load();rerender()},
  async borrar(id){if(!confirm('¿Borrar esta prueba y sus resultados?'))return;const r=await sb.from('periodo_pruebas').delete().eq('id',id);if(r.error)return err(r.error);await load();rerender()},
  async resultados(id){
    if(Z.det&&Z.det.id===id){Z.det=null;return rerender()}
    Z.det={id};rerender();
    const r=await sb.from('periodo_intentos').select('correct,total,score,created_at,profiles(full_name)').eq('prueba_id',id).order('created_at',{ascending:false});
    Z.det={id,rows:r.data||[]};rerender();
  },
  async empezar(id){
    const r=await sb.rpc('periodo_preguntas',{p_prueba:id});if(r.error)return err(r.error);
    const p=r.data.prueba,qs=r.data.preguntas;
    Z.R={p:{id:p.id,titulo:p.titulo},qs,ans:{},i:0,total:p.minutos*60,left:p.minutos*60,sending:false};
    clearInterval(Z.timer);
    Z.timer=setInterval(()=>{if(!Z.R)return clearInterval(Z.timer);Z.R.left--;const c=document.getElementById('perclk');if(c){c.textContent=Math.floor(Z.R.left/60)+':'+String(Z.R.left%60).padStart(2,'0')}if(Z.R.left<=0)api.fin(true)},1000);
    rerender();
  },
  ir(k){Z.R.i=k;rerender()},
  resp(id,k){Z.R.ans[id]=k;rerender()},
  async fin(auto){
    const R=Z.R;if(!R||R.sending)return;
    if(!auto){const sin=R.qs.filter(q=>R.ans[q.id]==null).length;if(!confirm(sin?`Te faltan ${sin} pregunta(s) sin responder. ¿Entregar de todas formas?`:'¿Entregar el examen?'))return}
    R.sending=true;clearInterval(Z.timer);
    const a=Object.fromEntries(R.qs.map(q=>[q.id,R.ans[q.id]??null]));
    const r=await sb.rpc('periodo_enviar',{p_prueba:R.p.id,p_answers:a,p_seconds:R.total-Math.max(0,R.left)});
    if(r.error){R.sending=false;return err(r.error)}
    Z.res={...r.data,titulo:R.p.titulo,qs:R.qs,ans:R.ans};Z.R=null;await load();rerender();
  },
  volver(){Z.res=null;rerender()}
};
return api;
})();
