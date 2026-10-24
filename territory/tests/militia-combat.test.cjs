const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({console,Math,Date,URL,assert,document:{currentScript:{src:'http://localhost/js/militia-combat.js'}},window:{},localStorage:{setItem(){}}});
for(const f of ['data','state','kingdom','dice','formation','battle','militia-combat'])vm.runInContext(fs.readFileSync(`territory/js/${f}.js`,'utf8'),c);
vm.runInContext(`
newGame({name:'test',gender:'m',cls:'knight',nation:'aurum'});
const u={heroId:'militia',kind:'melee',atkCd:1.5,id:0,moving:true};
assert(MilitiaCombat.accepts(u));assert(!MilitiaCombat.accepts({...u,heroId:'archer'}));assert(!MilitiaCombat.accepts({...u,isLord:true}));
assert.equal(MilitiaCombat.state(u,.3,false).clip,'walk');
assert.deepEqual(MilitiaCombat.state({...u,moving:false},.3,false),{clip:'attack',index:0});
u.meleeStartedAt=10;
const indices=[0,.27,.47,.67,.77,1].map(t=>MilitiaCombat.state(u,10+t,false).index);
assert.deepEqual(indices,[0,1,2,3,4,5]);
assert.equal(MilitiaCombat.state(u,12,false).clip,'walk');
assert.equal(MilitiaCombat.state(u,10.5,true).index,0);
B.time=30;B.fx=[];B.buffs={rally:0,sanctuary:0};
const src={...u,team:0,atk:1,face:1},target={team:1,hp:20,x:100,y:100};attack(src,target);
assert.equal(src.meleeStartedAt,30);assert.equal(src.cdT,src.atkCd);assert.equal(target.hp,20,'no damage during windup');
const contact=src.pendingMeleeHit.at;
B.time=contact-.001;resolveMilitiaHit(src);assert.equal(target.hp,20);
B.time=contact+.000001;assert.equal(MilitiaCombat.state(src,B.time,false).index,4,'damage on frame 5');
resolveMilitiaHit(src);assert(target.hp<20);const hp=target.hp;resolveMilitiaHit(src);assert.equal(target.hp,hp,'exactly once');
for(const cd of [.6,1,2]){src.atkCd=cd;attack(src,target);B.time=src.pendingMeleeHit.at+.000001;assert.equal(MilitiaCombat.state(src,B.time,false).index,4);resolveMilitiaHit(src);}
attack(src,target);target.hp=0;B.time=src.pendingMeleeHit.at;resolveMilitiaHit(src);assert.equal(target.hp,0);assert.equal(src.pendingMeleeHit,null);
const living={team:1,hp:20,x:100,y:100};attack(src,living);src.hp=0;B.time=src.pendingMeleeHit.at;resolveMilitiaHit(src);assert.equal(living.hp,20);src.hp=10;
B.eCastle={hp:100,maxHp:100};queueMilitiaHit(src,null,1);assert.equal(B.eCastle.hp,100);B.time=src.pendingMeleeHit.at;resolveMilitiaHit(src);assert(B.eCastle.hp<100);const castleHp=B.eCastle.hp;resolveMilitiaHit(src);assert.equal(B.eCastle.hp,castleHp);
const other={...src,heroId:'spear'};attack(other,living);assert(living.hp<20,'other melee unchanged');
console.log('PASS: militia filtering, walk/idle, all six attack poses, recovery, reduced motion, frame-5 damage at multiple speeds, exactly once, dead target/attacker, castle, other melee unchanged');
`,c);
