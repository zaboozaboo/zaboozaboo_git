'use strict';
const BattleCamera={offset:0,manualUntil:0,drag:null,last:0,focus:null};
function cameraViewHeight(){return (VIEW.height||W)-(VIEW.hudInset||0);}
function cameraLimit(){return Math.max(0,W-cameraViewHeight());}
function cameraFocus(){
 const allies=B.units.filter(u=>u.team===0&&u.hp>0);
 if(!allies.length)return P_CASTLE_X;
 const fighting=allies.filter(u=>u.target&&u.target.hp>0&&Math.hypot(u.target.x-u.x,u.target.y-u.y)<=u.range+u.target.size+45);
 const pool=fighting.length>=2?fighting:allies;
 // Densest longitudinal group wins; stragglers cannot pull the camera away.
 let group=[],score=-1;
 for(const seed of pool){const near=pool.filter(u=>Math.abs(u.x-seed.x)<100);
  const weight=near.length+(BattleCamera.focus!==null&&Math.abs(seed.x-BattleCamera.focus)<100?.35:0);
  if(weight>score){score=weight;group=near;}
 }
 return group.reduce((sum,u)=>sum+u.x,0)/group.length;
}
function resetBattleCamera(){BattleCamera.offset=0;BattleCamera.focus=null;BattleCamera.manualUntil=0;BattleCamera.drag=null;BattleCamera.last=0;}
function returnToBattle(){BattleCamera.manualUntil=0;BattleCamera.drag=null;}
function updateBattleCamera(now){
 if(typeof S!=='undefined'&&S?.territoryTutorial==='boss'){BattleCamera.offset=cameraLimit();BattleCamera.last=now;return;}
 if(typeof firstBattlePhase!=='undefined'&&(firstBattlePhase==='deployed'||S?.territoryTutorial==='support')){
  const unit=B.units.find(u=>S?.territoryTutorial==='support'?u.isVanguard:u.team===0&&u.heroId==='militia');
  if(unit){BattleCamera.offset=Math.max(0,Math.min(cameraLimit(),unit.x-cameraViewHeight()*.55));BattleCamera.last=now;return;}
 }
 const dt=BattleCamera.last?Math.min(.05,(now-BattleCamera.last)/1000):.016;BattleCamera.last=now;
 const manual=!!BattleCamera.drag||now<BattleCamera.manualUntil;
 if(!manual){
  BattleCamera.focus=B.ended&&B.result==='win'?W:cameraFocus();
  const target=Math.max(0,Math.min(cameraLimit(),BattleCamera.focus-cameraViewHeight()*.45));
  BattleCamera.offset+=(target-BattleCamera.offset)*(1-Math.exp(-dt*3));
 }
 BattleCamera.offset=Math.max(0,Math.min(cameraLimit(),BattleCamera.offset));
 const button=document.getElementById('camera-return');if(button)button.hidden=!manual;
}
function initBattleCamera(canvas){
 const button=document.getElementById('camera-return');if(button)button.onclick=returnToBattle;
 canvas.addEventListener('pointerdown',e=>{
  if(e.button!==0||BattleCamera.drag)return;
  BattleCamera.drag={id:e.pointerId,y:e.clientY};BattleCamera.manualUntil=performance.now()+5000;
  canvas.setPointerCapture(e.pointerId);
 });
 canvas.addEventListener('pointermove',e=>{
  const drag=BattleCamera.drag;if(!drag||drag.id!==e.pointerId)return;
  BattleCamera.offset=Math.max(0,Math.min(cameraLimit(),BattleCamera.offset+(e.clientY-drag.y)/VIEW.sy));
  drag.y=e.clientY;
 });
 const release=e=>{if(BattleCamera.drag?.id!==e.pointerId)return;BattleCamera.drag=null;BattleCamera.manualUntil=performance.now()+5000;};
 canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
 canvas.addEventListener('wheel',e=>{e.preventDefault();const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?canvas.clientHeight:1);BattleCamera.offset=Math.max(0,Math.min(cameraLimit(),BattleCamera.offset-delta/VIEW.sy));BattleCamera.manualUntil=performance.now()+5000;},{passive:false});
}
