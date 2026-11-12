/* AulaICFES — Planeador "Día a día pedagógico" (formato institucional).
   Docente: lo diligencia (la plataforma llena lo que puede con su plan de área), lo envía al rector y/o coordinador, o lo imprime.
   Rector: aprueba el formato de la plataforma o sube el de su colegio, y recibe los planeadores. Coordinador: recibe y revisa. */
window.PLN=(function(){
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isDoc=()=>M&&M.role==='prof',isRec=()=>M&&M.role==='rector',isDir=()=>M&&(M.role==='rector'||M.role==='coordinador');
const R=()=>render();
const hoy=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Bogota'});
const fF=d=>d?new Date(d.length<=10?d+'T12:00:00':d).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'}):'';
let Z={dia:0,cfg:null,lista:[],cur:null,cursos:[],planes:[],rec:[],ver:null,tema:'',busy:false};
const MOM=[['Exploración','Activación de saberes previos'],['Estructuración','Construcción / explicación'],['Práctica y ejecución','Aplicación guiada o autónoma'],['Transferencia','Uso en contexto / resolución'],['Valoración y cierre','Síntesis / metacognición']];
const inp='style="width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:8px;font-size:14px"';
const colegio=()=>{try{return LH().l1||''}catch(x){return ''}};
function vacio(){return{fecha:hoy(),asignatura:'',grado:'',grupo:'',datos:{tipo:'dia',inst:colegio(),docente:M.full_name||'',anio:String(new Date().getFullYear()),periodo:'1',fechaFirma:hoy()},id:null}}
async function load(){
  const c=await sb.from('planeador_config').select('*').eq('colegio_id',M.colegio_id||0).maybeSingle();Z.cfg=c.data||{modo:'plataforma'};
  if(isDoc()){
    const l=await sb.from('planeador_diario').select('id,fecha,asignatura,grado,grupo,estado,enviado_a,enviado_at,datos').eq('docente_id',M.id).order('fecha',{ascending:false}).order('created_at',{ascending:false}).limit(100);
    if(l.error)throw l.error;Z.lista=l.data||[];
    const cs=await sb.from('courses').select('id,name,grade').eq('teacher_id',M.id).order('grade').order('name');Z.cursos=cs.data||[];
    const p=await sb.from('planes_area').select('asignatura,grado,anio,malla').eq('docente_id',M.id);Z.planes=p.data||[];
  }else if(isDir()){const r=await sb.rpc('planeador_recibidos');if(r.error)throw r.error;Z.rec=r.data||[]}
}
/* ---------- plan de área ---------- */
function filasPlan(){
  const c=Z.cur;if(!c||!c.asignatura||c.grado==='')return[];
  const p=Z.planes.filter(x=>x.asignatura===c.asignatura&&String(x.grado)===String(c.grado)).sort((a,b)=>b.anio-a.anio)[0];
  if(!p||!p.malla||!Array.isArray(p.malla.periodos))return[];
  const per=p.malla.periodos.find(x=>String(x.n)===String(c.datos.periodo))||{};
  return (per.filas||[]).filter(f=>f.tema);
}
/* ---------- formulario ---------- */
const T=(k,l,r)=>`<label style="font-size:13px;font-weight:700;display:block;margin-top:8px">${l}<textarea rows="${r||2}" ${inp} oninput="PLN.d('${k}',this.value)">${e(Z.cur.datos[k]||'')}</textarea></label>`;
const I=(k,l)=>`<label style="font-size:13px;font-weight:700">${l}<input ${inp} value="${e(Z.cur.datos[k]||'')}" oninput="PLN.d('${k}',this.value)"></label>`;
const sk=k=>(Z.cur.datos.tipo==='semana'&&Z.dia>0)?k+'_'+Z.dia:k;
const addD=(f,n)=>{const d=new Date((f||hoy())+'T12:00:00');d.setDate(d.getDate()+n);return d.toLocaleDateString('en-CA')};
const DN=['Lunes','Martes','Miércoles','Jueves','Viernes'];
const dayTabs=()=>Z.cur.datos.tipo!=='semana'?'':`<div style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0">${[0,1,2,3,4].map(i=>`<button onclick="PLN.dia(${i})" style="padding:8px 12px;border-radius:8px;font-weight:700;font-size:13px;${Z.dia===i?'background:#246be0;color:#fff':'background:#e2e8f0'}">${DN[i]} ${fF(addD(Z.cur.fecha,i))}</button>`).join('')}</div>`;
const grid=(n,cols,pref,fl)=>`<div class="aic-table-wrap"><table style="min-width:640px"><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${Array.from({length:n},(_,i)=>`<tr>${fl.map((f,j)=>j===0&&pref?`<td style="font-size:12px"><b>${e(pref[i][0])}</b><br>${e(pref[i][1])}</td>`:`<td><textarea rows="2" style="width:100%;border:1px solid #cbd5e1;border-radius:6px;padding:4px;font-size:13px" oninput="PLN.g('${sk(f[0])}',${i},'${f[1]}',this.value)">${e(((Z.cur.datos[sk(f[0])]||[])[i]||{})[f[1]]||'')}</textarea></td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const H=t=>`<h3 style="font-weight:800;color:#1e4a7c;margin:18px 0 6px;border-bottom:2px solid #1e4a7c;padding-bottom:4px">${t}</h3>`;
function form(){
  const c=Z.cur,asigs=[...new Set([...(M.asignaturas||[]),c.asignatura])].filter(Boolean);
  const grados=[...new Set(Z.cursos.map(x=>x.grade))],grupos=Z.cursos.filter(x=>String(x.grade)===String(c.grado));
  const filas=filasPlan();
  return`<div class="aic-card" style="padding:16px"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px"><h2 style="font-weight:800;font-size:20px">📓 Día a día pedagógico</h2><button class="aic-link" onclick="PLN.cerrar()" style="font-size:14px">← Volver a mis planeadores</button></div>
  ${H('1. IDENTIFICACIÓN INSTITUCIONAL')}<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">${I('inst','Institución educativa')}${I('sede','Sede / jornada')}${I('anio','Año lectivo')}${I('docente','Docente')}
   <label style="font-size:13px;font-weight:700">Área / asignatura<select ${inp} onchange="PLN.top('asignatura',this.value)"><option value="">Elige…</option>${asigs.map(a=>`<option ${a===c.asignatura?'selected':''}>${e(a)}</option>`).join('')}</select></label>
   <label style="font-size:13px;font-weight:700">Grado<select ${inp} onchange="PLN.top('grado',this.value)"><option value="">Elige…</option>${grados.map(g=>`<option value="${g}" ${String(g)===String(c.grado)?'selected':''}>${g}°</option>`).join('')}</select></label>
   <label style="font-size:13px;font-weight:700">Grupo<select ${inp} onchange="PLN.top('grupo',this.value)"><option value="">Elige…</option>${grupos.map(g=>`<option ${g.name===c.grupo?'selected':''}>${e(g.name)}</option>`).join('')}</select></label>
   <label style="font-size:13px;font-weight:700">Se diligencia<select ${inp} onchange="PLN.tipo(this.value)"><option value="dia" ${c.datos.tipo!=='semana'?'selected':''}>Por día</option><option value="semana" ${c.datos.tipo==='semana'?'selected':''}>Por semana</option></select></label>
   <label style="font-size:13px;font-weight:700">${c.datos.tipo==='semana'?'Semana desde (lunes)':'Fecha'}<input type="date" ${inp} value="${c.fecha}" onchange="PLN.top('fecha',this.value)"></label>${c.datos.tipo==='semana'?`<div style="font-size:13px;font-weight:700;align-self:end;padding-bottom:10px">hasta ${fF(addD(c.fecha,4))}</div>`:''}
   <label style="font-size:13px;font-weight:700">Período<select ${inp} onchange="PLN.d('periodo',this.value);PLN.rr()">${[1,2,3,4].map(n=>`<option ${String(c.datos.periodo)===String(n)?'selected':''}>${n}</option>`).join('')}</select></label>
   ${I('sesion','Clase / sesión N.º')}${I('duracion','Duración')}${I('horario','Horario')}</div>
  ${H('2. ARTICULACIÓN CURRICULAR Y REFERENTES DE APRENDIZAJE')}
  ${filas.length?`<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px;font-size:13px"><b>Desde tu plan de área</b> (período ${e(c.datos.periodo)}): elige el tema de hoy y la plataforma llena lo que pueda.<br><select ${inp} style="margin-top:6px" onchange="PLN.tema(this.value)"><option value="">— Elige el tema —</option>${filas.map((f,i)=>`<option value="${i}" ${String(Z.tema)===String(i)?'selected':''}>${e(f.tema)}</option>`).join('')}</select></div>`:`<p style="font-size:12px;color:#64748b">Si subes y llenas tu <b>Plan de área</b> para esta asignatura y grado, aquí podrás elegir el tema y se llenarán solos los estándares, los aprendizajes y las evidencias.</p>`}
  <label style="font-size:13px;font-weight:700;display:block;margin-top:8px">Unidad / tema <span style="font-weight:400;color:#16a34a">(escribe el tema y la plataforma llena el resto)</span><textarea rows="1" ${inp} oninput="PLN.d('unidad',this.value)" onchange="PLN.auto(this.value)">${e(c.datos.unidad||'')}</textarea></label>${T('estandares','Estándar(es) / referente(s)')}${T('dba','DBA relacionado(s)')}${T('competencias','Competencia(s)',1)}${T('componente','Componente / proceso',1)}${T('aprendizajes','Aprendizaje(s) esperado(s)')}${T('evidencias','Evidencia(s) de aprendizaje')}
  ${H('3. PROPÓSITO Y PREPARACIÓN DE LA CLASE')}${T('objetivo','Objetivo de aprendizaje')}${T('desempenos','Desempeño(s) esperado(s)')}${T('previos','Saberes previos',1)}${T('recursos','Recursos y materiales',1)}${T('estrategia','Estrategia metodológica',1)}
  ${H('4. SECUENCIA DIDÁCTICA '+(c.datos.tipo==='semana'?'DE LA SEMANA (por día)':'DE LA JORNADA'))}${dayTabs()}${grid(5,['Momento','Actividades / consignas','Tiempo','Recursos','Evidencia o producto'],MOM,[['s4','m'],['s4','act'],['s4','t'],['s4','rec'],['s4','ev']])}
  ${H('5. REGISTRO DEL DESARROLLO REAL DE LA CLASE')}${dayTabs()}<p style="font-size:12px;color:#64748b">Se diligencia durante o al finalizar la jornada.</p>${grid(4,['Hora / bloque','Actividad desarrollada','Estrategia aplicada','Participación del grupo','Observaciones / ajustes'],null,[['s5','h'],['s5','act'],['s5','est'],['s5','part'],['s5','obs']])}
  ${H('6. EVALUACIÓN FORMATIVA Y RESULTADOS')}${grid(3,['Criterio de evaluación','Instrumento / técnica','Resultado / nivel de avance','Evidencia observada'],null,[['s6','c'],['s6','i'],['s6','r'],['s6','e']])}${T('logros','Logros alcanzados')}${T('dificultades','Dificultades de aprendizaje')}${T('retro','Retroalimentación brindada',1)}
  ${H('7. ATENCIÓN A LA DIVERSIDAD, APOYOS Y SEGUIMIENTO')}${T('apoyo','Estudiantes que requieren apoyo',1)}${T('barreras','Barreras / necesidades identificadas',1)}${T('ajustes','Ajustes razonables / apoyos implementados')}${T('compromisos','Compromisos o remisiones (si aplica)',1)}
  ${H('8. CONVIVENCIA, PARTICIPACIÓN Y CLIMA DE AULA')}${T('situaciones','Situaciones relevantes')}${T('acuerdos','Acuerdos y compromisos',1)}${T('obsconv','Observaciones sobre participación y convivencia',1)}
  ${H('9. REFLEXIÓN PEDAGÓGICA Y ACCIONES DE MEJORAMIENTO')}${T('funciono','¿Qué funcionó y por qué?')}${T('ajustar','¿Qué debe ajustarse?')}${T('proxima','Acciones para la próxima clase')}${T('refuerzo','Actividad de refuerzo / profundización',1)}
  ${H('10. CIERRE Y VALIDACIÓN')}${T('obsgen','Observaciones generales')}<p style="font-size:13px;margin-top:8px">Firma del docente: <b>${e(c.datos.docente||M.full_name)}</b> · Fecha: ${fF(c.datos.fechaFirma||hoy())}</p>
  ${acciones(c.id)}</div>`;
}
function acciones(){
  const c=Z.cur,env=c.id&&c.estado&&c.estado!=='borrador';
  return`<div style="position:sticky;bottom:0;background:#fff;border-top:1px solid #e2e8f0;margin-top:16px;padding:10px 0;display:flex;flex-wrap:wrap;gap:8px">
   <button onclick="PLN.guardar()" style="background:#246be0;color:#fff;padding:11px 16px;border-radius:10px;font-weight:800">💾 Guardar</button>
   <button onclick="PLN.imprimir()" style="background:#e2e8f0;padding:11px 16px;border-radius:10px;font-weight:800">🖨️ Imprimir</button>
   <span style="align-self:center;font-size:13px;font-weight:700;margin-left:6px">📤 Enviar a:</span>
   <button onclick="PLN.enviar(['rector'])" style="background:#16a34a;color:#fff;padding:11px 14px;border-radius:10px;font-weight:700">Rector</button>
   <button onclick="PLN.enviar(['coordinador'])" style="background:#16a34a;color:#fff;padding:11px 14px;border-radius:10px;font-weight:700">Coordinador</button>
   <button onclick="PLN.enviar(['rector','coordinador'])" style="background:#15803d;color:#fff;padding:11px 14px;border-radius:10px;font-weight:700">Ambos</button>
   ${env?`<span style="align-self:center;font-size:12px;color:#64748b">Ya enviado a ${e((c.enviado_a||[]).join(' y '))}</span>`:''}</div>`;
}
/* ---------- formato propio ---------- */
function formPropio(){
  const c=Z.cur;
  return`<div class="aic-card" style="padding:16px"><div style="display:flex;justify-content:space-between;flex-wrap:wrap"><h2 style="font-weight:800;font-size:20px">📓 Planeador con el formato de tu colegio</h2><button class="aic-link" onclick="PLN.cerrar()" style="font-size:14px">← Volver</button></div>
   <p style="font-size:13px;margin:8px 0">Tu rector pidió usar el formato propio del colegio. 1) Descárgalo, 2) diligéncialo en tu computador, 3) súbelo aquí y 4) envíalo.</p>
   <p><button onclick="PLN.formato()" style="background:#246be0;color:#fff;padding:10px 14px;border-radius:10px;font-weight:700">⬇ Descargar formato del colegio</button></p>
   <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-top:10px"><label style="font-size:13px;font-weight:700">Fecha<input type="date" ${inp} value="${c.fecha}" onchange="PLN.top('fecha',this.value)"></label><label style="font-size:13px;font-weight:700">Asignatura<input ${inp} value="${e(c.asignatura)}" oninput="PLN.top('asignatura',this.value,1)"></label><label style="font-size:13px;font-weight:700">Grado<input ${inp} value="${e(c.grado)}" oninput="PLN.top('grado',this.value,1)"></label><label style="font-size:13px;font-weight:700">Grupo<input ${inp} value="${e(c.grupo)}" oninput="PLN.top('grupo',this.value,1)"></label></div>
   <label style="font-size:13px;font-weight:700;display:block;margin-top:10px">Tu planeador diligenciado (PDF o Word)<input id="pl_file" type="file" accept=".pdf,.doc,.docx" ${inp}></label>
   ${c.datos.archivo?`<p style="font-size:13px;margin-top:6px">📎 Subido: <b>${e(c.datos.archivo.nombre)}</b></p>`:''}
   ${acciones()}</div>`;
}
/* ---------- impresión ---------- */
function printHtml(p){
  const d=p.datos||{},v=k=>e(d[k]||''),c=`style="border:1px solid #000;padding:4px 6px;vertical-align:top"`,h=`style="border:1px solid #000;padding:4px 6px;background:#e7f0fa;font-weight:700;width:30%"`,th=`style="border:1px solid #000;padding:4px;background:#1e4a7c;color:#fff;font-size:10pt"`;
  const row=(l,k)=>`<tr><td ${h}>${l}</td><td ${c}>${v(k)||'&nbsp;'}</td></tr>`;
  const tb=(cols,key,n,pref)=>`<table style="width:100%;border-collapse:collapse;font-size:9.5pt"><tr>${cols.map(x=>`<th ${th}>${x}</th>`).join('')}</tr>${Array.from({length:n},(_,i)=>{const r=(d[key]||[])[i]||{};const ks=Object.keys(pref?{m:1,act:1,t:1,rec:1,ev:1}:String(key).startsWith('s5')?{h:1,act:1,est:1,part:1,obs:1}:{c:1,i:1,r:1,e:1});return`<tr>${ks.map(k=>k==='m'&&pref?`<td ${c}><b>${e(MOM[i][0])}</b><br>${e(MOM[i][1])}</td>`:`<td ${c}>${e(r[k]||'')||'&nbsp;'}<br><br></td>`).join('')}</tr>`}).join('')}</table>`;
  const sec=t=>`<div style="font-weight:700;color:#1e4a7c;margin:12px 0 4px;font-size:11pt">${t}</div>`;
  const tab=rows=>`<table style="width:100%;border-collapse:collapse;font-size:10pt">${rows}</table>`;
  return`<div class="pg" style="font-family:Arial,Helvetica,sans-serif;color:#000"><div style="text-align:center;font-weight:700;color:#1e4a7c;font-size:10pt">FORMATO INSTITUCIONAL DE PLANEACIÓN Y SEGUIMIENTO DIARIO DE CLASE</div><div style="text-align:center;font-weight:800;color:#1e4a7c;font-size:18pt">DÍA A DÍA PEDAGÓGICO</div><div style="text-align:center;font-style:italic;font-size:9pt;color:#555">Instrumento para planear, registrar, valorar y mejorar los procesos de enseñanza y aprendizaje</div>
  ${sec('1. IDENTIFICACIÓN INSTITUCIONAL')}${tab(row('Institución educativa','inst')+row('Sede / jornada','sede')+`<tr><td ${h}>Año lectivo</td><td ${c}>${v('anio')}</td></tr>`+row('Docente','docente')+`<tr><td ${h}>Área / asignatura</td><td ${c}>${e(p.asignatura||'')} · Grado: ${e(p.grado||'')} · Grupo: ${e(p.grupo||'')}</td></tr><tr><td ${h}>Fecha</td><td ${c}>${fF(p.fecha)}${d.tipo==='semana'?' al '+fF(addD(p.fecha,4))+' (semana)':''} · Período: ${v('periodo')} · Clase / sesión N.º: ${v('sesion')}</td></tr>`+row('Duración','duracion')+row('Horario','horario'))}
  ${sec('2. ARTICULACIÓN CURRICULAR Y REFERENTES DE APRENDIZAJE')}${tab(row('Unidad / tema','unidad')+row('Estándar(es) / referente(s)','estandares')+row('DBA relacionado(s)','dba')+row('Competencia(s)','competencias')+row('Componente / proceso','componente')+row('Aprendizaje(s) esperado(s)','aprendizajes')+row('Evidencia(s) de aprendizaje','evidencias'))}
  ${sec('3. PROPÓSITO Y PREPARACIÓN DE LA CLASE')}${tab(row('Objetivo de aprendizaje','objetivo')+row('Desempeño(s) esperado(s)','desempenos')+row('Saberes previos','previos')+row('Recursos y materiales','recursos')+row('Estrategia metodológica','estrategia'))}
  ${(d.tipo==='semana'?[0,1,2,3,4]:[0]).map(i=>sec('4. SECUENCIA DIDÁCTICA '+(d.tipo==='semana'?'· '+DN[i]+' '+fF(addD(p.fecha,i)):'DE LA JORNADA'))+tb(['Momento','Actividades / consignas','Tiempo','Recursos','Evidencia o producto'],i?'s4_'+i:'s4',5,true)).join('')}</div>
  <div class="pg" style="font-family:Arial,Helvetica,sans-serif;color:#000">${(d.tipo==='semana'?[0,1,2,3,4]:[0]).map(i=>sec('5. REGISTRO DEL DESARROLLO REAL DE LA CLASE'+(d.tipo==='semana'?' · '+DN[i]:''))+tb(['Hora / bloque','Actividad desarrollada','Estrategia aplicada','Participación del grupo','Observaciones / ajustes'],i?'s5_'+i:'s5',4)).join('')}
  ${sec('6. EVALUACIÓN FORMATIVA Y RESULTADOS')}${tb(['Criterio de evaluación','Instrumento / técnica','Resultado / nivel de avance','Evidencia observada'],'s6',3)}${tab(row('Logros alcanzados','logros')+row('Dificultades de aprendizaje','dificultades')+row('Retroalimentación brindada','retro'))}
  ${sec('7. ATENCIÓN A LA DIVERSIDAD, APOYOS Y SEGUIMIENTO')}${tab(row('Estudiantes que requieren apoyo','apoyo')+row('Barreras / necesidades identificadas','barreras')+row('Ajustes razonables / apoyos implementados','ajustes')+row('Compromisos o remisiones (si aplica)','compromisos'))}
  ${sec('8. CONVIVENCIA, PARTICIPACIÓN Y CLIMA DE AULA')}${tab(row('Situaciones relevantes','situaciones')+row('Acuerdos y compromisos','acuerdos')+row('Observaciones sobre participación y convivencia','obsconv'))}
  ${sec('9. REFLEXIÓN PEDAGÓGICA Y ACCIONES DE MEJORAMIENTO')}${tab(row('¿Qué funcionó y por qué?','funciono')+row('¿Qué debe ajustarse?','ajustar')+row('Acciones para la próxima clase','proxima')+row('Actividad de refuerzo / profundización','refuerzo'))}
  ${sec('10. CIERRE Y VALIDACIÓN')}${tab(row('Observaciones generales','obsgen')+`<tr><td ${h}>Firma del docente</td><td ${c}>${v('docente')} · Fecha: ${fF(d.fechaFirma||p.fecha)}</td></tr><tr><td ${h}>Revisión / firma de coordinación (si aplica)</td><td ${c}>${p.revisado_at?'Revisado el '+fF(p.revisado_at):'&nbsp;<br><br>'}</td></tr>`)}
  <div style="text-align:center;font-size:8pt;font-style:italic;color:#555;margin-top:14px">Documento de uso pedagógico institucional | Ajustar a los acuerdos del PEI, SIEE, plan de estudios y orientaciones vigentes</div></div>`;
}
/* ---------- vistas ---------- */
function cfgPanel(){
  const c=Z.cfg||{modo:'plataforma'};
  return`<div class="aic-card" style="padding:16px;margin-bottom:14px"><h3 style="font-weight:800">⚙ Formato del planeador de tu colegio</h3>
  <label style="display:flex;gap:8px;margin-top:8px;font-size:14px"><input type="radio" name="pl_m" ${c.modo!=='propio'?'checked':''} onchange="PLN.modo('plataforma')"> <span><b>Usar el formato de la plataforma</b> (Día a día pedagógico, ya diseñado y diligenciable en pantalla)</span></label>
  <label style="display:flex;gap:8px;margin-top:8px;font-size:14px"><input type="radio" name="pl_m" ${c.modo==='propio'?'checked':''} onchange="PLN.modo('propio')"> <span><b>Usar el formato de mi colegio</b> (subo mi archivo; los docentes lo descargan, lo diligencian y lo suben aquí)</span></label>
  ${c.modo==='propio'?`<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input id="pl_fmt" type="file" accept=".pdf,.doc,.docx" style="border:1px solid #cbd5e1;border-radius:8px;padding:8px"><button onclick="PLN.subirFmt()" style="background:#246be0;color:#fff;padding:10px 14px;border-radius:10px;font-weight:700">⬆ Subir formato</button>${c.archivo_nombre?`<span style="font-size:13px">Actual: <b>${e(c.archivo_nombre)}</b></span>`:'<span style="font-size:13px;color:#b45309">Aún no has subido el formato.</span>'}</div>`:''}</div>`;
}
function recibidos(){
  return`<div class="aic-card" style="padding:16px"><h3 style="font-weight:800;margin-bottom:8px">📥 Planeadores recibidos</h3><div class="aic-table-wrap"><table style="min-width:640px"><thead><tr><th>ENVIADO</th><th>DOCENTE</th><th>FECHA CLASE</th><th>ASIGNATURA</th><th>GRADO</th><th>ESTADO</th><th></th></tr></thead><tbody>${Z.rec.map(x=>`<tr><td>${fF(x.enviado_at)}</td><td>${e(x.docente)}</td><td>${fF(x.fecha)}</td><td>${e(x.asignatura||'')}</td><td>${e(x.grado||'')} ${e(x.grupo||'')}</td><td>${x.estado==='revisado'?'✅ Revisado':'🟡 Por revisar'}</td><td><button class="aic-link" onclick="PLN.verRec('${x.id}')">Ver</button> <button class="aic-link" onclick="PLN.imprimirRec('${x.id}')">Imprimir</button>${x.estado!=='revisado'?` <button class="aic-link" onclick="PLN.revisado('${x.id}')">Marcar revisado</button>`:''}</td></tr>`).join('')||'<tr><td colspan="7">Aún no has recibido planeadores.</td></tr>'}</tbody></table></div>
  ${Z.ver?`<div style="margin-top:14px;border-top:1px solid #e2e8f0;padding-top:10px"><button class="aic-link" onclick="PLN.cerrarVer()" style="font-size:14px">✖ Cerrar vista</button>${Z.ver.datos&&Z.ver.datos.archivo?`<p style="margin-top:8px"><button onclick="PLN.bajar('${e(Z.ver.datos.archivo.path)}')" style="background:#246be0;color:#fff;padding:10px 14px;border-radius:10px;font-weight:700">⬇ Descargar ${e(Z.ver.datos.archivo.nombre)}</button></p>`:`<div style="margin-top:8px;max-height:70vh;overflow:auto;border:1px solid #e2e8f0;padding:10px;background:#fff">${printHtml(Z.ver)}</div>`}</div>`:''}</div>`;
}
function lista(){
  const propio=Z.cfg&&Z.cfg.modo==='propio';
  return`<div class="aic-card" style="padding:16px"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px"><h2 style="font-weight:800;font-size:20px">📓 Planeador · Día a día pedagógico</h2><button onclick="PLN.nuevo()" style="background:#16a34a;color:#fff;padding:11px 16px;border-radius:10px;font-weight:800">➕ Nuevo planeador</button></div>
  <p style="font-size:13px;color:#64748b;margin:4px 0 10px">${propio?'Tu colegio usa su <b>propio formato</b>: descárgalo, diligéncialo y súbelo.':'Formato institucional de la plataforma. Se llena con tu plan de área, lo envías al rector y/o coordinador y también lo puedes imprimir.'}</p>
  <div class="aic-table-wrap"><table style="min-width:560px"><thead><tr><th>FECHA</th><th>ASIGNATURA</th><th>GRADO</th><th>ESTADO</th><th></th></tr></thead><tbody>${Z.lista.map(x=>`<tr><td>${fF(x.fecha)}</td><td>${e(x.asignatura||'')}</td><td>${e(x.grado||'')} ${e(x.grupo||'')}</td><td>${x.estado==='borrador'?'📝 Borrador':x.estado==='revisado'?'✅ Revisado':'📤 Enviado a '+e((x.enviado_a||[]).join(' y '))}</td><td><button class="aic-link" onclick="PLN.abrir('${x.id}')">Abrir</button> <button class="aic-link" onclick="PLN.imprimirId('${x.id}')">Imprimir</button> ${x.estado==='borrador'?`<button class="aic-link" onclick="PLN.borrar('${x.id}')">Borrar</button>`:''}</td></tr>`).join('')||'<tr><td colspan="5">Aún no tienes planeadores. Pulsa “Nuevo planeador”.</td></tr>'}</tbody></table></div></div>`;
}
async function guardarCur(){
  const c=Z.cur,row={docente_id:M.id,colegio_id:M.colegio_id||null,fecha:c.fecha,asignatura:c.asignatura||null,grado:c.grado===''?null:+c.grado,grupo:c.grupo||null,datos:c.datos,updated_at:new Date().toISOString()};
  if(!c.asignatura)throw new Error('Elige el área / asignatura.');
  if(c.id){const r=await sb.from('planeador_diario').update(row).eq('id',c.id);if(r.error)throw r.error}
  else{const r=await sb.from('planeador_diario').insert(row).select('id').single();if(r.error)throw r.error;c.id=r.data.id}
}
const api={
  load,
  view(){
    if(isDir())return`<div>${isRec()?cfgPanel():''}${recibidos()}</div>`;
    if(Z.cur)return Z.cfg&&Z.cfg.modo==='propio'?formPropio():form();
    return lista();
  },
  dia(i){Z.dia=i;R()},
  tipo(v){Z.cur.datos.tipo=v;Z.dia=0;R()},
  nuevo(){Z.dia=0;Z.cur=vacio();Z.tema='';R();window.scrollTo(0,0)},
  async abrir(id){const r=await sb.from('planeador_diario').select('*').eq('id',id).single();if(r.error)return err(r.error);Z.dia=0;Z.cur=r.data;Z.tema='';R();window.scrollTo(0,0)},
  cerrar(){Z.cur=null;load().then(R)},
  d(k,v){Z.cur.datos[k]=v},rr(){R()},
  g(sec,i,f,v){const a=Z.cur.datos[sec]=Z.cur.datos[sec]||[];a[i]=a[i]||{};a[i][f]=v},
  top(k,v,q){Z.cur[k]=v;if(k==='grado')Z.cur.grupo='';if(!q)R()},
  tema(i){
    Z.tema=i;if(i==='')return;const f=filasPlan()[+i];if(!f)return;const d=Z.cur.datos;
    d.unidad=f.tema;d.estandares=f.estandar||d.estandares||'';d.aprendizajes=f.indicador||'';d.evidencias=f.evaluacion||'';
    d.objetivo=d.objetivo||('Desarrollar el tema: '+f.tema);d.desempenos=d.desempenos||f.indicador||'';
    toast('✅','Llené lo del plan de área','Revisa y completa lo que falta.');R();
  },
  async auto(txt){
    txt=(txt||'').trim();if(txt.length<4)return;
    const c=Z.cur,d=c.datos,asig=c.asignatura||'',g=c.grado===''?null:+c.grado,low=asig.toLowerCase();
    const ar=/mate|geom|estad|c[aá]lculo/.test(low)?'Matemáticas':/lengua|lectur|castell|literat/.test(low)?'Lenguaje':/biolog|qu[ií]m|f[ií]sic|natural|ciencias n/.test(low)?'Ciencias Naturales':/social|ciudad|econom|pol[ií]t|democ|filos|historia|geograf/.test(low)?'Ciencias Sociales y Ciudadanas':/ingl/.test(low)?'Inglés':/tecnol|inform/.test(low)?'Tecnología e Informática':/art[ií]st/.test(low)?'Educación Artística':/f[ií]sica|deporte/.test(low)&&/educaci/.test(low)?'Educación Física':/[eé]tica|religi/.test(low)?'Ética y Religión':'';
    const COMP={'Matemáticas':'Razonamiento y argumentación; Comunicación, representación y modelación; Planteamiento y resolución de problemas','Lenguaje':'Comprensión lectora; Producción textual; Interpretación y análisis de textos','Ciencias Naturales':'Uso comprensivo del conocimiento científico; Explicación de fenómenos; Indagación','Ciencias Sociales y Ciudadanas':'Pensamiento social; Interpretación y análisis de perspectivas; Pensamiento reflexivo y sistémico','Inglés':'Comprensión lectora; Uso del lenguaje; Comunicación (Marco Común Europeo, nivel del grado)'};
    const set=(k,v)=>{if(v&&!String(d[k]||'').trim())d[k]=v};
    d.unidad=txt;
    const n=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
    const fp=filasPlan().find(f=>n(f.tema).includes(n(txt))||n(txt).includes(n(f.tema)));
    if(fp){set('estandares',fp.estandar);set('aprendizajes',fp.indicador);set('evidencias',fp.evaluacion);set('desempenos',fp.indicador)}
    try{
      if(ar&&g!=null){
        const ws=[...new Set(n(txt).split(/[^a-z0-9ñ]+/).filter(w=>w.length>=4))].slice(0,4);
        let q=sb.from('referentes').select('tipo,codigo,titulo,grado_min,grado_max').in('tipo',['dba','estandar']).eq('area',ar).lte('grado_min',g).or('grado_max.gte.'+g+',grado_max.is.null').limit(60);
        if(ws.length)q=q.or(ws.map(w=>'titulo.ilike.%'+w+'%').join(','));
        const r=await q;
        if(!r.error&&r.data&&r.data.length){
          const f=t=>r.data.filter(x=>x.tipo===t).slice(0,2).map(x=>(x.codigo?x.codigo+' · ':'')+x.titulo).join(' | ');
          set('dba',f('dba'));set('estandares',f('estandar'));
        }
      }
    }catch(x){console.warn(x)}
    set('competencias',COMP[ar]||'Competencias propias del área, según el plan de estudios');
    set('componente',txt);
    set('aprendizajes','Comprende, explica y aplica el tema «'+txt+'» en situaciones del contexto.');
    set('evidencias','Resuelve talleres y ejercicios sobre «'+txt+'»; explica con sus palabras lo aprendido.');
    set('objetivo','Que los estudiantes comprendan y apliquen el tema «'+txt+'» mediante actividades guiadas y autónomas.');
    set('desempenos','Identifica, explica y usa «'+txt+'» para resolver situaciones propuestas en clase.');
    set('previos','Conceptos y procedimientos de grados y clases anteriores relacionados con «'+txt+'».');
    set('recursos','Tablero, guía de trabajo, cuaderno, material impreso'+(ar==='Matemáticas'?', regla y calculadora':ar==='Ciencias Naturales'?', material de laboratorio o imágenes':'')+'.');
    set('estrategia','Aprendizaje basado en problemas y trabajo colaborativo, con explicación del docente y práctica guiada.');
    const k=sk('s4');const s4=d[k]=d[k]||[];
    const ACT=[['Pregunta y lluvia de ideas sobre «'+txt+'».','10 min','Tablero','Respuestas orales'],['Explicación del tema «'+txt+'» con ejemplos.','20 min','Tablero, guía','Apuntes en el cuaderno'],['Ejercicios guiados y luego autónomos.','20 min','Guía de trabajo','Ejercicios resueltos'],['Situación del contexto donde se usa «'+txt+'».','15 min','Situación problema','Solución explicada'],['Cierre: ¿qué aprendí y cómo lo aprendí?','10 min','Cuaderno','Síntesis escrita']];
    ACT.forEach((a,i)=>{s4[i]=s4[i]||{};const o=s4[i];['act','t','rec','ev'].forEach((f,j)=>{if(!String(o[f]||'').trim())o[f]=a[j]})});
    const s6=d.s6=d.s6||[];
    [['Comprende el tema «'+txt+'»','Preguntas orales','',''],['Aplica el tema en ejercicios','Taller o ejercicios escritos','',''],['Participación y trabajo en clase','Observación directa','','']].forEach((a,i)=>{s6[i]=s6[i]||{};const o=s6[i];if(!String(o.c||'').trim())o.c=a[0];if(!String(o.i||'').trim())o.i=a[1]});
    toast('✅','Llené los espacios del planeador','Revisa y ajusta lo que quieras.');R();
  },
  async guardar(){try{await guardarCur();toast('✅','Guardado','');R()}catch(x){toast('⚠️','No se guardó',x.message||'')}},
  async enviar(a){
    try{
      if(Z.cfg&&Z.cfg.modo==='propio'){const f=document.getElementById('pl_file')?.files[0];
        if(f){const n=f.name.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'_'),path=M.colegio_id+'/d/'+M.id+'/'+Date.now()+'_'+n;
          const u=await sb.storage.from('planeador-formatos').upload(path,f,{upsert:false});if(u.error)throw u.error;Z.cur.datos.archivo={path,nombre:f.name}}
        if(!Z.cur.datos.archivo)throw new Error('Sube tu planeador diligenciado (PDF o Word).')}
      await guardarCur();
      const r=await sb.rpc('planeador_enviar',{p_id:Z.cur.id,p_a:a});if(r.error)throw r.error;
      toast('📤','Enviado','A: '+a.join(' y '));Z.cur=null;await load();R();
    }catch(x){toast('⚠️','No se envió',x.message||'')}
  },
  async borrar(id){if(!confirm('¿Borrar este borrador?'))return;const r=await sb.from('planeador_diario').delete().eq('id',id);if(r.error)return err(r.error);await load();R()},
  imprimir(){doPrint(printHtml(Z.cur),{hoja:true})},
  async imprimirId(id){const r=await sb.from('planeador_diario').select('*').eq('id',id).single();if(r.error)return err(r.error);doPrint(printHtml(r.data),{hoja:true})},
  /* directivos */
  async modo(m){const r=await sb.from('planeador_config').upsert({colegio_id:M.colegio_id,modo:m,updated_by:M.id,updated_at:new Date().toISOString()});if(r.error)return err(r.error);Z.cfg={...Z.cfg,modo:m,colegio_id:M.colegio_id};toast('✅','Guardado',m==='propio'?'Tus docentes usarán el formato del colegio.':'Tus docentes usarán el formato de la plataforma.');R()},
  async subirFmt(){
    const f=document.getElementById('pl_fmt')?.files[0];if(!f)return toast('⚠️','Elige el archivo','PDF o Word.');
    const n=f.name.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'_'),path=M.colegio_id+'/formato/'+Date.now()+'_'+n;
    const u=await sb.storage.from('planeador-formatos').upload(path,f,{upsert:false});if(u.error)return err(u.error);
    const r=await sb.from('planeador_config').upsert({colegio_id:M.colegio_id,modo:'propio',archivo_path:path,archivo_nombre:f.name,updated_by:M.id,updated_at:new Date().toISOString()});if(r.error)return err(r.error);
    Z.cfg={...Z.cfg,modo:'propio',archivo_path:path,archivo_nombre:f.name};toast('✅','Formato subido',f.name);R();
  },
  async formato(){const p=Z.cfg&&Z.cfg.archivo_path;if(!p)return toast('⚠️','Sin formato','Tu rector aún no ha subido el formato.');const u=await sb.storage.from('planeador-formatos').createSignedUrl(p,300,{download:Z.cfg.archivo_nombre||true});if(u.error)return err(u.error);window.open(u.data.signedUrl,'_blank')},
  async bajar(p){const u=await sb.storage.from('planeador-formatos').createSignedUrl(p,300);if(u.error)return err(u.error);window.open(u.data.signedUrl,'_blank')},
  verRec(id){Z.ver=Z.rec.find(x=>x.id===id)||null;R()},cerrarVer(){Z.ver=null;R()},
  imprimirRec(id){const x=Z.rec.find(y=>y.id===id);if(!x)return;if(x.datos&&x.datos.archivo)return api.bajar(x.datos.archivo.path);doPrint(printHtml(x),{hoja:true})},
  async revisado(id){const r=await sb.rpc('planeador_revisar',{p_id:id});if(r.error)return err(r.error);await load();R()}
};
return api;
})();
