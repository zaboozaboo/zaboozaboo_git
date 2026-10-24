const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({console,Math,Date,assert,window:{},localStorage:{setItem(){}}});
for(const f of ['data','state','kingdom','dice','formation','battle','first-camp'])vm.runInContext(fs.readFileSync(`territory/js/${f}.js`,'utf8'),c);
vm.runInContext(`
newGame({name:'guide',gender:'f',cls:'knight',nation:'aurum'});prepareFirstExpedition();
S.firstExpedition=true;S.battleTutorial='done';firstBattlePhase=null;
S.stage=4;startStage(4);assert.equal(territoryGuidePaused(),false);
S.stage=5;startStage(5);assert.equal(S.territoryTutorial,'boss');assert.equal(firstBattlePaused(),true);
S.territoryTutorial='fighting';assert.equal(firstBattlePaused(),false);
B.result='lose';finishBattle();assert.equal(S.territoryTutorial,'fighting');assert.equal(ownedLands(),0);
S.farming=false;S.stage=5;startStage(5);B.result='win';finishBattle();
assert.equal(S.territoryTutorial,'won');assert.equal(S.kingdom.lands.grove,'outpost');assert.equal(kingdomTitle(),'개척 영지');assert.equal(B.stage,6);
assert.equal(B.units.filter(u=>u.isVanguard).length,2);assert.equal(firstBattlePaused(),true);
S.territoryTutorial='done';startStage(5);assert.equal(territoryGuidePaused(),false);assert.equal(territoryGuideConquest(5),false);
newGame({name:'legacy',gender:'m',cls:'knight',nation:'aurum'});startStage(5);assert.equal(territoryGuidePaused(),false);
console.log('PASS: first castle gate, loss/retry, real conquest, kingdom growth, two support units, no repeat, legacy unaffected.');
`,c);
