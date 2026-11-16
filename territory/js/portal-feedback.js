'use strict';
// Presentation only: production and paid summons never share a cue or change each other's timing.
const PortalFeedback={
 layer:null,
 reduced(){return window.matchMedia('(prefers-reduced-motion: reduce)').matches;},
 ensure(){if(this.layer?.isConnected)return this.layer;this.layer=document.createElement('div');this.layer.id='portal-feedback';this.layer.setAttribute('aria-hidden','true');document.body.append(this.layer);return this.layer;},
 visible(){return !document.hidden&&!Portal.page&&document.getElementById('modal')?.classList.contains('hidden');},
 point(el){const r=el?.getBoundingClientRect();return r&&r.width&&r.height?{x:r.left+r.width/2,y:r.top+r.height/2}:null;},
 fly(el,frames,duration,delay=0){this.ensure().append(el);if(!el.animate){setTimeout(()=>el.remove(),duration);return;}const animation=el.animate(frames,{duration,delay,fill:'both',easing:'cubic-bezier(.22,.65,.3,1)'});animation.finished.then(()=>el.remove(),()=>el.remove());},
 badge(text,p,kind){const el=document.createElement('div');el.className='feedback-badge '+kind;el.textContent=text;el.style.left=p.x+'px';el.style.top=p.y+'px';this.fly(el,[{opacity:0,transform:'translate(-50%,-50%)'},{opacity:1,offset:.15,transform:'translate(-50%,-60%)'},{opacity:1,offset:.75,transform:'translate(-50%,-70%)'},{opacity:0,transform:'translate(-50%,-85%)'}],900);},
 production(event){
  if(!event||event.presented)return;
  // Let the cube settle on its result before sending that exact face to the slots.
  if(Portal.productionRoll&&Portal.productionRoll.elapsed<.85)return;
  event.presented=true;
  if(!this.visible()||Date.now()>event.until)return;
  const source=this.point(document.querySelector('.production-slot .slot-die'));if(!source)return;
  this.badge('생산 눈금 '+event.face,{x:source.x,y:source.y-40},'production');
  event.results.forEach((r,i)=>{
   const target=this.point(document.querySelector(`[data-slot="${r.slot}"] .slot-charge`));if(!target)return;
   if(this.reduced())return;
   const dx=target.x-source.x,dy=target.y-source.y;
   const token=document.createElement('div');token.className='production-face-flight';token.innerHTML=dieFace(event.face)+'<b>+'+event.face+'</b>';token.style.left=source.x+'px';token.style.top=source.y+'px';
   const frames=[{transform:'translate(-50%,-50%) scale(.7)',opacity:0},{transform:'translate(-50%,-50%) scale(1.15)',opacity:1,offset:.15},{transform:`translate(calc(-50% + ${dx*.5}px),calc(-50% + ${dy*.5-36}px)) scale(1.1)`,opacity:1,offset:.55},{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.85)`,opacity:1,offset:.9},{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.6)`,opacity:0}];
   this.fly(token,frames,450/Math.max(1,S.settings?.speed||1));
  });
 },
 summon(cue){
  if(!cue||cue.presented)return;cue.presented=true;
  if(!this.visible()||Date.now()>cue.until)return;
  const origin=this.point(document.querySelector('[data-summon]'));if(!origin)return;
  const p=cue.unit,d=Portal.def(p),card=document.createElement('div');card.className='portal-card-emerge';card.style.left=origin.x+'px';card.style.top=(origin.y-16)+'px';card.style.setProperty('--card-color',PM_COLORS[d.era]);
  card.innerHTML='<span class="card-origin">포탈 소환'+(cue.count>1?' ×'+cue.count:'')+'</span>'+Portal.art(p)+'<b>'+d.name+'</b><small>Lv.'+p.level+' · '+PM_ROLES[d.role]+'</small>';
  const simple=this.reduced();this.fly(card,simple?[{opacity:1,transform:'translate(-50%,-115%)'},{opacity:1,offset:.8,transform:'translate(-50%,-115%)'},{opacity:0,transform:'translate(-50%,-115%)'}]:[{opacity:0,transform:'translate(-50%,-35%) scale(.15) rotateY(80deg)'},{opacity:1,transform:'translate(-50%,-90%) scale(.8) rotateY(55deg)',offset:.35},{opacity:1,transform:'translate(-50%,-125%) scale(1) rotateY(0)',offset:.65},{opacity:1,transform:'translate(-50%,-125%) scale(1)',offset:.88},{opacity:0,transform:'translate(-50%,-135%) scale(.95)'}],650);
 },
 applied(event){
  if(!event?.applied||event.applicationPresented)return;event.applicationPresented=true;
  if(!this.visible()||Date.now()>event.until)return;
  for(const r of event.results){const target=this.point(document.querySelector(`[data-slot="${r.slot}"] .slot-charge`));if(target)this.badge('+'+event.face+' 충전'+(r.count?' · '+r.count+'명 출격':''),{x:target.x,y:target.y-25},'production');}
 },
 tick(){if(!S?.portal)return;this.production(B.diceCue);this.applied(B.diceCue);this.summon(Portal.summonCue);}
};
