'use strict';
// One replaceable art set. All paths are relative to the game root.
// Sprite sheets may change without changing simulation or attack hit timing.
const BattleArtSet = {
  id: 'toy-campaign-v2',
  files: ['assets/toy-allies.png','assets/toy-enemies.png','assets/toy-buildings.png','assets/toy-camps.png','assets/toy-battlefields-v2.png'],
  terrain: { columns:3, rows:2, widthScale:1.28 },
  militia: {
    // Set weapon/trail to null for a sheet with its weapon already drawn in.
    weapon: {file:'assets/militia-material-study/axe-side-toy-v2.png',pivot:[.28,.37],tip:[.83,.89],length:.59},
    trail: 'assets/melee-base-v1/slash-trail.png',
    clips: {
      attack: {file:'assets/militia-toy-v1/attack.png',cols:3,rows:2,
        grips:[[.735,.723],[.70,.49],[.85,.59],[.804,.665],[.66,.78],[.765,.707]],
        angles:[-1.14,-3*Math.PI/4,-Math.PI/3,-Math.PI/6,Math.PI/6,-1.14]},
      walk: {file:'assets/militia-toy-v1/walk.png',cols:4,rows:1,
        grips:[[.862,.733],[.837,.740],[.842,.733],[.842,.740]],angles:[-1.10,-1.14,-1.18,-1.14]},
    },
  },
};
