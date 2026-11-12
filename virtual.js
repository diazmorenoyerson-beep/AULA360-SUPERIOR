/* AulaICFES — Trabajos y entregas (módulo virtual).
   Docente: material para descargar y trabajos, con límite de descargas, de entregas, de MB y tipos de archivo.
   Estudiante: descarga y entrega dentro de esos límites. Los límites los hace cumplir la base de datos. */
window.VIRT=(function(){
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isEst=()=>!(M&&(M.role==='prof'||M.role==='rector'||M.role==='coordinador'));
const isDoc=()=>M&&M.role==='prof';
const TIPOS=['pdf','doc','docx','xls','xlsx','ppt','pptx','jpg','png','zip'];
let Z={lista:[],f:null,det:null,arch:{},ents:{},desc:{},mis:{}};
const fF=d=>d?new Date(d).toLocaleString('es-CO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'Sin fecha';
const mb=n=>n==null?'':(n/1048576).toFixed(1)+' MB';
const nuevo=()=>({titulo:'',descripcion:'',tipo:'trabajo',fecha:'',maxd:'',maxe:1,maxmb:10,tipos:['pdf','doc','docx','jpg','png'],tarde:false,cursos:[],files:[]});
const inp='style="width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:8px"';
async function load(){
  Z.f=Z.f||nuevo();
  const r=await sb.from('virtual_trabajos').select('*,virtual_trabajo_cursos(course_id),virtual_archivos(id,nombre,size)').order('created_at',{ascending:false});
  if(r.error)throw r.error;Z.lista=r.data||[];
  if(isEst()){
    const en=await sb.from('virtual_entregas').select('id,trabajo_id,nombre,estado,nota,retroalimentacion,created_at').eq('user_id',M.id).eq('estado','enviada');
    Z.mis={};(en.data||[]).forEach(x=>(Z.mis[x.trabajo_id]=Z.mis[x.trabajo_id]||[]).push(x));
    const d=await sb.from('virtual_descargas').select('archivo_id').eq('user_id',M.id);
    Z.desc={};(d.data||[]).forEach(x=>Z.desc[x.archivo_id]=(Z.desc[x.archivo_id]||0)+1);
  }
}
const R=()=>render();
/* ---------- docente ---------- */
async function crear(){
  const f=Z.f;
  if(!f.titulo.trim())return toast('⚠️','Falta el título','Escribe el título.');
  if(!f.cursos.length)return toast('⚠️','Elige cursos','Marca al menos un curso.');
  if(!f.tipos.length)return toast('⚠️','Tipos de archivo','Marca al menos un tipo permitido.');
  if(f.tipo==='material'&&!f.files.length)return toast('⚠️','Falta el archivo','Adjunta al menos un archivo para descargar.');
  toast('⏳','Guardando…',f.titulo);
  const r=await sb.from('virtual_trabajos').insert({docente_id:M.id,titulo:f.titulo.trim(),descripcion:f.descripcion.trim()||null,tipo:f.tipo,fecha_limite:f.fecha?new Date(f.fecha).toISOString():null,max_descargas:f.maxd?+f.maxd:null,max_entregas:+f.maxe||1,max_mb:+f.maxmb||10,tipos_permitidos:f.tipos,permite_tarde:!!f.tarde}).select('id').single();
  if(r.error)return err(r.error);
  const id=r.data.id;
  const c=await sb.from('virtual_trabajo_cursos').insert(f.cursos.map(x=>({trabajo_id:id,course_id:x})));
  if(c.error)return err(c.error);
  for(const file of f.files){
    const nombre=file.name.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'_');
    const path=M.id+'/'+id+'/'+Date.now()+'_'+nombre;
    const up=await sb.storage.from('virtual-material').upload(path,file,{upsert:false});
    if(up.error){toast('⚠️','No se subió '+file.name,up.error.message);continue}
    const a=await sb.from('virtual_archivos').insert({trabajo_id:id,path,nombre:file.name,tipo:(file.name.split('.').pop()||'').toLowerCase(),size:file.size});
    if(a.error)toast('⚠️','No se registró '+file.name,a.error.message);
  }
  toast('✅','Publicado',f.titulo);Z.f=nuevo();await load();R();
}
async function verEntregas(id){
  if(Z.det===id){Z.det=null;return R()}
  Z.det=id;R();
  const r=await sb.from('virtual_entregas').select('id,nombre,size,comentario,nota,retroalimentacion,created_at,path,user_id,profiles(full_name)').eq('trabajo_id',id).eq('estado','enviada').order('created_at',{ascending:false});
  Z.ents[id]=r.data||[];
  const d=await sb.from('virtual_descargas').select('user_id').eq('trabajo_id',id);
  Z.ents[id+'_d']=(d.data||[]).length;R();
}
function docView(){
  const f=Z.f,cursos=(D.courses||[]).map(c=>`<label style="display:inline-flex;gap:4px;margin-right:10px;font-size:13px"><input type="checkbox" ${f.cursos.includes(c.id)?'checked':''} onchange="VIRT.curso('${c.id}',this.checked)">${c.grade}° ${e(c.name)}</label>`).join('')||'<span style="font-size:13px;color:#64748b">Primero crea un curso.</span>';
  const tipos=TIPOS.map(t=>`<label style="display:inline-flex;gap:3px;margin-right:8px;font-size:13px"><input type="checkbox" ${f.tipos.includes(t)?'checked':''} onchange="VIRT.tipo('${t}',this.checked)">.${t}</label>`).join('');
  const lista=Z.lista.map(t=>`<div class="aic-card" style="padding:14px;margin-bottom:10px"><div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center">
    <div><b>${t.tipo==='trabajo'?'📎':'📥'} ${e(t.titulo)}</b> ${t.activo?'':'<span style="font-size:12px;background:#e2e8f0;border-radius:99px;padding:2px 8px">Oculto</span>'}
      <div style="font-size:12px;color:#64748b">${t.tipo==='trabajo'?'Trabajo':'Material'} · límite ${fF(t.fecha_limite)} · descargas: ${t.max_descargas??'sin límite'} por archivo${t.tipo==='trabajo'?` · entregas: ${t.max_entregas} · máx ${t.max_mb} MB · ${t.tipos_permitidos.map(x=>'.'+x).join(' ')} · ${t.permite_tarde?'acepta tarde':'no acepta tarde'}`:''}</div></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">${t.tipo==='trabajo'?`<button class="aic-link" onclick="VIRT.entregas('${t.id}')">📬 Entregas</button>`:''}
      ${t.virtual_archivos?.length?`<button class="aic-link" onclick="VIRT.bajar('${t.id}')">⬇ Archivos</button>`:''}
      <button class="aic-link" onclick="VIRT.limites('${t.id}')">⚙ Cambiar límites</button>
      <button class="aic-link" onclick="VIRT.activo('${t.id}',${!t.activo})">${t.activo?'🙈 Ocultar':'👁 Mostrar'}</button>
      <button class="aic-link" style="color:#b91c1c" onclick="VIRT.borrar('${t.id}')">🗑</button></div></div>
    ${Z.det===t.id?entHtml(t):''}${Z.arch[t.id]?`<div style="margin-top:8px;font-size:13px">${t.virtual_archivos.map(a=>`<a href="#" class="aic-link" onclick="VIRT.verArch('${a.id}');return false">📄 ${e(a.nombre)}</a>`).join(' · ')}</div>`:''}</div>`).join('')||'<p style="color:#64748b">Aún no has publicado nada.</p>';
  return`<div style="display:grid;gap:16px"><div class="aic-card" style="padding:18px"><h2 style="font-weight:800;font-size:18px">📎 Nuevo material o trabajo</h2>
    <p style="font-size:13px;color:#64748b;margin:4px 0 12px"><b>Material</b>: tus estudiantes solo descargan. <b>Trabajo</b>: descargan (si adjuntas guía) y entregan un archivo por la plataforma. Tú pones los límites.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px">
     <label style="font-size:13px">Título<input ${inp} value="${e(f.titulo)}" oninput="VIRT.set('titulo',this.value)"></label>
     <label style="font-size:13px">Tipo<select ${inp} onchange="VIRT.set('tipo',this.value);" ><option value="trabajo" ${f.tipo==='trabajo'?'selected':''}>Trabajo (con entrega)</option><option value="material" ${f.tipo==='material'?'selected':''}>Material (solo descarga)</option></select></label>
     <label style="font-size:13px">Fecha límite<input type="datetime-local" ${inp} value="${f.fecha}" onchange="VIRT.set('fecha',this.value)"></label>
     <label style="font-size:13px">Descargas máx. por estudiante y archivo<input type="number" min="1" max="100" placeholder="Sin límite" ${inp} value="${f.maxd}" oninput="VIRT.set('maxd',this.value)"></label>
     ${f.tipo==='trabajo'?`<label style="font-size:13px">Entregas máx. por estudiante (1 a 10)<input type="number" min="1" max="10" ${inp} value="${f.maxe}" oninput="VIRT.set('maxe',this.value)"></label>
     <label style="font-size:13px">Peso máx. del archivo, MB (1 a 25)<input type="number" min="1" max="25" ${inp} value="${f.maxmb}" oninput="VIRT.set('maxmb',this.value)"></label>`:''}</div>
    <label style="font-size:13px;display:block;margin-top:10px">Instrucciones<textarea ${inp} rows="3" oninput="VIRT.set('descripcion',this.value)">${e(f.descripcion)}</textarea></label>
    ${f.tipo==='trabajo'?`<div style="margin-top:8px;font-size:13px"><b>Tipos de archivo que pueden entregar:</b> ${tipos}</div><label style="font-size:13px;display:block;margin-top:6px"><input type="checkbox" ${f.tarde?'checked':''} onchange="VIRT.set('tarde',this.checked)"> Aceptar entregas después de la fecha límite</label>`:''}
    <div style="margin-top:8px;font-size:13px"><b>Cursos:</b> ${cursos}</div>
    <div style="margin-top:8px;font-size:13px"><b>Archivos para descargar${f.tipo==='trabajo'?' (opcional)':''}:</b> <input type="file" multiple onchange="VIRT.archivos(this.files)"> ${f.files.length?`<span style="color:#4f46e5">${f.files.length} adjunto(s)</span>`:''}</div>
    <button onclick="VIRT.crear()" style="margin-top:12px;padding:10px 18px;border-radius:10px;background:#4f46e5;color:#fff;font-weight:700;border:0">✅ Publicar</button></div>
   <div class="aic-card" style="padding:18px"><h3 style="font-weight:800;margin-bottom:10px">Mis materiales y trabajos</h3>${lista}</div></div>`;
}
function entHtml(t){
  const rows=Z.ents[t.id];if(!rows)return'<p style="font-size:13px">Cargando…</p>';
  return`<div style="margin-top:10px;font-size:12px;color:#64748b">${rows.length} entrega(s) recibida(s) · ${Z.ents[t.id+'_d']||0} descarga(s) registradas</div><div class="aic-table-wrap"><table><thead><tr><th>ESTUDIANTE</th><th>ARCHIVO</th><th>FECHA</th><th>NOTA (0-5)</th><th>COMENTARIO</th><th></th></tr></thead><tbody>${rows.map(x=>`<tr><td>${e(x.profiles?.full_name||'')}</td><td><a href="#" class="aic-link" onclick="VIRT.verEnt('${x.path}');return false">${e(x.nombre)}</a> <small>${mb(x.size)}</small></td><td>${fF(x.created_at)}${t.fecha_limite&&new Date(x.created_at)>new Date(t.fecha_limite)?' <span style="color:#b91c1c">(tarde)</span>':''}</td><td><input id="n_${x.id}" type="number" step="0.1" min="0" max="5" value="${x.nota??''}" style="width:70px;border:1px solid #cbd5e1;border-radius:6px;padding:4px"></td><td><input id="r_${x.id}" value="${e(x.retroalimentacion||'')}" placeholder="Retroalimentación" style="width:100%;min-width:140px;border:1px solid #cbd5e1;border-radius:6px;padding:4px"></td><td><button class="aic-link" onclick="VIRT.nota('${x.id}','${t.id}')">💾</button></td></tr>`).join('')||'<tr><td colspan="6">Todavía no hay entregas.</td></tr>'}</tbody></table></div>`;
}
/* ---------- estudiante ---------- */
function estView(){
  const lista=Z.lista.filter(t=>t.activo).map(t=>{
    const mis=Z.mis[t.id]||[],usadas=mis.length,vencida=t.fecha_limite&&new Date()>new Date(t.fecha_limite),cierra=t.tipo==='trabajo'&&vencida&&!t.permite_tarde,agot=usadas>=t.max_entregas;
    const arch=(t.virtual_archivos||[]).map(a=>{const u=Z.desc[a.id]||0,ag=t.max_descargas!=null&&u>=t.max_descargas;return`<button ${ag?'disabled':''} onclick="VIRT.descargar('${a.id}')" class="aic-link" style="${ag?'opacity:.4':''}">⬇ ${e(a.nombre)} <small>${t.max_descargas!=null?`(${u}/${t.max_descargas})`:''}</small></button>`}).join(' ');
    return`<div class="aic-card" style="padding:14px;margin-bottom:10px"><b>${t.tipo==='trabajo'?'📎':'📥'} ${e(t.titulo)}</b><div style="font-size:12px;color:#64748b">Límite: ${fF(t.fecha_limite)}${vencida?' (vencida)':''}</div>
     ${t.descripcion?`<p style="font-size:13px;margin:6px 0;white-space:pre-wrap">${e(t.descripcion)}</p>`:''}
     ${arch?`<div style="margin:6px 0">${arch}</div>`:''}
     ${t.tipo==='trabajo'?`<div style="font-size:13px;margin-top:8px;border-top:1px solid #e2e8f0;padding-top:8px">Entregas usadas: <b>${usadas} de ${t.max_entregas}</b> · Máx. ${t.max_mb} MB · Tipos: ${t.tipos_permitidos.map(x=>'.'+x).join(' ')}
       ${mis.map(m=>`<div style="margin-top:4px">✅ ${e(m.nombre)} <small>(${fF(m.created_at)})</small>${m.nota!=null?` · <b>Nota ${m.nota}</b>`:' · sin calificar'}${m.retroalimentacion?`<div style="color:#475569">💬 ${e(m.retroalimentacion)}</div>`:''}</div>`).join('')}
       ${cierra?'<div style="color:#b91c1c;margin-top:6px">Ya no se reciben entregas.</div>':agot?'<div style="color:#b45309;margin-top:6px">Ya usaste todas tus entregas.</div>':`<div style="margin-top:8px"><input type="file" id="f_${t.id}" accept="${t.tipos_permitidos.map(x=>'.'+x).join(',')}"> <input id="c_${t.id}" placeholder="Comentario (opcional)" style="border:1px solid #cbd5e1;border-radius:8px;padding:6px"> <button onclick="VIRT.entregar('${t.id}')" style="padding:8px 14px;border-radius:10px;background:#059669;color:#fff;border:0;font-weight:700">⬆ Entregar</button></div>`}</div>`:''}</div>`}).join('')||'<p style="color:#64748b">Tu docente aún no ha publicado trabajos ni materiales.</p>';
  return`<div><h2 style="font-weight:800;font-size:20px;margin-bottom:10px">📎 Trabajos y entregas</h2>${lista}</div>`;
}
const api={
  load,view:()=>isEst()?estView():docView(),
  set(k,v){Z.f[k]=v;if(k==='tipo')R()},
  curso(id,on){const s=new Set(Z.f.cursos);on?s.add(id):s.delete(id);Z.f.cursos=[...s]},
  tipo(t,on){const s=new Set(Z.f.tipos);on?s.add(t):s.delete(t);Z.f.tipos=[...s]},
  archivos(fl){Z.f.files=[...fl];R()},
  crear,entregas:verEntregas,
  async bajar(id){Z.arch[id]=!Z.arch[id];R()},
  async verArch(aid){const r=await sb.rpc('virtual_pedir_descarga',{p_archivo:aid});if(r.error)return err(r.error);const u=await sb.storage.from('virtual-material').createSignedUrl(r.data,120);if(u.error)return err(u.error);window.open(u.data.signedUrl,'_blank')},
  async descargar(aid){await api.verArch(aid);await load();R()},
  async verEnt(path){const u=await sb.storage.from('virtual-entregas').createSignedUrl(path,120);if(u.error)return err(u.error);window.open(u.data.signedUrl,'_blank')},
  async nota(id,tid){
    const n=document.getElementById('n_'+id).value,rt=document.getElementById('r_'+id).value.trim();
    const r=await sb.from('virtual_entregas').update({nota:n===''?null:+n,retroalimentacion:rt||null}).eq('id',id);
    if(r.error)return err(r.error);toast('✅','Calificación guardada','');
  },
  async limites(id){
    const t=Z.lista.find(x=>x.id===id);
    const d=prompt('Descargas máximas por estudiante y archivo (vacío = sin límite):',t.max_descargas??'');if(d===null)return;
    const patch={max_descargas:d.trim()===''?null:Math.max(1,Math.min(100,+d||1))};
    if(t.tipo==='trabajo'){
      const en=prompt('Entregas máximas por estudiante (1 a 10):',t.max_entregas);if(en===null)return;
      const m=prompt('Peso máximo del archivo en MB (1 a 25):',t.max_mb);if(m===null)return;
      patch.max_entregas=Math.max(1,Math.min(10,+en||1));patch.max_mb=Math.max(1,Math.min(25,+m||10));
      patch.permite_tarde=confirm('¿Aceptar entregas después de la fecha límite?\n\nAceptar = sí · Cancelar = no');
    }
    const r=await sb.from('virtual_trabajos').update(patch).eq('id',id);if(r.error)return err(r.error);
    await load();R();
  },
  async activo(id,on){const r=await sb.from('virtual_trabajos').update({activo:on}).eq('id',id);if(r.error)return err(r.error);await load();R()},
  async borrar(id){
    if(!confirm('¿Borrar este material o trabajo con sus archivos y entregas?'))return;
    const t=Z.lista.find(x=>x.id===id);
    const a=await sb.from('virtual_archivos').select('path').eq('trabajo_id',id);
    if(a.data&&a.data.length)await sb.storage.from('virtual-material').remove(a.data.map(x=>x.path));
    const en=await sb.from('virtual_entregas').select('path').eq('trabajo_id',id);
    if(en.data&&en.data.length)await sb.storage.from('virtual-entregas').remove(en.data.map(x=>x.path));
    const r=await sb.from('virtual_trabajos').delete().eq('id',id);if(r.error)return err(r.error);
    await load();R();
  },
  async entregar(tid){
    const inpf=document.getElementById('f_'+tid),file=inpf&&inpf.files[0];
    if(!file)return toast('⚠️','Elige el archivo','Pulsa "Elegir archivo" primero.');
    const com=(document.getElementById('c_'+tid)?.value||'').trim();
    toast('⏳','Subiendo…',file.name);
    const p=await sb.rpc('virtual_pedir_entrega',{p_trabajo:tid,p_nombre:file.name,p_size:file.size});
    if(p.error)return err(p.error);
    const up=await sb.storage.from('virtual-entregas').upload(p.data.path,file,{upsert:false});
    if(up.error){await sb.rpc('virtual_cancelar_entrega',{p_entrega:p.data.entrega_id});return err(up.error)}
    const c=await sb.rpc('virtual_confirmar_entrega',{p_entrega:p.data.entrega_id,p_comentario:com||null});
    if(c.error){await sb.rpc('virtual_cancelar_entrega',{p_entrega:p.data.entrega_id});return err(c.error)}
    toast('✅','Entrega enviada',file.name);await load();R();
  }
};
return api;
})();
