/* AulaICFES · colegio.js
   Rector y coordinador (Fase 1). Se carga solo cuando hace falta.
   Todo es de SOLO LECTURA, salvo aprobar o rechazar cuentas (rector y administrador). */
(function(){
'use strict';
const S={coos:[],pick:'',cpick:'',csel:'',cdet:null,school:null,sum:{},pend:[],staff:[],docs:[],sel:'',sub:'cur',det:null,hist:[],names:{},adm:[]};
const ok=r=>{if(r&&r.error)throw r.error;return(r&&r.data)||[]};
const av=a=>a.length?Math.round(a.reduce((x,y)=>x+(+y||0),0)/a.length):0;
const fd=x=>{if(!x)return'—';const d=new Date(String(x).length===10?x+'T00:00:00':x);return d.toLocaleDateString('es-CO')};
const ft=x=>x?new Date(x).toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'}):'—';
const ST=s=>s==='aprobado'?'✅ Aprobado':s==='rechazado'?'⛔ No aprobado':'🕒 Pendiente';
const RL={rector:'Rector',coordinador:'Coordinador',prof:'Docente',est:'Estudiante'};
const SEL='colegios(nombre,codinst,municipios(nombre,departamentos(nombre)))';
const sch=c=>c?`${E(c.nombre)} · ${E(c.municipios?.nombre||'')} (${E(c.municipios?.departamentos?.nombre||'')})`:'—';
const cnt=q=>q.then(r=>{if(r.error)throw r.error;return r.count||0});
const head=t=>sb.from(t).select('id',{count:'exact',head:true});

/* ---------- Piezas de pantalla ---------- */
const card=h=>`<div class="aic-card">${h}</div>`;
const STI=l=>/aprobad/i.test(l)?['green','✓']:/pendient/i.test(l)?['orange','◔']:/curso/i.test(l)?['blue','▤']:/estudiant/i.test(l)?['violet','♙']:/simulacro/i.test(l)?['blue','▦']:['green','◎'];
const stat=(n,l)=>{const [k,i]=STI(l);return`<article class="aic-kpi"><div class="aic-kpi-icon ${k}">${i}</div><div><small>${l}</small><strong>${n}</strong></div></article>`};
const tbl=(hs,rows)=>rows.length?`<div class="aic-table-wrap"><table class="w-full text-sm"><tr class="text-left text-slate-500">${hs.map(h=>`<th class="py-1" style="padding-right:12px">${h}</th>`).join('')}</tr>${rows.map(r=>`<tr class="border-t">${r.map(c=>`<td class="py-1" style="padding-right:12px">${c}</td>`).join('')}</tr>`).join('')}</table></div>`:'<p class="text-sm text-slate-500">Todavía no hay información.</p>';
const bar=p=>`<div style="background:#e2e8f0;border-radius:6px;min-width:90px"><div style="width:${Math.max(0,Math.min(100,p))}%;background:${p>=70?'#10b981':p>=50?'#f59e0b':'#ef4444'};height:8px;border-radius:6px"></div></div>`;
const btn=(fn,txt,cls)=>`<button onclick="${fn}" class="px-3 py-1.5 rounded-lg text-xs ${cls}">${txt}</button>`;

/* ---------- Carga de datos ---------- */
async function loadCol(){
  const me=await sb.from('profiles').select(SEL).eq('id',M.id).single();
  S.school=me.data?.colegios||null;
  const [dA,dP,cu,es,si,at]=await Promise.all([
    cnt(head('profiles').eq('role','prof').eq('colegio_id',M.colegio_id).eq('teacher_status','aprobado')),
    cnt(head('profiles').eq('role','prof').eq('colegio_id',M.colegio_id).eq('teacher_status','pendiente')),
    cnt(head('courses')),
    cnt(head('profiles').eq('role','est')),
    cnt(head('simulacros')),
    cnt(head('attempts'))
  ]);
  S.sum={dA,dP,cu,es,si,at};
  const sel='id,full_name,email,phone,role,teacher_status,area,asignaturas,grados,created_at';
  S.pend=ok(await sb.from('profiles').select(sel).in('role',['prof','coordinador']).eq('colegio_id',M.colegio_id).eq('teacher_status','pendiente').order('created_at'));
  S.staff=ok(await sb.from('profiles').select(sel).eq('role','coordinador').eq('colegio_id',M.colegio_id).order('full_name'));
}
async function loadDet(tid){
  const cs=ok(await sb.from('courses').select('id,grade,name').eq('teacher_id',tid).order('grade').order('name'));
  const ids=cs.map(c=>c.id);
  const [ro,st,si,jb,cl]=await Promise.all([
    ids.length?sb.from('roster').select('id,course_id').in('course_id',ids):{data:[]},
    ids.length?sb.from('profiles').select('id,full_name,email,grade,course_id').eq('role','est').in('course_id',ids).order('full_name'):{data:[]},
    sb.from('simulacros').select('id,title,kind,subject,grade,n_questions,active,due_at,simulacro_targets(course_id)').eq('teacher_id',tid).order('created_at',{ascending:false}),
    sb.from('print_jobs').select('id,title,subject,n_questions,versions,exam_date,courses(grade,name)').eq('teacher_id',tid).order('created_at',{ascending:false}),
    sb.from('class_settings').select('title,is_live,updated_at').eq('teacher_id',tid).maybeSingle()
  ]);
  const stu=ok(st),jobs=ok(jb),sids=stu.map(x=>x.id),jids=jobs.map(x=>x.id);
  const [at,pr,ad]=await Promise.all([
    sids.length?sb.from('attempts').select('id,user_id,subject,score,created_at,simulacro_id,simulacros(title)').in('user_id',sids).order('created_at',{ascending:false}).limit(1000):{data:[]},
    jids.length?sb.from('print_results').select('job_id,nota').in('job_id',jids):{data:[]},
    sids.length?sb.from('attendance').select('user_id,session_date,present').in('user_id',sids).order('session_date',{ascending:false}).limit(2000):{data:[]}
  ]);
  const [pl,pa,nt]=await Promise.all([
    sb.from('planeaciones').select('fecha,curso,asignatura,tema,estado,cumplimiento').eq('docente_id',tid).order('fecha',{ascending:false}).limit(60),
    sb.from('planes_area').select('asignatura,grado,anio,archivo_nombre,malla').eq('docente_id',tid).order('anio',{ascending:false}),
    sb.from('mensajes').select('id,texto,created_at,leido_at').eq('de_id',M.id).eq('para_id',tid).eq('tipo','nota').order('created_at',{ascending:false}).limit(30)
  ]);
  S.det={cs,ro:ok(ro),st:stu,si:ok(si),jb:jobs,cl:(cl&&cl.data)||null,at:ok(at),pr:ok(pr),ad:ok(ad),pl:ok(pl),pa:ok(pa),notas:ok(nt)};
}
async function loadDocs(){
  S.docs=ok(await sb.from('profiles').select('id,full_name,email,phone,teacher_status,area,asignaturas,grados,created_at,courses!courses_teacher_id_fkey(grade,name)').eq('role','prof').eq('colegio_id',M.colegio_id).order('full_name'));
  if(S.sel&&!S.docs.find(d=>d.id===S.sel)){S.sel='';S.det=null}
  if(S.sel)await loadDet(S.sel);
}
async function loadHist(){
  S.hist=ok(await sb.from('auditoria').select('id,user_id,accion,entidad,entidad_id,detalle,created_at').order('created_at',{ascending:false}).limit(100));
  const ids=[...new Set(S.hist.flatMap(h=>[h.user_id,h.entidad_id]).filter(Boolean))];
  S.names={};
  if(ids.length)ok(await sb.from('profiles').select('id,full_name,role').in('id',ids)).forEach(p=>{S.names[p.id]=p});
}
async function loadAdm(){
  S.adm=ok(await sb.from('profiles').select('id,full_name,email,phone,role,teacher_status,created_at,'+SEL).in('role',['rector','coordinador']).order('created_at',{ascending:false}));
  D.pendDir=S.adm.filter(x=>x.teacher_status==='pendiente').length;
}

/* ---------- Pantallas ---------- */
function vCol(){
  if(!M.colegio_id)return card('<h2 class="text-xl font-bold">🏫 Mi colegio</h2><p class="text-sm text-red-600">Tu cuenta no tiene un colegio del catálogo. Escribe al administrador para vincularla.</p>');
  const rector=M.role==='rector',s=S.sum;
  const pend=S.pend.map(p=>`<div class="aic-row flex flex-wrap items-center justify-between gap-2"><div><div class="font-semibold">${E(p.full_name)} <span class="text-xs text-slate-500">${RL[p.role]||''}</span></div><div class="text-xs text-slate-500">${E(p.email||'')} · ${E(p.phone||'')}</div>${p.area?`<div class="text-xs text-slate-500">Área: ${E(p.area)} · ${E((p.asignaturas||[]).join(', '))}</div>`:''}</div><div class="flex gap-2">${btn(`DIR.setSt('${p.id}','aprobado')`,'Aprobar','bg-emerald-600 text-white')}${btn(`DIR.setSt('${p.id}','rechazado')`,'Rechazar','bg-slate-200')}</div></div>`).join('');
  const staff=S.staff.map(p=>`<div class="aic-row flex flex-wrap items-center justify-between gap-2"><div><div class="font-semibold">${E(p.full_name)} <span class="text-xs text-slate-500">${ST(p.teacher_status)}</span></div><div class="text-xs text-slate-500">${E(p.email||'')} · ${E(p.phone||'')}</div></div><div class="flex gap-2">${p.teacher_status==='aprobado'?btn(`DIR.setSt('${p.id}','rechazado')`,'Retirar permiso','bg-slate-200'):p.teacher_status==='rechazado'?btn(`DIR.setSt('${p.id}','aprobado')`,'Aprobar','bg-emerald-600 text-white'):''}</div></div>`).join('');
  return`<div class="space-y-4"><section class="aic-hero"><div class="aic-hero-copy"><span class="aic-kicker">${rector?'PANEL DEL RECTOR':'PANEL DE COORDINACIÓN'}</span><h2>${E(S.school?.nombre||'Mi colegio')}</h2><p>${rector?'Aprueba a los docentes y coordinadores de tu colegio y consulta todo lo que hacen.':'Consulta lo que hacen los docentes de tu colegio. La aprobación de cuentas la hace el rector.'}</p><div class="aic-hero-actions"><button onclick="go('ddoc')">Ver docentes →</button><button class="ghost" onclick="go('dhor')">Horarios</button></div></div><div class="aic-hero-art"><div class="aic-orbit orbit1"></div><div class="aic-orbit orbit2"></div><div class="aic-book">🏫</div></div></section>
  ${typeof editorMembrete==='function'?card(editorMembrete()):''}
  <div class="aic-section-head"><div><h2>Resumen del colegio</h2><p>${sch(S.school)}</p></div></div>
  <div class="aic-kpis aic-kpis3">${stat(s.dA,'Docentes aprobados')}${stat(s.dP,'Docentes pendientes')}${stat(s.cu,'Cursos')}${stat(s.es,'Estudiantes con cuenta')}${stat(s.si,'Simulacros y tareas')}${stat(s.at,'Intentos realizados')}</div>
  ${rector?card(`<div class="aic-card-head"><div><h3>Cuentas por aprobar</h3><p>Docentes y coordinadores que esperan tu aprobación</p></div></div>${pend?`<div class="space-y-2">${pend}</div>`:'<p class="text-sm text-slate-500">No hay cuentas pendientes.</p>'}`):''}
  ${rector?card(`<div class="aic-card-head"><div><h3>Coordinadores de tu colegio</h3><p>Estado de cada cuenta</p></div></div>${staff?`<div class="space-y-2">${staff}</div>`:'<p class="text-sm text-slate-500">Todavía no hay coordinadores registrados en tu colegio.</p>'}`):''}</div>`;
}
function vDocs(){
  if(S.sel)return vDet();
  const opts=S.docs.filter(d=>d.teacher_status==='aprobado').map(d=>`<option value="${d.id}" ${S.pick===d.id?'selected':''}>${E(d.full_name)}${d.area?' · '+E(d.area):''}</option>`).join('');
  const d=S.docs.find(x=>x.id===S.pick);
  const info=d?`<div class="text-xs text-slate-500 mt-2">${E(d.email||'')} · ${E(d.phone||'')}${d.area?'<br>Área: '+E(d.area)+' · Asignaturas: '+E((d.asignaturas||[]).join(', ')):''}${(d.grados||[]).length?'<br>Grados: '+d.grados.map(g=>g+'°').join(', '):''}</div>`:'';
  return`<div class="space-y-4">${card(`<h3 class="font-bold" style="color:#102a5c;font-size:17px">👩‍🏫 Docentes de tu colegio</h3><p class="text-sm text-slate-600">Elige un docente de la lista y entra a su entorno para ver todo lo que ha hecho. Es solo para consulta: desde aquí no se puede modificar nada. También puedes dejarle una nota.</p>
   ${S.docs.length?`<div class="flex flex-wrap gap-2 items-end mt-3"><label class="text-sm" style="flex:1;min-width:220px">Docente<br><select class="w-full border rounded-lg p-2 mt-1" onchange="DIR.pick(this.value)"><option value="">Elige un docente…</option>${opts}</select></label><button onclick="DIR.entrar()" class="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm" ${S.pick?'':'disabled style="opacity:.5"'}>Entrar a su entorno</button><button onclick="DIR.resumen()" class="px-4 py-2 rounded-lg bg-slate-200 text-sm" ${S.pick?'':'disabled style="opacity:.5"'}>📝 Resumen y notas</button></div>${info}`:'<p class="text-sm text-slate-500 mt-2">Todavía no hay docentes registrados con el colegio de tu catálogo.</p>'}`)}</div>`;
}
function vDet(){
  const d=S.docs.find(x=>x.id===S.sel),X=S.det;
  if(!d||!X)return card('<p class="text-sm text-slate-500">Cargando…</p>');
  const subs=[['cur','👥 Cursos y estudiantes'],['sim','🚀 Simulacros y tareas'],['res','📊 Resultados'],['imp','🖨️ Exámenes impresos'],['asi','🎥 Clase y asistencia'],['pla','📅 Día a día'],['par','🗂 Plan de área'],['not','📝 Dejar nota']];
  const view=({cur:dCur,sim:dSim,res:dRes,imp:dImp,asi:dAsi,pla:dPla,par:dPar,not:dNot}[S.sub]||dCur)(X);
  return`<div class="space-y-4">${card(`<button onclick="DIR.back()" class="text-sm text-indigo-700 underline">← Cambiar de docente</button><h2 class="text-xl font-bold mt-1">${E(d.full_name)}</h2><p class="text-xs text-slate-500">${E(d.area||'')} · ${E((d.asignaturas||[]).join(', '))} · <b>Solo lectura</b></p>`)}
  <nav class="aic-tabs">${subs.map(([k,l])=>`<button onclick="DIR.sub('${k}')" class="px-4 py-2 rounded-lg text-sm whitespace-nowrap shadow-sm ${S.sub===k?'on':'bg-white'}">${l}</button>`).join('')}</nav>${view}</div>`;
}

function dPla(X){
  const rows=(X.pl||[]).map(p=>[fd(p.fecha),E(p.curso||''),E(p.asignatura||''),E(p.tema||'—'),E(p.estado||''),p.cumplimiento?E(p.cumplimiento):'—']);
  return card(`<h3 class="font-semibold mb-2">📅 Día a día pedagógico (últimas ${rows.length})</h3>${tbl(['Fecha','Curso','Asignatura','Tema','Estado','Cumplimiento'],rows)}`);
}
function dPar(X){
  const rows=(X.pa||[]).map(p=>[E(p.asignatura),p.grado+'°',p.anio,E(p.archivo_nombre||'—'),(p.malla&&Object.keys(p.malla).length)?'Sí':'No']);
  return card(`<h3 class="font-semibold mb-2">🗂 Planes de área subidos</h3>${tbl(['Asignatura','Grado','Año','Archivo','Con malla organizada'],rows)}`);
}
function dNot(X){
  const ns=(X.notas||[]).map(n=>`<div class="aic-row" style="padding:8px 0;border-bottom:1px solid #e2e8f0"><div class="text-xs text-slate-500">${ft(n.created_at)} · ${n.leido_at?'✔ Leída':'Sin leer'}</div><div class="text-sm">${E(n.texto||'')}</div></div>`).join('');
  return card(`<h3 class="font-semibold mb-2">📝 Nota para ${E((S.docs.find(x=>x.id===S.sel)||{}).full_name||'')}</h3><p class="text-xs text-slate-500 mb-2">La nota le aparece en su entorno, en <b>Mensajes</b>, y puedes avisarle también por WhatsApp o correo.</p>
   <textarea id="dir-nota" rows="3" class="w-full border rounded-lg p-2" placeholder="Escribe la nota…"></textarea>
   <div class="flex flex-wrap gap-2 mt-2"><button onclick="DIR.nota('${S.sel}')" class="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm">Dejar nota</button></div>
   <h4 class="font-semibold mt-4 mb-1 text-sm">Notas que ya dejaste</h4>${ns||'<p class="text-sm text-slate-500">Todavía no hay notas.</p>'}`);
}
function dCur(X){
  if(!X.cs.length)return card('<p class="text-sm text-slate-500">Este docente todavía no tiene cursos.</p>');
  return X.cs.map(c=>{const st=X.st.filter(s=>s.course_id===c.id),ro=X.ro.filter(r=>r.course_id===c.id).length;
    return card(`<h3 class="font-semibold mb-2">${c.grade}° ${E(c.name)} <span class="text-xs text-slate-500">· ${ro} en la lista · ${st.length} con cuenta</span></h3>${tbl(['Estudiante','Correo'],st.map(s=>[E(s.full_name),E(s.email||'')]))}`)}).join('');
}
function dSim(X){
  const rows=X.si.map(s=>{const a=X.at.filter(x=>x.simulacro_id===s.id);
    return[s.kind==='tarea'?'📘 Tarea':'📝 Simulacro',E(s.title),E(s.subject),s.grade+'°',s.n_questions,s.active?'Activo':'Inactivo',fd(s.due_at),(s.simulacro_targets||[]).length,a.length,a.length?av(a.map(x=>x.score))+'%':'—']});
  return card(`<h3 class="font-semibold mb-2">🚀 Simulacros y tareas</h3>${tbl(['Tipo','Título','Materia','Grado','Preguntas','Estado','Fecha límite','Cursos','Intentos','Promedio'],rows)}`);
}
function dRes(X){
  if(!X.at.length)return card('<h3 class="font-semibold mb-2">📊 Resultados</h3><p class="text-sm text-slate-500">Los estudiantes de este docente todavía no han hecho simulacros.</p>');
  const nm=Object.fromEntries(X.st.map(s=>[s.id,s.full_name]));
  const bySub={},byStu={};
  X.at.forEach(a=>{(bySub[a.subject]=bySub[a.subject]||[]).push(a.score);(byStu[a.user_id]=byStu[a.user_id]||[]).push(a.score)});
  const stuRows=Object.entries(byStu).map(([id,v])=>({n:nm[id]||'—',c:v.length,p:av(v),m:Math.max(...v)})).sort((a,b)=>b.p-a.p);
  return`<div class="space-y-4">${card(`<h3 class="font-semibold mb-2">📊 Resultados</h3><p class="text-sm text-slate-600">${X.at.length} intentos · promedio general <b>${av(X.at.map(a=>a.score))}%</b></p>`)}
  ${card(`<h3 class="font-semibold mb-2">Por materia</h3>${tbl(['Materia','Intentos','Promedio',''],Object.entries(bySub).map(([k,v])=>[E(k),v.length,av(v)+'%',bar(av(v))]))}`)}
  ${card(`<h3 class="font-semibold mb-2">Por estudiante</h3>${tbl(['Estudiante','Intentos','Promedio','Mejor',''],stuRows.map(r=>[E(r.n),r.c,r.p+'%',r.m+'%',bar(r.p)]))}`)}
  ${card(`<h3 class="font-semibold mb-2">Últimos intentos</h3>${tbl(['Fecha','Estudiante','Materia','Simulacro','Puntaje'],X.at.slice(0,30).map(a=>[fd(a.created_at),E(nm[a.user_id]||'—'),E(a.subject),E(a.simulacros?.title||'—'),a.score+'%']))}`)}</div>`;
}
function dImp(X){
  const rows=X.jb.map(j=>{const r=X.pr.filter(p=>p.job_id===j.id);
    return[E(j.title),j.courses?j.courses.grade+'° '+E(j.courses.name):'—',E(j.subject),j.n_questions,j.versions,fd(j.exam_date),r.length,r.length?(r.reduce((a,b)=>a+(+b.nota||0),0)/r.length).toFixed(1):'—']});
  return card(`<h3 class="font-semibold mb-2">🖨️ Exámenes impresos y calificaciones</h3>${tbl(['Examen','Curso','Materia','Preguntas','Versiones','Fecha','Calificados','Nota promedio'],rows)}`);
}
function dAsi(X){
  const c=X.cl||{};
  const dates=[...new Set(X.ad.map(a=>a.session_date))].sort().reverse();
  const per=X.st.map(s=>{const p=X.ad.filter(a=>a.user_id===s.id&&a.present).length;return[E(s.full_name),p,dates.length?Math.round(p*100/dates.length)+'%':'—']});
  return`<div class="space-y-4">${card(`<h3 class="font-semibold mb-2">🎥 Clase</h3><p class="text-sm text-slate-600">${c.title?E(c.title):'Sin clase configurada'}${c.is_live?' · <b style="color:#dc2626">● EN VIVO</b>':''}</p><p class="text-xs text-slate-500">Última actualización: ${ft(c.updated_at)}</p>`)}
  ${card(`<h3 class="font-semibold mb-2">Asistencia (${dates.length} clases con registro)</h3>${tbl(['Estudiante','Asistencias','% de asistencia'],per)}`)}
  ${card(`<h3 class="font-semibold mb-2">Por fecha</h3>${tbl(['Fecha','Presentes'],dates.slice(0,15).map(f=>[fd(f),X.ad.filter(a=>a.session_date===f&&a.present).length]))}`)}</div>`;
}

async function loadCoo(){
  S.coos=ok(await sb.from('profiles').select('id,full_name,email,phone,role,teacher_status,created_at').eq('role','coordinador').eq('colegio_id',M.colegio_id).neq('id',M.id).order('full_name'));
}
async function loadCooDet(id){
  const [si,nt,pm]=await Promise.all([
    sb.from('saber_imp').select('id,kind,title,exam_date,created_at').eq('creator_id',id).order('created_at',{ascending:false}).limit(40),
    sb.from('mensajes').select('id,texto,created_at,leido_at').eq('de_id',M.id).eq('para_id',id).eq('tipo','nota').order('created_at',{ascending:false}).limit(30),
    sb.from('permisos').select('estado,respondido_por,respondido_at').eq('respondido_por',id).limit(200)
  ]);
  S.cdet={si:ok(si),notas:ok(nt),pm:ok(pm)};
}
function vCoo(){
  if(S.csel)return vCooDet();
  const opts=S.coos.map(c=>`<option value="${c.id}" ${S.cpick===c.id?'selected':''}>${E(c.full_name)}${c.teacher_status==='aprobado'?'':' ('+ST(c.teacher_status)+')'}</option>`).join('');
  return`<div class="space-y-4">${card(`<h3 class="font-bold" style="color:#102a5c;font-size:17px">🧑‍💼 Coordinadores de tu colegio</h3><p class="text-sm text-slate-600">Elige un coordinador de la lista y entra a su entorno para revisar lo que ha hecho. Solo es de consulta: no se puede cambiar nada. Puedes dejarle una nota.</p>
   ${S.coos.length?`<div class="flex flex-wrap gap-2 items-end mt-3"><label class="text-sm" style="flex:1;min-width:220px">Coordinador<br><select class="w-full border rounded-lg p-2 mt-1" onchange="DIR.cpick(this.value)"><option value="">Elige un coordinador…</option>${opts}</select></label><button onclick="DIR.centrar()" class="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm" ${S.cpick?'':'disabled style="opacity:.5"'}>Entrar a su entorno</button><button onclick="DIR.cresumen()" class="px-4 py-2 rounded-lg bg-slate-200 text-sm" ${S.cpick?'':'disabled style="opacity:.5"'}>📝 Resumen y notas</button></div>`:'<p class="text-sm text-slate-500 mt-2">Todavía no hay otros coordinadores en tu colegio.</p>'}`)}</div>`;
}
function vCooDet(){
  const c=S.coos.find(x=>x.id===S.csel),X=S.cdet;
  if(!c||!X)return card('<p class="text-sm text-slate-500">Cargando…</p>');
  const resp=X.pm.filter(p=>p.estado!=='pendiente').length;
  const sims=X.si.map(x=>[x.kind==='diagnostico'?'🩺 Diagnóstico':'🎯 Simulacro',E(x.title),fd(x.exam_date),ft(x.created_at)]);
  const ns=X.notas.map(n=>`<div style="padding:8px 0;border-bottom:1px solid #e2e8f0"><div class="text-xs text-slate-500">${ft(n.created_at)} · ${n.leido_at?'✔ Leída':'Sin leer'}</div><div class="text-sm">${E(n.texto||'')}</div></div>`).join('');
  return`<div class="space-y-4">${card(`<button onclick="DIR.cback()" class="text-sm text-indigo-700 underline">← Cambiar de coordinador</button><h2 class="text-xl font-bold mt-1">${E(c.full_name)}</h2><p class="text-xs text-slate-500">${E(c.email||'')} · ${E(c.phone||'')} · <b>Solo consulta</b></p>`)}
   ${card(`<h3 class="font-semibold mb-2">Actividad</h3><p class="text-sm">Permisos que ha respondido: <b>${resp}</b></p>`)}
   ${card(`<h3 class="font-semibold mb-2">🎯 Simulacros y diagnósticos que ha creado</h3>${tbl(['Tipo','Título','Fecha de aplicación','Creado'],sims)}`)}
   ${card(`<h3 class="font-semibold mb-2">📝 Dejar nota</h3><textarea id="dir-cnota" rows="3" class="w-full border rounded-lg p-2" placeholder="Escribe la nota…"></textarea><div class="mt-2"><button onclick="DIR.cnota('${c.id}')" class="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm">Dejar nota</button></div><h4 class="font-semibold mt-4 mb-1 text-sm">Notas que ya dejaste</h4>${ns||'<p class="text-sm text-slate-500">Todavía no hay notas.</p>'}`)}</div>`;
}
function vHist(){
  const nmOf=id=>S.names[id]?.full_name;
  const rows=S.hist.map(h=>{const d=h.detalle||{};
    return[ft(h.created_at),E(nmOf(h.user_id)||'Administrador'),h.accion==='cambio_estado'?`${ST(d.de)} → ${ST(d.a)}`:h.accion==='ver_entorno'?'Consultó su entorno':E(h.accion),E(nmOf(h.entidad_id)||'—')+' <span class="text-xs text-slate-500">'+E(RL[d.rol]||'')+'</span>']});
  return card(`<h2 class="text-xl font-bold mb-2">🧾 Historial</h2><p class="text-sm text-slate-600 mb-2">Quién aprobó o rechazó cuentas en tu colegio (últimos 100 movimientos).</p>${tbl(['Cuándo','Quién','Cambio','Cuenta'],rows)}`);
}
function vAdm(){
  const l=S.adm.map(p=>`<div class="bg-white rounded-2xl p-4 shadow"><div class="flex flex-wrap items-center justify-between gap-2"><div><div class="font-semibold">${E(p.full_name)} <span class="text-xs text-slate-500">${RL[p.role]||''} · ${ST(p.teacher_status)}</span></div><div class="text-xs text-slate-500">${E(p.email||'')} · ${E(p.phone||'')}</div><div class="text-xs text-slate-500">${sch(p.colegios)}</div></div><div class="flex gap-2">${p.teacher_status!=='aprobado'?btn(`DIR.setSt('${p.id}','aprobado')`,'Aprobar','bg-emerald-600 text-white'):''}${p.teacher_status==='pendiente'?btn(`DIR.setSt('${p.id}','rechazado')`,'Rechazar','bg-slate-200'):''}${p.teacher_status==='aprobado'?btn(`DIR.setSt('${p.id}','rechazado')`,'Retirar permiso','bg-slate-200'):''}</div></div></div>`).join('');
  return`<div class="space-y-4">${card('<h2 class="text-xl font-bold">🏫 Rectores y coordinadores</h2><p class="text-sm text-slate-600">Aquí apruebas a los rectores. Los coordinadores los aprueba el rector de su colegio, pero tú también puedes hacerlo.</p>')}${l||card('<p class="text-sm text-slate-500">Todavía no hay rectores ni coordinadores registrados.</p>')}</div>`;
}

/* ---------- Registro de rector o coordinador (pantalla de entrada) ---------- */
function vReg(headHtml){
  const deps=D.deps||[],muns=D.muns||[],rol=RG.rol==='coordinador'?'coordinador':'rector';
  return`<div class="max-w-md mx-auto mt-10 bg-white rounded-2xl shadow p-6 space-y-3">${headHtml}<p class="text-xs text-slate-500">Regístrate como rector o coordinador de tu colegio. El administrador (o el rector, si eres coordinador) revisará tus datos antes de activar tu cuenta.</p>
  <label class="text-sm block">Soy<select class="w-full border rounded-lg p-2 mt-1" onchange="RG.rol=this.value"><option value="rector" ${rol==='rector'?'selected':''}>Rector</option><option value="coordinador" ${rol==='coordinador'?'selected':''}>Coordinador</option></select></label>
  <input class="w-full border rounded-lg p-2" placeholder="Nombre completo" value="${E(RG.nm)}" oninput="RG.nm=this.value">
  <input class="w-full border rounded-lg p-2" type="tel" placeholder="Teléfono celular" value="${E(RG.tel)}" oninput="RG.tel=this.value">
  <input class="w-full border rounded-lg p-2" type="email" placeholder="Correo electrónico" value="${E(RG.em)}" oninput="RG.em=this.value">
  <input class="w-full border rounded-lg p-2" type="password" placeholder="Contraseña (mín. 6)" value="${E(RG.pw)}" oninput="RG.pw=this.value">
  <label class="text-sm block">Departamento<select class="w-full border rounded-lg p-2 mt-1" onchange="onDep(this.value)"><option value="">Elige tu departamento…</option>${deps.map(d=>`<option value="${d.id}" ${String(d.id)===String(RG.dep)?'selected':''}>${E(d.nombre)}</option>`).join('')}</select></label>
  <label class="text-sm block">Municipio<select class="w-full border rounded-lg p-2 mt-1" ${RG.dep?'':'disabled'} onchange="onMun(this.value)"><option value="">Elige tu municipio…</option>${muns.map(x=>`<option value="${x.id}" ${String(x.id)===String(RG.mun)?'selected':''}>${E(x.nombre)}</option>`).join('')}</select></label>
  <label class="text-sm block">Colegio<input id="colq" class="w-full border rounded-lg p-2 mt-1" placeholder="Escribe para buscar tu colegio…" ${RG.mun?'':'disabled'} value="${E(RG.q)}" oninput="RG.q=this.value;paintCols()"><select id="colsel" class="w-full border rounded-lg p-2 mt-1" ${RG.mun?'':'disabled'} onchange="RG.col=this.value">${colOpts()}</select></label>
  <p class="text-xs text-slate-500">Tu colegio debe estar en la lista. Si no aparece, escribe al administrador de AULA360.</p>
  <button onclick="doAuth()" class="w-full py-2 bg-indigo-600 text-white rounded-lg">Enviar mi registro</button></div>`;
}
async function doReg(){
  const nm=(RG.nm||'').trim().replace(/\s+/g,' '),tel=(RG.tel||'').replace(/[^\d+]/g,''),em=(RG.em||'').trim().toLowerCase(),pw=RG.pw||'';
  const rol=RG.rol==='coordinador'?'coordinador':'rector';
  if(nm.split(' ').length<2||nm.length<5)return toast('⚠️','Falta tu nombre','Escribe tu nombre y apellido.');
  if(!/^\+?\d{7,15}$/.test(tel))return toast('⚠️','Teléfono no válido','Escribe tu número de celular, solo números.');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em))return toast('⚠️','Correo no válido','Revisa tu correo electrónico.');
  if(pw.length<6)return toast('⚠️','Contraseña muy corta','Usa mínimo 6 caracteres.');
  if(!RG.dep||!RG.mun||!RG.col)return toast('⚠️','Falta el colegio','Elige tu departamento, tu municipio y tu colegio de la lista.');
  const{data,error}=await sb.auth.signUp({email:em,password:pw,options:{data:{account:rol,full_name:nm,phone:tel,colegio_id:String(RG.col)}}});
  if(error)return err(error);
  RG=RG0();D.muns=[];D.cols=[];
  if(!data.session){authMode='login';render();return toast('📧','Revisa tu correo','Confirma tu cuenta y luego inicia sesión. Después tu cuenta debe ser aprobada.')}
  boot();
}

/* ---------- Acciones ---------- */
window.DIR={
  async load(t){
    if(t==='dcol')await loadCol();
    else if(t==='ddoc'){S.sel='';S.det=null;await loadDocs()}
    else if(t==='dhist')await loadHist();
    else if(t==='dcoo'){S.csel='';S.cdet=null;await loadCoo()}
    else if(t==='dadm')await loadAdm();
  },
  view(t){return({dcol:vCol,ddoc:vDocs,dcoo:vCoo,dhist:vHist,dadm:vAdm}[t]||(()=>''))()},
  async open(id){S.sel=id;S.sub='cur';S.det=null;render();try{await loadDet(id)}catch(e){S.sel='';err(e)}render()},
  back(){S.sel='';S.det=null;render()},
  pick(v){S.pick=v;render()},
  async entrar(){if(!S.pick)return;await loadScript('vercomo.js?v=4');const d=S.docs.find(x=>x.id===S.pick);VC.entrar(S.pick,d?d.full_name:'Docente','prof')},
  resumen(){if(S.pick)DIR.open(S.pick)},
  cpick(v){S.cpick=v;render()},
  async centrar(){if(!S.cpick)return;await loadScript('vercomo.js?v=4');const c=S.coos.find(x=>x.id===S.cpick);return VC.entrar(S.cpick,c?c.full_name:'Coordinador','coordinador')},
  async cresumen(){if(!S.cpick)return;S.csel=S.cpick;S.cdet=null;render();try{await loadCooDet(S.csel)}catch(e){S.csel='';err(e)}render()},
  cback(){S.csel='';S.cdet=null;render()},
  async nota(id){const t=(document.getElementById('dir-nota')?.value||'').trim();if(!t)return toast('⚠️','Escribe la nota','');
    const r=await sb.rpc('mensaje_enviar',{p_para:id,p_tipo:'nota',p_asunto:'Nota de '+(RL[M.role]||''),p_texto:t});if(r.error)return err(r.error);
    toast('✅','Nota enviada','El docente la verá en Mensajes.');await loadDet(id);S.sub='not';render()},
  async cnota(id){const t=(document.getElementById('dir-cnota')?.value||'').trim();if(!t)return toast('⚠️','Escribe la nota','');
    const r=await sb.rpc('mensaje_enviar',{p_para:id,p_tipo:'nota',p_asunto:'Nota de '+(RL[M.role]||''),p_texto:t});if(r.error)return err(r.error);
    toast('✅','Nota enviada','El coordinador la verá en Mensajes.');await loadCooDet(id);render()},
  sub(k){S.sub=k;render()},
  async setSt(id,st){
    const{error}=await sb.from('profiles').update({teacher_status:st}).eq('id',id);
    if(error)return err(error);
    toast('✅','Guardado',st==='aprobado'?'Cuenta aprobada.':'Cuenta actualizada.');
    go(tab);
  },
  vReg,doReg
};
})();
