 'use strict';
// Charge belongs to the hero, so swapping slots cannot duplicate or transfer it.
function diceSides(){if(S.portal)return 6;return [6,8,10,12][Math.max(0,Math.min(3,S.lord.promo||0))];}
function productionCost(id){return Math.max(1,Math.floor(HERO_BY_ID[id]?.chargeCost||({C:6,R:12,H:24}[HERO_BY_ID[id]?.rarity]||6)));}
function ensureDice(){
 if(!S.dice||typeof S.dice!=='object')S.dice={};
 if(!S.dice.charge||typeof S.dice.charge!=='object')S.dice.charge={};
 if(!Array.isArray(S.dice.history))S.dice.history=[];
 if(!Number.isFinite(S.dice.progress))S.dice.progress=0;
 for(const id of Object.keys(S.dice.charge))S.dice.charge[id]=Math.max(0,Math.min(productionCost(id),Number(S.dice.charge[id])||0));
}
function diceCooldown(){return Math.max(1.5,6/armyMult().spawn*Math.pow(.9,typeof facilityCount==='function'?facilityCount('training'):0));}
const OPENING_DICE_DURATION=1.6;
function beginStageDice(){ensureDice();S.dice.charge={};S.dice.history=[];S.dice.progress=0;S.dice.last=null;B.diceCue=null;B.openingDice=OPENING_DICE_DURATION;}
function rollOpeningProduction(random=Math.random){B.openingDice=0;S.dice.progress=0;return rollProduction(random);}
function rollProduction(random=Math.random){
 if(S.portal)return Portal.roll(random);
 ensureDice();const face=(typeof firstBattleRollFace==='function'?firstBattleRollFace():null)??Math.max(1,Math.min(diceSides(),Math.floor(random()*diceSides())+1)),results=[];
 S.dice.history=[face];
 S.slots.slice(0,slotCount()).forEach((id,slot)=>{
  if(!id)return;
  const cost=productionCost(id),before=S.dice.charge[id]||0,room=Math.max(0,heroCap(id)-slotAlive(0,slot,id));
  const total=before+face,count=Math.min(Math.floor(total/cost),room);
  // At capacity bank only one ready unit, never an invisible army of deferred spawns.
  const charge=Math.min(cost,total-count*cost);S.dice.charge[id]=charge;
  results.push({id,slot,before,charge,cost,count,full:room<=count});
  if(count){const pos=formationPosition(slot),first=B.units.length;spawnHero(0,id,pos,undefined,undefined,slot,count);
   B.units.slice(first).forEach((u,i)=>{u.arrivalAt=Date.now()+i*100;u.musterAt=Date.now();B.fx.push({type:'muster',x:u.x,y:u.y,t:-i*.1,life:.55,color:summonColor(id)});});
   B.fx.push({type:'ring',x:pos.x,y:pos.y,r:4,max:28,t:0,life:.45,color:summonColor(id)});
  }
 });
 S.dice.rolls=(Number.isSafeInteger(S.dice.rolls)?S.dice.rolls:0)+1;
 S.dice.last={face,results,count:results.reduce((n,r)=>n+r.count,0)};
 B.diceCue={...S.dice.last,roll:S.dice.rolls,at:Date.now(),until:Date.now()+1700};if(typeof firstBattleRolled==='function')firstBattleRolled();return S.dice.last;
}
function tickDice(dt){
 if(S.portal){B.openingDice=0;return;}
 ensureDice();if(B.openingDice>0){const consumed=Math.min(dt,B.openingDice);B.openingDice-=consumed;dt-=consumed;if(B.openingDice<=1e-9)rollOpeningProduction();else return;}
 S.dice.progress+=dt/diceCooldown();while(S.dice.progress>=1){S.dice.progress-=1;rollProduction();}
 for(let i=0;i<slotCount();i++)B.spawnT[i]=S.dice.progress;
}
function dieFace(n,extra=''){return `<span class="die-face ${extra}" aria-label="${n} 눈금" data-face="${n}">${[1,2,3,4,5,6,7,8,9].map(i=>`<i class="pip p${i}"></i>`).join('')}</span>`;}
// Promotion selects the real die geometry; visual rotation never changes the outcome.
function diceCube(face,rolling,sides=diceSides()){
 if(sides>6)return '<span class="dice-perspective"><canvas class="poly-die" width="160" height="160" aria-hidden="true"></canvas></span>';
 const rotations={1:'rotateY(0deg)',2:'rotateY(-90deg)',3:'rotateX(-90deg)',4:'rotateX(90deg)',5:'rotateY(90deg)',6:'rotateY(180deg)'};
 return `<span class="dice-perspective"><span class="dice-tilt"><span class="dice-cube ${rolling?'is-rolling':'is-settled'}" style="--result-rotation:${rotations[face]}" aria-hidden="true">${[1,2,3,4,5,6].map(n=>dieFace(n,'cube-side side-'+n)).join('')}</span></span></span>`;
}
function summonColor(id){
 const unit=HERO_BY_ID[id]?.unit,kind=unit?.kind;
 if(unit?.weapon==='staff')return '#bca2ff';
 return kind==='healer'?'#8de4c0':kind==='mage'?'#c4a3ff':kind==='ranged'?'#a9df79':'#ffc17b';
}

// Raised rim + recessed channel + actual simulation progress, independent of surface paint.
function battleChargeMeter(inset=false){
 if(inset)return `<svg class="battle-charge-meter" viewBox="0 0 64 64" aria-hidden="true"><rect class="meter-surface" x="1" y="1" width="62" height="62" rx="19"/><rect class="meter-rim" x="1" y="1" width="62" height="62" rx="19"/><rect class="meter-track" x="6" y="6" width="52" height="52" rx="14"/><rect class="meter-fill" x="6" y="6" width="52" height="52" rx="14" pathLength="100"/></svg>`;
 return `<svg class="battle-charge-meter" viewBox="0 0 64 64" aria-hidden="true"><rect class="meter-surface" x="3" y="3" width="58" height="58" rx="18"/><rect class="meter-rim" x="3" y="3" width="58" height="58" rx="18"/><rect class="meter-track" x="3" y="3" width="58" height="58" rx="18"/><rect class="meter-fill" x="3" y="3" width="58" height="58" rx="18" pathLength="100"/></svg>`;}
function refreshDiceHUD(){
 const host=document.getElementById('dice-hud');if(!host)return;ensureDice();
 const rolling=B.openingDice>0||S.dice.progress>.84,last=S.dice.last;
 const key=String(S.dice.rolls)+rolling+':'+diceSides();
 if(host.dataset.key!==key){host.dataset.key=key;host.innerHTML=`<div class="dice-history"><div class="dice-charge-ring">${battleChargeMeter(true)}${diceCube(last?.face||1,rolling)}</div></div>`;const canvas=host.querySelector('.poly-die');if(canvas)PolyDice.mount(canvas,diceSides(),last?.face||1,rolling);}

 host.classList.add('charge-dice');host.classList.toggle('rolling',rolling);host.classList.remove('opening-roll','shifting');host.dataset.tier='normal';host.dataset.sides=diceSides();
 const meterProgress=B.openingDice>0?1-B.openingDice/OPENING_DICE_DURATION:S.dice.progress;
 host.style.setProperty('--dice-progress',meterProgress*100+'%');
 host.style.setProperty('--meter-value',Math.max(0,Math.min(100,meterProgress*100)));
 host.classList.toggle('charge-near',S.dice.progress>=.75);
 let readout=host.querySelector('.dice-live-readout');
 if(!readout){readout=document.createElement('div');readout.className='dice-live-readout';host.append(readout);}
 const nextSeconds=Math.max(0,(B.openingDice>0?B.openingDice:(1-S.dice.progress)*diceCooldown())/S.settings.speed);
 readout.textContent='D'+diceSides()+' · '+(rolling?'굴리는 중':last?'전체 +'+last.face+' · '+nextSeconds.toFixed(1)+'초':'첫 굴림 · '+nextSeconds.toFixed(1)+'초');
 host.setAttribute('aria-label','D'+diceSides()+' · '+(rolling?'자동 주사위 굴리는 중':last?'주사위 '+last.face+' · 모든 부대 '+last.face+' 충전':'첫 주사위 대기'));

}
function animateProductionCue(){
 if(S.portal&&typeof PortalFeedback!=='undefined'){PortalFeedback.production(B.diceCue);return;}
 const event=B.diceCue,host=document.querySelector('.production-slot')||document.getElementById('dice-hud');
 if(!event||!host||event.presented)return;event.presented=true;
 if(event.until<Date.now()||!document.getElementById('game').classList.contains('battle-mode'))return;
 if(!document.getElementById('modal').classList.contains('hidden')||UI.tab)return;
 if(typeof GameAudio!=='undefined')GameAudio.play(event.count?'combo':'roll');
 if(CombatArt.reducedMotion)return;
 host.querySelector('.dice-charge-ring, .production-die, .slot-die')?.animate([{transform:'scale(.97)'},{transform:'scale(1.025)'},{transform:'scale(1)'}],{duration:300});
 const source=host.querySelector('.dice-perspective');if(!source)return;const a=source.getBoundingClientRect();
 event.results.forEach(r=>{
  const target=document.querySelector(`.deploy-card[data-slot="${r.slot}"] .deploy-orb`);if(!target)return;
  const b=target.getBoundingClientRect(),token=document.createElement('div');token.className='production-token charge-token';token.textContent='+'+event.face;
  token.style.cssText=`left:${a.left+a.width/2}px;top:${a.top+a.height/2}px;--summon-color:${summonColor(r.id)}`;document.body.append(token);
  token.animate([{transform:'translate(-50%,-50%) scale(.6)',opacity:0},{opacity:1,offset:.15},{transform:`translate(${b.left+b.width/2-a.left-a.width/2}px,${b.top+b.height/2-a.top-a.height/2}px) scale(.8)`,opacity:0}],{duration:380,easing:'ease-in'}).finished.then(()=>{
   token.remove();if(!target.isConnected)return;
   if(r.count){
    const card=target.closest('.deploy-card');card.classList.remove('muster-launch');void card.offsetWidth;card.classList.add('muster-launch');
    setTimeout(()=>card.classList.remove('muster-launch'),950);
   }
   target.animate([{filter:'brightness(1)',transform:'scale(1)'},{filter:'brightness(1.7)',transform:r.count?'scale(1.14)':'scale(1.04)'},{filter:'brightness(1)',transform:'scale(1)'}],{duration:r.count?550:300});
  },()=>token.remove());
 });
}
