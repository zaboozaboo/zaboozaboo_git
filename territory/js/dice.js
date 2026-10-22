'use strict';
const DICE_HANDS=[['파이브카드',8],['포카드',5],['풀하우스',4],['스트레이트',4],['트리플',3],['투페어',2],['원페어',2],['하이카드',1]];
function ensureDice(){
 if(!S.dice||typeof S.dice!=='object')S.dice={};
 const active=S.slots.slice(0,slotCount()).map((id,i)=>id?i:-1).filter(i=>i>=0);
 if(!Array.isArray(S.dice.faces)||S.dice.faces.length!==6)S.dice.faces=Array.from({length:6},(_,i)=>active.length?active[i%active.length]:0);
 S.dice.faces=S.dice.faces.map((v,i)=>Number.isInteger(v)&&v>=-1&&v<slotCount()?v:(active[i%active.length]??0));
 if(!Array.isArray(S.dice.history))S.dice.history=[];
 S.dice.history=S.dice.history.filter(n=>Number.isInteger(n)&&n>=1&&n<=6).slice(-5);
 if(!Number.isFinite(S.dice.progress))S.dice.progress=0;
 S.dice.progress=Math.max(0,Math.min(.99999,S.dice.progress));
}
function diceHand(history){
 if(history.length<5)return {name:'눈금 모으는 중',mult:1};
 const counts=Object.values(history.reduce((a,n)=>(a[n]=(a[n]||0)+1,a),{})).sort((a,b)=>b-a);
 const sorted=[...new Set(history)].sort((a,b)=>a-b);
 const index=counts[0]===5?0:counts[0]===4?1:counts[0]===3&&counts[1]===2?2:sorted.length===5&&sorted[4]-sorted[0]===4?3:counts[0]===3?4:counts[0]===2&&counts[1]===2?5:counts[0]===2?6:7;
 return {name:DICE_HANDS[index][0],mult:DICE_HANDS[index][1]};
}
function diceCooldown(){return Math.max(1.5,4/armyMult().spawn*Math.pow(.9,typeof facilityCount==='function'?facilityCount('training'):0));}
function setDiceFace(face,slot){ensureDice();if(!Number.isInteger(face)||face<0||face>5||!Number.isInteger(slot)||slot<0||slot>=slotCount()||!S.slots[slot])return false;S.dice.faces[face]=slot;return true;}
function rollProduction(random=Math.random){
 ensureDice();const face=Math.min(6,Math.floor(random()*6)+1);S.dice.history.push(face);S.dice.history=S.dice.history.slice(-5);
 const hand=diceHand(S.dice.history),slot=S.dice.faces[face-1],id=S.slots[slot];
 const count=id?Math.min(hand.mult,Math.max(0,heroCap(id)-slotAlive(0,slot,id))):0;
 if(count>0){const pos=formationPosition(slot);const first=B.units.length;spawnHero(0,id,pos,undefined,undefined,slot,count);
 B.units.slice(first).forEach((u,i)=>{u.arrivalAt=Date.now()+i*65;B.fx.push({type:'muster',x:u.x,y:u.y,t:-i*.065,life:.55,color:hand.mult>=4?'#ffd366':'#92ecda'});});
 if(hand.mult>=3)addText(pos.x+25,pos.y,'+'+count+'명 출격','#ffe399',15,30);B.fx.push({type:'ring',x:pos.x,y:pos.y,r:4,max:28,t:0,life:.45,color:'#ffe39b'});}
 S.dice.rolls=(Number.isSafeInteger(S.dice.rolls)?S.dice.rolls:0)+1;
 S.dice.last={face,slot,id,count,requested:hand.mult,name:hand.name};
 B.diceCue={...S.dice.last,roll:S.dice.rolls,until:Date.now()+1300};
 return S.dice.last;
}
function tickDice(dt){ensureDice();S.dice.progress+=dt/diceCooldown();while(S.dice.progress>=1){S.dice.progress-=1;rollProduction();}for(let i=0;i<slotCount();i++)B.spawnT[i]=S.dice.progress;}
function dieFace(n,extra=''){return `<span class="die-face ${extra}" aria-label="${n} 눈금" data-face="${n}">${[1,2,3,4,5,6,7,8,9].map(i=>`<i class="pip p${i}"></i>`).join('')}</span>`;}
function diceOdds(){return S.slots.slice(0,slotCount()).map((id,i)=>id?`<span>${HERO_BY_ID[id].unit.name} <b>${Math.round(S.dice.faces.filter(n=>n===i).length/6*100)}%</b></span>`:'').join('');}
function diceEditor(){ensureDice();return `<section class="sec dice-editor"><h3>자동 주사위 · 6면 편성</h3><p class="hint">${diceCooldown().toFixed(1)}초마다 자동 생산 · 같은 배럭을 여러 면에 넣으면 생산 확률이 높아집니다. 빈 배럭 면은 생산하지 않습니다.</p><div class="dice-faces">${S.dice.faces.map((slot,i)=>`<label>${dieFace(i+1)}<select aria-label="주사위 ${i+1}번 면 배럭" data-dice-face="${i}">${S.slots.slice(0,slotCount()).map((id,j)=>`<option value="${j}" ${slot===j?'selected':''} ${id?'':'disabled'}>${id?HERO_BY_ID[id].building:'빈 배럭'}</option>`).join('')}</select></label>`).join('')}</div><div class="dice-odds">${diceOdds()}</div><details><summary>최근 5개 족보와 생산량</summary><p>5칸이 차기 전 1명. 이후 가장 오래된 눈금을 빼고 매번 판정합니다. 나온 면의 배럭만 생산하며, 부대 정원을 넘으면 초과 병력은 생산되지 않습니다. 배럭을 바꿔도 눈금은 유지됩니다.</p><div class="hand-table">${DICE_HANDS.map(([name,m])=>`<span>${name}<b>×${m}</b></span>`).join('')}</div></details></section>`;}
function refreshDiceHUD(){
 const host=document.getElementById('dice-hud');if(!host)return;ensureDice();
 const rolling=S.dice.progress>.84,shifting=S.dice.progress>.72&&! (S.dice.progress>.84)&&S.dice.history.length===5,spin=Math.floor(Date.now()/90)%6+1;
 const visibleHistory=rolling&&S.dice.history.length===5?S.dice.history.slice(1):S.dice.history;
 const last=S.dice.last,key=S.dice.rolls+JSON.stringify(S.dice.history)+JSON.stringify(last)+rolling+shifting;
 if(host.dataset.key!==key){host.dataset.key=key;host.innerHTML=`<div class="dice-history">${Array.from({length:5},(_,i)=>rolling&&i===visibleHistory.length?`<span class="rolling-die" aria-label="주사위 굴리는 중">${dieFace(spin)}<small>굴리는 중</small></span>`:visibleHistory[i]?dieFace(visibleHistory[i],(!rolling&&!shifting&&i===visibleHistory.length-1?'newest ':'')+(!rolling&&diceMatches(S.dice.history,i)?'matched':'')):'<span class="die-empty" aria-label="빈 눈금 칸"></span>').join('')}</div><div class="dice-readout">${last?.id?`<span class="result-unit-art">${heroArt(last.id)}</span>`:''}<b>${last?last.name:'첫 주사위 대기'}${last?`<em>×${last.requested}</em>`:''}</b><small>${last?(last.id?HERO_BY_ID[last.id].unit.name+' '+last.count+'명'+(last.count<last.requested?' · 정원 제한':''):'빈 배럭 · 생산 없음'):'빈 칸이 있으면 1명 생산'}</small><span id="dice-next"></span></div><div class="dice-clock"><i></i></div>`;}
 host.classList.toggle('rolling',rolling);host.classList.toggle('shifting',shifting);
 const spinning=host.querySelector('.rolling-die .die-face');if(spinning){spinning.dataset.face=spin;spinning.setAttribute('aria-label','굴리는 중');}
 host.style.setProperty('--summon-color',summonColor(last?.id));
 host.dataset.tier=last?.requested>=4?'rare':last?.requested>=2?'combo':'normal';
 document.getElementById('dice-next').textContent=`다음 굴림 ${((1-S.dice.progress)*diceCooldown()/S.settings.speed).toFixed(1)}초`;
 host.querySelector('.dice-clock i').style.width=S.dice.progress*100+'%';
}

function diceMatches(history,index){
 if(history.length<5)return false;
 const hand=diceHand(history);
 if(hand.name==='스트레이트')return true;
 return history.filter(n=>n===history[index]).length>1;
}

function summonColor(id){
 const unit=HERO_BY_ID[id]?.unit,kind=unit?.kind;
 if(unit?.weapon==='staff')return '#bca2ff';
 return kind==='healer'?'#8de4c0':kind==='mage'?'#c4a3ff':kind==='ranged'?'#a9df79':'#ffc17b';
}
// One cue per roll: die impact, colour transfer, then the selected squad's recoil.
function animateProductionCue(){
 const event=B.diceCue,host=document.getElementById('dice-hud');
 if(!event||!host||host.dataset.impact===String(event.roll))return;
 host.dataset.impact=event.roll;
 if(event.until<Date.now()||!document.getElementById('game').classList.contains('battle-mode'))return;
 if(typeof GameAudio!=='undefined')GameAudio.play(event.requested>=2?'combo':'roll');
 const target=document.querySelector(`.deploy-card[data-slot="${event.slot}"] .deploy-orb`);
 const faces=host.querySelectorAll('.dice-history>.die-face'),source=faces[faces.length-1];
 const color=summonColor(event.id),reduced=CombatArt.reducedMotion;
 host.classList.remove('result-hit');void host.offsetWidth;host.classList.add('result-hit');
 clearTimeout(host.impactTimer);host.impactTimer=setTimeout(()=>host.classList.remove('result-hit'),600);
 if(!target||!source||!event.id)return;
 target.style.setProperty('--summon-color',color);
 if(reduced)return;
 const a=source.getBoundingClientRect(),b=target.getBoundingClientRect();
 if(!a.width||!b.width)return;
 const token=document.createElement('div');token.className='production-token';token.setAttribute('aria-hidden','true');
 token.style.cssText=`left:${a.left+a.width/2}px;top:${a.top+a.height/2}px;--summon-color:${color}`;
 token.innerHTML=dieFace(event.face);document.body.append(token);
 const dx=b.left+b.width/2-a.left-a.width/2,dy=b.top+b.height/2-a.top-a.height/2;
 const flight=token.animate([{transform:'translate(-50%,-50%) scale(.65)',opacity:0},{transform:'translate(-50%,-50%) scale(1.15)',opacity:1,offset:.18},{transform:`translate(calc(-50% + ${dx*.6}px),calc(-50% + ${dy*.35}px)) scale(.9)`,opacity:1,offset:.65},{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.35)`,opacity:0}],{duration:420,easing:'cubic-bezier(.2,.7,.3,1)'});
 flight.finished.then(()=>{
   token.remove();if(!target.isConnected||!document.getElementById('game').classList.contains('battle-mode'))return;
   target.animate([{transform:'scale(.85)'},{transform:'scale(1.18)',offset:.35},{transform:'scale(1)'}],{duration:360,easing:'ease-out'});
   const card=target.closest('.deploy-card');
   card.querySelector('.spawn-burst').animate([{transform:'translateY(4px) scale(.5)',opacity:0},{transform:'translateY(-9px) scale(1.25)',opacity:1,offset:.3},{transform:'translateY(-4px) scale(1)',opacity:1}],{duration:460});
   for(let i=0;i<(event.count>0?6:0);i++){
     const spark=document.createElement('i');spark.className='slot-spark';spark.style.background=color;target.append(spark);
     const angle=i*Math.PI/3;
     spark.animate([{transform:'translate(-50%,-50%) scale(1)',opacity:1},{transform:`translate(calc(-50% + ${Math.cos(angle)*34}px),calc(-50% + ${Math.sin(angle)*34}px)) scale(0)`,opacity:0}],{duration:450}).finished.then(()=>spark.remove());
   }
 },()=>token.remove());
}
