// Tiny dependency-free local .env loader. Existing process env (Railway, etc.) wins.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
try {
 const txt=fs.readFileSync(path.join(dir,'.env'),'utf8');
 for(const line of txt.split(/\r?\n/)){
   const match=line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
   if(!match||Object.prototype.hasOwnProperty.call(process.env,match[1]))continue;
   let value=match[2];
   if((value[0]==='"'&&value.at(-1)==='"')||(value[0]==="'"&&value.at(-1)==="'"))value=value.slice(1,-1);
   process.env[match[1]]=value;
 }
} catch(e){if(e.code!=='ENOENT')console.warn('Could not load .env:',e.message)}
