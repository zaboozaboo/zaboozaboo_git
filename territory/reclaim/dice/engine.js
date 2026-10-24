(function(root){
'use strict';
const Base=typeof module!=='undefined'?require('../command/engine'):root.ArmyBattle;
class DiceBattle extends Base{
 constructor(){super(0);this.hero.hp=this.hero.maxHp=650;this.hero.x=300;this.hero.y=940;this.produced=0;this.front=870;this.joined=0;this.rolls=[];
  // Fixed occupied platoons, no enemy waves. The prototype changes combat, not dice rules.
  for(const u of this.enemies){u.hp=u.maxHp=u.kind==='boss'?350:u.kind==='shield'?65:45;}
  for(let i=0;i<6;i++)this.recruit(i<4?'militia':'archer',i<4?0:1,true);
 }
 recruit(id,slot,initial=false){const kind=id==='archer'?'bow':'melee',n=this.units.filter(u=>!u.team&&u.kind!=='hero').length;const u=this.add(0,kind,230+(n%6)*26,initial?920+Math.floor(n/6)*20:1040,kind==='bow'?65:110);u.heroId=id;u.slot=slot;u.slotX=((n%7)-3)*19;u.slotY=kind==='bow'?60:0;u.bornAt=this.time;u.marching=!initial;u.joinedAt=initial?-100:null;if(!initial)this.produced++;return u;}
 damage(a,t,amount){super.damage(a,t,a.team?amount*(a.kind==='boss'?.32:.5):amount);}
 charge(){return false;}
 tick(dt){if(this.done)return;
  const h=this.hero,nearest=this.enemies.reduce((a,v)=>!a||Math.hypot(v.x-h.x,v.y-h.y)<Math.hypot(a.x-h.x,a.y-h.y)?v:a,null);
  if(nearest){const dx=nearest.x-h.x,dy=nearest.y-h.y,d=Math.hypot(dx,dy);this.move(d>65?dx/d*.42:0,d>65?dy/d*.42:0);}
  // Fast march from the fixed rear entry; no arrival teleport or scripted damage.
  for(const u of this.allies)if(u.marching){const dx=h.x+u.slotX-u.x,dy=h.y+35-u.y,d=Math.hypot(dx,dy);if(d<125){u.marching=false;u.joinedAt=this.time;this.joined++;this.events.push({type:'joined',time:this.time,id:u.id,kind:u.kind,x:u.x,y:u.y});}else this.stepToward(u,h.x+u.slotX,h.y+35,85,dt);}
  super.tick(dt);this.front=this.hero.y-35;
 }
}
if(typeof module!=='undefined')module.exports=DiceBattle;else root.DiceBattle=DiceBattle;
})(typeof window==='undefined'?globalThis:window);
