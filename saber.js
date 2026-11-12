/* AulaICFES · saber.js
   Simulacros tipo Saber 11 (estructura oficial del ICFES).
   Docente: crea el simulacro, ve la disponibilidad del banco y los resultados.
   Estudiante: presenta la Sesión 1 y la Sesión 2 (4 h 30 min cada una) y ve su puntaje por área y global estimado.
   Se carga solo cuando se abre la pestaña "Saber 11". */
(function(){
'use strict';
const AREAS=['Matemáticas','Lectura Crítica','Sociales y Ciudadanas','Ciencias Naturales','Inglés'];
const CORTA={'Matemáticas':'Mat','Lectura Crítica':'Lect','Sociales y Ciudadanas':'Soc','Ciencias Naturales':'Cien','Inglés':'Ing'};
const PESO={'Lectura Crítica':3,'Matemáticas':3,'Sociales y Ciudadanas':3,'Ciencias Naturales':3,'Inglés':1};
/* Estructura oficial (Guía de orientación Saber 11, ICFES): preguntas calificadas por sesión */
const OFI={1:{'Matemáticas':25,'Lectura Crítica':41,'Sociales y Ciudadanas':25,'Ciencias Naturales':29},
           2:{'Sociales y Ciudadanas':25,'Matemáticas':25,'Ciencias Naturales':29,'Inglés':55}};
const OFI_TOT={1:120,2:134},SES_MIN=270;
const FUENTE={'Matemáticas':['Matemáticas'],'Lectura Crítica':['Lectura Crítica'],'Sociales y Ciudadanas':['Sociales y Ciudadanas','Ciencias Sociales','Sociales'],'Ciencias Naturales':['Ciencias Naturales'],'Inglés':['Inglés']};
const LET='ABCDEFG';
const Z={sims:[],items:[],targets:[],att:[],disp:[],names:{},res:null,run:null,ver:null,f:{t:'',d:'',m:'completo',c:[],due:'',n:1},loaded:false};
const esc=s=>(typeof E==='function'?E(s):String(s??''));
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
const ok=r=>{if(r&&r.error)throw r.error;return(r&&r.data)||[]};
const isProf=()=>M&&M.role==='prof';
const mmss=s=>{s=Math.max(0,Math.round(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return(h?h+':':'')+String(m).padStart(h?2:1,'0')+':'+String(x).padStart(2,'0')};
const fdate=x=>x?new Date(x).toLocaleDateString('es-CO'):'—';
const pct=(c,t)=>t?Math.round(c*100/t):0;

/* puntaje global estimado: (3·Lectura + 3·Mat + 3·Soc + 3·Cien + 1·Ing) / 13 × 5; si falta un área, se reparte entre las que sí hay */
function global(areas){ // areas: {area:{c,t}}
  let s=0,w=0;AREAS.forEach(a=>{const x=areas[a];if(x&&x.t){s+=PESO[a]*pct(x.c,x.t);w+=PESO[a]}});
  return w?Math.round(s/w*5):null;
}
/* mejor intento de cada sesión, combinado por área */
function combinar(atts){
  const best={};atts.forEach(a=>{if(!best[a.sesion]||a.correct>best[a.sesion].correct)best[a.sesion]=a});
  const out={},ses=Object.keys(best).map(Number);
  ses.forEach(s=>Object.entries(best[s].por_area||{}).forEach(([k,v])=>{const o=out[k]||(out[k]={c:0,t:0});o.c+=v.c;o.t+=v.t}));
  return{areas:out,ses,global:global(out)};
}
const itemsDe=(sid,s)=>Z.items.filter(i=>i.sim_id===sid&&(s?i.sesion===s:true));
function porAreaItems(sid,s){const o={};itemsDe(sid,s).forEach(i=>{o[i.area]=(o[i.area]||0)+1});return o}
const minSesion=(sid,s)=>Math.round(SES_MIN*itemsDe(sid,s).length/OFI_TOT[s]);

/* ---------- carga ---------- */
async function load(){
  if(isProf()){
    try{await loadCourses()}catch(e){}
    Z.sims=ok(await sb.from('saber_sims').select('*').eq('teacher_id',M.id).order('created_at',{ascending:false}));
    const ids=Z.sims.map(s=>s.id);
    Z.targets=ids.length?ok(await sb.from('saber_sim_targets').select('sim_id,course_id').in('sim_id',ids)):[];
    Z.items=ids.length?await todos(()=>sb.from('saber_sim_items').select('sim_id,sesion,area').in('sim_id',ids)):[];
    Z.att=ids.length?await todos(()=>sb.from('saber_attempts').select('id,sim_id,user_id,sesion,por_area,correct,total,seconds_used,auto,created_at').in('sim_id',ids).order('created_at',{ascending:false})):[];
    const r=await sb.rpc('saber_disponibilidad');Z.disp=r.error?[]:(r.data||[]);
    const uids=[...new Set(Z.att.map(a=>a.user_id))],courseIds=[...new Set(Z.targets.map(t=>t.course_id))];Z.names={};Z.rosterLoaded=false;
    try{
      for(let i=0;i<uids.length;i+=100){ok(await sb.from('profiles').select('id,full_name,course_id,role').in('id',uids.slice(i,i+100))).forEach(p=>{Z.names[p.id]=p})}
      for(let i=0;i<courseIds.length;i+=50){ok(await todos(()=>sb.from('profiles').select('id,full_name,course_id,role').eq('role','est').in('course_id',courseIds.slice(i,i+50)))).forEach(p=>{Z.names[p.id]=p})}
      Z.rosterLoaded=true;
    }catch(e){console.warn('Saber 11: no fue posible cargar la matrícula asignada',e);Z.rosterLoaded=false;}
  }else{
    Z.sims=ok(await sb.from('saber_sims').select('*').eq('active',true).order('created_at',{ascending:false}));
    const ids=Z.sims.map(s=>s.id);
    Z.items=ids.length?await todos(()=>sb.from('saber_sim_items').select('sim_id,sesion,area').in('sim_id',ids)):[];
    Z.att=ids.length?ok(await sb.from('saber_attempts').select('id,sim_id,user_id,sesion,por_area,correct,total,seconds_used,auto,created_at').eq('user_id',M.id).in('sim_id',ids).order('created_at',{ascending:false})):[];
  }
  Z.loaded=true;
}
async function todos(mk){let out=[],d=0;for(;;){const r=await mk().range(d,d+999);if(r.error)throw r.error;out=out.concat(r.data||[]);if(!r.data||r.data.length<1000)break;d+=1000}return out}
async function refresh(){try{await load()}catch(e){err(e)}render()}

/* ---------- estudiante: presentar una sesión ---------- */
async function start(sid,s){
  const sim=Z.sims.find(x=>x.id===sid);if(!sim)return;
  const its=itemsDe(sid,s).sort((a,b)=>a.orden-b.orden);
  try{
    const full=ok(await sb.from('saber_sim_items').select('question_id,orden,area').eq('sim_id',sid).eq('sesion',s).order('orden'));
    const ids=full.map(x=>x.question_id),qm={};
    for(let i=0;i<ids.length;i+=60){ok(await sb.from('questions').select('id,body,options,image_path,stimulus_title,stimulus_content').in('id',ids.slice(i,i+60))).forEach(q=>{qm[q.id]=q})}
    const qs=full.map(x=>qm[x.question_id]?{...qm[x.question_id],area:x.area}:null).filter(Boolean);
    if(qs.length!==ids.length)return toast('⚠️','Preguntas no disponibles','Faltan preguntas de este simulacro. Avisa a tu docente.');
    const total=minSesion(sid,s)*60;
    Z.run={sim,sesion:s,qs,ans:{},i:0,total,left:total,sending:false};
    clearInterval(Z.timer);
    Z.timer=setInterval(()=>{
      if(!Z.run){clearInterval(Z.timer);return}
      Z.run.left=Math.max(0,Z.run.left-1);
      if(typeof tab==='undefined'||tab==='saber'){
        const e=document.getElementById('sbclk');
        if(e){e.textContent=mmss(Z.run.left);e.style.color=Z.run.left<300?'#dc2626':'#1d4ed8'}
      }
      if(Z.run.left<=0)finish(true);
    },1000);
    render();window.scrollTo(0,0);
  }catch(e){err(e)}
}
function confirmStart(sid,s){
  const sim=Z.sims.find(x=>x.id===sid),n=itemsDe(sid,s).length;
  if(confirm('Vas a presentar la Sesión '+s+' ('+n+' preguntas, '+minSesion(sid,s)+' minutos).\n\nEl tiempo empieza ya y no se puede pausar. No cierres ni recargues la página.\n\n¿Empezar?'))start(sid,s)}
async function finish(auto){
  const R=Z.run;if(!R||R.sending)return;
  if(!auto){const sin=R.qs.filter(q=>R.ans[q.id]==null).length;
    if(!confirm(sin?'Te faltan '+sin+' pregunta(s) sin responder. ¿Finalizar la sesión de todos modos?':'¿Finalizar la sesión y calificar?'))return}
  R.sending=true;clearInterval(Z.timer);
  const answers=Object.fromEntries(R.qs.map(q=>[q.id,R.ans[q.id]??null]));
  const r=await sb.rpc('saber_submit',{p_sim:R.sim.id,p_sesion:R.sesion,p_answers:answers,p_seconds:Math.max(0,R.total-R.left),p_auto:!!auto});
  if(r.error){R.sending=false;return err(r.error)}
  Z.res={...r.data,auto,qs:R.qs,ans:R.ans,sim:R.sim,sesion:R.sesion};Z.run=null;
  try{await load()}catch(e){}
  render();window.scrollTo(0,0);
}

/* ---------- vistas del estudiante ---------- */
function vQuiz(){
  const R=Z.run,q=R.qs[R.i],im=!!q.image_path;
  const pal=R.qs.map((x,k)=>{const a=R.ans[x.id]!=null,cur=k===R.i;return`<button type="button" aria-label="Ir a la pregunta ${k+1}${a?', respondida':', sin responder'}" aria-current="${cur?'step':'false'}" onclick="SABER.go(${k})" class="sb-qnav ${a?'is-answered':''} ${cur?'is-current':''}">${k+1}</button>`}).join('');
  const hecho=Object.values(R.ans).filter(v=>v!=null).length;
  return`<div class="space-y-3"><div class="aic-card"><div class="flex flex-wrap justify-between items-center gap-3"><div><div class="text-xs text-slate-500">${esc(R.sim.title)} · Sesión ${R.sesion}</div><div class="font-semibold">${esc(q.area)} · Pregunta ${R.i+1} de ${R.qs.length}</div><div class="text-xs text-slate-500">${hecho} respondidas</div></div><div class="text-right"><div class="text-xs text-slate-500">Tiempo restante</div><div id="sbclk" style="font-family:monospace;font-size:1.6rem;font-weight:800;color:${R.left<300?'#dc2626':'#1d4ed8'}">${mmss(R.left)}</div></div></div>
  <div class="h-2 bg-slate-200 rounded" style="margin-top:.6rem"><div class="h-2 rounded" style="background:#2864e8;width:${Math.max(0,R.left/R.total*100)}%"></div></div></div>
  <div class="aic-card space-y-4">${vQBody(q,true)}
    <div style="${im?'display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem':'display:grid;gap:.5rem'}">${q.options.map((o,k)=>`<button type="button" onclick="SABER.ans('${q.id}',${k})" aria-pressed="${R.ans[q.id]===k}" class="sb-answer ${R.ans[q.id]===k?'is-selected':''}" style="text-align:${im?'center':'left'}"><b>${LET[k]}${im?'':'.'}</b>${im?'':' '+esc(o)}</button>`).join('')}</div>
    <div class="flex justify-between flex-wrap gap-2"><button ${R.i?'':'disabled'} onclick="SABER.go(${R.i-1})" class="px-4 py-2 rounded-lg bg-slate-200 disabled:opacity-40">← Anterior</button>
      <button onclick="SABER.fin()" class="px-4 py-2 rounded-lg bg-emerald-600 text-white">Finalizar sesión</button>
      <button ${R.i<R.qs.length-1?'':'disabled'} onclick="SABER.go(${R.i+1})" class="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-40">Siguiente →</button></div></div>
  <div class="aic-card"><div class="text-sm font-semibold mb-2">Ir a una pregunta</div><div class="flex flex-wrap gap-1.5" style="gap:6px">${pal}</div></div></div>`;
}
function vResSes(){
  const r=Z.res,pa=r.por_area||{};
  const rows=AREAS.filter(a=>pa[a]).map(a=>`<tr class="border-t"><td class="py-2"><b>${a}</b></td><td>${pa[a].c} / ${pa[a].t}</td><td><b>${pct(pa[a].c,pa[a].t)}</b>/100</td></tr>`).join('');
  const porA={};r.qs.forEach(q=>{(porA[q.area]=porA[q.area]||[]).push(q)});
  return`<div class="space-y-4"><div class="aic-card text-center space-y-2"><div style="font-size:2.5rem">${pct(r.correct,r.total)>=60?'🎉':'💪'}</div><h2 class="text-xl font-bold">Sesión ${r.sesion} terminada</h2><p class="text-sm text-slate-600">${r.correct} de ${r.total} correctas${r.auto?' · Se acabó el tiempo y se calificó lo respondido.':''}</p>
  <div class="aic-table-wrap"><table class="w-full text-sm text-left"><tr class="text-slate-500"><th>Área</th><th>Correctas</th><th>Puntaje (0-100)</th></tr>${rows}</table></div>
  <p class="text-xs text-slate-500">Puntaje estimado según tus respuestas correctas. El puntaje oficial del ICFES se calcula con otro método.</p>
  <button onclick="SABER.cerrar()" class="px-5 py-2 bg-indigo-600 text-white rounded-lg">Volver a mis simulacros Saber 11</button></div>
  ${AREAS.filter(a=>porA[a]).map(a=>`<details class="aic-card"><summary class="font-semibold cursor-pointer">Revisar ${a} (${porA[a].filter(q=>r.ans[q.id]===r.key[q.id]).length}/${porA[a].length} correctas)</summary><div class="space-y-3 mt-3">${porA[a].map((q,i)=>{const c=r.key[q.id],good=r.ans[q.id]===c,ex=r.exp&&r.exp[q.id];return`<div class="p-3 rounded-lg ${good?'bg-emerald-50':'bg-rose-50'} text-sm space-y-2"><b>${i+1}.</b>${vQBody(q,false)}<div>Correcta: <b>${LET[c]}</b> · Tu respuesta: <b>${r.ans[q.id]==null?'—':LET[r.ans[q.id]]}</b></div>${ex?`<div class="text-slate-600">💡 ${esc(ex)}</div>`:''}</div>`}).join('')}</div></details>`).join('')}</div>`;
}
function vEst(){
  if(Z.res)return vResSes();
  if(Z.run)return vQuiz();
  if(!M.course_id)return`<div class="aic-card text-center"><h2 class="text-lg font-bold">Tu docente aún no te ha asignado a un curso</h2><p class="text-sm text-slate-600">Cuando lo haga, aquí verás los simulacros Saber 11 de tu curso.</p></div>`;
  const cards=Z.sims.map(s=>{
    const mine=Z.att.filter(a=>a.sim_id===s.id),cb=combinar(mine),exp=s.due_at&&new Date(s.due_at)<new Date();
    const ses=s.modo==='sesion1'?[1]:s.modo==='sesion2'?[2]:[1,2];
    const falta=Object.values(s.resumen||{}).filter(x=>x.inc<x.esp);
    const bloques=ses.map(n=>{
      const pa=porAreaItems(s.id,n),tot=itemsDe(s.id,n).length,usados=mine.filter(a=>a.sesion===n).length,left=s.max_attempts-usados;
      const puede=!exp&&left>0&&tot>0,best=mine.filter(a=>a.sesion===n).sort((a,b)=>b.correct-a.correct)[0];
      return`<div style="border:1px solid #e2e8f0;border-radius:14px;padding:14px;background:#f8fafd"><div class="flex flex-wrap items-center justify-between gap-2"><div><div class="font-bold" style="color:#102a5c">Sesión ${n}</div><div class="text-xs text-slate-500">${tot} preguntas · ${minSesion(s.id,n)} min · Intentos ${usados} de ${s.max_attempts}${best?' · Mejor: '+best.correct+'/'+best.total:''}</div></div>
        ${puede?`<button onclick="SABER.ini('${s.id}',${n})" class="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm">${usados?'Intentar de nuevo':'Presentar'}</button>`:`<span class="text-xs text-slate-500">${exp?'Cerrado':left<=0?'✅ Presentada':'No disponible'}</span>`}</div>
        <div class="flex flex-wrap gap-1.5 mt-2" style="gap:6px">${Object.entries(pa).map(([a,c])=>`<span style="font-size:11px;background:#e8efff;color:#1d4ed8;border-radius:99px;padding:2px 9px;font-weight:600">${a}: ${c}</span>`).join('')}</div></div>`}).join('');
    const res=cb.ses.length?`<div class="mt-3"><div class="text-sm font-semibold mb-1">Tus resultados</div><div class="flex flex-wrap gap-2">${AREAS.filter(a=>cb.areas[a]).map(a=>`<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:8px 12px;text-align:center"><div class="text-xs text-slate-500">${a}</div><div style="font-size:1.2rem;font-weight:800;color:#102a5c">${pct(cb.areas[a].c,cb.areas[a].t)}</div></div>`).join('')}${cb.global!=null?`<div style="background:linear-gradient(135deg,#2864e8,#1749b8);color:#fff;border-radius:12px;padding:8px 14px;text-align:center"><div class="text-xs" style="opacity:.85">Global estimado${cb.ses.length<ses.length?' (parcial)':''}</div><div style="font-size:1.4rem;font-weight:900">${cb.global}<small style="font-size:.7rem;opacity:.8">/500</small></div></div>`:''}</div></div>`:'';
    return`<div class="aic-card space-y-3"><div><div class="font-bold" style="color:#102a5c;font-size:1.05rem">🎯 ${esc(s.title)}</div>${s.due_at?`<div class="text-xs ${exp?'text-red-600':'text-slate-500'}">${exp?'⛔ Venció el ':'Fecha límite: '}${fdate(s.due_at)}</div>`:''}${s.description?`<div class="text-sm text-slate-600" style="white-space:pre-wrap">${esc(s.description)}</div>`:''}
      ${falta.length?`<div class="text-xs" style="color:#b45309">Simulacro parcial: todavía no están todas las preguntas oficiales de ${[...new Set(falta.map(x=>x.area))].join(', ')}.</div>`:''}</div><div class="grid sm:grid-cols-2 gap-3">${bloques}</div>${res}</div>`}).join('');
  return`<div class="space-y-4"><div class="aic-card"><h3 class="font-bold" style="color:#102a5c">🎯 Simulacros tipo Saber 11</h3><p class="text-sm text-slate-600">Dos sesiones de 4 horas y 30 minutos, con la misma estructura del examen. Una vez empiezas, el tiempo no se detiene. No recargues la página.</p></div>${cards||'<div class="aic-card text-center text-slate-600">Todavía no tienes simulacros Saber 11 asignados. Tu docente los publicará aquí.</div>'}</div>`;
}

/* ---------- docente ---------- */
function disponible(area){const n=FUENTE[area].reduce((s,k)=>s+((Z.disp.find(d=>d.subject===k)||{}).n||0),0);return Number(n)}
function vEstructura(){
  const fila=a=>{const s1=OFI[1][a]||0,s2=OFI[2][a]||0,t=s1+s2,d=disponible(a),okk=d>=t;
    return`<tr class="border-t"><td class="py-2"><b>${a}</b>${a==='Ciencias Naturales'?'<div class="text-xs text-slate-500">Biología, Química y Física</div>':''}</td><td>${s1||'—'}</td><td>${s2||'—'}</td><td><b>${t}</b></td><td>${d}</td><td>${okk?'<span style="color:#059669">✅ Completa</span>':d?`<span style="color:#b45309">⚠️ Faltan ${t-d}</span>`:'<span style="color:#dc2626">⛔ Sin preguntas</span>'}</td></tr>`};
  const tot=AREAS.reduce((s,a)=>s+(OFI[1][a]||0)+(OFI[2][a]||0),0);
  return`<div class="aic-card"><div class="aic-card-head"><div><h3>Estructura oficial del Saber 11</h3><p>Preguntas calificadas por sesión, según la guía de orientación del ICFES (${tot} en total)</p></div></div>
  <div class="aic-table-wrap"><table class="w-full text-sm text-left"><tr class="text-slate-500"><th>Prueba</th><th>Sesión 1</th><th>Sesión 2</th><th>Total</th><th>En el banco</th><th>Estado</th></tr>${AREAS.map(fila).join('')}</table></div>
  <p class="text-xs text-slate-500 mt-2">Cada sesión dura 4 h 30 min. Si falta una prueba en el banco, el simulacro se arma sin ella y queda marcado como <b>parcial</b>. Ciencias Naturales usa preguntas clasificadas en ese componente del banco. Si no hay suficientes preguntas publicadas y calificables, el simulacro se crea parcial.</p></div>`;
}
function vCrear(){
  const F=Z.f,cs=(D.courses||[]).slice().sort((a,b)=>a.grade-b.grade||String(a.name).localeCompare(String(b.name)));
  const req=F.m==='sesion1'?{'Matemáticas':25,'Lectura Crítica':41,'Sociales y Ciudadanas':25,'Ciencias Naturales':29}:F.m==='sesion2'?{'Matemáticas':25,'Sociales y Ciudadanas':25,'Ciencias Naturales':29,'Inglés':55}:{'Matemáticas':50,'Lectura Crítica':41,'Sociales y Ciudadanas':50,'Ciencias Naturales':58,'Inglés':55};
  const cov=Object.entries(req).map(([a,n])=>({a,n,d:disponible(a)}));
  const faltan=cov.filter(x=>x.d<x.n);
  return`<div class="aic-card"><div class="aic-card-head"><div><h3>Crear simulacro Saber 11</h3><p>Se arma solo, con las preguntas publicadas del banco y la estructura oficial</p></div></div>
  <div class="grid sm:grid-cols-2 gap-3">
   <label class="text-sm block">Nombre<input class="border rounded-lg p-2 w-full" maxlength="80" value="${esc(F.t)}" oninput="SABER.f('t',this.value)" placeholder="Ej. Simulacro Saber 11 · Noviembre"></label>
   <label class="text-sm block">¿Qué incluye?<select class="border rounded-lg p-2 w-full" onchange="SABER.f('m',this.value)"><option value="completo" ${F.m==='completo'?'selected':''}>Examen completo (Sesión 1 y Sesión 2)</option><option value="sesion1" ${F.m==='sesion1'?'selected':''}>Solo Sesión 1</option><option value="sesion2" ${F.m==='sesion2'?'selected':''}>Solo Sesión 2</option></select></label>
   <label class="text-sm block">Fecha límite (opcional)<input type="date" class="border rounded-lg p-2 w-full" value="${esc(F.due)}" oninput="SABER.f('due',this.value)"></label>
   <label class="text-sm block">Intentos por sesión<input type="number" min="1" max="5" class="border rounded-lg p-2" style="width:6rem" value="${F.n}" oninput="SABER.f('n',Math.max(1,Math.min(5,+this.value||1)))"></label>
   <label class="text-sm block sm:col-span-2">Indicaciones para los estudiantes (opcional)<textarea class="border rounded-lg p-2 w-full" rows="2" maxlength="500" oninput="SABER.f('d',this.value)">${esc(F.d)}</textarea></label>
   <div class="text-sm sm:col-span-2"><div class="font-semibold mb-1">Cursos que lo presentan</div><div class="flex flex-wrap gap-3">${cs.map(c=>`<label class="flex items-center gap-2"><input type="checkbox" ${F.c.includes(c.id)?'checked':''} onchange="SABER.curso('${c.id}',this.checked)"> ${c.grade}° ${esc(c.name)}</label>`).join('')||'<span class="text-xs text-slate-500">Primero crea un curso en "Cursos y estudiantes".</span>'}</div></div></div>
  <div class="mt-4 rounded-xl p-3" style="background:#f7fafd;border:1px solid #dce7ef"><div class="font-semibold text-sm mb-2">Cobertura del banco para esta configuración</div><div class="grid sm:grid-cols-2 gap-2">${cov.map(x=>`<div class="flex justify-between gap-2 text-xs"><span>${x.a}</span><b style="color:${x.d>=x.n?'#168052':'#b7791f'}">${x.d} / ${x.n} ${x.d>=x.n?'✓':'· incompletas'}</b></div>`).join('')}</div>${faltan.length?`<p class="text-xs mt-2" style="color:#a16207">Atención: el banco no alcanza la estructura solicitada en ${faltan.map(x=>x.a).join(', ')}. El sistema creará un simulacro parcial con las preguntas disponibles; no completará los faltantes con preguntas inventadas.</p>`:'<p class="text-xs mt-2" style="color:#168052">Cobertura suficiente según el conteo actual del banco. Las preguntas se seleccionan al crear el simulacro.</p>'}</div>
  <div class="mt-3"><button onclick="SABER.crear()" class="px-5 py-2 rounded-lg bg-indigo-600 text-white">Crear simulacro Saber 11</button></div></div>`;
}
function vRes(){
  const sim=Z.sims.find(x=>x.id===Z.ver);if(!sim)return'';
  const atts=Z.att.filter(a=>a.sim_id===sim.id),targets=Z.targets.filter(t=>t.sim_id===sim.id),courseIds=[...new Set(targets.map(t=>t.course_id))];
  const cName=id=>{const c=(D.courses||[]).find(x=>x.id===id);return c?c.grade+'° '+c.name:'Curso sin identificar'};
  const roster=Object.values(Z.names).filter(p=>p.role==='est'&&courseIds.includes(p.course_id));
  const porU={};atts.forEach(a=>{(porU[a.user_id]=porU[a.user_id]||[]).push(a)});
  const filas=Object.entries(porU).map(([u,l])=>{const cb=combinar(l),p=Z.names[u]||{};return{u,n:p.full_name||'Estudiante',c:cName(p.course_id),courseId:p.course_id||'sin-curso',cb,ses:new Set(l.map(x=>x.sesion)).size,attempts:l.length}}).sort((a,b)=>(b.cb.global||0)-(a.cb.global||0));
  const participantes=new Set(atts.map(a=>a.user_id));
  const pendientes=roster.filter(p=>!participantes.has(p.id)).sort((a,b)=>String(a.full_name||'').localeCompare(String(b.full_name||''),'es'));
  const prom=a=>{const v=filas.map(f=>f.cb.areas[a]).filter(x=>x&&x.t).map(x=>pct(x.c,x.t));return v.length?Math.round(mean(v)):'—'};
  const globals=filas.filter(f=>f.cb.global!=null).map(f=>f.cb.global);
  const sesiones=new Set(atts.map(a=>a.user_id+':'+a.sesion)).size;
  const expected=sim.modo==='sesion1'?[1]:sim.modo==='sesion2'?[2]:[1,2];
  const courseMap={};
  courseIds.forEach(id=>{const st=roster.filter(p=>p.course_id===id),done=st.filter(p=>participantes.has(p.id));courseMap[id]={name:cName(id),students:st,done,areas:{}}});
  filas.forEach(f=>{const g=courseMap[f.courseId]||(courseMap[f.courseId]={name:f.c,students:[],done:[],areas:{}});AREAS.forEach(a=>{const x=f.cb.areas[a];if(x&&x.t){const z=g.areas[a]||(g.areas[a]=[]);z.push(pct(x.c,x.t))}})});
  const cursos=Object.values(courseMap).sort((a,b)=>a.name.localeCompare(b.name,'es'));
  const mediaCurso=g=>{const v=g.done.map(p=>filas.find(f=>f.u===p.id)?.cb.global).filter(x=>x!=null);return v.length?Math.round(mean(v)):'—'};
  const mediaArea=(g,a)=>g.areas[a]&&g.areas[a].length?Math.round(mean(g.areas[a])):'—';
  const resumenAreas=AREAS.map(a=>({a,v:prom(a)})).filter(x=>x.v!=='—').sort((a,b)=>a.v-b.v),fortaleza=resumenAreas.at(-1),refuerzo=resumenAreas[0];
  const kpi=(label,value,sub)=>`<div class="aic-kpi"><div class="text-xs text-slate-500">${label}</div><div class="text-2xl font-extrabold" style="color:#102a5c">${value}</div><div class="text-xs text-slate-500">${sub}</div></div>`;
  const pctDone=roster.length?Math.round(participantes.size/roster.length*100):null;
  const missingSessions=roster.filter(p=>{const seen=new Set((porU[p.id]||[]).map(a=>a.sesion));return expected.some(x=>!seen.has(x))});
  return`<div class="aic-card space-y-4"><div class="aic-card-head"><div><h3>Resultados · ${esc(sim.title)}</h3><p>Mejor intento por sesión · seguimiento del alumnado asignado</p></div><div class="flex flex-wrap gap-2"><button class="aic-link" onclick="SABER.exportar('${sim.id}')">Exportar CSV ↓</button><button class="aic-link" onclick="SABER.cerrarVer()">Cerrar ✕</button></div></div>
  ${filas.length||roster.length?`<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">${kpi('Participantes',participantes.size,'Con al menos un intento')}${kpi('Pendientes',Z.rosterLoaded?pendientes.length:'—','Sin ningún intento')}${kpi('Cobertura',Z.rosterLoaded&&pctDone!==null?pctDone+'%':'—',Z.rosterLoaded?roster.length+' estudiantes asignados':'No fue posible leer el listado')}${kpi('Promedio global estimado',globals.length?Math.round(mean(globals))+'/500':'—','Entre participantes')}</div>
  ${Z.rosterLoaded?`<div><h4 class="font-bold mb-2">Participación por curso</h4><div class="aic-table-wrap"><table class="w-full text-sm text-left"><thead><tr><th>Curso</th><th>Matriculados asignados</th><th>Presentaron</th><th>Pendientes</th><th>Cobertura</th></tr></thead><tbody>${cursos.map(g=>{const n=g.students.length,d=g.done.length;return`<tr class="border-t"><td class="py-2"><b>${esc(g.name)}</b></td><td>${n}</td><td>${d}</td><td>${n-d}</td><td>${n?Math.round(d/n*100):0}%</td></tr>`}).join('')}</tbody></table></div></div>`:''}
  ${fortaleza&&refuerzo?`<div class="grid sm:grid-cols-2 gap-3"><div class="rounded-xl p-3" style="background:#edf8f2;border:1px solid #ccebd8"><div class="text-xs font-semibold" style="color:#18704e">FORTALEZA DEL GRUPO</div><div class="font-bold mt-1">${fortaleza.a}</div><div class="text-xl font-extrabold" style="color:#18704e">${fortaleza.v}/100</div></div><div class="rounded-xl p-3" style="background:#fff7e9;border:1px solid #f2dfb9"><div class="text-xs font-semibold" style="color:#9a6414">COMPETENCIA PARA REFORZAR</div><div class="font-bold mt-1">${refuerzo.a}</div><div class="text-xl font-extrabold" style="color:#9a6414">${refuerzo.v}/100</div></div></div>`:''}
  <div><h4 class="font-bold mb-2">Comparación académica por curso</h4><div class="aic-table-wrap"><table class="w-full text-sm text-left"><thead><tr><th>Curso</th><th>Participantes</th>${AREAS.map(a=>`<th>${CORTA[a]}</th>`).join('')}<th>Global</th></tr></thead><tbody>${cursos.map(g=>`<tr class="border-t"><td class="py-2"><b>${esc(g.name)}</b></td><td>${g.done.length}</td>${AREAS.map(a=>`<td>${mediaArea(g,a)}</td>`).join('')}<td><b>${mediaCurso(g)}</b></td></tr>`).join('')}</tbody></table></div><p class="text-xs text-slate-500 mt-1">Los promedios académicos se calculan solo con quienes presentaron. La cobertura se calcula sobre el alumnado asignado a cada curso.</p></div>
  <div><h4 class="font-bold mb-2">Seguimiento de sesiones pendientes</h4><div class="aic-table-wrap"><table class="w-full text-sm text-left"><thead><tr><th>Estudiante</th><th>Curso</th><th>Sesión 1</th><th>Sesión 2</th><th>Estado</th></tr></thead><tbody>${roster.filter(p=>{const seen=new Set((porU[p.id]||[]).map(a=>a.sesion));return expected.some(x=>!seen.has(x))}).map(p=>{const seen=new Set((porU[p.id]||[]).map(a=>a.sesion));return`<tr class="border-t"><td class="py-2">${esc(p.full_name||'Estudiante')}</td><td>${esc(cName(p.course_id))}</td><td>${expected.includes(1)?seen.has(1)?'Presentada':'Pendiente':'No aplica'}</td><td>${expected.includes(2)?seen.has(2)?'Presentada':'Pendiente':'No aplica'}</td><td><b>${seen.size?'Incompleto':'Sin iniciar'}</b></td></tr>`}).join('')||'<tr><td colspan="5" class="py-3 text-slate-500">No hay sesiones pendientes registradas.</td></tr>'}</tbody></table></div></div>
  <div><h4 class="font-bold mb-2">Resultados individuales</h4><div class="aic-table-wrap"><table class="w-full text-sm text-left"><thead><tr><th>Estudiante</th><th>Curso</th>${AREAS.map(a=>`<th>${CORTA[a]}</th>`).join('')}<th>Global est.</th><th>Sesiones</th></tr></thead><tbody>${filas.map(f=>`<tr class="border-t"><td class="py-2"><b>${esc(f.n)}</b></td><td>${esc(f.c)}</td>${AREAS.map(a=>`<td>${f.cb.areas[a]&&f.cb.areas[a].t?pct(f.cb.areas[a].c,f.cb.areas[a].t):'—'}</td>`).join('')}<td><b>${f.cb.global==null?'—':f.cb.global}</b></td><td>${f.ses}</td></tr>`).join('')}<tr class="border-t" style="background:#f1f5fb"><td class="py-2" colspan="2"><b>Promedio participantes</b></td>${AREAS.map(a=>`<td><b>${prom(a)}</b></td>`).join('')}<td><b>${globals.length?Math.round(mean(globals)):'—'}</b></td><td>—</td></tr></tbody></table></div></div>
  <p class="text-xs text-slate-500">Áreas de 0 a 100 y global estimado de 0 a 500; no son puntajes oficiales ICFES. Se usa el mejor intento de cada sesión. Una sesión pendiente no se interpreta como cero.</p>`:'<p class="text-sm text-slate-500">No hay estudiantes asignados a este simulacro ni intentos registrados.</p>'}${!Z.rosterLoaded?'<p class="text-xs text-amber-700">El listado de estudiantes no está disponible; no se calculan pendientes ni cobertura.</p>':''}</div>`;
}
function vDoc(){
  const cName=id=>{const c=(D.courses||[]).find(x=>x.id===id);return c?c.grade+'° '+c.name:'—'};
  const lista=Z.sims.map(s=>{
    const falta=Object.values(s.resumen||{}).filter(x=>x.inc<x.esp),n=Z.items.filter(i=>i.sim_id===s.id).length,cur=Z.targets.filter(t=>t.sim_id===s.id).map(t=>cName(t.course_id)).join(', '),pres=new Set(Z.att.filter(a=>a.sim_id===s.id).map(a=>a.user_id)).size;
    return`<div style="border:1px solid #e2e8f0;border-radius:14px;padding:14px;background:#f8fafd" class="space-y-1"><div class="flex flex-wrap justify-between gap-2"><div><div class="font-bold" style="color:#102a5c">${esc(s.title)} ${s.active?'':'<span class="text-xs text-slate-500">(oculto)</span>'}</div><div class="text-xs text-slate-500">${s.modo==='completo'?'Completo':s.modo==='sesion1'?'Solo Sesión 1':'Solo Sesión 2'} · ${n} preguntas · ${cur||'sin cursos'} · ${s.due_at?'límite '+fdate(s.due_at):'sin fecha límite'} · ${pres} estudiante(s) lo han presentado</div></div>
    <div class="flex flex-wrap gap-2"><button onclick="SABER.ver('${s.id}')" class="px-3 py-1.5 rounded-lg text-xs bg-indigo-600 text-white">Ver resultados</button><button onclick="SABER.act('${s.id}',${!s.active})" class="px-3 py-1.5 rounded-lg text-xs bg-slate-200">${s.active?'Ocultar a estudiantes':'Mostrar a estudiantes'}</button><button onclick="SABER.del('${s.id}')" class="px-3 py-1.5 rounded-lg text-xs bg-slate-200">Eliminar</button></div></div>
    ${falta.length?`<div class="text-xs" style="color:#b45309">Parcial: faltaron preguntas en ${falta.map(x=>x.area+' (S'+x.s+': '+x.inc+'/'+x.esp+')').join(', ')}</div>`:'<div class="text-xs" style="color:#059669">✅ Con todas las preguntas oficiales</div>'}</div>`}).join('');
  return`<div class="space-y-4">${vEstructura()}${vCrear()}<div class="aic-card"><div class="aic-card-head"><div><h3>Mis simulacros Saber 11</h3><p>Los estudiantes los ven en la pestaña "Saber 11"</p></div></div><div class="space-y-3">${lista||'<p class="text-sm text-slate-500">Todavía no has creado ninguno.</p>'}</div></div>${vRes()}</div>`;
}
function view(){
  if(!Z.loaded)return'<div class="aic-card">Cargando…</div>';
  return isProf()?vDoc():vEst();
}

/* ---------- acciones ---------- */
window.SABER={
  load,view,
  ini:confirmStart,
  go(k){if(Z.run){Z.run.i=Math.max(0,Math.min(Z.run.qs.length-1,k));render();window.scrollTo(0,0)}},
  ans(id,k){if(Z.run){Z.run.ans[id]=k;render()}},
  fin(){finish(false)},
  cerrar(){Z.res=null;render()},
  f(k,v){Z.f[k]=v},
  curso(id,on){Z.f.c=on?[...new Set([...Z.f.c,id])]:Z.f.c.filter(x=>x!==id)},
  exportar(id){
    const sim=Z.sims.find(x=>x.id===id);if(!sim)return;
    if(!Z.rosterLoaded){toast('⚠️','Listado no disponible','No se exportó el CSV para evitar omitir estudiantes pendientes. Actualiza los resultados e inténtalo de nuevo.');return}
    const rows=[['Estudiante','Curso','Estado','Sesiones presentadas','Intentos','Lectura Crítica','Matemáticas','Sociales y Ciudadanas','Ciencias Naturales','Inglés','Global estimado / 500']];
    const grouped={};Z.att.filter(a=>a.sim_id===id).forEach(a=>{(grouped[a.user_id]=grouped[a.user_id]||[]).push(a)});
    const targets=Z.targets.filter(t=>t.sim_id===id),courseIds=[...new Set(targets.map(t=>t.course_id))];
    const students=Object.values(Z.names).filter(p=>p.role==='est'&&courseIds.includes(p.course_id));
    const courseName=cid=>{const c=(D.courses||[]).find(x=>x.id===cid);return c?c.grade+'° '+c.name:'Curso sin identificar'};
    const expected=sim.modo==='sesion1'?[1]:sim.modo==='sesion2'?[2]:[1,2];
    students.forEach(p=>{
      const list=grouped[p.id]||[],cb=list.length?combinar(list):{areas:{},global:''},seen=new Set(list.map(x=>x.sesion));
      const status=!list.length?'Sin iniciar':expected.every(x=>seen.has(x))?'Completo':'Incompleto';
      rows.push([p.full_name||'Estudiante',courseName(p.course_id),status,seen.size,list.length,...AREAS.map(a=>cb.areas[a]&&cb.areas[a].t?pct(cb.areas[a].c,cb.areas[a].t):''),cb.global??'']);
    });
    const csv='\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='AULA360_resultados_'+String(sim.title||'simulacro').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_')+'.csv';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  },
  ver(id){Z.ver=id;render()},
  cerrarVer(){Z.ver=null;render()},
  async crear(){
    const F=Z.f;
    try{
      if(!F.t.trim())throw new Error('Escribe un nombre para el simulacro.');
      if(!F.c.length)throw new Error('Marca al menos un curso.');
      const req=F.m==='sesion1'?{'Matemáticas':25,'Lectura Crítica':41,'Sociales y Ciudadanas':25,'Ciencias Naturales':29}:F.m==='sesion2'?{'Matemáticas':25,'Sociales y Ciudadanas':25,'Ciencias Naturales':29,'Inglés':55}:{'Matemáticas':50,'Lectura Crítica':41,'Sociales y Ciudadanas':50,'Ciencias Naturales':58,'Inglés':55};
      const faltan=Object.entries(req).filter(([a,n])=>disponible(a)<n);
      if(faltan.length&&!confirm('El banco no tiene suficientes preguntas publicadas y calificables para completar '+faltan.map(([a,n])=>a+' ('+disponible(a)+'/'+n+')').join(', ')+'.\\n\\nSe creará un simulacro PARCIAL con las preguntas disponibles. ¿Continuar?'))return;
      const r=await sb.rpc('create_saber_sim',{p_title:F.t,p_description:F.d||null,p_due:F.due?new Date(F.due+'T23:59:00').toISOString():null,p_max:F.n,p_courses:F.c,p_modo:F.m});
      if(r.error)throw r.error;
      toast('✅','Simulacro creado','Ya lo ven los estudiantes de los cursos elegidos.');
      Z.f={t:'',d:'',m:'completo',c:[],due:'',n:1};await load();render();
    }catch(e){err(e)}
  },
  async act(id,on){try{ok(await sb.from('saber_sims').update({active:on}).eq('id',id));await load();render()}catch(e){err(e)}},
  async del(id){if(!confirm('¿Eliminar este simulacro y todos sus resultados? No se puede deshacer.'))return;try{ok(await sb.from('saber_sims').delete().eq('id',id));if(Z.ver===id)Z.ver=null;await load();render()}catch(e){err(e)}}
};
})();
