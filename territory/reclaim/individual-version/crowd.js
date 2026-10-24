'use strict';
const $=id=>document.getElementById(id),cv=$('battle'),ctx=cv.getContext('2d');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let battle=new CrowdBattle(80),playing=false,paused=false,ready=false,prev=0,acc=0,eventIndex=0,noticeUntil=0,visualTime=0,frameSamples=[],costSamples=[],lastReport=0,camera=1010;
const art={},tinted={},buttons=[...document.querySelectorAll('[data-prison]')];
let projection={sx:1,sy:1};
function notice(text){$('notice').textContent=text;noticeUntil=visualTime+2.4;$('notice').classList.add('show');}
function reset(size=battle.size,start=false){battle=new CrowdBattle(size);camera=1010;playing=start;paused=false;acc=0;eventIndex=0;noticeUntil=0;$('notice').textContent='';costSamples=[];frameSamples=[];$('notice').classList.remove('show');$('intro').hidden=start;$('result').hidden=true;$('pause').hidden=!start;$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','전투 일시 정지');document.querySelectorAll('[data-size]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.size)===size)));hud();}
for(const b of document.querySelectorAll('[data-size]'))b.onclick=()=>reset(Number(b.dataset.size),playing);
$('start').onclick=()=>{if(ready)reset(battle.size,true);};$('replay').onclick=()=>reset(battle.size,true);
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'▶':'Ⅱ';$('pause').setAttribute('aria-label',paused?'전투 재개':'전투 일시 정지');};
buttons.forEach(b=>b.onclick=()=>{if(playing&&!paused&&!$('auto').checked)battle.rescue(Number(b.dataset.prison));});
$('auto').onchange=hud;
cv.addEventListener('pointerdown',e=>{if(!playing||paused||$('auto').checked)return;const r=cv.getBoundingClientRect(),x=(e.clientX-r.left)/projection.sx,y=(e.clientY-r.top)/projection.sy+camera;for(const p of battle.prisons)if(Math.abs(x-p.x)<48&&Math.abs(y-p.y)<55)battle.rescue(p.id);});
function hud(){
 $('allies').textContent=battle.allies.length;$('enemies').textContent=battle.enemies.length;$('captives').textContent=battle.units.filter(u=>u.captive).length;
 $('clock').textContent=Math.floor(battle.time/60)+':'+String(Math.floor(battle.time%60)).padStart(2,'0');
 buttons.forEach((b,i)=>{const p=battle.prisons[i],wait=Math.ceil(Math.max(0,battle.nextRescueAt-battle.time));b.classList.toggle('freed',p.open);b.textContent=p.open?'합류 완료':(i===0?'왼쪽':i===1?'중앙':'오른쪽')+' +'+p.count+'명'+(wait?' · '+wait+'초':'');b.disabled=!ready||!playing||paused||battle.done||p.open||wait>0||$('auto').checked;});
 $('hint').textContent=$('auto').checked?'자동 구출은 매번 6·14·22초에 같은 순서로 진행합니다.':'감옥이나 아래 버튼을 눌러 해방하세요. 구출 간격 7초.';
 if(visualTime>noticeUntil){$('notice').classList.remove('show');$('notice').textContent='';}
}
function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
function line(x,y,tx,ty,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(tx,ty);ctx.stroke();}
function label(text,x,y,color='#fff2c3',size=10){ctx.font=`700 ${size}px system-ui`;ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#2c463dbb';ctx.strokeText(text,x,y);ctx.fillStyle=color;ctx.fillText(text,x,y);}
function stamp(a,x,y,h,alpha=1){if(!a)return;ctx.save();ctx.globalAlpha*=alpha;ctx.drawImage(a.image,x-h*a.ratio*projection.sy/projection.sx/2,y-h,h*a.ratio*projection.sy/projection.sx,h);ctx.restore();}
const ground=document.createElement('canvas');ground.width=800;ground.height=3920;
function terrain(){const c=ground.getContext('2d');c.scale(2,2);c.fillStyle='#95ad76';c.fillRect(0,0,400,1960);c.fillStyle='#c7bd8c';c.beginPath();c.moveTo(120,0);c.lineTo(280,0);c.bezierCurveTo(325,700,290,1400,355,1960);c.lineTo(46,1960);c.bezierCurveTo(105,1400,78,700,120,0);c.fill();let seed=38;const rand=()=>{seed=seed*16807%2147483647;return seed/2147483647;};for(let i=0;i<2400;i++){const x=rand()*400,y=rand()*1960;c.fillStyle=i%2?'#647c4e25':'#fff1b826';c.fillRect(x,y,rand()*4+1,1.5);}for(let i=0;i<84;i++){const x=i%2?392+rand()*15:rand()*9,y=i*24;c.fillStyle='#4e744c';c.beginPath();c.ellipse(x,y,23,32,0,0,7);c.fill();c.fillStyle='#75914e';c.beginPath();c.ellipse(x-6,y-7,18,23,0,0,7);c.fill();}for(const p of battle.prisons){c.strokeStyle='#d8c590';c.lineWidth=22;c.beginPath();c.moveTo(p.x,p.y);c.quadraticCurveTo(p.x,1650,200,1530);c.stroke();}}
terrain();
function drawUnit(u,alpha=1){
 const h=u.kind==='lord'?42:u.kind==='bow'?33:34;
 const bob=u.moving&&!reduced?Math.sin(battle.time*13+u.id)*1:0;
 const attack=battle.time-(u.swingAt??-99),swing=attack<.24&&!reduced?Math.sin(attack/.24*Math.PI)*3:0;
 const base=tinted[(u.team?'red':'blue')+'-'+u.kind];
 ctx.save();ctx.globalAlpha=alpha;
 ellipse(u.x,u.y,7.5,3,u.captive?'#655c4360':u.team?'#ab372d80':'#176cbb80');
 stamp(base,u.x,u.y+bob+(u.team?swing:-swing),h);
 // Colored broad cap and shoulder panels remain legible when body sprites overlap.
 if(!u.captive){ctx.fillStyle=u.team?'#df553d':'#38b5ef';ctx.fillRect(u.x-5,u.y-h+4,10,3);}
 if(u.flash>0){ellipse(u.x,u.y-10,4,5,'#fff3ca99');}
 if(u.kind==='lord'){label('♜',u.x,u.y-h-3,'#ffe3a0',10);}
 if(!u.captive&&u.joinedAt!==undefined&&battle.time-u.joinedAt<3){ctx.strokeStyle='#b9edff';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(u.x,u.y,9,4,0,0,7);ctx.stroke();}
 ctx.restore();
}
function render(){
 const r=cv.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);if(!r.width||!r.height)return;
 const w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}
 const sx=r.width/400,sy=r.height/840;projection={sx,sy};
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#88a16d';ctx.fillRect(0,0,r.width,r.height);ctx.scale(sx,sy);ctx.translate(0,-camera);ctx.drawImage(ground,0,0,800,3920,0,0,400,1960);
 stamp(art.camps?.[battle.result==='victory'?0:1],200,520,110);
 // Flags identify sides even in a dense monochrome silhouette.
 for(const [x,y,team] of [[325,530,battle.enemies.some(u=>u.group===2)?1:0],[45,1540,0],[340,1100,battle.enemies.some(u=>u.group===1)?1:0]]){line(x,y,x,y-38,'#665132',2);ctx.fillStyle=team?'#c74b36':'#249cd2';ctx.beginPath();ctx.moveTo(x,y-38);ctx.lineTo(x+23,y-34);ctx.lineTo(x+17,y-20);ctx.lineTo(x,y-23);ctx.fill();}
 for(const p of battle.prisons){ellipse(p.x,p.y+18,43,18,'#4e63443b');ctx.fillStyle='#b59d6b';ctx.fillRect(p.x-41,p.y-23,82,62);ctx.fillStyle='#a78d60';ctx.fillRect(p.x-38,p.y-20,76,56);}
 for(const f of battle.effects.filter(e=>e.type==='fall')){ctx.save();ctx.globalAlpha=f.life/f.total*.45;ctx.translate(f.x,f.y);ctx.rotate(1.4);stamp(tinted[(f.team?'red':'blue')+'-'+f.kind],0,0,18);ctx.restore();}
 battle.units.filter(u=>u.hp>0&&u.y>camera-60&&u.y<camera+900).sort((a,b)=>a.y-b.y).forEach(u=>drawUnit(u));
 for(const p of battle.prisons){
  if(!p.open){for(let i=0;i<7;i++)line(p.x-41+i*13.6,p.y+37,p.x-41+i*13.6,p.y-24,'#59624c',2);line(p.x-43,p.y-25,p.x+43,p.y-25,'#dac18c',5);label('포로 '+p.count,p.x,p.y-34,'#ffedb1',11);}
  else{line(p.x-41,p.y-25,p.x-41,p.y+37,'#8c7650',3);line(p.x+41,p.y-25,p.x+41,p.y+37,'#8c7650',3);line(p.x+41,p.y-25,p.x+53,p.y-15,'#cab17a',3);if(battle.time-p.openedAt<3)label('+'+p.count+' 합류',p.x,p.y-34,'#c1f0ff',12);}
 }
 for(const f of battle.effects){const p=1-f.life/f.total;if(f.type==='arrow'){const x=f.x+(f.tx-f.x)*p,y=f.y+(f.ty-f.y)*p-9;line(x,y,x-(f.tx-f.x)*.07,y-(f.ty-f.y)*.07,f.team?'#ffad79':'#b6edff',1.5);}else if(f.type==='hit'){ctx.globalAlpha=1-p;line(f.x-4,f.y-9,f.x+4,f.y-17,f.team?'#ffcd97':'#daf6ff',1.5);ctx.globalAlpha=1;}}
}
async function load(){try{
 await Promise.all([['allies',5,4],['enemies',4,5],['camps',2,1]].map(async([key,col,row])=>{const im=await new Promise((resolve,reject)=>{const i=new Image;i.onload=()=>resolve(i);i.onerror=reject;i.src='../../assets/toy-'+key+'.png';});art[key]=unpackAtlas(im,col,row,key!=='camps');}));
 for(const team of ['blue','red'])for(const kind of ['lord','melee','bow']){
  const src=team==='blue'?art.allies[kind==='lord'?0:6]:art.enemies[kind==='bow'?1:0];const image=document.createElement('canvas');image.width=src.image.width;image.height=src.image.height;const c=image.getContext('2d');c.drawImage(src.image,0,0);c.globalCompositeOperation='source-atop';c.globalAlpha=team==='blue'?.36:.58;c.fillStyle=team==='blue'?'#168bd8':'#dc422e';c.fillRect(0,0,image.width,image.height);tinted[team+'-'+kind]={image,ratio:src.ratio};
 }
 ready=true;$('start').disabled=false;$('start').textContent='전투 시작';$('load').textContent='동일한 전장 · 병력 규모 비교';
 }catch(e){$('load').textContent='아트를 불러오지 못했습니다. 새로고침해 주세요.';console.error(e);}}
function frame(now){const rawDelta=(now-(prev||now))/1000,delta=Math.min(.06,rawDelta);prev=now;
 if(!document.hidden){visualTime+=delta;const t0=performance.now();if(playing&&!paused&&!battle.done){acc+=delta;while(acc>=1/30){if($('auto').checked)for(let i=0;i<3;i++)if(battle.time>=6+i*8)battle.rescue(i);battle.tick(1/30);acc-=1/30;}
  while(eventIndex<battle.events.length){const e=battle.events[eventIndex++];if(e.type==='rescue')notice('후방에서 '+e.count+'명이 합류합니다');if(e.type==='victory'||e.type==='defeat'){$('result').hidden=false;$('pause').hidden=true;$('outcome-sub').textContent=battle.size+'명 전장 · '+Math.round(battle.time)+'초';$('outcome').textContent=e.type==='victory'?'함께 전선을 뚫었습니다':'전선을 지키지 못했습니다';$('report').textContent='구출 '+battle.rescued+'명 · 아군 생존 '+battle.allies.length+'명';}}
 }
 const cameraTarget=Math.max(240,Math.min(1120,battle.front-440));camera+=(cameraTarget-camera)*Math.min(1,delta*1.8);
 render();hud();costSamples.push(performance.now()-t0);if(costSamples.length>120)costSamples.shift();if(rawDelta>0){frameSamples.push(rawDelta);if(frameSamples.length>120)frameSamples.shift();}if(visualTime-lastReport>1){lastReport=visualTime;const avg=frameSamples.reduce((a,b)=>a+b,0)/frameSamples.length;const cpu=costSamples.reduce((a,b)=>a+b,0)/costSamples.length;$('performance').textContent=Math.round(1/avg)+'fps · '+cpu.toFixed(1)+'ms';}}
 requestAnimationFrame(frame);
}
load();hud();requestAnimationFrame(frame);
