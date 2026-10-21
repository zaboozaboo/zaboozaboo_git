// 전장 렌더링 (캔버스)
'use strict';

let cv, ctx;
const SPRITE_SCALE = 1.35; // 모바일에서도 잘 보이도록 스프라이트만 확대

function initRender(canvas) {
  cv = canvas; ctx = cv.getContext('2d');
  const fit = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cv.clientWidth;
    cv.width = Math.round(w * dpr); cv.height = Math.round(w / 2 * dpr);
  };
  fit();
  window.addEventListener('resize', fit);
  makeDeco();
}

function render() {
  ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
  ctx.save();
  if (B.shake > 0) ctx.translate(rand(-1, 1) * B.shake * 10, rand(-1, 1) * B.shake * 10);
  const reg = B.mode === 'stage' ? region(B.stage || 1) : { sky: ['#4a5d8f', '#c9b6d9'], ground: ['#6b6b4a', '#4f4f36'] };
  drawBackground(reg);
  drawCastle(0);
  for (let i = 0; i < slotCount(); i++) drawBuilding(0, i, S.slots[i], B.spawnT[i]);
  if (!B.eCastle) drawLair();
  if (B.eCastle) {
    drawCastle(1);
    B.enemySpawners.forEach((s, i) => drawBuilding(1, i, s.id, s.t));
  }
  const sorted = B.units.slice().sort((a, b) => (a.y + (a.flying ? 30 : 0)) - (b.y + (b.flying ? 30 : 0)));
  for (const u of sorted) drawUnit(u);
  for (const p of B.projs) drawProj(p);
  for (const f of B.fx) drawFx(f);
  for (const t of B.texts) {
    ctx.globalAlpha = 1 - t.t;
    ctx.font = `bold ${t.size}px sans-serif`; ctx.textAlign = 'center';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.strokeText(t.txt, t.x, t.y - t.t * 26); ctx.fillStyle = t.color; ctx.fillText(t.txt, t.x, t.y - t.t * 26);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  drawHud();
}

function drawBackground(reg) {
  let g = ctx.createLinearGradient(0, 0, 0, GROUND_TOP);
  g.addColorStop(0, reg.sky[0]); g.addColorStop(1, reg.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, GROUND_TOP + 20);
  // 원경 산
  ctx.fillStyle = 'rgba(0,0,0,.12)';
  ctx.beginPath(); ctx.moveTo(-20, GROUND_TOP);
  for (let x = -20; x <= W + 20; x += 40) ctx.lineTo(x, GROUND_TOP - 30 - Math.abs(Math.sin(x * 0.013) * 50) - Math.sin(x * 0.05) * 8);
  ctx.lineTo(W + 20, GROUND_TOP); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.08)';
  ctx.beginPath(); ctx.moveTo(-20, GROUND_TOP);
  for (let x = -20; x <= W + 20; x += 30) ctx.lineTo(x, GROUND_TOP - 12 - Math.abs(Math.cos(x * 0.02) * 22));
  ctx.lineTo(W + 20, GROUND_TOP); ctx.fill();
  g = ctx.createLinearGradient(0, GROUND_TOP, 0, H);
  g.addColorStop(0, reg.ground[0]); g.addColorStop(1, reg.ground[1]);
  ctx.fillStyle = g; ctx.fillRect(-20, GROUND_TOP, W + 40, H - GROUND_TOP + 20);
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  for (const d of B.deco) { ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 7); ctx.fill(); }
  // 영토 경계
  ctx.fillStyle = 'rgba(255,255,255,.06)';
  ctx.fillRect(0, GROUND_TOP, 175, H - GROUND_TOP);
  if (B.eCastle) ctx.fillRect(W - 175, GROUND_TOP, 175, H - GROUND_TOP);
}

function drawCastle(team) {
  const left = team === 0;
  const x0 = left ? 0 : W - 70;
  const col = left ? NATIONS[S.nation].color : (B.special ? B.special.color : '#555');
  const c = left ? B.pCastle : B.eCastle;
  ctx.save();
  if (!left) { ctx.translate(W, 0); ctx.scale(-1, 1); }
  const bx = 0;
  ctx.fillStyle = '#7d7f87'; ctx.fillRect(bx, GROUND_TOP - 40, 62, 250);
  ctx.fillStyle = '#9a9ca5'; ctx.fillRect(bx + 4, GROUND_TOP - 36, 54, 242);
  for (let i = 0; i < 4; i++) { ctx.fillStyle = '#7d7f87'; ctx.fillRect(bx + 4 + i * 15, GROUND_TOP - 50, 10, 12); }
  ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 1;
  for (let y = GROUND_TOP - 30; y < H; y += 14) { ctx.beginPath(); ctx.moveTo(bx + 4, y); ctx.lineTo(bx + 58, y); ctx.stroke(); }
  // 탑
  ctx.fillStyle = '#6d6f77'; ctx.fillRect(bx + 18, GROUND_TOP - 95, 30, 60);
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(bx + 14, GROUND_TOP - 95); ctx.lineTo(bx + 33, GROUND_TOP - 130); ctx.lineTo(bx + 52, GROUND_TOP - 95); ctx.fill();
  ctx.fillStyle = '#3a2a1a'; ctx.fillRect(bx + 30, GROUND_TOP - 80, 7, 12);
  // 깃발
  ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx + 33, GROUND_TOP - 130); ctx.lineTo(bx + 33, GROUND_TOP - 152); ctx.stroke();
  const wave = Math.sin(B.time * 5) * 3;
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(bx + 33, GROUND_TOP - 152); ctx.lineTo(bx + 55, GROUND_TOP - 147 + wave); ctx.lineTo(bx + 33, GROUND_TOP - 140); ctx.fill();
  // 성문
  ctx.fillStyle = '#4a3220'; ctx.beginPath(); ctx.moveTo(bx + 62, H - 10); ctx.lineTo(bx + 62, 270); ctx.arc(bx + 52, 270, 10, 0, Math.PI, true); ctx.lineTo(bx + 42, H - 10); ctx.fill();
  ctx.restore();
  // 체력바
  if (c) {
    const r = Math.max(0, c.hp / c.max);
    const bxp = left ? 4 : W - 66;
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(bxp, GROUND_TOP - 70, 62, 8);
    ctx.fillStyle = r > 0.5 ? '#5ad16b' : r > 0.25 ? '#f2c14e' : '#ff5c5c'; ctx.fillRect(bxp + 1, GROUND_TOP - 69, 60 * r, 6);
  }
  void x0;
}

// 스테이지의 적 출현지: 지역별 색으로 빛나는 몬스터 소굴
const LAIR_GLOW = ['#7dff6a', '#b48cff', '#ffae42', '#8fe3ff', '#ff3b3b'];
function drawLair() {
  const ri = Math.floor(((B.stage || 1) - 1) / 10) % REGIONS.length;
  const glow = LAIR_GLOW[ri];
  const top = GROUND_TOP - 70, x0 = LAIR_X;
  // 바위 절벽
  ctx.fillStyle = '#3b3530';
  ctx.beginPath(); ctx.moveTo(W + 10, top - 20); ctx.lineTo(x0 + 26, top);
  ctx.lineTo(x0 + 6, GROUND_TOP + 10); ctx.lineTo(x0 - 4, GROUND_TOP + 90); ctx.lineTo(x0 + 4, H - 40); ctx.lineTo(x0 - 6, H + 10); ctx.lineTo(W + 10, H + 10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.07)';
  ctx.beginPath(); ctx.moveTo(x0 + 26, top); ctx.lineTo(x0 + 6, GROUND_TOP + 10); ctx.lineTo(x0 + 16, GROUND_TOP + 10); ctx.lineTo(x0 + 34, top + 6); ctx.fill();
  // 동굴 입구
  const my0 = LAIR_MOUTH[0] - 18, my1 = LAIR_MOUTH[1] + 14;
  const pulse = 0.55 + 0.25 * Math.sin(B.time * 3) + (B.lairPulse || 0) * 0.6;
  const g = ctx.createRadialGradient(W - 20, (my0 + my1) / 2, 6, W - 20, (my0 + my1) / 2, 120);
  g.addColorStop(0, glow); g.addColorStop(0.35, 'rgba(20,10,20,.95)'); g.addColorStop(1, '#0d0a0f');
  ctx.globalAlpha = Math.min(1, pulse);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(W + 10, my0); ctx.quadraticCurveTo(x0 + 4, my0 + 10, x0 + 14, (my0 + my1) / 2);
  ctx.quadraticCurveTo(x0 + 2, my1, W + 10, my1 + 6); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
  // 어둠 속 눈빛
  for (let i = 0; i < 3; i++) {
    const ey = my0 + 30 + i * 60 + Math.sin(B.time + i) * 6;
    if (Math.sin(B.time * 0.9 + i * 2) > 0.3) { ctx.fillStyle = glow; ctx.fillRect(W - 22 + i * 4, ey, 3, 2); ctx.fillRect(W - 15 + i * 4, ey, 3, 2); }
  }
  ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
  ctx.fillStyle = glow; ctx.fillText('몬스터 소굴', W - 32, top + 2);
}

function drawBuilding(team, i, heroId, prog) {
  const p = BUILDING_POS[i];
  const x = team === 0 ? p.x : W - p.x, y = p.y;
  if (!heroId) {
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.setLineDash([3, 3]);
    ctx.strokeRect(x - 12, y - 12, 24, 18); ctx.setLineDash([]);
    return;
  }
  const hero = HERO_BY_ID[heroId];
  const rc = RARITY[hero.rarity].color;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, y + 7, 17, 5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#d9c8a5'; ctx.fillRect(x - 13, y - 10, 26, 17);
  ctx.fillStyle = '#5b3d24'; ctx.fillRect(x - 3, y - 2, 6, 9);
  ctx.fillStyle = rc; ctx.beginPath(); ctx.moveTo(x - 17, y - 9); ctx.lineTo(x, y - 24); ctx.lineTo(x + 17, y - 9); ctx.fill();
  ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(hero.icon, x, y - 31);
  ctx.textBaseline = 'alphabetic';
  // 소환 게이지(정원이 차서 대기 중이면 금색) + 현재/정원
  const cap = team === 0 ? heroCap(heroId) : hero.cap;
  const alive = slotAlive(team, i, heroId);
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x - 13, y + 9, 26, 3);
  ctx.fillStyle = alive >= cap ? '#ffd34d' : '#9fe8ff'; ctx.fillRect(x - 13, y + 9, 26 * Math.min(1, prog || 0), 3);
  ctx.font = 'bold 9px sans-serif'; ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(0,0,0,.7)';
  ctx.fillStyle = alive >= cap ? '#ffd34d' : '#fff';
  ctx.strokeText(`${alive}/${cap}`, x, y + 22); ctx.fillText(`${alive}/${cap}`, x, y + 22);
}

function teamColor(u) {
  if (u.team === 0) return NATIONS[S.nation].color;
  return u.tint || '#ff4d4d';
}

function drawUnit(u) {
  const fy = u.flying ? 18 + Math.sin(B.time * 4 + u.id) * 3 : 0;
  const bob = u.flying ? 0 : Math.abs(Math.sin(u.walk)) * 1.5;
  const x = u.x, y = u.y - fy - bob;
  const s = u.size;
  const face = u.face || (u.team === 0 ? 1 : -1);
  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath(); ctx.ellipse(u.x, u.y + 2, s * 0.9, s * 0.3, 0, 0, 7); ctx.fill();

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face < 0 ? -SPRITE_SCALE : SPRITE_SCALE, SPRITE_SCALE);
  if (u.flash > 0) ctx.filter = 'brightness(2.2)';

  if (u.def.dragon) drawDragon(u, s);
  else if (u.def.angel) drawAngel(u, s);
  else if (u.monster) drawMonster(u, s);
  else drawSoldier(u, s);

  ctx.restore();
  ctx.filter = 'none';

  // 팀 표시 & 체력바
  if (u.hp < u.maxHp || u.isLord || u.boss) {
    const w = Math.max(14, s * 2.4), r = Math.max(0, u.hp / u.maxHp);
    const by = y - s * 2.2 * SPRITE_SCALE - 6;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - w / 2, by, w, 3);
    ctx.fillStyle = u.team === 0 ? '#5ad16b' : '#ff5c5c'; ctx.fillRect(x - w / 2, by, w * r, 3);
  }
  if (u.isLord) {
    ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 2.5;
    ctx.strokeText(u.name, x, y - s * 2.2 * SPRITE_SCALE - 10); ctx.fillText(u.name, x, y - s * 2.2 * SPRITE_SCALE - 10);
  }
}

function drawSoldier(u, s) {
  const tc = teamColor(u);
  const swing = u.anim > 0 ? Math.sin((0.25 - u.anim) / 0.25 * Math.PI) : 0;
  const step = Math.sin(u.walk * 2) * 2;
  if (u.def.mount) {
    // 말
    ctx.fillStyle = '#6b4226';
    ctx.fillRect(-s * 1.1, -s * 0.2, s * 2.2, s * 0.9);
    ctx.fillRect(s * 0.9, -s * 0.9, s * 0.5, s * 1.0);
    ctx.fillStyle = '#4a2c17';
    ctx.fillRect(-s * 0.9 + step, s * 0.6, 2, s * 0.6); ctx.fillRect(s * 0.7 - step, s * 0.6, 2, s * 0.6);
    ctx.translate(0, -s * 0.8);
  }
  if (u.flying && !u.isLord) {
    // 그리핀
    ctx.fillStyle = '#c99a4b';
    ctx.beginPath(); ctx.ellipse(0, s * 0.3, s * 1.2, s * 0.6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#f2e1b8';
    const wf = Math.sin(B.time * 12 + u.id) * s * 0.8;
    ctx.beginPath(); ctx.moveTo(-s * 0.3, 0); ctx.lineTo(-s * 1.4, -s * 0.8 - wf); ctx.lineTo(s * 0.4, 0); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s * 1.2, -s * 0.1, s * 0.4, 0, 7); ctx.fill();
    ctx.fillStyle = '#f2a33a'; ctx.beginPath(); ctx.moveTo(s * 1.5, -s * 0.1); ctx.lineTo(s * 1.9, s * 0.05); ctx.lineTo(s * 1.5, s * 0.15); ctx.fill();
    ctx.translate(0, -s * 0.6);
  }
  // 다리
  if (!u.def.mount && !(u.flying && !u.isLord)) {
    ctx.fillStyle = '#3a3a44';
    ctx.fillRect(-s * 0.35 + step * 0.5, s * 0.3, s * 0.3, s * 0.8);
    ctx.fillRect(s * 0.1 - step * 0.5, s * 0.3, s * 0.3, s * 0.8);
  }
  // 망토 (영주)
  if (u.isLord) {
    ctx.fillStyle = u.cls === 'knight' ? '#b0283a' : u.cls === 'mage' ? '#3b3fb5' : '#e8e2d0';
    ctx.beginPath(); ctx.moveTo(-s * 0.3, -s * 1.2); ctx.lineTo(-s * 1.1 - Math.abs(step) * 0.4, s * 0.9); ctx.lineTo(s * 0.2, s * 0.7); ctx.fill();
  }
  // 몸통
  ctx.fillStyle = u.isLord ? (u.cls === 'knight' ? '#c9ced6' : u.cls === 'mage' ? '#5a4fcf' : '#fff8e7') : u.color;
  roundRect(-s * 0.55, -s * 1.1, s * 1.1, s * 1.5, s * 0.25); ctx.fill();
  // 팀 띠
  ctx.fillStyle = tc; ctx.fillRect(-s * 0.55, -s * 0.35, s * 1.1, s * 0.3);
  // 머리
  ctx.fillStyle = '#f2c9a0';
  ctx.beginPath(); ctx.arc(0, -s * 1.55, s * 0.5, 0, 7); ctx.fill();
  if (u.isLord && u.gender === 'f') {
    ctx.fillStyle = u.team === 0 ? '#e0a040' : '#5a3a2a';
    ctx.beginPath(); ctx.arc(-s * 0.1, -s * 1.7, s * 0.55, Math.PI * 0.9, Math.PI * 2.1); ctx.fill();
    ctx.fillRect(-s * 0.65, -s * 1.7, s * 0.35, s * 1.0);
  } else if (u.isLord) {
    ctx.fillStyle = '#5a3a2a';
    ctx.beginPath(); ctx.arc(0, -s * 1.7, s * 0.52, Math.PI, Math.PI * 2); ctx.fill();
  } else if (u.def.weapon === 'staff') {
    ctx.fillStyle = u.color; ctx.beginPath(); ctx.moveTo(-s * 0.6, -s * 1.6); ctx.lineTo(0, -s * 2.6); ctx.lineTo(s * 0.6, -s * 1.6); ctx.fill();
  } else {
    ctx.fillStyle = '#8d99ae'; ctx.beginPath(); ctx.arc(0, -s * 1.65, s * 0.52, Math.PI, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#222'; ctx.fillRect(s * 0.15, -s * 1.6, 1.5, 1.5);
  // 왕관
  if (u.isLord && u.promo >= 1) {
    ctx.fillStyle = u.promo >= 3 ? '#ff4d6d' : '#ffd34d';
    ctx.beginPath(); ctx.moveTo(-s * 0.45, -s * 2.0); ctx.lineTo(-s * 0.45, -s * 2.4); ctx.lineTo(-s * 0.2, -s * 2.15); ctx.lineTo(0, -s * 2.5); ctx.lineTo(s * 0.2, -s * 2.15); ctx.lineTo(s * 0.45, -s * 2.4); ctx.lineTo(s * 0.45, -s * 2.0); ctx.fill();
  }
  // 무기
  const w = u.isLord ? (u.cls === 'knight' ? 'sword' : 'staff') : u.def.weapon;
  ctx.save();
  ctx.translate(s * 0.5, -s * 0.7);
  ctx.rotate(-0.6 + swing * 1.4);
  ctx.lineCap = 'round';
  if (w === 'sword' || w === 'axe') {
    ctx.strokeStyle = '#e5e5e5'; ctx.lineWidth = Math.max(1.5, s * 0.2);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * 1.3, -s * 0.2); ctx.stroke();
    if (w === 'axe') { ctx.fillStyle = '#bbb'; ctx.fillRect(s * 0.9, -s * 0.6, s * 0.4, s * 0.7); }
    if (u.def.heavy || u.isLord) { ctx.fillStyle = '#ffd34d'; ctx.fillRect(-1, -2, 3, 4); }
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
    const orb = u.isLord ? (u.cls === 'mage' ? '#8ab4ff' : '#fff3b0') : (u.proj === 'fire' ? '#ff8c42' : u.proj === 'holy' ? '#fff3b0' : '#8ab4ff');
    ctx.fillStyle = orb; ctx.shadowColor = orb; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(0, -s * 1.5, s * 0.3 + swing, 0, 7); ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.restore();
  // 방패 (기사 영주/성기사)
  if ((u.isLord && u.cls === 'knight') || u.def.heavy) {
    ctx.fillStyle = tc; ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-s * 0.8, -s * 1.0); ctx.lineTo(-s * 0.1, -s * 1.0); ctx.lineTo(-s * 0.1, -s * 0.2); ctx.lineTo(-s * 0.45, s * 0.2); ctx.lineTo(-s * 0.8, -s * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}

function drawMonster(u, s) {
  const step = Math.sin(u.walk * 2) * 2;
  const swing = u.anim > 0 ? Math.sin((0.25 - u.anim) / 0.25 * Math.PI) : 0;
  ctx.fillStyle = u.color;
  if (u.def.beast) {
    ctx.beginPath(); ctx.ellipse(0, 0, s * 1.2, s * 0.6, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 1.1, -s * 0.4, s * 0.5, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(s * 0.9, -s * 0.8); ctx.lineTo(s * 1.0, -s * 1.2); ctx.lineTo(s * 1.2, -s * 0.8); ctx.fill();
    ctx.fillRect(-s * 0.9 + step, s * 0.3, 2, s * 0.6); ctx.fillRect(s * 0.6 - step, s * 0.3, 2, s * 0.6);
    ctx.fillStyle = '#ff3030'; ctx.fillRect(s * 1.2, -s * 0.5, 2, 2);
    return;
  }
  if (u.flying) {
    const wf = Math.sin(B.time * 10 + u.id) * s * 0.6;
    ctx.globalAlpha = u.key === 'ghost' ? 0.7 : 1;
    ctx.fillStyle = u.key === 'imp' ? '#6a1010' : u.color;
    ctx.beginPath(); ctx.moveTo(0, -s * 0.5); ctx.lineTo(-s * 1.4, -s * 1.2 - wf); ctx.lineTo(-s * 0.3, 0); ctx.fill();
    ctx.fillStyle = u.color;
  }
  // 몸
  ctx.beginPath(); ctx.ellipse(0, -s * 0.3, s * 0.8, s, 0, 0, 7); ctx.fill();
  if (!u.flying) { ctx.fillRect(-s * 0.5 + step * 0.5, s * 0.4, s * 0.35, s * 0.6); ctx.fillRect(s * 0.15 - step * 0.5, s * 0.4, s * 0.35, s * 0.6); }
  // 머리
  ctx.beginPath(); ctx.arc(s * 0.2, -s * 1.4, s * 0.6, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = u.boss ? '#ffea00' : '#ff2a2a';
  ctx.fillRect(s * 0.35, -s * 1.55, Math.max(1.5, s * 0.15), Math.max(1.5, s * 0.15));
  // 뿔/왕관
  if (u.boss) {
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath(); ctx.moveTo(-s * 0.3, -s * 1.85); ctx.lineTo(-s * 0.3, -s * 2.3); ctx.lineTo(0, -s * 2.05); ctx.lineTo(s * 0.25, -s * 2.4); ctx.lineTo(s * 0.5, -s * 2.05); ctx.lineTo(s * 0.7, -s * 2.3); ctx.lineTo(s * 0.7, -s * 1.85); ctx.fill();
  } else if (u.key === 'demon' || u.key === 'imp') {
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.moveTo(-s * 0.1, -s * 1.8); ctx.lineTo(-s * 0.3, -s * 2.4); ctx.lineTo(s * 0.1, -s * 1.9); ctx.fill();
  }
  // 무기
  ctx.save(); ctx.translate(s * 0.6, -s * 0.5); ctx.rotate(-0.8 + swing * 1.6);
  ctx.strokeStyle = u.kind === 'ranged' ? '#6b4a2a' : '#888'; ctx.lineWidth = Math.max(1.5, s * 0.18);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * 1.1, -s * 0.3); ctx.stroke();
  ctx.restore();
}

function drawDragon(u, s) {
  const wf = Math.sin(B.time * 6 + u.id) * s * 0.7;
  const col = u.team === 0 ? u.color : (u.tint || '#552');
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(-s * 0.2, -s * 0.3); ctx.lineTo(-s * 1.2, -s * 1.6 - wf); ctx.lineTo(s * 0.6, -s * 0.4); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, 0, s * 1.1, s * 0.55, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(-s * 2, s * 0.3); ctx.lineTo(-s, s * 0.3); ctx.fill();
  ctx.beginPath(); ctx.moveTo(s * 0.8, -s * 0.2); ctx.lineTo(s * 1.4, -s * 0.8); ctx.lineTo(s * 1.6, -s * 0.5); ctx.lineTo(s * 1.0, s * 0.1); ctx.fill();
  ctx.beginPath(); ctx.ellipse(s * 1.6, -s * 0.7, s * 0.45, s * 0.3, 0.2, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffd34d'; ctx.fillRect(s * 1.7, -s * 0.85, 2, 2);
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath(); ctx.moveTo(0, -s * 0.3); ctx.lineTo(-s * 0.8, -s * 1.3 - wf); ctx.lineTo(s * 0.3, -s * 0.35); ctx.fill();
  // 기수
  ctx.fillStyle = teamColor(u); ctx.fillRect(-s * 0.2, -s * 0.9, s * 0.35, s * 0.4);
  ctx.fillStyle = '#f2c9a0'; ctx.beginPath(); ctx.arc(0, -s * 1.05, s * 0.18, 0, 7); ctx.fill();
}

function drawAngel(u, s) {
  const wf = Math.sin(B.time * 4 + u.id) * s * 0.3;
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.beginPath(); ctx.moveTo(-s * 0.2, -s * 0.8); ctx.lineTo(-s * 1.6, -s * 1.8 - wf); ctx.lineTo(-s * 1.2, -s * 0.2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-s * 0.1, -s * 0.8); ctx.lineTo(-s * 1.3, -s * 2.2 - wf); ctx.lineTo(-s * 0.8, -s * 0.5); ctx.fill();
  ctx.fillStyle = u.team === 0 ? '#fffdf0' : '#cfc6ff';
  ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 1.0); ctx.lineTo(s * 0.5, -s * 1.0); ctx.lineTo(s * 0.7, s * 0.6); ctx.lineTo(-s * 0.7, s * 0.6); ctx.fill();
  ctx.fillStyle = teamColor(u); ctx.fillRect(-s * 0.5, -s * 0.4, s, s * 0.15);
  ctx.fillStyle = '#f2c9a0'; ctx.beginPath(); ctx.arc(0, -s * 1.35, s * 0.38, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffe680'; ctx.beginPath(); ctx.arc(-s * 0.05, -s * 1.5, s * 0.4, Math.PI, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, -s * 2.0, s * 0.45, s * 0.12, 0, 0, 7); ctx.stroke();
}

function drawProj(p) {
  ctx.save(); ctx.translate(p.x, p.y);
  if (p.type === 'arrow' || p.type === 'bolt_x') {
    ctx.rotate(p.ang || 0);
    ctx.strokeStyle = p.type === 'arrow' ? '#e8d7b0' : '#cfcfcf'; ctx.lineWidth = p.type === 'arrow' ? 1.2 : 2;
    ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(4, 0); ctx.stroke();
  } else {
    const col = p.type === 'fire' ? '#ff8c42' : p.type === 'holy' ? '#fff3b0' : '#8ab4ff';
    ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(0, 0, p.type === 'fire' ? 4 : 3, 0, 7); ctx.fill();
  }
  ctx.restore();
}

function drawFx(f) {
  const k = Math.min(1, f.t / f.life);
  if (f.type === 'ring') {
    ctx.strokeStyle = f.color; ctx.globalAlpha = 1 - k; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r + (f.max - f.r) * k, (f.r + (f.max - f.r) * k) * 0.4, 0, 0, 7); ctx.stroke();
  } else if (f.type === 'boom') {
    ctx.fillStyle = f.color; ctx.globalAlpha = (1 - k) * 0.7;
    ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * (0.4 + k * 0.6), f.r * (0.4 + k * 0.6) * 0.55, 0, 0, 7); ctx.fill();
  } else if (f.type === 'poof') {
    ctx.fillStyle = f.color; ctx.globalAlpha = (1 - k) * 0.6;
    for (let i = 0; i < 5; i++) { const a = i * 1.25; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * k * 14, f.y - 6 + Math.sin(a) * k * 10, f.size * 0.4 * (1 - k), 0, 7); ctx.fill(); }
  } else if (f.type === 'spark') {
    ctx.fillStyle = '#b8ffb0'; ctx.globalAlpha = 1 - k;
    ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('✚', f.x, f.y - k * 14);
  } else if (f.type === 'slash') {
    ctx.strokeStyle = '#fff'; ctx.globalAlpha = 1 - k; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(f.x, f.y, 12, f.face > 0 ? -1.2 : 1.9, f.face > 0 ? 1.2 : 4.3); ctx.stroke();
  } else if (f.type === 'meteor') {
    if (f.t < 0) return;
    const fall = Math.min(1, f.t / f.life);
    const mx = f.x + 120 * (1 - fall), my = f.y - 260 * (1 - fall);
    ctx.globalAlpha = 0.35; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(f.x, f.y, 30 * fall, 10 * fall, 0, 0, 7); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = '#ff6b2b'; ctx.shadowColor = '#ffb347'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(mx, my, 11, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,160,60,.6)'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + 30, my - 60); ctx.stroke();
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
}

function drawHud() {
  ctx.textAlign = 'center';
  if (B.mode === 'stage') {
    // 웨이브 진행
    const alive = B.units.filter(u => u.team === 1).length;
    const prog = B.queueTotal ? 1 - (B.queue.length + alive) / B.queueTotal : 0;
    ctx.fillStyle = 'rgba(0,0,0,.45)'; roundRect(W / 2 - 110, 8, 220, 12, 6); ctx.fill();
    ctx.fillStyle = isBossStage(B.stage) ? '#ff5c7a' : '#7fd6ff'; roundRect(W / 2 - 108, 10, 216 * Math.max(0, prog), 8, 4); ctx.fill();
    if (B.timeLimit) {
      const left = Math.max(0, B.timeLimit - B.time);
      ctx.font = 'bold 15px sans-serif'; ctx.fillStyle = left < 10 ? '#ff5c5c' : '#fff';
      ctx.fillText(`👹 보스 ${left.toFixed(1)}s`, W / 2, 40);
    }
  } else {
    const left = Math.max(0, B.timeLimit - B.time);
    ctx.font = 'bold 15px sans-serif'; ctx.fillStyle = '#fff';
    ctx.fillText(`${B.mode === 'war' ? '⚔️ 국가전' : '🏅 서열전'}  ${left.toFixed(0)}s`, W / 2, 24);
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left'; ctx.fillText(S.lord.name, 8, 24);
    ctx.textAlign = 'right'; ctx.fillText(B.special.foeName, W - 8, 24);
  }
  // 부대 인원
  const cnt = armyCount(), cap = armyCap();
  ctx.textAlign = 'left'; ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = 'rgba(0,0,0,.45)'; roundRect(76, H - 24, 92, 18, 9); ctx.fill();
  ctx.fillStyle = cnt >= cap ? '#ffd34d' : '#fff';
  ctx.fillText(`⚔ 부대 ${cnt}/${cap}`, 84, H - 11);
  if (B.buffs.rally > 0) { ctx.textAlign = 'left'; ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#ffd166'; ctx.fillText(`📯 돌격 ${B.buffs.rally.toFixed(1)}`, 80, GROUND_TOP - 8); }
  if (B.buffs.sanctuary > 0) { ctx.textAlign = 'left'; ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#fff3b0'; ctx.fillText(`🕊️ 성역 ${B.buffs.sanctuary.toFixed(1)}`, 80, GROUND_TOP - 8); }
  if (B.stageBanner > 0) {
    const a = Math.min(1, B.stageBanner);
    ctx.globalAlpha = a; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, H / 2 - 34, W, 52);
    ctx.font = 'bold 26px sans-serif'; ctx.fillStyle = '#fff';
    let title;
    if (B.mode === 'stage') title = `${region(B.stage).name} ${B.stage}${isBossStage(B.stage) ? ' — BOSS' : ''}`;
    else title = `${B.mode === 'war' ? '국가전' : '서열전'} VS ${B.special.foeName}`;
    ctx.fillText(title, W / 2, H / 2);
    ctx.globalAlpha = 1;
  }
  if (B.ended) {
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(0, H / 2 - 34, W, 52);
    ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = B.result === 'win' ? '#ffd34d' : '#ff6b6b';
    ctx.fillText(B.resultMsg, W / 2, H / 2 + 2);
  }
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
