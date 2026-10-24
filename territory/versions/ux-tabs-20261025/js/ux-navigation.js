'use strict';
// Navigation state is session-only. Production, combat and save schemas are untouched.
const UX = {
  views: {}, scroll: {}, filter: 'all', sort: 'rarity',
  group(tab) { return ({promo:'lord',kingdom:'lobby'})[tab] || tab; },
  remember() {
    if (!UI.tab) return;
    this.views[UI.tab] = UI.panelView || 'main';
    this.scroll[UI.tab + ':' + (UI.panelView || 'main')] = $('#panel').scrollTop;
  },
  select(view, focus = false) {
    this.remember(); UI.panelView = view; this.views[UI.tab] = view;
    UI.renderTab();
    $('#panel').scrollTop = this.scroll[UI.tab + ':' + view] || 0;
    if(focus) $('#sheet-views [aria-selected="true"]')?.focus({preventScroll:true});
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
    return `<section class="sec ux-heroes"><h3>보유 영웅 <small>${ids.length}명 표시</small></h3><div class="ux-list-tools"><label>대상 <select id="ux-hero-filter">${[['all','전체'],['deployed','출전 중'],['reserve','대기 중'],['upgrade','강화 가능']].map(([v,n])=>`<option value="${v}" ${v===this.filter?'selected':''}>${n}</option>`).join('')}</select></label><label>정렬 <select id="ux-hero-sort">${[['rarity','등급순'],['level','레벨순'],['cost','강화 비용순']].map(([v,n])=>`<option value="${v}" ${v===this.sort?'selected':''}>${n}</option>`).join('')}</select></label></div><div class="ux-hero-list">${ids.map(id=>{
      const h=HERO_BY_ID[id],o=S.heroes[id],placed=S.slots.slice(0,slotCount()).includes(id),max=o.level>=heroMaxLevel(id),star=o.stars<MAX_STARS&&o.shards>=shardsForStar(o.stars);
      return `<article class="ux-hero-row"><button class="ux-hero-detail" data-act="hinfo" data-id="${id}" aria-label="${h.name} 상세">${heroArt(id)}<span><b>${h.name}</b><small>${RARITY[h.rarity].name} · ${h.unit.name}</small><small>Lv.${o.level} · ${placed?'출전 중':'대기 중'} · ★${o.stars}</small><small>${star?'승급 가능 · ':''}상세 ›</small></span></button><div class="ux-row-actions">${max?'<span>최대 레벨</span>':UI.costBtn('강화',heroLevelCost(id),'hlv',`data-id="${id}"`)}</div></article>`;
    }).join('')||'<div class="ux-empty"><b>조건에 맞는 영웅이 없습니다.</b><p>다른 대상을 선택하거나 전체 목록을 확인하세요.</p><button class="btn" id="ux-filter-reset">전체 보기</button></div>'}</div></section>`;
  },
  landList() {
    ensureKingdom();
    return `<section class="sec"><h3>내 영토 <small>${ownedLands()} / ${LANDS.length}곳 확보</small></h3><p class="hint">영토를 선택하면 시설과 확보 조건을 확인합니다.</p><div class="ux-land-list">${LANDS.map(l=>{const f=S.kingdom.lands[l.id],built=FACILITIES[f],ready=S.maxStage>l.boss;
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
    const choose=e=>{if(e.route){UI.openSheet(e.route);if(e.route==='lord')this.select(e.id);}else this.select(e.id);};
    nav.querySelectorAll('button').forEach((b,i)=>{
      b.onclick=()=>choose(entries[i]);
      b.onkeydown=ev=>{let next;if(ev.key==='ArrowRight')next=(i+1)%entries.length;else if(ev.key==='ArrowLeft')next=(i+entries.length-1)%entries.length;else if(ev.key==='Home')next=0;else if(ev.key==='End')next=entries.length-1;else return;ev.preventDefault();choose(entries[next]);$('#sheet-views [aria-selected="true"]')?.focus();};
    });
    for(const [id,key] of [['ux-hero-filter','filter'],['ux-hero-sort','sort']]){
      const el=p.querySelector('#'+id);if(el)el.onchange=()=>{this[key]=el.value;UI.renderTab();p.scrollTop=0;p.querySelector('#'+id)?.focus();};
    }
    const reset=p.querySelector('#ux-filter-reset');if(reset)reset.onclick=()=>{this.filter='all';UI.renderTab();p.querySelector('#ux-hero-filter')?.focus();};
  }
};
