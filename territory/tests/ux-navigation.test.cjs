const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ctx=vm.createContext({console,Math,Date,window:{},document:{addEventListener(){},querySelector(){return {scrollTop:123}}},assert});
for(const f of ['data','state','kingdom','dice','formation','battle','ui','ux-navigation'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',f+'.js'),'utf8'),ctx);
vm.runInContext(`
newGame({name:'UX',gender:'m',cls:'knight',nation:'aurum'});
S.heroes.paladin={level:2,stars:1,shards:0};S.gold=10000;
UX.filter='deployed';assert.deepEqual(Array.from(UX.heroIds()).sort(),['archer','militia']);
UX.filter='reserve';assert.deepEqual(Array.from(UX.heroIds()),['paladin']);
UX.filter='upgrade';S.gold=0;assert.equal(UX.heroIds().length,0);
S.gold=10000;UX.filter='all';UX.sort='level';assert.equal(UX.heroIds()[0],'paladin');
UX.sort='cost';const costs=UX.heroIds().map(heroLevelCost);assert.ok(costs.every((c,i)=>!i||c>=costs[i-1]));
assert.equal(UX.group('promo'),'lord');assert.equal(UX.group('kingdom'),'lobby');
UI.tab='territory';UI.panelView='heroes';UX.remember();assert.equal(UX.views.territory,'heroes');assert.equal(UX.scroll['territory:heroes'],123);
UI.tab='lord';UI.panelView='main';UX.remember();assert.equal(UX.views.territory,'heroes');assert.equal(UX.scroll['lord:main'],123);
`,ctx);
console.log('PASS: ownership filters, affordability, sorting, parent navigation, per-tab memory');
