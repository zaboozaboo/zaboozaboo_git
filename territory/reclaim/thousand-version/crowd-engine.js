/* All combatants, including prisoners, exist at reset. No waves or scripted routs. */
(function(root){
'use strict';
class CrowdBattle{
 constructor(size=1000){
  this.size=[40,80,120,1000].includes(size)?size:1000;this.factor=this.size/40;
  this.time=0;this.units=[];this.events=[];this.effects=[];this.id=0;this.done=false;this.result='';this.rescued=0;this.nextRescueAt=0;this.hits=0;this.front=1450;this.frames=0;
  this.prisons=[{x:77,y:1730,count:3*this.factor},{x:200,y:1770,count:3*this.factor},{x:323,y:1730,count:6*this.factor}].map((p,i)=>({...p,id:i,open:false}));
  this.seed=8741;this.squads=[];this.skillCooldown=0;this.skillUntil=0;
  const platoon=(team,count,x,y,kind='melee',prison=null)=>{
   const s={id:this.squads.length,team,x,y,homeY:y,initial:count,kind,prison,active:!team&&prison===null,order:prison===null?'hold':'captive',targetId:null,retarget:0};this.squads.push(s);
   const cols=Math.ceil(Math.sqrt(count));
   for(let i=0;i<count;i++){const u=this.add(team,kind,x+(i%cols-(cols-1)/2)*11+(this.random()-.5)*3,y+Math.floor(i/cols)*11);u.squadId=s.id;u.group=team?Math.floor((s.id-4)/2):0;u.active=s.active;u.homeY=y;if(prison!==null){u.captive=true;u.prison=prison;}}
  };
  // Each platoon owns one order and target; soldiers only resolve local contact.
  platoon(0,1,200,1505,'lord');
  const count=10*this.factor-1;
  for(let i=0;i<3;i++)platoon(0,Math.floor(count/3)+(i<count%3?1:0),105+i*95,1515+(i===1?45:0),i===1?'bow':'melee');
  for(let i=0;i<6;i++)platoon(1,3*this.factor,150+(i%2)*100,1380-Math.floor(i/2)*105,i>=4?'bow':'melee');
  for(const p of this.prisons)platoon(0,p.count,p.x,p.y,'melee',p.id);

 }
 random(){this.seed=(this.seed*16807)%2147483647;return this.seed/2147483647;}
 add(team,kind,x,y){const u={id:++this.id,team,kind,x,y,hp:kind==='lord'?750:team?180:210,maxHp:kind==='lord'?750:team?180:210,atk:kind==='lord'?20:team?10:kind==='bow'?8:10,range:kind==='bow'?94:19,speed:team?18:38,cooldown:this.random()*.7,moving:false,captive:false,flash:0};this.units.push(u);return u;}
 get allies(){return this.units.filter(u=>!u.team&&!u.captive&&u.hp>0);}
 get enemies(){return this.units.filter(u=>u.team&&u.hp>0);}
 skill(){const hero=this.allies.find(u=>u.kind==='lord');if(this.done||this.skillCooldown>0||!hero)return false;this.skillCooldown=12;this.skillUntil=this.time+4;this.emit('command',{x:hero.x,y:hero.y});return true;}
 emit(type,data={}){this.events.push({type,time:this.time,...data});}
 rescue(id){
  const p=this.prisons[id];if(!p||p.open||this.done||this.time<this.nextRescueAt)return false;
  const squad=this.squads.find(s=>s.prison===id);squad.active=true;squad.order='advance';
  p.open=true;p.openedAt=this.time;this.nextRescueAt=this.time+7;this.rescued+=p.count;
  this.units.filter(u=>u.prison===id).forEach((u,i)=>{u.captive=false;u.releaseAt=this.time+i*.09;u.joinedAt=this.time;});
  this.emit('rescue',{id,count:p.count,x:p.x,y:p.y});return true;
 }
 tick(dt){
  if(this.done)return;dt=Math.min(.05,Math.max(0,dt));this.time+=dt;this.frames++;this.skillCooldown=Math.max(0,this.skillCooldown-dt);
  this.effects=this.effects.filter(e=>(e.life-=dt)>0);
  const active=this.units.filter(u=>u.hp>0&&!u.captive&&!(u.releaseAt>this.time)),allies=active.filter(u=>!u.team),enemies=active.filter(u=>u.team);
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
   const hp=s.members.reduce((n,u)=>n+u.hp/u.maxHp,0)/s.members.length;
   const outnumbered=target.members.length>s.members.length*1.35;
   s.order=hp<.45&&outnumbered&&(s.team?s.y>s.homeY-85:s.y<s.homeY+85)?'withdraw':'advance';
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
   if(squad.order==='withdraw'){const dx=squad.x-u.x,dy=squad.goalY-u.y,d=Math.hypot(dx,dy)||1;u.x+=dx/d*u.speed*.7*dt;u.y+=dy/d*u.speed*.7*dt;u.moving=true;continue;}
   const enemySquad=this.squads[squad.targetId];
   const opponents=[...(enemySquad?.members||[]),...near(u,u.range).filter(v=>v.team!==u.team&&v.squadId!==enemySquad?.id&&Math.hypot(v.x-u.x,v.y-u.y)<u.range)];
   let target=null,best=Infinity;
   for(const v of opponents){if(v.hp<=0)continue;const d=Math.hypot(u.x-v.x,u.y-v.y);const score=d+(claimed.get(v.id)||0)*5;if(score<best){best=score;target=v;}}
   if(!target)continue;claimed.set(target.id,(claimed.get(target.id)||0)+1);u.targetId=target.id;
   const dx=target.x-u.x,dy=target.y-u.y,d=Math.hypot(dx,dy);u.face=dx>=0?1:-1;
   if(d>u.range){
    if(u.team&&u.y>=squad.homeY+24&&dy>0)continue;
    // Try nearby free space; never give the entire army one destination or fixed slots.
    let vx=dx/d,vy=dy/d;
    const cohesion=Math.hypot(u.x-squad.x,u.y-squad.y);
    if(cohesion>45){vx+=(squad.x-u.x)/cohesion*1.4;vy+=(squad.y-u.y)/cohesion*1.4;}
    for(const v of near(u,15)){if(v===u||v.hp<=0)continue;const ax=u.x-v.x,ay=u.y-v.y,ad=Math.hypot(ax,ay);if(ad>0&&ad<15){const force=(15-ad)/15*.8;vx+=ax/ad*force;vy+=ay/ad*force;}}
    const length=Math.hypot(vx,vy)||1;u.x+=vx/length*u.speed*dt;u.y+=vy/length*u.speed*dt;u.moving=true;
   }else if(u.cooldown<=0){
    u.cooldown=u.kind==='bow'?1.4:1.05;u.swingAt=this.time;
    const buff=!u.team&&hero&&this.time<this.skillUntil&&Math.hypot(u.x-hero.x,u.y-hero.y)<135;target.hp-=u.atk*(buff?1.5:1);target.flash=.1;this.hits++;
    if(u.kind==='bow')this.effects.push({type:'arrow',x:u.x,y:u.y,tx:target.x,ty:target.y,team:u.team,life:.24,total:.24});
    else this.effects.push({type:'hit',x:target.x,y:target.y,team:u.team,life:.16,total:.16});
    if(target.hp<=0){this.effects.push({type:'fall',x:target.x,y:target.y,team:target.team,kind:target.kind,life:1.2,total:1.2});this.emit('kill',{team:target.team,x:target.x,y:target.y});}
   }
  }
  // Small physical bodies on both teams prevent passing through the opposing army.
  for(let pass=0;pass<2;pass++){
   grid=makeGrid();
   for(const a of active)for(const b of near(a,14)){
    if(a.id>=b.id||a.hp<=0||b.hp<=0)continue;
    let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=a.team===b.team?10:14;
    if(d<min){if(d<.001){dx=1;dy=0;d=1;}const push=(min-d)*.43;a.x-=dx/d*push;b.x+=dx/d*push;a.y-=dy/d*push;b.y+=dy/d*push;}
   }
  }
  for(const u of active){u.x=Math.max(28,Math.min(372,u.x));u.y=Math.max(360,Math.min(1840,u.y));}
  const engaged=active.filter(u=>u.hp>0&&this.time-(u.swingAt??-10)<1.5);
  if(engaged.length)this.front=engaged.reduce((s,u)=>s+u.y,0)/engaged.length;
  const livingA=this.allies.length,livingE=this.enemies.length;
  if(!livingE){this.done=true;this.result='victory';this.emit('victory');}
  else if(!livingA||this.time>=180){this.done=true;this.result='defeat';this.emit('defeat');}
 }
}
if(typeof module!=='undefined')module.exports=CrowdBattle;else root.CrowdBattle=CrowdBattle;
})(typeof window==='undefined'?globalThis:window);
