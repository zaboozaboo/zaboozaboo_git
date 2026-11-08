const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
let saved;const context=vm.createContext({console,Math,Date,window:{},assert,localStorage:{setItem:(k,v)=>saved=v,getItem:()=>saved}});
for(const file of ['data','state','kingdom','dice','formation','battle'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',file+'.js'),'utf8'),context);
vm.runInContext(`
for(const cls of Object.keys(CLASSES)){
 newGame({name:'test',gender:'m',cls,nation:'aurum'});
 for(let tier=0;tier<4;tier++){
  S.lord.promo=tier;const pool=skillPool();assert.equal(pool.length,8+tier*4);assert.equal(pool.filter(sk=>sk.type==='active').length,2+tier*2);assert.equal(pool.filter(sk=>sk.type==='passive').length,6+tier*2);
  assert.ok(pool.every(sk=>sk.cls===cls&&sk.tier<=tier));
 }
}
newGame({name:'test',gender:'m',cls:'knight',nation:'aurum'});
assert.equal(equippedLordSkill().id,null);assert.equal(Object.keys(ensureLordSkills().owned).length,0);assert.equal(skillReady(),false);const first=drawLordSkills(1,()=>0);assert.equal(LORD_SKILL_BY_ID[first[0].id].type,'active');assert.equal(equippedLordSkill().id,null);assert.equal(S.lordSkills.tutorial,'equip');equipLordSkill(first[0].id);assert.equal(S.lordSkills.tutorial,'done');S.daily.freeSkillSummon=1;
S.lordSkills={owned:{knight:5,mage:2},equipped:'mage'};
assert.equal(equippedLordSkill().id,null);assert.equal(skillLevel(S.lordSkills.owned.knight_a0),5);assert.equal(S.lordSkills.owned.mage_a0,2);
assert.equal(equipLordSkill('mage_a0'),false);
assert.deepEqual([1,2,3,4,6,7,10,11].map(skillLevel),[1,2,2,3,3,4,4,5]);
let gems=S.gems;assert.equal(drawLordSkills(1,()=>0).length,1);assert.equal(S.gems,gems);assert.equal(S.daily.freeSkillSummon,0);
assert.equal(drawLordSkills(2),null);S.gems=899;assert.equal(drawLordSkills(10),null);assert.equal(S.gems,899);
S.gems=1000;const draws=drawLordSkills(10,()=>.999);assert.equal(S.gems,100);assert.ok(draws.every(r=>LORD_SKILL_BY_ID[r.id].tier===0&&LORD_SKILL_BY_ID[r.id].cls==='knight'));
S.lord.promo=3;const k=ensureLordSkills();for(const sk of skillPool())k.owned[sk.id]=4;
startStage(1);spawnLord(0);const lord=B.units.find(u=>u.isLord),before=lord.atk;
assert.equal(equipLordSkill('knight_p2',0),true);assert.ok(lord.atk>before);const atk=lord.atk;
assert.equal(equipLordSkill('knight_p2',1),true);assert.equal(k.passives.filter(id=>id==='knight_p2').length,1);assert.equal(lord.atk,atk);
assert.equal(equipLordSkill('knight_p1',4),false);
for(let i=0;i<4;i++)assert.equal(equipLordSkill('knight_p'+i,i),true);assert.equal(k.passives.filter(Boolean).length,4);
B.skillT=10;equipLordSkill('knight_a1');assert.equal(B.skillT,10);
for(const cls of Object.keys(CLASSES)){
 S.lord.cls=cls;S.lord.promo=3;const skills=ensureLordSkills();
 for(const sk of skillPool().filter(sk=>sk.type==='active')){
  skills.owned[sk.id]=4;equipLordSkill(sk.id);startStage(1);spawnLord(0);const enemy=spawnEnemy('goblin',1);const hp=enemy.hp;B.skillT=0;B.pCastle.hp=1;
  assert.equal(castSkill(),true);assert.ok(B.skillT>0);assert.equal(B.skillCue.name,sk.name);
  if(sk.effect==='strike')assert.ok(enemy.hp<hp);
  if(sk.effect==='meteor')assert.equal(B.fx.filter(f=>f.type==='meteor').length,3);
  if(['heal','sanctuary'].includes(sk.effect))assert.ok(B.pCastle.hp>1);
  if(sk.effect==='guard')assert.ok(B.buffs.sanctuary>0);
  if(sk.effect==='rally')assert.ok(B.buffs.rallyPower>0);
 }
}
S.daily.date='2000-01-01';checkDaily();ensureLordSkills();assert.equal(S.daily.freeSkillSummon,1);S.daily.freeSkillSummon=0;saveGame();const prior=JSON.stringify(S.lordSkills);S=null;loadGame();ensureLordSkills();assert.equal(JSON.stringify(S.lordSkills),prior);assert.equal(S.daily.freeSkillSummon,0);
`,context);
console.log('PASS: all class/tier pools, legacy migration, cumulative levels, draw costs, 4 passive slots, live stats, all 24 active skills, daily reset and save reload');
