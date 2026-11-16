const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const c=vm.createContext({console,assert,Math,Date,window:{},localStorage:{setItem(){}},UI:{toast(){}}});
for(const f of ['data','state','kingdom','dice','formation','battle','forge-balance','portal-master-data','portal','portal-balance'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',f+'.js'),'utf8'),c);
vm.runInContext(`
newGame({name:'fixed',gender:'m',cls:'knight',nation:'aurum'});Portal.ensure();
for(const row of FORGE_BALANCE.stages){const a=Portal.armyFormation(row.stageId);assert.ok([12,15,18].includes(a.count));assert.ok([32,28,26].includes(a.interval));const stats=JSON.stringify(Portal.enemyStats(row.stageId));S.portal.board=[{id:'pm_9_0',level:150,charge:0,options:[]}];assert.deepEqual(Portal.armyFormation(row.stageId),a);assert.equal(JSON.stringify(Portal.enemyStats(row.stageId)),stats);}
const startPrepared=stage=>{Portal.startStage(stage);assert.equal(B.units.length,0);Portal.spawnPhase(3);};
S.portal.board=[null,null,null];startPrepared(1);assert.equal(B.units.length,12);assert.equal(B.queueTotal,24);const total=B.units.reduce((a,u)=>a+u.hp,0);assert.ok(Math.abs(total-Portal.enemyStats(1).hp*1.2)<1e-6);
Portal.spawnPhase(31.9);assert.equal(B.masterWaveIndex,1);Portal.spawnPhase(.2);assert.equal(B.masterWaveIndex,2);assert.equal(B.units.length,24,'reinforcements arrive while first formation lives');
startPrepared(7);assert.equal(B.units.length,18);Portal.spawnPhase(26);assert.equal(B.units.length,36);Portal.spawnPhase(100);assert.equal(B.units.length,36,'two-formation cap');B.units.splice(0,18);Portal.spawnPhase(.1);assert.equal(B.units.length,36);assert.equal(B.masterWaveIndex,3);
// Clearing early bypasses the timer, including dead bodies still in the array.
startPrepared(1);const supply=S.portal.supply;B.units.forEach(u=>u.hp=0);B.queueT=32;
Portal.spawnPhase(.05);assert.equal(B.masterWaveIndex,2);assert.equal(B.units.filter(u=>u.team===1&&u.hp>0).length,12);assert.equal(B.queueT,32);assert.equal(S.portal.supply,supply);
Portal.spawnPhase(.05);assert.equal(B.masterWaveIndex,2,'one clear cannot spawn twice');
B.units.forEach(u=>u.hp=0);Portal.spawnPhase(.05);assert.equal(B.masterWaveIndex,2,'no wave beyond the final wave');
// One living enemy still respects the existing reinforcement timer.
startPrepared(1);B.units.slice(1).forEach(u=>u.hp=0);Portal.spawnPhase(.05);assert.equal(B.masterWaveIndex,1);
// Dungeon clears use the same immediate transition without overlapping live waves.
Portal.dungeonRun={row:{Health:1,Damage:1}};B.masterWaves=[{count:2},{count:3}];B.masterWaveIndex=0;B.units=[];B.queueT=99;Portal.spawnWave();
Portal.spawnPhase(.05);assert.equal(B.masterWaveIndex,1);B.units.forEach(u=>u.hp=0);Portal.spawnPhase(.05);assert.equal(B.masterWaveIndex,2);assert.equal(B.units.filter(u=>u.hp>0&&u.team===1).length,3);
Portal.dungeonRun=null;
`,c);console.log('PASS 630 fixed formations, roster-independent stats, timed reinforcement and two-formation cap');
