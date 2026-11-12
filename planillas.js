/* AULA360 — Planillas con el modelo del colegio: toma la planilla que subió el rector (Word o Excel) y la entrega
   con los estudiantes del curso ya escritos, conservando el formato. Si es PDF o no hay modelo, arma una planilla con el membrete. */
window.PLA=(function(){
const JSZ='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main',S='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kind=t=>{t=String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
  if(/documento|identific|\bti\b|\bt\.i|cedula|\bdoc\b/.test(t))return'd';
  if(/nombre|estudiante|apellido|alumno/.test(t))return'n';
  if(/^(n|no|num|numero|item|#)[\.°º]*$/.test(t)||/^n[°º]/.test(t))return'i';
  return null};
const mime={docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
function save(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)}
const ser=d=>'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'+new XMLSerializer().serializeToString(d.documentElement);
const val=(k,i,st)=>k==='n'?st.full_name:k==='d'?(st.document||''):String(i+1);

/* ---------- Word ---------- */
async function docx(buf,rows){
  const zip=await JSZip.loadAsync(buf),f=zip.file('word/document.xml');if(!f)throw new Error('no docx');
  const doc=new DOMParser().parseFromString(await f.async('string'),'application/xml');
  const txt=n=>[...n.getElementsByTagNameNS(W,'t')].map(x=>x.textContent).join('');
  const kids=(n,tag)=>[...n.childNodes].filter(x=>x.localName===tag&&x.namespaceURI===W);
  let tbl=null,hi=-1,cols=[];
  for(const t of doc.getElementsByTagNameNS(W,'tbl')){
    const trs=kids(t,'tr');
    for(let i=0;i<Math.min(trs.length,6);i++){const cs=kids(trs[i],'tc').map(c=>kind(txt(c)));if(cs.includes('n')){tbl=t;hi=i;cols=cs;break}}
    if(tbl)break}
  if(!tbl)throw new Error('sin tabla');
  const trs=kids(tbl,'tr'),data=trs.slice(hi+1),proto=(data[data.length-1]||trs[hi]).cloneNode(true);
  const setTc=(tc,text)=>{
    const ps=kids(tc,'p');let p=ps[0];if(!p){p=doc.createElementNS(W,'w:p');tc.appendChild(p)}
    ps.slice(1).forEach(x=>tc.removeChild(x));
    const rs=[...p.getElementsByTagNameNS(W,'r')];let r=rs[0];rs.slice(1).forEach(x=>x.parentNode.removeChild(x));
    if(!r){r=doc.createElementNS(W,'w:r');p.appendChild(r)}
    [...r.childNodes].filter(n=>n.localName!=='rPr').forEach(n=>r.removeChild(n));
    const t=doc.createElementNS(W,'w:t');t.setAttribute('xml:space','preserve');t.textContent=text;r.appendChild(t)};
  const blank=tr=>kids(tr,'tc').forEach(c=>setTc(c,''));
  rows.forEach((st,i)=>{
    let tr=data[i];if(!tr){tr=proto.cloneNode(true);blank(tr);tbl.appendChild(tr)}
    const cs=kids(tr,'tc');cols.forEach((k,j)=>{if(k&&cs[j])setTc(cs[j],val(k,i,st))})});
  zip.file('word/document.xml',ser(doc));
  return zip.generateAsync({type:'blob',mimeType:mime.docx});
}

/* ---------- Excel ---------- */
const colN=a=>a.split('').reduce((n,c)=>n*26+c.charCodeAt(0)-64,0);
const colL=n=>{let s='';while(n>0){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=Math.floor((n-1)/26)}return s};
async function xlsx(buf,rows){
  const zip=await JSZip.loadAsync(buf);
  const sp=Object.keys(zip.files).filter(n=>/^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort((a,b)=>parseInt(a.match(/\d+/))-parseInt(b.match(/\d+/)));
  if(!sp.length)throw new Error('sin hoja');
  let sst=[];const ssf=zip.file('xl/sharedStrings.xml');
  if(ssf){const d=new DOMParser().parseFromString(await ssf.async('string'),'application/xml');
    sst=[...d.getElementsByTagNameNS(S,'si')].map(si=>[...si.getElementsByTagNameNS(S,'t')].map(t=>t.textContent).join(''))}
  for(const path of sp){
    const doc=new DOMParser().parseFromString(await zip.file(path).async('string'),'application/xml');
    const sd=doc.getElementsByTagNameNS(S,'sheetData')[0];if(!sd)continue;
    const rowsEl=[...sd.getElementsByTagNameNS(S,'row')];
    const cellTxt=c=>{const t=c.getAttribute('t');
      if(t==='s'){const v=c.getElementsByTagNameNS(S,'v')[0];return v?sst[+v.textContent]||'':''}
      if(t==='inlineStr')return[...c.getElementsByTagNameNS(S,'t')].map(x=>x.textContent).join('');
      const v=c.getElementsByTagNameNS(S,'v')[0];return v?v.textContent:''};
    let hr=null,map={};
    for(const r of rowsEl){
      const m={};[...r.getElementsByTagNameNS(S,'c')].forEach(c=>{const k=kind(cellTxt(c));if(k)m[c.getAttribute('r').replace(/\d+/,'')]=k});
      if(Object.values(m).includes('n')){hr=r;map=m;break}}
    if(!hr)continue;
    const h=+hr.getAttribute('r'),byNum={};rowsEl.forEach(r=>byNum[+r.getAttribute('r')]=r);
    const styleOf=(L,rn)=>{const r=byNum[rn];const c=r&&[...r.getElementsByTagNameNS(S,'c')].find(x=>x.getAttribute('r')===L+rn);return c?c.getAttribute('s'):null};
    const getRow=n=>{let r=byNum[n];if(r)return r;
      r=doc.createElementNS(S,'row');r.setAttribute('r',n);
      const after=rowsEl.filter(x=>+x.getAttribute('r')<n).pop();
      const next=Object.keys(byNum).map(Number).filter(x=>x>n).sort((a,b)=>a-b)[0];
      if(next)sd.insertBefore(r,byNum[next]);else sd.appendChild(r);byNum[n]=r;return r};
    rows.forEach((st,i)=>{
      const rn=h+1+i,r=getRow(rn);r.removeAttribute('spans');
      Object.entries(map).forEach(([L,k])=>{
        let c=[...r.getElementsByTagNameNS(S,'c')].find(x=>x.getAttribute('r')===L+rn);
        if(!c){c=doc.createElementNS(S,'c');c.setAttribute('r',L+rn);
          const st0=styleOf(L,h+1)||styleOf(L,h);if(st0)c.setAttribute('s',st0);
          const nx=[...r.getElementsByTagNameNS(S,'c')].find(x=>colN(x.getAttribute('r').replace(/\d+/,''))>colN(L));
          if(nx)r.insertBefore(c,nx);else r.appendChild(c)}
        while(c.firstChild)c.removeChild(c.firstChild);c.removeAttribute('t');
        const v=val(k,i,st);
        if(k==='i'){const x=doc.createElementNS(S,'v');x.textContent=v;c.appendChild(x)}
        else{c.setAttribute('t','inlineStr');const is=doc.createElementNS(S,'is'),t=doc.createElementNS(S,'t');t.setAttribute('xml:space','preserve');t.textContent=v;is.appendChild(t);c.appendChild(is)}
      })});
    zip.file(path,ser(doc));return zip.generateAsync({type:'blob',mimeType:mime.xlsx});
  }
  throw new Error('sin encabezado');
}

/* ---------- Planilla armada por la plataforma (respaldo) ---------- */
function armada(clase,curso,rows){
  const as=clase==='planilla_asistencia',n=as?22:6;
  const th=as?Array.from({length:n},()=>'<th style="width:22px"></th>').join(''):['Nota 1','Nota 2','Nota 3','Nota 4','Def.','Obs.'].map(x=>`<th>${x}</th>`).join('');
  const body=rows.map((s,i)=>`<tr><td style="text-align:center">${i+1}</td><td>${e(s.full_name)}</td><td>${e(s.document||'')}</td>${Array.from({length:n},()=>'<td></td>').join('')}</tr>`).join('');
  return`<h2 style="text-align:center;margin:0 0 4px">${as?'PLANILLA DE ASISTENCIA':'PLANILLA DE NOTAS'}</h2><p style="text-align:center;margin:0 0 10px;font-size:13px">Curso: <b>${e(curso)}</b> &nbsp;·&nbsp; Asignatura: ______________________ &nbsp;·&nbsp; Periodo: ____</p>
  <table style="width:100%;border-collapse:collapse;font-size:11px" border="1"><thead><tr><th style="width:26px">N.°</th><th>Nombre del estudiante</th><th style="width:90px">Documento</th>${th}</tr></thead><tbody>${body}</tbody></table>`;
}

const api={_t:{docx,xlsx},
  async generar(clase,courseId){
    try{
      const c=(window.PERM_CURSOS||[]).find(x=>x.id===courseId);
      if(!c)return toast('⚠️','Elige el curso','');
      const r=await sb.from('roster').select('full_name,document').eq('course_id',courseId).order('full_name');
      if(r.error)return err(r.error);
      const rows=r.data||[];if(!rows.length)return toast('⚠️','Ese curso no tiene estudiantes','Súbelos primero en Cursos y estudiantes.');
      const nom=(clase==='planilla_asistencia'?'Planilla_asistencia_':'Planilla_notas_')+(c.grade===0?'T':c.grade+'')+'_'+String(c.name||'').replace(/[^\w]+/g,'');
      const fm=(window.PERM_FMT||[]).find(x=>x.persona==='docente'&&x.clase===clase);
      const ext=fm&&(fm.nombre.match(/\.(docx|xlsx)$/i)||[])[1];
      if(fm&&ext){
        toast('⏳','Armando tu planilla…','Con el modelo de tu colegio.');
        try{
          if(typeof JSZip==='undefined')await loadScript(JSZ);
          const d=await sb.storage.from('formatos-colegio').download(fm.path);if(d.error)throw d.error;
          const buf=await d.data.arrayBuffer(),e2=ext.toLowerCase();
          const out=e2==='docx'?await docx(buf,rows):await xlsx(buf,rows);
          save(out,nom+'.'+e2);return toast('✅','Planilla lista','Se descargó con los estudiantes de '+c.grade+'° '+c.name+'.');
        }catch(x){console.error(x);toast('ℹ️','No pude usar ese modelo','No encontré la columna de nombres. Te armo una planilla con el membrete del colegio.')}
      }
      doPrint(armada(clase,(c.grade===0?'Transición':c.grade+'°')+' '+c.name,rows),{hoja:true});
    }catch(x){err(x)}
  }
};
return api})();
