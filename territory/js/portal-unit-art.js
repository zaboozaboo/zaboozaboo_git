'use strict';
// Each source is an authored front/back pair. Preserve alpha and use shared scale.
const PortalUnitArt={
 frames:{},pending:new Set(),failed:new Set(),
 file(id){return `assets/portal-units-v1/${id}.png`;},
 load(id){
  if(!/^pm_[0-9]_[0-5]$/.test(id)||this.frames[id]||this.pending.has(id)||this.failed.has(id))return;
  this.pending.add(id);const image=new Image();
  image.onload=()=>{try{this.frames[id]=this.unpack(image);}catch(error){this.failed.add(id);console.warn('Invalid portal unit art',id,error);}finally{this.pending.delete(id);}};
  image.onerror=()=>{this.pending.delete(id);this.failed.add(id);};image.src=this.file(id);
 },
 unpack(image){
  if(Math.abs(image.width/image.height-2)>.1)throw new Error('Expected two square direction cells');
  const cw=Math.floor(image.width/2),ch=image.height,bounds=[];
  const source=document.createElement('canvas');source.width=image.width;source.height=ch;
  const sc=source.getContext('2d',{willReadFrequently:true});sc.drawImage(image,0,0);
  const data=sc.getImageData(0,0,image.width,ch).data;
  for(let cell=0;cell<2;cell++){
   let left=cw,right=0,top=ch,bottom=0;
   for(let y=0;y<ch;y++)for(let x=0;x<cw;x++)if(data[(y*image.width+cell*cw+x)*4+3]>40){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
   if(right<=left||bottom<=top)throw new Error('Empty direction cell');
   if(left===0&&right===cw-1&&top===0&&bottom===ch-1)throw new Error('Background must be transparent');
   bounds.push({left,right,top,bottom});
  }
  const height=Math.max(...bounds.map(b=>b.bottom-b.top+1)),width=Math.max(...bounds.map(b=>b.right-b.left+1));
  const size=Math.max(width,height)*1.12,scale=192/size;
  return bounds.map((b,i)=>{
   const imageTile=document.createElement('canvas');imageTile.width=192;imageTile.height=192;
   const c=imageTile.getContext('2d');const w=b.right-b.left+1,h=b.bottom-b.top+1;
   c.drawImage(image,i*cw+b.left,b.top,w,h,(192-w*scale)/2,180-h*scale,w*scale,h*scale);
   const flash=document.createElement('canvas');flash.width=192;flash.height=192;const fc=flash.getContext('2d');fc.drawImage(imageTile,0,0);fc.globalCompositeOperation='source-in';fc.fillStyle='#fff5dd';fc.fillRect(0,0,192,192);
   return {image:imageTile,flash,ratio:1,url:imageTile.toDataURL(),vertical:true};
  });
 },
 portrait(id){this.load(id);return this.frames[id]?.[0];},
 sprite(u){
  if(!u.heroId?.startsWith('pm_'))return null;this.load(u.heroId);
  if(Number.isFinite(u.artLastX)&&Math.abs(u.x-u.artLastX)>.01)u.artUp=u.x>u.artLastX;
  else if(u.target&&Math.abs(u.target.x-u.x)>2)u.artUp=u.target.x>u.x;
  u.artLastX=u.x;return this.frames[u.heroId]?.[(u.artUp??u.team===0)?1:0];
 }
};
