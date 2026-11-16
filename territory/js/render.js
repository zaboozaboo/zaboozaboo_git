// Sprite-based 2.5D battle presentation. Simulation coordinates stay in battle.js.
'use strict';
let cv, ctx;
const VIEW = { sx: 1, sy: 1, dpr: 1, height: 420 };
// Mild elevated perspective; battle coordinates and hit distances remain unchanged.
function perspectiveScale(x){
 const screenY=VIEW.height-(VIEW.hudInset||0)-x+BattleCamera.offset;
 return .68+.40*Math.max(0,Math.min(1,screenY/VIEW.height));
}
const SX = (y,x) => x===undefined?y:LANE_W/2+(y-LANE_W/2)*perspectiveScale(x);
const SY = x => W - x;
const TAU = Math.PI * 2;
const CombatArt = {
  files: BattleArtSet.files,
  images: {}, allies: [], enemies: [], buildings: [], camps: [], terrain: null, ground: null, groundKey: '',
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
    const x0=Math.round(i%cols*image.width/cols), y0=Math.max(0,Math.round(row*image.height/rows)-(isolate?Math.round(image.height/rows*.16):0));
    const w=Math.round((i%cols+1)*image.width/cols)-x0, h=Math.min(image.height,Math.round((row+1)*image.height/rows)+(isolate?Math.round(image.height/rows*.16):0))-y0;
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
  CombatArt.enemies=unpackAtlas(CombatArt.images[CombatArt.files[1]],4,5,true);
  CombatArt.buildings=unpackAtlas(CombatArt.images[CombatArt.files[2]],4,3,true);
  CombatArt.camps=unpackAtlas(CombatArt.images[CombatArt.files[3]],2,1);

}
function initRender(canvas) {
  cv=canvas;ctx=cv.getContext('2d',{alpha:false});fitCanvas();
  if(window.ResizeObserver) new ResizeObserver(fitCanvas).observe(cv);
  else window.addEventListener('resize',fitCanvas);
  makeDeco();initBattleCamera(cv);
  if(typeof MilitiaCombat!=='undefined')MilitiaCombat.load();
}
function fitCanvas() {
  const width=cv.clientWidth,height=cv.clientHeight;
  if(!width||!height) return;
  VIEW.dpr=Math.min(window.devicePixelRatio||1,2);
  cv.width=Math.round(width*VIEW.dpr);cv.height=Math.round(height*VIEW.dpr);
  // World geometry stays fixed across phone rotation and panel resizing.
  VIEW.height=height/(width/LANE_W);
  VIEW.sx=width/LANE_W;VIEW.sy=VIEW.sx;
  // Keep the camp above the overlaid roster while terrain continues behind it.
  VIEW.hudInset=S.portal?.master?0:Math.min(86,height*.2)/VIEW.sy;
  CombatArt.groundKey='';
}
function spriteFor(u) {
  const authored=typeof PortalUnitArt!=='undefined'?PortalUnitArt.sprite(u):null;if(authored)return authored;
  if(/^pm_[0-9]_[0-5]$/.test(u.heroId||''))return null;
  if(u.isVanguard)return CombatArt.allies[ALLY_ART.militia];
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
function teamColor(u) { if(u.isVanguard)return '#f2d579';return u.team===0?'#2485de':'#e95f5b'; }
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
  ctx.fillStyle='#414d37e6';roundRect(x,y,w,h,2);ctx.fill();
  ctx.fillStyle=color;roundRect(x+1,y+1,(w-2)*clamp01(ratio),h-2,1);ctx.fill();
  ctx.strokeStyle='#e2c88a99';ctx.lineWidth=.6;roundRect(x,y,w,h,2);ctx.stroke();
}
function text(txt,x,y,size=10,color='#eee3c8',align='center') {
  ctx.textAlign=align;ctx.font=`600 ${size}px "Apple SD Gothic Neo",sans-serif`;ctx.lineWidth=2.5;ctx.strokeStyle='#07101ec9';ctx.strokeText(txt,x,y);ctx.fillStyle=color;ctx.fillText(txt,x,y);
}
function render() {
  updateBattleCamera(performance.now());
  ctx.setTransform(VIEW.dpr*VIEW.sx,0,0,VIEW.dpr*VIEW.sy,0,0);
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,LANE_W,VIEW.height);
  ctx.save();ctx.beginPath();ctx.rect(0,0,LANE_W,VIEW.height);ctx.clip();
  ctx.translate(0,VIEW.height-W+BattleCamera.offset-(VIEW.hudInset||0));
  if(!CombatArt.reducedMotion && B.shake>0) ctx.translate(Math.sin(B.time*83)*B.shake*5,Math.cos(B.time*71)*B.shake*4);
  drawBackground();
  if(B.mode==='stage'&&!B.fortress) drawCamp(1);
  else if(B.eCastle) drawCastle(1);
  else drawLair();
  if(B.mode==='stage')drawCamp(0);else drawCastle(0);
  // Ground effects sit beneath the sprites; projectiles and impacts above them.
  for(const f of B.fx) if(f.type==='ring'||f.type==='meteor') drawGroundFx(f);
  const units=B.units.filter(u=>u.arrivalAt!==Infinity).sort((a,b)=>SY(a.x)-SY(b.x));
  for(const u of units){
   drawUnitBase(u);
   if(u.team===0&&u.musterAt&&Date.now()-u.musterAt<1000){
    const k=CombatArt.reducedMotion?1:clamp01((Date.now()-u.musterAt)/1000);
    ctx.save();ctx.globalAlpha=1-k;ctx.strokeStyle='#ffe3a1';ctx.lineWidth=2;
    ellipse(SX(u.y,u.x),SY(u.x),12+k*15,5+k*6);ctx.stroke();
    ctx.beginPath();ctx.moveTo(SX(u.y,u.x)-5,SY(u.x)-24);ctx.lineTo(SX(u.y,u.x),SY(u.x)-30-k*12);ctx.lineTo(SX(u.y,u.x)+5,SY(u.x)-24);ctx.stroke();ctx.restore();
   }
  }
  for(const f of B.fx) if(f.type==='fall') drawFx(f);
  const actors=typeof PetField!=='undefined'&&S.portal?[...units,...PetField.actors.map(p=>({...p,isPet:true}))].sort((a,b)=>SY(a.x)-SY(b.x)):units;
  for(const actor of actors){if(actor.isPet)PetField.draw(actor);else drawUnit(actor);}
  if(typeof PetField!=='undefined'&&S.portal)PetField.drawEffects();
  for(const p of B.projs) drawProj(p);
  for(const f of B.fx) if(f.type!=='fall'&&f.type!=='ring') drawFx(f);
  for(const t of B.texts) {
    ctx.save();ctx.globalAlpha=Math.min(1,(1-t.t)*2);
    const pop=CombatArt.reducedMotion?1:1+Math.sin(Math.min(1,t.t*5)*Math.PI)*.15;
    text(t.txt,SX(t.y,t.x),SY(t.x)-(t.up||0)-t.t*22,t.size*pop,t.color);ctx.restore();
  }
  if(B.ended&&B.result==='win')drawConquestFlag();
  drawAtmosphere();ctx.restore();drawHud();
}
function currentRegionIndex() {return B.mode==='stage'?Math.floor(((B.stage||1)-1)/10)%5:5;}
// The background is painted in elevated orthographic perspective already.
// Draw one continuous world-space panel; strip projection would bend trees/cliffs.
function drawBackground() {
  const ri=currentRegionIndex(),atlas=CombatArt.images[CombatArt.files[4]];
  const inset=VIEW.hudInset||0;
  const top=Math.min(0,W-VIEW.height-BattleCamera.offset+inset);
  const height=W+inset-top;
  if(atlas&&atlas.complete&&atlas.naturalWidth){
    const {columns,rows,widthScale}=BattleArtSet.terrain;
    const sw=atlas.naturalWidth/columns,sh=atlas.naturalHeight/rows;
    // Inset sampling prevents neighboring regions bleeding at the atlas seams.
    ctx.drawImage(atlas,(ri%columns)*sw+2,Math.floor(ri/columns)*sh+2,sw-4,sh-4,
      LANE_W*(1-widthScale)/2,top,LANE_W*widthScale,height);
  }else{
    ctx.fillStyle=['#809766','#8d829c','#b08b5c','#bed6df','#594e4b','#86976b'][ri];
    ctx.fillRect(0,top,LANE_W,height);
  }
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
function drawCamp(team){
 const mine=team===0,c=mine?B.pCastle:B.eCastle,foot=mine?W-12:92;
 const a=CombatArt.camps[mine?0:1];if(!a)return;
 const depth=perspectiveScale(W-foot),h=Math.min(100,144/a.ratio)*depth,w=h*a.ratio;
 ctx.save();ctx.fillStyle='#29483b35';ellipse(160,foot-3,w*.46,9*depth);ctx.fill();
 ctx.drawImage(a.image,160-w/2,foot-h,w,h);ctx.restore();
 if(c)bar(123,mine?W-6:8,74,4,c.hp/c.max,mine?'#a4d5bd':'#e59a80');
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
  const depth=perspectiveScale(W-foot);drawStructure(mine?0:1,LANE_W/2,foot,114*depth,74*depth);
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
  const x=SX(u.y,u.x),y=SY(u.x),r=(u.isLord?10:u.boss?13:5)*perspectiveScale(u.x);
  ctx.save();ctx.fillStyle='#2438432b';ellipse(x+r*.6,y+3,r*1.7,r*.6);ctx.fill();ctx.fillStyle='#24384366';ellipse(x,y+1,r+3,r*.46+1);ctx.fill();
  ctx.strokeStyle=teamColor(u);ctx.globalAlpha=.9;ctx.lineWidth=u.isLord?1.3:.7;ellipse(x,y,r,r*.35);ctx.stroke();
  if(u.isLord && u.promo>0) {ctx.strokeStyle=['','#91d9d2','#b59de0','#f8d78b'][u.promo];ellipse(x,y,r+4,r*.4+2);ctx.stroke();}
  if(u.team===0 && B.buffs.sanctuary>0) {ctx.strokeStyle='#ffecad';ellipse(x,y,13,6);ctx.stroke();}
  ctx.restore();
}
function drawUnit(u) {
  const a=spriteFor(u);if(!a) return;
  if(u.isVanguard){ctx.fillStyle='#f2d579';ctx.beginPath();ctx.moveTo(SX(u.y,u.x)-4,SY(u.x)-29);ctx.lineTo(SX(u.y,u.x)+4,SY(u.x)-29);ctx.lineTo(SX(u.y,u.x),SY(u.x)-24);ctx.closePath();ctx.fill();}
  const rawHeight=spriteHeight(u)*perspectiveScale(u.x),height=rawHeight*VIEW.sx/VIEW.sy,width=rawHeight*a.ratio;
  const authored=typeof MilitiaCombat!=='undefined'&&MilitiaCombat.ready&&MilitiaCombat.accepts(u);
  const moving=!!u.moving&&!CombatArt.reducedMotion;
  const attack=CombatArt.reducedMotion||authored?0:Math.sin(clamp01(u.anim/.25)*Math.PI);
  const walk=moving&&!authored?Math.sin(u.walk*1.5):0;
  const lift=u.flying?10+(CombatArt.reducedMotion?0:Math.sin(B.time*3+u.id)*2):Math.abs(walk)*.35;
  const x=SX(u.y,u.x),y=SY(u.x)-lift;
  const face=(u.face|| (u.team===0?1:-1))*(u.monster?-1:1);
  ctx.save();ctx.translate(x+(a.vertical?0:(u.face||1)*attack*2),y+(a.vertical?(u.artUp?-1:1)*attack*2:0));
  ctx.scale(a.vertical?1:face<0?-1:1,1);
  if(!CombatArt.reducedMotion) ctx.rotate(attack*.035);
  const breathe=CombatArt.reducedMotion||authored?1:1+Math.sin(B.time*2+u.id)*.006;
  ctx.scale(1,breathe);
  if(u.arrivalAt&&!CombatArt.reducedMotion){const k=clamp01((Date.now()-u.arrivalAt)/300);ctx.scale(.65+.35*k,.65+.35*k);ctx.globalAlpha=.5+.5*k;}
  // Whole sprites remain intact until authored rig parts are available.
  if(authored)MilitiaCombat.paint(ctx,u,B.time,height,CombatArt.reducedMotion);
  else ctx.drawImage(a.image,-width/2,-height,width,height);
  if(!authored&&u.flash>0) {ctx.globalAlpha=clamp01(u.flash/.12)*.6;ctx.drawImage(a.flash,-width/2,-height,width,height);ctx.globalAlpha=1;}
  ctx.restore();
  if(u.team===1||u.hp<u.maxHp||u.isLord||u.boss) {
    const bw=u.boss?34:u.isLord?27:13;
    bar(x-bw/2,y-height-5,bw,u.boss?5:3,u.hp/u.maxHp,teamColor(u));
  }
  if(u.isLord) text(u.name,x,y-height-9,8,'#f5dca0');
}
function drawProj(p) {
  const x=SX(p.y,p.x),y=SY(p.x)-17;
  const angle=Math.atan2(-(p.vx||1),p.vy||0);
  ctx.save();ctx.translate(x,y);ctx.scale(perspectiveScale(p.x),perspectiveScale(p.x));ctx.rotate(angle);
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
  const k=clamp01(f.t/f.life),x=SX(f.y,f.x),y=SY(f.x);
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
  const k=clamp01(f.t/f.life),x=SX(f.y,f.x),y=SY(f.x)-(f.up||0);
  ctx.save();ctx.globalAlpha=1-k;
  if(f.type==='muster') {
    ctx.strokeStyle=f.color;ctx.lineWidth=2;ctx.globalCompositeOperation='lighter';
    ellipse(x,y,6+k*20,(6+k*20)*.45);ctx.stroke();
    for(let i=0;i<5;i++){const px=x+Math.sin(i*2.4)*13;ctx.fillStyle=f.color;ctx.fillRect(px,y-k*38-i*3,2,8*(1-k)+2);}
  } else if(f.type==='fall') {
    const a=spriteFor(f.unit);if(!a){ctx.restore();return;}const h=spriteHeight(f.unit)*perspectiveScale(f.unit.x)*VIEW.sx/VIEW.sy,w=spriteHeight(f.unit)*perspectiveScale(f.unit.x)*a.ratio;
    ctx.translate(x,y);if(!CombatArt.reducedMotion) ctx.rotate((f.unit.team===0?-1:1)*k*.55);
    if(typeof MilitiaCombat!=='undefined'&&MilitiaCombat.ready&&MilitiaCombat.accepts(f.unit))ctx.scale(f.unit.face<0?-1:1,1);
    if(!(typeof MilitiaCombat!=='undefined'&&MilitiaCombat.paint(ctx,{...f.unit,moving:false,meleeStartedAt:undefined,flash:0},B.time,h*(1-k*.2),true)))ctx.drawImage(a.image,-w/2,-h*(1-k*.2),w,h*(1-k*.2));
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
// 버프 남은 시간은 스킬·AUTO 버튼 묶음 바로 위에 그린다(버튼에 가리지 않게). 레이아웃 측정은 0.5초마다만.
function buffAnchorY(){
  const now=performance.now();
  if(!VIEW.buffAt||now-VIEW.buffAt>500){
    VIEW.buffAt=now;
    const a=document.getElementById('combat-actions'),r=a&&a.getBoundingClientRect(),c=cv.getBoundingClientRect();
    VIEW.buffY=r&&r.height?(r.top-c.top)/VIEW.sy-6:null;
  }
  return VIEW.buffY??VIEW.height-73;
}
function drawHud() {
  const boss=B.units.find(u=>u.team===1&&u.boss&&u.hp>0);
  if(boss) {
    // 상단 재화 표시와 보스 도전 버튼을 피해 제목 아래 왼쪽에 둔다
    const stageHeader=document.getElementById('battle-top');
    const bossY=stageHeader&&stageHeader.getClientRects().length?Math.max(80,(stageHeader.getBoundingClientRect().bottom-cv.getBoundingClientRect().top)/VIEW.sy+5):80;
    ctx.save();ctx.translate(0,bossY-80);hudPlaque(8,80,98,31);
    ctx.fillStyle='#9c503c';roundRect(12,85,3,10,1);ctx.fill();
    ctx.textAlign='center';ctx.font='700 8px "Apple SD Gothic Neo",sans-serif';ctx.fillStyle='#5b4930';ctx.fillText(boss.name,59,93);
    bar(14,100,86,4,boss.hp/boss.maxHp,'#bf6751');ctx.restore();
  }

  const buffY=buffAnchorY();
  if(B.buffs.rally>0) text(`돌격 ${Math.ceil(B.buffs.rally)}s`,308,buffY,8,'#f5d28d','right');
  if(B.buffs.sanctuary>0) text(`성역 ${Math.ceil(B.buffs.sanctuary)}s`,308,buffY,8,'#c7ebd3','right');
  if(B.stageBanner>0 && !B.ended) {
    const alpha=Math.min(1,B.stageBanner,Math.max(0,(2.2-B.stageBanner)*3));
    const title=B.mode==='stage'?`${region(B.stage).name} · ${B.stage}`:B.mode==='war'?'국가전':'서열전';
    drawBanner(title,B.mode==='stage'?(B.fortress?'성을 함락하고 영토를 확보하세요':'새 병력 출격 · 적 캠프 공략'):'BATTLE START',alpha,'#e6cf9b');
  }
  if(B.ended) drawBanner(B.result==='win'?(B.fortress?'성 함락':B.mode==='stage'?'진군 성공':'전투 승리'):B.resultMsg,B.result==='win'?(B.fortress?'새 영토 확보':B.mode==='stage'?`${B.stage}단계 돌파 · 전선 전진${S.portal?' · 보급 +'+(S.portal.master?Portal.stageInfo(B.stage).hammerReward:isBossStage(B.stage)?40:12):B.stage>=S.maxStage?' · 보석 +'+(isBossStage(B.stage)?30:3):''}`:'승리'):'재정비 후 다시 도전',.94,B.result==='win'?'#f7d69b':'#ecaaa0');
  if(B.skillCue && B.skillCue.t>0) {
    const a=Math.min(1,B.skillCue.t*3);
    ctx.save();ctx.globalAlpha=a;hudPlaque(85,55,150,29);ctx.textAlign='center';ctx.font='700 12px sans-serif';ctx.fillStyle='#526244';ctx.fillText(B.skillCue.name,160,74);ctx.restore();
  }
}
function hudPlaque(x,y,w,h){
 ctx.fillStyle='#4b51352e';roundRect(x,y+2,w,h,6);ctx.fill();
 const fill=ctx.createLinearGradient(0,y,0,y+h);fill.addColorStop(0,'#fbf0d8f5');fill.addColorStop(1,'#e8d3a2f5');
 ctx.fillStyle=fill;roundRect(x,y,w,h,6);ctx.fill();ctx.strokeStyle='#b39761';ctx.lineWidth=.8;ctx.stroke();
 ctx.strokeStyle='#fff8e5b3';ctx.beginPath();ctx.moveTo(x+7,y+2);ctx.lineTo(x+w-7,y+2);ctx.stroke();
}
function drawBanner(title,subtitle,alpha,color) {
 const y=VIEW.height*.4;
 ctx.save();ctx.globalAlpha=alpha;hudPlaque(28,y-25,264,63);
 ctx.fillStyle=color;for(const x of [36,284]){ctx.beginPath();ctx.moveTo(x,y+1);ctx.lineTo(x+3,y+5);ctx.lineTo(x,y+9);ctx.lineTo(x-3,y+5);ctx.closePath();ctx.fill();}
 ctx.textAlign='center';ctx.fillStyle='#7b7052';ctx.font='600 8px "Apple SD Gothic Neo",sans-serif';ctx.fillText(subtitle,160,y-7);
 ctx.fillStyle=B.ended&&B.result!=='win'?'#99523e':'#435d41';ctx.font='800 18px "Apple SD Gothic Neo",sans-serif';ctx.fillText(title,160,y+17);ctx.restore();
}

// Raised at the defeated base, grounded in the same world as the troops.
function drawConquestFlag(){
 const k=CombatArt.reducedMotion?1:clamp01((Date.now()-B.victoryAt)/700),x=LANE_W/2,y=75;
 ctx.save();ctx.translate(x,y);const depth=perspectiveScale(W-y);ctx.scale(depth,depth*VIEW.sx/VIEW.sy);
 ctx.fillStyle='#806d4a';ctx.fillRect(-2,-60*k,4,60*k);
 ctx.fillStyle=NATIONS[S.nation].color;ctx.strokeStyle='#ffe1a0';ctx.lineWidth=1.5;
 ctx.beginPath();ctx.moveTo(2,-60*k);ctx.lineTo(35,-55*k);ctx.lineTo(29,-43*k);ctx.lineTo(2,-39*k);ctx.closePath();ctx.fill();ctx.stroke();
 if(!CombatArt.reducedMotion)for(let i=0;i<12;i++){const a=i*TAU/12;ctx.globalAlpha=(1-k)*.7;ctx.fillStyle='#f6d88b';ctx.fillRect(Math.cos(a)*k*60,-30+Math.sin(a)*k*30,3,3);}
 ctx.restore();
}
