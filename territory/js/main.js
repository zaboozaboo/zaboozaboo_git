// 진입점 & 게임 루프
'use strict';

let lastFrame = 0, uiTimer = 0, saveTimer = 0, hiddenAt = 0, mainStarted = false;

function startMain() {
  if (mainStarted) return;
  mainStarted = true;
  checkDaily();
  $('#game').classList.remove('hidden');
  initRender($('#cv'));
  UI.initMain();
  B.mode = 'stage';
  startStage(S.stage);
  lastFrame = performance.now();
  requestAnimationFrame(frame);
}

function frame(now) {
  if (document.hidden) { lastFrame = now; requestAnimationFrame(frame); return; }
  const elapsed = Math.max(0, (now - lastFrame) / 1000);
  const dt = Math.min(0.05, elapsed);
  accrueLordMerit(elapsed);
  lastFrame = now;
  for (let i = 0; i < S.settings.speed; i++) updateBattle(dt);
  if(MobileShell.mode==='battle') render();
  uiTimer += dt; saveTimer += dt;
  if (uiTimer > 0.25) { uiTimer = 0; UI.refresh(); }
  if (saveTimer > 5) { saveTimer = 0; checkDaily(); saveGame(); }
  requestAnimationFrame(frame);
}

function showOffline() {
  const r = offlineReward();
  if (!r) return;
  ensureLordMerit();
  S.gold += r.gold;
  S.lord.merit += r.merit || 0;
  if(r.elapsed < 60){saveGame();return;}
  const h = Math.floor(r.elapsed / 3600), m = Math.floor(r.elapsed % 3600 / 60);
  UI.modal(`<h2>🌙 영토 방치 보상</h2><p>${h ? h + '시간 ' : ''}${m}분 동안 부하들이 영토를 지켰습니다.<br><br><b style="font-size:22px;color:var(--gold)">💰 ${fmt(r.gold)}</b><br><b>영주 공헌도 +${fmt(Math.floor(r.merit||0))}</b></p>`, [{ label: '수령', cls: 'gold' }]);
  saveGame();
}

document.addEventListener('visibilitychange', () => {
  if (!S) return;
  if (document.hidden) { hiddenAt = Date.now(); saveGame(); }
  else if (hiddenAt) {
    S.lastSave = hiddenAt; hiddenAt = 0;
    showOffline(); lastFrame = performance.now(); UI.refresh();
  }
});
window.addEventListener('pagehide', () => saveGame());
window.addEventListener('beforeunload', () => saveGame());

window.addEventListener('DOMContentLoaded', bootGame);
