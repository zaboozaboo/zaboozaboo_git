const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const events={},winEvents={};let updates=0,saves=0,rewards=0,raf=0;
const context=vm.createContext({document:{hidden:false,addEventListener:(n,f)=>events[n]=f},window:{addEventListener:(n,f)=>winEvents[n]=f},performance:{now:()=>100},Date,requestAnimationFrame:()=>raf++,bootGame(){},S:{settings:{speed:1},lastSave:0},MobileShell:{mode:'lobby'},accrueLordMerit(){},updateBattle:()=>updates++,render(){},checkDaily(){},saveGame:()=>saves++,UI:{refresh(){},modal(){}},offlineReward:()=>{rewards++;return null;}});
vm.runInContext(fs.readFileSync('territory/js/main.js','utf8'),context);
context.document.hidden=true;events.visibilitychange();vm.runInContext('frame(200)',context);assert.equal(updates,0);assert.equal(saves,1);
context.document.hidden=false;events.visibilitychange();events.visibilitychange();assert.equal(rewards,1,'one reward calculation per return');
vm.runInContext('frame(250)',context);assert.equal(updates,1);winEvents.pagehide();assert.equal(saves,2);
const store=vm.createContext({Date,Math,console,localStorage:{setItem(){throw Error('quota');}},UI:{toast(){store.notices++;}},notices:0});
vm.runInContext(fs.readFileSync('territory/js/state.js','utf8'),store);
vm.runInContext('S={gold:10};saveGame();saveGame();',store);assert.equal(store.notices,1,'failure notice not spammed');
store.localStorage.setItem=()=>{};assert.equal(vm.runInContext('saveGame()',store),true);assert.equal(store.notices,2,'recovery confirmed');
console.log('PASS: background simulation paused, offline reward once, pagehide save, save failure and recovery feedback.');
const nodes={};const microtasks=[];
function el(){const classes=new Set(['hidden']);return {classList:{toggle:(k,on)=>on?classes.add(k):classes.delete(k),contains:k=>classes.has(k),add:k=>classes.add(k),remove:k=>classes.delete(k)},innerHTML:'',inert:false,querySelector:()=>({focus(){}}),querySelectorAll:()=>[]};}
for(const id of ['#modal','#modal-box','#game','#setup'])nodes[id]=el();
const dialogs=vm.createContext({document:{querySelector:s=>nodes[s],activeElement:null,addEventListener(){}},window:{},polishIcons(){},queueMicrotask:f=>microtasks.push(f)});
vm.runInContext(fs.readFileSync('territory/js/ui.js','utf8'),dialogs);
vm.runInContext("UI.modal('first');UI.modal('second');",dialogs);assert.match(nodes['#modal-box'].innerHTML,/first/);assert.doesNotMatch(nodes['#modal-box'].innerHTML,/second/);
vm.runInContext('UI.closeModal()',dialogs);microtasks.shift()();assert.match(nodes['#modal-box'].innerHTML,/second/);assert.equal(nodes['#game'].inert,true);
vm.runInContext('UI.closeModal()',dialogs);microtasks.shift()();assert.equal(nodes['#game'].inert,false);
console.log('PASS: overlapping result dialogs preserved in order and focus barrier restored.');

vm.runInContext("UI.modal('outside click');",dialogs);nodes['#modal'].onclick({target:nodes['#modal-box']});assert.equal(nodes['#game'].inert,true);nodes['#modal'].onclick({target:nodes['#modal']});assert.equal(nodes['#game'].inert,false);console.log('PASS: inside clicks preserve dialog; backdrop dismisses safely.');
