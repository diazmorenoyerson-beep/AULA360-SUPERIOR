/* AulaICFES — Talleres: el docente elige taller, grado y grupo, ve a los estudiantes uno por uno,
   pulsa "Revisar taller", ve lo que subió el estudiante y pone la nota en la misma pantalla. */
window.TAL=(function(){
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fF=d=>d?new Date(d).toLocaleString('es-CO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'';
const R=()=>render();
let Z={trabajos:[],cursos:[],tid:'',grado:'',cid:'',est:[],ents:{},sel:null,url:null,ext:''};
const sel='style="border:1px solid #cbd5e1;border-radius:8px;padding:8px;min-width:150px"';
async function load(){
  const t=await sb.from('virtual_trabajos').select('id,titulo,fecha_limite,virtual_trabajo_cursos(course_id)').eq('tipo','trabajo').order('created_at',{ascending:false});
  if(t.error)throw t.error;Z.trabajos=t.data||[];
  const c=await sb.from('courses').select('id,name,grade').eq('teacher_id',M.id).order('grade').order('name');
  if(c.error)throw c.error;Z.cursos=c.data||[];
  if(Z.cid)await cargar();
}
async function cargar(){
  Z.sel=null;Z.url=null;Z.est=[];Z.ents={};
  if(!Z.cid)return;
  const p=await sb.from('profiles').select('id,full_name').eq('course_id',Z.cid).eq('role','est').order('full_name');
  if(p.error)throw p.error;Z.est=p.data||[];
  if(Z.tid){
    const r=await sb.from('virtual_entregas').select('id,user_id,nombre,path,size,comentario,nota,retroalimentacion,created_at').eq('trabajo_id',Z.tid).eq('estado','enviada').order('created_at',{ascending:false});
    if(r.error)throw r.error;
    (r.data||[]).forEach(x=>(Z.ents[x.user_id]=Z.ents[x.user_id]||[]).push(x));
  }
}
function view(){
  const tr=Z.trabajos;
  if(!tr.length)return`<div class="aic-card" style="padding:18px"><h2 style="font-weight:800;font-size:20px">📝 Talleres</h2><p style="margin-top:8px;color:#64748b">Aún no has creado talleres. Ve a <b>Trabajos y entregas</b>, crea un trabajo de tipo “trabajo” y vuelve aquí a calificarlo.</p></div>`;
  const t=tr.find(x=>x.id===Z.tid);
  const cursosT=t?Z.cursos.filter(c=>(t.virtual_trabajo_cursos||[]).some(v=>v.course_id===c.id)):[];
  const grados=[...new Set(cursosT.map(c=>c.grade))];
  const grupos=cursosT.filter(c=>String(c.grade)===String(Z.grado));
  const filtros=`<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:end">
    <label style="font-size:12px;font-weight:700">1. Taller<br><select ${sel} onchange="TAL.pick('tid',this.value)"><option value="">Elige…</option>${tr.map(x=>`<option value="${x.id}" ${x.id===Z.tid?'selected':''}>${e(x.titulo)}</option>`).join('')}</select></label>
    <label style="font-size:12px;font-weight:700">2. Grado<br><select ${sel} onchange="TAL.pick('grado',this.value)"><option value="">Elige…</option>${grados.map(g=>`<option value="${g}" ${String(g)===String(Z.grado)?'selected':''}>${g===0?'Transición':g+'°'}</option>`).join('')}</select></label>
    <label style="font-size:12px;font-weight:700">3. Grupo<br><select ${sel} onchange="TAL.pick('cid',this.value)"><option value="">Elige…</option>${grupos.map(c=>`<option value="${c.id}" ${c.id===Z.cid?'selected':''}>${e(c.name)}</option>`).join('')}</select></label></div>`;
  let lista='';
  if(Z.cid&&Z.tid){
    lista=`<div class="aic-table-wrap" style="margin-top:14px"><table><thead><tr><th>ESTUDIANTE</th><th>ESTADO</th><th>NOTA</th><th></th></tr></thead><tbody>${Z.est.map(s=>{
      const en=(Z.ents[s.id]||[])[0];
      return`<tr style="${Z.sel===s.id?'background:#eff6ff':''}"><td>${e(s.full_name)}</td><td>${en?'✅ Entregó <small>'+fF(en.created_at)+'</small>':'<span style="color:#b91c1c">Sin entregar</span>'}</td><td>${en&&en.nota!=null?'<b>'+en.nota+'</b>':'—'}</td><td>${en?`<button style="background:#246be0;color:#fff;padding:8px 14px;border-radius:8px;font-weight:700;font-size:13px" onclick="TAL.revisar('${s.id}')">Revisar taller</button>`:''}</td></tr>`}).join('')||'<tr><td colspan="4">Este grupo no tiene estudiantes.</td></tr>'}</tbody></table></div>`;
  }
  return`<div class="space-y-4"><div><h2 style="font-weight:800;font-size:20px">📝 Talleres</h2><p style="color:#64748b;font-size:13px">Elige el taller, el grado y el grupo. Pulsa “Revisar taller” en cada estudiante para ver lo que subió y ponerle la nota.</p></div>${filtros}${lista}${panel()}</div>`;
}
function panel(){
  if(!Z.sel)return'';
  const s=Z.est.find(x=>x.id===Z.sel),lst=Z.ents[Z.sel]||[];if(!s||!lst.length)return'';
  const en=lst[0],i=Z.est.findIndex(x=>x.id===Z.sel);
  const prev=Z.est.slice(0,i).reverse().find(x=>Z.ents[x.id]),next=Z.est.slice(i+1).find(x=>Z.ents[x.id]);
  let vista='';
  if(Z.url){
    if(['jpg','jpeg','png','gif','webp'].includes(Z.ext))vista=`<img src="${Z.url}" style="max-width:100%;border:1px solid #e2e8f0;border-radius:8px">`;
    else if(Z.ext==='pdf')vista=`<iframe src="${Z.url}" style="width:100%;height:70vh;border:1px solid #e2e8f0;border-radius:8px"></iframe>`;
    else vista=`<p style="font-size:13px">Este tipo de archivo no se puede ver aquí. <a class="aic-link" href="${Z.url}" target="_blank">⬇️ Descargar archivo</a></p>`;
  }
  return`<div id="tal-panel" class="aic-card" style="padding:16px;border:2px solid #2563eb;border-radius:12px;margin-top:14px">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px"><h3 style="font-weight:800">${e(s.full_name)}</h3><button class="aic-link" onclick="TAL.cerrar()">✖ Cerrar</button></div>
    <div style="font-size:12px;color:#64748b;margin:4px 0 10px">Entregado: ${fF(en.created_at)} ${lst.length>1?'· '+lst.length+' entregas':''}${en.comentario?' · Comentario: '+e(en.comentario):''}</div>
    ${lst.map(x=>`<div style="margin-bottom:6px">📎 <a href="#" class="aic-link" onclick="TAL.ver('${x.path}','${e(x.nombre)}');return false">${e(x.nombre)}</a></div>`).join('')}
    ${vista}
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:12px;align-items:end">
      <label style="font-size:12px;font-weight:700">Nota (0 a 5)<br><input id="tal-n" type="number" step="0.1" min="0" max="5" value="${en.nota??''}" style="width:90px;border:1px solid #cbd5e1;border-radius:8px;padding:8px"></label>
      <label style="font-size:12px;font-weight:700;flex:1;min-width:200px">Comentario para el estudiante<br><input id="tal-r" value="${e(en.retroalimentacion||'')}" style="width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:8px"></label>
      <button style="background:#246be0;color:#fff;padding:8px 14px;border-radius:8px;font-weight:700;font-size:13px" onclick="TAL.guardar('${en.id}')">💾 Guardar nota</button></div>
    <div style="display:flex;gap:8px;margin-top:10px">${prev?`<button class="aic-link" onclick="TAL.revisar('${prev.id}')">← Anterior</button>`:''}${next?`<button class="aic-link" onclick="TAL.revisar('${next.id}')">Siguiente →</button>`:''}</div></div>`;
}
const api={
  load,view,
  async pick(k,v){
    Z[k]=v;
    if(k==='tid'){Z.grado='';Z.cid='';Z.est=[];Z.ents={};Z.sel=null;Z.url=null}
    if(k==='grado'){Z.cid='';Z.est=[];Z.ents={};Z.sel=null;Z.url=null}
    if(k==='cid')try{await cargar()}catch(x){return err(x)}
    R();
  },
  async revisar(uid){
    Z.sel=uid;Z.url=null;
    const en=(Z.ents[uid]||[])[0];if(!en){R();return}
    await api.ver(en.path,en.nombre,true);
  },
  async ver(path,nombre,silent){
    const u=await sb.storage.from('virtual-entregas').createSignedUrl(path,600);
    if(u.error)return err(u.error);
    Z.url=u.data.signedUrl;Z.ext=(String(nombre||path).split('.').pop()||'').toLowerCase();R();
    setTimeout(()=>{const p=document.getElementById('tal-panel');if(p&&silent)p.scrollIntoView({behavior:'smooth',block:'start'})},50);
  },
  cerrar(){Z.sel=null;Z.url=null;R()},
  async guardar(id){
    const n=document.getElementById('tal-n').value,rt=document.getElementById('tal-r').value.trim();
    if(n!==''&&(+n<0||+n>5))return toast('⚠️','Nota inválida','La nota va de 0 a 5.');
    const r=await sb.from('virtual_entregas').update({nota:n===''?null:+n,retroalimentacion:rt||null}).eq('id',id);
    if(r.error)return err(r.error);
    const lst=Z.ents[Z.sel]||[];const x=lst.find(y=>y.id===id);if(x){x.nota=n===''?null:+n;x.retroalimentacion=rt||null}
    toast('✅','Nota guardada','');
    const keep=Z.url,ext=Z.ext;R();Z.url=keep;Z.ext=ext;
  }
};
return api;
})();
