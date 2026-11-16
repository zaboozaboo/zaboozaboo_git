// NODE_PATH=/path/to/node_modules node territory/tests/portal-feedback.test.cjs (linkedom)
const {parseHTML}=require('linkedom'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {document}=parseHTML('<html><body><div id="modal" class="hidden"></div><div class="production-slot"><span class="slot-die"></span></div><button data-summon></button><button data-slot="0"><span class="slot-charge"></span></button><button data-slot="1"><span class="slot-charge"></span></button></body></html>');
for(const el of document.querySelectorAll('*'))el.getBoundingClientRect=()=>({left:100,top:200,width:40,height:40});
let now=1000;const delays=[];
const context=vm.createContext({document,window:{matchMedia:()=>({matches:false})},Date:{now:()=>now},setTimeout:(fn,delay)=>delays.push({fn,delay}),S:{portal:{}},B:{},Portal:{productionRoll:{elapsed:0},page:null,def:()=>({era:0,name:'검사',role:0}),art:()=>'<span class="hero-art"></span>'},PM_COLORS:['#fff'],PM_ROLES:['전사'],dieFace:n=>`<span class="die-face" data-face="${n}"></span>`});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/portal-feedback.js'),'utf8'),context);
const fx=vm.runInContext('PortalFeedback',context),flights=[];
fx.fly=(el,frames,duration,delay)=>{flights.push({el,frames,duration,delay});};
const event={face:5,until:2700,results:[{slot:0,count:2},{slot:1,count:0}]};
fx.production(event);assert.equal(flights.length,0);assert.ok(!event.presented);
now=1700;context.Portal.productionRoll.elapsed=.85;fx.production(event);assert.equal(flights.filter(f=>f.el.className==='production-face-flight').length,2);assert.ok(flights.some(f=>f.el.innerHTML.includes('data-face="5"')));
const count=flights.length;fx.production(event);assert.equal(flights.length,count,'A roll is presented only once');
const cue={unit:{id:'a',level:7},count:3,until:2400};fx.summon(cue);const card=flights.at(-1).el;assert.equal(card.className,'portal-card-emerge');assert.ok(card.innerHTML.includes('×3'));assert.ok(card.innerHTML.includes('Lv.7'));assert.ok(card.innerHTML.includes('검사'));
context.Portal.page='forge';const hidden={face:1,until:3000,results:[]};const n=flights.length;fx.production(hidden);assert.equal(flights.length,n);
context.Portal.page=null;fx.reduced=()=>true;const applied={face:3,until:3000,applied:true,results:[{slot:0,count:1}]};fx.production(applied);fx.applied(applied);assert.ok(flights.at(-1).el.textContent.includes('+3 충전 · 1명 출격'));
console.log('PASS settle-before-flight, exact dice face, per-slot delivery, one-shot cues, card identity/batch count, menu suppression, reduced motion');
