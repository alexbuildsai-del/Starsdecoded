// The drawing code behind the chart part previews: the model chart (sky) and its helpers. Reference for builders, not shipped.
// Expects a global R = { sun: <render url>, ... } for the ten planet renders (web/src/lib/planet-renders.ts).
  const NAME={sun:"Sun",moon:"Moon",mercury:"Mercury",venus:"Venus",mars:"Mars",jupiter:"Jupiter",saturn:"Saturn",uranus:"Uranus",neptune:"Neptune",pluto:"Pluto",chiron:"Chiron",north_node:"North Node",south_node:"South Node"};
  const DOES={sun:"what you want your life to be about",moon:"what you need to feel safe",mercury:"how you think and talk",venus:"how you love and get on",mars:"how you act",jupiter:"growth and help",saturn:"rules and patience",uranus:"change and doing it your way",neptune:"hopes and dreams",pluto:"deep, all-in feeling",chiron:"an old sore spot that teaches",north_node:"where you grow",south_node:"what comes easy from before"};
  const PT={chiron:"⚷",north_node:"☊",south_node:"☋"};
  const HW=["","self","money","mind","home","play","work","partnership","depth","belief","career","friends","solitude"];
  const COVERS=["","your body and how you come across","money and the things you own","talking, learning, brothers and sisters","home, family, your roots","fun, making things, love, children","daily work, habits, health","partners and the people you face one to one","what you share, what's passed down","long trips, big ideas, what you believe","your work and what you're known for","friends, groups, shared hopes","rest, time alone, what goes on out of sight"];
  const SIGNS=["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
  const COL={flow:"#3FA796",touch:"#D4B06A",rub:"#D9668A"},TAG={flow:"Comes naturally",touch:"Comes naturally",rub:"Challenge"},TAGCOL={flow:"#3FA796",touch:"#3FA796",rub:"#D9668A"};
  // Whose planet: one ink, the site's paper, solid for the chart's own planet and dashed for the guest. No owner colours.
  const ASPW={together:"conjunct",sextile:"sextile",square:"square",trine:"trine",opposition:"opposite"};
  // The landing wheel's own colours (index.css tokens): brass, chart-4, destructive, foreground, background.
  const BRASS="#D4B06A",C4="#3BB3DB",DES="#E24D4D",FG="#E8EBF2",BG="#0D1117";
  const YOU="#E8EBF2",THEM="#E8EBF2";
  // Inside the product the frame is the site's muted grey-blue (--muted-foreground); brass is kept for what is lit.
  const MUT="#7E889A",MUTXT="#A3ABBC";
  const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ord=n=>n+(n===1?"st":n===2?"nd":n===3?"rd":"th");
  const dm=l=>{const d=l%30;let m=Math.round((d%1)*60),g=Math.floor(d);if(m===60){g++;m=0;}return g+"°"+String(m).padStart(2,"0")+"′";};
  const n360=d=>((d%360)+360)%360;
  const ns="http://www.w3.org/2000/svg";let uid=0;
  const el=(t,a,p)=>{const e=document.createElementNS(ns,t);for(const k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e;};
  const txt=(p,x,y,s,a)=>{const e=el("text",Object.assign({x,y,"text-anchor":"middle","font-family":"Space Grotesk"},a),p);e.textContent=s;return e;};
  // Engine output, whole sign. [longitude, house, going backwards]
  const TH={asc:96.61,mc:333.38,p:{sun:[57.32,11],mercury:[59.95,11],venus:[14.12,10],mars:[130.14,2],jupiter:[185.04,4,1],saturn:[329.9,8],uranus:[291.99,7,1],neptune:[290.98,7,1],pluto:[234.05,5,1],moon:[19.41,10],chiron:[138.05,2],north_node:[253.15,6,1],south_node:[73.15,12,1]}};
  const A={asc:311.14,mc:248.6,p:{sun:[136.44,7],moon:[94.91,6],mercury:[142.47,7],venus:[91.5,6],mars:[9.32,3],jupiter:[62.75,5],saturn:[266.3,11,1],uranus:[267.35,11,1],neptune:[277.85,12,1],pluto:[219.87,10],chiron:[94.26,6],north_node:[345.47,2,1],south_node:[165.47,8,1]}};
  const B={asc:79.38,mc:313.73,p:{sun:[302.75,9],moon:[220.18,6],mercury:[291.11,8],venus:[349.33,10],mars:[113.69,2,1],jupiter:[71.56,1,1],saturn:[346.43,10],uranus:[53.29,12,1],neptune:[357.72,10],pluto:[301.75,9],chiron:[19.26,11],north_node:[0.36,11,1],south_node:[180.36,5,1]}};

  // The landing page's wheel (HorizonWheel.tsx), copied for the mock: wheelRadii, framed on the Ascendant, rim text on arcs.
  function pa(cx,cy,r,a){a=a*Math.PI/180;return[cx+r*Math.cos(a),cy-r*Math.sin(a)];}
  function arcPath(cx,cy,r,a0,a1){const[x0,y0]=pa(cx,cy,r,a0),[x1,y1]=pa(cx,cy,r,a1);return`M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${Math.abs(a1-a0)>180?1:0} 0 ${x1.toFixed(2)} ${y1.toFixed(2)}`;}
  function arcLabel(cx,cy,r,a0,a1){const mid=n360((a0+a1)/2);if(Math.sin(mid*Math.PI/180)<0)return arcPath(cx,cy,r,a0,a1);const[x0,y0]=pa(cx,cy,r,a1),[x1,y1]=pa(cx,cy,r,a0);return`M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;}
  function wedge(cx,cy,ro,ri,a0,a1){const[o0x,o0y]=pa(cx,cy,ro,a0),[o1x,o1y]=pa(cx,cy,ro,a1),[i1x,i1y]=pa(cx,cy,ri,a1),[i0x,i0y]=pa(cx,cy,ri,a0);return`M${o0x} ${o0y} A${ro} ${ro} 0 0 0 ${o1x} ${o1y} L${i1x} ${i1y} A${ri} ${ri} 0 0 1 ${i0x} ${i0y} Z`;}
  // The engine's own list (calcAspects): the ten planets in its order, its orbs, weighted by closeness, dashed when separating.
  const ORBS={conjunction:8,opposition:8,square:6,trine:6,sextile:4},MAIN=["sun","moon","mercury","venus","mars","jupiter","saturn","uranus","neptune","pluto"];
  function aspectsOf(c,keys){const out=[],AS=[[0,"conjunction"],[180,"opposition"],[90,"square"],[120,"trine"],[60,"sextile"]];const ks=MAIN.filter(k=>keys.includes(k));
    for(let i=0;i<ks.length;i++)for(let j=i+1;j<ks.length;j++){const l1=c.p[ks[i]][0],l2=c.p[ks[j]][0];let d=Math.abs(l1-l2)%360;d=Math.min(d,360-d);
      for(const[a,t]of AS){const orb=Math.abs(d-a);if(orb<=ORBS[t])out.push([ks[i],ks[j],t,orb,l1<l2]);}}return out;}
  const ASP={conjunction:BRASS,sextile:C4,trine:C4,square:DES,opposition:DES};

  // The one chart. Every state below only switches layers on or off, dims, rings or lights; the radii never change.
  function sky(svg,c,cx,cy,S,o){
    o=o||{};const id="w"+(uid++);const RIM=o.landing?BRASS:MUT,RT=o.landing?BRASS:MUTXT;
    const R={so:S*.478,si:S*.386,bs:S*.4535,bh:S*.411,tk:S*.38,as:S*.146,lanes:[S*.324,S*.266,S*.208],node:S*.05*(o.nodeK||1)};
    const asc=c.asc==null?0:c.asc;const th=l=>180+n360(l-asc);const first=Math.floor(n360(asc)/30);
    const root=el("g",{},svg),turn=el("g",{},root);
    const L={};["signs","signText","houses","houseText","circles","ticks"].forEach(k=>L[k]=el("g",{"data-layer":k},turn));
    const hl={},houseText={},signs={};
    for(let i=0;i<12;i++){const a0=th(i*30),a1=a0+30,h=((i-first+12)%12)+1;
      signs[i]=el("path",{d:wedge(cx,cy,R.so,R.si,a0,a1),fill:RIM,"fill-opacity":h%2?.05:.085,stroke:RIM,"stroke-opacity":.3},L.signs);
      if(o.labels!==false){el("path",{id:id+"s"+i,d:arcLabel(cx,cy,R.bs,a0+1.5,a1-1.5),fill:"none"},L.signText);const t=el("text",{"font-family":"Space Grotesk","font-size":S*.0225,"letter-spacing":S*.0023,fill:RT,"dominant-baseline":"middle"},L.signText);const tp=el("textPath",{href:"#"+id+"s"+i,startOffset:"50%","text-anchor":"middle"},t);tp.textContent=SIGNS[i].toUpperCase();}}
    if(o.houses!==false&&c.asc!=null)for(let h=1;h<=12;h++){const a0=th((first+h-1)*30),a1=a0+30;
      hl[h]=el("path",{d:wedge(cx,cy,R.tk,R.as,a0,a1),fill:"#fff","fill-opacity":h%2?.012:.026},L.houses);
      if(o.labels!==false){el("path",{id:id+"h"+h,d:arcLabel(cx,cy,R.bh,a0+1.5,a1-1.5),fill:"none"},L.houseText);const t=el("text",{"font-family":"Space Grotesk","font-size":S*.019,"letter-spacing":S*.002,fill:FG,"fill-opacity":.55,"dominant-baseline":"middle"},L.houseText);const tp=el("textPath",{href:"#"+id+"h"+h,startOffset:"50%","text-anchor":"middle"},t);tp.textContent=h+" · "+HW[h].toUpperCase();houseText[h]=t;}}
    el("circle",{cx,cy,r:R.si,fill:"none",stroke:RIM,"stroke-opacity":.28},L.circles);
    el("circle",{cx,cy,r:R.as,fill:"none",stroke:RIM,"stroke-opacity":.2},L.circles);
    if(o.ticks!==false)for(let d=0;d<360;d+=5){const a=th(d);const[x0,y0]=pa(cx,cy,R.tk,a),[x1,y1]=pa(cx,cy,R.tk-(d%30===0?S*.02:S*.008),a);el("line",{x1:x0,y1:y0,x2:x1,y2:y1,stroke:RIM,"stroke-opacity":d%30===0?.42:.16},L.ticks);}
    const keys=Object.keys(c.p).filter(k=>!o.only||o.only.includes(k));
    const asp=el("g",{"data-layer":"aspects"},root);L.aspects=asp;const lines=[];
    if(o.aspects)(c.aspects?c.aspects.filter(([a,b])=>keys.includes(a)&&keys.includes(b)).map(x=>x.slice()):aspectsOf(c,keys.filter(k=>!k.includes("node")&&k!=="chiron"))).sort((x,y)=>x[3]/ORBS[x[2]]-y[3]/ORBS[y[2]]).forEach(([a,b,t,orb,ap])=>{const[x1,y1]=pa(cx,cy,R.as,th(c.p[a][0])),[x2,y2]=pa(cx,cy,R.as,th(c.p[b][0]));const s=1-orb/ORBS[t];const Ln=el("line",{x1,y1,x2,y2,stroke:ASP[t],"stroke-width":(.6+1.2*s)*S/600,"stroke-opacity":.18+.42*s,"stroke-linecap":"round"},asp);if(!ap)Ln.setAttribute("stroke-dasharray",(3*S/600)+" "+(4*S/600));lines.push({a,b,t,orb,el:Ln});});
    L.horizon=el("g",{"data-layer":"horizon"},root);L.rising=el("g",{"data-layer":"rising"},root);
    if(o.axes!==false&&c.asc!=null){const mc=th(c.mc);const Ls=o.mc?[[180,1],[0,0],[mc,1],[mc+180,0]]:[[180,1],[0,0]];Ls.forEach(([a,maj])=>{const[x0,y0]=pa(cx,cy,R.as,a),[x1,y1]=pa(cx,cy,R.si+S*.012,a);el("line",{x1:x0,y1:y0,x2:x1,y2:y1,stroke:o.landing?BRASS:FG,"stroke-width":(maj?1.5:1)*S/600,"stroke-opacity":o.landing?(maj?.72:.4):(maj?.45:.25)},L.horizon);});}
    if(o.asc!==false&&c.asc!=null){const AC=o.landing?BRASS:FG;const[mx,my]=pa(cx,cy,R.so,180),r=Math.max(3,S*.0142);el("circle",{cx:mx,cy:my,r,fill:BG,stroke:AC,"stroke-width":Math.max(1.2,S*.003)},L.rising);el("circle",{cx:mx,cy:my,r:r*.35,fill:AC},L.rising);el("line",{x1:mx-r,y1:my,x2:mx-r-S*.02,y2:my,stroke:AC,"stroke-width":Math.max(1.2,S*.003),"stroke-linecap":"round"},L.rising);}
    // lanes: the true degree never moves, only the radius (assignLanes)
    const pos={},bodies={},lane={},last=R.lanes.map(()=>-1e9);L.planets=el("g",{"data-layer":"planets"},root);
    keys.map(k=>({k,t:th(c.p[k][0])})).sort((a,b)=>a.t-b.t).forEach(({k,t})=>{let ln=0;for(;ln<3;ln++){const need=((R.node+S*.01)/R.lanes[ln])*(180/Math.PI);if(t-last[ln]>=need)break;}if(ln===3)ln=0;last[ln]=t;lane[k]=ln;
      const[x,y]=pa(cx,cy,R.lanes[ln],t);pos[k]=[x,y];const g=el("g",{"data-k":k},L.planets);bodies[k]=g;
      const tt=el("title",{},g);tt.textContent=NAME[k]+" · "+dm(c.p[k][0])+" "+SIGNS[Math.floor(c.p[k][0]/30)]+(c.p[k][1]?" · "+ord(c.p[k][1])+" ("+HW[c.p[k][1]]+")":"")+(c.p[k][2]?" · going backwards":"");
      const sz=R.node;el("circle",{cx:x,cy:y,r:R.node*(k==="sun"?.48:.62),fill:BG,"fill-opacity":.92},g);
      if(R_[k])el("image",{href:R_[k],x:x-sz/2,y:y-sz/2,width:sz,height:sz},g);else{el("circle",{cx:x,cy:y,r:sz*.42,fill:"#0b0f16",stroke:MUT,"stroke-width":.8},g);txt(g,x,y+sz*.17,PT[k],{"font-size":sz*.5,fill:MUTXT,"font-family":"serif"});}
      if(c.p[k][2]&&o.r!==false)txt(g,x+R.node*.46,y-R.node*.32,"R",{"font-family":"IBM Plex Mono","font-size":S*.019,fill:DES,"text-anchor":"start"});});
    function dim(keep,op){for(const k in bodies)bodies[k].setAttribute("opacity",keep.includes(k)?1:op);}
    function ring(k,col){const[x,y]=pos[k];return el("circle",{cx:x,cy:y,r:R.node*.72,fill:"none",stroke:col,"stroke-width":Math.max(1.5,S*.005)},root);}
    return {root,turn,asp,lines,pos,bodies,lane,hl,houseText,signs,L,th,R,cx,cy,S,dim,ring,first};
  }
  const R_=R;
  const lightHouse=(w,h,col,op)=>{for(const k in w.hl){w.hl[k].setAttribute("fill",+k===h?col:"#fff");w.hl[k].setAttribute("fill-opacity",+k===h?op:(k%2?.012:.026));}};
  // The link line in the ledger's style: teal straight, brass for together, the rose zigzag for a challenge.
  function linkLine(g,x0,y0,x1,y1,kind,w){const col=COL[kind];
    if(kind==="rub"){const n=10,dx=(x1-x0)/n,dy=(y1-y0)/n,len=Math.hypot(x1-x0,y1-y0)||1,nx=-(y1-y0)/len*4,ny=(x1-x0)/len*4;let p="M"+x0+" "+y0;for(let k=1;k<n;k++){const s=k%2?1:-1;p+=" L"+(x0+dx*k+nx*s).toFixed(1)+" "+(y0+dy*k+ny*s).toFixed(1);}p+=" L"+x1+" "+y1;return el("path",{d:p,fill:"none",stroke:col,"stroke-width":w||2,"stroke-linejoin":"round"},g);}
    return el("line",{x1:x0,y1:y0,x2:x1,y2:y1,stroke:col,"stroke-width":w||2.2,"stroke-linecap":"round"},g);}

  // How two planets meet: kept as v4 (the Owner's model visual).
  function angleDial(svg,cx,cy,r,a,b,la,lb,kind,label,bodyR){
    const g=el("g",{},svg);el("circle",{cx,cy,r,fill:"#0B0F16",stroke:"#2c3446"},g);
    let d=((lb-la)%360+360)%360;if(d>180)d-=360;const th0=-Math.PI/2,th1=th0-d*Math.PI/180;
    const p0=[cx+r*Math.cos(th0),cy+r*Math.sin(th0)],p1=[cx+r*Math.cos(th1),cy+r*Math.sin(th1)];
    const ar=r*.42,q0=[cx+ar*Math.cos(th0),cy+ar*Math.sin(th0)],q1=[cx+ar*Math.cos(th1),cy+ar*Math.sin(th1)];
    if(Math.abs(d)>3)el("path",{d:`M${q0[0]} ${q0[1]} A${ar} ${ar} 0 0 ${d>0?0:1} ${q1[0]} ${q1[1]}`,fill:"none",stroke:MUTXT,"stroke-width":1},g);
    el("line",{x1:cx,y1:cy,x2:p0[0],y2:p0[1],stroke:"#2c3446"},g);el("line",{x1:cx,y1:cy,x2:p1[0],y2:p1[1],stroke:"#2c3446"},g);
    if(kind!=="touch")linkLine(g,p0[0],p0[1],p1[0],p1[1],kind);
    const br=bodyR||r*.2;const mark=(k,x,y,col,dash)=>{if(k&&R[k])el("image",{href:R[k],x:x-br,y:y-br,width:2*br,height:2*br},g);else el("circle",{cx:x,cy:y,r:5,fill:col},g);const o=el("circle",{cx:x,cy:y,r:br+3.5,fill:"none",stroke:col,"stroke-width":1.6},g);if(dash)o.setAttribute("stroke-dasharray","3 3");};
    mark(a,p0[0],p0[1],YOU);mark(b,p1[0]+(kind==="touch"?br*1.6:0),p1[1],THEM,true);
    if(label)txt(g,cx,cy+r*.15,label,{"font-size":r*.2,fill:MUTXT,"font-family":"IBM Plex Mono"});return g;}
  const SPEED=["sun","moon","venus","mars","mercury","jupiter","saturn"];
  const GROUP={moon:"Feelings and comfort",mercury:"Talking",venus:"Affection",sun:"Who you are",mars:"Drive and friction",jupiter:"Growing",saturn:"Limits and staying power",outer:"The times you were born into"};
  const LINKS=[
    {a:"pluto",b:"moon",type:"together",kind:"touch",orb:0.3,title:"Your deep feelings and Athena's need for comfort",
     text:"Athena's Moon (6th, work) is what she needs to feel safe, and the 6th is daily routine: feeds, naps, the bath. Your Pluto (10th, career), the planet of deep, all-in feeling, sits on the very same spot. So when she's upset, you feel it hard and fast. A calm, steady voice at nap time may help her more than a big rescue.",
     try:"When she cries at nap time, take one slow breath before you pick her up."},
    {a:"jupiter",b:"sun",type:"trine",kind:"flow",orb:0.0,title:"Your encouragement and who Athena is becoming",
     text:"Athena's Sun (9th, belief) is who she's becoming, someone drawn to wide horizons. Your Jupiter (5th, play) is growth and encouragement. A trine is the easiest angle. Play is where you cheer her on best: new sounds, new places, new faces.",
     try:"Give her one new thing to explore each week: a sound, a texture, a park."},
    {a:"mercury",b:"uranus",type:"square",kind:"rub",orb:0.8,title:"Your plans and Athena's surprises",
     text:"Your Mercury (7th, partnership) is how you think and talk, and you plan out loud. Athena's Uranus (12th, solitude) is her hidden urge to do things her own way. A square is a sharp angle. When you set a plan for the day, she may upset it without warning. That's her, not your plan failing.",
     try:"Keep one part of the day loose, with nothing planned."},
    {a:"jupiter",b:"pluto",type:"trine",kind:"flow",orb:1.0,title:"Your cheering and Athena's strong will",
     text:"Athena's Pluto (9th, belief) is her deep, all-or-nothing drive. Your Jupiter (5th, play) is encouragement. When she wants something with her whole body, like the toy across the room, your cheering helps her keep at it.",
     try:"Next time she strains for something, cheer once and let her get there."},
    {a:"saturn",b:"neptune",type:"square",kind:"rub",orb:1.4,title:"Your rules and Athena's drifting",
     text:"Your Saturn (11th, friends) is rules and limits. Athena's Neptune (10th, career) is her dreamy, hard-to-pin-down side. A square pushes them against each other. Short, kind and repeated works better than strict.",
     try:"Say the same short rule, in the same words, three days in a row."},
    {a:"mars",b:"jupiter",type:"sextile",kind:"flow",orb:2.2,title:"Your get-up-and-go and Athena's appetite to grow",
     text:"Your Mars (3rd, mind) is your energy for talk and short trips. Athena's Jupiter (1st, self) is her appetite to grow. Short walks with you chattering about what you see feed her curiosity.",
     try:"Name three things you see on your next walk with her."},
    {a:"neptune",b:"moon",type:"sextile",kind:"flow",orb:2.3,title:"Your softness and Athena's need for comfort",
     text:"Your Neptune (12th, solitude) is soft, quiet care. Athena's Moon (6th, work) is her need for a safe routine. A sextile is an easy angle. Dim light, the same song, the same order at bedtime may settle her well.",
     try:"Pick one bedtime song and keep it for a month."},
    {a:"venus",b:"neptune",type:"square",kind:"rub",orb:3.8,title:"Your way of loving and Athena's dreamy side",
     text:"Your Venus (6th, work) shows love by doing: washing, tidying, feeding. Athena's Neptune (10th, career) is her dreamy, far-away side. A square is a sharp angle, so they rub. You may rush to the next task while she drifts into her own world. Both are fine.",
     try:"Before the next nappy change, sit with her for one quiet minute."}];
  const groupOf=l=>{const i=Math.min(...[l.a,l.b].map(k=>{const j=SPEED.indexOf(k);return j<0?99:j;}));return i===99?"outer":SPEED[i];};
  const GROUPS=[...SPEED,"outer"].map(g=>({g,t:GROUP[g],items:LINKS.filter(l=>groupOf(l)===g).sort((x,y)=>x.orb-y.orb)})).filter(x=>x.items.length);

  // The link on one person's own chart: their planet lit and ringed, the other's planet a faint guest at its true degree,
  // the angle drawn across the inner circle where the chart draws its aspects, and the degrees at the centre.
  const SIDES={trine:3,square:4,sextile:6,opposition:2},SHAPE={together:"the same spot",sextile:"one side of a hexagon",square:"one side of a square",trine:"one side of a triangle",opposition:"straight across"};
  function linkOnChart(w,c,own,other,otherLon,kind,ownCol,otherCol,deg,type){
    const g=el("g",{},w.root);const S=w.S;
    w.dim([own],.14);w.ring(own,ownCol);
    const tO=w.th(c.p[own][0]),tG=w.th(otherLon);
    const[gx,gy]=pa(w.cx,w.cy,w.R.lanes[0],tG);const nr=w.R.node/2;
    el("circle",{cx:gx,cy:gy,r:nr*1.2,fill:BG},g);el("image",{href:R[other],x:gx-nr,y:gy-nr,width:2*nr,height:2*nr,opacity:.55},g);
    el("circle",{cx:gx,cy:gy,r:nr*1.45,fill:"none",stroke:otherCol,"stroke-width":Math.max(1.3,S*.004),"stroke-dasharray":"3 3"},g);
    const[ox,oy]=w.pos[own];const[a0x,a0y]=pa(w.cx,w.cy,w.R.as,tO),[a1x,a1y]=pa(w.cx,w.cy,w.R.as,tG);
    el("line",{x1:ox,y1:oy,x2:a0x,y2:a0y,stroke:ownCol,"stroke-opacity":.5},g);el("line",{x1:gx,y1:gy,x2:a1x,y2:a1y,stroke:otherCol,"stroke-opacity":.5,"stroke-dasharray":"2 3"},g);
    const n=SIDES[type];if(n>2){const dir=n360(tG-tO)>180?-1:1;let d_="";for(let k=0;k<=n;k++){const[x,y]=pa(w.cx,w.cy,w.R.as,tO+dir*k*360/n);d_+=(k?"L":"M")+x.toFixed(1)+" "+y.toFixed(1)+" ";}el("path",{d:d_,fill:COL[kind],"fill-opacity":.06,stroke:COL[kind],"stroke-opacity":.38,"stroke-width":Math.max(1,S*.0035),"stroke-linejoin":"round"},g);}
    if(kind!=="touch")linkLine(g,a0x,a0y,a1x,a1y,kind,Math.max(1.6,S*.007));
    else el("circle",{cx:a0x,cy:a0y,r:Math.max(3,S*.012),fill:BRASS},g);
    let d=n360(tG-tO);const sweep=d>180?1:0;const ar=w.R.as*.45;const[q0x,q0y]=pa(w.cx,w.cy,ar,tO),[q1x,q1y]=pa(w.cx,w.cy,ar,tG);
    if(kind!=="touch")el("path",{d:`M${q0x} ${q0y} A${ar} ${ar} 0 0 ${sweep} ${q1x} ${q1y}`,fill:"none",stroke:MUTXT,"stroke-width":1},g);
    txt(g,w.cx,w.cy+S*.012,deg,{"font-family":"IBM Plex Mono","font-size":Math.max(8,S*.034),fill:MUTXT});
  }  // The engine's own aspect list for Thibault (calculateNatalChart(...).aspects): pair, type, orb, closing in.
  TH.aspects=[["sun","mercury","conjunction",2.6,1],["sun","saturn","square",2.6,1],["sun","uranus","trine",5.3,1],["sun","pluto","opposition",3.3,1],["moon","venus","conjunction",5.3,0],["moon","uranus","square",2.6,1],["moon","neptune","square",1.6,1],["mercury","jupiter","trine",5.1,1],["mercury","saturn","square",0.1,1],["mercury","pluto","opposition",5.9,1],["venus","mars","trine",4,1],["saturn","pluto","square",5.8,0],["uranus","neptune","conjunction",1,0],["uranus","pluto","sextile",2.1,0],["neptune","pluto","sextile",3.1,0]];
  // Thibault with no birth time: the engine at 12:00 with a 720-minute window. No rising sign, no houses; the Moon is a stretch.
  const UN={asc:null,mc:null,p:{sun:[57.47],mercury:[60.28],venus:[14.22],mars:[130.22],jupiter:[185.04,0,1],saturn:[329.9],uranus:[291.99,0,1],neptune:[290.98,0,1],pluto:[234.04,0,1],moon:[21.26],chiron:[138.06],north_node:[253.14,0,1],south_node:[73.14,0,1]},band:[15.23,27.31]};
  // The sky over London on 9 October 2026 at 13:00 local (skyAt, placeForZone("Europe/London")).
  const NOW={asc:257.16,mc:199.49,p:{sun:[196.21,11],mercury:[221.06,12],venus:[217.73,12,1],mars:[126.57,9],jupiter:[141.06,9],saturn:[10.91,5,1],uranus:[65.36,7,1],neptune:[2.63,5,1],pluto:[303.08,3,1],moon:[182.12,11],chiron:[29.12,5,1],north_node:[327.26,3,1],south_node:[147.26,9,1]}};
  // comfort.ts COMFORT, as the engine holds it.
  const COMFORT={sun:[["Leo"],["Aquarius"]],moon:[["Cancer"],["Capricorn"]],mercury:[["Gemini","Virgo"],["Sagittarius","Pisces"]],venus:[["Taurus","Libra"],["Scorpio","Aries"]],mars:[["Aries","Scorpio"],["Libra","Taurus"]],jupiter:[["Sagittarius","Pisces"],["Gemini","Virgo"]],saturn:[["Capricorn","Aquarius"],["Cancer","Leo"]]};
  const easeO=x=>1-Math.pow(1-x,3),easeIO=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
  const kOf=(t,a,b)=>Math.max(0,Math.min(1,(t-a)/(b-a)));
  function svgIn(host,w,h,label){const s=el("svg",{viewBox:"0 0 "+w+" "+h,role:"img","aria-label":label||""});host.appendChild(s);return s;}
  // The same drawing at the phone size and the desktop size, side by side. draw(svg,S,phone) may return a frame(t).
  const SIZE={ph:358,dt:560};
  function both(host,label,draw,o){o=o||{};host.classList.add("both");const fr=[];
    [["ph","Phone · 390 wide",o.ph||SIZE.ph],["dt","Desktop",o.dt||SIZE.dt]].forEach(([k,cap,S])=>{const f=document.createElement("figure");f.className="dev "+k;
      const W=o.w?o.w(S):S,H=o.h?o.h(S):S;const s=svgIn(f,W,H,label+" ("+cap.toLowerCase()+")");if(o.actual){s.style.width=W+"px";s.style.maxWidth="100%";}const fc=document.createElement("figcaption");fc.innerHTML=cap+' <span class="mono">· chart '+Math.round(o.chart?o.chart(S):S)+' px</span>';f.appendChild(fc);host.appendChild(f);
      const fn=draw(s,S,k==="ph");if(fn)fr.push(fn);});
    return t=>fr.forEach(f=>f(t));}
  // Loops run only on screen; with reduced motion each shows its last frame and stays still.
  const LOOPS=[];
  function loop(host,T,frame,o){o=o||{};const L={host,T,frame,t0:null,once:!!o.once,done:false};LOOPS.push(L);
    if(o.button!==false){const b=document.createElement("button");b.className="replay";b.type="button";b.textContent=o.once?"Play again":"Restart";b.onclick=()=>{L.t0=null;L.done=false;};host.appendChild(b);}
    frame(reduce||L.once?T:0);return L;}
  addEventListener("load",()=>{if(reduce)return;const live=new Set();
    const io=new IntersectionObserver(es=>es.forEach(e=>{LOOPS.filter(L=>L.host===e.target).forEach(L=>e.isIntersecting?live.add(L):live.delete(L));}),{threshold:.15});
    LOOPS.forEach(L=>io.observe(L.host));
    (function tick(now){live.forEach(L=>{if(L.done)return;if(L.t0===null)L.t0=now;let t=(now-L.t0)/1000;if(L.once&&t>=L.T){t=L.T;L.done=true;}else t=t%L.T;L.frame(t);});requestAnimationFrame(tick);})(0);});
  // The Moon's stretch when there is no birth time: the arc it could be on that day, on its own lane.
  function moonBand(w,c,col){const ln=w.R.lanes[w.lane.moon];const[a,b]=c.band;
    return el("path",{d:arcPath(w.cx,w.cy,ln,w.th(a),w.th(b)),fill:"none",stroke:col||MUTXT,"stroke-width":w.R.node*.95,"stroke-opacity":.22,"stroke-linecap":"round"},w.L.planets.parentNode.insertBefore(el("g",{}),w.L.planets));}
  // The build, in the order the loading story draws it. P holds each phase's [start,end] in seconds.
  const BUILD={signs:[0,1.2],names:[1.1,1.7],ticks:[1.5,2.2],planets:[2.2,4.2],lines:[4.2,5.4],turn:[5.6,7.4],horizon:[7.4,8.1],houses:[8.2,11.2],end:12.5};
  function build(svg,c,cx,cy,S,P,o){o=o||{};P=P||BUILD;const timed=c.asc!=null&&!o.untimed;
    const U=sky(svg,{asc:null,mc:null,p:c.p,aspects:c.aspects},cx,cy,S,{aspects:o.aspects!==false,labels:o.labels,ticks:o.ticks});
    const T=timed?sky(svg,c,cx,cy,S,{aspects:o.aspects!==false,labels:o.labels,ticks:o.ticks}):null;
    const band=!timed&&c.band?moonBand(U,c):null;
    const fin={};for(const k in U.pos)fin[k]=U.pos[k];
    const keys=Object.keys(c.p).sort((a,b)=>c.p[a][0]-c.p[b][0]);
    return function(t){
      for(let i=0;i<12;i++)U.signs[i].setAttribute("opacity",kOf(t,P.signs[0]+i*(P.signs[1]-P.signs[0])/12*.8,P.signs[0]+(i+2.4)*(P.signs[1]-P.signs[0])/12*.8));
      U.L.signText.setAttribute("opacity",kOf(t,...P.names));U.L.circles.setAttribute("opacity",kOf(t,...P.names));
      U.L.ticks.setAttribute("opacity",kOf(t,...P.ticks));
      const turnK=timed?easeIO(kOf(t,...P.turn)):0,A=turnK*c.asc;
      keys.forEach((k,i)=>{const d=(P.planets[1]-P.planets[0]),k0=P.planets[0]+i*d*.035,kk=easeO(kOf(t,k0,k0+d*.6));
        const lon=c.p[k][0]*kk,[x,y]=pa(cx,cy,U.R.lanes[U.lane[k]],U.th(lon)),[fx,fy]=fin[k];
        U.bodies[k].setAttribute("transform","translate("+(x-fx)+" "+(y-fy)+") rotate("+(-A)+" "+fx+" "+fy+")");U.bodies[k].setAttribute("opacity",kk>0?Math.min(1,kk*4):0);});
      U.lines.forEach((l,i)=>{const d=P.lines[1]-P.lines[0],a=P.lines[0]+i*d/Math.max(1,U.lines.length)*.7;l.el.setAttribute("opacity",kOf(t,a,a+d*.3));});
      if(band){const k=easeO(kOf(t,...(P.band||P.turn)));band.setAttribute("opacity",k);}
      U.root.setAttribute("transform","rotate("+A+" "+cx+" "+cy+")");
      if(!T)return;
      const x=kOf(t,P.turn[1]-.05,P.turn[1]+.35);U.root.setAttribute("opacity",1-x);T.root.setAttribute("opacity",x);
      const hz=kOf(t,...P.horizon);T.L.horizon.setAttribute("opacity",hz);
      T.L.rising.setAttribute("opacity",hz);T.L.rising.setAttribute("transform","translate(0 "+(-(1-easeO(hz))*S*.03)+")");
      const nH=o.single?12:6,d=(P.houses[1]-P.houses[0])/nH;
      for(let h=1;h<=12;h++){const j=(h-1)%nH,a=P.houses[0]+j*d,k=kOf(t,a,a+d*1.6);
        if(T.houseText[h])T.houseText[h].setAttribute("opacity",t>=a?1:0);
        const on=t>=a&&k<1;T.hl[h].setAttribute("fill",on?BRASS:"#fff");T.hl[h].setAttribute("fill-opacity",on?.22*(1-k):(h%2?.012:.026));}};}
  // A numbered pointer: a small brass-free dot and number set outside the chart, a hairline to the part.
  function callout(svg,n,x0,y0,x1,y1,side){el("line",{x1:x0,y1:y0,x2:x1,y2:y1,stroke:MUTXT,"stroke-opacity":.6,"stroke-width":.8},svg);el("circle",{cx:x0,cy:y0,r:2,fill:MUTXT},svg);
    const g=el("g",{},svg);el("circle",{cx:x1,cy:y1,r:9,fill:"#1a2130",stroke:MUTXT,"stroke-opacity":.5},g);txt(g,x1,y1+3.6,String(n),{"font-size":10.5,fill:FG,"font-family":"IBM Plex Mono"});}
  // The teaching loops. Each one: a stage element, a caption element, the chart in both sizes.
  const TEACH={
  count(stage,cap){const f=both(stage.querySelector(".fig"),"The sky turns and the houses count",(svg,S)=>{const c=S/2,w=sky(svg,TH,c,c,S*.96,{only:[]});
      return t=>{const k=t/8;const turn=k<.3?(1-easeO(k/.3))*-150:0;w.turn.setAttribute("transform","rotate("+turn+" "+c+" "+c+")");
        const shown=k<.34?0:Math.min(12,Math.floor((k-.34)/.045)+1);
        for(let h=1;h<=12;h++){const t_=w.houseText[h];t_.setAttribute("fill",h===1&&shown?BRASS:FG);t_.setAttribute("fill-opacity",h<=shown?(h===1?1:.85):.12);}
        if(shown)lightHouse(w,1,BRASS,.14);else lightHouse(w,0);};});
    loop(stage,8,t=>{f(t);const k=t/8,shown=k<.34?0:Math.min(12,Math.floor((k-.34)/.045)+1);
      cap.textContent=k<.3?"The sky turns…":shown<12?"Cancer was rising for Thibault, so Cancer is his 1st house. Leo is his 2nd, Virgo his 3rd…":"Twelve signs, twelve houses, counted from his rising sign.";});},
  each(stage,cap){const f=both(stage.querySelector(".fig"),"Each house lit in turn",(svg,S)=>{const c=S/2,w=sky(svg,TH,c,c,S*.96,{only:[],axes:false});
      const mid=txt(svg,c,c-S*.005,"",{"font-size":S*.07,fill:FG,"font-family":"Newsreader, Georgia, serif"}),sub=txt(svg,c,c+S*.06,"",{"font-size":S*.033,fill:MUTXT,"letter-spacing":".12em"});
      return t=>{const h=Math.floor(t/1.5)%12+1;lightHouse(w,h,BRASS,.22);for(let j=1;j<=12;j++)w.houseText[j].setAttribute("fill-opacity",j===h?1:.3);mid.textContent=HW[h];sub.textContent=ord(h).toUpperCase()+" HOUSE";};});
    loop(stage,18,t=>{f(t);const h=Math.floor(t/1.5)%12+1;cap.textContent="The "+ord(h)+" ("+HW[h]+"): "+COVERS[h]+".";});},
  charge(stage,cap){const ex=[[7,"saturn"],[4,"venus"],[2,"sun"]];
    const f=both(stage.querySelector(".fig"),"The planet in charge of a house",(svg,S)=>{const c=S/2,w=sky(svg,TH,c,c,S*.96,{only:["saturn","venus","sun"],axes:false,nodeK:1.25});
      const path=el("path",{fill:"none",stroke:BRASS,"stroke-width":Math.max(1.4,S*.004),"stroke-dasharray":"4 4"},svg);
      return t=>{const i=Math.floor(t/3.4)%3,k=(t%3.4)/3.4;const[h,p]=ex[i];lightHouse(w,h,BRASS,.2);for(let j=1;j<=12;j++)w.houseText[j].setAttribute("fill-opacity",j===h||j===TH.p[p][1]?1:.3);
        const[a,b]=pa(c,c,w.R.as+4,w.th((w.first+h-1)*30+15)),[x2,y2]=w.pos[p];path.setAttribute("d",`M${a} ${b} Q ${c} ${c} ${x2} ${y2}`);path.setAttribute("opacity",k<.18?0:Math.min(1,(k-.18)*4));w.dim(k>.3?[p]:[],.15);};});
    loop(stage,10.2,t=>{f(t);const[h,p]=ex[Math.floor(t/3.4)%3];const sign=SIGNS[(Math.floor(TH.asc/30)+h-1)%12];
      cap.textContent=sign+" is on his "+ord(h)+" ("+HW[h]+"). "+sign+"'s planet is "+NAME[p]+", and his "+NAME[p]+" sits in his "+ord(TH.p[p][1])+" ("+HW[TH.p[p][1]]+").";});},
  venus(stage,cap){const si=n=>SIGNS.indexOf(n);
    const f=both(stage.querySelector(".fig"),"Venus at home and least at ease",(svg,S)=>{const c=S/2,w=sky(svg,TH,c,c,S*.96,{only:[],axes:false});
      const arc=(i,col)=>{const a0=w.th(i*30);return el("path",{d:wedge(c,c,w.R.so,w.R.si,a0,a0+30),fill:col,"fill-opacity":0},svg);};
      const home=COMFORT.venus[0].map(n=>arc(si(n),"#3FA796")),ease=COMFORT.venus[1].map(n=>arc(si(n),"#D9668A"));
      const vs=S*.15,im=el("image",{href:R.venus,width:vs,height:vs},svg),lab=txt(svg,c,c+S*.1,"",{"font-size":S*.036,"letter-spacing":".08em"});
      const[px,py]=pa(c,c,w.R.lanes[0],w.th(TH.p.venus[0])),ps=w.R.node;
      return t=>{const st=t<2.6?0:t<5.6?1:t<8.6?2:3;
        home.forEach(p=>p.setAttribute("fill-opacity",st===1?.42:st>1?.12:0));ease.forEach((p,i)=>p.setAttribute("fill-opacity",st===2||(st===3&&COMFORT.venus[1][i]==="Aries")?.42:0));
        const m=easeIO(kOf(t,8.6,9.6)),sz=vs+(ps-vs)*m,x=c+(px-c)*m,y=c-S*.03+(py-c+S*.03)*m;
        im.setAttribute("x",x-sz/2);im.setAttribute("y",y-sz/2);im.setAttribute("width",sz);im.setAttribute("height",sz);
        lab.textContent=["VENUS","AT HOME","LEAST AT EASE",""][st];lab.setAttribute("fill",[FG,"#3FA796","#D9668A",FG][st]);};});
    loop(stage,12,t=>{f(t);const st=t<2.6?0:t<5.6?1:t<8.6?2:3;
      cap.textContent=["Venus is how you love and get on with people.","In Taurus and Libra, Venus is at home. Love comes easily there.","In Scorpio and Aries, Venus is least at ease. Love is still strong; it just takes more effort.","Thibault's Venus is in Aries, so it's least at ease. Venus wants ease and peace; Aries wants a win."][st];});},
  meet(stage,cap){const L=[["0°","together","touch","pluto","moon"],["60°","sextile","flow","mars","jupiter"],["90°","square","rub","mercury","uranus"],["120°","trine","flow","jupiter","sun"]];
    const f=both(stage.querySelector(".fig"),"How two planets meet",(svg,S)=>{const g=el("g",{},svg);
      return t=>{const i=Math.floor(t/3)%4;g.innerHTML="";const[deg,ty,k,a,b]=L[i];const r=S*.34;angleDial(g,S/2,S/2,r,a,b,A.p[a][0],B.p[b][0],k,deg,S*.06);};},{h:S=>S});
    loop(stage,12,t=>{f(t);const[deg,ty]=L[Math.floor(t/3)%4];cap.textContent=deg+": "+{together:"the same spot. They act as one.",sextile:"one side of a hexagon. An easy angle.",square:"one side of a square. A sharp angle: they rub.",trine:"one side of a triangle. The easiest angle."}[ty];});}};
