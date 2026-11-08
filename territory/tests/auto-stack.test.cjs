const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');let clock=100000;
const c=vm.createContext({console,assert,Math,Date:class extends Date{static now(){return clock}},window:{},localStorage:{setItem(){}},UI:{toast(){}},advance:()=>clock+=1000});
for(const f of ['data','state','kingdom','dice','formation','battle','forge-balance','portal-master-data','portal','portal-balance'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',f+'.js'),'utf8'),c);
vm.runInContext(`
newGame({name:'stack',gender:'m',cls:'knight',nation:'aurum'});Portal.ensure();saveGame=()=>{};let serial=0;Portal.draw=()=>({id:'pm_0_0',level:++serial,charge:0,options:[]});
const tick=()=>{advance();Portal.tickSummon(1);};
function reset(level){S.portal.forgeLevel=level;S.portal.pending=null;S.portal.reserve=[];S.portal.autoKeep=[0];S.portal.supply=100;S.portal.autoContinue=true;Portal.page=null;Portal.comparing=false;Portal.rollingUntil=0;Portal.startAuto();}
assert.equal(Portal.stackUnlockLevel(),6);
reset(5);tick();tick();assert.equal(Portal.stackCount(),1);assert.equal(S.portal.supply,99);assert.ok(Portal.autoAwaitingCards);Portal.sell();tick();assert.equal(Portal.stackCount(),1);assert.equal(S.portal.supply,98,'automatic resume');
reset(6);for(let i=0;i<20;i++)tick();assert.equal(Portal.stackCount(),20);assert.equal(S.portal.supply,80);assert.ok(Portal.summonAuto&&Portal.autoAwaitingCards);tick();assert.equal(S.portal.supply,80);assert.equal(Portal.rollPaid(),false,'manual cap');
const newest=S.portal.pending.level;Portal.sell();assert.equal(S.portal.pending.level,newest-1,'newest first');tick();assert.equal(S.portal.supply,80,'full pause until stack resolved');while(S.portal.pending)Portal.sell();tick();assert.equal(Portal.stackCount(),1);assert.equal(S.portal.supply,79);
reset(6);tick();tick();const retained=S.portal.pending;S.portal.autoKeep=[1];tick();assert.equal(Portal.stackCount(),2);assert.equal(S.portal.pending,retained,'auto sale preserves existing kept cards');
Portal.comparing=true;const before=S.portal.supply;tick();assert.equal(S.portal.supply,before);Portal.comparing=false;Portal.page='growth';tick();assert.equal(S.portal.supply,before);Portal.page=null;tick();assert.equal(S.portal.supply,before-1);
reset(6);S.portal.autoContinue=false;tick();tick();assert.equal(Portal.stackCount(),1,'continue checkbox pauses on match');
reset(6);S.portal.supply=1;tick();assert.equal(S.portal.supply,0);assert.equal(Portal.summonAuto,false);tick();assert.equal(Portal.stackCount(),1);
reset(6);tick();tick();const saved=JSON.parse(JSON.stringify(S.portal));S.portal=saved;Portal.ensure();assert.equal(Portal.stackCount(),2);assert.equal(Portal.summonAuto,false);
for(const [stage,max] of [[35,1],[36,2],[65,2],[66,3]]){S.portal.maxStage=stage;assert.equal(Portal.maximumSummonBatch(),max);}
reset(6);S.portal.maxStage=66;S.portal.autoBatch=3;tick();assert.equal(Portal.stackCount(),3);assert.equal(S.portal.supply,97);
reset(6);S.portal.supply=2;tick();assert.equal(Portal.stackCount(),2);assert.equal(S.portal.supply,0);
reset(6);S.portal.reserve=Array.from({length:18},()=>({id:'pm_0_0',level:1,charge:0,options:[]}));S.portal.pending={id:'pm_0_0',level:1,charge:0,options:[]};tick();assert.equal(Portal.stackCount(),20);assert.equal(S.portal.supply,99,'partial batch at stack cap');
reset(5);tick();assert.equal(Portal.stackCount(),1,'pre-stack unlock pauses inside batch');assert.equal(S.portal.supply,99);
const tech=Portal.techValue;Portal.techValue=key=>key==='AutoForge'?1.9:0;assert.equal(Portal.maximumSummonBatch(),4);Portal.techValue=tech;
S.portal.autoFilter=true;S.portal.autoOptions=['crit'];S.portal.autoKeep=[0];assert.equal(Portal.autoMatches({id:'pm_0_0',options:[]}),false);assert.equal(Portal.autoMatches({id:'pm_0_0',options:[{key:'crit',value:.1}]}),true);S.portal.autoFilter=false;assert.equal(Portal.autoMatches({id:'pm_0_0',options:[]}),true);
`,c);console.log('PASS source Lv.6 / 20 cards, LIFO, partial costs, pause/resume, auto sale, manual cap, menus, opt-out, no funds and save reload');
