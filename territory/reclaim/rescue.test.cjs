const assert=require('node:assert/strict');
const Battle=require('./rescue-engine');
function run(step,skill=false){
 const b=new Battle,initial=new Set(b.units.filter(u=>u.team===1).map(u=>u.id));
 assert.equal(initial.size,8);assert.equal(b.units.filter(u=>u.team===1&&u.active).length,0);
 const homes=b.units.filter(u=>u.team===1&&u.group===3).map(u=>[u.id,u.x,u.y]);
 for(let i=0;i<30000&&!b.done;i++){
  if(skill)b.skill();b.tick(step);
  assert(b.units.filter(u=>u.team===1).every(u=>initial.has(u.id)),'No enemy is spawned');
  if(b.time<3)for(const [id,x,y] of homes){const u=b.units.find(u=>u.id===id);assert.equal(u.x,x);assert.equal(u.y,y);}
  for(const u of b.units)assert(u.x>=24&&u.x<=336&&Number.isFinite(u.y),'Units stay on field');
 }
 assert.equal(b.phase,'victory');assert.equal(b.gold,110);assert.equal(b.kills,8);
 const rescues=b.events.filter(e=>e.type==='rescue');
 assert.deepEqual(rescues.map(e=>e.count),[1,1,2]);assert.deepEqual(rescues.map(e=>e.total),[1,2,4]);
 assert(rescues[1].time-rescues[0].time>3);assert(rescues[2].time-rescues[1].time>3);
 for(const group of [1,2])assert(b.events.some(e=>e.type==='impact'&&e.attacker==='militia'&&e.targetGroup===group&&e.time<rescues[group].time),'Earlier prisoners fight to free later prisoners');
 assert(!b.events.some(e=>e.type==='wave'||e.type==='joined'),'No waves or assembly pause');
 const gold=b.gold;b.tick(step);assert.equal(b.gold,gold);return b;
}
for(const step of [1/30,1/60,1/120])console.log('Victory',run(step).time.toFixed(1),'sec at dt',step);
assert(run(1/60,true).time<run(1/60).time);
const b=new Battle;b.skill();assert(!b.skill());
const target=b.units.find(u=>u.team===1),attacker=b.add('militia',0,target.x,target.y+20),hp=target.hp;b.tick(.01);assert.equal(target.hp,hp,'Axe damage waits for authored impact frame');
const fail=new Battle;fail.units=fail.units.filter(u=>u.team===1);fail.tick(.01);assert.equal(fail.phase,'defeat');assert(!fail.skill());
console.log('PASS: preplaced garrisons hold, 1/1/2 rescue, militia frees next group, no assembly/waves, skill, delayed hit, defeat, reward once.');
const push=run(1/60),lastRescue=push.events.filter(e=>e.type==='rescue').at(-1);
assert(push.lineContactAt<lastRescue.time-2,'Outnumbered road party holds before final rescue');
assert(push.breakAt>lastRescue.time,'Reinforcements must reach the line before breakthrough');
assert(push.pushes>=7,'Multiple real attacks push the line before it breaks');
const unsupported=new Battle;
while(!unsupported.done){unsupported.tick(1/60);unsupported.units=unsupported.units.filter(u=>u.origin!==2);}
assert(!unsupported.lineBroken,'Removing final rescued soldiers prevents collective breakthrough');
assert.equal(unsupported.phase,'defeat','Same frontline cannot be overcome by the small unsupported force');
console.log('PASS: stalled front, rescue before breakthrough, repeated physical shoves, no reinforcement control loses.');
const rear=new Battle;while(rear.rescued<4)rear.tick(1/60);
const holdingLord=rear.alive.find(u=>u.kind==='lord');
for(const u of rear.alive.filter(u=>u.origin===2))assert(u.y>holdingLord.y+100,'Final prisoners join from behind the friendly frontline');
assert(!rear.lineBroken,'Freeing the prisoners alone does not break the line');
console.log('PASS: rear rescue physically behind holding lord; travel and fighting still required.');
