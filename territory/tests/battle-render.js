'use strict';
// Integration fixtures use the real simulation and renderer, isolated from player saves.
saveGame = () => {};
let running = false, previous = 0;
const status = document.getElementById('test-status');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
function fixture(ri=0, cls='mage', gender='m', completeRoster=false) {
  newGame({name:'테스트 영주',gender,cls,nation:'aurum'});
  S.lord.level=10;S.lord.promo=1;S.settings.autoSkill=false;
  for(const h of HEROES) S.heroes[h.id]={level:3,stars:1,shards:0};
  S.slots=['militia','archer','apprentice',null,null];
  B.units=[];B.pCastle=null;B.stash=null;B.buffs={rally:0,sanctuary:0};B.skillT=0;
  if(ri===5) startSpecial({mode:'war',deck:['militia','archer','apprentice'],scale:2,spawnRate:1,color:'#dd8888',foeName:'테스트 원정군',lord:{cls:'knight',gender:'f',promo:1,name:'적 영주',scale:2}},()=>{});
  else startStage(ri*10+5);
  B.queue=[];B.queueTotal=0;B.stageBanner=0;B.lordRespawn=0;B.eLordRespawn=0;
  const lord=spawnLord(0);lord.x=W*.42;lord.y=160;
  const ids=completeRoster?HEROES.map(h=>h.id):['militia','archer','apprentice'];
  ids.forEach((id,i)=>spawnHero(0,id,{x:W*.24+(i%3)*15,y:65+(i%4)*60},1,undefined,i,completeRoster?1:3));
  const keys=completeRoster?Object.keys(ENEMIES):Object.keys(ENEMIES).slice((ri%5)*4,(ri%5)*4+4);
  keys.forEach((key,i)=>{const u=spawnEnemy(key,1);u.x=W*.65+Math.floor(i/4)*19;u.y=55+(i%4)*70;});
  B.spawnT=[.3,.5,.7,0,0];
}
async function test() {
  const start=performance.now();
  for(const src of CombatArt.files) await new Promise((resolve,reject)=>{
    const im=new Image();im.onload=()=>{CombatArt.images[src]=im;resolve();};im.onerror=()=>reject(new Error(src));im.src='../'+src;
  });
  prepareCombatArt();
  assert(CombatArt.allies.length===20&&CombatArt.enemies.length===20&&CombatArt.buildings.length===12,'Atlas cell counts');
  for(const h of HEROES) assert(Number.isInteger(ALLY_ART[h.id])&&Number.isInteger(BUILDING_ART[h.id]),'Missing hero mapping: '+h.id);
  for(const key of Object.keys(ENEMIES)) assert(Number.isInteger(ENEMY_ART[key]),'Missing enemy mapping: '+key);
  newGame({name:'검증',gender:'m',cls:'mage',nation:'aurum'});
  initRender(document.getElementById('cv'));
  let scenes=0, renderTime=0;
  for(const width of [320,375,500]) {
    document.getElementById('field').style.width=width+'px';fitCanvas();
    for(let ri=0;ri<6;ri++) for(const cls of ['knight','mage','priest']) for(const gender of ['m','f']) {
      fixture(ri,cls,gender,true);
      assert(castSkill(),'Skill activation: '+cls);
      updateBattle(.05);
      const before=performance.now();render();renderTime+=performance.now()-before;scenes++;
      for(const u of B.units) assert(Number.isFinite(u.x)&&Number.isFinite(u.y)&&spriteFor(u),'Invalid projected unit');
    }
  }
  fixture(0,'mage','m');
  S.settings.speed=1;S.upgrades.spawn=0;S.dice.progress=.5;
  const normal=deploymentInfo(0);assert(normal.seconds===1,'Base countdown');
  S.settings.speed=2;assert(deploymentInfo(0).seconds===.5,'2x countdown');
  S.upgrades.spawn=50;assert(deploymentInfo(0).seconds===.25,'Upgrade countdown');
  S.farming=true;S.stage=9;S.maxStage=13;S.gold=0;
  assert(nextBattleAction().tab==='kingdom','Unlocked land guidance');
  S.kingdom.lands={grove:'mine',brook:'mine'};
  assert(nextBattleAction().title.includes('10단계')&&nextBattleAction().boss,'Actual retry destination');
  S.gold=100000;assert(nextBattleAction().tab==='lord','Affordable growth guidance');
  S.farming=false;S.daily.freeSummon=1;assert(nextBattleAction().tab==='summon','Free recruitment guidance');
  fixture(0,'mage','m');
  // Spawned enemies must fit below the HUD even on a short, wide battlefield.
  document.getElementById('field').style.width='500px';
  document.getElementById('field').style.height='300px';fitCanvas();
  fixture(0,'mage','m');
  for(const key of Object.keys(ENEMIES)) {
    const enemy=spawnEnemy(key,1);
    const head=SY(enemy.x)-spriteHeight(enemy)*VIEW.sx/VIEW.sy;
    assert(head*VIEW.sy>=35,'Enemy clipped under top HUD: '+key);
  }
  const lord=B.units.find(u=>u.isLord&&u.team===0),soldier=B.units.find(u=>u.heroId==='militia');
  assert(spriteHeight(lord)>spriteHeight(soldier)*1.7,'Lord remains visually distinct');
  document.getElementById('field').style.width='375px';document.getElementById('field').style.height='570px';fitCanvas();
  fixture(0,'mage','m');
  const beforeHp=B.units.find(u=>u.team===1).hp;
  const target=B.units.find(u=>u.team===1),source=B.units.find(u=>u.team===0);
  dealDamage(target,1,source);assert(target.hp===beforeHp-1 && B.fx.some(f=>f.type==='impact'),'Damage feedback preserves damage');
  fixture(0,'mage','m');
  const sample=B.units[0];
  for(const type of ['slash','impact','boom','meteor','spark','poof','fall','ring']) {
    for(const fraction of [0,.4,.9]) {
      B.fx=[{type,x:W*.5,y:160,t:fraction,life:1,r:30,max:100,face:1,size:10,color:'#ffbc77',unit:sample}];
      render();
    }
  }
  B.fx=[];
  for(const type of ['arrow','bolt_x','fire','holy','bolt']) {
    B.projs=[{type,x:W*.5,y:160,vx:1,vy:.4}];render();
  }
  B.projs=[];
  CombatArt.reducedMotion=true;render();CombatArt.reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderAverage=renderTime/scenes;
  status.textContent=`PASS · ${scenes} scenes + 8 FX / 5 projectile types · 6 battlefields · 3 classes × 2 genders · 320/375/500px · all 13 heroes / 20 monsters mapped · mean render ${renderAverage.toFixed(1)}ms (includes cold terrain cache) · ${(performance.now()-start).toFixed(0)}ms total. No saves modified.`;
  document.getElementById('field').style.width='375px';fitCanvas();fixture();
  running=true;requestAnimationFrame(tick);
}
function restart(){fixture(Number(document.getElementById('region').value),document.getElementById('class').value);render();}
function tick(now){const dt=Math.min(.05,(now-(previous||now))/1000);previous=now;if(running)updateBattle(dt);render();requestAnimationFrame(tick);}
document.getElementById('region').onchange=restart;document.getElementById('class').onchange=restart;
document.getElementById('reset').onclick=restart;
document.getElementById('skill').onclick=()=>{B.skillT=0;castSkill();};
document.getElementById('pause').onclick=e=>{running=!running;e.target.textContent=running?'일시 정지':'전투 재개';};
window.addEventListener('error',e=>{status.textContent='FAIL · '+e.message;});
test().catch(e=>{status.textContent='FAIL · '+e.message;console.error(e);});
