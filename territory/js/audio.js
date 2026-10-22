'use strict';
const GameAudio={
 context:null,
 volume(){const v=S?.settings?.volume;return Number.isFinite(v)?Math.max(0,Math.min(1,v)):.35;},
 play(kind='roll'){
  if(!this.volume()||document.hidden)return;
  try{
   const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
   this.context ||= new Audio();const c=this.context;if(c.state!=='running'){c.resume().catch(()=>{});return;}
   const notes=kind==='skill'?[220,440,660]:kind==='combo'?[520,650,780]:[460];
   notes.forEach((hz,i)=>{const at=c.currentTime+i*.045,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(hz,at);o.frequency.exponentialRampToValueAtTime(hz*.65,at+.09);g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(this.volume()*.12,at+.008);g.gain.exponentialRampToValueAtTime(.001,at+.11);o.connect(g);g.connect(c.destination);o.start(at);o.stop(at+.12);o.onended=()=>{o.disconnect();g.disconnect();};});
  }catch(e){/* Audio is optional; gameplay continues if unavailable. */}
 },
};
document.addEventListener('pointerdown',()=>{if(GameAudio.context?.state==='suspended')GameAudio.context.resume().catch(()=>{});},{passive:true});
