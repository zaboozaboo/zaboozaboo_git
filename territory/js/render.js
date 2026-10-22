// Sprite-based 2.5D battle presentation. Simulation coordinates stay in battle.js.
'use strict';
let cv, ctx;
const VIEW = { sx: 1, sy: 1, dpr: 1 };
const SX = y => y;
const SY = x => W - x;
const TAU = Math.PI * 2;
const CombatArt = {
  files: ['assets/casual-allies.png', 'assets/casual-enemies.png', 'assets/casual-buildings.png'],
  images: {}, allies: [], enemies: [], buildings: [], terrain: null, ground: null, groundKey: '',
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
};
const ALLY_ART = { militia:6, archer:7, spear:8, crossbow:9, apprentice:10, cavalry:11, monk:12, pyro:13, ranger:14, griffin:15, paladin:16, dragon:17, archangel:18 };
const ENEMY_ART = Object.fromEntries(['goblin','goblin_archer','wolf','goblin_king','skeleton','skel_archer','ghost','lich','orc','orc_shaman','troll','warlord','yeti','ice_mage','frost_wolf','frost_giant','imp','demon','hellhound','demon_lord'].map((key,i)=>[key,i]));
const BUILDING_ART = { militia:2, spear:2, crossbow:3, archer:3, apprentice:4, pyro:4, ranger:3, cavalry:6, monk:5, griffin:7, paladin:5, dragon:8, archangel:5 };
const REGION_COLORS = ['#b9d492','#b299dc','#e2ad70','#a5e6ff','#ff8b64','#a8c9e2'];
const clamp01 = n => Math.max(0, Math.min(1, n));

// Decode the atlas once; tight alpha bounds and white hit-flash masks are cached.
function unpackAtlas(image, cols, rows, isolate = false) {
  const tiles = [];
  for (let i=0; i<cols*rows; i++) {
    const row=Math.floor(i/cols);
    const x0=Math.round(i%cols*image.width/cols), y0=Math.max(0,Math.round(row*image.height/rows)-(isolate?12:0));
    const w=Math.round((i%cols+1)*image.width/cols)-x0, h=Math.min(image.height,Math.round((row+1)*image.height/rows)+(isolate?14:0))-y0;
    const work=document.createElement('canvas'); work.width=w; work.height=h;
    const c=work.getContext('2d',{willReadFrequently:true}); c.drawImage(image,x0,y0,w,h,0,0,w,h);
    if(isolate) {
      const pixels=c.getImageData(0,0,w,h),d=pixels.data,seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let largest=[];
      for(let seed=0;seed<w*h;seed++){
        if(seen[seed]||d[seed*4+3]<24)continue;
        let head=0,tail=1;queue[0]=seed;seen[seed]=1;
        while(head<tail){const n=queue[head++],x=n%w,y=Math.floor(n/w);
          for(const q of [x>0?n-1:-1,x<w-1?n+1:-1,y>0?n-w:-1,y<h-1?n+w:-1])if(q>=0&&!seen[q]&&d[q*4+3]>=24){seen[q]=1;queue[tail++]=q;}
        }
        if(tail>largest.length)largest=Array.from(queue.subarray(0,tail));
      }
      const keep=new Uint8Array(w*h);
      for(const n of largest)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const x=n%w+dx,y=Math.floor(n/w)+dy;if(x>=0&&x<w&&y>=0&&y<h)keep[y*w+x]=1;}
      for(let n=0;n<w*h;n++)if(!keep[n])d[n*4+3]=0;
      c.putImageData(pixels,0,0);
    }
    const data=c.getImageData(0,0,w,h).data;
    let l=w,r=0,t=h,b=0;
    for (let y=0;y<h;y++) for (let x=0;x<w;x++) if(data[(y*w+x)*4+3]>32) { l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y); }
    if(r<l || b<t) { l=0;t=0;r=w-1;b=h-1; }
    const sw=r-l+1,sh=b-t+1;
    const imageTile=document.createElement('canvas');
    const scale=Math.min(1,256/Math.max(sw,sh));
    imageTile.width=Math.max(1,Math.round(sw*scale));imageTile.height=Math.max(1,Math.round(sh*scale));
    imageTile.getContext('2d').drawImage(work,l,t,sw,sh,0,0,imageTile.width,imageTile.height);
    const flash=document.createElement('canvas');flash.width=imageTile.width;flash.height=imageTile.height;
    const fc=flash.getContext('2d');fc.drawImage(imageTile,0,0);fc.globalCompositeOperation='source-in';fc.fillStyle='#fff5dd';fc.fillRect(0,0,flash.width,flash.height);
    tiles.push({image:imageTile,flash,ratio:sw/sh,url:imageTile.toDataURL()});
  }
  return tiles;
}
function prepareCombatArt() {
  CombatArt.allies=unpackAtlas(CombatArt.images[CombatArt.files[0]],5,4,true);
  CombatArt.enemies=unpackAtlas(CombatArt.images[CombatArt.files[1]],4,5);
  CombatArt.buildings=unpackAtlas(CombatArt.images[CombatArt.files[2]],4,3);
}
function initRender(canvas) {
  cv=canvas;ctx=cv.getContext('2d',{alpha:false});fitCanvas();
  if(window.ResizeObserver) new ResizeObserver(fitCanvas).observe(cv);
  else window.addEventListener('resize',fitCanvas);
  makeDeco();
}
function fitCanvas() {
  const width=cv.clientWidth,height=cv.clientHeight;
  if(!width||!height) return;
  const oldW=W;
  VIEW.dpr=Math.min(window.devicePixelRatio||1,2);
  cv.width=Math.round(width*VIEW.dpr);cv.height=Math.round(height*VIEW.dpr);
  setWorld(height/(width/LANE_W));
  // Preserve active formations if a phone rotates or browser panel changes size.
  if(oldW!==W) {
    const reposition=u=>{u.x=P_CASTLE_X+(u.x-P_CASTLE_X)*(W-P_CASTLE_X)/(oldW-P_CASTLE_X);};
    B.units.forEach(reposition);
    if(B.stash) B.stash.units.forEach(reposition);
    for(const p of B.projs) {p.x*=W/oldW;p.tx*=W/oldW;}
    B.fx.forEach(f=>f.x*=W/oldW);B.texts.forEach(t=>t.x*=W/oldW);
  }
  VIEW.sx=width/LANE_W;VIEW.sy=height/W;
  CombatArt.groundKey='';
}
function spriteFor(u) {
  if(u.monster) return CombatArt.enemies[ENEMY_ART[u.key] ?? 0];
  if(u.isLord) return CombatArt.allies[({knight:0,mage:1,priest:2}[u.cls] ?? 0)+(u.gender==='f'?3:0)];
  return CombatArt.allies[ALLY_ART[u.heroId] ?? 6];
}
function spriteHeight(u) {
  if(u.isLord) return 46+(u.promo||0)*3;
  if(u.boss) return 43+u.size*.25;
  if(u.def.dragon) return 34;
  if(u.flying||u.def.mount) return 29;
  return 21+Math.min(u.size,12)*.25;
}
function teamColor(u) { return u.team===0?'#2485de':'#e95f5b'; }
function ellipse(x,y,rx,ry) {ctx.beginPath();ctx.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,TAU);}
function glow(x,y,r,color,alpha=1) {
  if(r<=0) return;
  const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(.25,color);g.addColorStop(1,'transparent');
  ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();
}
function roundRect(x,y,w,h,r) {
  r=Math.max(0,Math.min(r,w/2,h/2));ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}
function bar(x,y,w,h,ratio,color) {
  ctx.fillStyle='#06111ee6';roundRect(x,y,w,h,2);ctx.fill();
  ctx.fillStyle=color;roundRect(x+1,y+1,(w-2)*clamp01(ratio),h-2,1);ctx.fill();
  ctx.strokeStyle='#c9c1a540';ctx.lineWidth=.5;roundRect(x,y,w,h,2);ctx.stroke();
}
function text(txt,x,y,size=10,color='#eee3c8',align='center') {
  ctx.textAlign=align;ctx.font=`600 ${size}px "Apple SD Gothic Neo",sans-serif`;ctx.lineWidth=2.5;ctx.strokeStyle='#07101ec9';ctx.strokeText(txt,x,y);ctx.fillStyle=color;ctx.fillText(txt,x,y);
}
function render() {
  ctx.setTransform(VIEW.dpr*VIEW.sx,0,0,VIEW.dpr*VIEW.sy,0,0);
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,LANE_W,W);
  ctx.save();ctx.beginPath();ctx.rect(0,0,LANE_W,W);ctx.clip();
  if(!CombatArt.reducedMotion && B.shake>0) ctx.translate(Math.sin(B.time*83)*B.shake*5,Math.cos(B.time*71)*B.shake*4);
  drawBackground();
  if(B.eCastle) drawCastle(1);
  else drawLair();
  drawCastle(0);
  // Ground effects sit beneath the sprites; projectiles and impacts above them.
  for(const f of B.fx) if(f.type==='ring'||f.type==='meteor') drawGroundFx(f);
  const units=B.units.slice().sort((a,b)=>SY(a.x)-SY(b.x));
  for(const u of units) drawUnitBase(u);
  for(const f of B.fx) if(f.type==='fall') drawFx(f);
  for(const u of units) drawUnit(u);
  for(const p of B.projs) drawProj(p);
  for(const f of B.fx) if(f.type!=='fall'&&f.type!=='ring') drawFx(f);
  for(const t of B.texts) {
    ctx.save();ctx.globalAlpha=Math.min(1,(1-t.t)*2);
    const pop=CombatArt.reducedMotion?1:1+Math.sin(Math.min(1,t.t*5)*Math.PI)*.15;
    text(t.txt,SX(t.y),SY(t.x)-(t.up||0)-t.t*22,t.size*pop,t.color);ctx.restore();
  }
  drawAtmosphere();ctx.restore();drawHud();
}
function currentRegionIndex() {return B.mode==='stage'?Math.floor(((B.stage||1)-1)/10)%5:5;}
function drawBackground() {
  const ri=currentRegionIndex();
  const key=`${ri}:${W}`;
  if(CombatArt.groundKey!==key) {
    const layer=document.createElement('canvas');layer.width=640;layer.height=W*2;
    const c=layer.getContext('2d');
    // Quiet, broad color shapes keep moving units as the highest-contrast layer.
    const palettes=[['#8ac477','#c5d99a'],['#a9b4cd','#d5d5e0'],['#d9ad78','#efcf9b'],['#a9d9e8','#e0f1ed'],['#bc8b8b','#dec0ae'],['#9fc9a4','#d9dfad']];
    const [edge,path]=palettes[ri];
    c.fillStyle=edge;c.fillRect(0,0,640,layer.height);
    c.fillStyle=path;c.beginPath();c.moveTo(150,0);c.bezierCurveTo(210,layer.height*.3,80,layer.height*.7,115,layer.height);c.lineTo(530,layer.height);c.bezierCurveTo(570,layer.height*.7,435,layer.height*.3,490,0);c.closePath();c.fill();
    // Only the edges carry decoration; the central battlefield stays clear.
    for(let i=0;i<24;i++) {
      const x=i%2?590+(i*13%25):25+(i*17%30),y=(i*137)%layer.height;
      c.fillStyle=i%3?'#ffffff28':'#29484922';c.beginPath();c.ellipse(x,y,14+i%9,7+i%5,0,0,TAU);c.fill();
    }
    CombatArt.ground=layer;CombatArt.groundKey=key;
  }
  ctx.drawImage(CombatArt.ground,0,0,LANE_W,W);
}
function drawAtmosphere() {
  const ri=currentRegionIndex(),time=CombatArt.reducedMotion?0:B.time;
  ctx.save();ctx.globalAlpha=.34;
  for(let i=0;i<12;i++) {
    const seed=i*37.19;
    const x=(i*79+Math.sin(time*.3+i)*14)%LANE_W;
    const y=(seed*11+time*(ri===3?10:-5)+W*100)%W;
    ctx.fillStyle=ri===4?'#ffc283':ri===3?'#e0f5ff':'#d7e4b8';
    ellipse(x,y,ri===3?1.2:.7,ri===3?1.2:.7);ctx.fill();
  }
  ctx.restore();
}
function drawStructure(index,x,foot,width,maxHeight=width) {
  const a=CombatArt.buildings[index];
  const raw=Math.min(maxHeight,width/a.ratio),w=raw*a.ratio,h=raw*VIEW.sx/VIEW.sy;
  ctx.drawImage(a.image,x-w/2,foot-h,w,h);
}
function drawCastle(team) {
  const mine=team===0,c=mine?B.pCastle:B.eCastle;
  const foot=mine?W-12:Math.max(70,55*VIEW.sx/VIEW.sy);
  ctx.save();
  const art=CombatArt.buildings[mine?0:1];
  const baseWidth=Math.min(55,100/art.ratio)*art.ratio;
  const groundDepth=VIEW.sx/VIEW.sy;
  ctx.fillStyle='#5a59454d';ellipse(LANE_W/2,foot-groundDepth,baseWidth*.46,2.2*groundDepth);ctx.fill();
  ctx.fillStyle='#26362b66';ellipse(LANE_W/2,foot-1.5*groundDepth,baseWidth*.34,1.2*groundDepth);ctx.fill();
  drawStructure(mine?0:1,LANE_W/2,foot,100,55);
  const color=mine?'#a4d5bd':'#e59a80';
  const by=mine?W-6:9;
  if(c) bar(123,by,74,4,c.hp/c.max,color);
  ctx.restore();
}
function drawLair() {
  const ri=currentRegionIndex(),color=REGION_COLORS[ri];
  glow(160,40,48,color,.13+(B.lairPulse||0)*.25);
  drawStructure(ri===0?9:ri===4?11:10,160,Math.max(45,34*VIEW.sx/VIEW.sy),52,34);
}
function drawUnitBase(u) {
  const x=SX(u.y),y=SY(u.x),r=u.isLord?10:u.boss?13:5;
  ctx.save();ctx.fillStyle='#24384366';ellipse(x,y+1,r+3,r*.35+1);ctx.fill();
  ctx.strokeStyle=teamColor(u);ctx.globalAlpha=.9;ctx.lineWidth=u.isLord?1.3:.7;ellipse(x,y,r,r*.35);ctx.stroke();
  if(u.isLord && u.promo>0) {ctx.strokeStyle=['','#91d9d2','#b59de0','#f8d78b'][u.promo];ellipse(x,y,r+4,r*.4+2);ctx.stroke();}
  if(u.team===0 && B.buffs.sanctuary>0) {ctx.strokeStyle='#ffecad';ellipse(x,y,13,6);ctx.stroke();}
  ctx.restore();
}
function drawUnit(u) {
  const a=spriteFor(u);if(!a) return;
  const rawHeight=spriteHeight(u),height=rawHeight*VIEW.sx/VIEW.sy,width=rawHeight*a.ratio;
  const moving=!!u.moving&&!CombatArt.reducedMotion;
  const attack=CombatArt.reducedMotion?0:Math.sin(clamp01(u.anim/.25)*Math.PI);
  const walk=moving?Math.sin(u.walk*1.5):0;
  const lift=u.flying?10+(CombatArt.reducedMotion?0:Math.sin(B.time*3+u.id)*2):Math.abs(walk)*1.2;
  const x=SX(u.y),y=SY(u.x)-lift;
  const face=(u.face|| (u.team===0?1:-1))*(u.monster?-1:1);
  ctx.save();ctx.translate(x+(u.face||1)*attack*2,y);
  ctx.scale(face<0?-1:1,1);
  if(!CombatArt.reducedMotion) ctx.rotate(walk*.025+attack*.055);
  const breathe=CombatArt.reducedMotion?1:1+Math.sin(B.time*2+u.id)*.006;
  ctx.scale(1,breathe);
  if(u.arrivalAt&&!CombatArt.reducedMotion){const k=clamp01((Date.now()-u.arrivalAt)/300);ctx.scale(.65+.35*k,.65+.35*k);ctx.globalAlpha=.5+.5*k;}
  // A small independent lower-body gait gives cloth, boots and mounts weight.
  if(moving&&!u.flying&&u.kind!=='healer') {
    const split=Math.round(a.image.height*.73),legHeight=a.image.height-split;
    ctx.drawImage(a.image,0,0,a.image.width,split,-width/2,-height,width,height*.73);
    for(let side=0;side<2;side++) ctx.drawImage(a.image,side*a.image.width/2,split,a.image.width/2,legHeight,-width/2+side*width/2,-height*.27+walk*(side?1:-1)*.7,width/2,height*.27);
  } else ctx.drawImage(a.image,-width/2,-height,width,height);
  if(u.flash>0) {ctx.globalAlpha=clamp01(u.flash/.12)*.6;ctx.drawImage(a.flash,-width/2,-height,width,height);ctx.globalAlpha=1;}
  ctx.restore();
  if(u.team===1||u.hp<u.maxHp||u.isLord||u.boss) {
    const bw=u.boss?34:u.isLord?27:13;
    bar(x-bw/2,y-height-5,bw,u.boss?5:3,u.hp/u.maxHp,teamColor(u));
  }
  if(u.isLord) text(u.name,x,y-height-9,8,'#f5dca0');
}
function drawProj(p) {
  const x=SX(p.y),y=SY(p.x)-17;
  const angle=Math.atan2(-(p.vx||1),p.vy||0);
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);
  if(p.type==='arrow'||p.type==='bolt_x') {
    const g=ctx.createLinearGradient(-23,0,5,0);g.addColorStop(0,'transparent');g.addColorStop(1,'#f5dd9f');ctx.strokeStyle=g;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-23,0);ctx.lineTo(6,0);ctx.stroke();
    ctx.strokeStyle='#c4ab7c';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(4,0);ctx.stroke();
    ctx.fillStyle='#f2eee2';ctx.beginPath();ctx.moveTo(7,0);ctx.lineTo(1,-2);ctx.lineTo(1,2);ctx.fill();
    ctx.strokeStyle='#c2d3da';ctx.beginPath();ctx.moveTo(-7,-2);ctx.lineTo(-4,0);ctx.lineTo(-7,2);ctx.stroke();
  } else {
    const col=p.type==='fire'?'#ff9a43':p.type==='holy'?'#e5ffd1':'#79c8ff';
    ctx.globalCompositeOperation='lighter';
    for(let i=4;i>=0;i--) glow(-i*5,Math.sin(B.time*14-i)*1.5,7-i*.7,col,(1-i*.16)*.4);
    glow(0,0,9,col,.75);ctx.fillStyle='#fff4dc';ellipse(0,0,2.2,2.2);ctx.fill();
  }
  ctx.restore();
}
function drawGroundFx(f) {
  if(f.t<0) return;
  const k=clamp01(f.t/f.life),x=SX(f.y),y=SY(f.x);
  ctx.save();
  if(f.type==='meteor') {
    ctx.strokeStyle='#f1a067';ctx.lineWidth=1;ctx.globalAlpha=.25+k*.4;
    ellipse(x,y,32,15);ctx.stroke();ellipse(x,y,25*(1-k)+5,12*(1-k)+2);ctx.stroke();
  } else {
    const r=f.r+(Math.min(f.max,180)-f.r)*(1-Math.pow(1-k,2));
    ctx.globalAlpha=(1-k)*.6;ctx.strokeStyle=f.color;ctx.lineWidth=1.2;
    ellipse(x,y,r,r*.42);ctx.stroke();ellipse(x,y,r*.83,r*.35);ctx.stroke();
    for(let i=0;i<8;i++) {const a=i*TAU/8;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*r*.85,y+Math.sin(a)*r*.36);ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r*.42);ctx.stroke();}
  }
  ctx.restore();
}
function drawFx(f) {
  if(f.t<0) return;
  const k=clamp01(f.t/f.life),x=SX(f.y),y=SY(f.x)-(f.up||0);
  ctx.save();ctx.globalAlpha=1-k;
  if(f.type==='muster') {
    ctx.strokeStyle=f.color;ctx.lineWidth=2;ctx.globalCompositeOperation='lighter';
    ellipse(x,y,6+k*20,(6+k*20)*.45);ctx.stroke();
    for(let i=0;i<5;i++){const px=x+Math.sin(i*2.4)*13;ctx.fillStyle=f.color;ctx.fillRect(px,y-k*38-i*3,2,8*(1-k)+2);}
  } else if(f.type==='fall') {
    const a=spriteFor(f.unit),h=spriteHeight(f.unit)*VIEW.sx/VIEW.sy,w=spriteHeight(f.unit)*a.ratio;
    ctx.translate(x,y);if(!CombatArt.reducedMotion) ctx.rotate((f.unit.team===0?-1:1)*k*.55);
    ctx.drawImage(a.image,-w/2,-h*(1-k*.2),w,h*(1-k*.2));
  } else if(f.type==='slash') {
    ctx.translate(x,y-10);ctx.scale(f.face<0?-1:1,1);ctx.rotate(-.5+k*.8);
    ctx.globalCompositeOperation='lighter';ctx.strokeStyle=f.color||'#ffe7bd';ctx.lineWidth=4*(1-k)+.3;
    ctx.beginPath();ctx.ellipse(0,0,18,10,0,-1.3,1.4);ctx.stroke();ctx.strokeStyle='#fff9e6';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(0,0,15,8,0,-1.2,1.2);ctx.stroke();
  } else if(f.type==='impact'||f.type==='boom') {
    const radius=f.type==='boom'?f.r:12;
    const col=f.color||'#ffdda5';
    ctx.globalCompositeOperation='lighter';
    glow(x,y,radius*(.3+k),col,(1-k)*.55);
    ctx.strokeStyle=col;ctx.lineWidth=f.type==='boom'?2:1;
    ellipse(x,y,radius*k,radius*k*.6);ctx.stroke();
    const count=f.type==='boom'?12:5;
    for(let i=0;i<count;i++) {const a=i*TAU/count+(f.x%7);const r=radius*(.25+k*.8);ctx.beginPath();ctx.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r*.7);ctx.lineTo(x+Math.cos(a)*(r+5*(1-k)),y+Math.sin(a)*(r+5*(1-k))*.7);ctx.stroke();}
  } else if(f.type==='meteor') {
    const mx=x+70*(1-k),my=y-220*(1-k);
    ctx.globalAlpha=1;ctx.globalCompositeOperation='lighter';
    for(let i=8;i>=0;i--) glow(mx+i*4,my-i*10,Math.max(2,12-i),i>4?'#e87135':'#ffc267',.32);
    glow(mx,my,18,'#ff9e49',.9);ctx.fillStyle='#fff0b5';ellipse(mx,my,5,8);ctx.fill();
  } else if(f.type==='spark') {
    ctx.globalCompositeOperation='lighter';glow(x,y-k*10,18,'#a9e8bf',.45);
    for(let i=0;i<5;i++) {const px=x+Math.sin(i*4)*12,py=y-k*20-i*3;ctx.fillStyle='#edffd2';ctx.fillRect(px-1,py-3,2,6);ctx.fillRect(px-3,py-1,6,2);}
  } else if(f.type==='poof') {
    for(let i=0;i<6;i++) {const a=i*TAU/6;ctx.fillStyle=i%2?'#b8aa86':'#667078';ctx.globalAlpha=(1-k)*.22;ellipse(x+Math.cos(a)*k*17,y+Math.sin(a)*k*9,3+k*4,2+k*3);ctx.fill();}
  }
  ctx.restore();
}
function drawHud() {
  // A compact boss header replaces labels mixed into the battlefield itself.
  const enemies=B.units.filter(u=>u.team===1&&u.hp>0).length;
  ctx.save();ctx.fillStyle='#713d3de6';roundRect(8,8,68,19,8);ctx.fill();text(`적 ${enemies}명`,42,21,9,'#fff3e8');ctx.restore();
  const boss=B.units.find(u=>u.team===1&&u.boss&&u.hp>0);
  if(boss) {
    ctx.save();ctx.fillStyle='#101a2be6';roundRect(82,8,230,34,4);ctx.fill();ctx.strokeStyle='#be907066';ctx.lineWidth=.7;ctx.stroke();
    text(boss.name,197,20,10,'#f0c8aa');bar(94,27,206,5,boss.hp/boss.maxHp,'#d56f68');ctx.restore();
  }

  if(B.buffs.rally>0) text(`돌격 ${Math.ceil(B.buffs.rally)}s`,308,W-73,8,'#f5d28d','right');
  if(B.buffs.sanctuary>0) text(`성역 ${Math.ceil(B.buffs.sanctuary)}s`,308,W-73,8,'#c7ebd3','right');
  if(B.stageBanner>0 && !B.ended) {
    const alpha=Math.min(1,B.stageBanner,Math.max(0,(2.2-B.stageBanner)*3));
    const title=B.mode==='stage'?`${region(B.stage).name} · ${B.stage}`:B.mode==='war'?'국가전':'서열전';
    drawBanner(title,B.mode==='stage'&&isBossStage(B.stage)?'BOSS ENCOUNTER':'BATTLE START',alpha,'#e6cf9b');
  }
  if(B.ended) drawBanner(B.result==='win'?'전투 승리':B.resultMsg,B.result==='win'?'VICTORY':'DEFEAT',.94,B.result==='win'?'#f7d69b':'#ecaaa0');
  if(B.skillCue && B.skillCue.t>0) {
    const a=Math.min(1,B.skillCue.t*3);
    ctx.save();ctx.globalAlpha=a;ctx.fillStyle='#102238dc';roundRect(85,55,150,29,3);ctx.fill();ctx.strokeStyle='#c5aa6c88';ctx.lineWidth=.7;ctx.stroke();text(B.skillCue.name,160,74,12,'#f6dca5');ctx.restore();
  }
}
function drawBanner(title,subtitle,alpha,color) {
  const y=W*.4;
  ctx.save();ctx.globalAlpha=alpha;const g=ctx.createLinearGradient(0,0,LANE_W,0);g.addColorStop(0,'transparent');g.addColorStop(.2,'#081323e8');g.addColorStop(.8,'#081323e8');g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(0,y-25,LANE_W,63);
  ctx.strokeStyle=color;ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(55,y-24);ctx.lineTo(265,y-24);ctx.moveTo(55,y+37);ctx.lineTo(265,y+37);ctx.stroke();
  text(subtitle,160,y-7,8,color);text(title,160,y+17,18,color);ctx.restore();
}
