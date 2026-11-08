'use strict';
// Convex polyhedra, projected from real vertices; face count is not a decorative label.
const PolyDice={
 cache:{},
 dot:(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0),
 cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
 unit(v){const l=Math.hypot(...v);return v.map(x=>x/l);},
 geometry(n){
  if(this.cache[n])return this.cache[n];let v=[];
  if(n===8)v=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
  if(n===10){const a=.13,h=a*(1+Math.cos(Math.PI/5))/(1-Math.cos(Math.PI/5));v=[[0,0,h],[0,0,-h],...Array.from({length:10},(_,i)=>[Math.cos(i*Math.PI/5),Math.sin(i*Math.PI/5),i%2?-a:a])];}
  if(n===12){const g=(1+Math.sqrt(5))/2;for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])v.push([x,y,z]);for(const a of [-1,1])for(const b of [-1,1])v.push([0,a/g,b*g],[a/g,b*g,0],[b*g,0,a/g]);}
  const faces=[],seen=new Set();
  for(let i=0;i<v.length;i++)for(let j=i+1;j<v.length;j++)for(let k=j+1;k<v.length;k++){
   let normal=this.cross(v[j].map((x,c)=>x-v[i][c]),v[k].map((x,c)=>x-v[i][c]));if(Math.hypot(...normal)<1e-7)continue;normal=this.unit(normal);let d=this.dot(normal,v[i]);const ds=v.map(p=>this.dot(normal,p)-d);if(ds.some(x=>x>1e-6)&&ds.some(x=>x< -1e-6))continue;if(d<0){normal=normal.map(x=>-x);d=-d;}
   const ids=v.map((p,i)=>Math.abs(this.dot(normal,p)-d)<1e-6?i:-1).filter(i=>i>=0),key=ids.join(',');if(seen.has(key))continue;seen.add(key);
   const center=[0,1,2].map(c=>ids.reduce((s,i)=>s+v[i][c],0)/ids.length),u=this.unit(v[ids[0]].map((x,c)=>x-center[c])),w=this.cross(normal,u);
   ids.sort((a,b)=>Math.atan2(this.dot(v[a].map((x,c)=>x-center[c]),w),this.dot(v[a].map((x,c)=>x-center[c]),u))-Math.atan2(this.dot(v[b].map((x,c)=>x-center[c]),w),this.dot(v[b].map((x,c)=>x-center[c]),u)));
   faces.push({ids,normal,center});
  }
  const radius=Math.max(...v.map(p=>Math.hypot(...p)));return this.cache[n]={v:v.map(p=>p.map(x=>x/radius)),faces:faces.map(f=>({...f,center:f.center.map(x=>x/radius)}))};
 },
 draw(canvas,n,result,rolling){
  const mesh=this.geometry(n),face=mesh.faces[result-1]||mesh.faces[0],axis=this.cross(face.normal,[0,0,1]),cos=face.normal[2];
  const align=p=>{if(cos<-.99999)return [p[0],-p[1],-p[2]];const a=this.cross(axis,p),b=this.cross(axis,a);return p.map((x,i)=>x+a[i]+b[i]/(1+cos));};
  const t=rolling?performance.now()/240:0;
  const rotate=p=>{let [x,y,z]=align(p),a=rolling?t:.16,b=rolling?t*1.37:-.18;[y,z]=[y*Math.cos(a)-z*Math.sin(a),y*Math.sin(a)+z*Math.cos(a)];return [x*Math.cos(b)+z*Math.sin(b),y,-x*Math.sin(b)+z*Math.cos(b)];};
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,160,160);const points=mesh.v.map(rotate),project=p=>[80+p[0]*61/(1-p[2]*.16),80-p[1]*61/(1-p[2]*.16)];
  mesh.faces.map((f,i)=>({...f,i,normal:rotate(f.normal),center:rotate(f.center)})).filter(f=>f.normal[2]>0).sort((a,b)=>a.center[2]-b.center[2]).forEach(f=>{ctx.beginPath();f.ids.forEach((id,i)=>{const p=project(points[id]);i?ctx.lineTo(...p):ctx.moveTo(...p)});ctx.closePath();const light=Math.round(76+15*Math.max(0,this.dot(f.normal,this.unit([-.4,.7,1]))));const glaze=ctx.createLinearGradient(20,15,125,145);glaze.addColorStop(0,`hsl(44 69% ${Math.min(97,light+5)}%)`);glaze.addColorStop(1,`hsl(40 52% ${light-7}%)`);ctx.fillStyle=glaze;ctx.fill();ctx.lineJoin='round';ctx.lineWidth=2.5;ctx.strokeStyle='#b69a61';ctx.stroke();if(f.normal[2]>.35&&(rolling||f.i===result-1)){const p=project(f.center);ctx.fillStyle='#243e31';ctx.font=`800 ${f.i===result-1&&!rolling?48:24}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(f.i+1),...p);}});
 },
 mount(canvas,n,result,rolling){const frame=()=>{if(!canvas.isConnected)return;this.draw(canvas,n,result,rolling&&!matchMedia('(prefers-reduced-motion: reduce)').matches);if(rolling&&!matchMedia('(prefers-reduced-motion: reduce)').matches)requestAnimationFrame(frame);};frame();}
};
