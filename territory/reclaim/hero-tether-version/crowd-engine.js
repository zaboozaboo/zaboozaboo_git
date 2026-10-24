/* Preplaced armies. Soldiers hold contact; heroes create breaches through combat. */
(function(root){
'use strict';
class CrowdBattle{
 constructor(size=1000){
  this.size=[40,80,120,1000].includes(size)?size:1000;this.factor=this.size/40;
  this.time=0;this.units=[];this.events=[];this.effects=[];this.id=0;this.done=false;this.result='';this.hits=0;this.front=1450;this.frames=0;
  this.seed=8741;this.squads=[];this.skillCooldown=0;this.skillUntil=0;
  const platoon=(team,count,x,y,kind='melee')=>{
   const s={id:this.squads.length,team,x,y,homeY:y,initial:count,kind,active:!team,order:'hold',targetId:null,retarget:0};this.squads.push(s);
   const cols=Math.min(8,Math.ceil(Math.sqrt(count)));
   const slots=[];
   for(let q=-2;q<=2;q++)for(let r=-2;r<=2;r++)if(Math.abs(q+r)<=2)slots.push({x:(q+r/2)*16.5,y:r*14.3});
   slots.sort((a,b)=>Math.hypot(a.x,a.y)-Math.hypot(b.x,b.y));
   const angle=(this.random()-.5)*.4;
   for(let i=0;i<count;i++){
    const clustered=team&&kind!=='lord',slot=slots[i%slots.length];
    const dx=clustered?slot.x*Math.cos(angle)-slot.y*Math.sin(angle):(i%cols-(cols-1)/2)*17;
    const dy=clustered?slot.x*Math.sin(angle)+slot.y*Math.cos(angle):Math.floor(i/cols)*17;
    const u=this.add(team,clustered&&i===0?'captain':kind,x+dx+(this.random()-.5)*2,y+dy);
    u.squadId=s.id;u.group=team?Math.floor((s.id-4)/4):0;u.active=s.active;u.homeY=u.y;u.homeX=u.x;
    if(u.kind==='captain')s.captainId=u.id;
   }

  };
  // Each platoon owns one order and target; soldiers only resolve local contact.
  platoon(0,1,200,1530,'lord');
  const count=6*this.factor-1;
  for(let i=0;i<3;i++)platoon(0,Math.floor(count/3)+(i<count%3?1:0),120+i*80,1540,i===1?'bow':'melee');
  // Every rank is present at reset, continuously from contact to the enemy keep.
  const enemyCount=34*this.factor-1, platoons=Math.min(48,Math.ceil(enemyCount/6));
  const rows=Math.ceil(platoons/4);
  for(let i=0;i<platoons;i++){
   const row=Math.floor(i/4),column=i%4;
   const n=Math.floor(enemyCount/platoons)+(i<enemyCount%platoons?1:0);
   const x=65+column*90+(row%2?7:-7)+(this.random()-.5)*6;
   const y=1460-row*(850/Math.max(1,rows-1))+[0,-18,8,-10][column]+(this.random()-.5)*6;
   platoon(1,n,x,y,(row+column)%4===3?'bow':'melee');
  }
  platoon(1,1,200,1340,'lord');


 }
 random(){this.seed=(this.seed*16807)%2147483647;return this.seed/2147483647;}
 add(team,kind,x,y){const lord=kind==='lord',captain=kind==='captain',hp=lord?(team?5200:12000):captain?600:240;const u={id:++this.id,team,kind,x,y,hp,maxHp:hp,atk:lord?(team?95:160):captain?12:2,range:lord?62:captain?30:kind==='bow'?80:23,speed:lord?32:team?18:38,cooldown:this.random()*.7,moving:false,flash:0,kills:0};this.units.push(u);return u;}

 get allies(){return this.units.filter(u=>!u.team&&u.hp>0);}
 get enemies(){return this.units.filter(u=>u.team&&u.hp>0);}
 skill(){const hero=this.allies.find(u=>u.kind==='lord');if(this.done||this.skillCooldown>0||!hero)return false;this.skillCooldown=8;this.skillUntil=this.time+.65;hero.burst=true;this.emit('command',{x:hero.x,y:hero.y});return true;}
 emit(type,data={}){this.events.push({type,time:this.time,...data});}
 damage(attacker,target,amount){
  if(target.hp<=0)return;target.hp-=amount;target.flash=.13;this.hits++;
  if(target.hp<=0){attacker.kills++;if(target.kind==='captain'){this.squads[target.squadId].leaderDown=true;this.emit('captain-down',{x:target.x,y:target.y});}this.effects.push({type:'fall',x:target.x,y:target.y,team:target.team,kind:target.kind,life:1.2,total:1.2});this.emit('kill',{team:target.team,by:attacker.kind,x:target.x,y:target.y});}
 }
 tick(dt){
  if(this.done)return;dt=Math.min(.05,Math.max(0,dt));this.time+=dt;this.frames++;this.skillCooldown=Math.max(0,this.skillCooldown-dt);
  this.effects=this.effects.filter(e=>(e.life-=dt)>0);
  const active=this.units.filter(u=>u.hp>0),allies=active.filter(u=>!u.team),enemies=active.filter(u=>u.team);
  for(const s of this.squads){
   s.members=active.filter(u=>u.squadId===s.id);
   if(!s.members.length)continue;
   s.x=s.members.reduce((n,u)=>n+u.x,0)/s.members.length;s.y=s.members.reduce((n,u)=>n+u.y,0)/s.members.length;
  }
  const living=this.squads.filter(s=>s.members?.length);
  for(const s of living){
   const foes=living.filter(v=>v.team!==s.team);
   if(s.team&&!s.active&&foes.some(v=>Math.hypot(v.x-s.x,v.y-s.y)<155)){
    // Adjacent platoons support the same company, while deeper ranks hold their ground.
    for(const v of living)if(v.team===s.team&&Math.abs(v.homeY-s.homeY)<30)v.active=true;
   }
   if(!s.active){s.order='hold';continue;}
   s.retarget-=dt;let target=living.find(v=>v.id===s.targetId&&v.team!==s.team);
   if(!target||s.retarget<=0){target=foes.reduce((best,v)=>!best||Math.hypot(v.x-s.x,(v.y-s.y)*1.25)<Math.hypot(best.x-s.x,(best.y-s.y)*1.25)?v:best,null);s.targetId=target?.id;s.retarget=2;}
   if(!target)continue;
   s.order='advance';
   s.goalX=target.x;s.goalY=s.order==='withdraw'?s.y+(s.team?-55:55):target.y;
  }
  const makeGrid=()=>{const g=new Map();for(const u of active){if(u.hp<=0)continue;const key=Math.floor(u.x/32)+','+Math.floor(u.y/32);if(!g.has(key))g.set(key,[]);g.get(key).push(u);}return g;};
  let grid=makeGrid();
  const near=(u,r)=>{const out=[];for(let x=Math.floor((u.x-r)/32);x<=Math.floor((u.x+r)/32);x++)for(let y=Math.floor((u.y-r)/32);y<=Math.floor((u.y+r)/32);y++){const cell=grid.get(x+','+y);if(cell)out.push(...cell);}return out;};
  const hero=allies.find(u=>u.kind==='lord');
  const claimed=new Map();
  for(const u of active){
   u.moving=false;u.flash=Math.max(0,u.flash-dt);u.cooldown-=dt;
   const squad=this.squads[u.squadId];
   if(u.hp<=0||!squad.active)continue;
   const enemySquad=this.squads[squad.targetId];
   const opponents=[...(enemySquad?.members||[]),...near(u,u.range).filter(v=>v.team!==u.team&&v.squadId!==enemySquad?.id&&Math.hypot(v.x-u.x,v.y-u.y)<u.range)];
   let target=null,best=Infinity;
   for(const v of opponents){if(v.hp<=0)continue;const d=Math.hypot(u.x-v.x,u.y-v.y);const score=d+(claimed.get(v.id)||0)*5-(u.kind==='lord'&&v.kind==='lord'&&d<110?80:0);if(score<best){best=score;target=v;}}
   if(!target)continue;claimed.set(target.id,(claimed.get(target.id)||0)+1);u.targetId=target.id;
   const following=!u.team&&u.kind!=='lord'&&hero&&u.y>hero.y+85;
   const dx=(following?hero.x+(u.homeX-200)*.35:target.x)-u.x,dy=(following?hero.y+48:target.y)-u.y,d=Math.hypot(dx,dy);u.face=dx>=0?1:-1;
   if(u.kind==='lord'&&u.burst){
    u.burst=false;u.swingAt=this.time;
    for(const v of near(u,115))if(v.team!==u.team&&Math.hypot(v.x-u.x,v.y-u.y)<115)this.damage(u,v,280);
    this.effects.push({type:'cleave',x:u.x,y:u.y,team:u.team,radius:115,life:.55,total:.55});
   }
   if(following||d>u.range){
    if(u.team&&d>110)continue;
    // Try nearby free space; never give the entire army one destination or fixed slots.
    let vx=dx/d,vy=dy/d;
    const cohesion=Math.hypot(u.x-squad.x,u.y-squad.y);
    if(!following&&!u.team&&cohesion>100){vx+=(squad.x-u.x)/cohesion*1.4;vy+=(squad.y-u.y)/cohesion*1.4;}
    for(const v of near(u,15)){if(v===u||v.hp<=0)continue;const ax=u.x-v.x,ay=u.y-v.y,ad=Math.hypot(ax,ay);if(ad>0&&ad<15){const force=(15-ad)/15*.8;vx+=ax/ad*force;vy+=ay/ad*force;}}
    const length=Math.hypot(vx,vy)||1;u.x+=vx/length*u.speed*dt;const stepY=vy/length*u.speed*dt;const lineY=hero?.y??this.front;u.y+=!u.team&&u.kind!=='lord'&&u.y+stepY<lineY+16?Math.max(0,stepY):stepY;u.moving=true;
   }else if(u.cooldown<=0){
    u.cooldown=u.kind==='lord'?(u.team?2.2:1.2):squad.leaderDown?1.9:1.4;u.swingAt=this.time;
    if(u.kind==='lord'){
     const victims=near(u,72).filter(v=>v.team!==u.team&&v.hp>0&&Math.hypot(v.x-u.x,v.y-u.y)<72).sort((a,b)=>Math.hypot(a.x-u.x,a.y-u.y)-Math.hypot(b.x-u.x,b.y-u.y)).slice(0,u.team?10:12);
     for(const v of victims)this.damage(u,v,u.atk);
     this.effects.push({type:'cleave',x:u.x,y:u.y,team:u.team,radius:72,life:.4,total:.4});
    }else{
     this.damage(u,target,u.atk);
     this.effects.push(u.kind==='bow'?{type:'arrow',x:u.x,y:u.y,tx:target.x,ty:target.y,team:u.team,life:.24,total:.24}:{type:'hit',x:target.x,y:target.y,team:u.team,life:.16,total:.16});
    }
   }
  }
  // Small physical bodies on both teams prevent passing through the opposing army.
  for(let pass=0;pass<2;pass++){
   grid=makeGrid();
   for(const a of active)for(const b of near(a,17)){
    if(a.id>=b.id||a.hp<=0||b.hp<=0)continue;
    let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=a.team===b.team?16:20;
    if(d<min){if(d<.001){dx=1;dy=0;d=1;}const push=(min-d)*.86;const weight=a.kind==='lord'&&b.kind!=='lord'?.1:b.kind==='lord'&&a.kind!=='lord'?.9:.5;a.x-=dx/d*push*weight;b.x+=dx/d*push*(1-weight);a.y-=dy/d*push*weight;b.y+=dy/d*push*(1-weight);}
   }
  }
  for(const u of active){u.x=Math.max(28,Math.min(372,u.x));u.y=Math.max(360,Math.min(1840,u.y));if(u.team){const radius=u.kind==='lord'?95:12;u.y=Math.max(u.homeY-radius,Math.min(u.homeY+(u.kind==='lord'?95:8),u.y));u.x=Math.max(u.homeX-radius,Math.min(u.homeX+radius,u.x));}}
  const engaged=active.filter(u=>u.hp>0&&this.time-(u.swingAt??-10)<1.5);
  if(engaged.length)this.front=engaged.reduce((s,u)=>s+u.y,0)/engaged.length;
  const livingA=this.allies.length,livingE=this.enemies.length;
  if(!livingE){this.done=true;this.result='victory';this.emit('victory');}
  else if(!livingA||this.time>=300){this.done=true;this.result='defeat';this.emit('defeat');}
 }
}
if(typeof module!=='undefined')module.exports=CrowdBattle;else root.CrowdBattle=CrowdBattle;
})(typeof window==='undefined'?globalThis:window);
