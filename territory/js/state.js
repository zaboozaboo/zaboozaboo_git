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
    kingdom: {lands:{},growth:{step:0}},
    dice: {faces:[0,1,0,1,0,1]},
    lord: { name: name || '영주', gender, cls, level: 1, promo: 0, merit: 0 },
    nation,
    gold: 0,
    gems: 1000,
    stage: 1,
    maxStage: 1,
    farming: false,
    upgrades: { atk: 0, hp: 0, spawn: 0, cap: 0, castle: 0, gold: 0 },
    lordSkills:{version:2,owned:{},active:null,passives:[null,null,null,null],tutorial:'draw'},
    heroes: { militia: { level: 1, stars: 1, shards: 0 }, archer: { level: 1, stars: 1, shards: 0 } },
    slots: ['militia', 'archer', null, null, null],
    formation: [0,1,1,0,1],
    daily: { date: todayStr(), war: 3, duel: 5, freeSummon: 1 },
    ladder,
    nationScore: { aurum: randInt(9000, 13000), sylvan: randInt(9000, 13000), ignis: randInt(9000, 13000) },
    contribution: 0,
    settings: { autoSkill: true, speed: 2 },
    stats: { kills: 0, summons: 0, wars: 0, warWins: 0 },
    lastSave: Date.now(),
  };
  return S;
}

let saveFailed = false;
let resettingProgress = false;
function saveGame() {
  if (!S || resettingProgress) return;
  S.lastSave = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(S));
    if (saveFailed && typeof UI !== 'undefined') UI.toast('진행 상황이 저장되었습니다.');
    saveFailed = false;
    return true;
  } catch (e) {
    if (!saveFailed && typeof UI !== 'undefined') UI.toast('저장 공간에 접근할 수 없습니다. 창을 닫으면 진행 상황이 사라질 수 있습니다.');
    saveFailed = true;
    return false;
  }
}

let loadFailure = null;
function loadGame() {
  loadFailure = null;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const candidate = JSON.parse(raw);
    if (!candidate || !candidate.lord || !CLASSES[candidate.lord.cls] || !NATIONS[candidate.nation]
      || !Array.isArray(candidate.slots) || !candidate.heroes || !candidate.upgrades
      || !candidate.daily || !Array.isArray(candidate.ladder) || !candidate.ladder.some(e=>e.me)
      || !candidate.nationScore || !candidate.settings || !candidate.stats
      || !Number.isFinite(candidate.gold) || !Number.isFinite(candidate.gems)
      || !Number.isInteger(candidate.stage) || candidate.stage < 1) throw new Error('Invalid save');
    S = candidate;
    ensureLordMerit();
    ensureFormation();
    if(typeof ensureKingdom==='function')ensureKingdom();
    if(typeof ensureDice==='function')ensureDice();
    for (const u of UPGRADES) if (S.upgrades[u.id] === undefined) S.upgrades[u.id] = 0;
    if(typeof ensureKingdomGrowth==='function')ensureKingdomGrowth();
    return S;
  } catch (e) { S = null; loadFailure = e; return null; }
}

function checkDaily() {
  const t = todayStr();
  if (S.daily.date !== t) S.daily = { date: t, war: 3, duel: 5, freeSummon: 1 };
}

// ---------- 공식 ----------
const promoInfo = () => PROMOTIONS[S.lord.promo];
const slotCount = () => S.portal ? 3 : promoInfo().slots;
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

function kingdomStarMult(){const step=S.kingdom?.growth?.step;return 1+Math.floor((Number.isSafeInteger(step)?Math.max(0,step):0)/10)*.05;}

function armyMult() {
  if(S.portal)return {atk:1,hp:1,spawn:1};
  const lordBonus = 1 + S.lord.level * 0.02;
  const promo = promoInfo().mult;
  const title = 1 + titleOf(myRank()).bonus;
  return {
    atk: (1 + S.upgrades.atk * 0.06) * lordBonus * promo * (1 + nationBonus('atk')) * title * kingdomStarMult() * (1+skillPassiveBonus('armyAtk')),
    hp: (1 + S.upgrades.hp * 0.06) * lordBonus * promo * (1 + nationBonus('hp')) * title * kingdomStarMult()*(1+skillPassiveBonus('armyHp')),
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
  const m = Math.pow(1.08, S.lord.level - 1) * promoInfo().mult * (1 + titleOf(myRank()).bonus) * kingdomStarMult();
  return { ...c, hp: c.hp * m * (1 + nationBonus('hp'))*(1+skillPassiveBonus('lordHp')), atk: c.atk * m * (1 + nationBonus('atk'))*(1+skillPassiveBonus('lordAtk')), heal: (c.heal || 0) * m*(1+skillPassiveBonus('heal')) };
}

function myPower() {
  const am = armyMult();
  let sum = 0;
  S.slots.slice(0, slotCount()).forEach(id => { if (id) sum += cardScore(id); });
  return Math.round(30 * sum * Math.sqrt(am.atk * am.hp) + 8 * S.lord.level * promoInfo().mult * kingdomStarMult());
}

function castleMaxHp() { if(S.portal?.master)return Portal.castleHp(); if(S.portal)return 1000*(1+ownedLands()*.2); return 800 * (1 + S.upgrades.castle * 0.1) * Math.pow(1.06, S.lord.level - 1) * promoInfo().mult*(1+skillPassiveBonus('castle')); }

function goldMult() {
  let m = (1 + S.upgrades.gold * 0.05) * (1 + nationBonus('gold'));
  if (leadingNation() === S.nation) m *= 1.1;
  return m * (1+skillPassiveBonus('gold')) * (1 + (typeof facilityCount==='function'?facilityCount('mine'):0)*.15);
}
const stageMult = (stage) => S.portal?.master?Portal.enemyScale(stage):Math.pow(1.18, stage - 1);
const goldPerKill = (stage) => S.portal?.master?Math.max(3,Math.round(3+stage*.5)):2.5 * Math.pow(1.13, stage - 1) * goldMult();

const lordLevelCost = () => lordBreakthroughCost();
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
  if(typeof featureAccess==='function'&&!featureAccess('recruit').unlocked)return [];
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
  if(S.firstExpedition===false)return null;
  const elapsed = Math.min((Date.now() - (S.lastSave || Date.now())) / 1000, 8 * 3600);
  if (elapsed <= 0) return null;
  const merit = lordMeritRate() * elapsed;
  const farmStage = Math.max(1, S.maxStage - 1);
  const gold = elapsed < 60 ? 0 : Math.floor(goldPerKill(farmStage) * 0.35 * elapsed);
  // 다른 국가 점수도 시간에 따라 증가
  for (const k of Object.keys(S.nationScore)) {
    if (k !== S.nation) S.nationScore[k] += Math.floor(elapsed / 60 * rand(2, 6));
  }
  return { elapsed, gold, merit };
}

function resetSavedProgress(){
 try{localStorage.removeItem(SAVE_KEY);}catch(e){UI.toast('삭제하지 못했습니다. 저장 공간 설정을 확인해 주세요.');return false;}
 resettingProgress=true; // Prevent pagehide/autosave from recreating the deleted save.
 location.reload();return true;
}

// Lord merit is separate from nation-war contribution and gold.
function ensureLordMerit(){if(!Number.isFinite(S.lord.merit)||S.lord.merit<0)S.lord.merit=0;}
function lordMeritRate(){return Math.max(1,Number.isInteger(S.stage)?S.stage:1);}
function lordBreakthroughCost(){return Math.round(60*Math.pow(1.12,S.lord.level-1));}
function accrueLordMerit(seconds){ensureLordMerit();if(!Number.isFinite(seconds)||seconds<=0)return 0;const amount=lordMeritRate()*Math.min(seconds,8*3600);S.lord.merit+=amount;return amount;}
function breakthroughLord(expectedLevel){if(typeof featureAccess==='function'&&!featureAccess('lord').unlocked)return false;ensureLordMerit();const cost=lordBreakthroughCost();if(expectedLevel!==S.lord.level||S.lord.merit<cost)return false;S.lord.merit-=cost;S.lord.level++;return true;}

// Expedition gates use actual progress and explicit instruction acknowledgement.
function expeditionAccess(mode) {
  const veteran=S.firstExpedition===undefined&&(S.stats.wars>0||myRank()<S.ladder.length);
  if(veteran)return {ready:true,unlocked:true,reason:''};
  let reason='';
  if(S.firstExpedition===false||S.firstExpedition===true&&S.territoryTutorial!=='done')reason='첫 원정과 햇살 숲 영토 안내를 완료하세요.';
  else if(S.learning?.version===1&&S.lord.promo<1)reason='첫 전직을 완료하면 서열전 안내가 열립니다.';
  else if(S.maxStage<7)reason='6단계를 클리어하면 서열전 안내가 열립니다.';
  else if(mode==='war'&&!S.expeditionProgress?.duelCompleted)reason='서열전을 먼저 1회 완료하세요. 승패는 상관없어요.';
  else if(mode==='war'&&S.maxStage<11)reason='10단계 성을 함락하면 국가전 안내가 열립니다.';
  const ready=!reason,unlocked=ready&&!!S.expeditionProgress?.[mode+'Intro'];
  return {ready,unlocked,reason:reason||(unlocked?'':'출전 방법을 먼저 확인하세요.')};
}
function acknowledgeExpedition(mode){
  if(!['duel','war'].includes(mode)||!expeditionAccess(mode).ready)return false;
  (S.expeditionProgress??={})[mode+'Intro']=true;saveGame();return true;
}

// Class-specific collection. Copies are lifetime totals, never spent on leveling.
const SKILL_RARITIES={C:{name:'일반',weight:55,color:'#819879'},R:{name:'희귀',weight:30,color:'#518ca8'},H:{name:'영웅',weight:12,color:'#9c72b0'},L:{name:'전설',weight:3,color:'#bf9340'}};
const LORD_SKILLS=[];
const SKILL_PASSIVE_LABELS={armyAtk:'부대 공격력',armyHp:'부대 체력',lordAtk:'영주 공격력',lordHp:'영주 체력',cooldown:'스킬 재사용 감소',gold:'골드 획득',heal:'치유력·회복 스킬 효율',castle:'성 체력'};
const SKILL_SETS={
 knight:{active:[['돌격 명령','rally'],['방패 강타','strike'],['성검의 심판','strike'],['성기사의 맹세','sanctuary'],['철벽 진형','guard'],['수호자의 반격','strike'],['왕의 진군','rally'],['성검 해방','meteor']],passive:['전투 지휘','철벽 훈련','검술 숙련','강인한 육체','전술 숙련','전리품 수집','성스러운 의지','성채 수호','정예 지휘','불굴의 맹세','왕의 검술','왕국의 축복']},
 mage:{active:[['메테오','meteor'],['화염 폭발','strike'],['연쇄 번개','strike'],['마력 결계','guard'],['유성 폭풍','meteor'],['시간 가속','rally'],['종말의 별','meteor'],['현자의 회복','heal']],passive:['마력 전수','보호 주문','마력 집중','마력 갑옷','고속 영창','황금 연성','회복 마법','결계 연구','원소 공명','불멸의 지식','현자의 지혜','대마법 결계']},
 priest:{active:[['성역','sanctuary'],['치유의 기도','heal'],['빛의 심판','strike'],['축복의 행진','rally'],['신성한 방벽','guard'],['천상의 치유','heal'],['신의 심판','meteor'],['구원의 빛','sanctuary']],passive:['축복의 말씀','수호의 말씀','신성 집중','신앙의 갑옷','기도 숙련','헌금의 축복','치유의 손길','성소 수호','천상의 찬가','순교자의 의지','신성한 권능','영원한 가호']}
};
for(const [cls,set] of Object.entries(SKILL_SETS)){
 set.active.forEach(([name,effect],i)=>{const tier=Math.floor(i/2),rarity=i===0?'C':['R','H','L'][Math.max(0,tier-1)];LORD_SKILLS.push({id:cls+'_a'+i,cls,type:'active',tier,rarity,name,effect,icon:({rally:'📯',strike:'⚔️',meteor:'☄️',guard:'🛡️',sanctuary:'🕊️',heal:'✨'})[effect],cd:effect==='meteor'?22:25,power:1+tier*.25+(i%2)*.1});});
 set.passive.forEach((name,i)=>{const tier=i<6?0:1+Math.floor((i-6)/2),key=['armyAtk','armyHp','lordAtk','lordHp','cooldown','gold','heal','castle','armyAtk','armyHp','lordAtk','lordHp'][i];LORD_SKILLS.push({id:cls+'_p'+i,cls,type:'passive',tier,rarity:i<2?'C':tier===3?'L':tier>=1||i>=4?'H':'R',name,key,icon:CLASSES[cls].icon,value:key==='cooldown'?.03:.05+tier*.025});});
}
const LORD_SKILL_BY_ID=Object.fromEntries(LORD_SKILLS.map(sk=>[sk.id,sk]));
function skillLevel(copies){return Math.floor((Math.sqrt(8*Math.max(1,copies)-7)-1)/2)+1;}
function skillNextCopies(level){return 1+level*(level+1)/2;}
function ensureLordSkills(){
 let k=S.lordSkills;
 if(!k||k.version!==2){
  const owned={};for(const [id,level] of Object.entries(k?.owned||{})){const key=LORD_SKILL_BY_ID[id]?id:id+'_a0';if(LORD_SKILL_BY_ID[key])owned[key]=1+Math.max(1,Number(level)||1)*(Math.max(1,Number(level)||1)-1)/2;}
  const legacy=k?.equipped,active=LORD_SKILL_BY_ID[legacy]?legacy:legacy+'_a0';
  k=S.lordSkills={version:2,owned,active,passives:[null,null,null,null]};
 }
 const base=S.lord.cls+'_a0';
 const valid=id=>{const sk=LORD_SKILL_BY_ID[id];return sk&&sk.cls===S.lord.cls&&sk.tier<=S.lord.promo&&k.owned[id]>0;};
 if(!valid(k.active)||LORD_SKILL_BY_ID[k.active].type!=='active')k.active=null;
 const used=new Set();k.passives=Array.from({length:4},(_,i)=>{const id=k.passives?.[i];if(!valid(id)||LORD_SKILL_BY_ID[id].type!=='passive'||used.has(id))return null;used.add(id);return id;});
 if(S.daily.freeSkillSummon===undefined)S.daily.freeSkillSummon=1;
 return k;
}
function skillPool(){return LORD_SKILLS.filter(sk=>sk.cls===S.lord.cls&&sk.tier<=S.lord.promo);}
function skillPassiveBonus(key){const k=ensureLordSkills();return k.passives.reduce((sum,id)=>{const sk=LORD_SKILL_BY_ID[id];return sum+(sk?.key===key?sk.value*(1+.1*(skillLevel(k.owned[id])-1)):0);},0);}
function equippedLordSkill(){const k=ensureLordSkills(),sk=LORD_SKILL_BY_ID[k.active],level=skillLevel(k.owned[k.active]);if(!sk)return {id:null,name:'스킬 미장착',icon:'+',cd:1,desc:'스킬을 습득한 뒤 장착하세요',level:0};return {...sk,level,desc:skillDescription(sk,level),power:sk.power*(1+.1*(level-1)),cd:sk.cd*(1-Math.min(.5,skillPassiveBonus('cooldown')))};}
function skillDescription(sk,level=1){
 if(sk.type==='passive')return SKILL_PASSIVE_LABELS[sk.key]+' +'+(sk.value*(1+.1*(level-1))*100).toFixed(1)+'%';
 const p=sk.power*(1+.1*(level-1))*(['heal','sanctuary'].includes(sk.effect)?1+skillPassiveBonus('heal'):1);
 return ({strike:'적 전체에 영주 공격력 '+(4*p).toFixed(1)+'배 피해',meteor:'운석 3개 · 각각 영주 공격력 '+(14*p).toFixed(1)+'배 피해',rally:'8초간 아군 공격력 +'+Math.round(60*p)+'%, 이동속도 +40%',guard:'8초간 아군과 성의 피해 '+Math.round(Math.min(.8,.4*p)*100)+'% 감소',heal:'아군 체력 '+Math.round(Math.min(.95,.35*p)*100)+'%, 성 체력 '+Math.round(Math.min(.6,.15*p)*100)+'% 회복',sanctuary:'아군 체력 '+Math.round(Math.min(.95,.6*p)*100)+'%·성 '+Math.round(Math.min(.6,.25*p)*100)+'% 회복, 5초 피해 50% 감소'})[sk.effect];
}
function equipLordSkill(id,slot){
 const k=ensureLordSkills(),sk=LORD_SKILL_BY_ID[id];if(!sk||sk.cls!==S.lord.cls||sk.tier>S.lord.promo||!k.owned[id])return false;
 const before={army:armyMult(),lord:lordStats(),castle:castleMaxHp()};
 if(sk.type==='active')k.active=id;
 else {slot=Number(slot);if(!Number.isInteger(slot)||slot<0||slot>3)return false;const old=k.passives.indexOf(id);if(old>=0)k.passives[old]=null;k.passives[slot]=id;}
 if(k.tutorial==='equip')k.tutorial='done';
 syncSkillStats(before);return true;
}
function syncSkillStats(before){
 if(typeof B==='undefined')return;const army=armyMult(),lord=lordStats();
 for(const u of B.units||[])if(u.team===0){const prev=u.isLord?before.lord:before.army,next=u.isLord?lord:army;const ratio=next.hp/prev.hp;u.maxHp*=ratio;u.hp*=ratio;u.atk*=next.atk/prev.atk;if(u.isLord&&prev.heal)u.heal*=next.heal/prev.heal;}
 if(B.pCastle){const ratio=castleMaxHp()/before.castle;B.pCastle.max*=ratio;B.pCastle.hp*=ratio;}
}
function drawLordSkills(n,random=Math.random){
 if(n!==1&&n!==10)return null;const k=ensureLordSkills(),tutorial=k.tutorial==='draw',pool=tutorial?skillPool().filter(sk=>sk.type==='active'&&sk.tier===0):skillPool(),cost=n===10?900:100;
 if(tutorial&&n!==1)return null;
 if(n===1&&S.daily.freeSkillSummon>0)S.daily.freeSkillSummon--;else{if(S.gems<cost)return null;S.gems-=cost;}
 const before={army:armyMult(),lord:lordStats(),castle:castleMaxHp()};
 const groups=Object.keys(SKILL_RARITIES).filter(r=>pool.some(sk=>sk.rarity===r)),total=groups.reduce((v,r)=>v+SKILL_RARITIES[r].weight,0);
 const result=Array.from({length:n},()=>{let roll=Math.max(0,Math.min(.999999,random()))*total;const rarity=groups.find(r=>(roll-=SKILL_RARITIES[r].weight)<0)||groups.at(-1);const choices=pool.filter(sk=>sk.rarity===rarity),sk=choices[Math.min(choices.length-1,Math.floor(Math.max(0,random())*choices.length))];const copies=k.owned[sk.id]||0;k.owned[sk.id]=copies+1;return {id:sk.id,fresh:copies===0,level:skillLevel(copies+1),copies:copies+1,leveled:copies>0&&skillLevel(copies+1)>skillLevel(copies)};});
 if(tutorial){k.tutorial='equip';k.tutorialSkill=result[0].id;}
 syncSkillStats(before);return result;
}
