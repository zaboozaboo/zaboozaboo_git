'use strict';
const ScrollUI={
 colors:['#aeb7c0','#75ca86','#71b9f0','#ba88ec','#f0c35d','#ed8eac'],
 progress(){let left=CollectionUI.ensure().pulls.pets;const rows=PORTAL_COLLECTION_DATA.rates.filter(r=>r.SummonType==='Eggs');for(let i=0;i<rows.length;i++){const r=rows[i];if(left<r.SummonsRequired||i===rows.length-1)return {left:Math.min(left,r.SummonsRequired),required:r.SummonsRequired,max:i===rows.length-1};left-=r.SummonsRequired;}},
 art(r){return `<span class="scroll-grade-art" style="--scroll-tier:${this.colors[r]}"><img src="assets/pets-v1/scroll.png" alt=""></span>`;},
 cards(){const c=CollectionUI.ensure();return [...c.scrollInventory].sort((a,b)=>CollectionUI.def('pets',b.id).r-CollectionUI.def('pets',a.id).r).map(s=>{const r=CollectionUI.def('pets',s.id).r;return `<button class="pet-scroll-card" data-scroll-select="${r}" aria-label="${PetGrowth.names[r]} 스크롤">${this.art(r)}</button>`;}).join('');},
 show(r){const c=CollectionUI.ensure(),count=c.scrollInventory.filter(s=>CollectionUI.def('pets',s.id)?.r===r).length;PetScreen.open(`<div class="scroll-detail">${this.art(r)}<h2 id="pet-dialog-title">${PetGrowth.names[r]} 스크롤</h2><p>◷ ${PetGrowth.hatchSeconds(r)/60}분</p><button data-scroll-start="${r}" class="master-primary" ${!count||c.scrolls.length>=3?'disabled':''}>${c.scrolls.length>=3?'해독 자리 사용 중':'해독 시작'}</button></div>`);}
};
