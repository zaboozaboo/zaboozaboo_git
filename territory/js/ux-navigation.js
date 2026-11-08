'use strict';
// Navigation state is session-only. Production, combat and save schemas are untouched.
const UX = {
  views: {}, scroll: {}, filter: 'all', sort: 'rarity',
  group(tab) { return ({promo:'lord',kingdom:'lobby'})[tab] || tab; },
  remember() {
    if (!UI.tab) return;
    this.views[UI.tab] = UI.panelView || 'main';
    this.scroll[UI.tab + ':' + (UI.panelView || 'main')] = this.scroller()?.scrollTop || 0;
  },
  select(view, focus = false) {
    this.remember(); UI.panelView = view; this.views[UI.tab] = view;
    UI.renderTab();
    this.restore();
    if(focus) $('#sheet-views [aria-selected="true"]')?.focus({preventScroll:true});
  },
  scroller() { return document.querySelector('#panel [role="tabpanel"]:not(.hidden) .ux-scroll'); },
  restore() { const el=this.scroller();if(el)el.scrollTop=this.scroll[UI.tab+':'+UI.panelView]||0; },
  stage(kind, title, caption) {
    const el=document.createElement('div');el.className='ux-stage ux-stage-'+kind;
    const art=kind==='growth'?buildingArt(0):kind==='war'?heroArt('paladin')+heroArt('cavalry'):(S.slots.slice(0,slotCount()).filter(Boolean).slice(0,2).map(heroArt).join('')||heroArt('militia'));
    el.innerHTML=`<div class="ux-stage-land" aria-hidden="true"></div><div class="ux-stage-art" aria-hidden="true">${art}</div><div class="ux-stage-caption"><b>${title}</b><small>${caption}</small></div>`;
    return el;
  },
  detailButton(details, label) {
    if(!details)return;
    const button=document.createElement('button');button.className='btn ux-detail-open';button.textContent=label+' ›';
    button.onclick=()=>{UI.modal('<div class="ux-detail-list">'+details.innerHTML.replace(/<summary[\s\S]*?<\/summary>/,'')+'</div>');document.querySelectorAll('#modal-box .lord-art').forEach(el=>setLordArt(el,S.lord.cls,S.lord.gender));};
    details.replaceWith(button);
  },
  information(title, html) {
    const b=document.createElement('button');b.className='ux-info';b.type='button';b.textContent='i';b.setAttribute('aria-label',title+' 정보');
    b.onclick=()=>{UI.modal('<h2>'+esc(title)+'</h2><div class="ux-detail-list">'+html+'</div>');document.querySelectorAll('#modal-box .lord-art[data-tier]').forEach(el=>setLordArt(el,S.lord.cls,S.lord.gender));};return b;
  },
  controls(p) {
    const sheet=document.getElementById('sheet'),head=sheet.querySelector('.sheet-head');
    head.querySelector('.ux-info')?.remove();
    const help={
      lord:['성장','<p>왕국 강화는 골드를 사용해 부대 전체 능력치를 높입니다. 10회 강화할 때마다 왕국의 별을 얻고 영주·병사 공격력과 체력이 영구적으로 증가합니다.</p><p>영주는 전투 중 모은 공헌도로 레벨을 돌파합니다. 전직 조건은 전직 탭에서 확인하세요.</p>'],
      promo:['전직','<p>영주 레벨·클리어 단계·확보 영토·골드 조건을 갖추면 전직할 수 있습니다. 전직하면 편성 자리와 부대 능력 배율이 증가합니다.</p>'],
      territory:['부대','<p>편성에서 영웅을 선택한 뒤 배치할 자리를 누르세요. 출전한 영웅의 병력은 주사위 충전으로 생산됩니다.</p><p>편성한 영웅을 누르면 강화·승급·편성 변경을 할 수 있습니다. 도감에서 모든 영웅을 확인합니다.</p>'],
      summon:['영입','<p>영입한 영웅을 편성하면 주사위로 병력이 출격합니다. 중복 영웅은 승급에 필요한 조각으로 전환됩니다.</p>'],
      kingdom:['영토 시설','<p>각 영토에 표시된 단계의 성을 함락하면 영토를 확보합니다. 훈련장과 금광을 각각 2단계까지 강화합니다. 주사위가 1단계는 3 이상, 2단계는 4 이상이면 성공합니다. 실패해도 단계는 유지되며 시도 비용은 소모합니다.</p>'],
      nation:['대전','<p>서열전은 나보다 최대 세 자리 높은 상대에게 도전하며 하루 5회입니다. 승리하면 상대와 서열을 바꿉니다.</p><p>국가전은 하루 3회입니다. 적 성을 함락하거나 제한시간 종료 시 성 체력 비율로 승패를 정합니다.</p>']
    };
    const info=help[UI.tab];if(UI.tab==='promo'&&this.promotionHelp)info[1]+=this.promotionHelp;if(info)head.append(this.information(...info));
    sheet.classList.remove('ux-compact-growth');
    const titles={territory:UI.panelView==='catalog'?'영웅 도감':'부대 편성',lord:UI.panelView==='skills'?'영주 스킬':UI.panelView==='lord'?'영주 성장':'왕국 강화',promo:'영주 전직',kingdom:UI.panelView==='detail'?'시설 관리':'개척영지',summon:UI.panelView==='skills'?'스킬 습득':'영웅 영입',nation:({main:'서열전',war:'국가전',ranking:'순위'})[UI.panelView]};
    document.getElementById('sheet-title').textContent=titles[UI.tab]||'왕국';
    // Keep the selected tab's identity visible and repeat its icon in the sheet.
    const group=this.group(UI.tab);
    sheet.dataset.nav=group;
    const tabs=[...document.querySelectorAll('#tabs button')];
    tabs.forEach(b=>{
      const open=b.dataset.tab===group;
      b.classList.toggle('ux-covered',open);
      b.classList.toggle('active',open);
      b.setAttribute('aria-label',b.querySelector(':scope > span:not(.game-icon):not(.ux-icon-close)').textContent+(open?' 닫기':''));
      b.setAttribute('aria-expanded',String(open));
      b.setAttribute('aria-controls',group==='lobby'?'lobby':'sheet');
      b.querySelector('.ux-icon-close')?.remove();
      b.querySelector('.tab-close-mark')?.remove();
      if(open){const close=document.createElement('span');close.className='tab-close-mark';close.setAttribute('aria-hidden','true');close.innerHTML='<svg viewBox="0 0 32 32" focusable="false"><path d="M8 8 24 24M24 8 8 24"/></svg>';b.append(close);}
      b.title=open?'다시 눌러 닫기':'';
    });
    head.querySelector('.sheet-tab-icon')?.remove();
    const source=tabs.find(b=>b.dataset.tab===group)?.querySelector('.game-icon');
    if(source){const icon=source.cloneNode(true);icon.classList.add('sheet-tab-icon');head.prepend(icon);}
    document.getElementById('sheet-close').hidden=false;
    if(UI.tab==='lord'){
      const card=p.querySelector('.kingdom-growth'),row=card?.querySelector('.growth-current'),action=card?.querySelector('.growth-build');
      if(row&&action){const next=kingdomGrowth();action.innerHTML='<b>강화</b><span>'+gameIcon('coin')+fmt(next.cost)+'</span>';action.setAttribute('aria-label',next.name+' 강화 · '+fmt(next.cost)+' 골드');card.append(action);}
      card?.querySelector('.growth-current>div:nth-child(2)>small')?.remove();
      if(row){const next=kingdomGrowth(),effect=row.querySelector('p');if(effect)effect.innerHTML='<small>'+esc(next.upgrade.name)+'</small><span>'+esc(next.before)+'</span><span class="ux-stat-arrow" aria-hidden="true"> → </span><b>'+esc(next.after)+'</b>';}
      const track=card?.querySelector('.growth-track');if(track){const next=kingdomGrowth();track.setAttribute('title','별 +1까지 '+(10-next.index)+'회 강화');card.querySelector('h3 small').textContent=next.index+'/10 · 별 +1';}

      card?.querySelector('.growth-honors>small')?.remove();
      card?.querySelector('.ux-stage-caption small')?.remove();
      const buff=card?.querySelector('.growth-star-buff');if(buff){const extra=buff.querySelector('div');if(extra){const detail=this.information('왕국의 별',extra.innerHTML+'<p>왕국을 10회 강화할 때마다 별을 얻습니다. 가호는 영주와 모든 병사에게 적용됩니다.</p>');extra.remove();buff.append(detail);}}
      p.querySelector('.growth-identity>p')?.remove();
    }
    p.querySelectorAll('.ux-row-actions [data-act="hlv"]').forEach(b=>{
      b.innerHTML='<b>강화</b><span class="ux-cost">'+gameIcon('coin')+fmt(Number(b.dataset.cost))+'</span>';
      b.setAttribute('aria-label',HERO_BY_ID[b.dataset.id].name+' 강화 · '+fmt(Number(b.dataset.cost))+' 골드');
    });
    // Keep identity and transaction facts on screen; usage instructions live in help.
    if(UI.tab==='territory')p.querySelector('.reserve-section>h3 small')?.replaceChildren(document.createTextNode(Object.keys(S.heroes).length+'종'));
    p.querySelectorAll('.ux-hero-detail').forEach(button=>{
      const id=button.dataset.id,h=HERO_BY_ID[id];if(!h)return;
      button.closest('.ux-hero-row').dataset.rarity=h.rarity;
      if(!button.querySelector('.ux-rarity-badge')){const badge=document.createElement('span');badge.className='ux-rarity-badge';badge.textContent=RARITY[h.rarity].name;button.querySelector('b')?.before(badge);}
    });
    p.querySelectorAll('.ux-battle-options>p.hint>span').forEach(el=>el.remove());
    p.querySelector('.ux-summon-caption small')?.remove();
    p.querySelector('.ux-land-section>p.hint')?.remove();
    p.querySelector('.recruit-hint')?.remove();
    p.querySelector('.recruitment>p.hint')?.remove();
    // Static instructions belong in help; selection feedback stays visible.
    if(UI.tab==='territory'&&!UI.pendingHero&&UI.selSlot===null&&!preparingFirstExpedition())p.querySelector('.roster-dock>p')?.remove();
  },
  compose(p) {
    const mark=(el,label)=>{if(!el)return;el.classList.add('ux-scroll');el.tabIndex=0;el.setAttribute('role','region');el.setAttribute('aria-label',label);};
    p.querySelectorAll('[role="tabpanel"] > div:has(> .ux-heroes),[role="tabpanel"] > div:has(> .ux-land-section)').forEach(el=>el.classList.add('ux-fill'));
    mark(p.querySelector('.ux-hero-list'),'보유 영웅 목록');mark(p.querySelector('.ux-land-list'),'영토 목록');mark(p.querySelector('.skill-inventory')||p.querySelector('.reserve-grid'),UI.tab==='lord'?'장착할 보유 스킬 목록':'배치할 영웅 목록');
    p.querySelector('[role="tabpanel"] > div:has(> .skill-formation)')?.classList.add('ux-fill');
    if(UI.tab==='territory'){
      const roster=p.querySelector('.roster-dock');if(roster)roster.classList.add('ux-command-board','ux-restored-formation');
    }

    if(UI.tab==='lord'){
      const growth=p.querySelector('.kingdom-growth');if(growth)growth.classList.add('ux-ambient-land');
      const identity=p.querySelector('.growth-identity'),details=p.querySelector('.growth-details');
      if(identity){
        const stats=lordStats(),am=armyMult(),ratio=(1+(S.lord.level+1)*.02)/(1+S.lord.level*.02),box=document.createElement('div');box.className='ux-lord-stats';
        box.innerHTML='<small>Lv.'+S.lord.level+' → Lv.'+(S.lord.level+1)+'</small>'+[
          ['영주 공격력',fmt(stats.atk),fmt(stats.atk*1.08)],
          ['영주 체력',fmt(stats.hp),fmt(stats.hp*1.08)],
          ['부대 공격 배율','×'+am.atk.toFixed(2),'×'+(am.atk*ratio).toFixed(2)],
          ['부대 체력 배율','×'+am.hp.toFixed(2),'×'+(am.hp*ratio).toFixed(2)]
        ].map(([label,before,after])=>'<div><span>'+label+'</span><b>'+before+' <em>→ '+after+'</em></b></div>').join('');
        identity.closest('.lord-upgrade').querySelector('.growth-action').before(box);
        const power=identity.querySelector(':scope>b');if(power)power.textContent='전체 전투력 '+fmt(myPower());
        if(details){identity.append(this.information('영주 능력치 · 스킬',details.innerHTML.replace(/<summary[\s\S]*?<\/summary>/,'')));details.remove();}
      }
    }
    if(UI.tab==='promo'){
      const body=p.querySelector('[data-view="promo"] > .sec');
      if(body){body.classList.add('ux-promotion');body.innerHTML=this.promotionPanel();}
      const path=p.querySelector('[data-section="promopath"]');
      this.promotionHelp=path?path.innerHTML.replace(/<summary[\s\S]*?<\/summary>/,''):'';
      path?.remove();
    }
    if(UI.tab==='summon'){
      const skillBox=p.querySelector('.skill-summon'),skillRules=skillBox?.querySelector('.skill-rules');
      if(skillRules){skillBox.querySelector('h3').append(this.information('스킬 습득 확률',skillRules.innerHTML.replace(/<summary[\s\S]*?<\/summary>/,'')));skillRules.remove();}
      const box=p.querySelector('.recruitment:not(.skill-summon)');
      if(box){
        box.classList.add('ux-summon-scene');
        box.querySelectorAll(':scope>p.hint').forEach(el=>el.remove());
        const stage=box.querySelector('.summon-stage');
        stage.innerHTML='<div class="ux-summon-rays" aria-hidden="true"></div><div class="ux-summon-sigil" aria-hidden="true">✦</div><div class="ux-summon-caption">왕국의 부름<small>새로운 영웅이 당신의 깃발 아래로</small></div>';
        const actions=box.querySelector('.summon-btns');
        actions.classList.add('ux-summon-actions');
        actions.querySelectorAll('button[data-act]').forEach(button=>{
          const ten=button.dataset.n==='10',free=!ten&&S.daily.freeSummon>0;
          button.innerHTML='<span class="ux-summon-cost">'+(free?'무료 · '+S.daily.freeSummon+'회':gameIcon('gem')+(ten?'900':'100'))+'</span><b>'+(ten?'10회 영입':'1회 영입')+'</b>';
        });
        const guarantee=document.createElement('p');guarantee.className='ux-summon-guarantee';guarantee.innerHTML='10회 영입 시 <b>고급 이상 1명 확정</b>';actions.after(guarantee);
        const rates=box.querySelector('.rates');
        if(rates){box.querySelector('h3').append(this.information('영입 확률',rates.outerHTML+'<p>중복 영웅은 조각으로 전환됩니다.</p>'));rates.remove();}
      }
    }
    if(UI.tab==='nation'){
      for(const kind of ['duel','war']){
        const section=p.querySelector('[data-ux="'+kind+'"]');if(!section)continue;


        section.classList.add('ux-battle-options');
        const gate=section.querySelector('.expedition-gate');
        if(gate&&gate.querySelector('button')){gate.querySelectorAll('p').forEach(el=>el.remove());gate.querySelector('button').textContent='출전 안내 확인 · 해금';}
        if(kind==='war'&&gate&&!gate.querySelector('button')){
          const next=document.createElement('button');next.className='btn';next.dataset.act='navigate';next.dataset.tab='nation';next.dataset.view='main';next.textContent='서열전으로';gate.append(next);
        }
        const hint=section.querySelector(':scope>p.hint');
        if(hint){
          if(kind==='duel'){const rank=myRank();hint.innerHTML='<b>내 서열 '+rank+'위 · '+titleOf(rank).name+'</b><span>현재 전 능력 +'+Math.round(titleOf(rank).bonus*100)+'% · 승리 시 상대 서열 획득</span>';}
          else hint.innerHTML='<b>적국 선택</b><span>승리해 국가 점수를 올리세요.</span>';
        }
        const rows=[...section.querySelectorAll(':scope > .row')];if(rows.length){const list=document.createElement('div');rows[0].before(list);rows.forEach(el=>list.append(el));mark(list,'서열전 상대 목록');}
      }
      const ranking=p.querySelector('[data-view="ranking"]');if(ranking){
        const sections=[...ranking.querySelectorAll('details')],nav=document.createElement('div');nav.className='ux-ranking-switch';
        sections.forEach((el,i)=>{const b=document.createElement('button');b.className='btn';b.textContent=el.querySelector('summary').textContent;const list=document.createElement('div');[...el.children].filter(c=>c.tagName!=='SUMMARY').forEach(c=>list.append(c));el.replaceWith(list);mark(list,b.textContent);list.hidden=i!==0;b.setAttribute('aria-pressed',i===0);b.onclick=()=>{sections.forEach((_,j)=>{ranking.querySelectorAll('.ux-scroll')[j].hidden=j!==i;nav.children[j].setAttribute('aria-pressed',i===j);});};nav.append(b);});ranking.prepend(nav);
      }
    }
    const catalog=p.querySelector('[data-view="catalog"]');if(catalog){const list=document.createElement('div');while(catalog.firstChild)list.append(catalog.firstChild);catalog.append(list);mark(list,'영웅 도감 목록');}
    if(UI.tab==='kingdom'){
      const detail=p.querySelector('.land-detail');
      if(detail){detail.innerHTML=this.facilityPanel();}
    }
    this.controls(p);
    this.restore();
  },
  heroIds() {
    const placed = S.slots.slice(0,slotCount());
    return Object.keys(S.heroes).filter(id => {
      if(this.filter==='deployed')return placed.includes(id);
      if(this.filter==='reserve')return !placed.includes(id);
      if(this.filter==='upgrade')return S.heroes[id].level<heroMaxLevel(id)&&S.gold>=heroLevelCost(id);
      return true;
    }).sort((a,b)=> {
      const delta=this.sort==='level'?S.heroes[b].level-S.heroes[a].level:this.sort==='cost'?heroLevelCost(a)-heroLevelCost(b):RARITY_ORDER.indexOf(HERO_BY_ID[b].rarity)-RARITY_ORDER.indexOf(HERO_BY_ID[a].rarity);
      return delta || a.localeCompare(b);
    });
  },
  heroList() {
    const ids=this.heroIds();
    return `<section class="sec ux-heroes"><div class="ux-collection-head"><h3>보유 영웅 <small>${ids.length}명</small></h3><select id="ux-hero-sort" aria-label="영웅 정렬">${[['rarity','등급순'],['level','레벨순'],['cost','강화 비용순']].map(([v,n])=>`<option value="${v}" ${v===this.sort?'selected':''}>${n}</option>`).join('')}</select></div><div class="ux-filter-tabs" role="group" aria-label="영웅 대상 필터">${[['all','전체'],['deployed','출전'],['reserve','대기'],['upgrade','강화 가능']].map(([v,n])=>`<button type="button" data-hero-filter="${v}" aria-pressed="${v===this.filter}">${n}</button>`).join('')}</div><div class="ux-hero-list">${ids.map(id=>{
      const h=HERO_BY_ID[id],o=S.heroes[id],placed=S.slots.slice(0,slotCount()).includes(id),max=o.level>=heroMaxLevel(id),star=o.stars<MAX_STARS&&o.shards>=shardsForStar(o.stars);
      return `<article class="ux-hero-row"><button class="ux-hero-detail" data-act="hinfo" data-id="${id}" aria-label="${h.name} 상세">${heroArt(id)}<span><b>${h.name}</b><small>${RARITY[h.rarity].name} · ${h.unit.name}</small><small>Lv.${o.level} · ${placed?'출전 중':'대기 중'} · ★${o.stars}</small><small>${star?'승급 가능':''}</small></span></button><div class="ux-row-actions">${max?'<span>최대 레벨</span>':UI.costBtn('강화',heroLevelCost(id),'hlv',`data-id="${id}"`)}</div></article>`;
    }).join('')||'<div class="ux-empty"><b>조건에 맞는 영웅이 없습니다.</b><p>다른 대상을 선택하거나 전체 목록을 확인하세요.</p><button class="btn" id="ux-filter-reset">전체 보기</button></div>'}</div></section>`;
  },
  landList() {
    ensureKingdom();
    const groups=[['강화 가능',LANDS.filter(l=>S.kingdom.lands[l.id]&&!facilitiesComplete(l.id))],['강화 완료',LANDS.filter(l=>facilitiesComplete(l.id))],['미확보',LANDS.filter(l=>!S.kingdom.lands[l.id])]];
    return `<section class="sec ux-land-section"><header class="ux-summary"><b>내 영토 ${ownedLands()} / ${LANDS.length}</b><span>훈련장 ${facilityCount('training')}단계 · 금광 ${facilityCount('mine')}단계</span></header><div class="ux-land-list">${groups.filter(([,lands])=>lands.length).map(([name,lands])=>`<h3 class="ux-list-divider">${name}<small>${lands.length}곳</small></h3>${lands.map(l=>{const owned=!!S.kingdom.lands[l.id];return `<article class="ux-land-item ${owned?'':'ux-locked'}">${buildingArt(owned?2:0)}<div><b>${esc(l.name.replace('첫 개척지 · ',''))}</b><small>${owned?facilitySummary(l.id):l.boss+'단계 성 함락 시 확보'}</small></div>${owned?`<button class="btn" data-land="${l.id}">시설 관리 ›</button>`:'<span class="ux-state">미확보</span>'}</article>`;}).join('')}`).join('')}</div></section>`;
  },
  facilityPanel() { return facilityDetail(UI.kingdomLand||LANDS[0].id); },
  promotionPanel() {
    const cur=S.lord.promo,next=PROMOTIONS[cur+1],names=CLASSES[S.lord.cls].promos;
    if(!next)return '<header class="ux-summary"><b>'+names[cur]+'</b><span>최종 전직 완료</span></header><p class="ux-support-note">모든 전직을 완료했습니다.</p>';
    const checks=[
      {label:'영주 레벨',value:S.lord.level,target:next.reqLevel,action:'레벨 올리기',tab:'lord',view:'lord'},
      {label:'단계 클리어',value:S.maxStage-1,target:next.reqStage},
      {label:'확보 영토',value:ownedLands(),target:next.reqLand,action:'영지 보기',tab:'kingdom',view:'main'},
      {label:'보유 골드',value:S.gold,target:next.cost}
    ];
    const ready=checks.every(c=>c.value>=c.target);
    return `<header class="ux-promo-summary"><div class="lord-art" data-tier="${cur+1}" aria-hidden="true"></div><div><small>${names[cur]} → ${cur+1}차 전직</small><h3>${names[cur+1]}</h3><div class="ux-promo-benefits"><span>편성 자리 <b>${PROMOTIONS[cur].slots} → ${next.slots}</b></span><span>주사위 <b>D${[6,8,10,12][cur]} → D${[6,8,10,12][cur+1]}</b></span><span>능력 배율 <b>×${PROMOTIONS[cur].mult} → ×${next.mult}</b></span></div></div></header><h3 class="ux-list-divider">전직 조건<small>${checks.filter(c=>c.value>=c.target).length} / 4 충족</small></h3><div class="ux-condition-list">${checks.map(c=>{
      const ok=c.value>=c.target;
      return `<article class="ux-condition-row"><div><b>${c.label}</b><small>${fmt(c.value)} / ${fmt(c.target)}</small></div>${ok?'<span class="ux-state ux-met">✓ 충족</span>':c.action?`<button class="btn" data-act="navigate" data-tab="${c.tab}" data-view="${c.view}">${c.action} ›</button>`:'<span class="ux-state">미충족</span>'}</article>`;
    }).join('')}</div><footer class="ux-panel-footer"><span>${ready?'전직할 수 있습니다.':'미충족 조건을 완료하세요.'}</span>${UI.costBtn('전직',next.cost,'promo','','gold',!checks.slice(0,3).every(c=>c.value>=c.target))}</footer>`;
  },
  arrange(p) {
    let nav=document.getElementById('sheet-views');
    if(!nav){nav=document.createElement('nav');nav.id='sheet-views';document.getElementById('sheet').append(nav);}
    document.getElementById('sheet').append(nav);
    nav.setAttribute('role','tablist');nav.setAttribute('aria-label','세부 메뉴');
    const entries=[];
    const add=(id,name,nodes,route)=>{
      const el=document.createElement('div');el.dataset.view=id;
      for(const node of nodes.filter(Boolean))el.append(node);
      p.append(el);entries.push({id,name,el,route});return el;
    };
    const markup=html=>{const el=document.createElement('div');el.innerHTML=html;return el;};
    const children=[...p.children],lesson=children.filter(el=>el.matches('.learning-step,.first-placement-guide'));
    const content=children.filter(el=>!lesson.includes(el));
    if(UI.tab==='lord'){
      const lordLesson=typeof learningPath==='function'&&learningPath()&&Object.entries(featureRules()).find(([id,r])=>r.tab==='lord'&&!S.learning.intro[id])?.[0]==='lord';
      const growthView=add('main','왕국 강화',[...(!lordLesson?lesson:[]),p.querySelector('.kingdom-growth')]);
      if(lordLesson&&S.lord.level<2)growthView.append(markup('<button class="btn wide" data-act="navigate" data-tab="lord" data-view="lord">다음 성장 · 영주 레벨 돌파 ›</button>'));
      add('lord','영주',[...(lordLesson?lesson:[]),...content.filter(el=>!el.matches('.kingdom-growth,.growth-promotion'))]);
      // Ability details stay collapsible inside the relevant character screen.
      add('skills','스킬',[markup(UI.skillManagement())]);
      add('promo','전직',[], 'promo');
      p.querySelector('.growth-promotion')?.remove();
    }else if(UI.tab==='promo'){
      add('main','왕국 강화',[], 'lord');add('lord','영주',[], 'lord');add('skills','스킬',[], 'lord');add('promo','전직',children);
      UI.panelView='promo';
    }else if(UI.tab==='territory'){
      add('main','편성',children);add('catalog','도감',[markup(UI.heroCatalog())]);
      p.querySelector('[data-section="catalog"]')?.setAttribute('open','');
      if(preparingFirstExpedition())UI.panelView='main';
    }else if(UI.tab==='summon'){
      add('main','영웅 영입',children);add('skills','스킬 습득',[...markup(UI.skillRecruitment()).children]);
    }else if(UI.tab==='nation'&&content.some(el=>el.dataset.ux==='duel')){
      add('main','서열전',[...lesson,p.querySelector('[data-ux="duel"]')]);
      add('war','국가전',[p.querySelector('[data-ux="war"]')]);
      const ranks=content.filter(el=>el.matches('details'));
      ranks.forEach(el=>el.open=true);add('ranking','순위',ranks);
    }else if(UI.tab==='kingdom'){
      add('detail','시설 관리',[p.querySelector('.land-detail')]);
      p.querySelector('.estate-summary')?.remove();
    }else{
      const sections=content.filter(el=>el.matches('details'));
      add('main',UI.tab==='summon'?'영입':'안내',children.filter(el=>!sections.includes(el)));
      sections.forEach((el,i)=>{
        const label=el.querySelector('summary').textContent;
        add(el.dataset.section||'detail'+i,label.replace(/ · 전체.*$/,''),[...el.children].filter(n=>n.tagName!=='SUMMARY'));el.remove();
      });
    }
    const active=entries.some(e=>e.id===UI.panelView&&!e.route)?UI.panelView:'main';UI.panelView=active;
    nav.classList.toggle('hidden',entries.length<2);
    nav.innerHTML=entries.map(e=>`<button role="tab" id="ux-tab-${e.id}" aria-controls="ux-view-${e.id}" aria-selected="${e.id===active}" tabindex="${e.id===active?0:-1}" class="${e.id===active?'active':''}" data-view="${e.id}">${e.name}</button>`).join('');
    entries.forEach(e=>{e.el.id='ux-view-'+e.id;e.el.setAttribute('role','tabpanel');e.el.setAttribute('aria-labelledby','ux-tab-'+e.id);e.el.classList.toggle('hidden',e.id!==active);});
    this.compose(p);
    const choose=e=>{if(e.route){UI.openSheet(e.route);if(e.route==='lord')this.select(e.id);}else this.select(e.id);};
    nav.querySelectorAll('button').forEach((b,i)=>{
      b.onclick=()=>choose(entries[i]);
      b.onkeydown=ev=>{let next;if(ev.key==='ArrowRight')next=(i+1)%entries.length;else if(ev.key==='ArrowLeft')next=(i+entries.length-1)%entries.length;else if(ev.key==='Home')next=0;else if(ev.key==='End')next=entries.length-1;else return;ev.preventDefault();choose(entries[next]);$('#sheet-views [aria-selected="true"]')?.focus();};
    });
    for(const [id,key] of [['ux-hero-filter','filter'],['ux-hero-sort','sort']]){
      const el=p.querySelector('#'+id);if(el)el.onchange=()=>{this[key]=el.value;UI.renderTab();p.scrollTop=0;p.querySelector('#'+id)?.focus();};
    }
    p.querySelectorAll('[data-hero-filter]').forEach(b=>b.onclick=()=>{
      this.filter=b.dataset.heroFilter;this.scroll[UI.tab+':'+UI.panelView]=0;
      const list=this.scroller();if(list)list.scrollTop=0;
      UI.renderTab();p.querySelector('[data-hero-filter="'+this.filter+'"]')?.focus({preventScroll:true});
    });
    p.querySelectorAll('[data-land-back]').forEach(b=>b.onclick=()=>this.select('main'));
    const reset=p.querySelector('#ux-filter-reset');if(reset)reset.onclick=()=>{this.filter='all';UI.renderTab();p.querySelector('[data-hero-filter="all"]')?.focus();};
  }
};
