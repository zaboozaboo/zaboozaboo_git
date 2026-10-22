const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let saved='';const c=vm.createContext({console,Math,Date,assert,localStorage:{setItem:(k,v)=>saved=v,getItem:()=>saved}});
for(const f of ['data','state','kingdom','formation','dice','battle'])vm.runInContext(fs.readFileSync(`territory/js/${f}.js`,'utf8'),c);
vm.runInContext(`
newGame({name:'성장 검증',gender:'m',cls:'knight',nation:'aurum'});
assert.equal(kingdomGrowth().step,0);assert.equal(kingdomGrowth().id,'atk');
S.gold=39;assert.equal(advanceKingdomGrowth(0),null);assert.equal(S.gold,39);
S.gold=1e9;const before=S.gold;assert.ok(advanceKingdomGrowth(0));assert.equal(S.gold,before-40);assert.equal(S.upgrades.atk,1);
assert.equal(advanceKingdomGrowth(0),null,'stale button cannot purchase a different step');
assert.equal(kingdomGrowth().id,'hp');
for(let n=1;n<10;n++)assert.ok(advanceKingdomGrowth(n));
assert.equal(kingdomGrowth().locked,true);const gateGold=S.gold;assert.equal(advanceKingdomGrowth(10),null);assert.equal(S.gold,gateGold);
S.maxStage=6;assert.ok(claimLand('grove','mine'));assert.equal(kingdomGrowth().locked,false);assert.ok(advanceKingdomGrowth(10));
saveGame();loadGame();assert.equal(kingdomGrowth().step,11);assert.equal(ownedLands(),1);
// Legacy benefits are never removed or applied twice by migration.
delete S.kingdom.growth;S.upgrades.atk=37;S.upgrades.cap=10;S.upgrades.spawn=50;const snapshot=JSON.stringify(S.upgrades);ensureKingdomGrowth();ensureKingdomGrowth();assert.equal(JSON.stringify(S.upgrades),snapshot);assert.equal(kingdomGrowth().step,0);
S.kingdom.growth.step=9;const fallback=kingdomGrowth();assert.equal(fallback.id,'hp');const hp=S.upgrades.hp;assert.ok(advanceKingdomGrowth(9));assert.equal(S.upgrades.cap,10);assert.equal(S.upgrades.hp,hp+1);
S.kingdom.growth.step=6;assert.equal(kingdomGrowth().id,'hp');
// Castle rewards update current/max health by only the gained amount.
startStage(1);S.kingdom.growth.step=4;B.pCastle.hp=100;const oldMax=B.pCastle.max;assert.ok(advanceKingdomGrowth(4));assert.equal(B.pCastle.hp,100+B.pCastle.max-oldMax);
// Progress continues after the former ending, with permanent star multipliers.
S.kingdom.lands=Object.fromEntries(LANDS.map(l=>[l.id,'mine']));S.kingdom.growth.step=69;
const gems=S.gems,oldStar=kingdomStarMult();
const unit={team:0,atk:100,hp:50,maxHp:100,heal:10};B.units=[unit];
assert.ok(advanceKingdomGrowth(69).starEarned);assert.equal(kingdomGrowth().step,70);assert.equal(kingdomGrowth().locked,false);
assert.equal(S.gems,gems);assert.equal(kingdomStarMult(),1.35);assert.ok(Math.abs(unit.atk-100*1.35/oldStar)<1e-9);
assert.ok(advanceKingdomGrowth(70));assert.equal(kingdomGrowth().step,71);
S.kingdom.growth.step=140;saveGame();loadGame();assert.equal(kingdomGrowth().step,140);assert.ok(Math.abs(kingdomStarMult()-1.7)<1e-9);
const atk=armyMult().atk,lordAtk=lordStats().atk;S.kingdom.growth.step=0;assert.ok(Math.abs(atk/armyMult().atk-1.7)<1e-9);assert.ok(Math.abs(lordAtk/lordStats().atk-1.7)<1e-9);
S.kingdom.growth.step=30;assert.equal(kingdomStarMult(),1.15);assert.equal(S.gems,gems);
console.log('PASS: ordered rewards, costs, stale-click protection, land gates, save/load, legacy preservation, capped-reward fallback, castle health, endless growth, star buffs, live units, no currency rewards.');
`,c);
