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
  async function load(){
    loading=true;error='';render();
    try{
      const r=await sb.rpc('informe_institucional');
      if(r.error)throw r.error;
      data=r.data||{};expanded.clear();
    }catch(e){error=e?.message||String(e);data=null}
    finally{loading=false;render()}
  }
  function rowsFor(key){
    return (data&&Array.isArray(data[key])?data[key]:[]);
  }
  function studentTable(x,key){
    const id=key+':'+x.test_id+':'+x.course_id;
    const open=expanded.has(id),students=Array.isArray(x.students)?x.students:[];
    const isPeriodo=key==='periodo',isOnline=key==='saber_online';
    const cols=isPeriodo
      ? '<th>ESTUDIANTE</th><th>INTENTOS</th><th>MEJOR NOTA / 100</th><th>ÚLTIMA NOTA / 100</th><th>ÚLTIMO ENVÍO</th><th>ENTREGA</th>'
      : isOnline
      ? '<th>ESTUDIANTE</th><th>INTENTOS</th><th>CORRECTAS</th><th>PREGUNTAS</th><th>ACIERTOS</th><th>ÚLTIMA ACTIVIDAD</th>'
      : '<th>ESTUDIANTE</th><th>HOJAS / CUADERNILLOS</th><th>CORRECTAS</th><th>PREGUNTAS</th><th>ACIERTOS</th><th>ÚLTIMA CALIFICACIÓN</th>';
    const body=students.map(s=>'<tr><td><b>'+esc(s.student||'Estudiante')+'</b></td>'+
      (isPeriodo?'<td>'+num(s.attempts)+'</td><td>'+num(s.best_score)+'</td><td>'+num(s.latest_score)+'</td><td>'+date(s.latest_submitted_at)+'</td><td>'+(s.automatic?'Automática':'Normal')+'</td>'
      :'<td>'+num(isOnline?s.attempts:s.sheets)+'</td><td>'+num(s.correct)+'</td><td>'+num(s.total)+'</td><td><b>'+pct(s.pct)+'</b></td><td>'+date(s.last_at)+'</td>')+'</tr>').join('');
    const avg=isPeriodo?num(x.average_score):pct(x.average_pct);
    const coverage=Number(x.enrolled)>0?Number(x.participants||0)/Number(x.enrolled)*100:null;
    const pending=Math.max(0,Number(x.enrolled||0)-Number(x.participants||0));
    const attempts=isPeriodo||isOnline?num(x.attempts):num(x.sheets);
    const label=isPeriodo?'Intentos':isOnline?'Intentos':'Hojas calificadas';
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
      '<span><small style="color:#64748b">'+(isPeriodo?'Promedio de nota / 100':'Promedio de aciertos')+'</small><br><b>'+avg+(isPeriodo?'':'')+'</b></span></div>'+
      (open?'<div class="aic-table-wrap" style="margin-top:12px"><table><thead><tr>'+cols+'</tr></thead><tbody>'+(body||'<tr><td colspan="6">No hay estudiantes con entregas calificadas.</td></tr>')+'</tbody></table></div>':'')+
      '</article>';
  }
  function section(key,title,desc){
    const list=rowsFor(key);
    return '<section style="margin-top:20px"><div class="aic-section-head"><div><h2>'+title+'</h2><p>'+desc+'</p></div><span class="aic-period">'+list.length+' registros curso-evaluación</span></div>'+
      (list.length?list.map(x=>studentTable(x,key)).join(''):'<div class="aic-card aic-empty" style="padding:20px"><b>Aún no hay resultados registrados en esta fuente</b><p>Cuando se publiquen evaluaciones y se registren entregas, aparecerán aquí.</p></div>')+'</section>';
  }
  function exportCsv(){
    const rows=[['fuente','evaluacion','curso','grado','estudiante','intentos_hojas','correctas','preguntas','porcentaje_aciertos','mejor_nota_100','ultima_nota_100','fecha']];
    for(const key of ['periodo','saber_online','impresos','diagnosticos']){
      const label={periodo:'Prueba de periodo',saber_online:'Saber 11 en línea',impresos:'Simulacro impreso',diagnosticos:'Diagnóstico'}[key];
      for(const x of rowsFor(key))for(const s of (x.students||[])){
        rows.push([label,x.title,x.course,x.grade,s.student,s.attempts??s.sheets??'',s.correct??'',s.total??'',s.pct??'',s.best_score??'',s.latest_score??'',s.last_at??s.latest_submitted_at??'']);
      }
    }
    const csv='\uFEFF'+rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='informe_institucional_aula360.csv';a.click();URL.revokeObjectURL(a.href);
  }
  function view(){
    if(loading)return '<div class="aic-card" style="padding:24px">⏳ Consultando los resultados institucionales…</div>';
    if(error)return '<div class="aic-card" style="padding:20px"><b>No se pudo cargar el informe</b><p style="color:#b91c1c;font-size:13px;margin:6px 0">'+esc(error)+'</p><button class="aic-link" onclick="INST.load()">Reintentar</button></div>';
    if(!data)return '<div class="aic-card" style="padding:20px"><b>Informe institucional</b><p>Consulta las pruebas y simulacros registrados en AULA360.</p><button class="aic-link" onclick="INST.load()">Cargar informe</button></div>';
    const counts=[['Pruebas de periodo',rowsFor('periodo').length,'🧪'],['Saber 11 en línea',rowsFor('saber_online').length,'💻'],['Simulacros impresos',rowsFor('impresos').length,'🖨️'],['Diagnósticos',rowsFor('diagnosticos').length,'🩺']];
    const scope=data.scope?.role==='rector'?'Vista institucional · Rector':data.scope?.role==='coordinador'?'Vista institucional · Coordinador':'Vista de tus cursos · Docente';
    return '<div><section class="aic-hero"><div class="aic-hero-copy"><span class="aic-kicker">CENTRO DE EVALUACIÓN</span><h2>Informe institucional unificado</h2><p>Participación y resultados de las cuatro fuentes de evaluación, sin mezclar sus escalas.</p><div class="aic-hero-actions"><button onclick="INST.load()">↻ Actualizar informe</button><button class="ghost" onclick="INST.csv()">↓ Exportar CSV</button></div></div><div class="aic-hero-art"><div class="aic-orbit orbit1"></div><div class="aic-orbit orbit2"></div><div class="aic-book">📊</div><div class="aic-cap">🎓</div></div></section>'+
      '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin:12px 0"><span class="aic-chip">'+scope+'</span><span style="font-size:12px;color:#64748b">Actualizado: '+date(data.generated_at)+'</span></div>'+
      '<section class="aic-kpis">'+counts.map(c=>'<article class="aic-kpi"><div class="aic-kpi-icon blue">'+c[2]+'</div><div><small>'+c[0]+'</small><strong>'+num(c[1])+'</strong><span>Registros curso-evaluación</span></div></article>').join('')+'</section>'+
      '<div class="aic-card" style="padding:14px;margin-top:12px;font-size:12px;color:#64748b">Las pruebas de periodo conservan su nota de 0 a 100. Saber 11 en línea, impresos y diagnósticos muestran porcentaje de respuestas correctas. Los porcentajes no se convierten en puntajes oficiales ICFES. Los cursos sin estudiantes o sin entregas no generan resultados ficticios.</div>'+
      section('periodo','Pruebas de periodo','Notas, participación, intentos y seguimiento por estudiante · escala 0–100')+
      section('saber_online','Simulacros Saber 11 en línea','Participación y porcentaje de respuestas correctas por estudiante')+
      section('impresos','Simulacros Saber 11 impresos','Hojas calificadas y resultados consolidados por estudiante')+
      section('diagnosticos','Diagnósticos por grupo','Resultados de las hojas de diagnóstico y áreas evaluadas')+
      '<footer class="aic-footer"><b>AULA360</b> · Informe calculado con registros reales de la base de datos.</footer></div>';
  }
  function toggle(id){expanded.has(id)?expanded.delete(id):expanded.add(id);render()}
  function render(){const root=document.getElementById('app');if(!root)return;const body=view();if(window.AulaDashboard&&M&&(M.role==='prof'||M.role==='rector'||M.role==='coordinador'))root.innerHTML=AulaDashboard.shell(D,M,tab,body,vLive(),{doc:D.pend,dir:D.pendDir});else root.innerHTML=body}
  window.INST={load,view,toggle,csv:exportCsv};
})();