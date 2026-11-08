'use strict';
// Explicit adaptation: a source equipment set is shared across three capped armies.
Object.assign(Portal,{
 config(key){return FORGE_BALANCE.config.find(r=>r.Key===key).Value;},
 sourceConfig(key){return +FORGE_BALANCE.global.find(r=>r.Path===key).Value;},
 amount(n){if(n<5)return Math.ceil(n);let step=5;while(n/step>=200)step*=10;return Math.floor(n/step+.5)*step;},
 rate(){return this.config('OfflineHammerPerInterval')/this.config('OfflineHammerIntervalSeconds');},
 stats(p){const d=this.def(p),o=Object.fromEntries((p.options||[]).map(x=>[x.key,x.value])),rows=FORGE_BALANCE.base.filter(r=>r.Age===d.era),parts=[...new Set(rows.map(r=>r.ItemType))];
  const budget=stat=>parts.reduce((n,part)=>{const a=rows.filter(r=>r.ItemType===part&&r.StatType===stat);return n+(a.length?a.reduce((v,r)=>v+r.Value*(1+this.techValue(({Armour:"Body",Gloves:"Glove",Shoes:"Shoe"}[part]||part)+"Bonus")),0)/a.length:0);},0);
  const commander=FORGE_BALANCE.levels[(S.portal.commanderLevel||1)-1],growth=Math.pow(this.sourceConfig('LevelScalingBase'),p.level-1),scale=this.config('CombatStatScalePermille')/1000*this.config('CombatStatUnitMultiplier');
  const hp=(budget('Health')*growth+commander.HealthFlat)*scale/3/d.cap;
  const attack=(budget('Damage')*growth+commander.AttackFlat)*scale/3/d.cap;
  const weapons=FORGE_BALANCE.weapons.filter(r=>r['ItemId.Age']===d.era&&String(r.IsRanged)===(d.role===1?'true':'false'));
  const weapon=weapons[d.variant%Math.max(1,weapons.length)],cd=weapon?.AttackDuration||1.5;
  // Common per-slot budget; cadence changes hit size, not sustained DPS.
  // Splash is balanced at two targets (1 + 0.6); extra targets are its advantage.
  // Banner trades 25% of its own damage for up to 15% army damage.
  // This retains value during replenishment rather than balancing only a full army.
  const damageShare=d.splash?1/1.6:d.aura?.75:1;
  const hit=attack*cd/1.5;
  return {hp:hp*(1+(o.hp||0)),atk:hit*damageShare*(1+(o.atk||0)),armor:0,heal:d.kind==='healer'?hit*(1+(o.atk||0)):0,cd:cd/(1+(o.haste||0)),range:d.range,speed:d.speed,crit:o.crit||0,splash:d.splash||0,aura:d.aura||0,cost:d.cost,batch:d.batch,cap:d.cap};
 },
 enemyScale(){return 1;},
 // Fixed campaign formations: no dependency on roster, living troops, pets, or power.
 armyFormation(stage){const st=this.stageInfo(stage),step=Math.min(2,Math.floor(st.BattleIndex/3));return {count:12+step*3,interval:[32,28,26][step],hpBudget:1.2+step*.15,attackBudget:.8+step*.1};},
 armyWaveCount(count,stage=B.stage){return this.armyFormation(stage).count;},
 enemyStats(stage){const st=this.stageInfo(stage),r=FORGE_BALANCE.enemy[st.AgeIndex],diff=FORGE_BALANCE.difficulty[st.DifficultyIndex],scale=this.config('EnemyCombatScalePermille')/1000*this.config('CombatStatScalePermille')/1000*this.config('CombatStatUnitMultiplier');return {hp:r['Health.Raw']*diff.HpMulti*scale,atk:r['Damage.Raw']*diff.DmgMulti*scale};},
 spawnWave(){const wave=B.masterWaves?.[B.masterWaveIndex++];if(!wave)return;const run=this.dungeonRun,stats=run?{hp:run.row.Health*15,atk:run.row.Damage*15}:this.enemyStats(B.stage),formation=this.armyFormation(B.stage),count=run?wave.count:formation.count;
  for(let i=0;i<count;i++){const u=spawnEnemy(region(B.stage).enemies[0],B.stage),hp=run?stats.hp:stats.hp*Math.sqrt(wave.count)/count*formation.hpBudget;
   Object.assign(u,{hp,maxHp:hp,atk:run?stats.atk:stats.atk*Math.sqrt(wave.count)/count*formation.attackBudget,gold:0,sourcePreset:wave.presetId||run?.kind});
   if(!run){u.x=W-140+Math.floor(i/4)*24;u.y=GROUND_TOP+20+(i%4)*40;confineToRoad(u);}
  }
  if(!run)B.queueT=formation.interval;
 },
 sellPrice(p){return this.amount(this.sourceConfig('SellBasePrice')*Math.pow(this.sourceConfig('LevelScalingBase'),p.level-1)*(1+this.def(p).era*this.config('SellPriceEraStepPermille')/1000)*(1+this.techValue('EquipmentSellPrice')));},
 offline(){const elapsed=Math.min(this.config('MaxOfflineSeconds'),Math.max(0,(Date.now()-S.lastSave)/1000));if(elapsed>=this.config('MinOfflineSeconds')){S.portal.supply+=Math.floor(elapsed/this.config('OfflineHammerIntervalSeconds'))*this.config('OfflineHammerPerInterval');S.gold+=Math.floor(elapsed/this.config('OfflineGoldIntervalSeconds'))*this.config('OfflineGoldPerInterval');}this.completeUpgrade();saveGame();},
 dungeonKinds:['Hammer','Pet','Skill','Potion'],
 dungeonNames:{Hammer:'고대 신전',Pet:'콜로세움',Skill:'무기 공방',Potion:'해적의 섬'},
 dungeonState(){const p=S.portal;p.dungeons=p.dungeons||{};const day=Math.floor(Date.now()/86400000);for(const kind of this.dungeonKinds){const d=p.dungeons[kind]||(p.dungeons[kind]={level:0,keys:this.config('DailyDungeonEntries'),day});if(day>d.day){d.keys=Math.max(d.keys,this.config('DailyDungeonEntries'));d.day=day;}}p.materials=p.materials||{};return p.dungeons;},
 dungeonUnlock(kind){return FORGE_BALANCE.unlocks.find(r=>r.featureId==='dungeon_'+kind)?.unlockValue??Infinity;},
 dungeonRewards(kind,level){return FORGE_BALANCE.rewards.filter(r=>r.DungeonType===kind).map(r=>({currency:r.CurrencyType,amount:this.amount(r.RewardBase+level*this.config('Dungeon'+r.CurrencyType+'PerLevel'))}));},
 enterDungeon(kind){const d=this.dungeonState()[kind];if(!d||this.dungeonRun||B.result||S.portal.maxStage<this.dungeonUnlock(kind)||d.keys<1||!S.portal.board.some(Boolean)||d.cleared)return false;const source=kind==='Hammer'?'HammerThief':kind==='Pet'?'Egg':kind==='Dice'?'Potion':kind;const row=FORGE_BALANCE.dungeons.find(r=>r.DungeonType===source&&r.Level===d.level);if(!row)return false;
  const troops=B.units.filter(u=>u.team===0&&u.hp>0);this.dungeonRun={kind,row,level:d.level,troops,charges:S.portal.board.map(p=>p?.charge||0)};d.keys--;this.summonAuto=false;resetField(false);B.mode='stage';B.stage=S.stage;B.failed=false;B.buffs={rally:0,sanctuary:0};B.timeLimit=0;B.pCastle={hp:this.castleHp(),max:this.castleHp()};B.eCastle={hp:row.Health*15,max:row.Health*15};B.queue=[];B.queueT=1;
  let waves=kind==='Skill'?[3,3,3]:kind==='Hammer'?[3]:row.Wave1?[row.Wave1,row.Wave2,row.Wave3]:[1];if(kind==='Potion'||kind==='Dice')waves.push(1);B.masterWaves=waves.map(count=>({count}));B.masterWaveIndex=0;B.queueTotal=waves.reduce((a,b)=>a+b,0);this.spawnWave();saveGame();return true;
 },
 leaveDungeon(win){const run=this.dungeonRun;if(!run)return false;this.dungeonRun=null;const d=this.dungeonState()[run.kind];if(win){for(const r of this.dungeonRewards(run.kind,run.level)){if(r.currency==='Coins')S.gold+=r.amount;else if(r.currency==='Hammers')S.portal.supply+=r.amount;else S.portal.materials[r.currency]=(S.portal.materials[r.currency]||0)+r.amount;}if(d.level<399)d.level++;else d.cleared=true;}this.startStage(S.stage);run.troops.forEach(u=>{u.x=140;u.target=null;B.units.push(u);});S.portal.board.forEach((p,i)=>{if(p)p.charge=run.charges[i];});saveGame();UI.toast(win?'던전 클리어 · 보상을 획득했습니다':'전장으로 복귀했습니다');return true;},
 dungeonPanel(){const state=this.dungeonState(),labels={Hammers:'룬석',Coins:'골드',Eggshells:'펫 재료',SkillSummonTickets:'스킬 소환권',TechPotions:'연구 물약'};return `<div class="growth-research"><h3>던전</h3><p>매일 오전 9시 입장권 2회까지 충전 · 승리 시 보상</p>${this.dungeonRun?'<button data-leave-dungeon>도전 종료 · 전장 복귀</button>':''}${this.dungeonKinds.map(kind=>{const d=state[kind],unlock=this.dungeonUnlock(kind);return `<article><div><h3>${this.dungeonNames[kind]} · ${d.level+1}단계</h3><p>${this.dungeonRewards(kind,d.level).map(r=>labels[r.currency]+' '+fmt(r.amount)).join(' · ')}</p></div><button data-dungeon="${kind}" ${S.portal.maxStage<unlock||!d.keys||this.dungeonRun||d.cleared?'disabled':''}>${S.portal.maxStage<unlock?'전선 '+unlock+' 해금':d.cleared?'완료':'입장 '+d.keys+'/2'}</button></article>`;}).join('')}</div>`;}
});
Object.assign(Portal,{
 techNames:{AutoForge:'동시 소환',ForgeTimerSpeed:'포탈 강화 시간',ForgeUpgradeCost:'포탈 강화 비용',WeaponBonus:'무기 훈련',HelmetBonus:'투구 보강',BodyBonus:'갑옷 보강',ShoeBonus:'장화 보강',GloveBonus:'공격 훈련',BeltBonus:'허리띠 보강',NecklaceBonus:'목걸이 강화',RingBonus:'반지 강화',EquipmentSellPrice:'유닛 판매 수익'},
 techNodes(){return FORGE_BALANCE.techLayout.filter(r=>r.BranchKey!=='Clan'&&Object.hasOwn(this.techNames,r.NodeType));},
 techValue(type){return this.techNodes().filter(r=>r.NodeType===type).reduce((sum,r)=>{const level=S.portal.tech?.[r.BranchKey+':'+r.NodeId]||0;return sum+(FORGE_BALANCE.techValues.find(v=>v.NodeType===type&&v.TierIndex===r.Tier&&v.DisplayLevel===level)?.StatValue||0);},0);},
 techNode(id){return this.techNodes().find(r=>r.BranchKey+':'+r.NodeId===id);},
 techCost(id){const n=this.techNode(id);return n&&FORGE_BALANCE.techCosts.find(r=>r.Tier===n.Tier&&r.SubTierIndex===(S.portal.tech?.[id]||0));},
 upgradeResearch(id){const n=this.techNode(id),c=this.techCost(id);this.dungeonState();if(!n||!c||S.portal.maxStage<71||S.portal.techPending||JSON.parse(n.Requirements).some(parent=>!(S.portal.tech?.[n.BranchKey+':'+parent]>0))||(S.portal.materials.TechPotions||0)<c.Cost)return false;S.portal.materials.TechPotions-=c.Cost;S.portal.techPending={id,cost:c.Cost,endsAt:Date.now()+Math.ceil(Math.min(this.config('TechDurationCapSeconds'),c.Duration/this.config('TechDurationDivisor')))*1000};saveGame();return true;},
 claimResearch(){const p=S.portal.techPending;if(!p||Date.now()<p.endsAt)return false;S.portal.tech=S.portal.tech||{};S.portal.tech[p.id]=(S.portal.tech[p.id]||0)+1;S.portal.techPending=null;saveGame();return true;},
 researchPanel(){this.dungeonState();const pending=S.portal.techPending;return `<div class="growth-research"><h3>연구 · 물약 ${S.portal.materials.TechPotions||0}</h3><p>${S.portal.maxStage<71?'전선 71 도달 시 해금':'연구는 한 번에 하나씩 진행됩니다.'}</p>${pending?`<button data-claim-tech ${Date.now()<pending.endsAt?'disabled':''}>${Date.now()<pending.endsAt?'연구 중 · '+Math.ceil((pending.endsAt-Date.now())/1000)+'초':'연구 완료 · 수령'}</button>`:''}${this.techNodes().map(n=>{const id=n.BranchKey+':'+n.NodeId,c=this.techCost(id),lv=S.portal.tech?.[id]||0,ready=JSON.parse(n.Requirements).every(parent=>S.portal.tech?.[n.BranchKey+':'+parent]>0);return `<article><div><h3>${this.techNames[n.NodeType]} ${n.Tier+1} · Lv.${lv}</h3><p>${ready?'다음 단계 연구':'선행 연구 완료 필요'}</p></div><button data-research="${id}" ${!c||!ready||pending||S.portal.maxStage<71||(S.portal.materials.TechPotions||0)<c.Cost?'disabled':''}>${c?'물약 '+c.Cost:'완료'}</button></article>`;}).join('')}</div><button data-return>‹ 전장</button>`;}
});
const portalSourcePanel=Portal.panel;
Portal.panel=function(){if(this.page==='growth'){$('#panel').innerHTML=this.researchPanel();return;}return portalSourcePanel.call(this);};
const portalSourceAction=Portal.action;
Portal.action=function(e){if(e.target.closest('[data-claim-tech]')){this.claimResearch();this.panel();return;}return portalSourceAction.call(this,e);};
const portalSourceEnsure=Portal.ensure;
Portal.ensure=function(){portalSourceEnsure.call(this);const p=S.portal;if(!p.balanceVersion){p.balanceMigration={supply:p.supply,research:{...p.research},at:Date.now()};p.balanceVersion=1;}this.dungeonState();};
