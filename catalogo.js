/* AULA360 · Catálogo académico central. Solo administradores globales. */
window.CATALOGO=(function(){
'use strict';
const S={areas:[],asigs:[],loading:false,areaNombre:'',editArea:null,asigNombre:'',asigArea:'',bancoSubject:'',editAsig:null};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ok=r=>{if(r.error)throw r.error;return r.data||[]};
const card=h=>'<section class="bg-white rounded-2xl p-4 shadow space-y-3">'+h+'</section>';
const btn=(fn,t,cls='bg-indigo-600 text-white')=>'<button onclick="'+fn+'" class="px-3 py-2 rounded-lg text-sm '+cls+'">'+t+'</button>';
async function load(){
 if(!M||!M.is_admin)throw new Error('Acceso exclusivo del administrador.');
 const [a,s]=await Promise.all([
  sb.from('areas').select('id,nombre').order('nombre'),
  sb.from('asignaturas').select('id,nombre,area_id,banco_subject,areas(nombre)').order('nombre')
 ]);
 S.areas=ok(a);S.asigs=ok(s);
}
function view(){
 if(!M||!M.is_admin)return card('<h2 class="font-bold">🔒 Catálogo académico</h2><p class="text-sm text-red-700">Solo el administrador global puede gestionar este catálogo.</p>');
 const areas=S.areas.map(a=>'<div class="flex items-center justify-between gap-2 border-t py-2"><span>'+esc(a.nombre)+'</span><span class="flex gap-1">'+btn("CATALOGO.editArea("+a.id+")","Editar","bg-slate-200 text-slate-800")+btn("CATALOGO.delArea("+a.id+")","Eliminar","bg-rose-100 text-rose-800")+'</span></div>').join('');
 const asigs=S.asigs.map(a=>'<tr class="border-t"><td class="py-2">'+esc(a.nombre)+'</td><td>'+esc(a.areas?.nombre||'—')+'</td><td>'+esc(a.banco_subject||'—')+'</td><td><div class="flex gap-1">'+btn("CATALOGO.editAsig("+a.id+")","Editar","bg-slate-200 text-slate-800")+btn("CATALOGO.delAsig("+a.id+")","Eliminar","bg-rose-100 text-rose-800")+'</div></td></tr>').join('');
 const editA=S.editArea!==null?S.areas.find(x=>x.id===S.editArea):null;
 const editS=S.editAsig!==null?S.asigs.find(x=>x.id===S.editAsig):null;
 return '<div class="space-y-4">'+card('<div><h2 class="text-xl font-bold">🎓 Catálogo académico central</h2><p class="text-sm text-slate-600">Administra las áreas, asignaturas y el identificador que conecta cada materia con Saber 11. Los cambios afectan el registro docente y el banco de preguntas de toda la plataforma.</p></div><div class="grid sm:grid-cols-3 gap-3"><div class="rounded-xl bg-slate-50 p-3"><b class="text-2xl">'+S.areas.length+'</b><div class="text-xs text-slate-500">Áreas</div></div><div class="rounded-xl bg-slate-50 p-3"><b class="text-2xl">'+S.asigs.length+'</b><div class="text-xs text-slate-500">Asignaturas</div></div><div class="rounded-xl bg-slate-50 p-3"><b class="text-2xl">'+S.asigs.filter(x=>x.banco_subject).length+'</b><div class="text-xs text-slate-500">Con código Saber 11</div></div></div>')+
 card('<h3 class="font-semibold">'+(editA?'Editar área':'➕ Crear área')+'</h3><div class="flex flex-wrap gap-2"><input id="cat_area" class="border rounded-lg p-2 flex-1 min-w-48" maxlength="100" placeholder="Nombre del área" value="'+esc(editA?.nombre||'')+'">'+btn('CATALOGO.saveArea()','Guardar área')+(editA?btn('CATALOGO.cancel()','Cancelar','bg-slate-200 text-slate-800'):'')+'</div><div class="space-y-1">'+(areas||'<p class="text-sm text-slate-500">Aún no hay áreas.</p>')+'</div>')+
 card('<h3 class="font-semibold">'+(editS?'Editar asignatura':'➕ Crear asignatura')+'</h3><div class="grid sm:grid-cols-2 gap-2"><label class="text-sm">Nombre de la asignatura<input id="cat_asig" maxlength="100" class="border rounded-lg p-2 w-full mt-1" placeholder="Ej. Matemáticas" value="'+esc(editS?.nombre||'')+'"></label><label class="text-sm">Área<select id="cat_asig_area" class="border rounded-lg p-2 w-full mt-1"><option value="">Sin área</option>'+S.areas.map(a=>'<option value="'+a.id+'" '+(String(editS?.area_id||'')===String(a.id)?'selected':'')+'>'+esc(a.nombre)+'</option>').join('')+'</select></label><label class="text-sm sm:col-span-2">Identificador de materia Saber 11 (opcional)<input id="cat_subject" maxlength="80" class="border rounded-lg p-2 w-full mt-1" placeholder="Debe coincidir con el identificador usado por el banco" value="'+esc(editS?.banco_subject||'')+'"><span class="text-xs text-slate-500">Déjalo vacío si todavía no has definido la equivalencia. No inventes códigos: debe coincidir exactamente con las materias de las preguntas.</span></label></div><div class="flex gap-2">'+btn('CATALOGO.saveAsig()','Guardar asignatura')+(editS?btn('CATALOGO.cancel()','Cancelar','bg-slate-200 text-slate-800'):'')+'</div>')+
 card('<h3 class="font-semibold">📚 Asignaturas registradas</h3><div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-left text-slate-500"><th>Asignatura</th><th>Área</th><th>Materia Saber 11</th><th></th></tr></thead><tbody>'+(asigs||'<tr><td colspan="4" class="py-3 text-slate-500">Aún no hay asignaturas.</td></tr>')+'</tbody></table></div>')+
 '<p class="text-xs text-slate-500">Las eliminaciones se confirman antes de ejecutarse. Si una asignatura ya tiene preguntas o docentes asociados, revisa primero sus dependencias.</p></div>';
}
async function refresh(){await load();render()}
function cancel(){S.editArea=null;S.editAsig=null;render()}
async function saveArea(){
 const nombre=document.getElementById('cat_area')?.value.trim();if(!nombre)throw new Error('Escribe el nombre del área.');
 const r=S.editArea===null?await sb.from('areas').insert({nombre}):await sb.from('areas').update({nombre}).eq('id',S.editArea);
 if(r.error)throw r.error;S.editArea=null;await refresh();toast('✅','Área guardada','El catálogo quedó actualizado.');
}
function editArea(id){S.editArea=id;S.editAsig=null;render()}
async function delArea(id){const a=S.areas.find(x=>x.id===id);if(!a||!confirm('¿Eliminar el área "'+a.nombre+'"? Las asignaturas asociadas quedarán sin área.'))return;const r=await sb.from('areas').delete().eq('id',id);if(r.error)throw r.error;await refresh()}
async function saveAsig(){
 const nombre=document.getElementById('cat_asig')?.value.trim(),area=document.getElementById('cat_asig_area')?.value,subject=document.getElementById('cat_subject')?.value.trim()||null;
 if(!nombre)throw new Error('Escribe el nombre de la asignatura.');
 const payload={nombre,area_id:area?Number(area):null,banco_subject:subject};
 const r=S.editAsig===null?await sb.from('asignaturas').insert(payload):await sb.from('asignaturas').update(payload).eq('id',S.editAsig);
 if(r.error)throw r.error;S.editAsig=null;await refresh();toast('✅','Asignatura guardada','Ya está disponible en el catálogo central.');
}
function editAsig(id){S.editAsig=id;S.editArea=null;render()}
async function delAsig(id){const a=S.asigs.find(x=>x.id===id);if(!a||!confirm('¿Eliminar "'+a.nombre+'"? Comprueba antes si está asignada a docentes o tiene preguntas.'))return;const r=await sb.from('asignaturas').delete().eq('id',id);if(r.error)throw r.error;await refresh()}
return{view,load,refresh,cancel,saveArea,editArea,delArea,saveAsig,editAsig,delAsig};
})();
