// 전장 렌더링 (캔버스) — 세로 전장: 아군 성이 화면 아래, 적 진영이 위
'use strict';

let cv, ctx;
const SPRITE_SCALE = 1.15;
const VIEW = { k: 1, ox: 0, oy: 0, dpr: 1 };

// 전장 좌표(x = 전선, y = 폭) → 화면 좌표
const SX = (y) => y;
const SY = (x) => W - x;

function initRender(canvas) {
  cv = canvas; ctx = cv.getContext('2d');
  fitCanvas();
  if (window.ResizeObserver) new ResizeObserver(fitCanvas).observe(cv);
  else window.addEventListener('resize', fitCanvas);
  makeDeco();
}

// 캔버스 크기에 맞춰 전장 길이(W)를 정한다. 폭(LANE_W)이 화면 너비에 꽉 차도록.
function fitCanvas() {
  const cw = cv.clientWidth, ch = cv.clientHeight;
  if (!cw || !ch) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
  setWorld(ch / (cw / LANE_W));
  VIEW.k = Math.min(cw / LANE_W, ch / W);
  VIEW.ox = (cw - LANE_W * VIEW.k) / 2; VIEW.oy = (ch - W * VIEW.k) / 2;
  VIEW.dpr = dpr;
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#0c0b10'; ctx.fillRect(0, 0, cv.width, cv.height);
  const d = VIEW.dpr, k = VIEW.k;
  ctx.setTransform(d * k, 0, 0, d * k, d * VIEW.ox, d * VIEW.oy);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, LANE_W, W); ctx.clip();
  if (B.shake > 0) ctx.translate(rand(-1, 1) * B.shake * 10, rand(-1, 1) * B.shake * 10);
  const reg = B.mode === 'stage' ? region(B.stage || 1) : { sky: ['#4a5d8f', '#c9b6d9'], ground: ['#6b6b4a', '#4f4f36'] };
  drawBackground(reg);
  if (B.eCastle) {
    drawCastle(1);
    B.enemySpawners.forEach((s, i) => drawBuilding(1, i, s.id, s.t));
  } else drawLair();
  drawCastle(0);
  for (let i = 0; i < slotCount(); i++) drawBuilding(0, i, S.slots[i], B.spawnT[i]);

  const sorted = B.units.slice().sort((a, b) => (SY(a.x) + (a.flying ? 40 : 0)) - (SY(b.x) + (b.flying ? 40 : 0)));
  for (const u of sorted) drawUnitBase(u);
  for (const u of sorted) drawUnit(u);
  for (const p of B.projs) drawProj(p);
  for (const f of B.fx) drawFx(f);
  for (const t of B.texts) {
    ctx.globalAlpha = 1 - t.t;
    ctx.font = `bold ${t.size}px sans-serif`; ctx.textAlign = 'center';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.6)';
    const tx = SX(t.y), ty = SY(t.x) - (t.up || 0) - t.t * 26;
    ctx.strokeText(t.txt, tx, ty); ctx.fillStyle = t.color; ctx.fillText(t.txt, tx, ty);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  drawHud();
}

function drawBackground(reg) {
  const g = ctx.createLinearGradient(0, 0, 0, W);
  g.addColorStop(0, reg.ground[1]); g.addColorStop(1, reg.ground[0]);
  ctx.fillStyle = g; ctx.fillRect(-20, -20, LANE_W + 40, W + 40);
  // 가운데로 난 길
  ctx.fillStyle = 'rgba(255,240,210,.07)';
  ctx.beginPath();
  for (let x = 0; x <= W; x += 20) ctx.lineTo(LANE_W / 2 + Math.sin(x * 0.015) * 14 - 48, x);
  for (let x = W; x >= 0; x -= 20) ctx.lineTo(LANE_W / 2 + Math.sin(x * 0.015) * 14 + 48, x);
  ctx.fill();
  // 풀/돌
  for (const dd of B.deco) {
    const x = SX(dd.y), y = dd.x / 1000 * W;
    if (dd.t > 0.6) {
      ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x - 1, y - 5); ctx.moveTo(x, y); ctx.lineTo(x + 1, y - 6); ctx.moveTo(x + 3, y); ctx.lineTo(x + 3, y - 4); ctx.stroke();
    } else { ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.arc(x, y, dd.r, 0, 7); ctx.fill(); }
  }
  // 영토 경계
  ctx.fillStyle = 'rgba(255,255,255,.05)';
  ctx.fillRect(0, SY(175), LANE_W, 175);
  if (B.eCastle) ctx.fillRect(0, 0, LANE_W, 175);
  ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, SY(175)); ctx.lineTo(LANE_W, SY(175)); ctx.stroke(); ctx.setLineDash([]);
}

// 성벽: 아군은 화면 아래, 적국(국가전/서열전)은 화면 위
function drawCastle(team) {
  const mine = team === 0;
  const col = mine ? NATIONS[S.nation].color : (B.special ? B.special.color : '#555');
  const c = mine ? B.pCastle : B.eCastle;
  const top = mine ? W - 62 : 0;      // 성벽 띠의 위쪽 경계
  const h = 62;
  ctx.fillStyle = '#7d7f87'; ctx.fillRect(0, top, LANE_W, h);
  ctx.fillStyle = '#9a9ca5'; ctx.fillRect(0, top + (mine ? 6 : 0), LANE_W, h - 6);
  ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 1;
  for (let y = top + 12; y < top + h; y += 12) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(LANE_W, y); ctx.stroke();
    for (let x = ((y / 12) % 2) * 12; x < LANE_W; x += 24) { ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x, y); ctx.stroke(); }
  }
  // 성가퀴(전장 쪽 가장자리)
  const my = mine ? top - 8 : top + h - 2;
  ctx.fillStyle = '#7d7f87';
  for (let x = 2; x < LANE_W; x += 20) ctx.fillRect(x, my, 12, 10);
  // 성문
  const gx = LANE_W / 2;
  ctx.fillStyle = '#4a3220';
  if (mine) { ctx.beginPath(); ctx.moveTo(gx - 20, W); ctx.lineTo(gx - 20, top + 24); ctx.arc(gx, top + 24, 20, Math.PI, 0); ctx.lineTo(gx + 20, W); ctx.fill(); }
  else { ctx.beginPath(); ctx.moveTo(gx - 20, 0); ctx.lineTo(gx - 20, h - 24); ctx.arc(gx, h - 24, 20, Math.PI, 0, true); ctx.lineTo(gx + 20, 0); ctx.fill(); }
  // 양쪽 탑
  for (const tx of [22, LANE_W - 22]) {
    const ty = mine ? top - 30 : 40;
    ctx.fillStyle = '#6d6f77'; ctx.fillRect(tx - 18, ty, 36, mine ? W - ty : h + 14 - ty);
    ctx.fillStyle = '#5d5f66'; for (let i = 0; i < 3; i++) ctx.fillRect(tx - 18 + i * 13, ty - 7, 9, 8);
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(tx - 20, ty - 6); ctx.lineTo(tx, ty - 34); ctx.lineTo(tx + 20, ty - 6); ctx.fill();
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx, ty - 34); ctx.lineTo(tx, ty - 52); ctx.stroke();
    const wave = Math.sin(B.time * 5 + tx) * 3;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(tx, ty - 52); ctx.lineTo(tx + 20, ty - 47 + wave); ctx.lineTo(tx, ty - 41); ctx.fill();
  }
  // 체력바
  if (c) {
    const r = Math.max(0, c.hp / c.max);
    const by = mine ? W - 12 : 6;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; roundRect(gx - 70, by, 140, 8, 4); ctx.fill();
    ctx.fillStyle = r > 0.5 ? '#5ad16b' : r > 0.25 ? '#f2c14e' : '#ff5c5c'; roundRect(gx - 69, by + 1, 138 * r, 6, 3); ctx.fill();
  }
}

// 스테이지의 적 출현지: 지역별 색으로 빛나는 몬스터 소굴(화면 위)
const LAIR_GLOW = ['#7dff6a', '#b48cff', '#ffae42', '#8fe3ff', '#ff3b3b'];
function drawLair() {
  const ri = Math.floor(((B.stage || 1) - 1) / 10) % REGIONS.length;
  const glow = LAIR_GLOW[ri];
  // 바위 능선
  ctx.fillStyle = '#3b3530';
  ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(LANE_W + 10, -10);
  for (let x = LANE_W + 10; x >= -10; x -= 16) ctx.lineTo(x, 50 + Math.sin(x * 0.37) * 8 + Math.cos(x * 0.11) * 6);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.07)';
  for (let x = 6; x < LANE_W; x += 38) { ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x + 14, 4); ctx.lineTo(x + 22, 18); ctx.fill(); }
  // 동굴 입구
  const cx = LANE_W / 2, rx = (LAIR_MOUTH[1] - LAIR_MOUTH[0]) / 2 + 8;
  const pulse = 0.6 + 0.2 * Math.sin(B.time * 3) + (B.lairPulse || 0) * 0.5;
  const gr = ctx.createRadialGradient(cx, 30, 4, cx, 30, rx);
  gr.addColorStop(0, glow); gr.addColorStop(0.3, 'rgba(25,12,25,.95)'); gr.addColorStop(1, '#0d0a0f');
  ctx.globalAlpha = Math.min(1, pulse);
  ctx.fillStyle = gr;
  ctx.beginPath(); ctx.ellipse(cx, 26, rx, 36, 0, 0, Math.PI); ctx.lineTo(cx - rx, -10); ctx.lineTo(cx + rx, -10); ctx.fill();
  ctx.globalAlpha = 1;
  // 어둠 속 눈빛
  for (let i = 0; i < 4; i++) {
    if (Math.sin(B.time * 0.9 + i * 2) <= 0.3) continue;
    const ex = cx - rx * 0.6 + i * rx * 0.4, ey = 20 + Math.sin(B.time + i) * 5;
    ctx.fillStyle = glow; ctx.fillRect(ex - 4, ey, 3, 2); ctx.fillRect(ex + 2, ey, 3, 2);
  }
  ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'left';
  ctx.fillStyle = glow; ctx.fillText('몬스터 소굴', 8, 14);
}

function drawBuilding(team, i, heroId, prog) {
  const p = BUILDING_POS[i];
  const x = SX(p.y), y = team === 0 ? SY(p.x) : SY(W - p.x);
  if (!heroId) {
    if (team === 0) { ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.setLineDash([3, 3]); ctx.strokeRect(x - 14, y - 12, 28, 20); ctx.setLineDash([]); }
    return;
  }
  const hero = HERO_BY_ID[heroId];
  const rc = RARITY[hero.rarity].color;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, y + 8, 20, 6, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#d9c8a5'; ctx.fillRect(x - 15, y - 11, 30, 19);
  ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 0.8; ctx.strokeRect(x - 15, y - 11, 30, 19);
  ctx.fillStyle = '#5b3d24'; ctx.fillRect(x - 4, y - 2, 8, 10);
  ctx.fillStyle = rc; ctx.beginPath(); ctx.moveTo(x - 19, y - 10); ctx.lineTo(x, y - 27); ctx.lineTo(x + 19, y - 10); ctx.fill();
  ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(hero.icon, x, y - 35);
  ctx.textBaseline = 'alphabetic';
  // 소환 게이지(정원이 차서 대기 중이면 금색) + 현재/정원
  const cap = team === 0 ? heroCap(heroId) : hero.cap;
  const alive = slotAlive(team, i, heroId);
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x - 15, y + 10, 30, 3);
  ctx.fillStyle = alive >= cap ? '#ffd34d' : '#9fe8ff'; ctx.fillRect(x - 15, y + 10, 30 * Math.min(1, prog || 0), 3);
  ctx.font = 'bold 9px sans-serif'; ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(0,0,0,.75)';
  ctx.fillStyle = alive >= cap ? '#ffd34d' : '#fff';
  ctx.strokeText(`${alive}/${cap}`, x, y + 23); ctx.fillText(`${alive}/${cap}`, x, y + 23);
}

function teamColor(u) {
  if (u.team === 0) return NATIONS[S.nation].color;
  return u.tint || '#ff4d4d';
}

// 발밑 그림자 + 팀 색 고리 (겹쳐 있어도 피아와 개체를 구분할 수 있게)
function drawUnitBase(u) {
  const x = SX(u.y), y = SY(u.x) + 2;
  const s = u.size * SPRITE_SCALE;
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath(); ctx.ellipse(x, y, s * 0.95, s * 0.34, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = teamColor(u); ctx.globalAlpha = u.isLord ? 0.9 : 0.55; ctx.lineWidth = u.isLord ? 1.6 : 1;
  ctx.beginPath(); ctx.ellipse(x, y, s * 0.95, s * 0.34, 0, 0, 7); ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawUnit(u) {
  const fy = u.flying ? 20 + Math.sin(B.time * 4 + u.id) * 3 : 0;
  const bob = u.flying ? 0 : Math.abs(Math.sin(u.walk)) * 1.5;
  const x = SX(u.y), y = SY(u.x) - fy - bob;
  const s = u.size;
  const face = u.face || (u.team === 0 ? 1 : -1);

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face < 0 ? -SPRITE_SCALE : SPRITE_SCALE, SPRITE_SCALE);
  if (u.flash > 0) ctx.filter = 'brightness(2.2)';
  if (u.isLord) drawLord(u, s);
  else if (u.def.dragon) drawDragon(u, s);
  else if (u.def.angel) drawAngel(u, s);
  else if (u.monster) drawMonster(u, s);
  else drawSoldier(u, s);
  ctx.restore();
  ctx.filter = 'none';

  const head = s * (u.isLord ? 2.6 + (u.promo || 0) * 0.25 : 2.2) * SPRITE_SCALE;
  if (u.hp < u.maxHp || u.isLord || u.boss) {
    const w = Math.max(16, s * 2.4), r = Math.max(0, u.hp / u.maxHp);
    const by = y - head - 6;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - w / 2, by, w, 3);
    ctx.fillStyle = u.team === 0 ? '#5ad16b' : '#ff5c5c'; ctx.fillRect(x - w / 2, by, w * r, 3);
  }
  if (u.isLord) {
    const label = `${CLASSES[u.cls].promos[u.promo || 0]} ${u.name}`;
    ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = u.team === 0 ? '#fff3c4' : '#ffc4c4'; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.lineWidth = 2.5;
    ctx.strokeText(label, x, y - head - 10); ctx.fillText(label, x, y - head - 10);
  }
}

const OUTLINE = 'rgba(0,0,0,.6)';

function drawSoldier(u, s) {
  const tc = teamColor(u);
  const swing = u.anim > 0 ? Math.sin((0.25 - u.anim) / 0.25 * Math.PI) : 0;
  const step = Math.sin(u.walk * 2) * 2;
  ctx.lineWidth = 0.8; ctx.strokeStyle = OUTLINE;
  if (u.def.mount) {
    // 말
    ctx.fillStyle = '#6b4226';
    roundRect(-s * 1.1, -s * 0.2, s * 2.2, s * 0.9, s * 0.3); ctx.fill(); ctx.stroke();
    ctx.fillRect(s * 0.9, -s * 0.9, s * 0.5, s * 1.0);
    ctx.fillStyle = '#4a2c17';
    ctx.fillRect(-s * 0.9 + step, s * 0.6, 2, s * 0.6); ctx.fillRect(s * 0.7 - step, s * 0.6, 2, s * 0.6);
    ctx.translate(0, -s * 0.8);
  }
  if (u.flying) {
    // 그리핀
    ctx.fillStyle = '#c99a4b';
    ctx.beginPath(); ctx.ellipse(0, s * 0.3, s * 1.2, s * 0.6, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f2e1b8';
    const wf = Math.sin(B.time * 12 + u.id) * s * 0.8;
    ctx.beginPath(); ctx.moveTo(-s * 0.3, 0); ctx.lineTo(-s * 1.4, -s * 0.8 - wf); ctx.lineTo(s * 0.4, 0); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s * 1.2, -s * 0.1, s * 0.4, 0, 7); ctx.fill();
    ctx.fillStyle = '#f2a33a'; ctx.beginPath(); ctx.moveTo(s * 1.5, -s * 0.1); ctx.lineTo(s * 1.9, s * 0.05); ctx.lineTo(s * 1.5, s * 0.15); ctx.fill();
    ctx.translate(0, -s * 0.6);
  }
  if (!u.def.mount && !u.flying) {
    ctx.fillStyle = '#3a3a44';
    ctx.fillRect(-s * 0.35 + step * 0.5, s * 0.3, s * 0.3, s * 0.8);
    ctx.fillRect(s * 0.1 - step * 0.5, s * 0.3, s * 0.3, s * 0.8);
  }
  // 몸통
  ctx.fillStyle = u.color;
  roundRect(-s * 0.55, -s * 1.1, s * 1.1, s * 1.5, s * 0.25); ctx.fill(); ctx.stroke();
  ctx.fillStyle = tc; ctx.fillRect(-s * 0.55, -s * 0.35, s * 1.1, s * 0.3);
  // 머리
  ctx.fillStyle = '#f2c9a0';
  ctx.beginPath(); ctx.arc(0, -s * 1.55, s * 0.5, 0, 7); ctx.fill(); ctx.stroke();
  if (u.def.weapon === 'staff') {
    ctx.fillStyle = u.color; ctx.beginPath(); ctx.moveTo(-s * 0.6, -s * 1.6); ctx.lineTo(0, -s * 2.6); ctx.lineTo(s * 0.6, -s * 1.6); ctx.fill(); ctx.stroke();
  } else {
    ctx.fillStyle = '#8d99ae'; ctx.beginPath(); ctx.arc(0, -s * 1.65, s * 0.52, Math.PI, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#222'; ctx.fillRect(s * 0.15, -s * 1.6, 1.5, 1.5);
  // 무기
  ctx.save();
  ctx.translate(s * 0.5, -s * 0.7);
  ctx.rotate(-0.6 + swing * 1.4);
  ctx.lineCap = 'round';
  const w = u.def.weapon;
  if (w === 'sword' || w === 'axe') {
    ctx.strokeStyle = '#e5e5e5'; ctx.lineWidth = Math.max(1.5, s * 0.2);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * 1.3, -s * 0.2); ctx.stroke();
    if (w === 'axe') { ctx.fillStyle = '#bbb'; ctx.fillRect(s * 0.9, -s * 0.6, s * 0.4, s * 0.7); }
    if (u.def.heavy) { ctx.fillStyle = '#ffd34d'; ctx.fillRect(-1, -2, 3, 4); }
  } else if (w === 'spear' || w === 'lance') {
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-s * 0.6, 0); ctx.lineTo(s * 2.2, 0); ctx.stroke();
    ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.moveTo(s * 2.2, -2); ctx.lineTo(s * 2.8, 0); ctx.lineTo(s * 2.2, 2); ctx.fill();
  } else if (w === 'bow') {
    ctx.rotate(0.6 - swing * 1.4);
    ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, s * 0.9, -1.2, 1.2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(Math.cos(-1.2) * s * 0.9, Math.sin(-1.2) * s * 0.9); ctx.lineTo(-swing * 3, 0); ctx.lineTo(Math.cos(1.2) * s * 0.9, Math.sin(1.2) * s * 0.9); ctx.stroke();
  } else if (w === 'staff') {
    ctx.rotate(0.4 - swing * 0.6);
    ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, s * 0.8); ctx.lineTo(0, -s * 1.4); ctx.stroke();
    const orb = u.proj === 'fire' ? '#ff8c42' : u.proj === 'holy' ? '#fff3b0' : '#8ab4ff';
    ctx.fillStyle = orb; ctx.shadowColor = orb; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(0, -s * 1.5, s * 0.3 + swing, 0, 7); ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.restore();
  if (u.def.heavy) {
    ctx.fillStyle = tc; ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-s * 0.8, -s * 1.0); ctx.lineTo(-s * 0.1, -s * 1.0); ctx.lineTo(-s * 0.1, -s * 0.2); ctx.lineTo(-s * 0.45, s * 0.2); ctx.lineTo(-s * 0.8, -s * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}

// ---------- 영주: 직업 × 전직 단계별 외형 ----------
// 단계가 오를수록 갑옷/로브 색, 망토, 머리 장식, 무기, 발밑 오라가 바뀌고 체구가 커진다.
const LORD_LOOK = {
  knight: [
    { armor: '#b9c0ca', cape: '#8c1c2c', helm: '#8d99ae', sword: '#e5e5e5' },
    { armor: '#eef1f5', cape: '#2552c9', helm: '#eef1f5', plume: '#2552c9', trim: '#ffd34d', pauldron: true, sword: '#f4f7ff', aura: '#9cc3ff' },
    { armor: '#55606f', cape: '#5b1a8a', helm: '#55606f', plume: '#ffd34d', trim: '#ffd34d', pauldron: true, crown: '#ffd34d', bigShield: true, sword: '#dfe6ff', aura: '#c59bff' },
    { armor: '#f2c14e', cape: '#c1121f', trim: '#fff3b0', pauldron: true, crown: '#ff4d6d', bigShield: true, sword: '#7df9ff', glow: true, wings: '#fff6d0', aura: '#ffe066' },
  ],
  mage: [
    { robe: '#4b45b8', cape: '#2d2a7a', hat: '#4b45b8', orb: '#8ab4ff' },
    { robe: '#1f8f84', cape: '#145c56', hat: '#1f8f84', orb: '#7dffe0', trim: '#ffd34d', elements: true, aura: '#7dffe0' },
    { robe: '#1d1b4f', cape: '#3b1f6b', hat: '#1d1b4f', hatStars: true, orb: '#c59bff', trim: '#ffd34d', circle: '#c59bff', aura: '#c59bff' },
    { robe: '#f5f0ff', cape: '#e0b13a', orb: '#ffffff', trim: '#ffd34d', circle: '#ffe066', crown: '#ff4d6d', halo: true, books: true, aura: '#ffe066', glow: true },
  ],
  priest: [
    { robe: '#f4ecd8', cape: '#cfc3a4', stole: '#9a7b4f', orb: '#fff3b0', hood: '#e6dcc2' },
    { robe: '#ffffff', cape: '#3a7bd5', stole: '#3a7bd5', orb: '#bfe0ff', trim: '#ffd34d', aura: '#bfe0ff' },
    { robe: '#ffffff', cape: '#e0b13a', stole: '#c1121f', mitre: '#ffd34d', orb: '#fff3b0', trim: '#ffd34d', halo: true, aura: '#fff3b0' },
    { robe: '#fffdf5', cape: '#ffe9a8', stole: '#ffd34d', mitre: '#ffffff', orb: '#ffffff', trim: '#ffd34d', halo: true, wings: '#ffffff', aura: '#fffbe0', glow: true },
  ],
};

function drawLord(u, s) {
  const tier = Math.min(3, u.promo || 0);
  const L = LORD_LOOK[u.cls][tier];
  const tc = teamColor(u);
  const swing = u.anim > 0 ? Math.sin((0.25 - u.anim) / 0.25 * Math.PI) : 0;
  const step = Math.sin(u.walk * 2) * 2;
  const t = B.time;
  const robe = u.cls !== 'knight';

  // 발밑 오라
  if (L.aura) {
    const p = 0.5 + 0.5 * Math.sin(t * 3);
    ctx.save(); ctx.globalAlpha = 0.35 + 0.3 * p; ctx.strokeStyle = L.aura; ctx.lineWidth = 1.2 + tier * 0.5;
    ctx.shadowColor = L.aura; ctx.shadowBlur = 6 + tier * 3;
    ctx.beginPath(); ctx.ellipse(0, s * 1.05, s * (1.2 + tier * 0.3), s * (0.4 + tier * 0.08), 0, 0, 7); ctx.stroke();
    ctx.restore();
  }
  // 회전하는 마법진
  if (L.circle) {
    ctx.save(); ctx.translate(0, s * 1.05); ctx.scale(1, 0.35); ctx.rotate(t * 0.8);
    ctx.strokeStyle = L.circle; ctx.globalAlpha = 0.85; ctx.lineWidth = 1.4; ctx.shadowColor = L.circle; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(0, 0, s * 2.0, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, s * 1.45, 0, 7); ctx.stroke();
    for (let k = 0; k < 2; k++) {
      ctx.beginPath();
      for (let i = 0; i < 3; i++) { const a = k * Math.PI / 3 + i * Math.PI * 2 / 3; ctx.lineTo(Math.cos(a) * s * 2.0, Math.sin(a) * s * 2.0); }
      ctx.closePath(); ctx.stroke();
    }
    ctx.restore();
  }
  // 날개
  if (L.wings) {
    const f = Math.sin(t * 2.5) * 0.15;
    ctx.save(); ctx.fillStyle = L.wings; ctx.globalAlpha = 0.92; ctx.shadowColor = L.aura || '#fff'; ctx.shadowBlur = 10;
    for (const side of [-1, 1]) {
      ctx.save(); ctx.translate(side * s * 0.2, -s * 1.0); ctx.scale(side, 1); ctx.rotate(-0.25 - f);
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(s * 1.3, -s * 1.7, s * 2.5, -s * 1.4);
      ctx.quadraticCurveTo(s * 2.0, -s * 0.8, s * 2.2, -s * 0.5);
      ctx.quadraticCurveTo(s * 1.6, -s * 0.3, s * 1.7, s * 0.1);
      ctx.quadraticCurveTo(s * 0.9, s * 0.1, 0, s * 0.4);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
  // 망토 (단계가 오를수록 길고 넓다)
  const capeLen = s * (0.9 + tier * 0.25);
  ctx.fillStyle = L.cape;
  ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 1.15); ctx.lineTo(s * 0.4, -s * 1.15);
  ctx.lineTo(s * 0.2 - Math.abs(step) * 0.3, -s * 0.2 + capeLen);
  ctx.lineTo(-s * (1.0 + tier * 0.15) - Math.abs(step) * 0.4, -s * 0.2 + capeLen); ctx.closePath(); ctx.fill();
  if (L.trim) { ctx.strokeStyle = L.trim; ctx.lineWidth = 1; ctx.stroke(); }

  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8;
  if (!robe) {
    ctx.fillStyle = '#3a3a44';
    ctx.fillRect(-s * 0.35 + step * 0.5, s * 0.3, s * 0.3, s * 0.8);
    ctx.fillRect(s * 0.1 - step * 0.5, s * 0.3, s * 0.3, s * 0.8);
    ctx.fillStyle = L.armor;
    roundRect(-s * 0.6, -s * 1.15, s * 1.2, s * 1.55, s * 0.25); ctx.fill(); ctx.stroke();
    if (L.trim) { ctx.fillStyle = L.trim; ctx.fillRect(-s * 0.08, -s * 1.1, s * 0.16, s * 1.45); }
  } else {
    ctx.fillStyle = L.robe;
    ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 1.15); ctx.lineTo(s * 0.5, -s * 1.15); ctx.lineTo(s * 0.8 + step * 0.2, s * 1.05); ctx.lineTo(-s * 0.8 + step * 0.2, s * 1.05); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (L.stole) { ctx.fillStyle = L.stole; ctx.fillRect(-s * 0.3, -s * 1.1, s * 0.18, s * 2.05); ctx.fillRect(s * 0.12, -s * 1.1, s * 0.18, s * 2.05); }
    if (L.trim) { ctx.strokeStyle = L.trim; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-s * 0.78, s * 0.98); ctx.lineTo(s * 0.82, s * 0.98); ctx.stroke(); }
  }
  // 국가색 허리띠
  ctx.fillStyle = tc; ctx.fillRect(-s * 0.6, -s * 0.38, s * 1.2, s * 0.22);
  // 어깨 갑옷
  if (L.pauldron) {
    ctx.fillStyle = L.trim || L.armor; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8;
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(sd * s * 0.6, -s * 0.98, s * (0.3 + tier * 0.04), Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  }

  // 머리
  const hy = -s * 1.62;
  const hair = u.team === 0 ? (u.gender === 'f' ? '#e0a040' : '#5a3a2a') : '#2e2222';
  if (u.gender === 'f') { ctx.fillStyle = hair; ctx.fillRect(-s * 0.62, hy - s * 0.1, s * 0.34, s * 1.15); }
  ctx.fillStyle = '#f2c9a0'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.arc(0, hy, s * 0.5, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = hair;
  if (u.gender === 'f') { ctx.beginPath(); ctx.arc(-s * 0.05, hy - s * 0.1, s * 0.55, Math.PI * 0.9, Math.PI * 2.1); ctx.fill(); }
  else { ctx.beginPath(); ctx.arc(0, hy - s * 0.1, s * 0.52, Math.PI, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#222'; ctx.fillRect(s * 0.18, hy, 1.6, 1.6);

  // 머리 장식
  if (L.hood) { ctx.fillStyle = L.hood; ctx.beginPath(); ctx.arc(0, hy - s * 0.05, s * 0.62, Math.PI * 1.0, Math.PI * 2.0); ctx.lineTo(s * 0.62, hy + s * 0.4); ctx.lineTo(s * 0.45, hy + s * 0.1); ctx.lineTo(-s * 0.45, hy + s * 0.1); ctx.lineTo(-s * 0.62, hy + s * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  if (L.helm) {
    ctx.fillStyle = L.helm;
    ctx.beginPath(); ctx.arc(0, hy - s * 0.08, s * 0.58, Math.PI * 1.02, Math.PI * 1.98); ctx.lineTo(s * 0.58, hy + s * 0.05); ctx.lineTo(-s * 0.58, hy + s * 0.05); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (L.trim) { ctx.fillStyle = L.trim; ctx.fillRect(-s * 0.58, hy - s * 0.02, s * 1.16, s * 0.1); }
  }
  if (L.plume) {
    ctx.fillStyle = L.plume;
    ctx.beginPath(); ctx.moveTo(0, hy - s * 0.6); ctx.quadraticCurveTo(-s * 1.0, hy - s * 1.1, -s * 1.15, hy - s * 0.2); ctx.quadraticCurveTo(-s * 0.6, hy - s * 0.6, 0, hy - s * 0.45); ctx.fill();
  }
  if (L.hat) {
    const tip = hy - s * (1.5 + tier * 0.35);
    ctx.fillStyle = L.hat;
    ctx.beginPath(); ctx.ellipse(0, hy - s * 0.32, s * 0.95, s * 0.22, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.55, hy - s * 0.35); ctx.quadraticCurveTo(-s * 0.1, hy - s * 1.0, -s * 0.5, tip); ctx.lineTo(s * 0.55, hy - s * 0.35); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (L.trim) { ctx.fillStyle = L.trim; ctx.fillRect(-s * 0.55, hy - s * 0.48, s * 1.1, s * 0.12); }
    if (L.hatStars) { ctx.fillStyle = '#ffe680'; for (const [px, py] of [[-0.15, 0.8], [0.15, 1.15], [-0.3, 1.45]]) { ctx.beginPath(); ctx.arc(s * px, hy - s * py, s * 0.08, 0, 7); ctx.fill(); } }
  }
  if (L.mitre) {
    ctx.fillStyle = L.mitre;
    ctx.beginPath(); ctx.moveTo(-s * 0.42, hy - s * 0.3); ctx.lineTo(-s * 0.3, hy - s * 1.15); ctx.lineTo(0, hy - s * 1.45); ctx.lineTo(s * 0.3, hy - s * 1.15); ctx.lineTo(s * 0.42, hy - s * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = L.stole || '#c1121f';
    ctx.fillRect(-s * 0.05, hy - s * 1.2, s * 0.1, s * 0.75); ctx.fillRect(-s * 0.22, hy - s * 0.95, s * 0.44, s * 0.1);
  }
  if (L.crown) {
    const cy = hy - s * (L.helm ? 0.62 : 0.5);
    ctx.fillStyle = '#ffd34d'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(-s * 0.48, cy); ctx.lineTo(-s * 0.48, cy - s * 0.42); ctx.lineTo(-s * 0.24, cy - s * 0.18); ctx.lineTo(0, cy - s * 0.55); ctx.lineTo(s * 0.24, cy - s * 0.18); ctx.lineTo(s * 0.48, cy - s * 0.42); ctx.lineTo(s * 0.48, cy); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = L.crown; ctx.beginPath(); ctx.arc(0, cy - s * 0.12, s * 0.1, 0, 7); ctx.fill();
  }
  if (L.halo) {
    const hh = hy - s * (L.mitre ? 1.75 : L.crown ? 1.3 : 0.95);
    ctx.save(); ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 1.6; ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.ellipse(0, hh, s * 0.55, s * 0.15, 0, 0, 7); ctx.stroke(); ctx.restore();
  }

  // 무기
  ctx.save();
  if (u.cls === 'knight') {
    ctx.translate(s * 0.55, -s * 0.7);
    ctx.rotate(-0.6 + swing * 1.4);
    const len = s * (1.3 + tier * 0.28);
    ctx.lineCap = 'round';
    if (L.glow) { ctx.shadowColor = L.sword; ctx.shadowBlur = 12; }
    ctx.strokeStyle = L.sword; ctx.lineWidth = Math.max(1.6, s * (0.2 + tier * 0.03));
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, -s * 0.2); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = L.trim || '#a08040'; ctx.fillRect(-1, -s * 0.3, 3, s * 0.6);
  } else {
    ctx.translate(s * 0.6, -s * 0.6);
    ctx.rotate(0.35 - swing * 0.6);
    ctx.strokeStyle = tier >= 2 ? '#e6c46b' : '#6b4a2a'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(0, s * 1.4); ctx.lineTo(0, -s * (1.4 + tier * 0.15)); ctx.stroke();
    const oy = -s * (1.55 + tier * 0.15);
    if (u.cls === 'priest') {
      ctx.fillStyle = tier >= 2 ? '#ffd34d' : '#d8c08a';
      ctx.fillRect(-s * 0.06, oy - s * 0.5, s * 0.12, s * 0.75); ctx.fillRect(-s * 0.28, oy - s * 0.3, s * 0.56, s * 0.12);
    }
    ctx.fillStyle = L.orb; ctx.shadowColor = L.orb; ctx.shadowBlur = 6 + tier * 4;
    ctx.beginPath(); ctx.arc(0, oy, s * (0.26 + tier * 0.08) + swing, 0, 7); ctx.fill();
  }
  ctx.restore();
  if (u.cls === 'knight') {
    // 방패
    const big = L.bigShield ? 1.35 : 1;
    ctx.save(); ctx.translate(-s * 0.45, -s * 0.55); ctx.scale(big, big);
    ctx.fillStyle = tier >= 1 ? (L.trim && tier >= 3 ? '#fff3b0' : tc) : '#8d6e4a';
    ctx.strokeStyle = L.trim || '#ddd'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-s * 0.4, -s * 0.5); ctx.lineTo(s * 0.35, -s * 0.5); ctx.lineTo(s * 0.35, s * 0.25); ctx.lineTo(0, s * 0.65); ctx.lineTo(-s * 0.4, s * 0.25); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (tier >= 1) { ctx.fillStyle = L.trim || '#fff'; ctx.fillRect(-s * 0.05, -s * 0.38, s * 0.1, s * 0.8); ctx.fillRect(-s * 0.28, -s * 0.12, s * 0.56, s * 0.1); }
    ctx.restore();
  }
  // 원소 구슬 / 떠다니는 마도서 / 반짝임
  if (L.elements) {
    ['#ff7b39', '#4fc3ff', '#9be564'].forEach((c, i) => {
      const a = t * 2 + i * Math.PI * 2 / 3;
      ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(Math.cos(a) * s * 1.25, -s * 0.9 + Math.sin(a) * s * 0.45, s * 0.17, 0, 7); ctx.fill();
    });
    ctx.shadowBlur = 0;
  }
  if (L.books) {
    for (let i = 0; i < 2; i++) {
      const a = t * 1.4 + i * Math.PI;
      ctx.save(); ctx.translate(Math.cos(a) * s * 1.4, -s * 1.3 + Math.sin(a) * s * 0.5); ctx.rotate(Math.sin(t + i) * 0.3);
      ctx.fillStyle = i ? '#7a2a2a' : '#2a4a7a'; ctx.fillRect(-s * 0.3, -s * 0.22, s * 0.6, s * 0.44);
      ctx.fillStyle = '#f5ecd0'; ctx.fillRect(-s * 0.25, -s * 0.17, s * 0.5, s * 0.34);
      ctx.restore();
    }
  }
  if (L.glow) {
    for (let i = 0; i < 5; i++) {
      const a = t * 1.5 + i * 1.257, r = s * (1.5 + Math.sin(t * 2 + i) * 0.2);
      ctx.fillStyle = L.aura; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 4 + i);
      ctx.beginPath(); ctx.arc(Math.cos(a) * r, -s * 1.0 + Math.sin(a) * r * 0.7, s * 0.09, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// 전직 탭/상단 초상화용 영주 미리보기
function drawLordPreview(el, cls, gender, tier, zoom = 1) {
  const c2 = el.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = el.clientWidth || el.width, h = el.clientHeight || el.height;
  if (el.width !== Math.round(w * dpr)) { el.width = Math.round(w * dpr); el.height = Math.round(h * dpr); }
  const saved = ctx;
  ctx = c2;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, el.width, el.height);
  const size = lordSize(tier);
  const sc = h / (size * 5.2) * zoom;
  ctx.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * w / 2, dpr * (h - size * 1.6 * sc));
  drawLord({ team: 0, cls, gender, promo: tier, anim: 0, walk: 0, face: 1 }, size);
  ctx = saved;
}

function drawMonster(u, s) {
  const step = Math.sin(u.walk * 2) * 2;
  const swing = u.anim > 0 ? Math.sin((0.25 - u.anim) / 0.25 * Math.PI) : 0;
  ctx.fillStyle = u.color; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8;
  if (u.def.beast) {
    ctx.beginPath(); ctx.ellipse(0, 0, s * 1.2, s * 0.6, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(s * 1.1, -s * 0.4, s * 0.5, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.9, -s * 0.8); ctx.lineTo(s * 1.0, -s * 1.2); ctx.lineTo(s * 1.2, -s * 0.8); ctx.fill();
    ctx.fillRect(-s * 0.9 + step, s * 0.3, 2, s * 0.6); ctx.fillRect(s * 0.6 - step, s * 0.3, 2, s * 0.6);
    ctx.fillStyle = '#ff3030'; ctx.fillRect(s * 1.2, -s * 0.5, 2, 2);
    return;
  }
  if (u.flying) {
    const wf = Math.sin(B.time * 10 + u.id) * s * 0.6;
    ctx.globalAlpha = u.key === 'ghost' ? 0.75 : 1;
    ctx.fillStyle = u.key === 'imp' ? '#6a1010' : u.color;
    ctx.beginPath(); ctx.moveTo(0, -s * 0.5); ctx.lineTo(-s * 1.4, -s * 1.2 - wf); ctx.lineTo(-s * 0.3, 0); ctx.fill();
    ctx.fillStyle = u.color;
  }
  ctx.beginPath(); ctx.ellipse(0, -s * 0.3, s * 0.8, s, 0, 0, 7); ctx.fill(); ctx.stroke();
  if (!u.flying) { ctx.fillRect(-s * 0.5 + step * 0.5, s * 0.4, s * 0.35, s * 0.6); ctx.fillRect(s * 0.15 - step * 0.5, s * 0.4, s * 0.35, s * 0.6); }
  ctx.beginPath(); ctx.arc(s * 0.2, -s * 1.4, s * 0.6, 0, 7); ctx.fill(); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = u.boss ? '#ffea00' : '#ff2a2a';
  ctx.fillRect(s * 0.35, -s * 1.55, Math.max(1.5, s * 0.15), Math.max(1.5, s * 0.15));
  if (u.boss) {
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath(); ctx.moveTo(-s * 0.3, -s * 1.85); ctx.lineTo(-s * 0.3, -s * 2.3); ctx.lineTo(0, -s * 2.05); ctx.lineTo(s * 0.25, -s * 2.4); ctx.lineTo(s * 0.5, -s * 2.05); ctx.lineTo(s * 0.7, -s * 2.3); ctx.lineTo(s * 0.7, -s * 1.85); ctx.fill();
  } else if (u.key === 'demon' || u.key === 'imp') {
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.moveTo(-s * 0.1, -s * 1.8); ctx.lineTo(-s * 0.3, -s * 2.4); ctx.lineTo(s * 0.1, -s * 1.9); ctx.fill();
  }
  ctx.save(); ctx.translate(s * 0.6, -s * 0.5); ctx.rotate(-0.8 + swing * 1.6);
  ctx.strokeStyle = u.kind === 'ranged' ? '#6b4a2a' : '#888'; ctx.lineWidth = Math.max(1.5, s * 0.18);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * 1.1, -s * 0.3); ctx.stroke();
  ctx.restore();
}

function drawDragon(u, s) {
  const wf = Math.sin(B.time * 6 + u.id) * s * 0.7;
  const col = u.team === 0 ? u.color : (u.tint || '#552');
  ctx.fillStyle = col; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(-s * 0.2, -s * 0.3); ctx.lineTo(-s * 1.2, -s * 1.6 - wf); ctx.lineTo(s * 0.6, -s * 0.4); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, 0, s * 1.1, s * 0.55, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(-s * 2, s * 0.3); ctx.lineTo(-s, s * 0.3); ctx.fill();
  ctx.beginPath(); ctx.moveTo(s * 0.8, -s * 0.2); ctx.lineTo(s * 1.4, -s * 0.8); ctx.lineTo(s * 1.6, -s * 0.5); ctx.lineTo(s * 1.0, s * 0.1); ctx.fill();
  ctx.beginPath(); ctx.ellipse(s * 1.6, -s * 0.7, s * 0.45, s * 0.3, 0.2, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffd34d'; ctx.fillRect(s * 1.7, -s * 0.85, 2, 2);
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath(); ctx.moveTo(0, -s * 0.3); ctx.lineTo(-s * 0.8, -s * 1.3 - wf); ctx.lineTo(s * 0.3, -s * 0.35); ctx.fill();
  ctx.fillStyle = teamColor(u); ctx.fillRect(-s * 0.2, -s * 0.9, s * 0.35, s * 0.4);
  ctx.fillStyle = '#f2c9a0'; ctx.beginPath(); ctx.arc(0, -s * 1.05, s * 0.18, 0, 7); ctx.fill();
}

function drawAngel(u, s) {
  const wf = Math.sin(B.time * 4 + u.id) * s * 0.3;
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.beginPath(); ctx.moveTo(-s * 0.2, -s * 0.8); ctx.lineTo(-s * 1.6, -s * 1.8 - wf); ctx.lineTo(-s * 1.2, -s * 0.2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-s * 0.1, -s * 0.8); ctx.lineTo(-s * 1.3, -s * 2.2 - wf); ctx.lineTo(-s * 0.8, -s * 0.5); ctx.fill();
  ctx.fillStyle = u.team === 0 ? '#fffdf0' : '#cfc6ff'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 1.0); ctx.lineTo(s * 0.5, -s * 1.0); ctx.lineTo(s * 0.7, s * 0.6); ctx.lineTo(-s * 0.7, s * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = teamColor(u); ctx.fillRect(-s * 0.5, -s * 0.4, s, s * 0.15);
  ctx.fillStyle = '#f2c9a0'; ctx.beginPath(); ctx.arc(0, -s * 1.35, s * 0.38, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffe680'; ctx.beginPath(); ctx.arc(-s * 0.05, -s * 1.5, s * 0.4, Math.PI, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, -s * 2.0, s * 0.45, s * 0.12, 0, 0, 7); ctx.stroke();
}

function drawProj(p) {
  ctx.save(); ctx.translate(SX(p.y), SY(p.x) - 10);
  if (p.type === 'arrow' || p.type === 'bolt_x') {
    // 전장 방향(vx, vy) → 화면 방향(vy, -vx)
    ctx.rotate(Math.atan2(-(p.vx || 1), p.vy || 0));
    ctx.strokeStyle = p.type === 'arrow' ? '#f3e6c4' : '#d8d8d8'; ctx.lineWidth = p.type === 'arrow' ? 1.3 : 2;
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(4, 0); ctx.stroke();
  } else {
    const col = p.type === 'fire' ? '#ff8c42' : p.type === 'holy' ? '#fff3b0' : '#8ab4ff';
    ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(0, 0, p.type === 'fire' ? 4 : 3, 0, 7); ctx.fill();
  }
  ctx.restore();
}

function drawFx(f) {
  const k = Math.min(1, f.t / f.life);
  const x = SX(f.y), y = SY(f.x) - (f.up || 0);
  if (f.type === 'ring') {
    ctx.strokeStyle = f.color; ctx.globalAlpha = 1 - k; ctx.lineWidth = 2;
    const r = f.r + (f.max - f.r) * k;
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.45, 0, 0, 7); ctx.stroke();
  } else if (f.type === 'boom') {
    ctx.fillStyle = f.color; ctx.globalAlpha = (1 - k) * 0.7;
    const r = f.r * (0.4 + k * 0.6);
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.6, 0, 0, 7); ctx.fill();
  } else if (f.type === 'poof') {
    ctx.fillStyle = f.color; ctx.globalAlpha = (1 - k) * 0.6;
    for (let i = 0; i < 5; i++) { const a = i * 1.25; ctx.beginPath(); ctx.arc(x + Math.cos(a) * k * 14, y - 8 + Math.sin(a) * k * 10, f.size * 0.45 * (1 - k), 0, 7); ctx.fill(); }
  } else if (f.type === 'spark') {
    ctx.fillStyle = '#b8ffb0'; ctx.globalAlpha = 1 - k;
    ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('✚', x, y - k * 14);
  } else if (f.type === 'slash') {
    ctx.strokeStyle = '#fff'; ctx.globalAlpha = 1 - k; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 13, f.face > 0 ? -1.2 : 1.9, f.face > 0 ? 1.2 : 4.3); ctx.stroke();
  } else if (f.type === 'meteor') {
    if (f.t < 0) return;
    const fall = Math.min(1, f.t / f.life);
    const mx = x + 90 * (1 - fall), my = y - 300 * (1 - fall);
    ctx.globalAlpha = 0.35; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x, y, 34 * fall, 14 * fall, 0, 0, 7); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = '#ff6b2b'; ctx.shadowColor = '#ffb347'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(mx, my, 12, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,160,60,.6)'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + 22, my - 70); ctx.stroke();
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
}

function drawHud() {
  const VW = LANE_W, VH = W;
  ctx.textAlign = 'center';
  if (B.mode === 'stage') {
    const alive = B.units.filter(u => u.team === 1).length;
    const prog = B.queueTotal ? 1 - (B.queue.length + alive) / B.queueTotal : 0;
    ctx.fillStyle = 'rgba(0,0,0,.5)'; roundRect(VW / 2 - 80, 66, 160, 9, 4.5); ctx.fill();
    ctx.fillStyle = isBossStage(B.stage) ? '#ff5c7a' : '#7fd6ff'; roundRect(VW / 2 - 79, 67, 158 * Math.max(0, prog), 7, 3.5); ctx.fill();
    if (B.timeLimit) {
      const left = Math.max(0, B.timeLimit - B.time);
      ctx.font = 'bold 14px sans-serif'; ctx.fillStyle = left < 10 ? '#ff5c5c' : '#fff';
      ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 3;
      ctx.strokeText(`👹 보스 ${left.toFixed(1)}s`, VW / 2, 94); ctx.fillText(`👹 보스 ${left.toFixed(1)}s`, VW / 2, 94);
    }
  } else {
    const left = Math.max(0, B.timeLimit - B.time);
    ctx.font = 'bold 13px sans-serif'; ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 3;
    const t1 = `${B.mode === 'war' ? '⚔️ 국가전' : '🏅 서열전'}  ${left.toFixed(0)}s`;
    ctx.strokeText(t1, VW / 2, 92); ctx.fillText(t1, VW / 2, 92);
    ctx.font = 'bold 10px sans-serif';
    ctx.strokeText(`VS ${B.special.foeName}`, VW / 2, 106); ctx.fillText(`VS ${B.special.foeName}`, VW / 2, 106);
  }
  // 부대 인원 / 버프
  const cnt = armyCount(), cap = armyCap();
  ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(0,0,0,.5)'; roundRect(46, VH - 92, 86, 17, 8.5); ctx.fill();
  ctx.fillStyle = cnt >= cap ? '#ffd34d' : '#fff';
  ctx.fillText(`⚔ 부대 ${cnt}/${cap}`, 53, VH - 79.5);
  ctx.textAlign = 'right';
  if (B.buffs.rally > 0) { ctx.fillStyle = '#ffd166'; ctx.fillText(`📯 돌격 ${B.buffs.rally.toFixed(1)}`, VW - 46, VH - 80); }
  if (B.buffs.sanctuary > 0) { ctx.fillStyle = '#fff3b0'; ctx.fillText(`🕊️ 성역 ${B.buffs.sanctuary.toFixed(1)}`, VW - 46, VH - 80); }
  if (B.stageBanner > 0) {
    ctx.globalAlpha = Math.min(1, B.stageBanner); ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, VH / 2 - 30, VW, 46);
    ctx.font = 'bold 20px sans-serif'; ctx.fillStyle = '#fff';
    const title = B.mode === 'stage' ? `${region(B.stage).name} ${B.stage}${isBossStage(B.stage) ? ' — BOSS' : ''}` : `${B.mode === 'war' ? '국가전' : '서열전'} 개전!`;
    ctx.fillText(title, VW / 2, VH / 2);
    ctx.globalAlpha = 1;
  }
  if (B.ended) {
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, VH / 2 - 30, VW, 46);
    ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = B.result === 'win' ? '#ffd34d' : '#ff6b6b';
    ctx.fillText(B.resultMsg, VW / 2, VH / 2 + 1);
  }
}

function roundRect(x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
