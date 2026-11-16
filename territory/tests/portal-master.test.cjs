const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
let clock=100000;
const context=vm.createContext({console,Math,Date,window:{},localStorage:{setItem(){}},UI:{toast(){}},assert});
// Date construction is used by legacy state helpers; retain the real constructor with controlled now.
context.Date=class extends Date{static now(){return clock;}};
for(const file of ['data','state','kingdom','dice','formation','battle','forge-balance','portal-master-data','portal','portal-balance','portal-features'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',file+'.js'),'utf8'),context);
vm.runInContext(`
const clamp01=n=>Math.max(0,Math.min(1,n));
newGame({name:'master',gender:'m',cls:'knight',nation:'aurum'});Portal.ensure();startStage(1);
assert.equal(slotCount(),3);assert.equal(PM_UNITS.length,60);assert.equal(FORGE_BALANCE.odds.length,35);assert.equal(FORGE_BALANCE.stages.length,630);
for(let era=0;era<10;era++)for(let role=0;role<3;role++)assert.equal(PM_UNITS.filter(d=>d.era===era&&d.role===role).length,2);
assert.equal(S.portal.board.length,3);assert.equal(B.masterWaves.length,2);assert.equal(B.units.some(u=>u.isLord),false);
for(let role=0;role<3;role++){S.portal.supply=100;Portal.rollingUntil=0;const r=Portal.rollPaid(()=>0);assert.ok(r);assert.equal(Portal.def(S.portal.pending).role,role);assert.equal(S.portal.pending.level,1);assert.equal(Portal.place((role+1)%3),false);assert.equal(Portal.place(role),true);}
assert.ok(S.portal.board.every(Boolean));
const charge=S.portal.board[0].charge;tickDice(30);assert.equal(S.portal.board[0].charge,charge);
S.portal.mode='production';S.portal.supply=100;Portal.rollingUntil=0;Portal.rollProduction(()=>.99);Portal.tickProduction(1.3);assert.equal(S.portal.supply,100);assert.ok(B.units.some(u=>u.team===0));
const veteran=B.units.find(u=>u.team===0&&u.slot===0);const hp=veteran.hp,atk=veteran.atk;S.portal.pending={id:'pm_0_1',level:10,options:[],charge:0};assert.ok(Portal.place(0));assert.ok(B.units.includes(veteran));assert.equal(veteran.hp,hp);assert.equal(veteran.atk,atk);Portal.produce(0,7);assert.ok(B.units.some(u=>u.heroId==='pm_0_1'));
S.portal.pending={id:'pm_0_0',level:1,charge:0,options:[]};const gold=S.gold;Portal.sell();assert.equal(S.gold,gold+20);assert.equal(S.portal.xp,20);assert.ok(B.units.includes(veteran));
S.portal.forgeRolls=8;S.gold=10000;assert.equal(Portal.payUpgrade(),true);assert.equal(S.portal.forgeLevel,1);assert.equal(S.portal.upgrade.level,2);assert.equal(Portal.skipUpgrade(),true);assert.equal(S.portal.forgeLevel,2);assert.equal(Portal.skipUpgrade(),false);
S.portal.mode='portal';S.portal.pending=null;S.portal.supply=100;Portal.rollingUntil=0;Portal.rollPaid(()=>.999);assert.equal(Portal.def(S.portal.pending).era,1,'Level two unlocks age one probability');
const key='0:0';S.portal.brackets[key]=0;S.portal.seen[key]=[];S.portal.forgeRolls=10;S.portal.forgeLevel=1;const first=Portal.draw(()=>0),second=Portal.draw(()=>0);assert.equal(first.level,1);assert.equal(second.level,6);assert.notEqual(first.id,second.id);
S.portal.forgeLevel=8;S.portal.paid=0;S.portal.upgrade=null;S.gold=100000;assert.equal(Portal.payUpgrade(),true);assert.equal(S.portal.paid,8500);assert.equal(S.portal.upgrade,null);Portal.payUpgrade();Portal.payUpgrade();assert.equal(S.portal.upgrade.level,9);assert.equal(Portal.skipUpgrade(),false);
S.portal.upgrade.endsAt=Date.now()-1;assert.ok(Portal.completeUpgrade());assert.equal(S.portal.forgeLevel,9);
const unit={id:'pm_3_2',level:12,options:[{key:'atk',value:.1},{key:'haste',value:.2}],charge:0};const stats=Portal.stats(unit);assert.ok(stats.atk>0);assert.ok(stats.cd>0);
const target={team:0,hp:100,armor:10,flash:0,size:7};B.fx=[];dealDamage(target,15,null);assert.equal(target.hp,95);
S.portal.supply=0;const rolls=S.dice.rolls;Portal.tickAuto(3);Portal.tickProduction(1.3);assert.ok(S.dice.rolls>rolls);assert.equal(S.portal.supply,0);
const before=S.portal.supply;Portal.rollingUntil=0;Portal.tickAuto(10);assert.equal(S.portal.supply,before,'Pending result blocks auto spend');
// Migrate all five previous portals without losing extras or progress records.
newGame({name:'old',gender:'m',cls:'knight',nation:'aurum'});S.gold=12345;S.portal={stage:15,maxStage:20,supply:200,board:['militia','archer','monk','paladin','ranger'].map(id=>({id,tier:2,level:7,charge:2.5})),pending:null};Portal.ensure();assert.equal(S.gold,12345);assert.equal(S.portal.legacy.maxStage,20);assert.equal(S.portal.board.filter(Boolean).length,3);assert.equal(S.portal.reserve.length+(S.portal.pending?1:0),2);
console.log('PASS reference tables, 60 units/3 roles, stage waves, free automatic production, role replacement/veteran stats, sale/XP, probability upgrades, bracket progression, installments/timers, options, armor, production independent of summons, save migration');
`,context);
context.advanceClock=ms=>{clock+=ms;};
vm.runInContext(`
newGame({name:'play',gender:'m',cls:'knight',nation:'aurum'});Portal.ensure();startStage(1);S.portal.supply=120;
for(let i=0;i<3;i++){Portal.rollingUntil=0;Portal.rollPaid(()=>0);Portal.place(i);}
for(let i=0;i<12000;i++){advanceClock(50);updateBattle(.05);}
assert.ok(S.portal.maxStage>1,'A fresh three-role army must progress');assert.ok(S.portal.supply>=0);assert.ok(B.units.length<100);
console.log('PASS fresh 10-minute simulation; highest stage',S.portal.maxStage,'supply',Math.floor(S.portal.supply));
`,context);
vm.runInContext(`
S.portal.pending=null;S.portal.reserve=[];Portal.comparing=false;Portal.rollingUntil=0;S.portal.forgeLevel=1;S.portal.supply=100;S.portal.autoKeep=[1];const autoGold=S.gold;
assert.equal(Portal.startAuto(),false,'zero probability cannot be selected');S.portal.forgeLevel=2;S.portal.autoKeep=[1];const oldDraw=Portal.draw;Portal.draw=function(){return oldDraw.call(this,()=>0);};Portal.startAuto();Portal.tickSummon(2);assert.equal(S.portal.supply,99);assert.equal(S.portal.pending,null);assert.ok(S.gold>autoGold);assert.equal(Portal.summonAuto,true);
Portal.rollingUntil=0;S.portal.autoKeep=[0];Portal.tickSummon(2);assert.ok(S.portal.pending);assert.equal(Portal.summonAuto,true);assert.equal(Portal.autoAwaitingCards,true);assert.equal(Portal.comparing,true);
Portal.comparing=false;Portal.startAuto();const heldSupply=S.portal.supply;Portal.tickSummon(5);assert.equal(S.portal.supply,heldSupply,'unresolved unit waits');
S.portal.pending=null;S.portal.supply=0;Portal.tickSummon(5);assert.equal(S.portal.supply,0);assert.equal(Portal.summonStatus,'보급 부족');assert.equal(Portal.summonAuto,false);
Portal.draw=oldDraw;console.log('PASS auto summon costs, auto sell, keep-stop, pending/insufficient wait, research effects');
`,context);

vm.runInContext(`
S.portal.maxStage=21;S.portal.pending=null;B.result=null;const campaign=S.stage;const beforeSupply=S.portal.supply;
assert.ok(Portal.enterDungeon('Hammer'));assert.equal(Portal.dungeonState().Hammer.keys,1);assert.equal(Portal.enterDungeon('Hammer'),false);
assert.ok(Portal.leaveDungeon(true));assert.equal(S.stage,campaign);assert.equal(S.portal.supply,beforeSupply+60);assert.equal(Portal.leaveDungeon(true),false);assert.equal(Portal.dungeonState().Hammer.level,1);
assert.equal(Portal.enterDungeon('Potion'),false);advanceClock(86400000);assert.equal(Portal.dungeonState().Hammer.keys,2);
S.portal.maxStage=71;S.portal.materials.TechPotions=100;const node=Portal.techNodes().find(n=>n.Requirements==='[]');assert.ok(node);const id=node.BranchKey+':'+node.NodeId;
assert.ok(Portal.upgradeResearch(id));assert.equal(S.portal.materials.TechPotions,80);assert.equal(Portal.claimResearch(),false);advanceClock(60000);assert.ok(Portal.claimResearch());assert.equal(S.portal.tech[id],1);
assert.equal(Portal.claimResearch(),false);assert.equal(Portal.rate(),1/60);assert.equal(Portal.rollPrice(),1);
console.log('PASS dungeon gate, keys, reward once, campaign return, daily refill; research currency, timer and claim');
`,context);
