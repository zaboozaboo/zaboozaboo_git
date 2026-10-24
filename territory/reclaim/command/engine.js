/* Pure deterministic combat model: every hit belongs to a real, living combatant. */
(function(root){
'use strict';
class ArmyBattle{
 constructor(size=30){
  this.size=[0,15,30].includes(size)?size:30;this.time=0;this.id=0;this.units=[];this.effects=[];this.events=[];this.projectiles=[];this.input={x:0,y:0};this.facing={x:0,y:-1};this.cooldown=0;this.done=false;this.result='';this.lastCharge=0;this.stats={heroDamage:0,armyDamage:0};
  this.hero=this.add(0,'hero',300,960,360);
  const melee=this.size*2/3;
  for(let i=0;i<this.size;i++){const kind=i<melee?'melee':'bow',j=kind==='melee'?i:i-melee,n=kind==='melee'?melee:this.size-melee;const angle=(j/Math.max(1,n))*Math.PI*2;const radius=kind==='melee'?55:85;const u=this.add(0,kind,300+Math.cos(angle)*radius,960+Math.sin(angle)*radius,kind==='bow'?65:110);u.slotX=Math.cos(angle)*radius;u.slotY=kind==='bow'?35+Math.abs(Math.sin(angle))*40:Math.sin(angle)*radius;}
  this.groups=[{x:190,y:740,name:'방패 전열',active:false},{x:430,y:510,name:'궁수 소대',active:false},{x:220,y:300,name:'군단장 호위',active:false}];
  this.groups.forEach((g,k)=>{for(let i=0;i<12;i++){const kind=k===1?(i<8?'bow':'melee'):i<6?'shield':'melee';const u=this.add(1,kind,g.x+(i%4-1.5)*28,g.y+Math.floor(i/4)*27,kind==='shield'?100:kind==='bow'?55:75);u.group=k;}});
  this.boss=this.add(1,'boss',300,220,600);this.boss.group=2;this.boss.smashAt=4;
 }
 add(team,kind,x,y,hp){const u={id:++this.id,team,kind,x,y,hp,maxHp:hp,cooldown:0,stagger:0,flash:0,homeX:x,homeY:y,moving:false};this.units.push(u);return u;}
 get allies(){return this.units.filter(u=>u.team===0&&u.hp>0&&u.kind!=='hero');}
 get enemies(){return this.units.filter(u=>u.team===1&&u.hp>0);}
 move(x,y){const d=Math.hypot(x,y);this.input={x:d>1?x/d:x,y:d>1?y/d:y};if(d>.1)this.facing={x:x/d,y:y/d};}
 charge(){
  if(this.done||this.cooldown>0||this.hero.hp<=0)return false;
  const h=this.hero,dir={...this.facing};this.cooldown=6;this.lastCharge=this.time;
  const army=this.allies.filter(u=>Math.hypot(u.x-h.x,u.y-h.y)<155);this.participants=army.length;
  h.chargeUntil=this.time+.4;h.chargeDir=dir;h.pushed=new Set();
  for(const u of army){u.chargeUntil=this.time+1.3;u.chargeDir=dir;u.chargeX=h.x+dir.x*140+u.slotX*.5;u.chargeY=h.y+dir.y*140+(u.kind==='melee'?u.slotY*.3:50);u.cooldown=0;if(u.kind==='bow')u.volleyAt=this.time+.35;}
  this.effects.push({type:'order',x:h.x,y:h.y,dx:dir.x,dy:dir.y,life:.7,total:.7});this.events.push({type:'charge',time:this.time,count:army.length});return true;
 }
 damage(attacker,target,amount){
  if(!attacker||target.hp<=0)return;
  if(target.kind==='shield'&&attacker.y>target.y+10)amount*=.55;
  const dealt=Math.min(target.hp,amount);target.hp-=amount;target.flash=.16;
  if(attacker.team===0)this.stats[attacker.kind==='hero'?'heroDamage':'armyDamage']+=dealt;
  this.effects.push({type:'hit',x:target.x,y:target.y,team:attacker.team,life:.2,total:.2});
  if(target.hp<=0){this.effects.push({type:'fall',x:target.x,y:target.y,kind:target.kind,team:target.team,life:.8,total:.8});this.events.push({type:'kill',time:this.time,team:target.team,by:attacker.kind});}
 }
 shoot(u,target,amount){const d=Math.hypot(u.x-target.x,u.y-target.y);this.projectiles.push({from:u.id,target:target.id,x:u.x,y:u.y,tx:target.x,ty:target.y,life:d/350,total:d/350,amount,team:u.team});}
 stepToward(u,x,y,speed,dt){const dx=x-u.x,dy=y-u.y,d=Math.hypot(dx,dy);if(d<3)return;const step=Math.min(d,speed*dt);u.x+=dx/d*step;u.y+=dy/d*step;u.moving=true;}
 tick(dt){
  if(this.done)return;dt=Math.min(.05,Math.max(0,dt));this.time+=dt;this.cooldown=Math.max(0,this.cooldown-dt);this.effects=this.effects.filter(e=>(e.life-=dt)>0);
  for(const p of this.projectiles){p.life-=dt;if(p.life<=0){const from=this.units.find(u=>u.id===p.from),target=this.units.find(u=>u.id===p.target);if(target)this.damage(from,target,p.amount);}}
  this.projectiles=this.projectiles.filter(p=>p.life>0);
  const active=this.units.filter(u=>u.hp>0),h=this.hero;
  for(const g of this.groups){if(active.some(u=>!u.team&&Math.hypot(u.x-g.x,u.y-g.y)<175))g.active=true;}
  for(const u of active){u.moving=false;u.cooldown-=dt;u.stagger=Math.max(0,u.stagger-dt);u.flash=Math.max(0,u.flash-dt);if(u.stagger>0)continue;
   if(u.kind==='hero'){
    const charging=u.chargeUntil>this.time;const dir=charging?u.chargeDir:this.input;u.x+=dir.x*(charging?160:105)*dt;u.y+=dir.y*(charging?160:105)*dt;u.moving=Math.hypot(dir.x,dir.y)>.1;
    if(charging)for(const v of this.enemies)if(Math.hypot(v.x-u.x,v.y-u.y)<35&&!u.pushed.has(v.id)){u.pushed.add(v.id);v.x+=dir.x*26;v.y+=dir.y*26;v.stagger=.65;}
   }
   if(u.team&&!this.groups[u.group].active)continue;
   const foes=active.filter(v=>v.team!==u.team&&v.hp>0);
   const target=foes.reduce((a,v)=>!a||Math.hypot(v.x-u.x,v.y-u.y)<Math.hypot(a.x-u.x,a.y-u.y)?v:a,null);if(!target)continue;
   const dist=Math.hypot(target.x-u.x,target.y-u.y),charge=u.chargeUntil>this.time;
   if(u.kind==='boss'){
    if(u.windup){if(this.time>=u.windup.until){for(const v of active)if(!v.team&&Math.hypot(v.x-u.windup.x,v.y-u.windup.y)<90)this.damage(u,v,48);this.effects.push({type:'smash',x:u.windup.x,y:u.windup.y,life:.5,total:.5});u.windup=null;u.smashAt=this.time+4;}continue;}
    if(this.time>=u.smashAt&&dist<150){u.windup={x:target.x,y:target.y,until:this.time+1.15};continue;}
   }
   if(!u.team&&u.kind!=='hero'){
    const leash=Math.hypot(u.x-h.x,u.y-h.y);
    if(u.volleyAt&&this.time>=u.volleyAt){u.volleyAt=0;const aim=foes.filter(v=>{const dx=v.x-u.x,dy=v.y-u.y;return Math.hypot(dx,dy)<300&&dx*u.chargeDir.x+dy*u.chargeDir.y>0;});const victim=aim.length?aim[u.id%aim.length]:null;if(victim)this.shoot(u,victim,23);u.cooldown=1.4;}
    const range=u.kind==='bow'?190:27;
    if(leash>165&&!charge){this.stepToward(u,h.x+u.slotX*.65,h.y+u.slotY,120,dt);continue;}
    if(dist>range){if(charge&&u.kind==='melee')this.stepToward(u,u.chargeX,u.chargeY,190,dt);else if(dist<120&&u.kind==='melee')this.stepToward(u,target.x,target.y,88,dt);else this.stepToward(u,h.x+u.slotX,h.y+u.slotY,100,dt);}
   }else if(u.team&&dist>(u.kind==='bow'?175:u.kind==='boss'?42:27)&&Math.hypot(u.x-u.homeX,u.y-u.homeY)<180){this.stepToward(u,target.x,target.y,u.kind==='boss'?42:36,dt);}
   const range=u.kind==='bow'?(u.team?175:190):u.kind==='boss'?42:27;
   if(dist<=range&&u.cooldown<=0){u.swingAt=this.time;u.cooldown=u.kind==='hero'?1:u.kind==='boss'?1.4:u.kind==='bow'?1.4:charge?.5:.85;const damage=u.kind==='hero'?5:u.kind==='boss'?18:u.team?6:charge?24:10;if(u.kind==='bow')this.shoot(u,target,damage);else this.damage(u,target,damage);}
  }
  // Physical bodies; troops make room for their leader without teleporting.
  for(let pass=0;pass<2;pass++)for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){
   const a=active[i],b=active[j];if(a.hp<=0||b.hp<=0)continue;let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);const min=a.team===b.team?15:21;if(d>=min)continue;if(d<.01){dx=1;dy=0;d=1;}const weight=a.kind==='hero'?.1:b.kind==='hero'?.9:.5,push=(min-d)*.85;a.x-=dx/d*push*weight;a.y-=dy/d*push*weight;b.x+=dx/d*push*(1-weight);b.y+=dy/d*push*(1-weight);
  }
  for(const u of active){u.x=Math.max(22,Math.min(578,u.x));u.y=Math.max(70,Math.min(1080,u.y));}
  if(h.hp<=0){this.done=true;this.result='defeat';}else if(!this.enemies.length){this.done=true;this.result='victory';}
 }
}
if(typeof module!=='undefined')module.exports=ArmyBattle;else root.ArmyBattle=ArmyBattle;
})(typeof window==='undefined'?globalThis:window);
