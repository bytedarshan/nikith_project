import './load-env.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {newStore,getDateInTimezone,plusDays} from './seed.mjs';
import {gradeCrowdMatch,dailyAwards,XP_PER_TAP} from './public/rewards.js';
import {calculateStreak} from './streaks.mjs';
import {predictedResult,normalizeHotspots} from './prediction.mjs';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const WEB=path.join(ROOT,'public');
const IS_SERVERLESS=Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DEFAULT_DATA_DIR=IS_SERVERLESS ? path.join(os.tmpdir(),'same-spot-data') : path.join(ROOT,'data');
const DATA=path.resolve(process.env.DATA_DIR || DEFAULT_DATA_DIR);
const PORT=Number(process.env.PORT||3000);
const TZ=process.env.GAME_TIMEZONE||'Asia/Kolkata';
const MIN_CROWD=Math.max(2,Number(process.env.MIN_CROWD||5));
const MIN_RANKED=Math.max(3,Number(process.env.MIN_RANKED||50));
const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||'';
const COOKIE_SECRET=process.env.COOKIE_SECRET||crypto.randomBytes(32).toString('hex');
const SECURE_COOKIE=process.env.COOKIE_SECURE==='1' || process.env.NODE_ENV==='production' || IS_SERVERLESS;
const ADMIN_TTL=12*60*60*1000;
const DIST=0.11;
const MAX_BODY=5_200_000;

try { fs.mkdirSync(DATA,{recursive:true}); } catch (e) { console.warn('Could not create data dir:', e.message); }
try { fs.mkdirSync(path.join(DATA,'uploads'),{recursive:true}); } catch (e) { console.warn('Could not create uploads dir:', e.message); }
const STORE_FILE=path.join(DATA,'store.json');
const BUNDLED_STORE=path.join(ROOT,'data','store.json');

let db;
try{ db=JSON.parse(fs.readFileSync(STORE_FILE,'utf8')); }
catch {
  try { db=JSON.parse(fs.readFileSync(BUNDLED_STORE,'utf8')); }
  catch { db=newStore(getDateInTimezone(TZ)); }
  save();
}

function save(){
  try {
    fs.mkdirSync(path.dirname(STORE_FILE),{recursive:true});
    const tempfile=STORE_FILE+'.'+process.pid+'.'+Date.now()+'.tmp';
    fs.writeFileSync(tempfile,JSON.stringify(db,null,2));
    fs.renameSync(tempfile,STORE_FILE);
  } catch (err) {
    console.error('Warning: could not save store:', err.message);
  }
}
const today=()=>getDateInTimezone(TZ);
const json=(res,code,data,extras={})=>send(res,code,JSON.stringify(data),{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extras});
function send(res,code,body,headers={}){
  res.writeHead(code,{'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY',...headers});res.end(body);
}
function cookieParse(req){return Object.fromEntries((req.headers.cookie||'').split(';').map(x=>x.trim().split('=')).filter(x=>x.length>=2));}
function sign(value){return crypto.createHmac('sha256',COOKIE_SECRET).update(value).digest('base64url')}
function verify(value){if(!value||!value.includes('.')) return null;const i=value.lastIndexOf('.'),raw=value.slice(0,i),mac=value.slice(i+1),expected=sign(raw);const a=Buffer.from(mac),b=Buffer.from(expected);return a.length===b.length&&crypto.timingSafeEqual(a,b)?raw:null}
function cstr(name,value,maxAge=3600*24*365){return `${name}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${SECURE_COOKIE?'; Secure':''}`}
function ensurePlayer(req,res){
  const val=cookieParse(req).ss_player;const raw=verify(val);
  let player=raw?db.players.find(p=>p.id===raw):null;
  if(!player){player={id:crypto.randomUUID(),createdAt:new Date().toISOString()};db.players.push(player);save();res.setHeader('Set-Cookie',cstr('ss_player',`${player.id}.${sign(player.id)}`));}
  return player;
}
function authorized(req){const v=verify(cookieParse(req).ss_admin);if(!v)return false;const [t]=v.split(':');return Number(t)>Date.now()&&v.endsWith(':admin')}
function needAdmin(req,res){if(!authorized(req)){json(res,401,{error:'Admin login required'});return false;}return true}
function safeOrigin(req){
  const origin=req.headers.origin;if(!origin)return true;
  try{
    const parsed=new URL(origin);
    const allowed=[req.headers.host, req.headers['x-forwarded-host']].filter(Boolean);
    return allowed.some(h => parsed.host === h || parsed.hostname === h.split(':')[0]) && (parsed.protocol==='https:'||parsed.protocol==='http:');
  }catch{return false}
}
function body(req){
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object' && !Array.isArray(req.body)) return Promise.resolve(req.body);
    if (typeof req.body === 'string') {
      try {
        const obj = JSON.parse(req.body);
        if (!obj || Array.isArray(obj) || typeof obj !== 'object') throw Error();
        return Promise.resolve(obj);
      } catch {
        return Promise.reject(Object.assign(new Error('Invalid JSON'),{status:400}));
      }
    }
  }
  return new Promise((resolve,reject)=>{
    let size=0,buffs=[];
    req.on('data',chunk=>{size+=chunk.length;if(size>MAX_BODY){reject(Object.assign(new Error('Request too large'),{status:413}));req.destroy();}else buffs.push(chunk)});
    req.on('end',()=>{try{const obj=JSON.parse(Buffer.concat(buffs).toString('utf8'));if(!obj||Array.isArray(obj)||typeof obj!=='object')throw Error();resolve(obj)}catch{reject(Object.assign(new Error('Invalid JSON'),{status:400}))}});
    req.on('error',reject);
  });
}
function httpError(code,msg){return Object.assign(new Error(msg),{status:code})}
function tlog(player,type,date,extra={}){
  db.events.push({id:crypto.randomUUID(),playerId:player.id,type,date,at:new Date().toISOString(),...extra});
  if(db.events.length>120000) db.events.splice(0,10000);
}
const setsOn=date=>db.sets.find(s=>s.date===date);
function getSet(date){const s=setsOn(date);return s? s.puzzleIds.map(id=>db.puzzles.find(p=>p.id===id)).filter(Boolean):[];}
function publicPuzzle(p){return {id:p.id,question:p.question,eyebrow:p.eyebrow||'THE DAILY EXPERIMENT',scene:p.scene,variant:p.variant||0,imageUrl:p.imageUrl||null,slot:p.slot}}
function hasCompleted(player,date){const ids=new Set(getSet(date).map(p=>p.id));return ids.size===5&&db.taps.filter(t=>t.playerId===player.id&&ids.has(t.puzzleId)).length===5}
const round=n=>Math.round(n*10)/10;
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function heatGrid(others){const rows=17,cols=25;const grid=Array.from({length:rows},()=>Array(cols).fill(0));for(const t of others){let x=Math.min(cols-1,Math.floor(t.x*cols)),y=Math.min(rows-1,Math.floor(t.y*rows));grid[y][x]++;}return {cols,rows,values:grid.flat()}}
// Sample a fixed 21×21 lattice to estimate the peak hotspot. This costs O(441 × N)
// rather than O(N²) and keeps a perfect award achievable even if most people disagree.
function peakNearbyCount(points){
  let maximum=0;
  for(let yi=0;yi<=20;yi++)for(let xi=0;xi<=20;xi++){
    const x=xi/20,y=yi/20;let count=0;
    for(const p of points)if(Math.hypot(x-p.x,y-p.y)<=DIST)count++;
    if(count>maximum)maximum=count;
  }
  return maximum;
}
function crowdFeedback(p,player,date){
  const all=db.taps.filter(t=>t.puzzleId===p.id&&t.date===date);
  const own=all.find(t=>t.playerId===player.id);
  if(!own)return {status:'not-played'};
  if(all.length<MIN_CROWD)return {status:'gathering',playerCount:all.length,needed:MIN_CROWD,xp:XP_PER_TAP};
  const others=all.filter(t=>t.playerId!==player.id);
  const nearby=others.filter(t=>distance(t,own)<=DIST).length;
  const peak=Math.max(nearby,peakNearbyCount(others));
  return {status:date<today()?'final':'provisional',source:'real',playerCount:all.length,nearby,
    ...gradeCrowdMatch(nearby,others.length,peak),xp:XP_PER_TAP};
}
function resultForPuzzle(p,player,date){
 const feedback=crowdFeedback(p,player,date);
 if(feedback.status==='not-played')return {puzzleId:p.id,...feedback};
 const all=db.taps.filter(t=>t.puzzleId===p.id&&t.date===date);
 const own=all.find(t=>t.playerId===player.id);
 const yourTap={x:own.x,y:own.y};
 if(feedback.status==='gathering')return {puzzleId:p.id,...predictedResult(p,yourTap),playerCount:all.length,needed:MIN_CROWD,xp:XP_PER_TAP};
 return {puzzleId:p.id,...feedback,hotspotScore:feedback.alignment,heatmap:heatGrid(all),yourTap};
}

// Daily percentile compares complete five-puzzle participants against the same
// real snapshot of responses. Ties are not counted as beaten.
// No ranking is exposed until enough genuine completed players exist.
function playerRanking(player,date){
 const puzzleIds=getSet(date).map(p=>p.id);
 if(puzzleIds.length!==5||!hasCompleted(player,date))return {status:'unavailable'};
 const ids=new Set(puzzleIds);
 const dailyTaps=db.taps.filter(t=>t.date===date&&ids.has(t.puzzleId));
 const byPlayer=new Map(),byPuzzle=new Map(puzzleIds.map(id=>[id,[]]));
 for(const t of dailyTaps){
   if(!byPlayer.has(t.playerId))byPlayer.set(t.playerId,new Map());
   byPlayer.get(t.playerId).set(t.puzzleId,t);
   byPuzzle.get(t.puzzleId).push(t);
 }
 const completed=[...byPlayer.entries()].filter(([_,answers])=>answers.size===5);
 const count=completed.length;
 if(count<MIN_RANKED)return {status:'gathering',completedPlayers:count,needed:MIN_RANKED};
 const scores=[];
 for(const [playerId,answers] of completed){
   let sum=0;
   for(const puzzleId of puzzleIds){
     const selected=answers.get(puzzleId),taps=byPuzzle.get(puzzleId);
     let nearby=0;
     for(const t of taps)if(t.playerId!==playerId&&distance(t,selected)<=DIST)nearby++;
     sum+=taps.length>1 ? nearby/(taps.length-1)*100:0;
   }
   scores.push({playerId,score:sum/5});
 }
 const myScore=scores.find(x=>x.playerId===player.id)?.score;
 if(myScore===undefined)return {status:'unavailable'};
 let below=0,equal=0,above=0;
 for(const row of scores){
   if(row.playerId===player.id)continue;
   if(row.score<myScore-1e-8)below++;
   else if(row.score>myScore+1e-8)above++;
   else equal++;
 }
 return {
   status:date<today()?'final':'provisional',
   beatPercent:Math.floor(100*below/(count-1)),
   completedPlayers:count,comparedWith:count-1,tiedWith:equal,rank:above+1,
   topTenPercent:below/(count-1)>=0.90
 };
}

function playerProgress(player,date){
  const ownTaps=db.taps.filter(t=>t.playerId===player.id);
  const completeDates=[];
  const dates=new Set(ownTaps.map(t=>t.date));
  for(const d of dates)if(d<=today()&&hasCompleted(player,d))completeDates.push(d);
  // Always compute current progress at today's game clock. Old results may be
  // inspected, but should not cause the streak to travel backward in time.
  const streak=calculateStreak(completeDates,today());
  const dailyTapCount=ownTaps.filter(t=>t.date===date).length;
  const totalXp=ownTaps.length*XP_PER_TAP+streak.bonusXp;
  return {totalXp,dailyXp:dailyTapCount*XP_PER_TAP+ (date===today()?streak.todayBonusXp:0),
    level:Math.floor(totalXp/250)+1,xpIntoLevel:totalXp%250,xpPerLevel:250,
    ...streak};
}
function validDate(x){return typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x+'T00:00:00Z'))}
function adminData(){
  const ds=Array.from(new Set([...db.sets.map(x=>x.date),...db.puzzles.map(x=>x.date)])).sort();
  return {timezone:TZ, today:today(), minCrowd:MIN_CROWD,
    days:ds.map(date=>{const set=setsOn(date),ids=getSet(date).map(p=>p.id);const taps=db.taps.filter(t=>t.date===date);const players=new Set(taps.map(t=>t.playerId));const completed=[...players].filter(id=>ids.length===5&&taps.filter(t=>t.playerId===id&&ids.includes(t.puzzleId)).length===5).length;
     return {date,scheduled:!!set,slots:getSet(date).length,players:players.size,submissions:taps.length,completed}}),
    puzzles:db.puzzles.map(p=>({...publicPuzzle(p),hotspots:p.hotspots||normalizeHotspots(null,p.scene),date:p.date,createdAt:p.createdAt,updatedAt:p.updatedAt})).sort((a,b)=>a.date.localeCompare(b.date)||a.slot-b.slot)};
}
function boolHasSubmission(puzzleId){return db.taps.some(t=>t.puzzleId===puzzleId)}
function staticFile(req,res,url){
  let pathname=decodeURIComponent(url.pathname);
  if(pathname==='/') pathname='/index.html';
  if(pathname==='/admin')pathname='/admin.html';
  if(pathname.startsWith('/uploads/')) {
    const filename=pathname.slice('/uploads/'.length);
    if(!/^[a-f0-9-]+\.(png|webp|jpg)$/.test(filename))return send(res,404,'Not found');
    const file=path.join(DATA,'uploads',filename);
    if(fs.existsSync(file)) return fileResponse(res,file);
    const fallbackFile=path.join(ROOT,'data','uploads',filename);
    return fileResponse(res,fallbackFile);
  }
  const file=path.resolve(WEB,'.'+pathname);
  if(!(file===WEB||file.startsWith(WEB+path.sep)))return send(res,403,'Forbidden');
  fileResponse(res,file);
}
function fileResponse(res,file){
  let stat;try{stat=fs.statSync(file)}catch{return send(res,404,'Not found')}
  if(!stat.isFile())return send(res,404,'Not found');
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json'};
  const headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':/\.(html|js|css)$/.test(file)?'no-store':'public, max-age=120','Content-Security-Policy':"default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"};
  res.writeHead(200,{'X-Content-Type-Options':'nosniff',...headers});fs.createReadStream(file).pipe(res);
}
function getClientIp(req){
  const forwarded=req.headers['x-forwarded-for'];
  if(typeof forwarded==='string'){
    const ip=forwarded.split(',')[0].trim();
    if(ip) return ip;
  }
  return req.socket?.remoteAddress||'unknown';
}
function ipLimiter(){
  const hit=new Map();
  return function(req){
    const ip=getClientIp(req),now=Date.now(),period=60_000;
    let v=hit.get(ip);
    if(!v||now-v.start>period){v={start:now,count:0};hit.set(ip,v)}
    v.count++;
    if(hit.size>3000){for(const [key,h] of hit)if(now-h.start>period)hit.delete(key)}
    return v.count<=150;
  };
}
const allowIP=ipLimiter();
const failedAdminLogins=new Map();
async function api(req,res,url){
 const method=req.method;const route=url.pathname;
 if(!allowIP(req))throw httpError(429,'Too many requests; try again shortly');
 if(['POST','PUT','PATCH','DELETE'].includes(method)&&!safeOrigin(req))throw httpError(403,'Origin does not match');
 if(method==='GET'&&route==='/api/config')return json(res,200,{today:today(),timezone:TZ,minimumPlayers:MIN_CROWD,minimumRanked:MIN_RANKED});
 if(method==='GET'&&route==='/api/daily'){
   const p=ensurePlayer(req,res),date=today(),set=getSet(date),submissions=db.taps.filter(t=>t.playerId===p.id&&t.date===date);
   if(set.length!==5)return json(res,200,{date,timeZone:TZ,puzzles:[],answers:[],completed:false,daysAvailable:false});
   if(!db.events.some(e=>e.playerId===p.id&&e.type==='game_open'&&e.date===date)){tlog(p,'game_open',date);save()}
   return json(res,200,{date,timeZone:TZ,puzzles:set.map(publicPuzzle),answers:submissions.map(s=>({puzzleId:s.puzzleId,x:s.x,y:s.y})),completed:hasCompleted(p,date),daysAvailable:true,progress:playerProgress(p,date)});
 }
 if(method==='POST'&&route==='/api/answers'){
   const p=ensurePlayer(req,res),payload=await body(req),date=today(),set=getSet(date);
   if(typeof payload.puzzleId!=='string'||!set.some(s=>s.id===payload.puzzleId))throw httpError(400,'Puzzle is not part of today’s set');
   if(typeof payload.x!=='number'||typeof payload.y!=='number'||!Number.isFinite(payload.x)||!Number.isFinite(payload.y)||payload.x<0||payload.x>1||payload.y<0||payload.y>1)throw httpError(400,'Invalid tap coordinates');
   const prior=db.taps.find(t=>t.playerId===p.id&&t.puzzleId===payload.puzzleId);
   if(prior) return json(res,200,{ok:true,alreadySubmitted:true,tap:{x:prior.x,y:prior.y},roundResult:resultForPuzzle(set.find(s=>s.id===payload.puzzleId),p,date),earnedXp:playerProgress(p,date).dailyXp,progress:playerProgress(p,date)});
   const tap={id:crypto.randomUUID(),date,puzzleId:payload.puzzleId,playerId:p.id,x:round(payload.x*10000)/10000,y:round(payload.y*10000)/10000,createdAt:new Date().toISOString()};
   db.taps.push(tap);tlog(p,'answer_submitted',date,{puzzleId:payload.puzzleId});
   if(hasCompleted(p,date))tlog(p,'game_completed',date);
   save();return json(res,201,{ok:true,alreadySubmitted:false,tap:{x:tap.x,y:tap.y},completed:hasCompleted(p,date),roundResult:resultForPuzzle(set.find(s=>s.id===payload.puzzleId),p,date),earnedXp:playerProgress(p,date).dailyXp,progress:playerProgress(p,date)});
 }
 if(method==='GET'&&route==='/api/round-result'){
   const p=ensurePlayer(req,res),date=today(),puzzleId=url.searchParams.get('puzzleId');
   const puz=getSet(date).find(x=>x.id===puzzleId);
   if(!puz)throw httpError(404,'Unknown puzzle for today');
   if(!db.taps.some(t=>t.puzzleId===puzzleId&&t.playerId===p.id))throw httpError(403,'Tap first to unlock this reveal');
   return json(res,200,resultForPuzzle(puz,p,date));
 }
 if(method==='GET'&&route==='/api/results'){
   const p=ensurePlayer(req,res),date=url.searchParams.get('date')||today();
   if(!validDate(date)||date>today())throw httpError(400,'Invalid results date');
   const set=getSet(date);
   if(!hasCompleted(p,date))return json(res,403,{error:'Complete all five puzzles first'});
   const puzzles=set.map(puz=>resultForPuzzle(puz,p,date));
   const scores=puzzles.filter(p=>p.source==='real').map(p=>p.score).filter(n=>typeof n==='number');
   const ranking=playerRanking(p,date),progress=playerProgress(p,date);
   const awards=[...dailyAwards(puzzles.map(p=>p.source==='real'?p:{...p,tier:null}),true),...(progress.streak>=3?[{id:'streak',symbol:'🔥',name:'On a Roll',detail:progress.streak+'-day completion streak'}]:[])];
   if(progress.latestMilestone)awards.push({id:'streak-milestone',symbol:progress.latestMilestone.symbol,name:progress.latestMilestone.name,detail:`${progress.latestMilestone.days} days · +${progress.latestMilestone.xp} XP bonus`});
   if(ranking.status==='final'&&ranking.topTenPercent)awards.push({id:'top10',symbol:'🌟',name:'Crowd Whisperer',detail:'Beat at least 90% of completed players'});
   return json(res,200,{date,minimumPlayers:MIN_CROWD,minimumRanked:MIN_RANKED,final:date<today(),totalScore:scores.length===5?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):null,
     ranking,earnedXp:progress.dailyXp,progress,awards,puzzles});
 }
 if(method==='POST'&&route==='/api/invites'){
   const p=ensurePlayer(req,res),date=today();
   if(!hasCompleted(p,date))throw httpError(403,'Complete today’s game before creating a challenge');
   let existing=db.invites.find(x=>x.ownerId===p.id&&x.date===date);
   if(!existing){existing={code:crypto.randomBytes(6).toString('base64url'),date,ownerId:p.id,createdAt:new Date().toISOString()};db.invites.push(existing)}
   tlog(p,'share_clicked',date);save();return json(res,200,{code:existing.code,date});
 }
 if(method==='GET'&&route.startsWith('/api/invites/')){
   const p=ensurePlayer(req,res),code=route.slice('/api/invites/'.length);
   if(!/^[\w-]{6,32}$/.test(code))throw httpError(400,'Invalid challenge code');
   const inv=db.invites.find(i=>i.code===code);
   if(!inv)return json(res,404,{error:'Challenge not found'});
   if(!hasCompleted(p,inv.date)||!hasCompleted({id:inv.ownerId},inv.date))return json(res,200,{date:inv.date,ready:false,self:p.id===inv.ownerId,reason:inv.date!==today()?'Challenge expired or incomplete':'Finish today’s game to compare'});
   const ids=getSet(inv.date).map(x=>x.id);
   const rounds=ids.map(id=>{const a=db.taps.find(x=>x.playerId===p.id&&x.puzzleId===id),b=db.taps.find(x=>x.playerId===inv.ownerId&&x.puzzleId===id);return {puzzleId:id,match:distance(a,b)<=DIST,distance:Math.round(distance(a,b)*100)}});
   return json(res,200,{date:inv.date,ready:true,self:p.id===inv.ownerId,matched:rounds.filter(x=>x.match).length,total:rounds.length,rounds});
 }
 if(method==='POST'&&route==='/api/admin/login'){
   if(!ADMIN_PASSWORD)throw httpError(503,'Set ADMIN_PASSWORD to enable the admin dashboard');
   const ip=getClientIp(req),now=Date.now();
   let fail=failedAdminLogins.get(ip)||{start:now,count:0};
   if(now-fail.start>15*60*1000)fail={start:now,count:0};
   if(fail.count>=8)throw httpError(429,'Too many failed logins. Try again later');
   const payload=await body(req),got=Buffer.from(typeof payload.password==='string'?payload.password:''),expected=Buffer.from(ADMIN_PASSWORD);
   const okay=got.length===expected.length&&crypto.timingSafeEqual(got,expected);
   if(!okay){fail.count++;failedAdminLogins.set(ip,fail);throw httpError(401,'Incorrect password')}
   failedAdminLogins.delete(ip);
   const raw=`${Date.now()+ADMIN_TTL}:admin`,signature=sign(raw);
   return json(res,200,{ok:true},{'Set-Cookie':cstr('ss_admin',`${raw}.${signature}`,ADMIN_TTL/1000)});
 }
 if(method==='POST'&&route==='/api/admin/logout')return json(res,200,{ok:true},{'Set-Cookie':cstr('ss_admin','',0)});
 if(route.startsWith('/api/admin/')) {
   if(!needAdmin(req,res))return;
   if(method==='GET'&&route==='/api/admin/data')return json(res,200,adminData());
   if(method==='POST'&&route==='/api/admin/duplicate-day'){
     const input=await body(req);
     if(!validDate(input.sourceDate)||!validDate(input.targetDate)||input.targetDate<today()||input.sourceDate===input.targetDate)throw httpError(400,'Choose a valid future destination date different from the source');
     const source=getSet(input.sourceDate);
     if(source.length!==5)throw httpError(400,'Source day needs five published puzzles to duplicate');
     if(setsOn(input.targetDate)||db.puzzles.some(p=>p.date===input.targetDate))throw httpError(409,'Destination already has puzzles. Choose a new date or edit its slots.');
     const now=new Date().toISOString();
     const copies=source.map(p=>({...p,id:crypto.randomUUID(),date:input.targetDate,hotspots:p.hotspots?structuredClone(p.hotspots):normalizeHotspots(null,p.scene),createdAt:now,updatedAt:now}));
     db.puzzles.push(...copies);
     db.sets.push({date:input.targetDate,puzzleIds:copies.map(p=>p.id),status:'scheduled'});
     save();return json(res,201,{ok:true,date:input.targetDate,count:copies.length});
   }
   if(method==='POST'&&route==='/api/admin/puzzles'){
     const input=await body(req);
     if(!validDate(input.date)||input.date<today())throw httpError(400,'Date must be today or in the future');
     if(!Number.isInteger(input.slot)||input.slot<1||input.slot>5)throw httpError(400,'Slot must be 1 to 5');
     if(typeof input.question!=='string'||input.question.trim().length<8||input.question.trim().length>170)throw httpError(400,'Question must contain 8–170 characters');
     if(input.imageUrl&&!/^\/uploads\/[a-f0-9-]+\.(png|webp|jpg)$/.test(input.imageUrl))throw httpError(400,'Invalid uploaded image path');
     const scenes=['park','cafe','island','gallery','plaza','patterns','station','garden'];
     if(!input.imageUrl&&!scenes.includes(input.scene))throw httpError(400,'Select a scene or upload an image');
     if(input.imageUrl&&(!Array.isArray(input.hotspots)||input.hotspots.length<2))throw httpError(400,'Click at least two estimated crowd focal points on uploaded artwork before scheduling');
     let hotspots;try{hotspots=normalizeHotspots(input.hotspots,input.scene)}catch(e){throw httpError(400,e.message)}
     const current=getSet(input.date).find(p=>p.slot===input.slot);
     if(current&&boolHasSubmission(current.id))throw httpError(409,'This puzzle already has player answers and cannot be overwritten');
     const id=crypto.randomUUID(),puzzle={id,date:input.date,slot:input.slot,question:input.question.trim(),eyebrow:String(input.eyebrow||'THE DAILY EXPERIMENT').slice(0,60),
       scene:scenes.includes(input.scene)?input.scene:'park',variant:Number.isInteger(input.variant)?Math.abs(input.variant%20):0,
       imageUrl:input.imageUrl||null,hotspots,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
     db.puzzles.push(puzzle);let set=setsOn(input.date);
     if(!set){set={date:input.date,puzzleIds:[],status:'draft'};db.sets.push(set)}
     if(current){set.puzzleIds=set.puzzleIds.filter(x=>x!==current.id);db.puzzles=db.puzzles.filter(x=>x.id!==current.id)}
     set.puzzleIds.push(id);set.puzzleIds.sort((a,b)=>db.puzzles.find(p=>p.id===a).slot-db.puzzles.find(p=>p.id===b).slot);
     set.status=set.puzzleIds.length===5?'scheduled':'draft';save();return json(res,201,{ok:true,puzzle:publicPuzzle(puzzle),status:set.status});
   }
   if(method==='POST'&&route==='/api/admin/upload'){
     const input=await body(req);const match=typeof input.dataUrl==='string'&&input.dataUrl.match(/^data:(image\/(png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
     if(!match)throw httpError(400,'Use a PNG, JPG or WebP file');
     const buff=Buffer.from(match[3],'base64');if(buff.length>3_000_000||buff.length<32)throw httpError(400,'Image must be smaller than 3 MB');
     const mime=match[2];let okay=false;
     if(mime==='png')okay=buff.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
     if(mime==='jpeg')okay=buff[0]===0xff&&buff[1]===0xd8&&buff[2]===0xff;
     if(mime==='webp')okay=buff.toString('ascii',0,4)==='RIFF'&&buff.toString('ascii',8,12)==='WEBP';
     if(!okay)throw httpError(400,'Invalid image file');
     const ext=mime==='jpeg'?'jpg':mime,filename=crypto.randomUUID()+'.'+ext;
     try {
       fs.mkdirSync(path.join(DATA,'uploads'),{recursive:true});
       fs.writeFileSync(path.join(DATA,'uploads',filename),buff,{flag:'wx'});
     } catch (err) {
       console.error('Failed to save uploaded file:', err.message);
       throw httpError(500, 'Failed to save uploaded image');
     }
     return json(res,201,{ok:true,imageUrl:'/uploads/'+filename});
   }
   return json(res,404,{error:'Unknown admin endpoint'});
 }
 return json(res,404,{error:'Not found'});
}
export async function requestListener(req,res){
 try{
   let reqUrl = req.url || '/';
   if (reqUrl === '/api/index.js' || reqUrl === '/api') {
     if (req.query?.path) {
       const segments = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path;
       reqUrl = '/api/' + segments;
     }
   }
   const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
   const proto = req.headers['x-forwarded-proto'] || 'http';
   const url=new URL(reqUrl,`${proto}://${host}`);
   if(url.pathname.startsWith('/api/'))return await api(req,res,url);
   if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,'Method not allowed');
   return staticFile(req,res,url);
 }catch(e){if(!res.headersSent){const status=e.status||500;json(res,status,{error:status===500?'Unexpected server error':e.message});}if(e.status!==400&&e.status!==401&&e.status!==403&&e.status!==404)console.error(e)}
}

const server=http.createServer(requestListener);

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if(isDirectRun){
 server.listen(PORT,()=>{
  console.log(`\n  SAME SPOT is running → http://localhost:${PORT}`);
  console.log(`  Admin dashboard       → http://localhost:${PORT}/admin`);
  console.log(`  Daily reset timezone  → ${TZ}`);
  console.log(`  Real crowd threshold  → ${MIN_CROWD} people per puzzle`);
  if(!ADMIN_PASSWORD)console.warn('  ⚠  Set ADMIN_PASSWORD to unlock the admin dashboard');
  if(!process.env.COOKIE_SECRET)console.warn('  ⚠  Set COOKIE_SECRET for persistent sessions across restarts');
 });
}

export { server };
export default requestListener;
