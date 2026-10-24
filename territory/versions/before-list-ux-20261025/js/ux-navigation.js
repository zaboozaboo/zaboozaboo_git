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
      territory:['부대','<p>편성에서 영웅을 선택한 뒤 배치할 자리를 누르세요. 출전한 영웅의 병력은 주사위 충전으로 생산됩니다.</p><p>영웅 목록에서 레벨과 비용을 비교하고 강화할 수 있습니다. 영웅을 누르면 특성·승급·편성 변경을 확인합니다.</p>'],
      summon:['영입','<p>영입한 영웅을 편성하면 주사위로 병력이 출격합니다. 중복 영웅은 승급에 필요한 조각으로 전환됩니다.</p>'],
      kingdom:['영토 시설','<p>각 영토에 표시된 단계의 성을 함락하면 영토를 확보합니다. 확보한 영토에는 골드로 시설 하나를 지을 수 있습니다. 건설 후에는 시설을 변경할 수 없습니다.</p>'],
      nation:['대전','<p>서열전은 나보다 최대 세 자리 높은 상대에게 도전하며 하루 5회입니다. 승리하면 상대와 서열을 바꿉니다.</p><p>국가전은 하루 3회입니다. 적 성을 함락하거나 제한시간 종료 시 성 체력 비율로 승패를 정합니다.</p>']
    };
    const info=help[UI.tab];if(UI.tab==='promo'&&this.promotionHelp)info[1]+=this.promotionHelp;if(info)head.append(this.information(...info));
    sheet.classList.toggle('ux-compact-growth',UI.tab==='lord'&&UI.panelView==='main'&&!p.querySelector('.learning-step'));
    // The close glyph lives inside the selected tab's artwork, never in a separate dock.
    const tabs=[...document.querySelectorAll('#tabs button')];
    tabs.forEach(b=>{
      const open=b.dataset.tab===this.group(UI.tab);
      b.classList.toggle('ux-covered',open);
      b.setAttribute('aria-label',b.querySelector(':scope > span:not(.game-icon):not(.ux-icon-close)').textContent+(open?' 닫기':''));
      b.querySelector('.ux-icon-close')?.remove();
      b.setAttribute('aria-expanded',String(open));
      if(open){
        const overlay=document.createElement('span');overlay.className='ux-icon-close';overlay.setAttribute('aria-hidden','true');
        overlay.innerHTML='<svg viewBox="0 0 32 32"><path class="ux-x-outline" d="m10 10 12 12M22 10 10 22"/><path d="m10 10 12 12M22 10 10 22"/></svg>';
        b.append(overlay);
      }
    });
    document.getElementById('sheet-close').hidden=true;
    if(UI.tab==='lord'){
      const card=p.querySelector('.kingdom-growth'),row=card?.querySelector('.growth-current'),action=card?.querySelector('.growth-build');
      if(row&&action){const next=kingdomGrowth();action.innerHTML='<b>강화</b><span>'+gameIcon('coin')+fmt(next.cost)+'</span>';action.setAttribute('aria-label',next.name+' 강화 · '+fmt(next.cost)+' 골드');row.append(action);}
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
    p.querySelector('.ux-land-section>p.hint')?.remove();
    p.querySelector('.recruit-hint')?.remove();
    p.querySelector('.recruitment>p.hint')?.remove();
    // Static instructions belong in help; selection feedback stays visible.
    if(UI.tab==='territory'&&!UI.pendingHero&&UI.selSlot===null&&!preparingFirstExpedition())p.querySelector('.roster-dock>p')?.remove();
  },
  compose(p) {
    const mark=(el,label)=>{if(!el)return;el.classList.add('ux-scroll');el.tabIndex=0;el.setAttribute('role','region');el.setAttribute('aria-label',label);};
    p.querySelectorAll('[role="tabpanel"] > div:has(> .ux-heroes),[role="tabpanel"] > div:has(> .ux-land-section)').forEach(el=>el.classList.add('ux-fill'));
    mark(p.querySelector('.ux-hero-list'),'보유 영웅 목록');mark(p.querySelector('.ux-land-list'),'영토 목록');mark(p.querySelector('.reserve-grid'),'배치할 영웅 목록');
    if(UI.tab==='territory'){
      const roster=p.querySelector('.roster-dock');if(roster)roster.classList.add('ux-command-board');

    }
    if(UI.tab==='lord'){
      const growth=p.querySelector('.kingdom-growth');if(growth)growth.classList.add('ux-ambient-land');
      const identity=p.querySelector('.growth-identity'),details=p.querySelector('.growth-details');
      if(identity){
        const stats=lordStats(),box=document.createElement('div');box.className='ux-lord-stats';
        box.innerHTML='<small>Lv.'+S.lord.level+' → Lv.'+(S.lord.level+1)+'</small>'+[['공격력',stats.atk],['체력',stats.hp]].map(([label,value])=>'<div><span>'+label+'</span><b>'+fmt(value)+' <em>→ '+fmt(value*1.08)+'</em></b></div>').join('');
        identity.append(box);
        const power=identity.querySelector(':scope>b');if(power)power.textContent='전체 전투력 '+fmt(myPower());
        if(details){identity.append(this.information('영주 능력치 · 스킬',details.innerHTML.replace(/<summary[\s\S]*?<\/summary>/,'')));details.remove();}
      }
    }
    if(UI.tab==='promo'){
      const body=p.querySelector('[data-view="promo"] > .sec');
      if(body){
        const req=[...body.querySelectorAll('.req')];if(req.length){const list=document.createElement('div');list.className='ux-requirements';req[0].before(list);req.forEach(el=>list.append(el));mark(list,'전직 조건 목록');}
        const hint=body.querySelector('p.hint');if(hint)hint.classList.add('ux-promo-benefit');
      }
      const path=p.querySelector('[data-section="promopath"]');
      this.promotionHelp=path?path.innerHTML.replace(/<summary[\s\S]*?<\/summary>/,''):'';
      path?.remove();
    }
    if(UI.tab==='nation'){
      for(const kind of ['duel','war']){
        const section=p.querySelector('[data-ux="'+kind+'"]');if(!section)continue;


        const rows=[...section.querySelectorAll(':scope > .row')];if(rows.length){const list=document.createElement('div');rows[0].before(list);rows.forEach(el=>list.append(el));mark(list,'서열전 상대 목록');}
      }
      const ranking=p.querySelector('[data-view="ranking"]');if(ranking){
        const sections=[...ranking.querySelectorAll('details')],nav=document.createElement('div');nav.className='ux-ranking-switch';
        sections.forEach((el,i)=>{const b=document.createElement('button');b.className='btn';b.textContent=el.querySelector('summary').textContent;const list=document.createElement('div');[...el.children].filter(c=>c.tagName!=='SUMMARY').forEach(c=>list.append(c));el.replaceWith(list);mark(list,b.textContent);list.hidden=i!==0;b.setAttribute('aria-pressed',i===0);b.onclick=()=>{sections.forEach((_,j)=>{ranking.querySelectorAll('.ux-scroll')[j].hidden=j!==i;nav.children[j].setAttribute('aria-pressed',i===j);});};nav.append(b);});ranking.prepend(nav);
      }
    }
    const catalog=p.querySelector('[data-view="catalog"]');if(catalog){const list=document.createElement('div');while(catalog.firstChild)list.append(catalog.firstChild);catalog.append(list);mark(list,'영웅 도감 목록');}
    if(UI.tab==='kingdom'){const sec=p.querySelector('.ux-land-section');if(sec)sec.classList.add('ux-ambient-land');}
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
    return `<section class="sec ux-land-section"><h3>내 영토 <small>${ownedLands()} / ${LANDS.length}곳 확보</small></h3><p class="hint">영토를 선택하면 시설과 확보 조건을 확인합니다.</p><div class="ux-land-list">${LANDS.map(l=>{const f=S.kingdom.lands[l.id],built=FACILITIES[f],ready=S.maxStage>l.boss;
      return `<button class="ux-land-row" data-land="${l.id}">${buildingArt(built?.tile||0)}<span><b>${esc(l.name.replace('첫 개척지 · ',''))}</b><small>${built?built.desc:ready?'시설 선택 가능 · '+fmt(l.cost)+' 골드':l.boss+'단계 성 함락 필요'}</small></span><strong>${built?built.name:ready?'건설':'미확보'} ›</strong></button>`;
    }).join('')}</div></section>`;
  },
  arrange(p) {
    let nav=document.getElementById('sheet-views');
    if(!nav){nav=document.createElement('nav');nav.id='sheet-views';document.querySelector('.sheet-head').after(nav);}
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
      add('promo','전직',[], 'promo');
      p.querySelector('.growth-promotion')?.remove();
    }else if(UI.tab==='promo'){
      add('main','왕국 강화',[], 'lord');add('lord','영주',[], 'lord');add('promo','전직',children);
      UI.panelView='promo';
    }else if(UI.tab==='territory'){
      add('main','편성',children);add('heroes','영웅 목록',[markup(this.heroList())]);
      if(preparingFirstExpedition())UI.panelView='main';
    }else if(UI.tab==='nation'&&content.some(el=>el.dataset.ux==='duel')){
      add('main','서열전',[...lesson,p.querySelector('[data-ux="duel"]')]);
      add('war','국가전',[p.querySelector('[data-ux="war"]')]);
      const ranks=content.filter(el=>el.matches('details'));
      ranks.forEach(el=>el.open=true);add('ranking','순위',ranks);
    }else if(UI.tab==='kingdom'){
      add('main','영토 목록',[markup(this.landList())]);
      add('detail','시설 관리',[...lesson,p.querySelector('.land-detail')]);
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
    const reset=p.querySelector('#ux-filter-reset');if(reset)reset.onclick=()=>{this.filter='all';UI.renderTab();p.querySelector('[data-hero-filter="all"]')?.focus();};
  }
};
