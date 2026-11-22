import {createArtMarkup,SCENES} from './scenes.js';
import {DEFAULT_HOTSPOTS} from './prediction-defaults.js';
const root=document.querySelector('#adminApp');
const logout=document.querySelector('#logout');
const toastEl=document.querySelector('#toast');
const params=new URLSearchParams(location.search);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let all=null,form={date:'',slot:1,scene:'park',variant:0,question:'',eyebrow:'THE DAILY EXPERIMENT',imageUrl:null,hotspots:DEFAULT_HOTSPOTS.park.map(([x,y,weight])=>({x,y,weight}))};
const api=async(url,options={})=>{
 const r=await fetch(url,{credentials:'same-origin',headers:{'Content-Type':'application/json'},...options});
 let data;try{data=await r.json()}catch{throw Error('Server returned an invalid response')}
 if(!r.ok){let e=new Error(data.error||'Request failed');e.status=r.status;throw e}return data;
};
let toastTimer;
function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastEl.classList.remove('show'),3000)}
const today=()=>all?.today||new Date().toISOString().slice(0,10);
const addDays=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const firstUnscheduledDay=()=>{let date=today();const known=new Set(all?.days?.map(x=>x.date)||[]);while(known.has(date))date=addDays(date,1);return date;};
function dateBits(date){const x=new Date(date+'T12:00:00Z');return {day:date.slice(-2),month:x.toLocaleDateString('en-US',{month:'short',timeZone:'UTC'}).toUpperCase()}}
function findPuzzle(date,slot){return all?.puzzles.find(p=>p.date===date&&p.slot===slot)||null}
function fillForm(date,slot){
 const found=findPuzzle(date,slot);
 form={date,slot,scene:found?.scene||'park',variant:found?.variant||0,question:found?.question||'',eyebrow:found?.eyebrow||'THE DAILY EXPERIMENT',imageUrl:found?.imageUrl||null,hotspots:found?.hotspots||DEFAULT_HOTSPOTS[found?.scene||'park'].map(([x,y,weight])=>({x,y,weight}))};
}
function loginScreen(error=''){
 logout.hidden=true;
 root.innerHTML=`<section class="admin-login"><div class="eyebrow">PRIVATE CREATOR STUDIO</div><h1>Make more magic. ✳</h1><p>Enter your admin password to upload scenes, schedule tomorrow's five pictures and review real participation.</p>
 <form id="loginForm"><div class="form-field"><label for="adminPassword">Admin password</label><input id="adminPassword" name="password" type="password" required autocomplete="current-password" placeholder="Your secret password"/></div>
 ${error?`<div class="admin-alert">${esc(error)}${error.includes('ADMIN_PASSWORD')?'<br/>Ask Antigravity to create the .env file from .env.example and restart the server.':''}</div>`:''}
 <button class="button">Open my studio →</button></form><p style="font-size:12px">This page is private and changes require a configured <code>ADMIN_PASSWORD</code>.</p></section>`;
 root.querySelector('#loginForm').addEventListener('submit',async e=>{e.preventDefault();const btn=e.target.querySelector('button');btn.disabled=true;
  try{await api('/api/admin/login',{method:'POST',body:JSON.stringify({password:e.target.querySelector('#adminPassword').value})});await load();toast('Welcome to the studio!')}
  catch(err){loginScreen(err.message)}finally{btn.disabled=false}
 });
}
async function load(){
 try{all=await api('/api/admin/data');logout.hidden=false;
   const requested=params.get('date');const first=all.days.find(x=>x.date===today())?.date||all.days[0]?.date||today();
   if(!form.date){fillForm(requested&&/^\d{4}-\d{2}-\d{2}$/.test(requested)?requested:first,1)}
   else fillForm(form.date,form.slot);
   draw();
 }catch(err){if(err.status===401)loginScreen();else loginScreen(err.message)}
}
function showPreview(){
 const container=root.querySelector('#preview');if(!container)return;
 const pins=(form.hotspots||[]).map((p,i)=>`<span class="focal-pin" style="left:${p.x*100}%;top:${p.y*100}%" aria-hidden="true">${i+1}</span>`).join('');
 container.innerHTML=`<div class="focal-art">${createArtMarkup(form)}</div>${pins}`;
 const status=root.querySelector('#focalCount');if(status)status.textContent=`${(form.hotspots||[]).length} / 5 estimated focal points`;
 const weights=root.querySelector('#focalWeights');
 if(weights){
   weights.innerHTML=(form.hotspots||[]).map((p,i)=>`<label>Spot ${i+1} priority <input aria-label="Priority for predicted hotspot ${i+1}" data-weight="${i}" type="range" min="1" max="10" step="1" value="${Math.min(10,Math.max(1,Math.round(p.weight<=1?p.weight*10:p.weight)))}"/></label>`).join('');
   weights.querySelectorAll('[data-weight]').forEach(slider=>slider.addEventListener('input',()=>{form.hotspots[Number(slider.dataset.weight)].weight=Number(slider.value)}));
 }

}
function addFocal(e){
 const target=root.querySelector('#preview');if(!target)return;
 const existing=form.hotspots||[];
 if(existing.length>=5){toast('Maximum five focal points. Click Clear first to reposition them.');return}
 const rect=target.getBoundingClientRect();
 const x=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));
 const y=Math.max(0,Math.min(1,(e.clientY-rect.top)/rect.height));
 form.hotspots=[...existing,{x:Math.round(x*1000)/1000,y:Math.round(y*1000)/1000,weight:1}];
 showPreview();
}

function syncFormFromInputs(){
 form.date=root.querySelector('#dateField').value;
 form.slot=Number(root.querySelector('#slotField').value);
 form.scene=root.querySelector('#sceneField').value;
 form.variant=Number(root.querySelector('#variantField').value)||0;
 form.question=root.querySelector('#questionField').value;
 form.eyebrow=root.querySelector('#eyebrowField').value;
}
function draw(){
 const recent=all.days.find(x=>x.date===today())||{players:0,completed:0,submissions:0,slots:0};
 const scheduled=all.days.filter(x=>x.date>=today()&&x.slots===5).length;
 const selected=all.puzzles.filter(x=>x.date===form.date).sort((a,b)=>a.slot-b.slot);
 root.innerHTML=`<section class="admin-heading"><div><div class="eyebrow">CREATOR HQ · ${esc(all.timezone)} · V6</div><h1>Your puzzle studio.</h1><p>Choose a date and puzzle slot, edit the artwork, then save. Build new days in one click.</p></div><a class="button secondary tiny" href="/" target="_blank" rel="noopener">See live game ↗</a></section>
 <section class="admin-kpis">
 <div class="kpi"><strong>${recent.players}</strong><small>Players today</small></div>
 <div class="kpi"><strong>${recent.submissions}</strong><small>Taps collected</small></div>
 <div class="kpi"><strong>${recent.completed}</strong><small>Full completions</small></div>
 <div class="kpi"><strong>${scheduled}</strong><small>Days scheduled</small></div></section>
 <section class="admin-card admin-quickstart"><div><h2>✨ Create a new day's five puzzles</h2><p class="card-copy">Start with a copy of an existing five-puzzle day, then change the questions, artwork and hotspots. This never changes completed or live puzzles.</p></div><div class="admin-quickstart-fields"><label>Copy from <select id="copyFrom">${all.days.filter(x=>x.slots===5).map(d=>`<option value="${d.date}" ${d.date===today()?'selected':''}>${d.date}</option>`).join('')}</select></label><label>New date <input type="date" id="copyTo" min="${today()}" value="${firstUnscheduledDay()}"/></label><button type="button" class="button" id="cloneDay">Create 5 puzzles →</button></div><p class="admin-inline-message" id="cloneMessage" aria-live="polite"></p></section>
 <div class="admin-columns">
 <section class="admin-card"><h2>✳ Puzzle editor</h2><p class="card-copy">Each day has five slots. Select the date and slot below, make your changes, then save. To make a whole new day, use the creator above.</p>
 <form id="puzzleForm">
 <div class="form-row">
   <div class="form-field"><label for="dateField">Publish date</label><input id="dateField" name="date" type="date" min="${esc(today())}" value="${esc(form.date)}" required/></div>
   <div class="form-field"><label for="slotField">Position in daily game</label><select id="slotField" name="slot">${[1,2,3,4,5].map(i=>`<option ${form.slot===i?'selected':''} value="${i}">Puzzle ${i} of 5</option>`).join('')}</select></div>
 </div>
 <div class="form-field"><label for="questionField">What should players decide?</label><textarea maxlength="170" minlength="8" id="questionField" required placeholder="Where would you both meet?">${esc(form.question)}</textarea></div>
 <div class="form-row">
  <div class="form-field"><label for="eyebrowField">Short category label</label><input id="eyebrowField" maxlength="60" value="${esc(form.eyebrow)}" placeholder="THE FIRST IMPRESSION"/></div>
  <div class="form-field"><label for="sceneField">Illustration template</label><select id="sceneField">${SCENES.map(s=>`<option value="${s}" ${form.scene===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}</select></div>
 </div>
 <div class="form-field"><label for="variantField">Scene variant (optional)</label><input id="variantField" type="number" min="0" max="19" value="${form.variant}"/></div>
 <div class="form-field"><label>Custom artwork (PNG/JPG/WebP, max 3 MB)</label>
 <div class="upload-box ${form.imageUrl?'file-ready':''}" id="uploadBox"><span id="uploadText">${form.imageUrl?'✓ Custom image attached · choose a replacement':'↑ Click to upload an illustration'}</span><input id="imageUpload" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Upload custom puzzle illustration"/></div>
 <small style="display:block;color:#829384;margin-top:7px">Use a 480×330 aspect ratio to match the game board. Uploading is optional.</small>
 </div>
 <div class="form-field"><label>Predicted heatmap focal points</label><p class="card-copy">Click the preview to mark 2–5 places people might choose. These create a clearly labeled editorial prediction until enough real players answer.</p>
 <div class="focal-tools"><span id="focalCount"></span><button type="button" id="clearFocals">Clear points</button><button type="button" id="defaultFocals">Use suggested points</button></div><div class="focal-weights" id="focalWeights"></div></div>
 <div class="admin-preview focal-preview" id="preview">${createArtMarkup(form)}</div>
 ${form.date===today()&&selected.find(x=>x.slot===form.slot)&&recent.submissions>0?'<div class="admin-alert">If this puzzle already has submissions, it is locked against replacement.</div>':''}
 <p class="admin-inline-message" id="saveMessage" role="status" aria-live="polite"></p><button type="submit" class="button" id="savePuzzle">Save this puzzle →</button>
 </form>
 <div class="admin-tip">Once all five slots for a date are ready, the set becomes playable automatically at the start of that day. Answered puzzles cannot be replaced. Keep original source images as a backup.</div>
 </section>
 <div>
 <section class="admin-card" style="margin-bottom:18px"><h2>Upcoming daily drops</h2><p class="card-copy">Click a date to edit its five puzzle slots.</p>
 <div class="schedule-list">${all.days.filter(x=>x.date>=today()).slice(0,30).map(day=>{
    const bits=dateBits(day.date),now=day.date===today();return `<div class="schedule-row"><div class="date-tile"><strong>${bits.day}</strong><small>${bits.month}</small></div><div class="schedule-info"><strong>${now?'Today · ':''}${esc(day.date)}</strong><small>${day.slots}/5 puzzles · ${day.players} players · ${day.submissions} taps</small></div><span class="pill ${day.slots<5?'draft':''}">${day.slots===5?'READY':'DRAFT'}</span><button type="button" data-date="${esc(day.date)}">Edit ↗</button></div>`
 }).join('')}</div></section>
 <section class="admin-card"><h2>Selected day's five</h2><p class="card-copy">${esc(form.date)} · Click a tile to open that slot.</p>
 <div class="admin-puzzles-preview">${[1,2,3,4,5].map(slot=>{const p=selected.find(p=>p.slot===slot);return `<button class="puzzle-mini" type="button" data-slot="${slot}" style="${form.slot===slot?'border-color:#c87861;background:#fff5ed':''}"><div class="art-surface">${p?createArtMarkup(p):'<div style="display:grid;place-items:center;background:#f2f4ed;height:100%;color:#9caf9d;font-size:30px">+</div>'}</div><strong>PUZZLE 0${slot}</strong><small>${esc(p?.eyebrow||'Not uploaded')}</small></button>`}).join('')}</div></section>
 </div></div>`;
 root.querySelector('#cloneDay').addEventListener('click',async()=>{
  const button=root.querySelector('#cloneDay'),message=root.querySelector('#cloneMessage');
  button.disabled=true;button.textContent='Creating the new day...';message.textContent='';
  try{
    const from=root.querySelector('#copyFrom').value,to=root.querySelector('#copyTo').value;
    const answer=await api('/api/admin/duplicate-day',{method:'POST',body:JSON.stringify({sourceDate:from,targetDate:to})});
    toast(`Created ${answer.count} puzzles for ${to}!`);
    form.date='';await load();fillForm(to,1);draw();
    const result=root.querySelector('#cloneMessage');if(result)result.textContent=`✓ ${answer.count} puzzles created for ${to}. Edit each slot below.`;
  }catch(e){message.textContent='Could not create day: '+e.message;button.disabled=false;button.textContent='Create 5 puzzles →'}
 });
 root.querySelectorAll('[data-date]').forEach(b=>b.addEventListener('click',()=>{fillForm(b.dataset.date,1);draw();window.scrollTo({top:300,behavior:'smooth'})}));
 root.querySelectorAll('[data-slot]').forEach(b=>b.addEventListener('click',()=>{fillForm(form.date,Number(b.dataset.slot));draw()}));
 root.querySelector('#slotField').addEventListener('change',()=>{fillForm(form.date,Number(root.querySelector('#slotField').value));draw()});
 root.querySelector('#dateField').addEventListener('change',()=>{fillForm(root.querySelector('#dateField').value,form.slot);draw()});
 for(const id of ['#sceneField','#variantField'])root.querySelector(id).addEventListener('change',()=>{
  syncFormFromInputs();form.imageUrl=null;
  form.hotspots=DEFAULT_HOTSPOTS[form.scene].map(([x,y,weight])=>({x,y,weight}));showPreview();
  root.querySelector('#uploadText').textContent='↑ Click to upload an illustration';root.querySelector('#uploadBox').classList.remove('file-ready');
 });
 root.querySelector('#preview').addEventListener('click',addFocal);
 root.querySelector('#clearFocals').addEventListener('click',()=>{form.hotspots=[];showPreview()});
 root.querySelector('#defaultFocals').addEventListener('click',()=>{
  if(form.imageUrl){toast('For custom artwork, select your own focal points.');return}
  form.hotspots=DEFAULT_HOTSPOTS[form.scene].map(([x,y,weight])=>({x,y,weight}));showPreview();
 });
 showPreview();
 root.querySelector('#imageUpload').addEventListener('change',uploadImage);
 root.querySelector('#puzzleForm').addEventListener('submit',savePuzzle);
}
async function uploadImage(e){
 const file=e.target.files?.[0];if(!file)return;
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)){toast('Only PNG, JPG and WebP supported');return}
 if(file.size>3_000_000){toast('Keep the image under 3 MB');return}
 const box=root.querySelector('#uploadBox'),label=root.querySelector('#uploadText');label.textContent='Uploading image...';box.classList.add('file-ready');
 try{
  const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});
  const result=await api('/api/admin/upload',{method:'POST',body:JSON.stringify({dataUrl})});
  syncFormFromInputs();form.imageUrl=result.imageUrl;form.hotspots=[];showPreview();label.textContent='✓ '+file.name+' is ready';toast('Uploaded! Click 2–5 likely spots on the image before scheduling.');
 }catch(err){label.textContent='↑ Upload failed, choose another file';box.classList.remove('file-ready');toast(err.message)}
}
async function savePuzzle(e){e.preventDefault();syncFormFromInputs();
 const btn=root.querySelector('#savePuzzle'),message=root.querySelector('#saveMessage');btn.disabled=true;btn.textContent='Saving puzzle...';message.textContent='';
 try{
  const result=await api('/api/admin/puzzles',{method:'POST',body:JSON.stringify(form)});
  toast(result.status==='scheduled'?'Puzzle saved. Full day scheduled!':'Puzzle saved. Fill all five slots to publish.');
  await load();const saved=root.querySelector('#saveMessage');if(saved)saved.textContent=`✓ Puzzle saved for ${form.date}, slot ${form.slot}.`;
 }catch(err){toast('Could not save: '+err.message);message.textContent='Could not save: '+err.message;btn.disabled=false;btn.textContent='Save this puzzle →'}
}
logout.onclick=async()=>{try{await api('/api/admin/logout',{method:'POST',body:'{}'})}catch{}all=null;loginScreen()};
load();
