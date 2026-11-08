const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const ctx=vm.createContext({console,Math,Date,window:{},localStorage:{setItem(){}},UI:{toast(){}},assert});
for(const name of ['data','state','kingdom','dice','formation','battle','forge-balance','portal-master-data','portal','portal-balance','portal-features','portal-collection-data','portal-collections','portal-pet-data','portal-pet-growth'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',name+'.js'),'utf8'),ctx);
vm.runInContext(`
newGame({name:'test',gender:'m',cls:'knight',nation:'aurum'});Portal.ensure();saveGame=()=>{};
let c=CollectionUI.ensure();c.pets={pets_0_0:3,pets_1_0:1,pets_0_1:2};c.petXp={pets_0_0:150};c.petLocks={};c.equipped.pets=['pets_0_0',null];
assert.equal(PetGrowth.available('pets_1_0','pets_0_0'),2);
assert.equal(PetGrowth.feed('pets_1_0',{pets_0_0:3}),false);
c.petLocks.pets_0_1=true;assert.equal(PetGrowth.feed('pets_1_0',{pets_0_1:1}),false);c.petLocks.pets_0_1=false;
c.pets.pets_0_1=10;assert.equal(PetGrowth.feed('pets_1_0',{pets_0_1:6}),false);
const value=()=>Object.entries(c.pets).reduce((n,[id,count])=>n+count*PetGrowth.seed(CollectionUI.def('pets',id).r)+(c.petXp[id]||0),0);const originalValue=value();
const snapshot=JSON.stringify(c);for(const bad of [{pets_0_0:-1},{pets_0_0:1.5},{pets_0_0:Infinity},{pets_5_0:1},{}])assert.equal(PetGrowth.feed('pets_1_0',bad),false);assert.equal(JSON.stringify(c),snapshot);
assert.equal(PetGrowth.feed('pets_1_0',{pets_0_0:2}).xp,200);assert.equal(c.petXp.pets_0_0,150);assert.equal(c.pets.pets_0_0,1);
c.equipped.pets=[null,null];assert.equal(PetGrowth.feed('pets_1_0',{pets_0_0:1}).xp,250);assert.equal(c.petXp.pets_1_0,450);assert.equal(c.pets.pets_0_0,undefined);assert.equal(value(),originalValue);
assert.equal(PetGrowth.feed('pets_1_0',{pets_1_0:1}),false);c.pets.pets_1_0=2;assert.ok(PetGrowth.feed('pets_1_0',{pets_1_0:1}));assert.equal(c.pets.pets_1_0,1);
c.pets.pets_0_0=1;c.equipped.pets=['pets_0_0',null];assert.equal(CollectionUI.equip('pets','pets_1_0',1),false);assert.equal(CollectionUI.equip('pets','pets_1_0',0),true);
// Save/reload and migration preserve spent growth once, without duplicating material copies.
const saved=JSON.parse(JSON.stringify(c));S.portal.collections=saved;c=CollectionUI.ensure();assert.equal(c.petXp.pets_1_0,600);assert.equal(c.pets.pets_1_0,1);
c.petEvolution=0;c.pets={pets_0_0:8};c.equipped.pets=['pets_0_0',null];CollectionUI.ensure();const migrated=JSON.stringify(c);CollectionUI.ensure();assert.equal(JSON.stringify(c),migrated);assert.equal(c.pets.pets_0_0,1);assert.ok(CollectionUI.level('pets','pets_0_0').level>1);
let checks=0;
for(let age=0;age<10;age++){
 const stage=FORGE_BALANCE.stages.findIndex(s=>s.AgeIndex===age)+1;S.portal.maxStage=stage;
 for(const pulls of [0,2,20,100,500,5000,100000]){c.pulls.pets=pulls;const rate=CollectionUI.rate('pets');let sum=0;CollectionUI.rarity.forEach((key,r)=>{const p=rate[key+'Chance'];assert.ok(Number.isFinite(p)&&p>=0);sum+=p;});assert.ok(Math.abs(sum-1)<1e-8);checks++;}
}
c.scrollInventory=[{id:'pets_0_2'},{id:'pets_1_4'},{id:'pets_5_0'}];c.pets.pets_1_0=1;c.petXp.pets_1_0=0;const active=c.scrolls.length;assert.equal(PetGrowth.feed('pets_1_0',{scroll_5:1}),false);assert.equal(PetGrowth.feed('pets_1_0',{scroll_0:1,scroll_1:1}).xp,250);assert.equal(c.scrollInventory.length,1);assert.equal(c.scrolls.length,active);assert.equal(PetGrowth.feed('pets_1_0',{scroll_0:1}),false);
// All evolution curves and six role budgets: monotonic, finite, bounded at Lv.100.
let curveChecks=0;
for(let r=0;r<6;r++)for(let variant=0;variant<6;variant++){const id='pets_'+r+'_'+variant;c.pets[id]=1;let xp=0,last=0;for(let lv=1;lv<=100;lv++){c.petXp[id]=xp;assert.equal(CollectionUI.level('pets',id).level,lv);const p=PetGrowth.power(id);assert.ok(p>=last&&p<=.6);if(variant===2||variant===5)assert.ok(p<=.3);last=p;xp+=PetGrowth.required(r,lv);curveChecks++;}}
const clamp01=n=>Math.max(0,Math.min(1,n));startStage(1);Portal.page=null;B.result=null;
let budgetChecks=0;
for(let era=0;era<10;era++)for(const unitLevel of [1,75,150])for(const variant of [0,1]){
 S.portal.board=[0,2,4].map(v=>({id:'pm_'+era+'_'+(v+variant),level:unitLevel,charge:0,options:[]}));
 for(let r=0;r<6;r++)for(const petLevel of [1,50,100]){
  for(let v=0;v<6;v++){let xp=0;for(let l=1;l<petLevel;l++)xp+=PetGrowth.required(r,l);c.petXp['pets_'+r+'_'+v]=xp;}
  const dragon='pets_'+r+'_3',heal='pets_'+r+'_4';
  let expected;
  for(const count of [1,3,20]){B.units=Array.from({length:count},()=>({team:1,hp:1e15}));PetGrowth.cast(dragon);const damage=B.units.reduce((s,u)=>s+1e15-u.hp,0);if(expected===undefined)expected=damage;assert.ok(Math.abs(damage-expected)<=2,'AoE total damage bounded independently of enemy count');}
  const budget=PetGrowth.budget();B.units=Array.from({length:12},()=>({team:0,hp:1,maxHp:budget.hp}));PetGrowth.cast(heal);const healed=B.units.reduce((s,u)=>s+u.hp-1,0);assert.ok(Math.abs(healed-budget.hp*PetGrowth.power(heal)*.25)<Math.max(1,budget.hp)*1e-9);
  budgetChecks++;
 }
}
// Real production under identical dice streams and timed casualties; charge remains integral.
function production(ids,lifetime){c.equipped.pets=ids;Portal.petChargeRemainder={};S.portal.board=[0,2,4].map(v=>({id:'pm_0_'+v,level:1,charge:0,options:[]}));B.units=[];B.fx=[];B.projs=[];let next=0,roll=0,produced=0;for(let t=0;t<180;t+=.25){B.units=B.units.filter(u=>t-u.born<lifetime);const before=new Set(B.units);if(t>=next){S.portal.board.forEach((p,i)=>Portal.produce(i,1+roll%6));next=t+Portal.autoInterval();roll++;}if(t>0&&t%18===0)for(const id of ids)if(CollectionUI.def('pets',id)?.variant===5)PetGrowth.cast(id);for(const u of B.units)if(!before.has(u)){u.born=t;produced++;}for(const p of S.portal.board)assert.ok(Number.isInteger(p.charge));}return produced;}
c.pets.pets_5_2=1;c.pets.pets_5_5=1;const productionReport=[];
for(const lifetime of [6,12,30,120]){const base=production([null,null],lifetime),speed=production(['pets_5_2',null],lifetime),charge=production(['pets_5_5',null],lifetime),both=production(['pets_5_2','pets_5_5'],lifetime);assert.ok(speed>=base&&charge>=base);assert.ok(both<=base*1.8,'combined production bounded');productionReport.push({lifetime,base,speed,charge,both});}
console.log(JSON.stringify({probabilityChecks:checks,curveChecks,budgetChecks,productionReport}));
`,ctx);
