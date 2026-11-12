/* AulaICFES · Módulo docente: Plan de área + Día a día
   Exporta window.DOCP = { load(tab), view(tab), ...acciones usadas por onclick } */
(function(){
'use strict';

/* ===== Constantes ===== */
const MAXB=15*1024*1024;
const EXT={pdf:'application/pdf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
const DIAS=['Lun','Mar','Mié','Jue','Vie','Sáb'];
const DIAS_L=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const ESTADOS=[['pendiente','Planeada'],['dictada','Dictada'],['no_dictada','No dictada'],['reprogramada','Reprogramada']];
const CAMPOS=[['tema','Tema','i'],['objetivo','Objetivo','t'],['inicio','Inicio (cómo arranca la clase)','t'],['desarrollo','Desarrollo','t'],['cierre','Cierre','t'],['recursos','Recursos','t'],['evaluacion','Evaluación','t'],['tarea','Tarea','t']];
const MC=[['tema','Tema o contenido'],['estandar','Estándar / DBA'],['indicador','Indicador de logro'],['evaluacion','Evaluación'],['semanas','Semanas']];

/* ===== Estado ===== */
const S={tab:'plan',planes:[],fecha:'',wk:'',items:[],open:{},busy:false,
  draft:{},dirty:{},mp:{},mopen:{},ref:null,refCache:{},areas:null,
  hz:{loaded:false,linked:false,docs:[],asigs:{},franjas:{},versiones:[],clases:[],error:''},
  manual:false,nota:''};

/* ===== Utilidades ===== */
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const pd=s=>{const a=String(s).split('-').map(Number);return new Date(a[0],a[1]-1,a[2])};
const add=(s,n)=>{const d=pd(s);d.setDate(d.getDate()+n);return ymd(d)};
const lunes=s=>{const d=pd(s);d.setDate(d.getDate()-((d.getDay()+6)%7));return ymd(d)};
const diaNum=s=>pd(s).getDay();            // 0=domingo, 1..6 = Lun..Sáb (igual que hz_clases.dia)
const bonita=s=>{const d=pd(s),n=d.getDay();return (n?DIAS_L[n-1]:'Domingo')+' '+d.getDate()+' de '+MESES[d.getMonth()]+' de '+d.getFullYear()};
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
const hhmm=t=>t?String(t).slice(0,5):'';
const esc=s=>E(s==null?'':s);
const uid=()=>(crypto&&crypto.randomUUID)?crypto.randomUUID():'x'+Date.now().toString(36)+Math.random().toString(36).slice(2,10);
const kb=n=>n==null?'':(n<1048576?Math.max(1,Math.round(n/1024))+' KB':(n/1048576).toFixed(1)+' MB');
const byId=id=>document.getElementById(id);
const estLabel=e=>(ESTADOS.find(x=>x[0]===e)||[0,e||''])[1];
const hoy=()=>ymd(new Date());

async function run(fn){try{return await fn()}catch(e){try{err(e)}catch(_){console.error(e)}}}
function ok(r){if(r&&r.error)throw r.error;return r?r.data:null}

function css(){
  if(byId('dcp-css'))return;
  const s=document.createElement('style');s.id='dcp-css';
  s.textContent=`
.dcp{max-width:1100px;margin:0 auto;color:#102a5c}
.dcp *{box-sizing:border-box}
.dcp h3{margin:0}
.dcp-help{font-size:13px;color:#475569;line-height:1.5}
.dcp-form{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:14px 18px 18px}
.dcp-form .dcp-wide{grid-column:1/-1}
.dcp-lbl{display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:3px;text-transform:uppercase;letter-spacing:.02em}
.dcp input[type=text],.dcp input[type=number],.dcp input[type=date],.dcp select,.dcp textarea{width:100%;border:1px solid #cbd5e1;border-radius:10px;padding:8px 10px;font:inherit;font-size:14px;background:#fff;color:#102a5c}
.dcp textarea{resize:vertical;min-height:62px;line-height:1.4}
.dcp input:focus,.dcp select:focus,.dcp textarea:focus{outline:2px solid #2864e8;outline-offset:0;border-color:#2864e8}
.dcp-btn{border:0;border-radius:10px;padding:8px 14px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;background:#2864e8;color:#fff}
.dcp-btn:hover{background:#1d52c4}
.dcp-btn:disabled{opacity:.55;cursor:wait}
.dcp-btn.sec{background:#e2e8f0;color:#102a5c}.dcp-btn.sec:hover{background:#cbd5e1}
.dcp-btn.red{background:#fee2e2;color:#b91c1c}.dcp-btn.red:hover{background:#fecaca}
.dcp-btn.sm{padding:5px 10px;font-size:12px}
.dcp-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.dcp-plan{border:1px solid #e2e8f0;border-radius:14px;margin:0 18px 14px;background:#fff;overflow:hidden}
.dcp-plan-h{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;padding:12px 14px;background:#f8fafd}
.dcp-plan-h b{font-size:15px}
.dcp-chip{display:inline-block;font-size:11px;font-weight:700;padding:2px 9px;border-radius:99px;background:#e6eefc;color:#2864e8}
.dcp-malla{padding:12px 14px;border-top:1px solid #e2e8f0}
.dcp-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
.dcp-tab{border:1px solid #cbd5e1;background:#fff;border-radius:99px;padding:5px 14px;font-size:13px;font-weight:600;cursor:pointer;color:#102a5c}
.dcp-tab.on{background:#2864e8;color:#fff;border-color:#2864e8}
.dcp-fila{display:grid;grid-template-columns:1.2fr 1.4fr 1.4fr 1.2fr .5fr;gap:8px;padding:10px;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:8px;background:#fcfdff}
.dcp-fila textarea{min-height:56px}
.dcp-fila-b{grid-column:1/-1;display:flex;gap:8px;justify-content:flex-end}
.dcp-ref{border:1px dashed #2864e8;background:#f3f7ff;border-radius:12px;padding:10px;margin:8px 0}
.dcp-ref-i{display:flex;gap:8px;justify-content:space-between;align-items:flex-start;padding:7px 0;border-top:1px solid #dbe5f8;font-size:13px}
.dcp-ref-l{max-height:260px;overflow:auto}
.dcp-sticky{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px}
.dcp-dirty{font-size:12px;color:#b45309;font-weight:600}
.dcp-nav{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:14px 18px}
.dcp-nav input[type=date]{width:auto}
.dcp-fecha{font-weight:700;font-size:16px;flex:1;min-width:200px}
.dcp-week{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;padding:0 18px 14px}
.dcp-day{border:1px solid #cbd5e1;background:#fff;border-radius:12px;padding:8px 4px;text-align:center;cursor:pointer;font:inherit;color:#102a5c}
.dcp-day small{display:block;font-size:11px;color:#64748b}
.dcp-day b{font-size:16px}
.dcp-day.on{background:#2864e8;border-color:#2864e8;color:#fff}.dcp-day.on small{color:#dbe7ff}
.dcp-day.hoy{box-shadow:0 0 0 2px #f59e0b inset}
.dcp-acc{display:flex;flex-wrap:wrap;gap:8px;padding:0 18px 14px}
.dcp-cls{border:1px solid #e2e8f0;border-radius:14px;margin:0 18px 10px;background:#fff;overflow:hidden}
.dcp-cls-h{display:flex;gap:10px;align-items:center;padding:12px 14px;cursor:pointer;background:#fff}
.dcp-cls-h:hover{background:#f8fafd}
.dcp-hora{font-size:12px;font-weight:700;color:#2864e8;min-width:84px}
.dcp-cls-t{flex:1;min-width:0}
.dcp-cls-t b{display:block;font-size:15px}
.dcp-cls-t span{display:block;font-size:13px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dcp-badge{font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;white-space:nowrap}
.dcp-b-pendiente{background:#fef3c7;color:#92400e}.dcp-b-dictada{background:#dcfce7;color:#166534}
.dcp-b-no_dictada{background:#fee2e2;color:#991b1b}.dcp-b-reprogramada{background:#e0e7ff;color:#3730a3}
.dcp-cls-b{display:none;padding:4px 14px 14px;border-top:1px solid #e2e8f0}
.dcp-cls.open .dcp-cls-b{display:block}
.dcp-cls.open .dcp-arrow{transform:rotate(90deg)}
.dcp-arrow{transition:transform .15s;color:#64748b}
.dcp-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
.dcp-grid .dcp-wide{grid-column:1/-1}
.dcp-st{font-size:12px;color:#166534;min-height:16px}
.dcp-st.bad{color:#b91c1c}
.dcp-aviso{margin:0 18px 14px;padding:12px 14px;border-radius:12px;background:#fff7ed;border:1px solid #fed7aa;color:#7c2d12;font-size:14px;line-height:1.5}
.dcp-vacio{margin:6px 18px 18px;padding:22px;border:2px dashed #cbd5e1;border-radius:14px;text-align:center;color:#475569;font-size:14px;line-height:1.6}
.dcp-vacio b{display:block;color:#102a5c;font-size:16px;margin-bottom:4px}
.dcp-man{margin:0 18px 14px;padding:14px;border-radius:12px;background:#f3f7ff;border:1px solid #cfdcf7;display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:10px;align-items:end}
@media (max-width:760px){
  .dcp-form{grid-template-columns:1fr 1fr;padding:12px}
  .dcp-plan,.dcp-cls,.dcp-aviso,.dcp-vacio,.dcp-man{margin-left:10px;margin-right:10px}
  .dcp-fila{grid-template-columns:1fr}
  .dcp-grid{grid-template-columns:1fr}
  .dcp-man{grid-template-columns:1fr}
  .dcp-nav,.dcp-acc{padding-left:10px;padding-right:10px}
  .dcp-week{padding-left:10px;padding-right:10px;gap:4px}
  .dcp-day b{font-size:14px}
  .dcp-hora{min-width:64px}
}
@media (max-width:420px){.dcp-form{grid-template-columns:1fr}}
`;
  document.head.appendChild(s);
}

/* ===== Datos: planes de área ===== */
async function loadPlanes(){
  const d=ok(await sb.from('planes_area').select('*').eq('docente_id',M.id).order('anio',{ascending:false}).order('grado').order('asignatura'));
  S.planes=(d||[]).map(p=>{p.malla=normMalla(p.malla);return p});
  S.draft={};S.dirty={};
}
function normMalla(m){
  const out={periodos:[]};
  const src=(m&&Array.isArray(m.periodos))?m.periodos:[];
  for(let n=1;n<=4;n++){
    const f=src.find(x=>x&&Number(x.n)===n)||src[n-1]||{};
    const filas=(Array.isArray(f.filas)?f.filas:[]).map(r=>({tema:String(r&&r.tema||''),estandar:String(r&&(r.estandar||r.estandar_dba)||''),indicador:String(r&&r.indicador||''),evaluacion:String(r&&r.evaluacion||''),semanas:String(r&&r.semanas||'')}));
    out.periodos.push({n,filas});
  }
  return out;
}
const planById=id=>S.planes.find(p=>p.id===id);
const draftOf=id=>{if(!S.draft[id]){const p=planById(id);S.draft[id]=JSON.parse(JSON.stringify(p?p.malla:normMalla(null)))}return S.draft[id]};

/* ===== Datos: horario del docente ===== */
async function loadHz(){
  const h=S.hz;h.error='';
  try{
    const docs=ok(await sb.from('hz_docentes').select('id,nombre').eq('user_id',M.id))||[];
    h.docs=docs;h.linked=docs.length>0;h.asigs={};h.clases=[];h.versiones=[];h.franjas={};
    if(!h.linked){h.loaded=true;return}
    const ids=docs.map(x=>x.id);
    const asg=ok(await sb.from('hz_asignaciones').select('id,grupo_id,asignatura_id').in('docente_id',ids))||[];
    const gids=[...new Set(asg.map(a=>a.grupo_id))],sids=[...new Set(asg.map(a=>a.asignatura_id))];
    const gr=gids.length?ok(await sb.from('hz_grupos').select('id,grado,nombre').in('id',gids))||[]:[];
    const as=sids.length?ok(await sb.from('hz_asignaturas').select('id,nombre').in('id',sids))||[]:[];
    asg.forEach(a=>{const g=gr.find(x=>x.id===a.grupo_id)||{},s=as.find(x=>x.id===a.asignatura_id)||{};
      h.asigs[a.id]={curso:(g.grado!=null?g.grado+'° ':'')+(g.nombre||''),asignatura:s.nombre||''}});
    h.versiones=ok(await sb.from('hz_versiones').select('id,tipo,desde,hasta,estado,publicado_at').eq('estado','publicado').order('publicado_at',{ascending:false}))||[];
    const fr=ok(await sb.from('hz_franjas').select('id,orden,nombre,inicio,fin,es_clase').order('orden'))||[];
    fr.forEach(f=>h.franjas[f.id]=f);
    const aids=Object.keys(h.asigs);
    h.clases=aids.length&&h.versiones.length?ok(await sb.from('hz_clases').select('version_id,asignacion_id,dia,franja_id').in('asignacion_id',aids).in('version_id',h.versiones.map(v=>v.id)))||[]:[];
    h.loaded=true;
  }catch(e){h.error='No se pudo leer el horario del colegio.';h.loaded=true;throw e}
}
function vigente(f){
  const v=S.hz.versiones;
  return v.find(x=>x.tipo==='emergente'&&x.desde&&x.hasta&&x.desde<=f&&f<=x.hasta)||v.find(x=>x.tipo==='regular')||null;
}
function clasesDe(f){
  const v=vigente(f);if(!v)return[];
  const d=diaNum(f);
  return S.hz.clases.filter(c=>c.version_id===v.id&&c.dia===d&&S.hz.asigs[c.asignacion_id]&&S.hz.franjas[c.franja_id])
    .sort((a,b)=>S.hz.franjas[a.franja_id].orden-S.hz.franjas[b.franja_id].orden);
}
const horaTxt=fr=>(fr.inicio?hhmm(fr.inicio)+(fr.fin?'–'+hhmm(fr.fin):''):fr.nombre)||'';

/* ===== Datos: planeaciones ===== */
async function loadWeek(){
  S.wk=lunes(S.fecha);
  const d=ok(await sb.from('planeaciones').select('*').eq('docente_id',M.id).gte('fecha',S.wk).lte('fecha',add(S.wk,5)).order('fecha').order('orden').order('hora'));
  S.items=d||[];
}
const itemsDia=f=>S.items.filter(x=>x.fecha===f).sort((a,b)=>(a.orden-b.orden)||String(a.hora||'').localeCompare(String(b.hora||'')));
function filaDeClase(f,c){
  const fr=S.hz.franjas[c.franja_id],a=S.hz.asigs[c.asignacion_id];
  return {fecha:f,clave:f+'|'+c.franja_id,franja_id:c.franja_id,asignacion_id:c.asignacion_id,manual:false,hora:horaTxt(fr),orden:fr.orden,curso:a.curso,asignatura:a.asignatura,estado:'pendiente'};
}

/* ===== Plan de área: planes y archivos ===== */
function extDe(n){const m=/\.([a-z0-9]+)$/i.exec(n||'');return m?m[1].toLowerCase():''}
function validarArchivo(f){
  if(!f)return'Elige primero un archivo.';
  if(!EXT[extDe(f.name)])return'Ese tipo de archivo no sirve. Usa PDF, Word (doc, docx) o Excel (xls, xlsx).';
  if(f.size>MAXB)return'El archivo pesa '+kb(f.size)+'. El máximo es 15 MB.';
  if(f.size<=0)return'El archivo está vacío.';
  return'';
}
function rutaArchivo(anio,name){
  const e=extDe(name);
  const base=norm(name.replace(/\.[^.]+$/,'')).replace(/[^a-z0-9._-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,60)||'plan';
  return M.id+'/'+anio+'/'+Date.now()+'_'+base+'.'+e;
}
async function subirObj(path,f){
  const r=await sb.storage.from('planes-area').upload(path,f,{contentType:EXT[extDe(f.name)],upsert:false});
  if(r.error)throw r.error;
}
async function quitarObj(path){if(!path)return;try{await sb.storage.from('planes-area').remove([path])}catch(e){console.warn(e)}}

async function subir(){
  const msg=byId('dcp-up-msg'),btn=byId('dcp-up-btn');
  const say=(t,bad)=>{if(msg){msg.textContent=t;msg.className='dcp-st'+(bad?' bad':'')}};
  const asEl=byId('dcp-asig'),asig=(asEl?asEl.value:'').trim();
  const grado=parseInt(byId('dcp-grado').value,10),anio=parseInt(byId('dcp-anio').value,10);
  const f=byId('dcp-file').files[0];
  if(!asig)return say('Escribe o elige la asignatura.',1);
  if(!(grado>=0&&grado<=11))return say('Elige el grado.',1);
  if(!(anio>=2000&&anio<=2100))return say('El año no es válido.',1);
  const v=validarArchivo(f);if(v)return say(v,1);
  if(S.planes.some(p=>norm(p.asignatura)===norm(asig)&&p.grado===grado&&p.anio===anio))
    return say('Ya tienes un plan de '+asig+' grado '+grado+'° para '+anio+'. Usa «Cambiar archivo» en esa tarjeta.',1);
  btn.disabled=true;say('Subiendo… un momento.');
  let path='';
  try{
    path=rutaArchivo(anio,f.name);
    await subirObj(path,f);
    ok(await sb.from('planes_area').insert({asignatura:asig,grado,anio,archivo_path:path,archivo_nombre:f.name,archivo_tipo:EXT[extDe(f.name)],archivo_size:f.size,malla:normMalla(null)}));
    await loadPlanes();toast('✅','Plan guardado','Ya puedes llenar la malla de periodos.');render();
  }catch(e){if(path)await quitarObj(path);say('No se pudo guardar.',1);err(e);if(btn)btn.disabled=false}
}
async function cambiar(id,input){
  const p=planById(id),f=input.files[0];input.value='';
  if(!p||!f)return;
  const v=validarArchivo(f);if(v)return toast('⚠️','Archivo no válido',v);
  await run(async()=>{
    toast('⏳','Subiendo…','Espera un momento.');
    const path=rutaArchivo(p.anio,f.name);
    await subirObj(path,f);
    try{ok(await sb.from('planes_area').update({archivo_path:path,archivo_nombre:f.name,archivo_tipo:EXT[extDe(f.name)],archivo_size:f.size,updated_at:new Date().toISOString()}).eq('id',id))}
    catch(e){await quitarObj(path);throw e}
    await quitarObj(p.archivo_path);
    Object.assign(p,{archivo_path:path,archivo_nombre:f.name,archivo_size:f.size});
    toast('✅','Archivo cambiado',f.name);render();
  });
}
async function bajar(id){
  const p=planById(id);if(!p||!p.archivo_path)return;
  await run(async()=>{
    const r=await sb.storage.from('planes-area').createSignedUrl(p.archivo_path,60,{download:p.archivo_nombre||true});
    if(r.error)throw r.error;
    const a=document.createElement('a');a.href=r.data.signedUrl;a.target='_blank';a.rel='noopener';a.download=p.archivo_nombre||'plan';
    document.body.appendChild(a);a.click();a.remove();
  });
}
async function borrar(id){
  const p=planById(id);if(!p)return;
  if(!confirm('¿Eliminar el plan de '+p.asignatura+' grado '+p.grado+'° ('+p.anio+')? Se borran el archivo y la malla. No se puede deshacer.'))return;
  await run(async()=>{
    if(p.archivo_path){const r=await sb.storage.from('planes-area').remove([p.archivo_path]);if(r.error)throw r.error}
    ok(await sb.from('planes_area').delete().eq('id',id));
    S.planes=S.planes.filter(x=>x.id!==id);delete S.draft[id];delete S.dirty[id];
    toast('🗑️','Plan eliminado',p.asignatura);render();
  });
}

/* ===== Malla ===== */
function mAbrir(id){S.mopen[id]=!S.mopen[id];render()}
function mPer(id,n){S.mp[id]=n;render()}
function mCampo(id,pi,i,c,el){
  const f=draftOf(id).periodos[pi].filas[i];if(!f)return;
  f[c]=el.value;S.dirty[id]=true;
  const b=byId('dcp-dirty-'+id);if(b)b.style.display='';
}
function mAdd(id,pi){draftOf(id).periodos[pi].filas.push({tema:'',estandar:'',indicador:'',evaluacion:'',semanas:''});S.dirty[id]=true;render()}
function mDel(id,pi,i){
  const f=draftOf(id).periodos[pi].filas[i];
  if(f&&(f.tema||f.estandar||f.indicador||f.evaluacion)&&!confirm('¿Quitar esta fila?'))return;
  draftOf(id).periodos[pi].filas.splice(i,1);S.dirty[id]=true;
  if(S.ref&&S.ref.planId===id)S.ref=null;
  render();
}
async function mGuardar(id){
  const p=planById(id);if(!p)return;
  await run(async()=>{
    const m=normMalla(draftOf(id));
    ok(await sb.from('planes_area').update({malla:m,updated_at:new Date().toISOString()}).eq('id',id));
    p.malla=m;S.draft[id]=JSON.parse(JSON.stringify(m));S.dirty[id]=false;
    toast('✅','Malla guardada','Ya se puede usar en el Día a día.');render();
  });
}
/* Referentes (DBA / estándares) */
function areaGuess(asig){
  const a=norm(asig);
  if(/mate|geometr|estadist|algebra/.test(a))return'Matemáticas';
  if(/lengua|castell|lenguaje|lectura|espan/.test(a))return'Lenguaje';
  if(/ingl/.test(a))return'Inglés';
  if(/social|histor|geogr|filos|ciudad|politic|econom/.test(a))return'Ciencias Sociales y Ciudadanas';
  if(/natur|biolog|quimic|fisic|ciencia/.test(a)&&!/educacion fisica/.test(a))return'Ciencias Naturales';
  return'';
}
async function cargarAreas(){
  if(S.areas)return S.areas;
  const d=ok(await sb.from('referentes').select('area').in('tipo',['dba','estandar']))||[];
  S.areas=[...new Set(d.map(x=>x.area).filter(Boolean))].sort();
  return S.areas;
}
async function cargarRef(area){
  if(!area)return[];
  if(!S.refCache[area]){
    S.refCache[area]=ok(await sb.from('referentes').select('id,tipo,area,asignatura,grado_min,grado_max,codigo,titulo').in('tipo',['dba','estandar']).eq('area',area).order('tipo').order('grado_min').limit(400))||[];
  }
  return S.refCache[area];
}
async function rAbrir(planId,pi,i){
  if(S.ref&&S.ref.planId===planId&&S.ref.pi===pi&&S.ref.i===i){S.ref=null;return render()}
  const p=planById(planId);if(!p)return;
  await run(async()=>{
    await cargarAreas();
    S.ref={planId,pi,i,area:areaGuess(p.asignatura),q:'',todos:false};
    await cargarRef(S.ref.area);render();
  });
}
async function rArea(el){if(!S.ref)return;S.ref.area=el.value;await run(async()=>{await cargarRef(S.ref.area);render()})}
function rBuscar(el){if(!S.ref)return;S.ref.q=el.value;render();const x=byId('dcp-rq');if(x){x.focus();x.setSelectionRange(x.value.length,x.value.length)}}
function rTodos(el){if(!S.ref)return;S.ref.todos=el.checked;render()}
function rLista(){
  const r=S.ref,p=planById(r.planId),g=p.grado,q=norm(r.q);
  return(S.refCache[r.area]||[]).filter(x=>r.todos||((x.grado_min==null||x.grado_min<=g)&&(x.grado_max==null||x.grado_max>=g)))
    .filter(x=>!q||norm(x.titulo+' '+x.codigo).includes(q)).slice(0,60);
}
function rUsar(idx){
  const r=S.ref;if(!r)return;
  const x=rLista()[idx];if(!x)return;
  const f=draftOf(r.planId).periodos[r.pi].filas[r.i];if(!f)return;
  const t=(x.tipo==='dba'?'DBA ':'Estándar ')+(x.codigo?x.codigo+': ':'')+x.titulo;
  f.estandar=f.estandar?f.estandar+'\n'+t:t;S.dirty[r.planId]=true;
  toast('✅','Referente agregado','Recuerda guardar la malla.');render();
}

/* ===== Vistas: Plan de área ===== */
function gradosOpc(){
  const s=new Set([6,7,8,9,10,11]);(D.courses||[]).forEach(c=>{const g=parseInt(c.grade,10);if(g>=0&&g<=11)s.add(g)});
  return[...s].sort((a,b)=>a-b);
}
function vPlanForm(){
  const asigs=(M&&Array.isArray(M.asignaturas))?M.asignaturas.filter(Boolean):[];
  const g0=(D.courses&&D.courses[0])?parseInt(D.courses[0].grade,10):6;
  const cursos=(D.courses||[]).map(c=>c.grade+'° '+c.name).join(', ');
  const anio=new Date().getFullYear();
  return `<div class="aic-card" style="margin-bottom:16px">
  <div class="aic-card-head"><div><h3>Subir mi plan de área</h3><p>Sube el archivo que ya tienes (PDF, Word o Excel, hasta 15 MB).</p></div></div>
  <div class="dcp-form">
    <div><label class="dcp-lbl" for="dcp-asig">Asignatura</label>${asigs.length?`<select id="dcp-asig">${asigs.map(a=>`<option>${esc(a)}</option>`).join('')}</select>`:`<input type="text" id="dcp-asig" maxlength="120" placeholder="Ej.: Matemáticas">`}</div>
    <div><label class="dcp-lbl" for="dcp-grado">Grado</label><select id="dcp-grado">${gradosOpc().map(g=>`<option value="${g}"${g===g0?' selected':''}>${g}°</option>`).join('')}</select></div>
    <div><label class="dcp-lbl" for="dcp-anio">Año</label><input type="number" id="dcp-anio" value="${anio}" min="2000" max="2100"></div>
    <div><label class="dcp-lbl" for="dcp-file">Archivo</label><input type="file" id="dcp-file" accept=".pdf,.doc,.docx,.xls,.xlsx" style="width:100%;font-size:13px"></div>
    <div class="dcp-wide dcp-row"><button class="dcp-btn" id="dcp-up-btn" onclick="DOCP.subir()">Subir plan</button><span class="dcp-st" id="dcp-up-msg"></span>${cursos?`<span class="dcp-help">Tus cursos: ${esc(cursos)}</span>`:''}</div>
  </div></div>`;
}
function vMallaFila(id,pi,i,f){
  return `<div class="dcp-fila">${MC.map(([k,l])=>`<div><label class="dcp-lbl">${l}</label>${k==='semanas'?`<input type="text" value="${esc(f[k])}" placeholder="1-4" onchange="DOCP.mCampo('${id}',${pi},${i},'${k}',this)">`:`<textarea onchange="DOCP.mCampo('${id}',${pi},${i},'${k}',this)">${esc(f[k])}</textarea>`}</div>`).join('')}
    <div class="dcp-fila-b"><button class="dcp-btn sec sm" onclick="DOCP.rAbrir('${id}',${pi},${i})">Sugerir referentes</button><button class="dcp-btn red sm" onclick="DOCP.mDel('${id}',${pi},${i})">Quitar fila</button></div></div>`;
}
function vRef(id){
  const r=S.ref;if(!r||r.planId!==id)return'';
  const l=rLista();
  return `<div class="dcp-ref"><div class="dcp-row" style="margin-bottom:6px"><b style="font-size:14px">Referentes para la fila ${r.i+1} del periodo ${r.pi+1}</b><button class="dcp-btn sec sm" style="margin-left:auto" onclick="DOCP.rAbrir('${id}',${r.pi},${r.i})">Cerrar</button></div>
  <div class="dcp-row"><div style="flex:1;min-width:160px"><label class="dcp-lbl">Área</label><select onchange="DOCP.rArea(this)"><option value="">Elige un área</option>${(S.areas||[]).map(a=>`<option${a===r.area?' selected':''}>${esc(a)}</option>`).join('')}</select></div>
  <div style="flex:1;min-width:160px"><label class="dcp-lbl">Buscar palabra</label><input type="text" id="dcp-rq" value="${esc(r.q)}" onchange="DOCP.rBuscar(this)" placeholder="Ej.: fracciones"></div></div>
  <label class="dcp-help" style="display:block;margin:6px 0"><input type="checkbox" ${r.todos?'checked':''} onchange="DOCP.rTodos(this)"> Mostrar de todos los grados</label>
  <div class="dcp-ref-l">${l.length?l.map((x,k)=>`<div class="dcp-ref-i"><div><span class="dcp-chip">${x.tipo==='dba'?'DBA':'Estándar'}</span> ${x.grado_min!=null?`<span class="dcp-help">grados ${x.grado_min}–${x.grado_max??x.grado_min}</span>`:''}<div>${x.codigo?`<b>${esc(x.codigo)}</b> `:''}${esc(x.titulo)}</div></div><button class="dcp-btn sm" onclick="DOCP.rUsar(${k})">Usar</button></div>`).join(''):`<div class="dcp-help">${r.area?'No hay referentes para ese grado con esa búsqueda.':'Elige un área para ver los referentes.'}</div>`}</div></div>`;
}
function vMalla(p){
  const id=p.id,m=draftOf(id),pi=S.mp[id]||0,per=m.periodos[pi];
  return `<div class="dcp-malla"><p class="dcp-help" style="margin:0 0 10px">Llena, por periodo, lo que vas a enseñar. Esto después te ayuda a llenar tu planeación diaria con un clic.</p>
  <div class="dcp-tabs">${m.periodos.map((x,k)=>`<button class="dcp-tab${k===pi?' on':''}" onclick="DOCP.mPer('${id}',${k})">Periodo ${x.n}${x.filas.length?' ('+x.filas.length+')':''}</button>`).join('')}</div>
  ${per.filas.length?per.filas.map((f,i)=>vMallaFila(id,pi,i,f)).join(''):`<div class="dcp-vacio" style="margin:0 0 8px;padding:14px">Este periodo aún no tiene temas. Pulsa «Agregar fila».</div>`}
  ${vRef(id)}
  <div class="dcp-sticky"><button class="dcp-btn sec" onclick="DOCP.mAdd('${id}',${pi})">+ Agregar fila</button><button class="dcp-btn" onclick="DOCP.mGuardar('${id}')">Guardar malla</button><span class="dcp-dirty" id="dcp-dirty-${id}" style="${S.dirty[id]?'':'display:none'}">Hay cambios sin guardar</span></div></div>`;
}
function vPlanCard(p){
  const n=p.malla.periodos.reduce((s,x)=>s+x.filas.length,0);
  return `<div class="dcp-plan"><div class="dcp-plan-h"><div><b>${esc(p.asignatura)}</b> <span class="dcp-chip">${p.grado}°</span> <span class="dcp-chip">${p.anio}</span>
  <div class="dcp-help">${p.archivo_nombre?esc(p.archivo_nombre)+' · '+kb(p.archivo_size):'Sin archivo'} · ${n} ${n===1?'tema':'temas'} en la malla</div></div>
  <div class="dcp-row">${p.archivo_path?`<button class="dcp-btn sec sm" onclick="DOCP.bajar('${p.id}')">Descargar</button>`:''}
  <label class="dcp-btn sec sm" style="margin:0">Cambiar archivo<input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" style="display:none" onchange="DOCP.cambiar('${p.id}',this)"></label>
  <button class="dcp-btn sm" onclick="DOCP.mAbrir('${p.id}')">${S.mopen[p.id]?'Ocultar malla':'Malla de periodos'}</button>
  <button class="dcp-btn red sm" onclick="DOCP.borrar('${p.id}')">Eliminar</button></div></div>
  ${S.mopen[p.id]?vMalla(p):''}</div>`;
}
function vPlan(){
  return `<div class="dcp">${vPlanForm()}
  <div class="aic-card" style="padding-bottom:4px"><div class="aic-card-head"><div><h3>Mis planes de área</h3><p>${S.planes.length?S.planes.length+(S.planes.length===1?' plan subido':' planes subidos'):'Todavía no hay planes'}</p></div></div>
  ${S.planes.length?S.planes.map(vPlanCard).join(''):`<div class="dcp-vacio"><b>Aún no has subido ningún plan de área</b>1. Arriba elige la asignatura, el grado y el año.<br>2. Elige tu archivo y pulsa «Subir plan».<br>3. Luego abre «Malla de periodos» para escribir los temas de cada periodo.</div>`}
  </div></div>`;
}

/* ===== Día a día ===== */
function resumenHTML(){
  const dia=itemsDia(S.fecha),dic=dia.filter(x=>x.estado==='dictada').length,pen=dia.filter(x=>x.estado==='pendiente').length;
  const cv=S.items.filter(x=>x.cumplimiento!=null).map(x=>x.cumplimiento);
  const pc=cv.length?Math.round(cv.reduce((a,b)=>a+b,0)/cv.length)+'%':'—';
  const sd=S.items.filter(x=>x.estado==='dictada').length;
  const k=(ic,c,v,l)=>`<div class="aic-kpi"><div class="aic-kpi-icon ${c}">${ic}</div><div><div style="font-size:22px;font-weight:800">${v}</div><div style="font-size:12px;color:#64748b">${l}</div></div></div>`;
  return k('📚','blue',dia.length,'Clases del día')+k('✅','green',dic,'Dictadas hoy')+k('⏳','orange',pen,'Pendientes del día')+k('📈','violet',pc,'Cumplimiento de la semana ('+sd+' de '+S.items.length+' clases dictadas)');
}
function updRes(){const e=byId('dcp-res');if(e)e.innerHTML=resumenHTML()}

function planParaItem(it){
  const g=parseInt(it.curso,10),y=pd(it.fecha).getFullYear();
  const c=S.planes.filter(p=>norm(p.asignatura)===norm(it.asignatura)&&p.grado===g&&p.malla.periodos.some(x=>x.filas.some(f=>f.tema)));
  return c.find(p=>p.anio===y)||c.sort((a,b)=>b.anio-a.anio)[0]||null;
}
function vAuto(it){
  const p=planParaItem(it);if(!p)return'';
  let o='';
  p.malla.periodos.forEach((per,pi)=>{const fs=per.filas.map((f,i)=>f.tema?`<option value="${pi}|${i}">${esc(f.tema)}</option>`:'').join('');if(fs)o+=`<optgroup label="Periodo ${per.n}">${fs}</optgroup>`});
  return `<div class="dcp-wide"><label class="dcp-lbl">Llenar desde mi plan de área (${esc(p.asignatura)} ${p.grado}° · ${p.anio})</label><select onchange="DOCP.auto('${it.id}',this)"><option value="">Elige un tema del plan…</option>${o}</select></div>`;
}
function vClase(it){
  const open=S.open[it.id];
  const campo=([k,l,t])=>`<div class="${t==='i'?'dcp-wide':''}"><label class="dcp-lbl">${l}</label>${t==='i'?`<input type="text" value="${esc(it[k])}" onchange="DOCP.sv('${it.id}','${k}',this)">`:`<textarea onchange="DOCP.sv('${it.id}','${k}',this)">${esc(it[k])}</textarea>`}</div>`;
  return `<div class="dcp-cls${open?' open':''}" id="dcp-c-${it.id}">
  <div class="dcp-cls-h" onclick="DOCP.tg('${it.id}')"><span class="dcp-arrow">▶</span><span class="dcp-hora">${esc(it.hora||'')}</span>
  <div class="dcp-cls-t"><b>${esc(it.curso||'')} · ${esc(it.asignatura||'')}</b><span id="dcp-tp-${it.id}">${esc(it.tema||'Sin tema todavía')}</span></div>
  <span class="dcp-badge dcp-b-${esc(it.estado)}" id="dcp-bd-${it.id}">${esc(estLabel(it.estado))}</span></div>
  <div class="dcp-cls-b"><div class="dcp-grid">${vAuto(it)}${CAMPOS.map(campo).join('')}
  <div><label class="dcp-lbl">Estado de la clase</label><select onchange="DOCP.sv('${it.id}','estado',this)">${ESTADOS.map(([v,l])=>`<option value="${v}"${v===it.estado?' selected':''}>${l}</option>`).join('')}</select></div>
  <div><label class="dcp-lbl">Cumplimiento (0 a 100 %)</label><input type="number" min="0" max="100" step="5" value="${it.cumplimiento==null?'':it.cumplimiento}" onchange="DOCP.sv('${it.id}','cumplimiento',this)"></div>
  <div class="dcp-wide"><label class="dcp-lbl">Observaciones</label><textarea onchange="DOCP.sv('${it.id}','observaciones',this)">${esc(it.observaciones)}</textarea></div></div>
  <div class="dcp-row" style="margin-top:10px;justify-content:space-between"><span class="dcp-st" id="dcp-st-${it.id}"></span><button class="dcp-btn red sm" onclick="DOCP.quitar('${it.id}')">Quitar esta clase</button></div></div></div>`;
}
function vManual(){
  const asigs=(M&&Array.isArray(M.asignaturas))?M.asignaturas.filter(Boolean):[];
  const cur=(D.courses||[]).map(c=>c.grade+'° '+c.name);
  return `<div class="dcp-man"><div><label class="dcp-lbl">Hora</label><input type="text" id="dcp-m-hora" placeholder="Ej.: 7:00–7:55" maxlength="40"></div>
  <div><label class="dcp-lbl">Curso</label><input type="text" id="dcp-m-curso" list="dcp-cursos" placeholder="Ej.: 9° A" maxlength="40"><datalist id="dcp-cursos">${cur.map(c=>`<option value="${esc(c)}">`).join('')}</datalist></div>
  <div><label class="dcp-lbl">Asignatura</label>${asigs.length?`<select id="dcp-m-asig">${asigs.map(a=>`<option>${esc(a)}</option>`).join('')}</select>`:`<input type="text" id="dcp-m-asig" maxlength="120">`}</div>
  <div class="dcp-row"><button class="dcp-btn" onclick="DOCP.addManual()">Agregar</button><button class="dcp-btn sec" onclick="DOCP.manualToggle()">Cancelar</button></div></div>`;
}
function vAviso(){
  const h=S.hz;
  if(h.error)return`<div class="dcp-aviso">${esc(h.error)} Puedes agregar clases a mano con «+ Agregar clase manual».</div>`;
  if(!h.linked)return`<div class="dcp-aviso"><b>Tu nombre todavía no está enlazado al horario del colegio.</b><br>Pídele a coordinación que te enlace en la sección de Horarios. Mientras tanto puedes agregar tus clases a mano con «+ Agregar clase manual».</div>`;
  if(!h.versiones.length)return`<div class="dcp-aviso"><b>El colegio todavía no ha publicado un horario.</b><br>Cuando lo publiquen, aquí podrás generar tus clases con un clic. Mientras tanto puedes agregar clases a mano.</div>`;
  if(!Object.keys(h.asigs).length)return`<div class="dcp-aviso">En el horario publicado no tienes materias asignadas. Puedes agregar clases a mano.</div>`;
  return'';
}
function vDiario(){
  if(!S.fecha)S.fecha=hoy();
  const wk=lunes(S.fecha),dia=itemsDia(S.fecha),h=S.hz;
  const puede=h.linked&&!h.error&&vigente(S.fecha)&&clasesDe(S.fecha).length>0;
  const sem=[0,1,2,3,4,5].map(n=>{const f=add(wk,n),c=S.items.filter(x=>x.fecha===f).length,d=pd(f);
    return`<button class="dcp-day${f===S.fecha?' on':''}${f===hoy()?' hoy':''}" onclick="DOCP.fd('${f}')"><small>${DIAS[n]}</small><b>${d.getDate()}</b><small>${c?c+(c===1?' clase':' clases'):'—'}</small></button>`}).join('');
  const v=h.linked?vigente(S.fecha):null;
  return `<div class="dcp"><div class="aic-card" style="padding-bottom:6px;margin-bottom:16px">
  <div class="aic-card-head"><div><h3>Mi día a día</h3><p>Planea, anota y marca cómo te fue en cada clase.${v?' Horario: '+(v.tipo==='emergente'?'emergente':'regular')+'.':''}</p></div></div>
  <div class="dcp-nav"><button class="dcp-btn sec" onclick="DOCP.fd(DOCP.mover(-1))" title="Día anterior">‹</button>
  <div class="dcp-fecha">${esc(bonita(S.fecha))}</div>
  <input type="date" value="${S.fecha}" onchange="DOCP.fd(this.value)"><button class="dcp-btn sec" onclick="DOCP.fd(DOCP.hoy())">Hoy</button>
  <button class="dcp-btn sec" onclick="DOCP.fd(DOCP.mover(1))" title="Día siguiente">›</button></div>
  <div class="dcp-week">${sem}</div>
  <div class="aic-kpis" id="dcp-res" style="padding:0 18px 14px">${resumenHTML()}</div>
  <div class="dcp-acc"><button class="dcp-btn" ${puede?'':'title="No hay clases en el horario para este día"'} onclick="DOCP.generar(false)">Generar las clases del día</button>
  <button class="dcp-btn sec" onclick="DOCP.generar(true)">Generar toda la semana</button>
  <button class="dcp-btn sec" onclick="DOCP.manualToggle()">+ Agregar clase manual</button>
  <button class="dcp-btn sec" onclick="DOCP.copiar()">Copiar de la semana pasada</button>
  <button class="dcp-btn sec" onclick="DOCP.imprimir()">Imprimir la semana</button></div>
  ${S.nota?`<div class="dcp-aviso" style="background:#f0fdf4;border-color:#bbf7d0;color:#166534">${esc(S.nota)}</div>`:''}
  ${S.manual?vManual():''}${vAviso()}</div>
  <div class="aic-card" style="padding:14px 0 4px">${dia.length?dia.map(vClase).join(''):`<div class="dcp-vacio"><b>No hay clases planeadas para este día</b>${puede?'Pulsa «Generar las clases del día» y se crean solas desde tu horario.':'Puedes agregar una a mano con «+ Agregar clase manual».'}</div>`}</div></div>`;
}

/* ===== Acciones: Día a día ===== */
async function irFecha(f){
  if(!f||!/^\d{4}-\d{2}-\d{2}$/.test(f))return;
  S.fecha=f;S.nota='';
  if(lunes(f)!==S.wk){await run(loadWeek)}
  render();
}
const mover=n=>add(S.fecha||hoy(),n);

async function generar(semana){
  await run(async()=>{
    if(!S.hz.linked)return toast('ℹ️','Sin horario','Tu nombre no está enlazado al horario del colegio. Agrega clases manuales.');
    const fechas=semana?[0,1,2,3,4,5].map(n=>add(lunes(S.fecha),n)):[S.fecha];
    const filas=[];let sinHor=0;
    fechas.forEach(f=>{if(!vigente(f)){sinHor++;return}clasesDe(f).forEach(c=>filas.push(filaDeClase(f,c)))});
    if(!filas.length){
      S.nota='';
      return toast('ℹ️','No hay clases',sinHor===fechas.length?'No hay un horario publicado para esa fecha.':'En tu horario no tienes clases ese día.');
    }
    const antes=S.items.length;
    ok(await sb.from('planeaciones').upsert(filas,{onConflict:'docente_id,fecha,clave',ignoreDuplicates:true}));
    await loadWeek();
    const nuevas=S.items.length-antes;
    S.nota=nuevas>0?'Listo: se crearon '+nuevas+(nuevas===1?' clase.':' clases.'):'Todo estaba al día: esas clases ya estaban creadas.';
    render();
  });
}
function manualToggle(){S.manual=!S.manual;render()}
async function addManual(){
  const hora=byId('dcp-m-hora').value.trim(),curso=byId('dcp-m-curso').value.trim(),asig=byId('dcp-m-asig').value.trim();
  if(!curso||!asig)return toast('⚠️','Faltan datos','Escribe el curso y la asignatura.');
  await run(async()=>{
    const n=itemsDia(S.fecha).length;
    ok(await sb.from('planeaciones').insert({fecha:S.fecha,clave:'manual|'+uid(),manual:true,hora,orden:100+n,curso,asignatura:asig,estado:'pendiente'}));
    S.manual=false;S.nota='';await loadWeek();render();
  });
}
function tg(id){S.open[id]=!S.open[id];const e=byId('dcp-c-'+id);if(e)e.classList.toggle('open',!!S.open[id])}

async function sv(id,k,el){
  const it=S.items.find(x=>x.id===id);if(!it)return;
  let v=el.value;
  const st=byId('dcp-st-'+id),say=(t,bad)=>{if(st){st.textContent=t;st.className='dcp-st'+(bad?' bad':'')}};
  if(k==='cumplimiento'){
    if(v.trim()==='')v=null;
    else{let n=Math.round(Number(v));if(!isFinite(n))n=0;n=Math.max(0,Math.min(100,n));v=n;el.value=n}
  }else if(k==='estado'){if(!ESTADOS.some(x=>x[0]===v)){return}}
  else v=v.trim()===''?null:v;
  const prev=it[k];if(prev===v||(prev==null&&v==null))return;
  say('Guardando…');
  try{
    ok(await sb.from('planeaciones').update({[k]:v,updated_at:new Date().toISOString()}).eq('id',id));
    it[k]=v;say('Guardado ✓');setTimeout(()=>{if(st&&st.textContent==='Guardado ✓')st.textContent=''},2500);
    if(k==='tema'){const t=byId('dcp-tp-'+id);if(t)t.textContent=v||'Sin tema todavía'}
    if(k==='estado'){const b=byId('dcp-bd-'+id);if(b){b.className='dcp-badge dcp-b-'+v;b.textContent=estLabel(v)}}
    if(k==='estado'||k==='cumplimiento')updRes();
  }catch(e){say('No se guardó. Intenta de nuevo.',1);try{err(e)}catch(_){}}
}
async function auto(id,el){
  const it=S.items.find(x=>x.id===id),p=it&&planParaItem(it);if(!it||!p||!el.value)return;
  const [pi,i]=el.value.split('|').map(Number),f=p.malla.periodos[pi]&&p.malla.periodos[pi].filas[i];if(!f)return;
  const cambios={tema:f.tema||null,objetivo:(f.indicador||f.estandar||it.objetivo||null)};
  if(!it.evaluacion&&f.evaluacion)cambios.evaluacion=f.evaluacion;
  await run(async()=>{
    ok(await sb.from('planeaciones').update({...cambios,updated_at:new Date().toISOString()}).eq('id',id));
    Object.assign(it,cambios);S.open[id]=true;toast('✅','Listo','Se llenó el tema desde tu plan de área.');render();
  });
}
async function quitar(id){
  const it=S.items.find(x=>x.id===id);if(!it)return;
  if(!confirm('¿Quitar la clase de '+(it.curso||'')+' · '+(it.asignatura||'')+'? Se borra lo que escribiste en ella.'))return;
  await run(async()=>{
    ok(await sb.from('planeaciones').delete().eq('id',id));
    S.items=S.items.filter(x=>x.id!==id);render();
  });
}
async function copiar(){
  const prev=add(S.fecha,-7),actuales=itemsDia(S.fecha);
  if(actuales.some(x=>x.tema||x.desarrollo||x.objetivo)&&!confirm('Ya escribiste cosas en este día. Si copias, se reemplazan tema, objetivo y demás textos de las clases que coincidan. ¿Continuar?'))return;
  await run(async()=>{
    const old=ok(await sb.from('planeaciones').select('*').eq('docente_id',M.id).eq('fecha',prev).order('orden'))||[];
    if(!old.length)return toast('ℹ️','Nada para copiar','No hay planeación el '+bonita(prev)+'.');
    const txt=['tema','objetivo','inicio','desarrollo','cierre','recursos','evaluacion','tarea'];
    let n=0;
    for(const o of old){
      const c={};txt.forEach(k=>c[k]=o[k]);
      const ex=!o.manual&&o.franja_id&&actuales.find(x=>!x.manual&&x.franja_id===o.franja_id);
      if(ex){ok(await sb.from('planeaciones').update({...c,updated_at:new Date().toISOString()}).eq('id',ex.id))}
      else{
        const base={fecha:S.fecha,hora:o.hora,orden:o.orden,curso:o.curso,asignatura:o.asignatura,estado:'pendiente',...c};
        if(o.manual||!o.franja_id)ok(await sb.from('planeaciones').insert({...base,clave:'manual|'+uid(),manual:true}));
        else ok(await sb.from('planeaciones').upsert({...base,clave:S.fecha+'|'+o.franja_id,franja_id:o.franja_id,asignacion_id:o.asignacion_id,manual:false},{onConflict:'docente_id,fecha,clave'}));
      }
      n++;
    }
    await loadWeek();S.nota='Se copiaron '+n+(n===1?' clase':' clases')+' de la semana pasada ('+bonita(prev)+').';render();
  });
}
function imprimir(){
  const w=window.open('','_blank');
  if(!w)return toast('⚠️','Ventana bloqueada','Permite las ventanas emergentes de esta página e inténtalo otra vez.');
  const wk=lunes(S.fecha);let h='';
  for(let n=0;n<6;n++){
    const f=add(wk,n),l=itemsDia(f);if(!l.length)continue;
    h+=`<h2>${esc(bonita(f))}</h2><table><tr><th>Hora</th><th>Curso</th><th>Asignatura</th><th>Tema</th><th>Objetivo</th><th>Inicio</th><th>Desarrollo</th><th>Cierre</th><th>Recursos</th><th>Evaluación</th><th>Tarea</th><th>Estado</th></tr>`+
      l.map(x=>`<tr><td>${esc(x.hora)}</td><td>${esc(x.curso)}</td><td>${esc(x.asignatura)}</td><td>${esc(x.tema)}</td><td>${esc(x.objetivo)}</td><td>${esc(x.inicio)}</td><td>${esc(x.desarrollo)}</td><td>${esc(x.cierre)}</td><td>${esc(x.recursos)}</td><td>${esc(x.evaluacion)}</td><td>${esc(x.tarea)}</td><td>${esc(estLabel(x.estado))}${x.cumplimiento!=null?' · '+x.cumplimiento+'%':''}</td></tr>`).join('')+'</table>';
  }
  if(!h)h='<p>No hay clases planeadas en esta semana.</p>';
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Planeación semanal</title><style>
@page{size:landscape;margin:12mm}body{font:12px Arial,sans-serif;color:#111}h1{font-size:18px;margin:0 0 2px}h2{font-size:14px;margin:16px 0 6px;background:#e8eefc;padding:4px 8px}
.s{color:#444;margin-bottom:8px}table{width:100%;border-collapse:collapse;table-layout:fixed;page-break-inside:auto}th,td{border:1px solid #666;padding:4px;vertical-align:top;word-wrap:break-word;white-space:pre-wrap}th{background:#f1f5f9;font-size:11px}tr{page-break-inside:avoid}
.f{margin-top:40px;display:flex;gap:60px}.f div{border-top:1px solid #000;padding-top:4px;width:260px}</style></head><body>
<h1>Planeación semanal de clases</h1><div class="s">Docente: <b>${esc(M.full_name||'')}</b> · Semana del ${esc(bonita(wk))} al ${esc(bonita(add(wk,5)))}</div>${h}
<div class="f"><div>Firma del docente</div><div>Revisó (coordinación)</div></div><script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>`);
  w.document.close();
}

/* ===== API pública ===== */
window.DOCP={
  async load(t){
    css();S.tab=t==='diario'?'diario':'plan';
    try{
      if(!S.fecha)S.fecha=hoy();
      if(!D.courses){try{await loadCourses()}catch(e){console.warn(e)}}
      await loadPlanes();
      if(S.tab==='diario'){
        if(!S.hz.loaded){try{await loadHz()}catch(e){err(e)}}
        await loadWeek();
      }
    }catch(e){err(e)}
  },
  view(t){
    css();
    try{return t==='diario'?vDiario():vPlan()}
    catch(e){console.error(e);return'<div class="dcp"><div class="dcp-aviso">Algo salió mal al mostrar esta pantalla. Recarga la página e inténtalo de nuevo.</div></div>'}
  },
  subir,cambiar,bajar,borrar,mAbrir,mPer,mCampo,mAdd,mDel,mGuardar,rAbrir,rArea,rBuscar,rTodos,rUsar,
  fd:irFecha,mover,hoy,generar,manualToggle,addManual,tg,sv,auto,quitar,copiar,imprimir
};
})();
