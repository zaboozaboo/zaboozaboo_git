/* Editable vector original. Appearance never changes pose geometry or hand identity. */
(function(root){
const mix=(a,b,t)=>a+(b-a)*t,lerp=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t)),ease=t=>t*t*(3-2*t);
const rest={near:[92,202],far:[192,174],turn:0,weapon:-130};
const attack=[rest,{near:[65,146],far:[187,178],turn:-6,weapon:-155},{near:[83,106],far:[188,175],turn:-8,weapon:-112},{near:[143,190],far:[184,173],turn:8,weapon:32},{near:[135,205],far:[181,175],turn:10,weapon:63},rest];
function pose(time,mode='walk'){
 const q=((time%1.2)+1.2)%1.2/1.2,a=q*Math.PI*2;let p={...rest,near:[...rest.near],far:[...rest.far],nearFoot:[112,239],farFoot:[168,218],bob:0,phase:q};
 if(mode==='walk'){const s=Math.sin(a);p.nearFoot[0]+=s*2;p.nearFoot[1]+=s*6;p.farFoot[0]-=s*2;p.farFoot[1]-=s*6;p.near[1]-=s*3;p.far[1]+=s*3;p.bob=-Math.abs(Math.cos(a))*1.5;}
 if(mode==='attack'){const stops=[0,.22,.40,.55,.76,1];let i=0;while(i<4&&q>=stops[i+1])i++;const t=ease((q-stops[i])/(stops[i+1]-stops[i]));p.near=lerp(attack[i].near,attack[i+1].near,t);p.far=lerp(attack[i].far,attack[i+1].far,t);p.turn=mix(attack[i].turn,attack[i+1].turn,t);p.weapon=mix(attack[i].weapon,attack[i+1].weapon,t);}
 return p;
}
function limb(a,b,width){const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1,n=[-dy/l,dx/l],m=lerp(a,b,.53);m[0]-=7;m[1]+=4;return `M${a[0]+n[0]*width},${a[1]+n[1]*width} Q${m[0]+n[0]*width},${m[1]+n[1]*width} ${b[0]+n[0]*width*.72},${b[1]+n[1]*width*.72} Q${b[0]+dx*.1},${b[1]+dy*.1} ${b[0]-n[0]*width*.72},${b[1]-n[1]*width*.72} Q${m[0]-n[0]*width},${m[1]-n[1]*width} ${a[0]-n[0]*width},${a[1]-n[1]*width} Q${a[0]-dx*.1},${a[1]-dy*.1} ${a[0]+n[0]*width},${a[1]+n[1]*width} Z`;}
function svg(time=0,{skin='base',mode='walk',weapon=false,guides=false,id='avatar'}={}){
 const p=pose(time,mode),dressed=skin==='militia',prefix=id.replace(/[^a-zA-Z0-9]/g,''),g=n=>`url(#${prefix+n})`,outline='#594438';
 const path=(d,fill,extra='')=>`<path d="${d}" fill="${fill}" ${extra.includes('stroke=')?'':`stroke="${outline}"`} stroke-width="2" stroke-linejoin="round" ${extra}/>`;
 const ellipse=(x,y,rx,ry,fill,extra='')=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
 const foot=(pos,near)=>`<g transform="translate(${pos})">${path('M-16 -20 Q-4 -27 9 -19 L15 -8 Q32 -4 29 7 Q25 17 4 17 Q-19 14 -20 5Z',g(dressed?'leather':near?'skin':'shade'))}${path('M-14 -4 Q3 -11 19 -3 Q29 3 21 8 Q2 16 -14 6Z',dressed?'#b07a4e':'#f3dfbd','stroke-opacity=".2"')}</g>`;
 const arm=(near)=>{const a=near?[91,166]:[179,148],b=near?p.near:p.far;return `<g data-part="${near?'right':'left'}-arm">${path(limb(a,b,near?15:12),g(dressed?'leather':near?'skin':'shade'))}${dressed?path(limb(a,lerp(a,b,.35),near?17:14),g('blue')):''}</g>`;};
 const hand=(near)=>{const b=near?p.near:p.far;return `<g data-part="${near?'right':'left'}-hand">${ellipse(...b,near?16:13,near?14:12,g(dressed?'leather':'skin'),`stroke="${outline}" stroke-width="2" transform="rotate(-20 ${b})"`)}${ellipse(b[0]+8,b[1]-5,6,7,dressed?'#a46c43':'#f1dab5')}</g>`;};
 let body=foot(p.farFoot,false)+foot(p.nearFoot,true);
 body+=`<g transform="translate(0 ${p.bob}) rotate(${p.turn} 139 188)">`+arm(false)+hand(false);
 body+=path('M107 143 Q140 125 172 144 Q190 159 185 183 Q182 206 156 216 Q130 224 106 205 Q89 184 96 164Z',g(dressed?'blue':'skin'));
 body+=path('M108 145 Q140 130 171 145 Q160 157 139 161 Q118 158 108 145Z',dressed?'#548dd7':'#f7e6c9','stroke-opacity=".2"');
 if(dressed){body+=path('M103 181 Q141 201 183 180 L180 193 Q140 215 105 195Z','#6a462f');body+=path('M144 192 L159 190 L161 203 L146 206Z','#d7af50');}
 body+=`<g data-part="head" transform="rotate(-12 137 113)">`;
 body+=path('M71 72 Q81 39 125 37 Q172 35 193 70 Q212 99 197 129 Q186 151 151 158 Q107 165 77 140 Q57 120 62 96Z',g(dressed?'face':'skin'));
 body+=path('M72 80 Q83 47 126 45 Q165 43 184 69 Q148 54 111 74 Q85 87 72 80Z',dressed?'#f9d7a8':'#fff0d5','stroke="none" opacity=".65"');
 if(dressed)body+=path('M61 100 Q45 91 58 73 L77 44 Q112 13 153 28 Q187 38 198 74 Q161 48 130 60 Q89 74 69 121Z',g('blue'))+path('M69 112 Q96 69 143 60 Q177 57 195 74 L193 83 Q163 66 139 72 Q94 86 76 124Z','#f2dfb8');
 body+=ellipse(132,119,5,9,'#302724')+ellipse(174,108,4,8,'#302724')+ellipse(161,126,7,6,dressed?'#d78d55':'#e1bb8f');
 if(dressed){body+=path('M103 123 Q112 136 131 130 Q147 124 157 135 Q177 132 190 121 Q189 149 164 161 Q135 172 111 151Z',g('beard'));body+=path('M127 132 Q148 117 164 134 Q151 143 145 135 Q134 141 127 132Z','#75482d');body+=path('M122 103 Q132 98 139 103 M167 94 Q175 90 182 94','none','stroke-width="5" stroke-linecap="round"');}
 body+='</g>'+arm(true);
 if(weapon){body+=`<g data-part="weapon" transform="translate(${p.near}) rotate(${p.weapon})">${path('M-17 -4 L75 -4 L75 5 L-17 5Z',g('wood'))}${path('M57 -11 L72 -11 L76 8 Q75 23 89 38 Q66 54 45 37 Q60 20 57 -11Z',g('metal'))}${path('M45 37 L50 29 Q68 44 85 31 L89 38 Q66 54 45 37Z','#eef0e7')}${path('M57 -11 L64 -15 L79 -12 L72 -8Z','#dbe4e6')}</g>`;}
 body+=hand(true);
 if(guides){body+=`<path d="M91 166 L${p.near} M179 148 L${p.far}" fill="none" stroke="#f85c6b" stroke-width="2"/>`;for(const a of [[91,166],p.near,[179,148],p.far])body+=ellipse(...a,3,3,'#49b9cc');}
 body+='</g>';
 const gradients=[['skin','#fff0d4','#cba477'],['shade','#e0c59c','#ad895f'],['face','#ffe0b3','#d39464'],['blue','#4c8bf0','#164ab4'],['leather','#ba8354','#63402d'],['beard','#a77045','#56341f'],['wood','#c3915b','#72462a'],['metal','#e4e8e8','#8297a5']].map(([n,a,b])=>`<linearGradient id="${prefix+n}" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 285" role="img" aria-label="${dressed?'민병':'기본 몸'} ${mode}"><defs>${gradients}</defs>${body}</svg>`;
}
root.EditableAvatar={pose,svg};if(typeof module!=='undefined')module.exports={pose,svg};
})(globalThis);
