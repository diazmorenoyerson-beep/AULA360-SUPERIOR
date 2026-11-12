/* AulaICFES · horarios_archivo.js
   Lee los datos del horario desde Excel, Word o PDF. Esta parte NO toca la base de datos: solo interpreta
   lo que viene en el archivo y entrega listas ordenadas, con errores y avisos por fila.
   Funciona en el navegador (window.HZF) y en Node (para las pruebas). */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();else root.HZF=factory();
})(typeof self!=='undefined'?self:this,function(){
'use strict';

const norm=s=>String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const limpia=s=>String(s==null?'':s).replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const titulo=s=>limpia(s).split(' ').map(w=>w?w[0].toUpperCase()+w.slice(1).toLowerCase():w).join(' ');
const PALABRA_GRADO={primero:1,segundo:2,tercero:3,cuarto:4,quinto:5,sexto:6,septimo:7,octavo:8,noveno:9,decimo:10,undecimo:11,once:11,transicion:0,preescolar:0};
const DIAS=[['lun',1],['mar',2],['mie',3],['jue',4],['vie',5],['sab',6]];

/* ---------- piezas básicas ---------- */
function parseGrado(txt){
  const n=norm(txt);if(!n)return null;
  if(PALABRA_GRADO[n]!==undefined)return PALABRA_GRADO[n];
  const m=n.match(/^(\d{1,2})(?: grado)?$/);if(m&&+m[1]>=0&&+m[1]<=11)return +m[1];
  return null;
}
/* "6A" "6°A" "6-A" "6 A" "Sexto A" "601" -> {grado,nombre} */
function parseGrupo(txt){
  const t=limpia(txt);if(!t)return null;
  let m=t.match(/^(\d{1,2})\s*[°º.\-/ ]?\s*([A-Za-zÁ-úñÑ]{1,3}|\d{1,2})$/);
  if(m&&+m[1]<=11)return{grado:+m[1],nombre:m[2].toUpperCase()};
  m=t.match(/^(\d{1,2})(\d{2})$/);                         // 601, 1102: grado + grupo de dos cifras
  if(m&&+m[1]>=0&&+m[1]<=11)return{grado:+m[1],nombre:m[2]};
  const p=norm(t).split(' ');
  if(p.length===2&&PALABRA_GRADO[p[0]]!==undefined&&/^[a-z0-9]{1,3}$/.test(p[1]))return{grado:PALABRA_GRADO[p[0]],nombre:p[1].toUpperCase()};
  return null;
}
/* "9", "9°", "Todos los 9", "Todos los grupos de 9°", "Noveno" -> grado (para "todos los grupos del grado") */
function soloGrado(txt){
  const n=norm(txt).replace(/^todos( los)?( grupos| cursos)?( de| del)?( grado)? ?/,'').trim();
  return parseGrado(n);
}
function parseDias(txt){
  const n=norm(txt);if(!n)return[];
  if(/\btodos\b/.test(n))return[1,2,3,4,5];
  const out=new Set();
  const rg=n.match(/\b(lun|mar|mie|jue|vie|sab)\w*\s+(?:a|hasta)\s+(lun|mar|mie|jue|vie|sab)\w*/);
  if(rg){const a=DIAS.find(d=>d[0]===rg[1])[1],b=DIAS.find(d=>d[0]===rg[2])[1];for(let i=Math.min(a,b);i<=Math.max(a,b);i++)out.add(i)}
  for(const w of n.split(' ')){const d=DIAS.find(x=>w.startsWith(x[0]));if(d)out.add(d[1])}
  if(!out.size){for(const w of String(txt).toLowerCase().split(/[\s,;/y-]+/)){if(w==='l')out.add(1);else if(w==='m')out.add(2);else if(w==='x'||w==='mi')out.add(3);else if(w==='j')out.add(4);else if(w==='v')out.add(5);else if(w==='s')out.add(6)}}
  return[...out].sort((a,b)=>a-b);
}
function parseNums(txt){
  const out=new Set(),t=String(txt==null?'':txt);
  for(const m of t.matchAll(/(\d{1,2})\s*(?:-|a|hasta)\s*(\d{1,2})/g)){for(let i=+m[1];i<=+m[2]&&i<=30;i++)out.add(i)}
  for(const m of t.matchAll(/\d{1,2}/g))out.add(+m[0]);
  return[...out].sort((a,b)=>a-b);
}
function parseHora(txt){
  const t=limpia(txt).toLowerCase();if(!t)return null;
  if(/^0?\.\d+$|^0$/.test(t)){const f=parseFloat(t),mm=Math.round(f*1440);return String(Math.floor(mm/60)).padStart(2,'0')+':'+String(mm%60).padStart(2,'0')}
  const m=t.match(/^(\d{1,2})[:.h](\d{2})(?::\d{2})?\s*(a\.?\s?m\.?|p\.?\s?m\.?)?$/);
  if(!m)return null;
  let h=+m[1];const mi=+m[2],ap=(m[3]||'').replace(/[^ap]/g,'');
  if(ap==='p'&&h<12)h+=12;if(ap==='a'&&h===12)h=0;
  if(h>23||mi>59)return null;
  return String(h).padStart(2,'0')+':'+String(mi).padStart(2,'0');
}
const esDescanso=t=>/descanso|recreo|almuerzo|break|receso/.test(norm(t));
const partir=l=>String(l==null?'':l).split(/\t|;|\||\s{2,}/).map(limpia).filter(Boolean);
const entero=t=>{const s=limpia(t);return/^\d{1,2}([.,]0+)?$/.test(s)?parseInt(s,10):null};

/* ---------- tipo de tabla ---------- */
function tipoPorNombre(nombre){
  const n=norm(nombre);if(!n)return null;
  if(/instruccion|lee ?me|ayuda|ejemplo|portada/.test(n))return'ignorar';
  if(/no disponib|disponibilidad|restriccion(es)? de docente/.test(n))return'nodisp';
  if(/asignacion|carga|distribucion|intensidad/.test(n))return'asign';
  if(/restriccion|regla/.test(n))return'restr';
  if(/jornada|franja|horas de clase|horario base/.test(n))return'jornada';
  if(/asignatura|materia/.test(n))return'asignaturas';
  if(/docente|profesor|maestro/.test(n))return'docentes';
  if(/grupo|curso/.test(n))return'grupos';
  return null;
}
function tipoPorEncabezado(h){
  const j=h.join(' '),has=re=>re.test(j);
  if(has(/\bregla\b/))return'restr';
  if(has(/docente|profesor/)&&has(/\bdia\b/)&&!has(/asignatura|materia/))return'nodisp';
  if(has(/docente|profesor/)&&has(/asignatura|materia/)&&has(/hora|intensidad/))return'asign';
  if(has(/\binicio\b|\bfin\b|\bhasta\b/)&&has(/nombre|hora|franja|n/)&&!has(/docente|asignatura|grupo/))return'jornada';
  if(has(/asignatura|materia/)&&!has(/docente|profesor|grupo/))return'asignaturas';
  if(has(/\bgrado\b|\bgrupo\b|\bcurso\b/)&&!has(/docente|profesor|asignatura|materia/))return'grupos';
  if(has(/docente|profesor|nombre/)&&!has(/asignatura|materia|grupo|grado|inicio/))return'docentes';
  return null;
}
const SECCION_RE=/^(docentes?|profesores?|listado de docentes|lista de docentes|grupos?|cursos?|asignaturas?|materias?|jornada|franjas?|asignaciones|carga academica|no disponible|disponibilidad|restricciones|reglas)$/;
function tipoDeTitulo(linea){
  const n=norm(linea);if(!n||n.split(' ').length>5||/\d/.test(n))return null;
  const base=n.replace(/^(listado|lista|relacion|cuadro|tabla|planilla)( de| del| de los| de las)?\s*/,'').replace(/^(los|las|el|la)\s+/,'');
  return SECCION_RE.test(base)?tipoPorNombre(base):null;
}

/* ---------- lectores de formato (puros) ---------- */
const ENT={'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'",'&nbsp;':' ','&apos;':"'"};
const sinEtiquetas=s=>limpia(String(s).replace(/<br\s*\/?>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&(amp|lt|gt|quot|#39|nbsp|apos);/g,m=>ENT[m]));
/* HTML de Word (mammoth) -> {tablas, lineas} */
function desdeHtml(html){
  const tablas=[],tbl=/<table[\s\S]*?<\/table>/gi;
  for(const t of String(html).match(tbl)||[]){
    const filas=[];for(const r of t.match(/<tr[\s\S]*?<\/tr>/gi)||[]){const c=(r.match(/<t[dh][\s\S]*?<\/t[dh]>/gi)||[]).map(sinEtiquetas);if(c.some(x=>x))filas.push(c)}
    if(filas.length)tablas.push({nombre:'',filas});
  }
  const fuera=String(html).replace(tbl,'\n').split(/<\/(?:p|li|h\d)>|\n/i).map(sinEtiquetas).filter(Boolean);
  return{tablas,lineas:fuera};
}
/* Elementos de texto de un PDF [{x,y,w,t}] -> líneas con tabulador donde hay una separación de columna */
function lineasDeItems(items){
  const filas=new Map();
  for(const it of items){if(!limpia(it.t))continue;const k=Math.round(it.y/3);if(!filas.has(k))filas.set(k,[]);filas.get(k).push(it)}
  return[...filas.keys()].sort((a,b)=>b-a).map(k=>{
    const r=filas.get(k).sort((a,b)=>a.x-b.x);let s='',fin=null;
    for(const it of r){const gap=fin===null?0:it.x-fin;s+=(fin===null?'':gap>9?'\t':gap>0.5?' ':'')+it.t.trim();fin=it.x+(it.w||0)}
    return s;
  });
}

/* ---------- construir tablas a partir de líneas sueltas (Word/PDF sin tablas) ---------- */
function esFilaAsign(c){return c.length>=4&&entero(c[c.length-1])!==null&&(parseGrupo(c[0])||soloGrado(c[0])!==null)}
function tablasDeLineas(lineas){
  const out=[];let cur=null;
  const abre=(tipo,nombre)=>{cur={nombre:nombre||'',tipo,filas:[]};out.push(cur)};
  for(const l of lineas){
    const lin=String(l==null?'':l).replace(/\u00a0/g,' ').trim();if(!lin){cur=null;continue}   // sin colapsar los tabuladores: separan columnas
    const ts=tipoDeTitulo(lin);
    if(ts){abre(ts,lin);continue}
    const c=partir(lin);
    if(!cur){
      const th=tipoPorEncabezado(c.map(norm));
      if(th&&c.length>=2){abre(null,'');cur.filas.push(c);continue}
      if(esFilaAsign(c)){abre('asign','');cur.filas.push(c)}
      continue;
    }
    cur.filas.push(c);
  }
  return out.filter(t=>t.filas.length);
}

/* ---------- interpretación de cada tipo ---------- */
function colDe(h,...res){for(const re of res){const i=h.findIndex(x=>re.test(x));if(i>=0)return i}return-1}
function primeraFilaEncabezado(filas,esperado){
  for(let i=0;i<Math.min(3,filas.length);i++){const h=filas[i].map(norm);const t=tipoPorEncabezado(h);if(t&&(!esperado||t===esperado))return i}
  return-1;
}
const esEjemplo=c=>{const p=norm(c.find(x=>limpia(x))||'');return/^(ejemplo|ej)\b/.test(p)};

function leerDocentes(filas,out){
  const hi=primeraFilaEncabezado(filas,'docentes'),h=hi>=0?filas[hi].map(norm):[];
  const ci=hi>=0?colDe(h,/nombre|docente|profesor/):0,ce=hi>=0?colDe(h,/correo|email|e mail/):-1;
  filas.slice(hi+1).forEach((c,i)=>{
    if(esEjemplo(c))return;
    let nombre=limpia(c[ci>=0?ci:0]),correo=ce>=0?limpia(c[ce]).toLowerCase():'';
    if(!correo){const m=c.join(' ').match(/[^\s@;,|]+@[^\s@;,|]+\.[^\s@;,|]+/);if(m)correo=m[0].toLowerCase()}
    if(!nombre)return;
    nombre=nombre.replace(/^\d+[.)\-]\s*/,'').replace(/^(prof(esor)?a?|doc(ente)?|lic(enciad[oa])?|ing(eniero)?|dr[a]?|mg|mgs?|esp)\.?\s+/i,'').trim();
    if(/^\d+$/.test(nombre)||/^n\.?\s?[°º]?$/i.test(nombre))return;
    const e=[],a=[];
    if(nombre.length<3)e.push('el nombre es muy corto');
    if(nombre.length>80)e.push('el nombre es muy largo');
    if(!/[A-Za-zÁ-ú]/.test(nombre))e.push('no parece un nombre');
    if(nombre.split(' ').length<2)a.push('solo tiene un nombre (conviene nombre y apellido)');
    out.docentes.push({nombre,correo,origen:'lista',fila:i+1+(hi+1),errores:e,avisos:a});
  });
}
function leerGrupos(filas,out){
  const hi=primeraFilaEncabezado(filas,'grupos'),h=hi>=0?filas[hi].map(norm):[];
  const cg=hi>=0?colDe(h,/grado/):-1,cp=hi>=0?colDe(h,/grupo|curso|seccion/):-1;
  filas.slice(hi+1).forEach((c,i)=>{
    if(esEjemplo(c))return;
    const fila=i+1+(hi+1);
    if(cg>=0&&cp>=0&&limpia(c[cg])){
      const g=parseGrado(c[cg]);
      if(g===null){out.grupos.push({grado:null,nombre:limpia(c[cp]),errores:['el grado no es válido: '+limpia(c[cg])],avisos:[],fila});return}
      const noms=limpia(c[cp]).split(/[,;/\s]+/).filter(Boolean);
      (noms.length?noms:['A']).forEach(n=>out.grupos.push({grado:g,nombre:n.toUpperCase().slice(0,20),errores:[],avisos:[],fila}));return;
    }
    // una sola columna: "6A", "6°B", o varias separadas por coma
    for(const celda of c.join(',').split(/[,;]+/).map(limpia).filter(Boolean)){
      const g=parseGrupo(celda);
      if(g)out.grupos.push({grado:g.grado,nombre:g.nombre,errores:[],avisos:[],fila});
      else if(/\d/.test(celda))out.grupos.push({grado:null,nombre:celda,errores:['no reconozco este grupo: '+celda],avisos:[],fila});
    }
  });
}
function leerAsignaturas(filas,out){
  const hi=primeraFilaEncabezado(filas,'asignaturas'),h=hi>=0?filas[hi].map(norm):[];
  const cn=hi>=0?colDe(h,/asignatura|materia|nombre/):0,ca=hi>=0?colDe(h,/area/):-1,cu=hi>=0?colDe(h,/aula|espacio|lugar/):-1;
  filas.slice(hi+1).forEach((c,i)=>{
    if(esEjemplo(c))return;
    const nombre=limpia(c[cn>=0?cn:0]);if(!nombre||/^\d+$/.test(nombre))return;
    const e=[];if(nombre.length<2)e.push('el nombre es muy corto');if(nombre.length>60)e.push('el nombre es muy largo');
    out.asignaturas.push({nombre,area:(ca>=0&&limpia(c[ca]))||nombre,aula_tipo:cu>=0?(limpia(c[cu])||null):null,origen:'lista',fila:i+1+(hi+1),errores:e,avisos:[]});
  });
}
function leerJornada(filas,out){
  const hi=primeraFilaEncabezado(filas,'jornada'),h=hi>=0?filas[hi].map(norm):[];
  const cn=hi>=0?colDe(h,/nombre|franja|hora\b/):0,ci=hi>=0?colDe(h,/inicio|desde/):1,cf=hi>=0?colDe(h,/\bfin\b|hasta|final/):2,ct=hi>=0?colDe(h,/tipo/):3;
  let n=0;
  filas.slice(hi+1).forEach((c,i)=>{
    if(esEjemplo(c))return;
    const nombre=limpia(c[cn>=0?cn:0]);if(!nombre)return;
    const ini=parseHora(c[ci]||''),fin=parseHora(c[cf]||''),tipoTxt=ct>=0?(c[ct]||''):'';
    const e=[],a=[];
    if(c[ci]&&!ini)a.push('no entendí la hora de inicio: '+limpia(c[ci]));
    if(c[cf]&&!fin)a.push('no entendí la hora de fin: '+limpia(c[cf]));
    n++;out.jornada.push({orden:n,nombre:nombre.slice(0,40),inicio:ini,fin:fin,es_clase:!(esDescanso(tipoTxt)||esDescanso(nombre)),fila:i+1+(hi+1),errores:e,avisos:a});
  });
}
function leerAsign(filas,out,ctx){
  const hi=primeraFilaEncabezado(filas,'asign'),h=hi>=0?filas[hi].map(norm):[];
  const cgr=hi>=0?colDe(h,/grado/):-1,cgp=hi>=0?colDe(h,/grupo|curso/):(hi<0?0:-1);
  const ca=hi>=0?colDe(h,/asignatura|materia/):1,cd=hi>=0?colDe(h,/docente|profesor/):2,ch=hi>=0?colDe(h,/hora|intensidad|ih/):3;
  const conocidas=((ctx&&ctx.asignaturas)||[]).concat(out.asignaturas.map(a=>a.nombre)).map(x=>({n:x,k:norm(x)})).sort((a,b)=>b.k.length-a.k.length);
  filas.slice(hi+1).forEach((c0,i)=>{
    if(esEjemplo(c0))return;
    const fila=i+1+(hi+1);
    let c=c0.slice();
    // Si la fila viene sin separar (un solo bloque de texto): grupo ... asignatura docente horas
    const hdr=hi>=0;
    let gTxt,aTxt,dTxt,hTxt;
    if(hdr){
      const gr=cgr>=0?limpia(c[cgr]):'',gp=cgp>=0?limpia(c[cgp]):'';
      gTxt=gr&&gp?gr+gp:(gp||gr);aTxt=limpia(c[ca]);dTxt=limpia(c[cd]);hTxt=limpia(c[ch]);
    }else{
      if(c.length>=4){gTxt=limpia(c[0]);aTxt=limpia(c[1]);dTxt=limpia(c.slice(2,c.length-1).join(' '));hTxt=limpia(c[c.length-1])}
      else{
        const tk=limpia(c.join(' ')).split(' ');gTxt=tk[0];hTxt=tk[tk.length-1];
        const medio=limpia(tk.slice(1,tk.length-1).join(' ')),mk=norm(medio);
        const m=conocidas.find(x=>mk===x.k||mk.startsWith(x.k+' '));
        if(m){aTxt=m.n;dTxt=limpia(medio.slice(m.n.length))}else{aTxt=medio;dTxt=''}
      }
    }
    if(!limpia(gTxt)&&!aTxt&&!dTxt)return;
    const e=[],a=[],horas=entero(hTxt);
    let grupo=null;
    const pg=parseGrupo(gTxt);
    if(pg)grupo={grado:pg.grado,nombre:pg.nombre,todos:false};
    else{const sg=soloGrado(gTxt);if(sg!==null&&gTxt)grupo={grado:sg,nombre:null,todos:true};else e.push('no reconozco el grupo: '+(gTxt||'(vacío)'))}
    if(!aTxt||aTxt.length<2)e.push('falta la asignatura');
    if(!dTxt||dTxt.length<3)e.push(aTxt&&!dTxt?'falta el docente (sepáralo de la asignatura con ; o con una columna)':'falta el docente');
    if(horas===null||horas<1||horas>20)e.push('las horas deben ser un número entre 1 y 20 ('+(hTxt||'vacío')+')');
    out.asignaciones.push({grupo,asignatura:aTxt,docente:dTxt,horas,fila,errores:e,avisos:a});
  });
}
function leerNoDisp(filas,out){
  const hi=primeraFilaEncabezado(filas,'nodisp'),h=hi>=0?filas[hi].map(norm):[];
  const cd=hi>=0?colDe(h,/docente|profesor/):0,cdi=hi>=0?colDe(h,/\bdia/):1,ch=hi>=0?colDe(h,/hora|franja|n\b/):2;
  filas.slice(hi+1).forEach((c,i)=>{
    if(esEjemplo(c))return;
    const doc=limpia(c[cd>=0?cd:0]);if(!doc)return;
    const dias=parseDias(c[cdi>=0?cdi:1]||''),horasTxt=limpia(c[ch>=0?ch:2]||''),e=[];
    if(!dias.length)e.push('no entendí el día: '+(limpia(c[cdi>=0?cdi:1])||'(vacío)'));
    const horas=/todas|todo/.test(norm(horasTxt))?['todas']:parseNums(horasTxt);
    if(!horas.length)e.push('falta el número de la hora (por ejemplo 1 o 1-3 o "todas")');
    out.noDisp.push({docente:doc,dias,horas,horaTxt:horasTxt,fila:i+1+(hi+1),errores:e,avisos:[]});
  });
}
function reglaDe(txt){
  const n=norm(txt),dia=/\bdia/.test(n),hora=/hora|franja/.test(n);
  if(/bloque|doble|seguid/.test(n))return'bloque_doble';
  if(/maxim|\bmax\b|tope|limite/.test(n))return'max_por_dia';
  const nunca=/nunca|\bno\b|sin /.test(n),solo=/solo|unicamente|exclusiv/.test(n);
  if(nunca&&hora)return'nunca_franjas';if(nunca&&dia)return'nunca_dias';
  if(solo&&hora)return'solo_franjas';if(solo&&dia)return'solo_dias';
  if(nunca)return hora?'nunca_franjas':'nunca_dias';if(solo)return hora?'solo_franjas':'solo_dias';
  return null;
}
function leerRestr(filas,out){
  const hi=primeraFilaEncabezado(filas,'restr'),h=hi>=0?filas[hi].map(norm):[];
  if(hi<0)return;
  const c_sobre=colDe(h,/aplica|sobre|tipo de|a que/),c_obj=colDe(h,/cual|objetivo|nombre|area o|asignatura o/),c_en=colDe(h,/^en\b|alcance|ambito/),
        c_gg=colDe(h,/grado o grupo|grado|grupo/),c_reg=colDe(h,/regla/),c_dias=colDe(h,/^dias?$/,/\bdias\b/),c_hor=colDe(h,/^horas?( n)?$/,/horas|franjas|hora n/),
        c_max=colDe(h,/maximo|max/),c_fz=colDe(h,/fuerza|obligatori|prioridad/),c_nota=colDe(h,/nota|observ/);
  filas.slice(hi+1).forEach((c,i)=>{
    if(esEjemplo(c))return;
    const g=k=>k>=0?limpia(c[k]):'';
    if(!g(c_reg)&&!g(c_obj))return;
    const e=[],a=[],fila=i+1+(hi+1);
    const sobreN=norm(g(c_sobre));
    const sobre=/docente|profesor/.test(sobreN)?'docente':/asignatura|materia/.test(sobreN)?'asignatura':'area';
    const objetivo=g(c_obj);if(!objetivo)e.push('falta indicar a qué se aplica (área, asignatura o docente)');
    const enN=norm(g(c_en)),ggTxt=g(c_gg);
    let alcance='colegio',grado=null,grupo=null;
    if(/grupo|curso/.test(enN)){alcance='grupo';const pg=parseGrupo(ggTxt);if(pg)grupo=pg;else e.push('no reconozco el grupo: '+(ggTxt||'(vacío)'))}
    else if(/grado/.test(enN)){alcance='grado';grado=parseGrado(ggTxt);if(grado===null)e.push('no reconozco el grado: '+(ggTxt||'(vacío)'))}
    else if(!enN&&ggTxt){const pg=parseGrupo(ggTxt);if(pg){alcance='grupo';grupo=pg}else{const gg=soloGrado(ggTxt);if(gg!==null){alcance='grado';grado=gg}}}
    const tipo=reglaDe(g(c_reg));if(!tipo)e.push('no entendí la regla: '+(g(c_reg)||'(vacía)'));
    const dias=parseDias(g(c_dias)),franjas=parseNums(g(c_hor));let valor=entero(g(c_max));
    if((tipo==='solo_dias'||tipo==='nunca_dias')&&!dias.length)e.push('faltan los días');
    if((tipo==='solo_franjas'||tipo==='nunca_franjas')&&!franjas.length)e.push('faltan los números de las horas');
    if(tipo==='max_por_dia'&&!(valor>=1&&valor<=12))e.push('falta el máximo de horas por día (entre 1 y 12)');
    if(tipo!=='max_por_dia')valor=null;
    out.restr.push({sobre,objetivo,alcance,grado,grupo,tipo,dias:(tipo==='solo_dias'||tipo==='nunca_dias')?dias:[],franjas:(tipo==='solo_franjas'||tipo==='nunca_franjas')?franjas:[],valor,
      fuerza:/prefer/.test(norm(g(c_fz)))?'preferida':'obligatoria',nota:g(c_nota)||null,fila,errores:e,avisos:a});
  });
}

/* ---------- entrada principal ---------- */
function interpretar(tablas,ctx){
  const out={jornada:[],grupos:[],asignaturas:[],docentes:[],asignaciones:[],noDisp:[],restr:[],avisos:[],hojasIgnoradas:[]};
  // 1) clasificar cada tabla
  const tipos=tablas.map(t=>{
    let tipo=t.tipo||tipoPorNombre(t.nombre);
    if(tipo==='ignorar'){out.hojasIgnoradas.push(t.nombre);return null}
    if(!tipo){const hi=primeraFilaEncabezado(t.filas);if(hi>=0)tipo=tipoPorEncabezado(t.filas[hi].map(norm))}
    if(!tipo&&t.filas.length&&t.filas.every(f=>f.length===1))tipo=null;
    return tipo;
  });
  // 2) primero las listas simples, luego las que dependen de ellas
  const orden=['jornada','grupos','asignaturas','docentes','asign','nodisp','restr'];
  for(const tp of orden){
    tablas.forEach((t,i)=>{
      if(tipos[i]!==tp)return;
      const f=t.filas.filter(r=>r.some(x=>limpia(x)));
      ({jornada:leerJornada,grupos:leerGrupos,asignaturas:leerAsignaturas,docentes:leerDocentes,asign:leerAsign,nodisp:leerNoDisp,restr:leerRestr}[tp])(f,out,ctx);
    });
  }
  tablas.forEach((t,i)=>{if(!tipos[i]&&t.nombre&&!out.hojasIgnoradas.includes(t.nombre)&&t.filas.length>1)out.avisos.push(`No supe qué contiene "${t.nombre||'una tabla'}"; la dejé sin leer.`)});
  // 3) unir: lo que aparece en asignaciones también entra a las listas
  const kDoc=new Map(),kAsg=new Map(),kGrp=new Map();
  const dedupe=(lista,clave,seen)=>{const r=[];for(const x of lista){const k=clave(x);if(seen.has(k)){const p=seen.get(k);if(x.correo&&!p.correo)p.correo=x.correo;if(x.area&&p.area===p.nombre&&x.area!==x.nombre)p.area=x.area;continue}seen.set(k,x);r.push(x)}return r};
  out.docentes=dedupe(out.docentes,d=>norm(d.nombre),kDoc);
  out.asignaturas=dedupe(out.asignaturas,a=>norm(a.nombre),kAsg);
  out.grupos=dedupe(out.grupos.filter(g=>g.grado!==null||g.errores.length),g=>g.grado+'|'+g.nombre.toUpperCase(),kGrp);
  const fantasma=(lista,k,nombre,extra)=>{const n=norm(nombre);if(!n||lista.some(x=>norm(x.nombre)===n))return;lista.push({nombre:limpia(nombre),origen:'asignaciones',fila:null,errores:[],avisos:[],...extra})};
  for(const a of out.asignaciones){
    if(a.errores.length)continue;
    fantasma(out.docentes,'d',a.docente,{correo:''});
    fantasma(out.asignaturas,'a',a.asignatura,{area:a.asignatura,aula_tipo:null});
    if(a.grupo&&!a.grupo.todos&&!out.grupos.some(g=>g.grado===a.grupo.grado&&g.nombre===a.grupo.nombre))out.grupos.push({grado:a.grupo.grado,nombre:a.grupo.nombre,origen:'asignaciones',fila:null,errores:[],avisos:[]});
  }
  for(const d of out.noDisp)if(!d.errores.length)fantasma(out.docentes,'d',d.docente,{correo:''});
  for(const r of out.restr)if(!r.errores.length&&r.objetivo){if(r.sobre==='docente')fantasma(out.docentes,'d',r.objetivo,{correo:''});if(r.sobre==='asignatura')fantasma(out.asignaturas,'a',r.objetivo,{area:r.objetivo,aula_tipo:null})}
  // asignaciones repetidas (mismo grupo y asignatura)
  const vistas=new Map();
  for(const a of out.asignaciones){if(a.errores.length||!a.grupo||a.grupo.todos)continue;const k=a.grupo.grado+'|'+a.grupo.nombre+'|'+norm(a.asignatura);
    if(vistas.has(k)){a.errores.push(`repetida: ya aparece en la fila ${vistas.get(k)} (mismo grupo y asignatura)`)}else vistas.set(k,a.fila)}
  out.grupos.sort((a,b)=>(a.grado??99)-(b.grado??99)||String(a.nombre).localeCompare(String(b.nombre)));
  out.docentes.sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
  out.asignaturas.sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
  return out;
}
const resumen=o=>({jornada:o.jornada.length,grupos:o.grupos.length,asignaturas:o.asignaturas.length,docentes:o.docentes.length,asignaciones:o.asignaciones.length,noDisp:o.noDisp.length,restr:o.restr.length});

return{interpretar,resumen,desdeHtml,lineasDeItems,tablasDeLineas,partir,norm,parseGrupo,parseGrado,soloGrado,parseDias,parseNums,parseHora,reglaDe};
});
