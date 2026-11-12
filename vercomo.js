/* AULA360 — "Entrar al entorno" de un docente o coordinador (rector / coordinador): se ve TODO lo suyo, solo para consultar.
   Usa una sesión temporal que vive solo en esta pestaña (no se guarda) y bloquea cualquier cambio. */
window.VC=(function(){
const URL_=window.AULA360_SUPABASE.url,KEY=window.AULA360_SUPABASE.publishableKey;
const MSG='Estás en modo consulta: desde aquí no se puede cambiar nada.';
const READ_RPC=new Set(['asistencia_docentes','asistencia_estado','asistencia_listar','asistencia_mi_doc','avail_counts','banco_saber_cobertura','clase_abiertas','clase_lista','clase_reporte','directorio_colegio','get_leaderboard','lista_colegio_curso','mensajes_pendientes','periodo_banco','periodo_preguntas','planeador_recibidos','saber_disponibilidad','saber_imp_contenido','saber_imp_estudiantes','saber_imp_resultados']);
let V=null; // {real, nombre, rol, volver}
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function negado(){
  const r={data:null,error:{message:MSG},count:null};
  const p=new Proxy(function(){},{get(_,k){if(k==='then')return(ok,no)=>Promise.resolve(r).then(ok,no);return()=>p},apply(){return p}});
  return p}
function candado(c){
  const W=['insert','update','upsert','delete'];
  return new Proxy(c,{get(t,k){
    if(k==='from')return tb=>new Proxy(t.from(tb),{get(b,m){if(W.includes(m))return()=>negado();const v=b[m];return typeof v==='function'?v.bind(b):v}});
    if(k==='rpc')return(n,a,o)=>READ_RPC.has(n)?t.rpc(n,a,o):negado();
    if(k==='functions')return{invoke:()=>negado()};
    if(k==='storage')return{from:bk=>{const s=t.storage.from(bk);return{download:s.download.bind(s),createSignedUrl:s.createSignedUrl.bind(s),createSignedUrls:s.createSignedUrls.bind(s),getPublicUrl:s.getPublicUrl.bind(s),list:s.list.bind(s),upload:()=>negado(),remove:()=>negado(),update:()=>negado(),move:()=>negado()}}};
    if(k==='auth')return{getSession:()=>t.auth.getSession(),getUser:()=>t.auth.getUser(),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:()=>api.salir(),updateUser:()=>negado(),signInWithPassword:()=>negado()};
    const v=t[k];return typeof v==='function'?v.bind(t):v}})}
function banner(){
  if(!V)return'';
  return`<div id="vc-banner" style="position:sticky;top:0;z-index:50;background:#b45309;color:#fff;padding:10px 14px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;border-radius:0 0 12px 12px;box-shadow:0 2px 8px #0003"><div style="font-weight:800;font-size:14px">👁 Estás viendo el entorno de ${e(V.nombre)} <span style="font-weight:400">· ${e(V.rol)} · solo consulta, no se puede cambiar nada</span></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button onclick="VC.resumen()" style="background:#fef3c7;color:#92400e;padding:8px 14px;border-radius:10px;font-weight:800">📊 Resumen de esta sección</button><button onclick="VC.salir()" style="background:#fff;color:#92400e;padding:8px 14px;border-radius:10px;font-weight:800">↩ Volver a mi entorno</button></div></div>`}

/* ---------- Pantalla en solo consulta: todo desactivado, menos el menú y los botones que solo sirven para MIRAR ---------- */
const OK_MENU='.aic-sidebar,.aic-tabs,#vc-banner,.aic-hamb,.aic-back,#vc-panel';
const OK_VER=/^\s*([\w$]+\.p(\+\+|--);|go\(|[\w$.]+\.(go|sub|tab|ver|det|open|view|pag|pg|next|prev|tog\w*|mostrar\w*|ocultar\w*)\()/i;
const permitido=el=>{
  if(el.closest(OK_MENU))return true;
  if(el.tagName==='A')return true;
  if(el.tagName==='BUTTON'||el.hasAttribute('onclick')){const h=el.getAttribute('onclick')||'';return OK_VER.test(h)&&!/(guardar|enviar|borrar|eliminar|crear|publicar|subir|calific|aprob|cerrar|marcar|quitar|agregar|nuevo|save|del|set\w*\()/i.test(h)}
  return false};
function bloquear(root){
  if(!V||!root)return;
  root.querySelectorAll('input,select,textarea,button,[contenteditable],[onclick]').forEach(el=>{
    if(el.dataset.vcOk)return;
    if(el.matches('input,select,textarea')){if(el.closest(OK_MENU))return;el.disabled=true;el.readOnly=true}
    else if(el.hasAttribute('contenteditable')){el.setAttribute('contenteditable','false')}
    else if(!permitido(el)){if(el.tagName==='BUTTON')el.disabled=true;el.style.opacity='.5';el.style.cursor='not-allowed';el.style.pointerEvents=el.tagName==='BUTTON'?'':'none'}
    el.title=el.disabled||el.style.cursor==='not-allowed'?'Solo consulta: no se puede cambiar nada':el.title;
  })}

/* ---------- Botón "Resumen": todo lo que ha hecho la persona en esa sección (auditoría, solo lectura) ---------- */
const gr=g=>g===0?'Transición':(g==null?'':g+'°');
const fh=d=>d?new Date(d).toLocaleString('es-CO',{dateStyle:'medium',timeStyle:'short'}):'—';
const fd=d=>d?new Date(d+(String(d).length===10?'T12:00:00':'')).toLocaleDateString('es-CO',{dateStyle:'medium'}):'—';
const cut=(t,n=90)=>{t=String(t??'');return t.length>n?t.slice(0,n)+'…':t};
// B(tabla, columna dueña, título, columna fecha, columnas, fila->[detalle, estado])
const B=(tb,own,ti,dc,sel,fn,extra)=>({tb,own,ti,dc,sel,fn,extra});
const SEC={
 cur:[B('courses','teacher_id','Cursos creados','created_at','grade,name,created_at',r=>[gr(r.grade)+' '+r.name,''])],
 simp:[B('simulacros','teacher_id','Simulacros y tareas','created_at','title,kind,subject,grade,active,created_at',r=>[r.title+' · '+(r.subject||'')+' '+gr(r.grade),(r.kind||'')+(r.active?' · activo':' · inactivo')]),B('saber_sims','teacher_id','Simulacros Saber 11 virtuales','created_at','title,modo,active,created_at',r=>[r.title,(r.modo||'')+(r.active?' · activo':'')])],
 diag:[B('saber_imp','creator_id','Diagnósticos y simulacros impresos','created_at','title,kind,exam_date,created_at',r=>[r.title,(r.kind||'')+' · aplicación '+fd(r.exam_date)])],
 saberimp:[B('saber_imp','creator_id','Simulacros y diagnósticos creados','created_at','title,kind,exam_date,created_at',r=>[r.title,(r.kind||'')+' · aplicación '+fd(r.exam_date)])],
 periodo:[B('periodo_pruebas','docente_id','Pruebas y exámenes','created_at','titulo,asignatura,grado,estado,abre,cierra,created_at',r=>[r.titulo+' · '+(r.asignatura||'')+' '+gr(r.grado),(r.estado||'')+' · '+fh(r.abre)+' a '+fh(r.cierra)])],
 imp:[B('print_jobs','teacher_id','Pruebas impresas','created_at','title,subject,grade,n_questions,created_at',r=>[r.title+' · '+(r.subject||'')+' '+gr(r.grade),r.n_questions+' preguntas'])],
 cal:[B('print_results','graded_by','Hojas calificadas','graded_at','graded_at,correct,wrong,nota',r=>['Hoja calificada','Nota '+r.nota+' · '+r.correct+' bien, '+r.wrong+' mal'])],
 preg:[B('questions','autor_id','Preguntas que subió','','body,subject,grade,status',r=>[cut(r.body),(r.subject||'')+' '+gr(r.grade)+' · '+(r.status||'')])],
 subirp:[B('questions','autor_id','Preguntas que subió','','body,subject,grade,status',r=>[cut(r.body),(r.subject||'')+' '+gr(r.grade)+' · '+(r.status||'')])],
 virtual:[B('virtual_trabajos','docente_id','Trabajos publicados','created_at','titulo,tipo,fecha_limite,activo,created_at',r=>[r.titulo,(r.tipo||'')+' · límite '+fh(r.fecha_limite)+(r.activo?'':' · cerrado')]),{custom:'entregas'}],
 taller:[B('virtual_trabajos','docente_id','Trabajos publicados','created_at','titulo,tipo,fecha_limite,activo,created_at',r=>[r.titulo,(r.tipo||'')+' · límite '+fh(r.fecha_limite)]),{custom:'entregas'}],
 aclase:[B('clase_sesiones','docente_id','Clases con asistencia abierta','abierta_at','asignatura,area,abierta_at,cerrada_at',r=>[(r.asignatura||'')+(r.area?' · '+r.area:''),r.cerrada_at?'Cerrada '+fh(r.cerrada_at):'Abierta'])],
 asis_dir:[B('asistencia_docente','registrado_por','Llegadas y salidas que registró','at','tipo,at',r=>['Registró '+r.tipo,''])],
 clase:[B('class_settings','teacher_id','Clase en vivo','updated_at','title,video_url,is_live,updated_at',r=>[r.title||'Clase',r.is_live?'EN VIVO':'Sin iniciar']),B('clase_sesiones','docente_id','Asistencias abiertas','abierta_at','asignatura,abierta_at,cerrada_at',r=>[r.asignatura||'',r.cerrada_at?'Cerrada':'Abierta'])],
 asis:[B('asistencia_docente','docente_id','Llegadas y salidas registradas','at','tipo,at',r=>[r.tipo==='entrada'?'Llegada':'Salida',''])],
 planeador:[B('planeador_diario','docente_id','Día a día (planeador)','fecha','fecha,asignatura,grado,grupo,estado,enviado_at',r=>[fd(r.fecha)+' · '+(r.asignatura||'')+' '+gr(r.grado)+' '+(r.grupo||''),(r.estado||'')+(r.enviado_at?' · enviado '+fh(r.enviado_at):'')])],
 plan:[B('planes_area','docente_id','Plan de área','updated_at','asignatura,grado,anio,archivo_nombre,updated_at',r=>[(r.asignatura||'')+' '+gr(r.grado)+' · '+(r.anio||''),r.archivo_nombre||'Sin archivo'])],
 claseia:[B('clases_preparadas','docente_id','Clases preparadas','created_at','titulo,grado,asignatura,usa_ia,created_at',r=>[r.titulo+' · '+(r.asignatura||'')+' '+gr(r.grado),r.usa_ia?'Con IA':'Sin IA'])],
 talleria:[B('talleres_preparados','docente_id','Talleres preparados','created_at','titulo,grado,asignatura,usa_ia,created_at',r=>[r.titulo+' · '+(r.asignatura||'')+' '+gr(r.grado),r.usa_ia?'Con IA':'Sin IA'])],
 guias:[B('guia_envios','docente_id','Guías enviadas a cursos','created_at','guia_id,created_at',r=>['Guía enviada',''])],
 permisos:[B('permisos','solicitante_id','Permisos que pidió','created_at','motivo,fecha_desde,fecha_hasta,estado,respuesta,created_at',r=>[r.motivo+' · '+fd(r.fecha_desde)+' a '+fd(r.fecha_hasta),(r.estado||'')+(r.respuesta?' · '+cut(r.respuesta,50):'')]),B('permisos','respondido_por','Permisos que respondió','respondido_at','motivo,estado,respondido_at',r=>[r.motivo,r.estado])],
 msgs:[B('mensajes','de_id','Mensajes enviados','created_at','asunto,tipo,created_at',r=>[cut(r.asunto||'(sin asunto)'),r.tipo||'']),B('mensajes','para_id','Mensajes recibidos','created_at','asunto,tipo,leido_at,created_at',r=>[cut(r.asunto||'(sin asunto)'),(r.tipo||'')+(r.leido_at?' · leído':' · sin leer')])],
 mhor:[B('hz_asignaciones','docente_id','Asignación académica','','horas',r=>['Asignación',(r.horas||0)+' horas'])],
 reun:[B('reuniones','creado_por','Reuniones virtuales','created_at','titulo,en_vivo,created_at',r=>[r.titulo,r.en_vivo?'EN VIVO':''])]
};
SEC.prof=['cur','simp','periodo','imp','cal','virtual','aclase','planeador','plan','claseia','talleria','guias','permisos','msgs'].flatMap(k=>SEC[k].filter(b=>!b.custom));
SEC.dcol=['saberimp','permisos','msgs','reun','asis','planeador'].flatMap(k=>k==='asis'?SEC.asis_dir:k==='planeador'?[B('planeador_diario','revisado_por','Planeadores que revisó','revisado_at','fecha,asignatura,estado,revisado_at',r=>[fd(r.fecha)+' · '+(r.asignatura||''),r.estado||''])]:SEC[k]);
SEC.plan_dir=[B('planeador_diario','revisado_por','Planeadores que revisó','revisado_at','fecha,asignatura,estado,revisado_at',r=>[fd(r.fecha)+' · '+(r.asignatura||''),r.estado||''])];
async function bloque(b,uid,desde){
  if(b.custom==='entregas'){
    const t=await sb.from('virtual_trabajos').select('id').eq('docente_id',uid).limit(1000),ids=(t.data||[]).map(x=>x.id);
    if(!ids.length)return{ti:'Entregas de estudiantes',n:0,n30:0,filas:[],cab:['Fecha','Detalle','Estado']};
    const a=await sb.from('virtual_entregas').select('created_at,nombre,estado,nota',{count:'exact'}).in('trabajo_id',ids).order('created_at',{ascending:false}).limit(25);
    const c=await sb.from('virtual_entregas').select('id',{count:'exact',head:true}).in('trabajo_id',ids).not('nota','is',null);
    return{ti:'Entregas de estudiantes',n:a.count||0,n30:null,extra:(c.count||0)+' con nota puesta',filas:(a.data||[]).map(r=>[fh(r.created_at),cut(r.nombre||'Entrega'),(r.estado||'')+(r.nota!=null?' · nota '+r.nota:' · sin nota')]),cab:['Fecha','Detalle','Estado']}}
  let q=sb.from(b.tb).select(b.sel,{count:'exact'}).eq(b.own,uid);
  if(b.dc)q=q.order(b.dc,{ascending:false});
  const a=await q.limit(25);
  let n30=null;
  if(b.dc){const c=await sb.from(b.tb).select('id',{count:'exact',head:true}).eq(b.own,uid).gte(b.dc,desde);n30=c.count}
  if(a.error)return{ti:b.ti,n:0,n30:null,err:a.error.message,filas:[],cab:[]};
  return{ti:b.ti,n:a.count||0,n30,filas:(a.data||[]).map(r=>{const f=b.fn(r);return[b.dc?fh(r[b.dc]):'—',...f]}),cab:['Fecha','Detalle','Estado']}}
const ee=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let RS=null;
async function resumen(){
  if(!V)return;
  const tabNow=tab,dir=M&&M.role==='coordinador',bl=(dir&&tabNow==='asis'?SEC.asis_dir:dir&&tabNow==='planeador'?SEC.plan_dir:SEC[tabNow]||null),tit=(document.querySelector('.aic-top h1')||{}).textContent||'Esta sección';
  const o=document.createElement('div');o.id='vc-panel';o.style.cssText='position:fixed;inset:0;z-index:9998;background:#0008;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:20px 12px';
  o.innerHTML=`<div style="background:#fff;border-radius:16px;max-width:900px;width:100%;padding:18px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><h2 style="font-weight:800;font-size:20px">📊 Resumen · ${ee(tit)}</h2><button onclick="VC.cerrarRes()" style="background:#e2e8f0;padding:8px 14px;border-radius:10px;font-weight:800">✕ Cerrar</button></div><p style="font-size:13px;color:#64748b;margin:4px 0 10px">Lo que ha hecho <b>${ee(V.nombre)}</b> en esta sección. Solo consulta.</p><div id="vc-res">Cargando…</div></div>`;
  document.body.appendChild(o);
  if(!bl){document.getElementById('vc-res').innerHTML='<p style="font-size:14px">Esta sección no tiene actividad propia para resumir. Usa el menú para ver las demás.</p>';return}
  try{
    const uid=M.id,desde=new Date(Date.now()-30*864e5).toISOString().slice(0,10);
    const rs=await Promise.all(bl.map(b=>bloque(b,uid,desde)));
    RS={tit,nombre:V.nombre,rs};
    document.getElementById('vc-res').innerHTML=rs.map(r=>`<div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:12px"><div style="display:flex;flex-wrap:wrap;gap:12px;align-items:baseline;justify-content:space-between"><b>${ee(r.ti)}</b><span style="font-size:13px"><b style="font-size:20px">${r.n}</b> en total${r.n30!=null?' · <b>'+r.n30+'</b> en los últimos 30 días':''}${r.extra?' · '+ee(r.extra):''}</span></div>${r.err?'<p style="color:#b91c1c;font-size:13px">No se pudo leer: '+ee(r.err)+'</p>':r.filas.length?`<div style="overflow:auto;margin-top:8px"><table style="width:100%;font-size:13px;border-collapse:collapse"><thead><tr style="text-align:left;color:#64748b">${r.cab.map(c=>'<th style="padding:4px 8px">'+c+'</th>').join('')}</tr></thead><tbody>${r.filas.map(f=>'<tr style="border-top:1px solid #f1f5f9">'+f.map(c=>'<td style="padding:5px 8px">'+ee(c)+'</td>').join('')+'</tr>').join('')}</tbody></table></div><p style="font-size:11px;color:#94a3b8;margin-top:4px">Se muestran los 25 más recientes.</p>`:'<p style="font-size:13px;color:#64748b;margin-top:6px">Todavía no ha hecho nada aquí.</p>'}</div>`).join('')+'<button onclick="VC.csvRes()" style="background:#246be0;color:#fff;padding:9px 14px;border-radius:10px;font-weight:800">⬇ Descargar este resumen (Excel)</button>';
  }catch(x){document.getElementById('vc-res').innerHTML='<p style="color:#b91c1c">'+ee(x.message||x)+'</p>'}
}

let obs=null,fr=0;
function guardia(ev){
  if(!V)return;const t=ev.target;if(!t||!t.closest)return;
  const el=t.closest('button,input,select,textarea,label,[onclick],a');if(!el)return;
  if(el.tagName==='A'||permitido(el)&&!el.matches('input,select,textarea'))return;
  if(el.closest&&el.closest(OK_MENU)&&!el.matches('input,select,textarea'))return;
  ev.preventDefault();ev.stopImmediatePropagation();toast('👁','Solo consulta','Desde aquí no se puede cambiar nada.')}
function activarLock(){
  const root=document.getElementById('app');if(!root)return;
  bloquear(root);
  obs=new MutationObserver(()=>{if(fr)return;fr=requestAnimationFrame(()=>{fr=0;bloquear(root)})});
  obs.observe(root,{childList:true,subtree:true});
  ['click','change','input','keydown','submit'].forEach(k=>document.addEventListener(k,guardia,true))}
function quitarLock(){
  if(obs){obs.disconnect();obs=null}
  ['click','change','input','keydown','submit'].forEach(k=>document.removeEventListener(k,guardia,true))}
const api={resumen,cerrarRes(){const p=document.getElementById('vc-panel');if(p)p.remove()},
  csvRes(){if(!RS)return;const l=[['Sección',RS.tit,'Persona',RS.nombre],[]];RS.rs.forEach(r=>{l.push([r.ti,'Total',r.n]);l.push(r.cab);r.filas.forEach(f=>l.push(f));l.push([])});
    const t='\ufeff'+l.map(r=>r.map(c=>'"'+String(c??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/csv;charset=utf-8'}));a.download='resumen_'+String(RS.tit).replace(/\W+/g,'_')+'.csv';a.click()},
  _t:{bloquear,guardia,set:v=>{V=v}},on:()=>!!V,banner,
  async entrar(id,nombre,rol){
    if(V)return;
    try{
      toast('⏳','Entrando al entorno…','Un momento.');
      const r=await sb.functions.invoke('ver-como',{body:{target:id}});
      if(r.error){let m=r.error.message;try{const j=await r.error.context.json();if(j&&j.error)m=j.error}catch(x){}throw new Error(m)}
      if(!r.data||!r.data.access_token)throw new Error((r.data&&r.data.error)||'No se pudo entrar');
      const mem={};const vsb=supabase.createClient(URL_,KEY,{auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'aic-ver-como',storage:{getItem:k=>mem[k]??null,setItem:(k,v)=>{mem[k]=v},removeItem:k=>{delete mem[k]}}}});
      const o=await vsb.auth.setSession({access_token:r.data.access_token,refresh_token:r.data.refresh_token});
      if(o.error)throw o.error;
      const volver=tab;
      V={real:sb,vsb,nombre,rol:rol==='coordinador'?'Coordinador':'Docente',volver};
      try{leaveChat();if(liveChan){sb.removeChannel(liveChan);liveChan=null}}catch(x){}
      sb=candado(vsb);D={};tab=rol==='coordinador'?'dcol':'prof';
      await boot();
      if(M&&M.id!==id){await api.salir();throw new Error('No se pudo abrir ese entorno')}
      activarLock();window.scrollTo(0,0);
    }catch(x){err(x)}
  },
  async salir(){
    if(!V)return;
    const volver=V.volver,real=V.real;
    try{leaveChat();if(liveChan){sb.removeChannel(liveChan);liveChan=null}}catch(x){}
    try{await V.vsb.auth.signOut({scope:'local'})}catch(x){}
    quitarLock();api.cerrarRes();sb=real;V=null;D={};M=null;
    await boot();
    if(M)go(['ddoc','dcoo'].includes(volver)?volver:'ddoc');
  }
};
return api})();
