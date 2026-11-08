'use strict';
// Untargetable companions; attacks use a fixed formation budget, never the number of targets.
const PetField={
 actors:[],images:{},effects:[],lastTime:-1,
 colors:['#f5bc73','#99d2bf','#e5c990','#ffa56f','#9ee6ab','#bea5fa'],
 image(variant){if(!this.images[variant]){const image=new Image();image.src='assets/pets-v1/'+['wolf','turtle','fox','dragon','healer','charger'][variant]+'.png';this.images[variant]=image;}return this.images[variant];},
 tick(dt){if(!S.portal)return;const ids=CollectionUI.ensure().equipped.pets;if(B.time<this.lastTime){this.actors=[];this.effects=[];}this.lastTime=B.time;
  const army=B.units.filter(u=>u.team===0&&u.hp>0&&Number.isFinite(u.x));
  // Follow the actual main troop group, including its lateral movement.
  const focus=army.length?(typeof cameraFocus==='function'?cameraFocus():army[0].x):150;
  const group=army.filter(u=>Math.abs(u.x-focus)<100);
  const center=group.length?group.reduce((p,u)=>({x:p.x+u.x/group.length,y:p.y+u.y/group.length}),{x:0,y:0}):{x:150,y:LANE_W/2};
  this.actors=ids.map((id,i)=>{const d=CollectionUI.def('pets',id);if(!d)return null;
   const targetX=Math.max(110,Math.min(W-110,center.x-28)),targetY=Math.max(28,Math.min(LANE_W-28,center.y+(i===0?-42:42)));
   let p=this.actors.find(a=>a?.id===id)||{id,x:targetX,y:targetY,variant:d.variant,phase:i*2,moving:false,attackT:i*.4};this.image(d.variant);
   const dx=targetX-p.x,dy=targetY-p.y,distance=Math.hypot(dx,dy),speed=Math.max(95,...group.map(u=>(u.speed||0)*1.3)),step=Math.min(distance,(speed+distance*2)*dt);
   p.moving=distance>2;if(distance){p.x+=dx/distance*step;p.y+=dy/distance*step;}p.phase+=dt*(p.moving?9:2);
   p.attackT=Math.max(0,(p.attackT||0)-dt);
   if(!p.attackT&&army.length){const target=B.units.filter(u=>u.team!==0&&u.hp>0&&Math.hypot(u.x-p.x,u.y-p.y)<220).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];if(target&&PetGrowth.basicAttack(id,target)){p.attackT=2;p.castUntil=B.time+.45;this.effects.push({from:{x:p.x,y:p.y},targets:[{x:target.x,y:target.y}],variant:p.variant,t:0,life:.45});}}
   return p;
  }).filter(Boolean);
  this.effects=this.effects.filter(e=>(e.t+=dt)<e.life);
 },
 cast(id,targets){const actor=this.actors.find(a=>a.id===id);if(!actor)return;this.effects.push({from:{x:actor.x,y:actor.y},targets:targets.map(u=>({x:u.x,y:u.y})),variant:actor.variant,t:0,life:.8});actor.castUntil=B.time+.5;},
 draw(p){const image=this.image(p.variant);if(!image.complete||!image.naturalWidth)return;const scale=perspectiveScale(p.x),height=38*scale*VIEW.sx/VIEW.sy,width=38*scale*image.width/image.height,x=SX(p.y,p.x),y=SY(p.x);const motion=CombatArt.reducedMotion?0:Math.sin(p.phase),cast=(p.castUntil||0)>B.time;
  ctx.save();ctx.fillStyle='#162c3270';ellipse(x,y+1,10*scale,3.4*scale);ctx.fill();ctx.strokeStyle=this.colors[p.variant];ctx.globalAlpha=.65;ctx.lineWidth=1;ellipse(x,y,11*scale,4*scale);ctx.stroke();ctx.globalAlpha=1;ctx.translate(x,y-(p.variant>=4?4+motion:Math.abs(motion)*(p.moving?1.5:.3)));if(!CombatArt.reducedMotion)ctx.rotate(p.moving?motion*.045:0);if(cast){ctx.shadowColor=this.colors[p.variant];ctx.shadowBlur=9;}ctx.drawImage(image,-width/2,-height,width,height);ctx.restore();
 },
 drawEffects(){for(const e of this.effects){const k=e.t/e.life;ctx.save();ctx.globalAlpha=1-k;ctx.strokeStyle=this.colors[e.variant];ctx.lineWidth=2;const x=SX(e.from.y,e.from.x),y=SY(e.from.x)-18;
   ellipse(x,y+16,10+k*25,4+k*8);ctx.stroke();
   for(const target of e.targets){const tx=SX(target.y,target.x),ty=SY(target.x)-12;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo((x+tx)/2,(y+ty)/2-30,tx,ty);ctx.stroke();ctx.fillStyle=this.colors[e.variant];const t=Math.min(1,k*2),px=x+(tx-x)*t,py=y+(ty-y)*t-Math.sin(t*Math.PI)*15;ellipse(px,py,3,3);ctx.fill();if(k>.35){ellipse(tx,ty,5+k*10,3+k*5);ctx.stroke();}}
   ctx.restore();}}
};
const fieldTick=Portal.tick;Portal.tick=function(dt){fieldTick.call(this,dt);if(!B.result)PetField.tick(dt);};
const fieldCast=PetGrowth.cast;PetGrowth.cast=function(id){const d=CollectionUI.def('pets',id),attackTargets=d?.variant===3?B.units.filter(u=>u.team!==0&&u.hp>0).slice(0,3):[],before=d?.variant===4?B.units.filter(u=>u.team===0&&u.hp>0).map(u=>({u,hp:u.hp})):[];fieldCast.call(this,id);let targets=[];if(d?.variant===3)targets=attackTargets;if(d?.variant===4)targets=before.filter(x=>x.u.hp>x.hp).map(x=>x.u).slice(0,6);if(d?.variant===5)targets=S.portal.board.flatMap((p,i)=>p?[{x:120,y:80+i*80}]:[]);PetField.cast(id,targets);};
