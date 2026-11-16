const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const context=vm.createContext({console,Image:class{},ALLY_ART:{militia:6,pm_0_0:6,pm_0_4:7},CombatArt:{allies:{6:{url:'legacy-militia'},7:{url:'legacy-healer'}}}});
for(const file of ['portal-unit-art','presentation'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',file+'.js'),'utf8'),context);
const evaluate=s=>vm.runInContext(s,context);
for(let era=0;era<10;era++)for(let variant=0;variant<6;variant++){
 const id=`pm_${era}_${variant}`;
 const html=evaluate(`heroArt('${id}')`);
 assert.ok(!html.includes('legacy-'),'cold load must not use a legacy portrait');
 assert.ok(html.includes(`${variant===4?'portal-spearmen-v1':'portal-units-v1'}/${id}.png`));
 evaluate(`PortalUnitArt.frames['${id}']=[{url:'ready-${id}'}]`);
 assert.ok(evaluate(`heroArt('${id}')`).includes(`ready-${id}`));
}
assert.ok(evaluate("heroArt('militia')").includes('legacy-militia'),'legacy mode retains its own art');
const render=fs.readFileSync(path.join(__dirname,'../js/render.js'),'utf8');
vm.runInContext(render.slice(render.indexOf('function spriteFor('),render.indexOf('function spriteHeight(')),context);
evaluate("PortalUnitArt.frames={};");
assert.equal(evaluate("spriteFor({heroId:'pm_0_4'})"),null,'battle must not flash legacy art');
evaluate("PortalUnitArt.frames.pm_0_4=[{image:'front'},{image:'back'}]");
assert.equal(evaluate("spriteFor({heroId:'pm_0_4',team:0}).image"),'back');
console.log('PASS all 60 cold/warm portrait identities, dedicated spearman paths, legacy mode isolation');
