const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({console,Math,Date,assert,window:{},localStorage:{setItem(){}}});
for(const f of ['data','state','kingdom','dice','formation','battle','first-camp','journey-guide'])vm.runInContext(fs.readFileSync(`territory/js/${f}.js`,'utf8'),c);
vm.runInContext(`
newGame({name:'guide',gender:'m',cls:'knight',nation:'aurum'});ensureKingdom();
assert.equal(JourneyGuide.lessons().find(x=>x.id==='skill').ready,false);
S.maxStage=2;assert.equal(JourneyGuide.lessons().find(x=>x.id==='skill').ready,true);
assert.equal(JourneyGuide.lessons().find(x=>x.id==='expedition').ready,false);
S.maxStage=7;assert.equal(JourneyGuide.lessons().find(x=>x.id==='expedition').ready,true);
JourneyGuide.victory(1,true,true);assert.match(JourneyGuide.speech.text,/본진/);
JourneyGuide.victory(4,true,true);assert.match(JourneyGuide.speech.text,/성/);
JourneyGuide.victory(5,true,true);assert.match(JourneyGuide.speech.text,/10단계/);
JourneyGuide.speech=null;JourneyGuide.victory(1,true,false);assert.equal(JourneyGuide.speech,null);
JourneyGuide.victory(5,false,false);assert.match(JourneyGuide.speech.text,/성장/);
const gold=S.gold,gems=S.gems;JourneyGuide.clear=()=>{};JourneyGuide.active={id:'skill'};JourneyGuide.finish();
assert.equal(S.fieldGuideSeen.skill,true);assert.equal(JourneyGuide.active,null);assert.equal(S.gold,gold);assert.equal(S.gems,gems);
console.log('PASS: guidance unlocks, next castle dialogue, farming repeat suppression, defeat advice, seen persistence, no resource spending.');
`,c);
