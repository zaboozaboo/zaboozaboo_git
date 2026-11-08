const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const c=vm.createContext({console,Math,Date,assert,localStorage:{setItem(){}}});
for(const name of ['data','state','kingdom','dice','formation','battle','poly-dice'])vm.runInContext(fs.readFileSync('territory/js/'+name+'.js','utf8'),c);
vm.runInContext(`
for(let tier=0;tier<4;tier++){
 newGame({name:'dice',gender:'m',cls:'knight',nation:'aurum'});S.lord.promo=tier;
 const sides=[6,8,10,12][tier];assert.equal(diceSides(),sides);
 for(let n=1;n<=sides;n++){
  S.dice.charge={};B.units=[];B.fx=[];
  const roll=rollProduction(()=>(n-.5)/sides);assert.equal(roll.face,n);
  for(const r of roll.results)assert.equal(r.charge+r.count*r.cost,r.before+n,'face charges each deployed hero');
 }
 assert.equal(rollProduction(()=>0).face,1);assert.equal(rollProduction(()=>.999999).face,sides);
 if(sides>6){const g=PolyDice.geometry(sides);assert.equal(g.faces.length,sides);assert.ok(g.faces.every(f=>f.ids.length===({8:3,10:4,12:5})[sides]));}
}
console.log('PASS: D6/D8/D10/D12 ranges, charge conservation, actual polyhedron faces');
`,c);
