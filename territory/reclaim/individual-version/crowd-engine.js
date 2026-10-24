/* All combatants, including prisoners, exist at reset. No waves or scripted routs. */
(function(root){
'use strict';
class CrowdBattle{
 constructor(size=80){
  this.size=[40,80,120].includes(size)?size:80;this.factor=this.size/40;
  this.time=0;this.units=[];this.events=[];this.effects=[];this.id=0;this.done=false;this.result='';this.rescued=0;this.nextRescueAt=0;this.hits=0;this.front=1450;this.frames=0;
  this.prisons=[{x:77,y:1730,count:3*this.factor},{x:200,y:1770,count:3*this.factor},{x:323,y:1730,count:6*this.factor}].map((p,i)=>({...p,id:i,open:false}));
  this.seed=8741;
  const pack=(count,team)=>{
   for(let i=0;i<count;i++){
    const group=team?(i<Math.ceil(count*.5)?0:i<Math.ceil(count*.75)?1:2):0;
    const first=group===0?0:group===1?Math.ceil(count*.5):Math.ceil(count*.75);
    const local=i-first,cols=team?Math.min(9,4+this.factor*2):Math.min(11,5+this.factor*2);
    const ranged=team?local%5===4:i>=Math.floor(count*.76),row=Math.floor(local/cols),col=local%cols;
    const x=200+(col-(cols-1)/2)*22+(this.random()-.5)*7;
    const y=(team?1380-group*330-row*25:1510+row*23)+(this.random()-.5)*5;
    const u=this.add(team,i===0&&!team?'lord':ranged?'bow':'melee',x,y);u.group=group;u.active=!team;u.homeY=y;
   }
  };
  pack(10*this.factor,0);pack(18*this.factor,1);
  for(const p of this.prisons)for(let i=0;i<p.count;i++){
   const cols=p.count>9?6:3;const u=this.add(0,'melee',p.x+(i%cols-(cols-1)/2)*12,p.y+Math.floor(i/cols)*13);
   u.captive=true;u.prison=p.id;
  }
 }
 random(){this.seed=(this.seed*16807)%2147483647;return this.seed/2147483647;}
 add(team,kind,x,y){const u={id:++this.id,team,kind,x,y,hp:kind==='lord'?320:team?180:160,maxHp:kind==='lord'?320:team?180:160,atk:kind==='lord'?10:team?10:kind==='bow'?6:8,range:kind==='bow'?94:19,speed:team?18:38,cooldown:this.random()*.7,moving:false,captive:false,flash:0};this.units.push(u);return u;}
 get allies(){return this.units.filter(u=>!u.team&&!u.captive&&u.hp>0);}
 get enemies(){return this.units.filter(u=>u.team&&u.hp>0);}
 emit(type,data={}){this.events.push({type,time:this.time,...data});}
 rescue(id){
  const p=this.prisons[id];if(!p||p.open||this.done||this.time<this.nextRescueAt)return false;
  p.open=true;p.openedAt=this.time;this.nextRescueAt=this.time+7;this.rescued+=p.count;
  this.units.filter(u=>u.prison===id).forEach((u,i)=>{u.captive=false;u.releaseAt=this.time+i*.09;u.joinedAt=this.time;});
  this.emit('rescue',{id,count:p.count,x:p.x,y:p.y});return true;
 }
 tick(dt){
  if(this.done)return;dt=Math.min(.05,Math.max(0,dt));this.time+=dt;this.frames++;
  this.effects=this.effects.filter(e=>(e.life-=dt)>0);
  const active=this.units.filter(u=>u.hp>0&&!u.captive&&!(u.releaseAt>this.time)),allies=active.filter(u=>!u.team),enemies=active.filter(u=>u.team);
  for(const e of enemies)if(!e.active&&allies.some(a=>Math.hypot(a.x-e.x,a.y-e.y)<145))for(const mate of enemies)if(mate.group===e.group)mate.active=true;
  const claimed=new Map();
  for(const u of active){
   u.moving=false;u.flash=Math.max(0,u.flash-dt);u.cooldown-=dt;
   if(u.hp<=0||u.team&&!u.active)continue;
   const nearbyFriend=active.filter(v=>v.team===u.team&&v.hp>0&&Math.hypot(v.x-u.x,v.y-u.y)<80).length;
   const nearbyFoe=active.filter(v=>v.team!==u.team&&v.hp>0&&Math.hypot(v.x-u.x,v.y-u.y)<80).length;
   // Damaged, locally outnumbered soldiers give ground; reinforcements can reverse this naturally.
   u.withdrawing=u.hp<u.maxHp*.55&&nearbyFoe>nearbyFriend*1.25&&(u.team?u.y>u.homeY-95:u.y<1700);
   if(u.withdrawing){u.y+=(u.team?-1:1)*u.speed*.8*dt;u.moving=true;continue;}
   const opponents=u.team?allies:enemies;let target=null,best=Infinity;
   for(const v of opponents){if(v.hp<=0)continue;const d=Math.hypot(u.x-v.x,u.y-v.y);const score=d+(claimed.get(v.id)||0)*5;if(score<best){best=score;target=v;}}
   if(!target)continue;claimed.set(target.id,(claimed.get(target.id)||0)+1);u.targetId=target.id;
   const dx=target.x-u.x,dy=target.y-u.y,d=Math.hypot(dx,dy);u.face=dx>=0?1:-1;
   if(d>u.range){
    // Try nearby free space; never give the entire army one destination or fixed slots.
    let vx=dx/d,vy=dy/d;
    for(const v of active){if(v===u||v.hp<=0)continue;const ax=u.x-v.x,ay=u.y-v.y,ad=Math.hypot(ax,ay);if(ad>0&&ad<15){const force=(15-ad)/15*.8;vx+=ax/ad*force;vy+=ay/ad*force;}}
    const length=Math.hypot(vx,vy)||1;u.x+=vx/length*u.speed*dt;u.y+=vy/length*u.speed*dt;u.moving=true;
   }else if(u.cooldown<=0){
    u.cooldown=u.kind==='bow'?1.4:1.05;u.swingAt=this.time;
    target.hp-=u.atk;target.flash=.1;this.hits++;
    if(u.kind==='bow')this.effects.push({type:'arrow',x:u.x,y:u.y,tx:target.x,ty:target.y,team:u.team,life:.24,total:.24});
    else this.effects.push({type:'hit',x:target.x,y:target.y,team:u.team,life:.16,total:.16});
    if(target.hp<=0){this.effects.push({type:'fall',x:target.x,y:target.y,team:target.team,kind:target.kind,life:1.2,total:1.2});this.emit('kill',{team:target.team,x:target.x,y:target.y});}
   }
  }
  // Small physical bodies on both teams prevent passing through the opposing army.
  for(let pass=0;pass<2;pass++)for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){
   const a=active[i],b=active[j];if(a.hp<=0||b.hp<=0)continue;
   let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=a.team===b.team?10:14;
   if(d<min){if(d<.001){dx=1;dy=0;d=1;}const push=(min-d)*.43;a.x-=dx/d*push;b.x+=dx/d*push;a.y-=dy/d*push;b.y+=dy/d*push;}
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
