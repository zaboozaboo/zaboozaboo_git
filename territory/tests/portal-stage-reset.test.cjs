const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const c=vm.createContext({console,assert,Math,Date,window:{},localStorage:{setItem(){}},UI:{toast(){}}});
for(const f of ['data','state','kingdom','dice','formation','battle','forge-balance','portal-master-data','portal','portal-balance'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',f+'.js'),'utf8'),c);
vm.runInContext(`
newGame({name:'reset',gender:'m',cls:'knight',nation:'aurum'});Portal.ensure();
const make=v=>({id:'pm_0_'+v,level:12,charge:4,options:[{key:'atk',value:.1}]});
S.portal.board=[make(0),make(2),make(4)];S.portal.pending=make(1);S.portal.reserve=[make(3)];
const board=S.portal.board.map(p=>({id:p.id,level:p.level,options:JSON.stringify(p.options)}));
for(const result of ['win','lose']){
 Portal.startStage(1);Portal.produce(0,6);B.projs=[{}];B.diceCue={old:true};Portal.autoElapsed=2.9;
 B.result=result;Portal.finish();
 assert.equal(B.units.length,0);assert.equal(B.projs.length,0);assert.equal(B.diceCue,null);assert.equal(Portal.autoElapsed,0);
 for(const p of [...S.portal.board,S.portal.pending,...S.portal.reserve])assert.equal(p.charge,0);
 assert.deepEqual(S.portal.board.map(p=>({id:p.id,level:p.level,options:JSON.stringify(p.options)})),board);
 assert.equal(B.stage,result==='win'?2:1);
 Portal.tickAuto(.95);Portal.spawnPhase(.95);assert.equal(B.units.length,0);
 Portal.tickAuto(.05);Portal.spawnPhase(.05);assert.equal(B.units.filter(u=>u.team===0).length,0);Portal.tickProduction(1.3);assert.equal(B.units.filter(u=>u.team===0).length,3);assert.equal(B.masterWaveIndex,0);assert.equal(S.portal.faces.production,6);
 for(let i=0;i<40;i++)Portal.spawnPhase(.05);
 assert.equal(B.masterWaveIndex,1);Portal.spawnPhase(.05);assert.equal(B.masterWaveIndex,1,'opening spawns only once');
 const rolls=S.dice.rolls;Portal.tickAuto(2.9);assert.equal(S.dice.rolls,rolls);Portal.tickAuto(.1);assert.equal(S.dice.rolls,rolls);Portal.tickProduction(1.3);assert.equal(S.dice.rolls,rolls+1);
}
S.portal.maxStage=100;B.result=null;assert.ok(Portal.enterDungeon('Hammer'));assert.equal(B.units.length,0);assert.ok(S.portal.board.every(p=>p.charge===0));
Portal.tickAuto(1);Portal.tickProduction(1.3);assert.ok(B.units.some(u=>u.team===0));Portal.leaveDungeon(false);assert.equal(B.units.length,0);assert.ok(S.portal.board.every(p=>p.charge===0));assert.equal(B.masterWaveIndex,0);
`,c);
console.log('PASS win/retry/dungeon reset, permanent roster, first production at 1s, enemies at 3s, regular cadence');
