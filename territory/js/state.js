// 게임 상태, 저장/불러오기, 각종 공식
'use strict';

const SAVE_KEY = 'territory_save_v1';

const fmt = (n) => {
  if (!isFinite(n)) return '∞';
  n = Math.floor(n);
  if (n < 1000) return String(n);
  const units = ['K', 'M', 'B', 'T'];
  let i = -1;
  while (n >= 1000 && i < 30) { n /= 1000; i++; }
  let u;
  if (i < units.length) u = units[i];
  else {
    const k = i - units.length;
    u = String.fromCharCode(97 + Math.floor(k / 26)) + String.fromCharCode(97 + (k % 26));
  }
  return (n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2)) + u;
};

const todayStr = () => new Date().toISOString().slice(0, 10);
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

let S = null; // 현재 게임 상태

function newGame({ name, gender, cls, nation }) {
  const ladder = [];
  const names = NOBLE_NAMES.slice().sort(() => Math.random() - 0.5);
  for (let i = 0; i < 20; i++) {
    ladder.push({ name: names[i], power: Math.round(110 * Math.pow(1.33, 19 - i) * rand(0.95, 1.05)), cls: pick(Object.keys(CLASSES)) });
  }
  ladder.sort((a, b) => b.power - a.power);
  ladder.push({ me: true });
  S = {
    v: 1,
    lord: { name: name || '영주', gender, cls, level: 1, promo: 0 },
    nation,
    gold: 0,
    gems: 1000,
    stage: 1,
    maxStage: 1,
    farming: false,
    upgrades: { atk: 0, hp: 0, spawn: 0, cap: 0, castle: 0, gold: 0 },
    heroes: { militia: { level: 1, stars: 1, shards: 0 }, archer: { level: 1, stars: 1, shards: 0 } },
    slots: ['militia', 'archer', null, null, null],
    daily: { date: todayStr(), war: 3, duel: 5, freeSummon: 1 },
    ladder,
    nationScore: { aurum: randInt(9000, 13000), sylvan: randInt(9000, 13000), ignis: randInt(9000, 13000) },
    contribution: 0,
    settings: { autoSkill: true, speed: 1 },
    stats: { kills: 0, summons: 0, wars: 0, warWins: 0 },
    lastSave: Date.now(),
  };
  return S;
}

function saveGame() {
  if (!S) return;
  S.lastSave = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 저장 불가 환경 */ }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    S = JSON.parse(raw);
    for (const u of UPGRADES) if (S.upgrades[u.id] === undefined) S.upgrades[u.id] = 0;
    return S;
  } catch (e) { return null; }
}

function resetGame() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* noop */ }
  location.reload();
}

function checkDaily() {
  const t = todayStr();
  if (S.daily.date !== t) S.daily = { date: t, war: 3, duel: 5, freeSummon: 1 };
}

// ---------- 공식 ----------
const promoInfo = () => PROMOTIONS[S.lord.promo];
const slotCount = () => promoInfo().slots;
// 건물별 부대 정원: 영웅 고유 정원에 ★승급마다 +10%, 막사 확장마다 +5%
function heroCap(id, stars, capLvl) {
  const base = HERO_BY_ID[id].cap;
  if (stars === undefined) { stars = S.heroes[id] ? S.heroes[id].stars : 1; capLvl = S.upgrades.cap || 0; }
  return Math.max(base, Math.round(base * (1 + 0.1 * (stars - 1) + 0.05 * (capLvl || 0))));
}
const armyCap = () => S.slots.slice(0, slotCount()).reduce((a, id) => a + (id ? heroCap(id) : 0), 0);
const myRank = () => S.ladder.findIndex(e => e.me) + 1;
const titleOf = (rank) => TITLES.find(t => rank <= t.upTo);
const nationBonus = (k) => (NATIONS[S.nation].bonus[k] || 0);
const leadingNation = () => Object.keys(S.nationScore).sort((a, b) => S.nationScore[b] - S.nationScore[a])[0];

function lordTitle() {
  const c = CLASSES[S.lord.cls];
  return c.promos[S.lord.promo];
}

function armyMult() {
  const lordBonus = 1 + S.lord.level * 0.02;
  const promo = promoInfo().mult;
  const title = 1 + titleOf(myRank()).bonus;
  return {
    atk: (1 + S.upgrades.atk * 0.06) * lordBonus * promo * (1 + nationBonus('atk')) * title,
    hp: (1 + S.upgrades.hp * 0.06) * lordBonus * promo * (1 + nationBonus('hp')) * title,
    spawn: 1 + S.upgrades.spawn * 0.02,
  };
}

function heroLevelMult(h) { return Math.pow(1.1, h.level - 1) * (1 + 0.5 * (h.stars - 1)); }

function cardScore(id) {
  const h = S.heroes[id];
  return RARITY[HERO_BY_ID[id].rarity].score * heroLevelMult(h);
}

function lordStats() {
  const c = CLASSES[S.lord.cls].lord;
  const m = Math.pow(1.08, S.lord.level - 1) * promoInfo().mult * (1 + titleOf(myRank()).bonus);
  return { ...c, hp: c.hp * m * (1 + nationBonus('hp')), atk: c.atk * m * (1 + nationBonus('atk')), heal: (c.heal || 0) * m };
}

function myPower() {
  const am = armyMult();
  let sum = 0;
  S.slots.slice(0, slotCount()).forEach(id => { if (id) sum += cardScore(id); });
  return Math.round(30 * sum * Math.sqrt(am.atk * am.hp) + 8 * S.lord.level * promoInfo().mult);
}

function castleMaxHp() { return 800 * (1 + S.upgrades.castle * 0.1) * Math.pow(1.06, S.lord.level - 1) * promoInfo().mult; }

function goldMult() {
  let m = (1 + S.upgrades.gold * 0.05) * (1 + nationBonus('gold'));
  if (leadingNation() === S.nation) m *= 1.1;
  return m;
}
const stageMult = (stage) => Math.pow(1.18, stage - 1);
const goldPerKill = (stage) => 2.5 * Math.pow(1.13, stage - 1) * goldMult();

const lordLevelCost = () => Math.round(50 * Math.pow(1.16, S.lord.level - 1));
const heroLevelCost = (id) => Math.round(25 * RARITY[HERO_BY_ID[id].rarity].score * Math.pow(1.2, S.heroes[id].level - 1));
const heroMaxLevel = (id) => 20 + S.heroes[id].stars * 20;
const shardsForStar = (stars) => stars; // 1성→2성: 중복 1장, 2성→3성: 2장 ...
const MAX_STARS = 5;
const upgradeCost = (u) => Math.round(u.base * Math.pow(u.growth, S.upgrades[u.id]));

function spend(cost, cur = 'gold') {
  if (S[cur] < cost) return false;
  S[cur] -= cost;
  return true;
}

// ---------- 소환 ----------
function rollRarity(minRarity) {
  const pool = RARITY_ORDER.filter(r => !minRarity || RARITY_ORDER.indexOf(r) >= RARITY_ORDER.indexOf(minRarity));
  const total = pool.reduce((a, r) => a + RARITY[r].weight, 0);
  let x = Math.random() * total;
  for (const r of pool) { x -= RARITY[r].weight; if (x <= 0) return r; }
  return pool[pool.length - 1];
}

function summon(n) {
  const results = [];
  for (let i = 0; i < n; i++) {
    const guarantee = n >= 10 && i === n - 1 && !results.some(r => RARITY_ORDER.indexOf(r.rarity) >= 1);
    const rar = rollRarity(guarantee ? 'R' : null);
    const hero = pick(HEROES.filter(h => h.rarity === rar));
    const owned = S.heroes[hero.id];
    if (owned) owned.shards++;
    else S.heroes[hero.id] = { level: 1, stars: 1, shards: 0 };
    results.push({ ...hero, isNew: !owned });
    S.stats.summons++;
  }
  return results;
}

// ---------- 오프라인 보상 ----------
function offlineReward() {
  const elapsed = Math.min((Date.now() - (S.lastSave || Date.now())) / 1000, 8 * 3600);
  if (elapsed < 60) return null;
  const farmStage = Math.max(1, S.maxStage - 1);
  const gold = Math.floor(goldPerKill(farmStage) * 0.35 * elapsed);
  // 다른 국가 점수도 시간에 따라 증가
  for (const k of Object.keys(S.nationScore)) {
    if (k !== S.nation) S.nationScore[k] += Math.floor(elapsed / 60 * rand(2, 6));
  }
  return { elapsed, gold };
}
