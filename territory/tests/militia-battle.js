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
async function test(){
 for(const src of CombatArt.files)await new Promise((ok,no)=>{const im=new Image;im.onload=()=>{CombatArt.images[src]=im;ok();};im.onerror=no;im.src='../'+src;});
 prepareCombatArt();fixture();initRender(document.getElementById('cv'));await MilitiaCombat.load();assert(MilitiaCombat.ready,'Militia assets loaded');
 const militia=B.units.filter(u=>MilitiaCombat.accepts(u));assert(militia.length>0,'Spawned militia');
 const u=militia[0];
 for(const face of [-1,1])for(const moving of [false,true]){u.face=face;u.moving=moving;render();}
 u.meleeStartedAt=B.time;for(const elapsed of [0,.27,.47,.67,.77,1]){B.time=u.meleeStartedAt+elapsed;render();}
 B.fx=[{type:'fall',unit:u,x:u.x,y:u.y,t:.1,life:.5}];render();B.fx=[];
 fixture();status.textContent='PASS · 민병 걷기 / 공격 6프레임 / 양방향 / 쓰러짐 · 실제 전투 실행 중 · 저장 데이터 미사용';
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
