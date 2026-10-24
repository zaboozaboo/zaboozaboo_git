const assert=require('node:assert/strict'),Battle=require('./crowd-engine');
function advance(b,seconds,command=false){while(!b.done&&b.time<seconds){if(command)b.skill();b.tick(1/30);}return b;}
for(const size of [40,80,120,1000]){const b=new Battle(size);assert.equal(b.units.length,size);assert(!('prisons' in b));assert(!('rescue' in b));assert.equal(b.units.filter(u=>u.kind==='lord').length,2);assert.equal(b.allies.length,size*.15);}
const layout=new Battle();const platoons=layout.squads.filter(s=>s.team&&s.kind!=='lord');assert.equal(platoons.length,48);for(const s of platoons){const members=layout.units.filter(u=>u.squadId===s.id);assert(members.length<=18);assert.equal(members.filter(u=>u.kind==='captain').length,1);assert.equal(members.find(u=>u.kind==='captain').id,s.captainId);}
const captain=layout.enemies.find(u=>u.kind==='captain');layout.damage(layout.allies[0],captain,captain.hp);assert(layout.squads[captain.squadId].leaderDown);assert(layout.events.some(e=>e.type==='captain-down'));
const control=new Battle();for(const u of control.units)if(u.kind==='lord')u.hp=0;advance(control,30);
const losses=control.events.filter(e=>e.type==='kill');
assert(losses.filter(e=>e.team===0).length>10,'Allied soldiers suffer ongoing attrition without heroes');
assert(losses.filter(e=>e.team===1).length>10,'Enemy soldiers suffer ongoing attrition without heroes');
assert(losses[0].time<12,'Contact must produce visible losses promptly');
const withoutAllyHero=new Battle();withoutAllyHero.allies.find(u=>u.kind==='lord').hp=0;advance(withoutAllyHero,30);
const withHero=new Battle();advance(withHero,30);assert(withHero.enemies.length<withoutAllyHero.enemies.length-10,'An allied hero accelerates enemy losses against the same enemy army and commander');
const idleHero=new Battle(),idle=idleHero.allies.find(u=>u.kind==='lord');idle.speed=0;idle.range=0;idle.atk=0;advance(idleHero,8);assert(idleHero.allies.some(u=>u.kind!=='lord'&&u.y<idle.y-30),'Soldiers may advance beyond a stationary hero');
const b=new Battle(),ids=b.units.map(u=>u.id);const enemyHero=b.enemies.find(u=>u.kind==='lord');let advancedFollowers=0;
while(!b.done){b.skill();b.tick(1/30);if(b.frames%30===0){
 advancedFollowers=Math.max(advancedFollowers,b.allies.filter(u=>u.kind!=='lord'&&u.y<1200).length);
 for(const u of b.units){assert(Number.isFinite(u.x)&&Number.isFinite(u.y));if(u.hp>0&&u.team&&u.kind!=='lord')assert(u.y<=u.homeY+8.001&&u.y>=u.homeY-12.001);}
}}
assert.equal(b.result,'victory');assert(enemyHero.kills>=5,'Enemy commander actually destroys troops');assert(enemyHero.hp<=0);assert(advancedFollowers>20,'Soldiers follow into conquered ground');assert.deepEqual(b.units.map(u=>u.id),ids);assert(b.events.some(e=>e.type==='kill'&&e.by==='lord'));
const time=b.time;b.tick(1/30);assert.equal(b.time,time);
const skill=new Battle();assert(skill.skill());assert(!skill.skill());skill.allies.find(u=>u.kind==='lord').hp=0;skill.skillCooldown=0;assert(!skill.skill());
console.log('PASS: no prisoners or spawning; soldier-only line',control.front.toFixed(0),'hero victory',b.time.toFixed(1),'seconds; enemy commander kills',enemyHero.kills,'followers beyond middle line',advancedFollowers);
