'use strict';
// A timed redraw must not replace a control between press and native click.
// Do not synthesize clicks: scrolling, cancelled gestures and keyboard input stay native.
const TouchControls={
 pointers:new Set(),releaseTimer:0,
 get busy(){return this.pointers.size>0||!!this.releaseTimer;},
 init(){
  document.addEventListener('pointerdown',e=>{
   const control=e.target.closest?.('#game button, #game [role="button"], #game select');
   if(!control||control.disabled||control.closest('[inert]'))return;
   clearTimeout(this.releaseTimer);this.releaseTimer=0;this.pointers.add(e.pointerId);
  },true);
  const release=e=>{
   if(!this.pointers.delete(e.pointerId)||this.pointers.size)return;
   // Keep the current DOM through the compatibility click after pointerup.
   this.releaseTimer=setTimeout(()=>{this.releaseTimer=0;},400);
  };
  document.addEventListener('pointerup',release,true);
  document.addEventListener('pointercancel',release,true);
  document.addEventListener('click',()=>{if(!this.pointers.size){clearTimeout(this.releaseTimer);this.releaseTimer=0;}},true);
  window.addEventListener('blur',()=>{this.pointers.clear();clearTimeout(this.releaseTimer);this.releaseTimer=0;});
 }
};
TouchControls.init();
