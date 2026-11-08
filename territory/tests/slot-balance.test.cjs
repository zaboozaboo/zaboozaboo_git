const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const ctx=vm.createContext({console,Math,Date,window:{},localStorage:{setItem(){}},UI:{toast(){}},assert});
for(const name of ['data','state','kingdom','dice','formation','battle','forge-balance','portal-master-data','portal','portal-balance'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',name+'.js'),'utf8'),ctx);
const report=vm.runInContext(`
newGame({name:'balance',gender:'m',cls:'knight',nation:'aurum'});Portal.ensure();
const near=(a,b,msg)=>assert.ok(Math.abs(a-b)<=Math.max(1,Math.abs(a),Math.abs(b))*1e-9,msg+': '+a+' vs '+b);
const unit=(era,v,level)=>({id:'pm_'+era+'_'+v,level,charge:0,options:[]});
let comparisons=0;
for(let era=0;era<10;era++)for(let level=1;level<=150;level++){
 const s=Array.from({length:6},(_,v)=>Portal.stats(unit(era,v,level)));
 for(let role=0;role<3;role++){
  const a=s[role*2],b=s[role*2+1];
  near(a.batch/a.cost/a.cap,b.batch/b.cost/b.cap,'fractional production rate');
  near(a.hp*a.cap,b.hp*b.cap,'full army HP');comparisons++;
 }
 near(s[0].atk/s[0].cd*s[0].cap,s[1].atk/s[1].cd*s[1].cap,'front DPS');
 near(s[2].atk/s[2].cd*s[2].cap,s[3].atk/s[3].cd*s[3].cap*1.6,'two-target artillery DPS');
 assert.ok(s[2].atk/s[2].cd*s[2].cap>s[3].atk/s[3].cd*s[3].cap,'single-target advantage');
 assert.ok(s[2].atk/s[2].cd*s[2].cap<s[3].atk/s[3].cd*s[3].cap*2.2,'three-target advantage');
 const baseline=s[4].heal/s[4].cd*s[4].cap;
 near(s[4].atk/s[4].cd*s[4].cap,baseline,'healer shared attack/heal budget');
 assert.ok(Math.abs(((baseline*2+s[5].atk/s[5].cd*s[5].cap)*1.15-baseline*2)/baseline-1)<.17,'full formation support contribution within 17%');
}
// Cache only immutable stats already validated above; production and combat remain real.
const rawStats=Portal.stats.bind(Portal),statCache=new Map();
Portal.stats=p=>{const key=p.id+":"+p.level;if(!statCache.has(key))statCache.set(key,rawStats(p));return statCache.get(key);};
// Exercise actual production, overflow, caps and deaths with identical die streams.
function trial(era,level,v,seed,lifetime){
 S.portal.board=[null,null,null];const p=unit(era,v,level),role=PM_BY_ID[p.id].role;S.portal.board[role]=p;
 B.units=[];B.fx=[];B.projs=[];B.time=0;let produced=0,hpSeconds=0,output=0;const timeline=[];
 for(let t=0;t<120;t++){
  B.units=B.units.filter(u=>t-u.born<lifetime);
  if(t%3===0){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const face=1+Math.floor(seed/4294967296*6);const first=B.units.length;const r=Portal.produce(role,face);produced+=r.count;B.units.slice(first).forEach(u=>u.born=t);}
  assert.ok(B.units.length<=Portal.cap(p));assert.ok(Number.isInteger(p.charge));
  hpSeconds+=B.units.reduce((n,u)=>n+u.maxHp,0);
  const value=B.units.reduce((n,u)=>n+(u.kind==='healer'?u.heal:u.atk)/u.atkCd*(u.splash?1.6:1),0);output+=value;timeline.push({count:B.units.length,value});
 }
 return {produced,hpSeconds,output,timeline};
}
let productionTrials=0,maxHpGap=0,maxDamageGap=0;
for(let era=0;era<10;era++)for(const level of [1,25,75,150])for(const lifetime of [12,30,120])for(const seed of [1,42,2026])for(let role=0;role<3;role++){
 const a=trial(era,level,role*2,seed,lifetime),b=trial(era,level,role*2+1,seed,lifetime);
 near(a.hpSeconds,b.hpSeconds,'production + casualties HP-seconds');
 maxHpGap=Math.max(maxHpGap,Math.abs(a.hpSeconds/b.hpSeconds-1));
 if(role<2){near(a.output,b.output,'production + casualties output');maxDamageGap=Math.max(maxDamageGap,Math.abs(a.output/b.output-1));}
 productionTrials+=2;
}
// Compare support contribution during the same real-production ramp and casualty cycles.
let maxSupportGap=0;
for(const lifetime of [12,30,120])for(const seed of [1,42,2026]){
 const front=trial(0,1,0,seed,lifetime),ranged=trial(0,1,2,seed,lifetime),healer=trial(0,1,4,seed,lifetime),banner=trial(0,1,5,seed,lifetime);
 const contribution=banner.timeline.reduce((sum,r,t)=>sum+r.value+(front.timeline[t].value+ranged.timeline[t].value+r.value)*Math.min(.15,r.count*.03),0);
 const gap=Math.abs(contribution/healer.output-1);maxSupportGap=Math.max(maxSupportGap,gap);
 assert.ok(gap<.2,'support contribution within 20% during ramp/casualties: '+gap);
}
// Actual combat aura: partial roster scales, dead/out-of-range banners do not help, cap survives mixed generations.
B.buffs={rally:0};const ally={team:0,x:0,y:0};B.units=[{team:0,x:0,y:0,hp:1,aura:.03}];near(teamAtkMult(ally),1.03,'one banner');
B.units=Array.from({length:8},()=>({team:0,x:0,y:0,hp:1,aura:.03}));near(teamAtkMult(ally),1.15,'banner cap');
B.units.forEach(u=>u.hp=0);near(teamAtkMult(ally),1,'dead banner');B.units=[{team:0,x:141,y:0,hp:1,aura:.03}];near(teamAtkMult(ally),1,'aura range');
// Actual projectile resolution: primary hit + 60% secondary hit; healing cannot overfill health.
S.portal.board=[unit(0,0,1),unit(0,2,1),unit(0,4,1)];B.fx=[];
const targets=[0,20,100].map(x=>({team:1,hp:1000,maxHp:1000,x,y:0,size:1,armor:0,flash:0}));B.units=targets;
B.projs=[{team:0,x:0,y:0,tx:0,ty:0,speed:100,target:targets[0],dmg:100,splash:45,type:'fire'}];updateProjs(1);
near(targets[0].hp,900,'primary');near(targets[1].hp,940,'secondary');near(targets[2].hp,1000,'outside splash');
const hurt={team:0,hp:95,maxHp:100,x:0,y:0};B.units=[hurt];B.projs=[{team:0,x:0,y:0,tx:0,ty:0,speed:100,target:hurt,heal:50}];updateProjs(1);near(hurt.hp,100,'no overheal benefit');
({comparisons,productionTrials,maxSupportGapPercent:maxSupportGap*100,maxHpGapPercent:maxHpGap*100,maxDamageGapPercent:maxDamageGap*100,scope:'10 eras, levels 1..150; 120s actual production at levels 1/25/75/150, 3 seeded dice streams, lifetimes 12/30/120s. Support equilibrium assumes two allied slot budgets in aura range; healing and attacks share cooldown.'});
`,ctx);
console.log(JSON.stringify(report,null,2));
console.log('PASS slot budgets, production/caps/casualties, single vs area tradeoff, support aura, splash and overheal');
