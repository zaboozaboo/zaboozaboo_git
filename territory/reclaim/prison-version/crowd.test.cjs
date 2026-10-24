const assert=require('node:assert/strict'),Battle=require('./crowd-engine');
function run(size,rescue,command=false){
 const b=new Battle(size),ids=b.units.map(u=>u.id);assert.equal(ids.length,size);
 assert.equal(b.allies.length,size/20);assert.equal(b.enemies.length,size*.65);
 assert.equal(b.enemies.filter(u=>u.kind==='lord').length,1);
 assert(!b.canRescue(0));assert(!b.rescue(0),'Occupied prisons cannot be opened at reset');
 let furthest=2000;
 while(!b.done){
  if(rescue)for(let i=0;i<3;i++)b.rescue(i);
  if(command)b.skill();b.tick(1/30);furthest=Math.min(furthest,b.front);
  if(b.frames%30===0)for(const u of b.units){
   assert(Number.isFinite(u.x)&&Number.isFinite(u.y));
   if(u.team&&u.hp>0)assert(u.y<=u.homeY+8.001&&u.y>=u.homeY-12.001,'Enemy ranks hold their own ground instead of flooding downhill');
  }
 }
 assert.deepEqual(b.units.map(u=>u.id),ids,'No offscreen waves or replacement soldiers');
 const t=b.time;b.tick(1/30);assert.equal(b.time,t);
 return {b,furthest};
}
for(const size of [40,80,120]){const {b}=run(size,true,true);assert.equal(b.result,'victory');assert.equal(b.rescued,size*.3);console.log(size,'command + rescue victory',b.time.toFixed(1));}
const {b:unsupported}=run(1000,false);assert.equal(unsupported.result,'defeat');assert(unsupported.enemies.length>350,'The starting army cannot clear most of the enemy force');
const {b:supported,furthest}=run(1000,true);assert.equal(supported.result,'victory');assert.equal(supported.rescued,300);assert(furthest<800,'Army reaches the enemy keep');
const rescues=supported.events.filter(e=>e.type==='rescue');assert.equal(rescues.length,3);assert(rescues[0].time>5&&rescues[0].time<40);assert(rescues[1].time>rescues[0].time+7);assert(rescues[2].time>rescues[1].time+7);
const b=new Battle;assert(b.skill());assert(!b.skill());b.allies.find(u=>u.kind==='lord').hp=0;b.skillCooldown=0;assert(!b.skill());
// At 1,000, all depth intervals from first rank to the keep already contain enemies.
for(let y=760;y<1500;y+=60)assert(b.enemies.some(u=>Math.abs(u.y-y)<45));
console.log('PASS: 1,000 actual soldiers; start 50 vs 650; no rescue defeat',unsupported.time.toFixed(1),'rescued victory',supported.time.toFixed(1),'survivors',supported.allies.length);
console.log('PASS: guarded prisons, sequential reinforcement, enemy commander, fixed enemy depth, finite positions, immutable roster, hero cooldown and death');
