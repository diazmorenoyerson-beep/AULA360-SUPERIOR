/* AulaICFES · banco_paquete.js
   Lee un paquete de banco de preguntas (un .zip ya abierto) y lo entrega en un formato único.
   No cambia el contenido: el texto, las etiquetas y la clasificación se copian tal cual vienen.
   Entiende: Biología, Química y Lectura Crítica (los paquetes que ya existen) y un formato general nuevo
   (banco.json) para los paquetes futuros. Funciona en el navegador (window.HZB) y en Node (pruebas).

   Entrada F = { lista():[rutas], texto(ruta):Promise<string>, bytes(ruta):Promise<Uint8Array> } */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();else root.HZB=factory();
})(typeof self!=='undefined'?self:this,function(){
'use strict';

const norm=s=>String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const limpiaRuta=p=>String(p).replace(/\\/g,'/').replace(/^\.\//,'');
const nombreDe=p=>limpiaRuta(p).split('/').pop();
const dirDe=p=>{const a=limpiaRuta(p).split('/');a.pop();return a.join('/')};
const unir=(d,r)=>limpiaRuta((d?d+'/':'')+r).replace(/\/+/g,'/');
const esImg=p=>/\.(png|jpe?g|webp)$/i.test(p);
const slug=s=>norm(s).replace(/ /g,'-')||'sin-nombre';
const pad=(n,k)=>String(n).padStart(k,'0');

async function sha256(bytes){
  let c=(typeof globalThis!=='undefined'&&globalThis.crypto&&globalThis.crypto.subtle)?globalThis.crypto:null;
  if(!c&&typeof require==='function')c=require('crypto').webcrypto;
  const h=await c.subtle.digest('SHA-256',bytes);
  return[...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function csv(texto){                        // lector sencillo de CSV (con comillas)
  const t=String(texto).replace(/^\uFEFF/,''),filas=[];let f=[],c='',q=false;
  for(let i=0;i<t.length;i++){const ch=t[i];
    if(q){if(ch==='"'){if(t[i+1]==='"'){c+='"';i++}else q=false}else c+=ch}
    else if(ch==='"')q=true;else if(ch===','){f.push(c);c=''}
    else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&t[i+1]==='\n')i++;f.push(c);c='';if(f.some(x=>x!==''))filas.push(f);f=[]}
    else c+=ch}
  if(c!==''||f.length){f.push(c);if(f.some(x=>x!==''))filas.push(f)}
  if(!filas.length)return[];
  const h=filas[0].map(x=>x.trim());return filas.slice(1).map(r=>Object.fromEntries(h.map((k,i)=>[k,(r[i]||'').trim()])));
}
const arr=v=>Array.isArray(v)?v.map(x=>String(x)):v==null||v===''?[]:[String(v)];
const ent=v=>{const n=parseInt(String(v).replace(/[^\d-]/g,''),10);return Number.isFinite(n)?n:null};

/* ---------- ayudantes de archivos ---------- */
function indice(F){
  const lista=F.lista().map(limpiaRuta).filter(p=>!/(^|\/)__MACOSX\//.test(p)&&!/(^|\/)\.DS_Store$/.test(p)&&!p.endsWith('/'));
  return{lista,
    buscar(re){return lista.filter(p=>re.test(nombreDe(p))).sort((a,b)=>a.split('/').length-b.split('/').length||a.length-b.length)[0]||null},
    imagenes(){return lista.filter(esImg)},
    pdfs(){return lista.filter(p=>/\.pdf$/i.test(p))}};
}
/* busca la imagen de una página: primero por la ruta indicada y si no, por el nombre del archivo */
function resolver(ix,raiz,rel){
  if(!rel)return null;
  const r=limpiaRuta(rel),cand=[unir(raiz,r),r];
  for(const c of cand)if(ix.lista.includes(c))return c;
  const n=nombreDe(r).toLowerCase();
  return ix.imagenes().find(p=>nombreDe(p).toLowerCase()===n)||null;
}
function elegirPdf(ix,raiz,pista){
  const todos=ix.pdfs();if(!todos.length)return null;
  const p=pista&&todos.find(x=>nombreDe(x).toLowerCase()===nombreDe(pista).toLowerCase());
  return p||todos.find(x=>/^original/i.test(nombreDe(x)))||todos.sort((a,b)=>a.split('/').length-b.split('/').length)[0];
}
const baseResultado=()=>({formato:'',materia:'',nombre:'',archivo_fuente:'',paginas:[],claves:[],pdf:null,referentes:{},notas:[],avisos:[],huella:'',leidoDe:''});

/* ---------- adaptadores ---------- */
async function biologia(F,ix,json){
  const raiz=dirDe(json),d=JSON.parse(await F.texto(json));
  if(!Array.isArray(d))throw new Error('El archivo de Biología no tiene la forma esperada (se esperaba una lista de páginas).');
  const o=baseResultado();o.formato='biologia';o.materia='Biología';o.leidoDe=json;
  o.nombre=(d[0]&&d[0].documento)||'Banco de preguntas de biología';o.archivo_fuente=(d[0]&&d[0].archivo_fuente)||'';
  o.pdf=elegirPdf(ix,raiz,o.archivo_fuente);
  for(const r of d)o.paginas.push({pagina:ent(r.pagina_pdf_original),seccion:r.seccion_original||null,ambitos:arr(r.ambito_original_detectado),texto:r.texto_extraido_solo_como_indice||'',
    etiquetas:arr(r.etiquetas_tematicas_preliminares),imagen:resolver(ix,raiz,r.imagen_pagina),imagenRel:r.imagen_pagina||'',clasificacion_men:r.clasificacion_men||{},original:r});
  return o;
}
async function quimica(F,ix,json){
  const raiz=dirDe(json),d=JSON.parse(await F.texto(json));
  const regs=Array.isArray(d)?d:d.registros;
  if(!Array.isArray(regs))throw new Error('El archivo de Química no tiene la forma esperada (falta la lista "registros").');
  const o=baseResultado();o.formato='quimica';o.materia='Química';o.leidoDe=json;
  o.nombre=(!Array.isArray(d)&&d.documento)||'Banco de preguntas de química';
  o.referentes={unidad_de_carga:d.unidad_de_carga||null,referentes_curriculares_MEN:d.referentes_curriculares_MEN||null};
  const fuente=regs[0]&&regs[0].fuente;o.archivo_fuente=typeof fuente==='string'?fuente:'';
  o.pdf=elegirPdf(ix,raiz,o.archivo_fuente);
  for(const r of regs){
    const asp=r.aspecto&&r.aspecto!=='sin_clasificacion_explicita'?[r.aspecto]:[];
    o.paginas.push({pagina:ent(r.pagina_pdf),seccion:r.seccion_fuente||null,ambitos:asp,texto:r.texto_extraido||'',etiquetas:arr(r.temas_detectados_por_terminos),
      imagen:resolver(ix,raiz,r.imagen_path),imagenRel:r.imagen_path||'',clasificacion_men:r.clasificacion_curricular||{},original:r});
  }
  return o;
}
async function lectura(F,ix,jsonClaves){
  const raiz=dirDe(jsonClaves),o=baseResultado();o.formato='lectura';o.materia='Lectura Crítica';o.leidoDe=jsonClaves;
  const kd=JSON.parse(await F.texto(jsonClaves)),mapa=kd.answer_key||{};
  o.archivo_fuente=kd.source_document||'';o.nombre='Banco de preguntas de lectura crítica';
  if(kd.warning)o.notas.push('Aviso del paquete sobre las claves: '+kd.warning);
  o.referentes={fuente_de_claves:kd.answer_key_source||null,preguntas_esperadas:kd.questions_expected||null};
  o.pdf=elegirPdf(ix,raiz,o.archivo_fuente);
  // páginas: una por imagen, en orden; el texto viene en un solo archivo separado por salto de página
  const imgs=ix.imagenes().filter(p=>dirDe(p)===raiz||dirDe(p).startsWith(raiz?raiz+'/':'')).map(p=>({p,n:ent((nombreDe(p).match(/(\d+)\.[a-z]+$/i)||[])[1])})).filter(x=>x.n!==null).sort((a,b)=>a.n-b.n);
  const tf=ix.buscar(/^texto_extraido\.txt$/i);let partes=[];
  if(tf){partes=(await F.texto(tf)).split('\f');if(partes.length&&!partes[partes.length-1].trim())partes.pop();
    if(partes.length!==imgs.length)o.avisos.push(`El texto de apoyo tiene ${partes.length} páginas y hay ${imgs.length} imágenes: no se asoció el texto por página.`),partes=[]}
  imgs.forEach((x,i)=>o.paginas.push({pagina:x.n,seccion:null,ambitos:[],texto:partes[i]||'',etiquetas:[],imagen:x.p,imagenRel:nombreDe(x.p),clasificacion_men:{},original:{archivo_imagen:nombreDe(x.p)}}));
  // índice de preguntas con su clave (la clave del JSON es la fuente; el CSV aporta la página y los campos pendientes)
  const cf=ix.buscar(/^indice.*\.csv$/i),filas=cf?csv(await F.texto(cf)):[],porNum=new Map(filas.map(r=>[String(ent(r.numero_pregunta)),r]));
  const nums=[...new Set([...Object.keys(mapa),...porNum.keys()])].map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
  for(const n of nums){const r=porNum.get(String(n))||null,kj=mapa[String(n)]||null,kc=r&&r.clave_fuente||null;
    let clave=(kj||kc||'').toUpperCase()||null;if(clave&&!/^[A-H]$/.test(clave)){o.avisos.push(`La clave de la pregunta ${n} no es una letra válida («${clave}»).`);clave=null}
    if(kj&&kc&&kj.toUpperCase()!==kc.toUpperCase())o.avisos.push(`La pregunta ${n} tiene claves distintas en el JSON (${kj}) y en el CSV (${kc}).`);
    o.claves.push({numero:n,pagina:r?ent(r.pagina_probable):null,clave,estado:'pendiente_de_cotejo',original:r||{numero_pregunta:String(n),clave_fuente:kj}})}
  return o;
}
async function general(F,ix,json){
  const raiz=dirDe(json),d=JSON.parse(await F.texto(json));
  if(!d||!Array.isArray(d.paginas))throw new Error('banco.json no tiene la lista "paginas".');
  const o=baseResultado();o.formato='general';o.leidoDe=json;o.materia=String(d.materia||'').trim();o.nombre=String(d.nombre||d.documento||'').trim()||'Banco de preguntas';
  o.archivo_fuente=d.archivo_fuente||'';o.referentes=d.referentes||{};if(d.notas)o.notas.push(String(d.notas));
  o.pdf=elegirPdf(ix,raiz,d.pdf||o.archivo_fuente);
  for(const r of d.paginas)o.paginas.push({pagina:ent(r.pagina),seccion:r.seccion||null,ambitos:arr(r.ambitos),texto:r.texto||'',etiquetas:arr(r.etiquetas),
    imagen:resolver(ix,raiz,r.imagen),imagenRel:r.imagen||'',clasificacion_men:r.clasificacion_men||{},original:r});
  for(const k of d.claves||[])o.claves.push({numero:ent(k.numero),pagina:ent(k.pagina),clave:k.clave?String(k.clave).toUpperCase():null,estado:k.estado||'pendiente_de_cotejo',original:k});
  return o;
}

/* ---------- entrada principal ---------- */
async function analizar(F){
  const ix=indice(F);let o;
  const j=ix.buscar(/^banco\.json$/i);
  if(j)o=await general(F,ix,j);
  else if(ix.buscar(/^biologia_paginas\.json$/i))o=await biologia(F,ix,ix.buscar(/^biologia_paginas\.json$/i));
  else if(ix.buscar(/^preguntas_paginas\.json$/i))o=await quimica(F,ix,ix.buscar(/^preguntas_paginas\.json$/i));
  else if(ix.buscar(/^claves_respuesta\.json$/i))o=await lectura(F,ix,ix.buscar(/^claves_respuesta\.json$/i));
  else throw new Error('No reconozco este paquete. Debe traer un archivo banco.json (formato general) o ser uno de los paquetes de Biología, Química o Lectura Crítica.');
  // revisiones que no cambian nada del contenido
  const vistas=new Map();
  o.paginas.forEach((p,i)=>{
    if(p.pagina===null||p.pagina<1){o.avisos.push(`Un registro (n.º ${i+1}) no tiene número de página válido y no se cargará.`);p.invalida=true;return}
    if(vistas.has(p.pagina)){o.avisos.push(`La página ${p.pagina} aparece repetida; solo se cargará la primera.`);p.invalida=true;return}
    vistas.set(p.pagina,1);
    if(!p.imagen){o.avisos.push(`La página ${p.pagina} no tiene su imagen en el zip (${p.imagenRel||'sin ruta'}); no se cargará.`);p.sinImagen=true}
  });
  o.paginas=o.paginas.filter(p=>!p.invalida).sort((a,b)=>a.pagina-b.pagina);
  if(!o.paginas.length)throw new Error('El paquete no trae ninguna página que se pueda cargar.');
  const ks=new Set();o.claves=o.claves.filter(k=>{if(k.numero===null||ks.has(k.numero))return false;ks.add(k.numero);return true});
  // huella: del PDF original si viene; si no, del archivo de datos
  const base=o.pdf?await F.bytes(o.pdf):new TextEncoder().encode(await F.texto(o.leidoDe));
  o.huella=await sha256(base);o.huellaDe=o.pdf?'pdf':'datos';
  if(!o.pdf)o.avisos.push('El paquete no trae el PDF original; solo se guardarán las imágenes de las páginas.');
  return o;
}
const resumen=o=>({formato:o.formato,materia:o.materia,nombre:o.nombre,paginas:o.paginas.length,conImagen:o.paginas.filter(p=>p.imagen).length,sinImagen:o.paginas.filter(p=>p.sinImagen).length,claves:o.claves.length,pdf:!!o.pdf,avisos:o.avisos.length});

return{analizar,resumen,sha256,slug,pad,nombreDe,csv,norm};
});
