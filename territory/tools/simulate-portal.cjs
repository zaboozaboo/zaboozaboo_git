#!/usr/bin/env node
// Portal Master 진행 속도 시뮬레이터.
// 실제 js/ 런타임(전투·생산·소환·포탈 강화·던전·펫·연구·오프라인)을 Node vm에서 그대로 실행한다.
// 간이 DPS 계산이 아니며, 플레이어 저장(localStorage)을 읽거나 쓰지 않는다.
//
// 사용법 (저장소 어디서든):
//   node territory/tools/simulate-portal.cjs active [분=180] [시드=1] [옵션...]
//   node territory/tools/simulate-portal.cjs daily  [일=7] [하루 세션 수=3] [세션 분=20] [시드=1] [옵션...]
// 옵션: --no-dungeons  던전 미사용      --no-pets  펫 미사용      --no-research  연구 미사용
//       --json         요약을 JSON 한 줄로 출력
//       --exp-active-supply=개수:분   [가정 실험] 게임에 없는 규칙. 매일 접속 중 첫 '분' 동안 소환석 '개수'를
//                      고르게 추가 지급한다. "접속 중 전투로 소환석을 번다"를 넣었을 때 진행 속도가
//                      얼마나 달라지는지 미리 재기 위한 것이며, 결과를 현재 게임의 수치로 인용하면 안 된다.
//       --exp-fresh-start      [가정 실험] 게임에 없는 규칙. 승리해도 살아남은 병력을 다음 전선으로 넘기지 않는다
//                      (매 전투를 빈 군대에서 시작). 승리 때 생존 병력 수를 집계해 출력한다.
//       --exp-active-timer=시간:분     [가정 실험] 게임에 없는 규칙. 매일 접속 중 첫 '분' 동안 진행 중인 포탈 강화의
//                      남은 대기를 합계 '시간'만큼 고르게 줄인다. "접속 중 전투가 포탈 강화를 앞당긴다"의 효과 측정용.
//
// 플레이 정책(사람이 따라 할 수 있는 단순 규칙, 1초에 한 번 판단):
//   1) 대기 유닛이 있으면 Portal.power가 더 높을 때만 배치, 아니면 판매
//   2) 소환석이 있으면 1회 소환 (게임의 0.7초 소환 대기 적용)
//   3) 골드가 되면 포탈 강화 납부, 무료 즉시 완료 구간은 즉시 완료
//   4) 입장권이 있으면 열린 던전 입장(소환→펫→강화 순), 펫은 뽑아서 해독·장착, 연구는 가능한 것부터
// "할 일(분)"은 그 구간에서 확인할 유닛·쓸 소환석·진행 중인 던전이 있었던 시간이다(1초 단위 표본).
//   정책이 소환과 배치/판매를 1초씩 번갈아 하므로 수동 조작 속도에 가깝다. 자동 소환을 쓰면 더 짧다.
// 이 정책은 최적 플레이가 아니다. 결과는 "이 정책을 쓴 한 명"의 진행이며 실제 이용자 분포가 아니다.
'use strict';
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');

const args = process.argv.slice(2), flags = new Set(args.filter(a => a.startsWith('--'))), pos = args.filter(a => !a.startsWith('--'));
const mode = pos[0] || 'active';
if (!['active', 'daily'].includes(mode)) { console.error('mode must be "active" or "daily"'); process.exit(1); }
const num = (v, d) => (Number.isFinite(+v) && v !== undefined ? +v : d);
const cfg = mode === 'active'
  ? { minutes: num(pos[1], 180), seed: num(pos[2], 1) }
  : { days: num(pos[1], 7), sessions: num(pos[2], 3), sessionMinutes: num(pos[3], 20), seed: num(pos[4], 1) };
const use = { dungeons: !flags.has('--no-dungeons'), pets: !flags.has('--no-pets'), research: !flags.has('--no-research') };
const expArg = args.find(a => a.startsWith('--exp-active-supply='));
const exp = expArg ? (([n, m]) => ({ perDay: +n, minutes: +m }))(expArg.split('=')[1].split(':')) : null;
if (exp && !(exp.perDay > 0 && exp.minutes > 0)) { console.error('--exp-active-supply=개수:분'); process.exit(1); }
const timerArg = args.find(a => a.startsWith('--exp-active-timer='));
const expTimer = timerArg ? (([h, m]) => ({ hours: +h, minutes: +m }))(timerArg.split('=')[1].split(':')) : null;
if (expTimer && !(expTimer.hours > 0 && expTimer.minutes > 0)) { console.error('--exp-active-timer=시간:분'); process.exit(1); }

const DAY = 86400000;
let clock = 20000 * DAY + 9 * 3600000, seed = cfg.seed >>> 0;
const math = Object.create(Math);
math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const fails = [];
const ctx = vm.createContext({
  console, Math: math, window: {}, Image: class {}, localStorage: { setItem() {} },
  Date: class extends Date { static now() { return clock; } },
  UI: { toast(m) { if (/실패/.test(String(m))) fails.push(1); } },
});
const FILES = ['data', 'state', 'kingdom', 'dice', 'formation', 'battle', 'forge-balance', 'portal-master-data', 'portal', 'portal-balance',
  'portal-features', 'portal-collection-data', 'portal-collections', 'portal-pet-data', 'portal-pet-growth', 'portal-offline', 'camera', 'portal-pet-field'];
for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
vm.runInContext(`
const clamp01=n=>Math.max(0,Math.min(1,n));
newGame({name:'sim',gender:'m',cls:'knight',nation:'aurum'});Portal.ensure();saveGame=()=>{};startStage(1);
var SIM_FRESH=__FRESH__,SIM_WINS=0,SIM_SURVIVORS=0,SIM_ALLY_PEAK=0;
{const finish=Portal.finish;Portal.finish=function(){const campaign=!this.dungeonRun,win=campaign&&B.result==='win',n=win?B.units.filter(u=>u.team===0&&u.hp>0).length:0;finish.call(this);if(win){SIM_WINS++;SIM_SURVIVORS+=n;if(SIM_FRESH)B.units=B.units.filter(u=>u.team!==0);}};}
var SIM={
 state(){const p=S.portal,c=p.collections||{};return {stage:p.stage,maxStage:p.maxStage,supply:Math.floor(p.supply),gold:Math.floor(S.gold),forge:p.forgeLevel,rolls:p.forgeRolls,commander:p.commanderLevel,
  board:p.board.map(u=>u?PM_BY_ID[u.id].era+':'+u.level:'-').join(' '),pets:(c.equipped?.pets||[]).filter(Boolean).length,potions:p.materials?.TechPotions||0,eggs:p.materials?.Eggshells||0,
  dungeons:Object.fromEntries(Object.entries(p.dungeons||{}).map(([k,d])=>[k,d.level])),tech:Object.values(p.tech||{}).reduce((a,b)=>a+b,0),inDungeon:!!Portal.dungeonRun};},
 act(use){
  const p=S.portal;
  if(p.pending){const role=Portal.def(p.pending).role,cur=p.board[role];if(!cur||Portal.power(p.pending)>Portal.power(cur))Portal.place(role);else Portal.sell();Portal.comparing=false;}
  else if(Portal.canRoll())Portal.rollPaid();
  if(Portal.payUpgrade())0;
  if(p.upgrade&&p.upgrade.level<=4)Portal.skipUpgrade();
  if(use.dungeons&&!Portal.dungeonRun&&!B.result)for(const kind of ['Hammer','Pet','Potion']){if(kind==='Pet'&&!use.pets)continue;if(kind==='Potion'&&!use.research)continue;if(Portal.enterDungeon(kind))break;}
  if(use.pets&&p.maxStage>=31){const c=CollectionUI.ensure();
   while(CollectionUI.draw('pets'));
   for(let i=c.scrolls.length-1;i>=0;i--)CollectionUI.claimScroll(i);
   for(let r=5;r>=0&&c.scrolls.length<3;r--)while(c.scrolls.length<3&&CollectionUI.startScroll(r));
   const owned=Object.keys(c.pets).filter(id=>c.pets[id]>0).map(id=>CollectionUI.def('pets',id)).sort((a,b)=>b.r-a.r),picked=[];
   for(const d of owned){if(picked.length<2&&!picked.some(x=>x.variant===d.variant))picked.push(d);}
   picked.forEach((d,slot)=>{if(c.equipped.pets[slot]!==d.id)CollectionUI.equip('pets',d.id,slot);});
  }
  if(use.research&&p.maxStage>=71){Portal.claimResearch();if(!p.techPending)for(const n of Portal.techNodes()){if(Portal.upgradeResearch(n.BranchKey+':'+n.NodeId))break;}}
 },
 // 지금 플레이어가 직접 할 일이 있는가: 확인할 유닛, 쓸 소환석, 진행 중인 던전.
 busy(){const p=S.portal;return !!(p.pending||(p.supply>=Portal.rollPrice()&&Portal.stackCount()<Portal.stackCapacity)||Portal.dungeonRun);},
 offline(seconds){const r=PortalOffline.calculate(seconds);if(r.elapsed>=Portal.config('MinOfflineSeconds')){S.gold+=r.gold;S.portal.supply+=r.supply;}Portal.completeUpgrade();return r;},
 step(){updateBattle(.05);}
};
`.replace('__FRESH__', flags.has('--exp-fresh-start') ? 'true' : 'false'), ctx);

const sim = ctx.SIM, STEP = 0.05, useJson = JSON.stringify(use);
let active = 0;                       // 실제로 화면을 켜 둔 누적 초
const reached = {}, stalls = [], rows = [];
let best = 1, bestAt = 0;
let expDay = -1, expSeconds = 0, expCarry = 0;
let timerDay = -1, timerSeconds = 0;
function tickActive(seconds, label) {
  const steps = Math.round(seconds / STEP);
  let busy = 0;                       // 이 구간에서 직접 할 일이 있었던 초
  for (let i = 0; i < steps; i++) {
    clock += STEP * 1000; sim.step(); active += STEP;
    if (expTimer && i % 20 === 0) {
      const day = Math.floor(clock / DAY); if (day !== timerDay) { timerDay = day; timerSeconds = 0; }
      if (timerSeconds < expTimer.minutes * 60) { timerSeconds++; vm.runInContext('if(S.portal.upgrade)S.portal.upgrade.endsAt-=' + Math.round(expTimer.hours * 3600000 / (expTimer.minutes * 60)), ctx); }
    }
    if (exp && i % 20 === 0) {
      const day = Math.floor(clock / DAY); if (day !== expDay) { expDay = day; expSeconds = 0; }
      if (expSeconds < exp.minutes * 60) { expSeconds++; expCarry += exp.perDay / (exp.minutes * 60); const whole = Math.floor(expCarry); if (whole) { expCarry -= whole; vm.runInContext('S.portal.supply+=' + whole, ctx); } }
    }
    if (i % 20 === 0) { if (vm.runInContext('SIM.busy()', ctx)) busy++; vm.runInContext('SIM.act(' + useJson + ')', ctx); }
    if (i % 200 === 0) {
      const max = vm.runInContext('S.portal.maxStage', ctx);
      if (max > best) {
        if (active - bestAt >= 600) stalls.push({ stage: best, activeMinutes: +((active - bestAt) / 60).toFixed(1) });
        for (let s = best + 1; s <= max; s++) if (s % 10 === 0) reached[s] = +(active / 60).toFixed(1);
        best = max; bestAt = active;
      }
    }
  }
  rows.push({ label, activeMin: Math.round(active / 60), busyMin: +(busy / 60).toFixed(1), ...sim.state(), fails: fails.length });
}

if (mode === 'active') {
  const chunk = cfg.minutes <= 60 ? 5 : cfg.minutes <= 240 ? 15 : 60;
  for (let m = 0; m < cfg.minutes; m += chunk) tickActive(Math.min(chunk, cfg.minutes - m) * 60, (Math.min(cfg.minutes, m + chunk)) + '분');
} else {
  const gap = (DAY / 1000 - cfg.sessions * cfg.sessionMinutes * 60) / cfg.sessions;
  for (let d = 1; d <= cfg.days; d++) for (let s = 1; s <= cfg.sessions; s++) {
    if (d > 1 || s > 1) { clock += gap * 1000; sim.offline(gap); }
    tickActive(cfg.sessionMinutes * 60, d + '일차 ' + s + '회');
  }
}
if (active - bestAt >= 600) stalls.push({ stage: best, activeMinutes: +((active - bestAt) / 60).toFixed(1), ongoing: true });

const summary = { mode, ...cfg, use, experiment: exp, experimentTimer: expTimer, activeMinutes: Math.round(active / 60), final: sim.state(), fails: fails.length, minutesToStage: reached, stallsOver10Min: stalls,
  busyMinutes: rows.map(r => r.busyMin) };
if (flags.has('--json')) { console.log(JSON.stringify(summary)); process.exit(0); }
console.log('Portal Master 진행 시뮬레이션', JSON.stringify({ mode, ...cfg, use }));
if (exp) console.log('[가정 실험] 게임에 없는 규칙 적용: 매일 접속 첫 ' + exp.minutes + '분 동안 소환석 ' + exp.perDay + '개 추가');
if (expTimer) console.log('[가정 실험] 게임에 없는 규칙 적용: 매일 접속 첫 ' + expTimer.minutes + '분 동안 포탈 강화 대기 ' + expTimer.hours + '시간 단축');
console.log(['구간', '누적(분)', '할 일(분)', '전선', '최고', '소환석', '골드', '포탈Lv', '소환수', '대장Lv', '편성(시대:레벨)', '펫', '연구', '패배'].join('\t'));
for (const r of rows) console.log([r.label, r.activeMin, r.busyMin, r.stage, r.maxStage, r.supply, r.gold, r.forge, r.rolls, r.commander, r.board, r.pets, r.tech, r.fails].join('\t'));
console.log('도달 시간(켜 둔 분):', JSON.stringify(reached));
console.log('10분 이상 정체:', stalls.length ? JSON.stringify(stalls) : '없음');
console.log('최종:', JSON.stringify(summary.final));
{ const w = vm.runInContext('SIM_WINS', ctx), n = vm.runInContext('SIM_SURVIVORS', ctx);
  console.log((flags.has('--exp-fresh-start') ? '[가정 실험] 매 전투 빈 군대에서 시작. ' : '') + '전선 승리 ' + w + '회, 승리 시 생존 병력 평균 ' + (w ? (n / w).toFixed(1) : 0) + '명'); }
