'use strict';
const $=id=>document.getElementById(id),cv=$('battle'),ctx=cv.getContext('2d');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let battle=new CrowdBattle(1000),playing=false,paused=false,ready=false,prev=0,acc=0,eventIndex=0,noticeUntil=0,visualTime=0,frameSamples=[],costSamples=[],lastReport=0,camera=1010;
const art={},tinted={};
let projection={sx:1,sy:1};
function notice(text){$('notice').textContent=text;noticeUntil=visualTime+2.4;$('notice').classList.add('show');}
function reset(size=battle.size,start=false){battle=new CrowdBattle(size);camera=1010;playing=start;paused=false;acc=0;eventIndex=0;noticeUntil=0;$('notice').textContent='';costSamples=[];frameSamples=[];$('notice').classList.remove('show');$('intro').hidden=start;$('result').hidden=true;$('pause').hidden=!start;$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','전투 일시 정지');document.querySelectorAll('[data-size]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.size)===size)));hud();}
for(const b of document.querySelectorAll('[data-size]'))b.onclick=()=>reset(Number(b.dataset.size),playing);
$('start').onclick=()=>{if(ready)reset(battle.size,true);};$('replay').onclick=()=>reset(battle.size,true);
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'▶':'Ⅱ';$('pause').setAttribute('aria-label',paused?'전투 재개':'전투 일시 정지');};
$('hero-command').onclick=()=>{if(playing&&!paused)battle.skill();};
function hud(){
 const heroAlive=battle.allies.some(u=>u.kind==='lord');$('hero-command').disabled=!playing||paused||battle.done||!heroAlive||battle.skillCooldown>0;$('command-time').textContent=!heroAlive?'영웅 전사':battle.skillCooldown>0?Math.ceil(battle.skillCooldown)+'초':'주변 광역 베기';
 $('allies').textContent=battle.allies.length;$('enemies').textContent=battle.enemies.length;
 $('clock').textContent=Math.floor(battle.time/60)+':'+String(Math.floor(battle.time%60)).padStart(2,'0');
 const enemyHero=battle.enemies.find(u=>u.kind==='lord');$('hint').textContent=enemyHero?'적 군단장 · '+Math.ceil(enemyHero.hp)+' / '+enemyHero.maxHp:'적 군단장 격파 · 잔여 병력 돌파';
 if(visualTime>noticeUntil){$('notice').classList.remove('show');$('notice').textContent='';}
}
function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
function line(x,y,tx,ty,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(tx,ty);ctx.stroke();}
function label(text,x,y,color='#fff2c3',size=10){ctx.font=`700 ${size}px system-ui`;ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#2c463dbb';ctx.strokeText(text,x,y);ctx.fillStyle=color;ctx.fillText(text,x,y);}
function stamp(a,x,y,h,alpha=1){if(!a)return;ctx.save();ctx.globalAlpha*=alpha;ctx.drawImage(a.image,x-h*a.ratio*projection.sy/projection.sx/2,y-h,h*a.ratio*projection.sy/projection.sx,h);ctx.restore();}
const ground=document.createElement('canvas');ground.width=800;ground.height=3920;
function terrain(){const c=ground.getContext('2d');c.scale(2,2);c.fillStyle='#95ad76';c.fillRect(0,0,400,1960);c.fillStyle='#c7bd8c';c.beginPath();c.moveTo(120,0);c.lineTo(280,0);c.bezierCurveTo(325,700,290,1400,355,1960);c.lineTo(46,1960);c.bezierCurveTo(105,1400,78,700,120,0);c.fill();let seed=38;const rand=()=>{seed=seed*16807%2147483647;return seed/2147483647;};for(let i=0;i<2400;i++){const x=rand()*400,y=rand()*1960;c.fillStyle=i%2?'#647c4e25':'#fff1b826';c.fillRect(x,y,rand()*4+1,1.5);}for(let i=0;i<84;i++){const x=i%2?392+rand()*15:rand()*9,y=i*24;c.fillStyle='#4e744c';c.beginPath();c.ellipse(x,y,23,32,0,0,7);c.fill();c.fillStyle='#75914e';c.beginPath();c.ellipse(x-6,y-7,18,23,0,0,7);c.fill();}}

terrain();
function drawUnit(u,alpha=1){
 const h=u.kind==='lord'?70:u.kind==='captain'?48:27;
 const bob=u.moving&&!reduced?Math.sin(battle.time*13+u.id)*1:0;
 const attack=battle.time-(u.swingAt??-99),swing=attack<.24&&!reduced?Math.sin(attack/.24*Math.PI)*3:0;
 const base=u.kind==='lord'?(u.team?art.enemies?.[3]:art.allies?.[0]):tinted[(u.team?'red':'blue')+'-'+u.kind];
 ctx.save();ctx.globalAlpha=alpha;
 ellipse(u.x,u.y,7.5,3,u.team?'#ab372d80':'#176cbb80');
 stamp(base,u.x,u.y+bob+(u.team?swing:-swing),h);
 // Colored broad cap and shoulder panels remain legible when body sprites overlap.
 if(u.kind!=='lord'){ctx.fillStyle=u.team?'#df553d':'#38b5ef';ctx.fillRect(u.x-5,u.y-h+4,10,3);}
 if(u.kind==='captain'){
  ctx.strokeStyle='#ffda78';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(u.x,u.y,12,6,0,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#61352bea';ctx.fillRect(u.x-25,u.y-h-23,50,18);ctx.strokeStyle='#efc674';ctx.lineWidth=1;ctx.strokeRect(u.x-25,u.y-h-23,50,18);
  label('소대장',u.x,u.y-h-10,'#ffe5a0',12);
  if(u.hp<u.maxHp){ctx.fillStyle='#512b25';ctx.fillRect(u.x-17,u.y-h-3,34,4);ctx.fillStyle='#efbe5b';ctx.fillRect(u.x-17,u.y-h-3,34*Math.max(0,u.hp/u.maxHp),4);}
 }
 if(u.flash>0){ellipse(u.x,u.y-10,4,5,'#fff3ca99');}
 if(u.kind==='lord'){
  ctx.strokeStyle=u.team?'#ff674e':'#ffe39a';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(u.x,u.y,15,8,0,0,7);ctx.stroke();
  label(u.team?'적 군단장':'기사 영주',u.x,u.y-h-10,u.team?'#ffb6a1':'#ffe9a4',12);ctx.fillStyle='#263e46';ctx.fillRect(u.x-20,u.y-h-5,40,5);ctx.fillStyle='#eccd78';ctx.fillRect(u.x-19,u.y-h-4,38*Math.max(0,u.hp/u.maxHp),3);
  if(attack<.24){ctx.strokeStyle='#fff1b6';ctx.lineWidth=3;ctx.beginPath();ctx.arc(u.x,u.y-23,27,-2.8,-.4);ctx.stroke();}
  if(!u.team&&battle.time<battle.skillUntil){ctx.strokeStyle='#ffe5a590';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(u.x,u.y,100,65,0,0,7);ctx.stroke();}
 }
 ctx.restore();
}
function render(){
 const r=cv.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);if(!r.width||!r.height)return;
 const w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}
 const sx=r.width/400,sy=r.height/840;projection={sx,sy};
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#88a16d';ctx.fillRect(0,0,r.width,r.height);ctx.scale(sx,sy);ctx.translate(0,-camera);ctx.drawImage(ground,0,0,800,3920,0,0,400,1960);
 stamp(art.camps?.[battle.result==='victory'?0:1],200,620,110);
 // Flags identify sides even in a dense monochrome silhouette.
 for(const [x,y,team] of [[325,1010,battle.enemies.some(u=>u.group===2)?1:0],[45,1540,0],[340,1230,battle.enemies.some(u=>u.group===1)?1:0]]){line(x,y,x,y-38,'#665132',2);ctx.fillStyle=team?'#c74b36':'#249cd2';ctx.beginPath();ctx.moveTo(x,y-38);ctx.lineTo(x+23,y-34);ctx.lineTo(x+17,y-20);ctx.lineTo(x,y-23);ctx.fill();}
 for(const f of battle.effects.filter(e=>e.type==='fall')){ctx.save();ctx.globalAlpha=f.life/f.total*.45;ctx.translate(f.x,f.y);ctx.rotate(1.4);stamp(tinted[(f.team?'red':'blue')+'-'+f.kind],0,0,18);ctx.restore();}
 battle.units.filter(u=>u.hp>0&&u.y>camera-60&&u.y<camera+900).sort((a,b)=>(a.kind==='lord'?2:a.kind==='captain'?1:0)-(b.kind==='lord'?2:b.kind==='captain'?1:0)||a.y-b.y).forEach(u=>drawUnit(u));
 for(const s of battle.squads){
  const members=battle.units.filter(u=>u.squadId===s.id&&u.hp>0);if(!members.length||s.kind==='lord')continue;
  const captain=members.find(u=>u.id===s.captainId);
  if(s.team&&!captain)continue;
  const x=captain?captain.x:members.reduce((n,u)=>n+u.x,0)/members.length,y=captain?captain.y:members.reduce((n,u)=>n+u.y,0)/members.length;
  if(y<camera||y>camera+840)continue;
  line(x-27,y-3,x-27,y-28,'#675a3d',1.5);ctx.fillStyle=s.team?'#b63e31':'#187eaf';ctx.fillRect(x-27,y-28,18,13);label(String(s.team?s.id-3:s.id),x-18,y-18,'#fff1d1',8);
 }

 for(const f of battle.effects){const p=1-f.life/f.total;if(f.type==='cleave'){ctx.save();ctx.globalAlpha=1-p;ctx.strokeStyle=f.team?'#ff6447':'#fff0ac';ctx.lineWidth=7*(1-p)+1;ctx.beginPath();ctx.ellipse(f.x,f.y-15,f.radius*(.5+p*.5),f.radius*.55,0,f.radius>100?0:f.team?0:Math.PI,f.radius>100?Math.PI*2:f.team?Math.PI:Math.PI*2);ctx.stroke();ctx.restore();}else if(f.type==='arrow'){const x=f.x+(f.tx-f.x)*p,y=f.y+(f.ty-f.y)*p-9;line(x,y,x-(f.tx-f.x)*.07,y-(f.ty-f.y)*.07,f.team?'#ffad79':'#b6edff',1.5);}else if(f.type==='hit'){ctx.globalAlpha=1-p;line(f.x-4,f.y-9,f.x+4,f.y-17,f.team?'#ffcd97':'#daf6ff',1.5);ctx.globalAlpha=1;}}
}
async function load(){try{
 await Promise.all([['allies',5,4],['enemies',4,5],['camps',2,1]].map(async([key,col,row])=>{const im=await new Promise((resolve,reject)=>{const i=new Image;i.onload=()=>resolve(i);i.onerror=reject;i.src='../assets/toy-'+key+'.png';});art[key]=unpackAtlas(im,col,row,key!=='camps');}));
 for(const team of ['blue','red'])for(const kind of ['lord','captain','melee','bow']){
  const src=team==='blue'?art.allies[kind==='lord'?0:6]:art.enemies[kind==='captain'?3:kind==='bow'?1:0];const image=document.createElement('canvas');image.width=src.image.width;image.height=src.image.height;const c=image.getContext('2d');c.drawImage(src.image,0,0);c.globalCompositeOperation='source-atop';c.globalAlpha=team==='blue'?.36:.58;c.fillStyle=team==='blue'?'#168bd8':'#dc422e';c.fillRect(0,0,image.width,image.height);tinted[team+'-'+kind]={image,ratio:src.ratio};
 }
 $('hero-portrait').src=art.allies[0].url;ready=true;$('start').disabled=false;$('start').textContent='전투 시작';$('load').textContent='동일한 전장 · 병력 규모 비교';
 }catch(e){$('load').textContent='아트를 불러오지 못했습니다. 새로고침해 주세요.';console.error(e);}}
function frame(now){const rawDelta=(now-(prev||now))/1000,delta=Math.min(.06,rawDelta);prev=now;
 if(!document.hidden){visualTime+=delta;const t0=performance.now();if(playing&&!paused&&!battle.done){acc+=delta;while(acc>=1/30){battle.tick(1/30);acc-=1/30;}
  while(eventIndex<battle.events.length){const e=battle.events[eventIndex++];if(e.type==='command')notice('영웅 돌파 · 주변 광역 베기');if(e.type==='victory'||e.type==='defeat'){$('result').hidden=false;$('pause').hidden=true;$('outcome-sub').textContent=battle.size+'명 전장 · '+Math.round(battle.time)+'초';$('outcome').textContent=e.type==='victory'?'함께 전선을 뚫었습니다':'전선을 지키지 못했습니다';$('report').textContent='아군 생존 '+battle.allies.length+'명';}}
 }
 const cameraTarget=Math.min(camera,Math.max(160,battle.front-520));camera+=(cameraTarget-camera)*Math.min(1,delta*1.8);
 render();hud();costSamples.push(performance.now()-t0);if(costSamples.length>120)costSamples.shift();if(rawDelta>0){frameSamples.push(rawDelta);if(frameSamples.length>120)frameSamples.shift();}if(visualTime-lastReport>1){lastReport=visualTime;const avg=frameSamples.reduce((a,b)=>a+b,0)/frameSamples.length;const cpu=costSamples.reduce((a,b)=>a+b,0)/costSamples.length;$('performance').textContent=Math.round(1/avg)+'fps · '+cpu.toFixed(1)+'ms';}}
 requestAnimationFrame(frame);
}
load();hud();requestAnimationFrame(frame);
