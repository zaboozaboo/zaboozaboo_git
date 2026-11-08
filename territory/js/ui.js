// DOM UI
'use strict';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const UI = {
  tab: null, // 열린 탭(팝업 시트). null이면 전장만 보인다
  selSlot: null,
  pendingHero: null,

  // ---------- 캐릭터 생성 ----------
  showSetup() {
    $('#setup').classList.remove('hidden');
    const pick = { gender: 'm', cls: 'knight', nation: 'aurum' };
    let step = 0;
    const goStep = (next) => {
      step = Math.max(0, Math.min(2, next));
      document.querySelectorAll('.creation-page').forEach(el => el.classList.toggle('hidden', Number(el.dataset.step) !== step));
      document.querySelectorAll('.creation-steps li').forEach((el, i) => { el.classList.toggle('current', i === step); el.classList.toggle('done', i < step); if (i === step) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current'); });
      $('#creation-subtitle').textContent = ['왕국이 기억할 이름을 알려주세요.', '당신은 어떤 힘으로 전장을 이끌 건가요?', '함께할 국가를 선택하고 깃발을 올리세요.'][step];
      $('#creation-back').disabled = step === 0;
      $('#creation-next').classList.toggle('hidden', step === 2);
      $('#btn-start').classList.toggle('hidden', step !== 2);
      $('#creation-next').textContent = step === 0 ? '직업 선택 →' : '국가 선택 →';
      $('#setup').scrollTop = 0;
      const first = document.querySelector('.creation-page:not(.hidden) input, .creation-page:not(.hidden) button');
      if (first && next > 0) first.focus({ preventScroll: true });
    };
    $('#creation-back').onclick = () => goStep(step - 1);
    $('#creation-next').onclick = () => goStep(step + 1);
    $('#ch-class').innerHTML = Object.entries(CLASSES).map(([k, c]) =>
      `<button class="choice" data-v="${k}"><span class="big">${c.icon}</span>${c.name}<small>${c.desc}</small></button>`).join('');
    $('#ch-nation').innerHTML = Object.entries(NATIONS).map(([k, n]) =>
      `<button class="choice" data-v="${k}" style="--c:${n.color}"><span class="big">${n.icon}</span><span><b style="color:${n.color}">${n.name}</b><br><small>${n.bonusText}</small></span></button>`).join('');
    const preview = () => {
      setLordArt($('#setup-preview'), pick.cls, pick.gender);
      $('#creation-class-desc').textContent = CLASSES[pick.cls].desc;
      $('#setup-title').textContent = CLASSES[pick.cls].name;
      $('#creation-skill').textContent = CLASSES[pick.cls].skill.name;
      $('#creation-skill-desc').textContent = CLASSES[pick.cls].skill.desc;
      $('#setup-bonus').textContent = NATIONS[pick.nation].bonusText;
      $('.lord-showcase').style.setProperty('--kingdom', NATIONS[pick.nation].color);
    };
    const bind = (sel, key) => {
      const btns = document.querySelectorAll(`${sel} .choice`);
      const sync = () => {
        btns.forEach(b => { const selected = b.dataset.v === pick[key]; b.classList.toggle('sel', selected); b.setAttribute('aria-pressed', selected); });
        preview();
      };
      btns.forEach(b => b.onclick = () => { pick[key] = b.dataset.v; sync(); });
      sync();
    };
    bind('#ch-gender', 'gender'); bind('#ch-class', 'cls'); bind('#ch-nation', 'nation');
    goStep(0);
    polishIcons($('#setup'));
    $('#btn-start').onclick = () => {
      $('#btn-start').disabled = true;
      const name = $('#in-name').value.trim() || (pick.gender === 'm' ? '아서' : '엘리스');
      newGame({ name, ...pick });
      prepareFirstExpedition();
      saveGame();
      $('#setup').classList.add('hidden');
      startMain();

    };
  },

  // ---------- 메인 ----------
  initMain() {
    $('#game').classList.remove('hidden');
    // 탭을 누르면 전장 위로 시트가 올라오고, 같은 탭을 다시 누르면 닫힌다
    document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => {
      if(b.classList.contains('ux-covered')) return b.dataset.tab==='lobby'?MobileShell.show('battle'):UI.closeSheet();
      if(b.dataset.tab==='lobby') return MobileShell.show('lobby');
      if (UI.tab !== b.dataset.tab) UI.openSheet(b.dataset.tab);
    });
    $('#sheet-close').onclick = () => UI.closeSheet();
    $('#sheet-backdrop').onclick = () => UI.closeSheet();
    $('#first-guide').onclick = () => { $('#first-guide').classList.add('hidden'); UI.openSheet('territory'); };
    $('#tb-profile').onclick=()=>{UI.openSheet('lord');UX.select('lord');};
    for(const parent of ['topbar','battle-top']){
      const button=document.createElement('button');button.className='settings-open';button.setAttribute('aria-label','설정');button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/></svg>';button.onclick=()=>UI.openSettings();document.getElementById(parent).append(button);
    }
    $('#btn-skill').onclick = () => { if(!equippedLordSkill().id){UI.openSheet('lord');UX.select('skills');return;} if (!castSkill()) UI.toast('스킬을 아직 사용할 수 없습니다'); };
    $('#btn-auto').onclick = () => { S.settings.autoSkill = !S.settings.autoSkill; UI.refresh(); };
    $('#btn-boss').onclick = () => challengeBoss();
    $('#sk-icon').textContent = equippedLordSkill().icon;
    MobileShell.init();
    UI.refresh();
  },

  openSheet(tab, landId = null) {
    if(preparingFirstExpedition()&&!['summon','territory'].includes(tab))return;
    if(preparingFirstExpedition()&&tab==='territory'&&!S.firstRecruit)return;
    if(tab==='kingdom'&&MobileShell.mode!=='lobby')MobileShell.show('lobby');
    if(tab!=='kingdom'&&MobileShell.mode==='lobby'&&!preparingFirstExpedition())MobileShell.show('battle');
    document.getElementById('game').classList.toggle('realm-detail-open',tab==='kingdom');
    if(tab==='kingdom') UI.kingdomLand=landId||UI.kingdomLand||availableLand()?.id||LANDS[0].id;

    if(typeof UX!=='undefined')UX.remember();
    if(!UI.tab) UI.sheetFocus=document.activeElement;
    UI.panelView=typeof UX!=='undefined'?(UX.views[tab]||'main'):'main';
    if(tab==='kingdom')UI.panelView='detail';
    UI.tab = tab; UI.selSlot = null; UI.pendingHero = null;
    for(const id of ['lobby','deployment-panel','combat-actions']) document.getElementById(id).inert=true;
    document.getElementById('game').classList.add('panel-open');
    $('#sheet').classList.remove('hidden');
    $('#sheet-backdrop').classList.remove('hidden');
    $('#first-guide').classList.add('hidden');
    $('#panel').scrollTop = 0;
    UI.renderTab();
    if(typeof UX!=='undefined')UX.restore();
    if(tab==='kingdom'&&UI.panelView==='detail'){const detail=$('#panel').querySelector('.land-detail');if(detail){detail.tabIndex=-1;detail.focus({preventScroll:true});}}
  },

  closeSheet() {
    if(typeof UX!=='undefined')UX.remember();
    UI.tab = null; UI.pendingHero = null;
    for(const id of ['lobby','deployment-panel','combat-actions']) document.getElementById(id).inert=false;
    document.getElementById('game').classList.remove('panel-open','realm-detail-open');
    document.querySelectorAll('#tabs .ux-covered').forEach(b=>{
      b.classList.remove('ux-covered');b.querySelector('.ux-icon-close')?.remove();b.querySelector('.tab-close-mark')?.remove();b.removeAttribute('title');
      b.setAttribute('aria-label',b.querySelector(':scope > span:not(.game-icon):not(.ux-icon-close)').textContent);
      b.setAttribute('aria-expanded','false');
    });
    if(UI.sheetFocus?.isConnected) UI.sheetFocus.focus({preventScroll:true});
    UI.sheetFocus=null;
    $('#sheet').classList.add('hidden');
    $('#sheet-backdrop').classList.add('hidden');
    document.querySelectorAll('#tabs button').forEach(b => b.classList.remove('active'));
    MobileShell.refresh();
  },

  // 상단 초상화: 현재 전직 단계의 영주 모습
  drawPortrait() {
    const key = `${S.lord.cls}|${S.lord.gender}|${S.lord.promo}|${S.nation}`;
    if (UI.portraitKey === key) return;
    UI.portraitKey = key;
    setLordArt($('#tb-portrait-art'), S.lord.cls, S.lord.gender);
  },

  refresh() {
    if(UI.tab&&typeof learningPanel==='function'){
      const key=learningPanel(UI.tab),panel=$('#panel');
      if(panel.dataset.learning!==key){UI.renderTab();return;}
    }
    refreshBattleGuide();
    MobileShell.refresh();
    if(typeof JourneyGuide!=='undefined')JourneyGuide.refresh();
    if(typeof CombatFeedback!=='undefined')CombatFeedback.refresh();
    const n = NATIONS[S.nation];
    UI.drawPortrait();
    $('#tb-portrait').style.borderColor = n.color;
    $('#tb-stars').textContent = '★'.repeat(S.lord.promo);
    $('#tb-name').textContent = S.lord.name;
    $('#tb-lv').textContent = 'Lv.' + S.lord.level;
    $('#tb-power').textContent = '⚔ '+fmt(myPower());
    $('#tb-title').textContent = `${n.icon} ${n.short} · ${lordTitle()} · ${titleOf(myRank()).name}`;
    $('#tb-portrait').title = $('#tb-title').textContent;
    $('#tb-gold').textContent = fmt(S.gold);
    $('#tb-gems').textContent = fmt(S.gems);
    $('#tb-gold').parentElement.setAttribute('aria-label', '골드 ' + fmt(S.gold));
    $('#tb-gems').parentElement.setAttribute('aria-label', '보석 ' + fmt(S.gems));
    if (B.mode === 'stage') {
      $('#ct-stage').textContent = `${region(B.stage || S.stage).name} ${B.stage || S.stage} · ${B.fortress?'성 공략':'캠프 공략'}${S.farming ? ' 🔁반복' : ''}`;
    } else $('#ct-stage').textContent = `${B.mode === 'war' ? '⚔️ 국가전' : '🏅 서열전'} VS ${B.special.foeName}`;
    // 웨이브 진행도와 남은 시간(전장 위가 아니라 이 줄에 표시)
    const wave = $('#ct-wave'), timer = $('#ct-timer');
    if (B.mode === 'stage') {
      const alive = B.units.filter(u => u.team === 1).length;
      wave.style.width = (B.eCastle ? Math.max(0,1-B.eCastle.hp/B.eCastle.max)*100 : 0) + '%';
      wave.classList.toggle('boss', isBossStage(B.stage));
    } else if (B.eCastle) {
      wave.style.width = Math.max(0, 1 - B.eCastle.hp / B.eCastle.max) * 100 + '%';
      wave.classList.add('boss');
    }
    const left = B.timeLimit ? Math.max(0, B.timeLimit - B.time) : 0;
    timer.textContent = B.timeLimit ? `${B.mode === 'stage' ? '👹 ' : '⏱ '}${left.toFixed(0)}초` : '';
    timer.classList.toggle('warn', B.timeLimit > 0 && left < 10);
    $('#ct-power').textContent = `⚡ 전투력 ${fmt(myPower())} · 최고 ${S.maxStage - 1}단계`;
    $('#btn-boss').classList.toggle('hidden', !(S.farming && B.mode === 'stage'&&!B.ended));
    $('#sk-icon').textContent=equippedLordSkill().icon;
    $('#btn-auto').classList.toggle('on', S.settings.autoSkill);
    const cd = B.skillT > 0 ? Math.ceil(B.skillT) : (B.units.some(u => u.isLord && u.team === 0) ? '' : '💀');
    $('#sk-cd').textContent = cd === '' ? '준비' : cd === '💀' ? '부활' : Math.max(0,B.skillT/S.settings.speed).toFixed(1)+'초';
    $('#btn-auto').textContent='AUTO';
    const targetStage=Math.min(S.maxStage,S.stage+1),bossButton=$('#btn-boss'),bossTarget=isBossStage(targetStage);
    const challengeKey=targetStage+':'+bossTarget;
    if(bossButton.dataset.challenge!==challengeKey){bossButton.dataset.challenge=challengeKey;bossButton.dataset.boss=bossTarget;bossButton.innerHTML=`<span class="challenge-alert" aria-hidden="true">!</span><span><small>${targetStage}단계 · ${bossTarget?'위험 구역':'전선 돌파'}</small><b>${bossTarget?'보스 도전 가능':'다음 단계 도전'}</b></span><strong>도전<span aria-hidden="true"> ›</span></strong>`;bossButton.setAttribute('aria-label',`${targetStage}단계 ${bossTarget?'보스':'돌파'} 도전 시작`);}
    $('#btn-skill').classList.toggle('ready', cd === ''&&!!equippedLordSkill().id);
    if(!$('#btn-skill').querySelector('.battle-charge-meter'))$('#btn-skill').insertAdjacentHTML('beforeend',battleChargeMeter());
    $('#btn-skill').style.setProperty('--meter-value',Math.max(0,Math.min(100,equippedLordSkill().id?(1-B.skillT/equippedLordSkill().cd)*100:0)));
    $('#btn-skill').style.setProperty('--cooldown',Math.max(0,Math.min(100,B.skillT/equippedLordSkill().cd*100))+'%');
    $('#btn-skill').setAttribute('aria-label', equippedLordSkill().name + (!equippedLordSkill().id?' · 습득 및 장착 안내':cd === '' ? ' 사용 가능' : ' 대기 중'));
    $('#btn-auto').setAttribute('aria-pressed', S.settings.autoSkill);
    document.querySelector('[data-tab="summon"]').classList.toggle('has-reward', S.daily.freeSummon > 0);
    polishIcons($('#topbar')); polishIcons($('#battle-top')); polishIcons($('#combat-actions')); polishIcons($('#tabs'));
    const meritCopy=document.getElementById('lord-merit-copy');
    if(meritCopy){
      ensureLordMerit();const cost=lordBreakthroughCost(),value=Math.floor(S.lord.merit),ready=S.lord.merit>=cost;
      meritCopy.textContent=`${fmt(value)} / ${fmt(cost)}`;
      const meter=document.getElementById('lord-merit-meter');meter.querySelector('i').style.width=Math.min(100,S.lord.merit/cost*100)+'%';meter.setAttribute('aria-valuemin','0');meter.setAttribute('aria-valuemax',cost);meter.setAttribute('aria-valuenow',Math.min(value,cost));
      document.getElementById('lord-merit-rate').textContent=`${S.stage}단계 · 분당 +${fmt(lordMeritRate()*60)} 공헌도`;
      const button=document.getElementById('lord-breakthrough');button.disabled=!ready;button.classList.toggle('merit-ready',ready);button.textContent=ready?`Lv.${S.lord.level+1} 돌파`:'공헌도 축적 중';
    }
    // 비용 버튼 활성화
    document.querySelectorAll('[data-cost]').forEach(b => {
      const cur = b.dataset.cur || 'gold';
      b.disabled = S[cur] < Number(b.dataset.cost) || b.dataset.block === '1' || (b.dataset.act==='claimland'&&FacilityRoll.active);
    });
    if(typeof refreshLearningLocks==='function')refreshLearningLocks();
  },

  renderTab() {
    if (!UI.tab) { UI.refresh(); return; }
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === UI.tab));
    $('#sheet-title').textContent = { kingdom: '영토 관리', territory: '나의 부대', lord: '성장', summon: '영웅 영입', promo: '성장', nation: '대전' }[UI.tab];
    const p = $('#panel');
    $('#sheet').dataset.screen=UI.tab;
    const scroll = typeof UX!=='undefined'?(UX.scroller()?.scrollTop||0):p.scrollTop;
    const opened = [...p.querySelectorAll('details[data-section][open]')].map(el=>el.dataset.section);
    const focused = p.contains(document.activeElement) ? document.activeElement.dataset : null;
    const detailsOpen = p.querySelector('.growth-details')?.open;
    const lesson=typeof learningPanel==='function'?learningPanel(UI.tab):'';p.dataset.learning=lesson;
    p.innerHTML = lesson+UI['tab_' + UI.tab]();
    if(typeof learningPath==='function'&&learningPath()&&UI.tab==='lord'&&!S.kingdom?.growth?.step){
      const growth=p.querySelector('.kingdom-growth'),intro=p.querySelector('.learning-step');
      if(growth){if(intro)intro.after(growth);else p.prepend(growth);}
    }
    UI.arrangeViews(p);
    p.querySelectorAll('.lord-art[data-tier]').forEach(el => setLordArt(el, S.lord.cls, S.lord.gender));
    p.querySelectorAll('[data-act]').forEach(el => {
      if (!UI.HOLD_ACTS.includes(el.dataset.act)) return;
      // 강화 버튼: 꾹 누르고 있으면 연속 강화. 키보드(Enter/Space) 클릭은 1회.
      el.onpointerdown = (e) => UI.startHold(el, e);
      el.oncontextmenu = (e) => e.preventDefault();
      el.onclick = (e) => { e.stopPropagation(); if (e.detail === 0) UI.act(el.dataset.act, el.dataset); };
      el.classList.add('holdable');
    });
    p.querySelectorAll('[data-act]:not(.holdable)').forEach(el => el.onclick = (e) => {
      e.stopPropagation();
      UI.act(el.dataset.act, el.dataset);
    });
    polishIcons($('#sheet'));
    bindKingdomMap(p);
    p.querySelectorAll('details[data-section]').forEach(el=>el.open=opened.includes(el.dataset.section));
    if(typeof UX!=='undefined'&&UX.scroller())UX.scroller().scrollTop=scroll;
    if (detailsOpen && p.querySelector('.growth-details')) p.querySelector('.growth-details').open = true;
    if (focused?.act) {
      const replacement = [...p.querySelectorAll('[data-act]')].find(el => !el.closest('.hidden') && el.dataset.act === focused.act && el.dataset.id === focused.id && el.dataset.i === focused.i);
      if (replacement && !replacement.disabled) replacement.focus({preventScroll:true});
    }
    if(preparingFirstExpedition())p.scrollTop=0;
    UI.refresh();
  },

  arrangeViews(p){ UX.arrange(p); },

  HOLD_ACTS: ['hlv'],

  // 현재 비용(강화 대상이 최대치면 null)
  holdCost(act, d) {
    if (act === 'hlv') return S.heroes[d.id].level >= heroMaxLevel(d.id) ? null : heroLevelCost(d.id);
    return lordLevelCost();
  },

  // 짧게 누르면 1회, 0.35초 이상 누르고 있으면 점점 빠르게 연속 강화.
  // 스크롤하려고 버튼 위에서 시작한 터치(pointercancel)는 아무것도 하지 않는다.
  startHold(el, e) {
    if (el.disabled || UI.hold) return;
    if (e.button !== undefined && e.button !== 0) return;
    const act = el.dataset.act;
    const h = UI.hold = { n: 0, timer: 0 };
    const end = (ev) => {
      clearTimeout(h.timer);
      window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end);
      UI.hold = null;
      if (ev.type === 'pointerup' && h.n === 0) { UI.act(act, el.dataset); return; } // 짧은 탭
      if (h.n > 0) { saveGame(); UI.renderTab(); if (h.n > 1) UI.toast(`연속 강화 +${h.n}`); }
    };
    const step = () => {
      if (!UI.act(act, el.dataset, true)) { end({ type: 'stop' }); return; }
      h.n++;
      const cost = UI.holdCost(act, el.dataset);
      if (cost === null) { end({ type: 'stop' }); return; }
      el.dataset.cost = cost;
      el.innerHTML = `${el.dataset.label} <b class="hold-n">+${h.n}</b> 💰${fmt(cost)}`;
      UI.refresh();
      h.timer = setTimeout(step, Math.max(45, 170 - h.n * 10)); // 누르고 있을수록 빨라진다
    };
    window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
    h.timer = setTimeout(step, 350);
  },

  costBtn(label, cost, act, extra = '', cur = 'gold', block = false) {
    return `<button class="btn small ${cur === 'gems' ? 'primary' : 'gold'}" data-act="${act}" ${extra} data-label="${label}" data-cost="${cost}" data-cur="${cur}" data-block="${block ? 1 : 0}">${label} ${cur === 'gems' ? '💎' : '💰'}${fmt(cost)}</button>`;
  },

  // ---------- 영토 탭 ----------
  tab_territory() {
    const sc = slotCount();
    ensureFormation(); ensureDice();
    const rows=FORMATION_NAMES.map((name,rank)=>{
      const members=Array.from({length:5},(_,i)=>{
        const id=S.slots[i];
        if(unlockRank(i)!==rank)return '';
        if(i>=sc)return `<div class="deployment-member fixed-slot locked-slot">${gameIcon('lock')}<b>${i+1}번 자리</b><small>${i-1}차 전직 해금</small></div>`;
        if(!id)return `<button class="deployment-member fixed-slot empty-slot" data-act="slot" data-i="${i}">${gameIcon('plus')}<b>${i+1}번 빈자리</b><small>배치 가능</small></button>`;
        const h=HERO_BY_ID[id],o=S.heroes[id];
        return `<div class="deployment-member unit-tier" data-rarity="${h.rarity}" style="--unit-color:${RARITY[h.rarity].color}">${unitTierTrim(h.rarity)}<span class="unit-rarity" aria-label="${RARITY[h.rarity].name} 등급">${RARITY[h.rarity].name}</span><button class="deployment-unit ${UI.selSlot===i?'sel':''}" data-act="slot" data-i="${i}" aria-label="${h.name} 상세 및 강화">${heroArt(id)}<span><b>${h.unit.name}</b><small>Lv.${o.level}</small></span></button><div class="deployment-controls">${o.level<heroMaxLevel(id)?UI.costBtn('레벨업',heroLevelCost(id),'hlv',`data-id="${id}"`):'<button class="btn small" disabled>최대 레벨</button>'}<span class="deployment-charge"><b>${productionCost(id)} 충전</b></span></div></div>`;
      }).join('');
      return `<div class="deployment-row"><div class="rank-target"><b>${name}</b><small>${['돌격','엄호'][rank]}</small></div><div class="deployment-units">${members}</div></div>`;
    }).join('');
    const owned = Object.keys(S.heroes).sort((a, b) =>
      RARITY_ORDER.indexOf(HERO_BY_ID[b].rarity) - RARITY_ORDER.indexOf(HERO_BY_ID[a].rarity) || S.heroes[b].level - S.heroes[a].level);
    const list=owned.map(id=>{
      const h=HERO_BY_ID[id],o=S.heroes[id],placed=S.slots.slice(0,sc).includes(id);
      return `<div data-rarity="${h.rarity}" class="unit-tier reserve-unit ${placed?'placed':''} ${UI.pendingHero===id?'selected':''}" style="--r:${RARITY[h.rarity].color}">${unitTierTrim(h.rarity)}<button class="reserve-select" data-act="place" data-id="${id}" aria-label="${RARITY[h.rarity].name} ${h.unit.name} ${placed?'이동':'배치'}"><span class="unit-rarity" aria-hidden="true">${RARITY[h.rarity].name}</span>${heroArt(id)}<b>${h.unit.name}</b><small>Lv.${o.level} · ${placed?'출전 중':'배치'}</small></button><button class="reserve-info" data-act="hinfo" data-id="${id}" aria-label="${h.name} 상세">i</button>${o.stars<MAX_STARS&&o.shards>=shardsForStar(o.stars)?`<button class="reserve-star" data-act="hstar" data-id="${id}">승급</button>`:''}</div>`;
    }).join('');
    return `${preparingFirstExpedition()?`<div class="first-placement-guide"><span>${gameIcon('shield')}</span><div><b>${S.slots[0]==='militia'?'전열 배치 완료':UI.pendingHero==='militia'?'빛나는 전열 자리를 터치하세요':'아래 한스 카드를 선택하세요'}</b><small>${S.slots[0]==='militia'?'이제 영주님의 명령으로 출발합니다.':'전열에서 적을 막아줄 첫 번째 부대'}</small></div></div>`:''}<div class="roster-dock ${UI.pendingHero||UI.selSlot!==null?'choosing':''}"><div class="roster-dock-title"><b>출전 배치 · ${S.slots.slice(0,sc).filter(Boolean).length}/${sc}</b><span class="roster-tools">${UI.selSlot!==null&&S.slots[UI.selSlot]?`<button class="btn small" data-act="unplace" data-id="${S.slots[UI.selSlot]}">배치 해제</button>`:''}${UI.pendingHero||UI.selSlot!==null?'<button class="btn small" data-act="cancelplace">취소</button>':''}</span></div><div class="deployment-board"><div class="deployment-heading"><span></span>적 진영<span></span></div>${rows}</div><p role="status">${UI.pendingHero?'열린 자리나 교체할 부대를 누르세요':UI.selSlot!==null?'이동할 자리를 누르거나 아래 영웅을 선택하세요':'영웅 선택 → 열린 자리 터치 · 전직하면 다음 자리 해금'}</p></div>
      <div class="sec reserve-section"><h3>보유 영웅 <small>터치해서 배치 · ${owned.length}/${HEROES.length}종</small></h3><div class="reserve-grid">${list}</div></div>`;
  },

  // ---------- 영주 탭 ----------
  tab_lord() {
    const c = CLASSES[S.lord.cls];
    const ls = lordStats();
    const am = armyMult();
    const next=PROMOTIONS[S.lord.promo+1];
    const ready=next&&ownedLands()>=next.reqLand&&S.lord.level>=next.reqLevel&&S.maxStage-1>=next.reqStage&&S.gold>=next.cost;
    return `<div class="sec lord-upgrade"><div class="growth-portrait"><div class="lord-art" data-tier="${S.lord.promo}" role="img"></div><span>Lv.${S.lord.level}</span></div><div class="growth-identity"><small>${NATIONS[S.nation]?.name||''} · ${lordTitle()}</small><h3>${esc(S.lord.name)}</h3><b>전투력 ${fmt(myPower())}</b><p>레벨업마다 부대 능력치 +2%</p></div><div class="growth-action"><div class="merit-label"><span>영주 공헌도</span><b id="lord-merit-copy"></b></div><div id="lord-merit-meter" class="merit-meter" role="progressbar" aria-label="레벨 돌파 공헌도"><i></i></div><small id="lord-merit-rate"></small><button class="btn gold wide" data-act="lordlv" data-level="${S.lord.level}" id="lord-breakthrough">Lv.${S.lord.level+1} 돌파</button></div></div>
      <button class="growth-promotion ${ready?'promotion-ready':''}" data-act="openpromo"><span>${gameIcon('crown')}<b>${next?c.promos[S.lord.promo+1]+' 전직':'최종 전직 달성'}</b></span><small>${next?(ready?'전직 가능 · 확인하기 ›':'전직 조건 보기 ›'):'왕국의 수호자'}</small></button>
      ${kingdomGrowthPanel()}
      <details class="sec growth-details"><summary>영주 능력치 · 스킬 자세히</summary>      <div class="statgrid">
        <div>영주 공격력<b>${fmt(ls.atk)}</b></div><div>영주 체력<b>${fmt(ls.hp)}</b></div>
        <div>부대 공격 배율<b>x${am.atk.toFixed(2)}</b></div><div>부대 체력 배율<b>x${am.hp.toFixed(2)}</b></div>
        <div>총 부대 정원<b>${armyCap()}명</b></div><div>성 체력<b>${fmt(castleMaxHp())}</b></div><div>골드 배율<b>x${goldMult().toFixed(2)}</b></div><div>영토 슬롯<b>${slotCount()}칸</b></div>
      </div>
      <div class="row" style="margin-top:8px"><div class="ic">${equippedLordSkill().icon}</div><div class="body"><div class="t">${equippedLordSkill().name} <small style="color:var(--muted)">쿨타임 ${equippedLordSkill().cd.toFixed(1)}s</small></div><div class="d">${equippedLordSkill().desc}</div></div></div>
</details>`;
  },

  // ---------- 소환 탭 ----------
  tab_summon() {
    const total = Object.values(RARITY).reduce((a, r) => a + r.weight, 0);
    return `<div class="sec recruitment"><h3>왕국의 부름 <small>누적 ${S.stats.summons}회</small></h3>
      <div class="summon-stage"><div class="recruit-banner"><small>새로운 동료, 더 강한 부대</small><h2>왕국을 지킬 영웅을 만나세요</h2></div><div class="recruit-lineup">${['paladin','apprentice','ranger'].map((id,i)=>`<div class="recruit-display recruit-${i}">${heroArt(id)}</div>`).join('')}</div><div class="recruit-guarantee">10회 영입 · <b>고급 이상 1명 확정</b></div></div>
      <p class="hint recruit-hint">영입한 영웅을 편성하면 주사위로 부대가 출격합니다.</p>
      <div class="summon-btns">
        ${S.daily.freeSummon > 0 ? '<button class="btn gold" data-act="summon" data-n="1" data-free="1">1회 영입 · 무료</button>' : UI.costBtn('1회 영입', 100, 'summon', 'data-n="1"', 'gems').replace('btn small', 'btn')}
        ${UI.costBtn('10명 영입', 900, 'summon', 'data-n="10"', 'gems').replace('btn small', 'btn')}
      </div>
      <p class="hint" style="text-align:center">중복 영웅은 조각으로 전환 · 모아서 승급</p>
      <div class="rates">${RARITY_ORDER.map(r => `<span><span class="rbadge" style="--r:${RARITY[r].color}">${RARITY[r].name}</span>${(RARITY[r].weight / total * 100).toFixed(0)}%</span>`).join('')}</div></div>
      `;
  },

  skillTutorial(){
    const k=ensureLordSkills();if(!['draw','equip'].includes(k.tutorial))return '';
    return `<section class="skill-tutorial" role="status"><b>${k.tutorial==='draw'?'1. 첫 스킬 습득':'2. 스킬 장착'}</b><p>${k.tutorial==='draw'?'무료 뽑기로 첫 액티브 스킬을 습득하세요. 처음에는 기본 액티브 2종 중 하나가 등장합니다.':'아래 보유 카드에서 습득한 스킬을 선택하고, 위 액티브 슬롯을 누르세요.'}</p>${k.tutorial==='draw'&&UI.tab!=='summon'?'<button class="btn gold" data-act="navigate" data-tab="summon" data-view="skills">무료 스킬 습득하기</button>':''}</section>`;
  },
  skillRecruitment() {
    const pool=ensureLordSkills().tutorial==='draw'?skillPool().filter(sk=>sk.type==='active'&&sk.tier===0):skillPool(),rarities=Object.keys(SKILL_RARITIES).filter(r=>pool.some(sk=>sk.rarity===r)),total=rarities.reduce((v,r)=>v+SKILL_RARITIES[r].weight,0);
    return `<section class="sec recruitment ux-summon-scene skill-summon"><h3>스킬 습득 <small>${lordTitle()} · ${pool.length}종</small></h3><div class="summon-stage"><div class="ux-summon-rays" aria-hidden="true"></div><div class="ux-summon-sigil" aria-hidden="true">✦</div><div class="ux-summon-caption">스킬 습득</div></div><div class="summon-btns ux-summon-actions">${S.daily.freeSkillSummon>0?'<button class="btn gold" data-act="skillsummon" data-n="1"><span class="ux-summon-cost">무료 · '+S.daily.freeSkillSummon+'회</span><b>1회 습득</b></button>':`<button class="btn primary" data-act="skillsummon" data-n="1" data-cost="100" data-cur="gems"><span class="ux-summon-cost">${gameIcon('gem')}100</span><b>1회 습득</b></button>`}<button class="btn primary" data-act="skillsummon" data-n="10" data-cost="900" data-cur="gems" data-block="${ensureLordSkills().tutorial==='draw'?1:0}"><span class="ux-summon-cost">${gameIcon('gem')}900</span><b>10회 습득</b></button></div><p class="ux-summon-guarantee">${ensureLordSkills().tutorial==='draw'?'첫 습득 · 기본 액티브 2종 중 1종 → 성장에서 장착':'중복 획득으로 <b>스킬 레벨 성장</b>'}</p><details class="skill-rules"><summary>획득 확률 · 레벨 성장</summary><p>매일 무료 1회. 현재 직업의 해금된 스킬만 등장합니다.</p><p>${rarities.map(r=>SKILL_RARITIES[r].name+' '+(SKILL_RARITIES[r].weight/total*100).toFixed(2)+'%').join(' · ')}<br>등급 안에서는 각 스킬이 같은 확률로 등장합니다.</p><p>누적 1 / 2 / 4 / 7 / 11장에 Lv.1 / 2 / 3 / 4 / 5. 이후에도 다음 레벨에 필요한 획득 수가 1장씩 증가합니다. 재료를 소모하지 않으며 레벨마다 기본 효과가 10% 증가합니다.</p><p>전직마다 액티브 2종·패시브 2종 추가. 회복·피해 감소·재사용 감소는 스킬별 상한이 적용됩니다.</p></details></section>`;
  },
  skillManagement() {
    const k=ensureLordSkills(),pending=LORD_SKILL_BY_ID[UI.pendingSkill],owned=skillPool().filter(sk=>k.owned[sk.id]);
    const slot=(id,index)=>{const sk=LORD_SKILL_BY_ID[id],eligible=pending&&(pending.type==='active'?index===-1:index>=0);return `<button class="skill-loadout-slot ${eligible?'skill-target':''}" data-act="skillplace" data-slot="${index}" aria-label="${index<0?'액티브':'패시브 '+(index+1)} · ${sk?sk.name:'빈 슬롯'}"><small>${index<0?'액티브':'패시브 '+(index+1)}</small><span>${sk?sk.icon:'+'}</span><b>${sk?sk.name:'빈 슬롯'}</b>${sk?'<small>Lv.'+skillLevel(k.owned[id])+'</small>':''}</button>`;};
    return `<div class="skill-formation">${UI.skillTutorial()}<div class="roster-dock ${pending?'choosing':''}"><div class="roster-dock-title"><b>스킬 장착 · ${Number(!!k.active)+k.passives.filter(Boolean).length}/5</b>${pending?'<button class="btn small" data-act="skillcancel">취소</button>':''}</div><div class="skill-equip-groups"><section class="skill-active-group"><h3>액티브</h3><div class="skill-loadout">${slot(k.active,-1)}</div></section><section class="skill-passive-group"><h3>패시브</h3><div class="skill-loadout">${k.passives.map((id,i)=>slot(id,i)).join('')}</div></section></div><p role="status">${pending?pending.name+' · 빛나는 슬롯을 눌러 장착하세요':'스킬 선택 → 슬롯 장착'}</p></div><div class="skill-inventory">${['active','passive'].map(type=>`<section class="sec reserve-section"><h3>보유 ${type==='active'?'액티브':'패시브'} <small>${owned.filter(sk=>sk.type===type).length}종</small></h3><div class="reserve-grid skill-reserve-grid">${owned.filter(sk=>sk.type===type).map(sk=>{const r=SKILL_RARITIES[sk.rarity],equipped=k.active===sk.id||k.passives.includes(sk.id);return `<div class="unit-tier reserve-unit ${equipped?'placed':''} ${UI.pendingSkill===sk.id?'selected':''}" style="--r:${r.color}"><button class="reserve-select" data-act="skillselect" data-id="${sk.id}" aria-label="${sk.name} 선택"><span class="unit-rarity">${r.name} · ${sk.type==='active'?'액티브':'패시브'}</span><span class="skill-card-art">${sk.icon}</span><b>${sk.name}</b><small>Lv.${skillLevel(k.owned[sk.id])} · ${equipped?'장착 중':'대기'}</small></button><button class="reserve-info" data-act="skillinfo" data-id="${sk.id}" aria-label="${sk.name} 상세">i</button></div>`;}).join('')||'<p class="skill-empty">아직 습득한 스킬이 없습니다.</p>'}</div></section>`).join('')}</div></div>`;
  },

  showSkill(id) {
    const sk=LORD_SKILL_BY_ID[id];if(!sk||sk.cls!==S.lord.cls)return;
    const k=ensureLordSkills(),copies=k.owned[id]||0,level=copies?skillLevel(copies):1,owned=copies>0&&sk.tier<=S.lord.promo,r=SKILL_RARITIES[sk.rarity];
    const equipped=sk.type==='active'?k.active===id:k.passives.includes(id);
    let selected=Math.max(0,k.passives.indexOf(id)>=0?k.passives.indexOf(id):k.passives.findIndex(v=>!v));
    const actions=[];
    if(owned&&!equipped)actions.push({label:'장착',cls:'gold skill-equip-confirm',fn:()=>UI.act('skillequip',{id,slot:sk.type==='active'?-1:selected})});
    actions.push({label:'닫기'});
    UI.modal(`<div class="hero-detail skill-hero-detail" style="--r:${r.color}"><div class="hc-ic big skill-detail-art">${sk.icon}</div><h2><span class="rbadge">${r.name}</span>${sk.name}</h2><p class="stars">${copies?'Lv.'+level:'미보유'} · ${sk.type==='active'?'액티브':'패시브'}${equipped?' · 장착 중':''}</p><p><b class="trait">${CLASSES[sk.cls].promos[sk.tier]}</b><br>${skillDescription(sk,level)}</p><div class="statgrid"><div>누적 습득<b>${copies}장</b></div><div>다음 레벨<b>${copies?skillNextCopies(level)+'장':'첫 습득 시 Lv.1'}</b></div><div>해금 조건<b>${sk.tier?sk.tier+'차 전직':'기본 직업'}</b></div><div>${sk.type==='active'?'재사용':'적용 방식'}<b>${sk.cd?sk.cd+'초':'장착 시 적용'}</b></div></div>${owned&&sk.type==='passive'?`<section class="skill-slot-picker"><h3>장착 위치</h3><div class="skill-slot-grid">${k.passives.map((current,i)=>`<button type="button" data-equip-slot="${i}" aria-pressed="${i===selected}" ${equipped?'disabled':''}><small>패시브 ${i+1}</small><span>${current?LORD_SKILL_BY_ID[current].icon:'+'}</span><b>${current?LORD_SKILL_BY_ID[current].name:'빈 슬롯'}</b></button>`).join('')}</div><p class="skill-replace-hint" role="status"></p></section>`:''}</div>`,actions);
    const box=$('#modal-box'),hint=box.querySelector('.skill-replace-hint');
    const update=()=>{if(hint)hint.textContent=equipped?'현재 장착된 스킬입니다.':k.passives[selected]?LORD_SKILL_BY_ID[k.passives[selected]].name+' → '+sk.name:'패시브 '+(selected+1)+'에 장착';};update();
    box.querySelectorAll('[data-equip-slot]').forEach(btn=>btn.onclick=()=>{selected=Number(btn.dataset.equipSlot);box.querySelectorAll('[data-equip-slot]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));update();});
  },

  heroCatalog() {
    return `      <details class="sec compact-details" data-section="catalog"><summary>영웅 도감 · 전체 ${HEROES.length}종</summary>${HEROES.map(h => {
        const o = S.heroes[h.id];
        return `<div class="row" style="${o ? '' : 'opacity:.35'}"><div class="ic">${heroArt(h.id)}</div><div class="body"><div class="t"><span class="rbadge" style="--r:${RARITY[h.rarity].color}">${RARITY[h.rarity].name}</span>${h.name}</div><div class="d">${h.trait} · ${h.unit.name} · 1명당 ${productionCost(h.id)} 충전 · 정원 ${h.cap}</div></div>${o ? '★' + o.stars : '미보유'}</div>`;
      }).join('')}</details>`;
  },

  // ---------- 전직 탭 ----------
  tab_kingdom() { return kingdomPanel(); },

  tab_promo() {
    const c = CLASSES[S.lord.cls];
    const cur = S.lord.promo;
    const path = PROMOTIONS.map((p, i) => `<div class="promo-step ${i < cur ? 'done' : i === cur ? 'cur' : ''}"><div class="lord-prev lord-art" data-tier="${i}" role="img" aria-label="전직 영주"></div>${i === 0 ? '기본' : i + '차'}<b>${c.promos[i]}</b>슬롯 ${p.slots} · x${p.mult}</div>`).join('');
    let next = '';
    if (cur < PROMOTIONS.length - 1) {
      const p = PROMOTIONS[cur + 1];
      const okT = ownedLands() >= p.reqLand;
      const okL = S.lord.level >= p.reqLevel, okS = S.maxStage - 1 >= p.reqStage, okG = S.gold >= p.cost;
      next = `<div class="sec"><h3>${cur + 1}차 전직: ${c.promos[cur + 1]}</h3>
        <div class="req ${okL ? 'ok' : 'no'}">영주 레벨 ${p.reqLevel} 이상 (현재 ${S.lord.level})</div>
        <div class="req ${okS ? 'ok' : 'no'}">스테이지 ${p.reqStage} 클리어 (현재 ${S.maxStage - 1})</div>
        <div class="req ${okT ? 'ok' : 'no'}">개척 영토 ${p.reqLand}곳 (현재 ${ownedLands()}곳)</div>
        <div class="req ${okG ? 'ok' : 'no'}">골드 ${fmt(p.cost)}</div>
        <div class="requirement-actions">${!okL?'<button class="btn" data-act="navigate" data-tab="lord" data-view="lord">레벨 올리기</button>':''}${!okT?'<button class="btn" data-act="navigate" data-tab="kingdom">영토 개척</button>':''}</div><p class="hint">효과: 영토 슬롯 ${PROMOTIONS[cur].slots} → <b>${p.slots}</b>, 전체 능력 배율 x${PROMOTIONS[cur].mult} → <b>x${p.mult}</b>, 외형 변화</p>
        <div style="margin-top:10px">${UI.costBtn('전직하기', p.cost, 'promo', '', 'gold', !(okL && okS && okT)).replace('btn small', 'btn wide')}</div></div>`;
    } else next = `<div class="sec"><h3>최종 전직 완료</h3><p class="hint">${c.promos[cur]}의 경지에 올랐습니다.</p></div>`;
    return `${next}<details class="sec compact-details" data-section="promopath"><summary>${c.name} 전직 계보</summary><div class="promo-path">${path}</div></details>`;
  },

  // ---------- 국가 탭 ----------
  tab_nation() {
    if(!expeditionAccess('duel').ready)return `<section class="sec learning-step"><h3>원정 · 잠김</h3><p>${expeditionAccess('duel').reason}</p><p>서열전을 먼저 배우고, 이후 국가전이 열립니다.</p></section>`;
    const duelGate=expeditionAccess('duel'),warGate=expeditionAccess('war');
    const gate=(mode,g)=>g.unlocked?'':`<div class="expedition-gate"><b>${mode==='duel'?'서열전':'국가전'} · ${g.ready?'출전 안내':'잠김'}</b><p>${g.reason}</p>${g.ready?`<p>${mode==='duel'?'내 서열보다 최대 세 자리 높은 상대에게 도전합니다. 하루 5회이며, 승리하면 상대와 자리를 바꾸고 작위 보너스를 얻어요.':'다른 국가의 성을 공격합니다. 하루 3회이며, 성 함락 또는 제한시간 종료 시 성 체력 비율로 승패를 정해요.'}</p><button class="btn gold" data-act="expeditionintro" data-mode="${mode}">출전 방법 확인 · ${mode==='duel'?'서열전':'국가전'} 해금</button>`:''}</div>`;
    const n = NATIONS[S.nation];
    const scores = Object.keys(NATIONS).sort((a, b) => S.nationScore[b] - S.nationScore[a]);
    const top = S.nationScore[scores[0]];
    const board = scores.map((k, i) => {
      const nn = NATIONS[k];
      return `<div class="row ${k === S.nation ? 'me' : ''}"><div class="ic">${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div><div class="body"><div class="t">${nn.icon} ${nn.name}</div><div class="bar"><i style="width:${S.nationScore[k] / top * 100}%;background:${nn.color}"></i></div></div><b>${fmt(S.nationScore[k])}</b></div>`;
    }).join('');
    const foes = Object.keys(NATIONS).filter(k => k !== S.nation).map(k =>
      `<button class="btn ${S.daily.war > 0 ? 'danger' : ''}" style="flex:1" data-act="war" data-k="${k}" ${S.daily.war > 0&&warGate.unlocked ? '' : 'disabled'}>${NATIONS[k].icon} ${NATIONS[k].short} 침공</button>`).join('');
    const rank = myRank();
    const rankRows = S.ladder.map((e, i) => {
      const r = i + 1;
      if (e.me) return `<div class="row me"><div class="ic">${r}</div><div class="body"><div class="t">${esc(S.lord.name)} (나)</div><div class="d">${titleOf(r).name} · ⚡${fmt(myPower())}</div></div></div>`;
      const can = duelGate.unlocked && r < rank && r >= rank - 3 && S.daily.duel > 0;
      return `<div class="row"><div class="ic">${r <= 3 ? ['👑', '🥈', '🥉'][r - 1] : r}</div><div class="body"><div class="t">${titleOf(r).name} ${e.name}</div><div class="d">${CLASSES[e.cls].icon} ${CLASSES[e.cls].name} · ⚡${fmt(e.power)}</div></div>
        ${can ? `<button class="btn small danger" data-act="duel" data-i="${i}">도전</button>` : ''}</div>`;
    });
    const ladder=rankRows.slice(Math.max(0,rank-4),rank).join('');
    return `<div class="sec" data-ux="war"><h3>⚔️ 국가전 <small>오늘 남은 출전 ${S.daily.war}/3</small></h3>
        <p class="hint" style="margin:0 0 8px">적국의 성을 공격해 국가 점수를 올리세요. 적 성을 함락하거나 75초 후 성 체력 비율로 판정.</p>
        ${gate('war',warGate)}<div style="display:flex;gap:8px">${foes}</div></div>
      <div class="sec" data-ux="duel"><h3>🏅 ${n.short} 서열전 <small>남은 도전 ${S.daily.duel}/5</small></h3>
        <p class="hint" style="margin:0 0 8px">내 서열 <b>${rank}위 (${titleOf(rank).name})</b> — 작위 보너스: 전 능력 +${Math.round(titleOf(rank).bonus * 100)}%<br>나보다 최대 3계단 위의 귀족에게 도전할 수 있습니다.</p>
        ${gate('duel',duelGate)}${rank===1?'<p class="hint">최고 서열 달성</p>':''}${ladder}</div><details class="sec compact-details" data-section="national"><summary>국가 순위</summary>${board}</details><details class="sec compact-details" data-section="ladder"><summary>전체 서열 보기</summary>${rankRows.join('')}</details>`;
  },

  // ---------- 행동 ----------
  // quiet: 꾹 누르기 연속 강화 중 — 저장/다시 그리기를 생략하고 성공 여부만 돌려준다
  act(a, d, quiet) {
    if(a==='learnfeature'){if(learnFeature(d.feature))UI.renderTab();return;}
    const feedbackBefore=typeof CombatFeedback!=='undefined'&&['hlv','hstar','lordlv','kingdomgrow','promo','claimland'].includes(a)?CombatFeedback.capture():null;
    const feature=typeof featureForAction==='function'?featureForAction(a):null;
    if(feature&&!preparingFirstExpedition()&&!featureAccess(feature).unlocked){if(!quiet)UI.toast(featureAccess(feature).reason||'기능 안내를 먼저 확인하세요.');return;}
    if(preparingFirstExpedition()){
      if(a==='summon'&&d.free==='1'&&Number(d.n)===1&&!S.firstRecruit){playFirstRecruit();return;}
      if(!['slot','place','cancelplace'].includes(a))return;
      if(a==='slot'&&(Number(d.i)!==0||UI.pendingHero!=='militia'))return;
      if(a==='slot'){animateFirstPlacement();return;}
      if(a==='place'&&d.id!=='militia')return;
    }

    if(a==='expeditionintro'){if(acknowledgeExpedition(d.mode))UI.renderTab();return;}
    if(a==='kingdomhome'){MobileShell.show('lobby');return;}
    if(a==='navigate'){UI.openSheet(d.tab);if(d.view)UX.select(d.view);return;}
    if(a==='deployrank'||a==='formation'){return;
    } else if(a==='reorder') {
      if(!moveRoster(Number(d.i),Number(d.to)))return;
      UI.selSlot=null;
      UI.toast('로스터 순서 변경 · 소환 진행 유지');
    } else if (a === 'cancelplace') {
      UI.pendingHero=null; UI.selSlot=null;
    } else if (a === 'slot') {
      const i=Number(d.i);
      if(!Number.isInteger(i)||i<0||i>=slotCount())return;
      if(UI.pendingHero){
        if(!placeRosterHero(UI.pendingHero,i))return;
        UI.toast(`${HERO_BY_ID[UI.pendingHero].unit.name} · ${i+1}번 배치 완료`);
        UI.pendingHero=null;UI.selSlot=null;
      }else if(UI.selSlot!==null&&UI.selSlot!==i&&S.slots[UI.selSlot]){
        if(!moveRoster(UI.selSlot,i))return;UI.selSlot=null;
      }else if(S.slots[i]&&UI.selSlot===null){UI.showHero(S.slots[i]);return;}
      else UI.selSlot=UI.selSlot===i?null:i;
    } else if (a === 'place') {
      UI.panelView='main';
      if(!S.heroes[d.id])return;
      if(UI.selSlot!==null){
        if(!placeRosterHero(d.id,UI.selSlot))return;
        UI.toast(`${HERO_BY_ID[d.id].unit.name} · ${UI.selSlot+1}번 배치 완료`);
        UI.pendingHero=null;UI.selSlot=null;
      }else UI.pendingHero=UI.pendingHero===d.id?null:d.id;
    } else if (a === 'unplace') {
      const i = S.slots.indexOf(d.id);
      if (i >= 0) S.slots[i] = null; UI.selSlot=null; UI.pendingHero=null;
    } else if (a === 'hlv') {
      if (S.heroes[d.id].level >= heroMaxLevel(d.id) || !spend(heroLevelCost(d.id))) return;
      S.heroes[d.id].level++;
    } else if (a === 'hinfo') {
      UI.showHero(d.id);
      return;
    } else if (a === 'hstar') {
      const o = S.heroes[d.id];
      const need = shardsForStar(o.stars);
      if (o.shards < need) return;
      o.shards -= need; o.stars++;
      UI.toast(`${HERO_BY_ID[d.id].name} ★${o.stars} 승급!`);
    } else if (a === 'kingdomgrow') {
      const reward=advanceKingdomGrowth(Number(d.step));
      if(!reward)return;
      if(reward.starEarned){if(feedbackBefore)CombatFeedback.record(feedbackBefore,a);UI.renderTab();playKingdomStarRise();return;}

    } else if (a === 'growthland') {
      MobileShell.show('lobby');UI.openSheet('kingdom');return;
    } else if (a === 'lordlv') {
      if (!breakthroughLord(Number(d.level))) return;

    } else if (a === 'openpromo') { UI.openSheet('promo');
    } else if(a==='skillselect') {
      if(!skillPool().some(sk=>sk.id===d.id)||!ensureLordSkills().owned[d.id])return;
      UI.pendingSkill=UI.pendingSkill===d.id?null:d.id;
    } else if(a==='skillcancel') {
      UI.pendingSkill=null;
    } else if(a==='skillplace') {
      const sk=LORD_SKILL_BY_ID[UI.pendingSkill],slot=Number(d.slot);
      if(!sk){UI.toast('아래에서 장착할 스킬을 선택하세요');return;}
      if((sk.type==='active'&&slot!==-1)||(sk.type==='passive'&&slot<0)){UI.toast(sk.type==='active'?'액티브 슬롯을 선택하세요':'패시브 슬롯을 선택하세요');return;}
      if(!equipLordSkill(sk.id,slot))return;
      UI.pendingSkill=null;UI.toast(sk.name+' 장착');
    } else if(a==='skillinfo') {
      UI.showSkill(d.id);return;
    } else if(a==='skillslot') {
      UI.skillSlot=Number(d.slot);
    } else if(a==='skillequip') {
      if(!equipLordSkill(d.id,d.slot))return;
      UI.toast(LORD_SKILL_BY_ID[d.id].name+' 장착');
    } else if(a==='skillsummon') {
      const result=drawLordSkills(Number(d.n));
      if(!result)return;
      UI.modal('<h2>영주 스킬 획득</h2><div class="result-grid skill-results-shared">'+result.map(r=>'<article class="rcard skill-result" style="--r:'+SKILL_RARITIES[LORD_SKILL_BY_ID[r.id].rarity].color+'"><span>'+LORD_SKILL_BY_ID[r.id].icon+'</span><b>'+LORD_SKILL_BY_ID[r.id].name+'</b><small>'+(r.fresh?'새 스킬 · Lv.1':(r.leveled?'레벨 상승 · ':'누적 '+r.copies+'장 · ')+'Lv.'+r.level)+'</small></article>').join('')+'</div>',[{label:'바로 장착',cls:'primary',fn:()=>{UI.openSheet('lord');UX.select('skills');}},{label:'계속 습득'}]);
    } else if (a === 'summon') {
      const n = Number(d.n);
      if(n!==1&&n!==10)return;
      if(n===1&&S.daily.freeSummon>0)S.daily.freeSummon--;
      else if(d.free){UI.renderTab();return;}
      else if (!spend(n === 10 ? 900 : 100, 'gems')) return;
      UI.showSummon(summon(n));
    } else if (a === 'claimland') {
      if(FacilityRoll.active)return;
      const error=claimLandError(d.id,d.facility,d.level);
      if(error){UI.toast(error);UI.renderTab();return;}
      claimLand(d.id,d.facility,Math.random,d.level);
      UI.kingdomLand=d.id;
      MobileShell.refresh();
      if(feature&&S.learning)S.learning.intro[feature]=true;
      if(feedbackBefore)CombatFeedback.record(feedbackBefore,a);
      saveGame();
      playFacilityRoll({...S.kingdom.lastRoll},()=>UI.renderTab());
      return;

    } else if (a === 'promo') {
      const p = PROMOTIONS[S.lord.promo + 1];
      if (!p || ownedLands() < p.reqLand || S.lord.level < p.reqLevel || S.maxStage - 1 < p.reqStage || !spend(p.cost)) return;
      const previousSlots=slotCount();S.lord.promo++;
      for(let i=previousSlots;i<slotCount();i++)S.formation[i]=unlockRank(i);
      // 전장의 영주를 새 모습으로 바로 교체
      const old = B.units.find(u => u.isLord && u.team === 0);
      if (old) B.fx.push({ type: 'ring', x: old.x, y: old.y, r: 6, max: 90, t: 0, life: 0.8, color: '#ffe066' });
      B.units = B.units.filter(u => !(u.isLord && u.team === 0));
      B.lordRespawn = 0.2;
      UI.modal(`<h2>⭐ 전직 성공!</h2><div class="promo-reveal"><div id="promo-from" class="lord-art" data-tier="${S.lord.promo - 1}" role="img"></div><span>▶</span><div id="promo-to" class="lord-art" data-tier="${S.lord.promo}" role="img"></div></div>
        <p><b style="font-size:20px;color:var(--gold)">${lordTitle()}</b><br><br>영토 슬롯이 <b>${slotCount()}칸</b>으로 늘었습니다!<br>전 능력 배율 x${promoInfo().mult}</p>`, [{ label: '확인', cls: 'primary' }]);
      document.querySelectorAll('.promo-reveal .lord-art').forEach(el => setLordArt(el, S.lord.cls, S.lord.gender));
    } else if (a === 'war') {
      UI.startWar(d.k);
    } else if (a === 'duel') {
      UI.startDuel(Number(d.i));

    }
    if(feature&&S.learning)S.learning.intro[feature]=true;
    if(feedbackBefore)CombatFeedback.record(feedbackBefore,a);
    if (quiet) return true;
    saveGame();
    UI.renderTab();
  },

  // 카드 상세: 특성 설명과 능력치
  showHero(id) {
    const h = HERO_BY_ID[id], o = S.heroes[id], r = RARITY[h.rarity], u = h.unit;
    const am = armyMult(), lm = heroLevelMult(o);
    const kind = u.kind === 'melee' ? '근접' : u.kind === 'healer' ? '치유' : '원거리';
    UI.modal(`<div class="hero-detail" style="--r:${r.color}">
        <div class="hc-ic big">${heroArt(h.id)}</div>
        <h2><span class="rbadge">${r.name}</span>${h.name}</h2>
        <p class="stars">${'★'.repeat(o.stars)}<i>${'★'.repeat(MAX_STARS - o.stars)}</i> Lv.${o.level}/${heroMaxLevel(id)}</p>
        <p><b class="trait">${h.trait}</b><br>${h.traitDesc}</p>
        <div class="statgrid">
          <div>건물<b>${h.building}</b></div><div>부하<b>${u.name} (${kind})</b></div>
          <div>1명 출격<b>${productionCost(id)} 충전</b></div><div>부대 정원<b>${heroCap(id)}명</b></div>
          <div>공격력<b>${fmt(u.atk * am.atk * lm)}</b></div><div>체력<b>${fmt(u.hp * am.hp * lm)}</b></div>
          <div>자동 주사위<b>${(diceCooldown()/S.settings.speed).toFixed(1)}초 / 굴림</b></div><div>조각<b>${o.stars >= MAX_STARS ? 'MAX' : `${o.shards}/${shardsForStar(o.stars)}`}</b></div>
        </div></div>`, [...(o.level<heroMaxLevel(id)?[{label:'강화 · '+fmt(heroLevelCost(id))+' 골드',cls:'gold',fn:()=>{UI.act('hlv',{id});UI.showHero(id);}}]:[]), { label: '편성 변경', fn:()=>{UI.openSheet('territory');UI.act('place',{id});} }, ...(o.stars<MAX_STARS&&o.shards>=shardsForStar(o.stars)?[{label:'승급 · 조각 '+shardsForStar(o.stars),cls:'gold',fn:()=>UI.act('hstar',{id})}]:[]), { label: '닫기' }]);
  },

  showSummon(res) {
    const best = res.reduce((a, r) => Math.max(a, RARITY_ORDER.indexOf(r.rarity)), 0);
    const cards = res.map((h, i) => `<div class="rcard ${RARITY_ORDER.indexOf(h.rarity) >= 2 ? 'hi' : ''}" style="--r:${RARITY[h.rarity].color};animation-delay:${i * 0.07}s">
      ${h.isNew ? '<span class="new">NEW</span>' : ''}<div class="ic">${heroArt(h.id)}</div><span class="rbadge">${RARITY[h.rarity].name}</span><div>${h.name.split(' ').pop()}</div></div>`).join('');
    UI.modal(`<h2>${best >= 2 ? '🌟 영웅 등장! 🌟' : '소환 결과'}</h2><div class="result-grid" style="${res.length === 1 ? 'grid-template-columns:1fr;max-width:110px;margin:10px auto' : ''}">${cards}</div>`,
      [{label:'바로 편성',cls:'primary',fn:()=>UI.openSheet('territory')},{ label: '계속 영입' }]);
  },

  // ---------- 국가전/서열전 ----------
  randomDeck(size, minR, maxR) {
    const deck = [];
    for (let i = 0; i < size; i++) {
      const r = RARITY_ORDER[randInt(minR, maxR)];
      deck.push(pick(HEROES.filter(h => h.rarity === r)).id);
    }
    return deck;
  },

  buildSpec(mode, deck, power, color, foeName, lordOpt) {
    const base = deck.reduce((a, id) => a + RARITY[HERO_BY_ID[id].rarity].score, 0) * 30;
    const scale = Math.max(0.3, power / base);
    // 상대 건물도 내 소환 속도 강화와 같은 속도로 돌아간다
    return { mode, deck, scale, spawnRate: armyMult().spawn, color, foeName, lord: { ...lordOpt, scale: scale * 1.5 } };
  },

  startWar(k) {
    if(!expeditionAccess('war').unlocked){UI.toast(expeditionAccess('war').reason);return;}
    if(!NATIONS[k]||k===S.nation)return;
    if (B.mode !== 'stage') { UI.toast('이미 전투 중입니다'); return; }
    if (S.daily.war <= 0) return;
    S.daily.war--;
    const tier = Math.min(2, Math.floor(S.maxStage / 25));
    const deck = UI.randomDeck(Math.min(5, slotCount() + 1), Math.max(0, tier - 1), Math.min(2, tier + 1));
    const nn = NATIONS[k];
    const power = myPower() * rand(0.85, 1.2);
    const spec = UI.buildSpec('war', deck, power, nn.color, `${nn.icon} ${nn.short} 원정군`,
      { cls: pick(Object.keys(CLASSES)), gender: pick(['m', 'f']), promo: S.lord.promo, name: `${nn.short} 장군` });
    startSpecial(spec, (res) => {
      const win = res.result === 'win';
      const pts = Math.round((win ? 250 : 60) + res.dmgRatio * 300);
      const gem = win ? 80 : 20;
      S.gems += gem; S.contribution += pts; S.nationScore[S.nation] += pts;
      S.nationScore[k] += randInt(40, 160);
      S.stats.wars++; if (win) S.stats.warWins++;
      saveGame();
      UI.modal(`<h2>${win ? '🏆 국가전 승리!' : '💀 국가전 패배'}</h2><p>적 성 피해 ${Math.round(res.dmgRatio * 100)}%<br>국가 점수 +${pts} · 💎 +${gem}</p>`, [{ label: '확인', cls: 'primary' }]);
      UI.renderTab();
    });
    saveGame();
    MobileShell.show('battle');
  },

  startDuel(i) {
    if(!expeditionAccess('duel').unlocked){UI.toast(expeditionAccess('duel').reason);return;}
    if(!Number.isInteger(i)||!S.ladder[i]||S.ladder[i].me||i>=myRank()-1||i<myRank()-4)return;
    if (B.mode !== 'stage') { UI.toast('이미 전투 중입니다'); return; }
    if (S.daily.duel <= 0) return;
    const foe = S.ladder[i];
    const r = i + 1;
    S.daily.duel--;
    const size = r <= 3 ? 5 : r <= 10 ? 4 : 3;
    const maxR = r <= 6 ? 2 : r <= 14 ? 1 : 0;
    const deck = UI.randomDeck(size, Math.max(0, maxR - 1), maxR);
    const spec = UI.buildSpec('duel', deck, foe.power, '#9b5de5', `${titleOf(r).name} ${foe.name}`,
      { cls: foe.cls, gender: pick(['m', 'f']), promo: Math.min(3, Math.floor((20 - r) / 6)), name: foe.name });
    startSpecial(spec, (res) => {
      const win = res.result === 'win';
      (S.expeditionProgress??={}).duelCompleted=true;
      let msg;
      if (win) {
        const me = myRank() - 1;
        const cur = S.ladder.findIndex(e => e === foe);
        [S.ladder[me], S.ladder[cur]] = [S.ladder[cur], S.ladder[me]];
        S.gems += 50;
        msg = `서열 <b>${myRank()}위</b> 달성! 작위: <b>${titleOf(myRank()).name}</b><br>💎 +50`;
      } else { S.gems += 10; msg = `${foe.name}에게 패배했습니다. 💎 +10`; }
      saveGame();
      UI.modal(`<h2>${win ? '🏅 서열전 승리!' : '💀 서열전 패배'}</h2><p>${msg}</p>`, [{ label: '확인', cls: 'primary' }]);
      UI.renderTab();
    });
    saveGame();
    MobileShell.show('battle');
  },

  // ---------- 공통 ----------
  openSettings(){
    const volume=Math.round(GameAudio.volume()*100);
    UI.modal(`<div class="settings-panel"><header class="settings-title"><svg class="settings-standard" viewBox="0 0 240 82" aria-hidden="true"><defs><linearGradient id="standard-cloth" x2="0" y2="1"><stop stop-color="#547d79"/><stop offset="1" stop-color="#2c514f"/></linearGradient><linearGradient id="standard-trim" x2="0" y2="1"><stop stop-color="#f3da9e"/><stop offset="1" stop-color="#9a7848"/></linearGradient></defs><path d="m10 22 30-3v44L10 67l7-22Z M230 22l-30-3v44l30 4-7-22Z" fill="#284943" stroke="#172f35" stroke-width="3"/><path d="M31 12Q120 2 209 12v48Q120 78 31 60Z" fill="url(#standard-cloth)" stroke="#172f35" stroke-width="5"/><path d="M31 12Q120 2 209 12v48Q120 78 31 60Z" fill="none" stroke="url(#standard-trim)" stroke-width="2"/><path d="M39 20Q120 11 201 20M39 55q81 16 162 0" fill="none" stroke="#9ab49a" stroke-opacity=".35"/><path d="M45 18h30v24L60 55 45 42Z" fill="#284452" stroke="#ddc288" stroke-width="2"/><path d="m50 29 6 4 4-9 4 9 6-4-2 13H52Z" fill="#f0d69b"/><path d="M33 14v44M207 14v44" stroke="#ffffff" stroke-opacity=".12" stroke-width="3"/></svg><h2>설정</h2></header><div class="settings-content"><section class="sound-control"><label class="volume-setting" for="effects-volume"><b>효과음</b><output id="volume-value">${volume?volume+'%':'음소거'}</output></label><div class="sound-slider"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4Z M17 8q5 4 0 8"/></svg><input id="effects-volume" type="range" min="0" max="100" step="5" value="${volume}" style="--volume:${volume}%" aria-label="효과음 음량"></div><button id="sound-preview" class="sound-test" aria-label="효과음 미리 듣기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 9 6-9 6Z"/></svg><span>미리 듣기</span></button></section><div class="settings-data"><span><b>데이터 초기화</b><small>영주와 왕국의 모든 진행 삭제</small></span><button id="settings-reset" class="btn danger">초기화</button></div></div></div>`,[]);
    $('#effects-volume').oninput=e=>{S.settings.volume=Number(e.target.value)/100;$('#volume-value').textContent=e.target.value==='0'?'음소거':e.target.value+'%';e.target.style.setProperty('--volume',e.target.value+'%');saveGame();};
    $('#effects-volume').onchange=()=>{saveGame();GameAudio.play('roll');};
    $('#sound-preview').onclick=()=>{GameAudio.play('combo');const panel=$('#sound-preview').closest('.sound-control');panel.classList.remove('sound-pulse');void panel.offsetWidth;panel.classList.add('sound-pulse');};
    $('#settings-reset').onclick=()=>{UI.closeModal();UI.modal('<h2>진행 데이터를 초기화할까요?</h2><p>영주·영웅·재화·개척 영토가 모두 삭제됩니다.<br>삭제한 진행은 되돌릴 수 없습니다.</p>',[{label:'취소',fn:()=>UI.openSettings()},{label:'모두 삭제하고 다시 시작',cls:'danger',fn:resetSavedProgress}]);};
  },

  modal(html, buttons = [{ label: '확인' }]) {
    if (!$('#modal').classList.contains('hidden')) {
      (UI.modalQueue ||= []).push({ html, buttons });
      return;
    }
    const box = $('#modal-box');
    box.classList.toggle('settings-modal',html.includes('class="settings-panel"'));
    box.innerHTML = `<button class="modal-close" aria-label="닫기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg></button>` + html + `<div class="modal-actions">${buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-i="${i}">${b.label}</button>`).join('')}</div>`;
    UI.modalFocus = document.activeElement;
    document.querySelectorAll('.production-token').forEach(token=>{token.getAnimations().forEach(a=>a.cancel());token.remove();});
    $('#modal').classList.remove('hidden');
    $('#game').inert = true; $('#setup').inert = true;
    polishIcons(box);
    const close=box.querySelector('.modal-close');
    close.onclick=()=>UI.closeModal();
    $('#modal').onclick=e=>{if(e.target===$('#modal'))UI.closeModal();};
    close.focus();
    box.querySelectorAll('.modal-actions button').forEach(btn => btn.onclick = () => {
      UI.closeModal();
      const b = buttons[Number(btn.dataset.i)];
      if (b.fn) b.fn();
    });
  },

  closeModal() {
    $('#modal').classList.add('hidden');
    $('#game').inert = false; $('#setup').inert = false;
    if (UI.modalFocus?.isConnected) UI.modalFocus.focus({ preventScroll: true });
    UI.modalFocus = null;
    // Let the confirmed action finish before presenting the next result.
    queueMicrotask(() => {
      if ($('#modal').classList.contains('hidden') && UI.modalQueue?.length) {
        const next = UI.modalQueue.shift(); UI.modal(next.html, next.buttons);
      }
    });
  },

  toast(msg) {
    const el = document.createElement('div');
    el.innerHTML = msg;
    $('#toast').appendChild(el);
    polishIcons(el);
    setTimeout(() => el.remove(), 2700);
  },
};
window.UI = UI;

document.addEventListener('keydown', e => {
  if (!$('#modal').classList.contains('hidden')) {
    if (e.key === 'Escape') { UI.closeModal(); e.preventDefault(); }
    if (e.key === 'Tab') {
      const buttons = [...$('#modal-box').querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]')];
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  } else if (e.key === 'Escape' && UI.tab) UI.closeSheet();
  else if(e.key==='Escape'&&MobileShell.mode==='lobby')MobileShell.show('battle');
});
