/* One playable encounter, isolated from both existing save formats. */
(function(root) {
'use strict';
class RescueEncounter {
  constructor() {
    this.time=0; this.phase='approach'; this.phaseTime=0; this.units=[]; this.effects=[];
    this.events=[]; this.nextId=0; this.kills=0; this.rescued=0; this.gold=0;
    this.campHp=560; this.campMax=560; this.skillCooldown=0; this.skillUntil=0;
    this.wave=0; this.waveAt=Infinity; this.done=false;
    this.add('lord',0,205,730);
    this.add('guard',1,167,535,'jailer');
    this.add('guard',1,226,508,'jailer');
  }
  emit(type,data={}) { this.events.push({id:this.events.length,type,time:this.time,...data}); }
  add(kind,team,x,y,role='soldier') {
    const stats={lord:[420,27,30,43],militia:[175,15,62,48],guard:[108,12,26,30],bow:[80,12,130,30],captain:[190,18,29,28]}[kind];
    const u={id:++this.nextId,kind,team,x,y,role,hp:stats[0],maxHp:stats[0],atk:stats[1],range:stats[2],speed:stats[3],cooldown:0,flash:0,moving:false,heroId:'militia',meleeDuration:.75,face:1};
    this.units.push(u);return u;
  }
  get alive() {return this.units.filter(u=>u.team===0&&u.hp>0);}
  skill() {
    if(this.done||this.phase==='rescue'||this.skillCooldown>0)return false;
    const lord=this.units.find(u=>u.kind==='lord'&&u.hp>0);
    if(!lord)return false;
    this.skillCooldown=12;this.skillUntil=this.time+4;
    this.effects.push({type:'rally',x:lord.x,y:lord.y,life:1.2,total:1.2});
    this.emit('skill');return true;
  }
  hit(attacker,target,damage) {
    if(attacker.hp<=0||target&&target.hp<=0)return;
    const x=target?target.x:180,y=target?target.y:165;
    if(target){target.hp-=damage;target.flash=.14;}else this.campHp-=damage;
    this.emit('impact',{x,y,team:attacker.team});
    this.effects.push({type:'hit',x,y,life:.22,total:.22,damage:Math.round(damage),team:attacker.team});
    if(target&&target.hp<=0){
      this.effects.push({type:'fall',unit:{...target},x,y,life:.65,total:.65});
      if(target.team===1){this.kills++;this.gold+=5;this.emit('kill',{x,y});}
    }
  }
  tick(dt) {
    if(this.done)return;
    dt=Math.min(.05,Math.max(0,dt));this.time+=dt;this.phaseTime+=dt;
    this.skillCooldown=Math.max(0,this.skillCooldown-dt);
    this.effects=this.effects.filter(e=>(e.life-=dt)>0);
    if(this.phase==='approach'&&!this.units.some(u=>u.role==='jailer'&&u.hp>0)){
      this.phase='rescue';this.phaseTime=0;this.emit('rescue');
      for(let i=0;i<4;i++){const u=this.add('militia',0,61+(i%2)*25,464+Math.floor(i/2)*23,'rescued');u.formationIndex=i;u.joinX=[83,145,217,279][i];u.joinY=i%2?505:455;u.releaseDelay=.25+i*.32;}
      this.rescued=4;
    }
    if(this.phase==='rescue'){
      for(const u of this.alive){u.moving=false;if(u.kind==='lord'){u.joinX=181;u.joinY=578;u.releaseDelay=0;}if(this.phaseTime<u.releaseDelay)continue;const d=Math.hypot(u.joinX-u.x,u.joinY-u.y);if(d>2){u.x+=(u.joinX-u.x)/d*58*dt;u.y+=(u.joinY-u.y)/d*58*dt;u.moving=true;}}
      if(this.phaseTime>=5.2){this.phase='assault';this.phaseTime=0;this.waveAt=this.time+1;this.emit('joined');}
      return;
    }
    if(this.phase==='assault'&&this.wave<3&&this.time>=this.waveAt){
      this.wave++;this.waveAt=this.time+7;
      this.add(this.wave===3?'captain':'guard',1,100,250);
      this.add(this.wave===2?'bow':'guard',1,260,235);
      this.emit('wave');
    }
    const engagements=new Map();
    for(const u of this.units){
      if(u.hp<=0)continue;u.moving=false;u.flash=Math.max(0,u.flash-dt);u.cooldown-=dt;
      if(u.pending){if(u.kind==='militia'&&u.pending.target)engagements.set(u.pending.target.id,(engagements.get(u.pending.target.id)||0)+1);u.pending.delay-=dt;if(u.pending.delay<=0){this.hit(u,u.pending.target,u.pending.damage);u.pending=null;}continue;}
      // After rescue the lord follows behind the line, leaving room for the infantry.
      if(u.kind==='lord'&&this.phase==='assault'&&this.alive.some(v=>v.kind==='militia')){
        const soldiers=this.alive.filter(v=>v.kind==='militia');const tx=soldiers.reduce((n,v)=>n+v.x,0)/soldiers.length,ty=Math.max(...soldiers.map(v=>v.y))+66;const d=Math.hypot(tx-u.x,ty-u.y);if(d>4){const step=Math.min(d,u.speed*dt);u.x+=(tx-u.x)/d*step;u.y+=(ty-u.y)/d*step;u.moving=true;}continue;
      }
      let target=null,best=Infinity;
      for(const v of this.units){if(v.team===u.team||v.hp<=0)continue;const d=Math.hypot(u.x-v.x,u.y-v.y)+(u.kind==='militia'?(engagements.get(v.id)||0)*85:0);if(d<best){target=v;best=d;}}
      if(u.kind==='militia'){const locked=this.units.find(v=>v.id===u.targetId&&v.hp>0);if(locked)target=locked;u.targetId=target?.id;}
      // Guardians protect their cage; the final garrison attacks the liberated column.
      if(u.team===1&&!target)continue;
      let tx=target?target.x:180,ty=target?target.y:165;
      if(u.kind==='militia'){const slot=target?(engagements.get(target.id)||0):u.formationIndex; if(target){engagements.set(target.id,slot+1);tx=target.x+(slot%2?32:-32);ty=target.y+42+Math.floor(slot/2)*55;}else{tx=[80,145,215,280][u.formationIndex];ty=194+(u.formationIndex%2)*38;}}
      const d=Math.hypot(tx-u.x,ty-u.y);
      const inRange=target?Math.hypot(target.x-u.x,target.y-u.y)<=u.range:d<12;
      const buff=u.team===0&&this.time<this.skillUntil;
      if(u.kind==='militia'?(target?!inRange:d>7):!inRange){const speed=u.speed*(buff?1.45:1);u.x+=(tx-u.x)/d*speed*dt;u.y+=(ty-u.y)/d*speed*dt;u.moving=true;u.face=tx>=u.x?1:-1;}
      else if(u.cooldown<=0&&inRange){
        u.cooldown=u.kind==='bow'?1.65:u.kind==='captain'?1.5:1.15;u.meleeStartedAt=this.time;
        const damage=u.atk*(buff?1.35:1);
        if(u.kind==='bow')this.effects.push({type:'arrow',x:u.x,y:u.y,tx,ty,life:.3,total:.3});
        // The militia axe lands on the fifth authored animation frame.
        u.pending={target,damage,delay:u.kind==='militia'?.75*.76/1.22:u.kind==='bow'?.3:.22};
      }
    }
    for(let i=0;i<this.units.length;i++)for(let j=i+1;j<this.units.length;j++){
      const a=this.units[i],b=this.units[j];if(a.hp<=0||b.hp<=0||a.team!==b.team)continue;
      const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
      const visualDistance=Math.hypot(dx/45,dy/59);if(visualDistance<1){const n=(1-visualDistance)*dt*8;const nx=d?dx/d:1,ny=d?dy/d:0;a.x-=nx*n*45;b.x+=nx*n*45;a.y-=ny*n*59;b.y+=ny*n*59;}
    }
    this.units=this.units.filter(u=>u.hp>0);
    if(this.campHp<=0){this.campHp=0;this.done=true;this.phase='victory';this.gold+=70;for(const u of this.units){u.moving=false;u.pending=null;}this.emit('victory');}
    else if(!this.alive.length||this.time>=160){this.done=true;this.phase='defeat';this.emit('defeat');}
  }
}
if(typeof module!=='undefined')module.exports=RescueEncounter;else root.RescueEncounter=RescueEncounter;
})(typeof window==='undefined'?globalThis:window);
