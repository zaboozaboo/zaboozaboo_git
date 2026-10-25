'use strict';
// Navigation is presentation-only: automatic battles keep running in the lobby.
const MobileShell={
  mode:'lobby',
  init(){
    document.getElementById('lobby-battle').onclick=()=>this.show('battle');
    document.getElementById('realm-help').onclick=()=>UI.modal('<h2>영토의 지원</h2><p>햇살 숲을 확보하면 매 원정 시작에 선발병 2명이 합류합니다.</p><p>훈련장마다 주사위 대기 시간이 10%씩 곱연산으로 줄어듭니다. 금광마다 전투·방치 골드 수입 보너스가 15%p씩 더해집니다.</p><p>성 함락으로 영토를 확보하고, 내 영토를 눌러 시설을 건설하세요.</p>',[{label:'확인'}]);
    document.querySelectorAll('[data-open-panel]').forEach(b=>b.onclick=()=>UI.openSheet(b.dataset.openPanel));
    this.show('lobby');
  },
  show(mode){
    if(preparingFirstExpedition())mode='lobby';
    S.settings.speed=2;this.mode=mode;UI.closeSheet();
    document.getElementById('game').classList.toggle('battle-mode',mode==='battle');
    document.getElementById('game').classList.toggle('lobby-mode',mode==='lobby');
    this.refresh();
    if(mode==='battle')requestAnimationFrame(()=>{fitCanvas();render();});
  },
  refresh(){
    if(!S||!document.getElementById('lobby'))return;
    refreshFirstCamp();
    if(preparingFirstExpedition())return;
    ensureKingdom();
    const map=document.getElementById('kingdom-map-host');
    const mapKey=JSON.stringify(S.kingdom.lands)+':'+S.maxStage;
    if(map.dataset.key!==mapKey){
      map.dataset.key=mapKey;
      const lands=LANDS.filter(l=>S.kingdom.lands[l.id]);
      const nextLand=LANDS.find(l=>!S.kingdom.lands[l.id]);
      const lockedLands=lands.length?LANDS.filter(l=>!S.kingdom.lands[l.id]).map(l=>`<div class="realm-land locked${l===nextLand?' next':''}" aria-label="${l.name} · ${l.boss}단계 성 함락 시 확보">${buildingArt(0)}<b>${l.name}</b><small>${l.boss}단계 성 함락</small>${l===nextLand?'<em>다음 목표</em>':'<i class="realm-lock" aria-hidden="true"></i>'}</div>`).join(''):'';
      map.innerHTML=lands.length?lands.map(l=>{const facility=FACILITIES[S.kingdom.lands[l.id]];return `<button class="realm-land" data-land="${l.id}">${buildingArt(facility?.tile??(l.id==='grove'?2:0))}<b>${l.name.replace('첫 개척지 · ','')}</b><small>${facility?.name||'시설 건설 가능'} <span>›</span></small>${l.id==='grove'?'<em>선발대 주둔</em>':''}</button>`;}).join('')+lockedLands:`<div class="realm-empty">${buildingArt(0)}<b>첫 깃발을 세울 준비</b><span>5단계 성을 함락하면 햇살 숲이 내 영토가 됩니다.</span></div>`;
      bindKingdomMap(map);
    }
    document.getElementById('lobby-region').textContent=kingdomTitle();
    document.getElementById('lobby-best').textContent=`${ownedLands()} / ${LANDS.length} 영토`;
    document.getElementById('realm-effects').innerHTML=`<div><strong>${hasVanguard()?'2':'0'}<small>명</small></strong><span>원정 선발병</span></div><div><strong>−${+(100*(1-Math.pow(.9,facilityCount('training')))).toFixed(1)}<small>%</small></strong><span>주사위 대기</span></div><div><strong>+${facilityCount('mine')*15}<small>%</small></strong><span>골드 수입</span></div>`;
    const target=LANDS.find(l=>!S.kingdom.lands[l.id]);
    const cleared=Math.max(0,S.maxStage-1);
    document.getElementById('realm-target').innerHTML=target?`<b>${target.name.replace('첫 개척지 · ','')}</b><span>${target.boss}단계 성 함락 <small>현재 ${cleared}단계 완료</small></span><progress aria-label="다음 영토까지 진군" max="${target.boss}" value="${Math.min(cleared,target.boss)}"></progress>`:'<b>모든 영토에 왕국의 깃발을!</b><span>6곳 확보 완료 · 시설로 왕국을 발전시키세요.</span>';
    document.getElementById('lobby-battle-label').textContent=B.mode==='stage'?(target?'다음 영토를 향해 · 전투로':'전투로 돌아가기'):B.mode==='war'?'국가전으로 돌아가기':'서열전으로 돌아가기';
    const next=PROMOTIONS[S.lord.promo+1];
    const promotionReady=!!next&&ownedLands()>=next.reqLand&&S.lord.level>=next.reqLevel&&S.maxStage-1>=next.reqStage&&S.gold>=next.cost;
    document.querySelectorAll('.growth-promotion,[data-act="promo"]').forEach(button=>button.classList.toggle('promotion-ready',promotionReady));
    const growthTab=document.querySelector('#tabs [data-tab="lord"]');
    if(growthTab)growthTab.classList.toggle('promotion-notice',promotionReady);
    const promotionHint=document.querySelector('.growth-promotion small');
    if(promotionHint&&next)promotionHint.textContent=promotionReady?'전직 가능 · 확인하기 ›':'전직 조건 보기 ›';
    document.querySelectorAll('#tabs button').forEach(b=>{
      const selected=(UI.tab&&(typeof UX!=='undefined'?UX.group(UI.tab):UI.tab)===b.dataset.tab)||(!UI.tab&&this.mode==='lobby'&&b.dataset.tab==='lobby');
      b.classList.toggle('active',selected);b.setAttribute('aria-current',selected?'page':'false');
      if(!UI.tab){
        const open=selected&&this.mode==='lobby';
        b.classList.toggle('ux-covered',open);
        b.setAttribute('aria-expanded',String(open));
        b.setAttribute('aria-controls',b.dataset.tab==='lobby'?'lobby':'sheet');
        b.setAttribute('aria-label',b.querySelector(':scope > span:not(.game-icon):not(.tab-close-mark)').textContent+(open?' 닫기':''));
        if(open&&!b.querySelector('.tab-close-mark')){const mark=document.createElement('span');mark.className='tab-close-mark';mark.setAttribute('aria-hidden','true');mark.innerHTML='<svg viewBox="0 0 32 32"><path d="M8 8 24 24M24 8 8 24"/></svg>';b.append(mark);}
        if(!open)b.querySelector('.tab-close-mark')?.remove();
      }

    });
  }
};
