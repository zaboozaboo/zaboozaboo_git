const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({assert,Math,console,window:{matchMedia:()=>({matches:false})},LANE_W:320,W:900,BattleCamera:{offset:100}});
vm.runInContext(fs.readFileSync('territory/js/render.js','utf8'),c);
vm.runInContext(`
VIEW.height=400;
assert.ok(perspectiveScale(500)<perspectiveScale(100));
assert.equal(SX(160,500),160);assert.equal(SX(160,100),160);
assert.ok(Math.abs(SX(80,500)-160)<Math.abs(SX(80,100)-160));
assert.equal(perspectiveScale(10000),.68);assert.equal(perspectiveScale(-10000),1.08);
assert.equal(SY(300),600,'longitudinal coordinates unchanged');
BattleCamera.offset=200;assert.ok(perspectiveScale(500)>.68,'depth follows camera');
console.log('PASS: perspective depth, centered projection, distant lateral convergence, clamping, unchanged world positions, camera tracking.');
`,c);
