const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let saved='';const c=vm.createContext({console,Math,Date,window:{},assert,localStorage:{setItem:(k,v)=>saved=v,getItem:()=>saved}});
for(const f of ['data','state','kingdom','dice','formation','battle'])vm.runInContext(fs.readFileSync(`territory/js/${f}.js`,'utf8'),c);
vm.runInContext(`
newGame({name:'검증',gender:'m',cls:'knight',nation:'aurum'});ensureKingdom();ensureDice();
assert.equal(ownedLands(),0);S.gold=1000;assert.equal(claimLand('grove','training'),false);
S.maxStage=6;S.gold=349;assert.equal(claimLand('grove','training'),false);S.gold=1000;
const before=diceCooldown();assert.equal(claimLand('grove','training'),true);assert.equal(S.gold,650);assert.equal(ownedLands(),1);assert.equal(diceCooldown(),before*.9);
assert.equal(claimLand('grove','mine'),false);assert.equal(S.gold,650);assert.equal(claimLand('bad','mine'),false);
loadGame();assert.equal(S.kingdom.lands.grove,'training');assert.equal(S.gold,650);
S.maxStage=11;S.gold=2000;const gold=goldMult();assert.equal(claimLand('brook','mine'),true);assert.equal(goldMult(),gold*1.15);
delete S.kingdom;ensureKingdom();assert.equal(ownedLands(),0);assert.equal(availableLand().id,'grove','old saves unlock, do not auto-own');
for(const [a,name,m] of [
 [[1,1,1,1],'눈금 모으는 중',1],[[1,1,1,1,1],'파이브카드',8],[[2,2,2,2,1],'포카드',5],[[2,2,3,3,3],'풀하우스',4],[[1,2,3,4,5],'스트레이트',4],[[6,5,4,3,2],'스트레이트',4],[[2,2,2,4,5],'트리플',3],[[1,1,2,2,3],'투페어',2],[[1,1,2,3,4],'원페어',2],[[1,2,3,4,6],'하이카드',1]]){assert.equal(diceHand(a).name,name);assert.equal(diceHand(a).mult,m);}
startStage(1);B.units=[];S.dice.history=[];S.dice.faces=[0,0,0,0,0,0];
for(let i=0;i<4;i++)assert.equal(rollProduction(()=>0).count,1);
assert.equal(rollProduction(()=>0).count,8);assert.equal(B.units.length,12);
assert.equal(rollProduction(()=>.3).name,'포카드');assert.deepEqual(Array.from(S.dice.history),[1,1,1,1,2]);
assert.equal(B.units.length,17);assert.equal(rollProduction(()=>.3).count,3,'cap truncates payout');
assert.equal(rollProduction(()=>.3).count,0,'full barracks do not overflow');
S.slots[0]=null;assert.equal(rollProduction(()=>0).count,0,'empty barracks do not spawn');S.slots[0]='militia';
assert.equal(setDiceFace(0,4),false);assert.equal(setDiceFace(0,1),true);const hist=S.dice.history.join();moveRoster(0,1);assert.equal(S.dice.faces[0],0);assert.equal(S.dice.history.join(),hist);
S.dice.history=[];S.dice.progress=0;B.units=[];tickDice(.5);assert.equal(S.dice.history.length,0);tickDice(diceCooldown()-.5);assert.equal(S.dice.history.length,1);assert.equal(B.units.length,1);
S.maxStage=5;S.kingdom={lands:{}};startStage(5);B.result='win';finishBattle();assert.equal(S.maxStage,6);assert.equal(availableLand().id,'grove');assert.equal(ownedLands(),0);
assert.equal(placeRosterHero('militia',4),false);assert.equal(placeRosterHero('militia',0),true);assert.equal(S.slots[0],'militia');assert.equal(S.slots.filter(id=>id==='militia').length,1);assert.equal(diceMatches([1,1,2,3,4],0),true);assert.equal(diceMatches([1,1,2,3,4],2),false);
assert.equal(PROMOTIONS[1].reqLand,1);assert.equal(PROMOTIONS[2].reqLand,3);assert.equal(PROMOTIONS[3].reqLand,6);
S.dice.faces[0]=-1;ensureDice();assert.equal(S.dice.faces[0],-1,'unchecked face remains unassigned');assert.equal(rollProduction(()=>0).count,0,'unassigned face does not spawn');moveRoster(0,1);assert.equal(S.dice.faces[0],-1,'reorder preserves unassigned face');
console.log('PASS: boss gate, construction cost, duplicate prevention, persistence, legacy migration, facility effects, 9 hands, rolling history, base production, cap, empty barracks, roster remapping, cooldown, promotion requirements.');
`,c);
