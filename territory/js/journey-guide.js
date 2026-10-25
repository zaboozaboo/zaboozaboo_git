'use strict';
// Short, optional guidance on the real controls. It never pauses or spends resources.
const JourneyGuide={
 active:null, speech:null, cooldown:0,
 victory(stage,win,first){
  if(!win)this.speech={text:'잠깐 숨을 고르자! 성장 탭에서 부대를 강화하고 다시 도전하자.',until:Date.now()+6000};
  else if(first){
   const next=LANDS.find(l=>l.boss>stage);
   const text=stage===1?'한스: 좋아! 첫 캠프를 넘었어. 조금만 더 가면 적의 본진이 보일 거야!':stage===4?'한스: 저기 적의 성이 보여! 성을 함락하면 우리 영토가 될 거야!':next?`한스: 승리다! 다음 성은 ${next.boss}단계야. 전열을 정비하고 진군하자!`:'한스: 또 한 걸음 전진했어! 부대를 성장시키며 계속 나아가자!';
   this.speech={text,until:Date.now()+6000};
  }
 },
 lessons(){
  const stage=S.maxStage, growth=kingdomGrowth();
  return [
   {id:'skill',ready:stage>=2,tab:null,target:'#btn-skill',text:'영주 스킬은 여기! 준비되면 눌러 전선을 밀어낼 수 있어요.'},
   {id:'auto',ready:stage>=2,tab:null,target:'#btn-auto',text:'AUTO가 켜져 있으면 스킬을 자동 사용해요. 끄면 원하는 순간 직접 쓸 수 있어요.'},
   {id:'growth',ready:stage>=2&&!growth.locked&&S.gold>=growth.cost,tab:'lord',target:'[data-act="kingdomgrow"]',text:'승리로 모은 골드로 왕국을 성장시켜요. 표시된 효과가 모든 부대에 적용돼요.'},
   {id:'lord',ready:S.lord.merit>=lordBreakthroughCost(),tab:'lord',target:'#lord-breakthrough',text:'공헌도가 모였어요! 영주 레벨을 돌파하면 부대도 강해져요.'},
   {id:'recruit',ready:stage>=3,tab:'summon',target:'[data-act="summon"]',text:'새 동료는 영입 탭에서 만나세요. 무료 횟수와 보석 비용을 먼저 확인해요.'},
   {id:'roster',ready:Object.keys(S.heroes).length>1&&stage>=3,tab:'territory',target:'[data-act="place"]',text:'새 영웅은 편성해야 출격해요. 카드를 선택한 뒤 빈자리나 교체할 자리를 눌러요.'},
   {id:'hero',ready:stage>=3,tab:'territory',target:'[data-act="hlv"]',text:'편성한 영웅의 레벨업 버튼이에요. 필요한 골드를 모아 부대를 강화해요.'},
   {id:'detail',ready:stage>=4,tab:'territory',target:'[data-act="hinfo"]',text:'영웅의 i 버튼에서 특성과 출격 충전량, 보유 조각을 확인해요.'},
   {id:'star',ready:Object.values(S.heroes).some(o=>o.stars<MAX_STARS&&o.shards>=shardsForStar(o.stars)),tab:'territory',target:'[data-act="hstar"]',text:'조각이 충분해졌어요! 승급 버튼으로 이 영웅을 더 강하게 키워요.'},
   {id:'land',ready:ownedLands()>0,tab:'kingdom',target:'[data-act="claimland"]',text:'차지한 영토에 시설을 지을 수 있어요. 시설 효과와 건설 비용을 살펴보세요.'},
   {id:'promo',ready:ownedLands()>0,tab:'promo',target:'[data-act="promo"]',text:'전직 조건을 확인해요. 영토·레벨·단계·골드를 갖추면 편성 자리도 늘어나요.'},
   {id:'expedition',ready:expeditionAccess('duel').ready,tab:'nation',target:'[data-act="expeditionintro"][data-mode="duel"]',text:'서열전 안내가 열렸어요. 원정 탭에서 출전 방법을 확인하세요. 국가전은 그다음에 열려요.'},
   {id:'war',ready:expeditionAccess('war').ready&&!expeditionAccess('war').unlocked,tab:'nation',target:'[data-act="expeditionintro"][data-mode="war"]',text:'국가전 안내가 열렸어요. 출전 방법을 확인한 뒤 적국을 선택하세요.'},
   {id:'retry',ready:S.farming,tab:null,target:'#btn-boss',text:'강화가 끝났다면 돌파 도전! 이 버튼을 눌러 다음 단계에 다시 도전해요.'},
   {id:'settings',ready:stage>=8,tab:null,target:'#battle-top .settings-open',text:'설정에서 소리 크기를 바꿀 수 있어요.'}
  ];
 },
 finish(){
  if(this.active){(S.fieldGuideSeen??={})[this.active.id]=true;saveGame();}
  this.active=null;this.cooldown=Date.now()+12000;this.clear();
 },
 clear(){document.getElementById('journey-hint')?.remove();document.querySelectorAll('.journey-focus').forEach(e=>e.classList.remove('journey-focus'));},
 refresh(){
  if(!S||B.ended||preparingFirstExpedition()||firstBattlePaused()||!document.getElementById('modal').classList.contains('hidden')){this.clear();return;}
  const now=Date.now();
  if(typeof CombatFeedback!=='undefined'&&((CombatFeedback.growth&&(CombatFeedback.growth.pending&&!UI.tab||now-CombatFeedback.growth.at<3500))||CombatFeedback.conquest?.until>now)){this.clear();return;}
  if(this.speech&&this.speech.until>now&&!UI.tab&&MobileShell.mode==='battle'){
   document.querySelectorAll('.journey-focus').forEach(e=>e.classList.remove('journey-focus'));this.show(this.speech.text,document.getElementById('battle-top'),true);return;
  }
  if(this.active&&now>this.active.until){this.finish();return;}
  if(!this.active&&now>=this.cooldown){
   const lesson=this.lessons().find(l=>l.ready&&!(typeof learningPath==='function'&&learningPath()&&featureRules()[l.id]&&!featureAccess(l.id).unlocked)&&!S.fieldGuideSeen?.[l.id]&&(l.tab||MobileShell.mode==='battle'));
   if(lesson)this.active={...lesson,until:now+12000};
  }
  if(!this.active){this.clear();return;}
  const l=this.active;
  if(!l.tab&&UI.tab){this.clear();return;}
  // Follow the same tab into its real control; do not open a screen automatically.
  const tab=l.tab==='kingdom'?'lobby':l.tab==='promo'?'lord':l.tab;
  const onScreen=UI.tab===l.tab||(l.tab==='kingdom'&&MobileShell.mode==='lobby'&&!UI.tab);
  const selector=l.tab&&!onScreen?`#tabs [data-tab="${tab}"]`:l.target;
  let target=document.querySelector(selector);
  if(l.tab==='promo'&&UI.tab==='lord')target=document.querySelector('[data-act="openpromo"]');
  if(l.tab==='kingdom'&&onScreen&&!UI.tab)target=document.querySelector('[data-land="grove"]');
  if(l.tab&&UI.tab===l.tab){this.clear();target?.classList.add('journey-focus');return;}
  if(!target||!target.getBoundingClientRect().height){this.clear();return;}
  const names={lord:'성장',territory:'편성',summon:'영입',lobby:'왕국',nation:'원정'};
  document.querySelectorAll('.journey-focus').forEach(e=>e.classList.remove('journey-focus'));target.classList.add('journey-focus');
  this.show(l.tab&&!onScreen?`${names[tab]}에서 다음 성장을 준비하세요.`:l.text,target,false);
 },
 show(text,target,speech){
  let box=document.getElementById('journey-hint');
  if(!box){box=document.createElement('aside');box.id='journey-hint';box.setAttribute('role','status');box.innerHTML='<span></span><button aria-label="안내 닫기">×</button><i aria-hidden="true">↓</i>';document.getElementById('game').append(box);box.querySelector('button').onclick=()=>{this.speech=null;this.finish();};}
  if(box.querySelector('span').textContent!==text)box.querySelector('span').textContent=text;box.classList.toggle('speech',speech);box.classList.toggle('on-tab',!!target.closest('#tabs'));
  const game=document.getElementById('game').getBoundingClientRect(),r=target.getBoundingClientRect();
  box.style.width=Math.min(280,game.width-24)+'px';
  const h=box.getBoundingClientRect().height,left=Math.max(12,Math.min(game.width-box.offsetWidth-12,r.left-game.left+r.width/2-box.offsetWidth/2));
  let top=speech?r.bottom-game.top+8:r.top-game.top-h-22;
  if(!UI.tab&&MobileShell.mode==='battle'&&!speech)top=Math.min(top,document.getElementById('field').getBoundingClientRect().bottom-game.top-h-60);
  const placedTop=Math.max(66,top);
  box.style.left=left+'px';box.style.top=placedTop+'px';
  box.querySelector('i').style.top=(r.top-game.top-placedTop-25)+'px';
  box.querySelector('i').style.left=Math.max(12,Math.min(box.offsetWidth-24,r.left-game.left+r.width/2-left))+'px';
 }
};
