const names=[["돌도끼 전사", "뼈방패 수호자", "투석 사냥꾼", "불씨 투척병", "부족 치유사", "전쟁 북잡이"], ["청동 검병", "군단 방패병", "복합궁 사수", "투석기 운용병", "신전 의무관", "군단 기수"], ["징집 보병", "중갑 기사", "장궁병", "공성 화포병", "수도원 치유사", "왕국 기수"], ["용병 검객", "판금 근위병", "아르케부스 사수", "야전 포병", "군의관", "연대 기수"], ["전열 보병", "척탄 근위병", "소총 저격수", "곡사포 운용병", "야전 간호병", "전술 장교"], ["기계화 보병", "강철 방패병", "기관총 사수", "박격포병", "전투 의무병", "통신 장교"], ["돌격 소총병", "중장 돌격병", "정밀 저격수", "로켓 포병", "구급 특수병", "전술 통제관"], ["전투 안드로이드", "강화외골격병", "레일건 사수", "드론 폭격수", "의료 드론", "네트워크 지휘관"], ["우주 해병", "궤도 중갑병", "플라즈마 사수", "중력 포격수", "생체 복원병", "함대 통제관"], ["위상 돌격병", "차원 수호자", "입자 저격수", "특이점 포격수", "시간 복원자", "양자 조율사"]];
const eras=["석기", "고대", "중세", "근세", "근대", "산업", "현대", "정보화", "우주", "양자"];
const roles=['전위','화력','지원'];let loaded=0,failed=0;
PortalUnitArt.file=id=>'../assets/portal-units-v1/'+id+'.png';
const gallery=document.querySelector('#gallery');
eras.forEach((era,e)=>{
 document.querySelector('#era').add(new Option(era,e));
 const section=document.createElement('section');section.className='era';section.dataset.era=e;section.innerHTML='<h2>'+era+'</h2><div class="grid"></div>';gallery.append(section);
 for(let role=0;role<3;role++){
 const pair=document.createElement('div');pair.className='pair';pair.innerHTML='<h3>'+roles[role]+'</h3>';section.querySelector('.grid').append(pair);
 for(let v=role*2;v<role*2+2;v++){
 const id='pm_'+e+'_'+v,card=document.createElement('article');card.className='unit';card.innerHTML='<b>'+names[e][v]+'</b><small>'+id+'</small><div class="views"></div><div class="small"></div>';pair.append(card);
 const image=new Image();image.onload=()=>{const frames=PortalUnitArt.unpack(image);frames.forEach((frame,i)=>{const im=new Image();im.src=frame.url;im.alt=names[e][v]+(i?' 뒷모습':' 앞모습');card.querySelector('.views').append(im);});card.querySelector('.small').innerHTML='<img alt="전장 32px" src="'+frames[1].url+'"><span class="slot"><img alt="슬롯 52px" src="'+frames[0].url+'"></span>';loaded++;status();};image.onerror=()=>{failed++;card.classList.add('error');card.append('이미지 누락');status();};image.src=PortalUnitArt.file(id);
 }
 }
});
function status(){document.querySelector('#status').textContent=loaded+'/60 로드 · 오류 '+failed;}
document.querySelector('#era').onchange=e=>document.querySelectorAll('.era').forEach(s=>s.hidden=e.target.value!=='all'&&s.dataset.era!==e.target.value);
