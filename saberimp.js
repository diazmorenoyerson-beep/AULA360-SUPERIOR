/* AulaICFES — Simulacros Saber 11 IMPRESOS (rector / coordinador) y Pruebas diagnósticas por grupo.
   Saber 11: Sección 1 (120), Sección 2 (79) e Inglés (55) = 254 preguntas, igual que el ICFES.
   Cada estudiante recibe su hoja de respuestas impresa con sus datos; se califica por foto. */
window.SIMP=(function(){
const e=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isDirec=()=>M&&(M.role==='rector'||M.role==='coordinador'||M.is_admin);
const CUADS={1:'Sección 1',2:'Sección 2',3:'Inglés'};
const W={'Lectura Crítica':3,'Matemáticas':3,'Sociales y Ciudadanas':3,'Ciencias Naturales':3,'Inglés':1};
const AREAS=['Lectura Crítica','Matemáticas','Sociales y Ciudadanas','Ciencias Naturales','Inglés'];
const CORTA={'Lectura Crítica':'Lectura','Matemáticas':'Mat.','Sociales y Ciudadanas':'Soc.','Ciencias Naturales':'C. Nat.','Inglés':'Inglés'};
let Z={ia:false,cob:null,mode:'saberimp',lista:[],cursos:[],f:null,fd:null,sel:null,cont:null,est:[],res:null,cal:{items:[],busy:false,cuad:1}};
const pc=(c,t)=>t?Math.round(100*c/t):null;
const fF=d=>d?new Date(d+'T12:00:00').toLocaleDateString('es-CO',{day:'numeric',month:'long',year:'numeric'}):'';
const R=()=>render();
const norm=d=>String(d||'').replace(/\D/g,'').replace(/^0+/,'');
const nuevoF=()=>({t:'',d:'',c:[],g:11});
const OTRAS=['Biología','Química','Física','Lenguaje','Ciencias Sociales','Filosofía','Economía','Ciencias Políticas','Competencias Ciudadanas','Democracia','Ética','Tecnología e Informática','Educación Artística','Educación Física','Educación Económica y Financiera','Religión'];
const ICM={'Lectura Crítica':['Lectura Crítica','Lengua Castellana','Lenguaje'],'Matemáticas':['Matemáticas'],'Sociales y Ciudadanas':['Ciencias Sociales','Competencias Ciudadanas','Economía','Ciencias Políticas','Democracia','Filosofía'],'Ciencias Naturales':['Ciencias Naturales','Biología','Química','Física','Agroambiental'],'Inglés':['Inglés']};
const soloMio=()=>M&&M.role==='prof'&&!M.is_admin;
const permitido=a=>{if(!soloMio())return true;const m=M.asignaturas||[];return m.includes(a)||(ICM[a]||[]).some(x=>m.includes(x))};
const nuevoD=()=>({t:'Diagnóstico',d:'',c:[],n:10,a:AREAS.filter(permitido)});
const colsDe=f=>{const k=[...AREAS];f.forEach(x=>Object.keys(x.areas).forEach(a=>{if(!k.includes(a))k.push(a)}));return k.filter(a=>AREAS.includes(a)?f.some(x=>x.areas[a]):true)};
async function load(t){
  Z.mode=t==='diag'?'diag':'saberimp';
  if(!Z.f)Z.f=nuevoF();if(!Z.fd)Z.fd=nuevoD();
  const [a,c]=await Promise.all([
    sb.from('saber_imp').select('*,saber_imp_courses(course_id)').order('created_at',{ascending:false}),
    sb.from('courses').select('id,grade,name,teacher_id').order('grade').order('name')]);
  if(a.error)throw a.error;
  Z.lista=a.data||[];Z.cursos=c.data||[];
  if(Z.mode==='saberimp'&&isDirec()){try{const q=await sb.rpc('banco_saber_cobertura');Z.cob=q.error?null:q.data}catch(x){Z.cob=null}}
}
const cN=id=>{const c=Z.cursos.find(x=>x.id===id);return c?c.grade+'° '+c.name:''};
/* ---------- contenido, cuadernillos, hojas ---------- */
async function abrir(id){
  if(Z.sel===id){Z.sel=null;return R()}
  Z.sel=id;Z.cont=null;Z.est=[];Z.res=null;Z.cal={items:[],busy:false,cuad:1};R();
  const [c,s]=await Promise.all([sb.rpc('saber_imp_contenido',{p_imp:id}),sb.rpc('saber_imp_estudiantes',{p_imp:id})]);
  if(c.error)return err(c.error);
  Z.cont=c.data;Z.est=s.data||[];R();
}
function itemsDe(cu){return (Z.cont.items||[]).filter(i=>i.cuad===cu).map(i=>({...i.q,area:i.area,_gr:i.grado_ref}))}
function cuadsDe(){return [...new Set((Z.cont.items||[]).map(i=>i.cuad))].sort()}
function etiqueta(cu){return Z.cont.imp.kind==='diagnostico'?'Cuadernillo diagnóstico':'Cuadernillo '+CUADS[cu]}
function logoInfo(){const L=typeof LH==='function'?LH():{l1:'',logo:''};return{colegio:L.l1||'',logo:L.logo?LOGO+encodeURI(L.logo):''}}
function specCuad(cu){
  const imp=Z.cont.imp,li=logoInfo(),dg=imp.kind==='diagnostico';
  const dur=dg?'Tiene una duración de 90 minutos.':cu===1?'Sesión 1: duración total de 4 horas y 30 minutos (270 minutos).':cu===2?'Sesión 2: Sección 2 e Inglés se presentan en una sola sesión de 4 horas y 30 minutos (270 minutos).':'Sesión 2: este cuadernillo se presenta junto con la Sección 2, en 4 horas y 30 minutos en total.';
  return{titulo:imp.title,tipo:dg?'Prueba diagnóstica':'Simulacro Saber 11',colegio:li.colegio,logo:li.logo,asignatura:dg?'Lectura Crítica · Matemáticas · Sociales · Ciencias Naturales · Inglés':etiqueta(cu),curso:(Z.cont.cursos||[]).map(c=>c.name).join(', '),fecha:fF(imp.exam_date),codigo:imp.codigo,duracion:dur,preguntas:itemsDe(cu)};
}
async function prep(){try{if(!window.CUAD)await loadScript('cuadernillo.js?v=2');if(typeof HOJA==='undefined')await loadScript('hoja.js?v=3')}catch(x){err(x);return false}return true}
async function ver(cu){if(!await prep())return;CUAD.vistaPrevia(specCuad(cu),{onPublicar:()=>imprimirCuad(cu),textoPublicar:'🖨️ Imprimir este cuadernillo'})}
async function imprimirCuad(cu){if(!await prep())return;CUAD.imprimir(specCuad(cu),false)}
async function imprimirTodos(){if(!await prep())return;const h=cuadsDe().map(cu=>CUAD.html(specCuad(cu))).join('');doPrint(h)}
function hojaHtml(cu,st){
  const imp=Z.cont.imp,li=logoInfo(),n=itemsDe(cu).length;
  return HOJA.html(HOJA.layout(n),{titulo:imp.title+' · '+etiqueta(cu),colegio:li.colegio,nombre:st.full_name,documento:st.document||'',curso:st.course,fecha:fF(imp.exam_date),version:cu-1,codigo:imp.codigo,logo:li.logo,verLabel:imp.kind==='diagnostico'?'VERSIÓN':'CUADERNILLO'});
}
async function imprimirHojas(){
  if(!await prep())return;
  const cu=document.getElementById('si_hc')?.value||'all',cs=document.getElementById('si_hs')?.value||'';
  const est=Z.est.filter(s=>!cs||s.course_id===cs);
  if(!est.length)return toast('⚠️','Sin estudiantes','Los cursos de este simulacro no tienen estudiantes cargados en la lista.');
  const lista=cu==='all'?cuadsDe():[+cu],h=[];
  est.forEach(s=>lista.forEach(c=>h.push(hojaHtml(c,s))));
  doPrint(h.join(''));
}
async function hojaBlanco(){if(!await prep())return;const cu=+(document.getElementById('si_hc')?.value)||cuadsDe()[0];doPrint(hojaHtml(cu,{full_name:'',document:'',course:''}))}
async function claves(){
  const rows=(Z.cont.items||[]).filter(i=>true);
  const porC={};rows.forEach(i=>(porC[i.cuad]=porC[i.cuad]||[]).push(i));
  const h=Object.keys(porC).map(c=>`<div class="pg"><div class="ti">CLAVES · ${e(Z.cont.imp.title)} · ${e(etiqueta(+c))} (solo docente)</div><table class="kt"><tr><th>N.°</th><th>Área</th><th>Clave</th><th>N.°</th><th>Área</th><th>Clave</th></tr>${(()=>{const a=porC[c],m=Math.ceil(a.length/2);let o='';for(let k=0;k<m;k++){const x=a[k],y=a[k+m];o+=`<tr><td>${x.pos}</td><td>${e(x.area)}</td><td><b>${'ABCD'[x.q.correct]??'?'}</b></td>${y?`<td>${y.pos}</td><td>${e(y.area)}</td><td><b>${'ABCD'[y.q.correct]??'?'}</b></td>`:'<td></td><td></td><td></td>'}</tr>`}return o})()}</table></div>`).join('');
  doPrint(h);
}
/* ---------- crear ---------- */
async function crearSaber(){
  const f=Z.f;if(!f.t.trim())return toast('⚠️','Falta el nombre','Escribe el nombre del simulacro.');
  if(!f.c.length)return toast('⚠️','Elige los cursos','Marca al menos un curso.');
  toast('⏳','Armando el simulacro…','254 preguntas, estructura ICFES.');
  const r=await sb.rpc('create_saber_imp',{p_title:f.t.trim(),p_date:f.d||null,p_courses:f.c,p_grado:f.g||11,p_ia:!!Z.ia});
  if(r.error)return err(r.error);
  Z.f=nuevoF();await load('saberimp');R();await abrir(r.data);
}
function totHtml(){const f=Z.fd,t=(+f.n||0)*(f.a||[]).length,bien=t>=20&&t<=120;
  return`<b>Total del diagnóstico: ${t} preguntas</b> <span style="color:${bien?'#15803d':'#b91c1c'}">${bien?'✔ válido':'✖ debe estar entre 20 y 120'}</span>`}
function totDiag(){const el=document.getElementById('dg-tot');if(el)el.innerHTML=totHtml()}
async function crearDiag(){
  const f=Z.fd;if(!f.c.length)return toast('⚠️','Elige los grupos','Marca uno o más grupos.');
  const tt=(+f.n||0)*(f.a||[]).length;if(f.a.length&&(tt<20||tt>120))return toast('⚠️','Cantidad no válida','El diagnóstico debe tener entre 20 y 120 preguntas en total. Ahora tiene '+tt+'. Cambia las preguntas por área o las áreas marcadas.');
  toast('⏳','Armando diagnósticos…','Uno por cada grupo.');
  if(!f.a.length)return toast('⚠️','Elige qué evaluar','Marca al menos un área o asignatura.');
  const r=await sb.rpc('create_diag',{p_courses:f.c,p_title:f.t||'Diagnóstico',p_date:f.d||null,p_per_area:+f.n||10,p_areas:f.a});
  if(r.error)return err(r.error);
  toast('✅','Diagnósticos creados',r.data.length+' grupo(s).');
  Z.fd=nuevoD();await load('diag');R();if(r.data.length===1)await abrir(r.data[0]);
}
async function borrar(id){
  if(!confirm('¿Borrar este simulacro y todos sus resultados?'))return;
  const r=await sb.from('saber_imp').delete().eq('id',id);if(r.error)return err(r.error);
  if(Z.sel===id)Z.sel=null;await load(Z.mode);R();
}
/* ---------- calificar por foto ---------- */
async function calStart(){
  const C=Z.cal;if(C.busy)return;
  const files=[...(document.getElementById('si_files')?.files||[])];
  if(!files.length)return toast('⚠️','Faltan las fotos','Elige las fotos (JPG o PNG) o un PDF escaneado.');
  C.cuad=+(document.getElementById('si_cc')?.value)||cuadsDe()[0];C.items=[];C.busy=true;R();
  try{if(typeof OMR==='undefined')await loadScript('omr.js?v=2');if(typeof HOJA==='undefined')await loadScript('hoja.js?v=3')}catch(x){C.busy=false;R();return err(x)}
  const L=HOJA.layout(itemsDe(C.cuad).length),jobs=[];
  for(const f of files){
    if(/\.pdf$/i.test(f.name)||f.type==='application/pdf'){try{jobs.push(...await calPdfJobs(f))}catch(x){C.items.push({name:f.name,status:'err',err:x.message||'No se pudo leer el PDF.'})}}
    else jobs.push({name:f.name,get:()=>calImg(f)});
  }
  for(const j of jobs){
    const it={name:j.name,status:'proc',st:null};C.items.push(it);R();await calSleep(30);
    try{const im=await j.get(),r=OMR.grade(im.data,im.w,im.h,L);
      if(r.error){it.status='err';it.err=r.error}
      else{it.status='ok';it.res=r.res;it.read=r.id||{};
        const d=norm(it.read.doc);it.st=d?(Z.est.find(s=>norm(s.document)===d)||null):null;
        it.ver=it.read.ver;it.warn=it.read.ver&&it.read.ver!=='ABC'[C.cuad-1]?'La hoja dice cuadernillo '+it.read.ver+' pero elegiste '+'ABC'[C.cuad-1]:''}
    }catch(x){it.status='err';it.err=(x&&x.message)||'No se pudo leer esta foto.'}
    R();await calSleep(30);
  }
  C.busy=false;R();
}
function evalIt(it){
  const its=itemsDe(Z.cal.cuad),ans={};let blanco=0,rev=0;
  its.forEach((q,k)=>{const v=it.res[k+1];let a=null;
    if(v&&v.st==='ok')a='ABCD'.indexOf(v.r);else{blanco++;if(v&&v.st==='revisar')rev++}
    ans[k+1]=a>=0?a:null});
  return{ans,blanco,rev,n:its.length};
}
function calAssign(i,id){Z.cal.items[i].st=Z.est.find(s=>s.id===id)||null;R()}
async function calSave(){
  const m=new Map();
  Z.cal.items.forEach(it=>{if(it.status==='ok'&&it.st)m.set(it.st.id,{roster_id:it.st.id,cuad:Z.cal.cuad,answers:evalIt(it).ans})});
  if(!m.size)return toast('⚠️','Nada que guardar','Ninguna hoja está identificada con un estudiante.');
  const r=await sb.rpc('saber_imp_guardar',{p_imp:Z.sel,p_rows:[...m.values()]});
  if(r.error)return err(r.error);
  toast('💾','Resultados guardados',r.data+' hoja(s).');Z.res=null;await resultados(true);
}
/* ---------- resultados ---------- */
function global(areas){let s=0,w=0;AREAS.forEach(a=>{const x=areas[a];if(x&&x.t){s+=W[a]*(x.c/x.t*100);w+=W[a]}});return w?Math.round(s/w*5):null}
async function resultados(forzar){
  if(Z.res&&!forzar)return;
  const r=await sb.rpc('saber_imp_resultados',{p_imp:Z.sel});if(r.error)return err(r.error);
  Z.res=r.data||[];R();
}
function agrupar(){
  const por={};
  (Z.res||[]).forEach(r=>{const o=por[r.roster_id]=por[r.roster_id]||{name:r.name,doc:r.document,course:r.course,areas:{},grados:{},k:0};o.k++;
    Object.entries(r.por_area||{}).forEach(([a,v])=>{const x=o.areas[a]=o.areas[a]||{c:0,t:0};x.c+=v.c;x.t+=v.t});
    Object.entries(r.por_grado||{}).forEach(([g,v])=>{const x=o.grados[g]=o.grados[g]||{c:0,t:0};x.c+=v.c;x.t+=v.t})});
  return Object.values(por).sort((a,b)=>String(a.course).localeCompare(b.course)||String(a.name).localeCompare(b.name,'es'));
}
function csv(){
  const dg=Z.cont.imp.kind==='diagnostico',f=agrupar();
  const head=['Estudiante','Documento','Curso',...colsDe(f).map(a=>a+' %'),dg?'Total %':'Global estimado (0-500)'];
  const rows=[head].concat(f.map(x=>{const tot=Object.values(x.areas).reduce((s,v)=>({c:s.c+v.c,t:s.t+v.t}),{c:0,t:0});return[x.name,x.doc||'',x.course,...colsDe(f).map(a=>x.areas[a]?pc(x.areas[a].c,x.areas[a].t):''),dg?pc(tot.c,tot.t):global(x.areas)??'']}));
  const t='﻿'+rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(';')).join('\r\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/csv;charset=utf-8'}));a.download='resultados_'+(Z.cont.imp.codigo||'')+'.csv';a.click();
}
/* ---------- vistas ---------- */
const B=(c,t)=>`style="padding:9px 14px;border-radius:10px;border:0;font-weight:700;cursor:pointer;background:${c};color:${c==='#e2e8f0'?'#0f172a':'#fff'}">${t}`;
function cursosBox(sel,fn,solo11){
  const cs=Z.cursos.filter(c=>!solo11||true);
  return cs.map(c=>`<label style="display:inline-flex;gap:4px;margin:2px 10px 2px 0;font-size:13px"><input type="checkbox" ${sel.includes(c.id)?'checked':''} onchange="SIMP.${fn}('${c.id}',this.checked)">${c.grade}° ${e(c.name)}</label>`).join('')||'<span style="font-size:13px;color:#64748b">No hay cursos.</span>';
}
function estructura(){
  return`<table style="font-size:13px;border-collapse:collapse;width:100%;max-width:560px"><tr style="color:#64748b;text-align:left"><th>Prueba</th><th>Sec. 1</th><th>Sec. 2</th><th>Inglés</th><th>Total</th></tr>
  ${[['Lectura Crítica',41,'—','—',41],['Matemáticas',25,25,'—',50],['Sociales y Ciudadanas',25,25,'—',50],['Ciencias Naturales',29,29,'—',58],['Inglés','—','—',55,55]].map(r=>`<tr style="border-top:1px solid #e2e8f0"><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td><b>${r[4]}</b></td></tr>`).join('')}
  <tr style="border-top:2px solid #0f172a"><td><b>Total</b></td><td><b>120</b></td><td><b>79</b></td><td><b>55</b></td><td><b>254</b></td></tr></table>`;
}

function cardIA(){
  const c=Z.cob;if(!c)return'';
  const filas=c.filas||[],ok=filas.every(f=>+f.disponibles>=+f.necesarias);
  return`<div style="margin:12px 0;border:2px solid ${Z.ia?'#7c3aed':'#e2e8f0'};border-radius:14px;padding:12px;background:${Z.ia?'#faf5ff':'#fff'}">
  <label style="display:flex;gap:8px;align-items:flex-start;font-size:14px;cursor:pointer"><input type="checkbox" ${Z.ia?'checked':''} onchange="SIMP.setIa(this.checked)" style="margin-top:3px"><span><b>🤖 Simulacro con preguntas nuevas hechas por la IA (estilo ICFES)</b><br><span style="font-size:12px;color:#64748b">Preguntas originales de 11° con las competencias y componentes de cada prueba del Saber 11, textos continuos, discontinuos y mixtos, revisadas por la IA. Si no marcas esto, se arma con el banco normal.</span></span></label>
  <div style="margin-top:8px;overflow-x:auto"><table style="font-size:12px;border-collapse:collapse;width:100%;max-width:560px"><tr style="color:#64748b;text-align:left"><th>Prueba</th><th>Preguntas IA listas</th><th>Se necesitan</th><th></th></tr>
  ${filas.map(f=>{const lis=+f.disponibles,nec=+f.necesarias,pl=+f.por_llegar;return`<tr style="border-top:1px solid #e2e8f0"><td>${e(f.prueba)}</td><td><b>${lis}</b>${pl?` <span style="color:#7c3aed">(+${pl} en camino)</span>`:''}</td><td>${nec}</td><td>${lis>=nec?'<span style="color:#15803d;font-weight:700">✔ completo</span>':'<span style="color:#b45309;font-weight:700">faltan '+(nec-lis)+'</span>'}</td></tr>`}).join('')}</table></div>
  <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:8px;align-items:center"><button onclick="SIMP.pedirIA()" ${B('#7c3aed','✨ Pedir a la IA que prepare lo que falta')}</button><span style="font-size:12px;color:#64748b">${ok?'Ya hay suficientes para un simulacro completo.':'Tarda unos minutos; esta pantalla se actualiza al volver a entrar.'}${c.activo?'':' <b style="color:#b91c1c">La IA está apagada: pídele al administrador que la encienda.</b>'}</span></div></div>`;
}
function formCrear(){
  const dg=Z.mode==='diag',f=dg?Z.fd:Z.f,fn=dg?'cursoD':'cursoS',inp='style="width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:8px"';
  if(!dg&&!isDirec())return`<div class="aic-card" style="padding:18px"><p>Los simulacros Saber 11 los crean el rector o el coordinador. Aquí podrás ver los de tus cursos.</p></div>`;
  return`<div class="aic-card" style="padding:18px"><h2 style="font-weight:800;font-size:18px">${dg?'🩺 Nuevo diagnóstico por grupo':'🎯 Nuevo simulacro Saber 11 (impreso)'}</h2>
  <p style="font-size:13px;color:#64748b;margin:4px 0 10px">${dg?'Se crea <b>un diagnóstico para cada grupo</b> que marques, con temas y preguntas de los grados anteriores a ese grupo (Lectura Crítica, Matemáticas, Sociales, Ciencias Naturales e Inglés). Se imprime y se califica con la hoja de respuestas.':'Estructura oficial del ICFES: <b>3 cuadernillos</b> (Sección 1, Sección 2 e Inglés) y una hoja de respuestas por estudiante, con sus datos.'}</p>
  ${dg?'':`<div style="margin-bottom:10px">${estructura()}</div>${cardIA()}`}
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px"><label style="font-size:13px">Nombre<input ${inp} value="${e(f.t)}" oninput="SIMP.set('t',this.value)" placeholder="${dg?'Diagnóstico 2027':'Simulacro 1 · 2026'}"></label>
   ${dg?'':`<label style="font-size:13px">Grado del simulacro<select ${inp} onchange="SIMP.set('g',+this.value)">${[...Array(11).keys()].map(i=>i+1).map(g=>`<option value="${g}" ${f.g===g?'selected':''}>${g}°</option>`).join('')}</select></label>`}
   <label style="font-size:13px">Fecha de aplicación<input type="date" ${inp} value="${f.d}" onchange="SIMP.set('d',this.value)"></label>
   ${dg?`<label style="font-size:13px">Preguntas por área<input type="number" min="1" max="120" ${inp} value="${f.n}" oninput="SIMP.set('n',this.value);SIMP.tot()"></label>`:''}</div>
  ${dg?`<div id="dg-tot" style="margin-top:8px;font-size:13px">${totHtml()}</div>`:''}
  ${dg?`<div style="margin-top:10px;font-size:13px"><b>¿Qué evaluar?</b> <button class="aic-link" onclick="SIMP.areas('icfes')">☑ Las 5 áreas del ICFES</button> <button class="aic-link" onclick="SIMP.areas('ninguna')">Quitar todo</button><div style="display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:6px">${[...AREAS,...OTRAS].filter(permitido).map(a=>`<label style="display:flex;gap:4px;align-items:center"><input type="checkbox" ${f.a.includes(a)?'checked':''} onchange="SIMP.area('${a}',this.checked)">${a}</label>`).join('')}</div><p style="font-size:12px;color:#64748b;margin-top:4px">Solo aparecen las áreas y asignaturas que dictas. Puedes marcar una sola o varias.</p></div>`:''}
  <div style="margin-top:10px;font-size:13px"><b>${dg?'Grupos':'Cursos que lo presentan'}:</b> ${dg?`<button class="aic-link" onclick="SIMP.todos()">☑ Todos los grupos</button>`:''}<br>${cursosBox(f.c,fn)}</div>
  <button onclick="SIMP.${dg?'crearDiag':'crearSaber'}()" ${B('#4f46e5',dg?'🩺 Crear diagnósticos':'🎯 Crear simulacro')}</button></div>`;
}
function detalle(){
  const c=Z.cont;if(!c)return'<p style="font-size:13px;padding:10px">Cargando…</p>';
  const imp=c.imp,dg=imp.kind==='diagnostico',cus=cuadsDe(),cnt=cu=>itemsDe(cu).length;
  const sinDoc=Z.est.filter(s=>!norm(s.document)).length;
  const cs=(c.cursos||[]);
  return`<div style="margin-top:12px;border-top:1px solid #e2e8f0;padding-top:12px;display:grid;gap:14px">
  <div><b>1. Cuadernillos</b> <span style="font-size:12px;color:#64748b">(${cus.map(x=>cnt(x)).reduce((a,b)=>a+b,0)} preguntas en total)</span>
   <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px">${cus.map(cu=>`<div style="border:1px solid #e2e8f0;border-radius:12px;padding:10px"><div style="font-weight:700">${dg?'Diagnóstico':CUADS[cu]}</div><div style="font-size:12px;color:#64748b;margin-bottom:6px">${cnt(cu)} preguntas · ${[...new Set(itemsDe(cu).map(q=>q.area))].map(a=>CORTA[a]||a).join(', ')}</div><button class="aic-link" onclick="SIMP.ver(${cu})">👁 Vista previa</button> <button class="aic-link" onclick="SIMP.impC(${cu})">🖨️ Imprimir</button></div>`).join('')}
   </div><div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap"><button class="aic-link" onclick="SIMP.impTodos()">🖨️ Imprimir todos los cuadernillos</button><button class="aic-link" onclick="SIMP.claves()">🔑 Imprimir claves (solo docente)</button></div>
   ${imp.completo?'':'<p style="font-size:12px;color:#b45309;margin-top:6px">⚠️ El banco no alcanzó para todas las preguntas pedidas; este simulacro quedó parcial.</p>'}</div>
  <div><b>2. Hojas de respuestas con los datos de cada estudiante</b> <span style="font-size:12px;color:#64748b">(${Z.est.length} estudiantes${sinDoc?` · <span style="color:#b91c1c">${sinDoc} sin número de documento: no se podrán calificar por foto</span>`:''})</span>
   <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px">
    <select id="si_hc" style="border:1px solid #cbd5e1;border-radius:8px;padding:7px"><option value="all">Todas las hojas${dg?'':' (A, B y C)'}</option>${cus.map(cu=>`<option value="${cu}">${dg?'Diagnóstico':CUADS[cu]}</option>`).join('')}</select>
    <select id="si_hs" style="border:1px solid #cbd5e1;border-radius:8px;padding:7px"><option value="">Todos los cursos</option>${cs.map(x=>`<option value="${x.id}">${e(x.name)}</option>`).join('')}</select>
    <button onclick="SIMP.impHojas()" ${B('#4f46e5','🖨️ Imprimir hojas de respuestas')}</button><button class="aic-link" onclick="SIMP.hojaBlanco()">Hoja en blanco</button></div>
   <p style="font-size:12px;color:#64748b;margin-top:4px">Imprime en tamaño real (100 %). ${dg?'':'La hoja marca el cuadernillo: A = Sección 1, B = Sección 2, C = Inglés.'}</p></div>
  <div><b>3. Calificar hojas por foto</b>
   <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px"><select id="si_cc" style="border:1px solid #cbd5e1;border-radius:8px;padding:7px">${cus.map(cu=>`<option value="${cu}" ${Z.cal.cuad===cu?'selected':''}>${dg?'Diagnóstico':CUADS[cu]}</option>`).join('')}</select>
    <input id="si_files" type="file" accept="image/*,.pdf,application/pdf" multiple><button onclick="SIMP.calStart()" ${B('#0ea5e9','📷 Calificar')}</button></div>
   <p style="font-size:12px;color:#64748b;margin-top:4px">Hoja plana, sobre mesa oscura, con buena luz y los 4 cuadros negros de las esquinas visibles. Califica una sección a la vez.</p>
   ${calHtml()}</div>
  <div><b>4. Resultados</b> <button class="aic-link" onclick="SIMP.resultados(true)">${Z.res?'↻ Actualizar':'Ver resultados'}</button>${Z.res&&Z.res.length?` <button class="aic-link" onclick="SIMP.csv()">⬇ Excel (CSV)</button>`:''}${resHtml()}</div></div>`;
}
function calHtml(){
  const C=Z.cal;if(!C.items.length)return'';
  const ok=C.items.filter(i=>i.status==='ok'&&i.st).length;
  return`<div style="margin-top:8px;display:grid;gap:6px">${C.items.map((it,i)=>{
    if(it.status==='proc')return`<div style="font-size:13px">⏳ Leyendo ${e(it.name)}…</div>`;
    if(it.status==='err')return`<div style="font-size:13px;color:#b91c1c">❌ ${e(it.name)}: ${e(it.err)}</div>`;
    const v=evalIt(it);
    return`<div style="font-size:13px;border:1px solid #e2e8f0;border-radius:10px;padding:8px">${it.st?`✅ <b>${e(it.st.full_name)}</b> · ${e(it.st.course)}`:`<span style="color:#b45309">⚠️ No identifiqué al estudiante (leí documento ${e(it.read.doc||'—')}). Elige:</span>`}
     <select onchange="SIMP.asignar(${i},this.value)" style="border:1px solid #cbd5e1;border-radius:6px;padding:3px"><option value="">${it.st?'Cambiar…':'— Elegir —'}</option>${Z.est.map(s=>`<option value="${s.id}">${e(s.full_name)} (${e(s.course)})</option>`).join('')}</select>
     <span style="color:#64748b"> · ${v.n-v.blanco} de ${v.n} respondidas${v.blanco?`, ${v.blanco} sin marca válida${v.rev?` (${v.rev} con relleno incompleto)`:''}`:''}</span>${it.warn?` <span style="color:#b45309">⚠️ ${e(it.warn)}</span>`:''}</div>`}).join('')}
   ${C.busy?'':`<div><button onclick="SIMP.calSave()" ${B('#059669','💾 Guardar '+ok+' hoja(s)')}</button></div>`}</div>`;
}
function resHtml(){
  if(!Z.res)return'';
  if(!Z.res.length)return'<p style="font-size:13px;color:#64748b;margin-top:6px">Todavía no hay hojas calificadas.</p>';
  const dg=Z.cont.imp.kind==='diagnostico',f=agrupar(),prom=a=>{const v=f.filter(x=>x.areas[a]&&x.areas[a].t).map(x=>pc(x.areas[a].c,x.areas[a].t));return v.length?Math.round(v.reduce((s,y)=>s+y,0)/v.length):'—'};
  let gr='';
  if(dg){const g={};f.forEach(x=>Object.entries(x.grados).forEach(([k,v])=>{const o=g[k]=g[k]||{c:0,t:0};o.c+=v.c;o.t+=v.t}));
    gr=`<div style="margin-top:10px"><b style="font-size:13px">Dominio por grado anterior (grupo completo)</b><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px">${Object.keys(g).sort((a,b)=>a-b).map(k=>{const p=pc(g[k].c,g[k].t);return`<div style="border:1px solid #e2e8f0;border-radius:10px;padding:6px 10px;font-size:13px;background:${p<50?'#fff1f2':p<70?'#fffbeb':'#ecfdf5'}">Grado ${k}.°<br><b>${p}%</b></div>`}).join('')}</div><p style="font-size:12px;color:#64748b">Los grados en rojo son los temas que el grupo debe reforzar.</p></div>`}
  return`<div class="aic-table-wrap" style="margin-top:8px"><table><thead><tr><th>ESTUDIANTE</th><th>CURSO</th>${colsDe(f).map(a=>`<th>${CORTA[a]||a}</th>`).join('')}<th>${dg?'TOTAL':'GLOBAL EST.'}</th></tr></thead><tbody>
   ${f.map(x=>{const tot=Object.values(x.areas).reduce((s,v)=>({c:s.c+v.c,t:s.t+v.t}),{c:0,t:0});return`<tr><td><b>${e(x.name)}</b></td><td>${e(x.course)}</td>${colsDe(f).map(a=>`<td>${x.areas[a]&&x.areas[a].t?pc(x.areas[a].c,x.areas[a].t)+'%':'—'}</td>`).join('')}<td><b>${dg?pc(tot.c,tot.t)+'%':(global(x.areas)??'—')}</b></td></tr>`}).join('')}
   <tr style="background:#f1f5fb"><td colspan="2"><b>Promedio del grupo</b></td>${colsDe(f).map(a=>`<td><b>${prom(a)}${prom(a)==='—'?'':'%'}</b></td>`).join('')}<td></td></tr></tbody></table></div>
   ${dg?'':'<p style="font-size:12px;color:#64748b">Global estimado (0-500) con la ponderación del ICFES. Si falta una sección, el estimado se calcula con las áreas calificadas; el puntaje oficial se calcula con otro método.</p>'}${gr}`;
}
function lista(){
  const L=Z.lista.filter(x=>Z.mode==='diag'?x.kind==='diagnostico':x.kind==='saber');
  return`<div class="aic-card" style="padding:18px"><h3 style="font-weight:800;margin-bottom:10px">${Z.mode==='diag'?'Diagnósticos creados':'Simulacros creados'}</h3>${L.map(x=>`<div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:10px"><div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center"><div><b>${e(x.title)}</b> <span style="font-size:12px;color:#64748b">· código ${e(x.codigo)}${x.exam_date?' · '+fF(x.exam_date):''} · ${(x.saber_imp_courses||[]).map(c=>cN(c.course_id)).filter(Boolean).join(', ')}</span></div><div style="display:flex;gap:6px"><button class="aic-link" onclick="SIMP.abrir('${x.id}')">${Z.sel===x.id?'▲ Cerrar':'▼ Abrir'}</button>${x.creator_id===M.id?`<button class="aic-link" style="color:#b91c1c" onclick="SIMP.borrar('${x.id}')">🗑</button>`:''}</div></div>${Z.sel===x.id?detalle():''}</div>`).join('')||'<p style="color:#64748b;font-size:13px">Todavía no hay ninguno.</p>'}</div>`;
}
function view(){return`<div style="display:grid;gap:16px">${formCrear()}${lista()}</div>`}
return{load,view,
  set(k,v){(Z.mode==='diag'?Z.fd:Z.f)[k]=v},
  tot:totDiag,
  area(a,on){const s=new Set(Z.fd.a);on?s.add(a):s.delete(a);Z.fd.a=[...s]},
  areas(m){Z.fd.a=m==='icfes'?AREAS.filter(permitido):[];R()},
  cursoS(id,on){const s=new Set(Z.f.c);on?s.add(id):s.delete(id);Z.f.c=[...s]},
  cursoD(id,on){const s=new Set(Z.fd.c);on?s.add(id):s.delete(id);Z.fd.c=[...s];},
  todos(){Z.fd.c=Z.cursos.map(c=>c.id);R()},
  setIa(v){Z.ia=!!v;R()},async pedirIA(){const r=await sb.rpc('banco_saber_pedir');if(r.error)return err(r.error);toast('✨',r.data?'La IA se puso a trabajar':'Ya está todo listo',r.data?'Se programaron '+r.data+' lotes. En unos minutos aparecerán las preguntas.':'Hay suficientes preguntas.');try{const q=await sb.rpc('banco_saber_cobertura');if(!q.error)Z.cob=q.data}catch(x){}R()},
  crearSaber,crearDiag,borrar,abrir,ver,impC:imprimirCuad,impTodos:imprimirTodos,impHojas:imprimirHojas,hojaBlanco,claves,
  calStart,asignar:calAssign,calSave,resultados,csv};
})();
