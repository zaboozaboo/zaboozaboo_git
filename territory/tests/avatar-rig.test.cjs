const assert=require('node:assert/strict'),R=require('../js/avatar-rig.js');
for(const speed of [.2,.55,.8]){
 for(const offset of [0,.5])for(let cycle=0;cycle<5;cycle++){
  const start=(cycle-offset+.01)*R.period,end=(cycle-offset+R.stance-.01)*R.period;
  assert.equal(R.foot(start,speed,offset).x,R.foot(end,speed,offset).x,'planted foot must remain fixed in world space');
 }
 for(let i=0;i<600;i++){
  const p=R.pose(i/60,{speed});
  for(const l of p.legs){assert(l.error<1e-6,'feet reachable');assert(Math.abs(R.len(R.sub(l.hip,l.knee))-.42)<1e-6);assert(Math.abs(R.len(R.sub(l.knee,l.ankle))-.43)<1e-6);assert(l.ankle[2]>=.0749);}
 }
}
for(const mode of ['walk','idle','attack'])for(let i=0;i<300;i++){
 const p=R.pose(i/60,{mode});assert.equal(p.axe.hand,p.arms[1].hand,'axe stays in same hand');assert(Math.abs(R.len(p.axe.shaft)-1)<1e-9);assert(Math.abs(p.axe.shaft.reduce((s,x,j)=>s+x*p.axe.blade[j],0))<1e-9);
 if(mode!=='walk')assert.equal(p.root,0);
}
console.log('PASS: planted world feet, IK limb lengths, reachable feet across speed range, rigid axe and fixed weapon hand.');
