const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const c=vm.createContext({console,Math,Date,window:{},assert,localStorage:{setItem(){}}});
for(const f of ['data','state','kingdom','dice','formation','battle'])vm.runInContext(fs.readFileSync('territory/js/'+f+'.js','utf8'),c);
vm.runInContext(`
newGame({name:'test',gender:'m',cls:'knight',nation:'aurum'});startStage(1);
assert.equal(B.units.filter(u=>u.isVanguard).length,0);
conquerLand(5);startStage(6);
const support=B.units.filter(u=>u.isVanguard);assert.equal(support.length,2);assert.equal(armyCount(),0);
assert.equal(slotAlive(0,0,'militia'),0);assert.equal(S.dice.history.length,0);
const ids=support.map(u=>u.id);startStage(7);assert.equal(B.units.filter(u=>u.isVanguard).length,2);assert.ok(B.units.every(u=>!ids.includes(u.id)));
B.units=B.units.filter(u=>!u.isVanguard);spawnPhase(.1);assert.equal(B.units.filter(u=>u.isVanguard).length,0);
S.maxStage=6;S.kingdom.lands.grove='training';startStage(6);assert.equal(B.units.filter(u=>u.isVanguard).length,2);assert.equal(S.kingdom.lands.grove,'training');
B.units=[];const lord=spawnLord(0);assert.equal(marchMultiplier(lord),2.2);
const foe=spawnEnemy('goblin',6);foe.x=lord.x+100;foe.y=lord.y;assert.equal(marchMultiplier(lord),1);assert.equal(marchMultiplier(foe),1);
foe.hp=0;lord.x=E_CASTLE_X-70;assert.equal(marchMultiplier(lord),1);
assert.match(kingdomMap(),/선발대 주둔/);
console.log('PASS: land unlock, two support units per round, no roster/cap use, no respawn, legacy facility preservation, travel-only acceleration, map marker.');
`,c);
