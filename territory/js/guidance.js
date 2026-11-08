// Read-only battle guidance: costs and timing come from the simulation.
'use strict';
function deploymentInfo(i) {
  const id=S.slots[i]; if(!id) return null;
  const h=HERO_BY_ID[id],alive=slotAlive(0,i,id),cap=heroCap(id);
  ensureDice();
  const cycle=diceCooldown()/S.settings.speed,cost=productionCost(id),charge=S.dice.charge[id]||0,progress=charge/cost;
  return {id,h,alive,cap,cycle,progress,full:alive>=cap,seconds:(1-progress)*cycle,cost,charge,count:Math.floor(charge/cost)};
}
function nextBattleAction() {
  if(B.mode!=='stage') return {title:'적 성문을 무너뜨리세요',detail:'부대를 지키고 스킬로 전선을 밀어내세요.',label:'부대 확인',tab:'territory'};
  if(!hasVanguard())return {title:'5단계 성 · 선발대 해금',detail:'햇살 숲을 얻으면 매 원정에 선발병 2명이 먼저 출격합니다.',label:'영토 보상 보기',tab:'kingdom'};
  const land=typeof availableLand==='function'?availableLand():null;
  if(land)return {title:land.name+' 확보!',detail:`${fmt(land.cost)} 골드로 확보한 영토에 시설을 세우세요.`,label:'영토 개척',tab:'kingdom'};
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
  const key=JSON.stringify([S.slots,slotCount(),S.formation]);
  if(strip.dataset.roster!==key){
    strip.dataset.roster=key;
    strip.innerHTML=Array.from({length:5},(_,i)=>{
      const locked=i>=slotCount(),id=locked?null:S.slots[i],tier=PROMOTIONS.findIndex(p=>p.slots>i);
      return `<button class="deploy-card ${locked?'locked':''}" data-slot="${i}" aria-label="${locked?tier+'차 전직 해금':id?HERO_BY_ID[id].unit.name+' 편성':'빈 슬롯 편성'}"><span class="deploy-orb">${battleChargeMeter()}<span class="orb-inner">${locked?'<svg class="slot-lock-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3"/><rect x="4" y="10" width="16" height="12" rx="4"/><path d="M12 15v3"/></svg>':id?heroArt(id):'<svg class="empty-slot slot-plus-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'}</span><span class="spawn-burst"></span></span><span class="assigned-dice">${id?'0 / '+productionCost(id):''}</span></button>`;
    }).join('');
    strip.querySelectorAll('button').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.slot);UI.openSheet(i>=slotCount()?'promo':'territory');if(i<slotCount()){if(S.slots[i])UI.showHero(S.slots[i]);else{UI.selSlot=i;UI.renderTab();}} });
  }
  strip.querySelectorAll('button').forEach((el,i)=>{
    const locked=i>=slotCount(),d=locked?null:deploymentInfo(i),event=B.diceCue,r=event?.results?.find(r=>r.slot===i&&r.id===d?.id),active=!!r&&event.until>Date.now();
    const elapsed=active?Date.now()-event.at:9999;
    const shown=typeof firstBattlePhase!=='undefined'&&firstBattlePhase==='full'&&i===0?d.cost:d?(elapsed<380&&r?r.before:elapsed<700&&r?Math.min(r.cost,r.before+event.face):d.charge):0;
    el.style.setProperty('--progress',(d?shown/d.cost*100:0)+'%');
    el.style.setProperty('--meter-value',d?Math.max(0,Math.min(100,shown/d.cost*100)):0);
    el.classList.toggle('charge-full',!!d&&shown>=d.cost);
    el.classList.toggle('slot-empty',!locked&&!d);
    el.style.setProperty('--summon-color',d?summonColor(d.id):'#aaa');
    el.classList.toggle('dice-selected',!!active&&elapsed>=380);
    el.classList.toggle('charge-produced',!!active&&r.count>0&&elapsed>=700);
    el.querySelector('.assigned-dice').textContent=d?`${shown} / ${d.cost}`:'';
    el.querySelector('.spawn-burst').textContent=active?(elapsed<700?'+'+event.face:r.count?r.count+'명 출격':'+'+event.face+' 충전'):'';

  });
  animateProductionCue();
}
