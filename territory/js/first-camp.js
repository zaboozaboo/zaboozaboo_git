'use strict';
function preparingFirstExpedition(){return S?.firstExpedition===false;}
function prepareFirstExpedition(){
 S.learning={version:1,intro:{}};
 S.firstExpedition=false;S.territoryTutorial='waiting';S.firstRecruit=false;S.heroes={};S.slots=[null,null,null,null,null];
 S.dice={history:[],progress:0,charge:{}};
}
function recruitFirstCompanion(){
 if(!preparingFirstExpedition()||S.firstRecruit||S.daily.freeSummon<=0)return false;
 // The first daily free recruitment guarantees Hans and consumes the normal free pull.
 S.daily.freeSummon--;
 if(!S.heroes.militia)S.heroes.militia={level:1,stars:1,shards:0};
 S.firstRecruit=true;S.stats.summons++;saveGame();return true;
}
function firstCampStep(){return !S.heroes.militia?'recruit':S.slots[0]==='militia'?'depart':'place';}
function launchFirstExpedition(){
 if(!preparingFirstExpedition()||firstCampStep()!=='depart')return false;
 S.firstExpedition=true;S.battleTutorial='pending';saveGame();startStage(1);beginFirstBattleGuide();return true;
}
function refreshFirstCamp(){
 const game=document.getElementById('game'),waiting=preparingFirstExpedition();game.classList.toggle('first-camp-mode',waiting);
 document.querySelectorAll('.tutorial-target').forEach(el=>el.classList.remove('tutorial-target'));
 let host=document.getElementById('first-camp');
 if(!waiting){host?.remove();refreshTutorialUnitMarker();refreshTutorialSpotlight();return;}
 const step=firstCampStep();game.dataset.firstStep=step;
 if(!host){host=document.createElement('section');host.id='first-camp';document.getElementById('lobby').prepend(host);}
 const key=step+S.lord.cls+S.lord.gender;
 if(host.dataset.key!==key){host.dataset.key=key;
 host.innerHTML=`<header><small>첫 원정 · 햇살 숲</small><h2>작은 캠프에서<br>시작되는 나의 왕국</h2></header><div class="journey-track" aria-label="원정 준비"><span class="done">영주</span><i></i><span class="${step!=='recruit'?'done':''}">동료</span><i></i><span class="${step==='depart'?'done':''}">편성</span><i></i><span>원정</span></div><div class="journey-scene">${buildingArt(2)}<div class="journey-lord lord-art" data-tier="0"></div><div class="journey-companion ${step==='depart'?'joined':''}">${step==='depart'?heroArt('militia'):'<span>동료의 자리</span>'}</div><div class="journey-banner">햇살 숲으로 향하는 원정대</div></div><div class="journey-order"><small>${step==='recruit'?'01 · 동료를 만나세요':step==='place'?'02 · 원정대를 편성하세요':'준비 완료'}</small><b>${step==='recruit'?'첫 동료가 영주님의 부름을 기다립니다':step==='place'?'한스를 전열에 배치해 주세요':'한스가 선두에서 길을 엽니다'}</b></div>${step==='depart'?'<button class="btn gold" id="first-expedition-go">첫 원정 출발 <span>→</span></button>':`<div class="journey-tab-hint">아래 <b>${step==='recruit'?'영입':'편성'}</b> 탭을 눌러주세요 <span>↓</span></div>`}`;
 setLordArt(host.querySelector('.lord-art'),S.lord.cls,S.lord.gender);
 const go=host.querySelector('#first-expedition-go');if(go)go.onclick=()=>{if(launchFirstExpedition()){UI.closeSheet();MobileShell.show('battle');UI.refresh();}};
 }
 refreshTutorialSpotlight();
}

let firstTutorialBusy=false;
function tutorialInstruction(){
 if(firstBattlePhase)return battleTutorialInstruction();
 if(territoryGuidePaused())return territoryGuideInstruction();
 if(!preparingFirstExpedition()||firstTutorialBusy)return null;
 const step=firstCampStep();
 if(UI.tab==='summon')return S.heroes.militia?
 ['#tabs [data-tab="territory"]','첫 동료 한스가 합류했어요','편성 탭을 눌러 한스를 출전시켜 보세요.']:
 ['[data-act="summon"][data-free="1"]','무료 1회로 첫 동료를 만나세요','매일 무료로 한 번 영입할 수 있어요. 첫 무료 영입은 한스가 합류합니다.'];
 if(UI.tab==='territory')return step==='depart'?
 ['#tabs [data-tab="lobby"]','한스가 전열에 배치됐어요','왕국 탭으로 돌아가 첫 원정을 출발하세요.']:
 UI.pendingHero==='militia'?['[data-act="slot"][data-i="0"]','이곳이 전열이에요','빛나는 자리를 누르면 한스가 들어갑니다.']:
 ['[data-act="place"][data-id="militia"]','함께할 동료를 선택하세요','방금 영입한 한스 카드를 누르세요.'];
 return step==='recruit'?['#tabs [data-tab="summon"]','왕국의 첫 동료를 만나세요','영입 탭을 눌러 모집을 시작하세요.']:
 step==='place'?['#tabs [data-tab="territory"]','동료를 얻었으니 편성해 볼까요?','편성 탭을 누르세요. 앞으로도 여기서 부대를 바꿉니다.']:
 ['#first-expedition-go','원정 준비 완료!','이 버튼을 눌러야 전투가 시작됩니다.'];
}
function refreshTutorialSpotlight(){
 document.querySelectorAll('.tutorial-target').forEach(el=>el.classList.remove('tutorial-target'));
 let layer=document.getElementById('tutorial-spotlight');const instruction=tutorialInstruction();
 if(!instruction){layer?.remove();return;}
 const target=document.querySelector(instruction[0]);if(!target){layer?.remove();return;}
 const r=target.getBoundingClientRect(),w=innerWidth,h=innerHeight,pad=5;
 if(!r.width||!r.height){layer?.remove();return;}
 target.classList.add('tutorial-target');
 if(!layer){layer=document.createElement('div');layer.id='tutorial-spotlight';layer.innerHTML='<div class="tutorial-shade top"></div><div class="tutorial-shade left"></div><div class="tutorial-shade right"></div><div class="tutorial-shade bottom"></div><div class="tutorial-aperture"></div><div class="tutorial-coach" role="status"><span class="coach-arrow">↓</span><b></b><p></p><button class="btn gold tutorial-next"></button></div>';document.body.append(layer);}
 const x=Math.max(0,r.left-pad),y=Math.max(0,r.top-pad),right=Math.min(w,r.right+pad),bottom=Math.min(h,r.bottom+pad);
 const rect=(sel,l,t,ww,hh)=>{layer.querySelector(sel).style.cssText=`left:${l}px;top:${t}px;width:${Math.max(0,ww)}px;height:${Math.max(0,hh)}px`;};
 rect('.top',0,0,w,y);rect('.left',0,y,x,bottom-y);rect('.right',right,y,w-right,bottom-y);rect('.bottom',0,bottom,w,h-bottom);rect('.tutorial-aperture',x,y,right-x,bottom-y);
 const coach=layer.querySelector('.tutorial-coach'),above=y>190,cw=Math.min(280,w-24),cx=Math.max(12,Math.min(w-cw-12,(x+right)/2-cw/2));
 coach.style.cssText=`width:${cw}px;left:${cx}px;top:0px`;
 coach.querySelector('b').textContent=instruction[1];coach.querySelector('p').textContent=instruction[2];
 const next=coach.querySelector('.tutorial-next');next.hidden=!instruction[3];next.textContent=instruction[3]||'';next.onclick=advanceTutorial;
 // Measure the actual wrapped copy; never place battle guidance over the HUD.
 const ch=coach.getBoundingClientRect().height;
 const field=document.getElementById('field').getBoundingClientRect();
 const inBattle=document.getElementById('game').classList.contains('battle-mode');
 const low=inBattle?field.top+12:12,high=inBattle?field.bottom-64:h-12;
 const desired=instruction[0]==='#field'?high-ch:above?y-ch-36:bottom+36;
 const cy=Math.max(low,Math.min(high-ch,desired));
 coach.style.top=cy+'px';
 const below=cy>=bottom;
 coach.classList.toggle('below',below);
 const arrow=coach.querySelector('.coach-arrow');
 arrow.style.left=Math.max(15,Math.min(cw-30,(x+right)/2-cx-12))+'px';
 arrow.textContent=below?'↑':'↓';
 arrow.hidden=instruction[0]==='#field';
 layer.classList.toggle('battle-tutorial',!!firstBattlePhase||territoryGuidePaused());
}
// Keep keyboard activation within the same tutorial target as pointer input.
if(typeof document!=='undefined')document.addEventListener('click',e=>{
 if(document.getElementById('game').classList.contains('hidden'))return;
 if(firstBattlePhase||territoryGuidePaused()){if(!e.target.closest('.tutorial-next')){e.preventDefault();e.stopImmediatePropagation();}return;}
 if(!preparingFirstExpedition())return;
 if(firstTutorialBusy){e.preventDefault();e.stopImmediatePropagation();return;}
 const instruction=tutorialInstruction(),target=instruction&&document.querySelector(instruction[0]);
 if(target&&!target.contains(e.target)){e.preventDefault();e.stopImmediatePropagation();}
},true);
async function playFirstRecruit(){
 if(firstTutorialBusy||S.heroes.militia||S.daily.freeSummon<=0)return;
 firstTutorialBusy=true;refreshTutorialSpotlight();
 const scene=document.createElement('div');scene.className='first-summon-cinema';scene.setAttribute('role','status');
 scene.innerHTML=`<div class="summon-rays"></div><div class="summon-seal">${gameIcon('crown')}</div><div class="summon-envelope"><span>왕국의 부름</span>${gameIcon('shield')}<b>첫 동료</b></div><div class="summon-reveal">${heroArt('militia')}<small>전열 · 민병대장</small><h2>한스</h2><b>새로운 동료 합류</b></div><p>영주님의 부름에 응답하는 중…</p>${Array.from({length:12},(_,i)=>`<i class="summon-mote" style="--angle:${i*30}deg;--delay:${i%3*.08}s"></i>`).join('')}`;
 document.body.append(scene);
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 try{
  GameAudio.play('roll');
  await scene.animate([{opacity:0},{opacity:1}],{duration:reduced?1:180,fill:'forwards'}).finished;
  await scene.querySelector('.summon-envelope').animate([{transform:'translateY(55px) scale(.6)',opacity:0},{transform:'translateY(0) scale(1)',opacity:1,offset:.45},{transform:'rotate(-4deg) scale(1.02)',offset:.7},{transform:'rotate(4deg) scale(1.05)',offset:.85},{transform:'scale(1.2)',opacity:0}],{duration:reduced?100:1250,fill:'forwards'}).finished;
  recruitFirstCompanion();scene.classList.add('opened');GameAudio.play('combo');scene.querySelector('p').textContent='영주님, 제가 선두에 서겠습니다.';
  await scene.querySelector('.summon-reveal').animate([{transform:'scale(.65) translateY(30px)',opacity:0,filter:'brightness(2)'},{transform:'scale(1.07)',opacity:1,filter:'brightness(1)',offset:.35},{transform:'scale(1)',opacity:1}],{duration:reduced?100:1100,fill:'forwards'}).finished;
 }finally{scene.remove();firstTutorialBusy=false;UI.renderTab();refreshTutorialSpotlight();}
}
async function animateFirstPlacement(){
 if(firstTutorialBusy||UI.pendingHero!=='militia')return;
 const source=document.querySelector('[data-act="place"][data-id="militia"]'),target=document.querySelector('[data-act="slot"][data-i="0"]');if(!source||!target)return;
 firstTutorialBusy=true;refreshTutorialSpotlight();
 const a=source.getBoundingClientRect(),b=target.getBoundingClientRect(),fly=document.createElement('div');fly.className='first-card-flight';fly.innerHTML=heroArt('militia')+'<b>한스</b>';
 fly.style.cssText=`left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px`;
 document.body.append(fly);
 try{await fly.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${(b.left-a.left)*.45}px,${(b.top-a.top)*.5-30}px) scale(1.2)`,offset:.45},{transform:`translate(${b.left+b.width/2-a.left-a.width/2}px,${b.top+b.height/2-a.top-a.height/2}px) scale(.85)`,opacity:1}],{duration:window.matchMedia('(prefers-reduced-motion: reduce)').matches?1:650,easing:'cubic-bezier(.2,.7,.3,1)',fill:'forwards'}).finished;
  placeRosterHero('militia',0);saveGame();UI.pendingHero=null;UI.selSlot=null;GameAudio.play('combo');
 }finally{fly.remove();firstTutorialBusy=false;UI.renderTab();document.querySelector('.deployment-unit')?.animate([{filter:'brightness(2)',transform:'scale(1.1)'},{filter:'brightness(1)',transform:'scale(1)'}],{duration:450});refreshTutorialSpotlight();}
}

// A guided, deterministic first two rolls; normal random production resumes afterward.
let firstBattlePhase=null;
function beginFirstBattleGuide(){
 if(S.battleTutorial==='pending'&&S.stage===1){firstBattlePhase='intro';}
}
function firstBattlePaused(){return ['intro','result','charge','full','deployed'].includes(firstBattlePhase)||territoryGuidePaused();}
function firstBattleRollFace(){return ['rolling','rolling-again'].includes(firstBattlePhase)?2:null;}
function firstBattleRolled(){
 if(firstBattlePhase==='rolling')firstBattlePhase='result';
 else if(firstBattlePhase==='rolling-again'){
  firstBattlePhase='full';
  for(const u of B.units)if(u.team===0&&u.heroId==='militia')u.arrivalAt=Infinity;
 }
}
function advanceFirstBattleGuide(){
 if(firstBattlePhase==='intro')firstBattlePhase='rolling';
 else if(firstBattlePhase==='result')firstBattlePhase='charge';
 else if(firstBattlePhase==='charge')firstBattlePhase='rolling-again';
 else if(firstBattlePhase==='full'){
  for(const u of B.units)if(u.team===0&&u.heroId==='militia')u.arrivalAt=Date.now();
  firstBattlePhase='deployed';GameAudio.play('combo');
 }else if(firstBattlePhase==='deployed'){firstBattlePhase='controls';}
 else if(firstBattlePhase==='controls'){firstBattlePhase=null;S.battleTutorial='done';S.fieldGuideSeen={...S.fieldGuideSeen,skill:true,auto:true};saveGame();}
 UI.refresh();refreshTutorialSpotlight();
}
function battleTutorialInstruction(){
 if(firstBattlePhase==='controls')return ['#combat-actions','영주 스킬과 AUTO','스킬이 준비되면 눌러 사용할 수 있어요. AUTO가 켜져 있으면 자동으로 사용합니다.','전투 계속'];
 if(!firstBattlePaused())return null;
 const unitSelector='.deploy-card[data-slot="0"]';
 return {
 intro:['#dice-hud','첫 주사위를 굴려볼까요?','눈금만큼 편성된 모든 부대가 충전됩니다. 연습에서는 2가 나옵니다.','첫 굴림 보기'],
 result:['#dice-hud','2가 나왔어요','이 눈금 2가 아래 민병 부대로 전달됩니다.','충전 확인'],
 charge:[unitSelector,'민병 충전 2 / 4','테두리와 숫자가 함께 찼어요. 한 명 출격까지 2충전이 더 필요합니다.','다음 굴림 보기'],
 full:[unitSelector,'4 / 4 · 출격 준비 완료','두 번째 2충전으로 가득 찼습니다. 이제 민병 한 명이 전장에 합류합니다.','출격 보기'],
 deployed:['#tutorial-unit-marker','첫 민병이 출격했어요','편성한 부대가 이렇게 합류합니다. 이제부터 주사위와 전투는 자동으로 진행됩니다.','전투 계속']
 }[firstBattlePhase];
}
function refreshTutorialUnitMarker(){
 let marker=document.getElementById('tutorial-unit-marker');
 const support=S?.territoryTutorial==='support';
 if(firstBattlePhase!=='deployed'&&!support){marker?.remove();return;}
 const u=B.units.find(u=>support?u.isVanguard:u.team===0&&u.heroId==='militia');if(!u)return;
 if(!marker){marker=document.createElement('div');marker.id='tutorial-unit-marker';document.body.append(marker);}
 const rect=document.getElementById('cv').getBoundingClientRect();
 const x=rect.left+SX(u.y,u.x)*VIEW.sx,y=rect.top+(VIEW.height-u.x+BattleCamera.offset)*VIEW.sy;
 marker.style.cssText=`left:${x-25}px;top:${y-45}px;width:${support?105:50}px;height:60px`;
}

function territoryGuidePaused(){return ['boss','won','map','support'].includes(S?.territoryTutorial);}
function territoryGuideStage(stage){
 if(S.territoryTutorial==='waiting'&&stage===5){S.territoryTutorial='boss';saveGame();}
}
function territoryGuideConquest(stage){
 if(stage!==5||!['waiting','boss','fighting'].includes(S.territoryTutorial))return false;
 S.territoryTutorial='won';saveGame();return true;
}
function territoryGuideInstruction(){
 return {
 boss:['#field','첫 번째 성에 도착했어요','보스와 수비대를 쓰러뜨리고 성을 함락하면 햇살 숲이 내 영토가 됩니다.','성 공략 시작'],
 won:['#tabs [data-tab="lobby"]','햇살 숲이 내 영토가 됐어요','왕국에 돌아가 새로 세워진 거점을 확인하세요.','내 왕국 보기'],
 map:['#kingdom-map-host','작은 거점 → 개척 영지','햇살 숲이 내 영토에 추가됐어요. 이제 매 원정에 선발병 2명이 먼저 합류합니다.','지원군 만나기'],
 support:['#tutorial-unit-marker','햇살 숲 선발병 2명 합류','주사위를 기다리지 않고 먼저 출격합니다. 얻은 영토가 다음 원정을 돕는 거예요.','다음 원정 계속']
 }[S?.territoryTutorial]||null;
}
function advanceTerritoryGuide(){
 const phase=S.territoryTutorial;
 if(phase==='boss')S.territoryTutorial='fighting';
 else if(phase==='won'){
  S.territoryTutorial='map';MobileShell.show('lobby');
  const map=document.getElementById('kingdom-map-host');map.classList.add('first-land-expansion');
  let badge=document.getElementById('first-land-growth');if(!badge){badge=document.createElement('div');badge.id='first-land-growth';badge.innerHTML='<small>왕국 확장</small><b>영토 0 → 1</b><span>햇살 숲 · 선발대 주둔</span>';map.append(badge);}
 }else if(phase==='map'){
  S.territoryTutorial='support';MobileShell.show('battle');
  for(const u of B.units)if(u.isVanguard)u.arrivalAt=Date.now();
 }else if(phase==='support'){
  S.territoryTutorial='done';document.getElementById('first-land-growth')?.remove();document.getElementById('kingdom-map-host')?.classList.remove('first-land-expansion');
 }
 saveGame();UI.refresh();refreshTutorialUnitMarker();refreshTutorialSpotlight();
}
function advanceTutorial(){if(firstBattlePhase)advanceFirstBattleGuide();else advanceTerritoryGuide();}
