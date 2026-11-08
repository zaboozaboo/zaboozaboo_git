'use strict';
// Source curves are compressed for two army-support pets, not copied as hero stats.
const PetGrowth={
 names:['기본형','성장형','각성형','영수형','초월형','기원형'],
 unlockAges:[0,1,3,5,7,9],
 cooldowns:[0,0,0,12,15,18],
 hatchSeconds(r){return Math.round(Math.sqrt([1800,7200,14400,28800,57600,115200][r]/1800)*30)*60;},
 rows(r){return PET_SOURCE[CollectionUI.rarity[r]];},
 seed(r){return Math.round(100*Math.pow(this.rows(r)[0][0]/100,.25));},
 required(r,level){return level>=100?0:Math.round(this.seed(r)*this.rows(r)[level][0]/this.rows(r)[0][0]);},
 progress(r,xp){let level=1,left=xp;while(level<100&&left>=this.required(r,level)){left-=this.required(r,level);level++;}return {level,left,next:this.required(r,level)||null};},
 ensure(c){if(c.petEvolution===1)return c;c.legacyPetCopies={...c.pets};c.petXp={};c.petLocks={};
  for(const [id,count] of Object.entries(c.pets)){const d=CollectionUI.def('pets',id);if(!d||count<1)continue;let left=count-1,level=1;for(const row of PORTAL_COLLECTION_DATA.skillUp){if(left<row.Shards)break;left-=row.Shards;level++;}let xp=0;for(let l=1;l<Math.min(100,level);l++)xp+=this.required(d.r,l);const oldNext=PORTAL_COLLECTION_DATA.skillUp.find(r=>r.Level===level)?.Shards;xp+=oldNext?Math.floor(left/oldNext*this.required(d.r,Math.min(99,level))):0;c.petXp[id]=xp;c.pets[id]=1;}
  const seen=new Set();c.equipped.pets=c.equipped.pets.map(id=>{const d=CollectionUI.def('pets',id);if(!d||seen.has(d.variant))return null;seen.add(d.variant);return id;});c.petEvolution=1;return c;},
 age(){return Math.max(0,Math.min(9,Portal.stageInfo(S.portal.maxStage||1).AgeIndex));},
 strength(id){const d=CollectionUI.def('pets',id);if(!d)return 0;const level=CollectionUI.level('pets',id).level,rows=this.rows(d.r);return .08*Math.pow(rows[0][1]/100,.1)*rows[level-1][1]/rows[0][1];},
 power(id){const d=CollectionUI.def('pets',id),s=this.strength(id);if(!d)return 0;return Math.min(d.variant===2||d.variant===5?.30:.60,s);},
 available(target,id){const c=CollectionUI.ensure(),t=CollectionUI.def('pets',target),d=CollectionUI.def('pets',id);if(id.startsWith('scroll_')){const r=Number(id.split('_')[1]);return t&&Number.isInteger(r)&&r>=0&&r<=t.r?c.scrollInventory.filter(s=>CollectionUI.def('pets',s.id)?.r===r).length:0;}if(!t||!d||d.r>t.r||c.petLocks[id])return 0;return Math.max(0,(c.pets[id]||0)-(id===target||c.equipped.pets.includes(id)?1:0));},
 preview(target,selection){const c=CollectionUI.ensure(),d=CollectionUI.def('pets',target);if(!d||!c.pets[target])return null;let count=0,xp=0;for(const [id,n] of Object.entries(selection)){if(!Number.isInteger(n)||n<1||n>this.available(target,id))return null;const m=CollectionUI.def('pets',id);count+=n;xp+=n*this.seed(id.startsWith('scroll_')?Number(id.split('_')[1]):m.r);if(id!==target&&n===c.pets[id])xp+=c.petXp[id]||0;}if(!count||count>5||CollectionUI.level('pets',target).level>=100)return null;return {count,xp,...this.progress(d.r,(c.petXp[target]||0)+xp)};},
 feed(target,selection){const result=this.preview(target,selection);if(!result)return false;const c=CollectionUI.ensure();for(const [id,n] of Object.entries(selection)){if(id.startsWith('scroll_')){const r=Number(id.split('_')[1]);let left=n;c.scrollInventory=c.scrollInventory.filter(s=>{if(left&&CollectionUI.def('pets',s.id)?.r===r){left--;return false;}return true;});continue;}c.pets[id]-=n;if(!c.pets[id]){delete c.pets[id];delete c.petXp[id];delete c.petLocks[id];}}c.petXp[target]=(c.petXp[target]||0)+result.xp;saveGame();return result;},
 effect(id){const d=CollectionUI.def('pets',id),p=this.power(id),v=(p*100).toFixed(1);return [
  '다음 출격 부대 공격력 +'+v+'%',
  '다음 출격 부대 체력 +'+v+'%',
  '생산 주사위 속도 +'+v+'%',
  '12초마다 최대 3명 포격 · 완편 부대 초당 공격력의 '+(p*12*100).toFixed(0)+'%를 나누어 피해',
  '15초마다 부상 아군 회복 · 완편 부대 체력의 '+(p*15/60*100).toFixed(1)+'%까지 회복',
  '18초마다 모든 포탈 충전 · 기본 주사위 생산량 대비 +'+v+'%'
 ][d.variant];},
 // Fixed complete-formation budget prevents enemy count or surviving armies multiplying output.
 budget(){return S.portal.board.filter(Boolean).reduce((a,p)=>{const s=collectionStats.call(Portal,p);a.dps+=s.atk/s.cd*s.cap;a.hp+=s.hp*s.cap;return a;},{dps:0,hp:0});},
 basicAttack(id,target){if(!target||target.hp<=0||target.team===0||!B.units.some(u=>u.team===0&&u.hp>0))return false;const damage=this.budget().dps*this.power(id)*.25*2;dealDamage(target,damage,null);return damage>0;},
 cast(id){const d=CollectionUI.def('pets',id);if(!d)return;const power=this.power(id),budget=this.budget();
  if(d.variant===3){const targets=B.units.filter(u=>u.team!==0&&u.hp>0).slice(0,3);for(const u of targets)u.hp=Math.max(0,u.hp-budget.dps*power*12/targets.length);}
  if(d.variant===4){let remaining=budget.hp*power*15/60;const targets=B.units.filter(u=>u.team===0&&u.hp>0&&u.hp<u.maxHp).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp);for(const u of targets){const heal=Math.min(u.maxHp-u.hp,remaining);u.hp+=heal;remaining-=heal;if(remaining<=0)break;}}
  if(d.variant===5){Portal.petChargeRemainder=Portal.petChargeRemainder||{};const total=(Portal.petChargeRemainder[id]||0)+3.5/collectionInterval.call(Portal)*18*power;const eyes=Math.floor(total);Portal.petChargeRemainder[id]=total-eyes;S.portal.board.forEach((p,i)=>{if(p&&eyes)Portal.produce(i,eyes);});}
 }
};
const evolutionEnsure=CollectionUI.ensure;CollectionUI.ensure=function(){return PetGrowth.ensure(evolutionEnsure.call(this));};
const evolutionLevel=CollectionUI.level;CollectionUI.level=function(kind,id){if(kind!=='pets')return evolutionLevel.call(this,kind,id);const c=this.ensure(),d=this.def(kind,id);return d?PetGrowth.progress(d.r,c.petXp[id]||0):{level:1,left:0,next:null};};
const evolutionPower=CollectionUI.power;CollectionUI.power=function(kind,id){return kind==='pets'?PetGrowth.power(id):evolutionPower.call(this,kind,id);};
const evolutionEffect=CollectionUI.effect;CollectionUI.effect=function(kind,id){return kind==='pets'?PetGrowth.effect(id):evolutionEffect.call(this,kind,id);};
const evolutionEquip=CollectionUI.equip;CollectionUI.equip=function(kind,id,slot){if(kind==='pets'){const d=this.def(kind,id),c=this.ensure();if(!d)return false;if(c.equipped.pets.some((other,i)=>i!==Number(slot)&&other!==id&&this.def('pets',other)?.variant===d.variant))return false;}return evolutionEquip.call(this,kind,id,slot);};
