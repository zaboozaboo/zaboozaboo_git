/* Sprite-only body player. Equipment and hand sockets remain separate. */
(function(root){
'use strict';
const loadImage=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('이미지 로드 실패: '+src));im.src=src;});
function sample(clip,time){const total=clip.durations.reduce((a,b)=>a+b,0);let rest=((time%total)+total)%total;for(let i=0;i<clip.durations.length;i++){if(rest<clip.durations[i])return {index:i,progress:rest/clip.durations[i],total};rest-=clip.durations[i];}return {index:0,progress:0,total};}
async function load(base){const response=await fetch(base+'character-base-animation.json');if(!response.ok)throw new Error('애니메이션 정보 로드 실패');const data=await response.json(),sheets={},equipment={};
 await Promise.all(Object.entries(data.sheets).map(async([key,def])=>{const image=await loadImage(base+def.file),cw=image.width/def.columns,ch=image.height/def.rows,cv=document.createElement('canvas');cv.width=image.width;cv.height=image.height;const ctx=cv.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,cv.width,cv.height).data,frames=[];
 for(let row=0;row<def.rows;row++){frames[row]=[];for(let col=0;col<def.columns;col++){let top=ch,bottom=0,headLeft=cw,headRight=0;for(let y=0;y<Math.floor(ch);y++)for(let x=0;x<Math.floor(cw);x++){const xx=Math.floor(col*cw+x),yy=Math.floor(row*ch+y);if(pixels[(yy*cv.width+xx)*4+3]>48){top=Math.min(top,y);bottom=Math.max(bottom,y);if(y>ch*.12&&y<ch*.43){headLeft=Math.min(headLeft,x);headRight=Math.max(headRight,x);}}}frames[row][col]={sx:col*cw,sy:row*ch,cx:(headLeft+headRight)/2,bottom,top,height:bottom-top+1};}}
 // One scale for the entire sheet: never stretch each pose to a new shape.
 const heights=frames.flat().map(f=>f.height).sort((a,b)=>a-b);sheets[key]={image,cw,ch,frames,bodyHeight:heights[Math.floor(heights.length/2)]};}));
 await Promise.all(Object.entries(data.equipment).map(async([key,def])=>{equipment[key]=await loadImage(base+def.file);}));return {data,sheets,equipment};}
function draw(c,assets,action,time,{x,y,height=200,weapons=false,markers=false,frame=null}={}){const clip=assets.data.clips[action],state=sample(clip,time),index=frame===null?state.index:frame,sh=assets.sheets[clip.sheet],f=sh.frames[clip.row][index],scale=height/sh.bodyHeight,dx=x-f.cx*scale,dy=y-f.bottom*scale,socket=clip.sockets[index];
 c.save();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(sh.image,f.sx,f.sy,sh.cw,sh.ch,dx,dy,sh.cw*scale,sh.ch*scale);
 const point=v=>[dx+v[0]*sh.cw*scale,dy+v[1]*sh.ch*scale];
 if(socket&&weapons){const grip=point(socket.grip),def=assets.data.equipment[action],im=assets.equipment[action];
 if(action==='club'){const w=height*def.lengthInBodyHeights,h=w*im.height/im.width;c.save();c.translate(...grip);c.rotate(socket.angle);c.drawImage(im,-def.pivot[0]*w,-def.pivot[1]*h,w,h);c.restore();}
 if(action==='bow'){const h=height*def.heightInBodyHeights,w=h*im.width/im.height,ox=grip[0]-def.pivot[0]*w,oy=grip[1]-h*.5,drawPoint=point(socket.draw),tips=def.stringTips.map(v=>[ox+v[0]*w,oy+v[1]*h]);const released=index===clip.releaseFrame,nock=released?[tips[0][0],grip[1]]:drawPoint;
 c.strokeStyle='#eadbb6';c.lineWidth=Math.max(1,height*.005);c.beginPath();c.moveTo(...tips[0]);c.lineTo(...nock);c.lineTo(...tips[1]);c.stroke();c.drawImage(im,ox,oy,w,h);
 if(index>=1&&index<=4){const flight=released?state.progress*height*.7:0,start=[nock[0]+flight,nock[1]],end=[grip[0]+height*.20+flight,grip[1]];c.strokeStyle='#735035';c.lineWidth=Math.max(1,height*.009);c.beginPath();c.moveTo(...start);c.lineTo(...end);c.stroke();c.fillStyle='#b9c4c2';c.beginPath();c.moveTo(end[0]+height*.04,end[1]);c.lineTo(end[0]-height*.02,end[1]-height*.025);c.lineTo(end[0]-height*.02,end[1]+height*.025);c.fill();}}
 // Repaint only a small source patch around the fist over the attachment handle.
 const radius=sh.cw*.044,px=socket.grip[0]*sh.cw,py=socket.grip[1]*sh.ch;c.save();c.beginPath();c.arc(...grip,radius*scale,0,Math.PI*2);c.clip();c.drawImage(sh.image,f.sx,f.sy,sh.cw,sh.ch,dx,dy,sh.cw*scale,sh.ch*scale);c.restore();
 }
 if(markers&&socket){for(const [name,v] of Object.entries(socket)){if(!Array.isArray(v))continue;const pos=point(v);c.strokeStyle=name==='grip'?'#df495a':'#2199e0';c.lineWidth=1.5;c.beginPath();c.arc(...pos,4,0,Math.PI*2);c.stroke();}}
 c.restore();return {index,label:clip.labels[index],socket};}
root.CharacterBaseAnimation={load,draw,sample};if(typeof module!=='undefined')module.exports={sample};
})(globalThis);
