/* AulaICFES — Aula virtual del docente: clase en vivo, pizarrón, asistencia virtual, exámenes virtuales
   (con fecha de inicio y fin), trabajos y talleres. Solo aparece cuando el docente activa el Modo virtual. */
window.AV=(function(){
let sub='vivo',busy=false;
const SUBS=[['vivo','🎥 Clase en vivo'],['pizarron','🖍 Pizarrón'],['asist','✋ Asistencia virtual'],['examenes','📝 Exámenes virtuales'],['trabajos','📎 Trabajos'],['talleres','✅ Calificar talleres']];
const MODS={asist:['claseasis.js?v=5','ACL','load'],examenes:['periodo.js?v=5','PER','load'],trabajos:['virtual.js?v=4','VIRT','load'],talleres:['talleres.js?v=1','TAL','load']};
function tabs(){return`<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px">${SUBS.map(([k,l])=>`<button onclick="AV.go('${k}')" style="padding:10px 14px;border-radius:10px;font-weight:700;font-size:13px;${sub===k?'background:#246be0;color:#fff':'background:#fff;border:1px solid #cbd5e1'}">${l}</button>`).join('')}</div>`}
function body(){
  switch(sub){
    case 'vivo':return window.vClase0?vClase0():'';
    case 'pizarron':return`<div class="aic-card" style="padding:20px;text-align:center"><div style="font-size:44px">🖍</div><h2 style="font-weight:800;font-size:20px">Pizarrón para dar tu clase</h2><p style="font-size:13px;color:#64748b;margin:6px 0 14px">Se abre a pantalla completa. Escribe o dibuja con el dedo, el mouse o un lápiz táctil. Para que tus estudiantes lo vean, comparte tu pantalla en la clase en vivo (Meet, Zoom o Jitsi).</p><button onclick="AV.pizarron()" style="background:#16a34a;color:#fff;padding:14px 22px;border-radius:12px;font-weight:800;font-size:16px">Abrir pizarrón</button></div>`;
    case 'asist':return window.ACL?ACL.view():'';
    case 'examenes':return window.PER?`<div style="margin-bottom:10px;font-size:13px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px">Aquí creas el examen virtual y programas <b>cuándo empieza</b> y <b>cuándo termina</b>.</div>`+PER.view(true):'';
    case 'trabajos':return window.VIRT?VIRT.view():'';
    case 'talleres':return window.TAL?TAL.view():'';
  }
}
const api={
  on(){return !!(typeof M!=='undefined'&&M&&M.role==='prof'&&window.VMODE&&VMODE.on())},
  view(){return tabs()+body()},
  async go(k){
    if(busy)return;sub=k;const m=MODS[k];
    if(m){busy=true;try{await loadScript(m[0]);await window[m[1]][m[2]]()}catch(x){busy=false;return err(x)}busy=false}
    render();if(k==='vivo'&&typeof paintChat==='function')try{paintChat()}catch(x){}
  },
  pizarron(){
    if(document.getElementById('av-board'))return;
    const o=document.createElement('div');o.id='av-board';
    o.style.cssText='position:fixed;inset:0;z-index:9999;background:#fff;display:flex;flex-direction:column;touch-action:none';
    o.innerHTML=`<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:8px;background:#0c214b;color:#fff"><b>🖍 Pizarrón</b>
     ${['#111111','#dc2626','#2563eb','#16a34a','#f59e0b'].map(c=>`<button data-c="${c}" style="width:30px;height:30px;border-radius:50%;background:${c};border:2px solid #fff"></button>`).join('')}
     <button data-c="#ffffff" style="padding:6px 10px;border-radius:8px;background:#fff;color:#111;font-weight:700">Borrador</button>
     <label style="font-size:12px">Grosor <input id="av-w" type="range" min="2" max="30" value="4"></label>
     <button id="av-clr" style="padding:6px 10px;border-radius:8px;background:#ffffff33;color:#fff;font-weight:700">Limpiar</button>
     <button id="av-png" style="padding:6px 10px;border-radius:8px;background:#ffffff33;color:#fff;font-weight:700">Guardar imagen</button>
     <button id="av-x" style="margin-left:auto;padding:6px 12px;border-radius:8px;background:#dc2626;color:#fff;font-weight:800">✖ Cerrar</button></div><canvas id="av-cv" style="flex:1;width:100%;touch-action:none;cursor:crosshair"></canvas>`;
    document.body.appendChild(o);
    const cv=o.querySelector('#av-cv'),cx=cv.getContext('2d');let col='#111111',draw=false,lx=0,ly=0,snap=null;
    const fit=()=>{const r=cv.getBoundingClientRect(),d=window.devicePixelRatio||1;const old=cv.width?cv.toDataURL():null;cv.width=r.width*d;cv.height=r.height*d;cx.fillStyle='#fff';cx.fillRect(0,0,cv.width,cv.height);if(old){const im=new Image();im.onload=()=>cx.drawImage(im,0,0);im.src=old}};
    fit();window.addEventListener('resize',fit);
    const pos=ev=>{const r=cv.getBoundingClientRect(),d=window.devicePixelRatio||1;return[(ev.clientX-r.left)*d,(ev.clientY-r.top)*d]};
    cv.addEventListener('pointerdown',ev=>{draw=true;[lx,ly]=pos(ev);cv.setPointerCapture(ev.pointerId)});
    cv.addEventListener('pointermove',ev=>{if(!draw)return;const[x,y]=pos(ev),d=window.devicePixelRatio||1;cx.strokeStyle=col;cx.lineWidth=(+o.querySelector('#av-w').value)*d*(col==='#ffffff'?3:1);cx.lineCap='round';cx.beginPath();cx.moveTo(lx,ly);cx.lineTo(x,y);cx.stroke();lx=x;ly=y});
    ['pointerup','pointercancel'].forEach(t=>cv.addEventListener(t,()=>draw=false));
    o.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>col=b.dataset.c);
    o.querySelector('#av-clr').onclick=()=>{cx.fillStyle='#fff';cx.fillRect(0,0,cv.width,cv.height)};
    o.querySelector('#av-png').onclick=()=>{const a=document.createElement('a');a.href=cv.toDataURL('image/png');a.download='pizarron.png';a.click()};
    o.querySelector('#av-x').onclick=()=>{window.removeEventListener('resize',fit);o.remove()};
  }
};
return api;
})();
