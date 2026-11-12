/* AULA360 — Preparar clase con IA.
   El docente escribe uno o varios temas, elige grado, asignatura y duración (1 o 2 horas) y la plataforma le arma la clase
   con el formato de la plataforma o con el formato del colegio (que sube el rector o el coordinador). */
window.CIA=(function(){
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const R=()=>render();
const ft=x=>x?new Date(x).toLocaleDateString('es-CO'):'';
const gl=g=>g===0?'Transición':g+'°';
const PLAT=['Tema','Objetivo','Competencias','Inicio (exploración de saberes previos)','Desarrollo','Cierre','Recursos','Evaluación','Tarea'];
let Z={temas:'',grado:'',asig:'',horas:1,fmt:'plataforma',cfg:null,planes:[],lista:[],res:null,busy:false,aviso:''};
const inp='style="width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:8px"';
async function load(){
  const [c,p,l]=await Promise.all([
    sb.from('clase_formato').select('*').eq('colegio_id',M.colegio_id||0).maybeSingle(),
    sb.from('planes_area').select('asignatura,grado,anio,malla').eq('docente_id',M.id),
    sb.from('clases_preparadas').select('id,titulo,grado,asignatura,horas,usa_ia,created_at').order('created_at',{ascending:false}).limit(40)]);
  Z.cfg=c.data&&(c.data.secciones||[]).length?c.data:null;Z.planes=p.data||[];Z.lista=l.data||[];
  if(!Z.cfg)Z.fmt='plataforma';
  const gs=(M.grados||[]);if(Z.grado===''&&gs.length===1)Z.grado=String(gs[0]);
  const as=(M.asignaturas||[]);if(!Z.asig&&as.length===1)Z.asig=as[0];
}
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
function contexto(temas){
  const p=Z.planes.filter(x=>x.asignatura===Z.asig&&String(x.grado)===String(Z.grado)).sort((a,b)=>b.anio-a.anio)[0];
  if(!p||!p.malla||!Array.isArray(p.malla.periodos))return'';
  const out=[];
  p.malla.periodos.forEach(per=>(per.filas||[]).forEach(f=>{
    if(!f.tema)return;
    if(temas.some(t=>norm(f.tema).includes(norm(t))||norm(t).includes(norm(f.tema))))
      out.push(Object.entries(f).filter(([k,v])=>v&&typeof v==='string').map(([k,v])=>k+': '+v).join(' | '));
  }));
  return out.slice(0,4).join('\n');
}
function plantilla(temas,secs,horas){
  const t=temas.join(', '),m=horas*60,ini=Math.round(m*.15),cie=Math.round(m*.15),des=m-ini-cie;
  const base={
    'tema':t,'objetivo':'Que los estudiantes comprendan y apliquen: '+t+'.',
    'competencias':'Escribe aquí las competencias de tu plan de área para este tema.',
    'inicio':`(${ini} min) Saludo y activación de saberes previos con 3 preguntas orientadoras sobre ${t}.`,
    'desarrollo':`(${des} min) Explicación del tema con ejemplos, trabajo guiado en parejas o grupos y práctica individual sobre ${t}.`,
    'cierre':`(${cie} min) Socialización de lo aprendido, aclaración de dudas y síntesis de ideas clave.`,
    'recursos':'Tablero, guía de trabajo, cuaderno y material del aula.','evaluacion':'Observación del trabajo en clase y revisión de la práctica.','tarea':'Ejercicio corto para reforzar el tema en casa.'};
  const pick=n=>{n=norm(n);const k=Object.keys(base).find(k=>n.startsWith(k));return k?base[k]:''};
  return{titulo:t,secciones:secs.map(s=>({titulo:s,contenido:pick(s)}))};
}
function vForm(){
  const gs=(M.grados&&M.grados.length?M.grados:[...Array(12).keys()]),as=M.asignaturas||[];
  return`<div class="aic-card" style="padding:16px"><h3 style="font-weight:800;font-size:17px">✨ Preparar clase con IA</h3><p style="font-size:13px;color:#64748b;margin:4px 0 10px">Escribe el tema (o varios, uno por línea), elige el grado y cuánto dura la clase. La plataforma te la arma y puedes corregirla antes de imprimirla.</p>
  ${Z.aviso?`<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:10px;font-size:13px;margin-bottom:10px">${e(Z.aviso)}</div>`:''}
  <label style="font-size:13px;display:block">Tema o temas de la clase (uno por línea)<textarea rows="3" ${inp} oninput="CIA.temas=this.value" placeholder="Ej: Fracciones equivalentes">${e(Z.temas)}</textarea></label>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-top:10px">
   <label style="font-size:13px">Grado<select ${inp} onchange="CIA.set('grado',this.value)"><option value="">Elige…</option>${gs.map(g=>`<option value="${g}" ${String(g)===String(Z.grado)?'selected':''}>${gl(g)}</option>`).join('')}</select></label>
   <label style="font-size:13px">Asignatura<select ${inp} onchange="CIA.set('asig',this.value)"><option value="">Elige…</option>${as.map(a=>`<option ${a===Z.asig?'selected':''}>${e(a)}</option>`).join('')}</select></label>
   <label style="font-size:13px">Duración<select ${inp} onchange="CIA.set('horas',+this.value)"><option value="1" ${Z.horas===1?'selected':''}>1 hora (60 min)</option><option value="2" ${Z.horas===2?'selected':''}>2 horas (120 min)</option></select></label>
   <label style="font-size:13px">Formato<select ${inp} onchange="CIA.set('fmt',this.value)"><option value="plataforma" ${Z.fmt==='plataforma'?'selected':''}>Formato de la plataforma</option>${Z.cfg?`<option value="colegio" ${Z.fmt==='colegio'?'selected':''}>Formato del colegio</option>`:''}</select></label></div>
  <div style="margin-top:12px"><button onclick="CIA.preparar()" ${Z.busy?'disabled':''} style="background:#7c3aed;color:#fff;padding:11px 18px;border-radius:10px;font-weight:800">${Z.busy?'⏳ Preparando…':'✨ Preparar clase'}</button></div></div>`;
}
function vRes(){
  const r=Z.res;if(!r)return'';
  return`<div class="aic-card" style="padding:16px;border:2px solid #7c3aed"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px"><h3 style="font-weight:800;font-size:17px">Tu clase</h3><span style="font-size:12px;color:#64748b">${r.usa_ia?'Preparada con IA':'Preparada con la plantilla'} · ${gl(+r.grado)} · ${e(r.asignatura||'')} · ${r.horas} h</span></div>
  <label style="font-size:13px;display:block;margin-top:8px">Título<input ${inp} value="${e(r.titulo)}" oninput="CIA.res.titulo=this.value"></label>
  ${r.secciones.map((s,i)=>`<label style="font-size:13px;font-weight:700;display:block;margin-top:10px">${e(s.titulo)}<textarea rows="${Math.min(10,Math.max(3,Math.ceil((s.contenido||'').length/90)))}" ${inp} style="width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:8px;font-weight:400" oninput="CIA.res.secciones[${i}].contenido=this.value">${e(s.contenido)}</textarea></label>`).join('')}
  <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px"><button onclick="CIA.guardar()" style="background:#16a34a;color:#fff;padding:10px 16px;border-radius:10px;font-weight:800">💾 Guardar</button><button onclick="CIA.imprimir()" style="background:#246be0;color:#fff;padding:10px 16px;border-radius:10px;font-weight:800">🖨️ Imprimir</button><button onclick="CIA.copiar()" style="background:#e2e8f0;padding:10px 16px;border-radius:10px;font-weight:700">📋 Copiar texto</button></div></div>`;
}
function vLista(){
  return`<div class="aic-card" style="padding:16px"><h3 style="font-weight:800;font-size:16px">Mis clases preparadas</h3>${Z.lista.map(c=>`<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;border:1px solid #e2e8f0;border-radius:12px;padding:8px 12px;margin-top:8px"><div><b>${e(c.titulo)}</b><div style="font-size:12px;color:#64748b">${c.grado!=null?gl(c.grado)+' · ':''}${e(c.asignatura||'')} · ${c.horas} h · ${ft(c.created_at)}</div></div><div style="display:flex;gap:8px"><button class="aic-link" onclick="CIA.abrir('${c.id}')">Abrir</button><button class="aic-link" onclick="CIA.borrar('${c.id}')">🗑</button></div></div>`).join('')||'<p style="font-size:13px;color:#64748b;margin-top:6px">Todavía no has guardado clases.</p>'}</div>`;
}
function html(){
  const r=Z.res;
  return`<div style="font-family:Arial,Helvetica,sans-serif;color:#000">${lhHtml(18)}<h2 style="text-align:center;margin:10px 0 2px;font-size:14pt">PREPARACIÓN DE CLASE</h2>
  <p style="text-align:center;font-size:10.5pt;margin:0 0 8px">${e(r.titulo)} · ${gl(+r.grado)}${r.asignatura?' · '+e(r.asignatura):''} · ${r.horas} hora${r.horas>1?'s':''}<br>Docente: ${e(M.full_name)}</p>
  <table style="width:100%;border-collapse:collapse;font-size:10.5pt">${r.secciones.map(s=>`<tr><td style="border:1px solid #000;padding:6px;width:26%;font-weight:700;background:#f1f5f9;vertical-align:top">${e(s.titulo)}</td><td style="border:1px solid #000;padding:6px;white-space:pre-wrap">${e(s.contenido)}</td></tr>`).join('')}</table></div>`;
}
const api={
  load,view:()=>`<div style="display:grid;gap:14px">${vForm()}${vRes()}${vLista()}</div>`,
  get res(){return Z.res},
  set temas(v){Z.temas=v},
  set(k,v){Z[k]=v;R()},
  async preparar(){
    if(Z.busy)return;
    const temas=Z.temas.split(/\n/).map(x=>x.trim()).filter(Boolean);
    if(!temas.length)return toast('⚠️','Escribe el tema','');if(Z.grado==='')return toast('⚠️','Elige el grado','');
    const secs=Z.fmt==='colegio'&&Z.cfg?Z.cfg.secciones:PLAT;
    Z.busy=true;Z.aviso='';R();
    let out=null,ia=false;
    try{
      const r=await sb.functions.invoke('preparar-clase',{body:{temas,grado:+Z.grado,horas:Z.horas,asignatura:Z.asig,secciones:secs,contexto:contexto(temas)}});
      let d=r.data;
      if(r.error&&!d){try{d=await r.error.context.json()}catch(x){}}
      if(d&&d.ok){out={titulo:d.titulo,secciones:d.secciones};ia=true}
      else if(d&&d.sin_clave){Z.aviso='La IA todavía no está activada por el administrador de la plataforma. Te armé la clase con la plantilla; puedes completarla y corregirla.'}
      else if(d&&d.error){Z.aviso=d.error+' Te armé la clase con la plantilla.'}
      else Z.aviso='No pude comunicarme con la IA. Te armé la clase con la plantilla.';
    }catch(x){Z.aviso='No pude comunicarme con la IA. Te armé la clase con la plantilla.'}
    if(!out)out=plantilla(temas,secs,Z.horas);
    Z.res={titulo:out.titulo,secciones:out.secciones,grado:Z.grado,asignatura:Z.asig,horas:Z.horas,usa_ia:ia,id:null};
    Z.busy=false;R();setTimeout(()=>window.scrollTo({top:document.body.scrollHeight*0.35,behavior:'smooth'}),80);
  },
  async guardar(){
    const r=Z.res;if(!r)return;
    const row={docente_id:M.id,titulo:r.titulo||'Clase',grado:+r.grado,asignatura:r.asignatura||null,horas:r.horas,usa_ia:!!r.usa_ia,contenido:{secciones:r.secciones}};
    const q=await sb.from('clases_preparadas').insert(row);if(q.error)return err(q.error);
    toast('✅','Clase guardada','La encuentras en Mis clases preparadas.');await load();R();
  },
  imprimir(){if(Z.res)doPrint(html(),{hoja:true})},
  copiar(){const r=Z.res;if(!r)return;const t=r.titulo+'\n\n'+r.secciones.map(s=>s.titulo.toUpperCase()+'\n'+s.contenido).join('\n\n');
    (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast('✅','Copiado','Ya puedes pegarlo donde quieras.')).catch(()=>toast('⚠️','No se pudo copiar','Selecciona el texto y cópialo a mano.'))},
  async abrir(id){
    const q=await sb.from('clases_preparadas').select('*').eq('id',id).single();if(q.error)return err(q.error);
    const c=q.data;Z.res={titulo:c.titulo,secciones:(c.contenido&&c.contenido.secciones)||[],grado:c.grado,asignatura:c.asignatura,horas:c.horas,usa_ia:c.usa_ia,id:c.id};R();window.scrollTo({top:300,behavior:'smooth'});
  },
  async borrar(id){if(!confirm('¿Borrar esta clase?'))return;const q=await sb.from('clases_preparadas').delete().eq('id',id);if(q.error)return err(q.error);await load();R()}
};
return api;
})();
