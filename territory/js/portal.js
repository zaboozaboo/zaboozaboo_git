'use strict';
// Keep live controls connected between pointerdown and click during periodic HUD updates.
function portalPatchMarkup(host, html) {
 const template=document.createElement('template');template.innerHTML=html;
 const key=node=>node.nodeType===1?node.tagName+':'+Array.from(node.attributes).filter(a=>a.name.startsWith('data-')).map(a=>a.name+'='+a.value).join('|'):String(node.nodeType);
 function patch(parent, source) {
  let cursor=parent.firstChild;
  for(const next of Array.from(source.childNodes)) {
   let current=cursor;
   if(!current||key(current)!==key(next)) {
    current=Array.from(parent.childNodes).slice(cursor?Array.from(parent.childNodes).indexOf(cursor):parent.childNodes.length).find(n=>key(n)===key(next));
    if(current)parent.insertBefore(current,cursor);
    else {current=next.cloneNode(true);parent.insertBefore(current,cursor);}
   }
   if(next.nodeType===1) {
    for(const attr of Array.from(current.attributes))if(!next.hasAttribute(attr.name))current.removeAttribute(attr.name);
    for(const attr of Array.from(next.attributes))if(current.getAttribute(attr.name)!==attr.value)current.setAttribute(attr.name,attr.value);
    patch(current,next);
   } else if(current.nodeValue!==next.nodeValue)current.nodeValue=next.nodeValue;
   cursor=current.nextSibling;
  }
  while(cursor){const next=cursor.nextSibling;cursor.remove();cursor=next;}
 }
 patch(host,template.content);
}

// Portal Master uses the reference forge tables with units replacing equipment slots.
const Portal={
 selected:0,page:null,comparing:false,switching:false,rollingUntil:0,autoElapsed:0,
 ensure(){
  const old=S.portal;
  if(!old?.master){
   const legacy=old?JSON.parse(JSON.stringify(old)):null;
   const records=[...(old?.board||[]),old?.pending].filter(Boolean);
   const board=[null,null,null],reserve=[];
   for(const p of records){
    const h=HERO_BY_ID[p.id];if(!h)continue;
    const variant=h.unit.kind==='healer'?4:h.unit.kind==='melee'?(h.cap>10?0:1):(h.unit.splash?3:2);
    const era=h.rarity==='H'?3:h.rarity==='R'?2:0;
    const converted={id:`pm_${era}_${variant}`,level:Math.min(149,p.level||1),charge:Math.floor(p.charge||0),options:[],legacyTier:p.tier||1};
    const role=PM_BY_ID[converted.id].role;if(!board[role])board[role]=converted;else reserve.push(converted);
   }
   S.portal={master:true,version:4,legacy,stage:1,maxStage:1,supply:old?.supply??100,board,reserve,pending:reserve.shift()||null,mode:'portal',autoMode:null,forgeLevel:1,forgeRolls:0,brackets:{},seen:{},upgrade:null,paid:0,commanderLevel:1,xp:0,discovered:{},faces:{production:1,portal:1},codexEra:0};
  }
  this.comparing=false;this.summonAuto=false;this.autoAwaitingCards=false;this.summonElapsed=0;const p=S.portal;p.autoKeep=p.autoKeep||[0,1,2,3,4,5,6,7,8,9];p.research=p.research||{atk:0,hp:0,supply:0};p.autoMode=null;this.autoElapsed=0;
  p.reserve=p.reserve||[];p.discovered=p.discovered||{};
  for(const u of [...p.board,p.pending,...p.reserve].filter(Boolean)){
   u.charge=Math.max(0,Math.min(this.cost(u),Math.floor(u.charge||0)));u.options=u.options||[];p.discovered[u.id]=true;
   if(!S.heroes[u.id])S.heroes[u.id]={level:1,stars:1,shards:0};
  }
  S.stage=p.stage;S.maxStage=p.maxStage;S.firstExpedition=true;S.battleTutorial='done';S.territoryTutorial='done';S.settings.autoSkill=false;S.settings.speed=1;
  this.completeUpgrade();this.sync();
 },
 sync(){S.slots=S.portal.board.map(p=>p?.id||null);S.formation=[0,1,1];},
 def(p){return PM_BY_ID[p.id];},
 cost(p){return this.def(p).cost;},
 batch(p){return this.def(p).batch;},
 cap(p){return this.def(p).cap;},
 living(slot){return B.units.filter(u=>u.team===0&&u.slot===slot&&u.hp>0).length;},
 rate(){return (S.portal.research?.supply||0)*.2+1.5+ownedLands()*.2+facilityCount('mine')*.2;},
 stats(p){
  const d=this.def(p),scale=(FORGE_BALANCE.enemy[d.era]['Damage.Raw']/500)*Math.pow(1.01,p.level-1);
  const options=Object.fromEntries((p.options||[]).map(o=>[o.key,o.value]));
  const command=FORGE_BALANCE.levels[(S.portal.commanderLevel||1)-1],flatHp=Math.floor(command.HealthFlat/3),flatAtk=Math.floor(command.AttackFlat/3);
  return {hp:flatHp+Math.ceil(d.hp*scale*(1+(options.hp||0))*(1+(S.portal.research?.hp||0)*.05)),atk:flatAtk+Math.ceil(d.atk*scale*(1+(options.atk||0))*(1+(S.portal.research?.atk||0)*.05)),armor:Math.ceil(d.armor*scale),heal:Math.ceil((d.heal||0)*scale),cd:+(d.cd/(1+(options.haste||0))).toFixed(2),range:d.range,speed:d.speed,crit:options.crit||0,splash:d.splash||0,aura:d.aura||0,cost:d.cost,batch:d.batch,cap:d.cap};
 },
 power(p){if(!p)return 0;const s=this.stats(p);return Math.round((s.atk/s.cd*8+s.hp*.2+s.armor*2+s.heal/s.cd*6)*(s.batch/s.cost)*(1+s.aura));},
 stageInfo(stage=S.stage){return FORGE_BALANCE.stages[Math.max(0,Math.min(FORGE_BALANCE.stages.length-1,stage-1))];},
 enemyScale(stage){const r=this.stageInfo(stage),age=Math.min(9,r.AgeIndex),base=FORGE_BALANCE.enemy[age]['Damage.Raw']/500;return base*(1+r.BattleIndex*.07)*Math.pow(6, r.DifficultyIndex);},
 castleHp(){const strongest=S.portal.board.reduce((n,p)=>p?Math.max(n,this.stats(p).hp):n,100);return 800+strongest*4;},
 prepareStage(){
  for(const p of [...S.portal.board,S.portal.pending,...S.portal.reserve].filter(Boolean))p.charge=0;
  this.autoElapsed=0;this.productionUntil=0;this.productionRoll=null;B.productionOpening=1;B.enemyOpening=3;
  ensureDice();S.dice.charge={};S.dice.progress=0;S.dice.history=[];S.dice.last=null;B.diceCue=null;S.portal.faces.production=1;
 },
 startStage(stage){
  resetField(false);B.mode='stage';B.stage=stage;B.failed=false;B.special=null;B.buffs={rally:0,sanctuary:0};B.skillT=0;B.lordRespawn=0;B.openingDice=0;
  B.pCastle={hp:this.castleHp(),max:this.castleHp()};const hp=90*this.enemyScale(stage);B.eCastle={hp,max:hp};B.fortress=this.stageInfo(stage+1).AgeIndex!==this.stageInfo(stage).AgeIndex;B.timeLimit=0;B.stageBanner=2.2;B.queueT=2;
  const waves=FORGE_BALANCE.waves.filter(r=>r.stageId===stage);B.masterWaves=waves.map(r=>({...r}));B.masterWaveIndex=0;B.queue=[];B.queueTotal=waves.reduce((n,w)=>n+this.armyWaveCount(w.count,stage),0);this.prepareStage();
 },
 spawnWave(){const wave=B.masterWaves?.[B.masterWaveIndex++];if(!wave)return;for(let i=0;i<wave.count;i++)spawnEnemy(pick(region(B.stage).enemies),B.stage);},
 spawnPhase(dt){
  if(B.enemyOpening>0){B.enemyOpening=Math.max(0,B.enemyOpening-dt);if(B.enemyOpening>1e-9)return;B.enemyOpening=0;this.spawnWave();return;}
  if(B.masterWaveIndex>=B.masterWaves.length)return;
  const living=B.units.filter(u=>u.team===1&&u.hp>0).length;
  // A cleared battlefield advances immediately, regardless of the reinforcement timer.
  if(!living){this.spawnWave();return;}
  if(this.dungeonRun)return;
  B.queueT=Math.max(0,B.queueT-dt);
  // Fixed interval; at most two formations alive, without changing their stats or size.
  if(B.queueT<=0&&living<=this.armyFormation(B.stage).count)this.spawnWave();
 },
 finish(){
  if(this.dungeonRun){this.leaveDungeon(B.result==='win');return;}
  const win=B.result==='win',st=B.stage;
  if(win){S.gold+=this.stageInfo(st).goldReward;S.portal.supply+=this.stageInfo(st).hammerReward;S.portal.stage=Math.min(FORGE_BALANCE.stages.length,st+1);S.portal.maxStage=Math.max(S.portal.maxStage,S.portal.stage);conquerLand(st);}
  else{S.portal.stage=st;UI.toast('방어 실패 · 유닛을 교체하고 다시 도전하세요');}
  S.stage=S.portal.stage;S.maxStage=S.portal.maxStage;this.startStage(S.stage);
  saveGame();
 },
 produce(slot,face){
  const p=S.portal.board[slot];if(!p)return null;
  const d=this.def(p),cost=this.cost(p),before=p.charge,room=Math.max(0,this.cap(p)-this.living(slot)),total=before+face,count=Math.min(room,Math.floor(total/cost)*this.batch(p));
  p.charge=Math.min(cost,total-(count?Math.ceil(count/this.batch(p))*cost:0));
  if(count){const pos=formationPosition(slot),first=B.units.length;spawnHero(0,p.id,pos,1,undefined,slot,count);const st=this.stats(p);
   B.units.slice(first).forEach(u=>{Object.assign(u,{hp:st.hp,maxHp:st.hp,atk:st.atk,heal:st.heal,armor:st.armor,atkCd:st.cd,range:st.range,speed:st.speed,crit:st.crit,splash:st.splash,aura:st.aura,masterLevel:p.level});});
   B.fx.push({type:'ring',x:pos.x,y:pos.y,r:4,max:30,t:0,life:.5,color:PM_COLORS[d.era]});
  }
  return {id:p.id,slot,before,charge:p.charge,cost,count,full:room<=count};
 },
 odds(){return FORGE_BALANCE.odds[S.portal.forgeLevel-1];},
 draw(random=Math.random){
  const r=Math.min(.999999999,Math.max(0,random()));let sum=0,era=9;for(let i=0;i<10;i++){sum+=this.odds()['Age'+i];if(r<sum){era=i;break;}}
  const role=S.portal.forgeRolls<3?S.portal.forgeRolls:Math.min(2,Math.floor(random()*3));
  const key=`${role}:${era}`,seen=S.portal.seen[key]||[],available=[role*2,role*2+1].filter(v=>!seen.includes(v));
  if(!available.length){seen.length=0;available.push(role*2,role*2+1);}
  const variant=available[Math.min(available.length-1,Math.floor(random()*available.length))];seen.push(variant);S.portal.seen[key]=seen;
  const bracket=Math.min(28,S.portal.brackets[key]||0),range=FORGE_BALANCE.brackets[bracket];
  const level=range.LowerRange+1+Math.min(range.UpperRange-range.LowerRange,Math.floor(random()*(range.UpperRange-range.LowerRange+1)));
  S.portal.brackets[key]=Math.min(28,bracket+1);
  const optionDefs=[['atk','DamageMulti'],['hp','HealthMulti'],['haste','AttackSpeed'],['crit','CriticalChance']].map(([key,name])=>{const r=FORGE_BALANCE.options.find(r=>r.ConfigKey===name);return [key,r.LowerRange,r.UpperRange];}),options=[];
  const count=FORGE_BALANCE.tiers[era].OptionCount;
  for(let i=0;i<count;i++){const index=Math.min(optionDefs.length-1,Math.floor(random()*optionDefs.length)),[key,min,max]=optionDefs.splice(index,1)[0];options.push({key,value:Math.round((min+(max-min)*random())*1000)/1000});}
  const id=`pm_${era}_${variant}`;S.portal.discovered[id]=true;if(!S.heroes[id])S.heroes[id]={level:1,stars:1,shards:0};
  return {id,level,charge:0,options};
 },
 rollPrice(){return this.config("ForgeCostPerPull");},
 stackCount(){return (S.portal.pending?1:0)+S.portal.reserve.length;},
 stackUnlockLevel(){return FORGE_BALANCE.unlocks.find(r=>r.featureId==='auto_forge_stack').unlockValue;},
 stackUnlocked(){return S.portal.forgeLevel>=this.stackUnlockLevel();},
 stackCapacity:20,
 autoMatches(p){return S.portal.autoKeep.includes(this.def(p).era)&&(!S.portal.autoFilter||!(S.portal.autoOptions||[]).length||(p.options||[]).some(o=>S.portal.autoOptions.includes(o.key)));},
 maximumSummonBatch(){const base=FORGE_BALANCE.unlocks.filter(r=>/^auto_forge_x[0-9]+$/.test(r.featureId)&&S.portal.maxStage>=r.unlockValue).reduce((n,r)=>Math.max(n,+r.featureId.split('_x')[1]),1);return base+Math.floor(this.techValue('AutoForge'));},
 summonBatch(){return Math.max(1,Math.min(this.maximumSummonBatch(),Math.floor(S.portal.autoBatch||1)));},
 canRoll(){return this.stackCount()<this.stackCapacity&&Date.now()>=(this.rollingUntil||0)&&S.portal.supply>=this.rollPrice();},
 rollPaid(random=Math.random,withinBatch=false){
  if(withinBatch?(this.stackCount()>=this.stackCapacity||S.portal.supply<this.rollPrice()):!this.canRoll())return false;
  this.comparing=true;if(S.portal.pending)S.portal.reserve.push(S.portal.pending);S.portal.supply-=this.rollPrice();S.portal.pending=this.draw(random);S.portal.forgeRolls++;
  this.rollingUntil=Date.now()+700;this.summonCue={unit:{...S.portal.pending},count:withinBatch?(this.summonCue?.count||0)+1:1,until:this.rollingUntil};saveGame();return {pending:true};
 },
 rollProduction(random=Math.random){
  if(this.productionRoll||B.ended||!S.portal.board.some(Boolean))return false;
  const face=1+Math.min(5,Math.floor(random()*6));
  this.productionRoll={face,elapsed:0};this.productionUntil=Date.now()+550;
  S.portal.faces.production=face;B.diceCue=null;return true;
 },
 tickProduction(dt){
  const roll=this.productionRoll;if(!roll)return;
  if(B.ended){this.productionRoll=null;B.diceCue=null;return;}
  roll.elapsed+=dt;
  if(roll.elapsed>=.85&&!roll.cue){
   roll.cue={face:roll.face,results:S.portal.board.map((p,slot)=>p?{slot}:null).filter(Boolean),until:Date.now()+1600};B.diceCue=roll.cue;
  }
  if(roll.elapsed<1.3-1e-9)return;
  const results=S.portal.board.map((p,i)=>p?this.produce(i,roll.face):null).filter(Boolean);
  ensureDice();S.dice.rolls=(S.dice.rolls||0)+1;S.dice.last={face:roll.face,results,count:results.reduce((n,r)=>n+r.count,0)};
  if(roll.cue){roll.cue.results=results;roll.cue.applied=true;}
  this.productionRoll=null;saveGame();
 },
 place(slot){
  const p=S.portal.pending;if(!p||slot!==this.def(p).role)return false;
  const old=S.portal.board[slot];S.portal.board[slot]=p;S.portal.pending=old||S.portal.reserve.pop()||null;this.selected=slot;this.sync();saveGame();return true;
 },
 sellPrice(p){return FORGE_BALANCE.tiers[this.def(p).era].SellPrice;},
 sell(){const p=S.portal.pending;if(!p)return false;S.gold+=this.sellPrice(p);S.portal.xp+=20;S.portal.pending=S.portal.reserve.pop()||null;
  while(S.portal.commanderLevel<920&&S.portal.xp>=FORGE_BALANCE.levels[S.portal.commanderLevel-1].Experience){S.portal.xp-=FORGE_BALANCE.levels[S.portal.commanderLevel-1].Experience;S.portal.commanderLevel++;}
  saveGame();return true;
 },
 upgradeInfo(){return FORGE_BALANCE.upgrades.find(r=>r.Level===S.portal.forgeLevel+1);},
 installment(){const r=this.upgradeInfo();return r?Math.ceil(r.TotalCost/r.SplitCount):0;},
 payUpgrade(){
  const r=this.upgradeInfo();if(!r||S.portal.upgrade||S.portal.forgeRolls<8)return false;
  const cost=Math.min(this.installment(),r.TotalCost-S.portal.paid);if(S.gold<cost)return false;S.gold-=cost;S.portal.paid+=cost;
  if(S.portal.paid>=r.TotalCost)S.portal.upgrade={level:r.Level,endsAt:Date.now()+r.UpgradeTimeStampSecond*1000};saveGame();return true;
 },
 completeUpgrade(){const u=S.portal.upgrade;if(u&&Date.now()>=u.endsAt){S.portal.forgeLevel=u.level;S.portal.paid=0;S.portal.upgrade=null;saveGame();return true;}return false;},
 skipUpgrade(){if(!S.portal.upgrade||S.portal.upgrade.level>4)return false;S.portal.upgrade.endsAt=Date.now();return this.completeUpgrade();},
 autoInterval(){return Math.max(1.5,3*Math.pow(.9,facilityCount('training')));},
 tickAuto(dt){
  this.tickProduction(dt);
  if(B.ended||!S.portal.board.some(Boolean))return;
  if(B.productionOpening>0){const used=Math.min(dt,B.productionOpening);B.productionOpening-=used;dt-=used;if(B.productionOpening>1e-9)return;B.productionOpening=0;this.rollProduction(()=>5/6);}
  this.autoElapsed=Math.min(this.autoInterval(),this.autoElapsed+dt);
  if(this.autoElapsed>=this.autoInterval()){this.rollProduction();this.autoElapsed=0;}
 },
 tickSummon(dt){
  if(!this.summonAuto)return;
  if(this.page||(this.comparing&&this.stackCount()))return;
  if(!this.stackCount())this.comparing=false;
  if(this.stackCount()>=this.stackCapacity)this.autoAwaitingCards=true;
  if(this.autoAwaitingCards&&this.stackCount()){this.summonStatus='획득 유닛 확인';return;}
  this.autoAwaitingCards=false;
  if(S.portal.supply<this.rollPrice()){this.summonAuto=false;this.summonStatus='보급 부족';return;}
  this.summonElapsed+=dt;if(this.summonElapsed<.9||!this.canRoll())return;
  this.summonElapsed=0;for(let i=0;i<this.summonBatch();i++){if(!this.rollPaid(Math.random,i>0))break;const p=S.portal.pending;this.comparing=false;
  if(this.autoMatches(p)){
   if(!this.stackUnlocked()||S.portal.autoContinue===false||this.stackCount()>=this.stackCapacity){this.autoAwaitingCards=true;this.summonStatus='획득 유닛 확인';this.comparing=true;break;}
   else this.summonStatus='소환 중';
  }else{this.sell();this.summonStatus='소환 중';}
  }
  if(S.portal.supply<this.rollPrice())this.summonAuto=false;
 },
 startAuto(){S.portal.autoKeep=S.portal.autoKeep.filter(i=>this.odds()['Age'+i]>0);if(!S.portal.autoKeep.length)return false;this.summonAuto=true;this.autoAwaitingCards=this.stackCount()>=this.stackCapacity||(!this.stackUnlocked()&&this.stackCount()>0);this.summonElapsed=.9;this.summonStatus='소환 중';return true;},
 researchCost(key){return 100*Math.pow(2,S.portal.research[key]||0);},
 upgradeResearch(key){if(!['atk','hp','supply'].includes(key)||S.portal.research[key]>=10)return false;const cost=this.researchCost(key);if(S.gold<cost)return false;S.gold-=cost;S.portal.research[key]++;saveGame();return true;},
 tick(dt){S.portal.supply=Math.max(S.portal.supply,Math.min(9999,S.portal.supply+dt*this.rate()));this.completeUpgrade();this.tickAuto(dt);this.tickSummon(dt);},
 offline(){S.portal.supply=Math.min(9999,S.portal.supply+Math.min(300,Math.max(0,(Date.now()-S.lastSave)/1000))*this.rate());this.completeUpgrade();saveGame();},
 roleIcon(role){const paths=['<path d="M12 2 4 5v6c0 5 8 10 8 10s8-5 8-10V5Z"/><path d="M12 6v10"/>','<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 1v5m0 12v5M1 12h5m12 0h5"/>','<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z"/>'];return '<svg viewBox="0 0 24 24" aria-hidden="true">'+paths[role]+'</svg>';},
 art(p){return heroArt(p.id);},
 initUI(){
  const game=$('#game');game.classList.add('portal-mode','master-mode','battle-mode');game.classList.remove('lobby-mode');MobileShell.mode='battle';document.title='Portal Master · 포탈마스터';
  $('#topbar').innerHTML='<button id="master-profile"><img class="forge-avatar" src="assets/forge-ui/menu-growth.png" alt=""><span class="profile-name">포탈마스터</span><b id="master-level"></b></button><div class="master-wallet"><span id="portal-gold" aria-label="골드"></span><span id="portal-gems" aria-label="보석"></span></div>';
  $('#tabs').innerHTML=[['league','아레나'],['dungeon','던전'],['growth','성장'],['guild','길드'],['shop','상점']].map(([id,name])=>`<button data-master-page="${id}" ${['growth','dungeon'].includes(id)?'':'disabled aria-label="'+name+' 잠금"'}><img src="assets/forge-ui/menu-${id==='growth'?'growth-hood':id}.png" alt=""><span>${name}</span>${['growth','dungeon'].includes(id)?'':'<i class="menu-lock">🔒</i>'}</button>`).join('');
  $('#deployment-panel').insertAdjacentHTML('beforeend','<div id="portal-orders"></div>');
  $('#master-profile').onclick=()=>this.open('profile');
  $('#tabs').onclick=e=>{const b=e.target.closest('[data-master-page]');if(b&&!b.disabled){if(this.page===b.dataset.masterPage)this.close();else{FeatureUI.closeDetail();this.open(b.dataset.masterPage);}}};
  $('#sheet-close').onclick=()=>this.close();$('#sheet-backdrop').onclick=()=>this.close();
  $('#deployment').onclick=e=>{const b=e.target.closest('[data-slot]');if(!b)return;const i=+b.dataset.slot;if(this.comparing&&S.portal.pending){if(!this.place(i))UI.toast(`${PM_ROLES[this.def(S.portal.pending).role]} 자리에 배치하세요`);else this.refresh();}else if(S.portal.board[i]){this.selected=i;this.inspectUnit=null;this.open('unit');}else{UI.toast('아래 포탈을 눌러 유닛을 소환하세요');}};
  $('#portal-orders').onclick=e=>{if(e.target===$('#portal-orders')||e.target.closest('[data-dismiss]'))this.comparing=false;if(e.target.closest('[data-sell]'))this.sell();if(e.target.closest('[data-equip]')&&S.portal.pending)this.place(this.def(S.portal.pending).role);if(e.target.closest('[data-detail]'))this.open('compare');this.refresh();};
  $('#dice-hud').onclick=e=>{if(e.target.closest('[data-summon]')){if(this.summonAuto){UI.toast('자동 소환을 먼저 중지하세요');return;}if(!this.rollPaid())UI.toast('보급이 부족합니다');this.refresh();}if(e.target.closest('[data-pending]')){this.comparing=true;this.refresh();}if(e.target.closest('[data-auto]')){if(this.summonAuto){this.summonAuto=false;this.refresh();}else this.open('auto');}if(e.target.closest('[data-core]'))this.open('forge');};
  $('#portal-orders').addEventListener('click',e=>{if(e.target.id==='portal-orders'){this.comparing=false;this.refresh();}});
  $('#panel').onclick=e=>this.action(e);$('#panel').onchange=e=>{if(e.target.matches('[data-auto-batch-select]')){const n=Number(e.target.value);if(Number.isInteger(n)&&n>=1&&n<=this.maximumSummonBatch()){S.portal.autoBatch=n;saveGame();}}};
  this.refresh();requestAnimationFrame(()=>fitCanvas());
 },
 refreshDie(){
  const host=$('#dice-hud'),opening=Date.now()<this.rollingUntil;
  const key=[opening,S.portal.forgeLevel,this.canRoll(),S.portal.pending?.id,S.portal.pending?.level,typeof PortalUnitArt!=='undefined'&&!!PortalUnitArt.frames[S.portal.pending?.id],S.portal.reserve.length,this.summonAuto,this.summonStatus,Math.floor(S.portal.supply)].join(':');
  if(host.dataset.dualKey===key)return;host.dataset.dualKey=key;host.className='master-controls';
  portalPatchMarkup(host,`${S.portal.pending?`<button class="pending-deck" data-pending aria-label="획득 유닛 ${S.portal.reserve.length+1}개 비교" style="--tier:${PM_COLORS[this.def(S.portal.pending).era]}">${this.art(S.portal.pending)}<b>Lv.${S.portal.pending.level}</b><small>${this.stackCount()}/${this.stackCapacity}</small></button>`:''}<button data-summon class="summon-portal ${opening?'opening':''}" aria-label="룬석 ${this.rollPrice()}개로 유닛 소환" title="소환 1회에 룬석 ${this.rollPrice()}개 사용" ${this.canRoll()?'':'disabled'}><img class="summon-portal-art" src="assets/summon-portal-v1.png" alt="" draggable="false"><b>${opening?'개방 중':'유닛 소환'}</b><small aria-label="소환 가능 ${Math.floor(S.portal.supply/this.rollPrice())}회"><img src="assets/forge-ui/currency-runestone-v1.png" alt="룬석">${Math.floor(S.portal.supply).toLocaleString('ko-KR')}</small></button><button data-core class="core-upgrade"><span>✦</span><b>Lv.${S.portal.forgeLevel}</b><small>포탈 강화</small></button><button data-auto class="portal-auto ${this.summonAuto?'running':''}" aria-label="${this.summonAuto?'자동 소환 중지':'자동 소환 설정'}"><span>${this.summonAuto?'⟳':'≫'}</span><b>${this.summonAuto?(this.summonStatus==='획득 유닛 확인'?'확인 대기':this.summonStatus==='보급 대기'?'보급 대기':'자동 중지'):'자동'}</b></button>`);
 },
 refresh(){
  $('#master-level').textContent='Lv.'+S.portal.commanderLevel;$('#portal-gems').textContent=fmt(S.gems);$('#portal-gold').textContent=fmt(S.gold);
  const stage=this.stageInfo();$('#ct-stage').textContent=PM_ERAS[Math.min(9,stage.AgeIndex)]+' 전선 '+(stage.BattleIndex+1);$('#ct-wave').innerHTML='<span class="forge-wave-line">'+Array.from({length:3},(_,i)=>'<i class="'+(i<Math.min(3,B.masterWaveIndex||1)?'done':'')+'"></i>').join('')+'</span>';$('#ct-timer').textContent='';$('#ct-power').textContent='';
  this.refreshDie();const pending=S.portal.pending,visible=this.comparing&&pending&&Date.now()>=this.rollingUntil;
  const html=S.portal.board.map((p,i)=>`<button data-slot="${i}" class="deploy-card portal-socket master-slot ${visible&&this.def(pending).role===i?'placement-target':''}" style="--portal-rarity:${p?PM_COLORS[this.def(p).era]:'#829678'}" aria-label="${PM_ROLES[i]} · ${p?this.def(p).name+' Lv.'+p.level:'빈 자리'}"><span class="slot-role-icon" title="${PM_ROLES[i]}">${this.roleIcon(i)}</span>${p?`<span class="deploy-orb">${this.art(p)}</span><span class="slot-level" title="레벨 ${p.level}">${p.level}</span><span class="slot-charge ${p.charge>=this.cost(p)?'charged':''}" role="progressbar" aria-label="주사위 충전" aria-valuemin="0" aria-valuemax="${this.cost(p)}" aria-valuenow="${p.charge}"><span class="slot-charge-fill" style="width:${Math.min(100,p.charge/this.cost(p)*100)}%"></span><span class="slot-charge-label"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="2" width="12" height="12" rx="3"/><circle cx="5" cy="5" r="1"/><circle cx="8" cy="8" r="1"/><circle cx="11" cy="11" r="1"/></svg><b>${p.charge}<em>/${this.cost(p)}</em></b></span></span>`:'<span class="portal-empty">＋</span><small>유닛 소환</small>'}</button>`).join('')+`<div class="production-slot" aria-label="자동 생산 주사위"><small>${this.productionRoll?(this.productionRoll.elapsed<.55?'굴리는 중':this.productionRoll.elapsed<.85?'눈금 확정':'충전 전달'):'자동 생산'}</small><span class="slot-die">${diceCube(S.portal.faces.production||1,!!this.productionRoll&&this.productionRoll.elapsed<.55,6)}</span><small>무료</small></div>`;
  portalPatchMarkup($('#deployment'),html);
  let orders;
  if(visible){const d=this.def(pending),old=S.portal.board[d.role],st=this.stats(pending),prev=old?this.stats(old):null;const delta=prev?st.atk-prev.atk:st.atk;
   const row=(p,label)=>p?`<div class="compare-row">${this.art(p)}<div><small>${label} · ${PM_ERAS[this.def(p).era]}</small><b>${this.def(p).name} Lv.${p.level}</b><span>공격 ${fmt(this.stats(p).atk)} · 체력 ${fmt(this.stats(p).hp)}</span></div></div>`:`<div class="compare-row"><b>미배치 · ${PM_ROLES[d.role]}</b></div>`;
   orders=`<div class="replacement-panel"><h3 class="compare-heading">장착됨</h3><div class="compare-pair">${row(old,'현재')}${row(pending,'새로운!')}<span class="compare-delta" style="color:${delta<0?'#ff9caf':'#9fe77f'}">공격 ${delta>=0?'+':''}${fmt(delta)}</span></div><div class="compare-actions"><button data-sell>판매 ●${this.sellPrice(pending)}</button><button data-equip>${old?'교체':'배치'}</button></div></div>`;
  }else orders='';
  $('#portal-orders').classList.toggle('has-comparison',!!visible);
  portalPatchMarkup($('#portal-orders'),orders);
  animateProductionCue();document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('active',b.dataset.masterPage===(this.page||'battle')));
  if(this.page==='growth')this.refreshResearchStatus();
  if(this.page==='forge'){const key=[S.portal.forgeLevel,S.portal.paid,S.portal.upgrade?Math.ceil((S.portal.upgrade.endsAt-Date.now())/1000):0,S.gold>=this.installment(),S.portal.forgeRolls<8].join(':');if(this.panelKey!==key){this.panelKey=key;this.panel();}}
 },
 close(){this.comparing=false;this.page=null;UI.tab=null;$('#sheet').classList.add('hidden');$('#sheet-backdrop').classList.add('hidden');$('#game').classList.remove('panel-open','feature-open');$('#sheet').classList.remove('feature-page');this.refresh();},
 open(page){this.comparing=false;this.refresh();if(page!=='unit')this.inspectUnit=null;this.page=page;UI.tab=page;$('#game').classList.toggle('feature-open',page==='growth');$('#sheet').classList.toggle('feature-page',page==='growth');this.panelKey=null;$('#sheet-title').textContent=({growth:'성장',auto:'자동 소환',forge:'포탈 강화',codex:'시대별 유닛',unit:'부대 정보',compare:'유닛 비교',profile:'포탈마스터'})[page]||'포탈마스터';$('#sheet').classList.remove('hidden');$('#sheet-backdrop').classList.remove('hidden');$('#game').classList.add('panel-open');this.panel();},
 statRows(p,other){const st=this.stats(p),prev=other?this.stats(other):null;const rows=[['hp','체력'],['atk','공격력'],['armor','방어력'],['cd','공격 간격'],['range','사거리'],['speed','이동속도'],['cost','필요 눈금'],['batch','출격 수'],['cap','정원']];if(st.heal)rows.push(['heal','회복량']);if(st.splash)rows.push(['splash','광역 범위']);return rows.map(([k,name])=>`<div><span>${name}</span><b>${Number.isInteger(st[k])?st[k]:+st[k].toFixed(2)}${k==='cd'?'초':''}</b>${prev?`<small>${+prev[k].toFixed(2)} → ${+st[k].toFixed(2)}</small>`:''}</div>`).join('');},
 unitCard(p,other){const d=this.def(p);return `<section class="master-unit-detail" style="--drop-color:${PM_COLORS[d.era]}"><div class="master-unit-hero">${this.art(p)}<div><small>${PM_ERAS[d.era]} 시대 · ${PM_ROLES[d.role]}</small><h2>${d.name}</h2><b>Lv.${p.level}</b></div></div><p><b>${d.ability}</b> · ${d.desc}</p><div class="master-stat-grid">${this.statRows(p,other)}</div>${(p.options||[]).length?`<p class="master-options">${p.options.map(o=>({atk:'공격력',hp:'체력',haste:'공격 속도',crit:'치명타'})[o.key]+' +'+(o.value*100).toFixed(1)+'%').join(' · ')}</p>`:''}</section>`;},
 panel(){
  const host=this.panelRenderTarget||$('#panel');
  if(this.page==='dungeon'){host.innerHTML=this.dungeonPanel();
  }else if(this.page==='growth'){
   host.innerHTML=`<div class="growth-research"><h3>연구</h3><p>부대와 보급을 영구 강화합니다.</p>${[['atk','부대 공격','공격력',5,'%'],['hp','부대 체력','체력',5,'%'],['supply','보급 생산','초당 보급',.2,'']].map(([key,name,label,step,unit])=>{const lv=S.portal.research[key];return `<article><div><h3>${name} <small>Lv.${lv}/10</small></h3><p>${label} +${+(lv*step).toFixed(1)}${unit} → +${+(Math.min(10,lv+1)*step).toFixed(1)}${unit}</p></div><button data-research="${key}" ${lv>=10||S.gold<this.researchCost(key)?'disabled':''}>${lv>=10?'완료':'● '+fmt(this.researchCost(key))}</button></article>`;}).join('')}</div><nav class="growth-subtabs"><button disabled>탈것 🔒</button><button disabled>스킬 🔒</button><button class="active">연구</button></nav><button class="feature-back" data-return>‹ 전장</button>`;
  }else if(this.page==='auto'){
   const odds=this.odds(),available=PM_ERAS.map((name,i)=>({name,i,chance:odds['Age'+i]})).filter(d=>d.chance>0);
   S.portal.autoKeep=S.portal.autoKeep.filter(i=>odds['Age'+i]>0);
   if(!S.portal.autoSetupVersion){if(available.every(d=>S.portal.autoKeep.includes(d.i)))S.portal.autoKeep=[available.at(-1).i];S.portal.autoSetupVersion=1;saveGame();}
   host.innerHTML=`<section class="auto-reference"><div class="auto-reference-body"><div class="auto-retain-heading"><b>유지</b><small>포탈 Lv.${S.portal.forgeLevel}</small></div><div class="auto-era-list">${available.map(({name,i,chance})=>{const selected=S.portal.autoKeep.includes(i);return `<button data-keep="${i}" style="--era-color:${PM_COLORS[i]}" class="${selected?'selected':''}" aria-pressed="${selected}" aria-label="${name} 보관"><span class="era-check" aria-hidden="true">${selected?'✓':''}</span><span class="era-unit" style="background-image:url('assets/portal-units-v1/pm_${i}_0.png')" aria-hidden="true"></span><b>${name}</b><small>${+(chance*100).toFixed(2)}%</small></button>`;}).join('')}</div><button class="auto-filter-toggle" data-auto-filter role="switch" aria-checked="${!!S.portal.autoFilter}"><b>필터</b><span class="auto-switch ${S.portal.autoFilter?'on':''}" aria-hidden="true"></span></button>${S.portal.autoFilter?`<div class="auto-filter-options">${[['atk','공격력'],['hp','체력'],['haste','공격 속도'],['crit','치명타 확률']].map(([key,name])=>`<button data-auto-option="${key}" aria-pressed="${(S.portal.autoOptions||[]).includes(key)}"><span class="era-check" aria-hidden="true">${(S.portal.autoOptions||[]).includes(key)?'✓':''}</span><b>${name}</b></button>`).join('')}</div>`:''}</div><footer class="auto-reference-footer"><label class="auto-batch-row"><b>한 번에 사용할 룬석 수</b><select data-auto-batch-select aria-label="한 번에 사용할 룬석 수">${Array.from({length:this.maximumSummonBatch()},(_,i)=>`<option value="${i+1}" ${this.summonBatch()===i+1?'selected':''}>${i+1}</option>`).join('')}</select></label><button class="auto-continue-row" data-auto-continue aria-pressed="${S.portal.autoContinue!==false&&this.stackUnlocked()}" ${this.stackUnlocked()?'':'disabled'}><b>목표 유닛을 찾으면 소환 계속하기</b><span class="era-check" aria-hidden="true">${this.stackUnlocked()?(S.portal.autoContinue!==false?'✓':''):'🔒'}</span>${this.stackUnlocked()?'':`<small>Lv.${this.stackUnlockLevel()}</small>`}</button><button data-start-auto class="master-primary" ${S.portal.autoKeep.length?'':'disabled'}>시작</button></footer></section>`;

  }else if(this.page==='forge'){
   const next=this.upgradeInfo(),up=S.portal.upgrade,seconds=up?Math.max(0,Math.ceil((up.endsAt-Date.now())/1000)):0,nextOdds=FORGE_BALANCE.odds[Math.min(34,S.portal.forgeLevel)];
   host.innerHTML=`<section class="master-forge"><div class="forge-emblem"><img src="assets/forge-ui/forge-info.png" alt=""></div><small>PORTAL CORE</small><h2>포탈 Lv.${S.portal.forgeLevel}</h2><p>포탈을 강화하면 다음 시대의 문이 열립니다.</p>${up?`<div class="upgrade-clock">Lv.${up.level} 강화 중 · ${Math.floor(seconds/3600)}시간 ${Math.floor(seconds%3600/60)}분 ${seconds%60}초</div>${up.level<=4?'<button data-skip class="master-primary">무료 즉시 완료</button>':'<p>완료 시 자동 적용 · 접속하지 않아도 진행됩니다.</p>'}`:next?`<p>다음 레벨 · ${fmt(next.TotalCost)} 골드 · ${next.SplitCount}회 납부</p><progress max="${next.TotalCost}" value="${S.portal.paid}"></progress><button data-upgrade class="master-primary" ${S.portal.forgeRolls<8||S.gold<Math.min(this.installment(),next.TotalCost-S.portal.paid)?'disabled':''}>${S.portal.forgeRolls<8?'소환 '+S.portal.forgeRolls+'/8회 후 해금':'● '+fmt(Math.min(this.installment(),next.TotalCost-S.portal.paid))+' · '+(next.SplitCount===1?'강화 시작':'납부 '+(Math.floor(S.portal.paid/this.installment())+1)+'/'+next.SplitCount)}</button>`:'<b>최대 레벨 달성</b>'}</section><h3 class="master-section-title">시대별 출현 확률 <small>현재 → 다음</small></h3><div class="era-odds">${PM_ERAS.map((name,i)=>`<div><span style="color:${PM_COLORS[i]}">◆</span><b>${name}</b><span>${(this.odds()['Age'+i]*100).toFixed(1)}%</span><strong>${(nextOdds['Age'+i]*100).toFixed(1)}%</strong></div>`).join('')}</div><p class="master-note">소환된 유닛을 판매하면 골드와 경험치 20을 얻습니다.<br>동일 역할·시대의 유닛을 뽑을수록 레벨 구간이 높아집니다.</p>`;
  }else if(this.page==='codex'){
   const era=S.portal.codexEra;host.innerHTML=`<div class="era-selector">${PM_ERAS.map((n,i)=>`<button data-era="${i}" class="${i===era?'active':''}">${n}</button>`).join('')}</div><h3 class="master-section-title">${PM_ERAS[era]} 시대 · 3역할 / 6종</h3>${PM_ROLES.map((name,role)=>`<h4 class="role-section">${name}</h4><div class="master-codex-grid">${PM_UNITS.filter(d=>d.era===era&&d.role===role).map(d=>`<button data-unit="${d.id}" class="codex-unit" style="--drop-color:${PM_COLORS[era]}">${heroArt(d.id)}<b>${d.name}</b><small>${d.ability} · ${d.cost}눈금</small><em>${S.portal.discovered[d.id]?'발견':'미발견'}</em></button>`).join('')}</div>`).join('')}`;
  }else if(this.page==='unit'||this.page==='compare'){
   const p=this.inspectUnit||(this.page==='compare'?S.portal.pending:S.portal.board[this.selected]);if(!p){this.close();return;}const old=this.page==='compare'?S.portal.board[this.def(p).role]:null;host.innerHTML=this.unitCard(p,old)+(this.page==='compare'?'<p class="master-note">교체해도 출격한 병력은 계속 싸웁니다. 다음 생산부터 적용됩니다.</p>':'');
  }else{
   host.innerHTML=`<section class="master-forge"><small>PORTAL MASTER</small><h2>대장 Lv.${S.portal.commanderLevel}</h2><p>유닛 판매 경험치 · ${S.portal.xp}/${FORGE_BALANCE.levels[S.portal.commanderLevel-1].Experience}</p><progress max="${FORGE_BALANCE.levels[S.portal.commanderLevel-1].Experience}" value="${S.portal.xp}"></progress><p>부대 공격 +${Math.floor(FORGE_BALANCE.levels[S.portal.commanderLevel-1].AttackFlat/3)} · 체력 +${Math.floor(FORGE_BALANCE.levels[S.portal.commanderLevel-1].HealthFlat/3)}<br>최고 전선 ${S.portal.maxStage} · 소환 ${S.portal.forgeRolls}회<br>보급 +${this.rate().toFixed(1)}/초</p></section><button data-settings class="master-primary">설정</button>${S.portal.legacy?'<p class="master-note">이전 전선·유닛 기록은 저장 데이터에 보존되어 있습니다.</p>':''}`;
  }
 },
 action(e){const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-return')){this.close();return;}else if(b.hasAttribute('data-start-auto')){this.startAuto();this.close();return;}else if(b.hasAttribute('data-auto-filter')){S.portal.autoFilter=!S.portal.autoFilter;}else if(b.dataset.autoOption){const key=b.dataset.autoOption;S.portal.autoOptions=S.portal.autoOptions||[];S.portal.autoOptions=S.portal.autoOptions.includes(key)?S.portal.autoOptions.filter(x=>x!==key):[...S.portal.autoOptions,key];}else if(b.hasAttribute('data-auto-continue')){if(!this.stackUnlocked())return;S.portal.autoContinue=S.portal.autoContinue===false;}else if(b.dataset.autoBatch){const count=+b.dataset.autoBatch;if(!Number.isInteger(count)||count<1||count>this.maximumSummonBatch())return;S.portal.autoBatch=count;}else if(b.dataset.keep!==undefined){const era=+b.dataset.keep;if(!(this.odds()['Age'+era]>0))return;S.portal.autoKeep=S.portal.autoKeep.includes(era)?S.portal.autoKeep.filter(x=>x!==era):[...S.portal.autoKeep,era];}else if(b.dataset.dungeon){if(this.enterDungeon(b.dataset.dungeon))this.close();return;}else if(b.hasAttribute('data-leave-dungeon')){this.leaveDungeon(false);this.close();return;}else if(b.dataset.research)this.upgradeResearch(b.dataset.research);else if(b.hasAttribute('data-upgrade'))this.payUpgrade();else if(b.hasAttribute('data-skip'))this.skipUpgrade();else if(b.dataset.era!==undefined)S.portal.codexEra=+b.dataset.era;else if(b.dataset.unit){this.inspectUnit={id:b.dataset.unit,level:1,options:[],charge:0};this.open('unit');return;}else if(b.hasAttribute('data-settings')){UI.openSettings();return;}saveGame();this.panel();this.refresh();}
};
UI.initMain=()=>Portal.initUI();UI.refresh=()=>Portal.refresh();UI.openSheet=page=>Portal.open(page==='kingdom'?'profile':'growth');UI.closeSheet=()=>Portal.close();
UI.showSetup=()=>{
 newGame({name:'포탈마스터',gender:'m',cls:'knight',nation:'aurum'});
 $('#setup').classList.add('hidden');
 startMain();
};
