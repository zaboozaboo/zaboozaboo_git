'use strict';
const $=id=>document.getElementById(id),cv=$('battle'),ctx=cv.getContext('2d');
let battle=new DiceBattle(),production=true,playing=false,paused=false,ready=false,camera=500,last=0,acc=0,eventIndex=0,noticeEnd=0;
const art={},paint={};let view={scale:1,height:700};bindProduction(battle);
function reset(enabled=production,start=true){production=enabled;battle=new DiceBattle();bindProduction(battle);playing=start;paused=false;acc=0;eventIndex=0;camera=500;$('intro').hidden=start;$('result').hidden=true;$('pause').hidden=!start;$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','전투 일시 정지');$('notice').classList.remove('show');$('roll-result').textContent=enabled?'눈금만큼 모든 부대 충전':'시작 병력만으로 전투';document.querySelectorAll('[data-production]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.production==='true')===enabled)));hud();}
for(const b of document.querySelectorAll('[data-production]'))b.onclick=()=>reset(b.dataset.production==='true',playing);
$('start').onclick=()=>ready&&reset(production,true);$('replay').onclick=()=>reset();
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'▶':'Ⅱ';$('pause').setAttribute('aria-label',paused?'전투 재개':'전투 일시 정지');};
$('roll').onclick=()=>{if(playing&&!paused&&production)manualRoll();};
function hud(){
 const army=battle.allies,marching=army.filter(u=>u.marching).length;
 $('allies').textContent=army.length;$('enemies').textContent=battle.enemies.length;$('hp').textContent=Math.ceil(Math.max(0,battle.hero.hp));$('arrival').textContent=`전선 ${army.length-marching}명 · 행군 ${marching}명 · 누적 생산 ${battle.produced}명`;$('elapsed').textContent=Math.floor(battle.time)+'초';
 const rolling=playing&&!paused&&!battle.done&&production&&(B.openingDice>0||S.dice.progress>.88&&S.dice.progress<1),face=rolling?Math.floor(performance.now()/90)%6+1:S.dice.last?.face||1;
 if($('face').dataset.face!==String(face)){$('face').innerHTML=dieFace(face);$('face').dataset.face=String(face);}$('roll').classList.toggle('rolling',rolling);const available=S.dice.progress>=1;
 $('roll').disabled=!ready||!playing||paused||battle.done||!production||!available;$('roll').classList.toggle('ready',available&&production);
 $('roll-state').textContent=!playing?'전투 대기':paused?'일시 정지':!production?'생산 중지':rolling?'굴리는 중':available?'눌러서 굴리기':`다음 ${Math.ceil((1-S.dice.progress)*diceCooldown())}초`;
 for(const id of ['militia','archer']){const cost=productionCost(id),charge=S.dice.charge[id]||0,count=slotAlive(0,id==='militia'?0:1,id);$(id+'-progress').value=charge;$(id+'-count').textContent=count+'/'+heroCap(id);$(id+'-charge').textContent=`${charge} / ${cost} 충전`+(count>=heroCap(id)?' · 정원 가득':'');}
 if(battle.time>noticeEnd)$('notice').classList.remove('show');
}
function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
function label(text,x,y,color='#fff3d3',size=13){ctx.font=`700 ${size}px system-ui`;ctx.textAlign='center';ctx.strokeStyle='#293c37';ctx.lineWidth=3;ctx.strokeText(text,x,y);ctx.fillStyle=color;ctx.fillText(text,x,y);}
function stamp(a,x,y,h,alpha=1){if(!a)return;ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(a.image,x-h*a.ratio/2,y-h,h*a.ratio,h);ctx.restore();}
function drawUnit(u){const h=u.kind==='hero'?62:u.kind==='boss'?76:34;const a=u.kind==='hero'?art.allies?.[0]:u.kind==='boss'?art.enemies?.[3]:paint[(u.team?'red':'blue')+'-'+u.kind];ellipse(u.x,u.y,u.kind==='boss'?22:10,5,u.team?'#9c34296e':'#1169a780');const bob=u.moving?Math.sin(battle.time*14+u.id)*2:0;stamp(a,u.x,u.y+bob,h);if(u.kind==='shield'){ctx.fillStyle='#c0a16c';ctx.fillRect(u.x-10,u.y-17,20,6);}
 if(u.joinedAt!==null&&u.joinedAt!==undefined&&battle.time-u.joinedAt<2.5){ctx.strokeStyle='#b8f6ff';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(u.x,u.y,14,7,0,0,Math.PI*2);ctx.stroke();label('합류',u.x,u.y-h-12,'#c9faff',10);}
 if(u.marching){ctx.strokeStyle='#b5f2ff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(u.x,u.y+5);ctx.lineTo(u.x,u.y+20);ctx.stroke();}
 if(u.flash>0)ellipse(u.x,u.y-18,6,9,'#fff2cf99');
 if(u.hp<u.maxHp){ctx.fillStyle='#3c4033';ctx.fillRect(u.x-14,u.y-h-7,28,4);ctx.fillStyle=u.team?'#f3956e':'#81d6ef';ctx.fillRect(u.x-14,u.y-h-7,28*Math.max(0,u.hp/u.maxHp),4);}
 if(u.kind==='hero'||u.kind==='boss'){label(u.kind==='hero'?'기사 영주':'적 군단장',u.x,u.y-h-14,u.team?'#ffb29b':'#ffe39a');ctx.strokeStyle=u.team?'#fd795f':'#ffdf83';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(u.x,u.y,19,9,0,0,Math.PI*2);ctx.stroke();}
 if(u.chargeUntil>battle.time&&u.kind!=='hero'){ctx.strokeStyle='#c7f4ff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(u.x,u.y);ctx.lineTo(u.x-u.chargeDir.x*23,u.y-u.chargeDir.y*23);ctx.stroke();}
 if(battle.time-(u.swingAt??-10)<.16){ctx.strokeStyle=u.team?'#ffad76':'#f2faff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(u.x,u.y-12,20,-2.8,-.2);ctx.stroke();}}
function render(){const r=cv.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);if(!r.width||!r.height)return;const width=Math.round(r.width*dpr),height=Math.round(r.height*dpr);if(cv.width!==width||cv.height!==height){cv.width=width;cv.height=height;}const scale=r.width/600;view={scale,height:r.height/scale};camera=Math.max(0,Math.min(1100-view.height+40,battle.hero.y-view.height*.72));ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#97ac73';ctx.fillRect(0,0,r.width,r.height);ctx.scale(scale,scale);ctx.translate(0,-camera);
 ctx.fillStyle='#bdb78b';ctx.beginPath();ctx.moveTo(190,0);ctx.bezierCurveTo(440,350,100,700,245,1100);ctx.lineTo(420,1100);ctx.bezierCurveTo(230,700,560,350,340,0);ctx.fill();
 for(let i=0;i<140;i++){const x=(i*137%570)+15,y=(i*223%1100);if(x<60||x>545)ellipse(x,y,13,20,'#557a4c');else{ctx.fillStyle='#6f8b5338';ctx.fillRect(x,y,3,3);}}
 for(let i=0;i<battle.groups.length;i++){const g=battle.groups[i],alive=battle.enemies.some(u=>u.group===i);ctx.strokeStyle=alive?'#a4524560':'#5c9ab355';ctx.lineWidth=2;ctx.setLineDash([7,8]);ctx.beginPath();ctx.ellipse(g.x,g.y+25,95,75,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);label(alive?g.name:'돌파 완료',g.x,g.y-65,alive?'#f8e4b7':'#d2efff',12);}
 const b=battle.boss;if(b.hp>0&&b.windup){const t=(b.windup.until-battle.time)/1.15;ellipse(b.windup.x,b.windup.y,90,90,'#dd402840');ctx.strokeStyle='#ff6547';ctx.lineWidth=4;ctx.beginPath();ctx.arc(b.windup.x,b.windup.y,90,0,Math.PI*2);ctx.stroke();ellipse(b.windup.x,b.windup.y,90*(1-t),90*(1-t),'#ff624b55');label('충격파',b.windup.x,b.windup.y-95,'#ffe3ca',14);}
 const h=battle.hero,f=battle.facing;ctx.strokeStyle='#fff3b9aa';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(h.x+f.x*32,h.y+f.y*32);ctx.lineTo(h.x+f.x*86,h.y+f.y*86);ctx.lineTo(h.x+f.x*70-f.y*10,h.y+f.y*70+f.x*10);ctx.moveTo(h.x+f.x*86,h.y+f.y*86);ctx.lineTo(h.x+f.x*70+f.y*10,h.y+f.y*70-f.x*10);ctx.stroke();
 for(const e of battle.effects){if(e.type==='fall')stamp(paint[(e.team?'red':'blue')+'-'+e.kind],e.x,e.y,24,e.life/e.total*.5);}
 battle.units.filter(u=>u.hp>0).sort((a,b)=>(a.kind==='hero'?1:0)-(b.kind==='hero'?1:0)||a.y-b.y).forEach(drawUnit);
 for(const p of battle.projectiles){const t=1-p.life/p.total,x=p.x+(p.tx-p.x)*t,y=p.y+(p.ty-p.y)*t;ctx.strokeStyle=p.team?'#ffca92':'#d3f6ff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-(p.tx-p.x)*.04,y-(p.ty-p.y)*.04);ctx.stroke();}
 for(const e of battle.effects){const t=1-e.life/e.total;if(e.type==='order'){ctx.globalAlpha=1-t;ctx.strokeStyle='#ffe8a0';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(e.x-e.dy*50,e.y+e.dx*50);ctx.lineTo(e.x+e.dx*110,e.y+e.dy*110);ctx.lineTo(e.x+e.dy*50,e.y-e.dx*50);ctx.stroke();ctx.globalAlpha=1;}else if(e.type==='smash'){ctx.strokeStyle='#ffd197';ctx.lineWidth=5*(1-t);ctx.beginPath();ctx.arc(e.x,e.y,t*100,0,Math.PI*2);ctx.stroke();}}

}
async function load(){try{await Promise.all([['allies',5,4],['enemies',4,5]].map(async([key,cols,rows])=>{const image=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src='../../assets/toy-'+key+'.png';});art[key]=unpackAtlas(image,cols,rows,true);}));for(const team of ['blue','red'])for(const kind of ['melee','bow','shield']){const src=team==='blue'?art.allies[kind==='bow'?7:6]:art.enemies[kind==='bow'?1:0],image=document.createElement('canvas');image.width=src.image.width;image.height=src.image.height;const c=image.getContext('2d');c.drawImage(src.image,0,0);c.globalCompositeOperation='source-atop';c.globalAlpha=.35;c.fillStyle=team==='blue'?'#168fd7':'#e04d32';c.fillRect(0,0,image.width,image.height);paint[team+'-'+kind]={image,ratio:src.ratio};}ready=true;$('start').disabled=false;$('start').textContent='전투 시작';}catch(e){$('start').textContent='아트 로드 실패';console.error(e);}}

function animateCharge(event){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const source=$('face').getBoundingClientRect();
 for(const r of event.results){const target=$(r.id+'-card').getBoundingClientRect(),token=document.createElement('span');token.className='charge-flight';token.textContent='+'+event.face;token.style.left=(source.left+source.width/2)+'px';token.style.top=(source.top+source.height/2)+'px';document.body.append(token);const motion=token.animate([{transform:'translate(-50%,-50%) scale(.7)',opacity:0},{opacity:1,offset:.15},{transform:`translate(${target.left+target.width/2-source.left-source.width/2}px,${target.top+15-source.top-source.height/2}px) scale(1.1)`,opacity:0}],{duration:600,easing:'ease-out'});motion.finished.then(()=>token.remove(),()=>token.remove());}
}
function frame(now){const delta=Math.min(.08,(now-(last||now))/1000);last=now;
 if(playing&&!paused&&!battle.done&&!document.hidden){acc+=delta;while(acc>=1/60){stepProduction(1/60,production,$('auto').checked);battle.tick(1/60);acc-=1/60;}
  while(eventIndex<battle.events.length){const e=battle.events[eventIndex++];
   if(e.type==='roll'){animateCharge(e);$('roll-result').textContent=`${e.face} 눈금 · 두 부대 +${e.face} 충전`;$('notice').textContent=e.count?`+${e.count}명 후방 출진`:'충전 누적 · 다음 생산 준비';$('notice').classList.add('show');noticeEnd=battle.time+2;for(const r of e.results)if(r.count){const card=$(r.id+'-card');card.classList.remove('launched');void card.offsetWidth;card.classList.add('launched');}}
  }
  if(battle.done){$('result').hidden=false;$('outcome').textContent=battle.result==='victory'?'합류한 군대로 돌파':'전선이 무너졌습니다';$('report').textContent=`${Math.floor(battle.time)}초 · 생산 ${battle.produced}명 · 생존 ${battle.allies.length}명`;}
 }
 render();hud();requestAnimationFrame(frame);
}
load();hud();requestAnimationFrame(frame);
