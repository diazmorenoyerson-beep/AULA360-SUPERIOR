/* AULA360 — Taller con IA.
   El docente escribe el tema, elige grado, tipos de actividad y cantidad; la IA arma el taller con sus respuestas.
   Se puede corregir, imprimir (con o sin respuestas, con la hoja membretada), guardar y enviar a los estudiantes. */
window.TIA=(function(){
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const R=()=>render();
const ft=x=>x?new Date(x).toLocaleDateString('es-CO'):'';
const gl=g=>g===0?'Transición':g+'°';
const TIPOS=[['seleccion','Selección múltiple'],['abierta','Preguntas abiertas'],['problema','Problemas'],['completar','Completar'],['vf','Verdadero o falso'],['relacionar','Relacionar']];
const L4='ABCD';
let Z={temas:'',grado:'',asig:'',n:8,nivel:'mixto',tipos:['seleccion','abierta','problema'],planes:[],lista:[],res:null,busy:false,aviso:''};
const inp='style="width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:8px"';
async function load(){
  const [p,l]=await Promise.all([
    sb.from('planes_area').select('asignatura,grado,anio,malla').eq('docente_id',M.id),
    sb.from('talleres_preparados').select('id,titulo,grado,asignatura,usa_ia,created_at').order('created_at',{ascending:false}).limit(40)]);
  Z.planes=p.data||[];Z.lista=l.data||[];
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
function plantilla(temas,n){
  const t=temas.join(', ');
  return{titulo:'Taller: '+t,instrucciones:'Lee con atención y resuelve cada actividad en tu cuaderno.',
    actividades:Array.from({length:Math.min(n,6)},(_,i)=>({tipo:'abierta',enunciado:'Actividad '+(i+1)+' sobre '+t+'. Escribe aquí el enunciado.',opciones:[],respuesta:''}))};
}
function vForm(){
  const gs=(M.grados&&M.grados.length?M.grados:[...Array(12).keys()]),as=M.asignaturas||[];
  return`<div class="aic-card" style="padding:16px"><h3 style="font-weight:800;font-size:17px">📝 Crear taller con IA</h3><p style="font-size:13px;color:#64748b;margin:4px 0 10px">Escribe el tema (o varios, uno por línea), elige el grado y los tipos de actividad. La IA arma el taller con sus respuestas y tú lo puedes corregir.</p>
  ${Z.aviso?`<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:10px;font-size:13px;margin-bottom:10px">${e(Z.aviso)}</div>`:''}
  <label style="font-size:13px;display:block">Tema o temas del taller (uno por línea)<textarea rows="3" ${inp} oninput="TIA.temas=this.value" placeholder="Ej: Fracciones equivalentes">${e(Z.temas)}</textarea></label>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-top:10px">
   <label style="font-size:13px">Grado<select ${inp} onchange="TIA.set('grado',this.value)"><option value="">Elige…</option>${gs.map(g=>`<option value="${g}" ${String(g)===String(Z.grado)?'selected':''}>${gl(g)}</option>`).join('')}</select></label>
   <label style="font-size:13px">Asignatura<select ${inp} onchange="TIA.set('asig',this.value)"><option value="">Elige…</option>${as.map(a=>`<option ${a===Z.asig?'selected':''}>${e(a)}</option>`).join('')}</select></label>
   <label style="font-size:13px">Número de actividades<input type="number" min="3" max="25" ${inp} value="${Z.n}" onchange="TIA.n=+this.value"></label>
   <label style="font-size:13px">Dificultad<select ${inp} onchange="TIA.set('nivel',this.value)">${[['mixto','Progresiva (fácil a difícil)'],['basico','Básica'],['medio','Media'],['avanzado','Avanzada']].map(o=>`<option value="${o[0]}" ${Z.nivel===o[0]?'selected':''}>${o[1]}</option>`).join('')}</select></label></div>
  <div style="margin-top:10px;font-size:13px"><b>Tipos de actividad</b><div style="display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:6px">${TIPOS.map(t=>`<label style="display:flex;gap:4px;align-items:center"><input type="checkbox" ${Z.tipos.includes(t[0])?'checked':''} onchange="TIA.tipo('${t[0]}',this.checked)">${t[1]}</label>`).join('')}</div></div>
  <div style="margin-top:12px"><button onclick="TIA.crear()" ${Z.busy?'disabled':''} style="background:#7c3aed;color:#fff;padding:11px 18px;border-radius:10px;font-weight:800">${Z.busy?'⏳ Creando el taller… (puede tardar un minuto)':'✨ Crear taller'}</button></div></div>`;
}
function vRes(){
  const r=Z.res;if(!r)return'';
  return`<div class="aic-card" style="padding:16px;border:2px solid #7c3aed"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px"><h3 style="font-weight:800;font-size:17px">Tu taller</h3><span style="font-size:12px;color:#64748b">${r.usa_ia?'Creado con IA':'Plantilla'} · ${gl(+r.grado)} · ${e(r.asignatura||'')}</span></div>
  <label style="font-size:13px;display:block;margin-top:8px">Título<input ${inp} value="${e(r.titulo)}" oninput="TIA.res.titulo=this.value"></label>
  <label style="font-size:13px;display:block;margin-top:8px">Instrucciones<textarea rows="2" ${inp} oninput="TIA.res.instrucciones=this.value">${e(r.instrucciones)}</textarea></label>
  ${r.actividades.map((a,i)=>`<div style="border:1px solid #e2e8f0;border-radius:12px;padding:10px;margin-top:10px"><div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b"><b>Actividad ${i+1} · ${e((TIPOS.find(t=>t[0]===a.tipo)||[0,a.tipo])[1])}</b><button class="aic-link" onclick="TIA.quitar(${i})">🗑 Quitar</button></div>
   <textarea rows="${Math.min(8,Math.max(2,Math.ceil((a.enunciado||'').length/90)))}" ${inp} oninput="TIA.res.actividades[${i}].enunciado=this.value">${e(a.enunciado)}</textarea>
   ${a.opciones&&a.opciones.length?`<div style="margin-top:6px">${a.opciones.map((o,k)=>`<div style="display:flex;gap:6px;align-items:center;margin-top:4px"><b>${L4[k]||k+1})</b><input ${inp} value="${e(o)}" oninput="TIA.res.actividades[${i}].opciones[${k}]=this.value"></div>`).join('')}</div>`:''}
   <label style="font-size:12px;color:#166534;font-weight:700;display:block;margin-top:6px">Respuesta (solo la ve el docente)<textarea rows="2" ${inp} style="width:100%;border:1px solid #bbf7d0;background:#f0fdf4;border-radius:8px;padding:8px;font-weight:400" oninput="TIA.res.actividades[${i}].respuesta=this.value">${e(a.respuesta)}</textarea></label></div>`).join('')}
  <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px"><button onclick="TIA.guardar()" style="background:#16a34a;color:#fff;padding:10px 16px;border-radius:10px;font-weight:800">💾 Guardar</button><button onclick="TIA.imprimir(false)" style="background:#246be0;color:#fff;padding:10px 16px;border-radius:10px;font-weight:800">🖨️ Imprimir para estudiantes</button><button onclick="TIA.imprimir(true)" style="background:#0f766e;color:#fff;padding:10px 16px;border-radius:10px;font-weight:800">🖨️ Imprimir con respuestas</button><button onclick="TIA.enviar()" style="background:#7c3aed;color:#fff;padding:10px 16px;border-radius:10px;font-weight:800">📤 Enviar a mis estudiantes</button></div>
  <p style="font-size:12px;color:#64748b;margin-top:6px">Al enviarlo, el estudiante lo ve en <b>Guías de trabajo</b> (sin respuestas) y lo puede abrir en Word o Google Docs.</p></div>`;
}
function vLista(){
  return`<div class="aic-card" style="padding:16px"><h3 style="font-weight:800;font-size:16px">Mis talleres guardados</h3>${Z.lista.map(c=>`<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;border:1px solid #e2e8f0;border-radius:12px;padding:8px 12px;margin-top:8px"><div><b>${e(c.titulo)}</b><div style="font-size:12px;color:#64748b">${c.grado!=null?gl(c.grado)+' · ':''}${e(c.asignatura||'')} · ${ft(c.created_at)}</div></div><div style="display:flex;gap:8px"><button class="aic-link" onclick="TIA.abrir('${c.id}')">Abrir</button><button class="aic-link" onclick="TIA.borrar('${c.id}')">🗑</button></div></div>`).join('')||'<p style="font-size:13px;color:#64748b;margin-top:6px">Todavía no has guardado talleres.</p>'}</div>`;
}
function cuerpo(conResp,enc){
  const r=Z.res;
  return`<h2 style="text-align:center;margin:10px 0 2px;font-size:14pt">${e(r.titulo)}</h2>
  <p style="text-align:center;font-size:10.5pt;margin:0 0 6px">${gl(+r.grado)}${r.asignatura?' · '+e(r.asignatura):''}${enc?'':' · Docente: '+e(M.full_name)}</p>
  ${conResp?'<p style="text-align:center;font-size:10pt;color:#b91c1c;margin:0 0 6px"><b>VERSIÓN DEL DOCENTE (con respuestas)</b></p>':'<p style="font-size:10.5pt;margin:6px 0">Nombre: ______________________________ Curso: ________ Fecha: ____________</p>'}
  ${r.instrucciones?`<p style="font-size:10.5pt"><b>Instrucciones:</b> ${e(r.instrucciones)}</p>`:''}
  ${r.actividades.map((a,i)=>`<div style="margin:10px 0;font-size:11pt;page-break-inside:avoid"><div style="white-space:pre-wrap"><b>${i+1}.</b> ${e(a.enunciado)}</div>
   ${a.opciones&&a.opciones.length?a.opciones.map((o,k)=>`<div style="margin-left:18px">${a.tipo==='relacionar'?(k+1)+'.':(L4[k]||k+1)+')'} ${e(o)}</div>`).join(''):''}
   ${conResp?`<div style="margin-top:4px;padding:4px 8px;background:#f0fdf4;border-left:3px solid #16a34a;font-size:10pt"><b>Respuesta:</b> ${e(a.respuesta)}</div>`:(a.tipo==='seleccion'?'':'<div style="border-bottom:1px solid #94a3b8;height:22px"></div><div style="border-bottom:1px solid #94a3b8;height:22px"></div>')}</div>`).join('')}`;
}
function htmlImp(conResp){return`<div style="font-family:Arial,Helvetica,sans-serif;color:#000">${lhHtml(18)}${cuerpo(conResp)}</div>`}
function htmlArchivo(){
  const l=typeof LH==='function'?LH():{l1:''};
  return`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${e(Z.res.titulo)}</title></head><body style="font-family:Arial,Helvetica,sans-serif"><p style="text-align:center;font-size:14pt"><b>${e(l.l1||'')}</b></p>${cuerpo(false,true)}</body></html>`;
}
const api={
  load,view:()=>`<div style="display:grid;gap:14px">${vForm()}${vRes()}${vLista()}</div>`,
  get res(){return Z.res},
  set temas(v){Z.temas=v},set n(v){Z.n=Math.min(25,Math.max(3,v||8))},
  set(k,v){Z[k]=v;R()},
  tipo(t,on){Z.tipos=on?[...new Set([...Z.tipos,t])]:Z.tipos.filter(x=>x!==t)},
  quitar(i){Z.res.actividades.splice(i,1);R()},
  async crear(){
    if(Z.busy)return;
    const temas=Z.temas.split(/\n/).map(x=>x.trim()).filter(Boolean);
    if(!temas.length)return toast('⚠️','Escribe el tema','');if(Z.grado==='')return toast('⚠️','Elige el grado','');
    if(!Z.tipos.length)return toast('⚠️','Elige al menos un tipo de actividad','');
    Z.busy=true;Z.aviso='';R();
    let out=null,ia=false;
    try{
      const r=await sb.functions.invoke('taller-ia',{body:{temas,grado:+Z.grado,asignatura:Z.asig,cantidad:Z.n,nivel:Z.nivel,tipos:Z.tipos,contexto:contexto(temas)}});
      let d=r.data;
      if(r.error&&!d){try{d=await r.error.context.json()}catch(x){}}
      if(d&&d.ok){out=d;ia=true}
      else if(d&&d.sin_clave)Z.aviso='La IA todavía no está activada por el administrador. Te dejé una plantilla para que la completes.';
      else if(d&&d.error)Z.aviso=d.error+' Te dejé una plantilla para completar.';
      else Z.aviso='No pude comunicarme con la IA. Te dejé una plantilla para completar.';
    }catch(x){Z.aviso='No pude comunicarme con la IA. Te dejé una plantilla para completar.'}
    if(!out)out=plantilla(temas,Z.n);
    Z.res={titulo:out.titulo,instrucciones:out.instrucciones,actividades:out.actividades,grado:Z.grado,asignatura:Z.asig,usa_ia:ia,id:null};
    Z.busy=false;R();setTimeout(()=>window.scrollTo({top:document.body.scrollHeight*0.35,behavior:'smooth'}),80);
  },
  async guardar(){
    const r=Z.res;if(!r)return;
    const row={docente_id:M.id,titulo:r.titulo||'Taller',grado:+r.grado,asignatura:r.asignatura||null,usa_ia:!!r.usa_ia,contenido:{instrucciones:r.instrucciones,actividades:r.actividades}};
    const q=r.id?await sb.from('talleres_preparados').update(row).eq('id',r.id):await sb.from('talleres_preparados').insert(row).select('id').single();
    if(q.error)return err(q.error);if(!r.id&&q.data)r.id=q.data.id;
    toast('✅','Taller guardado','Lo encuentras en Mis talleres guardados.');await load();R();
  },
  imprimir(conResp){if(Z.res)doPrint(htmlImp(!!conResp),{hoja:true})},
  async enviar(){
    const r=Z.res;if(!r)return;
    if(!confirm('¿Enviar este taller (sin respuestas) a los estudiantes de '+gl(+r.grado)+'?'))return;
    try{
      const blob=new Blob(['﻿'+htmlArchivo()],{type:'application/msword'});
      const nombre=('Taller - '+(r.titulo||'taller')).replace(/[^\w\sáéíóúñÁÉÍÓÚÑ.\-]+/g,'').trim().slice(0,80)+'.doc';
      const path='docente/'+M.id+'/'+Date.now()+'-'+nombre.replace(/[^\w.\-]+/g,'_');
      const up=await sb.storage.from('guias').upload(path,blob,{contentType:'application/msword'});if(up.error)throw up.error;
      const g=await sb.from('guias').insert({ambito:'docente',grado:+r.grado,titulo:r.titulo||'Taller',path,nombre,size:blob.size,owner_id:M.id}).select('id').single();
      if(g.error){sb.storage.from('guias').remove([path]);throw g.error}
      const s=await sb.rpc('guia_enviar',{p_guia:g.data.id,p_grado:+r.grado});if(s.error)throw s.error;
      toast('✅','Taller enviado','Llegó a '+s.data+' curso(s) de '+gl(+r.grado)+'. Los estudiantes lo ven en Guías de trabajo.');
    }catch(x){err(x)}
  },
  async abrir(id){
    const q=await sb.from('talleres_preparados').select('*').eq('id',id).single();if(q.error)return err(q.error);
    const c=q.data,k=c.contenido||{};Z.res={titulo:c.titulo,instrucciones:k.instrucciones||'',actividades:k.actividades||[],grado:c.grado,asignatura:c.asignatura,usa_ia:c.usa_ia,id:c.id};R();window.scrollTo({top:300,behavior:'smooth'});
  },
  async borrar(id){if(!confirm('¿Borrar este taller?'))return;const q=await sb.from('talleres_preparados').delete().eq('id',id);if(q.error)return err(q.error);if(Z.res&&Z.res.id===id)Z.res=null;await load();R()}
};
return api;
})();
