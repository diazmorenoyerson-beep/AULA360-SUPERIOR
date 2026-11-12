/* Lector de hojas de respuestas por foto (sin librerías). Entrada: imagen RGBA; salida: respuestas por pregunta. */
const OMR=(function(){
let TW=1700,TH=2200;
function boxDown(src,w,h,f){const nw=Math.floor(w/f),nh=Math.floor(h/f),out=new Uint8Array(nw*nh),a=f*f;
  for(let y=0;y<nh;y++)for(let x=0;x<nw;x++){let s=0;for(let j=0;j<f;j++){const r=(y*f+j)*w+x*f;for(let i=0;i<f;i++)s+=src[r+i]}out[y*nw+x]=s/a}
  return{d:out,w:nw,h:nh}}
function lumGray(rgba,n){const g=new Uint8Array(n);for(let i=0,j=0;i<n;i++,j+=4)g[i]=(rgba[j]*77+rgba[j+1]*150+rgba[j+2]*29)>>8;return g}
/* --- papel: candidatos de máscara --- */
function otsu(d){const h=new Float64Array(256);for(let i=0;i<d.length;i++)h[d[i]]++;const n=d.length;let sum=0;for(let i=0;i<256;i++)sum+=i*h[i];
  let sb=0,wb=0,best=0,th=127;for(let t=0;t<256;t++){wb+=h[t];if(!wb)continue;const wf=n-wb;if(!wf)break;sb+=t*h[t];const mb=sb/wb,mf=(sum-sb)/wf,v=wb*wf*(mb-mf)*(mb-mf);if(v>best){best=v;th=t}}return th}
function boxBin(m,w,h,r){ // dilatación (r>0) o erosión (r<0) cuadrada separable
  const dil=r>0,R=Math.abs(r),t=new Uint8Array(m.length),o=new Uint8Array(m.length);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=dil?0:1;for(let i=-R;i<=R;i++){const xx=x+i;const b=(xx<0||xx>=w)?(dil?0:1):m[y*w+xx];if(dil){if(b){v=1;break}}else if(!b){v=0;break}}t[y*w+x]=v}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=dil?0:1;for(let i=-R;i<=R;i++){const yy=y+i;const b=(yy<0||yy>=h)?(dil?0:1):t[yy*w+x];if(dil){if(b){v=1;break}}else if(!b){v=0;break}}o[y*w+x]=v}
  return o}
function bigBlob(m,w,h){const lab=new Int32Array(w*h),st=new Int32Array(w*h);let best=null,bc=0,id=0;
  for(let s=0;s<w*h;s++){if(!m[s]||lab[s])continue;id++;let sp=0,cnt=0,tl=[1e9,0],br=[-1e9,0],tr=[-1e9,0],bl=[1e9,0];st[sp++]=s;lab[s]=id;
    let a=1e9,b=-1e9,c=-1e9,d=1e9,pa,pb,pc,pd;
    while(sp){const p=st[--sp],x=p%w,y=(p-x)/w;cnt++;const s1=x+y,s2=x-y;
      if(s1<a){a=s1;pa=[x,y]}if(s1>b){b=s1;pb=[x,y]}if(s2>c){c=s2;pc=[x,y]}if(s2<d){d=s2;pd=[x,y]}
      if(x>0&&m[p-1]&&!lab[p-1]){lab[p-1]=id;st[sp++]=p-1}if(x<w-1&&m[p+1]&&!lab[p+1]){lab[p+1]=id;st[sp++]=p+1}
      if(y>0&&m[p-w]&&!lab[p-w]){lab[p-w]=id;st[sp++]=p-w}if(y<h-1&&m[p+w]&&!lab[p+w]){lab[p+w]=id;st[sp++]=p+w}}
    if(cnt>bc){bc=cnt;best={tl:pa,br:pb,tr:pc,bl:pd}}}
  return best?{q:best,area:bc}:null}
function paperQuads(rgba,w,h){
  const f=Math.max(1,Math.round(Math.max(w,h)/600)),nw=Math.floor(w/f),nh=Math.floor(h/f),n=nw*nh;
  const R=new Uint8Array(n),G=new Uint8Array(n),B=new Uint8Array(n),a=f*f;
  for(let y=0;y<nh;y++)for(let x=0;x<nw;x++){let r=0,g=0,b=0;for(let j=0;j<f;j++){let p=((y*f+j)*w+x*f)*4;for(let i=0;i<f;i++,p+=4){r+=rgba[p];g+=rgba[p+1];b+=rgba[p+2]}}const k=y*nw+x;R[k]=r/a;G[k]=g/a;B[k]=b/a}
  const gray=new Uint8Array(n),m1=new Uint8Array(n),sat=new Uint8Array(n);
  for(let k=0;k<n;k++){const mx=Math.max(R[k],G[k],B[k]),mn=Math.min(R[k],G[k],B[k]);gray[k]=(R[k]*77+G[k]*150+B[k]*29)>>8;const S=mx?(mx-mn)/mx*255:0;sat[k]=S;m1[k]=(S<45&&mx>110)?1:0}
  const t=otsu(gray),m2=new Uint8Array(n);for(let k=0;k<n;k++)m2[k]=gray[k]>t?1:0;
  const ts=otsu(sat),m3=new Uint8Array(n);for(let k=0;k<n;k++)m3[k]=sat[k]<=ts?1:0;
  const out=[];
  for(const m of[m1,m2,m3]){const c=boxBin(boxBin(m,nw,nh,3),nw,nh,-3),bl=bigBlob(c,nw,nh);if(bl&&bl.area>0.2*n){const q=bl.q;out.push([q.tl,q.tr,q.br,q.bl].map(p=>[p[0]*f+f/2,p[1]*f+f/2]))}}
  return out}
/* --- homografías (mínimos cuadrados) --- */
function solve(A,b,n){for(let i=0;i<n;i++){let p=i;for(let r=i+1;r<n;r++)if(Math.abs(A[r][i])>Math.abs(A[p][i]))p=r;[A[i],A[p]]=[A[p],A[i]];[b[i],b[p]]=[b[p],b[i]];
  if(Math.abs(A[i][i])<1e-12)return null;for(let r=i+1;r<n;r++){const f=A[r][i]/A[i][i];for(let c=i;c<n;c++)A[r][c]-=f*A[i][c];b[r]-=f*b[i]}}
  const x=new Array(n).fill(0);for(let i=n-1;i>=0;i--){let s=b[i];for(let c=i+1;c<n;c++)s-=A[i][c]*x[c];x[i]=s/A[i][i]}return x}
function fitH(pairs){const S=1000,AtA=Array.from({length:8},()=>new Array(8).fill(0)),Atb=new Array(8).fill(0);
  for(const[x0,y0,u0,v0]of pairs){const x=x0/S,y=y0/S,u=u0/S,v=v0/S;
    const r1=[x,y,1,0,0,0,-x*u,-y*u],r2=[0,0,0,x,y,1,-x*v,-y*v];
    for(let i=0;i<8;i++){Atb[i]+=r1[i]*u+r2[i]*v;for(let j=0;j<8;j++)AtA[i][j]+=r1[i]*r1[j]+r2[i]*r2[j]}}
  const h=solve(AtA,Atb,8);if(!h)return null;
  return(x,y)=>{const X=x/S,Y=y/S,d=h[6]*X+h[7]*Y+1;return[(h[0]*X+h[1]*Y+h[2])/d*S,(h[3]*X+h[4]*Y+h[5])/d*S]}}
/* --- enderezar y normalizar luz --- */
function warpGray(gray,w,h,quad){ // quad: tl,tr,br,bl en la foto -> TW x TH
  const edge=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]),pw=(edge(quad[0],quad[1])+edge(quad[3],quad[2]))/2;
  let f=Math.max(1,Math.floor(pw/TW)),g=gray,gw=w,gh=h,q=quad;
  if(f>1){const r=boxDown(gray,w,h,f);g=r.d;gw=r.w;gh=r.h;q=quad.map(p=>[p[0]/f,p[1]/f])}
  const map=fitH([[0,0,...q[0]],[TW,0,...q[1]],[TW,TH,...q[2]],[0,TH,...q[3]]]);if(!map)return null;
  const out=new Uint8Array(TW*TH);
  for(let y=0;y<TH;y++)for(let x=0;x<TW;x++){const[sx,sy]=map(x,y);if(sx<0||sy<0||sx>=gw-1||sy>=gh-1){out[y*TW+x]=255;continue}
    const x0=sx|0,y0=sy|0,fx=sx-x0,fy=sy-y0,i=y0*gw+x0;
    out[y*TW+x]=g[i]*(1-fx)*(1-fy)+g[i+1]*fx*(1-fy)+g[i+gw]*(1-fx)*fy+g[i+gw+1]*fx*fy}
  return out}
function normLight(g){const f=8,r=boxDown(g,TW,TH,f),w=r.w,h=r.h,d=r.d,t=new Uint8Array(w*h),mx=new Uint8Array(w*h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let m=0;for(let j=-3;j<=3;j++)for(let i=-3;i<=3;i++){const xx=Math.min(w-1,Math.max(0,x+i)),yy=Math.min(h-1,Math.max(0,y+j)),v=d[yy*w+xx];if(v>m)m=v}mx[y*w+x]=m}
  for(let pass=0;pass<2;pass++)for(let y=0;y<h;y++)for(let x=0;x<w;x++){let s=0,c=0;for(let j=-3;j<=3;j++)for(let i=-3;i<=3;i++){const xx=x+i,yy=y+j;if(xx>=0&&yy>=0&&xx<w&&yy<h){s+=mx[yy*w+xx];c++}}t[y*w+x]=s/c}
  const out=new Uint8Array(TW*TH);
  for(let y=0;y<TH;y++){const fy=Math.min(h-1.001,Math.max(0,y/f-0.5)),y0=fy|0,wy=fy-y0;
    for(let x=0;x<TW;x++){const fx=Math.min(w-1.001,Math.max(0,x/f-0.5)),x0=fx|0,wx=fx-x0,i=y0*w+x0;
      const bg=t[i]*(1-wx)*(1-wy)+t[i+1]*wx*(1-wy)+t[i+w]*(1-wx)*wy+t[i+w+1]*wx*wy;
      const v=g[y*TW+x]/Math.max(bg,1)*235;out[y*TW+x]=v>255?255:v}}
  return out}
/* --- anillos de los óvalos: ajuste fino --- */
function ringContrast(g,cx,cy,a,b){let s1=0,s2=0;const N=16;
  for(let k=0;k<N;k++){const t=k/N*6.2832,c=Math.cos(t),s=Math.sin(t);
    let x=Math.round(cx+a*c),y=Math.round(cy+b*s);if(x<0||y<0||x>=TW||y>=TH)return-999;s1+=255-g[y*TW+x];
    x=Math.round(cx+(a+4)*c);y=Math.round(cy+(b+4)*s);if(x<0||y<0||x>=TW||y>=TH)return-999;s2+=255-g[y*TW+x]}
  return(s1-s2)/N}
function alignMarks(g,marks){
  const pts=[];
  for(const m of marks){const cx=m[0],cy=m[1],w=m[2],R=Math.round(w*1.8)+60;
    const x0=Math.max(0,Math.round(cx-R)),x1=Math.min(TW-1,Math.round(cx+R)),y0=Math.max(0,Math.round(cy-R)),y1=Math.min(TH-1,Math.round(cy+R)),ww=x1-x0+1,hh=y1-y0+1;
    const lab=new Int32Array(ww*hh),st=new Int32Array(ww*hh);let best=null,id=0;
    for(let s0=0;s0<ww*hh;s0++){const sx=s0%ww,sy=(s0-sx)/ww;if(lab[s0]||g[(y0+sy)*TW+x0+sx]>110)continue;id++;let sp=0,n=0,bx0=1e9,bx1=-1,by0=1e9,by1=-1;st[sp++]=s0;lab[s0]=id;
      while(sp){const p=st[--sp],px=p%ww,py=(p-px)/ww;n++;if(px<bx0)bx0=px;if(px>bx1)bx1=px;if(py<by0)by0=py;if(py>by1)by1=py;
        for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=px+dx,ny=py+dy;if(nx<0||ny<0||nx>=ww||ny>=hh)continue;const q=ny*ww+nx;if(!lab[q]&&g[(y0+ny)*TW+x0+nx]<=110){lab[q]=id;st[sp++]=q}}}
      const bw=bx1-bx0+1,bh=by1-by0+1;
      if(Math.abs(bw-w)<0.35*w&&Math.abs(bh-w)<0.35*w&&n>0.7*bw*bh){const ccx=x0+(bx0+bx1)/2,ccy=y0+(by0+by1)/2,dist=Math.hypot(ccx-cx,ccy-cy);if(!best||dist<best.dist)best={ccx,ccy,dist}}}
    if(!best)return null;pts.push([cx,cy,best.ccx,best.ccy])}
  return fitH(pts)}
function readId(g,model,map){
  const dig=[];let okid=true;
  for(const col of model.idcols){const st=col.map(o=>{const[cx,cy]=map(o[0],o[1]);return classify(g,cx,cy,{w:o[2],h:o[3]},null,0)});
    const f=[];st.forEach((r,i)=>{if(r.s==='lleno')f.push(i)});if(f.length===1)dig.push(String(f[0]));else{dig.push('?');okid=false}}
  const sv=model.ver.map(o=>{const[cx,cy]=map(o[0],o[1]);return classify(g,cx,cy,{w:o[2],h:o[3]},null,0)}),fv=[];sv.forEach((r,i)=>{if(r.s==='lleno')fv.push(i)});
  const doc=dig.join('').replace(/^0+/,'');
  return{doc:okid?doc:null,docRaw:dig.join(''),ver:fv.length===1?'ABCDEF'[fv[0]]:null,verIdx:fv.length===1?fv[0]:null}}
function allOvals(model){const L=[];for(const row of model.preguntas){const q=row[0];for(let k=1;k<row.length;k++){const o=row[k];L.push({q,k:k-1,x:o[0],y:o[1],w:o[2],h:o[3]})}}return L}
function sampleOvals(L,n){const s=[],st=Math.max(1,Math.floor(L.length/n));for(let i=0;i<L.length;i+=st)s.push(L[i]);return s}
function coarseScore(g,S,R){let tot=0;for(const o of S){let best=-999;for(let dy=-R;dy<=R;dy+=2)for(let dx=-R;dx<=R;dx+=2){const c=ringContrast(g,o.x+dx,o.y+dy,(o.w-2)/2,(o.h-2)/2);if(c>best)best=c}tot+=best}return tot/S.length}
function refine(g,L,R,init){const pairs=[];
  for(const o of L){const a=(o.w-2)/2,b=(o.h-2)/2;let best=-999,bx=0,by=0,sum=0,cnt=0;const[ix,iy]=init?init(o.x,o.y):[o.x,o.y];
    for(let dy=-R;dy<=R;dy++)for(let dx=-R;dx<=R;dx++){const c=ringContrast(g,ix+dx,iy+dy,a,b);sum+=c;cnt++;if(c>best){best=c;bx=dx;by=dy}}
    o.conf=best-sum/cnt;o.best=best;o.dx=bx;o.dy=by;if(best>55&&o.conf>35)pairs.push([o.x,o.y,ix+bx,iy+by])}
  if(pairs.length<40)return null;
  let P=pairs,map=null;
  for(let it=0;it<4;it++){map=fitH(P);if(!map)return null;const res=pairs.map(p=>{const[u,v]=map(p[0],p[1]);return Math.hypot(u-p[2],v-p[3])});
    const sorted=[...res].sort((a,b)=>a-b),med=sorted[res.length>>1],th=Math.max(2.5,3*med);P=pairs.filter((p,i)=>res[i]<=th);if(P.length<30)return null}
  const res=P.map(p=>{const[u,v]=map(p[0],p[1]);return Math.hypot(u-p[2],v-p[3])}).sort((a,b)=>a-b);
  return{map,n:P.length,med:res[res.length>>1]}}
/* --- clasificación de cada óvalo --- */
function letraMask(rows){return rows?rows.map(r=>Array.from(r,Number)):null}
const IDEAL={};
function idealSolid(rx,ry,R,RY,W,H){const key=rx+'|'+ry;if(IDEAL[key]!==undefined)return IDEAL[key];let a=new Uint8Array(W*H),n=0;for(let j=-RY;j<=RY;j++)for(let i=-R;i<=R;i++)if((i*i)/(rx*rx)+(j*j)/(ry*ry)<=1){a[(j+RY)*W+i+R]=1;n++}
  for(let p=0;p<2;p++){const nx=new Uint8Array(W*H);for(let j=1;j<H-1;j++)for(let i=1;i<W-1;i++){let ok=1;for(let u=-1;u<=1&&ok;u++)for(let v=-1;v<=1;v++)if(!a[(j+u)*W+i+v]){ok=0;break}nx[j*W+i]=ok}a=nx}
  let c=0;for(let k=0;k<a.length;k++)c+=a[k];return IDEAL[key]=c/n}
function classify(g,cx,cy,o,mask,baseLetra){
  const rx=mask?9:o.w*0.34,ry=mask?9:o.h*0.34,X=Math.round(cx),Y=Math.round(cy),R=Math.ceil(rx),RY=Math.ceil(ry),W=2*R+1,H=2*RY+1;
  // fondo local: mediana de puntos justo fuera del borde del círculo (corrige sombras y filas sombreadas)
  const bgv=[];for(let k=0;k<24;k++){const t=k/24*6.2832,c=Math.cos(t),sn=Math.sin(t),ex=(k%2?4.5:7);const x=Math.round(X+(o.w/2+ex)*c),y=Math.round(Y+(o.h/2+ex)*sn);if(x>=0&&y>=0&&x<TW&&y<TH)bgv.push(g[y*TW+x])}
  bgv.sort((a,b)=>a-b);const bgl=bgv.length?bgv[bgv.length>>1]:235,THR=Math.min(175,bgl*0.82);
  const pts=[],allbin=new Uint8Array(W*H);let all=0,alld=0;
  for(let j=-RY;j<=RY;j++)for(let i=-R;i<=R;i++)if((i*i)/(rx*rx)+(j*j)/(ry*ry)<=1){const x=X+i,y=Y+j;if(x>=0&&y>=0&&x<TW&&y<TH){const dk=g[y*TW+x]<THR?1:0;pts.push([i,j,dk]);all++;alld+=dk;allbin[(j+RY)*W+i+R]=dk}}
  const da=all?alld/all:0;
  let sol=allbin;for(let p=0;p<2;p++){const nx=new Uint8Array(W*H);for(let j=1;j<H-1;j++)for(let i=1;i<W-1;i++){let ok=1;for(let a=-1;a<=1&&ok;a++)for(let b=-1;b<=1;b++)if(!sol[(j+a)*W+i+b]){ok=0;break}nx[j*W+i]=ok}sol=nx}
  let sc=0;for(let k=0;k<sol.length;k++)sc+=sol[k];const solid=all?sc/all:0;   // relleno sólido: sobrevive a la erosión (un chulo o una X no)                       // fracción oscura de TODO el círculo (incluye la letra)
  const qa=[0,0,0,0],qn=[0,0,0,0];for(let j=-RY;j<=RY;j++)for(let i=-R;i<=R;i++)if((i*i)/(rx*rx)+(j*j)/(ry*ry)<=1){const qi=(j<0?0:2)+(i<0?0:1);qn[qi]++;qa[qi]+=allbin[(j+RY)*W+i+R]}
  const qmin=Math.min(...qa.map((v,i)=>qn[i]?v/qn[i]:1));   // el cuadrante menos oscuro: un círculo lleno está oscuro en las 4 esquinas
  const sh=mask?2:0;let bestD=9,bestS=[0,0],bestN=0,bestK=0;
  for(let sy=-sh;sy<=sh;sy++)for(let sx=-sh;sx<=sh;sx++){let n=0,dk=0;
    for(const[i,j,d]of pts){if(mask){const mi=15+i-sx,mj=15+j-sy;if(mask[mj]&&mask[mj][mi]===1)continue}n++;dk+=d}
    if(n<20)continue;const dd=dk/n;if(dd<bestD){bestD=dd;bestS=[sx,sy];bestN=n;bestK=dk}}
  if(bestN<20)return{s:'vacio',d:0};
  const d=bestD;
  const ideal=idealSolid(rx,ry,R,RY,W,H);
  if(d>=0.75&&qmin>=0.6&&(!mask||da>=0.8)){if(solid>=0.92*ideal)return{s:'lleno',d:mask?da:d,sol:solid,qm:qmin};if(solid>=0.55*ideal)return{s:'casi',d:mask?da:d,sol:solid,qm:qmin}}
  const extra=mask?da-baseLetra:d;               // tinta añadida respecto a un círculo vacío de esa letra
  if(d<(mask?0.12:0.08)||(mask&&extra<0.15))return{s:'vacio',d:mask?Math.max(0,extra):d};
  const bin=new Uint8Array(W*H),[sx,sy]=bestS;
  for(const[i,j,dv]of pts){if(mask){const mi=15+i-sx,mj=15+j-sy;if(mask[mj]&&mask[mj][mi]===1)continue}if(dv)bin[(j+RY)*W+i+R]=1}
  let cur=bin;for(let p=0;p<2;p++){const nx=new Uint8Array(W*H);for(let j=1;j<H-1;j++)for(let i=1;i<W-1;i++){let ok=1;for(let a=-1;a<=1&&ok;a++)for(let b=-1;b<=1;b++)if(!cur[(j+a)*W+i+b]){ok=0;break}nx[j*W+i]=ok}cur=nx}
  let th=0;for(let k=0;k<cur.length;k++)th+=cur[k];
  return{s:(th>0.35*bestK&&d>0.3)?'parcial':'tachado',d:mask?extra+0.45:d}}
function gradeGray(g,model,res){
  const mk=model.letra?model.letra.map(letraMask):null,out={};
  for(const row of model.preguntas){const q=row[0],st=[];
    for(let k=1;k<row.length;k++){const o={w:row[k][2],h:row[k][3]},[cx,cy]=res.map(row[k][0],row[k][1]);st.push(classify(g,cx,cy,o,mk?mk[k-1]:null,model.letraBase?model.letraBase[k-1]:0))}
    const full=[],bad=[],casi=[];st.forEach((r,i)=>{if(r.s==='lleno')full.push(i);else if(r.s==='casi'){casi.push(i);bad.push(r.s)}else if(r.s!=='vacio')bad.push(r.s)});
    const dudosa=st.some(r=>r.s==='parcial'||r.s==='tachado'||r.s==='casi');
    let v;if(full.length===1&&!bad.length)v={st:'ok',r:'ABCDEFGH'[full[0]]};
    else if(full.length>1)v={st:'anulada',r:'doble marca'};
    else if(full.length===1&&bad.length)v={st:'anulada',r:'marca extra'};
    else if(casi.length===1&&bad.length===1)v={st:'revisar',r:'relleno incompleto: ¿cuenta como '+'ABCDEFGH'[casi[0]]+'?',opt:'ABCDEFGH'[casi[0]]};
    else if(bad.length)v={st:'anulada',r:'no relleno completo'};
    else v={st:'anulada',r:'sin marcar'};
    v.dudosa=dudosa;v.det=st.map(r=>+r.d.toFixed(2));out[q]=v}
  return out}
/* --- principal --- */
function grade(rgba,w,h,model){
  TW=model.W||1700;TH=model.H||2200;
  const gray=lumGray(rgba,w*h),cands=paperQuads(rgba,w,h);if(!cands.length)return{error:'No se encontró la hoja en la foto. Toma la foto con la hoja completa sobre una mesa oscura.'};
  const L=allOvals(model),S=sampleOvals(L,40);let best=null;
  for(const quad of cands){for(let rot=0;rot<4;rot++){const q=[0,1,2,3].map(i=>quad[(i+rot)%4]);
      const wp=warpGray(gray,w,h,q);if(!wp)continue;const g=normLight(wp),sc=coarseScore(g,S,model.marks?14:8);
      if(!best||sc>best.sc)best={sc,g,q};}
    if(best&&best.sc>70)break}
  if(!best)return{error:'No se pudo enderezar la foto.'};
  const init=model.marks?alignMarks(best.g,model.marks):null;
  const rf=refine(best.g,L,model.marks?(init?6:14):10,init);
  if(!rf||rf.med>4)return{error:'La hoja no se ve con claridad (borrosa, cortada o muy oscura). Toma otra foto.'};
  const res=gradeGray(best.g,model,rf),id=model.idcols?readId(best.g,model,rf.map):null;return{g:best.g,res,id,quality:{ovalos:rf.n,desv:rf.med,esquinas:!!init}}}
return{grade,TW,TH}})();
if(typeof module!=='undefined')module.exports=OMR;
