'use strict';
const assert=require('node:assert/strict');const R=require('./engine.js');
function fight(s,k,o={},dt=.05){const b=new R.Battle(s,k,o);for(let i=0;i<20000&&!b.done;i++)b.step(dt);assert(b.done,'Battle must terminate');return b;}
const s=R.fresh();assert.equal(R.KEY,'territory_reclaim_v1');assert.throws(()=>new R.Battle(s,'keep'));assert.equal(R.upgrade(s,'melee'),false);
const first=fight(s,'camp');assert(first.rescued);assert(first.report.win);assert(R.owns(s,'camp'));assert.equal(s.gold,70);const gold=s.gold;first.finish(true);assert.equal(s.gold,gold,'Reward paid exactly once');
assert(R.upgrade(s,'melee'));assert.equal(s.gold,30);assert.equal(s.levels.melee,2);assert(!R.upgrade(s,'melee'));assert(!R.recruit(s));
const weak=R.fresh();weak.lands=['camp'];assert(!fight(weak,'keep').report.win,'Unprepared keep should be difficult');
// Reach the complete slice through earned currency, without injecting gold.
let attempts=0;while(s.levels.melee<3&&attempts++<8){fight(s,'camp');R.upgrade(s,'melee');}assert.equal(s.levels.melee,3);assert(fight(s,'range').report.win);assert(R.recruit(s));assert(!R.recruit(s));const strong=fight(s,'keep');assert(strong.report.win);assert(strong.supports>0);assert(strong.commands>0);assert(fight(s,'rival').report.win);assert.equal(s.rank,19);
const withSupport=R.fresh();withSupport.lands=['camp','range'];withSupport.levels.melee=3;withSupport.hans=true;const without=structuredClone(withSupport);const a=fight(withSupport,'keep'),b=fight(without,'keep',{noSupport:true,noHans:true});assert(a.report.time<b.report.time||!b.report.win,'Support/hero must affect battle outcome');assert.equal(b.supports,0);assert.equal(b.commands,0);
for(const dt of [1/30,1/60,1/120]){const f=R.fresh();assert(fight(f,'camp',{},dt).report.win);}
const roundtrip=R.restore(JSON.stringify(s));assert.deepEqual(roundtrip,s);assert.deepEqual(R.restore('{bad'),R.fresh());assert.equal(R.restore('{"version":1,"gold":-4,"levels":{"melee":999}}').levels.melee,6);
console.log('PASS: locks, rescue, rewards/idempotence, spending, earned progression, support/command, NPC rank, 30/60/120fps opening, save migration.');console.log('Prepared keep',a.report,'Without support/Hans',b.report);
