'use strict';
// Navigation is presentation-only: automatic battles keep running in the lobby.
const MobileShell={
  mode:'lobby',
  init(){
    document.getElementById('battle-home').onclick=()=>this.show('lobby');
    document.getElementById('lobby-battle').onclick=()=>this.show('battle');
    document.getElementById('lobby-challenge').onclick=()=>{challengeBoss();this.show('battle');};
    document.querySelectorAll('[data-open-panel]').forEach(b=>b.onclick=()=>UI.openSheet(b.dataset.openPanel));
    this.show('lobby');
  },
  show(mode){
    S.settings.speed=2;this.mode=mode;UI.closeSheet();
    document.getElementById('game').classList.toggle('battle-mode',mode==='battle');
    document.getElementById('game').classList.toggle('lobby-mode',mode==='lobby');
    this.refresh();
    if(mode==='battle')requestAnimationFrame(()=>{fitCanvas();render();});
  },
  refresh(){
    if(!S||!document.getElementById('lobby'))return;
    ensureKingdom();
    const map=document.getElementById('kingdom-map-host');
    const mapKey=JSON.stringify(S.kingdom.lands)+':'+S.maxStage;
    if(map&&map.dataset.key!==mapKey){map.dataset.key=mapKey;map.innerHTML=kingdomMap();bindKingdomMap(map);}
    const stage=B.stage||S.stage;
    document.getElementById('lobby-region').textContent=kingdomTitle();
    document.getElementById('lobby-stage').textContent=`${stage}단계`;
    document.getElementById('lobby-status').textContent=B.mode!=='stage'?'원정 전투 진행 중 · 전투에서 확인하세요':S.farming?'자동 사냥 중 · 강화 후 돌파하세요':'자동 진군 중 · 다음 영토로';
    document.getElementById('lobby-power').textContent=fmt(myPower());
    document.getElementById('lobby-best').textContent=`내 영토 ${ownedLands()}곳`;
    document.getElementById('lobby-battle-label').textContent=B.mode==='stage'?'전투로 돌아가기':B.mode==='war'?'국가전으로 돌아가기':'서열전으로 돌아가기';
    const challenge=document.getElementById('lobby-challenge');
    challenge.classList.toggle('hidden',!S.farming||B.mode!=='stage');
    challenge.textContent=`${Math.min(S.maxStage,S.stage+1)}단계 돌파 도전`;
    const next=PROMOTIONS[S.lord.promo+1];
    document.getElementById('lobby-promo').textContent=next?`다음 전직 · 영토 ${ownedLands()}/${next.reqLand}곳`:'최종 전직 달성';
    const free=S.daily.freeSummon>0;
    document.getElementById('lobby-recruit-badge').textContent=free?'무료 영입 가능':'새 영웅 영입';
    document.getElementById('lobby-recruit').classList.toggle('available',free);
    const key=S.slots.slice(0,slotCount()).map((id,i)=>`${id}:${S.formation?.[i]}`).join('|');
    const deck=document.getElementById('lobby-deck');
    if(deck.dataset.key!==key){
      deck.dataset.key=key;
      deck.innerHTML=S.slots.slice(0,slotCount()).map((id,i)=>`<button class="lobby-unit" aria-label="${id?HERO_BY_ID[id].unit.name:'빈 슬롯'} 편성"><span class="deck-rank">${FORMATION_NAMES[S.formation?.[i]??1]}</span>${id?heroArt(id):'<span class="deck-empty">+</span>'}<b>${id?HERO_BY_ID[id].unit.name:'배치'}</b></button>`).join('');
      deck.querySelectorAll('button').forEach(b=>b.onclick=()=>UI.openSheet('territory'));
    }
    const route=document.getElementById('lobby-route');
    const promotionReady=!!next&&ownedLands()>=next.reqLand&&S.lord.level>=next.reqLevel&&S.maxStage-1>=next.reqStage&&S.gold>=next.cost;
    document.querySelectorAll('.growth-promotion,[data-act="promo"]').forEach(button=>button.classList.toggle('promotion-ready',promotionReady));
    const growthTab=document.querySelector('#tabs [data-tab="lord"]');
    if(growthTab)growthTab.classList.toggle('promotion-notice',promotionReady);
    const promotionHint=document.querySelector('.growth-promotion small');
    if(promotionHint&&next)promotionHint.textContent=promotionReady?'전직 가능 · 확인하기 ›':'전직 조건 보기 ›';
    const routeKey=`${ownedLands()}:${S.lord.promo}:${S.maxStage}:${promotionReady}`;
    if(route.dataset.key!==routeKey){route.dataset.key=routeKey;route.innerHTML=`<button class="kingdom-milestone ${promotionReady?'promotion-ready':''}"><span class="milestone-icon">${gameIcon('crown')}</span><span class="milestone-copy"><b>${next?CLASSES[S.lord.cls].promos[S.lord.promo+1]+(promotionReady?' 전직 가능':'를 향해'):'왕국의 완성'}</b><span class="milestone-pips">${Array.from({length:next?.reqLand||6},(_,i)=>`<i class="${i<ownedLands()?'filled':''}"></i>`).join('')}</span></span><span class="milestone-count">영토 <b>${Math.min(ownedLands(),next?.reqLand||6)}/${next?.reqLand||6}</b><small>${promotionReady?'전직 화면 열기 ›':'전직 조건 보기 ›'}</small></span></button>`;route.querySelector('button').onclick=()=>UI.openSheet('promo');}
    document.querySelectorAll('#tabs button').forEach(b=>{
      const selected=UI.tab===b.dataset.tab||(!UI.tab&&b.dataset.tab==='lobby');
      b.classList.toggle('active',selected);b.setAttribute('aria-current',selected?'page':'false');
    });
  }
};
