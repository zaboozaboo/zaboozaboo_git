// 전투 엔진 — 영토에서 쏟아져 나오는 부대 vs 적
'use strict';

const W = 800, H = 400;
const GROUND_TOP = 160, GROUND_BOT = 388;
const P_CASTLE_X = 70;        // 아군 성 전면
const E_CASTLE_X = W - 70;    // 적 성 전면 (국가전/서열전)
const LAIR_X = W - 64;
const LAIR_MOUTH = [GROUND_TOP + 40, GROUND_BOT - 20];        // 몬스터 소굴 입구 (스테이지)
const ALLY_MAX_X = W - 80;    // 아군은 소굴/적 성 앞까지만 전진한다
const AGGRO = 240;

const BUILDING_POS = [
  { x: 110, y: 205 }, { x: 130, y: 255 }, { x: 110, y: 305 }, { x: 130, y: 350 }, { x: 150, y: 180 },
];

let uidSeq = 1;

const B = {
  mode: 'stage', units: [], projs: [], fx: [], texts: [],
  pCastle: null, eCastle: null,
  queue: [], queueT: 0, queueTotal: 0,
  enemySpawners: [], spawnT: [],
  time: 0, timeLimit: 0,
  buffs: { rally: 0, sanctuary: 0 },
  lordRespawn: 0, eLordRespawn: 0,
  skillT: 0,
  ended: false, endDelay: 0, onEnd: null, special: null,
  shake: 0, stageBanner: 0,
  deco: [],
};

function makeDeco() {
  B.deco = [];
  for (let i = 0; i < 70; i++) B.deco.push({ x: Math.random() * W, y: rand(GROUND_TOP + 4, GROUND_BOT), r: rand(1, 3), t: Math.random() });
}

function region(stage) { return REGIONS[Math.floor((stage - 1) / 10) % REGIONS.length]; }
const isBossStage = (stage) => stage % 5 === 0;

// ---------- 유닛 생성 ----------
function makeUnit(team, def, mult, x, y, extra = {}) {
  return {
    id: uidSeq++, team, def,
    name: def.name, kind: def.kind,
    maxHp: def.hp * mult.hp, hp: def.hp * mult.hp,
    atk: def.atk * mult.atk, heal: (def.heal || 0) * mult.atk,
    range: def.range, speed: def.speed * rand(0.92, 1.08), atkCd: def.atkCd,
    cdT: rand(0, def.atkCd), x, y, size: def.size || 7,
    color: def.color, proj: def.proj, splash: def.splash || 0,
    flying: !!def.flying, boss: !!def.boss,
    target: null, retarget: 0, anim: 0, flash: 0, walk: Math.random() * 10,
    ...extra,
  };
}

function heroMult(id, scale) {
  if (scale) return { atk: scale, hp: scale };
  const am = armyMult();
  const lm = heroLevelMult(S.heroes[id]);
  return { atk: am.atk * lm, hp: am.hp * lm };
}

function spawnHero(team, heroId, pos, scale, tint, slot, n) {
  const hero = HERO_BY_ID[heroId];
  const mult = heroMult(heroId, scale);
  n = n || hero.count;
  for (let i = 0; i < n; i++) {
    const x = team === 0 ? pos.x + 10 : W - pos.x - 10;
    // 3마리/5마리가 대열을 지어 건물에서 쏟아져 나온다
    const row = i - (n - 1) / 2;
    const u = makeUnit(team, hero.unit, mult, x + rand(-4, 4) - Math.abs(row) * 5 * (team === 0 ? 1 : -1), pos.y + row * 9 + rand(-2, 2), { heroId, tint, slot });
    B.units.push(u);
  }
}

function spawnLord(team, opts) {
  let st, cls, gender, promo;
  if (team === 0) { st = lordStats(); cls = S.lord.cls; gender = S.lord.gender; promo = S.lord.promo; }
  else { cls = opts.cls; gender = opts.gender; promo = opts.promo; const c = CLASSES[cls].lord; st = { ...c, hp: c.hp * opts.scale * 1.5, atk: c.atk * opts.scale, heal: (c.heal || 0) * opts.scale }; }
  const def = { ...st, name: team === 0 ? S.lord.name : opts.name, size: 10, color: '#fff' };
  const x = team === 0 ? P_CASTLE_X + 20 : E_CASTLE_X - 20;
  const u = makeUnit(team, def, { atk: 1, hp: 1 }, x, (GROUND_TOP + GROUND_BOT) / 2, { isLord: true, cls, gender, promo });
  u.maxHp = st.hp; u.hp = st.hp; u.atk = st.atk; u.heal = st.heal;
  B.units.push(u);
  return u;
}

function spawnEnemy(key, stage, opts = {}) {
  const def = ENEMIES[key];
  const m = stageMult(stage);
  const bossMul = def.boss ? (1 + stage / 40) : 1;
  // 화면 오른쪽 몬스터 소굴 입구에서 기어 나온다
  const u = makeUnit(1, def, { atk: m * bossMul, hp: m * bossMul }, W - 34, rand(LAIR_MOUTH[0], LAIR_MOUTH[1]), { monster: true, key });
  B.lairPulse = def.boss ? 1 : 0.4;
  u.gold = goldPerKill(stage) * (def.boss ? 15 : 1);
  B.units.push(u);
  return u;
}

// ---------- 전투 시작 ----------
const armyCount = () => B.units.reduce((a, u) => a + (u.team === 0 && !u.isLord ? 1 : 0), 0);
// 특정 건물(슬롯)에서 나와 살아 있는 부하 수
const slotAlive = (team, slot, heroId) => B.units.reduce((a, u) => a + (u.team === team && u.slot === slot && u.heroId === heroId ? 1 : 0), 0);

// 건물 하나를 진행시키고, 정원에 여유가 있으면 분대를 내보낸다
function tickSpawner(team, slot, heroId, pos, t, rate, cap, scale, tint) {
  const hero = HERO_BY_ID[heroId];
  t = Math.min(1, t + rate / hero.spawnCd);
  if (t < 1) return t;
  const room = cap - slotAlive(team, slot, heroId);
  if (room <= 0) return 1; // 정원이 찼으면 대기
  spawnHero(team, heroId, pos, scale, tint, slot, Math.min(hero.count, room));
  B.fx.push({ type: 'ring', x: team === 0 ? pos.x : W - pos.x, y: pos.y, r: 4, max: 22, t: 0, life: 0.35, color: RARITY[hero.rarity].color });
  return 0;
}

function resetField(keepAllies) {
  B.units = keepAllies ? B.units.filter(u => u.team === 0) : [];
  B.projs = []; B.fx = []; B.texts = [];
  B.ended = false; B.endDelay = 0; B.time = 0;
  B.spawnT = [0, 0, 0, 0, 0].map(() => Math.random());
  if (!keepAllies) { B.lordRespawn = 0.5; }
}

// 스테이지가 바뀌어도(보스 도전, 실패 후퇴 포함) 살아남은 부대는 그대로 남는다
function startStage(stage) {
  const refill = B.failed || !B.pCastle;
  B.mode = 'stage';
  B.failed = false;
  B.special = null;
  resetField(true);
  B.eCastle = null;
  if (refill) B.pCastle = { hp: castleMaxHp(), max: castleMaxHp() };
  else { B.pCastle.max = castleMaxHp(); B.pCastle.hp = Math.min(B.pCastle.max, B.pCastle.hp + B.pCastle.max * 0.3); }
  const reg = region(stage);
  const n = Math.min(6 + Math.floor(stage * 0.35), 28);
  B.queue = [];
  for (let i = 0; i < n; i++) B.queue.push(pick(reg.enemies));
  if (isBossStage(stage)) {
    B.queue.splice(Math.floor(n / 2), 0, reg.boss);
    B.timeLimit = 60;
  } else B.timeLimit = 0;
  B.queueTotal = B.queue.length;
  B.queueT = 1.0;
  B.stageBanner = 2.2;
  B.stage = stage;
  if (!B.units.some(u => u.isLord && u.team === 0)) B.lordRespawn = Math.min(B.lordRespawn || 0.3, 0.3);
}

// 국가전 / 서열전
function startSpecial(spec, onEnd) {
  B.mode = spec.mode;
  B.special = spec;
  B.onEnd = onEnd;
  B.failed = false;
  // 국가전/서열전 동안 스테이지 부대는 영지에 대기시켜 두었다가 끝나면 복귀
  B.stash = { units: B.units.filter(u => u.team === 0), castle: B.pCastle, lordRespawn: B.lordRespawn };
  resetField(false);
  B.pCastle = { hp: castleMaxHp(), max: castleMaxHp() };
  const eMax = 800 * spec.scale * 1.2;
  B.eCastle = { hp: eMax, max: eMax };
  // 양측 모두 개전과 동시에 첫 분대가 출격한다
  B.enemySpawners = spec.deck.map((id, i) => ({ id, t: 1, pos: BUILDING_POS[i] }));
  B.spawnT = B.spawnT.map(() => 1);
  B.queue = []; B.queueTotal = 0;
  B.timeLimit = 75;
  B.stageBanner = 2.2;
  B.eLordRespawn = 0.5;
}

// ---------- 스킬 ----------
function skillReady() { return B.skillT <= 0 && B.units.some(u => u.isLord && u.team === 0); }

function castSkill() {
  if (!skillReady()) return false;
  const cls = S.lord.cls;
  const lord = B.units.find(u => u.isLord && u.team === 0);
  const power = promoInfo().mult;
  B.skillT = CLASSES[cls].skill.cd;
  if (cls === 'knight') {
    B.buffs.rally = 8;
    addText(lord.x, lord.y - 40, '돌격하라!', '#ffd166', 18);
    B.fx.push({ type: 'ring', x: lord.x, y: lord.y, r: 10, max: 260, t: 0, life: 0.6, color: '#ffd166' });
  } else if (cls === 'mage') {
    const foes = B.units.filter(u => u.team === 1);
    for (let i = 0; i < 3; i++) {
      let tx, ty;
      if (foes.length) {
        const f = foes.find(u => u.boss) && i === 0 ? foes.find(u => u.boss) : pick(foes);
        tx = f.x; ty = f.y;
      } else { tx = rand(W * 0.5, W * 0.85); ty = rand(GROUND_TOP + 30, GROUND_BOT - 30); }
      B.fx.push({ type: 'meteor', x: tx, y: ty, t: -i * 0.25, life: 0.7, dmg: lord.atk * 14 * power, done: false });
    }
  } else if (cls === 'priest') {
    for (const u of B.units) if (u.team === 0) { u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.6); B.fx.push({ type: 'spark', x: u.x, y: u.y - 10, t: 0, life: 0.8 }); }
    B.pCastle.hp = Math.min(B.pCastle.max, B.pCastle.hp + B.pCastle.max * 0.25);
    B.buffs.sanctuary = 5;
    addText(lord.x, lord.y - 40, '성역!', '#fff3b0', 18);
    B.fx.push({ type: 'ring', x: lord.x, y: lord.y, r: 10, max: 300, t: 0, life: 0.8, color: '#fff3b0' });
  }
  return true;
}

// ---------- 유틸 ----------
function addText(x, y, txt, color = '#fff', size = 12) {
  if (B.texts.length > 50) B.texts.shift();
  B.texts.push({ x, y, txt, color, size, t: 0 });
}

function dealDamage(target, dmg, src) {
  if (target.hp <= 0) return;
  if (target.team === 0 && B.buffs.sanctuary > 0) dmg *= 0.5;
  target.hp -= dmg;
  target.flash = 0.12;
  if (target.boss || target.isLord || (src && src.isLord)) addText(target.x + rand(-8, 8), target.y - target.size * 2 - 6, fmt(dmg), target.team === 0 ? '#ff8080' : '#ffe08a', target.boss ? 14 : 11);
}

function damageCastle(team, dmg) {
  const c = team === 0 ? B.pCastle : B.eCastle;
  if (!c) return;
  if (team === 0 && B.buffs.sanctuary > 0) dmg *= 0.5;
  c.hp -= dmg;
  if (team === 0) B.shake = Math.min(B.shake + 0.08, 0.3);
}

function teamAtkMult(u) {
  let m = 1;
  if (u.team === 0 && B.buffs.rally > 0) m *= 1.6;
  return m;
}

function nearestFoe(u) {
  let best = null, bd = Infinity;
  for (const o of B.units) {
    if (o.team === u.team || o.hp <= 0) continue;
    const dx = o.x - u.x, dy = o.y - u.y;
    const d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = o; }
  }
  return best && bd < AGGRO * AGGRO ? best : null;
}

function hurtAlly(u) {
  let best = null, br = 0.92;
  for (const o of B.units) {
    if (o.team !== u.team || o.hp <= 0) continue;
    const r = o.hp / o.maxHp;
    if (r < br && Math.hypot(o.x - u.x, o.y - u.y) <= u.range) { br = r; best = o; }
  }
  return best;
}

function fire(u, target, isHeal) {
  const tx = target ? target.x : (u.team === 0 ? E_CASTLE_X + 20 : P_CASTLE_X - 20);
  const ty = target ? target.y - (target.flying ? 14 : 4) : u.y;
  B.projs.push({
    x: u.x + (u.team === 0 ? 6 : -6), y: u.y - (u.flying ? 16 : 8), tx, ty, target,
    team: u.team, type: isHeal ? 'holy' : (u.proj || 'arrow'),
    dmg: isHeal ? 0 : u.atk * teamAtkMult(u), heal: isHeal ? u.heal : 0,
    splash: isHeal ? 0 : u.splash, castle: !target, src: u,
    speed: u.proj === 'arrow' || u.proj === 'bolt_x' ? 420 : 300,
  });
}

// ---------- 갱신 ----------
function updateBattle(dt) {
  B.time += dt;
  if (B.stageBanner > 0) B.stageBanner -= dt;
  if (B.shake > 0) B.shake = Math.max(0, B.shake - dt);
  if (B.lairPulse > 0) B.lairPulse = Math.max(0, B.lairPulse - dt);
  B.buffs.rally = Math.max(0, B.buffs.rally - dt);
  B.buffs.sanctuary = Math.max(0, B.buffs.sanctuary - dt);
  if (B.skillT > 0) B.skillT -= dt;

  if (!B.ended) {
    spawnPhase(dt);
    if (S.settings.autoSkill && skillReady() && B.units.some(u => u.team === 1 && u.x < W - 40)) castSkill();
  }

  for (const u of B.units) if (u.hp > 0) updateUnit(u, dt);
  separate();
  confine();
  updateProjs(dt);
  updateFx(dt);

  // 사망 처리
  for (const u of B.units) {
    if (u.hp <= 0 && !u.dead) {
      u.dead = true;
      B.fx.push({ type: 'poof', x: u.x, y: u.y, t: 0, life: 0.5, color: u.team === 0 ? '#ffffff' : u.color, size: u.size });
      if (u.team === 1 && u.gold) {
        const g = u.gold;
        S.gold += g; S.stats.kills++;
        addText(u.x, u.y - 16, '+' + fmt(g), '#ffd34d', u.boss ? 16 : 11);
        if (u.boss) B.shake = 0.4;
      }
      if (u.isLord) { if (u.team === 0) B.lordRespawn = 6; else B.eLordRespawn = 8; }
    }
  }
  B.units = B.units.filter(u => !u.dead);
  for (const t of B.texts) t.t += dt;
  B.texts = B.texts.filter(t => t.t < 1);

  checkEnd(dt);
}

function spawnPhase(dt) {
  // 아군 건물 소환
  const am = armyMult();
  for (let i = 0; i < slotCount(); i++) {
    const id = S.slots[i];
    if (!id) continue;
    B.spawnT[i] = tickSpawner(0, i, id, BUILDING_POS[i], B.spawnT[i], dt * am.spawn, heroCap(id));
  }
  if (B.lordRespawn > 0) { B.lordRespawn -= dt; if (B.lordRespawn <= 0) spawnLord(0); }

  if (B.mode === 'stage') {
    if (B.queue.length) {
      B.queueT -= dt;
      if (B.queueT <= 0) {
        const key = B.queue.shift();
        spawnEnemy(key, B.stage);
        B.queueT = ENEMIES[key].boss ? 1.5 : rand(0.5, 1.3);
      }
    }
  } else {
    const sp = B.special;
    B.enemySpawners.forEach((s, i) => {
      s.t = tickSpawner(1, i, s.id, s.pos, s.t, dt * sp.spawnRate, HERO_BY_ID[s.id].cap, sp.scale, sp.color);
    });
    if (B.eLordRespawn > 0) { B.eLordRespawn -= dt; if (B.eLordRespawn <= 0) spawnLord(1, sp.lord); }
  }
}

function updateUnit(u, dt) {
  u.cdT -= dt;
  if (u.anim > 0) u.anim -= dt;
  if (u.flash > 0) u.flash -= dt;
  u.retarget -= dt;
  if (u.retarget <= 0 || !u.target || u.target.hp <= 0) { u.target = nearestFoe(u); u.retarget = 0.3; }
  const spd = u.speed * (u.team === 0 && B.buffs.rally > 0 ? 1.4 : 1);

  // 힐러
  if (u.kind === 'healer' && u.cdT <= 0) {
    if (u.def.healAll) {
      let any = false;
      for (const o of B.units) if (o.team === u.team && o.hp > 0 && o.hp < o.maxHp && Math.hypot(o.x - u.x, o.y - u.y) <= u.range) { o.hp = Math.min(o.maxHp, o.hp + u.heal * 0.6); any = true; }
      if (any) { B.fx.push({ type: 'ring', x: u.x, y: u.y, r: 6, max: u.range, t: 0, life: 0.5, color: '#fff3b0' }); }
    } else {
      const h = hurtAlly(u);
      if (h) { fire(u, h, true); u.cdT = u.atkCd; u.anim = 0.25; return; }
    }
  }

  const t = u.target;
  if (t) {
    const dx = t.x - u.x, dy = t.y - u.y;
    const d = Math.hypot(dx, dy);
    const reach = u.range + t.size;
    if (d > reach) {
      u.x += dx / d * spd * dt; u.y += dy / d * spd * dt; u.walk += dt * spd * 0.25;
    } else if (u.cdT <= 0) {
      attack(u, t);
    }
    u.face = dx >= 0 ? 1 : -1;
    return;
  }

  // 목표 없음 — 행군 또는 성 공격
  const dir = u.team === 0 ? 1 : -1;
  u.face = dir;
  let castleX = null;
  if (u.team === 1) castleX = P_CASTLE_X;
  else if (B.eCastle) castleX = E_CASTLE_X;
  if (castleX !== null) {
    const dist = Math.abs(castleX - u.x);
    if (dist > u.range) { u.x += dir * spd * dt; u.walk += dt * spd * 0.25; }
    else if (u.cdT <= 0) {
      u.cdT = u.atkCd; u.anim = 0.25;
      if (u.kind === 'melee') damageCastle(u.team === 0 ? 1 : 0, u.atk * teamAtkMult(u));
      else fire(u, null, false);
    }
  } else {
    // 스테이지 모드에서 적이 없으면 전선까지 전진 후 대기
    const hold = W * 0.62 + (u.id % 7) * 8 - (u.kind === 'melee' ? 0 : 60);
    if (u.x < hold) { u.x += spd * dt; u.walk += dt * spd * 0.25; }
  }
  u.y = Math.max(GROUND_TOP + 8, Math.min(GROUND_BOT - 4, u.y));
}

function attack(u, t) {
  u.cdT = u.atkCd; u.anim = 0.25;
  if (u.kind === 'melee') {
    dealDamage(t, u.atk * teamAtkMult(u), u);
    if (u.def.heavy || u.boss) B.fx.push({ type: 'slash', x: t.x, y: t.y - 6, t: 0, life: 0.2, face: u.face });
  } else fire(u, t, false);
}

// 모든 유닛을 전장 안에 가둔다. 아군은 소굴(또는 적 성) 앞을 넘지 못한다.
function confine() {
  for (const u of B.units) {
    const maxX = u.team === 0 ? ALLY_MAX_X : W - 20;
    const minX = u.team === 1 ? P_CASTLE_X - 10 : 20;
    if (u.x > maxX) u.x = maxX;
    if (u.x < minX) u.x = minX;
    u.y = Math.max(GROUND_TOP + 8, Math.min(GROUND_BOT - 4, u.y));
  }
}

function separate() {
  const us = B.units;
  for (let i = 0; i < us.length; i++) {
    const a = us[i];
    for (let j = i + 1; j < us.length; j++) {
      const b = us[j];
      if (a.flying !== b.flying) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const min = (a.size + b.size) * 0.9;
      const d2 = dx * dx + dy * dy;
      if (d2 < min * min && d2 > 0.0001) {
        const d = Math.sqrt(d2), push = (min - d) * 0.5;
        const nx = dx / d, ny = dy / d;
        const wa = a.boss ? 0.1 : 1, wb = b.boss ? 0.1 : 1;
        a.x -= nx * push * wa; a.y -= ny * push * wa;
        b.x += nx * push * wb; b.y += ny * push * wb;
      }
    }
  }
}

function updateProjs(dt) {
  for (const p of B.projs) {
    if (p.target && p.target.hp > 0) { p.tx = p.target.x; p.ty = p.target.y - (p.target.flying ? 14 : 4); }
    const dx = p.tx - p.x, dy = p.ty - p.y;
    const d = Math.hypot(dx, dy);
    const step = p.speed * dt;
    if (d <= step + 2) {
      p.hit = true;
      if (p.heal) { if (p.target && p.target.hp > 0) { p.target.hp = Math.min(p.target.maxHp, p.target.hp + p.heal); B.fx.push({ type: 'spark', x: p.tx, y: p.ty, t: 0, life: 0.5 }); } }
      else if (p.castle) damageCastle(p.team === 0 ? 1 : 0, p.dmg);
      else if (p.splash) {
        B.fx.push({ type: 'boom', x: p.tx, y: p.ty, t: 0, life: 0.35, r: p.splash, color: p.type === 'fire' ? '#ff8c42' : '#8ab4ff' });
        for (const o of B.units) if (o.team !== p.team && o.hp > 0 && Math.hypot(o.x - p.tx, o.y - p.ty) <= p.splash + o.size) dealDamage(o, o === p.target ? p.dmg : p.dmg * 0.6, p.src);
      } else if (p.target && p.target.hp > 0) dealDamage(p.target, p.dmg, p.src);
    } else {
      p.x += dx / d * step; p.y += dy / d * step;
      p.ang = Math.atan2(dy, dx);
    }
  }
  B.projs = B.projs.filter(p => !p.hit);
}

function updateFx(dt) {
  for (const f of B.fx) {
    f.t += dt;
    if (f.type === 'meteor' && !f.done && f.t >= f.life) {
      f.done = true;
      B.shake = 0.35;
      B.fx.push({ type: 'boom', x: f.x, y: f.y, t: 0, life: 0.5, r: 75, color: '#ff6b2b' });
      for (const o of B.units) if (o.team === 1 && o.hp > 0 && Math.hypot(o.x - f.x, o.y - f.y) <= 75 + o.size) dealDamage(o, f.dmg, { isLord: true });
    }
  }
  B.fx = B.fx.filter(f => f.t < f.life || (f.type === 'meteor' && !f.done));
}

function checkEnd(dt) {
  if (B.ended) {
    B.endDelay -= dt;
    if (B.endDelay <= 0) finishBattle();
    return;
  }
  const timeUp = B.timeLimit > 0 && B.time >= B.timeLimit;
  if (B.mode === 'stage') {
    if (B.pCastle.hp <= 0 || timeUp) endWith('lose', timeUp ? '시간 초과!' : '성이 함락되었다!');
    else if (!B.queue.length && !B.units.some(u => u.team === 1)) endWith('win', 'STAGE CLEAR');
  } else {
    if (B.pCastle.hp <= 0) endWith('lose', '패배...');
    else if (B.eCastle.hp <= 0) endWith('win', '승리!');
    else if (timeUp) {
      const mine = B.pCastle.hp / B.pCastle.max, theirs = B.eCastle.hp / B.eCastle.max;
      endWith(mine > theirs ? 'win' : 'lose', mine > theirs ? '판정승!' : '판정패...');
    }
  }
}

function endWith(result, msg) {
  B.ended = true;
  B.result = result;
  B.resultMsg = msg;
  B.endDelay = B.mode === 'stage' ? (result === 'win' ? 0.9 : 1.6) : 2.0;
}

function finishBattle() {
  if (B.mode === 'stage') {
    const st = B.stage;
    if (B.result === 'win') {
      if (st >= S.maxStage) {
        // 최초 클리어 보상
        const gem = isBossStage(st) ? 30 : 3;
        S.gems += gem;
        if (window.UI) UI.toast(`스테이지 ${st} 최초 클리어! 💎${gem}`);
      }
      S.maxStage = Math.max(S.maxStage, st + 1);
      if (!S.farming) S.stage = st + 1;
    } else {
      B.failed = true;
      S.farming = true;
      S.stage = Math.max(1, st - 1);
      if (window.UI) UI.toast(isBossStage(st) ? '보스 도전 실패! 이전 스테이지에서 힘을 기르자' : '방어 실패! 한 단계 후퇴');
    }
    startStage(S.stage);
  } else {
    const cb = B.onEnd;
    const res = { result: B.result, dmgRatio: 1 - Math.max(0, B.eCastle.hp) / B.eCastle.max };
    const st = B.stash;
    B.stash = null;
    B.units = st ? st.units : [];
    B.pCastle = st ? st.castle : null;
    B.lordRespawn = st ? st.lordRespawn : 0.3;
    B.mode = 'stage';
    startStage(S.stage);
    if (cb) cb(res);
  }
}

function challengeBoss() {
  if (B.mode !== 'stage') return;
  S.farming = false;
  S.stage = Math.min(S.maxStage, S.stage + 1);
  startStage(S.stage);
}
