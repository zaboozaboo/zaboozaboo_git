const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const listeners={},button={hidden:true};const c=vm.createContext({assert,Math,W:900,P_CASTLE_X:70,VIEW:{height:300,sy:1},B:{units:[]},document:{getElementById:()=>button},performance:{now:()=>1000}});
vm.runInContext(fs.readFileSync('territory/js/camera.js','utf8'),c);
vm.runInContext(`
const unit=x=>({team:0,hp:100,x,y:160,range:20});
B.units=[unit(400),unit(410),unit(420),unit(780),unit(100)];assert.equal(cameraFocus(),410);
B.units.slice(0,3).forEach(u=>u.target={hp:100,x:430,y:160,size:5});assert.equal(cameraFocus(),410);
for(let i=1;i<200;i++)updateBattleCamera(i*16);assert.ok(BattleCamera.offset>250&&BattleCamera.offset<280);
BattleCamera.manualUntil=10000;BattleCamera.offset=500;updateBattleCamera(4000);assert.equal(BattleCamera.offset,500);
returnToBattle();updateBattleCamera(4016);assert.ok(BattleCamera.offset<500);
B.units=[];for(let i=0;i<200;i++)updateBattleCamera(4032+i*16);assert.ok(BattleCamera.offset<1,'wipe returns to camp');
BattleCamera.offset=999;updateBattleCamera(8000);assert.ok(BattleCamera.offset<=600);
resetBattleCamera();assert.equal(BattleCamera.offset,0);assert.equal(BattleCamera.manualUntil,0);
`,c);
const canvas={clientHeight:300,setPointerCapture(){},addEventListener:(n,f)=>listeners[n]=f};c.canvas=canvas;vm.runInContext('initBattleCamera(canvas)',c);
listeners.pointerdown({button:0,pointerId:1,clientY:100});listeners.pointermove({pointerId:1,clientY:250});assert.equal(vm.runInContext('BattleCamera.offset',c),150);
listeners.pointerup({pointerId:1});assert.equal(vm.runInContext('BattleCamera.manualUntil',c),6000);vm.runInContext('updateBattleCamera(5000)',c);assert.equal(button.hidden,false);button.onclick();vm.runInContext('updateBattleCamera(5016)',c);assert.equal(button.hidden,true);
console.log('PASS: main group focus, isolated units, smooth tracking, wipe, drag, timeout, return button, bounds, reset.');
