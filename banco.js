/* AulaICFES · banco.js
   Espacio del administrador para subir paquetes de banco de preguntas (.zip) a Supabase.
   Lee el zip en el navegador, sube las imágenes al depósito privado "banco-icfes" y guarda las páginas
   y las claves en la base de datos. Se puede repetir sin miedo: no duplica y completa lo que falte.
   Solo el administrador puede usarlo (lo garantizan los permisos de la base de datos). */
(function(){
'use strict';
const BUCKET='banco-icfes',JSZIP='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
if(!document.getElementById('bq-css')){const st=document.createElement('style');st.id='bq-css';st.textContent='.bq-barra{background:#e2e8f0;border-radius:8px;height:10px;overflow:hidden}.bq-barra>div{background:#4f46e5;height:10px;width:0;transition:width .2s}.bq-mt{margin-top:.75rem}.bq-mb{margin-bottom:.5rem}.bq-ok{color:#047857}.bq-mal{color:#b91c1c}.bq-av{color:#b45309}.bq-mini{display:inline-block;margin:0 .25rem .25rem 0;padding:.1rem .45rem;border-radius:.4rem;background:#eef2ff;font-size:.72rem}.bq-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:.6rem}.bq-grid img{width:100%;border:1px solid #cbd5e1;border-radius:.4rem;background:#fff}';document.head.appendChild(st)}
const B={docs:[],items:[],materias:[],ver:null,pags:[],pagN:0,filtro:'',claves:[],informes:{},cargando:false};
const PAG=24;
const ok=r=>{if(r&&r.error)throw r.error;return(r&&r.data)||[]};
const card=h=>`<div class="bg-white rounded-2xl p-4 shadow">${h}</div>`;
const btn=(fn,t,c)=>`<button onclick="${fn}" class="px-3 py-1.5 rounded-lg text-xs ${c||'bg-slate-200'}">${t}</button>`;
const BTN='bg-indigo-600 text-white';
const fd=x=>x?new Date(x).toLocaleDateString('es-CO'):'—';
const mb=n=>(n/1048576).toFixed(1)+' MB';
const setT=(id,t)=>{const e=document.getElementById(id);if(e)e.textContent=t};
const setB=(id,p)=>{const e=document.getElementById(id);if(e)e.style.width=Math.max(0,Math.min(100,p))+'%'};
async function libs(){
  await loadScript(JSZIP);await loadScript('banco_paquete.js?v=1');
  if(!window.JSZip||!window.HZB)throw new Error('No se pudieron cargar las herramientas para leer el zip. Revisa tu conexión a internet.');
}
const slug=s=>window.HZB?window.HZB.slug(s):String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-');
function envoltorio(zip){
  return{lista:()=>Object.keys(zip.files).filter(p=>!zip.files[p].dir),
    texto:p=>zip.file(p).async('string'),bytes:p=>zip.file(p).async('uint8array')};
}
const yaExiste=e=>e&&(e.statusCode==='409'||e.status===409||/already exists|duplicate/i.test(String(e.message||'')));
async function pool(items,n,fn){let i=0;const w=[...Array(Math.min(n,items.length))].map(async()=>{while(i<items.length){const k=i++;await fn(items[k],k)}});await Promise.all(w)}
async function todas(mk){let out=[],d=0;for(;;){const r=await mk().range(d,d+999);if(r.error)throw r.error;out=out.concat(r.data||[]);if(!r.data||r.data.length<1000)break;d+=1000}return out}

/* ---------- datos ---------- */
async function cargar(){
  B.docs=ok(await sb.from('banco_documentos_resumen').select('*').order('materia').order('created_at',{ascending:false}));
  if(!B.materias.length){
    const r=await sb.from('asignaturas').select('banco_subject');
    B.materias=[...new Set((r.data||[]).map(x=>x.banco_subject).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
  }
}

/* ---------- pantalla ---------- */
function cuerpoItem(it,i){
  if(it.estado==='leyendo')return`<p class="text-sm">⏳ Leyendo «${E(it.nombre)}» (${mb(it.tam)})…</p>`;
  if(it.estado==='error')return`<p class="text-sm"><b>${E(it.nombre)}</b></p><p class="text-sm bq-mal">⚠️ ${E(it.mensaje)}</p><div class="bq-mt">${btn(`BANCO.quitarItem(${i})`,'Quitar')}</div>`;
  const P=it.pq,r=window.HZB.resumen(P),ex=it.existente;
  const completo=ex&&ex.paginas.size>=r.conImagen&&r.conImagen>0&&ex.paginasOk;
  const mat=`<select class="border rounded-lg p-2" ${ex?'disabled':''} onchange="BANCO.setMateria(${i},this.value)">${B.materias.map(m=>`<option ${m===it.materia?'selected':''}>${E(m)}</option>`).join('')}${B.materias.includes(it.materia)?'':`<option selected>${E(it.materia)}</option>`}</select>`;
  const avisos=P.avisos.concat(P.notas);
  const informe=it.informe?`<div class="text-sm bq-mt">${it.informe}</div>`:'';
  const estado=it.estado==='subiendo'?`<div class="bq-mt"><div class="bq-barra"><div id="bq_b${i}"></div></div><p class="text-xs bq-mt" id="bq_t${i}">Preparando…</p></div>`
    :it.estado==='hecho'?`${informe}<div class="bq-mt">${btn(`BANCO.quitarItem(${i})`,'Quitar de la lista')}</div>`
    :`${informe}<div class="bq-mt flex flex-wrap gap-2 items-center">${completo?'<span class="text-sm bq-ok">✅ Este paquete ya está completo en el banco.</span>':btn(`BANCO.subir(${i})`,ex?'🔁 Completar lo que falta':'⬆️ Subir al banco',BTN)}${btn(`BANCO.quitarItem(${i})`,'Quitar de la lista')}</div>`;
  return`<div class="flex flex-wrap gap-3 items-center"><div><div class="font-semibold">${E(P.nombre)}</div><div class="text-xs text-slate-500">Archivo: ${E(it.nombre)} · ${mb(it.tam)} · formato: ${E({biologia:'paquete de Biología',quimica:'paquete de Química',lectura:'paquete de Lectura Crítica',general:'formato general (banco.json)'}[P.formato]||P.formato)}</div></div></div>
    <div class="grid sm:grid-cols-3 gap-2 bq-mt text-sm"><label>Materia ${mat}</label><div><b>${r.paginas}</b> páginas (${r.conImagen} con imagen${r.sinImagen?`, <span class="bq-mal">${r.sinImagen} sin imagen</span>`:''})</div><div>PDF original: <b>${r.pdf?'sí':'no'}</b> · Claves: <b>${r.claves}</b></div></div>
    ${ex?`<p class="text-xs bq-av bq-mt">Ya existe en el banco como «${E(ex.materia)}» (${ex.paginas.size} de ${r.conImagen} páginas cargadas). Si pulsas «Completar», solo se suben las que faltan.</p>`:''}
    ${avisos.length?`<div class="text-xs bq-av bq-mt">${avisos.slice(0,6).map(E).join('<br>')}${avisos.length>6?`<br>… y ${avisos.length-6} avisos más`:''}</div>`:''}${estado}`;
}
function vDocs(){
  if(!B.docs.length)return card('<h3 class="font-semibold mb-1">📚 Bancos cargados</h3><p class="text-sm text-slate-500">Todavía no hay ningún banco cargado.</p>');
  const filas=B.docs.map(d=>{const inf=B.informes[d.id];
    return`<tr class="border-t"><td class="py-1"><b>${E(d.materia)}</b></td><td>${E(d.nombre)}</td><td>${d.paginas_cargadas} de ${d.total_paginas}${d.paginas_cargadas<d.total_paginas?' <span class="bq-av">⚠️</span>':''}</td><td>${d.claves||'—'}</td><td>${d.pdf_path?'sí':'no'}</td><td>${fd(d.created_at)}</td><td><div class="flex gap-1 flex-wrap">${btn(`BANCO.verDoc('${d.id}')`,'Ver páginas')}${btn(`BANCO.verificar('${d.id}')`,'Verificar')}${btn(`BANCO.quitarDoc('${d.id}')`,'Quitar')}</div>${inf?`<div class="text-xs bq-mt">${inf}</div>`:''}</td></tr>`}).join('');
  return card(`<h3 class="font-semibold mb-2">📚 Bancos cargados (${B.docs.length})</h3><div class="overflow-x-auto"><table class="w-full text-sm"><tr class="text-left text-slate-500"><th>Materia</th><th>Documento</th><th>Páginas</th><th>Claves</th><th>PDF</th><th>Subido</th><th></th></tr>${filas}</table></div>`);
}
function vVisor(){
  const d=B.docs.find(x=>x.id===B.ver);if(!d)return'';
  const secs=[...new Set(B.pags.map(p=>p.seccion).filter(Boolean))];
  const f=B.pags.filter(p=>(!B.filtro||p.seccion===B.filtro));
  const trozo=f.slice(B.pagN*PAG,B.pagN*PAG+PAG),np=Math.max(1,Math.ceil(f.length/PAG));
  const claves=B.claves.length?`<details class="bq-mt"><summary class="text-sm" style="cursor:pointer">🔑 Claves de respuesta (${B.claves.length}) — pendientes de cotejar con el PDF</summary><div class="bq-mt">${B.claves.map(k=>`<span class="bq-mini">${k.numero}: <b>${E(k.clave||'?')}</b></span>`).join('')}</div></details>`:'';
  return card(`<div class="flex flex-wrap gap-2 items-center bq-mb"><h3 class="font-semibold">🖼️ ${E(d.materia)} · ${E(d.nombre)}</h3>${btn('BANCO.cerrarVisor()','Cerrar')}</div>
    <div class="flex flex-wrap gap-2 items-center bq-mb text-sm"><label>Sección <select class="border rounded-lg p-2" onchange="BANCO.setFiltro(this.value)"><option value="">Todas (${B.pags.length})</option>${secs.map(s=>`<option value="${E(s)}" ${B.filtro===s?'selected':''}>${E(s)} (${B.pags.filter(p=>p.seccion===s).length})</option>`).join('')}</select></label>
    ${btn('BANCO.pag(-1)','◀')}<span>Página ${B.pagN+1} de ${np}</span>${btn('BANCO.pag(1)','▶')}</div>
    <div class="bq-grid">${trozo.map(p=>`<div class="text-xs"><a href="#" onclick="BANCO.abrir('${p.id}');return false">${p.url?`<img loading="lazy" src="${E(p.url)}" alt="Página ${p.pagina}">`:'<div style="height:120px;background:#f1f5f9;border-radius:.4rem"></div>'}</a><div class="bq-mt"><b>Pág. ${p.pagina}</b> ${p.estado_revision==='revisada'?'✅':''}<br><span class="text-slate-500">${E(p.seccion||'')}</span></div></div>`).join('')}</div>${claves}`);
}
function vBanco(){
  if(!M.is_admin)return card('<h2 class="text-xl font-bold">📦 Banco por paquetes</h2><p class="text-sm bq-mal">Solo el administrador puede usar esta pantalla.</p>');
  const cab=card(`<h2 class="text-xl font-bold">📦 Banco de preguntas por paquetes</h2>
    <p class="text-sm text-slate-600">Sube aquí los paquetes (.zip) de cada área. La página lee el zip, sube las imágenes de las páginas al depósito privado y guarda las páginas y sus claves en la base de datos. Puedes subir varios a la vez.</p>
    <div class="bq-mt"><label class="px-3 py-2 rounded-lg text-sm bg-indigo-600 text-white" style="cursor:pointer">📤 Elegir paquete(s) .zip<input id="bq_file" type="file" multiple accept=".zip" style="display:none" onchange="BANCO.elegir(this)"></label></div>
    <details class="bq-mt"><summary class="text-sm" style="cursor:pointer">¿Qué formato de paquete se acepta?</summary><div class="text-xs text-slate-600 bq-mt">Se leen solos los paquetes de <b>Biología</b>, <b>Química</b> y <b>Lectura Crítica</b> con la forma en que ya los tienes. Para áreas nuevas usa el <b>formato general</b>: un zip con un archivo <code>banco.json</code> (materia, nombre y la lista de páginas con su imagen), las imágenes de las páginas y, si lo tienes, el PDF original. Lo que venga en el paquete se guarda tal cual, sin cambiarlo.</div></details>`);
  const items=B.items.map((it,i)=>card(cuerpoItem(it,i))).join('');
  return`<div class="space-y-4">${window.BQP?BQP.view():''}${cab}${items}${vDocs()}${vVisor()}</div>`;
}

/* ---------- subir un paquete ---------- */
async function subirItem(i){
  const it=B.items[i],P=it.pq;
  const materia=String(it.materia||'').trim();
  if(materia.length<2)throw new Error('Escribe o elige la materia del paquete.');
  it.estado='subiendo';render();
  const prog=(t,p)=>{setT('bq_t'+i,t);setB('bq_b'+i,p)};
  const inf={imgNuevas:0,imgYa:0,imgMal:[],pagNuevas:0,pagYa:0,clavesNuevas:0,pdf:''};
  const prefijo=slug(materia)+'/'+P.huella.slice(0,12);
  // 1) documento
  prog('Registrando el documento…',2);
  let doc=(await sb.from('banco_documentos').select('*').eq('huella',P.huella).maybeSingle()).data;
  if(!doc){
    doc=ok(await sb.from('banco_documentos').insert({materia,nombre:P.nombre.slice(0,200),archivo_fuente:P.archivo_fuente||null,formato:P.formato,huella:P.huella,total_paginas:P.paginas.length,
      referentes:P.referentes||{},notas:P.notas.concat(P.avisos),subido_por:M.id}).select().single());
  }
  // 2) PDF original
  if(P.pdf&&!doc.pdf_path){
    prog('Subiendo el PDF original…',4);
    const ruta=prefijo+'/original/'+(window.HZB.nombreDe(P.pdf).replace(/[^A-Za-z0-9._-]+/g,'_')||'original.pdf');
    const blob=new Blob([await it.F.bytes(P.pdf)],{type:'application/pdf'});
    const u=await sb.storage.from(BUCKET).upload(ruta,blob,{contentType:'application/pdf',upsert:false});
    if(u.error&&!yaExiste(u.error))inf.pdf='No se pudo subir el PDF original: '+(u.error.message||u.error);
    else{ok(await sb.from('banco_documentos').update({pdf_path:ruta}).eq('id',doc.id));inf.pdf='PDF original guardado'}
  }
  // 3) imágenes de las páginas (4 a la vez)
  const conImg=P.paginas.filter(p=>p.imagen),listas=new Map();let hechas=0;
  await pool(conImg,4,async p=>{
    const ext=((p.imagen.match(/\.([a-z0-9]+)$/i)||[])[1]||'png').toLowerCase().replace('jpeg','jpg');
    const ruta=`${prefijo}/paginas/pagina_${window.HZB.pad(p.pagina,3)}.${ext}`;
    try{
      const bytes=await it.F.bytes(p.imagen);
      const blob=new Blob([bytes],{type:ext==='jpg'?'image/jpeg':ext==='webp'?'image/webp':'image/png'});
      const u=await sb.storage.from(BUCKET).upload(ruta,blob,{contentType:blob.type,upsert:false});
      if(u.error&&!yaExiste(u.error))throw u.error;
      if(u.error)inf.imgYa++;else inf.imgNuevas++;
      listas.set(p.pagina,ruta);
    }catch(e){inf.imgMal.push(`página ${p.pagina}: ${(e&&e.message)||e}`)}
    hechas++;prog(`Imágenes ${hechas} de ${conImg.length}…`,5+hechas/conImg.length*80);
  });
  // 4) filas de las páginas (solo las que tienen su imagen guardada)
  prog('Guardando las páginas en la base de datos…',88);
  const ya=new Set((await todas(()=>sb.from('banco_paginas').select('pagina').eq('documento_id',doc.id))).map(x=>x.pagina));
  const filas=P.paginas.filter(p=>listas.has(p.pagina)&&!ya.has(p.pagina)).map(p=>({documento_id:doc.id,pagina:p.pagina,seccion:p.seccion,ambitos:p.ambitos,texto_indice:p.texto,etiquetas:p.etiquetas,
    imagen_path:listas.get(p.pagina),clasificacion_men:p.clasificacion_men||{},registro_original:p.original||{}}));
  for(let k=0;k<filas.length;k+=20)ok(await sb.from('banco_paginas').upsert(filas.slice(k,k+20),{onConflict:'documento_id,pagina',ignoreDuplicates:true}));
  inf.pagNuevas=filas.length;inf.pagYa=ya.size;
  // 5) claves
  if(P.claves.length){
    const kya=new Set((await sb.from('banco_claves').select('numero').eq('documento_id',doc.id)).data.map(x=>x.numero));
    const ks=P.claves.filter(k=>!kya.has(k.numero)).map(k=>({documento_id:doc.id,numero:k.numero,pagina:k.pagina,clave:k.clave,estado:k.estado,registro_original:k.original||{}}));
    if(ks.length)ok(await sb.from('banco_claves').upsert(ks,{onConflict:'documento_id,numero',ignoreDuplicates:true}));
    inf.clavesNuevas=ks.length;
  }
  // 6) comprobar contra la base de datos
  prog('Comprobando…',96);
  const n=(await sb.from('banco_paginas').select('id',{count:'exact',head:true}).eq('documento_id',doc.id)).count||0;
  const mal=inf.imgMal.length,completo=n>=conImg.length&&!mal&&!P.paginas.some(p=>p.sinImagen);
  it.informe=`<b class="${completo?'bq-ok':'bq-av'}">${completo?'✅ Listo.':'⚠️ Quedó incompleto.'}</b> ${E(materia)}: ${n} de ${P.paginas.length} páginas en la base de datos.<br>
    Imágenes: ${inf.imgNuevas} nuevas${inf.imgYa?`, ${inf.imgYa} que ya estaban`:''}${mal?`, <span class="bq-mal">${mal} con error</span>`:''} · Páginas guardadas ahora: ${inf.pagNuevas} · Claves: ${inf.clavesNuevas}${inf.pdf?' · '+E(inf.pdf):''}
    ${mal?`<div class="text-xs bq-mal bq-mt">${inf.imgMal.slice(0,5).map(E).join('<br>')}<br>Pulsa de nuevo «Completar lo que falta» para reintentar.</div>`:''}`;
  it.estado=mal?'listo':'hecho';
  it.existente={id:doc.id,materia:doc.materia,paginas:new Set([...ya,...filas.map(f=>f.pagina)]),paginasOk:completo};
  await cargar();render();
}

/* ---------- acciones ---------- */
window.BANCO={
  async load(){await cargar();try{await loadScript('banco_preguntas.js?v=1');await BQP.load()}catch(e){console.warn('banco_preguntas',e)}},
  view(){return vBanco()},
  elegir(input){
    const files=[...(input.files||[])];if(!files.length)return;
    return(async()=>{
      try{await libs()}catch(e){err(e);return}
      for(const f of files){
        const it={nombre:f.name,tam:f.size,estado:'leyendo'};B.items.push(it);
      }
      render();
      for(let k=0;k<files.length;k++){
        const f=files[k],it=B.items[B.items.length-files.length+k];
        try{
          if(!/\.zip$/i.test(f.name))throw new Error('Este archivo no es un .zip.');
          if(f.size>200*1024*1024)throw new Error('El zip pesa más de 200 MB. Divídelo en paquetes más pequeños.');
          const zip=await JSZip.loadAsync(f);it.F=envoltorio(zip);it.pq=await HZB.analizar(it.F);it.materia=it.pq.materia;it.estado='listo';
          const ex=(await sb.from('banco_documentos').select('id,materia').eq('huella',it.pq.huella).maybeSingle()).data;
          if(ex){const ps=await todas(()=>sb.from('banco_paginas').select('pagina').eq('documento_id',ex.id));
            const imgs=it.pq.paginas.filter(p=>p.imagen).length;
            it.existente={id:ex.id,materia:ex.materia,paginas:new Set(ps.map(x=>x.pagina)),paginasOk:ps.length>=imgs};it.materia=ex.materia}
        }catch(e){it.estado='error';it.mensaje=(e&&e.message)||String(e)}
      }
      input.value='';render();
    })();
  },
  setMateria(i,v){B.items[i].materia=v},
  quitarItem(i){B.items.splice(i,1);render()},
  async subir(i){try{await subirItem(i)}catch(e){const it=B.items[i];if(it){it.estado='listo'}err(e);render()}},
  async verificar(id){
    try{
      const d=B.docs.find(x=>x.id===id);
      const ps=await todas(()=>sb.from('banco_paginas').select('pagina,imagen_path').eq('documento_id',id));
      const dir=ps.length?ps[0].imagen_path.split('/').slice(0,-1).join('/'):'';
      let enAlmacen=0;
      if(dir){for(let o=0;;o+=100){const r=await sb.storage.from(BUCKET).list(dir,{limit:100,offset:o});if(r.error)throw r.error;enAlmacen+=(r.data||[]).length;if((r.data||[]).length<100)break}}
      const bien=ps.length===d.total_paginas&&enAlmacen>=ps.length;
      B.informes[id]=bien?`<span class="bq-ok">✅ Todo en orden: ${ps.length} páginas en la base y ${enAlmacen} imágenes en el depósito.</span>`:`<span class="bq-mal">⚠️ ${ps.length} páginas en la base de ${d.total_paginas} y ${enAlmacen} imágenes en el depósito. Vuelve a subir el zip y pulsa «Completar lo que falta».</span>`;
      render();
    }catch(e){err(e)}
  },
  async quitarDoc(id){
    const d=B.docs.find(x=>x.id===id);if(!d)return;
    if(!confirm(`¿Quitar «${d.materia} · ${d.nombre}» del banco?\n\nSe borrarán sus ${d.paginas_cargadas} páginas, sus claves y sus imágenes. Para tenerlo otra vez tendrás que volver a subir el zip.`))return;
    try{
      const ps=await todas(()=>sb.from('banco_paginas').select('imagen_path').eq('documento_id',id));
      const rutas=ps.map(p=>p.imagen_path);if(d.pdf_path)rutas.push(d.pdf_path);
      for(let k=0;k<rutas.length;k+=50){const r=await sb.storage.from(BUCKET).remove(rutas.slice(k,k+50));if(r.error)throw r.error}
      ok(await sb.from('banco_documentos').delete().eq('id',id));
      if(B.ver===id)B.ver=null;delete B.informes[id];toast('🗑️','Quitado','El banco se quitó por completo.');await cargar();render();
    }catch(e){err(e)}
  },
  async verDoc(id){
    try{
      B.ver=id;B.filtro='';B.pagN=0;B.pags=[];B.claves=[];render();
      B.pags=await todas(()=>sb.from('banco_paginas').select('id,pagina,seccion,ambitos,etiquetas,imagen_path,estado_revision').eq('documento_id',id).order('pagina'));
      B.claves=await todas(()=>sb.from('banco_claves').select('numero,clave,estado').eq('documento_id',id).order('numero'));
      await firmar();render();
    }catch(e){err(e)}
  },
  cerrarVisor(){B.ver=null;B.pags=[];render()},
  async setFiltro(v){B.filtro=v;B.pagN=0;await firmar();render()},
  async pag(d){const f=B.pags.filter(p=>!B.filtro||p.seccion===B.filtro),np=Math.max(1,Math.ceil(f.length/PAG));B.pagN=Math.max(0,Math.min(np-1,B.pagN+d));await firmar();render()},
  async abrir(pid){
    try{const p=B.pags.find(x=>x.id===pid);if(!p)return;const r=await sb.storage.from(BUCKET).createSignedUrl(p.imagen_path,3600);if(r.error)throw r.error;window.open(r.data.signedUrl,'_blank')}catch(e){err(e)}
  }
};
async function firmar(){
  const f=B.pags.filter(p=>!B.filtro||p.seccion===B.filtro),trozo=f.slice(B.pagN*PAG,B.pagN*PAG+PAG).filter(p=>!p.url);
  if(!trozo.length)return;
  const r=await sb.storage.from(BUCKET).createSignedUrls(trozo.map(p=>p.imagen_path),3600);
  if(r.error)throw r.error;
  (r.data||[]).forEach((u,i)=>{if(u&&u.signedUrl)trozo[i].url=u.signedUrl});
}
})();
