// 영토, 나의 영토 — 게임 데이터 정의
'use strict';

// 건물(영웅 카드) 등급은 일반 / 고급 / 영웅 3단계
const RARITY = {
  C: { name: '일반', color: '#9aa4b1', weight: 62, score: 1 },
  R: { name: '고급', color: '#4fa3ff', weight: 30, score: 2 },
  H: { name: '영웅', color: '#ffb020', weight: 8,  score: 4 },
};
const RARITY_ORDER = ['C', 'R', 'H'];

// 메인 영주 직업 — 전직 4단계
const CLASSES = {
  knight: {
    name: '기사', icon: '🛡️',
    promos: ['기사', '성기사', '수호기사', '성검왕'],
    desc: '튼튼한 근접 전투. 아군 전체를 독려한다.',
    lord: { kind: 'melee', hp: 260, atk: 14, range: 26, speed: 45, atkCd: 0.9 },
    skill: { name: '돌격 명령', icon: '📯', cd: 25, desc: '8초간 모든 아군 공격력 +60%, 이동속도 +40%' },
  },
  mage: {
    name: '마법사', icon: '🔮',
    promos: ['마법사', '원소술사', '대마법사', '현자'],
    desc: '원거리 광역 마법. 적 무리를 불태운다.',
    lord: { kind: 'ranged', hp: 140, atk: 18, range: 170, speed: 38, atkCd: 1.4, proj: 'bolt', splash: 30 },
    skill: { name: '메테오', icon: '☄️', cd: 20, desc: '적 밀집 지역에 운석 3개를 떨어뜨린다' },
  },
  priest: {
    name: '성직자', icon: '✨',
    promos: ['성직자', '사제', '대사제', '성자'],
    desc: '아군을 치유하고 성을 지킨다.',
    lord: { kind: 'healer', hp: 180, atk: 9, heal: 14, range: 140, speed: 40, atkCd: 1.2, proj: 'holy' },
    skill: { name: '성역', icon: '🕊️', cd: 25, desc: '모든 아군과 성을 대량 회복, 5초간 피해 50% 감소' },
  },
};

// 전직 단계: 요구 영주 레벨 / 스테이지 / 골드, 효과
const PROMOTIONS = [
  { tier: 0, slots: 2, mult: 1.0 },
  { tier: 1, slots: 3, mult: 1.6, reqLevel: 10, reqStage: 10, cost: 5000 },
  { tier: 2, slots: 4, mult: 2.6, reqLevel: 30, reqStage: 30, cost: 250000 },
  { tier: 3, slots: 5, mult: 4.2, reqLevel: 60, reqStage: 60, cost: 2.5e7 },
];

// 3개 국가
const NATIONS = {
  aurum:  { name: '황금왕국 아우룸', short: '아우룸', color: '#f2c14e', dark: '#8a6a14', icon: '👑', bonusText: '골드 획득 +20%', bonus: { gold: 0.2 } },
  sylvan: { name: '숲의 연방 실반',  short: '실반',   color: '#5cc96b', dark: '#21652b', icon: '🌳', bonusText: '부대 체력 +20%', bonus: { hp: 0.2 } },
  ignis:  { name: '화염제국 이그니스', short: '이그니스', color: '#ff6a4d', dark: '#8a2414', icon: '🔥', bonusText: '부대 공격력 +20%', bonus: { atk: 0.2 } },
};

// 영웅 카드 = 유닛을 뽑아내는 건물. 한 번 소환할 때 부하가 3마리 또는 5마리씩 나온다.
const HEROES = [
  // ── 일반 ──
  { id: 'militia',  name: '민병대장 한스',   rarity: 'C', icon: '🪓', building: '민병 막사', spawnCd: 9, count: 5,
    unit: { name: '민병', kind: 'melee', hp: 55, atk: 5, range: 22, speed: 38, atkCd: 1.0, size: 7, color: '#c9a26b', weapon: 'axe' } },
  { id: 'archer',   name: '견습궁수 리나',   rarity: 'C', icon: '🏹', building: '사격장', spawnCd: 10, count: 5,
    unit: { name: '궁수', kind: 'ranged', hp: 32, atk: 6, range: 150, speed: 34, atkCd: 1.3, size: 6, color: '#7fb069', proj: 'arrow', weapon: 'bow' } },
  { id: 'spear',    name: '창병대장 볼크',   rarity: 'C', icon: '🔱', building: '창병 훈련소', spawnCd: 8, count: 3,
    unit: { name: '창병', kind: 'melee', hp: 95, atk: 8, range: 30, speed: 36, atkCd: 1.0, size: 7, color: '#8d99ae', weapon: 'spear' } },
  { id: 'crossbow', name: '석궁대장 베른',   rarity: 'C', icon: '🎯', building: '석궁 공방', spawnCd: 9, count: 3,
    unit: { name: '석궁병', kind: 'ranged', hp: 45, atk: 13, range: 175, speed: 32, atkCd: 1.8, size: 6, color: '#a0785a', proj: 'bolt_x', weapon: 'bow' } },
  // ── 고급 ──
  { id: 'apprentice', name: '마법사 미나',   rarity: 'R', icon: '📘', building: '마법 학당', spawnCd: 11, count: 5,
    unit: { name: '견습 마법사', kind: 'ranged', hp: 45, atk: 11, range: 140, speed: 32, atkCd: 1.5, size: 6, color: '#6c8cff', proj: 'bolt', splash: 25, weapon: 'staff' } },
  { id: 'cavalry',  name: '기병대장 로웰',   rarity: 'R', icon: '🐎', building: '마구간', spawnCd: 11, count: 3,
    unit: { name: '기병', kind: 'melee', hp: 190, atk: 16, range: 26, speed: 78, atkCd: 0.9, size: 9, color: '#b5651d', weapon: 'lance', mount: true } },
  { id: 'monk',     name: '수도사 이사벨',   rarity: 'R', icon: '📿', building: '수도원', spawnCd: 11, count: 3,
    unit: { name: '수도사', kind: 'healer', hp: 85, atk: 6, heal: 14, range: 120, speed: 34, atkCd: 1.3, size: 6, color: '#f1e3c6', proj: 'holy', weapon: 'staff' } },
  { id: 'pyro',     name: '화염술사 이그란', rarity: 'R', icon: '🔥', building: '화염의 탑', spawnCd: 11, count: 3,
    unit: { name: '화염술사', kind: 'ranged', hp: 70, atk: 20, range: 150, speed: 32, atkCd: 1.6, size: 7, color: '#ff7b39', proj: 'fire', splash: 40, weapon: 'staff' } },
  { id: 'ranger',   name: '숲지기 엘렌',     rarity: 'R', icon: '🌙', building: '엘프 망루', spawnCd: 11, count: 5,
    unit: { name: '엘프 궁수', kind: 'ranged', hp: 60, atk: 13, range: 200, speed: 40, atkCd: 1.0, size: 6, color: '#9be564', proj: 'arrow', weapon: 'bow' } },
  // ── 영웅 ──
  { id: 'griffin',  name: '그리핀 기수 아리아', rarity: 'H', icon: '🦅', building: '그리핀 둥지', spawnCd: 13, count: 3,
    unit: { name: '그리핀 기수', kind: 'melee', hp: 320, atk: 30, range: 28, speed: 95, atkCd: 0.8, size: 10, color: '#e8c872', weapon: 'lance', flying: true } },
  { id: 'paladin',  name: '성기사단장 가렌', rarity: 'H', icon: '⚜️', building: '성기사단 본부', spawnCd: 14, count: 5,
    unit: { name: '성기사', kind: 'melee', hp: 420, atk: 22, range: 26, speed: 36, atkCd: 1.0, size: 10, color: '#e9ecef', weapon: 'sword', heavy: true } },
  { id: 'dragon',   name: '드래곤 테이머 카엘', rarity: 'H', icon: '🐉', building: '용의 둥지', spawnCd: 16, count: 3,
    unit: { name: '와이번', kind: 'ranged', hp: 520, atk: 30, range: 130, speed: 42, atkCd: 1.4, size: 13, color: '#d7263d', proj: 'fire', splash: 50, flying: true, dragon: true } },
  { id: 'archangel', name: '대천사 세라핌',  rarity: 'H', icon: '😇', building: '천상의 제단', spawnCd: 16, count: 3,
    unit: { name: '천사', kind: 'healer', hp: 380, atk: 18, heal: 22, healAll: true, range: 160, speed: 45, atkCd: 1.1, size: 10, color: '#fff3b0', proj: 'holy', flying: true, angel: true } },
];
const HERO_BY_ID = Object.fromEntries(HEROES.map(h => [h.id, h]));

// 몬스터
const ENEMIES = {
  goblin:       { name: '고블린', kind: 'melee', hp: 28, atk: 4, range: 20, speed: 36, atkCd: 1.0, size: 6, color: '#5fae4a' },
  goblin_archer:{ name: '고블린 궁수', kind: 'ranged', hp: 18, atk: 4, range: 130, speed: 32, atkCd: 1.5, size: 6, color: '#7cc75f', proj: 'arrow' },
  wolf:         { name: '늑대', kind: 'melee', hp: 40, atk: 5, range: 20, speed: 60, atkCd: 0.8, size: 7, color: '#8a8a8a', beast: true },
  goblin_king:  { name: '고블린 왕', kind: 'melee', hp: 900, atk: 18, range: 30, speed: 25, atkCd: 1.2, size: 18, color: '#3e8f2c', boss: true },
  skeleton:     { name: '해골 병사', kind: 'melee', hp: 34, atk: 5, range: 22, speed: 32, atkCd: 1.0, size: 7, color: '#e6e1cf' },
  skel_archer:  { name: '해골 궁수', kind: 'ranged', hp: 22, atk: 5, range: 140, speed: 30, atkCd: 1.5, size: 6, color: '#d4cfbd', proj: 'arrow' },
  ghost:        { name: '망령', kind: 'melee', hp: 30, atk: 7, range: 22, speed: 48, atkCd: 1.0, size: 7, color: '#a8c5ff', flying: true },
  lich:         { name: '리치', kind: 'ranged', hp: 1000, atk: 22, range: 160, speed: 22, atkCd: 1.6, size: 16, color: '#6b4fa0', proj: 'bolt', splash: 45, boss: true },
  orc:          { name: '오크 전사', kind: 'melee', hp: 55, atk: 7, range: 22, speed: 34, atkCd: 1.1, size: 8, color: '#4f7a3a' },
  orc_shaman:   { name: '오크 주술사', kind: 'ranged', hp: 30, atk: 7, range: 130, speed: 30, atkCd: 1.6, size: 7, color: '#6f9a4a', proj: 'fire', splash: 25 },
  troll:        { name: '트롤', kind: 'melee', hp: 120, atk: 10, range: 26, speed: 26, atkCd: 1.4, size: 11, color: '#5a7d6c' },
  warlord:      { name: '오크 대족장', kind: 'melee', hp: 1300, atk: 30, range: 32, speed: 28, atkCd: 1.1, size: 19, color: '#3b5f2a', boss: true },
  yeti:         { name: '예티', kind: 'melee', hp: 80, atk: 9, range: 24, speed: 30, atkCd: 1.2, size: 10, color: '#e8f4ff' },
  ice_mage:     { name: '얼음 마녀', kind: 'ranged', hp: 34, atk: 8, range: 150, speed: 30, atkCd: 1.6, size: 7, color: '#7fd1ff', proj: 'bolt', splash: 25 },
  frost_wolf:   { name: '서리 늑대', kind: 'melee', hp: 50, atk: 7, range: 20, speed: 62, atkCd: 0.8, size: 7, color: '#bfe3ff', beast: true },
  frost_giant:  { name: '서리 거인', kind: 'melee', hp: 1600, atk: 34, range: 34, speed: 22, atkCd: 1.3, size: 21, color: '#9fd3ff', boss: true },
  imp:          { name: '임프', kind: 'ranged', hp: 30, atk: 8, range: 120, speed: 50, atkCd: 1.2, size: 6, color: '#ff5a5a', proj: 'fire', flying: true },
  demon:        { name: '악마 병사', kind: 'melee', hp: 75, atk: 10, range: 24, speed: 36, atkCd: 1.0, size: 9, color: '#a8323e' },
  hellhound:    { name: '지옥견', kind: 'melee', hp: 60, atk: 9, range: 20, speed: 66, atkCd: 0.8, size: 8, color: '#5c1a1b', beast: true },
  demon_lord:   { name: '마왕', kind: 'ranged', hp: 2200, atk: 40, range: 150, speed: 22, atkCd: 1.5, size: 22, color: '#3d0a12', proj: 'fire', splash: 60, boss: true },
};

const REGIONS = [
  { name: '고블린 숲', sky: ['#8ec5ff', '#d9f0ff'], ground: ['#4c8a3f', '#3b6f31'], enemies: ['goblin', 'goblin', 'goblin_archer', 'wolf'], boss: 'goblin_king' },
  { name: '해골 묘지', sky: ['#5b5f86', '#a9a2c4'], ground: ['#4b4f3c', '#3a3d2e'], enemies: ['skeleton', 'skeleton', 'skel_archer', 'ghost'], boss: 'lich' },
  { name: '오크 요새', sky: ['#e6a76b', '#f6dcb4'], ground: ['#8a6d42', '#6d5432'], enemies: ['orc', 'orc', 'orc_shaman', 'troll'], boss: 'warlord' },
  { name: '얼음 협곡', sky: ['#a8d8ff', '#eef8ff'], ground: ['#cfe6f2', '#a9cde0'], enemies: ['yeti', 'frost_wolf', 'ice_mage', 'frost_wolf'], boss: 'frost_giant' },
  { name: '마왕성',   sky: ['#3a0d1a', '#7a2a2a'], ground: ['#3b2a2a', '#2a1d1d'], enemies: ['imp', 'demon', 'demon', 'hellhound'], boss: 'demon_lord' },
];

// 영주 강화 스탯
const UPGRADES = [
  { id: 'atk',    name: '부대 공격력', icon: '⚔️', base: 40,  growth: 1.14, desc: l => `+${(l * 6)}%` },
  { id: 'hp',     name: '부대 체력',   icon: '❤️', base: 40,  growth: 1.14, desc: l => `+${(l * 6)}%` },
  { id: 'spawn',  name: '소환 속도',   icon: '⏱️', base: 120, growth: 1.25, max: 50, desc: l => `+${(l * 2)}%` },
  { id: 'castle', name: '성벽 강화',   icon: '🏰', base: 60,  growth: 1.15, desc: l => `성 체력 +${l * 10}%` },
  { id: 'gold',   name: '세금 징수',   icon: '💰', base: 100, growth: 1.18, desc: l => `골드 +${l * 5}%` },
];

// 서열전 작위 (서열 1~20, 그 아래는 평민)
const TITLES = [
  { upTo: 1,  name: '대공', bonus: 0.30 },
  { upTo: 3,  name: '공작', bonus: 0.22 },
  { upTo: 6,  name: '후작', bonus: 0.16 },
  { upTo: 10, name: '백작', bonus: 0.11 },
  { upTo: 15, name: '자작', bonus: 0.07 },
  { upTo: 20, name: '남작', bonus: 0.04 },
  { upTo: Infinity, name: '기사작', bonus: 0 },
];

const NOBLE_NAMES = ['에드윈', '셀레스', '그레고르', '로잘린', '아르투르', '비비안', '레오폴드', '이졸데', '카시안', '마르가레테',
  '테오도르', '엘레노어', '지크문트', '헬가', '발터', '오필리아', '라그나르', '세실리아', '울리히', '프레야', '하인리히', '도로시'];
