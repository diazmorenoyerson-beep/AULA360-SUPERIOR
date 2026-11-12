/* AulaICFES · horario.js
   Motor de horarios (portado de HorarioEdu y mejorado). JavaScript puro, sin dependencias.
   Se usa en el navegador (window.HZ) y en las pruebas de Node (module.exports).

   ENTRADA (objetos simples):
     dias:[1..6]  franjas:[{id,orden,es_clase}]  grupos:[{id,grado,nombre}]
     asignaturas:[{id,nombre,area,aula_tipo}]  docentes:[{id,nombre}]
     asignaciones:[{id,docente_id,grupo_id,asignatura_id,horas}]
     aulas:[{id,tipo,activa}]  (opcional: si no hay aulas, no se controla el aula)
     noDisponible:[{docente_id,dia,franja_id}]
     restricciones:[{id,alcance:'colegio'|'grado'|'grupo',grado,grupo_id,
                     sobre:'area'|'asignatura'|'docente',objetivo,
                     tipo:'solo_dias'|'nunca_dias'|'solo_franjas'|'nunca_franjas'|'max_por_dia'|'bloque_doble',
                     dias:[],franjas:[orden,...],valor,fuerza:'obligatoria'|'preferida'}]
*/
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();else root.HZ=factory();
})(typeof self!=='undefined'?self:this,function(){
'use strict';

const norm=s=>String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const sk=(dia,fi)=>dia+'|'+fi;
function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}}

/* ---------- Preparación ---------- */
function aplica(r,t){
  if(r.alcance==='grado'&&t.g.grado!==r.grado)return false;
  if(r.alcance==='grupo'&&t.g.id!==r.grupo_id)return false;
  if(r.sobre==='area')return norm(t.s.area)===norm(r.objetivo);
  if(r.sobre==='asignatura')return t.s.id===r.objetivo||norm(t.s.nombre)===norm(r.objetivo);
  if(r.sobre==='docente')return t.a.docente_id===r.objetivo;
  return false;
}
function prep(E){
  const dias=(E.dias&&E.dias.length?E.dias:[1,2,3,4,5]).slice().sort((a,b)=>a-b);
  const fr=(E.franjas||[]).filter(f=>f.es_clase!==false).slice().sort((a,b)=>a.orden-b.orden);
  const grp=new Map((E.grupos||[]).map(g=>[g.id,g]));
  const asg=new Map((E.asignaturas||[]).map(s=>[s.id,s]));
  const doc=new Map((E.docentes||[]).map(d=>[d.id,d]));
  const nd=new Map();
  (E.noDisponible||[]).forEach(x=>{if(!nd.has(x.docente_id))nd.set(x.docente_id,new Set());nd.get(x.docente_id).add(x.dia+'|'+x.franja_id)});
  const aulas=(E.aulas||[]).filter(a=>a.activa!==false);
  const rs=(E.restricciones||[]).map(r=>({...r,dias:r.dias||[],franjas:r.franjas||[],valor:+r.valor||0,hard:r.fuerza!=='preferida'}));
  const tasks=[];
  for(const a of (E.asignaciones||[])){
    const g=grp.get(a.grupo_id),s=asg.get(a.asignatura_id);
    if(!g||!s||!(a.horas>0))continue;
    const t={a,g,s,id:a.id,horas:a.horas,doc:a.docente_id,rs:[],max:[],slots:[],slotSet:new Set(),dbl:null};
    t.rs=rs.filter(r=>aplica(r,t));
    t.max=t.rs.filter(r=>r.tipo==='max_por_dia'&&r.valor>0);
    const bd=t.rs.filter(r=>r.tipo==='bloque_doble');
    if(bd.length)t.dbl={hard:bd.some(r=>r.hard)};
    const bloqueado=nd.get(t.doc);
    fr.forEach((f,fi)=>dias.forEach(dia=>{
      if(bloqueado&&bloqueado.has(dia+'|'+f.id))return;
      let soft=0,ok=true;
      for(const r of t.rs){
        let viol=false;
        if(r.tipo==='solo_dias')viol=!r.dias.includes(dia);
        else if(r.tipo==='nunca_dias')viol=r.dias.includes(dia);
        else if(r.tipo==='solo_franjas')viol=!r.franjas.includes(f.orden);
        else if(r.tipo==='nunca_franjas')viol=r.franjas.includes(f.orden);
        if(viol){if(r.hard){ok=false;break}soft++}
      }
      if(ok){t.slots.push({dia,fi,soft});t.slotSet.add(sk(dia,fi))}
    }));
    tasks.push(t);
  }
  const tipoOk=(au,t)=>!t.s.aula_tipo||au.tipo===t.s.aula_tipo;
  return{E,dias,fr,grp,asg,doc,nd,aulas,rs,tasks,tipoOk};
}

/* ---------- Estado de un intento ---------- */
function nuevoEstado(){return{docAt:new Map(),grpAt:new Map(),aulaAt:new Map(),cnt:new Map(),load:new Map(),pl:[],byTask:new Map(),aulaUso:new Map()}}
const sub=(m,k)=>{let v=m.get(k);if(!v){v=new Map();m.set(k,v)}return v};
function unidad(r,t){return r.sobre==='docente'?'d'+t.doc:'g'+t.g.id}

function aulaLibre(P,st,t,dia,fi){
  if(!P.aulas.length)return null;
  let mejor=false,uso=1e9;
  for(const au of P.aulas){
    if(!P.tipoOk(au,t))continue;
    const oc=st.aulaAt.get(au.id);
    if(oc&&oc.has(sk(dia,fi)))continue;
    const u=st.aulaUso.get(au.id)||0;
    if(u<uso){uso=u;mejor=au.id}
  }
  return mejor; // false si no hay aula compatible libre
}
function ponerP(st,P,t,dia,fi,aula,bloque,soft){
  const p={t,dia,fi,aula,bloque,soft};
  sub(st.docAt,t.doc).set(sk(dia,fi),p);
  sub(st.grpAt,t.g.id).set(sk(dia,fi),p);
  if(aula){let s=st.aulaAt.get(aula);if(!s){s=new Set();st.aulaAt.set(aula,s)}s.add(sk(dia,fi));st.aulaUso.set(aula,(st.aulaUso.get(aula)||0)+1)}
  for(const r of t.max){const k=r.id+'|'+unidad(r,t)+'|'+dia;st.cnt.set(k,(st.cnt.get(k)||0)+1)}
  const lk=t.g.id+'|'+dia;st.load.set(lk,(st.load.get(lk)||0)+1);
  const dk=t.doc+'|'+dia;st.load.set(dk,(st.load.get(dk)||0)+1);
  st.pl.push(p);
  let b=st.byTask.get(t.id);if(!b){b=[];st.byTask.set(t.id,b)}b.push(p);
  return p;
}
function quitarP(st,p){
  const t=p.t;
  st.docAt.get(t.doc).delete(sk(p.dia,p.fi));
  st.grpAt.get(t.g.id).delete(sk(p.dia,p.fi));
  if(p.aula){st.aulaAt.get(p.aula).delete(sk(p.dia,p.fi));st.aulaUso.set(p.aula,st.aulaUso.get(p.aula)-1)}
  for(const r of t.max){const k=r.id+'|'+unidad(r,t)+'|'+p.dia;st.cnt.set(k,st.cnt.get(k)-1)}
  st.load.set(t.g.id+'|'+p.dia,st.load.get(t.g.id+'|'+p.dia)-1);
  st.load.set(t.doc+'|'+p.dia,st.load.get(t.doc+'|'+p.dia)-1);
  st.pl.splice(st.pl.indexOf(p),1);
  const b=st.byTask.get(t.id);b.splice(b.indexOf(p),1);
}

/* ¿Se puede poner una hora (o un bloque de 2) en (dia,fi)? Devuelve {aula,soft} o null */
function evaluar(P,st,t,dia,fi,tam,ignorarMax){
  let soft=0;
  for(let k=0;k<tam;k++){
    const f=fi+k;
    if(!t.slotSet.has(sk(dia,f)))return null;
    if(st.docAt.get(t.doc)?.has(sk(dia,f)))return null;
    if(st.grpAt.get(t.g.id)?.has(sk(dia,f)))return null;
  }
  if(tam===2&&P.fr[fi+1].orden!==P.fr[fi].orden+1)return null;
  for(const r of t.max){
    const n=st.cnt.get(r.id+'|'+unidad(r,t)+'|'+dia)||0;
    if(n+tam>r.valor){if(r.hard&&!ignorarMax)return null;soft+=1}
  }
  const aulas=[];
  for(let k=0;k<tam;k++){
    const au=aulaLibre(P,st,t,dia,fi+k);
    if(au===false)return null;
    aulas.push(au);
  }
  for(let k=0;k<tam;k++){const s=t.slots.find(x=>x.dia===dia&&x.fi===fi+k);soft+=s?s.soft:0}
  return{aulas,soft};
}
function costo(P,st,t,dia,fi,tam,soft,usados,rnd){
  let c=soft*1000;
  if(usados.has(dia))c+=60;
  c+=(st.load.get(t.g.id+'|'+dia)||0)*3+(st.load.get(t.doc+'|'+dia)||0)*3;
  const gl=st.load.get(t.g.id+'|'+dia)||0;
  if(gl>0){const g=st.grpAt.get(t.g.id);const ady=g.has(sk(dia,fi-1))||g.has(sk(dia,fi+tam));if(!ady)c+=10}
  return c+fi*0.2+rnd()*6;
}
function candidatos(P,st,t,tam,rnd){
  const usados=new Set((st.byTask.get(t.id)||[]).map(p=>p.dia));
  const out=[];
  for(const s of t.slots){
    if(tam===2&&s.fi+1>=P.fr.length)continue;
    const ev=evaluar(P,st,t,s.dia,s.fi,tam);
    if(!ev)continue;
    out.push({dia:s.dia,fi:s.fi,ev,c:costo(P,st,t,s.dia,s.fi,tam,ev.soft,usados,rnd)});
  }
  out.sort((a,b)=>a.c-b.c);
  return out;
}
function colocar(P,st,t,c,tam){
  for(let k=0;k<tam;k++)ponerP(st,P,t,c.dia,c.fi+k,c.ev.aulas[k],tam===2,k===0?c.ev.soft:0);
}

/* Reubicación: libera una clase de otro y la mueve a otro espacio para poder poner esta hora */
function reubicar(P,st,t,rnd){
  const usados=new Set((st.byTask.get(t.id)||[]).map(p=>p.dia));
  const orden=t.slots.map(s=>({s,r:rnd()})).sort((a,b)=>a.r-b.r).slice(0,60);
  for(const {s} of orden){
    const bl=new Set();
    const pd=st.docAt.get(t.doc)?.get(sk(s.dia,s.fi)),pg=st.grpAt.get(t.g.id)?.get(sk(s.dia,s.fi));
    if(pd)bl.add(pd);if(pg)bl.add(pg);
    if(bl.size!==1)continue;
    const Q=[...bl][0];
    if(Q.bloque||Q.t===t)continue;
    const qt=Q.t,qdia=Q.dia,qfi=Q.fi,qaula=Q.aula,qsoft=Q.soft;
    quitarP(st,Q);
    const ev=evaluar(P,st,t,s.dia,s.fi,1);
    if(ev){
      ponerP(st,P,t,s.dia,s.fi,ev.aulas[0],false,ev.soft);
      const cs=candidatos(P,st,qt,1,rnd).filter(c=>!(c.dia===qdia&&c.fi===qfi));
      if(cs.length){colocar(P,st,qt,cs[0],1);return true}
      quitarP(st,st.byTask.get(t.id).find(p=>p.dia===s.dia&&p.fi===s.fi));
    }
    ponerP(st,P,qt,qdia,qfi,qaula,false,qsoft);
  }
  return false;
}

function intento(P,seed,i){
  const rnd=rng(seed),st=nuevoEstado();
  const orden=P.tasks.map(t=>({t,k:(t.slots.length/Math.max(1,t.horas))*(1+(i?rnd()*0.5:0))-(t.dbl&&t.dbl.hard?0.5:0)}))
    .sort((a,b)=>a.k-b.k||b.t.horas-a.t.horas).map(x=>x.t);
  for(const t of orden){
    let falta=t.horas;
    while(falta>0){
      const tam=(t.dbl&&falta>=2)?2:1;
      let cs=candidatos(P,st,t,tam,rnd);
      if(!cs.length&&tam===2&&!t.dbl.hard){cs=candidatos(P,st,t,1,rnd);if(cs.length){colocar(P,st,t,cs[0],1);falta-=1;continue}}
      if(cs.length){colocar(P,st,t,cs[0],tam);falta-=tam;continue}
      if(tam===1&&reubicar(P,st,t,rnd)){falta-=1;continue}
      break;
    }
  }
  let faltan=0,blando=0,spread=0;
  for(const t of P.tasks){
    const ps=st.byTask.get(t.id)||[];
    faltan+=t.horas-ps.length;
    const ideal=Math.min(t.horas,P.dias.length);
    spread+=ideal?Math.min(new Set(ps.map(p=>p.dia)).size/ideal,1):1;
  }
  for(const p of st.pl)blando+=p.soft;
  return{st,faltan,blando,spread:P.tasks.length?spread/P.tasks.length:1};
}
const mejor=(a,b)=>a.faltan!==b.faltan?a.faltan<b.faltan:a.blando!==b.blando?a.blando<b.blando:a.spread>b.spread;

function nombreGrupo(g){return g.grado+'° '+g.nombre}
function etiqueta(P,t){
  const d=P.doc.get(t.doc);
  return `${t.s.nombre} de ${nombreGrupo(t.g)} (${d?d.nombre:'docente'})`;
}

function generar(E,opt){
  opt=opt||{};
  const P=prep(E),maxIntentos=opt.intentos||40,maxMs=opt.maxMs||2500,t0=Date.now();
  let best=null;
  for(let i=0;i<maxIntentos;i++){
    const r=intento(P,(opt.semilla||1)*7919+i*104729,i);
    if(!best||mejor(r,best))best=r;
    if(best.faltan===0&&best.blando===0&&i>=2)break;
    if(Date.now()-t0>maxMs&&i>=2)break;
  }
  const clases=best.st.pl.map(p=>({asignacion_id:p.t.id,dia_semana:p.dia,franja_id:P.fr[p.fi].id,aula_id:p.aula||null}))
    .sort((a,b)=>a.dia_semana-b.dia_semana||P.fr.findIndex(f=>f.id===a.franja_id)-P.fr.findIndex(f=>f.id===b.franja_id));
  const conflictos=[];
  for(const t of P.tasks){
    const ps=best.st.byTask.get(t.id)||[],falta=t.horas-ps.length;
    if(falta>0){
      const causa=t.slots.length<t.horas
        ?`Por la disponibilidad del docente y las restricciones solo hay ${t.slots.length} espacio(s) posible(s) y se necesitan ${t.horas}.`
        :'Hay espacios permitidos, pero siempre chocan con otras clases del mismo docente o del mismo grupo.';
      conflictos.push({tipo:'horas_sin_ubicar',severidad:'critico',descripcion:`No se pudo ubicar ${falta} de ${t.horas} hora(s): ${etiqueta(P,t)}. ${causa}`,entidad_afectada:{asignacion_id:t.id}});
    }
  }
  if(best.blando>0)conflictos.push({tipo:'preferencias_incumplidas',severidad:'advertencia',descripcion:`Quedaron ${best.blando} preferencia(s) sin cumplir (restricciones marcadas como "preferida").`,entidad_afectada:{}});
  const total=P.tasks.reduce((s,t)=>s+t.horas,0),col=clases.length;
  const duro=total?col/total:1,blandoQ=best.spread*(1-Math.min(1,best.blando/Math.max(1,col)));
  return{clases,conflictos,puntuacion:Math.round((duro*80+blandoQ*20)*10)/10};
}

/* ---------- Revisión previa: ¿es posible el horario? Dice causa y solución ---------- */
function validarFactibilidad(E){
  const P=prep(E),out=[],nDias=P.dias.length,nFr=P.fr.length;
  const add=(problema,causa,solucion)=>out.push({problema,causa,solucion});
  if(!(E.asignaciones||[]).length)add('No hay ninguna asignación registrada.','Falta definir qué docente dicta qué asignatura a qué grupo.','Registra al menos una asignación antes de generar el horario.');
  if(!nFr)add('No hay franjas de clase.','Todas las franjas están marcadas como descanso o no existen.','Crea las franjas de la jornada y marca cuáles son de clase.');
  if(!nDias)add('No hay días de clase.','No se definieron los días de la semana.','Marca los días en los que hay clase.');
  const porDoc=new Map(),porGrp=new Map();
  for(const t of P.tasks){
    const d=P.doc.get(t.doc),dn=d?d.nombre:'Un docente';
    if(t.slots.length<t.horas)add(`${etiqueta(P,t)} necesita ${t.horas} hora(s) y solo tiene ${t.slots.length} espacio(s) posible(s).`,'La disponibilidad del docente y las restricciones de días o franjas dejan muy pocos espacios.','Amplía la disponibilidad de '+dn+', quita alguna restricción obligatoria, o reduce las horas de esa asignatura.');
    for(const r of t.max)if(r.hard&&t.horas>r.valor*nDias)add(`${etiqueta(P,t)} necesita ${t.horas} hora(s), pero la regla "máximo ${r.valor} por día" solo permite ${r.valor*nDias} a la semana.`,'El máximo por día es menor que lo necesario.','Sube el máximo por día o reduce las horas.');
    if(t.s.aula_tipo&&P.aulas.length&&!P.aulas.some(a=>a.tipo===t.s.aula_tipo))add(`${t.s.nombre} requiere un aula de tipo "${t.s.aula_tipo}" y no existe ninguna activa.`,'No hay aulas de ese tipo.','Crea un aula de ese tipo o cambia el tipo requerido de la asignatura.');
    porDoc.set(t.doc,(porDoc.get(t.doc)||[]).concat(t));
    porGrp.set(t.g.id,(porGrp.get(t.g.id)||[]).concat(t));
  }
  for(const [id,ts] of porDoc){
    const h=ts.reduce((s,t)=>s+t.horas,0),u=new Set();ts.forEach(t=>t.slots.forEach(s=>u.add(sk(s.dia,s.fi))));
    if(h>u.size)add(`${(P.doc.get(id)||{nombre:'Un docente'}).nombre} tiene ${h} hora(s) por dictar y solo ${u.size} espacio(s) posible(s).`,'Su disponibilidad es menor que la suma de sus horas.','Amplía su disponibilidad o reparte parte de su carga con otro docente.');
  }
  for(const [id,ts] of porGrp){
    const h=ts.reduce((s,t)=>s+t.horas,0),g=ts[0].g;
    if(h>nDias*nFr)add(`El grupo ${nombreGrupo(g)} necesita ${h} hora(s) semanales y la jornada solo tiene ${nDias*nFr}.`,'Las horas de las asignaturas superan los bloques de la jornada.','Reduce horas, agrega franjas de clase o agrega días.');
  }
  return out;
}

/* ---------- Verificador independiente: revisa cualquier horario ---------- */
function verificar(E,clases){
  const P=prep(E),v=[],fi=new Map(P.fr.map((f,i)=>[f.id,i])),tk=new Map(P.tasks.map(t=>[t.id,t]));
  const docs=new Map(),grps=new Map(),aus=new Map(),hs=new Map(),dia=new Map();
  const dup=(m,k,msg)=>{if(m.has(k))v.push({tipo:'choque',descripcion:msg});else m.set(k,1)};
  for(const c of clases){
    const t=tk.get(c.asignacion_id);
    if(!t){v.push({tipo:'dato',descripcion:'Clase de una asignación que no existe'});continue}
    const f=fi.get(c.franja_id);
    if(f===undefined){v.push({tipo:'franja',descripcion:'Clase en una franja que no es de clase: '+etiqueta(P,t)});continue}
    if(!P.dias.includes(c.dia_semana))v.push({tipo:'dia',descripcion:'Clase en un día sin clase: '+etiqueta(P,t)});
    const slot=c.dia_semana+'|'+f;
    dup(docs,t.doc+'#'+slot,'El docente tiene dos clases a la vez: '+etiqueta(P,t));
    dup(grps,t.g.id+'#'+slot,'El grupo tiene dos clases a la vez: '+etiqueta(P,t));
    if(c.aula_id)dup(aus,c.aula_id+'#'+slot,'El aula está ocupada dos veces: '+etiqueta(P,t));
    const nd=P.nd.get(t.doc);if(nd&&nd.has(c.dia_semana+'|'+c.franja_id))v.push({tipo:'disponibilidad',descripcion:'Clase cuando el docente no está disponible: '+etiqueta(P,t)});
    hs.set(t.id,(hs.get(t.id)||0)+1);
    for(const r of t.rs){
      if(!r.hard)continue;
      const fo=P.fr[f].orden;
      if((r.tipo==='solo_dias'&&!r.dias.includes(c.dia_semana))||(r.tipo==='nunca_dias'&&r.dias.includes(c.dia_semana))||
         (r.tipo==='solo_franjas'&&!r.franjas.includes(fo))||(r.tipo==='nunca_franjas'&&r.franjas.includes(fo)))
        v.push({tipo:'restriccion',descripcion:`Se incumple una restricción (${r.tipo}) en ${etiqueta(P,t)}`});
    }
    for(const r of t.max){const k=r.id+'|'+unidad(r,t)+'|'+c.dia_semana;dia.set(k,(dia.get(k)||0)+1);if(r.hard&&dia.get(k)===r.valor+1)v.push({tipo:'restriccion',descripcion:`Más de ${r.valor} hora(s) en un día: ${etiqueta(P,t)}`})}
  }
  for(const t of P.tasks){const n=hs.get(t.id)||0;if(n!==t.horas)v.push({tipo:'horas',descripcion:`${etiqueta(P,t)}: tiene ${n} de ${t.horas} hora(s)`,faltan:t.horas-n})}
  // bloque doble obligatorio: las horas pares deben quedar en parejas consecutivas
  for(const t of P.tasks){
    if(!(t.dbl&&t.dbl.hard))continue;
    const ps=clases.filter(c=>c.asignacion_id===t.id).map(c=>({d:c.dia_semana,f:fi.get(c.franja_id)}));
    const porDia=new Map();ps.forEach(p=>{if(!porDia.has(p.d))porDia.set(p.d,[]);porDia.get(p.d).push(p.f)});
    let sueltas=0;
    for(const fs of porDia.values()){fs.sort((a,b)=>a-b);for(let i=0;i<fs.length;){if(i+1<fs.length&&P.fr[fs[i+1]].orden===P.fr[fs[i]].orden+1)i+=2;else{sueltas++;i++}}}
    if(sueltas>(t.horas%2))v.push({tipo:'restriccion',descripcion:`Debía ir en bloques de 2 horas seguidas: ${etiqueta(P,t)}`});
  }
  return v;
}

return{generar,validarFactibilidad,verificar,prep,norm};
});
