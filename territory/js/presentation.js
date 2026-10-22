// Shared local RPG art atlases. No external network or font dependency at startup.
'use strict';
const ICON_MAP = {
  '🏰':'castle','👑':'crown','🤴':'helm','👸':'crown','🎴':'cards','⭐':'star','🌟':'star',
  '⚔️':'sword','🛡️':'shield','💰':'coin','💎':'gem','🔮':'wand','✨':'star','🌳':'leaf',
  '🔥':'fire','🪓':'axe','🏹':'bow','🔱':'spear','🎯':'bow','📘':'book','🐎':'horse',
  '📿':'heart','🌙':'moon','🦅':'wing','⚜️':'shield','🐉':'dragon','😇':'wing','❤️':'heart',
  '⏱️':'clock','⏱':'clock','⛺':'flag','🔒':'lock','📯':'flag','☄️':'fire','🕊️':'wing',
  '💀':'skull','👹':'skull','⚡':'bolt','💡':'help','🏆':'crown','🏅':'star','🥇':'crown',
  '🥈':'shield','🥉':'shield','✅':'check','❌':'close','🔁':'clock','＋':'plus','✕':'close'
};
const iconPattern = new RegExp(Object.keys(ICON_MAP).sort((a,b)=>b.length-a.length).join('|'), 'gu');
const ICON_CELLS = { castle:0,crown:1,shield:2,sword:3,gem:4,coin:5,cards:6,star:7,leaf:8,fire:9,wand:10,bow:11,axe:12,spear:13,book:14,horse:15,wing:16,dragon:17,heart:18,clock:19,lock:20,flag:21,helm:22,check:23,skull:24,bolt:25,plus:26,close:27,chevron:28,moon:29,help:14 };
function gameIcon(name, extra = '') {
  const cell = ICON_CELLS[name] ?? 7;
  return `<span class="game-icon ${extra}" aria-hidden="true" style="background-position:${cell % 6 * 20}% ${Math.floor(cell / 6) * 25}%"></span>`;
}
const HERO_ART_ORDER = ['militia','archer','spear','crossbow','apprentice','cavalry','monk','pyro','ranger','griffin','paladin','dragon','archangel'];
function heroArt(id) {
  const cell = (ALLY_ART[id] ?? 6);
  return `<span class="hero-art" aria-hidden="true" style="background-image:url('${CombatArt.allies[cell]?.url||''}');background-size:contain;background-position:center;background-repeat:no-repeat"></span>`;
}
function setLordArt(el, cls, gender) {
  const col = { knight:0, mage:1, priest:2 }[cls];
  const cell=col+(gender==='f'?3:0);
  el.style.backgroundImage=`url('${CombatArt.allies[cell]?.url||''}')`;
  el.style.backgroundPosition='center';el.style.backgroundSize='contain';el.style.backgroundRepeat='no-repeat';
  el.setAttribute('aria-label', `${gender === 'f' ? '여성' : '남성'} ${CLASSES[cls].name}`);
}

function polishIcons(root = document.getElementById('app')) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    const n = walker.currentNode;
    if (n.parentElement.closest('script,style,canvas,textarea,input')) continue;
    iconPattern.lastIndex = 0;
    if (iconPattern.test(n.nodeValue)) nodes.push(n);
  }
  for (const n of nodes) {
    const parts = n.nodeValue.split(iconPattern), matches = n.nodeValue.match(iconPattern);
    const fragment = document.createDocumentFragment();
    parts.forEach((part, i) => {
      fragment.append(document.createTextNode(part));
      if (matches[i]) {
        const icon = document.createElement('span');
        const cell = ICON_CELLS[ICON_MAP[matches[i]]] ?? 7;
        icon.className = 'game-icon'; icon.setAttribute('aria-hidden', 'true');
        icon.style.backgroundPosition = `${cell % 6 * 20}% ${Math.floor(cell / 6) * 25}%`;
        fragment.append(icon);
      }
    });
    n.replaceWith(fragment);
  }
}

async function bootGame() {
  const fill = document.getElementById('boot-progress');
  const label = document.getElementById('boot-status');
  const button = document.getElementById('boot-start');
  const files = ['assets/casual-title.png', 'assets/casual-icons.png', ...CombatArt.files];
  let done = 0;
  const failures = [];
  polishIcons();
  for (const src of files) await new Promise(resolve => {
    const image = new Image();
    let settled = false;
    const timeout = setTimeout(() => { failures.push(src); finish(); }, 15000);
    image.onload = () => { if (CombatArt.files.includes(src)) CombatArt.images[src] = image; finish(); };
    image.onerror = () => { failures.push(src); finish(); };
    function finish() {
      if (settled) return;
      settled = true; clearTimeout(timeout);
      image.onload = image.onerror = null;
      done++; const percent = Math.round(done / files.length * 100);
      fill.style.width = percent + '%';
      document.getElementById('boot-meter').setAttribute('aria-valuenow', percent);
      label.textContent = `왕국 준비 중 · ${percent}%`;
      resolve();
    }
    image.src = src;
  });
  if (failures.length) {
    label.textContent = '일부 화면을 불러오지 못했습니다. 다시 시도해 주세요.';
    button.disabled = false; button.textContent = '다시 불러오기'; button.onclick = () => location.reload();
    return;
  }
  try { prepareCombatArt(); }
  catch (error) {
    console.error('Battle art preparation failed', error);
    label.textContent = '전투 아트를 준비하지 못했습니다. 다시 불러와 주세요.';
    button.disabled = false; button.textContent = '다시 불러오기'; button.onclick = () => location.reload();
    return;
  }
  const saved = loadGame();
  if (loadFailure) {
    label.textContent = '저장 데이터를 읽지 못했습니다. 기존 데이터는 그대로 보관됩니다.';
    button.disabled = false; button.textContent = '다시 시도'; button.onclick = () => location.reload();
    return;
  }
  label.textContent = saved ? '영주님, 왕국이 당신을 기다립니다.' : '당신의 깃발 아래, 새로운 왕국이 시작됩니다.';
  button.innerHTML = (saved ? '왕국으로 돌아가기' : '모험 시작하기') + gameIcon('chevron');
  button.disabled = false;
  document.getElementById('boot').classList.add('loaded');
  button.onclick = () => {
    button.disabled = true;
    document.getElementById('boot').classList.add('hidden');
    if (saved) { startMain(); showOffline(); }
    else UI.showSetup();
  };
}

// Small, tier-specific metalwork; decorative layers never intercept card controls.
function unitTierTrim(rarity){
 const emblem=rarity==='H'?'<path d="m5 10 4 4 5-8 5 8 4-4-2 12H7Z"/><path d="M8 25h12M10 18h8"/>':rarity==='R'?'<path d="m14 4 9 5-2 12-7 7-7-7-2-12Z"/><path d="m14 9 4 7-4 7-4-7Z"/>':'<path d="m14 6 7 8-7 8-7-8Z"/>';
 return `<span class="tier-metalwork" aria-hidden="true"><i class="tier-corner tl"></i><i class="tier-corner tr"></i><i class="tier-corner bl"></i><i class="tier-corner br"></i></span><span class="tier-seal" aria-hidden="true"><svg viewBox="0 0 28 32">${emblem}</svg></span>`;
}
