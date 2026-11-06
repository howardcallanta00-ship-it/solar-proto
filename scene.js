(function(){
// 3D -> isometric screen. x: right-down, y: left-down, z: up.
const C=Math.cos(Math.PI/6);
const f1=n=>(Math.round(n*10)/10).toString();
function mkP(k,ox,oy){return (x,y,z)=>[ox+(x-y)*C*k, oy+(x+y)*0.5*k - z*k];}
const lerp=(a,b,t)=>a+(b-a)*t;
const COL={R:'#FBF7F1',L:'#E2D9CC',roofF:'#D5DADF',roofFe:'#E9E3D8',roofFl:'#C3BBAE',
  wood:'#C9915F',woodL:'#B97F4C',slab:'#ECEFF1',
  tileR:'#C46F58',tileRd:'#A05442',tileL:'#A95B47',zinc:'#8E9AA8',zincE:'#5A6573',frame:'#2B3642'};
const ROOFS=['flat','shed','hip','gable'];
const zS=x=>5.6-0.325*x;     // shed roof height at x
const zP=x=>5.4-0.6*(x-4);   // hip/gable slope height at x (x between 4 and 8.35)
// Panel layout for a roof: returns array of 3D quads [A,B,C,D]
function layout(roof){
  const pw=1.05,gp=0.12, panels=[];
  if(roof==='flat'){
    const dd=1.64,h=0.44,z0=3.35+0.14,rowsX=[7.7,5.75];
    rowsX.forEach((xf)=>{const n=8,tot=n*pw+(n-1)*gp,y0=(11-tot)/2+0.4;
      for(let i=0;i<n;i++){const a=y0+i*(pw+gp),b=a+pw;
        panels.push([[xf,a,z0],[xf,b,z0],[xf-dd,b,z0+h],[xf-dd,a,z0+h]]);}});
    return panels;}
  // pitched: eave->ridge param s
  let xe,xr,ze,zr,yl,yr,rows,cap,pl=1.7,pr;
  if(roof==='shed'){xe=8.3;xr=-0.3;ze=zS(xe)+.28;zr=zS(xr)+.28;yl=t=>-0.3;yr=t=>11.3;rows=3;cap=6;pl=1.75;}
  if(roof==='hip'){xe=8.35;xr=4;ze=2.79;zr=5.4;yl=t=>-0.35+4.35*t;yr=t=>11.35-4.35*t;rows=2;cap=9;}
  if(roof==='gable'){xe=8.35;xr=4;ze=2.79;zr=5.4;yl=t=>-0.35;yr=t=>11.35;rows=2;cap=9;}
  const L=Math.hypot(xe-xr,ze-zr), rg=0.14;
  const total=rows*pl+(rows-1)*rg, m=(L-total)/2;
  const mrow=roof==='hip'?0.42:0.6, setb=roof==='hip'?0.7:0.6;
  const pt=(s,y,lift=0.06)=>[lerp(xe,xr,s),y,lerp(ze,zr,s)+lift];
  for(let r=0;r<rows;r++){
    const s0=(m+r*(pl+rg))/L, s1=(m+r*(pl+rg)+pl)/L;
    const sm=roof==='hip'?Math.max(s0,s1):s1;
    const avail=yr(sm)-yl(sm)-2*setb;
    let n=Math.min(cap,Math.floor((avail+gp)/(pw+gp)));
    if(n<1)continue;
    const tot=n*pw+(n-1)*gp,cy=(yl(sm)+yr(sm))/2,y0=cy-tot/2;
    for(let i=0;i<n;i++){const a=y0+i*(pw+gp),b=a+pw;
      panels.push([pt(s0,a),pt(s0,b),pt(s1,b),pt(s1,a)]);}
  }
  return panels;
}



// returns {svg:string (static layers before panels), after:string(static after panels), slots:[pts string], pts:[[x,y]] , quads}
function build(roof,P,o={}){
  const pts=[]; const out=[]; 
  const pp=(arr)=>arr.map(q=>{const s=P(...q);pts.push(s);return f1(s[0])+','+f1(s[1]);}).join(' ');
  const poly=(arr,fill,extra='')=>{out.push(`<polygon points="${pp(arr)}" fill="${fill}" ${extra}/>`);};
  const line=(a,b,stroke,w=2)=>{out.push(`<line x1="${f1(P(...a)[0])}" y1="${f1(P(...a)[1])}" x2="${f1(P(...b)[0])}" y2="${f1(P(...b)[1])}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round"/>`);};
  const wR=(y0,y1,z0,z1,x=8)=>[[x,y0,z0],[x,y1,z0],[x,y1,z1],[x,y0,z1]];
  const wL=(x0,x1,z0,z1,y=11)=>[[x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1]];
  const glassR=(y0,y1,z0,z1,mul=[],x=8)=>{poly(wR(y0,y1,z0,z1,x),'url(#glassR)',`stroke="${COL.frame}" stroke-width="2.2" stroke-linejoin="round"`);mul.forEach(y=>line([x,y,z0],[x,y,z1],COL.frame,2));
    line([x,y0,z0+(z1-z0)*.5],[x,y1,z0+(z1-z0)*.5],COL.frame,1.2);};
  const glassL=(x0,x1,z0,z1,mul=[],y=11)=>{poly(wL(x0,x1,z0,z1,y),'url(#glassL)',`stroke="${COL.frame}" stroke-width="2.2" stroke-linejoin="round"`);mul.forEach(x=>line([x,y,z0],[x,y,z1],COL.frame,2));};
  const doorR=(y0,y1,z1)=>{poly(wR(y0,y1,0,z1),COL.frame);line([8,y0+.22,1.0],[8,y0+.22,1.6],'#E7DFD3',3);};
  const box=(x0,x1,y0,y1,z0,z1,cT,cR,cL)=>{ // visible faces of a box
    poly([[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]],cL);
    poly([[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]],cR);
    poly([[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]],cT,'stroke="#fff" stroke-opacity=".7" stroke-width="1"');};
  let slotsQ=layout(roof);
  if(roof==='flat'){
    poly(wL(0,8,0,3),COL.L); poly(wR(0,11,0,3),COL.R);
    glassL(.8,3.7,.4,2.6,[2.25]); glassL(4.3,7.2,.4,2.6,[5.75]);
    glassR(.8,5.6,.4,2.6,[2.4,4.0]); glassR(6.4,7.8,1.3,2.6); doorR(8.8,9.8,2.5);
    box(-.3,8.3,-.3,11.3,3,3.35,COL.roofF,COL.roofFe,COL.roofFl);
    // upper volume
    poly(wL(0,3.6,3.35,6,6),COL.wood);
    for(let x=.45;x<3.6;x+=.5)line([x,6,3.4],[x,6,5.95],COL.woodL,1.4);
    poly(wR(0,6,3.35,6,3.6),COL.R);
    glassL(.7,2.9,4.1,5.2,[1.8],6); glassR(.8,4.8,4.1,5.2,[2.8],3.6);
    box(-.25,3.85,-.25,6.25,6,6.3,COL.slab,COL.roofFe,COL.roofFl);
  }
  if(roof==='shed'){
    poly([[0,11,0],[8,11,0],[8,11,3],[0,11,5.6]],COL.L); poly(wR(0,11,0,3),COL.R);
    const zt=x=>zS(x)-.7;
    poly([[.8,11,.5],[3.8,11,.5],[3.8,11,zt(3.8)],[.8,11,zt(.8)]],'url(#glassL)',`stroke="${COL.frame}" stroke-width="2.2"`);
    poly([[4.7,11,.5],[7.3,11,.5],[7.3,11,zt(7.3)],[4.7,11,zt(4.7)]],'url(#glassL)',`stroke="${COL.frame}" stroke-width="2.2"`);
    line([2.3,11,.5],[2.3,11,zt(2.3)],COL.frame,2); line([6,11,.5],[6,11,zt(6)],COL.frame,2);
    glassR(.8,5.2,.5,2.4,[2.3,3.7]); poly(wR(5.8,7.9,0,3),COL.wood);
    for(let y=6;y<7.9;y+=.4)line([8,y,.05],[8,y,2.95],COL.woodL,1.3);
    doorR(8.8,9.8,2.5);
    const q=(x,y,z)=>[x,y,z];
    poly([[-.3,11.3,zS(-.3)],[8.3,11.3,zS(8.3)],[8.3,11.3,zS(8.3)+.28],[-.3,11.3,zS(-.3)+.28]],COL.zincE);
    poly([[8.3,-.3,zS(8.3)],[8.3,11.3,zS(8.3)],[8.3,11.3,zS(8.3)+.28],[8.3,-.3,zS(8.3)+.28]],'#6B7684');
    poly([[-.3,-.3,zS(-.3)+.28],[8.3,-.3,zS(8.3)+.28],[8.3,11.3,zS(8.3)+.28],[-.3,11.3,zS(-.3)+.28]],COL.zinc,'stroke="#fff" stroke-opacity=".6" stroke-width="1"');
  }
  if(roof==='hip'){
    poly(wL(0,8,0,3),COL.L); poly(wR(0,11,0,3),COL.R);
    glassL(1,3.2,.6,2.3,[2.1]); glassL(4.6,6.8,.6,2.3,[5.7]);
    glassR(1,3.8,.6,2.3,[2.4]); glassR(5,7.4,.6,2.3,[6.2]); doorR(8.6,9.6,2.4);
    poly([[8.35,11.35,2.79],[-.35,11.35,2.79],[4,7,5.4]],COL.tileL);
    poly([[8.35,-.35,2.79],[8.35,11.35,2.79],[4,7,5.4],[4,4,5.4]],COL.tileR);
    line([8.35,11.35,2.79],[4,7,5.4],'#8A4636',2);
    line([4,4,5.4],[4,7,5.4],'#8A4636',2.4);
  }
  if(roof==='gable'){
    poly([[0,11,0],[8,11,0],[8,11,3],[4,11,5.4],[0,11,3]],COL.L); poly(wR(0,11,0,3),COL.R);
    glassL(1,3,.6,2.3,[2]); glassL(5,7,.6,2.3,[6]);
    // round attic window
    const ring=[];for(let a=0;a<24;a++){const t=a/24*2*Math.PI;ring.push([4+.55*Math.cos(t),11,3.9+.55*Math.sin(t)]);}
    poly(ring,'url(#glassL)',`stroke="${COL.frame}" stroke-width="2.2"`);
    glassR(1,3.8,.6,2.3,[2.4]); glassR(5,7.4,.6,2.3,[6.2]); doorR(8.6,9.6,2.4);
    poly([[8.35,11.35,2.79],[4,11.35,5.4],[4,11.35,5.14],[8.35,11.35,2.53]],COL.tileRd);
    poly([[4,11.35,5.4],[-.35,11.35,2.79],[-.35,11.35,2.53],[4,11.35,5.14]],COL.tileRd);
    poly([[8.35,-.35,2.79],[8.35,11.35,2.79],[4,11.35,5.4],[4,-.35,5.4]],COL.tileR);
    line([4,-.35,5.4],[4,11.35,5.4],'#8A4636',2.4);
  }
  const before=out.slice(); out.length=0;
  return {before:before.join('\n'),quads:slotsQ,pts,pp,P};
}



const P=mkP(27,380,285);
const CAPS={};ROOFS.forEach(r=>CAPS[r]=layout(r).length);
const ANC={flat:[6.6,5.5,3.9],shed:[4.2,5.5,zS(4.2)+.5],hip:[6.2,5.5,zP(6.2)+.5],gable:[6.2,5.5,zP(6.2)+.5]};
const ANCH={};ROOFS.forEach(r=>ANCH[r]=P(...ANC[r]).map(Math.round));
const CAB=P(9.5,1.6,2.4).map(Math.round);
const NAMES={flat:'Flat',shed:'One slope',hip:'Hip',gable:'Gable'};
const NOTE={flat:'Tilted racks on a flat roof.',shed:'Panels lie flush on one big slope.',hip:'Panels fit on the front slope only.',gable:'Panels lie flush on the sunny slope.'};
const ICON={
flat:'<rect x="10" y="24" width="44" height="16" fill="#fff" stroke="#14263B" stroke-width="2.5"/><path d="M5 18h54v6H5z" fill="#fff" stroke="#14263B" stroke-width="2.5" stroke-linejoin="round"/><path d="M14 14l6-6h8l-6 6zM30 14l6-6h8l-6 6z" fill="#14263B"/>',
shed:'<path d="M8 40V24l48-12v28z" fill="#fff" stroke="#14263B" stroke-width="2.5" stroke-linejoin="round"/><path d="M16 24l30-7.5" stroke="#14263B" stroke-width="2.5"/>',
hip:'<path d="M6 28l12-14h28l12 14z" fill="#fff" stroke="#14263B" stroke-width="2.5" stroke-linejoin="round"/><rect x="10" y="28" width="44" height="12" fill="#fff" stroke="#14263B" stroke-width="2.5"/>',
gable:'<path d="M6 26L32 8l26 18z" fill="#fff" stroke="#14263B" stroke-width="2.5" stroke-linejoin="round"/><rect x="10" y="26" width="44" height="14" fill="#fff" stroke="#14263B" stroke-width="2.5"/>'};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function palm(bx,by){const T=(dx,dy)=>f1(bx+dx)+' '+f1(by+dy);
  return `<path d="M${T(0,0)} C${T(4,-34)} ${T(14,-64)} ${T(34,-96)}" fill="none" stroke="#8A6A4A" stroke-width="9" stroke-linecap="round"/><g fill="none" stroke="#2E8B57" stroke-width="7" stroke-linecap="round"><path d="M${T(34,-96)} C${T(6,-118)} ${T(-24,-112)} ${T(-44,-84)}"/><path d="M${T(34,-96)} C${T(26,-128)} ${T(8,-146)} ${T(-22,-150)}"/><path d="M${T(34,-96)} C${T(42,-128)} ${T(64,-142)} ${T(94,-138)}"/><path d="M${T(34,-96)} C${T(62,-112)} ${T(92,-102)} ${T(108,-74)}"/><path d="M${T(34,-96)} C${T(16,-100)} ${T(-6,-86)} ${T(-14,-62)}"/></g><circle cx="${f1(bx+30)}" cy="${f1(by-90)}" r="5" fill="#6B4A2F"/><circle cx="${f1(bx+40)}" cy="${f1(by-88)}" r="5" fill="#6B4A2F"/>`;}
const DEFS=`<defs><linearGradient id="pv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3F68A3"/><stop offset="1" stop-color="#14264A"/></linearGradient><linearGradient id="glassR" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E4F4FD"/><stop offset=".55" stop-color="#93C9EC"/><stop offset="1" stop-color="#5F9FD1"/></linearGradient><linearGradient id="glassL" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9CC8E6"/><stop offset="1" stop-color="#4F83B3"/></linearGradient><linearGradient id="bt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#34E0C8"/><stop offset="1" stop-color="#12A28F"/></linearGradient></defs>`;
const pp=a=>a.map(q=>P(...q).map(f1).join(',')).join(' ');
const ARC=[[60,270,'6 am'],[245,120,'9 am'],[430,70,'12 pm'],[615,120,'3 pm'],[800,270,'6 pm']].map(([x,y,t])=>`<circle cx="${x}" cy="${y}" r="4" fill="#fff"/><text x="${x}" y="${y+24}">${t}</text>`).join('');
const PATH=pp([[8,9.1,0],[8,10.3,0],[12.6,10.3,0],[12.6,9.1,0]]);
// s: {roof,panels,batt(modules),hour,pop,gen,charge,dis,grid,exp}
function scene(s){
  const H=build(s.roof,P),n=s.panels,nB=s.batt;
  const order=[...Array(H.quads.length).keys()];
  if(s.roof==='flat'){order.length=0;for(let i=8;i<16;i++)order.push(i);for(let i=0;i<8;i++)order.push(i);}
  const h=s.hour,t=clamp((h+0.5-6)/12,0,1),A=[60,270],B=[430,-130],C=[800,270];
  const sx=(1-t)*(1-t)*A[0]+2*(1-t)*t*B[0]+t*t*C[0],sy=(1-t)*(1-t)*A[1]+2*(1-t)*t*B[1]+t*t*C[1];
  const hh=h+0.5,day=clamp((hh-5.5)/1,0,1)*clamp((18.5-hh)/1,0,1),day2=clamp((hh-5)/1.5,0,1)*clamp((19.5-hh)/1.5,0,1);
  let o=`<svg viewBox="0 0 860 600" width="100%" height="100%" style="position:absolute;inset:0" aria-hidden="true"><defs><radialGradient id="sunGlow"><stop offset="0" stop-color="#FFF3B0" stop-opacity=".95"/><stop offset=".45" stop-color="#FFD84D" stop-opacity=".55"/><stop offset="1" stop-color="#FFD84D" stop-opacity="0"/></radialGradient><linearGradient id="lawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C4E8BA"/><stop offset="1" stop-color="#7DBF8D"/></linearGradient></defs>
<g opacity="${(1-day2).toFixed(2)}"><circle cx="430" cy="96" r="22" fill="#F4F1E4"/></g>
<ellipse cx="130" cy="62" rx="62" ry="15" fill="#fff" opacity=".85"/><ellipse cx="102" cy="50" rx="34" ry="15" fill="#fff" opacity=".85"/><ellipse cx="780" cy="46" rx="56" ry="13" fill="#fff" opacity=".75"/><ellipse cx="806" cy="35" rx="30" ry="13" fill="#fff" opacity=".75"/>
<path d="M60 270 Q430 -130 800 270" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="3 9" stroke-linecap="round" opacity=".95"/><g font-size="17" font-weight="600" fill="#14263B" text-anchor="middle">${ARC}</g>
<g opacity="${day.toFixed(2)}"><circle cx="${f1(sx)}" cy="${f1(sy)}" r="70" fill="url(#sunGlow)"/><circle cx="${f1(sx)}" cy="${f1(sy)}" r="24" fill="#FFC21A" stroke="#fff" stroke-width="4"/></g>
<path d="M0 306 C120 276 220 286 330 302 S560 306 700 286 S820 276 860 286 V340 H0Z" fill="#A9D6C2" opacity=".7"/><path d="M0 322 C200 296 420 314 640 304 S800 310 860 304 V600 H0Z" fill="url(#lawn)"/><ellipse cx="360" cy="440" rx="300" ry="122" fill="#5FA777" opacity=".32"/><polygon points="${PATH}" fill="#E8E2D6"/></svg>`;
  o+=`<svg viewBox="0 0 860 600" width="100%" height="100%" style="position:absolute;inset:0" role="img" aria-label="${NAMES[s.roof]} roof house with ${n} solar panels and ${nB*5} kWh of battery">${DEFS}${H.before}`;
  order.forEach(i=>{const filled=i<n,next=i===n;const pop=s.pop&&s.pop.t==='p'&&s.pop.i===i?' pop':'';
    const f=filled?'url(#pv)':next?'rgba(255,196,40,.55)':'rgba(255,255,255,.45)';
    o+=`<polygon class="sp${pop}" data-act="slot" data-i="${i}" points="${H.pp(H.quads[i])}" fill="${f}" stroke="${filled?'#0B1830':'#fff'}" stroke-width="${filled?1:next?2.2:1.6}" ${filled?'':'stroke-dasharray="5 3"'} stroke-linejoin="round" style="cursor:pointer"><title>${filled?(i===n-1?'Panel '+(i+1)+'. Click to remove it':'Panel '+(i+1)+'. Click to keep only up to here'):'Add panels up to here'}</title></polygon>`;});
  H.quads.forEach((q,i)=>{if(i!==n)return;const c=q.map(p=>P(...p)).reduce((a,b)=>[a[0]+b[0]/4,a[1]+b[1]/4],[0,0]);
    o+=`<g style="pointer-events:none"><circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="13" fill="#FFC21A" stroke="#fff" stroke-width="3"/><path d="M${f1(c[0])} ${f1(c[1]-7)}v14M${f1(c[0]-7)} ${f1(c[1])}h14" stroke="#14263B" stroke-width="3" stroke-linecap="round"/></g>`;});
  // cabinet
  o+=`<polygon points="${pp([[9,2.2,0],[10,2.2,0],[10,2.2,2.3],[9,2.2,2.3]])}" fill="#CDD5DD"/><polygon points="${pp([[10,1,0],[10,2.2,0],[10,2.2,2.3],[10,1,2.3]])}" fill="#EEF3F7"/><polygon points="${pp([[9,1,2.3],[10,1,2.3],[10,2.2,2.3],[9,2.2,2.3]])}" fill="#FAFCFD"/>`;
  for(let j=0;j<4;j++){const z0=.2+j*.5,on=j<nB,pop=s.pop&&s.pop.t==='b'&&s.pop.i===j?' pop':'';
    o+=`<polygon class="sp${pop}" data-act="bslot" data-j="${j}" points="${pp([[10,1.15,z0],[10,2.05,z0],[10,2.05,z0+.4],[10,1.15,z0+.4]])}" fill="${on?'url(#bt)':'rgba(255,255,255,.35)'}" stroke="${on?'none':'#7B8794'}" stroke-width="1.5" stroke-dasharray="4 3" stroke-linejoin="round" style="cursor:pointer"><title>${on?(j===nB-1?'Battery module '+(j+1)+'. Click to remove it':'Battery module '+(j+1)+'. Click to keep only up to here'):'Add battery up to here'}</title></polygon>`;}
  const b=P(1.4,12.3,0);
  o+=`<g fill="#3E9E6A"><ellipse cx="${f1(b[0])}" cy="${f1(b[1]-8)}" rx="26" ry="15"/><ellipse cx="${f1(b[0]+24)}" cy="${f1(b[1]-1)}" rx="22" ry="13"/><ellipse cx="${f1(b[0]-22)}" cy="${f1(b[1]-1)}" rx="20" ry="12"/></g>`;
  const pb=P(2.5,15.2,0);o+=palm(pb[0],pb[1])+'</svg>';
  o+=`<div style="position:absolute;inset:0;background:#0B1B3A;opacity:${(0.58*(1-day2)).toFixed(2)};mix-blend-mode:multiply;pointer-events:none"></div>`;
  // beams + pills
  const an=ANCH[s.roof],kw=v=>(Math.round(v*10)/10).toFixed(1);
  const bs=`M${f1(sx)} ${f1(sy+22)} Q${f1((sx+an[0])/2+24)} ${f1((sy+an[1])/2-26)} ${an[0]} ${an[1]}`,bc=`M${an[0]} ${an[1]} Q${an[0]+90} ${an[1]-10} ${CAB[0]} ${CAB[1]}`;
  const sunOn=s.gen>0.05?day:0,cabOn=(s.charge>0.05||s.dis>0.05)&&nB>0;
  const pill=(tr,op,txt)=>`<g transform="${tr}" opacity="${op}"><rect x="-125" y="-21" width="250" height="40" rx="20" fill="#fff"/><text x="0" y="7">${txt}</text></g>`;
  o+=`<svg viewBox="0 0 860 600" width="100%" height="100%" style="position:absolute;inset:0;pointer-events:none" aria-hidden="true"><g fill="none" stroke-linecap="round"><g opacity="${sunOn}"><path d="${bs}" stroke="#FFD84D" stroke-width="14" opacity=".35"/><path d="${bs}" stroke="#FFB800" stroke-width="4" stroke-dasharray="1 11"/></g><g opacity="${cabOn?1:0}"><path d="${bc}" stroke="#34E0C8" stroke-width="12" opacity=".3"/><path d="${bc}" stroke="#12A28F" stroke-width="4" stroke-dasharray="1 11"/></g></g><g font-size="20" font-weight="800" text-anchor="middle" fill="#14263B" font-family="Figtree,system-ui,sans-serif">
${pill('translate('+f1((sx+an[0])/2+10)+' '+f1((sy+an[1])/2-30)+')',sunOn,kw(s.gen)+' kW from the sun')}${pill('translate(700 455)',cabOn?1:0,s.charge>0.05?kw(s.charge)+' kW charging':kw(s.dis)+' kW from battery')}${pill('translate(700 500)',(s.grid>0.05||s.exp>0.05)?1:0,s.grid>0.05?kw(s.grid)+' kW from the grid':kw(s.exp)+' kW to the grid')}</g></svg>`;
  return `<div class="scene">${o}</div>`;
}
function picker(cur){
  return ROOFS.map(r=>`<button type="button" class="rbtn${r===cur?' on':''}" data-act="roof" data-r="${r}" aria-pressed="${r===cur}"><svg viewBox="0 0 64 44" width="52" height="36" aria-hidden="true">${ICON[r]}</svg>${NAMES[r]}</button>`).join('');
}
window.Scene={scene,picker,CAPS,NAMES,NOTE,ROOFS};

})();
