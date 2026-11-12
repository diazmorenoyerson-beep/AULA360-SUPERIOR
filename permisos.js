/* AULA360 — Formatos y solicitudes de permisos.
   Docente: formato de solicitud y de recibido (se llenan solos con membrete, rector y sus datos), diligenciar en línea, enviar, imprimir.
   Rector/coordinador: suben los formatos propios del colegio, reciben solicitudes y las responden (WhatsApp o correo). */
window.PERM=(function(){
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fd=x=>{if(!x)return'';const d=new Date(String(x).length===10?x+'T00:00:00':x);return d.toLocaleDateString('es-CO',{day:'2-digit',month:'long',year:'numeric'})};
const ft=x=>x?new Date(x).toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'}):'';
const isDir=()=>M&&(M.role==='rector'||M.role==='coordinador');
const R=()=>render();
const MOTIVOS=['Cita médica o examen','Calamidad doméstica','Licencia por luto','Diligencia personal','Capacitación o formación','Licencia de maternidad o paternidad','Representación institucional','Otro'];
let Z={cf:null,cfSecs:'',cfFile:null,cfNombre:'',dir:[],perm:[],fmt:[],f:{dest:'',motivo:'',desde:'',hasta:'',hd:'',hh:'',detalle:'',comp:''},ult:null,busy:false};
const inp='style="width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:8px"';
const nom=id=>((Z.dir.find(p=>p.id===id)||{}).full_name)||(id===M.id?M.full_name:'—');
const per=id=>Z.dir.find(p=>p.id===id)||null;
const rector=()=>Z.dir.find(p=>p.role==='rector')||(M.role==='rector'?{full_name:M.full_name,role:'rector'}:null);
async function load(){
  if(typeof MSG==='undefined')await loadScript('mensajes.js?v=1');
  const d=await sb.rpc('directorio_colegio');if(d.error)throw d.error;Z.dir=d.data||[];
  const p=await sb.from('permisos').select('*').order('created_at',{ascending:false}).limit(100);if(p.error)throw p.error;Z.perm=p.data||[];
  const f=await sb.from('permiso_formatos').select('*');Z.fmt=f.data||[];
  window.PERM_FMT=Z.fmt;if(!isDir()){const cu=await sb.from('courses').select('id,grade,name').eq('teacher_id',M.id).order('grade').order('name');Z.cursos=cu.data||[];window.PERM_CURSOS=Z.cursos;if(!Z.cur&&Z.cursos.length)Z.cur=Z.cursos[0].id}
  // nombres de los solicitantes (para rector/coordinador)
  if(isDir()){const c=await sb.from('clase_formato').select('*').eq('colegio_id',M.colegio_id||0).maybeSingle();Z.cf=c.data||null;if(Z.cf&&!Z.cfSecs)Z.cfSecs=(Z.cf.secciones||[]).join('\n')}
  Z.ult=null;
}
/* ---------- Documentos imprimibles ---------- */
function hdr(titulo){return`${lhHtml(18)}<h2 style="text-align:center;margin:10px 0 2px;font-size:14pt">${titulo}</h2>`}
function fila(a,b){return`<tr><td style="border:1px solid #000;padding:6px;width:32%;font-weight:700;background:#f1f5f9">${a}</td><td style="border:1px solid #000;padding:6px">${b||'&nbsp;'}</td></tr>`}
function datosDoc(sol,persona){
  const L=LH(),r=rector();
  const nombre=sol?(sol.solicitante_id===M.id?M.full_name:nom(sol.solicitante_id)):'';
  const doc=sol&&sol.solicitante_id===M.id?(M.document||''):'';
  return`<table style="width:100%;border-collapse:collapse;font-size:10.5pt;margin-top:8px">
   ${fila('Institución',e(L.l1))}${fila('Rector(a)',e(r?r.full_name:''))}${fila('Dirigido a',e(sol?nom(sol.destinatario_id):''))}
   ${fila(persona==='administrativo'?'Nombre del funcionario':'Nombre del docente',e(nombre))}${fila('Documento de identidad',e(doc))}
   ${persona==='administrativo'?fila('Cargo',''):fila('Área / asignaturas',e(sol&&sol.solicitante_id===M.id?[M.area,(M.asignaturas||[]).join(', ')].filter(Boolean).join(' · '):''))}</table>`;
}
function htmlSolicitud(sol,persona){
  const s=sol||{};
  return`<div style="font-family:Arial,Helvetica,sans-serif;color:#000">${hdr('SOLICITUD DE PERMISO')}
  <p style="text-align:right;font-size:10pt">Fecha de solicitud: ${s.created_at?fd(s.created_at):fd(new Date().toISOString().slice(0,10))}</p>
  ${datosDoc(sol,persona)}
  <table style="width:100%;border-collapse:collapse;font-size:10.5pt;margin-top:8px">${fila('Motivo',e(s.motivo))}${fila('Desde',s.fecha_desde?fd(s.fecha_desde)+(s.hora_desde?' · '+e(s.hora_desde):''):'')}${fila('Hasta',s.fecha_hasta?fd(s.fecha_hasta)+(s.hora_hasta?' · '+e(s.hora_hasta):''):'')}${fila('Descripción',e(s.detalle))}${fila('Cómo se compensará o dejará el trabajo',e(s.compensacion))}</table>
  <div style="display:flex;justify-content:space-between;margin-top:60px;font-size:10pt"><div style="width:45%;border-top:1px solid #000;text-align:center;padding-top:4px">Firma de quien solicita</div><div style="width:45%;border-top:1px solid #000;text-align:center;padding-top:4px">Visto bueno rector(a) o coordinador(a)</div></div></div>`;
}
function htmlRecibido(sol,persona){
  const s=sol||{};const resp=s.respondido_por?nom(s.respondido_por):'';
  return`<div style="font-family:Arial,Helvetica,sans-serif;color:#000">${hdr('RECIBIDO Y RESPUESTA DE PERMISO')}
  <p style="text-align:right;font-size:10pt">Fecha de respuesta: ${s.respondido_at?fd(s.respondido_at):'______________'}</p>
  ${datosDoc(sol,persona)}
  <table style="width:100%;border-collapse:collapse;font-size:10.5pt;margin-top:8px">${fila('Motivo del permiso',e(s.motivo))}${fila('Fechas',s.fecha_desde?fd(s.fecha_desde)+' al '+fd(s.fecha_hasta):'')}
  ${fila('Respuesta',s.estado&&s.estado!=='pendiente'?'<b>'+(s.estado==='aprobado'?'APROBADO':'NO APROBADO')+'</b>':'☐ Aprobado &nbsp;&nbsp; ☐ No aprobado')}${fila('Observaciones',e(s.respuesta))}${fila('Respondió',e(resp))}</table>
  <div style="display:flex;justify-content:space-between;margin-top:60px;font-size:10pt"><div style="width:45%;border-top:1px solid #000;text-align:center;padding-top:4px">Firma rector(a) o coordinador(a)</div><div style="width:45%;border-top:1px solid #000;text-align:center;padding-top:4px">Recibido por el solicitante</div></div></div>`;
}
/* ---------- Vista docente ---------- */
function fmtOf(persona,clase){return Z.fmt.find(x=>x.persona===persona&&x.clase===clase)}
function vDoc(){
  const f=Z.f,dests=Z.dir.filter(p=>p.role==='rector'||p.role==='coordinador');
  const fm=(clase,tit,desc)=>{const x=fmtOf('docente',clase);return`<div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px;flex:1;min-width:240px"><b>${tit}</b><p style="font-size:12px;color:#64748b;margin:4px 0 8px">${desc}</p>
   <button class="aic-link" onclick="PERM.imprimirBlanco('${clase}')">🖨️ Ver e imprimir (ya lleva el membrete, el rector y tus datos)</button>${x?`<br><button class="aic-link" onclick="PERM.bajarFmt('${clase}','docente')">⬇ Formato propio del colegio: ${e(x.nombre)}</button>`:''}</div>`};
  const pl=(clase,tit)=>{const x=fmtOf('docente',clase);return`<div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px;flex:1;min-width:240px"><b>${tit}</b><div style="font-size:12px;color:#64748b;margin:6px 0">${x?'📄 '+e(x.nombre):'Tu rector aún no ha subido esta planilla.'}</div>${x?`<button class="aic-link" onclick="PERM.bajarFmt('${clase}','docente')">⬇ Descargar</button>`:''}</div>`};
  const mis=Z.perm.map(p=>`<tr><td>${ft(p.created_at)}</td><td>${e(p.motivo)}</td><td>${fd(p.fecha_desde)} – ${fd(p.fecha_hasta)}</td><td>${e(nom(p.destinatario_id))}</td><td>${p.estado==='aprobado'?'✅ Aprobado':p.estado==='negado'?'⛔ No aprobado':'🕒 Pendiente'}${p.respuesta?`<br><small>${e(p.respuesta)}</small>`:''}</td><td><button class="aic-link" onclick="PERM.imprimirId('${p.id}','solicitud')">Solicitud</button>${p.estado!=='pendiente'?` <button class="aic-link" onclick="PERM.imprimirId('${p.id}','recibido')">Recibido</button>`:''}</td></tr>`).join('');
  const ult=Z.ult?`<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px;margin-bottom:12px"><b>✅ Solicitud enviada por la plataforma.</b> Puedes avisarle también:<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">${MSG.avisoBtns(Z.ult.persona,Z.ult.asunto,Z.ult.texto)}<button class="aic-link" onclick="PERM.imprimirId('${Z.ult.id}','solicitud')">🖨️ Imprimir mi solicitud</button></div></div>`:'';
  return`<div style="display:grid;gap:14px">
  <div class="aic-card" style="padding:16px"><h3 style="font-weight:800;font-size:17px">🗓 Formato de permisos</h3><p style="font-size:13px;color:#64748b;margin:4px 0 10px">Estos son los dos formatos. Se llenan solos con el membrete del colegio, los datos del rector y los tuyos.</p>
   <div style="display:flex;flex-wrap:wrap;gap:12px">${fm('solicitud','1. Formato de solicitud de permiso','Con este pides el permiso.')}${fm('recibido','2. Formato de recibido del permiso','Con este el rector o el coordinador te responden.')}</div></div>
  <div class="aic-card" style="padding:16px"><h3 style="font-weight:800;font-size:17px">📋 Planillas del colegio</h3><p style="font-size:13px;color:#64748b;margin:4px 0 10px">Descarga las planillas que subió tu rector.</p><div style="display:flex;flex-wrap:wrap;gap:12px">${pl('planilla_asistencia','Planilla de asistencia')}${pl('planilla_notas','Planilla de notas')}</div>${(Z.cursos||[]).length?`<div style="margin-top:12px;padding-top:10px;border-top:1px solid #e2e8f0"><b style="font-size:14px">Planilla lista con mis estudiantes</b><p style="font-size:12px;color:#64748b;margin:4px 0 8px">La plataforma toma el modelo de tu colegio y escribe los nombres de tu curso. Si tu rector no subió un modelo, te arma una con el membrete.</p><div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><select style="border:1px solid #cbd5e1;border-radius:8px;padding:8px" onchange="PERM.setCur(this.value)">${Z.cursos.map(c=>`<option value="${c.id}" ${c.id===Z.cur?'selected':''}>${c.grade===0?'Transición':c.grade+'°'} ${e(c.name)}</option>`).join('')}</select><button onclick="PERM.planilla('planilla_asistencia')" style="background:#246be0;color:#fff;padding:9px 14px;border-radius:10px;font-weight:800">⬇ Asistencia de mi curso</button><button onclick="PERM.planilla('planilla_notas')" style="background:#246be0;color:#fff;padding:9px 14px;border-radius:10px;font-weight:800">⬇ Notas de mi curso</button></div></div>`:''}</div>
  <div class="aic-card" style="padding:16px">${ult}<h3 style="font-weight:800;font-size:17px">✍️ Diligenciar en línea</h3><p style="font-size:13px;color:#64748b;margin:4px 0 10px">Solo llenas lo que te toca. Tu nombre, tu documento y el colegio ya van puestos.</p>
   <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">
   <label style="font-size:13px">Enviar a<select ${inp} onchange="PERM.f.dest=this.value"><option value="">Elige…</option>${dests.map(p=>`<option value="${p.id}" ${f.dest===p.id?'selected':''}>${e(p.full_name)} · ${p.role==='rector'?'Rector':'Coordinador'}</option>`).join('')}</select></label>
   <label style="font-size:13px">Motivo<select ${inp} onchange="PERM.f.motivo=this.value"><option value="">Elige…</option>${MOTIVOS.map(m=>`<option ${f.motivo===m?'selected':''}>${m}</option>`).join('')}</select></label>
   <label style="font-size:13px">Desde (fecha)<input type="date" ${inp} value="${f.desde}" onchange="PERM.f.desde=this.value"></label>
   <label style="font-size:13px">Hasta (fecha)<input type="date" ${inp} value="${f.hasta}" onchange="PERM.f.hasta=this.value"></label>
   <label style="font-size:13px">Hora de salida (opcional)<input type="time" ${inp} value="${f.hd}" onchange="PERM.f.hd=this.value"></label>
   <label style="font-size:13px">Hora de regreso (opcional)<input type="time" ${inp} value="${f.hh}" onchange="PERM.f.hh=this.value"></label></div>
   <label style="font-size:13px;display:block;margin-top:8px">Descripción (opcional)<textarea rows="2" ${inp} oninput="PERM.f.detalle=this.value">${e(f.detalle)}</textarea></label>
   <label style="font-size:13px;display:block;margin-top:8px">Cómo dejarás o compensarás tus clases (opcional)<textarea rows="2" ${inp} oninput="PERM.f.comp=this.value">${e(f.comp)}</textarea></label>
   <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px"><button onclick="PERM.enviar()" ${Z.busy?'disabled':''} style="background:#246be0;color:#fff;padding:10px 16px;border-radius:10px;font-weight:800">Enviar solicitud</button><button onclick="PERM.imprimirForm()" style="background:#e2e8f0;padding:10px 16px;border-radius:10px;font-weight:700">🖨️ Descargar / imprimir</button></div></div>
  <div class="aic-card" style="padding:16px"><h3 style="font-weight:800;font-size:17px">Mis solicitudes</h3><div class="aic-table-wrap" style="margin-top:8px"><table><thead><tr><th>FECHA</th><th>MOTIVO</th><th>DÍAS</th><th>PARA</th><th>ESTADO</th><th></th></tr></thead><tbody>${mis||'<tr><td colspan="6">Todavía no has pedido permisos.</td></tr>'}</tbody></table></div></div></div>`;
}
/* ---------- Vista rector / coordinador ---------- */
function vDir(){
  const celda=(persona,clase)=>{const x=fmtOf(persona,clase);return`<div style="border:1px solid #e2e8f0;border-radius:12px;padding:10px;flex:1;min-width:230px"><b>${clase==='solicitud'?'Formato de solicitud':'Formato de recibido'}</b> <small style="color:#64748b">(${persona==='docente'?'docentes':'administrativos'})</small>
   <div style="font-size:12px;margin:6px 0">${x?`📄 ${e(x.nombre)} <button class="aic-link" onclick="PERM.bajarFmt('${clase}','${persona}')">⬇</button> <button class="aic-link" onclick="PERM.quitarFmt('${clase}','${persona}')">🗑</button>`:'Sin archivo propio: se usa el de la plataforma (ya listo).'}</div>
   <input type="file" accept=".pdf,.doc,.docx" onchange="PERM.subirFmt('${clase}','${persona}',this.files[0])" style="font-size:12px"></div>`};
  const plan=(clase,tit)=>{const x=fmtOf('docente',clase);return`<div style="border:1px solid #e2e8f0;border-radius:12px;padding:10px;flex:1;min-width:230px"><b>${tit}</b>
   <div style="font-size:12px;margin:6px 0">${x?`📄 ${e(x.nombre)} <button class="aic-link" onclick="PERM.bajarFmt('${clase}','docente')">⬇</button> <button class="aic-link" onclick="PERM.quitarFmt('${clase}','docente')">🗑</button>`:'Aún no has subido ninguna.'}</div>
   <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" onchange="PERM.subirFmt('${clase}','docente',this.files[0])" style="font-size:12px"></div>`};
  const pend=Z.perm.filter(p=>p.estado==='pendiente'),resp=Z.perm.filter(p=>p.estado!=='pendiente');
  const fila=p=>{const s=per(p.solicitante_id);return`<div style="border:1px solid ${p.estado==='pendiente'?'#fcd34d':'#e2e8f0'};border-radius:12px;padding:10px 12px;margin-bottom:8px"><b>${e(nom(p.solicitante_id))}</b> · ${e(p.motivo)}<div style="font-size:12px;color:#64748b">${fd(p.fecha_desde)} – ${fd(p.fecha_hasta)}${p.hora_desde?' · '+e(p.hora_desde)+(p.hora_hasta?'–'+e(p.hora_hasta):''):''} · enviado ${ft(p.created_at)}</div>${p.detalle?`<div style="font-size:13px;margin-top:4px">${e(p.detalle)}</div>`:''}${p.compensacion?`<div style="font-size:13px;color:#475569">Compensación: ${e(p.compensacion)}</div>`:''}
   ${p.estado==='pendiente'?`<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;align-items:center"><input id="pr-${p.id}" placeholder="Comentario (opcional)" style="flex:1;min-width:200px;border:1px solid #cbd5e1;border-radius:8px;padding:8px"><button onclick="PERM.responder('${p.id}','aprobado')" style="background:#16a34a;color:#fff;padding:8px 12px;border-radius:8px;font-weight:700">Aprobar</button><button onclick="PERM.responder('${p.id}','negado')" style="background:#dc2626;color:#fff;padding:8px 12px;border-radius:8px;font-weight:700">No aprobar</button></div>`
   :`<div style="margin-top:6px;font-size:13px">${p.estado==='aprobado'?'✅ Aprobado':'⛔ No aprobado'}${p.respuesta?' · '+e(p.respuesta):''}</div><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px">${MSG.avisoBtns(s,'Respuesta a tu permiso',`Tu permiso (${p.motivo}) fue ${p.estado==='aprobado'?'APROBADO':'NO APROBADO'}.${p.respuesta?' '+p.respuesta:''}`)}<button class="aic-link" onclick="PERM.imprimirId('${p.id}','recibido')">🖨️ Recibido</button></div>`}</div>`};
  return`<div style="display:grid;gap:14px">
  <div class="aic-card" style="padding:16px"><h3 style="font-weight:800;font-size:17px">📄 Formatos de permisos del colegio</h3><p style="font-size:13px;color:#64748b;margin:4px 0 10px">Sube el formato de tu colegio (PDF o Word). Los docentes lo ven en <b>Formato de permisos</b>. Si no subes ninguno, usan el de la plataforma, que ya sale con el membrete, tus datos y los del docente.</p>
   <div style="display:flex;flex-wrap:wrap;gap:12px">${celda('docente','solicitud')}${celda('docente','recibido')}</div>
   <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:12px">${celda('administrativo','solicitud')}${celda('administrativo','recibido')}</div>
   <div style="margin-top:10px"><button class="aic-link" onclick="PERM.imprimirBlancoAdm()">🖨️ Imprimir el formato de la plataforma para administrativos</button></div></div>
  <div class="aic-card" style="padding:16px"><h3 style="font-weight:800;font-size:17px">📋 Planillas del colegio</h3><p style="font-size:13px;color:#64748b;margin:4px 0 10px">Sube la planilla de asistencia y la planilla de notas de tu colegio (Word, PDF o Excel). Los docentes las descargan en <b>Formato de permisos y planillas</b>.</p>
   <div style="display:flex;flex-wrap:wrap;gap:12px">${plan('planilla_asistencia','Planilla de asistencia')}${plan('planilla_notas','Planilla de notas')}</div></div>
  <div class="aic-card" style="padding:16px"><h3 style="font-weight:800;font-size:17px">✨ Formato de preparación de clase</h3><p style="font-size:13px;color:#64748b;margin:4px 0 10px">Sube el formato de preparación de clase de tu colegio (Word o PDF). La plataforma lee sus secciones y los docentes podrán elegir este formato en <b>Preparar clase con IA</b>. Si no subes ninguno, usan el de la plataforma.</p>
   ${Z.cf&&Z.cf.nombre?`<div style="font-size:13px;margin-bottom:8px">📄 Formato actual: <b>${e(Z.cf.nombre)}</b> · ${(Z.cf.secciones||[]).length} secciones <button class="aic-link" onclick="PERM.quitarCF()">🗑 Quitar</button></div>`:''}
   <input type="file" accept=".pdf,.docx" onchange="PERM.leerCF(this.files[0])" style="font-size:13px">
   <label style="font-size:13px;display:block;margin-top:10px">Secciones del formato (una por línea; corrígelas si hace falta)<textarea rows="7" style="width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:8px" oninput="PERM.cfSecs=this.value">${e(Z.cfSecs)}</textarea></label>
   <div style="margin-top:8px"><button onclick="PERM.guardarCF()" style="background:#16a34a;color:#fff;padding:9px 14px;border-radius:10px;font-weight:800">💾 Guardar formato</button></div></div>
  <div class="aic-card" style="padding:16px"><h3 style="font-weight:800;font-size:17px">🗓 Permisos pendientes (${pend.length})</h3>${pend.map(fila).join('')||'<p style="font-size:13px;color:#64748b">No hay permisos por responder.</p>'}</div>
  <div class="aic-card" style="padding:16px"><h3 style="font-weight:800;font-size:17px">Permisos respondidos</h3>${resp.map(fila).join('')||'<p style="font-size:13px;color:#64748b">Aún no hay respuestas.</p>'}</div></div>`;
}
const api={
  load,view:()=>isDir()?vDir():vDoc(),f:Z.f,
  setCur(v){Z.cur=v},
  async planilla(clase){if(!Z.cur)return toast('⚠️','Elige el curso','');await loadScript('planillas.js?v=1');await PLA.generar(clase,Z.cur)},
  imprimirBlanco(clase){const sol=null;doPrint(clase==='solicitud'?htmlSolicitud(solPropio(),'docente'):htmlRecibido(solPropio(),'docente'),{hoja:true})},
  imprimirBlancoAdm(){doPrint(htmlSolicitud(null,'administrativo'),{hoja:true})},
  imprimirForm(){const f=Z.f;doPrint(htmlSolicitud(solPropio({motivo:f.motivo,fecha_desde:f.desde,fecha_hasta:f.hasta,hora_desde:f.hd,hora_hasta:f.hh,detalle:f.detalle,compensacion:f.comp,destinatario_id:f.dest}),'docente'),{hoja:true})},
  imprimirId(id,clase){const p=Z.perm.find(x=>x.id===id);if(!p)return;doPrint(clase==='solicitud'?htmlSolicitud(p,'docente'):htmlRecibido(p,'docente'),{hoja:true})},
  async enviar(){
    if(Z.busy)return;const f=Z.f;
    if(!f.dest)return toast('⚠️','Elige a quién se lo envías','');if(!f.motivo)return toast('⚠️','Elige el motivo','');if(!f.desde||!f.hasta)return toast('⚠️','Elige las fechas','');
    Z.busy=true;
    const r=await sb.rpc('permiso_solicitar',{p_dest:f.dest,p_motivo:f.motivo,p_desde:f.desde,p_hasta:f.hasta,p_hdesde:f.hd||'',p_hhasta:f.hh||'',p_detalle:f.detalle||'',p_comp:f.comp||''});
    Z.busy=false;if(r.error)return err(r.error);
    const persona=per(f.dest);
    const texto=`${M.full_name} solicita un permiso en AULA360.\nMotivo: ${f.motivo}\nDel ${fd(f.desde)} al ${fd(f.hasta)}${f.detalle?'\n'+f.detalle:''}\nRevisa y responde en AULA360 → Documentos.`;
    const id=r.data;Object.assign(Z.f,{motivo:'',desde:'',hasta:'',hd:'',hh:'',detalle:'',comp:''});
    await load();Z.ult={id,persona,asunto:'Solicitud de permiso: '+Z.perm.find(x=>x.id===id)?.motivo,texto};R();
  },
  async responder(id,estado){
    const c=(document.getElementById('pr-'+id)?.value||'').trim();
    if(estado==='negado'&&!c&&!confirm('¿No aprobar sin escribir un comentario?'))return;
    const r=await sb.rpc('permiso_responder',{p_id:id,p_estado:estado,p_resp:c});if(r.error)return err(r.error);
    toast('✅','Respuesta enviada','Puedes avisarle también por WhatsApp o correo.');await load();R();
  },
  set cfSecs(v){Z.cfSecs=v},
  async leerCF(f){
    if(!f)return;const ext=(f.name.split('.').pop()||'').toLowerCase();
    if(!['pdf','docx'].includes(ext))return toast('⚠️','Formato no válido','Sube un Word (.docx) o un PDF.');
    toast('⏳','Leyendo el formato…',f.name);
    try{
      const lines=await readFile(f,ext==='pdf'?'pdf':'word'),seen=new Set(),out=[];
      lines.forEach(l=>{l=String(l||'').replace(/\s*;\s*/g,' · ').trim();if(l.length>=3&&l.length<=70&&!seen.has(l.toLowerCase())){seen.add(l.toLowerCase());out.push(l)}});
      Z.cfSecs=out.slice(0,30).join('\n');Z.cfFile=f;Z.cfNombre=f.name;
      toast('✅','Secciones leídas','Revisa la lista y pulsa Guardar formato.');
    }catch(x){return err(x)}
    R();
  },
  async guardarCF(){
    const secs=Z.cfSecs.split(/\n/).map(x=>x.trim()).filter(Boolean).slice(0,40);
    if(!secs.length)return toast('⚠️','Escribe o sube las secciones del formato','');
    let path=Z.cf&&Z.cf.path||null,nombre=Z.cf&&Z.cf.nombre||Z.cfNombre||'Formato del colegio';
    if(Z.cfFile){
      const np=M.colegio_id+'/clase-'+Date.now()+'-'+Z.cfFile.name.replace(/[^\w.\-]+/g,'_');
      const up=await sb.storage.from('formatos-colegio').upload(np,Z.cfFile);if(up.error)return err(up.error);
      if(path)sb.storage.from('formatos-colegio').remove([path]);path=np;nombre=Z.cfFile.name;
    }
    const w=await sb.from('clase_formato').upsert({colegio_id:M.colegio_id,path,nombre,secciones:secs,updated_by:M.id,updated_at:new Date().toISOString()},{onConflict:'colegio_id'});
    if(w.error)return err(w.error);
    Z.cfFile=null;toast('✅','Formato guardado','Los docentes ya pueden elegirlo.');await load();R();
  },
  async quitarCF(){
    if(!confirm('¿Quitar el formato de clase del colegio? Los docentes usarán el de la plataforma.'))return;
    const d=await sb.from('clase_formato').delete().eq('colegio_id',M.colegio_id);if(d.error)return err(d.error);
    if(Z.cf&&Z.cf.path)sb.storage.from('formatos-colegio').remove([Z.cf.path]);Z.cf=null;Z.cfSecs='';await load();R();
  },
  async subirFmt(clase,persona,f){
    if(!f)return;
    if(!/\.(pdf|docx?|xlsx?)$/i.test(f.name))return toast('⚠️','Formato no válido','Sube un PDF, Word o Excel.');
    if(f.size>15*1024*1024)return toast('⚠️','Archivo muy pesado','Máximo 15 MB.');
    const path=M.colegio_id+'/'+persona+'-'+clase+'-'+Date.now()+'-'+f.name.replace(/[^\w.\-]+/g,'_');
    const up=await sb.storage.from('formatos-colegio').upload(path,f);if(up.error)return err(up.error);
    const old=fmtOf(persona,clase);
    const w=await sb.from('permiso_formatos').upsert({colegio_id:M.colegio_id,persona,clase,path,nombre:f.name,updated_by:M.id,updated_at:new Date().toISOString()},{onConflict:'colegio_id,persona,clase'});
    if(w.error)return err(w.error);
    if(old)sb.storage.from('formatos-colegio').remove([old.path]);
    toast('✅','Formato guardado','');await load();R();
  },
  async quitarFmt(clase,persona){
    if(!confirm('¿Quitar este formato? Se usará el de la plataforma.'))return;
    const x=fmtOf(persona,clase);if(!x)return;
    const d=await sb.from('permiso_formatos').delete().eq('colegio_id',M.colegio_id).eq('persona',persona).eq('clase',clase);if(d.error)return err(d.error);
    sb.storage.from('formatos-colegio').remove([x.path]);await load();R();
  },
  async bajarFmt(clase,persona){const x=fmtOf(persona,clase);if(!x)return;
    const u=await sb.storage.from('formatos-colegio').createSignedUrl(x.path,120,{download:x.nombre});if(u.error)return err(u.error);window.open(u.data.signedUrl,'_blank')}
};
function solPropio(o){return Object.assign({solicitante_id:M.id,destinatario_id:'',created_at:null},o||{})}
return api;
})();
