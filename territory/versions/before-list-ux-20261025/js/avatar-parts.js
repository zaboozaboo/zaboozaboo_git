/* Six complete artwork parts. Arms include hands; legs include feet.
 * Each limb is a single rigid part, anchored at shoulder/hip and aimed at
 * the existing motion solver's hand/ankle. Elbows/knees do not split artwork.
 * left/right are stable character sides (rig indices 0/1).
 */
(function(root){
 const slot=(id,label,position,width,height,color,angle=0)=>({id,label,position,width,height,color,angle});
 const limb=(id,label,start,end,width,color,kind)=>({id,label,position:start,end,width,color,kind});
 const fromPose=p=>({
  leftLeg:limb('leftLeg','왼다리',p.legs[0].hip,p.legs[0].ankle,.14,'#a9a28f','leg'),
  leftArm:limb('leftArm','왼팔',p.arms[0].shoulder,p.arms[0].hand,.12,'#aaa594','arm'),
  body:slot('body','몸통',p.chest,.40,.54,'#d3bea0',-.12),
  head:slot('head','머리',p.head,.46,.46,'#efdbbb'),
  rightLeg:limb('rightLeg','오른다리',p.legs[1].hip,p.legs[1].ankle,.14,'#e4ceb0','leg'),
  rightArm:limb('rightArm','오른팔',p.arms[1].shoulder,p.arms[1].hand,.12,'#efdbbb','arm')
 });
 const api={fromPose};if(typeof module!=='undefined')module.exports=api;root.AvatarParts=api;
})(typeof globalThis!=='undefined'?globalThis:this);
