/* AULA360 — Dashboard docente profesional
   Consume exclusivamente los intentos y perfiles ya cargados por la aplicación.
   No genera resultados ficticios ni altera el esquema de Supabase. */
(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
  const fmt=n=>Number(n||0).toLocaleString('es-CO',{maximumFractionDigits:1});
  const date=s=>s?new Date(s).toLocaleDateString('es-CO',{day:'2-digit',month:'short'}):'—';
  function stats(data){
    const all=data||[],students=new Set(all.map(x=>x.profiles?.id||x.profiles?.full_name).filter(Boolean));
    const subjects={}; all.forEach(x=>{const k=x.subject||'Sin materia';(subjects[k]||(subjects[k]=[])).push(Number(x.score)||0)});
    const recent=[...all].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    const daily={}; [...all].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)).forEach(x=>{
      const k=x.created_at?new Date(x.created_at).toLocaleDateString('es-CO',{day:'2-digit',month:'short'}):'';
      if(k)(daily[k]||(daily[k]=[])).push(Number(x.score)||0);
    });
    const scores=all.map(x=>Number(x.score)||0);
    const bands=[0,0,0,0];scores.forEach(s=>{if(s<40)bands[0]++;else if(s<60)bands[1]++;else if(s<80)bands[2]++;else bands[3]++});
    return {all,students:students.size,subjects,recent,trend:Object.entries(daily).slice(-10),avg:mean(scores),best:scores.length?Math.max(...scores):0,bands};
  }
  const TITLES={guias:['Guías de trabajo','Descarga guías por grado y envíalas a tus estudiantes'],bancoia:['Banco con IA','Preguntas nuevas cada día, por área y asignatura'],reun:['Reuniones virtuales','Reuniones en línea del colegio con enlace de Meet, Zoom o Jitsi'],guiasadm:['Subir guías de trabajo','Sube guías por grado para todos los docentes'],talleria:['Taller con IA','Crea talleres con sus respuestas y envíalos a tus estudiantes'],claseia:['Preparar clase con IA','Escribe el tema y la plataforma arma tu clase'],listas:['Listados de estudiantes','Sube el listado de cada grupo en Word, PDF o Excel'],dcoo:['Coordinadores','Elige un coordinador y revisa su entorno, sin poder cambiar nada'],permisos:['Permisos y planillas','Formatos de permisos, planillas de asistencia y de notas'],msgs:['Mensajes','Mensajes, notas y documentos entre rector, coordinador y docentes'],prof:['Dashboard académico','Resumen de actividad y desempeño'],cur:['Cursos y estudiantes','Administra tus cursos y la información de tus estudiantes'],simp:['Simulacros y tareas','Crea simulacros tipo ICFES y evalúa el desempeño'],periodo:['Pruebas y exámenes','Elige preguntas del banco, mira la vista previa y publica o imprime'],subirp:['Subir preguntas','Agrega tus propias preguntas al banco'],asistencias:['Asistencia por docente','Asistencia de estudiantes a clase, por área, asignatura, docente y fecha'],planeador:['Día a día pedagógico','Planea cada clase, envíala al rector o coordinador, o imprímela'],aclase:['Asistencia a clase','Los estudiantes registran su asistencia con su documento'],asis:['Llegada de docentes','Llegada y salida de cada docente, acumulada'],taller:['Talleres','Revisa lo que suben los estudiantes y pon la nota'],virtual:['Trabajos y entregas','Material para descargar y trabajos que entregan tus estudiantes'],diario:['Día a día','Planea y registra cada una de tus clases'],plan:['Plan de área','Sube y organiza el plan de área de tus asignaturas'],saber:['Simulacros Saber 11','Examen completo con la estructura oficial del ICFES'],saberimp:['Simulacros Saber 11','Impresos: 3 cuadernillos y hoja de respuestas por estudiante, igual que el ICFES'],diag:['Diagnósticos por grupo','Preguntas y temas de los grados anteriores, para imprimir y calificar'],imp:['Imprimir pruebas','Genera pruebas en papel con su hoja de respuestas'],cal:['Calificar respuestas','Califica hojas de respuestas con la cámara'],preg:['Banco de preguntas','Administra las preguntas por área y nivel'],clase:['Aula virtual','Clase en vivo, pizarrón, asistencia, exámenes y talleres virtuales'],mhor:['Mi horario','Consulta y organiza tu horario'],doc:['Docentes','Revisa y aprueba las solicitudes de docentes'],dadm:['Rectores y coordinadores','Revisa y aprueba las solicitudes de directivos'],banco:['Paquetes de preguntas','Carga y publica preguntas en el banco'],dhor:['Horarios','Horarios del colegio'],dcol:['Mi colegio','Resumen y gestión de tu institución'],ddoc:['Docentes','Entra al entorno de un docente para revisar y auditar lo que hace, solo consulta'],dhist:['Historial','Registro de acciones recientes'],perfil:['Mi perfil','Tu cuenta y configuración']};
  const VKEY=()=>'aic_vm_'+(typeof M!=='undefined'&&M?M.id:'');
  const VMODE={on(){try{return localStorage.getItem(VKEY())==='1'}catch(x){return false}},set(v){try{localStorage.setItem(VKEY(),v?'1':'0')}catch(x){}}};
  const VIRT_TABS=['virtual','taller','clase','simp','reun'];
  const VIRT_ON_HIDE=['virtual','taller'];
  window.VMODE=VMODE;
  window.toggleVirtual=function(){const v=!VMODE.on();VMODE.set(v);if(!v&&VIRT_TABS.includes(tab))return go(M.role==='est'?'sim':M.role==='rector'||M.role==='coordinador'?'dcol':'prof');render();toast(v?'💻':'🖨️',v?'Modo virtual activado':'Modo virtual apagado',v?'Ahora puedes publicar de forma virtual.':'Todo queda para imprimir.')};
  function navItems(M){
    const l=navItems0(M);return VMODE.on()?l.filter(x=>!VIRT_ON_HIDE.includes(x[0])):l.filter(x=>!VIRT_TABS.includes(x[0]));
  }
  function navItems0(M){
    if(M&&(M.role==='rector'||M.role==='coordinador')){const l=[['dcol','🏫','Mi colegio','Mi colegio'],['ddoc','👩‍🏫','Personal','Mi colegio'],['dhor','🗓️','Horarios','Mi colegio'],['asis','🕘','Llegada de docentes','Seguimiento'],['asistencias','✋','Asistencia por docente','Seguimiento'],['planeador','📒','Planeadores','Seguimiento'],['saberimp','🎯','Simulacros y diagnósticos','Evaluación'],['listas','📋','Listados de estudiantes','Documentos y mensajes'],['msgs','✉️','Mensajes y permisos','Documentos y mensajes'],['reun','🎥','Reuniones virtuales','Documentos y mensajes']];if(M.role==='coordinador')l.forEach(x=>{if(x[0]==='ddoc'){x[2]='Docentes (auditoría)'}});if(M.role==='rector')l.push(['dhist','🧾','Historial','Documentos y mensajes']);l.push(['perfil','👤','Mi perfil','Cuenta']);return l}
    const l=[['prof','🏠','Inicio','Inicio'],['cur','👥','Cursos y estudiantes','Mis cursos'],['aclase','✋','Asistencia de estudiantes','Mis cursos'],['asis','🕘','Mi asistencia','Mis cursos'],['mhor','🗓️','Mi horario','Mis cursos'],['planeador','📒','Día a día (planeador)','Planear'],['plan','🗂️','Plan de área','Planear'],['claseia','✨','Preparar clase con IA','Planear'],['talleria','📝','Taller con IA','Planear'],['simp','🏁','Simulacros y tareas','Evaluar'],['diag','🩺','Diagnósticos','Evaluar'],['periodo','🧪','Pruebas y exámenes','Evaluar'],['imp','🖨️','Imprimir pruebas','Evaluar'],['cal','✅','Calificar respuestas','Evaluar'],['preg','📚','Banco de preguntas','Evaluar'],['subirp','⬆️','Subir preguntas','Evaluar'],['virtual','📥','Trabajos y entregas','Virtual'],['taller','✏️','Talleres','Virtual'],['clase','🎥','Aula virtual','Virtual'],['reun','🧑‍🏫','Reuniones del colegio','Virtual'],['guias','⬇️','Descargar guías','Recursos'],['permisos','📄','Permisos y planillas','Recursos'],['msgs','✉️','Mensajes','Recursos']];
    if(M&&M.is_admin)l.push(['doc','♕','Docentes','Administración'],['dadm','🏛️','Rectores y coordinadores','Administración'],['banco','🧩','Paquetes de preguntas','Administración'],['guiasadm','📤','Subir guías de trabajo','Administración'],['bancoia','🤖','Banco con IA','Administración']);
    l.push(['perfil','👤','Mi perfil','Cuenta']);return l;
  }
  const TABGR={saberimp:[['saberimp','🎯 Simulacros Saber 11'],['diag','🩺 Diagnósticos']],msgs:[['msgs','✉️ Bandeja de mensajes'],['permisos','📄 Permisos y planillas']],ddoc:[['ddoc','👩‍🏫 Docentes'],['dcoo','🧑‍💼 Coordinadores']]};
  const grOf=(M,t)=>{if(!M||!(M.role==='rector'||M.role==='coordinador'))return null;return Object.keys(TABGR).find(k=>TABGR[k].some(x=>x[0]===t))||null};
  function shell(D,M,tab,body,live,pend){
    const name=esc(M?.full_name||'Docente'),ini=esc((M?.full_name||'D').slice(0,1).toUpperCase()),t=TITLES[tab]||['AULA360',''];
    const rol=M?.role==='rector'?'Rector':M?.role==='coordinador'?'Coordinador':M?.is_admin?'Administrador':'Docente',school=M?.school_other||'';
    let _g='';const navHtml=navItems(M).map(([k,ic,l,g])=>`${g&&g!==_g&&g!=='Inicio'&&g!=='Cuenta'?(_g=g,`<div class="aic-side-label" style="margin:10px 6px 2px;font-size:10px;opacity:.7">${g.toUpperCase()}</div>`):(_g=g,'')}<button class="aic-nav ${(k===tab||grOf(M,tab)===k)?'active':''}" onclick="go('${k}')"><span>${ic}</span>${l}${(k==='doc'&&pend?.doc)?` <em class="aic-badge">${pend.doc}</em>`:''}${(k==='dadm'&&pend?.dir)?` <em class="aic-badge">${pend.dir}</em>`:''}</button>`).join('');
    return `<div class="aic-shell">
      <aside class="aic-sidebar"><div class="aic-brand"><img class="aic-brand-full" src="aula360-logo-horizontal.png" alt="AULA360 · Aprende, practica, evalúa"><img class="aic-brand-ico" src="aula360-pwa-192.png" alt=""><b class="aic-brand-txt">AULA<span>360</span></b></div>
        <button class="aic-hamb" aria-label="Abrir menú" onclick="this.closest('.aic-sidebar').classList.toggle('open')"><i></i><i></i><i></i><em>Menú</em></button>
        <div class="aic-back" onclick="this.closest('.aic-sidebar').classList.remove('open')"></div>
        <div class="aic-drawer">
        <div class="aic-side-label">MENÚ PRINCIPAL</div><nav>${navHtml}</nav>
        <button onclick="toggleVirtual()" style="margin:10px 6px 0;padding:10px;border-radius:10px;font-weight:800;font-size:12px;background:${VMODE.on()?'#16a34a':'#ffffff22'};color:#fff;text-align:center;width:calc(100% - 12px)">${VMODE.on()?'💻 Modo virtual: ACTIVADO':'🖨️ Modo virtual: apagado'}<br><small style="font-weight:400">${VMODE.on()?'Toca para volver a solo imprimir':'Toca para activar lo virtual'}</small></button>
        <div class="aic-side-bottom"><div class="aic-avatar">${ini}</div><div><b>${name}</b><small>${rol}</small></div><button onclick="logout()" title="Cerrar sesión">↗</button></div>
        </div>
      </aside>
      <main class="aic-main">
        ${window.VC&&VC.on()?VC.banner():''}
        <header class="aic-top"><div><div class="aic-eyebrow">ESPACIO DE TRABAJO</div><h1>${t[0]}</h1><p>${school?esc(school)+' · ':''}${t[1]}</p></div>
          <div class="aic-top-actions"><button class="aic-icon-btn" onclick="passModal()" title="Cambiar contraseña">⚙</button><button class="aic-user" onclick="logout()"><span class="aic-avatar">${ini}</span><span>${name}<small>Cerrar sesión</small></span>⌄</button></div>
        </header>
        <div id="livebar">${live||''}</div>
        ${grOf(M,tab)?`<div style="display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px">${TABGR[grOf(M,tab)].filter(([k])=>!(M.role==='coordinador'&&k==='dcoo')).map(([k,l])=>`<button onclick="go('${k}')" style="padding:9px 16px;border-radius:999px;font-weight:800;font-size:13px;border:2px solid ${k===tab?'#4f46e5':'#cbd5e1'};background:${k===tab?'#4f46e5':'#fff'};color:${k===tab?'#fff':'#334155'}">${l}</button>`).join('')}</div>`:''}
        ${body}
      </main></div>`;
  }
  function perfil(M,email){
    const ini=esc((M?.full_name||'D').slice(0,1).toUpperCase());
    const row=(k,v)=>v?`<div class="aic-prow"><small>${k}</small><b>${esc(v)}</b></div>`:'';
    return `<section class="aic-card aic-profile"><div class="aic-pcard"><div class="aic-avatar big">${ini}</div><h3>${esc(M?.full_name||'')}</h3><p>${M?.role==='rector'?'Rector':M?.role==='coordinador'?'Coordinador':M?.is_admin?'Administrador':'Docente'}</p></div>
      <div class="aic-pinfo">${row('Correo',email)}${row('Colegio',M?.school_other)}${row('Asignaturas',(M?.asignaturas||[]).join(', '))}${row('Teléfono',M?.phone)}
      <div class="aic-hero-actions"><button onclick="passModal()">🔑 Cambiar contraseña</button><button class="ghost" style="color:#172554;border-color:#cbd5e1" onclick="logout()">Cerrar sesión</button></div></div></section>`;
  }
  function view(D,M){
    const s=stats(D.all||[]),name=(M?.full_name||'Docente').trim().split(/\s+/)[0];
    const has=s.all.length;
    const subjectRows=Object.entries(s.subjects).sort((a,b)=>mean(b[1])-mean(a[1]));
    const recent=s.recent.slice(0,7);
    return `<div>
      <section class="aic-hero"><div class="aic-hero-copy"><span class="aic-kicker">TU CENTRO DE ANÁLISIS</span><h2>¡Hola, ${esc(name)}! 👋</h2><p>Convierte los resultados de tus estudiantes en decisiones pedagógicas.</p><div class="aic-hero-actions"><button onclick="go(\'simp\')">＋ Crear simulacro</button><button class="ghost" onclick="go('cur')">Ver mis cursos <b>→</b></button></div></div><div class="aic-hero-art"><div class="aic-orbit orbit1"></div><div class="aic-orbit orbit2"></div><div class="aic-book">📘</div><div class="aic-cap">🎓</div></div></section>
        <div class="aic-section-head"><div><h2>Indicadores generales</h2><p>Información calculada a partir de los intentos registrados</p></div><span class="aic-period">Todos los periodos disponibles</span></div>
        <section class="aic-kpis">
          <article class="aic-kpi"><div class="aic-kpi-icon blue">▤</div><div><small>Intentos registrados</small><strong>${fmt(s.all.length)}</strong><span>En tus cursos</span></div><div class="aic-kpi-mark">↗</div></article>
          <article class="aic-kpi"><div class="aic-kpi-icon green">♙</div><div><small>Estudiantes con actividad</small><strong>${fmt(s.students)}</strong><span>Con al menos un intento</span></div><div class="aic-kpi-mark">◎</div></article>
          <article class="aic-kpi"><div class="aic-kpi-icon violet">◉</div><div><small>Promedio de resultados</small><strong>${has?fmt(s.avg):'—'}${has?'<em>/100</em>':''}</strong><span>Escala de calificación registrada</span></div><div class="aic-kpi-mark">⌁</div></article>
          <article class="aic-kpi"><div class="aic-kpi-icon orange">★</div><div><small>Mejor resultado</small><strong>${has?fmt(s.best):'—'}${has?'<em>/100</em>':''}</strong><span>Mayor puntaje registrado</span></div><div class="aic-kpi-mark">✦</div></article>
        </section>
        <section class="aic-chart-grid"><article class="aic-card aic-wide"><div class="aic-card-head"><div><h3>Desempeño por asignatura</h3><p>Promedio de puntajes registrados · escala 0 a 100</p></div><span class="aic-chip">Por materia</span></div>${has?'<div class="aic-chart"><canvas id="aic-subject-chart"></canvas></div>':'<div class="aic-empty"><span>▥</span><b>Aún no hay resultados para analizar</b><p>Cuando tus estudiantes presenten simulacros o tareas, aquí verás el promedio por asignatura.</p><button onclick="go(\'simp\')">Crear primer simulacro</button></div>'}</article>
          <article class="aic-card"><div class="aic-card-head"><div><h3>Evolución de resultados</h3><p>Promedio por fecha de actividad</p></div><span class="aic-mini-legend"><i></i> Puntaje</span></div>${has?'<div class="aic-chart aic-chart-tall"><canvas id="aic-trend-chart"></canvas></div>':'<div class="aic-empty compact">La evolución aparecerá cuando existan intentos.</div>'}</article></section>
        <section class="aic-lower-grid"><article class="aic-card"><div class="aic-card-head"><div><h3>Distribución de resultados</h3><p>Rangos de puntaje de los intentos</p></div></div>${has?`<div class="aic-dist">${[['0–39',s.bands[0],'low'],['40–59',s.bands[1],'mid'],['60–79',s.bands[2],'good'],['80–100',s.bands[3],'high']].map(([l,n,c])=>`<div class="aic-dist-row"><div><span>${l} puntos</span><b>${n}</b></div><div class="aic-track"><i class="${c}" style="width:${s.all.length?n/s.all.length*100:0}%"></i></div></div>`).join('')}</div>`:'<div class="aic-empty compact">Sin datos suficientes.</div>'}</article>
          <article class="aic-card"><div class="aic-card-head"><div><h3>Promedios por asignatura</h3><p>Ordenados de mayor a menor</p></div><button class="aic-link" onclick="go('prof')">Actualizar ↗</button></div>${has?`<div class="aic-subject-list">${subjectRows.map(([k,v],i)=>`<div class="aic-subject-row"><span class="aic-subject-dot dot${i%5}"></span><span>${esc(k)}</span><b>${fmt(mean(v))}</b><small>${v.length} ${v.length===1?'intento':'intentos'}</small></div>`).join('')}</div>`:'<div class="aic-empty compact">Los promedios aparecerán al registrar resultados.</div>'}</article></section>
        <section class="aic-card aic-recent"><div class="aic-card-head"><div><h3>Actividad reciente</h3><p>Últimos resultados registrados en tus cursos</p></div><button class="aic-link" onclick="exportCSV()">↓ Exportar CSV</button></div>${recent.length?`<div class="aic-table-wrap"><table><thead><tr><th>ESTUDIANTE</th><th>CURSO</th><th>ASIGNATURA</th><th>SIMULACRO / TAREA</th><th>PUNTAJE</th><th>FECHA</th></tr></thead><tbody>${recent.map(a=>`<tr><td><b>${esc(a.profiles?.full_name||'Estudiante')}</b></td><td>${esc(a.profiles?.courses?.name||'—')}</td><td>${esc(a.subject||'—')}</td><td>${esc(a.simulacros?.title||'Actividad')}</td><td><span class="aic-score ${Number(a.score)>=80?'score-high':Number(a.score)>=60?'score-mid':'score-low'}">${fmt(a.score)}</span></td><td>${date(a.created_at)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="aic-empty compact">Todavía no hay actividad registrada. Crea un simulacro y asígnalo a uno de tus cursos.</div>'}</section>
        <footer class="aic-footer"><span><b>AULA360</b> · Aprende, practica, evalúa</span><span>Los indicadores se actualizan con los datos disponibles en la plataforma.</span></footer>
      </div>`;
  }
  function mount(D,M,charts){
    if(!window.Chart)return;
    const s=stats(D.all||[]); if(!s.all.length)return;
    const subjects=Object.entries(s.subjects).sort((a,b)=>mean(b[1])-mean(a[1]));
    const c1=document.getElementById('aic-subject-chart');
    if(c1)charts.push(new Chart(c1,{type:'bar',data:{labels:subjects.map(x=>x[0]),datasets:[{label:'Promedio',data:subjects.map(x=>mean(x[1])),backgroundColor:['#2864e8','#19a879','#8758df','#f59b32','#22a6b5'],borderRadius:8,maxBarThickness:42}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${fmt(c.raw)} / 100`}}},scales:{y:{min:0,max:100,grid:{color:'#edf1f7'},ticks:{stepSize:20}},x:{grid:{display:false}}}}}));
    const c2=document.getElementById('aic-trend-chart');
    if(c2)charts.push(new Chart(c2,{type:'line',data:{labels:s.trend.map(x=>x[0]),datasets:[{label:'Promedio',data:s.trend.map(x=>mean(x[1])),borderColor:'#2864e8',backgroundColor:'rgba(40,100,232,.10)',fill:true,tension:.35,pointRadius:3,pointBackgroundColor:'#fff',pointBorderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${fmt(c.raw)} / 100`}}},scales:{y:{min:0,max:100,grid:{color:'#edf1f7'},ticks:{stepSize:20}},x:{grid:{display:false}}}}}));
  }
  window.AulaDashboard={view,mount,shell,perfil};
})();