const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const c=vm.createContext({assert,Image:class{},S:{portal:{}},B:{time:1,result:null,units:[{team:0,hp:100,x:600,y:160,speed:120}]},W:1200,LANE_W:320,CollectionUI:{ensure:()=>({equipped:{pets:['wolf','dragon']}}),def:(_,id)=>({variant:id==='wolf'?0:3})},Portal:{tick(){}},PetGrowth:{cast(){}},cameraFocus:()=>600});
vm.runInContext(fs.readFileSync(__dirname+'/../js/portal-pet-field.js','utf8'),c);
vm.runInContext(`
PetField.tick(.016);assert.equal(PetField.actors.length,2);assert.equal(PetField.actors[0].x,572);assert.equal(PetField.actors[0].y,118);assert.equal(PetField.actors[1].y,202);
B.units[0].x=680;B.units[0].y=210;const x=PetField.actors[0].x,y=PetField.actors[0].y;Portal.page='growth';Portal.tick(.1);assert.ok(PetField.actors[0].x>x);assert.ok(PetField.actors[0].y>y);assert.equal(B.units.length,1);
B.time=0;B.units[0].x=600;PetField.tick(.016);assert.equal(PetField.actors[0].x,572);
`,c);console.log('PASS pet spawn beside troops, lateral following, catch-up during menus, battle reset, no combat-unit insertion');
vm.runInContext(`
let shots=0;PetGrowth.basicAttack=(id,target)=>{shots++;target.hp-=1;return true;};
PetField.actors.forEach(p=>p.attackT=0);B.units.push({team:1,hp:100,x:650,y:160});PetField.tick(.1);assert.equal(shots,2);assert.equal(PetField.effects.length,2);PetField.tick(.1);assert.equal(shots,2);PetField.tick(2);assert.equal(shots,4);
B.units=B.units.filter(u=>u.team===1);PetField.tick(3);assert.equal(shots,4);
`,c);console.log('PASS both pets attack with cooldown and effects; no solo pet damage without army');
