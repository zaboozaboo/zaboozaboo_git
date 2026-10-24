'use strict';
const el=id=>document.getElementById(id);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const SAVE='territory_rescue_march_v1';
let record={wins:0,gold:0};
try{const raw=JSON.parse(localStorage.getItem(SAVE));if(raw&&Number.isFinite(raw.wins)&&Number.isFinite(raw.gold))record={wins:Math.max(0,raw.wins),gold:Math.max(0,raw.gold)};}catch{}
let battle=new RescueEncounter(),playing=false,paused=false,ready=false,sound=true;
let elapsed=0,previous=0,accumulator=0,eventIndex=0,finishAt=Infinity,paid=false,momentUntil=0,lastImpactSound=0;
let camera=600,zoom=1,shake=0,viewH=500;
const art={},particles=[];
const canvas=el('scene'),ctx=canvas.getContext('2d');
const AudioFX={
 context:null,
 unlock(){try{this.context ||= new (window.AudioContext||window.webkitAudioContext)();this.context.resume().catch(()=>{});}catch{}},
 tone(hz,duration=.1,volume=.025,type='sine',delay=0){if(!sound||!this.context||document.hidden)return;const c=this.context,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(hz,t);o.frequency.exponentialRampToValueAtTime(hz*.65,t+duration);g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+duration);o.onended=()=>{o.disconnect();g.disconnect();};},
 play(kind){if(kind==='hit'){this.tone(90,.07,.016,'triangle');return;}const notes=kind==='victory'?[392,494,587,784]:kind==='rescue'?[440,554,659]:[220,330,440];notes.forEach((n,i)=>this.tone(n,.23,.035,'sine',i*.11));}
};
function saveWin(){if(paid)return;paid=true;record.wins++;record.gold+=battle.gold;try{localStorage.setItem(SAVE,JSON.stringify(record));}catch{el('load-status').textContent='저장할 수 없어 이번 기록은 유지되지 않습니다.';}}
function moment(title,sub,duration=2.7){el('moment-title').textContent=title;el('moment-sub').textContent=sub;momentUntil=elapsed+duration;el('moment').classList.add('show');}
function burst(x,y,n,color){for(let i=0;i<n;i++)particles.push({x,y,vx:Math.cos(i*2.4)* (12+i%5*9),vy:-25-i%7*9,life:.7+i%5*.15,total:1.3,color,size:2+i%3});}
function img(group,index){return art[group]?.[index];}
function stamp(group,index,x,y,h,alpha=1,flip=false){const a=img(group,index);if(!a)return;ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);ctx.globalAlpha*=alpha;ctx.drawImage(a.image,-h*a.ratio/2,-h,h*a.ratio,h);ctx.restore();}
function label(t,x,y,size=12,color='#fdf2d2'){ctx.font=`700 ${size}px system-ui`;ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#294735b0';ctx.strokeText(t,x,y);ctx.fillStyle=color;ctx.fillText(t,x,y);}
function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
function line(x1,y1,x2,y2,color,width=2){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
function flag(x,y,blue,time){line(x,y,x,y-65,'#674b32',4);ctx.fillStyle=blue?'#448cb7':'#c45d40';ctx.beginPath();ctx.moveTo(x+2,y-65);ctx.quadraticCurveTo(x+20,y-70+Math.sin(time*3)*3,x+35,y-58);ctx.lineTo(x+29,y-39);ctx.quadraticCurveTo(x+16,y-49+Math.sin(time*3)*3,x+2,y-44);ctx.closePath();ctx.fill();ctx.fillStyle='#f7d68b';ctx.fillRect(x+12,y-59,5,12);ctx.fillRect(x+8,y-55,13,4);ellipse(x,y-68,3,4,'#f0cc82');}
// Quiet, painted-looking field beneath the original toy-style units.
const ground=document.createElement('canvas');ground.width=720;ground.height=2300;
function paintGround(){const c=ground.getContext('2d');c.scale(2,2);const g=c.createLinearGradient(0,0,360,1150);g.addColorStop(0,'#8fa96b');g.addColorStop(.45,'#adc285');g.addColorStop(1,'#8eac79');c.fillStyle=g;c.fillRect(0,0,360,1150);
 c.strokeStyle='#768f5b';c.lineWidth=128;c.lineCap='round';c.beginPath();c.moveTo(185,1100);c.bezierCurveTo(248,680,126,470,181,150);c.stroke();c.strokeStyle='#d7c18d';c.lineWidth=112;c.stroke();c.strokeStyle='#e1cb98';c.lineWidth=80;c.stroke();
 c.strokeStyle='#d7c18d';c.lineWidth=52;c.beginPath();c.moveTo(70,470);c.lineTo(185,530);c.stroke();
 let seed=721;const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 for(let i=0;i<650;i++){const x=rand()*360,y=rand()*1150;c.fillStyle=i%3?'#819c5a55':'#e7d5a155';c.beginPath();c.ellipse(x,y,1+rand()*3,1,0,0,7);c.fill();}
 for(let i=0;i<65;i++){const y=60+i*14,x=160+Math.sin(y*.009)*20+(rand()-.5)*75;c.fillStyle=i%2?'#c1ad7e':'#ead6a0';c.beginPath();c.ellipse(x,y,2+rand()*6,1+rand()*2,rand(),0,7);c.fill();}
 for(let i=0;i<34;i++){const x=i%2?340+rand()*30:-12+rand()*30,y=30+i*34;
 c.fillStyle='#33554435';c.beginPath();c.ellipse(x+9,y+18,32,12,0,0,7);c.fill();c.fillStyle='#70563a';c.fillRect(x-4,y-18,8,35);
 for(const [dx,dy,r] of [[0,-30,31],[-15,-17,23],[17,-16,24],[0,-8,26]]){c.fillStyle=dy===-30?'#567b4c':dx<0?'#4b7246':'#63864c';c.beginPath();c.arc(x+dx,y+dy,r,0,7);c.fill();c.fillStyle='#92a65c66';c.beginPath();c.arc(x+dx-6,y+dy-8,r*.65,3.4,5.6);c.fill();}}
}
paintGround();
function cage(prison){
 const {x,y,count,opened}=prison;
 ellipse(x,y+6,48,13,'#36513830');
 line(x-40,y,x-40,y-65,'#806841',5);line(x+40,y+7,x+40,y-58,'#806841',5);
 line(x-40,y-65,x+40,y-58,'#b79a60',7);
 if(!opened){
   for(let i=0;i<count;i++){
     const u={id:i,heroId:'militia',moving:false,flash:0,meleeDuration:.75};
     ctx.save();ctx.translate(x+(i-(count-1)/2)*29,y-5);MilitiaCombat.paint(ctx,u,0,33,true);ctx.restore();
   }
   for(let i=0;i<6;i++)line(x-40+i*16,y,x-40+i*16,y-61,'#606553',3);
   line(x-40,y,x+40,y+7,'#80633d',5);
   ctx.fillStyle='#dfb566';ctx.fillRect(x-5,y-32,11,14);
   label('포로 '+count+'명',x,y-78,11,'#ffe19b');
 }else{
   line(x+40,y-58,x+57,y-41,'#b79a60',5);line(x+40,y+7,x+57,y+24,'#806841',5);
   for(let i=0;i<4;i++)line(x+40+i*6,y-58+i*6,x+40+i*6,y+7+i*6,'#66705a',2);
   if(battle.time-prison.openedAt<2)label('합류 +'+count,x,y-77,14,'#f8edaa');
 }
}

function unit(u,opacity=1){
 ctx.save();ctx.globalAlpha=opacity;
 const lord=u.kind==='lord',height=lord?57:u.kind==='captain'?47:39;
 ellipse(u.x,u.y, lord?18:13,lord?6:4,u.team?'#3d33283b':'#2d58423b');
 if(u.team===0){ctx.strokeStyle=lord?'#f9df8a90':'#81c9e280';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(u.x,u.y, lord?19:14,6,0,0,7);ctx.stroke();}
 const swing=battle.time-(u.meleeStartedAt??-99),attack=swing>=0&&swing<.5;
 const bob=!reduced&&u.moving?Math.sin(battle.time*10+u.id)*1.7:0;
 ctx.save();ctx.translate(u.x,u.y+bob);
 if(u.kind==='militia'){if(u.face<0)ctx.scale(-1,1);MilitiaCombat.paint(ctx,u,battle.time,height,reduced);}
 else{const a=img(u.team?'enemies':'allies',u.team?(u.kind==='bow'?1:u.kind==='captain'?3:0):0);if(a){if(!reduced&&attack){ctx.rotate(Math.sin(swing/.5*Math.PI)*.09*(u.team?-1:1));ctx.translate(0,-Math.sin(swing/.5*Math.PI)*4);}ctx.drawImage(a.image,-height*a.ratio/2,-height,height*a.ratio,height);if(u.flash>0){ctx.globalAlpha*=u.flash/.14*.7;ctx.drawImage(a.flash,-height*a.ratio/2,-height,height*a.ratio,height);}}}
 ctx.restore();
 if(attack&&u.kind!=='militia'&&u.kind!=='bow'){ctx.strokeStyle=u.team?'#f5ce9e':'#fff1bf';ctx.lineWidth=3;ctx.beginPath();ctx.arc(u.x,u.y-22,24,-2.7+swing*6,-1.9+swing*6);ctx.stroke();}
 if(u.team===1||lord||u.hp/u.maxHp<.45){ctx.fillStyle='#283f35';ctx.fillRect(u.x-16,u.y-height-8,32,4);ctx.fillStyle=u.team?'#df8065':'#88cde0';ctx.fillRect(u.x-15,u.y-height-7,30*Math.max(0,u.hp/u.maxHp),2);}
 if(u.joinedAt!==undefined&&battle.time-u.joinedAt<2.2){ctx.strokeStyle='#ffe6a1';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(u.x,u.y,22,8,0,0,7);ctx.stroke();label('합류',u.x,u.y-height-12,10,'#fff2a3');}
 if(lord)label('영주',u.x,u.y-height-13,9,'#fff0b8');
 if(u.team===0&&battle.time<battle.skillUntil){ctx.strokeStyle='#ffe69c';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(u.x,u.y,20,8,0,0,7);ctx.stroke();}
 ctx.restore();
}
function render(dt){
 const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
 const dpr=Math.min(devicePixelRatio||1,2),w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 const scale=w/360;viewH=h/scale;
 const alive=battle.alive;
 let focus=alive.length?alive.reduce((n,u)=>n+u.y,0)/alive.length-85:210;
 if(battle.done)focus=210;
 const desired=Math.max(0,Math.min(760,focus-viewH*.52));
 camera+=(desired-camera)*Math.min(1,dt*(reduced?20:2.4));
 zoom=1;
 shake=Math.max(0,shake-dt);ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,360,viewH);ctx.save();
 if(!reduced&&shake)ctx.translate(Math.sin(elapsed*90)*shake*8,Math.cos(elapsed*70)*shake*5);
 ctx.translate(180,viewH*.5);ctx.scale(zoom,zoom);ctx.translate(-180,-viewH*.5-camera);
 ctx.drawImage(ground,0,0,720,2300,0,0,360,1150);
 // Outpost ownership changes in place after the victory, not in a separate map.
 if(battle.phase==='victory'){const fade=Number.isFinite(finishAt)?Math.min(1,(elapsed-(finishAt-3.2))/1.2):1;stamp('camps',1,180,190,155,1-fade);stamp('camps',0,180,190,155,fade);}else stamp('camps',1,180,190,155);
 flag(277,190,battle.phase==='victory',elapsed);
 if(battle.phase==='assault'){ctx.fillStyle='#3f3c2e';ctx.fillRect(128,195,104,6);ctx.fillStyle='#cc7357';ctx.fillRect(130,197,100*battle.campHp/battle.campMax,2);}
 if(battle.phase==='victory')label('우리의 거점',180,208,12,'#fff0ad');
 for(const prison of battle.prisons)cage(prison);
 for(const f of battle.effects.filter(e=>e.type==='fall'))unit(f.unit,f.life/f.total*.65);
 [...battle.units].sort((a,b)=>a.y-b.y).forEach(u=>unit(u));
 for(const f of battle.effects){const p=1-f.life/f.total;if(f.type==='hit'){
   ctx.globalAlpha=1-p;ctx.strokeStyle='#fff1b0';ctx.lineWidth=2;for(let i=0;i<5;i++){const a=i*1.256;line(f.x+Math.cos(a)*6,f.y-20+Math.sin(a)*6,f.x+Math.cos(a)*(10+p*14),f.y-20+Math.sin(a)*(10+p*14),'#fff1bd',2);}ctx.globalAlpha=1;
   if(f.team===0&&!battle.effects.some(other=>other!==f&&other.type==='hit'&&other.life>f.life&&Math.hypot(other.x-f.x,other.y-f.y)<20))label(String(f.damage),f.x,f.y-43-p*17,11,'#fff0ab');
 }else if(f.type==='arrow'){const x=f.x+(f.tx-f.x)*p,y=f.y+(f.ty-f.y)*p-25;line(x,y,x-(f.tx-f.x)*.12,y-(f.ty-f.y)*.12,'#f5e3b8',2);}else if(f.type==='rally'){ctx.globalAlpha=1-p;ctx.strokeStyle='#ffe4a1';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(f.x,f.y,35+p*100,12+p*40,0,0,7);ctx.stroke();ctx.globalAlpha=1;}}
 for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/p.total);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);}ctx.globalAlpha=1;
 // Warm sunlight and edge shade tie the reused sprites into the scene.
 const light=ctx.createRadialGradient(100,camera+70,0,100,camera+70,350);light.addColorStop(0,'#fff2bd22');light.addColorStop(1,'#fff2bd00');ctx.fillStyle=light;ctx.fillRect(0,camera,360,viewH);
 ctx.restore();const shade=ctx.createLinearGradient(0,0,360,0);shade.addColorStop(0,'#20473435');shade.addColorStop(.18,'#20473400');shade.addColorStop(.82,'#20473400');shade.addColorStop(1,'#20473435');ctx.fillStyle=shade;ctx.fillRect(0,0,360,viewH);
}
function events(){while(eventIndex<battle.events.length){const event=battle.events[eventIndex++];if(event.type==='impact'){if(elapsed-lastImpactSound>.08){AudioFX.play('hit');lastImpactSound=elapsed;}if(event.team===0)shake=.07;}if(event.type==='rescue'){AudioFX.play('rescue');burst(event.x,event.y,22,'#fff0ad');moment('민병 +'+event.count+'명 합류',event.total<4?'함께 다음 포로를 구하러 갑니다':'이제 함께 거점을 되찾습니다',1.8);el('militia-card').classList.remove('locked');el('militia-card').classList.add('joined');el('speech').hidden=true;}if(event.type==='kill'){burst(event.x,event.y-20,7,'#eaca79');AudioFX.play('hit');}if(event.type==='skill'){AudioFX.play('skill');moment('돌격 명령','4초간 공격력 · 이동속도 증가',1.5);}if(event.type==='victory'){finishAt=elapsed+3.2;saveWin();AudioFX.play('victory');burst(180,160,50,'#ffe398');moment('햇살 숲 탈환','우리의 깃발이 다시 올랐습니다',3);}if(event.type==='defeat'){finishAt=elapsed+1.4;moment('다시 일어설 시간','돌격 명령으로 부대를 지원해 보세요',2);}}}
function hud(){
 const militia=battle.alive.filter(u=>u.kind==='militia').length;
 el('army-count').textContent=battle.alive.length;
 el('lord-card').parentElement.querySelector('strong').textContent=battle.alive.some(u=>u.kind==='lord')?'1':'0';
 el('militia-count').textContent=battle.rescued?militia:'🔒';el('militia-label').textContent=battle.rescued?'민병대':'구출 대기';
 el('formation-status').textContent=battle.done?(battle.phase==='victory'?'민병 막사 확보':'전투 종료'):battle.rescued?'구출 '+battle.rescued+'/4 · 함께 진군 중':'영주 홀로 출전';
 el('gold').textContent=paid?record.gold:record.gold+battle.gold;
 el('goal-1').textContent='구출 '+battle.rescued+'/4';el('goal-1').className=battle.rescued===4?'done':'active';
 el('goal-2').textContent='군대 '+battle.alive.length+'명';el('goal-2').className=battle.rescued?'done':'';
 el('goal-3').className=battle.phase==='victory'?'done':battle.phase==='assault'?'active':'';
 el('chapter-state').textContent=battle.phase==='victory'?'거점 확보':battle.rescued?'민병과 함께 진군':'첫 번째 탈환';
 const lord=battle.units.find(u=>u.kind==='lord');el('skill').disabled=!!battle.done||battle.skillCooldown>0||!lord;
 el('skill-time').textContent=battle.skillCooldown>0?Math.ceil(battle.skillCooldown)+'초':lord?'사용 가능':'영주 전사';
 if(elapsed>momentUntil)el('moment').classList.remove('show');
}
function showResult(){el('victory').hidden=false;el('skill-wrap').hidden=true;el('battle-tools').hidden=true;
 const win=battle.phase==='victory';document.querySelector('.spoils span:first-child').hidden=!win;el('end-title').textContent=win?'우리의 땅을 되찾았습니다':'다시, 깃발을 들어주세요';el('end-sub').textContent=win?'햇살 숲 · 첫 거점':'포로 야영지 · 재도전';el('reward-gold').textContent=win?'골드 +'+battle.gold:'획득 보상 없음';el('continue').textContent=win?'내 거점 보기 →':'다시 도전 →';}
function start(){if(!ready)return;AudioFX.unlock();battle=new RescueEncounter();playing=true;paused=false;eventIndex=0;accumulator=0;paid=false;finishAt=Infinity;particles.length=0;el('intro').hidden=true;el('victory').hidden=true;el('skill-wrap').hidden=false;el('battle-tools').hidden=false;el('speech').hidden=true;el('militia-card').classList.add('locked');el('militia-card').classList.remove('joined');el('pause').textContent='Ⅱ';el('pause').setAttribute('aria-label','전투 일시 정지');moment('민병들을 구출하세요','햇살 숲 · 포로 야영지',2.3);}
el('start').onclick=start;el('skill').onclick=()=>{AudioFX.unlock();battle.skill();};el('pause').onclick=()=>{paused=!paused;el('pause').textContent=paused?'▶':'Ⅱ';el('pause').setAttribute('aria-label',paused?'전투 재개':'전투 일시 정지');};el('sound').onclick=()=>{sound=!sound;el('sound').textContent=sound?'♪':'×♪';};
function panel(type){
 const titles={army:'함께 싸우는 군대',kingdom:'나의 왕국',growth:'이번 탈환의 성장',settings:'플레이 설정'};el('sheet-title').textContent=titles[type];
 const rescued=battle.rescued>0,won=battle.phase==='victory'||record.wins>0;
 const content={
 army:`<div class="sheet-row"><img src="${img('allies',0)?.url||''}" alt="영주"><div><b>기사 영주 · Lv.1</b><p>돌격 명령으로 아군의 공격과 진군을 돕습니다.</p></div></div><div class="sheet-row"><img src="${img('allies',6)?.url||''}" alt="민병"><div><b>${rescued?'구출한 민병 '+battle.rescued+'명':'포로로 잡힌 민병 4명'}</b><p>${rescued?'구출되자마자 다음 포로를 구하는 전투에 함께합니다.':'경비병을 쓰러뜨리면 전장에 바로 합류합니다.'}</p></div></div>`,
 kingdom:`<div class="kingdom-art"><img src="${img('camps',won?0:1)?.url||''}" alt="${won?'되찾은 아군 거점':'점령된 야영지'}"><b>${won?'햇살 숲 · 나의 첫 거점':'아직 적의 깃발 아래 있습니다'}</b></div><p>${won?'민병 막사를 되찾았습니다. 이곳이 내 군대의 시작입니다.':'포로를 구하고 야영지를 탈환하세요.'}</p>${won?'<button id="replay">구출 전투 다시 하기</button>':''}`,
 growth:`<div class="sheet-row"><img src="${img('buildings',2)?.url||''}" alt="민병 막사"><div><b>민병 막사 ${won?'확보':'탈환 보상'}</b><p>이번 장면에서는 구출과 합류, 거점 확보까지 플레이합니다.</p></div></div><p class="muted">배럭 강화와 이후 지역은 이전 비교판에 남겨두었습니다.</p><a href="../prototype.html">이전 비교판 열기 →</a>`,
 settings:`<button id="toggle-sound">소리 ${sound?'끄기':'켜기'}</button><button id="replay">처음부터 다시 플레이</button><a href="../../index.html" target="_blank" rel="noopener">기존 게임 열기 ↗</a><a href="../formation-version/">이전 4명 일괄 구출판 →</a><a href="../prototype.html">이전 탈환 테스트 열기 →</a><p class="muted">이 장면의 기록은 별도로 저장됩니다. 기존 게임과 이전 테스트의 진행은 바뀌지 않습니다.</p>`
 };el('sheet-content').innerHTML=content[type];el('sheet').showModal();
 if(el('replay'))el('replay').onclick=()=>{el('sheet').close();start();};if(el('toggle-sound'))el('toggle-sound').onclick=()=>{sound=!sound;el('toggle-sound').textContent='소리 '+(sound?'끄기':'켜기');el('sound').textContent=sound?'♪':'×♪';};
}
document.querySelectorAll('[data-panel]').forEach(b=>b.onclick=()=>panel(b.dataset.panel));el('settings').onclick=()=>panel('settings');el('close-sheet').onclick=()=>el('sheet').close();el('continue').onclick=()=>{if(battle.phase==='victory')panel('kingdom');else start();};
async function load(){
 let count=0;const files=[['allies','toy-allies',5,4],['enemies','toy-enemies',4,5],['buildings','toy-buildings',4,3],['camps','toy-camps',2,1]];
 try{await Promise.all(files.map(async([key,file,cols,rows])=>{const image=await new Promise((resolve,reject)=>{const im=new Image;im.onload=()=>resolve(im);im.onerror=()=>reject(Error(file));im.src='../../assets/'+file+'.png';});art[key]=unpackAtlas(image,cols,rows,key!=='camps');count++;el('load-status').textContent=`전장 준비 ${Math.round(count/5*100)}%`;}));await MilitiaCombat.load();if(!MilitiaCombat.ready)throw Error('민병 애니메이션');
 for(const id of ['lord-portrait','lord-card'])el(id).src=img('allies',0).url;for(const id of ['militia-icon','reward-unit'])el(id).src=img('allies',6).url;
 ready=true;el('start').disabled=false;el('start').textContent='민병 구출하기';el('load-status').textContent='한 번의 전투 · 기존 진행과 별도';
 }catch(e){el('load-status').textContent='아트를 불러오지 못했습니다. 새로고침해 주세요.';console.error(e);}
}
function frame(now){const dt=Math.min(.06,(now-(previous||now))/1000);previous=now;
 if(!document.hidden){elapsed+=dt;if(playing&&!paused&&!el('sheet').open&&!battle.done){accumulator+=dt;while(accumulator>=1/60){battle.tick(1/60);accumulator-=1/60;}events();}
 for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=90*dt;}for(let i=particles.length-1;i>=0;i--)if(particles[i].life<=0)particles.splice(i,1);
 if(elapsed>=finishAt){finishAt=Infinity;showResult();}render(dt);hud();}
 requestAnimationFrame(frame);
}
load();requestAnimationFrame(frame);
