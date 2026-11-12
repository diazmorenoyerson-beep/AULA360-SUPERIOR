/* AulaICFES — Cuadernillo tipo ICFES: portada, instrucciones, preguntas a dos columnas,
   contexto compartido una sola vez ("Responda las preguntas N a M..."), vista previa antes de imprimir o publicar. */
window.CUAD=(function(){
const e=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const L='ABCD';
function css(){
  if(document.getElementById('cuad-css'))return;
  const s=document.createElement('style');s.id='cuad-css';
  s.textContent=`
.cq{font-family:Arial,Helvetica,sans-serif;color:#000;font-size:9.5pt;line-height:1.3;background:#fff}
.cq .cq-page{page-break-after:always;position:relative}
.cq .cq-page:last-child{page-break-after:auto}
.cq .cq-cover{min-height:255mm;display:flex;flex-direction:column;border:2px solid #000;padding:10mm 12mm;box-sizing:border-box}
.cq .cq-brand{display:flex;align-items:center;gap:10px;border-bottom:3px solid #000;padding-bottom:6px}
.cq .cq-brand img{height:18mm;width:auto}
.cq .cq-brand .t{flex:1;text-align:center;font-weight:bold;font-size:13pt;line-height:1.25}
.cq .cq-big{font-size:30pt;font-weight:900;text-align:center;margin:14mm 0 2mm;letter-spacing:1px}
.cq .cq-sub{font-size:14pt;text-align:center;font-weight:bold;margin-bottom:8mm}
.cq table.cq-id{width:100%;border-collapse:collapse;margin:4mm 0 6mm;font-size:10pt}
.cq table.cq-id td{border:1px solid #000;padding:5px 8px}
.cq table.cq-id td.k{background:#e5e5e5;font-weight:bold;width:32%;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.cq .cq-ins{border:1.5px solid #000;padding:6mm;font-size:10pt}
.cq .cq-ins h4{margin:0 0 3mm;font-size:11pt;text-align:center;text-transform:uppercase}
.cq .cq-ins ol{margin:0;padding-left:6mm}.cq .cq-ins li{margin-bottom:2.2mm}
.cq .cq-foot{margin-top:auto;text-align:center;font-size:8.5pt;padding-top:6mm}
.cq .cq-run{display:flex;justify-content:space-between;border-bottom:1.5px solid #000;padding-bottom:2px;margin-bottom:4mm;font-size:8.5pt;font-weight:bold}
.cq .cq-cols{column-count:2;column-gap:9mm;column-rule:1px solid #999}
.cq .cq-q{break-inside:avoid;margin:0 0 4.5mm;display:flex;gap:2mm}
.cq .cq-n{font-weight:bold;min-width:6mm}
.cq .cq-q .op{margin:1.2mm 0 0;display:flex;gap:2mm}.cq .cq-q .op b{min-width:4mm}
.cq .cq-q img{max-width:100%;height:auto}
.cq .cq-ctx{border:1.5px solid #000;padding:2.5mm 3mm;margin:0 0 3mm;break-inside:auto}
.cq .cq-ctx .h{font-weight:bold;text-transform:uppercase;font-size:8.5pt;margin-bottom:1.5mm;border-bottom:1px solid #000;padding-bottom:1mm}
.cq .cq-ctx .tt{font-weight:bold;margin-bottom:1mm}
.cq .cq-ctx .tx{white-space:pre-wrap;text-align:justify}
.cq .cq-area{column-span:all;background:#111;color:#fff;font-weight:bold;text-transform:uppercase;letter-spacing:1px;text-align:center;padding:2mm;margin:2mm 0 4mm;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.cq .cq-blank{min-height:200mm;display:flex;align-items:center;justify-content:center;font-size:10pt;color:#444;border:1px dashed #888}
.cq-prev{position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.72);display:flex;flex-direction:column}
.cq-prev .bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:10px 14px;background:#fff;border-bottom:1px solid #cbd5e1}
.cq-prev .bar b{margin-right:auto;font-size:15px}
.cq-prev .bar button{padding:8px 14px;border-radius:10px;border:0;font-weight:700;cursor:pointer}
.cq-prev .body{flex:1;overflow:auto;padding:16px}
.cq-prev .paper{background:#fff;width:210mm;max-width:100%;margin:0 auto 14px;padding:12mm;box-shadow:0 4px 18px rgba(0,0,0,.35);box-sizing:border-box}
@media print{.cq .cq-page{page-break-after:always}}`;
  document.head.appendChild(s);
}
/* items: preguntas ordenadas (ya con grupo_key). Devuelve bloques con numeración continua. */
function prepararPreguntas(items){
  const out=[];let n=0,i=0,lastArea=null;
  while(i<items.length){
    const q=items[i];
    if(q.area&&q.area!==lastArea){out.push({tipo:'area',titulo:q.area});lastArea=q.area}
    const key=q.grupo_key&&q.stimulus_content?q.grupo_key:null;
    if(key){
      let j=i;const grp=[];
      while(j<items.length&&items[j].grupo_key===key){grp.push(items[j]);j++}
      const desde=n+1;grp.forEach(g=>{n++;g._num=n});
      out.push({tipo:'grupo',desde,hasta:n,titulo:q.stimulus_title,texto:q.stimulus_content,preguntas:grp});
      i=j;
    }else{n++;q._num=n;out.push({tipo:'sola',desde:n,hasta:n,preguntas:[q]});i++}
  }
  return{bloques:out,total:n};
}
function qHtml(q,img){
  if(q.image_path)return`<div class="cq-q"><span class="cq-n">${q._num}.</span><div><img src="${img}${encodeURI(q.image_path)}" alt=""></div></div>`;
  const ctx=(!q.__enGrupo&&q.stimulus_content)?`<div class="cq-ctx"><div class="tx">${e(q.stimulus_content)}</div></div>`:'';
  return`<div class="cq-q"><span class="cq-n">${q._num}.</span><div>${ctx}<div>${e(q.body)}</div>${(q.options||[]).map((o,k)=>`<div class="op"><b>${L[k]}.</b><span>${e(o)}</span></div>`).join('')}</div></div>`;
}
function bloqueHtml(b,img){
  if(b.tipo==='area')return`<div class="cq-area">${e(b.titulo)}</div>`;
  if(b.tipo==='sola')return qHtml(b.preguntas[0],img);
  b.preguntas.forEach(p=>p.__enGrupo=true);
  const enc=b.desde===b.hasta?`Responda la pregunta ${b.desde}`:`Responda las preguntas ${b.desde} a ${b.hasta}`;
  return`<div class="cq-ctx"><div class="h">${enc} de acuerdo con la siguiente información</div>${b.titulo?`<div class="tt">${e(b.titulo)}</div>`:''}<div class="tx">${e(b.texto)}</div></div>`+b.preguntas.map(p=>qHtml(p,img)).join('');
}
/* spec: {titulo, tipo('Prueba de periodo'|'Simulacro'|'Examen'), colegio, logo, asignatura, curso, fecha, estudiante, documento, codigo, version, minutos, preguntas:[...], img(base URL de imágenes)} */
function html(spec){
  css();
  const img=spec.img||(typeof IMG!=='undefined'?IMG:'');
  const P=prepararPreguntas(spec.preguntas.map(q=>({...q})));
  const run=`<div class="cq-run"><span>${e(spec.colegio||'')}</span><span>${e(spec.asignatura||'')}${spec.version?' · Cuadernillo '+e(spec.version):''}</span></div>`;
  const filas=[['Prueba',spec.titulo],['Asignatura / área',spec.asignatura],['Curso',spec.curso],['Fecha',spec.fecha],['Estudiante',spec.estudiante],['Documento',spec.documento],['Código',spec.codigo]].filter(r=>r[1]!=null&&r[1]!=='');
  const cover=`<div class="cq-page"><div class="cq-cover">
    <div class="cq-brand">${spec.logo?`<img src="${e(spec.logo)}" alt="">`:''}<div class="t">${e(spec.colegio||'')}</div></div>
    <div class="cq-big">${e((spec.tipo||'Prueba').toUpperCase())}</div>
    <div class="cq-sub">${e(spec.asignatura||'')}</div>
    <table class="cq-id">${filas.map(r=>`<tr><td class="k">${e(r[0])}</td><td>${e(r[1])}</td></tr>`).join('')}</table>
    <div class="cq-ins"><h4>Instrucciones</h4><ol>
      <li>Este cuadernillo contiene <b>${P.total}</b> preguntas${spec.duracion?`. ${e(spec.duracion)}`:spec.minutos?` y tiene una duración de <b>${spec.minutos} minutos</b>`:''}.</li>
      <li>Cada pregunta tiene cuatro opciones de respuesta (A, B, C, D) y <b>solo una</b> es correcta.</li>
      <li>Lea con atención. Algunas preguntas comparten una misma información: está al comienzo del grupo ("Responda las preguntas … de acuerdo con la siguiente información").</li>
      <li>Marque sus respuestas <b>únicamente en la hoja de respuestas</b>, rellenando por completo un solo óvalo por pregunta, con lápiz o bolígrafo negro.</li>
      <li>No marque con X ni con chulo, no haga dos marcas y no doble ni arrugue la hoja.</li>
      <li>Puede usar este cuadernillo para hacer sus anotaciones, pero solo se califica la hoja de respuestas.</li>
      <li>No se permite el uso de celulares ni de material de consulta, salvo que su docente lo indique.</li>
    </ol></div>
    <div class="cq-foot">No abra este cuadernillo hasta que se lo indiquen.</div></div></div>`;
  const cuerpo=`<div class="cq-page">${run}<div class="cq-cols">${P.bloques.map(b=>bloqueHtml(b,img)).join('')}</div></div>`;
  const fin=`<div class="cq-page">${run}<div class="cq-blank">Espacio para anotaciones</div></div>`;
  return`<div class="cq">${cover}${cuerpo}${fin}</div>`;
}
function hojaRespuestas(spec){
  if(typeof HOJA==='undefined')throw new Error('Falta hoja.js');
  const P=prepararPreguntas(spec.preguntas.map(q=>({...q})));
  return HOJA.html(HOJA.layout(P.total),{titulo:(spec.titulo||'')+' · '+(spec.asignatura||''),colegio:spec.colegio,nombre:spec.estudiante,documento:spec.documento||'',curso:spec.curso,fecha:spec.fecha,version:spec.vIdx|0,codigo:spec.codigo,logo:spec.logo});
}
async function imprimir(spec,conHoja){
  css();
  if(conHoja&&typeof HOJA==='undefined')await loadScript('hoja.js?v=3');
  const h=html(spec)+(conHoja?'<div class="pg">'+hojaRespuestas(spec)+'</div>':'');
  if(typeof doPrint==='function')return doPrint(h);
  const w=window.open('','_blank');w.document.write(h);w.document.close();w.print();
}
/* Vista previa antes de imprimir o publicar. opciones: {onPublicar:fn, textoPublicar} */
async function vistaPrevia(spec,op){
  css();op=op||{};
  if(typeof HOJA==='undefined'){try{await loadScript('hoja.js?v=3')}catch(_){}}
  const d=document.createElement('div');d.className='cq-prev';d.id='cq-prev';
  const hoja=(()=>{try{return typeof HOJA!=='undefined'?hojaRespuestas(spec):''}catch(_){return''}})();
  d.innerHTML=`<div class="bar"><b>👁️ Vista previa · ${e(spec.titulo||'')}</b>
    <button style="background:#e2e8f0" onclick="CUAD.cerrar()">← Volver y editar</button>
    <button style="background:#4f46e5;color:#fff" onclick="CUAD._imp(false)">🖨️ Imprimir cuadernillo</button>
    ${hoja?`<button style="background:#0ea5e9;color:#fff" onclick="CUAD._imp(true)">🖨️ Cuadernillo + hoja de respuestas</button>`:''}
    ${op.onPublicar?`<button style="background:#059669;color:#fff" onclick="CUAD._pub()">${e(op.textoPublicar||'✅ Publicar')}</button>`:''}</div>
    <div class="body"><div class="paper">${html(spec)}</div>${hoja?`<div class="paper" style="padding:0;overflow:auto">${hoja}</div>`:''}</div>`;
  document.body.appendChild(d);
  CUAD._spec=spec;CUAD._op=op;
}
function cerrar(){const d=document.getElementById('cq-prev');if(d)d.remove()}
return{prepararPreguntas,html,hojaRespuestas,imprimir,vistaPrevia,cerrar,
  _imp(h){imprimir(CUAD._spec,h)},_pub(){const f=CUAD._op&&CUAD._op.onPublicar;cerrar();if(f)f()}};
})();
