const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
let clock=100000,seed=42;const math=Object.create(Math);math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const c=vm.createContext({console,assert,Math:math,Date:class extends Date{static now(){return clock;}},window:{},Image:class{},localStorage:{setItem(){}},UI:{toast(){}},advance:()=>clock+=50,resetSeed:n=>seed=n});
for(const f of ['data','state','kingdom','dice','formation','battle','forge-balance','portal-master-data','portal','portal-balance','portal-features','portal-collection-data','portal-collections','portal-pet-data','portal-pet-growth','camera','portal-pet-field'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',f+'.js'),'utf8'),c);
vm.runInContext(`
const clamp01=n=>Math.max(0,Math.min(1,n));newGame({name:'armies',gender:'m',cls:'knight',nation:'aurum'});Portal.ensure();saveGame=()=>{};
let basicHits=0,skillCasts=0;const basic=PetGrowth.basicAttack.bind(PetGrowth),cast=PetGrowth.cast.bind(PetGrowth);
PetGrowth.basicAttack=(...args)=>{const hit=basic(...args);if(hit)basicHits++;return hit;};PetGrowth.cast=(...args)=>{skillCasts++;return cast(...args);};
const reports=[];
for(let era=0;era<10;era++)for(const offset of [0,3,6])for(const full of [false,true])for(const pair of [[0,3],[1,4],[2,5]]){
 resetSeed(42);newGame({name:'armies',gender:'m',cls:'knight',nation:'aurum'});Portal.ensure();
 S.portal.board=[0,2,4].map(v=>({id:'pm_'+era+'_'+v,level:1+offset*5,charge:0,options:[]}));Portal.sync();
 const coll=CollectionUI.ensure();coll.pets=Object.fromEntries(pair.map(v=>['pets_0_'+v,1]));coll.equipped.pets=pair.map(v=>'pets_0_'+v);Portal.petElapsed={};Portal.petChargeRemainder={};PetField.actors=[];PetField.effects=[];
 const stage=FORGE_BALANCE.stages.find(s=>s.AgeIndex===era&&s.DifficultyIndex===0).stageId+offset;Portal.startStage(stage);
 assert.equal(B.units.filter(u=>u.team===1).length,12+Math.floor(offset/3)*3);if(full)for(let i=0;i<3;i++)Portal.produce(i,999);
 let t=0,peak=B.units.filter(u=>u.team===1).length;while(!B.result&&t<180){advance();updateBattle(.05);t+=.05;peak=Math.max(peak,B.units.filter(u=>u.team===1&&u.hp>0).length);}
 reports.push({era,offset,full,pair:pair.join('/'),result:B.result||'timeout',seconds:Math.round(t),peak});
}
assert.ok(basicHits>0&&skillCasts>0);for(const r of reports){assert.equal(r.result,'win',JSON.stringify(r));assert.ok(r.peak<=2*(12+r.offset));assert.ok(r.seconds<150,JSON.stringify(r));}console.log('PASS',reports.length,'campaign fights with actual pet attacks/skills',{minSeconds:Math.min(...reports.map(r=>r.seconds)),maxSeconds:Math.max(...reports.map(r=>r.seconds)),basicHits,skillCasts});
`,c);
