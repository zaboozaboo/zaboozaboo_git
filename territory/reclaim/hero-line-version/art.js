// Atlas extraction reused from the original renderer; original files remain unchanged.
function unpackAtlas(image, cols, rows, isolate = false) {
  const tiles = [];
  for (let i=0; i<cols*rows; i++) {
    const row=Math.floor(i/cols);
    const x0=Math.round(i%cols*image.width/cols), y0=Math.max(0,Math.round(row*image.height/rows)-(isolate?Math.round(image.height/rows*.16):0));
    const w=Math.round((i%cols+1)*image.width/cols)-x0, h=Math.min(image.height,Math.round((row+1)*image.height/rows)+(isolate?Math.round(image.height/rows*.16):0))-y0;
    const work=document.createElement('canvas'); work.width=w; work.height=h;
    const c=work.getContext('2d',{willReadFrequently:true}); c.drawImage(image,x0,y0,w,h,0,0,w,h);
    if(isolate) {
      const pixels=c.getImageData(0,0,w,h),d=pixels.data,seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let largest=[];
      for(let seed=0;seed<w*h;seed++){
        if(seen[seed]||d[seed*4+3]<24)continue;
        let head=0,tail=1;queue[0]=seed;seen[seed]=1;
        while(head<tail){const n=queue[head++],x=n%w,y=Math.floor(n/w);
          for(const q of [x>0?n-1:-1,x<w-1?n+1:-1,y>0?n-w:-1,y<h-1?n+w:-1])if(q>=0&&!seen[q]&&d[q*4+3]>=24){seen[q]=1;queue[tail++]=q;}
        }
        if(tail>largest.length)largest=Array.from(queue.subarray(0,tail));
      }
      const keep=new Uint8Array(w*h);
      for(const n of largest)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const x=n%w+dx,y=Math.floor(n/w)+dy;if(x>=0&&x<w&&y>=0&&y<h)keep[y*w+x]=1;}
      for(let n=0;n<w*h;n++)if(!keep[n])d[n*4+3]=0;
      c.putImageData(pixels,0,0);
    }
    const data=c.getImageData(0,0,w,h).data;
    let l=w,r=0,t=h,b=0;
    for (let y=0;y<h;y++) for (let x=0;x<w;x++) if(data[(y*w+x)*4+3]>32) { l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y); }
    if(r<l || b<t) { l=0;t=0;r=w-1;b=h-1; }
    const sw=r-l+1,sh=b-t+1;
    const imageTile=document.createElement('canvas');
    const scale=Math.min(1,256/Math.max(sw,sh));
    imageTile.width=Math.max(1,Math.round(sw*scale));imageTile.height=Math.max(1,Math.round(sh*scale));
    imageTile.getContext('2d').drawImage(work,l,t,sw,sh,0,0,imageTile.width,imageTile.height);
    const flash=document.createElement('canvas');flash.width=imageTile.width;flash.height=imageTile.height;
    const fc=flash.getContext('2d');fc.drawImage(imageTile,0,0);fc.globalCompositeOperation='source-in';fc.fillStyle='#fff5dd';fc.fillRect(0,0,flash.width,flash.height);
    tiles.push({image:imageTile,flash,ratio:sw/sh,url:imageTile.toDataURL()});
  }
  return tiles;
}
