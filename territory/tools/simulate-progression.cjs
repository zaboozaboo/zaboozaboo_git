// node territory/tools/simulate-progression.cjs [seed] [first-promotion-cost] [third-land-stage]
// Runs production combat at 20 Hz / 1x, excluding tutorial reading and offline time.
// Policy: promote as soon as affordable; build first training facility; otherwise
// buy the cheapest deployed hero / kingdom upgrade. Retry failed stages every 30s.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
let seed=Number(process.argv[2]||1)>>>0;
const math=Object.create(Math);math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const c=vm.createContext({console,Math:math,Date,window:{},localStorage:{setItem(){}},document:{querySelector(){return null},addEventListener(){},querySelectorAll(){return []}},MobileShell:{refresh(){}}});
for(const f of ['data','state','kingdom','dice','formation','battle','first-camp','progression','ui'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',f+'.js'),'utf8'),c);
c.thirdLandStage=process.argv[4]?Number(process.argv[4]):null;
c.promoCost=process.argv[3]?Number(process.argv[3]):null;
vm.runInContext(`
if(thirdLandStage!==null)LANDS.find(l=>l.id==='ridge').boss=thirdLandStage;
if(promoCost!==null)PROMOTIONS[1].cost=promoCost;
UI.toast=UI.modal=UI.renderTab=UI.showSummon=()=>{};
newGame({name:'Simulation',gender:'m',cls:'knight',nation:'aurum'});
prepareFirstExpedition();recruitFirstCompanion();S.slots[0]='militia';
S.firstExpedition=true;S.battleTutorial='done';S.territoryTutorial='done';S.settings.speed=1;
UI.act('summon',{n:'10'},true);
const events=[];let lastStage=1,lastLand=0,lastPromo=0,lastAdvance=0,longestGap=0;
startStage(1);
for(let tick=0;tick<72000;tick++){
 const t=tick/20;
 accrueLordMerit(.05);updateBattle(.05);
 if(tick%100===0){
  while(breakthroughLord(S.lord.level)){}
  if(featureAccess('promo').unlocked)UI.act('promo',{},true);
  if(S.kingdom.lands.grove==='outpost'&&featureAccess('land').unlocked)claimLand('grove','training');
  const ids=Object.keys(S.heroes).sort((a,b)=>HERO_BY_ID[b].unit.atk/productionCost(b)-HERO_BY_ID[a].unit.atk/productionCost(a));
  for(let i=0;i<slotCount();i++)if(!S.slots[i])placeRosterHero(ids.find(id=>!S.slots.includes(id)),i);
  for(const id of S.slots.filter(Boolean))if(S.heroes[id].stars<MAX_STARS&&S.heroes[id].shards>=shardsForStar(S.heroes[id].stars))UI.act('hstar',{id},true);
  const next=kingdomGrowth();const choices=[];
  if(!next.locked&&featureAccess('growth').unlocked)choices.push({cost:next.cost,act:'kingdomgrow',data:{step:String(next.step)}});
  if(featureAccess('hero').unlocked)for(const id of S.slots.filter(Boolean))if(S.heroes[id].level<heroMaxLevel(id))choices.push({cost:heroLevelCost(id),act:'hlv',data:{id}});
  choices.sort((a,b)=>a.cost-b.cost);if(choices[0]?.cost<=S.gold)UI.act(choices[0].act,choices[0].data,true);
  if(S.farming&&tick%600===0)challengeBoss();
 }
 if(S.maxStage>lastStage){longestGap=Math.max(longestGap,t-lastAdvance);lastAdvance=t;lastStage=S.maxStage;}
 if(ownedLands()>lastLand||S.lord.promo>lastPromo){lastLand=ownedLands();lastPromo=S.lord.promo;events.push({minutes:+(t/60).toFixed(2),stage:S.maxStage-1,lands:lastLand,promotion:lastPromo});}
}
longestGap=Math.max(longestGap,3600-lastAdvance);
console.log(JSON.stringify({events,final:{stage:S.maxStage-1,level:S.lord.level,promotion:S.lord.promo,gold:Math.round(S.gold),growth:kingdomGrowth().step},longestStageGapMinutes:+(longestGap/60).toFixed(2)}));
`,c);
