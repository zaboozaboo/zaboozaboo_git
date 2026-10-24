/* One playable encounter, isolated from both existing save formats. */
(function(root) {
'use strict';
class RescueEncounter {
  constructor() {
    this.time=0; this.phase='approach'; this.phaseTime=0; this.units=[]; this.effects=[];
    this.events=[]; this.nextId=0; this.kills=0; this.rescued=0; this.gold=0;
    this.campHp=560; this.campMax=560; this.skillCooldown=0; this.skillUntil=0;
    this.done=false;this.lineBroken=false;this.lineContactAt=null;this.pressure=0;this.pushes=0;
    this.prisons=[
      {id:0,x:85,y:770,count:1,opened:false},
      {id:1,x:267,y:560,count:1,opened:false},
      {id:2,x:65,y:535,count:2,opened:false}
    ];
    this.add('lord',0,185,910);
    // Every defender exists before the first step. Groups hold their own ground.
    for(const [kind,x,y,group] of [
      ['guard',150,788,0],
      ['guard',217,590,1],['guard',282,620,1],
      ['guard',65,560,2],['guard',110,535,2],
      ['guard',155,355,3],['bow',250,230,3],['captain',220,355,3]
    ]){const u=this.add(kind,1,x,y,'jailer');u.group=group;u.active=false;if(group===2)u.hp=u.maxHp=175;if(group===3&&kind!=='bow'){u.bulwark=true;u.hp=u.maxHp=340;u.range=40;}}

  }
  emit(type,data={}) { this.events.push({id:this.events.length,type,time:this.time,...data}); }
  add(kind,team,x,y,role='soldier') {
    const stats={lord:[520,27,43,48],militia:[200,19,48,55],guard:[108,12,26,30],bow:[80,12,130,30],captain:[190,18,29,28]}[kind];
    const u={id:++this.nextId,kind,team,x,y,role,hp:stats[0],maxHp:stats[0],atk:stats[1],range:stats[2],speed:stats[3],cooldown:0,flash:0,moving:false,heroId:'militia',meleeDuration:.75,face:1};
    this.units.push(u);return u;
  }
  get alive() {return this.units.filter(u=>u.team===0&&u.hp>0);}
  skill() {
    if(this.done||this.skillCooldown>0)return false;
    const lord=this.units.find(u=>u.kind==='lord'&&u.hp>0);
    if(!lord)return false;
    this.skillCooldown=12;this.skillUntil=this.time+4;
    this.effects.push({type:'rally',x:lord.x,y:lord.y,life:1.2,total:1.2});
    this.emit('skill');return true;
  }
  wake(group) {for(const u of this.units)if(u.team===1&&u.group===group)u.active=true;}
  hit(attacker,target,damage) {
    if(attacker.hp<=0||target&&target.hp<=0)return;
    const x=target?target.x:180,y=target?target.y:165;
    if(target?.bulwark&&!this.lineBroken){
      // Only soldiers physically fighting at the line contribute to breaking it.
      const support=this.alive.filter(a=>Math.hypot(a.x-target.x,a.y-target.y)<145).length;
      damage*=.3;
      if(support>=4){
        this.pressure=Math.min(100,this.pressure+14);
        target.recoil=.24;target.y-=7;this.pushes++;
        this.effects.push({type:'shove',x:target.x,y:target.y,life:.5,total:.5});
        if(this.pressure>=100){
          this.lineBroken=true;this.breakAt=this.time;
          for(const e of this.units.filter(e=>e.bulwark)){e.recoil=1.1;e.pending=null;e.y-=32;}
          this.emit('breakthrough',{x:185,y:target.y});
        }
      }
    }
    if(target){target.hp-=damage;target.flash=.14;if(target.team===1)this.wake(target.group);}else this.campHp-=damage;
    this.emit('impact',{x,y,team:attacker.team,attacker:attacker.kind,targetGroup:target?.group});
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
    for(const prison of this.prisons){
      if(prison.opened||this.units.some(u=>u.team===1&&u.group===prison.id&&u.hp>0))continue;
      prison.opened=true;prison.openedAt=this.time;
      for(let i=0;i<prison.count;i++){
        const u=this.add('militia',0,prison.x+(i-.5*(prison.count-1))*34,prison.y,'rescued');
        u.joinedAt=this.time;u.origin=prison.id;
      }
      this.rescued+=prison.count;
      this.emit('rescue',{count:prison.count,total:this.rescued,x:prison.x,y:prison.y,prison:prison.id});
    }
    this.phase=this.rescued===4?'assault':'approach';
    for(const u of this.units){
      if(u.team===1&&!u.active&&this.alive.some(a=>Math.hypot(a.x-u.x,a.y-u.y)<105))this.wake(u.group);
    }
    if(!this.lineBroken)this.pressure=Math.max(0,this.pressure-dt*2);
    const engagements=new Map();
    for(const u of this.units){
      if(u.hp<=0)continue;u.moving=false;u.flash=Math.max(0,u.flash-dt);u.cooldown-=dt;
      if(u.recoil>0){u.recoil=Math.max(0,u.recoil-dt);u.y-=dt*(this.lineBroken?45:12);u.moving=true;continue;}
      if(u.pending){if(u.kind==='militia'&&u.pending.target)engagements.set(u.pending.target.id,(engagements.get(u.pending.target.id)||0)+1);u.pending.delay-=dt;if(u.pending.delay<=0){this.hit(u,u.pending.target,u.pending.damage);u.pending=null;}continue;}
      if(u.team===1&&!u.active)continue;
      let target=null,best=Infinity;
      // Allies advance to the next occupied area, choosing nearby opponents freely.
      const next=this.prisons.find(p=>!p.opened);
      // The lord holds the occupied road while rescued militia clear the nearby prison.
      const holdRoad=u.kind==='lord'&&this.rescued>=2&&!this.lineBroken;
      for(const v of this.units){
        if(v.team===u.team||v.hp<=0)continue;
        if(u.team===0&&next&&v.group>next.id&&!v.active&&!holdRoad)continue;
        if(holdRoad&&v.team===1&&!v.bulwark)continue;
        if(u.kind==='militia'&&next&&v.group!==next.id)continue;
        const d=Math.hypot(u.x-v.x,u.y-v.y)+(engagements.get(v.id)||0)*24;
        if(d<best){target=v;best=d;}
      }
      u.targetId=target?.id;
      if(u.team===1&&!target)continue;
      if(target)engagements.set(target.id,(engagements.get(target.id)||0)+1);
      // A broad camp footprint gives the army room without assigning formation slots.
      let tx=target?target.x:Math.max(120,Math.min(240,u.x)),ty=target?target.y:193;
      const d=Math.hypot(tx-u.x,ty-u.y);
      if(u.bulwark&&!this.lineBroken&&target&&target.y>u.y+u.range){
        if(target.y-u.y<90&&this.lineContactAt===null){this.lineContactAt=this.time;this.emit('blocked',{x:u.x,y:u.y});}
        continue;
      }
      const inRange=target?Math.hypot(target.x-u.x,target.y-u.y)<=u.range:d<14;
      const buff=u.team===0&&this.time<this.skillUntil;
      if(!inRange){const speed=u.speed*(buff?1.45:1);u.x+=(tx-u.x)/d*speed*dt;u.y+=(ty-u.y)/d*speed*dt;u.moving=true;u.face=tx>=u.x?1:-1;}
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
      const visualDistance=Math.hypot(dx/36,dy/43);if(visualDistance<1){const n=(1-visualDistance)*dt*8;const nx=d?dx/d:1,ny=d?dy/d:0;a.x-=nx*n*36;b.x+=nx*n*36;a.y-=ny*n*43;b.y+=ny*n*43;}
    }
    for(const u of this.units){u.x=Math.max(24,Math.min(336,u.x));}
    this.units=this.units.filter(u=>u.hp>0);
    if(this.campHp<=0){this.campHp=0;this.done=true;this.phase='victory';this.gold+=70;for(const u of this.units){u.moving=false;u.pending=null;}this.emit('victory');}
    else if(!this.alive.length||this.time>=160){this.done=true;this.phase='defeat';this.emit('defeat');}
  }
}
if(typeof module!=='undefined')module.exports=RescueEncounter;else root.RescueEncounter=RescueEncounter;
})(typeof window==='undefined'?globalThis:window);
