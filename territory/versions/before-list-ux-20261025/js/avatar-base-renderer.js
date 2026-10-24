/* Appearance consumes a pose; clothing never changes the walk or body anchors. */
(function(root){
'use strict';
function draw(c,p,{x,y,scale=100,outfit='base',bones=false}={}){
 const R=root.CompactAvatarRig,add=R.add;
 const project=v=>[x+(v[0]-p.root-v[1])*.707*scale,y+((v[0]-p.root+v[1])*.405-v[2]*.82)*scale];
 const skin='#e8c8a2',far='#b29a7d',edge='#665745';
 function shape(points,color){c.beginPath();points.map(project).forEach((v,i)=>i?c.lineTo(...v):c.moveTo(...v));c.closePath();c.fillStyle=color;c.fill();c.strokeStyle=edge;c.lineWidth=scale*.012;c.lineJoin='round';c.stroke();}
 function ball(v,rx,ry,color){const a=project(v);c.beginPath();c.ellipse(...a,rx*scale,ry*scale,0,0,Math.PI*2);const g=c.createLinearGradient(a[0]-rx*scale,a[1]-ry*scale,a[0]+rx*scale,a[1]+ry*scale);g.addColorStop(0,color);g.addColorStop(1,color===skin?'#cfa980':color);c.fillStyle=g;c.fill();}
 function limb(vs,r,color){c.beginPath();vs.map(project).forEach((v,i)=>i?c.lineTo(...v):c.moveTo(...v));c.lineCap='round';c.lineJoin='round';c.strokeStyle=edge;c.lineWidth=(r*2+.012)*scale;c.stroke();c.strokeStyle=color;c.lineWidth=r*2*scale;c.stroke();}
 function arm(a,i){limb([a.shoulder,a.elbow,a.hand],.078,i?skin:far);ball(a.hand,.089,.084,i?skin:far);if(outfit!=='base'){const end=a.shoulder.map((n,k)=>n+(a.elbow[k]-n)*.65);limb([a.shoulder,end],.091,i?'#447d8b':'#305664');}}
 function leg(l,i){limb([l.hip,l.knee,l.ankle,add(l.ankle,[.10,0,-.015])],.085,i?skin:far);if(outfit!=='base')limb([l.knee.map((v,k)=>v*.35+l.ankle[k]*.65),l.ankle,add(l.ankle,[.11,0,-.02])],.093,i?'#77503c':'#523e32');}
 // The same body-space anchors locate all skins, sleeves, hems and equipment.
 const anchors={head:p.head,waist:p.pelvis,leftHand:p.arms[0].hand,rightHand:p.arms[1].hand};
 c.save();c.fillStyle='#263d3928';c.beginPath();c.ellipse(x,y+scale*.015,scale*.25,scale*.075,0,0,Math.PI*2);c.fill();
 leg(p.legs[0],0);arm(p.arms[0],0);leg(p.legs[1],1);
 const center=p.pelvis.map((v,i)=>v*.5+p.chest[i]*.5);
 ball(center,.205,.25,skin);
 if(outfit!=='base'){
  const chest=p.chest,hip=p.pelvis;
  shape([add(chest,[0,-.20,.04]),add(chest,[0,.20,.04]),add(hip,[.025,.24,-.08]),add(hip,[.065,0,-.105]),add(hip,[.025,-.24,-.08])],'#427b87');
  // Separate collar, hem, belt and buckle: a garment silhouette rather than a body recolor.
  limb([add(chest,[.12,-.12,.025]),add(chest,[.16,0,-.035]),add(chest,[.12,.12,.025])],.022,'#e4dcc4');
  limb([add(hip,[.13,-.18,.085]),add(hip,[.19,0,.065]),add(hip,[.13,.18,.085])],.029,'#624534');
  ball(add(hip,[.20,.03,.065]),.032,.034,'#d6b461');
 }
 arm(p.arms[1],1);
 ball(p.head,.285,.275,skin);
 ball(add(p.head,[.01,.26,-.025]),.049,.066,skin);
 for(const yy of [-.085,.10])ball(add(p.head,[.25,yy,.005]),.017,.026,'#354142');
 if(bones){for(const a of p.arms)for(const v of [a.shoulder,a.elbow,a.hand])ball(v,.014,.014,'#40556b');for(const l of p.legs){for(const v of [l.hip,l.knee,l.ankle])ball(v,.014,.014,'#40556b');ball([l.ankle[0],l.ankle[1],0],.023,.016,l.planted?'#347449':'#e6bd54');}}
 c.restore();return anchors;
}
root.AvatarBaseRenderer={draw};
})(globalThis);
