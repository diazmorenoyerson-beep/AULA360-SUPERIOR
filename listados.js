/* AULA360 — El rector o el coordinador suben el listado de estudiantes del colegio (Word, PDF o Excel).
   Cada fila: nombre completo, número de documento y, si se quiere, correo. Después cada docente puede traer el listado a su curso. */
window.LST=(function(){
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const R=()=>render();
const FM={word:'Word (.docx)',pdf:'PDF',excel:'Excel o CSV'};
let Z={grado:'',grupo:'',fmt:'word',rows:[],bad:[],fname:'',lista:[],busy:false};
const inp='style="width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:8px"';
async function load(){
  const r=await sb.from('colegio_estudiantes').select('grado,grupo').limit(5000);if(r.error)throw r.error;
  const m={};(r.data||[]).forEach(x=>{const k=x.grado+'|'+x.grupo;m[k]=(m[k]||0)+1});
  Z.lista=Object.entries(m).map(([k,n])=>{const[g,gr]=k.split('|');return{grado:+g,grupo:gr,n}}).sort((a,b)=>a.grado-b.grado||a.grupo.localeCompare(b.grupo));
}
const gl=g=>g===0?'Transición':g+'°';
function proc(lines){
  const seen=new Set(),rows=[],bad=[];
  lines.forEach(l=>{l=(l||'').trim();if(!l)return;const p=parseLine(l);
    if(!p){return}
    p.document=(p.document||'').replace(/\D/g,'');
    const pal=p.full_name.trim().split(/\s+/).filter(w=>/[A-Za-zÁ-ú]/.test(w)),why=[];
    if(p.document.length<5)why.push('falta el número de documento');
    if(pal.length<2)why.push('falta el nombre completo');
    if(why.length){bad.push({l,why:why.join(' y ')});return}
    if(seen.has(p.document))return;seen.add(p.document);rows.push(p)});
  Z.rows=rows;Z.bad=bad;
}
function view(){
  const gr=[...Array(12).keys()];
  const vista=Z.rows.length||Z.bad.length?`<div style="margin-top:12px"><b>${Z.rows.length} estudiantes encontrados</b> en ${e(Z.fname)}${Z.bad.length?` · <span style="color:#b91c1c">${Z.bad.length} fila(s) con datos incompletos (no se guardarán)</span>`:''}
   <div class="aic-table-wrap" style="max-height:300px;overflow:auto;margin-top:6px"><table><thead><tr><th>#</th><th>NOMBRE COMPLETO</th><th>DOCUMENTO</th><th>CORREO (opcional)</th></tr></thead><tbody>${Z.rows.map((x,i)=>`<tr><td>${i+1}</td><td>${e(x.full_name)}</td><td>${e(x.document)}</td><td>${e(x.email||'')}</td></tr>`).join('')}</tbody></table></div>
   ${Z.bad.length?`<details style="margin-top:6px;font-size:12px;color:#b91c1c"><summary>Ver filas con problemas</summary>${Z.bad.slice(0,30).map(b=>`<div>${e(b.l)} — ${b.why}</div>`).join('')}</details>`:''}
   <div style="margin-top:10px"><button onclick="LST.guardar()" ${Z.busy?'disabled':''} style="background:#16a34a;color:#fff;padding:10px 16px;border-radius:10px;font-weight:800">💾 Guardar listado de ${Z.grado===''?'…':gl(+Z.grado)} ${e(Z.grupo)}</button></div></div>`:'';
  const ya=Z.lista.map(x=>`<tr><td>${gl(x.grado)}</td><td>${e(x.grupo)}</td><td>${x.n}</td><td><button class="aic-link" onclick="LST.borrar(${x.grado},'${e(x.grupo)}')">🗑 Quitar</button></td></tr>`).join('');
  return`<div style="display:grid;gap:14px"><div class="aic-card" style="padding:16px"><h3 style="font-weight:800;font-size:17px">📋 Subir listado de estudiantes</h3>
  <p style="font-size:13px;color:#64748b;margin:4px 0 10px">Sube un archivo por grupo. Cada fila debe traer el <b>nombre completo</b> y el <b>número de documento</b> del estudiante. El <b>correo es opcional</b>. Después, cada docente podrá traer este listado a su curso con un botón.</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">
   <label style="font-size:13px">1. Grado<select ${inp} onchange="LST.set('grado',this.value)"><option value="">Elige…</option>${gr.map(g=>`<option value="${g}" ${String(g)===String(Z.grado)?'selected':''}>${gl(g)}</option>`).join('')}</select></label>
   <label style="font-size:13px">2. Grupo<input ${inp} value="${e(Z.grupo)}" oninput="LST.grupo=this.value" placeholder="Ej: A o 901"></label>
   <label style="font-size:13px">3. Formato del archivo<select ${inp} onchange="LST.set('fmt',this.value)">${Object.entries(FM).map(([k,l])=>`<option value="${k}" ${Z.fmt===k?'selected':''}>${l}</option>`).join('')}</select></label>
   <label style="font-size:13px">4. Archivo<input type="file" accept="${Z.fmt==='word'?'.docx':Z.fmt==='pdf'?'.pdf':'.xlsx,.xls,.csv'}" onchange="LST.leer(this.files[0])" style="display:block;margin-top:6px"></label></div>${vista}</div>
  <div class="aic-card" style="padding:16px"><h3 style="font-weight:800;font-size:17px">Listados guardados</h3><div class="aic-table-wrap" style="margin-top:8px"><table><thead><tr><th>GRADO</th><th>GRUPO</th><th>ESTUDIANTES</th><th></th></tr></thead><tbody>${ya||'<tr><td colspan="4">Todavía no has subido listados.</td></tr>'}</tbody></table></div></div></div>`;
}
const api={
  load,view,
  set grupo(v){Z.grupo=v},
  set(k,v){Z[k]=v;if(k==='fmt'){Z.rows=[];Z.bad=[];Z.fname=''}R()},
  async leer(f){
    if(!f)return;
    const ext=(f.name.split('.').pop()||'').toLowerCase(),ok={excel:['xlsx','xls','csv'],word:['docx'],pdf:['pdf']}[Z.fmt]||[];
    if(!ok.includes(ext))return toast('⚠️','El archivo no coincide con el formato','Elegiste '+FM[Z.fmt]+' pero el archivo es .'+ext+'.');
    toast('⏳','Leyendo el archivo…',f.name);
    try{proc(await readFile(f,Z.fmt));Z.fname=f.name;if(!Z.rows.length)toast('⚠️','No encontré estudiantes válidos','Cada fila debe tener el nombre completo y el número de documento.')}catch(x){Z.rows=[];Z.bad=[];return err(x)}
    R();
  },
  async guardar(){
    if(Z.busy)return;
    if(Z.grado==='')return toast('⚠️','Elige el grado','');
    if(!(Z.grupo||'').trim())return toast('⚠️','Escribe el grupo','Por ejemplo A o 901.');
    if(!Z.rows.length)return toast('⚠️','No hay estudiantes para guardar','');
    Z.busy=true;let ok=0,om=0;
    try{
      const all=Z.rows.map(x=>({full_name:x.full_name,document:x.document,email:x.email||null}));
      for(let i=0;i<all.length;i+=500){const r=await sb.rpc('rector_cargar_lista',{p_grado:+Z.grado,p_grupo:Z.grupo,p_rows:all.slice(i,i+500)});if(r.error)throw r.error;ok+=r.data.ok;om+=r.data.omitidos}
    }catch(x){Z.busy=false;return err(x)}
    Z.busy=false;toast('✅','Listado guardado',ok+' estudiantes en '+gl(+Z.grado)+' '+Z.grupo.toUpperCase()+'.');
    Z.rows=[];Z.bad=[];Z.fname='';Z.grupo='';await load();R();
  },
  async borrar(g,gr){
    if(!confirm('¿Quitar el listado de '+gl(g)+' '+gr+'? Los estudiantes que ya tienen cuenta no se tocan.'))return;
    const r=await sb.rpc('rector_borrar_lista',{p_grado:g,p_grupo:gr});if(r.error)return err(r.error);await load();R();
  }
};
return api;
})();
