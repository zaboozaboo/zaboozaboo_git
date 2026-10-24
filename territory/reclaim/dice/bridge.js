/* Thin adapter for the unmodified original js/dice.js and js/data.js. */
let S,B,productionBattle;
function slotCount(){return 2;}
function heroCap(id){return HERO_BY_ID[id].cap;}
function armyMult(){return {spawn:1};}
function slotAlive(team,slot,id){return productionBattle.units.filter(u=>u.team===team&&u.slot===slot&&u.heroId===id&&u.hp>0).length;}
function formationPosition(slot){return {x:slot===0?260:340,y:1040};}
function spawnHero(team,id,pos,scale,tint,slot,count){for(let i=0;i<count;i++)productionBattle.recruit(id,slot);}
function bindProduction(battle){productionBattle=battle;S={dice:{},slots:['militia','archer']};B={units:battle.units,fx:[],spawnT:[],openingDice:0};beginStageDice();}
function stepProduction(dt,enabled=true,auto=true){if(!enabled||productionBattle.done)return;const before=S.dice.rolls||0;
 if(auto)tickDice(dt);else if(B.openingDice>0){B.openingDice=Math.max(0,B.openingDice-dt);if(B.openingDice===0)rollOpeningProduction();}else S.dice.progress=Math.min(1,S.dice.progress+dt/diceCooldown());
 if((S.dice.rolls||0)!==before)captureRoll();B.fx.length=0;
}
function captureRoll(){productionBattle.rolls.push({time:productionBattle.time,...S.dice.last});productionBattle.events.push({type:'roll',time:productionBattle.time,...S.dice.last});}
function manualRoll(){if(productionBattle.done||B.openingDice>0||S.dice.progress<1)return false;S.dice.progress=0;rollProduction();captureRoll();return true;}
