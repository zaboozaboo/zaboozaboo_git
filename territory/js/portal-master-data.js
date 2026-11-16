'use strict';
const PM_ROLES=['전위','화력','지원'];
const PM_ERAS=['석기','고대','중세','근세','근대','산업','현대','정보화','우주','양자'];
const PM_COLORS=['#c7b9a0','#90c578','#71bddd','#9e93dc','#e7b95e','#e88170','#67d6b5','#bc8ff0','#80d8f8','#f2d592'];
// Two distinct archetypes per role; identity survives level and era growth.
const PM_ARCHETYPES=[
 {role:0,art:'militia',hp:100,atk:12,armor:2,range:25,speed:46,cd:.9,cost:5,batch:3,cap:18,kind:'melee',ability:'물량 출격',desc:'한 번에 3명 · 빠르게 전열 보충'},
 {role:0,art:'paladin',hp:360,atk:24,armor:10,range:28,speed:29,cd:1.4,cost:5,batch:1,cap:6,kind:'melee',ability:'중장 방어',desc:'개별 체력 3배 · 적의 진격 저지'},
 {role:1,art:'archer',hp:85,atk:26,armor:0,range:165,speed:36,cd:1.05,cost:7,batch:1,cap:10,kind:'ranged',proj:'arrow',ability:'집중 사격',desc:'긴 사거리 · 단일 대상 집중 공격'},
 {role:1,art:'pyro',hp:100,atk:17,armor:0,range:125,speed:31,cd:1.65,cost:7,batch:1,cap:10,kind:'ranged',proj:'fire',splash:45,ability:'광역 포격',desc:'반경 45 안의 적에게 광역 피해'},
 {role:2,art:'spear',hp:115,atk:18,armor:1,range:75,speed:35,cd:1.8,cost:9,batch:1,cap:5,kind:'melee',ability:'장창 찌르기',desc:'사거리 75 · 전위 뒤에서 근접 공격'},
 {role:2,art:'spear',hp:165,atk:10,armor:3,range:35,speed:38,cd:1.3,cost:9,batch:1,cap:5,kind:'melee',aura:.03,ability:'진군 깃발',desc:'주변 140 범위 아군 공격력 1명당 +3% · 최대 15%'}
];
const PM_NAMES=[
 ['돌도끼 전사','뼈방패 수호자','투석 사냥꾼','불씨 투척병','돌창병','전쟁 북잡이'],
 ['청동 검병','군단 방패병','복합궁 사수','투석기 운용병','청동 창병','군단 기수'],
 ['징집 보병','중갑 기사','장궁병','공성 화포병','장창병','왕국 기수'],
 ['용병 검객','판금 근위병','아르케부스 사수','야전 포병','파이크병','연대 기수'],
 ['전열 보병','척탄 근위병','소총 저격수','곡사포 운용병','총검병','전술 장교'],
 ['기계화 보병','강철 방패병','기관총 사수','박격포병','기계 창병','통신 장교'],
 ['돌격 소총병','중장 돌격병','정밀 저격수','로켓 포병','전술 창병','전술 통제관'],
 ['전투 안드로이드','강화외골격병','레일건 사수','드론 폭격수','전격 창병','네트워크 지휘관'],
 ['우주 해병','궤도 중갑병','플라즈마 사수','중력 포격수','플라즈마 창병','함대 통제관'],
 ['위상 돌격병','차원 수호자','입자 저격수','특이점 포격수','위상 창병','양자 조율사']
];
const PM_UNITS=[];
for(let era=0;era<10;era++)for(let variant=0;variant<6;variant++){
 const a=PM_ARCHETYPES[variant],id=`pm_${era}_${variant}`,name=PM_NAMES[era][variant];
 const d={...a,id,era,variant,name};PM_UNITS.push(d);
 HERO_BY_ID[id]={...HERO_BY_ID[a.art],id,name,rarity:era<3?'C':era<6?'R':'H',chargeCost:a.cost,cap:a.cap,unit:{...HERO_BY_ID[a.art].unit,name,kind:a.kind,range:a.range,speed:a.speed,atkCd:a.cd,proj:a.proj,splash:a.splash||0,healAll:false}};
 if(typeof ALLY_ART!=='undefined')ALLY_ART[id]=ALLY_ART[a.art];
}
const PM_BY_ID=Object.fromEntries(PM_UNITS.map(u=>[u.id,u]));
