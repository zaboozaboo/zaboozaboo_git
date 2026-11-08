const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let saved='';const c=vm.createContext({console,Math,Date,window:{},assert,localStorage:{setItem:(k,v)=>saved=v,getItem:()=>saved}});
for(const f of ['data','state','kingdom','dice','formation','battle'])vm.runInContext(fs.readFileSync(`${__dirname}/../js/${f}.js`,'utf8'),c);
vm.runInContext(`
newGame({name:'facility',gender:'m',cls:'knight',nation:'aurum'});S.maxStage=11;S.gold=100000;
for(const targetType of ['training','mine']){
 for(const level of [0,1])for(let face=1;face<=6;face++){
  S.kingdom.lands.grove={training:0,mine:0};S.kingdom.lands.grove[targetType]=level;
  const gold=S.gold,cost=350*(level+1),success=face>=level+3;
  assert.equal(claimLand('grove',targetType,()=>(face-.5)/6,level),success);
  assert.equal(S.gold,gold-cost);assert.equal(facilityLevel('grove',targetType),level+(success?1:0));
  assert.equal(facilityLevel('grove',targetType==='mine'?'training':'mine'),0);
  assert.equal(S.kingdom.lastRoll.face,face);assert.equal(S.kingdom.lastRoll.target,level+3);
 }
}
S.kingdom.lands.grove={training:0,mine:0};
for(const type of ['training','mine'])for(const level of [0,1])assert(claimLand('grove',type,()=>.99,level));
assert(facilitiesComplete('grove'));const gold=S.gold;assert.equal(claimLand('grove','mine',()=>.99),false);assert.equal(S.gold,gold);
S.kingdom.lands.brook={training:1,mine:0};assert.equal(claimLand('brook','training',()=>.99,0),false);assert.equal(S.gold,gold,'stale level cannot spend twice');
S.gold=0;assert.equal(claimLand('brook','mine',()=>.99),false);assert.equal(S.gold,0);
S.kingdom.lands={grove:'training',brook:'mine'};ensureKingdom();ensureKingdom();assert.equal(facilityLevel('grove','training'),1);assert.equal(facilityLevel('grove','mine'),0);assert.equal(facilityLevel('brook','mine'),1);assert.equal(facilityCount('training'),1);assert.equal(facilityCount('mine'),1);
saveGame();loadGame();assert.equal(facilityLevel('grove','training'),1);assert.equal(facilityLevel('brook','mine'),1);
S.kingdom.lands.grove={training:2,mine:2};saveGame();loadGame();assert(facilitiesComplete('grove'));
console.log('PASS: all die faces at both levels for both facilities, costs, failures preserve levels, independent upgrades, max level, stale clicks, insufficient gold, legacy migration and save/load.');
`,c);
