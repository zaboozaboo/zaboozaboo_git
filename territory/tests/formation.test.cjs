const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const context=vm.createContext({console,Math,Date,window:{},assert});
for(const file of ['data','state','kingdom','dice','formation','battle','guidance']) vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',file+'.js'),'utf8'),context);
vm.runInContext(`
const clamp01=n=>Math.max(0,Math.min(1,n));
newGame({name:'진형 검증',gender:'m',cls:'knight',nation:'aurum'});
delete S.formation;ensureFormation();assert.deepEqual(Array.from(S.formation),[2,2,1,0,0]);
S.formation=[8,-1,NaN];ensureFormation();assert.deepEqual(Array.from(S.formation),[2,2,1,0,0]);
S.formation=[0,2,1,0,0];S.settings.speed=1;startStage(1);B.queue=[];
assert.equal(B.deployDelay[0],0);assert.equal(B.deployDelay[1],.8);
assert.equal(deploymentInfo(1).seconds,4);
S.settings.speed=2;assert.equal(deploymentInfo(1).seconds,2);S.settings.speed=1;
spawnPhase(.4);assert.ok(Math.abs(S.dice.progress-.1)<1e-9);
spawnPhase(.6);assert.ok(Math.abs(S.dice.progress-.25)<1e-9);
B.units=[];spawnHero(0,'militia',BUILDING_POS[0],undefined,undefined,0,1);spawnHero(0,'archer',BUILDING_POS[1],undefined,undefined,1,1);
S.formation=[0,2,1,0,0]; // Isolated combat spacing scenario.
const front=B.units[0],rear=B.units[1];front.x=270;front.y=160;rear.x=190;rear.y=160;
assert.equal(formationLimit(rear),194);
const foe=spawnEnemy('goblin',1);foe.x=320;foe.y=160;
assert.equal(nearestFoe(foe).id,front.id,'Enemy reaches frontline before rear');
rear.x=220;rear.cdT=1;const oldX=rear.x;updateUnit(rear,.1);assert.ok(rear.x<oldX,'Rear walks back to formation');
rear.x=190;rear.cdT=0;rear.target=foe;rear.retarget=1;updateUnit(rear,.1);assert.ok(B.projs.some(p=>p.team===0),'Rear fires over frontline within range');
front.hp=0;assert.equal(formationLimit(rear),Infinity,'Frontline loss exposes rear');
front.hp=front.maxHp;B.spawnT=[.7,.2];B.deployDelay=[0,.3];const beforeCount=B.units.length;
assert.equal(moveRoster(0,1),true);assert.equal(S.slots[0],'archer');assert.equal(front.slot,1);assert.equal(rear.slot,0);assert.equal(unitRank(rear),2);assert.equal(unitRank(front),2);assert.equal(B.spawnT[0],.2);assert.equal(B.units.length,beforeCount);
assert.equal(moveRoster(0,2),false,'Locked slot cannot be used');
assert.equal(moveRoster(-1,0),false);assert.equal(moveRoster(0,0),false);
assert.equal(nearestFoe(foe).id,front.id,'Reordering does not teleport troops');
S.formation[0]=0;S.formation[1]=2;assert.equal(unitRank(rear),0);assert.equal(unitRank(front),2);
S.lord.cls='mage';ensureFormation();assert.deepEqual(Array.from(S.formation),[0,0,1,2,2]);
S.lord.cls='knight';S.formation=[0,0,0,0,0];ensureFormation();assert.deepEqual(Array.from(S.formation),[2,2,1,0,0]);
for(let p=0;p<4;p++){S.lord.promo=p;assert.equal(slotCount(),p+2);assert.equal(placeRosterHero('militia',slotCount()),false);}
console.log('PASS: migration, deployment timing, 2x timing, formation spacing, frontline targeting, ranged fire, collapse, live reorder, locked slots.');
`,context);
