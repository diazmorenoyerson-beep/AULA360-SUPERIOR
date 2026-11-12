/* AULA360 — Reuniones virtuales: el rector o coordinador publica el enlace (Meet, Zoom, Jitsi) y los docentes se unen. */
window.REU=(function(){
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dir=()=>M&&(M.role==='rector'||M.role==='coordinador');
let Z={l:[],f:{t:'',u:'',v:true}};
async function load(){
  const r=await sb.from('reuniones').select('*').order('created_at',{ascending:false}).limit(50);
  if(r.error)throw r.error;Z.l=r.data||[];
}
const inp='style="width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:9px"';
function fila(x){
  const v=x.en_vivo;
  return`<div style="border:1px solid ${v?'#86efac':'#e2e8f0'};background:${v?'#f0fdf4':'#fff'};border-radius:12px;padding:12px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between">
   <div><b>${e(x.titulo)}</b><div style="font-size:12px;color:#64748b">${v?'<span style="color:#dc2626;font-weight:800">● EN VIVO</span>':'⚪ Sin iniciar'} · ${new Date(x.created_at).toLocaleDateString('es-CO')}</div></div>
   <div style="display:flex;flex-wrap:wrap;gap:8px">${v||dir()?`<a href="${e(x.url)}" target="_blank" rel="noopener noreferrer" style="background:#16a34a;color:#fff;padding:8px 14px;border-radius:10px;font-weight:800;text-decoration:none">🎥 ${dir()?'Abrir':'Unirme'}</a>`:''}
   ${dir()?`<button class="aic-link" onclick="REU.vivo('${x.id}',${!v})">${v?'■ Terminar':'▶ Iniciar (avisar)'}</button><button class="aic-link" onclick="REU.borrar('${x.id}')">🗑</button>`:''}</div></div>`;
}
function view(){
  const f=Z.f;
  const form=dir()?`<div class="aic-card" style="padding:16px"><h3 style="font-weight:800;font-size:17px">🎥 Nueva reunión virtual</h3><p style="font-size:13px;color:#64748b;margin:4px 0 10px">Crea la reunión en Meet, Zoom o Jitsi, pega aquí el enlace y los docentes de tu colegio la verán cuando la inicies.</p>
   <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px"><label style="font-size:13px">Título<input ${inp} value="${e(f.t)}" oninput="REU.f.t=this.value" placeholder="Reunión de docentes"></label>
   <label style="font-size:13px">Enlace (empieza con https://)<input ${inp} value="${e(f.u)}" oninput="REU.f.u=this.value" placeholder="https://meet.google.com/abc-defg-hij"></label></div>
   <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:10px;align-items:center"><button onclick="REU.crear()" style="background:#16a34a;color:#fff;padding:10px 16px;border-radius:10px;font-weight:800">Guardar reunión</button><a href="https://meet.google.com/new" target="_blank" rel="noopener noreferrer" style="font-size:13px;color:#4f46e5;text-decoration:underline">Crear reunión nueva en Google Meet</a></div></div>`:'';
  return`<div style="display:grid;gap:14px">${form}<div class="aic-card" style="padding:16px"><h3 style="font-weight:800;font-size:17px;margin-bottom:10px">Reuniones</h3><div style="display:grid;gap:8px">${Z.l.map(fila).join('')||'<p style="font-size:13px;color:#64748b">'+(dir()?'Aún no has creado reuniones.':'No hay reuniones por ahora.')+'</p>'}</div></div></div>`;
}
const api={load,view,get f(){return Z.f},
  async crear(){
    const f=Z.f;if(f.t.trim().length<3)return toast('⚠️','Escribe el título','');
    if(!/^https:\/\//i.test(f.u.trim()))return toast('⚠️','Enlace no válido','Debe empezar con https://');
    const r=await sb.from('reuniones').insert({colegio_id:M.colegio_id,titulo:f.t.trim(),url:f.u.trim(),en_vivo:false});
    if(r.error)return err(r.error);Z.f={t:'',u:'',v:true};toast('✅','Reunión guardada','Pulsa Iniciar cuando empiece.');await load();render()},
  async vivo(id,v){const r=await sb.from('reuniones').update({en_vivo:v,updated_at:new Date().toISOString()}).eq('id',id);if(r.error)return err(r.error);toast(v?'🟢':'⏹',v?'Reunión iniciada':'Reunión terminada','');await load();render()},
  async borrar(id){if(!confirm('¿Borrar esta reunión?'))return;const r=await sb.from('reuniones').delete().eq('id',id);if(r.error)return err(r.error);await load();render()}
};
return api})();
