import assert from 'node:assert/strict';
import {gradeCrowdMatch} from '../public/rewards.js';
const puzzles=['park','cafe','island','gallery','plaza'].map((scene,i)=>({id:'p'+i,scene,variant:0,slot:i+1,eyebrow:'TEST PUZZLE',question:'Where would everyone choose in this picture?'}));
let html='',nodes=new Map(),answers=[];
const today='2026-11-22';
const basic={data:null, classList:{add(){},remove(){}}, textContent:'', style:{}, getBoundingClientRect(){return {left:0,top:0,width:480,height:330}}, addEventListener(type,listener){this.listeners??={};this.listeners[type]=listener}, focus(){}};
const app={set innerHTML(s){html=s;nodes.clear()},get innerHTML(){return html}};
const rootNodes={'#app':app,'#todayLabel':Object.create(basic),'#toast':Object.create(basic),'#howButton':Object.create(basic)};
globalThis.document={
 querySelector(sel){if(rootNodes[sel])return rootNodes[sel];if(!nodes.has(sel))nodes.set(sel,{...basic,classList:{add(){},remove(){}}});return nodes.get(sel)},
 querySelectorAll(){return []},
 getElementById(sel){return nodes.get('#'+sel)||null},
 body:{append(){}}
};
globalThis.window={};globalThis.location={search:'',origin:'http://localhost:3000'};
globalThis.requestAnimationFrame=fn=>{}; // Browser-only animation; structural DOM validated in this test.
const heatmap={cols:25,rows:17,values:Array(425).fill(0)};
const prediction={status:'predicted',source:'prediction',score:27,hotspotScore:99,alignment:99,tier:'perfect',stars:3,heatmap,playerCount:1,needed:50,yourTap:{x:.5,y:.5}};
globalThis.fetch=async(url,opts={})=>{
 let data;
 if(url==='/api/daily')data={date:today,timeZone:'Asia/Kolkata',puzzles,answers:[...answers],completed:false,daysAvailable:true};
 else if(url==='/api/answers'){
  const v=JSON.parse(opts.body);answers.push({puzzleId:v.puzzleId,x:v.x,y:v.y});data={ok:true,alreadySubmitted:false,tap:v,completed:answers.length===5,roundResult:{...prediction,yourTap:{x:v.x,y:v.y}},earnedXp:answers.length*10};
 }else if(url==='/api/results')data={date:today,minimumPlayers:50,totalScore:null,puzzles:puzzles.map(p=>({puzzleId:p.id,...prediction})),awards:[{id:'finisher',symbol:'🎖️',name:'Daily Finisher',detail:'All five choices locked in'}]};
 else data={error:'Unknown URL '+url};
 return {ok:!data.error,status:data.error?400:200,json:async()=>data}
};
await import('../public/app.js');
await new Promise(r=>setTimeout(r,70));
assert.ok(html.includes('Think like')&&html.includes('Find your spot'),'Welcome screen renders');console.log('✓ Welcome loads');
document.querySelector('#tryPractice').onclick();
assert.ok(html.includes('ONE-MINUTE PRACTICE')&&html.includes('puzzleFrame'),'Practice puzzle renders');console.log('✓ Practice puzzle renders');
let tap=document.querySelector('#tapSurface');
tap.listeners.click({clientX:240,clientY:165});
assert.ok(html.includes('Lock in my spot'),'Tap picks position');
await document.querySelector('#confirmButton').listeners.click();
assert.ok(html.includes('PRACTICE REVEAL')&&html.includes('heatCanvas')&&html.includes('PRACTICE SPOT FIT'),'Practice immediately reveals practice heatmap and score');console.log('✓ Practice reveal is on the very next slide');
document.querySelector('#nextRevealButton').listeners.click();
assert.ok(html.includes('DAILY DROP'),'Practice CTA launches daily puzzle');
for(let i=0;i<5;i++){
 tap=document.querySelector('#tapSurface');tap.listeners.click({clientX:240,clientY:165});
 await document.querySelector('#confirmButton').listeners.click();
 if(i===0&&process.env.EXPORT_REVEAL_HTML){
   const fs=await import('node:fs');
   fs.writeFileSync(process.env.EXPORT_REVEAL_HTML,`<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fs.readFileSync(new URL('../public/styles.css',import.meta.url),'utf8')}</style><body><div class="site-wrap"><main class="app">${html}</main></div></body></html>`);
 }
 assert.ok(html.includes('ESTIMATED')&&html.includes('instantScore')&&html.includes('heatCanvas')&&html.includes('BULLSEYE!')&&html.includes('+10 XP secured'),`Puzzle ${i+1} gets its heatmap, score, and celebratory reward immediately`);
 document.querySelector('#nextRevealButton').listeners.click();
 await new Promise(r=>setTimeout(r,3));
}
assert.equal(answers.length,5);
assert.ok(html.includes('Great minds')&&html.includes('ESTIMATED HOTSPOT FIT · NOT OFFICIAL')&&html.includes('ESTIMATED RESULT'),'End-of-day result never mislabels model estimates as real player behavior');
console.log('✓ Five instant per-round reveals lead to honest official-vs-estimated daily result');
console.log('All V6 frontend state tests passed');
