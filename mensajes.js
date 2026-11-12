/* AULA360 — Mensajería entre rector, coordinador y docentes.
   Mensajes, notas, documentos y respuestas de permisos. Se puede avisar también por WhatsApp o por correo. */
window.MSG=(function(){
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ft=x=>x?new Date(x).toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'}):'';
const RL={rector:'Rector',coordinador:'Coordinador',prof:'Docente'};
const R=()=>render();
let Z={dir:[],msgs:[],names:{},sub:'in',para:'',tipo:'mensaje',asunto:'',texto:'',file:null,busy:false,enviado:null,abierto:null};
const inp='style="width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:8px"';
const tel=p=>{const d=String(p||'').replace(/\D/g,'');if(!d)return'';if(d.length===10)return'57'+d;return d};
function waLink(persona,texto){const t=tel(persona&&persona.phone);if(!t)return'';return'https://wa.me/'+t+'?text='+encodeURIComponent(texto)}
function mailLink(persona,asunto,texto){if(!persona||!persona.email)return'';return'mailto:'+encodeURIComponent(persona.email).replace('%40','@')+'?subject='+encodeURIComponent(asunto||'')+'&body='+encodeURIComponent(texto)}
function avisoBtns(persona,asunto,texto){
  const w=waLink(persona,texto),m=mailLink(persona,asunto,texto);
  return`${w?`<a class="aic-link" style="background:#16a34a;color:#fff;padding:8px 12px;border-radius:8px;font-weight:700;font-size:13px;text-decoration:none" target="_blank" rel="noopener" href="${w}">💬 Avisar por WhatsApp</a>`:'<span style="font-size:12px;color:#94a3b8">Sin celular registrado</span>'}
   ${m?`<a class="aic-link" style="background:#2563eb;color:#fff;padding:8px 12px;border-radius:8px;font-weight:700;font-size:13px;text-decoration:none" href="${m}">✉️ Avisar por correo</a>`:'<span style="font-size:12px;color:#94a3b8">Sin correo registrado</span>'}`;
}
async function load(){
  const d=await sb.rpc('directorio_colegio');if(d.error)throw d.error;Z.dir=d.data||[];
  Z.names={};Z.dir.forEach(p=>Z.names[p.id]=p);Z.names[M.id]={id:M.id,full_name:M.full_name,role:M.role==='prof'?'prof':M.role};
  const m=await sb.from('mensajes').select('*').order('created_at',{ascending:false}).limit(150);if(m.error)throw m.error;Z.msgs=m.data||[];
  Z.enviado=null;
}
const nom=id=>(Z.names[id]&&Z.names[id].full_name)||'—';
const rol=id=>RL[(Z.names[id]||{}).role]||'';
function compose(){
  const opts=Z.dir.map(p=>`<option value="${p.id}" ${Z.para===p.id?'selected':''}>${e(p.full_name)} · ${RL[p.role]||''}</option>`).join('');
  const per=Z.names[Z.para];
  const ok=Z.enviado?`<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px;margin-bottom:12px"><b>✅ Mensaje enviado por la plataforma.</b> ¿Quieres avisarle también?<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">${avisoBtns(Z.enviado.persona,Z.enviado.asunto,Z.enviado.texto)}</div></div>`:'';
  return`<div class="aic-card" style="padding:16px">${ok}<h3 style="font-weight:800;font-size:17px">✉️ Escribir un mensaje</h3>
  <p style="font-size:13px;color:#64748b;margin:4px 0 10px">${M.role==='prof'?'Puedes escribirle al rector o al coordinador de tu colegio y enviarles exámenes, diagnósticos, simulacros, talleres o permisos.':'Escríbele a los docentes y coordinadores de tu colegio.'}</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">
   <label style="font-size:13px">Para<select ${inp} onchange="MSG.set('para',this.value)"><option value="">Elige…</option>${opts}</select></label>
   <label style="font-size:13px">Qué envías<select ${inp} onchange="MSG.set('tipo',this.value)">${[['mensaje','Mensaje'],['documento','Documento (examen, diagnóstico, simulacro, taller…)']].map(([k,l])=>`<option value="${k}" ${Z.tipo===k?'selected':''}>${l}</option>`).join('')}</select></label></div>
  <label style="font-size:13px;display:block;margin-top:8px">Asunto<input ${inp} value="${e(Z.asunto)}" oninput="MSG.asunto=this.value"></label>
  <label style="font-size:13px;display:block;margin-top:8px">Mensaje<textarea rows="4" ${inp} oninput="MSG.texto=this.value">${e(Z.texto)}</textarea></label>
  <label style="font-size:13px;display:block;margin-top:8px">Adjuntar archivo (PDF, Word, Excel o imagen, hasta 15 MB)<input id="msg-file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" style="display:block;margin-top:4px"></label>
  <div style="margin-top:12px"><button onclick="MSG.enviar()" ${Z.busy?'disabled':''} style="background:#246be0;color:#fff;padding:10px 16px;border-radius:10px;font-weight:800">Enviar</button></div>
  ${per?'':''}</div>`;
}
function item(m){
  const mio=m.de_id===M.id,otro=mio?m.para_id:m.de_id,p=Z.names[otro]||{};
  const tipos={nota:'📝 Nota',documento:'📎 Documento',permiso:'🗓 Permiso',respuesta_permiso:'🗓 Respuesta de permiso',mensaje:'✉️ Mensaje'};
  const abierto=Z.abierto===m.id;
  return`<div style="border:1px solid ${!mio&&!m.leido_at?'#93c5fd':'#e2e8f0'};background:${!mio&&!m.leido_at?'#eff6ff':'#fff'};border-radius:12px;padding:10px 12px;margin-bottom:8px">
   <div style="display:flex;justify-content:space-between;gap:8px;cursor:pointer" onclick="MSG.abrir('${m.id}')"><div><b>${e(m.asunto||tipos[m.tipo]||'Mensaje')}</b><div style="font-size:12px;color:#64748b">${mio?'Para':'De'}: ${e(p.full_name||'—')} (${RL[p.role]||''}) · ${tipos[m.tipo]||''} · ${ft(m.created_at)}${!mio&&!m.leido_at?' · <b style="color:#2563eb">Nuevo</b>':''}${mio&&m.leido_at?' · ✔ Leído':''}</div></div><span>${abierto?'▲':'▼'}</span></div>
   ${abierto?`<div style="margin-top:8px;font-size:14px;white-space:pre-wrap">${e(m.texto||'')}</div>${m.adjunto_path?`<div style="margin-top:8px"><button class="aic-link" onclick="MSG.bajar('${m.id}')">📎 ${e(m.adjunto_nombre||'Descargar adjunto')}</button></div>`:''}
   <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">${!mio?`<button class="aic-link" onclick="MSG.responder('${otro}','${m.id}')">↩ Responder</button>`:''}${avisoBtns(p,m.asunto||'Mensaje de AULA360',(m.texto||'')+'\n\n(Enviado desde AULA360)')}</div>`:''}</div>`;
}
function view(){
  const rec=Z.msgs.filter(m=>m.para_id===M.id),env=Z.msgs.filter(m=>m.de_id===M.id);
  const lista=(Z.sub==='in'?rec:env);
  const nuevos=rec.filter(m=>!m.leido_at).length;
  return`<div style="display:grid;gap:14px">${compose()}
  <div class="aic-card" style="padding:16px"><div style="display:flex;gap:8px;margin-bottom:10px"><button onclick="MSG.tab('in')" class="px-4 py-2 rounded-lg text-sm ${Z.sub==='in'?'on':'bg-white'}" style="border:1px solid #e2e8f0">📥 Recibidos${nuevos?` (${nuevos} nuevos)`:''}</button><button onclick="MSG.tab('out')" class="px-4 py-2 rounded-lg text-sm ${Z.sub==='out'?'on':'bg-white'}" style="border:1px solid #e2e8f0">📤 Enviados</button></div>
  ${lista.map(item).join('')||'<p style="font-size:13px;color:#64748b">No hay mensajes.</p>'}</div></div>`;
}
const api={
  load,view,avisoBtns,waLink,mailLink,
  set asunto(v){Z.asunto=v},set texto(v){Z.texto=v},
  set(k,v){Z[k]=v;if(k==='para')R()},
  tab(k){Z.sub=k;R()},
  async abrir(id){
    Z.abierto=Z.abierto===id?null:id;
    const m=Z.msgs.find(x=>x.id===id);
    if(m&&m.para_id===M.id&&!m.leido_at){m.leido_at=new Date().toISOString();sb.rpc('mensaje_leido',{p_id:id})}
    R();
  },
  responder(uid,id){Z.para=uid;const m=Z.msgs.find(x=>x.id===id);Z.asunto='Re: '+(m&&m.asunto||'');Z.texto='';R();window.scrollTo({top:0,behavior:'smooth'})},
  async bajar(id){const m=Z.msgs.find(x=>x.id===id);if(!m||!m.adjunto_path)return;
    const u=await sb.storage.from('mensajes').createSignedUrl(m.adjunto_path,120,{download:m.adjunto_nombre||true});if(u.error)return err(u.error);window.open(u.data.signedUrl,'_blank')},
  async enviar(){
    if(Z.busy)return;
    if(!Z.para)return toast('⚠️','Elige a quién se lo envías','');
    const f=document.getElementById('msg-file')?.files?.[0];
    if(f&&f.size>15*1024*1024)return toast('⚠️','Archivo muy pesado','Máximo 15 MB.');
    if(!(Z.texto||'').trim()&&!f)return toast('⚠️','Escribe un mensaje o adjunta un archivo','');
    Z.busy=true;
    try{
      let path=null,nombre=null,link='';
      if(f){nombre=f.name;path=M.colegio_id+'/'+M.id+'/'+Date.now()+'-'+f.name.replace(/[^\w.\-]+/g,'_');
        const up=await sb.storage.from('mensajes').upload(path,f);if(up.error)throw up.error}
      const r=await sb.rpc('mensaje_enviar',{p_para:Z.para,p_tipo:Z.tipo,p_asunto:Z.asunto||null,p_texto:Z.texto||null,p_path:path,p_nombre:nombre});
      if(r.error)throw r.error;
      if(path){const u=await sb.storage.from('mensajes').createSignedUrl(path,604800);if(!u.error)link='\n\nArchivo: '+u.data.signedUrl}
      const persona=Z.names[Z.para];
      const env={persona,asunto:Z.asunto||'Mensaje de AULA360',texto:`${M.full_name} te escribió en AULA360:\n${Z.texto||''}${link}`};
      Z.asunto='';Z.texto='';
      await load();Z.enviado=env;
    }catch(x){Z.busy=false;return err(x)}
    Z.busy=false;R();
  }
};
return api;
})();
