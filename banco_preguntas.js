/* AulaICFES · banco_preguntas.js
   Importa "preguntas separadas": un zip con preguntas.json + una imagen recortada por pregunta (img/*.png).
   Cada pregunta se guarda en la tabla `questions` como BORRADOR (oculta) con su clave en `question_keys`;
   el recorte va al depósito público "question-images", que es el que la app ya usa para preguntas con imagen.
   Después, el botón "Publicar las verificadas" deja visibles SOLO las que tienen clave y ninguna alerta.
   Se puede repetir sin miedo: no duplica (ext_id único) y completa lo que falte. Nunca borra nada.
   Solo el administrador lo usa (lo garantizan los permisos de la base de datos). */
(function(){
'use strict';
const BUCKET='question-images',PAQ='preguntas_separadas_v1',JSZIP='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
const BLOQUEAN=['sin_clave','anulada','clave_ilegible','incompleta_en_pdf','numeracion_duplicada_en_fuente','sin_recorte','sin_cotejar','clave_multiple'];
const TXT_ALERTA={sin_clave:'sin clave en la fuente',anulada:'anulada por la fuente',clave_ilegible:'clave ilegible',incompleta_en_pdf:'incompleta en el PDF original',
  numeracion_duplicada_en_fuente:'número repetido en la fuente (clave ambigua)',sin_recorte:'sin recorte',sin_cotejar:'clave sin cotejar',clave_multiple:'clave doble en la fuente ("A, B")',
  opciones_incompletas_en_texto:'opciones dibujadas (solo en la imagen)',recorte_muy_alto:'imagen muy larga'};
if(typeof document!=='undefined'&&document&&!document.getElementById('bqp-css')){const st=document.createElement('style');st.id='bqp-css';
  st.textContent='.bqp-barra{background:#e2e8f0;border-radius:8px;height:10px;overflow:hidden}.bqp-barra>div{background:#059669;height:10px;width:0;transition:width .2s}.bqp-mt{margin-top:.75rem}.bqp-ok{color:#047857}.bqp-mal{color:#b91c1c}.bqp-av{color:#b45309}';
  document.head.appendChild(st)}
const Q={items:[],resumen:[],cargando:false,ocupado:false,errCarga:''};
const ok=r=>{if(r&&r.error)throw r.error;return(r&&r.data)||[]};
const esc=s=>typeof E==='function'?E(s):String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const card=h=>`<div class="bg-white rounded-2xl p-4 shadow">${h}</div>`;
const btn=(fn,t,c,dis)=>`<button ${dis?'disabled':''} onclick="${fn}" class="px-3 py-1.5 rounded-lg text-xs ${c||'bg-slate-200'}">${t}</button>`;
const VERDE='bg-emerald-600 text-white';
const mb=n=>(n/1048576).toFixed(1)+' MB';
const el=id=>typeof document!=='undefined'&&document?document.getElementById(id):null;
const setT=(id,t)=>{const e=el(id);if(e)e.textContent=t};
const setB=(id,p)=>{const e=el(id);if(e)e.style.width=Math.max(0,Math.min(100,p))+'%'};
const slug=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'sin-nombre';
const yaExiste=e=>e&&(String(e.statusCode)==='409'||e.status===409||/already exists|duplicate/i.test(String(e.message||'')));
const trozos=(a,n)=>{const o=[];for(let i=0;i<a.length;i+=n)o.push(a.slice(i,i+n));return o};
async function pool(items,n,fn){let i=0;const w=[...Array(Math.min(n,items.length))].map(async()=>{while(i<items.length){const k=i++;await fn(items[k],k)}});await Promise.all(w)}
async function todas(mk){let out=[],d=0;for(;;){const r=await mk().range(d,d+999);if(r.error)throw r.error;out=out.concat(r.data||[]);if(!r.data||r.data.length<1000)break;d+=1000}return out}
const alertasDe=q=>{const a=Array.isArray(q.assets)?q.assets[0]:q.assets;return(a&&a.alertas)||[]};
const claveDe=q=>{const k=Array.isArray(q.question_keys)?q.question_keys[0]:q.question_keys;return k&&Number.isInteger(k.correct)?k.correct:null};
const bloqueada=q=>alertasDe(q).filter(a=>BLOQUEAN.includes(a));

/* ---------- lectura y validación del paquete (pura: se prueba en Node) ---------- */
function validar(datos,tieneImagen){
  const av=[];
  if(!datos||!Array.isArray(datos.preguntas)||!datos.preguntas.length)throw new Error('El archivo preguntas.json no trae la lista de preguntas.');
  const materia=String(datos.materia||'').trim();
  if(materia.length<2)throw new Error('El archivo preguntas.json no dice la materia.');
  const vistos=new Set(),lista=[];
  datos.preguntas.forEach((p,i)=>{
    const id=String(p.id||'').trim();
    if(!/^[A-Za-z0-9_.-]{3,60}$/.test(id)){av.push(`La pregunta n.º ${i+1} no tiene un código válido y no se cargará.`);return}
    if(vistos.has(id)){av.push(`El código ${id} está repetido; solo se cargará el primero.`);return}
    vistos.add(id);
    const op=Array.isArray(p.opciones)?p.opciones.map(x=>String(x==null?'':x).trim()):[];
    while(op.length<4)op.push('');
    let clave=p.clave?String(p.clave).toUpperCase():null;if(clave&&!/^[A-D]$/.test(clave))clave=null;
    const alertas=Array.isArray(p.alertas)?p.alertas.slice():[];
    const conImg=!!p.imagen&&tieneImagen(p.imagen);
    if(!conImg&&!alertas.includes('sin_recorte'))alertas.push('sin_recorte');
    lista.push({id,grupo:p.grupo==null?null:p.grupo,numero:p.numero==null?null:p.numero,enunciado:String(p.enunciado||'').trim(),opciones:op.slice(0,4),clave,imagen:conImg?p.imagen:null,
      paginas:Array.isArray(p.paginas)?p.paginas:[],estimulo:p.estimulo||null,alertas});
  });
  if(!lista.length)throw new Error('Ninguna pregunta del paquete se puede cargar.');
  return{materia,fuente:String(datos.fuente||''),preguntas:lista,avisos:av};
}
function filaPregunta(p,mat,grado,fuente){
  const body=(p.enunciado||'').slice(0,2000)||`Pregunta ${p.numero==null?p.id:p.numero} (ver la imagen)`;
  return{grade:grado,subject:mat,body,options:p.opciones.map((t,i)=>t||'Opción '+'ABCD'[i]),ext_id:p.id,image_path:`banco/${slug(mat)}/${p.id}.png`,
    status:'draft',active:false,context_kind:'imagen',
    assets:[{paquete:PAQ,fuente,grupo:p.grupo,numero:p.numero,paginas:p.paginas,estimulo:p.estimulo,alertas:p.alertas}]};
}

/* ---------- datos de la base ---------- */
async function cargar(){
  Q.cargando=true;Q.errCarga='';
  try{
    const f=await todas(()=>sb.from('questions').select('id,ext_id,subject,status,active,assets,question_keys(correct)').contains('assets',JSON.stringify([{paquete:PAQ}])).order('ext_id'));
    const m=new Map();
    for(const q of f){
      const r=m.get(q.subject)||{materia:q.subject,total:0,borrador:0,publicadas:0,listas:0,conClave:0,bloqueadas:0,motivos:{},ids:[]};
      r.total++;if(q.status==='published')r.publicadas++;else r.borrador++;
      if(claveDe(q)!==null)r.conClave++;
      const b=bloqueada(q);
      if(q.status!=='published'){if(claveDe(q)!==null&&!b.length){r.listas++;r.ids.push(q.id)}else{r.bloqueadas++;b.forEach(x=>r.motivos[x]=(r.motivos[x]||0)+1);if(!b.length&&claveDe(q)===null)r.motivos.sin_clave=(r.motivos.sin_clave||0)+1}}
      m.set(q.subject,r);
    }
    Q.resumen=[...m.values()].sort((a,b)=>a.materia.localeCompare(b.materia,'es'));
  }catch(e){Q.errCarga=(e&&e.message)||String(e);throw e}
  finally{Q.cargando=false}
}

/* ---------- pantalla ---------- */
function cuerpoItem(it,i){
  if(it.estado==='leyendo')return`<p class="text-sm">⏳ Leyendo «${esc(it.nombre)}» (${mb(it.tam)})…</p>`;
  if(it.estado==='error')return`<p class="text-sm"><b>${esc(it.nombre)}</b></p><p class="text-sm bqp-mal">⚠️ ${esc(it.mensaje)}</p><div class="bqp-mt">${btn(`BQP.quitar(${i})`,'Quitar')}</div>`;
  const D=it.datos,n=D.preguntas.length,conClave=D.preguntas.filter(p=>p.clave).length,limpias=D.preguntas.filter(p=>p.clave&&!p.alertas.some(a=>BLOQUEAN.includes(a))).length;
  const cuenta={};D.preguntas.forEach(p=>p.alertas.filter(a=>BLOQUEAN.includes(a)).forEach(a=>cuenta[a]=(cuenta[a]||0)+1));
  const motivos=Object.entries(cuenta).map(([k,v])=>`${v} ${TXT_ALERTA[k]||k}`).join(' · ');
  const ya=it.ya||0,completo=ya>=n;
  const informe=it.informe?`<div class="text-sm bqp-mt">${it.informe}</div>`:'';
  const estado=it.estado==='subiendo'?`<div class="bqp-mt"><div class="bqp-barra"><div id="bqp_b${i}"></div></div><p class="text-xs bqp-mt" id="bqp_t${i}">Preparando…</p></div>`
    :it.estado==='hecho'?`${informe}<div class="bqp-mt">${btn(`BQP.quitar(${i})`,'Quitar de la lista')}</div>`
    :`${informe}<div class="bqp-mt flex flex-wrap gap-2 items-center">${completo?'<span class="text-sm bqp-ok">✅ Todas estas preguntas ya están en el banco.</span>':btn(`BQP.subir(${i})`,ya?'🔁 Completar lo que falta':'⬆️ Subir como borrador',VERDE)}${btn(`BQP.quitar(${i})`,'Quitar de la lista')}</div>`;
  return`<div class="font-semibold">${esc(D.materia)} · ${n} preguntas separadas</div><div class="text-xs text-slate-500">Archivo: ${esc(it.nombre)} · ${mb(it.tam)} · fuente: ${esc(D.fuente||'—')}</div>
    <div class="grid sm:grid-cols-3 gap-2 bqp-mt text-sm"><div><b>${conClave}</b> con clave de respuesta</div><div><b>${limpias}</b> sin ninguna alerta (se podrán publicar)</div><label>Grado <select class="border rounded-lg p-2" ${ya?'disabled':''} onchange="BQP.setGrado(${i},this.value)">${[9,10,11].map(g=>`<option ${g===it.grado?'selected':''}>${g}</option>`).join('')}</select></label></div>
    ${motivos?`<p class="text-xs bqp-av bqp-mt">Se quedarán en borrador: ${esc(motivos)}.</p>`:''}
    ${ya?`<p class="text-xs bqp-av bqp-mt">Ya hay ${ya} de estas preguntas en el banco; solo se suben las que faltan.</p>`:''}
    ${D.avisos.length?`<div class="text-xs bqp-av bqp-mt">${D.avisos.slice(0,5).map(esc).join('<br>')}</div>`:''}${estado}`;
}
function vResumen(){
  if(Q.errCarga)return card('<h3 class="font-semibold mb-1">✅ Preguntas separadas en el banco</h3><p class="text-sm bqp-mal">No se pudo leer la lista: '+esc(Q.errCarga)+'</p>');
  if(!Q.resumen.length)return card('<h3 class="font-semibold mb-1">✅ Preguntas separadas en el banco</h3><p class="text-sm text-slate-500">Todavía no hay preguntas separadas cargadas.</p>');
  const filas=Q.resumen.map(r=>{
    const mot=Object.entries(r.motivos).map(([k,v])=>`${v} ${TXT_ALERTA[k]||k}`).join(', ');
    return`<tr class="border-t align-top"><td class="py-1"><b>${esc(r.materia)}</b></td><td>${r.total}</td><td>${r.publicadas}</td><td>${r.borrador}</td><td>${r.listas}</td><td class="text-xs">${esc(mot)||'—'}</td>
      <td>${r.listas?btn(`BQP.publicar('${esc(r.materia).replace(/'/g,'&#39;')}')`,`Publicar las ${r.listas} verificadas`,VERDE,Q.ocupado):''}</td></tr>`}).join('');
  return card(`<h3 class="font-semibold mb-2">✅ Preguntas separadas en el banco</h3><div class="overflow-x-auto"><table class="w-full text-sm"><tr class="text-left text-slate-500"><th>Materia</th><th>Total</th><th>Publicadas</th><th>Borrador</th><th>Listas para publicar</th><th>Se quedan en borrador por</th><th></th></tr>${filas}</table></div>
    <p class="text-xs text-slate-500 bqp-mt">«Verificadas» = tienen clave de respuesta y ninguna alerta. Las demás siguen en borrador y puedes revisarlas una por una en la pestaña «Preguntas».</p>`);
}
function view(){
  if(typeof M==='undefined'||!M.is_admin)return'';
  const cab=card(`<h2 class="text-xl font-bold">🧩 Preguntas separadas (listas para simulacros)</h2>
    <p class="text-sm text-slate-600">Sube aquí los zip de «preguntas separadas»: cada pregunta ya viene recortada con su enunciado, figuras y opciones, y con su clave de respuesta. Entran como <b>borrador</b> (nadie las ve) y luego tú pulsas «Publicar las verificadas».</p>
    <div class="bqp-mt"><label class="px-3 py-2 rounded-lg text-sm bg-emerald-600 text-white" style="cursor:pointer">📤 Elegir zip(s) de preguntas separadas<input id="bqp_file" type="file" multiple accept=".zip" style="display:none" onchange="BQP.elegir(this)"></label></div>`);
  return cab+Q.items.map((it,i)=>card(cuerpoItem(it,i))).join('')+vResumen();
}

/* ---------- subir ---------- */
async function subirItem(i){
  const it=Q.items[i],D=it.datos,mat=D.materia,fuente=D.fuente;
  it.estado='subiendo';render();
  const prog=(t,p)=>{setT('bqp_t'+i,t);setB('bqp_b'+i,p)};
  const inf={imgNuevas:0,imgYa:0,imgMal:[],filas:0,claves:0};
  prog('Mirando qué hay ya en el banco…',2);
  const existentes=new Map();
  for(const c of trozos(D.preguntas.map(p=>p.id),100)){
    const r=ok(await sb.from('questions').select('id,ext_id,image_path,question_keys(correct)').in('ext_id',c));
    r.forEach(x=>existentes.set(x.ext_id,x));
  }
  // 1) imágenes (4 a la vez). Solo las de preguntas que aún no están.
  const porImg=D.preguntas.filter(p=>p.imagen&&!existentes.has(p.id)),subidas=new Set();let hechas=0;
  await pool(porImg,4,async p=>{
    const ruta=filaPregunta(p,mat,it.grado,fuente).image_path;
    try{
      const bytes=await it.F.bytes(p.imagen);
      const u=await sb.storage.from(BUCKET).upload(ruta,new Blob([bytes],{type:'image/png'}),{contentType:'image/png',upsert:false});
      if(u.error&&!yaExiste(u.error))throw u.error;
      if(u.error)inf.imgYa++;else inf.imgNuevas++;
      subidas.add(p.id);
    }catch(e){inf.imgMal.push(`${p.id}: ${(e&&e.message)||e}`)}
    hechas++;prog(`Imágenes ${hechas} de ${porImg.length}…`,4+hechas/Math.max(1,porImg.length)*70);
  });
  // 2) filas (solo de las que tienen su imagen ya en el depósito)
  prog('Guardando las preguntas…',78);
  const nuevas=porImg.filter(p=>subidas.has(p.id)).map(p=>filaPregunta(p,mat,it.grado,fuente));
  for(const c of trozos(nuevas,40))ok(await sb.from('questions').upsert(c,{onConflict:'ext_id',ignoreDuplicates:true}).select('id'));
  inf.filas=nuevas.length;
  // 2b) preguntas que ya estaban pero no tienen imagen guardada: no se tocan (no se pisa nada)
  // 3) claves: para todas las de este paquete que tengan clave y aún no la tengan en la base
  prog('Guardando las claves de respuesta…',88);
  const ids=new Map();
  for(const c of trozos(D.preguntas.filter(p=>p.clave).map(p=>p.id),100)){
    const r=ok(await sb.from('questions').select('id,ext_id,question_keys(correct)').in('ext_id',c));
    r.forEach(x=>{const k=Array.isArray(x.question_keys)?x.question_keys[0]:x.question_keys;if(!k)ids.set(x.ext_id,x.id)});
  }
  const claves=D.preguntas.filter(p=>p.clave&&ids.has(p.id)).map(p=>({question_id:ids.get(p.id),correct:'ABCD'.indexOf(p.clave)}));
  for(const c of trozos(claves,100))ok(await sb.from('question_keys').upsert(c,{onConflict:'question_id',ignoreDuplicates:true}).select('question_id'));
  inf.claves=claves.length;
  // 4) comprobar
  prog('Comprobando…',96);
  let enBase=0;
  for(const c of trozos(D.preguntas.map(p=>p.id),100))enBase+=(ok(await sb.from('questions').select('id').in('ext_id',c))).length;
  const mal=inf.imgMal.length,completo=enBase>=D.preguntas.length&&!mal;
  it.ya=enBase;
  it.informe=`<b class="${completo?'bqp-ok':'bqp-av'}">${completo?'✅ Listo.':'⚠️ Quedó incompleto.'}</b> ${esc(mat)}: ${enBase} de ${D.preguntas.length} preguntas en la base de datos (como borrador).<br>
    Imágenes nuevas: ${inf.imgNuevas}${inf.imgYa?` (${inf.imgYa} ya estaban)`:''} · Preguntas nuevas: ${inf.filas} · Claves guardadas: ${inf.claves}
    ${mal?`<div class="text-xs bqp-mal bqp-mt">${inf.imgMal.slice(0,5).map(esc).join('<br>')}<br>${/row-level security|policy|permission|not authorized|403/i.test(inf.imgMal.join(' '))?'Parece un tema de PERMISOS del depósito «question-images»: falta darle permiso de escritura al administrador (ver las instrucciones que te dieron).':'Pulsa de nuevo «Completar lo que falta» para reintentar.'}</div>`:''}`;
  it.estado=mal?'listo':'hecho';
  await cargar();render();
}

/* ---------- acciones ---------- */
async function libs(){
  if(!window.JSZip)await loadScript(JSZIP);
  if(!window.JSZip)throw new Error('No se pudo cargar la herramienta para leer el zip. Revisa tu conexión a internet.');
}
function envoltorio(zip){return{existe:p=>!!zip.file(p),bytes:p=>zip.file(p).async('uint8array'),texto:p=>zip.file(p).async('string')}}
window.BQP={
  validar,filaPregunta,BLOQUEAN,
  async load(){await cargar()},
  view,
  elegir(input){
    const files=[...(input.files||[])];if(!files.length)return;
    return(async()=>{
      try{await libs()}catch(e){err(e);return}
      files.forEach(f=>Q.items.push({nombre:f.name,tam:f.size,estado:'leyendo',grado:11}));render();
      for(let k=0;k<files.length;k++){
        const f=files[k],it=Q.items[Q.items.length-files.length+k];
        try{
          if(!/\.zip$/i.test(f.name))throw new Error('Este archivo no es un .zip.');
          if(f.size>250*1024*1024)throw new Error('El zip pesa más de 250 MB. Divídelo en paquetes más pequeños.');
          const zip=await JSZip.loadAsync(f);
          const nombre=Object.keys(zip.files).find(p=>/(^|\/)preguntas\.json$/i.test(p)&&!/__MACOSX/.test(p));
          if(!nombre)throw new Error('Este zip no trae un archivo preguntas.json. Debe ser un zip de «preguntas separadas» (los de Biología, Química o Lectura Crítica por páginas se suben en la sección de arriba).');
          const raiz=nombre.replace(/preguntas\.json$/i,'');
          it.F=envoltorio(zip);
          const datos=JSON.parse(await zip.file(nombre).async('string'));
          it.datos=validar(datos,r=>it.F.existe(raiz+r));
          it.datos.preguntas.forEach(p=>{if(p.imagen)p.imagen=raiz+p.imagen});
          // cuántas ya están en la base
          let ya=0;
          for(const c of trozos(it.datos.preguntas.map(p=>p.id),100))ya+=ok(await sb.from('questions').select('id').in('ext_id',c)).length;
          it.ya=ya;it.estado='listo';
        }catch(e){it.estado='error';it.mensaje=(e&&e.message)||String(e)}
      }
      input.value='';render();
    })();
  },
  setGrado(i,v){Q.items[i].grado=parseInt(v,10)||11},
  quitar(i){Q.items.splice(i,1);render()},
  async subir(i){try{await subirItem(i)}catch(e){const it=Q.items[i];if(it)it.estado='listo';err(e);render()}},
  async publicar(materia){
    const r=Q.resumen.find(x=>x.materia===materia);if(!r||!r.ids.length)return;
    if(!confirm(`¿Publicar ${r.ids.length} preguntas de «${materia}»?\n\nSolo se publican las que tienen clave y ninguna alerta. Quedarán visibles para armar simulacros. Las otras siguen en borrador.`))return;
    Q.ocupado=true;render();
    try{
      for(const c of trozos(r.ids,100))ok(await sb.from('questions').update({status:'published',active:true}).in('id',c).select('id'));
      await cargar();toast('✅','Publicadas',`${r.ids.length} preguntas de ${materia} ya se pueden usar en simulacros.`);
    }catch(e){err(e)}
    Q.ocupado=false;render();
  }
};
})();
