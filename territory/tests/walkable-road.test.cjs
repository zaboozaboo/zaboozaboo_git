const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({console,Math,Date,window:{},assert});
for(const file of ['data','state','kingdom','dice','formation','battle'])vm.runInContext(fs.readFileSync(`${__dirname}/../js/${file}.js`,'utf8'),c);
vm.runInContext(`
newGame({name:'road',gender:'m',cls:'knight',nation:'aurum'});
const safe=u=>{const r=Math.max(10,Math.min(26,u.size||7));assert(u.y>=GROUND_TOP+r-1e-8&&u.y<=GROUND_BOT-r+1e-8,'unit remains on clear road');};
for(let region=0;region<5;region++){
 startStage(region*10+1);B.units.forEach(safe);
 for(const pos of BUILDING_POS)spawnHero(0,'militia',pos,1,undefined,0,5);
 B.units.forEach(safe);
 const boss=spawnEnemy('goblin_king',1);boss.y=-200;confine();safe(boss);
 for(const u of B.units)u.y=u.id%2?GROUND_TOP+10:GROUND_BOT-10;
 separate();confine();B.units.forEach(safe);
 for(let i=0;i<180;i++){updateBattle(1/60);B.units.forEach(safe);}
}
startSpecial({mode:'war',deck:['militia','archer'],scale:1,spawnRate:1,color:'#f00',foeName:'test',lord:{cls:'knight',gender:'m',promo:0,name:'foe',scale:1}},()=>{});
for(let i=0;i<120;i++){updateBattle(1/60);B.units.forEach(safe);}
console.log('PASS: all regions, side-slot spawns, bosses, crowd separation, pursuit, and war stay inside the walkable road.');
`,c);
