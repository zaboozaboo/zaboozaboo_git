'use strict';
// Applied only to profiles created with this learning path. Existing progress is preserved.
function learningPath(){return S?.learning?.version===1;}
function featureRules(){return {
 growth:{tab:'lord',name:'왕국 성장',ready:S.battleTutorial==='done'&&S.maxStage>=2,reason:'첫 전투 안내를 마치고 1단계를 클리어하세요.',text:'전투로 모은 골드를 사용해 왕국을 성장시켜요. 아래 강화 버튼의 비용과 부대 전체에 적용되는 효과를 확인한 뒤 한 번 강화하세요.'},
 lord:{tab:'lord',name:'영주 레벨업',ready:(S.kingdom?.growth?.step||0)>0,reason:'왕국 성장을 먼저 1회 완료하세요.',text:'전투 중 모인 공헌도로 영주 레벨을 돌파해요. 공헌도가 부족하면 전투를 이어가세요. 골드는 사용하지 않아요.'},
 hero:{tab:'territory',name:'영웅 강화',ready:S.lord.level>=2,reason:'영주를 Lv.2로 올리세요.',text:'편성한 영웅의 레벨업 버튼을 눌러 강화하세요. 골드가 필요해요. 영웅 카드의 i 버튼에서는 특성과 충전량을 확인할 수 있어요.'},
 recruit:{tab:'summon',name:'추가 영입',ready:true,reason:'',text:'무료 횟수가 있으면 무료로, 없으면 표시된 보석으로 영입해요. 중복은 조각이 됩니다. 새 동료는 편성 탭에서 자리를 지정해야 출격해요.'},
 land:{tab:'kingdom',name:'영토 시설',ready:S.stats.summons>=2&&S.territoryTutorial==='done',reason:'추가 영입 1회와 첫 영토·선발대 안내를 완료하세요.',text:'함락한 영토에서 시설 하나를 선택해 건설해요. 골드가 필요하고, 건설 후에는 시설을 바꿀 수 없으니 효과를 확인하세요.'},
 promo:{tab:'promo',name:'전직',ready:Object.values(S.kingdom?.lands||{}).some(f=>!!FACILITIES[f]),reason:'확보한 영토에 시설을 먼저 하나 건설하세요.',text:'영토·영주 레벨·클리어 단계·골드 조건을 모두 갖추면 전직할 수 있어요. 전직하면 부대가 강해지고 편성 자리도 늘어나요.'},
 star:{tab:'territory',name:'영웅 승급',ready:!!S.learning?.intro?.recruit&&Object.values(S.heroes).some(h=>h.stars<MAX_STARS&&h.shards>=shardsForStar(h.stars)),reason:'추가 영입을 배우고 승급에 필요한 중복 조각을 모으세요.',text:'조각이 모인 영웅의 승급 버튼을 누르면 별이 올라가요. 필요한 조각을 소모하며 영웅이 더 강해져요.'}
};}
function featureAccess(id){
 if(!learningPath())return {ready:true,unlocked:true};
 const rule=featureRules()[id];if(!rule)return {ready:false,unlocked:false,reason:'알 수 없는 기능'};
 return {...rule,unlocked:rule.ready};
}
function learnFeature(id){
 if(!learningPath()||!featureAccess(id).ready)return false;
 S.learning.intro[id]=true;saveGame();return true;
}
function featureForAction(a){return {kingdomgrow:'growth',lordlv:'lord',hlv:'hero',hinfo:'hero',hstar:'star',summon:'recruit',claimland:'land',promo:'promo'}[a];}
function learningPanel(tab){
 if(!learningPath()||preparingFirstExpedition())return '';
 const next=Object.entries(featureRules()).find(([id,r])=>r.tab===tab&&!S.learning.intro[id]);
 if(!next)return '';
 const [id,rule]=next;
 const short={growth:'골드로 부대 전체 강화',lord:'공헌도로 영주 레벨 돌파',hero:'편성 영웅을 골드로 강화',recruit:'영입한 새 동료는 편성해서 출격',land:'시설 효과를 고르면 영토에 건설',promo:'조건을 갖추면 전직 · 편성 자리 확장',star:'중복 조각으로 영웅 승급'};
 return `<p class="learning-step learning-inline">${rule.ready?short[id]:rule.reason}</p>`;
}
function refreshLearningLocks(){
 if(!learningPath()||preparingFirstExpedition())return;
 document.querySelectorAll('[data-act]').forEach(el=>{
  const id=featureForAction(el.dataset.act);if(!id)return;
  const access=featureAccess(id);
  if(!access.unlocked){el.disabled=true;el.dataset.learningLocked='1';el.title=access.ready?`${access.name} 안내를 먼저 확인하세요.`:access.reason;}
  else if(el.dataset.learningLocked){el.disabled=el.dataset.cost?S[el.dataset.cur||'gold']<Number(el.dataset.cost)||el.dataset.block==='1':false;delete el.dataset.learningLocked;el.removeAttribute('title');}
 });
}
