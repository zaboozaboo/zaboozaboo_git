'use strict';
function unlockRank(i){return (S.lord.cls==='knight'?[2,2,1,0,0]:[0,0,1,2,2])[i];}
const FORMATION_NAMES=['전열','중열','후열'];
function ensureFormation() {
  if(!Array.isArray(S.formation)) S.formation=[];
  for(let i=0;i<5;i++) S.formation[i]=unlockRank(i);
}
function unitRank(u) {
  if(u.team!==0||!u.heroId)return -1;
  return S.slots[u.slot]===u.heroId?S.formation[u.slot]:(u.formationRow??0);
}
function formationPosition(slot) {
  const rank=unlockRank(slot);
  const peers=Array.from({length:5},(_,i)=>unlockRank(i)===rank?i:-1).filter(i=>i>=0);
  const index=Math.max(0,peers.indexOf(slot));
  return {x:166-rank*32,y:LANE_W*(index+1)/(peers.length+1)};
}
// The foremost living earlier-rank squad anchors the formation. No stat multiplier.
function formationLimit(u) {
  const rank=unitRank(u);if(rank<=0)return Infinity;
  let anchor=null;
  for(const ally of B.units) {
    const other=unitRank(ally);
    if(ally.hp<=0||other<0||other>=rank)continue;
    if(!anchor||ally.x>anchor.x)anchor=ally;
  }
  return anchor?anchor.x-(rank-unitRank(anchor))*38:Infinity;
}
function moveRoster(from,to) {
  const count=slotCount();
  if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=count||to>=count||from===to)return false;
  ensureFormation();
  if(S.dice?.faces)S.dice.faces=S.dice.faces.map(i=>i===from?to:i===to?from:i);
  [S.slots[from],S.slots[to]]=[S.slots[to],S.slots[from]];
  // Positions belong to slots; moving a unit never moves the slot.
  [B.spawnT[from],B.spawnT[to]]=[B.spawnT[to],B.spawnT[from]];
  [B.deployDelay[from],B.deployDelay[to]]=[B.deployDelay[to],B.deployDelay[from]];
  for(const u of [...B.units,...(B.stash?.units||[])]) if(u.team===0&&u.heroId){
    if(u.slot===from)u.slot=to;else if(u.slot===to)u.slot=from;
  }
  return true;
}
function formationEditor() {
  ensureFormation();
  const count=slotCount(),ids=S.slots.slice(0,count),active=ids.filter(Boolean);
  const warnings=[];
  if(!ids.some((id,i)=>id&&S.formation[i]===0&&HERO_BY_ID[id].unit.kind==='melee'))warnings.push('전열 근접 부대가 없습니다. 원거리·치유 부대가 먼저 노출될 수 있습니다.');
  if(ids.some((id,i)=>id&&S.formation[i]===2&&HERO_BY_ID[id].unit.kind==='melee'))warnings.push('후열 근접 부대는 앞선 부대가 버티는 동안 공격에 늦게 합류합니다.');
  const rows=FORMATION_NAMES.map((name,r)=>`<div class="formation-preview-row"><b>${name}</b>${ids.map((id,i)=>id&&S.formation[i]===r?`<span>${heroArt(id)}<small>${i+1}. ${HERO_BY_ID[id].unit.name}</small></span>`:'').join('')||'<small>비어 있음</small>'}</div>`).join('');
  const roster=ids.map((id,i)=>`<div class="roster-row"><span class="roster-number">${i+1}</span><div class="roster-name">${id?heroArt(id):''}<b>${id?HERO_BY_ID[id].unit.name:'빈 슬롯'}</b></div><div class="rank-picker" role="group" aria-label="${i+1}번 부대 진형">${FORMATION_NAMES.map((n,r)=>`<button class="btn small ${S.formation[i]===r?'on':''}" data-act="formation" data-i="${i}" data-rank="${r}" aria-pressed="${S.formation[i]===r}" ${id?'':'disabled'}>${n}</button>`).join('')}</div><div class="roster-move"><button class="btn small" data-act="reorder" data-i="${i}" data-to="${i-1}" aria-label="${i+1}번 부대 앞 순서로" ${i===0?'disabled':''}>↑</button><button class="btn small" data-act="reorder" data-i="${i}" data-to="${i+1}" aria-label="${i+1}번 부대 뒤 순서로" ${i===count-1?'disabled':''}>↓</button></div></div>`).join('');
  return `<div class="sec formation-editor"><h3>진형 로스터 <small>${active.length}개 부대 · 위쪽이 적 진영</small></h3><div class="formation-preview">${rows}<div class="formation-home">내 성</div></div><p class="hint">전열이 먼저 접촉하고, 중·후열은 앞선 부대 뒤에서 사거리 안의 적을 공격합니다. 앞선 부대가 전멸하면 후열도 전진해 노출됩니다.</p>${roster}<p class="hint">↑↓로 순서 변경 · 생산은 자동 주사위에 배치한 6면의 확률을 따릅니다.<br>진형 변경은 살아 있는 부대의 이동에도 적용됩니다. 순서 변경은 선택한 진형과 진행 중인 소환 시간을 유지합니다.</p>${warnings.map(w=>`<p class="formation-warning">${w}</p>`).join('')}</div>`;
}

function placeRosterHero(id,slot){
 if(!S.heroes[id]||!HERO_BY_ID[id]||!Number.isInteger(slot)||slot<0||slot>=slotCount())return false;
 const from=S.slots.indexOf(id);
 if(from===slot)return true;
 if(from>=0)return moveRoster(from,slot);
 S.slots[slot]=id;B.spawnT[slot]=S.dice?.progress||0;B.deployDelay[slot]=0;
 ensureFormation();return true;
}
