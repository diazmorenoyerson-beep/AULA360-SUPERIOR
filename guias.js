/* AULA360 — Guías de trabajo.
   Administrador: sube guías por grado. Docente: descarga las de la plataforma, sube las suyas y las envía a los estudiantes de un grado.
   Estudiante: ve y descarga las guías que le enviaron sus docentes. */
window.GUI=(function(){
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const R=()=>render();
const fd=x=>x?new Date(x).toLocaleDateString('es-CO'):'';
const gl=g=>g===0?'Transición':g+'°';
const kb=n=>n?(n>1048576?(n/1048576).toFixed(1)+' MB':Math.round(n/1024)+' KB'):'';
let Z={grado:'',plat:[],mias:[],env:{},cursos:[],recibidas:[],titulo:'',busy:false};
const inp='style="width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:8px"';
const ACC='.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg';
const rol=()=>M.role==='est'?'est':(M.role==='prof'&&tabActual()==='guiasadm'?'adm':'prof');
const tabActual=()=>tab;
async function load(t){
  if(M.role==='est'){
    const r=await sb.from('guia_envios').select('created_at,guias(id,titulo,nombre,path,grado)').order('created_at',{ascending:false});if(r.error)throw r.error;
    Z.recibidas=(r.data||[]).filter(x=>x.guias);return;
  }
  const g=await sb.from('guias').select('*').order('created_at',{ascending:false});if(g.error)throw g.error;
  Z.plat=(g.data||[]).filter(x=>x.ambito==='plataforma');Z.mias=(g.data||[]).filter(x=>x.ambito==='docente'&&x.owner_id===M.id);
  if(t==='guias'){
    const c=await sb.from('courses').select('id,grade,name').eq('teacher_id',M.id).order('grade').order('name');Z.cursos=c.data||[];
    const e2=await sb.from('guia_envios').select('guia_id,course_id').eq('docente_id',M.id);Z.env={};
    (e2.data||[]).forEach(x=>(Z.env[x.guia_id]=Z.env[x.guia_id]||[]).push(x.course_id));
  }
}
const selGrado=(fn)=>`<label style="font-size:13px">Grado<select ${inp} onchange="${fn}(this.value)"><option value="">Elige el grado…</option>${[...Array(12).keys()].map(g=>`<option value="${g}" ${String(g)===String(Z.grado)?'selected':''}>${gl(g)}</option>`).join('')}</select></label>`;
function filaG(g,acc){return`<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;margin-bottom:8px"><div><b>${e(g.titulo)}</b><div style="font-size:12px;color:#64748b">${gl(g.grado)} · ${e(g.nombre)} · ${kb(g.size)} · ${fd(g.created_at)}</div>${acc.extra||''}</div><div style="display:flex;gap:8px;flex-wrap:wrap">${acc.btns}</div></div>`}
function vAdm(){
  const lista=Z.grado===''?[]:Z.plat.filter(g=>String(g.grado)===String(Z.grado));
  return`<div style="display:grid;gap:14px"><div class="aic-card" style="padding:16px"><h3 style="font-weight:800;font-size:17px">📤 Subir guías de trabajo</h3><p style="font-size:13px;color:#64748b;margin:4px 0 10px">Elige el grado y sube el archivo. Los docentes lo verán en <b>Descargar guías</b> cuando elijan ese grado.</p>
   <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">${selGrado('GUI.setG')}
   <label style="font-size:13px">Título (opcional)<input ${inp} value="${e(Z.titulo)}" oninput="GUI.titulo=this.value"></label>
   <label style="font-size:13px">Archivo<input id="gui-f" type="file" accept="${ACC}" style="display:block;margin-top:6px"></label></div>
   <div style="margin-top:10px"><button onclick="GUI.subir('plataforma')" ${Z.busy?'disabled':''} style="background:#246be0;color:#fff;padding:10px 16px;border-radius:10px;font-weight:800">⬆ Subir archivo</button></div></div>
  <div class="aic-card" style="padding:16px"><h3 style="font-weight:800;font-size:17px">Guías de ${Z.grado===''?'…':gl(+Z.grado)}</h3>${Z.grado===''?'<p style="font-size:13px;color:#64748b">Elige un grado para ver sus guías.</p>':(lista.map(g=>filaG(g,{btns:`<button class="aic-link" onclick="GUI.bajar('${g.id}')">⬇ Descargar</button><button class="aic-link" onclick="GUI.borrar('${g.id}')">🗑 Quitar</button>`})).join('')||'<p style="font-size:13px;color:#64748b">Aún no hay guías para este grado.</p>')}</div></div>`;
}
function vProf(){
  const g=Z.grado,sel=g!=='';
  const plat=sel?Z.plat.filter(x=>String(x.grado)===String(g)):[],mias=sel?Z.mias.filter(x=>String(x.grado)===String(g)):[];
  const cursosG=sel?Z.cursos.filter(c=>String(c.grade)===String(g)):[];
  const btn=x=>`<button class="aic-link" onclick="GUI.bajar('${x.id}')">⬇ Descargar</button><button onclick="GUI.enviar('${x.id}')" ${cursosG.length?'':'disabled title="No tienes cursos de este grado"'} style="background:#16a34a;color:#fff;padding:7px 12px;border-radius:8px;font-weight:700;font-size:13px;${cursosG.length?'':'opacity:.5'}">📨 Enviar guía a estudiantes de ${gl(+g)}</button>`;
  const ext=x=>{const c=(Z.env[x.id]||[]).map(id=>{const k=Z.cursos.find(y=>y.id===id);return k?k.grade+'° '+e(k.name):''}).filter(Boolean);return c.length?`<div style="font-size:12px;color:#15803d">✔ Enviada a: ${c.join(', ')}</div>`:''};
  return`<div style="display:grid;gap:14px"><div class="aic-card" style="padding:16px"><h3 style="font-weight:800;font-size:17px">📚 Descargar guías</h3><p style="font-size:13px;color:#64748b;margin:4px 0 10px">Primero elige el grado. Podrás descargar las guías de la plataforma, subir las tuyas y enviarlas a los estudiantes de ese grado.</p>
   <div style="max-width:300px">${selGrado('GUI.setG')}</div>
   ${sel&&!cursosG.length?`<p style="font-size:12px;color:#b45309;margin-top:8px">No tienes cursos de ${gl(+g)}, por eso no puedes enviar guías a ese grado. Sí puedes descargarlas.</p>`:''}</div>
  ${sel?`<div class="aic-card" style="padding:16px"><h3 style="font-weight:800;font-size:16px">Guías de la plataforma · ${gl(+g)}</h3>${plat.map(x=>filaG(x,{btns:btn(x),extra:ext(x)})).join('')||'<p style="font-size:13px;color:#64748b">Todavía no hay guías para este grado.</p>'}</div>
  <div class="aic-card" style="padding:16px"><h3 style="font-weight:800;font-size:16px">Mis guías · ${gl(+g)}</h3>${mias.map(x=>filaG(x,{btns:btn(x)+`<button class="aic-link" onclick="GUI.borrar('${x.id}')">🗑</button>`,extra:ext(x)})).join('')||'<p style="font-size:13px;color:#64748b">Aún no has subido guías de este grado.</p>'}
   <div style="border-top:1px solid #e2e8f0;margin-top:12px;padding-top:12px"><b style="font-size:14px">⬆ Subir guía en ${gl(+g)}</b><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:8px"><label style="font-size:13px">Título (opcional)<input ${inp} value="${e(Z.titulo)}" oninput="GUI.titulo=this.value"></label><label style="font-size:13px">Archivo<input id="gui-f" type="file" accept="${ACC}" style="display:block;margin-top:6px"></label></div><div style="margin-top:10px"><button onclick="GUI.subir('docente')" ${Z.busy?'disabled':''} style="background:#246be0;color:#fff;padding:9px 14px;border-radius:10px;font-weight:800">⬆ Subir guía</button></div></div></div>`:''}</div>`;
}
function vEst(){
  return`<div class="aic-card" style="padding:16px"><h3 style="font-weight:800;font-size:17px">📎 Guías de trabajo</h3><p style="font-size:13px;color:#64748b;margin:4px 0 10px">Aquí están las guías que te enviaron tus docentes.</p>${Z.recibidas.map(x=>filaG(Object.assign({},x.guias,{created_at:x.created_at}),{btns:`<button class="aic-link" onclick="GUI.bajar('${x.guias.id}')">⬇ Descargar</button>`})).join('')||'<p style="font-size:13px;color:#64748b">Todavía no te han enviado guías.</p>'}</div>`;
}
const api={
  load,
  view(t){return M.role==='est'?vEst():(t==='guiasadm'?vAdm():vProf())},
  set titulo(v){Z.titulo=v},
  setG(v){Z.grado=v;R()},
  async subir(ambito){
    if(Z.busy)return;
    if(Z.grado==='')return toast('⚠️','Elige el grado primero','');
    const f=document.getElementById('gui-f')?.files?.[0];if(!f)return toast('⚠️','Elige el archivo','');
    if(f.size>25*1024*1024)return toast('⚠️','Archivo muy pesado','Máximo 25 MB.');
    if(!/\.(pdf|docx?|pptx?|xlsx?|png|jpe?g)$/i.test(f.name))return toast('⚠️','Formato no permitido','Usa PDF, Word, PowerPoint, Excel o imagen.');
    Z.busy=true;
    try{
      const path=(ambito==='plataforma'?'plataforma/':'docente/'+M.id+'/')+Date.now()+'-'+f.name.replace(/[^\w.\-]+/g,'_');
      const up=await sb.storage.from('guias').upload(path,f);if(up.error)throw up.error;
      const r=await sb.from('guias').insert({ambito,grado:+Z.grado,titulo:(Z.titulo||'').trim()||f.name.replace(/\.[^.]+$/,''),path,nombre:f.name,size:f.size,owner_id:M.id});
      if(r.error){sb.storage.from('guias').remove([path]);throw r.error}
      toast('✅','Guía subida','');Z.titulo='';
      await load(tab);
    }catch(x){Z.busy=false;return err(x)}
    Z.busy=false;R();
  },
  async bajar(id){
    const g=[...Z.plat,...Z.mias,...Z.recibidas.map(x=>x.guias)].find(x=>x&&x.id===id);if(!g)return;
    const u=await sb.storage.from('guias').createSignedUrl(g.path,120,{download:g.nombre});if(u.error)return err(u.error);window.open(u.data.signedUrl,'_blank');
  },
  async enviar(id){
    if(Z.grado==='')return toast('⚠️','Elige el grado primero','');
    if(!confirm('¿Enviar esta guía a los estudiantes de '+gl(+Z.grado)+'?'))return;
    const r=await sb.rpc('guia_enviar',{p_guia:id,p_grado:+Z.grado});if(r.error)return err(r.error);
    toast('✅','Guía enviada','Llegó a '+r.data+' curso(s) de '+gl(+Z.grado)+'. Los estudiantes la ven en Guías de trabajo.');
    await load('guias');R();
  },
  async borrar(id){
    const g=[...Z.plat,...Z.mias].find(x=>x.id===id);if(!g)return;
    if(!confirm('¿Quitar la guía "'+g.titulo+'"?'))return;
    const r=await sb.from('guias').delete().eq('id',id);if(r.error)return err(r.error);
    sb.storage.from('guias').remove([g.path]);await load(tab);R();
  }
};
return api;
})();
