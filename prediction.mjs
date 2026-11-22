// Editorial heatmap estimates. These are hypotheses about visual focal points,
// NOT measured player behavior. They are used only before real crowd qualifies.
import {gradeCrowdMatch} from './public/rewards.js';

import {DEFAULT_HOTSPOTS} from './public/prediction-defaults.js';
export {DEFAULT_HOTSPOTS};
export const PREDICTION_MODEL='editorial-v1';
const RADIUS=.11;
const SIGMA=.083;
const GRID_COLS=25,GRID_ROWS=17;
const gaussian=(x,y,p,s=SIGMA)=>Math.exp(-((x-p.x)**2+(y-p.y)**2)/(2*s*s));
export function normalizeHotspots(raw,scene='park'){
 const source=Array.isArray(raw)&&raw.length>=2?raw:DEFAULT_HOTSPOTS[scene]||DEFAULT_HOTSPOTS.park;
 if(!Array.isArray(source)||source.length<2||source.length>5)throw Error('Provide 2–5 predicted hotspot positions');
 const points=source.map((v,i)=>{
   const x=Array.isArray(v)?v[0]:v?.x,y=Array.isArray(v)?v[1]:v?.y,w=Array.isArray(v)?v[2]:v?.weight;
   if(![x,y,w].every(n=>typeof n==='number'&&Number.isFinite(n))||x<0||x>1||y<0||y>1||w<=0||w>10)throw Error('Predicted hotspot '+(i+1)+' must have x/y in 0–1 and weight in (0,10]');
   return {x,y,weight:w};
 });
 const sum=points.reduce((s,p)=>s+p.weight,0);
 return points.map(p=>({...p,weight:p.weight/sum}));
}
function densityAt(x,y,anchors){
 let v=0;
 for(const p of anchors)v+=p.weight*gaussian(x,y,p);
 // A small uniform prior avoids impossible zero-score areas.
 return v+.012;
}
const modelCache=new Map();
function generateModel(anchors){
 const cols=GRID_COLS,rows=GRID_ROWS;
 // Sample a fine fixed grid; weights normalized to sum to 1.
 const samples=[];let total=0;
 for(let j=0;j<60;j++)for(let i=0;i<88;i++){
   const x=(i+.5)/88,y=(j+.5)/60,w=densityAt(x,y,anchors);
   samples.push({x,y,w});total+=w;
 }
 return {samples,total,cols,rows};
}
export function predictedResult(puzzle,tap){
 const anchors=normalizeHotspots(puzzle.hotspots,puzzle.scene);
 const key=JSON.stringify(anchors);
 let cached=modelCache.get(key);
 if(!cached){
   const model=generateModel(anchors);
   const grid=Array(model.cols*model.rows).fill(0);
   for(const p of model.samples){
     grid[Math.min(model.rows-1,Math.floor(p.y*model.rows))*model.cols+Math.min(model.cols-1,Math.floor(p.x*model.cols))]+=p.w;
   }
   let peak=0;
   for(let yi=0;yi<=34;yi++)for(let xi=0;xi<=49;xi++){
     const x=xi/49,y=yi/34;let area=0;
     for(const p of model.samples)if(Math.hypot(p.x-x,p.y-y)<=RADIUS)area+=p.w;
     if(area>peak)peak=area;
   }
   const max=Math.max(...grid);
   const scaled=grid.map(v=>Math.round(v/max*1000));
   cached={model,peak,scaled};
   if(modelCache.size>150)modelCache.clear();
   modelCache.set(key,cached);
 }
 const {model,peak,scaled}=cached;
 let nearby=0;
 for(const p of model.samples)if(Math.hypot(p.x-tap.x,p.y-tap.y)<=RADIUS)nearby+=p.w;
 const factor=10000/model.total;
 const match=Math.round(nearby*factor),best=Math.max(match,Math.round(peak*factor));
 const grade=gradeCrowdMatch(match,10000,best);
 return {
   status:'predicted',source:'prediction',model:PREDICTION_MODEL,
   ...grade,hotspotScore:grade.alignment,heatmap:{cols:model.cols,rows:model.rows,values:scaled},
   predictionNote:'Illustrative estimate based on editor-chosen focal points, not real players.',
   yourTap:tap
 };
}
