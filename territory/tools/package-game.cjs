// node territory/tools/package-game.cjs /absolute/path/to/new-output-folder
// Copy only runtime directories; never ship tests, versions or reclaim variants.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=process.argv[2]&&path.resolve(process.argv[2]);
if(!out||fs.existsSync(out))throw Error('Supply a new, non-existing output directory.');
if(out===root||out.startsWith(root+path.sep))throw Error('Output must be outside the game directory.');
fs.mkdirSync(out,{recursive:true});
for(const entry of fs.readdirSync(root))if(entry==='index.html'||entry.endsWith('.css')||['js','assets'].includes(entry))fs.cpSync(path.join(root,entry),path.join(out,entry),{recursive:true});
console.log(out);
