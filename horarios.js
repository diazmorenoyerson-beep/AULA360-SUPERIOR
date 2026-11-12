/* AulaICFES · horarios.js
   Horarios del colegio (Fase 2). Se carga solo cuando se abre la pestaña "Horarios" o "Mi horario".
   Rector y coordinador arman y publican. El docente solo ve el horario publicado.
   El motor que genera el horario está en horario.js (window.HZ). */
(function(){
'use strict';
const DN=['','Lun','Mar','Mié','Jue','Vie','Sáb'],DL=['','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const SEC=[['archivo','📎 Cargar archivo'],['jornada','⏰ Jornada'],['grupos','🏫 Grupos'],['asigs','📚 Asignaturas'],['docs','👩‍🏫 Docentes'],['aulas','🚪 Aulas'],['asign','🔗 Asignaciones'],['restr','📏 Restricciones'],['gen','⚡ Generar'],['vers','🗂️ Versiones']];
const S={sec:'archivo',colegio:'',dias:[1,2,3,4,5],franjas:[],grupos:[],docentes:[],asigs:[],aulas:[],asigns:[],nd:[],restr:[],vers:[],
  imp:null,regs:[],impMsg:'',visto:false,gen:null,rev:null,busy:false,vw:{clases:[],titulo:''},verId:'',modo:'grupo',item:'',dispDoc:'',pubOk:false,miDoc:null,iniMi:false,pegarMsg:'',
  nivel:'colegio',tipoH:'regular',em:{desde:'',hasta:'',motivo:'',ausentes:[],maxH:0},base:[]};

/* estilos propios (la hoja de estilos de la app no trae todas las clases) */
if(!document.getElementById('hz-css')){const st=document.createElement('style');st.id='hz-css';st.textContent='.hz-gap1{gap:.25rem}.hz-end{align-items:flex-end}.hz-mb1{margin-bottom:.25rem}.hz-mb3{margin-bottom:.75rem}.hz-mr1{margin-right:.25rem}.hz-mt3{margin-top:.75rem}.hz-px2{padding-left:.5rem;padding-right:.5rem}.hz-sy1>*+*{margin-top:.25rem}.hz-amber{color:#b45309}.hz-emerald{color:#047857}';document.head.appendChild(st)}
/* ---------- utilidades ---------- */
const q=id=>document.getElementById(id);
const val=id=>{const e=q(id);return e?String(e.value).trim():''};
const chk=id=>{const e=q(id);return!!(e&&e.checked)};
const ok=r=>{if(r&&r.error)throw r.error;return(r&&r.data)||[]};
const norm=s=>String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const fd=x=>x?new Date(x).toLocaleDateString('es-CO'):'—';
const card=h=>`<div class="bg-white rounded-2xl p-4 shadow">${h}</div>`;
const btn=(fn,t,c)=>`<button onclick="${fn}" class="px-3 py-1.5 rounded-lg text-xs ${c||'bg-slate-200'}">${t}</button>`;
const BTN='bg-indigo-600 text-white';
const IN='border rounded-lg p-2';
const nGr=g=>g.grado+'° '+g.nombre;
const hora=f=>f.inicio&&f.fin?String(f.inicio).slice(0,5)+'–'+String(f.fin).slice(0,5):'';
const clasesF=()=>S.franjas.filter(f=>f.es_clase);
const dicc=a=>new Map(a.map(x=>[x.id,x]));
async function todas(mk){let out=[],d=0;for(;;){const r=await mk().range(d,d+999);if(r.error)throw r.error;out=out.concat(r.data||[]);if(!r.data||r.data.length<1000)break;d+=1000}return out}
async function run(fn){try{await fn()}catch(e){S.busy=false;err(e);render()}}
function cambio(){S.gen=null;S.rev=null}
async function engine(){await loadScript('horario.js?v=1');return window.HZ}

/* ---------- carga de datos ---------- */
async function cargar(){
  const c=M.colegio_id;if(!c)return;
  const f=t=>todas(()=>sb.from(t).select('*').eq('colegio_id',c));
  const [col,cfg,fr,gr,dc,as,au,asg,nd,rs,vs]=await Promise.all([
    sb.from('colegios').select('nombre').eq('id',c).single(),
    sb.from('hz_config').select('dias').eq('colegio_id',c).maybeSingle(),
    f('hz_franjas'),f('hz_grupos'),f('hz_docentes'),f('hz_asignaturas'),f('hz_aulas'),f('hz_asignaciones'),f('hz_no_disponible'),f('hz_restricciones'),
    sb.from('hz_versiones').select('id,nombre,estado,puntuacion,resumen,created_at,publicado_at,tipo,nivel,desde,hasta,motivo').eq('colegio_id',c).order('created_at',{ascending:false})]);
  S.colegio=(col.data&&col.data.nombre)||'';
  S.dias=(cfg.data&&cfg.data.dias&&cfg.data.dias.length?cfg.data.dias:[1,2,3,4,5]).slice().sort();
  S.franjas=fr.sort((a,b)=>a.orden-b.orden);
  S.grupos=gr.sort((a,b)=>a.grado-b.grado||a.nombre.localeCompare(b.nombre));
  S.docentes=dc.sort((a,b)=>a.nombre.localeCompare(b.nombre));
  S.asigs=as.sort((a,b)=>a.nombre.localeCompare(b.nombre));
  S.aulas=au.sort((a,b)=>a.nombre.localeCompare(b.nombre));
  S.asigns=asg;S.nd=nd;S.restr=rs.sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at)));
  S.vers=ok(vs);
}
const hoyISO=()=>new Date().toLocaleDateString('en-CA');
const NIV={colegio:'Toda la institución',primaria:'Primaria (0° a 5°)',bachillerato:'Bachillerato (6° a 11°)'};
const enNivel=(g,n)=>n==='primaria'?g.grado<=5:n==='bachillerato'?g.grado>=6:true;
async function cargarPublicado(){
  const hoy=hoyISO();
  const pubs=S.vers.filter(x=>x.estado==='publicado');
  const em=pubs.find(x=>x.tipo==='emergente'&&x.desde&&x.hasta&&String(x.desde)<=hoy&&hoy<=String(x.hasta));
  const v=em||pubs.find(x=>x.tipo!=='emergente');
  S.pubOk=!!v;
  if(v){const cl=await todas(()=>sb.from('hz_clases').select('asignacion_id,dia,franja_id,aula_id').eq('version_id',v.id));S.vw={clases:cl,titulo:em?('🚨 Horario emergente'+(em.motivo?': '+em.motivo:'')+' · hasta '+fd(em.hasta+'T12:00:00')):v.nombre}}
  else S.vw={clases:[],titulo:''};
  S.miDoc=S.docentes.find(d=>d.user_id===M.id)||null;
}
async function cargarRegs(){S.regs=ok(await sb.from('profiles').select('id,full_name,email').eq('role','prof').eq('colegio_id',M.colegio_id).eq('teacher_status','aprobado'))}
function ctxGen(){
  const gr=S.grupos.filter(g=>enNivel(g,S.nivel)),gset=new Set(gr.map(g=>g.id)),em=S.tipoH==='emergente';
  const aus=new Set(em?S.em.ausentes:[]);
  let fr=S.franjas;
  if(em&&S.em.maxH>0){let n=0;fr=S.franjas.filter(f=>{if(!f.es_clase)return true;n++;return n<=S.em.maxH})}
  return{gr,gset,aus,fr,em};
}
function entrada(){
  const {gr,gset,aus,fr}=ctxGen(),frs=new Set(fr.map(f=>f.id));
  const asg=S.asigns.filter(a=>gset.has(a.grupo_id)&&!aus.has(a.docente_id));
  const ocupado=[];
  if(S.nivel!=='colegio')S.base.forEach(c=>{const a=S.asigns.find(x=>x.id===c.asignacion_id);if(a&&!gset.has(a.grupo_id))ocupado.push({docente_id:a.docente_id,dia:c.dia,franja_id:c.franja_id})});
  return{dias:S.dias,
    franjas:fr.map(f=>({id:f.id,orden:f.orden,es_clase:f.es_clase})),
    grupos:gr.map(g=>({id:g.id,grado:g.grado,nombre:g.nombre})),
    asignaturas:S.asigs.map(a=>({id:a.id,nombre:a.nombre,area:a.area,aula_tipo:a.aula_tipo})),
    docentes:S.docentes.map(d=>({id:d.id,nombre:d.nombre})),
    asignaciones:asg.map(a=>({id:a.id,docente_id:a.docente_id,grupo_id:a.grupo_id,asignatura_id:a.asignatura_id,horas:a.horas})),
    aulas:S.aulas.map(a=>({id:a.id,tipo:a.tipo,activa:a.activa})),
    noDisponible:S.nd.filter(n=>frs.has(n.franja_id)).map(n=>({docente_id:n.docente_id,dia:n.dia,franja_id:n.franja_id})).concat(ocupado.filter(o=>frs.has(o.franja_id))),
    restricciones:S.restr.map(r=>({id:r.id,alcance:r.alcance,grado:r.grado,grupo_id:r.grupo_id,sobre:r.sobre,objetivo:r.objetivo,tipo:r.tipo,dias:r.dias||[],franjas:r.franjas||[],valor:r.valor,fuerza:r.fuerza}))};
}
async function cargarBase(){
  S.base=[];if(S.nivel==='colegio')return;
  const v=S.vers.find(x=>x.estado==='publicado'&&x.tipo!=='emergente');if(!v)return;
  S.base=await todas(()=>sb.from('hz_clases').select('asignacion_id,dia,franja_id,aula_id').eq('version_id',v.id));
}

/* ---------- cuadrícula del horario (también sirve para imprimir) ---------- */
function opciones(){
  if(S.modo==='grupo')return S.grupos.map(g=>[g.id,nGr(g)]);
  if(S.modo==='docente')return S.docentes.map(d=>[d.id,d.nombre]);
  return S.aulas.map(a=>[a.id,a.nombre]);
}
const TD='style="border:1px solid #cbd5e1;padding:6px;vertical-align:top"';
function tabla(modo,id){
  const A=dicc(S.asigns),AS=dicc(S.asigs),DC=dicc(S.docentes),GR=dicc(S.grupos),AU=dicc(S.aulas),cel=new Map();
  for(const c of S.vw.clases){
    const a=A.get(c.asignacion_id);if(!a)continue;
    const es=modo==='grupo'?a.grupo_id===id:modo==='docente'?a.docente_id===id:c.aula_id===id;if(!es)continue;
    const as=AS.get(a.asignatura_id),g=GR.get(a.grupo_id),d=DC.get(a.docente_id),au=c.aula_id?AU.get(c.aula_id):null;
    const l2=modo==='grupo'?(d?d.nombre:''):modo==='docente'?(g?nGr(g):''):((g?nGr(g):'')+' · '+(d?d.nombre:''));
    const l3=modo!=='aula'&&au?au.nombre:'';
    const k=c.dia+'|'+c.franja_id;
    cel.set(k,(cel.get(k)||[]).concat(`<div class="font-semibold">${E(as?as.nombre:'?')}</div><div class="text-xs text-slate-500">${E(l2)}${l3?' · '+E(l3):''}</div>`));
  }
  const nd=S.dias.length+1;
  return`<table class="w-full text-sm" style="border-collapse:collapse;min-width:520px"><tr><th ${TD}>Hora</th>${S.dias.map(d=>`<th ${TD}>${DL[d]}</th>`).join('')}</tr>${S.franjas.map(f=>f.es_clase
    ?`<tr><td ${TD}><b>${E(f.nombre)}</b><div class="text-xs text-slate-500">${hora(f)}</div></td>${S.dias.map(d=>`<td ${TD}>${(cel.get(d+'|'+f.id)||[]).join('')}</td>`).join('')}</tr>`
    :`<tr><td ${TD} colspan="${nd}" style="border:1px solid #cbd5e1;padding:4px;text-align:center;background:#f1f5f9">${E(f.nombre)} ${hora(f)}</td></tr>`).join('')}</table>`;
}
function vGrid(){
  const ops=opciones();if(!ops.find(o=>o[0]===S.item))S.item=ops[0]?ops[0][0]:'';
  const modos=[['grupo','Grupo'],['docente','Docente'],['aula','Aula']];
  return card(`<div class="flex flex-wrap gap-2 items-center hz-mb3"><b class="text-sm">Ver por</b>
    <select class="${IN}" onchange="HZUI.setModo(this.value)">${modos.map(([k,l])=>`<option value="${k}" ${S.modo===k?'selected':''}>${l}</option>`).join('')}</select>
    <select class="${IN}" onchange="HZUI.setItem(this.value)">${ops.map(([k,l])=>`<option value="${k}" ${S.item===k?'selected':''}>${E(l)}</option>`).join('')}</select>
    ${btn('HZUI.print(0)','🖨️ Imprimir este')}${btn('HZUI.print(1)','🖨️ Imprimir todos')}</div>
    <p class="text-xs text-slate-500 mb-2">${E(S.vw.titulo||'')}</p>
    <div class="overflow-x-auto">${ops.length?tabla(S.modo,S.item):'<p class="text-sm text-slate-500">No hay nada que mostrar todavía.</p>'}</div>`);
}

/* ---------- secciones ---------- */
function vJornada(){
  const fr=S.franjas.map(f=>`<tr class="border-t"><td class="py-1">${f.orden}</td><td>${E(f.nombre)}</td><td>${hora(f)||'—'}</td><td>${f.es_clase?'Clase':'Descanso'}</td><td>${btn(`HZUI.delFranja('${f.id}')`,'Quitar')}</td></tr>`).join('');
  return`<div class="space-y-4">${card(`<h3 class="font-semibold mb-2">📅 Días de clase</h3><div class="flex flex-wrap gap-3">${[1,2,3,4,5,6].map(d=>`<label class="text-sm flex items-center hz-gap1"><input type="checkbox" ${S.dias.includes(d)?'checked':''} onchange="HZUI.toggleDia(${d},this.checked)"> ${DL[d]}</label>`).join('')}</div>`)}
  ${card(`<h3 class="font-semibold mb-2">⏰ Franjas de la jornada</h3><p class="text-xs text-slate-500 mb-2">Crea cada hora de clase y cada descanso, en orden. Los descansos no llevan clase.</p>
    ${S.franjas.length?`<div class="overflow-x-auto"><table class="w-full text-sm"><tr class="text-left text-slate-500"><th>N.º</th><th>Nombre</th><th>Horario</th><th>Tipo</th><th></th></tr>${fr}</table></div>`:'<p class="text-sm text-slate-500 mb-2">Todavía no hay franjas.</p>'}
    <div class="flex flex-wrap gap-2 hz-end hz-mt3"><input id="hz_fnom" class="${IN}" placeholder="Nombre (ej. 1ª hora)"><input id="hz_fini" type="time" class="${IN}"><input id="hz_ffin" type="time" class="${IN}"><label class="text-sm flex items-center hz-gap1"><input id="hz_fcl" type="checkbox" checked> Es hora de clase</label>${btn('HZUI.addFranja()','Agregar',BTN)}</div>
    ${S.franjas.length?'':`<div class="hz-mt3">${btn('HZUI.jornadaEjemplo()','✨ Crear una jornada de ejemplo (6 horas y un descanso)','bg-emerald-600 text-white')}</div>`}`)}</div>`;
}
function vGrupos(){
  const porGrado={};S.grupos.forEach(g=>(porGrado[g.grado]=porGrado[g.grado]||[]).push(g));
  const lista=Object.keys(porGrado).sort((a,b)=>a-b).map(k=>`<div class="mb-2"><b class="text-sm">${k}°</b> ${porGrado[k].map(g=>`<span class="inline-block bg-slate-100 rounded-lg hz-px2 py-1 text-sm hz-mr1">${E(g.nombre)} <button onclick="HZUI.delGrupo('${g.id}')" title="Quitar" style="color:#dc2626">✕</button></span>`).join('')}</div>`).join('');
  const sel=id=>`<select id="${id}" class="${IN}">${[0,1,2,3,4,5,6,7,8,9,10,11].map(g=>`<option value="${g}" ${g===(id==='hz_gd'?6:11)?'selected':''}>${g}°</option>`).join('')}</select>`;
  return card(`<h3 class="font-semibold mb-2">🏫 Grupos del colegio</h3>${lista||'<p class="text-sm text-slate-500 mb-2">Todavía no hay grupos.</p>'}
    <div class="flex flex-wrap gap-2 hz-end hz-mt3"><label class="text-sm">Desde ${sel('hz_gd')}</label><label class="text-sm">Hasta ${sel('hz_gh')}</label><label class="text-sm">Letras o números de los grupos<input id="hz_gl" class="${IN}" value="A,B" placeholder="A,B,C"></label>${btn('HZUI.crearGrupos()','Crear grupos',BTN)}</div>
    <p class="text-xs text-slate-500 mt-2">Ejemplo: de 6° a 11° con "A,B" crea 6°A, 6°B, 7°A… 11°B.</p>`);
}
function vAsigs(){
  const l=S.asigs.map(a=>`<tr class="border-t"><td class="py-1">${E(a.nombre)}</td><td>${E(a.area)}</td><td>${E(a.aula_tipo||'—')}</td><td>${btn(`HZUI.delAsig('${a.id}')`,'Quitar')}</td></tr>`).join('');
  return card(`<h3 class="font-semibold mb-2">📚 Asignaturas</h3>${S.asigs.length?`<div class="overflow-x-auto"><table class="w-full text-sm"><tr class="text-left text-slate-500"><th>Asignatura</th><th>Área</th><th>Aula especial</th><th></th></tr>${l}</table></div>`:'<p class="text-sm text-slate-500 mb-2">Todavía no hay asignaturas.</p>'}
    <div class="flex flex-wrap gap-2 hz-end hz-mt3"><input id="hz_anom" class="${IN}" placeholder="Asignatura"><input id="hz_aare" class="${IN}" placeholder="Área (ej. Ciencias Naturales)"><input id="hz_atip" class="${IN}" placeholder="Tipo de aula (opcional)">${btn('HZUI.addAsig()','Agregar',BTN)}</div>
    <div class="hz-mt3">${btn('HZUI.cargarCatalogo()','📥 Cargar las asignaturas del catálogo de AULA360','bg-emerald-600 text-white')}</div>
    <p class="text-xs text-slate-500 mt-2">El área es importante: con ella puedes poner reglas como "Matemáticas solo lunes y miércoles". Si una asignatura necesita un aula especial (laboratorio, sala de sistemas), escribe su tipo.</p>`);
}
function vDocs(){
  const hrs={};S.asigns.forEach(a=>{hrs[a.docente_id]=(hrs[a.docente_id]||0)+a.horas});
  const l=S.docentes.map(d=>{const nb=S.nd.filter(n=>n.docente_id===d.id).length;
    return`<div class="border rounded-xl p-3 flex flex-wrap items-center justify-between gap-2"><div><div class="font-semibold">${E(d.nombre)} ${d.user_id?'<span class="text-xs hz-emerald">· con cuenta</span>':''}</div><div class="text-xs text-slate-500">${hrs[d.id]||0} hora(s) asignadas · ${nb?nb+' franja(s) en las que no puede':'disponible siempre'}</div></div><div class="flex gap-2">${btn(`HZUI.abrirDisp('${d.id}')`,'🗓 Disponibilidad')}${btn(`HZUI.delDoc('${d.id}')`,'Quitar')}</div></div>`}).join('');
  let disp='';
  const dd=S.docentes.find(d=>d.id===S.dispDoc);
  if(dd)disp=card(`<h3 class="font-semibold hz-mb1">Disponibilidad de ${E(dd.nombre)}</h3><p class="text-xs text-slate-500 mb-2">Toca las casillas en las que <b>NO</b> puede dar clase (quedan en rojo).</p><div class="overflow-x-auto"><table class="text-sm" style="border-collapse:collapse"><tr><th></th>${S.dias.map(d=>`<th ${TD}>${DN[d]}</th>`).join('')}</tr>${clasesF().map(f=>`<tr><td ${TD}>${E(f.nombre)}</td>${S.dias.map(d=>{const no=S.nd.some(n=>n.docente_id===dd.id&&n.dia===d&&n.franja_id===f.id);return`<td onclick="HZUI.toggleND('${dd.id}',${d},'${f.id}')" style="border:1px solid #cbd5e1;padding:10px;cursor:pointer;text-align:center;background:${no?'#fecaca':'#ecfdf5'}">${no?'✕':'✓'}</td>`}).join('')}</tr>`).join('')}</table></div><div class="mt-2">${btn('HZUI.cerrarDisp()','Cerrar')}</div>`);
  return`<div class="space-y-4">${card(`<h3 class="font-semibold mb-2">👩‍🏫 Docentes del horario</h3><div class="space-y-2">${l||'<p class="text-sm text-slate-500">Todavía no hay docentes.</p>'}</div>
    <div class="flex flex-wrap gap-2 hz-end hz-mt3"><input id="hz_dnom" class="${IN}" placeholder="Nombre del docente">${btn('HZUI.addDoc()','Agregar',BTN)}</div>
    <div class="hz-mt3">${btn('HZUI.traerDocentes()','📥 Traer los docentes registrados en AULA360 de mi colegio','bg-emerald-600 text-white')}</div>
    <p class="text-xs text-slate-500 mt-2">Los docentes con cuenta podrán ver su propio horario en la pestaña "Mi horario". Puedes agregar también docentes que aún no tienen cuenta.</p>`)}${disp}</div>`;
}
function vAulas(){
  const l=S.aulas.map(a=>`<tr class="border-t"><td class="py-1">${E(a.nombre)}</td><td>${E(a.tipo)}</td><td>${btn(`HZUI.delAula('${a.id}')`,'Quitar')}</td></tr>`).join('');
  return card(`<h3 class="font-semibold mb-2">🚪 Aulas (opcional)</h3><p class="text-xs text-slate-500 mb-2">Si no registras aulas, el horario no controla los salones. Regístralas solo si quieres evitar que dos grupos usen el mismo laboratorio a la vez.</p>
    ${S.aulas.length?`<table class="w-full text-sm"><tr class="text-left text-slate-500"><th>Aula</th><th>Tipo</th><th></th></tr>${l}</table>`:''}
    <div class="flex flex-wrap gap-2 hz-end hz-mt3"><input id="hz_unom" class="${IN}" placeholder="Nombre (ej. Laboratorio 1)"><input id="hz_utip" class="${IN}" value="general" placeholder="Tipo (general, laboratorio…)">${btn('HZUI.addAula()','Agregar',BTN)}</div>`);
}
function vAsign(){
  const GR=dicc(S.grupos),AS=dicc(S.asigs),DC=dicc(S.docentes);
  const lista=S.asigns.slice().sort((a,b)=>{const ga=GR.get(a.grupo_id),gb=GR.get(b.grupo_id);return(ga?ga.grado:0)-(gb?gb.grado:0)||String(ga&&ga.nombre).localeCompare(String(gb&&gb.nombre))}).map(a=>{const g=GR.get(a.grupo_id),s=AS.get(a.asignatura_id),d=DC.get(a.docente_id);
    return`<tr class="border-t"><td class="py-1">${g?E(nGr(g)):'?'}</td><td>${s?E(s.nombre):'?'}</td><td>${d?E(d.nombre):'?'}</td><td>${a.horas}</td><td>${btn(`HZUI.delAsign('${a.id}')`,'Quitar')}</td></tr>`}).join('');
  const cap=S.dias.length*clasesF().length,porG={};S.asigns.forEach(a=>{porG[a.grupo_id]=(porG[a.grupo_id]||0)+a.horas});
  const resumen=S.grupos.filter(g=>porG[g.id]).map(g=>`<span class="inline-block rounded-lg hz-px2 py-1 text-xs hz-mr1 hz-mb1" style="background:${porG[g.id]>cap?'#fecaca':'#e2e8f0'}">${E(nGr(g))}: ${porG[g.id]}/${cap} h</span>`).join('');
  const grados=[...new Set(S.grupos.map(g=>g.grado))].sort((a,b)=>a-b);
  return`<div class="space-y-4">${card(`<h3 class="font-semibold mb-2">🔗 Quién dicta qué, a qué grupo y cuántas horas</h3>
    <div class="flex flex-wrap gap-2 hz-end"><label class="text-sm block">Grupo<select id="hz_ag" class="${IN}">${grados.map(g=>`<option value="grado:${g}">Todos los grupos de ${g}°</option>`).join('')}${S.grupos.map(g=>`<option value="g:${g.id}">${E(nGr(g))}</option>`).join('')}</select></label>
    <label class="text-sm block">Asignatura<select id="hz_aa" class="${IN}">${S.asigs.map(a=>`<option value="${a.id}">${E(a.nombre)}</option>`).join('')}</select></label>
    <label class="text-sm block">Docente<select id="hz_ad" class="${IN}">${S.docentes.map(d=>`<option value="${d.id}">${E(d.nombre)}</option>`).join('')}</select></label>
    <label class="text-sm block">Horas por semana<input id="hz_ah" type="number" min="1" max="20" value="3" class="${IN}" style="width:6rem"></label>${btn('HZUI.addAsign()','Agregar',BTN)}</div>
    ${resumen?`<p class="text-xs text-slate-500 hz-mt3">Horas por grupo frente a las que caben en la semana: ${resumen}</p>`:''}`)}
  ${card(`<h3 class="font-semibold mb-2">📋 Lista de asignaciones (${S.asigns.length})</h3>${S.asigns.length?`<div class="overflow-x-auto"><table class="w-full text-sm"><tr class="text-left text-slate-500"><th>Grupo</th><th>Asignatura</th><th>Docente</th><th>Horas</th><th></th></tr>${lista}</table></div>`:'<p class="text-sm text-slate-500">Todavía no hay asignaciones.</p>'}`)}
  ${card(`<h3 class="font-semibold hz-mb1">⚡ Cargar muchas de una vez</h3><p class="text-xs text-slate-500 mb-2">Pega una línea por asignación, separando con punto y coma: <b>Grupo; Asignatura; Docente; Horas</b>. Ejemplo: <code>9A; Matemáticas; Ana Pérez; 4</code></p>
    <textarea id="hz_paste" rows="5" class="w-full border rounded-lg p-2" placeholder="9A; Matemáticas; Ana Pérez; 4&#10;9B; Matemáticas; Ana Pérez; 4"></textarea>
    <label class="text-sm flex items-center hz-gap1 mt-1"><input id="hz_pcrear" type="checkbox" checked> Crear los docentes y asignaturas que no existan</label>
    <div class="mt-2">${btn('HZUI.pegar()','Cargar lista',BTN)}</div>${S.pegarMsg?`<div class="text-sm mt-2">${S.pegarMsg}</div>`:''}`)}</div>`;
}
const SOBRE={area:'Área',asignatura:'Asignatura',docente:'Docente'};
function nombreObj(r){if(r.sobre==='area')return r.objetivo;if(r.sobre==='asignatura'){const a=S.asigs.find(x=>x.id===r.objetivo);return a?a.nombre:'(borrada)'}const d=S.docentes.find(x=>x.id===r.objetivo);return d?d.nombre:'(borrado)'}
function descR(r){
  const g=r.alcance==='grupo'?S.grupos.find(x=>x.id===r.grupo_id):null;
  const ambito=r.alcance==='colegio'?'en todo el colegio':r.alcance==='grado'?'en '+r.grado+'°':'en '+(g?nGr(g):'un grupo');
  const fr=n=>(r.franjas||[]).slice().sort((a,b)=>a-b).join(', ');
  const q={solo_dias:'solo los días '+(r.dias||[]).map(d=>DN[d]).join(', '),nunca_dias:'nunca los días '+(r.dias||[]).map(d=>DN[d]).join(', '),solo_franjas:'solo en las horas n.º '+fr(),nunca_franjas:'nunca en las horas n.º '+fr(),max_por_dia:'máximo '+r.valor+' hora(s) por día',bloque_doble:'en bloques de 2 horas seguidas'}[r.tipo];
  return`${SOBRE[r.sobre]} <b>${E(nombreObj(r))}</b> ${E(ambito)}: ${E(q)} <span class="text-xs ${r.fuerza==='obligatoria'?'text-red-700':'hz-amber'}">(${r.fuerza})</span>`;
}
function vRestr(){
  const l=S.restr.map(r=>`<div class="border rounded-xl p-3 flex flex-wrap items-center justify-between gap-2"><div class="text-sm">${descR(r)}${r.nota?`<div class="text-xs text-slate-500">${E(r.nota)}</div>`:''}</div>${btn(`HZUI.delRestr('${r.id}')`,'Quitar')}</div>`).join('');
  const areas=[...new Set(S.asigs.map(a=>a.area))].sort();
  const grados=[...new Set(S.grupos.map(g=>g.grado))].sort((a,b)=>a-b);
  return`<div class="space-y-4">${card(`<h3 class="font-semibold mb-2">📏 Restricciones del horario (${S.restr.length})</h3><div class="space-y-2">${l||'<p class="text-sm text-slate-500">Todavía no hay restricciones. Son opcionales.</p>'}</div>`)}
  ${card(`<h3 class="font-semibold hz-mb1">➕ Nueva restricción</h3><p class="text-xs text-slate-500 mb-2">Una <b>obligatoria</b> siempre se cumple (si es imposible, te lo avisa). Una <b>preferida</b> se intenta cumplir, pero puede ceder.</p>
    <div class="grid sm:grid-cols-2 gap-2">
    <label class="text-sm block">Se aplica a<select id="hz_rs" class="${IN} w-full" onchange="HZUI.cambiaSobre()"><option value="area">Un área</option><option value="asignatura">Una asignatura</option><option value="docente">Un docente</option></select></label>
    <label class="text-sm block">¿Cuál?<select id="hz_ro" class="${IN} w-full">${areas.map(a=>`<option value="${E(a)}">${E(a)}</option>`).join('')}</select></label>
    <label class="text-sm block">En<select id="hz_ra" class="${IN} w-full" onchange="HZUI.cambiaAlcance()"><option value="colegio">Todo el colegio</option><option value="grado">Un grado</option><option value="grupo">Un grupo</option></select></label>
    <label class="text-sm block" id="hz_rgw" style="display:none">Grado<select id="hz_rg" class="${IN} w-full">${grados.map(g=>`<option value="${g}">${g}°</option>`).join('')}</select></label>
    <label class="text-sm block" id="hz_rpw" style="display:none">Grupo<select id="hz_rp" class="${IN} w-full">${S.grupos.map(g=>`<option value="${g.id}">${E(nGr(g))}</option>`).join('')}</select></label>
    <label class="text-sm block">Regla<select id="hz_rt" class="${IN} w-full" onchange="HZUI.cambiaTipo()"><option value="solo_dias">Solo se dicta estos días</option><option value="nunca_dias">Nunca se dicta estos días</option><option value="solo_franjas">Solo en estas horas del día</option><option value="nunca_franjas">Nunca en estas horas del día</option><option value="max_por_dia">Máximo de horas por día</option><option value="bloque_doble">En bloques de 2 horas seguidas</option></select></label>
    <label class="text-sm block">Fuerza<select id="hz_rf" class="${IN} w-full"><option value="obligatoria">Obligatoria</option><option value="preferida">Preferida</option></select></label></div>
    <div id="hz_rdw" class="mt-2 flex flex-wrap gap-3">${S.dias.map(d=>`<label class="text-sm flex items-center hz-gap1"><input type="checkbox" class="hz_d" value="${d}"> ${DL[d]}</label>`).join('')}</div>
    <div id="hz_rfw" class="mt-2 flex flex-wrap gap-3" style="display:none">${clasesF().map(f=>`<label class="text-sm flex items-center hz-gap1"><input type="checkbox" class="hz_f" value="${f.orden}"> ${E(f.nombre)}</label>`).join('')}</div>
    <label id="hz_rvw" class="text-sm block mt-2" style="display:none">Máximo de horas por día<input id="hz_rv" type="number" min="1" max="12" value="1" class="${IN}" style="width:6rem"></label>
    <input id="hz_rn" class="${IN} w-full mt-2" placeholder="Nota (opcional)" maxlength="200">
    <div class="hz-mt3">${btn('HZUI.addRestr()','Agregar restricción',BTN)}</div>`)}</div>`;
}
function vOpc(){
  const em=S.tipoH==='emergente',E1=S.em;
  const opt=Object.entries(NIV).map(([k,l])=>`<option value="${k}" ${S.nivel===k?'selected':''}>${l}</option>`).join('');
  return card(`<h3 class="font-semibold hz-mb1">🎛️ ¿Qué horario vas a armar?</h3>
  <div class="grid sm:grid-cols-2 gap-3">
   <label class="text-sm block">Para quién<select class="${IN} w-full" onchange="HZUI.setNivel(this.value)">${opt}</select></label>
   <label class="text-sm block">Tipo de horario<select class="${IN} w-full" onchange="HZUI.setTipo(this.value)"><option value="regular" ${em?'':'selected'}>Horario regular del año</option><option value="emergente" ${em?'selected':''}>🚨 Horario emergente (temporal)</option></select></label></div>
  <p class="text-xs text-slate-500 mt-2">${S.nivel==='colegio'?'Se arma un solo horario para toda la institución, con todas las restricciones que hayas puesto.':'Solo se arman los grupos de este nivel. Los docentes que también dictan en el otro nivel no chocarán con su horario publicado, y al guardar se conserva el horario publicado del otro nivel.'}</p>
  ${em?`<div class="hz-mt3 grid sm:grid-cols-2 gap-3" style="border-top:1px solid #e5e7eb;padding-top:.75rem">
   <label class="text-sm block">Desde<input type="date" class="${IN} w-full" value="${E(E1.desde)}" oninput="HZUI.setEm('desde',this.value)"></label>
   <label class="text-sm block">Hasta<input type="date" class="${IN} w-full" value="${E(E1.hasta)}" oninput="HZUI.setEm('hasta',this.value)"></label>
   <label class="text-sm block sm:col-span-2">Motivo (ej. paro de transporte, calamidad, jornada reducida)<input class="${IN} w-full" maxlength="200" value="${E(E1.motivo)}" oninput="HZUI.setEm('motivo',this.value)"></label>
   <label class="text-sm block">Máximo de horas de clase por día (0 = las de siempre)<input type="number" min="0" max="12" class="${IN}" style="width:7rem" value="${E1.maxH}" oninput="HZUI.setEm('maxH',Math.max(0,Math.min(12,+this.value||0)))"></label>
   <div class="text-sm sm:col-span-2"><div class="font-semibold mb-1">Docentes que no vienen (sus clases se dejan sin dictar)</div><div class="flex flex-wrap gap-3">${S.docentes.map(d=>`<label class="flex items-center hz-gap1"><input type="checkbox" ${E1.ausentes.includes(d.id)?'checked':''} onchange="HZUI.setAus('${d.id}',this.checked)"> ${E(d.nombre)}</label>`).join('')||'<span class="text-xs text-slate-500">Aún no hay docentes cargados.</span>'}</div></div>
   <p class="text-xs text-slate-500 sm:col-span-2">El horario emergente se usa solo entre esas fechas. Al terminar, los docentes vuelven a ver el horario regular sin que hagas nada. Si recortas las horas por día, algunas clases quedarán sin ubicar: es normal.</p></div>`:''}`);
}
function vGen(){
  const E0=entrada(),total=E0.asignaciones.reduce((s,a)=>s+a.horas,0);
  const rev=S.rev?(S.rev.length?`<div class="space-y-2">${S.rev.map(p=>`<div class="border rounded-xl p-3 text-sm" style="border-color:#fca5a5"><div class="font-semibold">⚠️ ${E(p.problema)}</div><div class="text-xs text-slate-600">Causa: ${E(p.causa)}</div><div class="text-xs hz-emerald">Qué hacer: ${E(p.solucion)}</div></div>`).join('')}</div>`:'<p class="text-sm hz-emerald">✅ Todo en orden: no se detectaron problemas de antemano.</p>'):'';
  let res='';
  if(S.busy)res=card('<p class="text-sm">⏳ Armando el horario… un momento.</p>');
  else if(S.gen){
    const g=S.gen,falta=g.total-g.clases.length;
    res=`${card(`<h3 class="font-semibold hz-mb1">Resultado</h3>
      <p class="text-sm">Se ubicaron <b>${g.clases.length}</b> de <b>${g.total}</b> horas · puntuación <b>${g.puntuacion}</b>/100 · revisión independiente: ${g.errores.length?`<span style="color:#dc2626">${g.errores.length} problema(s)</span>`:'<span style="color:#059669">sin choques ni reglas rotas ✅</span>'}</p>
      ${g.conflictos.length?`<div class="mt-2 hz-sy1">${g.conflictos.slice(0,15).map(c=>`<div class="text-xs ${c.severidad==='critico'?'text-red-700':'hz-amber'}">• ${E(c.descripcion)}</div>`).join('')}${g.conflictos.length>15?`<div class="text-xs text-slate-500">… y ${g.conflictos.length-15} más</div>`:''}</div>`:''}
      <div class="flex flex-wrap gap-2 hz-end hz-mt3"><input id="hz_vn" class="${IN}" value="Horario ${new Date().toLocaleDateString('es-CO')}" maxlength="80" style="min-width:14rem">${btn('HZUI.guardar(0)','💾 Guardar como borrador')}${btn('HZUI.guardar(1)','📢 Guardar y publicar',BTN)}</div>
      ${falta?`<p class="text-xs hz-amber mt-2">Faltan ${falta} hora(s) por ubicar. Puedes ajustar restricciones o disponibilidad y volver a generar.</p>`:''}`)}${vGrid()}`;
  }
  return`<div class="space-y-4">${vOpc()}${card(`<h3 class="font-semibold hz-mb1">⚡ Generar el horario</h3><p class="text-sm text-slate-600">${S.grupos.length} grupos · ${S.docentes.length} docentes · ${S.asigns.length} asignaciones · ${total} horas por ubicar · ${S.restr.length} restricciones</p>
    <div class="flex flex-wrap gap-2 hz-mt3">${btn('HZUI.revisar()','🔍 Revisar antes de generar')}${btn('HZUI.generar()','⚡ Generar horario',BTN)}</div>${rev?`<div class="hz-mt3">${rev}</div>`:''}`)}${res}</div>`;
}
function vVers(){
  const l=S.vers.map(v=>`<tr class="border-t"><td class="py-1">${E(v.nombre)}<div class="text-xs text-slate-500">${v.tipo==='emergente'?'🚨 Emergente · '+fd(v.desde+'T12:00:00')+' → '+fd(v.hasta+'T12:00:00')+(v.motivo?' · '+E(v.motivo):''):'Regular'} · ${NIV[v.nivel||'colegio']}</div></td><td>${v.estado==='publicado'?'<b style="color:#059669">Publicado</b>':v.estado==='archivado'?'Archivado':'Borrador'}</td><td>${v.puntuacion==null?'—':v.puntuacion}</td><td>${fd(v.created_at)}</td><td><div class="flex hz-gap1 flex-wrap">${btn(`HZUI.verVersion('${v.id}')`,'Ver')}${v.estado!=='publicado'?btn(`HZUI.publicar('${v.id}')`,'Publicar','bg-emerald-600 text-white'):''}${v.estado!=='publicado'?btn(`HZUI.borrarVersion('${v.id}')`,'Borrar'):''}</div></td></tr>`).join('');
  return`<div class="space-y-4">${card(`<h3 class="font-semibold mb-2">🗂️ Horarios guardados</h3>${S.vers.length?`<div class="overflow-x-auto"><table class="w-full text-sm"><tr class="text-left text-slate-500"><th>Nombre</th><th>Estado</th><th>Puntos</th><th>Creado</th><th></th></tr>${l}</table></div>`:'<p class="text-sm text-slate-500">Todavía no has guardado ningún horario.</p>'}<p class="text-xs text-slate-500 mt-2">El horario <b>publicado</b> es el que ven los docentes. Al publicar uno nuevo, el anterior queda archivado.</p>`)}${S.verId?vGrid():''}</div>`;
}
function vHor(){
  if(!M.colegio_id)return card('<h2 class="text-xl font-bold">🗓 Horarios</h2><p class="text-sm text-red-600">Tu cuenta no tiene un colegio del catálogo. Escribe al administrador para vincularla.</p>');
  const nav=SEC.map(([k,l])=>`<button onclick="HZUI.sec('${k}')" class="px-3 py-2 rounded-lg text-sm whitespace-nowrap shadow-sm ${S.sec===k?'on':'bg-white'}">${l}</button>`).join('');
  const body=({archivo:vArchivo,jornada:vJornada,grupos:vGrupos,asigs:vAsigs,docs:vDocs,aulas:vAulas,asign:vAsign,restr:vRestr,gen:vGen,vers:vVers}[S.sec]||vJornada)();
  return`<div class="space-y-4">${card(`<h2 class="text-xl font-bold">🗓 Horarios del colegio</h2><p class="text-sm text-slate-600">${E(S.colegio)}</p><p class="text-xs text-slate-500 mt-1">Sigue los pasos en orden: arma la jornada, los grupos, las asignaturas, los docentes y las asignaciones; agrega restricciones si quieres; y genera el horario.</p>`)}<nav class="aic-tabs">${nav}</nav>${body}</div>`;
}
function vMi(){
  if(!M.colegio_id)return card('<h2 class="text-xl font-bold">🗓 Mi horario</h2><p class="text-sm text-slate-600">Tu cuenta no tiene un colegio del catálogo, así que no hay horario para mostrar.</p>');
  if(!S.pubOk)return card('<h2 class="text-xl font-bold">🗓 Mi horario</h2><p class="text-sm text-slate-600">Todavía no hay un horario publicado en tu colegio. Cuando el rector o el coordinador lo publique, aparecerá aquí.</p>');
  if(S.miDoc&&!S.iniMi){S.modo='docente';S.item=S.miDoc.id;S.iniMi=true}
  const aviso=S.miDoc?'':'<p class="text-xs mt-1" style="color:#b45309">Tu cuenta todavía no está vinculada a un docente del horario. Pídele al rector o coordinador que use "Traer docentes registrados". Mientras tanto puedes ver el horario de cualquier grupo.</p>';
  return`<div class="space-y-4">${card(`<h2 class="text-xl font-bold">🗓 Mi horario</h2><p class="text-sm text-slate-600">${E(S.colegio)}</p>${aviso}`)}${vGrid()}</div>`;
}


/* ---------- cargar todo desde un archivo (Excel, Word o PDF) ---------- */
async function libF(){await loadScript('horarios_archivo.js?v=1');return window.HZF}
async function leerArchivo(file){
  const ext=(String(file.name).split('.').pop()||'').toLowerCase(),F=await libF();
  if(file.size>10*1024*1024)throw new Error('El archivo pesa más de 10 MB. Sube uno más pequeño.');
  if(ext==='xlsx'||ext==='xls'||ext==='csv'){
    await loadScript(LIB.xlsx);
    const wb=ext==='csv'?XLSX.read(await file.text(),{type:'string'}):XLSX.read(await file.arrayBuffer(),{type:'array'});
    return wb.SheetNames.map(n=>({nombre:n,filas:XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:false,defval:''}).map(r=>r.map(x=>String(x).trim())).filter(r=>r.some(Boolean))}));
  }
  if(ext==='docx'){
    await loadScript(LIB.mammoth);
    const r=await mammoth.convertToHtml({arrayBuffer:await file.arrayBuffer()}),h=F.desdeHtml(r.value);
    return h.tablas.concat(F.tablasDeLineas(h.lineas));
  }
  if(ext==='pdf'){
    await loadScript(LIB.pdf);pdfjsLib.GlobalWorkerOptions.workerSrc=LIB.pdfw;
    const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;let lineas=[];
    for(let p=1;p<=pdf.numPages;p++){const tc=await(await pdf.getPage(p)).getTextContent();
      lineas=lineas.concat(F.lineasDeItems(tc.items.map(it=>({x:it.transform[4],y:it.transform[5],w:it.width||0,t:it.str}))))}
    if(!lineas.length)throw new Error('No encontré texto en el PDF. Si es un PDF escaneado (una foto), usa Excel o Word.');
    return F.tablasDeLineas(lineas);
  }
  if(ext==='doc')throw new Error('Los archivos .doc antiguos no se pueden leer. Ábrelo y guárdalo como .docx o como PDF.');
  throw new Error('Ese tipo de archivo no se puede leer. Sube un Excel (.xlsx), un Word (.docx) o un PDF.');
}
const ok2=(a,b)=>a&&a.length?a:b;
function gruposConocidos(){
  const m=new Map(S.grupos.map(g=>[g.grado+'|'+g.nombre,{grado:g.grado,nombre:g.nombre}]));
  S.imp.o.grupos.forEach((g,j)=>{if(S.imp.selGrp[j]&&!g.errores.length)m.set(g.grado+'|'+g.nombre,{grado:g.grado,nombre:g.nombre})});
  return[...m.values()];
}
const existeDoc=n=>S.docentes.find(d=>norm(d.nombre)===norm(n));
const existeAsig=n=>S.asigs.find(a=>norm(a.nombre)===norm(n));
function cuentaDe(d,usadosExt){
  const usados=usadosExt||new Set(S.docentes.map(x=>x.user_id).filter(Boolean));
  const c=(d.correo||'').toLowerCase();
  const r=S.regs.find(x=>c&&x.email&&String(x.email).toLowerCase()===c)||S.regs.find(x=>norm(x.full_name)===norm(d.nombre));
  return r&&!usados.has(r.id)?r:null;
}
function estAsign(i){
  const I=S.imp,a=I.o.asignaciones[i];
  if(a.errores.length)return{ok:false,err:true,t:a.errores.join(' · ')};
  if(!I.selAsign[i])return{ok:false,t:'No elegida'};
  const dk=norm(a.docente),ak=norm(a.asignatura);
  if(!(existeDoc(a.docente)||I.o.docentes.some((d,j)=>norm(d.nombre)===dk&&I.selDoc[j]&&!d.errores.length)))return{ok:false,t:'No se carga: el docente no está elegido'};
  if(!(existeAsig(a.asignatura)||I.o.asignaturas.some((x,j)=>norm(x.nombre)===ak&&I.selAsg[j]&&!x.errores.length)))return{ok:false,t:'No se carga: la asignatura no está elegida'};
  const gs=gruposConocidos().filter(g=>g.grado===a.grupo.grado&&(a.grupo.todos||g.nombre===a.grupo.nombre));
  if(!gs.length)return{ok:false,t:'No se carga: el grupo no existe o no está elegido'};
  const asg=existeAsig(a.asignatura);
  const rem=asg?gs.filter(g=>{const gg=S.grupos.find(x=>x.grado===g.grado&&x.nombre===g.nombre);return gg&&S.asigns.some(x=>x.grupo_id===gg.id&&x.asignatura_id===asg.id)}).length:0;
  return{ok:true,n:gs.length,t:(a.grupo.todos?gs.length+' grupos':'Se cargará')+(rem?' · reemplaza '+rem+' existente(s)':'')};
}
const cb=(on,fn,dis)=>`<input type="checkbox" ${on?'checked':''} ${dis?'disabled':''} onchange="${fn}">`;
const rr=()=>{const y=window.scrollY||0;render();if(window.scrollTo)window.scrollTo(0,y)};
function cuentaSel(arr,lista){return arr.filter((v,i)=>v&&!lista[i].errores.length).length}
function vArchivo(){
  const I=S.imp;
  const cab=card(`<h3 class="font-semibold mb-1">📎 Cargar todo desde un archivo</h3>
    <p class="text-sm text-slate-600">No tienes que escribir nada a mano: sube tu lista de docentes, grupos, asignaturas y asignaciones desde <b>Excel</b>, <b>Word</b> o <b>PDF</b>. Antes de guardar, verás lo que la página entendió y <b>podrás escoger qué docentes de la lista usar</b>.</p>
    <div class="flex flex-wrap gap-3 items-center hz-mt3"><a href="plantilla_horarios.xlsx" download class="px-3 py-2 rounded-lg text-sm bg-emerald-600 text-white">⬇️ Descargar la plantilla de Excel</a>
    <label class="px-3 py-2 rounded-lg text-sm bg-indigo-600 text-white" style="cursor:pointer">📤 Subir mi archivo<input id="hz_file" type="file" accept=".xlsx,.xls,.csv,.docx,.pdf" style="display:none" onchange="HZUI.leer(this)"></label></div>
    <p class="text-xs text-slate-500 hz-mt3">Lo más fácil: descarga la plantilla, llénala (tiene listas desplegables) y súbela. También puedes subir una lista que ya tengas en Word o PDF. Para PDF escaneados (fotos) usa Excel o Word.</p>`);
  const msg=S.impMsg?card(`<div class="text-sm">${S.impMsg}</div>`):'';
  if(!I)return`<div class="space-y-4">${cab}${msg}</div>`;
  const o=I.o,r=window.HZF.resumen(o);
  const lista=(n,l)=>n?`${n} ${l}`:'';
  const hall=[lista(r.docentes,'docentes'),lista(r.grupos,'grupos'),lista(r.asignaturas,'asignaturas'),lista(r.asignaciones,'asignaciones'),lista(r.jornada,'franjas de la jornada'),lista(r.noDisp,'filas de disponibilidad'),lista(r.restr,'restricciones')].filter(Boolean).join(' · ');
  const avisos=o.avisos.length?`<div class="text-xs hz-amber hz-mt3">${o.avisos.map(E).join('<br>')}</div>`:'';
  const head=card(`<h3 class="font-semibold mb-1">🔍 Esto fue lo que entendí de «${E(I.nombre)}»</h3><p class="text-sm">${E(hall)}</p>${avisos}<p class="text-xs text-slate-500 hz-mt3">Revisa cada lista y quita lo que no quieras. Nada se guarda hasta que pulses «Cargar lo elegido».</p>`);
  // docentes
  const nDoc=cuentaSel(I.selDoc,o.docentes);
  const fd=o.docentes.map((d,i)=>{const ya=existeDoc(d.nombre),ct=ya?null:cuentaDe(d),err=d.errores.length;
    const est=err?`<span style="color:#b91c1c">${E(d.errores.join(' · '))}</span>`:ya?'<span class="text-slate-500">Ya está en el horario</span>':ct?'<span class="hz-emerald">Nuevo · tiene cuenta (se vinculará)</span>':'Nuevo'+(d.origen==='asignaciones'?' <span class="text-xs text-slate-500">(solo aparece en las asignaciones)</span>':'');
    return`<tr class="border-t hz_fd" data-n="${E(norm(d.nombre))}" style="${I.filtro&&!norm(d.nombre).includes(window.HZF.norm(I.filtro))?'display:none':''}"><td class="py-1">${cb(I.selDoc[i]&&!err,`HZUI.selDoc(${i},this.checked)`,err||ya)}</td><td>${E(d.nombre)}</td><td class="text-xs">${E(d.correo||'')}</td><td class="text-xs">${est}${d.avisos.length?` <span class="hz-amber">${E(d.avisos.join(' · '))}</span>`:''}</td></tr>`}).join('');
  const cDoc=o.docentes.length?card(`<h3 class="font-semibold mb-1">👩‍🏫 Escoge los docentes que van a entrar al horario</h3><p class="text-xs text-slate-500 mb-2">Quita la marca a quien no deba entrar. <b id="hz_ndoc">${nDoc}</b> de ${o.docentes.filter(d=>!d.errores.length).length} elegidos.</p>
    <div class="flex flex-wrap gap-2 items-center hz-mb3">${btn("HZUI.todos('doc',true)",'Marcar todos')}${btn("HZUI.todos('doc',false)",'Quitar todos')}<input class="${IN}" placeholder="Buscar un docente…" value="${E(I.filtro||'')}" oninput="HZUI.filtrar(this.value)"></div>
    <div class="overflow-x-auto" style="max-height:26rem;overflow-y:auto"><table class="w-full text-sm"><tr class="text-left text-slate-500"><th></th><th>Nombre</th><th>Correo</th><th>Estado</th></tr>${fd}</table></div>`):'';
  // grupos
  const cGr=o.grupos.length?card(`<h3 class="font-semibold mb-1">🏫 Grupos (${cuentaSel(I.selGrp,o.grupos)} elegidos)</h3><div>${o.grupos.map((g,i)=>{const ya=g.grado!==null&&S.grupos.some(x=>x.grado===g.grado&&x.nombre===g.nombre);
    return`<label class="inline-block text-sm hz-mr1" style="margin-bottom:.25rem;padding:.15rem .5rem;border-radius:.5rem;background:${g.errores.length?'#fecaca':ya?'#e2e8f0':'#ecfdf5'}">${cb(I.selGrp[i]&&!g.errores.length,`HZUI.selGrp(${i},this.checked)`,g.errores.length||ya)} ${g.grado!==null?E(g.grado+'° '+g.nombre):E(g.nombre)}${g.errores.length?' ⚠️':''}${ya?' (ya está)':''}</label>`}).join('')}</div>${o.grupos.some(g=>g.errores.length)?`<p class="text-xs" style="color:#b91c1c">${E(o.grupos.filter(g=>g.errores.length).map(g=>g.errores[0]).join(' · '))}</p>`:''}`):'';
  // asignaturas
  const cAs=o.asignaturas.length?card(`<h3 class="font-semibold mb-1">📚 Asignaturas (${cuentaSel(I.selAsg,o.asignaturas)} elegidas)</h3><div class="overflow-x-auto"><table class="w-full text-sm"><tr class="text-left text-slate-500"><th></th><th>Asignatura</th><th>Área</th><th>Estado</th></tr>${o.asignaturas.map((a,i)=>{const ya=existeAsig(a.nombre);
    return`<tr class="border-t"><td class="py-1">${cb(I.selAsg[i]&&!a.errores.length,`HZUI.selAsg(${i},this.checked)`,a.errores.length||ya)}</td><td>${E(a.nombre)}</td><td>${E(a.area)}</td><td class="text-xs">${a.errores.length?`<span style="color:#b91c1c">${E(a.errores.join(' · '))}</span>`:ya?'Ya está':'Nueva'}${a.origen==='asignaciones'?' <span class="text-xs text-slate-500">(solo aparece en las asignaciones; revisa su área después)</span>':''}</td></tr>`}).join('')}</table></div>`):'';
  // asignaciones
  const est=o.asignaciones.map((a,i)=>estAsign(i)),nOk=est.filter(e=>e.ok).length,nErr=est.filter(e=>e.err).length;
  const cAn=o.asignaciones.length?card(`<h3 class="font-semibold mb-1">🔗 Asignaciones: <b>${nOk}</b> listas para cargar${nErr?` · <span style="color:#b91c1c">${nErr} con problemas</span>`:''}</h3>
    <div class="flex gap-2 hz-mb3">${btn("HZUI.todos('asign',true)",'Marcar todas')}${btn("HZUI.todos('asign',false)",'Quitar todas')}</div>
    <div class="overflow-x-auto" style="max-height:24rem;overflow-y:auto"><table class="w-full text-sm"><tr class="text-left text-slate-500"><th></th><th>Fila</th><th>Grupo</th><th>Asignatura</th><th>Docente</th><th>Horas</th><th>Estado</th></tr>${o.asignaciones.map((a,i)=>{const e=est[i];
    return`<tr class="border-t"><td class="py-1">${cb(I.selAsign[i]&&!a.errores.length,`HZUI.selAsign(${i},this.checked)`,a.errores.length)}</td><td class="text-xs">${a.fila||''}</td><td>${a.grupo?(a.grupo.todos?'Todos los '+a.grupo.grado+'°':E(a.grupo.grado+'° '+a.grupo.nombre)):'—'}</td><td>${E(a.asignatura)}</td><td>${E(a.docente)}</td><td>${a.horas==null?'—':a.horas}</td><td class="text-xs" style="color:${e.err?'#b91c1c':e.ok?'#047857':'#64748b'}">${E(e.t)}</td></tr>`}).join('')}</table></div>`):'';
  // jornada / disponibilidad / restricciones
  const cJo=o.jornada.length?card(`<h3 class="font-semibold mb-1">⏰ Jornada (${o.jornada.length} franjas)</h3><label class="text-sm flex items-center gap-1">${cb(I.selJornada,'HZUI.setSel("selJornada",this.checked)')} Cargar la jornada</label>${S.franjas.length?`<label class="text-sm flex items-center gap-1" style="color:#b45309">${cb(I.reemplazarJornada,'HZUI.setSel("reemplazarJornada",this.checked)')} Ya hay ${S.franjas.length} franjas: reemplazarlas (se borran sus clases guardadas y la disponibilidad)</label>`:''}<div class="text-xs text-slate-600 hz-mt3">${o.jornada.map(j=>E(j.nombre+(j.inicio?' '+j.inicio+'–'+(j.fin||''):'')+(j.es_clase?'':' (descanso)'))).join(' · ')}</div>`):'';
  const cNd=o.noDisp.length?card(`<h3 class="font-semibold mb-1">🗓 Disponibilidad de docentes (${o.noDisp.filter(x=>!x.errores.length).length} filas)</h3><label class="text-sm flex items-center gap-1">${cb(I.selNoDisp,'HZUI.setSel("selNoDisp",this.checked)')} Cargar los momentos en que cada docente no puede</label>${o.noDisp.filter(x=>x.errores.length).map(x=>`<div class="text-xs" style="color:#b91c1c">Fila ${x.fila}: ${E(x.errores.join(' · '))}</div>`).join('')}`):'';
  const cRe=o.restr.length?card(`<h3 class="font-semibold mb-1">📏 Restricciones (${o.restr.filter(x=>!x.errores.length).length})</h3>${o.restr.map((x,i)=>`<label class="text-sm flex items-center gap-1" style="margin-bottom:.25rem">${cb(I.selRestr[i]&&!x.errores.length,`HZUI.selRestr(${i},this.checked)`,x.errores.length)} ${x.errores.length?`<span style="color:#b91c1c">Fila ${x.fila}: ${E(x.errores.join(' · '))}</span>`:descRImp(x)}</label>`).join('')}`):'';
  const pie=card(`<div class="flex flex-wrap gap-2">${btn('HZUI.aplicar()','✅ Cargar lo elegido',BTN)}${btn('HZUI.cancelarImp()','Cancelar')}</div>`);
  return`<div class="space-y-4">${cab}${head}${cDoc}${cGr}${cAs}${cAn}${cJo}${cNd}${cRe}${pie}</div>`;
}
function descRImp(x){
  const amb=x.alcance==='colegio'?'en todo el colegio':x.alcance==='grado'?'en '+x.grado+'°':'en '+(x.grupo?x.grupo.grado+'° '+x.grupo.nombre:'un grupo');
  const q={solo_dias:'solo los días '+x.dias.map(d=>DN[d]).join(', '),nunca_dias:'nunca los días '+x.dias.map(d=>DN[d]).join(', '),solo_franjas:'solo en las horas n.º '+x.franjas.join(', '),nunca_franjas:'nunca en las horas n.º '+x.franjas.join(', '),max_por_dia:'máximo '+x.valor+' hora(s) por día',bloque_doble:'en bloques de 2 horas seguidas'}[x.tipo];
  return`${SOBRE[x.sobre]} <b>${E(x.objetivo)}</b> ${E(amb)}: ${E(q)} <span class="text-xs">(${x.fuerza})</span>`;
}
function preparar(tablas,nombre){
  const F=window.HZF,o=F.interpretar(tablas,{asignaturas:S.asigs.map(a=>a.nombre)}),r=F.resumen(o);
  if(!Object.values(r).some(n=>n>0))throw new Error('No encontré datos que pueda entender en «'+nombre+'». Descarga la plantilla de Excel, llénala y vuelve a subirla.');
  S.impMsg='';
  S.imp={nombre,o,selDoc:o.docentes.map(d=>!d.errores.length),selGrp:o.grupos.map(g=>!g.errores.length),selAsg:o.asignaturas.map(a=>!a.errores.length),
    selAsign:o.asignaciones.map(a=>!a.errores.length),selRestr:o.restr.map(x=>!x.errores.length),selJornada:true,reemplazarJornada:false,selNoDisp:true};
}

/* ---------- acciones ---------- */
const mut=async(fn)=>{await run(async()=>{await fn();cambio();await cargar();render()})};
function parseGrupo(s){const m=String(s).trim().match(/^(\d{1,2})\s*[°ºo\-.]?\s*([A-Za-z0-9]+)$/);return m?{grado:+m[1],nombre:m[2].toUpperCase()}:null}
window.HZUI={
  async load(t){await cargar();
    if(t==='mhor')await cargarPublicado();
    else if(t==='dhor'){await cargarRegs();if(!S.visto){S.visto=true;if(S.franjas.length||S.grupos.length||S.docentes.length)S.sec='gen'}}},
  preparar(tablas,nombre){preparar(tablas,nombre)},
  view(t){return t==='mhor'?vMi():vHor()},
  sec(k){S.sec=k;S.dispDoc='';render()},
  setModo(m){S.modo=m;S.item='';render()},
  setItem(i){S.item=i;render()},

  /* cargar desde archivo */
  leer(input){const f=input&&input.files&&input.files[0];if(!f)return;
    return run(async()=>{await cargarRegs();const tablas=await leerArchivo(f);preparar(tablas,f.name);if(input)input.value='';render()})},
  selDoc(i,on){S.imp.selDoc[i]=on;rr()},selGrp(i,on){S.imp.selGrp[i]=on;rr()},selAsg(i,on){S.imp.selAsg[i]=on;rr()},
  selAsign(i,on){S.imp.selAsign[i]=on;rr()},selRestr(i,on){S.imp.selRestr[i]=on;rr()},setSel(k,v){S.imp[k]=v;rr()},
  todos(t,on){const o=S.imp.o;if(t==='doc')S.imp.selDoc=o.docentes.map(d=>on&&!d.errores.length);if(t==='asign')S.imp.selAsign=o.asignaciones.map(a=>on&&!a.errores.length);rr()},
  filtrar(v){S.imp.filtro=v;const k=window.HZF.norm(v);document.querySelectorAll('.hz_fd').forEach(tr=>{tr.style.display=!k||String(tr.getAttribute('data-n')).includes(k)?'':'none'})},
  cancelarImp(){S.imp=null;rr()},
  aplicar(){return run(async()=>{
    const I=S.imp;if(!I)return;const o=I.o,c=M.colegio_id,inf=[],salt=[];
    if(I.selJornada&&o.jornada.length&&S.franjas.length&&I.reemplazarJornada&&!confirm('Vas a reemplazar la jornada actual. Se borrarán las clases guardadas en los horarios y la disponibilidad de los docentes. ¿Seguro?'))return;
    await cargar();await cargarRegs();
    // 1) jornada
    if(I.selJornada&&o.jornada.length){
      if(o.jornada.length>20)throw new Error('La jornada tiene más de 20 franjas.');
      if(S.franjas.length&&!I.reemplazarJornada)salt.push('La jornada no se cargó porque ya tienes una (marca "reemplazarla" si quieres cambiarla).');
      else{if(S.franjas.length)ok(await sb.from('hz_franjas').delete().eq('colegio_id',c));
        ok(await sb.from('hz_franjas').insert(o.jornada.map((j,i)=>({colegio_id:c,orden:i+1,nombre:j.nombre,inicio:j.inicio,fin:j.fin,es_clase:j.es_clase}))));inf.push(o.jornada.length+' franjas de la jornada')}
    }
    // 2) grupos
    const gs=o.grupos.filter((g,i)=>I.selGrp[i]&&!g.errores.length&&!S.grupos.some(x=>x.grado===g.grado&&x.nombre===g.nombre));
    if(gs.length){ok(await sb.from('hz_grupos').upsert(gs.map(g=>({colegio_id:c,grado:g.grado,nombre:g.nombre})),{onConflict:'colegio_id,grado,nombre',ignoreDuplicates:true}));inf.push(gs.length+' grupos')}
    // 3) asignaturas
    const as=o.asignaturas.filter((a,i)=>I.selAsg[i]&&!a.errores.length&&!existeAsig(a.nombre));
    if(as.length){ok(await sb.from('hz_asignaturas').insert(as.map(a=>({colegio_id:c,nombre:a.nombre,area:a.area||a.nombre,aula_tipo:a.aula_tipo||null}))));inf.push(as.length+' asignaturas')}
    // 4) docentes (y vínculo con su cuenta si ya están registrados)
    const usados=new Set(S.docentes.map(x=>x.user_id).filter(Boolean)),nuevos=[],vincular=[];let conCuenta=0;
    o.docentes.forEach((d,i)=>{if(!I.selDoc[i]||d.errores.length)return;const ex=existeDoc(d.nombre),r=(ex&&ex.user_id)?null:cuentaDe(d,usados);
      if(r)usados.add(r.id);
      if(ex){if(r)vincular.push({id:ex.id,user_id:r.id})}else{nuevos.push({colegio_id:c,nombre:d.nombre,user_id:r?r.id:null});if(r)conCuenta++}});
    if(nuevos.length)ok(await sb.from('hz_docentes').insert(nuevos));
    for(const v of vincular){ok(await sb.from('hz_docentes').update({user_id:v.user_id}).eq('id',v.id));conCuenta++}
    if(nuevos.length||vincular.length)inf.push(nuevos.length+' docentes nuevos'+(conCuenta?' ('+conCuenta+' con su cuenta vinculada)':''));
    await cargar();
    // 5) asignaciones
    const filas=new Map();let omit=0;
    o.asignaciones.forEach((a,i)=>{const e=estAsign(i);if(!e.ok){omit++;return}
      const d=existeDoc(a.docente),sa=existeAsig(a.asignatura);if(!d||!sa){omit++;return}
      S.grupos.filter(g=>g.grado===a.grupo.grado&&(a.grupo.todos||g.nombre===a.grupo.nombre)).forEach(g=>filas.set(g.id+'|'+sa.id,{colegio_id:c,grupo_id:g.id,asignatura_id:sa.id,docente_id:d.id,horas:a.horas}))});
    const lote=[...filas.values()];
    for(let k=0;k<lote.length;k+=400)ok(await sb.from('hz_asignaciones').upsert(lote.slice(k,k+400),{onConflict:'colegio_id,grupo_id,asignatura_id'}));
    if(lote.length)inf.push(lote.length+' asignaciones');
    if(omit)salt.push(omit+' asignación(es) no se cargaron (con problemas o con docente, asignatura o grupo no elegido).');
    // 6) disponibilidad
    const cl=S.franjas.filter(f=>f.es_clase).sort((a,b)=>a.orden-b.orden);
    if(I.selNoDisp&&o.noDisp.length){const m=new Map();
      for(const x of o.noDisp){if(x.errores.length)continue;const d=existeDoc(x.docente);if(!d){salt.push('Disponibilidad de «'+x.docente+'»: ese docente no está en el horario.');continue}
        const frs=x.horas[0]==='todas'?cl:x.horas.map(n=>cl[n-1]).filter(Boolean);
        if(!frs.length){salt.push('Disponibilidad de «'+x.docente+'»: esa hora no existe en la jornada (¿cargaste la jornada?).');continue}
        for(const dia of x.dias)for(const f of frs)m.set(d.id+'|'+dia+'|'+f.id,{colegio_id:c,docente_id:d.id,dia,franja_id:f.id})}
      const r=[...m.values()];if(r.length){ok(await sb.from('hz_no_disponible').upsert(r,{onConflict:'docente_id,dia,franja_id',ignoreDuplicates:true}));inf.push(r.length+' momentos de no disponibilidad')}}
    // 7) restricciones
    const sig=r=>JSON.stringify([r.sobre,r.objetivo,r.alcance,r.grado||null,r.grupo_id||null,r.tipo,r.dias||[],r.franjas||[],r.valor||null,r.fuerza]);
    const ya=new Set(S.restr.map(sig)),rr2=[];
    o.restr.forEach((x,i)=>{if(!I.selRestr[i]||x.errores.length)return;
      let obj=x.objetivo;
      if(x.sobre==='asignatura'){const a=existeAsig(x.objetivo);if(!a){salt.push('Restricción sobre «'+x.objetivo+'»: esa asignatura no está cargada.');return}obj=a.id}
      if(x.sobre==='docente'){const d=existeDoc(x.objetivo);if(!d){salt.push('Restricción sobre «'+x.objetivo+'»: ese docente no está cargado.');return}obj=d.id}
      let gid=null;if(x.alcance==='grupo'){const g=S.grupos.find(y=>y.grado===x.grupo.grado&&y.nombre===x.grupo.nombre);if(!g){salt.push('Restricción: el grupo '+x.grupo.grado+'°'+x.grupo.nombre+' no existe.');return}gid=g.id}
      let frs=x.franjas;if(frs.length){frs=x.franjas.map(n=>cl[n-1]&&cl[n-1].orden).filter(v=>v!=null);if(!frs.length){salt.push('Restricción: la hora indicada no existe en la jornada.');return}}
      const row={colegio_id:c,alcance:x.alcance,grado:x.alcance==='grado'?x.grado:null,grupo_id:gid,sobre:x.sobre,objetivo:obj,tipo:x.tipo,dias:x.dias,franjas:frs,valor:x.valor,fuerza:x.fuerza,nota:x.nota};
      const k=sig(row);if(ya.has(k))return;ya.add(k);rr2.push(row)});
    if(rr2.length){ok(await sb.from('hz_restricciones').insert(rr2));inf.push(rr2.length+' restricciones')}
    await cargar();cambio();S.imp=null;
    S.impMsg=`<b style="color:#059669">✅ Listo. Se cargó:</b><br>${inf.length?inf.map(E).join('<br>'):'nada nuevo (todo ya estaba cargado)'}${salt.length?`<br><br><b style="color:#b45309">Quedó sin cargar:</b><br>${salt.slice(0,15).map(E).join('<br>')}`:''}<br><br>Siguiente paso: revisa las pestañas (Docentes, Asignaciones…) o ve directo a <b>Generar</b>.`;
    render()})},
  /* jornada */
  toggleDia(d,on){return run(async()=>{let ds=S.dias.filter(x=>x!==d);if(on)ds.push(d);ds.sort();
    if(!ds.length){toast('⚠️','Falta un día','Debe haber al menos un día de clase.');return render()}
    ok(await sb.from('hz_config').upsert({colegio_id:M.colegio_id,dias:ds,updated_at:new Date().toISOString()},{onConflict:'colegio_id'}));S.dias=ds;cambio();render()})},
  addFranja(){return mut(async()=>{const nombre=val('hz_fnom');if(!nombre)throw new Error('Escribe el nombre de la franja.');
    const orden=S.franjas.reduce((m,f)=>Math.max(m,f.orden),0)+1;if(orden>20)throw new Error('Máximo 20 franjas.');
    ok(await sb.from('hz_franjas').insert({colegio_id:M.colegio_id,orden,nombre,inicio:val('hz_fini')||null,fin:val('hz_ffin')||null,es_clase:chk('hz_fcl')}))})},
  jornadaEjemplo(){return mut(async()=>{const J=[['1ª hora','06:30','07:20',true],['2ª hora','07:20','08:10',true],['3ª hora','08:10','09:00',true],['Descanso','09:00','09:30',false],['4ª hora','09:30','10:20',true],['5ª hora','10:20','11:10',true],['6ª hora','11:10','12:00',true]];
    ok(await sb.from('hz_franjas').insert(J.map((j,i)=>({colegio_id:M.colegio_id,orden:i+1,nombre:j[0],inicio:j[1],fin:j[2],es_clase:j[3]}))))})},
  delFranja(id){if(!confirm('¿Quitar esta franja? También se quitarán sus clases de los horarios guardados.'))return;return mut(async()=>{ok(await sb.from('hz_franjas').delete().eq('id',id))})},
  /* grupos */
  crearGrupos(){return mut(async()=>{const d=+val('hz_gd'),h=+val('hz_gh'),ls=val('hz_gl').split(/[,;\s]+/).filter(Boolean).map(s=>s.toUpperCase().slice(0,20));
    if(h<d)throw new Error('El grado final debe ser mayor o igual al inicial.');if(!ls.length)throw new Error('Escribe al menos una letra o número de grupo.');
    const rows=[];for(let g=d;g<=h;g++)for(const l of ls)rows.push({colegio_id:M.colegio_id,grado:g,nombre:l});
    ok(await sb.from('hz_grupos').upsert(rows,{onConflict:'colegio_id,grado,nombre',ignoreDuplicates:true}))})},
  delGrupo(id){if(!confirm('¿Quitar este grupo? También se quitarán sus asignaciones y clases.'))return;return mut(async()=>{ok(await sb.from('hz_grupos').delete().eq('id',id))})},
  /* asignaturas */
  addAsig(){return mut(async()=>{const nombre=val('hz_anom');if(nombre.length<2)throw new Error('Escribe el nombre de la asignatura.');
    ok(await sb.from('hz_asignaturas').insert({colegio_id:M.colegio_id,nombre,area:val('hz_aare')||nombre,aula_tipo:val('hz_atip')||null}))})},
  cargarCatalogo(){return mut(async()=>{const r=ok(await sb.from('asignaturas').select('nombre,areas(nombre)'));
    const ya=new Set(S.asigs.map(a=>norm(a.nombre)));
    const rows=r.filter(x=>!ya.has(norm(x.nombre))).map(x=>({colegio_id:M.colegio_id,nombre:x.nombre,area:(x.areas&&x.areas.nombre)||x.nombre}));
    if(!rows.length){toast('ℹ️','Sin cambios','Ya tienes todas las asignaturas del catálogo.');return}
    ok(await sb.from('hz_asignaturas').insert(rows));toast('✅','Listo',rows.length+' asignatura(s) cargadas.')})},
  delAsig(id){if(!confirm('¿Quitar esta asignatura? También se quitarán sus asignaciones.'))return;return mut(async()=>{ok(await sb.from('hz_asignaturas').delete().eq('id',id))})},
  /* docentes */
  addDoc(){return mut(async()=>{const nombre=val('hz_dnom');if(nombre.length<3)throw new Error('Escribe el nombre del docente.');ok(await sb.from('hz_docentes').insert({colegio_id:M.colegio_id,nombre}))})},
  traerDocentes(){return mut(async()=>{const r=ok(await sb.from('profiles').select('id,full_name').eq('role','prof').eq('colegio_id',M.colegio_id).eq('teacher_status','aprobado'));
    const ya=new Set(S.docentes.map(d=>d.user_id).filter(Boolean));
    const rows=r.filter(p=>!ya.has(p.id)&&String(p.full_name||'').length>=3).map(p=>({colegio_id:M.colegio_id,nombre:p.full_name,user_id:p.id}));
    if(!rows.length){toast('ℹ️','Sin cambios','No hay docentes registrados nuevos para traer.');return}
    ok(await sb.from('hz_docentes').insert(rows));toast('✅','Listo',rows.length+' docente(s) traídos.')})},
  delDoc(id){if(!confirm('¿Quitar este docente? También se quitarán sus asignaciones.'))return;return mut(async()=>{ok(await sb.from('hz_docentes').delete().eq('id',id));if(S.dispDoc===id)S.dispDoc=''})},
  abrirDisp(id){S.dispDoc=id;render()},cerrarDisp(){S.dispDoc='';render()},
  toggleND(did,dia,fid){return run(async()=>{const i=S.nd.findIndex(n=>n.docente_id===did&&n.dia===dia&&n.franja_id===fid);
    if(i>=0){ok(await sb.from('hz_no_disponible').delete().eq('docente_id',did).eq('dia',dia).eq('franja_id',fid));S.nd.splice(i,1)}
    else{ok(await sb.from('hz_no_disponible').insert({colegio_id:M.colegio_id,docente_id:did,dia,franja_id:fid}));S.nd.push({colegio_id:M.colegio_id,docente_id:did,dia,franja_id:fid})}
    cambio();render()})},
  /* aulas */
  addAula(){return mut(async()=>{const nombre=val('hz_unom');if(!nombre)throw new Error('Escribe el nombre del aula.');ok(await sb.from('hz_aulas').insert({colegio_id:M.colegio_id,nombre,tipo:val('hz_utip')||'general'}))})},
  delAula(id){if(!confirm('¿Quitar esta aula?'))return;return mut(async()=>{ok(await sb.from('hz_aulas').delete().eq('id',id))})},
  /* asignaciones */
  addAsign(){return mut(async()=>{const g=val('hz_ag'),a=val('hz_aa'),d=val('hz_ad'),h=Math.round(+val('hz_ah'));
    if(!g||!a||!d)throw new Error('Primero crea los grupos, las asignaturas y los docentes.');if(!(h>=1&&h<=20))throw new Error('Las horas deben estar entre 1 y 20.');
    const gs=g.startsWith('grado:')?S.grupos.filter(x=>x.grado===+g.slice(6)):S.grupos.filter(x=>x.id===g.slice(2));
    ok(await sb.from('hz_asignaciones').upsert(gs.map(x=>({colegio_id:M.colegio_id,grupo_id:x.id,asignatura_id:a,docente_id:d,horas:h})),{onConflict:'colegio_id,grupo_id,asignatura_id'}))})},
  delAsign(id){return mut(async()=>{ok(await sb.from('hz_asignaciones').delete().eq('id',id))})},
  pegar(){return mut(async()=>{S.pegarMsg='';const lines=val('hz_paste').split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
    if(!lines.length)throw new Error('Pega al menos una línea.');if(lines.length>600)throw new Error('Máximo 600 líneas por vez.');
    const crear=chk('hz_pcrear'),errores=[],filas=[];
    lines.forEach((l,i)=>{const sep=l.includes('\t')?'\t':l.includes(';')?';':',';const c=l.split(sep).map(x=>x.trim());
      const gr=parseGrupo(c[0]),h=Math.round(+c[3]);
      if(c.length<4||!gr)return errores.push(`Línea ${i+1}: formato no válido (Grupo; Asignatura; Docente; Horas).`);
      if(!(h>=1&&h<=20))return errores.push(`Línea ${i+1}: las horas deben estar entre 1 y 20.`);
      if(c[1].length<2||c[2].length<3)return errores.push(`Línea ${i+1}: falta la asignatura o el docente.`);
      filas.push({gr,asig:c[1],doc:c[2],horas:h,ln:i+1})});
    const mapG=new Map(S.grupos.map(g=>[g.grado+'|'+g.nombre.toUpperCase(),g.id]));
    const mapA=new Map(S.asigs.map(a=>[norm(a.nombre),a.id])),mapD=new Map(S.docentes.map(d=>[norm(d.nombre),d.id]));
    const nuevasA=new Map(),nuevosD=new Map();
    for(const f of filas){
      if(!mapG.has(f.gr.grado+'|'+f.gr.nombre)){errores.push(`Línea ${f.ln}: el grupo ${f.gr.grado}°${f.gr.nombre} no existe (créalo en "Grupos").`);f.mal=1;continue}
      if(!mapA.has(norm(f.asig))){if(crear)nuevasA.set(norm(f.asig),f.asig);else{errores.push(`Línea ${f.ln}: la asignatura "${f.asig}" no existe.`);f.mal=1}}
      if(!mapD.has(norm(f.doc))){if(crear)nuevosD.set(norm(f.doc),f.doc);else{errores.push(`Línea ${f.ln}: el docente "${f.doc}" no existe.`);f.mal=1}}}
    if(nuevasA.size){const r=ok(await sb.from('hz_asignaturas').insert([...nuevasA.values()].map(n=>({colegio_id:M.colegio_id,nombre:n,area:n}))).select());r.forEach(a=>mapA.set(norm(a.nombre),a.id))}
    if(nuevosD.size){const r=ok(await sb.from('hz_docentes').insert([...nuevosD.values()].map(n=>({colegio_id:M.colegio_id,nombre:n}))).select());r.forEach(d=>mapD.set(norm(d.nombre),d.id))}
    const rows=new Map();
    filas.filter(f=>!f.mal).forEach(f=>{const g=mapG.get(f.gr.grado+'|'+f.gr.nombre),a=mapA.get(norm(f.asig)),d=mapD.get(norm(f.doc));rows.set(g+'|'+a,{colegio_id:M.colegio_id,grupo_id:g,asignatura_id:a,docente_id:d,horas:f.horas})});
    if(rows.size)ok(await sb.from('hz_asignaciones').upsert([...rows.values()],{onConflict:'colegio_id,grupo_id,asignatura_id'}));
    S.pegarMsg=`<div style="color:#059669">✅ ${rows.size} asignación(es) cargadas.${nuevasA.size?` Se crearon ${nuevasA.size} asignatura(s) nuevas (revisa su área en "Asignaturas").`:''}${nuevosD.size?` Se crearon ${nuevosD.size} docente(s) nuevos.`:''}</div>${errores.length?`<div style="color:#b91c1c">${errores.slice(0,12).map(E).join('<br>')}${errores.length>12?'<br>…':''}</div>`:''}`})},
  /* restricciones */
  cambiaSobre(){const s=val('hz_rs'),o=q('hz_ro');if(!o)return;
    const ops=s==='area'?[...new Set(S.asigs.map(a=>a.area))].sort().map(a=>[a,a]):s==='asignatura'?S.asigs.map(a=>[a.id,a.nombre]):S.docentes.map(d=>[d.id,d.nombre]);
    o.innerHTML=ops.map(([v,l])=>`<option value="${E(v)}">${E(l)}</option>`).join('')},
  cambiaAlcance(){const a=val('hz_ra');q('hz_rgw').style.display=a==='grado'?'':'none';q('hz_rpw').style.display=a==='grupo'?'':'none'},
  cambiaTipo(){const t=val('hz_rt');q('hz_rdw').style.display=(t==='solo_dias'||t==='nunca_dias')?'':'none';q('hz_rfw').style.display=(t==='solo_franjas'||t==='nunca_franjas')?'':'none';q('hz_rvw').style.display=t==='max_por_dia'?'':'none'},
  addRestr(){return mut(async()=>{const sobre=val('hz_rs'),objetivo=val('hz_ro'),alcance=val('hz_ra'),tipo=val('hz_rt');
    if(!objetivo)throw new Error('Elige a qué se aplica la regla (primero crea las asignaturas o los docentes).');
    const dias=[...document.querySelectorAll('.hz_d:checked')].map(e=>+e.value),franjas=[...document.querySelectorAll('.hz_f:checked')].map(e=>+e.value);
    if((tipo==='solo_dias'||tipo==='nunca_dias')&&!dias.length)throw new Error('Marca al menos un día.');
    if((tipo==='solo_franjas'||tipo==='nunca_franjas')&&!franjas.length)throw new Error('Marca al menos una hora del día.');
    if(alcance==='grado'&&!val('hz_rg'))throw new Error('Elige el grado.');if(alcance==='grupo'&&!val('hz_rp'))throw new Error('Elige el grupo.');
    ok(await sb.from('hz_restricciones').insert({colegio_id:M.colegio_id,alcance,grado:alcance==='grado'?+val('hz_rg'):null,grupo_id:alcance==='grupo'?val('hz_rp'):null,sobre,objetivo,tipo,
      dias:(tipo==='solo_dias'||tipo==='nunca_dias')?dias:[],franjas:(tipo==='solo_franjas'||tipo==='nunca_franjas')?franjas:[],valor:tipo==='max_por_dia'?Math.max(1,Math.round(+val('hz_rv')||1)):null,fuerza:val('hz_rf'),nota:val('hz_rn')||null}))})},
  delRestr(id){return mut(async()=>{ok(await sb.from('hz_restricciones').delete().eq('id',id))})},
  setNivel(v){S.nivel=v;cambio();render()},
  setTipo(v){S.tipoH=v;cambio();render()},
  setEm(k,v){S.em[k]=v;cambio();if(k==='maxH')render()},
  setAus(id,on){const a=S.em.ausentes;S.em.ausentes=on?[...new Set([...a,id])]:a.filter(x=>x!==id);cambio();render()},
  /* generar */
  async revisar(){return run(async()=>{const H=await engine();await cargarBase();S.rev=H.validarFactibilidad(entrada());render()})},
  async generar(){return run(async()=>{
    const H=await engine();await cargarBase();S.busy=true;S.gen=null;render();await new Promise(r=>setTimeout(r,30));
    try{const e=entrada(),g=H.generar(e,{maxMs:3000}),v=H.verificar(e,g.clases);
      S.rev=H.validarFactibilidad(e);
      S.gen={...g,errores:v.filter(x=>x.tipo!=='horas'),total:e.asignaciones.reduce((s,a)=>s+a.horas,0)};
      S.vw={clases:g.clases.map(c=>({asignacion_id:c.asignacion_id,dia:c.dia_semana,franja_id:c.franja_id,aula_id:c.aula_id})),titulo:'Horario generado (todavía sin guardar)'};
      S.modo='grupo';S.item='';S.verId=''}finally{S.busy=false}
    render()})},
  guardar(publicar){return run(async()=>{const g=S.gen;if(!g)return;
    if(g.errores.length&&!confirm('La revisión encontró problemas en este horario. ¿Guardarlo de todos modos?'))return;
    if(publicar&&g.clases.length<g.total&&!confirm('Faltan '+(g.total-g.clases.length)+' hora(s) por ubicar. ¿Publicar de todos modos?'))return;
    const nombre=val('hz_vn')||('Horario '+new Date().toLocaleDateString('es-CO'));
    const cx=ctxGen();
    if(cx.em&&(!S.em.desde||!S.em.hasta||S.em.hasta<S.em.desde))throw new Error('Para un horario emergente escribe la fecha de inicio y la de fin (el fin no puede ser antes del inicio).');
    let cl=g.clases.map(c=>({asignacion_id:c.asignacion_id,dia:c.dia_semana,franja_id:c.franja_id,aula_id:c.aula_id}));
    /* si es solo un nivel, se completa con el horario publicado de los demás grupos */
    if(S.nivel!=='colegio'){const ya=new Set(cl.map(c=>c.asignacion_id));
      S.base.forEach(c=>{const a=S.asigns.find(x=>x.id===c.asignacion_id);if(a&&!cx.gset.has(a.grupo_id)&&!cx.aus.has(a.docente_id)&&!ya.has(c.asignacion_id+'|'+c.dia+'|'+c.franja_id))cl.push({asignacion_id:c.asignacion_id,dia:c.dia,franja_id:c.franja_id,aula_id:c.aula_id})})}
    const r=await sb.rpc('hz_guardar_version',{p_colegio:M.colegio_id,p_nombre:nombre,p_puntuacion:g.puntuacion,p_resumen:{ubicadas:g.clases.length,total:g.total,conflictos:g.conflictos.slice(0,30).map(c=>c.descripcion)},p_clases:cl,
      p_tipo:cx.em?'emergente':'regular',p_nivel:S.nivel,p_desde:cx.em?S.em.desde:null,p_hasta:cx.em?S.em.hasta:null,p_motivo:cx.em?S.em.motivo:null});
    if(r.error)throw r.error;
    if(publicar){const p=await sb.rpc('hz_publicar',{p_version:r.data});if(p.error)throw p.error}
    toast('✅',publicar?'Horario publicado':'Horario guardado',publicar?(cx.em?'Los docentes verán el horario emergente entre las fechas indicadas.':'Los docentes ya pueden verlo en "Mi horario".'):'Quedó como borrador en "Versiones".');
    S.gen=null;S.sec='vers';await cargar();S.verId=r.data;S.vw={clases:cl,titulo:nombre};render()})},
  /* versiones */
  verVersion(id){return run(async()=>{const v=S.vers.find(x=>x.id===id);
    const cl=await todas(()=>sb.from('hz_clases').select('asignacion_id,dia,franja_id,aula_id').eq('version_id',id));
    S.vw={clases:cl,titulo:v?v.nombre:''};S.verId=id;S.modo='grupo';S.item='';render()})},
  publicar(id){if(!confirm('¿Publicar este horario? Los docentes verán este y el anterior quedará archivado.'))return;
    return run(async()=>{const p=await sb.rpc('hz_publicar',{p_version:id});if(p.error)throw p.error;toast('✅','Horario publicado','Los docentes ya pueden verlo en "Mi horario".');await cargar();render()})},
  borrarVersion(id){if(!confirm('¿Borrar este horario guardado?'))return;
    return run(async()=>{ok(await sb.from('hz_versiones').delete().eq('id',id));if(S.verId===id)S.verId='';await cargar();render()})},
  /* imprimir */
  print(todos){
    const nom={grupo:'Grupo',docente:'Docente',aula:'Aula'}[S.modo];
    const items=todos?opciones():opciones().filter(o=>o[0]===S.item);
    if(!items.length)return toast('ℹ️','Nada para imprimir','Todavía no hay datos.');
    const pag=items.map(([id,n])=>`<section style="page-break-after:always"><h2>${E(S.colegio)}</h2><h3>${E(S.vw.titulo)} · ${nom}: ${E(n)}</h3>${tabla(S.modo,id)}</section>`).join('');
    const w=window.open('','_blank');if(!w)return toast('⚠️','Ventana bloqueada','Permite las ventanas emergentes para poder imprimir.');
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Horario</title><style>body{font-family:Arial,sans-serif;margin:16px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:5px;vertical-align:top;font-size:12px}th{background:#eee}.text-xs{font-size:10px;color:#555}.font-semibold{font-weight:bold}h2,h3{margin:4px 0}</style></head><body>'+pag+'<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>');
    w.document.close()}
};
})();
