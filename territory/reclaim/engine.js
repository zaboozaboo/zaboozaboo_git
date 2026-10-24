/* Isolated reclamation experiment. No dependency on the original game state. */
(function(root){
'use strict';
const KEY='territory_reclaim_v1';
const places={
 camp:{name:'포로 야영지',sub:'민병을 구출해 함께 싸우세요',reward:70,hp:160,waves:3,interval:8,power:.58},
 range:{name:'점령된 사격장',sub:'탈환하면 측면 궁수 지원이 시작됩니다',reward:100,hp:380,waves:7,interval:9,power:1},
 keep:{name:'햇살 숲 요새',sub:'수비대와 성벽을 넘어 첫 지역을 되찾으세요',reward:160,hp:950,waves:13,interval:7,power:1.35},
 rival:{name:'기사 로웬 · 서열 19위',sub:'NPC 연습전 · 전열과 궁수 혼성 부대',reward:120,hp:1100,waves:14,interval:7,power:1.5}
};
function fresh(){return {version:1,gold:0,lands:[],levels:{melee:1,ranged:1},hans:false,equipped:true,rank:20,stats:{battles:0,wins:0,spent:0},history:[]};}
function restore(raw){try{const v=JSON.parse(raw);if(v?.version!==1)return fresh();const s=fresh();s.gold=Math.max(0,Math.min(1e8,Number(v.gold)||0));s.lands=['camp','range','keep','rival'].filter(k=>v.lands?.includes(k));for(const k of ['melee','ranged'])s.levels[k]=Math.max(1,Math.min(6,Math.floor(Number(v.levels?.[k])||1)));s.hans=!!v.hans&&s.lands.includes('range');s.equipped=v.equipped!==false;s.rank=s.lands.includes('rival')?19:20;for(const k of Object.keys(s.stats))s.stats[k]=Math.max(0,Number(v.stats?.[k])||0);s.history=Array.isArray(v.history)?v.history.slice(-12).filter(x=>typeof x==='string'):[];return s;}catch{return fresh();}}
const owns=(s,k)=>s.lands.includes(k);
const unlocked=(s,k)=>k==='camp'||(k==='range'||k==='keep')&&owns(s,'camp')||k==='rival'&&owns(s,'keep');
const cost=(s,k)=>40+30*(s.levels[k]-1);
function upgrade(s,k){if(!['melee','ranged'].includes(k)||!owns(s,k==='melee'?'camp':'range')||s.levels[k]>=6||s.gold<cost(s,k))return false;s.gold-=cost(s,k);s.stats.spent+=cost(s,k);s.levels[k]++;return true;}
function recruit(s){if(s.hans||!owns(s,'range'))return false;s.hans=true;return true;}
class Battle{
 constructor(s,key,options={}){if(!places[key]||!unlocked(s,key))throw Error('Locked target');this.s=s;this.key=key;this.def=places[key];this.options=options;this.t=0;this.units=[];this.effects=[];this.events=[];this.id=0;this.enemyHp=this.def.hp;this.homeHp=550;this.wave=0;this.waveAt=2;this.spawnAt=2;this.supportAt=9;this.commandAt=7;this.rescued=false;this.done=false;this.kills=0;this.supports=0;this.commands=0;this.spawned=0;this.report=null;this.add('lord',0,160,510);if(s.hans&&s.equipped&&!options.noHans)this.add('hans',0,190,525);this.note('attack','공격 시작 · '+this.def.name);}
 note(type,text){this.events.push({type,text,t:this.t});if(this.events.length>30)this.events.shift();}
 add(kind,team,x,y,source='base'){
 const l=this.s.levels[kind==='archer'?'ranged':'melee'];const mul=team?this.def.power:kind==='lord'||kind==='hans'?1:1+(l-1)*.23;
 const d={lord:[300,18,27,29],hans:[220,13,28,32],militia:[85,9,25,32],archer:[55,10,125,29],guard:[100,10,25,27],bow:[55,11,120,26]}[kind];
 const u={id:++this.id,kind,team,x,y,hp:d[0]*mul,maxHp:d[0]*mul,atk:d[1]*mul,range:d[2],speed:d[3],cd:0,buff:0,moving:false,source,flash:0,heroId:'militia',meleeDuration:.65};this.units.push(u);return u;
 }
 count(kind){return this.units.filter(u=>u.team===0&&u.kind===kind&&u.hp>0).length;}
 squad(kind,n,source='base'){const cap=kind==='archer'?8:8+(this.s.levels.melee>=3?4:0);n=Math.min(n,cap-this.count(kind));for(let i=0;i<n;i++){this.add(kind,0,source==='side'?12+i*15:125+i*24,source==='side'?300+i*12:535+Math.abs(i-1)*10,source);this.spawned++;}if(n){this.note(source==='side'?'support':'spawn',source==='side'?'사격장 지원군 도착 · 궁수 '+n+'명':'민병 분대 출격 · '+n+'명');this.effects.push({type:'arrival',x:source==='side'?35:160,y:source==='side'?315:535,life:2});}return n;}
 step(dt){if(this.done)return;dt=Math.min(.1,Math.max(0,dt));this.t+=dt;this.effects=this.effects.filter(e=>(e.life-=dt)>0);
 // The cage opens only after guards have actually been defeated.
 if(this.key==='camp'&&!this.rescued&&this.kills>=2){this.rescued=true;for(let i=0;i<4;i++)this.add('militia',0,60+i*18,300,'rescue');this.note('rescue','포로 해방! 민병 4명이 함께 싸웁니다');this.effects.push({type:'rescue',x:90,y:300,life:3});}
 if(this.wave<this.def.waves&&this.t>=this.waveAt){this.wave++;this.waveAt+=this.def.interval;const n=this.key==='camp'?2:3;for(let i=0;i<n;i++)this.add(this.key!=='camp'&&i===2?'bow':'guard',1,110+i*45,135+i*12);}
 if(owns(this.s,'camp')&&this.t>=this.spawnAt){this.spawnAt+=9;this.squad('militia',this.s.levels.melee>=3?3:2);}
 if(owns(this.s,'range')&&!this.options.noSupport&&this.t>=this.supportAt){this.supportAt+=15;const n=this.squad('archer',this.s.levels.ranged>=3?3:2,'side');if(n)this.supports++;}
 const hans=this.units.find(u=>u.kind==='hans'&&u.hp>0);if(hans&&this.t>=this.commandAt){this.commandAt+=12;let n=0;for(const u of this.units)if(u.team===0&&u.kind==='militia'&&Math.hypot(u.x-hans.x,u.y-hans.y)<160){u.buff=4;n++;}if(n){this.commands++;this.note('command','한스의 진군 명령 · 민병 '+n+'명');this.effects.push({type:'command',x:hans.x,y:hans.y,life:2});}}
 for(const u of this.units){if(u.hp<=0)continue;u.cd-=dt;u.buff=Math.max(0,u.buff-dt);u.flash=Math.max(0,u.flash-dt);u.moving=false;let target=null,best=Infinity;for(const v of this.units)if(v.team!==u.team&&v.hp>0){const d=Math.hypot(v.x-u.x,v.y-u.y);if(d<best){target=v;best=d;}}
 const tx=target?target.x:160,ty=target?target.y:u.team?555:75;const distance=Math.hypot(tx-u.x,ty-u.y);
 if(distance>u.range){const speed=u.speed*(u.buff?1.65:1);u.x+=(tx-u.x)/distance*speed*dt;u.y+=(ty-u.y)/distance*speed*dt;u.moving=true;}
 else if(u.cd<=0){u.cd=u.kind==='archer'||u.kind==='bow'?1.3:1.05;u.meleeStartedAt=this.t;const damage=u.atk*(u.buff?1.25:1);if(target){target.hp-=damage;target.flash=.15;if(target.hp<=0&&target.team===1)this.kills++;}else if(u.team)this.homeHp-=damage;else this.enemyHp-=damage;this.effects.push({type:u.range>60?'arrow':'hit',x:u.x,y:u.y,tx,ty,life:u.range>60?.25:.15});}}
 // Small same-team separation makes individual ranks and incoming squads readable.
 for(let i=0;i<this.units.length;i++)for(let j=i+1;j<this.units.length;j++){const a=this.units[i],b=this.units[j];if(a.hp<=0||b.hp<=0||a.team!==b.team)continue;const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d<15){const push=(15-d)*.12;a.x-=d?dx/d*push:push;b.x+=d?dx/d*push:push;}}
 this.units=this.units.filter(u=>u.hp>0);for(const u of this.units){u.x=Math.max(15,Math.min(305,u.x));u.y=Math.max(65,Math.min(560,u.y));}
 if(this.enemyHp<=0)this.finish(true);else if(this.homeHp<=0||this.t>=180)this.finish(false);
 }
 finish(win){if(this.done)return;this.done=true;const first=win&&!owns(this.s,this.key);const gold=(win?(first?this.def.reward:Math.round(this.def.reward*.3)):Math.min(35,this.kills*3));this.s.gold+=gold;this.s.stats.battles++;if(win)this.s.stats.wins++;if(first)this.s.lands.push(this.key);if(win&&this.key==='rival')this.s.rank=19;this.report={win,first,gold,time:Math.round(this.t),kills:this.kills,supports:this.supports,commands:this.commands};this.s.history.push(`${this.def.name} · ${win?'승리':'패배'} · ${Math.round(this.t)}초 · 지원 ${this.supports}회 · 지휘 ${this.commands}회`);this.s.history=this.s.history.slice(-12);this.note('end',win?'탈환 성공':'부대를 정비하고 다시 도전하세요');}
}
const api={KEY,places,fresh,restore,owns,unlocked,cost,upgrade,recruit,Battle};if(typeof module!=='undefined')module.exports=api;else root.Reclaim=api;
})(typeof window==='undefined'?globalThis:window);
