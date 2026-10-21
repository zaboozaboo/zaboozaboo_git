// DOM UI
'use strict';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const UI = {
  tab: 'territory',
  selSlot: null,

  // ---------- 캐릭터 생성 ----------
  showSetup() {
    $('#setup').classList.remove('hidden');
    const pick = { gender: 'm', cls: 'knight', nation: 'aurum' };
    $('#ch-class').innerHTML = Object.entries(CLASSES).map(([k, c]) =>
      `<button class="choice" data-v="${k}"><span class="big">${c.icon}</span>${c.name}<small>${c.desc}</small></button>`).join('');
    $('#ch-nation').innerHTML = Object.entries(NATIONS).map(([k, n]) =>
      `<button class="choice" data-v="${k}" style="--c:${n.color}"><span class="big">${n.icon}</span><span><b style="color:${n.color}">${n.name}</b><br><small>${n.bonusText}</small></span></button>`).join('');
    const bind = (sel, key) => {
      const btns = document.querySelectorAll(`${sel} .choice`);
      const sync = () => btns.forEach(b => b.classList.toggle('sel', b.dataset.v === pick[key]));
      btns.forEach(b => b.onclick = () => { pick[key] = b.dataset.v; sync(); });
      sync();
    };
    bind('#ch-gender', 'gender'); bind('#ch-class', 'cls'); bind('#ch-nation', 'nation');
    $('#btn-start').onclick = () => {
      const name = $('#in-name').value.trim() || (pick.gender === 'm' ? '아서' : '엘리스');
      newGame({ name, ...pick });
      saveGame();
      $('#setup').classList.add('hidden');
      startMain();
      UI.modal(`<h2>${NATIONS[pick.nation].icon} 건국을 축하합니다!</h2>
        <p>${esc(name)} 영주님, 영토에 놓인 <b>영웅 카드</b>가 건물이 되어 부하를 쏟아냅니다.<br><br>
        💎 1000개를 지급했어요. <b>소환</b> 탭에서 영웅을 모으고,<br><b>전직</b>할수록 영토 슬롯이 2→5칸으로 늘어납니다.</p>`, [{ label: '출정!', cls: 'primary' }]);
    };
  },

  // ---------- 메인 ----------
  initMain() {
    $('#game').classList.remove('hidden');
    document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => { UI.tab = b.dataset.tab; UI.selSlot = null; UI.renderTab(); });
    $('#btn-skill').onclick = () => { if (!castSkill()) UI.toast('스킬을 아직 사용할 수 없습니다'); };
    $('#btn-auto').onclick = () => { S.settings.autoSkill = !S.settings.autoSkill; UI.refresh(); };
    $('#btn-speed').onclick = () => { S.settings.speed = S.settings.speed === 1 ? 2 : 1; UI.refresh(); };
    $('#btn-boss').onclick = () => challengeBoss();
    $('#sk-icon').textContent = CLASSES[S.lord.cls].skill.icon;
    UI.renderTab();
    UI.refresh();
  },

  refresh() {
    const n = NATIONS[S.nation];
    $('#tb-portrait').innerHTML = `${S.lord.gender === 'm' ? '🤴' : '👸'}<small>${CLASSES[S.lord.cls].icon}</small>`;
    $('#tb-portrait').style.borderColor = n.color;
    $('#tb-name').textContent = S.lord.name;
    $('#tb-lv').textContent = 'Lv.' + S.lord.level;
    $('#tb-title').textContent = `${n.icon} ${n.short} · ${lordTitle()} · ${titleOf(myRank()).name}`;
    $('#tb-gold').textContent = fmt(S.gold);
    $('#tb-gems').textContent = fmt(S.gems);
    if (B.mode === 'stage') {
      $('#ct-stage').textContent = `${region(B.stage || S.stage).name} ${B.stage || S.stage}${S.farming ? ' 🔁반복' : ''}`;
    } else $('#ct-stage').textContent = B.mode === 'war' ? '⚔️ 국가전 진행 중' : '🏅 서열전 진행 중';
    $('#ct-power').textContent = `⚡ 전투력 ${fmt(myPower())} · 최고 ${S.maxStage - 1}단계`;
    $('#btn-boss').classList.toggle('hidden', !(S.farming && B.mode === 'stage'));
    $('#btn-auto').classList.toggle('on', S.settings.autoSkill);
    $('#btn-speed').textContent = 'x' + S.settings.speed;
    $('#btn-speed').classList.toggle('on', S.settings.speed > 1);
    const cd = B.skillT > 0 ? Math.ceil(B.skillT) : (B.units.some(u => u.isLord && u.team === 0) ? '' : '💀');
    $('#sk-cd').textContent = cd;
    // 비용 버튼 활성화
    document.querySelectorAll('[data-cost]').forEach(b => {
      const cur = b.dataset.cur || 'gold';
      b.disabled = S[cur] < Number(b.dataset.cost) || b.dataset.block === '1';
    });
  },

  renderTab() {
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === UI.tab));
    const p = $('#panel');
    p.innerHTML = UI['tab_' + UI.tab]();
    p.querySelectorAll('[data-act]').forEach(el => el.onclick = (e) => {
      e.stopPropagation();
      UI.act(el.dataset.act, el.dataset);
    });
    UI.refresh();
  },

  costBtn(label, cost, act, extra = '', cur = 'gold', block = false) {
    return `<button class="btn small ${cur === 'gems' ? 'primary' : 'gold'}" data-act="${act}" ${extra} data-cost="${cost}" data-cur="${cur}" data-block="${block ? 1 : 0}">${label} ${cur === 'gems' ? '💎' : '💰'}${fmt(cost)}</button>`;
  },

  // ---------- 영토 탭 ----------
  tab_territory() {
    const sc = slotCount();
    let slots = '';
    for (let i = 0; i < 5; i++) {
      if (i >= sc) {
        const need = PROMOTIONS.findIndex(p => p.slots > i);
        slots += `<div class="slot locked"><span class="ic">🔒</span>${need}차 전직</div>`;
      } else if (S.slots[i]) {
        const h = HERO_BY_ID[S.slots[i]];
        slots += `<div class="slot filled ${UI.selSlot === i ? 'sel' : ''}" data-act="slot" data-i="${i}" style="border-color:${RARITY[h.rarity].color}"><span class="ic">${h.icon}</span><span class="nm">${h.building}</span><span>Lv.${S.heroes[h.id].level}</span></div>`;
      } else {
        slots += `<div class="slot ${UI.selSlot === i ? 'sel' : ''}" data-act="slot" data-i="${i}"><span class="ic">＋</span>빈 터</div>`;
      }
    }
    const owned = Object.keys(S.heroes).sort((a, b) =>
      RARITY_ORDER.indexOf(HERO_BY_ID[b].rarity) - RARITY_ORDER.indexOf(HERO_BY_ID[a].rarity) || S.heroes[b].level - S.heroes[a].level);
    const am = armyMult();
    const list = owned.map(id => {
      const h = HERO_BY_ID[id], o = S.heroes[id], r = RARITY[h.rarity];
      const placed = S.slots.slice(0, sc).indexOf(id);
      const lm = heroLevelMult(o);
      const u = h.unit;
      const kind = u.kind === 'melee' ? '근접' : u.kind === 'healer' ? '치유' : '원거리';
      const need = shardsForStar(o.stars);
      const maxLv = heroMaxLevel(id);
      return `<div class="hero" style="--r:${r.color}">
        <div class="ic">${h.icon}${placed >= 0 ? '<span class="placed-tag">배치중</span>' : ''}</div>
        <div class="body">
          <div class="nm"><span class="rbadge">${r.name}</span>${h.name}</div>
          <div class="meta"><span class="stars">${'★'.repeat(o.stars)}${'☆'.repeat(MAX_STARS - o.stars)}</span> Lv.${o.level}/${maxLv} · ${h.building}</div>
          <div class="meta">${u.name}${h.count > 1 ? ' x' + h.count : ''} (${kind}) · 공 ${fmt(u.atk * am.atk * lm)} · 체 ${fmt(u.hp * am.hp * lm)} · ${h.spawnCd}s</div>
          <div class="meta">조각 ${o.shards}/${o.stars >= MAX_STARS ? 'MAX' : need}</div>
          <div class="acts">
            ${o.level < maxLv ? UI.costBtn('레벨업', heroLevelCost(id), 'hlv', `data-id="${id}"`) : '<button class="btn small" disabled>최대 레벨</button>'}
            ${o.stars < MAX_STARS && o.shards >= need ? `<button class="btn small primary" data-act="hstar" data-id="${id}">★ 승급</button>` : ''}
            ${placed >= 0 ? `<button class="btn small" data-act="unplace" data-id="${id}">해제</button>` : `<button class="btn small on" data-act="place" data-id="${id}">배치</button>`}
          </div>
        </div></div>`;
    }).join('');
    return `<div class="sec"><h3>영토 배치 <small>${S.slots.slice(0, sc).filter(Boolean).length}/${sc} · 전직하면 슬롯 증가</small></h3>
      <div class="slots">${slots}</div>
      <p class="hint">빈 터를 누르고 영웅의 [배치]를 누르면 그 자리에 건물이 세워집니다.</p></div>
      <div class="sec"><h3>보유 영웅 카드 <small>${owned.length}/${HEROES.length}종</small></h3>${list}</div>`;
  },

  // ---------- 영주 탭 ----------
  tab_lord() {
    const c = CLASSES[S.lord.cls];
    const ls = lordStats();
    const am = armyMult();
    const ups = UPGRADES.map(u => {
      const lv = S.upgrades[u.id];
      const maxed = u.max && lv >= u.max;
      return `<div class="row"><div class="ic">${u.icon}</div><div class="body"><div class="t">${u.name} <small style="color:var(--gold)">Lv.${lv}</small></div><div class="d">${u.desc(lv)}${maxed ? ' (MAX)' : ` → ${u.desc(lv + 1)}`}</div></div>
        ${maxed ? '<button class="btn small" disabled>MAX</button>' : UI.costBtn('강화', upgradeCost(u), 'upg', `data-id="${u.id}"`)}</div>`;
    }).join('');
    return `<div class="sec"><h3>${S.lord.gender === 'm' ? '🤴' : '👸'} ${esc(S.lord.name)} <small>${c.icon} ${lordTitle()} · Lv.${S.lord.level}</small></h3>
      <div class="statgrid">
        <div>영주 공격력<b>${fmt(ls.atk)}</b></div><div>영주 체력<b>${fmt(ls.hp)}</b></div>
        <div>부대 공격 배율<b>x${am.atk.toFixed(2)}</b></div><div>부대 체력 배율<b>x${am.hp.toFixed(2)}</b></div>
        <div>성 체력<b>${fmt(castleMaxHp())}</b></div><div>골드 배율<b>x${goldMult().toFixed(2)}</b></div>
      </div>
      <div class="row" style="margin-top:8px"><div class="ic">${c.skill.icon}</div><div class="body"><div class="t">${c.skill.name} <small style="color:var(--muted)">쿨타임 ${c.skill.cd}s</small></div><div class="d">${c.skill.desc}</div></div></div>
      <div style="margin-top:8px">${UI.costBtn('영주 레벨업', lordLevelCost(), 'lordlv').replace('btn small', 'btn wide')}</div>
      <p class="hint">영주 레벨 1당 부대 전체 능력치 +2%, 영주 본인 능력치 +8%</p></div>
      <div class="sec"><h3>영지 강화</h3>${ups}</div>
      <div class="sec"><h3>기타</h3><button class="btn small danger" data-act="reset">데이터 초기화</button></div>`;
  },

  // ---------- 소환 탭 ----------
  tab_summon() {
    const total = Object.values(RARITY).reduce((a, r) => a + r.weight, 0);
    return `<div class="sec"><h3>영웅 소환 <small>누적 ${S.stats.summons}회</small></h3>
      <div class="summon-hero">🎴</div>
      <p class="hint" style="text-align:center">영웅 카드를 뽑아 영토에 건물로 세우세요. 중복 카드는 조각이 되어 ★승급에 쓰입니다.</p>
      <div class="summon-btns">
        ${S.daily.freeSummon > 0 ? '<button class="btn gold" data-act="summon" data-n="1" data-free="1">무료 1회</button>' : ''}
        ${UI.costBtn('1회', 100, 'summon', 'data-n="1"', 'gems').replace('btn small', 'btn')}
        ${UI.costBtn('10회', 900, 'summon', 'data-n="10"', 'gems').replace('btn small', 'btn')}
      </div>
      <p class="hint" style="text-align:center">10회 소환 시 SR 이상 1장 확정</p>
      <div class="rates">${RARITY_ORDER.map(r => `<span><span class="rbadge" style="--r:${RARITY[r].color}">${r}</span>${(RARITY[r].weight / total * 100).toFixed(0)}%</span>`).join('')}</div></div>
      <div class="sec"><h3>도감</h3>${HEROES.map(h => {
        const o = S.heroes[h.id];
        return `<div class="row" style="${o ? '' : 'opacity:.35'}"><div class="ic">${h.icon}</div><div class="body"><div class="t"><span class="rbadge" style="--r:${RARITY[h.rarity].color}">${h.rarity}</span>${h.name}</div><div class="d">${h.building} → ${h.unit.name}${h.count > 1 ? ' x' + h.count : ''}</div></div>${o ? '★' + o.stars : '미보유'}</div>`;
      }).join('')}</div>`;
  },

  // ---------- 전직 탭 ----------
  tab_promo() {
    const c = CLASSES[S.lord.cls];
    const cur = S.lord.promo;
    const path = PROMOTIONS.map((p, i) => `<div class="promo-step ${i < cur ? 'done' : i === cur ? 'cur' : ''}">${i === 0 ? '기본' : i + '차'}<b>${c.promos[i]}</b>슬롯 ${p.slots} · x${p.mult}</div>`).join('');
    let next = '';
    if (cur < PROMOTIONS.length - 1) {
      const p = PROMOTIONS[cur + 1];
      const okL = S.lord.level >= p.reqLevel, okS = S.maxStage - 1 >= p.reqStage, okG = S.gold >= p.cost;
      next = `<div class="sec"><h3>${cur + 1}차 전직: ${c.promos[cur + 1]}</h3>
        <div class="req ${okL ? 'ok' : 'no'}">영주 레벨 ${p.reqLevel} 이상 (현재 ${S.lord.level})</div>
        <div class="req ${okS ? 'ok' : 'no'}">스테이지 ${p.reqStage} 클리어 (현재 ${S.maxStage - 1})</div>
        <div class="req ${okG ? 'ok' : 'no'}">골드 ${fmt(p.cost)}</div>
        <p class="hint">효과: 영토 슬롯 ${PROMOTIONS[cur].slots} → <b>${p.slots}</b>, 전체 능력 배율 x${PROMOTIONS[cur].mult} → <b>x${p.mult}</b>, 외형 변화</p>
        <div style="margin-top:10px">${UI.costBtn('전직하기', p.cost, 'promo', '', 'gold', !(okL && okS)).replace('btn small', 'btn wide')}</div></div>`;
    } else next = `<div class="sec"><h3>최종 전직 완료</h3><p class="hint">${c.promos[cur]}의 경지에 올랐습니다.</p></div>`;
    return `<div class="sec"><h3>${c.icon} ${c.name} 전직 계보</h3><div class="promo-path">${path}</div></div>${next}`;
  },

  // ---------- 국가 탭 ----------
  tab_nation() {
    const n = NATIONS[S.nation];
    const scores = Object.keys(NATIONS).sort((a, b) => S.nationScore[b] - S.nationScore[a]);
    const top = S.nationScore[scores[0]];
    const board = scores.map((k, i) => {
      const nn = NATIONS[k];
      return `<div class="row ${k === S.nation ? 'me' : ''}"><div class="ic">${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div><div class="body"><div class="t">${nn.icon} ${nn.name}</div><div class="bar"><i style="width:${S.nationScore[k] / top * 100}%;background:${nn.color}"></i></div></div><b>${fmt(S.nationScore[k])}</b></div>`;
    }).join('');
    const foes = Object.keys(NATIONS).filter(k => k !== S.nation).map(k =>
      `<button class="btn ${S.daily.war > 0 ? 'danger' : ''}" style="flex:1" data-act="war" data-k="${k}" ${S.daily.war > 0 ? '' : 'disabled'}>${NATIONS[k].icon} ${NATIONS[k].short} 침공</button>`).join('');
    const rank = myRank();
    const ladder = S.ladder.map((e, i) => {
      const r = i + 1;
      if (e.me) return `<div class="row me"><div class="ic">${r}</div><div class="body"><div class="t">${esc(S.lord.name)} (나)</div><div class="d">${titleOf(r).name} · ⚡${fmt(myPower())}</div></div></div>`;
      const can = r < rank && r >= rank - 3 && S.daily.duel > 0;
      return `<div class="row"><div class="ic">${r <= 3 ? ['👑', '🥈', '🥉'][r - 1] : r}</div><div class="body"><div class="t">${titleOf(r).name} ${e.name}</div><div class="d">${CLASSES[e.cls].icon} ${CLASSES[e.cls].name} · ⚡${fmt(e.power)}</div></div>
        ${can ? `<button class="btn small danger" data-act="duel" data-i="${i}">도전</button>` : ''}</div>`;
    }).join('');
    return `<div class="sec"><h3>${n.icon} ${n.name}</h3>
        <p class="hint" style="margin:0 0 8px">국가 특성: ${n.bonusText} · 1위 국가 소속 시 골드 +10%<br>나의 기여도: <b style="color:var(--gold)">${fmt(S.contribution)}</b></p>${board}</div>
      <div class="sec"><h3>⚔️ 국가전 <small>오늘 남은 출전 ${S.daily.war}/3</small></h3>
        <p class="hint" style="margin:0 0 8px">적국의 성을 공격해 국가 점수를 올리세요. 적 성을 함락하거나 75초 후 성 체력 비율로 판정.</p>
        <div style="display:flex;gap:8px">${foes}</div></div>
      <div class="sec"><h3>🏅 ${n.short} 서열전 <small>남은 도전 ${S.daily.duel}/5</small></h3>
        <p class="hint" style="margin:0 0 8px">내 서열 <b>${rank}위 (${titleOf(rank).name})</b> — 작위 보너스: 전 능력 +${Math.round(titleOf(rank).bonus * 100)}%<br>나보다 최대 3계단 위의 귀족에게 도전할 수 있습니다.</p>
        ${ladder}</div>`;
  },

  // ---------- 행동 ----------
  act(a, d) {
    if (a === 'slot') {
      const i = Number(d.i);
      UI.selSlot = UI.selSlot === i ? null : i;
    } else if (a === 'place') {
      const sc = slotCount();
      let i = UI.selSlot;
      if (i === null || i >= sc) i = S.slots.slice(0, sc).findIndex(x => !x);
      if (i < 0) { UI.toast('빈 터가 없습니다. 교체할 슬롯을 먼저 누르세요'); return; }
      S.slots[i] = d.id; B.spawnT[i] = 0;
      UI.selSlot = null;
      UI.toast(`${HERO_BY_ID[d.id].building} 건설 완료!`);
    } else if (a === 'unplace') {
      const i = S.slots.indexOf(d.id);
      if (i >= 0) S.slots[i] = null;
    } else if (a === 'hlv') {
      if (!spend(heroLevelCost(d.id))) return;
      S.heroes[d.id].level++;
    } else if (a === 'hstar') {
      const o = S.heroes[d.id];
      const need = shardsForStar(o.stars);
      if (o.shards < need) return;
      o.shards -= need; o.stars++;
      UI.toast(`${HERO_BY_ID[d.id].name} ★${o.stars} 승급!`);
    } else if (a === 'upg') {
      const u = UPGRADES.find(x => x.id === d.id);
      if (!spend(upgradeCost(u))) return;
      S.upgrades[u.id]++;
      if (u.id === 'castle') { const old = B.pCastle.max; B.pCastle.max = castleMaxHp(); B.pCastle.hp += B.pCastle.max - old; }
    } else if (a === 'lordlv') {
      if (!spend(lordLevelCost())) return;
      S.lord.level++;
    } else if (a === 'summon') {
      const n = Number(d.n);
      if (d.free) { if (S.daily.freeSummon <= 0) return; S.daily.freeSummon--; }
      else if (!spend(n === 10 ? 900 : 100, 'gems')) return;
      UI.showSummon(summon(n));
    } else if (a === 'promo') {
      const p = PROMOTIONS[S.lord.promo + 1];
      if (!p || S.lord.level < p.reqLevel || S.maxStage - 1 < p.reqStage || !spend(p.cost)) return;
      S.lord.promo++;
      const lord = B.units.find(u => u.isLord && u.team === 0);
      if (lord) lord.hp = 0;
      B.lordRespawn = 0.3;
      UI.modal(`<h2>⭐ 전직 성공!</h2><p><b style="font-size:20px;color:var(--gold)">${lordTitle()}</b><br><br>영토 슬롯이 <b>${slotCount()}칸</b>으로 늘었습니다!<br>전 능력 배율 x${promoInfo().mult}</p>`, [{ label: '확인', cls: 'primary' }]);
    } else if (a === 'war') {
      UI.startWar(d.k);
    } else if (a === 'duel') {
      UI.startDuel(Number(d.i));
    } else if (a === 'reset') {
      UI.modal('<h2>데이터 초기화</h2><p>모든 진행 상황이 삭제됩니다. 정말 초기화할까요?</p>', [{ label: '취소' }, { label: '초기화', cls: 'danger', fn: resetGame }]);
      return;
    }
    saveGame();
    UI.renderTab();
  },

  showSummon(res) {
    const best = res.reduce((a, r) => Math.max(a, RARITY_ORDER.indexOf(r.rarity)), 0);
    const cards = res.map((h, i) => `<div class="rcard ${RARITY_ORDER.indexOf(h.rarity) >= 3 ? 'hi' : ''}" style="--r:${RARITY[h.rarity].color};animation-delay:${i * 0.07}s">
      ${h.isNew ? '<span class="new">NEW</span>' : ''}<div class="ic">${h.icon}</div><span class="rbadge">${h.rarity}</span><div>${h.name.split(' ').pop()}</div></div>`).join('');
    UI.modal(`<h2>${best >= 3 ? '🌟 대박! 🌟' : '소환 결과'}</h2><div class="result-grid" style="${res.length === 1 ? 'grid-template-columns:1fr;max-width:110px;margin:10px auto' : ''}">${cards}</div>`,
      [{ label: '확인', cls: 'primary' }]);
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
    return { mode, deck, scale, spawnRate: 1, color, foeName, lord: { ...lordOpt, scale: scale * 1.5 } };
  },

  startWar(k) {
    if (B.mode !== 'stage') { UI.toast('이미 전투 중입니다'); return; }
    if (S.daily.war <= 0) return;
    S.daily.war--;
    const tier = Math.min(4, Math.floor(S.maxStage / 15));
    const deck = UI.randomDeck(Math.min(5, slotCount() + 1), Math.max(0, tier - 2), Math.min(4, tier + 1));
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
    UI.renderTab();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  startDuel(i) {
    if (B.mode !== 'stage') { UI.toast('이미 전투 중입니다'); return; }
    if (S.daily.duel <= 0) return;
    const foe = S.ladder[i];
    const r = i + 1;
    S.daily.duel--;
    const size = r <= 3 ? 5 : r <= 10 ? 4 : 3;
    const maxR = r <= 2 ? 4 : r <= 6 ? 3 : r <= 12 ? 2 : 1;
    const deck = UI.randomDeck(size, Math.max(0, maxR - 2), maxR);
    const spec = UI.buildSpec('duel', deck, foe.power, '#9b5de5', `${titleOf(r).name} ${foe.name}`,
      { cls: foe.cls, gender: pick(['m', 'f']), promo: Math.min(3, Math.floor((20 - r) / 6)), name: foe.name });
    startSpecial(spec, (res) => {
      const win = res.result === 'win';
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
    UI.renderTab();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // ---------- 공통 ----------
  modal(html, buttons = [{ label: '확인' }]) {
    const box = $('#modal-box');
    box.innerHTML = html + `<div class="modal-actions">${buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-i="${i}">${b.label}</button>`).join('')}</div>`;
    $('#modal').classList.remove('hidden');
    box.querySelectorAll('.modal-actions button').forEach(btn => btn.onclick = () => {
      $('#modal').classList.add('hidden');
      const b = buttons[Number(btn.dataset.i)];
      if (b.fn) b.fn();
    });
  },

  toast(msg) {
    const el = document.createElement('div');
    el.innerHTML = msg;
    $('#toast').appendChild(el);
    setTimeout(() => el.remove(), 2700);
  },
};
window.UI = UI;
