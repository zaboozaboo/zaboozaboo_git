const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../js/state.js'),'utf8');
for(const fail of [false,true]){
 const storage=new Map();let reloads=0;
 const c=vm.createContext({console,Date,Math,UI:{toast(){}},localStorage:{setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k),removeItem:k=>{if(fail)throw Error('blocked');storage.delete(k);}},location:{reload(){reloads++;}}});
 vm.runInContext(source,c);
 vm.runInContext('S={settings:{volume:.6}};saveGame();resetSavedProgress();saveGame();',c);
 assert.equal(reloads,fail?0:1);
 assert.equal(storage.size,fail?1:0,'autosave must not recreate a deleted save; failed deletion must preserve it');
}
console.log('PASS: reset suppresses pagehide/autosave; storage errors preserve progress and avoid reload.');
