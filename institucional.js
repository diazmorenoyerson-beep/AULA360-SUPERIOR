/* AULA360 · Informe institucional unificado
   Consolida resultados reales de periodo, Saber 11 en línea, impresos y diagnósticos.
   Conserva separadas las escalas de calificación de cada fuente. */
(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=n=>Number(n||0).toLocaleString('es-CO',{maximumFractionDigits:2});
  const pct=n=>n==null?'—':num(n)+'%';
  const date=s=>s?new Date(s).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'}):'—';
  let data=null,loading=false,error='';
  const expanded=new Set();
  const filters={source:'all',course:'all',query:''};
  const sourceKeys=['periodo','saber_online','simulacros_generales','impresos','diagnosticos'];
  function matches(x){
    const course=String(x.course||'');
    const hay=[x.title,x.course,x.subject,x.competency,x.grade,x.period,...(x.students||[]).map(z=>z.student)].join(' ').toLocaleLowerCase('es');
    return (filters.course==='all'||course===filters.course)&&(!filters.query||hay.includes(filters.query.toLocaleLowerCase('es')));
  }
  function filteredRows(key){return rowsFor(key).filter(matches)}
  function filterBar(){
    const all=[...sourceKeys.flatMap(k=>rowsFor(k)),...(data?.competencies||[])];
    const courses=[...new Set(all.map(x=>String(x.course||'')).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
    return '<section class="aic-card" style="padding:14px;margin:14px 0;display:flex;gap:12px;flex-wrap:wrap;align-items:end">'+
      '<label style="display:grid;gap:5px;font-size:12px;font-weight:700;color:#526579;min-width:190px">FUENTE DE EVALUACIÓN<select id="inst-source" onchange="INST.filters()" style="padding:10px;border:1px solid #d8e5ee;border-radius:10px;background:#fff"><option value="all" '+(filters.source==='all'?'selected':'')+'>Todas las fuentes</option><option value="periodo" '+(filters.source==='periodo'?'selected':'')+'>Pruebas de periodo</option><option value="saber_online" '+(filters.source==='saber_online'?'selected':'')+'>Saber 11 en línea</option><option value="simulacros_generales" '+(filters.source==='simulacros_generales'?'selected':'')+'>Simulacros generales</option><option value="impresos" '+(filters.source==='impresos'?'selected':'')+'>Simulacros impresos</option><option value="diagnosticos" '+(filters.source==='diagnosticos'?'selected':'')+'>Diagnósticos</option><option value="competencias" '+(filters.source==='competencias'?'selected':'')+'>Análisis por competencias</option></select></label>'+
      '<label style="display:grid;gap:5px;font-size:12px;font-weight:700;color:#526579;min-width:190px">CURSO<select id="inst-course" onchange="INST.filters()" style="padding:10px;border:1px solid #d8e5ee;border-radius:10px;background:#fff"><option value="all">Todos los cursos</option>'+courses.map(c=>'<option value="'+esc(c)+'" '+(filters.course===c?'selected':'')+'>'+esc(c)+'</option>').join('')+'</select></label>'+
      '<label style="display:grid;gap:5px;font-size:12px;font-weight:700;color:#526579;flex:1;min-width:220px">BUSCAR EVALUACIÓN O ESTUDIANTE<input id="inst-query" value="'+esc(filters.query)+'" onchange="INST.filters()" placeholder="Nombre, asignatura o estudiante" style="padding:10px;border:1px solid #d8e5ee;border-radius:10px;background:#fff"></label>'+
      '<button class="aic-link" onclick="INST.resetFilters()" style="padding:10px 14px">Limpiar filtros</button></section>';
  }
  function setFilters(){const a=document.getElementById('inst-source'),b=document.getElementById('inst-course'),c=document.getElementById('inst-query');if(a)filters.source=a.value;if(b)filters.course=b.value;if(c)filters.query=c.value.trim();render()}
  function resetFilters(){filters.source='all';filters.course='all';filters.query='';render()}
  async function load(){
    loading=true;error='';render();
    try{
      const [r,cr,gr]=await Promise.all([sb.rpc('informe_institucional'),sb.rpc('informe_competencias_institucional'),sb.rpc('informe_simulacros_generales')]);
      if(r.error)throw r.error;
      if(cr.error)throw cr.error;
      if(gr.error)throw gr.error;
      data=r.data||{};
      data.competencies=cr.data?.competencies||[];
      data.simulacros_generales=gr.data?.rows||[];
      expanded.clear();
    }catch(e){error=e?.message||String(e);data=null}
    finally{loading=false;render()}
  }
  function rowsFor(key){
    return (data&&Array.isArray(data[key])?data[key]:[]);
  }
  function studentTable(x,key){
    const id=key+':'+x.test_id+':'+x.course_id;
    const open=expanded.has(id),students=Array.isArray(x.students)?x.students:[];
    const isPeriodo=key==='periodo',isOnline=key==='saber_online',isGeneral=key==='simulacros_generales';
    const cols=isPeriodo
      ? '<th>ESTUDIANTE</th><th>INTENTOS</th><th>MEJOR NOTA / 100</th><th>ÚLTIMA NOTA / 100</th><th>ÚLTIMO ENVÍO</th><th>ENTREGA</th>'
      : isOnline||isGeneral
      ? '<th>ESTUDIANTE</th><th>INTENTOS</th><th>CORRECTAS</th><th>PREGUNTAS</th><th>ACIERTOS</th><th>ÚLTIMA ACTIVIDAD</th>'
      : '<th>ESTUDIANTE</th><th>HOJAS / CUADERNILLOS</th><th>CORRECTAS</th><th>PREGUNTAS</th><th>ACIERTOS</th><th>ÚLTIMA CALIFICACIÓN</th>';
    const body=students.map(s=>'<tr><td><b>'+esc(s.student||'Estudiante')+'</b></td>'+
      (isPeriodo?'<td>'+num(s.attempts)+'</td><td>'+num(s.best_score)+'</td><td>'+num(s.latest_score)+'</td><td>'+date(s.latest_submitted_at)+'</td><td>'+(s.automatic?'Automática':'Normal')+'</td>'
      :'<td>'+num(isOnline||isGeneral?s.attempts:s.sheets)+'</td><td>'+num(s.correct)+'</td><td>'+num(s.total)+'</td><td><b>'+pct(s.pct)+'</b></td><td>'+date(s.last_at)+'</td>')+'</tr>').join('');
    const avg=isPeriodo||isGeneral?num(isPeriodo?x.average_score:x.average_pct):pct(x.average_pct);
    const coverage=Number(x.enrolled)>0?Number(x.participants||0)/Number(x.enrolled)*100:null;
    const pending=Math.max(0,Number(x.enrolled||0)-Number(x.participants||0));
    const attempts=isPeriodo||isOnline||isGeneral?num(x.attempts):num(x.sheets);
    const label=isPeriodo||isOnline||isGeneral?'Intentos':'Hojas calificadas';
    return '<article class="aic-card" style="padding:14px;margin:10px 0">'+
      '<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center">'+
      '<div><b>'+esc(x.title||'Evaluación')+'</b><div style="font-size:12px;color:#64748b;margin-top:3px">'+esc(x.course||'Curso')+' · '+esc(x.grade??'')+'°'+(x.subject?' · '+esc(x.subject):'')+(x.period?' · Periodo '+esc(x.period):'')+(x.exam_date?' · '+date(x.exam_date):'')+'</div></div>'+
      '<button class="aic-link" onclick="INST.toggle(\''+id+'\')">'+(open?'Ocultar estudiantes':'Ver estudiantes ('+students.length+')')+'</button></div>'+
      '<div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:12px;font-size:13px">'+
      '<span><small style="color:#64748b">Matriculados</small><br><b>'+num(x.enrolled)+'</b></span>'+
      '<span><small style="color:#64748b">Participantes</small><br><b>'+num(x.participants)+'</b></span>'+
      '<span><small style="color:#64748b">Cobertura</small><br><b>'+pct(coverage)+'</b></span>'+
      '<span><small style="color:#64748b">Pendientes</small><br><b>'+num(pending)+'</b></span>'+
      '<span><small style="color:#64748b">'+label+'</small><br><b>'+attempts+'</b></span>'+
      '<span><small style="color:#64748b">'+(isPeriodo||isGeneral?'Promedio de nota / 100':'Promedio de aciertos')+'</small><br><b>'+avg+(isPeriodo?'':'')+'</b></span></div>'+
      (open?'<div class="aic-table-wrap" style="margin-top:12px"><table><thead><tr>'+cols+'</tr></thead><tbody>'+(body||'<tr><td colspan="6">No hay estudiantes con entregas calificadas.</td></tr>')+'</tbody></table></div>':'')+
      '</article>';
  }
  function section(key,title,desc){
    const list=filteredRows(key);
    if(filters.source!=='all'&&filters.source!==key)return '';
    return '<section style="margin-top:20px"><div class="aic-section-head"><div><h2>'+title+'</h2><p>'+desc+'</p></div><span class="aic-period">'+list.length+' registros curso-evaluación</span></div>'+
      (list.length?list.map(x=>studentTable(x,key)).join(''):'<div class="aic-card aic-empty" style="padding:20px"><b>Aún no hay resultados registrados en esta fuente</b><p>Cuando se publiquen evaluaciones y se registren entregas, aparecerán aquí.</p></div>')+'</section>';
  }
  function competencySection(){
    if(filters.source!=='all'&&filters.source!=='competencies')return '';
    const rows=(Array.isArray(data?.competencies)?data.competencies:[]).filter(matches);
    const groups=new Map();
    rows.forEach(x=>{const k=x.test_id+':'+x.course_id;const g=groups.get(k)||{title:x.title,kind:x.kind,course:x.course,grade:x.grade,date:x.exam_date,items:[]};g.items.push(x);groups.set(k,g)});
    return '<section style="margin-top:20px"><div class="aic-section-head"><div><h2>Análisis por competencias</h2><p>Desglose de simulacros impresos y diagnósticos; no mezcla resultados de pruebas online ni escalas distintas.</p></div><span class="aic-period">'+rows.length+' competencias evaluadas</span></div>'+
      (groups.size?[...groups.values()].map(g=>'<article class="aic-card" style="padding:14px;margin:10px 0"><b>'+esc(g.title)+'</b><div style="font-size:12px;color:#64748b;margin:3px 0 10px">'+esc(g.course)+' · '+esc(g.grade)+'° · '+(g.kind==='diagnostico'?'Diagnóstico':'Simulacro impreso')+(g.date?' · '+date(g.date):'')+'</div><div class="aic-table-wrap"><table><thead><tr><th>COMPETENCIA</th><th>ACIERTOS</th><th>PREGUNTAS</th><th>ESTUDIANTES</th><th>DOMINIO</th><th>ORIENTACIÓN</th></tr></thead><tbody>'+g.items.sort((a,b)=>Number(a.pct??100)-Number(b.pct??100)).map(x=>{const n=Number(x.pct||0),level=n<40?'Prioridad alta':n<60?'Requiere refuerzo':n<80?'En desarrollo':'Fortaleza';return '<tr><td><b>'+esc(x.competency)+'</b></td><td>'+num(x.correct)+'</td><td>'+num(x.total)+'</td><td>'+num(x.students)+'</td><td><b>'+pct(x.pct)+'</b></td><td>'+level+'</td></tr>'}).join('')+'</tbody></table></div></article>').join(''):'<div class="aic-card aic-empty" style="padding:20px"><b>Sin competencias clasificadas en resultados</b><p>Este informe aparecerá cuando se califiquen hojas con preguntas que tengan una competencia registrada en el banco.</p></div>')+'</section>';
  }
  function exportCsv(){
    const rows=[['fuente','evaluacion','curso','grado','estudiante','intentos_hojas','correctas','preguntas','porcentaje_aciertos','mejor_nota_100','ultima_nota_100','fecha']];
    if(filters.source==='all'||filters.source==='competencies'){
      const competencies=(Array.isArray(data?.competencies)?data.competencies:[]).filter(matches);
      for(const x of competencies)rows.push(['Análisis por competencia',x.title,x.course,x.grade,x.competency,'',x.correct,x.total,x.pct??'','','',x.exam_date??'']);
    }
    for(const key of ['periodo','saber_online','simulacros_generales','impresos','diagnosticos']){
      if(filters.source!=='all'&&filters.source!==key)continue;
      const label={periodo:'Prueba de periodo',saber_online:'Saber 11 en línea',simulacros_generales:'Simulacro general',impresos:'Simulacro impreso',diagnosticos:'Diagnóstico'}[key];
      for(const x of filteredRows(key))for(const st of (x.students||[])){
        rows.push([label,x.title,x.course,x.grade,st.student,st.attempts??st.sheets??'',st.correct??'',st.total??'',st.pct??'',st.best_score??'',st.latest_score??'',st.last_at??st.latest_submitted_at??'']);
      }
    }
    const csv=String.fromCharCode(65279)+rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join(String.fromCharCode(13,10));
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='informe_institucional_aula360.csv';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(a.href);
  }

  function view(){
    if(loading)return '<div class="aic-card" style="padding:24px">⏳ Consultando los resultados institucionales…</div>';
    if(error)return '<div class="aic-card" style="padding:20px"><b>No se pudo cargar el informe</b><p style="color:#b91c1c;font-size:13px;margin:6px 0">'+esc(error)+'</p><button class="aic-link" onclick="INST.load()">Reintentar</button></div>';
    if(!data)return '<div class="aic-card" style="padding:20px"><b>Informe institucional</b><p>Consulta las pruebas y simulacros registrados en AULA360.</p><button class="aic-link" onclick="INST.load()">Cargar informe</button></div>';
    const countRows=[['periodo','Pruebas de periodo','🧪'],['saber_online','Saber 11 en línea','💻'],['simulacros_generales','Simulacros generales','📝'],['impresos','Simulacros impresos','🖨️'],['diagnosticos','Diagnósticos','🩺']];
    const counts=countRows.filter(c=>filters.source==='all'||filters.source===c[0]).map(c=>[c[1],filteredRows(c[0]).length,c[2]]);
    const scope=data.scope?.role==='rector'?'Vista institucional · Rector':data.scope?.role==='coordinador'?'Vista institucional · Coordinador':'Vista de tus cursos · Docente';
    return '<div><section class="aic-hero"><div class="aic-hero-copy"><span class="aic-kicker">CENTRO DE EVALUACIÓN</span><h2>Informe institucional unificado</h2><p>Participación y resultados de las cinco fuentes de evaluación, sin mezclar sus escalas.</p><div class="aic-hero-actions"><button onclick="INST.load()">↻ Actualizar informe</button><button class="ghost" onclick="INST.csv()">↓ Exportar CSV</button></div></div><div class="aic-hero-art"><div class="aic-orbit orbit1"></div><div class="aic-orbit orbit2"></div><div class="aic-book">📊</div><div class="aic-cap">🎓</div></div></section>'+
      '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin:12px 0"><span class="aic-chip">'+scope+'</span><span style="font-size:12px;color:#64748b">Actualizado: '+date(data.generated_at)+'</span></div>'+
      '<section class="aic-kpis">'+counts.map(c=>'<article class="aic-kpi"><div class="aic-kpi-icon blue">'+c[2]+'</div><div><small>'+c[0]+'</small><strong>'+num(c[1])+'</strong><span>Registros curso-evaluación</span></div></article>').join('')+'</section>'+filterBar()+
      '<div class="aic-card" style="padding:14px;margin-top:12px;font-size:12px;color:#64748b">Las pruebas de periodo conservan su nota de 0 a 100. Saber 11 en línea, impresos y diagnósticos muestran porcentaje de respuestas correctas. Los porcentajes no se convierten en puntajes oficiales ICFES. Los cursos sin estudiantes o sin entregas no generan resultados ficticios.</div>'+
      section('periodo','Pruebas de periodo','Notas, participación, intentos y seguimiento por estudiante · escala 0–100')+
      section('saber_online','Simulacros Saber 11 en línea','Participación y porcentaje de respuestas correctas por estudiante')+
      section('simulacros_generales','Simulacros generales','Resultados de simulacros por asignatura y curso · escala porcentual 0–100')+
      section('impresos','Simulacros Saber 11 impresos','Hojas calificadas y resultados consolidados por estudiante')+
      section('diagnosticos','Diagnósticos por grupo','Resultados de las hojas de diagnóstico y áreas evaluadas')+
      competencySection()+
      '<footer class="aic-footer"><b>AULA360</b> · Informe calculado con registros reales de la base de datos.</footer></div>';
  }
  function toggle(id){expanded.has(id)?expanded.delete(id):expanded.add(id);render()}
  function render(){const root=document.getElementById('app');if(!root)return;const body=view();if(window.AulaDashboard&&M&&(M.role==='prof'||M.role==='rector'||M.role==='coordinador'))root.innerHTML=AulaDashboard.shell(D,M,tab,body,vLive(),{doc:D.pend,dir:D.pendDir});else root.innerHTML=body}
  window.INST={load,view,toggle,csv:exportCsv,filters:setFilters,resetFilters};
})();