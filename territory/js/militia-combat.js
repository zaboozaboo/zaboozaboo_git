'use strict';
// Complete authored frames, with a separate axe; no limb rigging.
const MilitiaCombat = (()=>{
const root=new URL('../',document.currentScript.src);
const load=src=>new Promise((ok,no)=>{const im=new Image;im.onload=()=>ok(im);im.onerror=()=>no(Error(src));im.src=new URL(src,root).href;});
const skin=BattleArtSet.militia;
// Timings are shared with the existing frame-5 combat contact contract.
const clips={
 attack:{...skin.clips.attack,durations:[.26,.20,.20,.10,.16,.30]},
 walk:{...skin.clips.walk,durations:[.24,.20,.24,.20]},
};
const weapons={};

let trail,ready=false,pending;
function measure(clip){const im=clip.image;
 if(!Number.isInteger(clip.cols)||!Number.isInteger(clip.rows)||clip.cols<1||clip.rows<1||clip.cols*clip.rows!==clip.durations.length||im.width%clip.cols||im.height%clip.rows)throw Error('Invalid sprite grid: '+clip.file);
 if(skin.weapon&&(!clip.grips||!clip.angles||clip.grips.length!==clip.durations.length||clip.angles.length!==clip.durations.length))throw Error('Missing weapon sockets: '+clip.file);
 if(clip.anchors){
  if(clip.anchors.length!==clip.durations.length||!clip.anchors.every(a=>[a.x,a.y,a.top].every(Number.isFinite)&&a.x>=0&&a.x<=1&&a.y>0&&a.y<=1&&a.top>=0&&a.top<a.y))throw Error('Invalid foot anchors: '+clip.file);
  clip.aspect=(im.width/clip.cols)/(im.height/clip.rows);clip.visibleHeight=clip.anchors[0].y-clip.anchors[0].top;return;
 }
 const cv=document.createElement('canvas');cv.width=im.width;cv.height=im.height;const c=cv.getContext('2d',{willReadFrequently:true});c.drawImage(im,0,0);const p=c.getImageData(0,0,cv.width,cv.height).data,cw=im.width/clip.cols,ch=im.height/clip.rows;
 clip.aspect=cw/ch;clip.anchors=clip.durations.map((_,i)=>{let l=cw,r=0,b=0,top=ch;const ox=i%clip.cols*cw,oy=Math.floor(i/clip.cols)*ch;for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){if(p[((oy+y)*im.width+ox+x)*4+3]>160){top=Math.min(top,y);if(y>=ch*.84){l=Math.min(l,x);r=Math.max(r,x);b=Math.max(b,y);}}}if(r<l||top>=ch)throw Error("Missing feet: "+clip.file+" frame "+i);return {x:(l+r)/2/cw,y:(b+1)/ch,top:top/ch};});
 clip.visibleHeight=clip.anchors[0].y-clip.anchors[0].top;
}
function draw(ctx,clip,i,cx,baseline,height){const size=height/clip.visibleHeight,width=size*clip.aspect,a=clip.anchors[i];const x=cx-a.x*width,y=baseline-a.y*size,im=clip.image,cw=im.width/clip.cols,ch=im.height/clip.rows;
 if(skin.weapon){
 const gx=x+clip.grips[i][0]*width,gy=y+clip.grips[i][1]*size,angle=clip.angles[i],def=skin.weapon,weapon=weapons.axe,w=size*def.length,h=w*weapon.height/weapon.width;
 if(trail&&clip===clips.attack&&i===4){const dx=(def.tip[0]-def.pivot[0])*w,dy=(def.tip[1]-def.pivot[1])*h,tx=gx+Math.cos(angle)*dx-Math.sin(angle)*dy,ty=gy+Math.sin(angle)*dx+Math.cos(angle)*dy,ts=size*.70;ctx.save();ctx.globalAlpha=.65;ctx.drawImage(trail,tx-.43*ts,ty-.86*ts,ts,ts);ctx.restore();}
 ctx.save();ctx.translate(gx,gy);ctx.rotate(angle);ctx.drawImage(weapon,-def.pivot[0]*w,-def.pivot[1]*h,w,h);ctx.restore();}
 // Far-hand equipment is always behind the complete dressed body frame.
 ctx.drawImage(im,i%clip.cols*cw,Math.floor(i/clip.cols)*ch,cw,ch,x,y,width,size);
}

const frames={};
function sample(ds,t){let r=Math.max(0,t)%ds.reduce((a,b)=>a+b,0);for(let i=0;i<ds.length;i++){if(r<ds[i])return i;r-=ds[i];}return ds.length-1;}
function loadAssets(){
 if(pending)return pending;
 pending=Promise.all([Promise.all(Object.values(clips).map(async clip=>{clip.image=await load(clip.file);measure(clip);})),skin.weapon?load(skin.weapon.file).then(im=>weapons.axe=im):Promise.resolve(),skin.weapon&&skin.trail?load(skin.trail).then(im=>trail=im):Promise.resolve()]).then(()=>{
  for(const [name,clip] of Object.entries(clips))frames[name]=clip.durations.map((_,i)=>{
   const image=document.createElement('canvas');image.width=384;image.height=384;
   draw(image.getContext('2d'),clip,i,192,300,192);
   const flash=document.createElement('canvas');flash.width=384;flash.height=384;
   const fc=flash.getContext('2d');fc.drawImage(image,0,0);fc.globalCompositeOperation='source-in';fc.fillStyle='#fff5dd';fc.fillRect(0,0,384,384);
   return {image,flash};
  });ready=true;
 }).catch(e=>{console.warn('Militia animation unavailable; using existing unit art.',e);});
 return pending;
}
function accepts(u){return !u.monster&&!u.isLord&&(u.heroId==='militia'||u.isVanguard);}
function state(u,time,reduced){
 const elapsed=time-(u.meleeStartedAt??-Infinity),duration=u.meleeDuration??militiaSwingDuration(u);
 if(!reduced&&elapsed>=0&&elapsed<duration)return {clip:'attack',index:sample(clips.attack.durations,elapsed/duration*1.22)};
 if(!reduced&&u.moving)return {clip:'walk',index:sample(clips.walk.durations,time+(u.id||0)*.137)};
 return {clip:'attack',index:0};
}
function paint(ctx,u,time,height,reduced=false){
 if(!ready||!accepts(u))return false;
 const s=state(u,time,reduced),f=frames[s.clip][s.index],scale=height/192;
 ctx.drawImage(f.image,-192*scale,-300*scale,384*scale,384*scale);
 if(u.flash>0){ctx.save();ctx.globalAlpha*=Math.min(1,u.flash/.12)*.6;ctx.drawImage(f.flash,-192*scale,-300*scale,384*scale,384*scale);ctx.restore();}
 return true;
}
return {load:loadAssets,accepts,state,paint,get ready(){return ready;}};
})();
