import {createArtMarkup,sceneMarkup} from './scenes.js';
import {gradeCrowdMatch,REWARD_LEVELS,XP_PER_TAP,dailyAwards} from './rewards.js';
const app=document.querySelector('#app');
const todayLabel=document.querySelector('#todayLabel');
const toastEl=document.querySelector('#toast');
const qs=new URLSearchParams(location.search);
const invitation=qs.get('invite')||'';
const state={data:null,view:'welcome',round:0,selection:null,locked:false,practice:false,feedback:null,tab:0,results:null,match:null,invite:invitation,submitting:false,roundResult:null};
const DEMO={id:'demo',scene:'plaza',variant:0,question:'You lost your friends in this square. Where would everyone meet?',eyebrow:'ONE-MINUTE PRACTICE',slot:1};
const fmtDate=s=>new Date(s+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ui=(html)=>{app.innerHTML=html};
async function request(url,opts={}){
 const response=await fetch(url,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(opts.headers||{})},...opts});
 let data;try{data=await response.json()}catch{throw Error('Server response was not valid JSON')}
 if(!response.ok)throw Error(data.error||`Request failed (${response.status})`);
 return data;
}
let refreshTimer=null;
function stopRefresh(){if(refreshTimer&&window.clearInterval){window.clearInterval(refreshTimer);refreshTimer=null}}
function refreshRoundWhenReady(puzzleId){
 stopRefresh();if(!window.setInterval)return;
 refreshTimer=window.setInterval(async()=>{
   if(state.view!=='round-reveal'){stopRefresh();return}
   try{
     const fresh=await request('/api/round-result?puzzleId='+encodeURIComponent(puzzleId));
     if(fresh.source==='real'&&state.roundResult?.source==='prediction'){
       state.roundResult=fresh;toast('✨ Real crowd unlocked! Your result just updated.');renderRoundReveal();
     }
   }catch{}
 },25000);
}
function refreshDailyWhenReady(){
 stopRefresh();if(!window.setInterval)return;
 refreshTimer=window.setInterval(async()=>{
   if(state.view!=='results'){stopRefresh();return}
   try{
     const fresh=await request('/api/results');
     const before=JSON.stringify([state.results?.puzzles.map(p=>[p.status,p.score,p.playerCount]),state.results?.ranking]);
     const after=JSON.stringify([fresh.puzzles.map(p=>[p.status,p.score,p.playerCount]),fresh.ranking]);
     if(before!==after){state.results=fresh;renderResults()}
   }catch{}
 },25000);
}
let toastTimer;
function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastEl.classList.remove('show'),3000)}
function stage(puzzle,{interactive=true,marker=null,heatmap=null,locked=false}={}){
 return `<div class="game-frame ${interactive?'interactive':''}" id="puzzleFrame" role="group" aria-label="Illustrated puzzle. ${interactive?'Click or tap where you think others would choose.':''}">
   <div class="art-surface">${createArtMarkup(puzzle)}</div>
   ${heatmap?'<canvas class="heatmap" id="heatCanvas" aria-label="Crowd distribution heatmap"></canvas>':''}
   ${marker?`<div class="tap-marker ${locked?'mine':''}" style="left:${marker.x*100}%;top:${marker.y*100}%"><span class="marker-ring"></span></div>`:''}
   ${interactive?'<button type="button" class="tap-surface" id="tapSurface" aria-label="Choose a location. Use arrow keys to move your marker, then lock in below."></button>':''}
   ${interactive&&!marker?'<div class="tap-hint" aria-hidden="true">✳ TAP ANYWHERE ON THE IMAGE</div>':''}
 </div>`;
}
function streakMarkup(progress,{compact=false}={}){
 if(!progress)return '';
 const count=progress.streak||0,shields=progress.shields||0;
 const byStatus={
  secured:count>1?'Nice work! Your streak is safe today.':'First day secured. Come back tomorrow!',
  'at-risk':`Complete all five puzzles today to keep your ${count}-day streak.`,
  'shield-ready':`You missed one day. Finish today to use your shield and save your streak.`,
  restart:'A fresh streak starts with today’s five puzzles.',
  new:'Complete all five puzzles to start a streak.'
 };
 const message=byStatus[progress.status]||byStatus.new;
 const next=progress.nextShieldAt||7;
 const streakDays=count%7;
 const ticks=Array.from({length:7},(_,i)=>`<span class="streak-tick ${i<streakDays?'filled':''}" aria-hidden="true"></span>`).join('');
 const mark=progress.latestMilestone;
 return `<section class="streak-card ${progress.status==='secured'?'streak-secured':''} ${compact?'streak-compact':''}" aria-label="Daily completion streak">
   <div class="streak-header"><span class="streak-flame" aria-hidden="true">🔥</span>
   <div class="streak-heading"><strong>${count}-day streak</strong><small>${esc(message)}</small></div>
   <div class="streak-shield" title="A shield lets you miss exactly one day and continue after your next completed game">🛡️ ${shields}/1</div></div>
   <div class="streak-meter" role="img" aria-label="${progress.daysToNextShield||7} completed days until next streak shield">${ticks}</div>
   <div class="streak-foot"><span>🏅 Best: ${progress.longest||0} days</span><span>${progress.daysToNextShield||7} more to your next shield</span></div>
   ${progress.shieldUsedToday?'<div class="streak-notice">🛡️ Shield used! Your streak survived a missed day.</div>':''}
   ${mark?`<div class="streak-milestone" role="status">${mark.symbol} <strong>${esc(mark.name)} unlocked!</strong> ${mark.days} days · +${mark.xp} bonus XP${mark.days%7===0?' · Shield earned':''}</div>`:''}
 </section>`;
}
function renderWelcome(){
 stopRefresh();state.view='welcome';state.practice=false;const d=state.data;
 const answered=d?.answers?.length||0;
 const btn=answered?`Continue round ${answered+1} →`:'Find your spot →';
 ui(`<section class="hero">
   <div class="hero-text">
     <div class="eyebrow">5 pictures. 1 shared brainwave.</div>
     <h1>Think like<br/><em>everyone</em><br/>else.</h1>
     <p class="hero-copy">A tiny daily game about human instinct. Look at a picture, pick a spot, and discover whether the world thinks like you.</p>
     ${streakMarkup(d?.progress,{compact:true})}
     <div class="actions"><button id="playNow" class="button">${d?.completed?'See today\'s results →':btn}</button><button id="tryPractice" class="button secondary">Try the sample ↗</button></div>
     <div class="meta-line"><span class="mini-avatars"><i></i><i></i><i></i></span>New puzzles every day · No signup required</div>
     ${invitation?'<p class="meta-line" style="color:#ab785a">✳ A friend challenged you! Finish today’s five to compare.</p>':''}
   </div>
   <div class="hero-art"><div class="float-star">✳</div><div class="preview-card"><div class="art-surface">${sceneMarkup('park',0)}</div><div class="preview-bottom"><span>WHERE WOULD YOU MEET?</span><span style="color:#dd886b">01 / 05 ↗</span></div><span class="preview-sample-dot"></span></div><div class="floating-note">YOU THINK<br/>LIKE ME? ☺</div></div>
 </section><section class="welcome-bottom">
 <div class="feature"><span class="feature-icon">☝️</span><span><strong>One tiny decision</strong><small>No trivia, no typing. Just point and tap.</small></span></div>
 <div class="feature"><span class="feature-icon">👀</span><span><strong>A surprising reveal</strong><small>See the places other people picked.</small></span></div>
 <div class="feature"><span class="feature-icon">✳</span><span><strong>Compare with friends</strong><small>Same picture. Very different instincts.</small></span></div>
 </section>`);
 document.querySelector('#playNow').onclick=()=>d?.completed?loadResults():beginDaily();
 document.querySelector('#tryPractice').onclick=beginPractice;
}
function beginDaily(){
 if(!state.data?.puzzles?.length){ui(`<section class="error-panel"><span class="eyebrow">NO GAME SCHEDULED</span><h2>Today's puzzles aren't here yet.</h2><p>Ask the admin to schedule five puzzles for ${esc(state.data?.date||'today')}.</p></section>`);return}
 state.practice=false;state.feedback=null;state.roundResult=null;state.view='game';state.locked=false;const answered=new Set(state.data.answers.map(x=>x.puzzleId));
 const first=state.data.puzzles.findIndex(p=>!answered.has(p.id));state.round=first===-1?4:first;state.selection=null;
 if(first===-1)return loadResults();renderGame();
}
function beginPractice(){state.practice=true;state.feedback=null;state.roundResult=null;state.view='game';state.round=0;state.locked=false;state.selection=null;state.roundResult=null;renderGame()}
function rewardMarkup(feedback,practice=false){
 if(!feedback)return '';
 const qualified=['provisional','final','demo'].includes(feedback.status);
 if(!qualified){
  return `<div class="reward-card reward-pending" id="rewardPanel" role="status" aria-live="polite">
    <div class="reward-symbol">✳</div><div class="reward-main"><span class="reward-kicker">CHOICE CONFIRMED</span>
    <h2>+${XP_PER_TAP} XP · Spot locked!</h2><p>Good instinct. Unlock your next puzzle whenever you're ready.</p></div>
    <span class="reward-stars">✦</span></div>`;
 }
 const badge=REWARD_LEVELS[feedback.tier]||REWARD_LEVELS.wild;
 const stars=badge.stars?'★'.repeat(badge.stars):'✳';
 const flare=badge.stars===3?`<div class="reward-confetti" aria-hidden="true">${Array.from({length:12},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div>`:'';
 return `<div class="reward-card reward-${badge.key}" id="rewardPanel" role="status" aria-live="polite">
   ${flare}<div class="reward-symbol">${badge.symbol}</div>
   <div class="reward-main"><span class="reward-kicker">${practice?'SIMULATED PRACTICE · DEMO XP (NOT SAVED)':'LIVE CROWD · PRELIMINARY · +'+XP_PER_TAP+' XP'}</span>
     <h2>${badge.name}</h2><p>${badge.subtitle}</p>
     <div class="reward-metrics"><strong>${feedback.score}%</strong> of other players tapped near you <span class="reward-peak">· ${feedback.alignment}% of peak match</span></div>
   </div><span class="reward-stars" aria-label="${badge.stars} stars">${stars}</span></div>`;
}
function renderGame(){
 stopRefresh();state.view='game';const puzzle=state.practice?DEMO:state.data.puzzles[state.round],total=state.practice?1:5;
 const d=state.data,existing=!state.practice?d.answers.find(a=>a.puzzleId===puzzle.id):null;
 const selection=state.selection||existing;
 const locked=state.locked||!!existing;
 const doneCount=state.practice?(locked?1:0):d.answers.length;
 ui(`<section class="game-shell">
  <div class="game-top"><span class="round-count">${state.practice?'PRACTICE MODE':'DAILY DROP · '+esc(fmtDate(d.date))}</span><span class="mini-tag">${state.practice?'SAMPLE CROWD · NOT REAL':`✦ ${doneCount*XP_PER_TAP} XP EARNED`}</span></div>
  ${!state.practice&&d.progress?.streak>0?`<div class="streak-mini">🔥 ${d.progress.streak} day streak · ${d.progress.status==='secured'?'Safe today':d.progress.status==='shield-ready'?'Shield available to save it':'Finish five to keep it'}</div>`:''}
  <div class="progress-track">${Array.from({length:total},(_,i)=>`<div class="progress-segment ${i<doneCount?'done':''} ${i===state.round?'current':''}"></div>`).join('')}</div>
  <div class="eyebrow">${esc(puzzle.eyebrow)}</div>
  <h1 class="game-question">${esc(puzzle.question)}</h1>
  ${stage(puzzle,{interactive:!locked,marker:selection,locked})}
  ${locked?rewardMarkup(state.feedback,state.practice):''}
  <div class="game-actions"><span class="helper">${locked?'✓ Choice locked in. Nobody else can influence your answer.':selection?'Looking good. You can still change your spot before locking it.':'Go with your instinct. There is no correct answer.'}</span>
   ${locked?`<button class="button" id="nextButton">${state.practice?'See sample results →':state.data.answers.length>=5?'Reveal results →':'Next picture →'}</button>`:
   `<button class="button coral" id="confirmButton" ${selection?'':'disabled'}>${state.submitting?'Saving...':'Lock in my spot ↗'}</button>`}
  </div><p class="tiny-tip">${state.practice?'Practice answers are not recorded. All other dots are simulated.':'Your answer is private until the round is complete. No changing it later.'}</p>
 </section>`);
 if(!locked){
  document.querySelector('#tapSurface')?.addEventListener('click',e=>{
   const frame=document.querySelector('#puzzleFrame'),r=frame.getBoundingClientRect();
   state.selection={x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))};
   renderGame();
  });
  document.querySelector('#tapSurface')?.addEventListener('keydown',e=>{
   const moves={ArrowUp:[0,-.05],ArrowDown:[0,.05],ArrowLeft:[-.05,0],ArrowRight:[.05,0]};
   if(!moves[e.key])return;
   e.preventDefault();const [dx,dy]=moves[e.key],old=state.selection||{x:.5,y:.5};
   state.selection={x:Math.max(0,Math.min(1,old.x+dx)),y:Math.max(0,Math.min(1,old.y+dy))};
   renderGame();document.querySelector('#tapSurface')?.focus();
  });
  document.querySelector('#confirmButton')?.addEventListener('click',confirmSelection);
 }else document.querySelector('#nextButton')?.addEventListener('click',()=>{
   if(state.practice)return showPracticeResult();
   if(state.data.answers.length>=5)return loadResults();
   const next=state.data.puzzles.findIndex(p=>!state.data.answers.some(a=>a.puzzleId===p.id));
   if(next===-1)return loadResults();state.round=next;state.selection=null;state.locked=false;state.feedback=null;renderGame();
 });
}
function renderRoundReveal(){
 stopRefresh();state.view='round-reveal';
 const puzzle=state.practice?DEMO:state.data.puzzles[state.round],r=state.roundResult;
 if(!r||!r.heatmap){toast('The reveal is unavailable. Please try again.');return}
 const predicted=r.status==='predicted',demo=state.practice;
 const badge=REWARD_LEVELS[r.tier]||REWARD_LEVELS.wild;
 const score=Math.min(100,Math.max(0,Number(r.hotspotScore??r.alignment)||0));
 const sourceLabel=demo?'PRACTICE':predicted?'ESTIMATED':r.status==='final'?'FINAL RESULTS':'CROWD REVEAL';
 const badgeTitle=predicted?(r.tier==='perfect'?'BULLSEYE!':badge.name):badge.name;
 const rewardLine=predicted?({perfect:'Bullseye on the predicted hotspot!',great:'Strong match with the estimated hot zones.',good:'Your instinct found a possible shared spot.',wild:'You chose somewhere unexpected by the model.'}[r.tier]||'Your model-estimated result is ready.'):badge.subtitle;
 const description=predicted?`Your spot is ${scoreText(r.alignment)} in sync with the estimated hotspots.`:
  demo?`Sample responses only. Your practice guess matched ${r.score}% of the simulated points.`:
  `${r.score}% of other real players tapped near your spot. Final scores may change until the daily reset.`;
 const nextText=demo?"Play today's 5 puzzles →":state.data.answers.length>=5?'See daily results →':`Puzzle ${state.round+2} of 5 →`;
 const confetti=badge.stars===3?`<div class="reveal-particles" aria-hidden="true">${Array.from({length:24},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div>`:'';
 ui(`<section class="game-shell reveal-shell reveal-${badge.key}">
   <div class="game-top"><span class="round-count">${demo?'PRACTICE REVEAL':`PUZZLE ${state.round+1} OF 5 · REVEALED`}</span><span class="mini-tag">${demo?'DEMO ONLY':'✦ +10 XP EARNED'}</span></div>
   <div class="reveal-source ${predicted?'reveal-prediction-label':'reveal-live-label'}">${esc(sourceLabel)}</div>
   <h1 class="reveal-headline">${badge.symbol} ${esc(badgeTitle)}</h1>
   <p class="reveal-subline">${esc(puzzle.question)}</p>
   <div class="reveal-picture" id="resultFrame">
     <div class="art-surface">${createArtMarkup(puzzle)}</div>
     <canvas id="heatCanvas" class="heatmap reveal-heat" aria-label="${predicted?'Estimated visual focal point density':'Crowd response density'}"></canvas>
     <div class="selected-point reveal-my-tap" style="left:${r.yourTap.x*100}%;top:${r.yourTap.y*100}%" title="Your selected location"></div>
     <div class="reveal-marker-label">YOUR SPOT</div>
   </div>
   <div class="reveal-caption"><span>🔴 ${predicted?'Likely popular spots':'Popular crowd spots'}</span><span>● Your tap</span></div>
   <div class="reveal-score-panel">
      ${confetti}
      <div class="reveal-score-number"><strong id="instantScore" data-target="${score}">0</strong><span>/ 100</span><small>${predicted?'ESTIMATED SPOT FIT':demo?'PRACTICE SPOT FIT':'CROWD SPOT FIT'}</small></div>
      <div class="reveal-score-explanation"><span class="reveal-stars">${'★'.repeat(badge.stars)||'✳'}</span><strong>${esc(rewardLine)}</strong><p>${esc(description)}</p><span class="reveal-xp">${demo?'✦ Practice XP · not saved':'✦ +10 XP secured'}</span></div>
   </div>
   <div class="reveal-progress"><span id="revealMeter" style="--meter:${score}%"></span></div>
   <div class="reveal-verification">${predicted?`<span title="Estimated from editor-selected visual focal points, not yet actual player responses">✳ Estimated reveal</span>`:
    demo?'Practice uses simulated data, never included in official scores or achievements.':`✓ Based on ${r.playerCount} real answers. ${r.status==='provisional'?'Live results can change as more people play.':'Final results are locked.'}`}</div>
   <button class="button coral reveal-next" id="nextRevealButton">${nextText}</button>
   <p class="tiny-tip">${demo?'Practice is separate from the daily rankings.':'Every puzzle reveals its result before the next one begins.'}</p>
 </section>`);
 document.querySelector('#nextRevealButton').addEventListener('click',()=>{
   if(state.practice){state.practice=false;state.roundResult=null;state.locked=false;return state.data?.completed?loadResults():beginDaily()}
   if(state.data.answers.length>=5)return loadResults();
   const next=state.data.puzzles.findIndex(p=>!state.data.answers.some(a=>a.puzzleId===p.id));
   if(next===-1)return loadResults();
   state.round=next;state.selection=null;state.locked=false;state.feedback=null;state.roundResult=null;renderGame();
   window.scrollTo?.({top:0,behavior:'instant'});
 });
 requestAnimationFrame(()=>{
    drawHeatmap(document.getElementById('heatCanvas'),r.heatmap);
    animateScore(score);
 });
 if(badge.stars>=2&&!demo&&window.navigator?.vibrate)window.navigator.vibrate(badge.stars===3?[20,45,35]:[20]);
 if(predicted&&!demo)refreshRoundWhenReady(puzzle.id);
}
function scoreText(value){return value>=85?'very closely':value>=55?'fairly closely':'loosely';}
function animateScore(target){
 const el=document.getElementById('instantScore');if(!el)return;
 if(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches){el.textContent=String(target);return}
 const started=performance.now(),duration=650;
 const tick=(t)=>{
   if(!el.isConnected)return;
   const step=Math.max(0,Math.min(1,(t-started)/duration));
   el.textContent=String(Math.round(target*(1-(1-step)**3)));
   if(step<1)requestAnimationFrame(tick);
 };
 requestAnimationFrame(tick);
}
async function confirmSelection(){
 if(!state.selection||state.submitting)return;
 if(state.practice){const result=generatePractice();state.roundResult={...result.puzzles[0],hotspotScore:result.puzzles[0].alignment};state.locked=true;renderRoundReveal();return}
 state.submitting=true;const puzzle=state.data.puzzles[state.round];const selected={...state.selection};
 try{
  const res=await request('/api/answers',{method:'POST',body:JSON.stringify({puzzleId:puzzle.id,x:selected.x,y:selected.y})});
  if(!state.data.answers.some(a=>a.puzzleId===puzzle.id))state.data.answers.push({puzzleId:puzzle.id,x:res.tap.x,y:res.tap.y});
  state.data.completed=res.completed;state.data.progress=res.progress||state.data.progress;
  state.roundResult=res.roundResult;state.locked=true;renderRoundReveal();
  window.scrollTo?.({top:0,behavior:'instant'});
 }catch(e){toast('Could not save: '+e.message)}finally{state.submitting=false}
}
async function loadResults(){
 stopRefresh();state.practice=false;state.view='loading';ui('<div class="loading-state"><span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span><p>Reading the room...</p></div>');
 try{state.results=await request('/api/results');state.tab=0;state.view='results';renderResults();
  if(state.invite)fetchMatch();
 }catch(e){toast(e.message);renderWelcome()}
}
function generatePractice(){
 let seed=18371;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
 const centers=[{x:.48,y:.50,p:.58},{x:.16,y:.72,p:.25},{x:.82,y:.22,p:.17}];let points=[];
 for(let i=0;i<200;i++){
  const r=rand(),c=r<.58?centers[0]:r<.83?centers[1]:centers[2];
  const theta=rand()*Math.PI*2,radius=Math.sqrt(-2*Math.log(Math.max(rand(),.0001)))*.048;
  points.push({x:Math.max(.02,Math.min(.98,c.x+radius*Math.cos(theta))),y:Math.max(.02,Math.min(.98,c.y+radius*Math.sin(theta)))});
 }
 const grid=makeGrid(points),nearby=points.filter(p=>Math.hypot(p.x-state.selection.x,p.y-state.selection.y)<=.11).length;
 const peak=practicePeak(points);const grade=gradeCrowdMatch(nearby,points.length,Math.max(nearby,peak));
 return {date:'practice',minimumPlayers:200,final:true,totalScore:grade.score,earnedXp:XP_PER_TAP,awards:[],puzzles:[{puzzleId:'demo',status:'demo',playerCount:201,nearby,...grade,heatmap:grid,yourTap:state.selection}]};
}
function practicePeak(points){let max=0;for(let y=0;y<=20;y++)for(let x=0;x<=20;x++){const cx=x/20,cy=y/20;let n=0;for(const p of points)if(Math.hypot(p.x-cx,p.y-cy)<=.11)n++;max=Math.max(max,n)}return max}
function makeGrid(pts){const cols=25,rows=17,values=Array(cols*rows).fill(0);pts.forEach(p=>{const cx=Math.min(cols-1,Math.floor(p.x*cols)),cy=Math.min(rows-1,Math.floor(p.y*rows));values[cy*cols+cx]++});return {cols,rows,values}}
function showPracticeResult(){state.results=generatePractice();state.tab=0;state.view='practice-results';renderResults()}
function rankingMarkup(ranking){
 if(!ranking||ranking.status==='unavailable')return '';
 if(ranking.status==='gathering')return `<section class="ranking-card ranking-pending" aria-live="polite">
   <div class="ranking-icon">👀</div><div class="ranking-copy"><span class="ranking-kicker">YOUR DAILY RANK IS COMING</span>
   <h2>How many players can you beat?</h2><p>Real percentile unlocks when ${ranking.needed} people finish all five puzzles. <strong>${ranking.completedPlayers} / ${ranking.needed} finished.</strong></p>
   <div class="ranking-meter"><span style="width:${Math.min(100,ranking.completedPlayers/ranking.needed*100)}%"></span></div></div></section>`;
 const beat=ranking.beatPercent;
 const tied=ranking.tiedWith?` · tied with ${ranking.tiedWith}`:'';
 const message=beat>=90?'You read the room brilliantly.':beat>=60?'You were more in sync than most.':beat>=35?'You are finding your crowd.':'Your instincts were wonderfully different.';
 const label=ranking.status==='final'?'FINAL DAILY RANK':'LIVE RANK · MAY CHANGE';
 return `<section class="ranking-card ${beat>=90?'ranking-elite':''}" role="status" aria-live="polite">
   <div class="ranking-icon">${beat>=90?'🌟':'🏅'}</div><div class="ranking-copy">
   <span class="ranking-kicker">${label}</span><h2>You beat <strong>${beat}%</strong> of players today.</h2>
   <p>${message} Compared with ${ranking.comparedWith} other completed players${tied}. ${ranking.status==='provisional'?'This ranking may change as more people finish.':'The day’s rankings are locked.'}</p>
   </div></section>`;
}

function renderResults(){
 stopRefresh();const demo=state.view==='practice-results',result=state.results,d=state.data;
 const puzzle=demo?DEMO:d.puzzles[state.tab],r=result.puzzles[state.tab],own=demo?state.selection:d.answers.find(a=>a.puzzleId===puzzle.id);
 const predicted=r.status==='predicted';
 const ready=r.status==='provisional'||r.status==='final'||r.status==='demo'||predicted;
 const pending=(!demo&&result.totalScore===null);
 const estimate=Math.round(result.puzzles.reduce((sum,r)=>sum+(r.hotspotScore??r.alignment??0),0)/result.puzzles.length);
 const awards=demo?[]:(result.awards||dailyAwards(result.puzzles,true));
 const progress=demo?null:result.progress;
 ui(`<section class="results-shell">
 <div class="result-head"><div><span class="complete-ribbon">✓ ${demo?'PRACTICE COMPLETE':'ALL FIVE SPOTS LOCKED'}</span>
   <h1>${demo?'So, did you':'Great minds'}<br/>${demo?'blend in?':'think alike?'}</h1>
   <p class="result-subtitle">${demo?'An illustration of how the reveal feels.':pending?'You saw a score and heatmap after each tap. Official crowd ranking awaits real responses.':'Your real crowd results are in.'}</p></div>
   <div class="score-bubble"><strong class="${pending?'small-score':''}">${pending?estimate:result.totalScore}</strong><span>${pending?'ESTIMATED HOTSPOT FIT · NOT OFFICIAL':'REAL CROWD MATCH SCORE'}</span></div></div>
 ${!demo?rankingMarkup(result.ranking):''}
 ${progress?streakMarkup(progress):''}
 ${progress?`<div class="level-progress"><div class="level-progress-label"><strong>LEVEL ${progress.level} · ${progress.totalXp} TOTAL XP</strong><span>🔥 ${progress.streak}-day streak · ${progress.xpPerLevel-progress.xpIntoLevel} XP to next level</span></div><div class="level-meter"><span style="width:${100*progress.xpIntoLevel/progress.xpPerLevel}%"></span></div></div>`:''}
 <div class="daily-rewards"><div class="xp-tally"><span>✦</span><strong>+${demo?XP_PER_TAP:(result.earnedXp??50)} XP</strong><small>${demo?'PRACTICE COMPLETE · NOT SAVED':progress?.todayBonusXp?`50 FOR TAPS + ${progress.todayBonusXp} STREAK BONUS`:'FIVE SPOTS COMPLETED'}</small></div>${awards.map(a=>`<div class="award-pill"><span>${a.symbol}</span><strong>${esc(a.name)}</strong><small>${esc(a.detail)}</small></div>`).join('')}</div>
 <div class="result-panel">
  <div class="result-panel-top"><strong>${demo?'PRACTICE':'ROUND '+(state.tab+1)+' / 5'} · ${esc(puzzle.eyebrow)}</strong><span>${predicted?'ESTIMATED SPOT MAP':ready?(demo?'200 simulated responses':r.playerCount+' real responses'):(r.playerCount||0)+' / '+(result.minimumPlayers||5)+' players'}</span></div>
  <div class="result-frame" id="resultFrame"><div class="art-surface">${createArtMarkup(puzzle)}</div>
   ${ready?'<canvas class="heatmap" id="heatCanvas" aria-label="Heatmap of other answers"></canvas>':''}
   ${own?`<div class="selected-point" style="left:${own.x*100}%;top:${own.y*100}%" title="Your location"></div>`:''}</div>
  <div class="result-caption"><div><strong>${ready?`${REWARD_LEVELS[r.tier]?.symbol||'✦'} ${REWARD_LEVELS[r.tier]?.name||'CROWD MATCH'} · ${predicted?'predicted '+r.alignment+'% hotspot fit':r.score+'% of '+(demo?'sample responses':'other players')+' nearby'}`:'The crowd is still forming.'}</strong>
   <small>${predicted?'Spot fit is estimated here. The final crowd match uses real submissions.':ready?`Your location is the dark dot. ${r.alignment}% of the strongest hotspot density${!demo&&!result.final?' · live estimate':''}.`:'The crowd is still forming.'}</small></div>
   ${ready?'<span class="legend">LOW <span class="legend-gradient"></span> HIGH</span>':''}</div>
  ${!demo?`<div class="results-tabs">${d.puzzles.map((p,i)=>`<button type="button" class="result-tab ${i===state.tab?'selected':''}" data-tab="${i}">0${i+1}<span>${result.puzzles[i].status==='predicted'?'MODEL '+result.puzzles[i].alignment+'%':result.puzzles[i].score===null||result.puzzles[i].score===undefined?'PENDING':(REWARD_LEVELS[result.puzzles[i].tier]?.symbol||'✦')+' '+result.puzzles[i].score+'%'}</span></button>`).join('')}</div>`:''}
 </div>
 ${predicted?`<div class="result-notice"><span class="demo-flag">ESTIMATED RESULT</span> A visual prediction; official awards use real player taps.</div>`:''}
 ${!ready?`<div class="result-notice"><strong>Results aren't ready yet.</strong> ${r.playerCount||0} real ${r.playerCount===1?'person has':'people have'} answered this puzzle. A heatmap will appear once at least ${result.minimumPlayers} players have submitted. It will be provisional until the day ends. We never invent crowd responses.</div>`:''}
 ${demo?`<div class="result-notice"><span class="demo-flag">SIMULATED / SAMPLE DATA</span> This preview uses 200 generated dots and does not represent actual players. Your practice tap was not saved.</div>`:''}
 ${state.match&&!demo?matchMarkup(state.match):''}
 <div class="social-card"><div><span class="eyebrow" style="color:#a9d6b3">${demo?'READY FOR THE REAL THING?':'THE REAL TEST'}</span><h2>${demo?'Five fresh scenes. Every day.':'Find out where your friends would tap.'}</h2><p>${demo?'The daily game saves real selections and unlocks real heatmaps when enough people join.':'Send a spoiler-free challenge. After they finish, compare how many spots you independently matched.'}</p></div>
 <button class="button" id="shareButton">${demo?'Play the daily game →':'Challenge a friend ↗'}</button></div>
 <div class="info-strip"><span>${demo?'PRACTICE ONLY':'NEW FIVE PUZZLES TOMORROW · RESET '+esc(d.timeZone)}</span><span>✳</span><button id="extraButton">${demo?'Back to home':'Try the sample heatmap'}</button></div>
 </section>`);
 if(ready)requestAnimationFrame(()=>drawHeatmap(document.getElementById('heatCanvas'),r.heatmap));
 document.querySelectorAll('[data-tab]').forEach(btn=>btn.onclick=()=>{state.tab=Number(btn.dataset.tab);renderResults()});
 document.querySelector('#shareButton').onclick=demo?()=>state.data?.completed?loadResults():beginDaily():shareInvite;
 document.querySelector('#extraButton').onclick=demo?renderWelcome:beginPractice;
 if(!demo&&(!result.final||result.puzzles.some(p=>p.status==='predicted')))refreshDailyWhenReady();
}
function matchMarkup(m){
 if(!m.ready)return `<div class="match-card"><div><strong>Friend challenge received ✳</strong><small>${esc(m.reason||'Both players must finish the daily game.')}</small></div><div class="match-number">…</div></div>`;
 return `<div class="match-card"><div><strong>${m.self?'This is your own challenge link':'You and your friend matched!'}</strong><small>${m.self?'Share your challenge link with somebody else.':'You independently chose nearby spots on '+m.matched+' of '+m.total+' pictures.'}</small></div><div class="match-number">${m.matched}/${m.total}</div></div>`;
}
function drawHeatmap(canvas,grid){
 if(!canvas||!grid||!Array.isArray(grid.values))return;
 const parent=canvas.parentElement,{width,height}=parent.getBoundingClientRect();
 if(width<=0||height<=0)return;
 const ratio=Math.min(2,window.devicePixelRatio||1);
 canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const {cols,rows,values}=grid;
 // Gaussian-blur the submitted density cells. Do not repeatedly paint all 425
 // transparent radial gradients: they accumulate into a muddy orange rectangle.
 const kernel=[[0,-2,.14],[0,-1,.63],[0,0,1],[0,1,.63],[0,2,.14]];
 const smoothed=new Float32Array(cols*rows);
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
   let total=0,weight=0;
   for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
     const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=cols||ny>=rows)continue;
     const w=Math.exp(-(dx*dx+dy*dy)/(2*1.35*1.35));
     total+=(Number(values[ny*cols+nx])||0)*w;weight+=w;
   }
   smoothed[y*cols+x]=weight?total/weight:0;
 }
 const highest=Math.max(...smoothed,1e-9);
 const pixels=ctx.createImageData(canvas.width,canvas.height),data=pixels.data;
 const sample=(x,y)=>smoothed[Math.max(0,Math.min(rows-1,y))*cols+Math.max(0,Math.min(cols-1,x))];
 for(let py=0;py<canvas.height;py++){
   const fy=(py+.5)/canvas.height*(rows-1),y0=Math.floor(fy),v=fy-y0;
   for(let px=0;px<canvas.width;px++){
     const fx=(px+.5)/canvas.width*(cols-1),x0=Math.floor(fx),u=fx-x0;
     const a=sample(x0,y0)*(1-u)+sample(x0+1,y0)*u;
     const b=sample(x0,y0+1)*(1-u)+sample(x0+1,y0+1)*u;
     const intensity=Math.max(0,Math.min(1,((a*(1-v)+b*v)/highest-.07)/.93));
     const t=Math.pow(intensity,1.05);
     const idx=(py*canvas.width+px)*4;
     data[idx]=Math.round(252-33*t);data[idx+1]=Math.round(196-122*t);data[idx+2]=Math.round(103-52*t);
     data[idx+3]=Math.round(Math.min(220,198*Math.pow(t,.8)));
   }
 }
 ctx.putImageData(pixels,0,0);
}
async function fetchMatch(){try{state.match=await request('/api/invites/'+encodeURIComponent(state.invite));if(state.view==='results')renderResults()}catch(e){toast('Challenge: '+e.message)}}
async function shareInvite(){try{const data=await request('/api/invites',{method:'POST',body:'{}'});const url=location.origin+'/?invite='+encodeURIComponent(data.code);
 if(navigator.share){try{await navigator.share({title:'SAME SPOT · Can we think alike?',text:'I finished today’s SAME SPOT. Can we pick the same places without talking?',url});return}catch(e){if(e.name==='AbortError')return}}
 if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);toast('Challenge link copied! ✳')}
 else window.prompt('Copy your challenge link:',url);
 }catch(e){toast('Sharing failed: '+e.message)}}
const helpButton=document.querySelector('#howButton');
helpButton.onclick=()=>{
 const overlay=document.createElement('div');overlay.className='modal-scrim';overlay.innerHTML=`<section role="dialog" aria-modal="true" aria-labelledby="helpTitle" class="modal"><button class="modal-close" id="closeHelp" aria-label="Close">×</button><span class="eyebrow">THE RULES ARE SIMPLE</span><h2 id="helpTitle">No correct answers. Just people.</h2><p>Think about the spot other people will independently choose. Your goal is to match their instincts.</p><ol><li>Look at each picture and read the question.</li><li>Tap anywhere on the picture. Pick exactly one spot.</li><li>Lock your choice, then see the heatmap, score, and reward immediately on the next screen.</li><li>Repeat for five daily scenes.</li><li>Earn 10 XP for every locked choice. Under five real answers, you'll see an estimated heatmap using visually selected focal points. At five, it switches to actual player taps.</li><li>Perfect Pulse rewards choices near the strongest crowd hotspot. It is not an objectively correct answer.</li><li>Estimated reveals are not real player data; official rankings and crowd badges always use actual submissions. Your estimated score can change when the real crowd unlocks.</li><li>Compare your daily score with other completed players once the ranking unlocks. Your live percentile may change before the daily reset.</li><li>Compare your choices with a friend.</li></ol><button id="gotIt" class="button" style="width:100%;margin-top:10px">Got it. Let's go ↗</button></section>`;
 document.body.append(overlay);const close=()=>overlay.remove();overlay.onclick=e=>{if(e.target===overlay)close()};overlay.querySelector('#closeHelp').onclick=close;overlay.querySelector('#gotIt').onclick=close;
};
async function init(){try{state.data=await request('/api/daily');todayLabel.textContent=`TODAY · ${fmtDate(state.data.date).toUpperCase()}`;renderWelcome()}catch(e){ui(`<section class="error-panel"><h2>Oops. Lost our connection.</h2><p>${esc(e.message)}</p><button class="button" id="retry">Try again ↗</button></section>`);document.querySelector('#retry').onclick=init}}
init();
