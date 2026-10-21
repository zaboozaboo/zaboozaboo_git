// 진입점 & 게임 루프
'use strict';

let lastFrame = 0, uiTimer = 0, saveTimer = 0, hiddenAt = 0;

function startMain() {
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
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  for (let i = 0; i < S.settings.speed; i++) updateBattle(dt);
  render();
  uiTimer += dt; saveTimer += dt;
  if (uiTimer > 0.25) { uiTimer = 0; UI.refresh(); }
  if (saveTimer > 5) { saveTimer = 0; checkDaily(); saveGame(); }
  requestAnimationFrame(frame);
}

function showOffline() {
  const r = offlineReward();
  if (!r || r.gold <= 0) return;
  S.gold += r.gold;
  const h = Math.floor(r.elapsed / 3600), m = Math.floor(r.elapsed % 3600 / 60);
  UI.modal(`<h2>🌙 영토 방치 보상</h2><p>${h ? h + '시간 ' : ''}${m}분 동안 부하들이 영토를 지켰습니다.<br><br><b style="font-size:22px;color:var(--gold)">💰 ${fmt(r.gold)}</b></p>`, [{ label: '수령', cls: 'gold' }]);
  saveGame();
}

document.addEventListener('visibilitychange', () => {
  if (!S) return;
  if (document.hidden) { hiddenAt = Date.now(); saveGame(); }
  else if (hiddenAt) { S.lastSave = hiddenAt; showOffline(); lastFrame = performance.now(); }
});
window.addEventListener('beforeunload', () => saveGame());

window.addEventListener('DOMContentLoaded', () => {
  if (loadGame()) {
    showOffline();
    startMain();
  } else UI.showSetup();
});
