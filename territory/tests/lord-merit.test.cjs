const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let timestamp=100000,saved='';
const c=vm.createContext({console,Math,Date:class extends Date{static now(){return timestamp}},assert,localStorage:{getItem:()=>saved,setItem:(k,v)=>saved=v},document:{hidden:false,addEventListener(){}},window:{addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},bootGame(){},MobileShell:{mode:'lobby'},render(){},UI:{refresh(){},modal(){},toast(){}}});
for(const f of ['data','state','kingdom','formation','dice'])vm.runInContext(fs.readFileSync(`territory/js/${f}.js`,'utf8'),c);
c.updateBattle=()=>{};vm.runInContext(fs.readFileSync('territory/js/main.js','utf8'),c);
vm.runInContext(`
newGame({name:'공헌도',gender:'m',cls:'knight',nation:'aurum'});S.gold=1000;S.contribution=123;
assert.equal(lordBreakthroughCost(),60);assert.equal(breakthroughLord(1),false);
accrueLordMerit(59.5);assert.equal(breakthroughLord(1),false);accrueLordMerit(.5);assert.ok(breakthroughLord(1));assert.equal(S.lord.level,2);assert.equal(S.gold,1000);assert.equal(S.contribution,123);assert.equal(S.lord.merit,0);
S.lord.merit=10000;assert.equal(breakthroughLord(1),false,'stale level cannot spend again');const required=lordBreakthroughCost();assert.ok(breakthroughLord(2));assert.equal(S.lord.merit,10000-required);
S.stage=5;S.lord.merit=0;S.settings.speed=1;frame(5000);assert.equal(S.lord.merit,25);S.settings.speed=2;frame(10000);assert.equal(S.lord.merit,50,'rate follows real time, not battle speed');
S.lord.merit=0;S.lastSave=Date.now()-30000;showOffline();assert.equal(S.lord.merit,150,'short absence preserves merit');showOffline();assert.equal(S.lord.merit,150,'return reward is not duplicated');
S.lastSave=Date.now()-60000;const offline=offlineReward();assert.equal(offline.merit,300);showOffline();assert.equal(S.lord.merit,450);showOffline();assert.equal(S.lord.merit,450);
S.lastSave=Date.now()-12*3600*1000;assert.equal(offlineReward().merit,5*8*3600,'same eight-hour cap as offline gold');
S.lord.level=52;delete S.lord.merit;saveGame();loadGame();assert.equal(S.lord.level,52);assert.equal(S.lord.merit,0);assert.equal(S.contribution,123);accrueLordMerit(3.2);saveGame();loadGame();assert.equal(S.lord.merit,16);
console.log('PASS: stage/time accrual, fractional balance, breakthrough cost and remainder, no gold/war-score spending, stale clicks, speed independence, short/long offline grants, no double grant, legacy level and save preservation.');
`,c);
