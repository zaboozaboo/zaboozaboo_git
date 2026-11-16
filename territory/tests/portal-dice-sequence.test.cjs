const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const c=vm.createContext({console,assert,Math,Date,window:{},localStorage:{setItem(){}},UI:{toast(){}}});
for(const f of ['data','state','kingdom','dice','formation','battle','forge-balance','portal-master-data','portal','portal-balance'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',f+'.js'),'utf8'),c);
vm.runInContext(`
newGame({name:'dice',gender:'m',cls:'knight',nation:'aurum'});Portal.ensure();
S.portal.board=[{id:'pm_0_0',level:1,charge:0,options:[]},null,null];Portal.startStage(1);
assert.ok(Portal.rollProduction(()=>.99));assert.equal(Portal.rollProduction(()=>0),false);
Portal.tickProduction(.55);assert.equal(B.units.length,0);assert.equal(S.portal.board[0].charge,0);assert.equal(B.diceCue,null);
Portal.tickProduction(.3);assert.equal(B.diceCue.face,6);assert.equal(B.units.length,0);
Portal.tickProduction(.44);assert.equal(B.units.length,0);
Portal.tickProduction(.01);assert.equal(B.units.length,3);assert.equal(S.portal.board[0].charge,1);assert.ok(B.diceCue.applied);
const rolls=S.dice.rolls;Portal.tickProduction(10);assert.equal(S.dice.rolls,rolls);
Portal.rollProduction(()=>.99);Portal.startStage(2);Portal.tickProduction(2);assert.equal(B.units.length,0);assert.equal(S.portal.board[0].charge,0);
Portal.rollProduction(()=>.99);B.ended=true;Portal.tickProduction(2);assert.equal(B.units.length,0);
`,c);console.log('PASS roll → reveal → transfer → apply once; duplicate protection and stage/end cancellation');
