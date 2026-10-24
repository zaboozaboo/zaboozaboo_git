/* Deterministic neutral mannequin. World-space feet + two-bone IK; no sprite deformation. */
(function(root){
'use strict';
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(v,s)=>v.map(x=>x*s),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),len=v=>Math.hypot(...v),unit=v=>mul(v,1/(len(v)||1)),clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
function ik(a,target,l1,l2,pole=[1,0,0]){
 const delta=sub(target,a),raw=len(delta),d=clamp(raw,1e-6,l1+l2-1e-6),axis=unit(delta);
 let bend=sub(pole,mul(axis,dot(pole,axis)));if(len(bend)<1e-5)bend=sub([0,1,0],mul(axis,axis[1]));bend=unit(bend);
 const along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along));
 return {joint:add(a,add(mul(axis,along),mul(bend,height))),end:add(a,mul(axis,d)),error:Math.max(0,raw-l1-l2)};
}
const period=1.1,stance=.62;
function foot(t,speed,offset){
 const q=t/period+offset,cycle=Math.floor(q),p=q-cycle,travel=speed*period,half=travel*stance/2;
 // Each stance holds a fixed world coordinate, independent of render frame rate.
 const plant=travel*(cycle-offset)+half;
 if(p<stance)return {x:plant,z:.075,planted:true,phase:p};
 const u=(p-stance)/(1-stance),duration=period*(1-stance);
 // World-space swing has zero endpoint velocities to meet planted stance.
 return {x:plant+travel*smooth(u),z:.075+.12*Math.sin(Math.PI*u)**2,planted:false,phase:p};
}
function pose(t,{mode='walk',speed=.55}={}){
 speed=clamp(speed,.2,.8);const walking=mode==='walk',attack=mode==='attack',x=walking?speed*t:0;
 const p=(t%1.4)/1.4;let strike=0;
 if(attack){if(p<.28)strike=smooth(p/.28);else if(p<.43)strike=1-1.8*smooth((p-.28)/.15);else if(p<.8)strike=-.8*(1-smooth((p-.43)/.37));}
 const bob=walking?.012*Math.cos(t/period*4*Math.PI):0,sway=walking?.018*Math.sin(t/period*2*Math.PI):0;
 const pelvis=[x,sway,.83+bob],chest=[x+(attack?-.055*strike:0),-sway*.4,1.14+bob];
 const legs=[-.16,.16].map((y,i)=>{const f=walking?foot(t,speed,i*.5):{x:x+(i?-.07:.07),z:.075,planted:true};const hip=add(pelvis,[0,y,0]),ankle=[f.x,y,f.z],chain=ik(hip,ankle,.42,.43);return {hip,knee:chain.joint,ankle:chain.end,planted:f.planted,error:chain.error};});
 const arms=[-.23,.23].map((y,i)=>{const shoulder=add(chest,[0,y,.035]),swing=walking?.10*Math.sin(t/period*2*Math.PI+i*Math.PI):0;
 let hand=add(chest,[.13+swing,y*1.15,-.37]);
 if(i===1&&attack){hand=add(chest,[.15-.22*strike,y*1.12,-.30+.56*Math.max(0,strike)]);if(strike<0)hand=add(chest,[.15-.35*strike,y*1.12,-.30+.08*strike]);}
 const chain=ik(shoulder,hand,.25,.27,[-1,0,-.2]);return {shoulder,elbow:chain.joint,hand:chain.end,error:chain.error};});
 const hand=arms[1].hand,angle=attack?(-.15-1.05*strike):-.15;const shaft=[Math.sin(angle),0,Math.cos(angle)],blade=[Math.cos(angle),0,-Math.sin(angle)];
 return {root:x,pelvis,chest,head:add(chest,[0,0,.31]),legs,arms,axe:{hand,shaft,blade},strike,impact:attack&&p>=.40&&p<.46};
}
root.AvatarRig={pose,ik,foot,period,stance,add,mul,len,sub};
if(typeof module!=='undefined')module.exports=root.AvatarRig;
})(typeof globalThis!=='undefined'?globalThis:this);
