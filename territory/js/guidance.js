// Read-only battle guidance: costs and timing come from the simulation.
'use strict';
function deploymentInfo(i) {
  const id=S.slots[i]; if(!id) return null;
  const h=HERO_BY_ID[id],alive=slotAlive(0,i,id),cap=heroCap(id);
  ensureDice();
  const cycle=diceCooldown()/S.settings.speed,progress=S.dice.progress;
  return {id,h,alive,cap,cycle,progress,full:alive>=cap,seconds:(1-progress)*cycle,count:Math.min(diceHand(S.dice.history).mult,Math.max(0,cap-alive))};
}
function nextBattleAction() {
  if(B.mode!=='stage') return {title:'적 성문을 무너뜨리세요',detail:'부대를 지키고 스킬로 전선을 밀어내세요.',label:'부대 확인',tab:'territory'};
  const land=typeof availableLand==='function'?availableLand():null;
  if(land)return {title:land.name+' 확보!',detail:`${fmt(land.cost)} 골드로 개척하고 시설을 세우세요.`,label:'영토 개척',tab:'kingdom'};
  const stage=B.stage||S.stage,boss=Math.ceil(stage/5)*5;
  const growth=kingdomGrowth(),canGrow=!growth.complete&&!growth.locked&&S.gold>=growth.cost;
  if(S.farming) return {title:`${Math.min(S.maxStage,S.stage+1)}단계 재도전 준비`,detail:'반복 사냥으로 골드 획득 → 부대 강화 → 다음 단계 돌파',label:canGrow?'왕국 성장':'돌파 도전',tab:canGrow?'lord':null,boss:!canGrow};
  if(S.daily.freeSummon>0) return {title:`다음 목표 · ${boss}단계 보스`,detail:'무료 영웅을 영입하고 영토에 배치해 부대를 늘리세요.',label:'무료 영입',tab:'summon'};
  return {title:`다음 목표 · ${boss}단계 보스`,detail:isBossStage(stage)?'보스를 쓰러뜨리고 다음 단계로! 첫 클리어 보석 30개':`적 처치로 골드 획득 · ${boss-stage}단계 뒤 보스 도전`,label:canGrow?'왕국 성장':'부대 편성',tab:canGrow?'lord':'territory'};
}
function refreshBattleGuide() {
  const strip=document.getElementById('deployment');if(!strip)return;
  ensureFormation();
  refreshDiceHUD();
  document.getElementById('formation-open').onclick=()=>UI.openSheet('territory');
  const key=JSON.stringify([S.slots,slotCount(),S.formation,S.dice.faces]);
  if(strip.dataset.roster!==key){
    strip.dataset.roster=key;
    strip.innerHTML=Array.from({length:5},(_,i)=>{
      const locked=i>=slotCount(),id=locked?null:S.slots[i],tier=PROMOTIONS.findIndex(p=>p.slots>i);
      const faces=S.dice.faces.map((v,n)=>v===i?n+1:null).filter(Boolean);
      return `<button class="deploy-card ${locked?'locked':''}" data-slot="${i}" aria-label="${locked?tier+'차 전직 해금':id?HERO_BY_ID[id].unit.name+' 편성':'빈 슬롯 편성'}"><span class="deploy-orb"><span class="orb-inner">${locked?'<span class="slot-lock">잠금</span>':id?heroArt(id):'<span class="empty-slot">＋</span>'}</span><span class="spawn-burst"></span></span><b>${locked?tier+'차 전직':id?HERO_BY_ID[id].unit.name:'빈 슬롯'}</b><small class="deploy-rank">${FORMATION_NAMES[locked?unlockRank(i):S.formation[i]]}</small><span class="assigned-dice">${locked?'—':faces.map(n=>dieFace(n)).join('')||'미지정'}</span><small class="deploy-count"></small></button>`;
    }).join('');
    strip.querySelectorAll('button').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.slot);UI.openSheet(i>=slotCount()?'promo':'territory');if(i<slotCount()){UI.selSlot=i;UI.renderTab();}});
  }
  strip.querySelectorAll('button').forEach((el,i)=>{
    const locked=i>=slotCount(),d=locked?null:deploymentInfo(i),event=B.diceCue,selected=!!d&&event&&event.until>Date.now()&&event.slot===i;
    el.style.setProperty('--progress',((!locked&&d)?S.dice.progress*100:0)+'%');
    el.classList.toggle('dice-selected',!!selected);
    el.querySelector('.deploy-count').textContent=locked?'':d?`${d.alive}/${d.cap}명`:'';
    el.querySelector('.spawn-burst').textContent=selected?(event.count?'+'+event.count:'정원') : '';
    el.querySelectorAll('.assigned-dice .die-face').forEach(face=>face.classList.toggle('picked',!!selected&&Number(face.dataset.face)===event.face));
  });
  animateProductionCue();
  const action=nextBattleAction();
  document.getElementById('objective-title').textContent=action.title;
  document.getElementById('objective-detail').textContent=action.detail;
  document.getElementById('battle-objective').title=action.detail;
  const button=document.getElementById('objective-action');button.textContent=action.label;
  button.onclick=()=>{
    if(action.boss) return document.getElementById('btn-boss').click();
    UI.openSheet(action.tab);
    if(action.tab==='lord') {
      const upgrade=document.querySelector('[data-act="kingdomgrow"]');
      if(upgrade){upgrade.closest('.kingdom-growth').classList.add('guided-upgrade');upgrade.focus({preventScroll:true});}
    }
  };
  const rearExposed=B.units.some(u=>u.team===0&&u.hp>0&&unitRank(u)>0)&&!B.units.some(u=>u.team===0&&u.hp>0&&unitRank(u)===0);
  document.getElementById('army-summary').textContent=rearExposed?'전열 부재 · 후속 부대 노출':`편성 부대 · ${armyCount()}/${armyCap()}명`;
}
