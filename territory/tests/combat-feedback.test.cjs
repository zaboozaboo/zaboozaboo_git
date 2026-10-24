const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({console,Math,Date,assert,window:{},localStorage:{setItem(){}}});
for(const f of ['data','state','kingdom','dice','formation','battle','combat-feedback'])vm.runInContext(fs.readFileSync(`territory/js/${f}.js`,'utf8'),c);
vm.runInContext(`
newGame({name:'visual',gender:'m',cls:'knight',nation:'aurum'});ensureKingdom();
const before=CombatFeedback.capture(),unchanged=JSON.stringify(S);CombatFeedback.record(before,'hlv');assert.equal(CombatFeedback.growth,null);assert.equal(JSON.stringify(S),unchanged);
S.heroes.militia.level++;const state=JSON.stringify(S);CombatFeedback.record(before,'hlv');assert.equal(CombatFeedback.growth.before,before.power);assert.equal(CombatFeedback.growth.after,myPower());assert.equal(CombatFeedback.growth.pending,true);assert.equal(JSON.stringify(S),state);
const next=CombatFeedback.capture();S.upgrades.spawn++;CombatFeedback.record(next,'kingdomgrow');assert.match(CombatFeedback.growth.detail,/출격 주기/);
console.log('PASS: real power delta, unchanged upgrades produce no fake cue, non-power growth labels, feedback never mutates game state.');
`,c);
