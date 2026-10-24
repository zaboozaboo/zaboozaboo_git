'use strict';
// Presentation only: snapshots of real growth, no combat or economy changes.
const CombatFeedback={
 growth:null,
 capture(){return {power:myPower(),atk:S.upgrades.atk,hp:S.upgrades.hp,spawn:S.upgrades.spawn,cap:S.upgrades.cap,castle:S.upgrades.castle,gold:S.upgrades.gold};},
 record(before,action){
  const after=this.capture();
  const changed=Object.keys(after).some(k=>after[k]!==before[k]);if(!changed)return;
  let detail=after.power!==before.power?`부대 전투력 ${fmt(before.power)} → ${fmt(after.power)}`:'';
  if(!detail){const labels={spawn:'출격 주기 단축',cap:'부대 정원 증가',castle:'아군 기지 강화',gold:'골드 수입 증가'};detail=Object.keys(labels).filter(k=>after[k]>before[k]).map(k=>labels[k]).join(' · ');}
  if(!detail)return;
  this.growth={before:this.growth?.pending?this.growth.before:before.power,after:after.power,detail,at:Date.now(),pending:true,action,powerChanged:after.power!==before.power};
 },
 refresh(){
  const conquest=this.conquest;
  let flag=document.getElementById('conquest-feedback');
  if(conquest&&conquest.until>Date.now()&&!UI.tab&&!firstBattlePaused()){
   if(!flag){flag=document.createElement('div');flag.id='conquest-feedback';flag.setAttribute('role','status');document.getElementById('game').append(flag);}
   flag.textContent=`${conquest.stage}단계 성 함락 · 내 영토 ${conquest.lands}곳`;
  }else flag?.remove();
  const g=this.growth;if(!g)return;
  if(g.pending&&!UI.tab&&MobileShell.mode==='battle'&&!firstBattlePaused()){
   g.pending=false;g.at=Date.now();
   for(const u of B.units.filter(u=>u.team===0&&u.hp>0))B.fx.push({type:'muster',x:u.x,y:u.y,t:0,life:1,color:'#ffe6a1'});
  }
  let host=document.getElementById('growth-feedback');
  const show=g.pending?Date.now()-g.at<3500:Date.now()-g.at<3000;
  if(!show){host?.remove();return;}
  if(!host){host=document.createElement('div');host.id='growth-feedback';host.setAttribute('role','status');document.getElementById('game').append(host);}
  host.classList.toggle('in-sheet',!!UI.tab);
  const value=g.powerChanged?`부대 전투력 <b>${fmt(g.before)} <span>→ ${fmt(g.after)}</span></b>`:g.detail;
  const html=`<small>군세 성장</small>${value}`;if(host.innerHTML!==html)host.innerHTML=html;
 }
};
