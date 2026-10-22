'use strict';
const LANDS = [
 {id:'grove',name:'첫 개척지 · 햇살 숲',boss:5,cost:350,x:27,y:60},
 {id:'brook',name:'물안개 들판',boss:10,cost:1500,x:73,y:60},
 {id:'ridge',name:'바람 언덕',boss:20,cost:8000,x:50,y:80},
 {id:'vale',name:'비옥한 골짜기',boss:30,cost:30000,x:27,y:33},
 {id:'pass',name:'왕국의 관문',boss:45,cost:150000,x:73,y:33},
 {id:'crown',name:'왕관 고원',boss:60,cost:800000,x:50,y:13},
];
const FACILITIES = {
 training:{name:'훈련장',desc:'자동 주사위 쿨타임 10% 단축',tile:2},
 mine:{name:'금광',desc:'전투·방치 골드 수입 +15%',tile:8},
};
function ensureKingdom(){
 if(!S.kingdom||typeof S.kingdom!=='object') S.kingdom={lands:{}};
 if(!S.kingdom.lands||typeof S.kingdom.lands!=='object') S.kingdom.lands={};
 for(const [id,value] of Object.entries(S.kingdom.lands)) if(!LANDS.some(l=>l.id===id)||!FACILITIES[value]) delete S.kingdom.lands[id];
}
function ownedLands(){ensureKingdom();return Object.keys(S.kingdom.lands).length;}
function facilityCount(type){ensureKingdom();return Object.values(S.kingdom.lands).filter(v=>v===type).length;}
function kingdomTitle(){const n=ownedLands();return n>=6?'왕도':n>=3?'성채 도시':n>=1?'개척 영지':'작은 거점';}
function availableLand(){ensureKingdom();return LANDS.find(l=>!S.kingdom.lands[l.id]&&S.maxStage>l.boss);}
function claimLandError(id,type){
 ensureKingdom();const land=LANDS.find(l=>l.id===id);
 if(!land)return '선택한 영지를 찾을 수 없습니다.';
 if(!Object.hasOwn(FACILITIES,type))return '시설을 선택해 주세요.';
 if(S.kingdom.lands[id])return '이미 개척한 영지입니다.';
 if(S.maxStage<=land.boss)return `${land.boss}단계 보스를 먼저 격파해야 합니다.`;
 if(S.gold<land.cost)return `${fmt(land.cost-S.gold)} 골드가 부족합니다.`;
 return '';
}
function claimLand(id,type){
 if(claimLandError(id,type))return false;
 const land=LANDS.find(l=>l.id===id);
 S.gold-=land.cost;S.kingdom.lands[id]=type;saveGame();return true;
}
function buildingArt(tile,extra=''){if(tile===8)return `<span class="estate-building mine-art ${extra}" aria-hidden="true"></span>`;return `<span class="estate-building ${extra}" style="background-position:${tile%4/3*100}% ${Math.floor(tile/4)*50}%" aria-hidden="true"></span>`;}
function kingdomMap(){
 ensureKingdom();return `<div class="estate-map" aria-label="내 왕국 지도 · 개척 영토 ${ownedLands()}곳">
 <div class="estate-terrain" aria-hidden="true"></div><div class="estate-home" style="--growth:${1+ownedLands()*.055}">${buildingArt(0)}<b>${kingdomTitle()}</b></div>
 ${LANDS.map(l=>{const f=S.kingdom.lands[l.id],ready=S.maxStage>l.boss;return `<button class="estate-land ${f?'owned':ready?'available':'locked'} ${typeof UI!=='undefined'&&UI.tab==='kingdom'&&UI.kingdomLand===l.id?'selected':''}" style="--x:${l.x}%;--y:${l.y}%" data-land="${l.id}" aria-label="${l.name} · ${f?FACILITIES[f].name:ready?'개척 가능':l.boss+'단계 보스 격파 필요'}">${f?buildingArt(FACILITIES[f].tile)+'<span class="estate-flag"></span>':landScenery(ready,l.boss)}<b><span>${l.name.replace('첫 개척지 · ','')}</span><small>${f?FACILITIES[f].name:ready?'개척하기':l.boss+'단계 보스'}</small></b></button>`;}).join('')}</div>`;
}
function kingdomPanel(){
 ensureKingdom();const selected=UI.kingdomLand||availableLand()?.id||LANDS[0].id;return `${LANDS.filter(l=>l.id===selected).map(l=>{const f=S.kingdom.lands[l.id],ready=S.maxStage>l.boss;return `<section class="sec land-detail" id="land-${l.id}"><h3>${l.name}<small>${f?'개척 완료':ready?'개척 대기':'미확보'}</small></h3>${f?`<div class="built-facility" role="status">${buildingArt(FACILITIES[f].tile)}<div><b>${FACILITIES[f].name}</b><p>${FACILITIES[f].desc}</p></div></div><button class="btn gold kingdom-return" data-act="kingdomhome">왕국 지도에서 보기</button>`:!ready?`<p>${l.boss}단계 보스를 격파하면 개척할 수 있습니다.</p>`:`<p>개척 비용 <b>${fmt(l.cost)} 골드</b> · 시설 하나를 선택하세요.<br>건설 후 시설은 변경할 수 없습니다.</p><div class="facility-choices">${Object.entries(FACILITIES).map(([id,f])=>`<button class="facility-choice" data-act="claimland" data-id="${l.id}" data-facility="${id}" data-cost="${l.cost}" ${S.gold<l.cost?'disabled':''}>${buildingArt(f.tile)}<b>${f.name}</b><small>${f.desc}</small><strong>${fmt(l.cost)} 골드 · 건설</strong></button>`).join('')}</div>${S.gold<l.cost?`<p class="land-shortage">${fmt(l.cost-S.gold)} 골드 부족 · 반복 사냥으로 획득하세요.</p>`:''}`}</section>`;}).join('')}<section class="sec estate-summary"><span class="eyebrow">MY KINGDOM</span><h3>${kingdomTitle()} · 영토 ${ownedLands()}/6</h3><p>보스를 격파해 땅을 확보하고, 골드로 개척하면 내 영토가 됩니다.</p>${kingdomMap()}<div class="estate-bonuses"><b>훈련장 ${facilityCount('training')}곳</b><b>금광 수입 +${facilityCount('mine')*15}%</b></div></section>`;
}
function bindKingdomMap(root){root.querySelectorAll('[data-land]').forEach(b=>b.onclick=(event)=>{event.preventDefault();event.stopPropagation();UI.openSheet('kingdom',b.dataset.land);});}

function offerLand(stage){
 const land=LANDS.find(l=>l.boss===stage);if(!land||S.kingdom?.lands[land.id])return;
 UI.modal(`<span class="eyebrow">NEW TERRITORY</span><h2>${land.name} 확보!</h2><div class="land-victory">${buildingArt(0)}<span class="estate-flag"></span></div><p>적의 깃발이 내려갔습니다.<br><b>${fmt(land.cost)} 골드</b>로 개척하고 시설을 세워<br>당신의 왕국에 편입하세요.</p>`,[{label:'왕국에서 개척하기',cls:'gold',fn:()=>{MobileShell.show('lobby');UI.openSheet('kingdom',land.id);}},{label:'나중에'}]);
}

function landScenery(ready,boss){return `<svg class="land-scenery" viewBox="0 0 120 94" aria-hidden="true"><path d="M6 57 59 33 114 57 114 70 60 94 6 70Z" fill="#655440"/><path d="m6 57 53-24 55 24-54 25Z" fill="${ready?'#a6c978':'#718873'}"/><path d="m23 61 27-13 36 14-25 12Z" fill="${ready?'#d9c48c':'#94a08b'}"/><path d="M22 54V32m73 28V39" stroke="#68523b" stroke-width="5"/><path d="m8 38 14-27 16 27-9-3 7 13H10l7-13Z" fill="#3e7356"/><path d="m83 39 12-24 14 24-7-3 6 15H83l6-15Z" fill="#528462"/><path d="m40 62 21-27 22 29Z" fill="${ready?'#e6b865':'#8896a0'}" stroke="#6d614b" stroke-width="2"/><path d="m61 35 4 30 18-1Z" fill="${ready?'#a47645':'#596f79'}"/><path d="m54 64 7-15 4 16" fill="#414c42"/><path d="M86 62V21" stroke="#685642" stroke-width="3"/><path d="m88 21 21 4-7 7 7 7-21-4Z" fill="${ready?'#f3d47a':'#9e6060'}"/><path d="m16 65 6-7 10 2 4 8-11 4Z" fill="#84928c"/><path d="m16 65 10-3 6-2-10-2Z" fill="#b5beb2"/></svg>`;}

// One deterministic path. Land ownership opens each ten-step chapter.
const KINGDOM_GROWTH_CHAPTERS=['주둔지 정비','개척지 기반','보급로 확장','수비대 조직','성채 건설','왕국의 군세','왕도 번영'];
const KINGDOM_GROWTH_PATH=[
 {id:'atk',name:'무기 보급',icon:'sword'}, {id:'hp',name:'병사 훈련',icon:'shield'},
 {id:'gold',name:'보급로 정비',icon:'coin'}, {id:'atk',name:'전술 훈련',icon:'sword'},
 {id:'castle',name:'성벽 보강',icon:'castle'}, {id:'hp',name:'수비대 조직',icon:'shield'},
 {id:'spawn',name:'출격 준비',icon:'clock'}, {id:'atk',name:'정예병 훈련',icon:'sword'},
 {id:'gold',name:'징수 체계',icon:'coin'}, {id:'cap',name:'주둔지 확장',icon:'flag'},
];
function ensureKingdomGrowth(){
 ensureKingdom();
 if(!S.kingdom.growth||typeof S.kingdom.growth!=='object')S.kingdom.growth={step:0};
 const n=S.kingdom.growth.step;
 S.kingdom.growth.step=Number.isSafeInteger(n)?Math.max(0,n):0;
}
function kingdomGrowthAt(step){
 const chapter=Math.floor(step/KINGDOM_GROWTH_PATH.length),index=step%KINGDOM_GROWTH_PATH.length;
 let spec=KINGDOM_GROWTH_PATH[index],upgrade=UPGRADES.find(u=>u.id===spec.id);
 // Existing saves may already have capped capacity/speed. Every node still pays a real reward.
 if(upgrade.max&&S.upgrades[upgrade.id]>=upgrade.max){spec={id:'hp',name:'수비대 정예화',icon:'shield'};upgrade=UPGRADES.find(u=>u.id==='hp');}
 const level=S.upgrades[upgrade.id];
 return {step,chapter,index,chapterName:KINGDOM_GROWTH_CHAPTERS[chapter%7],requiredLands:Math.min(chapter,6),locked:ownedLands()<Math.min(chapter,6),...spec,upgrade,level,cost:upgradeCost(upgrade),before:upgrade.desc(level),after:upgrade.desc(level+1)};
}
function kingdomGrowth(){ensureKingdomGrowth();return kingdomGrowthAt(S.kingdom.growth.step);}
function kingdomGrowthHonors(step){
 const stars=Math.floor(step/10),remaining=10-step%10;
 return `<div class="growth-honors"><b>왕국 Lv.${step}</b><div class="kingdom-star-count" aria-label="왕국의 별 ${stars}개">${gameIcon('star')}<strong>${stars}</strong></div><small>누적 성장</small></div><div class="growth-star-buff"><b>영주·병사 영구 가호</b><strong>공격력·체력 ×${(1+stars*.05).toFixed(2)}</strong><div><span>${remaining}회 강화 후 별 +1</span><b>×${(1+(stars+1)*.05).toFixed(2)}</b></div></div>`;
}
function advanceKingdomGrowth(expectedStep){
 const next=kingdomGrowth();
 if(expectedStep!==next.step||next.complete||next.locked||S.gold<next.cost)return null;
 const castleBefore=next.id==='castle'?castleMaxHp():0;
 const starBefore=kingdomStarMult();
 S.gold-=next.cost;S.upgrades[next.id]++;S.kingdom.growth.step++;
 if(next.id==='castle'&&typeof B!=='undefined'&&B.pCastle){const max=castleMaxHp();B.pCastle.max=max;B.pCastle.hp=Math.min(max,B.pCastle.hp+max-castleBefore);}
 next.starEarned=S.kingdom.growth.step%10===0;
 if(next.starEarned&&typeof B!=='undefined'){
  const ratio=kingdomStarMult()/starBefore;
  for(const u of B.units||[])if(u.team===0&&u.hp>0){u.atk*=ratio;u.hp*=ratio;u.maxHp*=ratio;if(u.heal)u.heal*=ratio;}
 }
 saveGame();return next;
}
function kingdomGrowthPanel(){
 const next=kingdomGrowth();
 const remaining=next.requiredLands-ownedLands();
 return `<section class="sec kingdom-growth ${next.locked?'locked':''}">${kingdomGrowthHonors(next.step)}<h3>${next.chapter+1}장 · ${next.chapterName}<small>${next.index}/10</small></h3><div class="growth-track" aria-label="이 구간 ${next.index}/10 완료">${KINGDOM_GROWTH_PATH.map((_,i)=>`<i class="${i<next.index?'done':i===next.index?'current':''}"></i>`).join('')}</div><div class="growth-current"><div class="growth-node-icon">${gameIcon(next.icon)}</div><div><small>${next.step+1}번째 성장</small><h4>${next.name}</h4><p>${next.upgrade.name} <span>${next.before}</span> <b>→ ${next.after}</b></p></div></div>${next.locked?`<div class="growth-gate"><b>영토 ${next.requiredLands}곳 개척 시 해금</b><small>현재 ${ownedLands()}곳 · ${remaining}곳 더 개척하세요</small><button class="btn primary" data-act="growthland">영토 확인 ›</button></div>`:`<button class="btn gold growth-build" data-act="kingdomgrow" data-step="${next.step}" data-cost="${next.cost}">${next.name} <span>${gameIcon('coin')}${fmt(next.cost)}</span></button>`}</section>`;
}

// An earned star travels into the crest; the bonus lands after it, inside this card only.
function playKingdomStarRise(){
 const card=document.querySelector('#panel .kingdom-growth');
 if(!card)return;
 const crest=card.querySelector('.kingdom-star-count'),count=crest?.querySelector('strong');
 const buff=card.querySelector('.growth-star-buff'),value=buff?.querySelector('strong');
 if(!crest||!count||!buff||!value)return;
 const stars=Math.floor(S.kingdom.growth.step/10),after=kingdomStarMult().toFixed(2),before=(1+(stars-1)*.05).toFixed(2);
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const effect=document.createElement('div');effect.className='star-rise-layer';effect.setAttribute('aria-hidden','true');
 effect.innerHTML=`<div class="star-rise-ring"></div><div class="star-rise-flight">${gameIcon('star')}</div>${Array.from({length:10},(_,i)=>`<i class="star-rise-spark" style="--angle:${i*36}deg;--delay:${i%3*40}ms"></i>`).join('')}`;
 card.appendChild(effect);
 const label=buff.querySelector('b'),originalLabel=label.textContent;
 label.textContent='왕국의 별 획득';buff.setAttribute('role','status');
 card.classList.add('star-rise');
 const finish=()=>{if(!card.isConnected)return;count.textContent=stars;value.textContent=`공격력·체력 ×${after}`;crest.classList.add('star-landed');buff.classList.add('star-empowered');label.textContent=`별 +1 · ×${before} → ×${after}`;};
 if(reduced){finish();effect.remove();}
 else{
  count.textContent=stars-1;value.textContent=`공격력·체력 ×${before}`;
  const box=card.getBoundingClientRect(),target=crest.getBoundingClientRect();
  const x=target.left+target.width/2-box.left-box.width/2,y=target.top+target.height/2-box.top-92;
  const flight=effect.querySelector('.star-rise-flight');
  flight.animate([{transform:'translate(-50%,-50%) scale(.15) rotate(-100deg)',opacity:0,offset:0},{transform:'translate(-50%,-50%) scale(1.25) rotate(8deg)',opacity:1,offset:.28},{transform:'translate(-50%,-50%) scale(1) rotate(0deg)',opacity:1,offset:.55},{transform:`translate(calc(-50% + ${x}px),calc(-50% + ${y}px)) scale(.3) rotate(0deg)`,opacity:1,offset:.93},{transform:`translate(calc(-50% + ${x}px),calc(-50% + ${y}px)) scale(.15)`,opacity:0}],{duration:1150,easing:'ease-in-out',fill:'forwards'}).onfinish=finish;
 }
 setTimeout(()=>{effect.remove();card.classList.remove('star-rise');crest.classList.remove('star-landed');buff.classList.remove('star-empowered');if(card.isConnected){label.textContent=originalLabel;buff.removeAttribute('role');}},3200);
}
