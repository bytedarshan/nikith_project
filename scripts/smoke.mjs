import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const port=38725+Math.floor(Math.random()*1500);
const base=`http://127.0.0.1:${port}`;
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'same-spot-test-'));
const server=spawn(process.execPath,['server.mjs'],{cwd:path.resolve(import.meta.dirname,'..'),env:{...process.env,PORT:String(port),ADMIN_PASSWORD:'unit-test-secret-password',COOKIE_SECRET:'test-very-long-cryptographic-cookie-secret-123',DATA_DIR:tmp,MIN_CROWD:'2',MIN_RANKED:'3'},stdio:['ignore','pipe','pipe']});
let errlog='';server.stderr.on('data',x=>errlog+=x);
async function ready(){for(let i=0;i<60;i++){if(server.exitCode!==null)throw Error('Server crashed: '+errlog);try{const r=await fetch(base+'/api/config');if(r.ok)return}catch{}await new Promise(r=>setTimeout(r,90))}throw Error('Server never started: '+errlog)}
async function fetchApi(endpoint,{method='GET',body,jar}={}){
 const r=await fetch(base+endpoint,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(jar?.cookie?{cookie:jar.cookie}:{})},body:body?JSON.stringify(body):undefined});
 const cookie=r.headers.get('set-cookie');if(jar&&cookie){const first=cookie.split(';')[0];if(first.startsWith('ss_player='))jar.cookie=first;if(first.startsWith('ss_admin='))jar.admin=first}
 const contentType=r.headers.get('content-type')||'';
 const data=contentType.includes('json')?await r.json():await r.text();
 return {status:r.status,data,headers:r.headers};
}
const check=(cond,msg)=>{assert.ok(cond,msg);console.log('✓ '+msg)};
try{
 await ready();
 const a={cookie:''},b={cookie:''};
 let r=await fetchApi('/api/daily',{jar:a});check(r.status===200&&r.data.puzzles.length===5,'Daily game serves five scheduled puzzles');
 const date=r.data.date,ids=r.data.puzzles.map(p=>p.id);check(!!a.cookie,'Anonymous signed player session created');
 r=await fetchApi('/api/admin/data');check(r.status===401,'Admin is private without authentication');
 r=await fetchApi('/api/admin/login',{method:'POST',body:{password:'wrong'}});check(r.status===401,'Wrong admin password rejected');
 const login=await fetchApi('/api/admin/login',{method:'POST',body:{password:'unit-test-secret-password'}});check(login.status===200,'Admin login accepted');
 const adminCookie=login.headers.get('set-cookie').split(';')[0];
 const admin={cookie:adminCookie};
 r=await fetchApi('/api/admin/data',{jar:admin});check(r.status===200&&r.data.puzzles.length===70,'Admin sees scheduled 14-day puzzle backlog');
 for(const [i,puzzleId] of ids.entries()){
  r=await fetchApi('/api/answers',{method:'POST',body:{puzzleId,x:.45+i*.02,y:.52},jar:a});check(r.status===201&&r.data.roundResult?.status==='predicted'&&r.data.roundResult?.heatmap?.values?.length===425&&r.data.roundResult?.score>=0&&r.data.roundResult?.hotspotScore>=0&&r.data.earnedXp===(i+1)*10,`Player A puzzle ${i+1} returns instant labeled prediction, score, heatmap, and XP`);
 }
 r=await fetchApi('/api/answers',{method:'POST',body:{puzzleId:ids[0],x:.05,y:.05},jar:a});check(r.status===200&&r.data.alreadySubmitted&&r.data.earnedXp===50,'Answers are immutable; duplicate tap cannot farm XP');
 r=await fetchApi('/api/results',{jar:a});
 check(r.status===200&&r.data.totalScore===null&&r.data.puzzles.every(p=>p.source==='prediction'&&p.status==='predicted'),'Predicted per-round scores are available; official crowd score stays locked');
 check(!r.data.awards.some(a=>a.id==='pulse'||a.id==='magnet'),'Predicted Perfect Pulse never becomes an official earned crowd badge');
 r=await fetchApi('/api/round-result?puzzleId='+ids[0],{jar:a});
 check(r.status===200&&r.data.status==='predicted'&&r.data.score>=0,'Submitted player can revisit instant predicted reveal');
 r=await fetchApi('/api/round-result?puzzleId='+ids[0],{jar:{cookie:''}});
 check(r.status===403,'Unsubmitted anonymous session cannot peek at the heatmap');
 for(const [i,puzzleId] of ids.entries()){const response=await fetchApi('/api/answers',{method:'POST',body:{puzzleId,x:.45+i*.02,y:.52},jar:b});check(response.status===201&&response.data.roundResult.tier==='perfect'&&response.data.roundResult.score===100&&response.data.roundResult.source==='real',`Live match gives player B a real Perfect Pulse award, puzzle ${i+1}`)}
 r=await fetchApi('/api/results',{jar:a});check(r.status===200&&r.data.totalScore===100,'Two real players unlock actual 100% overlap');
 check(r.data.puzzles.every(p=>p.source==='real'&&p.heatmap.values.reduce((x,y)=>x+y,0)===2),'Aggregated heatmap counts are accurate');
 check(r.data.earnedXp===50&&r.data.progress.totalXp===50&&r.data.progress.level===1&&r.data.progress.streak===1,'Daily XP, level progress and streak use stored submissions');
 check(r.data.awards.some(a=>a.id==='pulse')&&r.data.awards.some(a=>a.id==='finisher')&&r.data.awards.some(a=>a.id==='magnet'),'Daily completion, perfect-match and three-in-sync awards are earned');
 check(r.data.ranking.status==='gathering'&&r.data.ranking.completedPlayers===2&&r.data.ranking.needed===3,'Daily percentile stays locked until enough real players complete five puzzles');
 r=await fetchApi('/api/invites',{method:'POST',body:{},jar:a});check(r.status===200&&!!r.data.code,'Completed player can create a challenge link');
 const code=r.data.code;r=await fetchApi('/api/invites/'+code,{jar:b});check(r.status===200&&r.data.ready&&r.data.matched===5,'Friend matches are computed from both real responses');
 // A third real completed player chooses distant points, making the two matching
 // players equal in ranking; ties must not count as opponents beaten.
 const c={cookie:''};await fetchApi('/api/daily',{jar:c});
 for(const puzzleId of ids){
   const submit=await fetchApi('/api/answers',{method:'POST',body:{puzzleId,x:0.01,y:0.01},jar:c});
   check(submit.status===201,'Independent player C submitted a real tap');
 }
 r=await fetchApi('/api/results',{jar:a});
 check(r.data.ranking.status==='provisional'&&r.data.ranking.beatPercent===50&&r.data.ranking.tiedWith===1&&r.data.ranking.completedPlayers===3,'Percentile equals strictly lower completed players, excluding tied opponents');
 const resultC=await fetchApi('/api/results',{jar:c});
 check(resultC.data.ranking.beatPercent===0,'Lower-ranked player is not given a fabricated percentile');
 r=await fetchApi('/api/admin/puzzles',{method:'POST',jar:admin,body:{date,slot:1,scene:'park',question:'Does this overwrite active answers?'}});check(r.status===409,'Submitted puzzle cannot be replaced');
 const dateFuture=new Date(Date.parse(date+'T00:00:00Z')+86400000*2).toISOString().slice(0,10);
 r=await fetchApi('/api/admin/puzzles',{method:'POST',jar:admin,body:{date:dateFuture,slot:1,scene:'island',question:'What would you choose on the island?',eyebrow:'NEW SCENE'}});check(r.status===201,'Admin can replace an unplayed future puzzle');
 r=await fetchApi('/api/admin/data',{jar:admin});check(r.data.puzzles.some(p=>p.date===dateFuture&&p.question.includes('island')&&p.hotspots.length>=2),'Admin update persisted with editable model focal points');
 r=await fetchApi('/api/admin/puzzles',{method:'POST',jar:admin,body:{date:dateFuture,slot:2,scene:'cafe',question:'Where would most people choose?',hotspots:[{x:.1,y:.1,weight:.7},{x:.9,y:.9,weight:.3}]}});
 check(r.status===201,'Admin saves custom predicted focal points for upcoming puzzles');
 r=await fetchApi('/api/admin/data',{jar:admin});
 check(r.data.puzzles.some(p=>p.date===dateFuture&&p.slot===2&&p.hotspots[0].x===.1),'Admin focal-point configuration roundtrips correctly');
 // Admin can duplicate a full scheduled day into a new future date.
 const cloneTo=new Date(Date.parse(date+'T00:00:00Z')+86400000*27).toISOString().slice(0,10);
 r=await fetchApi('/api/admin/duplicate-day',{method:'POST',jar:admin,body:{sourceDate:date,targetDate:cloneTo}});
 check(r.status===201&&r.data.count===5,'Admin creates an entirely new five-puzzle day in one click');
 r=await fetchApi('/api/admin/data',{jar:admin});
 check(r.data.days.find(x=>x.date===cloneTo)?.slots===5,'Newly created daily set is scheduled and listed');
 r=await fetchApi('/api/admin/duplicate-day',{method:'POST',jar:admin,body:{sourceDate:date,targetDate:cloneTo}});
 check(r.status===409,'Admin cannot silently overwrite another day');
 r=await fetchApi('/api/admin/puzzles',{method:'POST',jar:admin,body:{date:cloneTo,slot:3,scene:'park',question:'Can I save a hotspot with priority 8?',hotspots:[{x:.2,y:.3,weight:8},{x:.8,y:.7,weight:2}]}});
 check(r.status===201,'Editor accepts priority sliders 1–10 instead of rejecting save');
 r=await fetch(base+'/../../server.mjs');check(!((await r.text()).includes('ADMIN_PASSWORD=')),'Server source is not exposed by static route');
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/3y0AAAAASUVORK5CYII=','base64');
 r=await fetchApi('/api/admin/upload',{method:'POST',jar:admin,body:{dataUrl:'data:image/png;base64,'+png.toString('base64')}});check(r.status===201,'Admin uploads PNG without extra dependencies');
 r=await fetch(base+r.data.imageUrl);check(r.status===200&&r.headers.get('content-type')==='image/png','Uploaded image can be served securely');
 console.log(`\nAll SAME SPOT backend smoke checks passed. Temporary DB: ${tmp}`);
}catch(e){console.error('\nSMOKE TEST FAILURE',e,errlog);process.exitCode=1}finally{server.kill('SIGTERM');fs.rmSync(tmp,{recursive:true,force:true})}
