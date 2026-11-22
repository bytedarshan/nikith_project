const scenePool = [
  {scene:'park', question:'You are meeting a stranger here. Where would you both go?', eyebrow:'THE RENDEZVOUS'},
  {scene:'cafe', question:'You both want the same cozy seat. Where do you go?', eyebrow:'THE CAFÉ TEST'},
  {scene:'island', question:'You need to hide a message. Where would most people choose?', eyebrow:'THE SECRET ISLAND'},
  {scene:'gallery', question:'Which thing do you think people look at first?', eyebrow:'FIRST IMPRESSIONS'},
  {scene:'plaza', question:'Your group gets separated. Where would everyone regroup?', eyebrow:'THE MEETING POINT'},
  {scene:'patterns', question:'What spot will most people instinctively tap?', eyebrow:'FOLLOW YOUR EYES'},
  {scene:'station', question:'You must find a friend without your phone. Where do you wait?', eyebrow:'THE PLATFORM'},
  {scene:'garden', question:'You can stop at one place. Where would everyone stop?', eyebrow:'THE GARDEN WALK'}
];

function dateAdd(date, add) {
  const [y,m,d] = date.split('-').map(Number);
  const next = new Date(Date.UTC(y,m-1,d+add));
  return next.toISOString().slice(0,10);
}
export function newStore(today) {
  const puzzles=[]; const sets=[];
  for(let day=0;day<14;day++) {
    const date=dateAdd(today,day);
    const ids=[];
    for(let slot=0;slot<5;slot++) {
      const tmpl=scenePool[(day*3+slot)%scenePool.length];
      const id=`seed-${day+1}-${slot+1}`;
      puzzles.push({id, date, slot:slot+1, scene:tmpl.scene, question:tmpl.question,
        eyebrow:tmpl.eyebrow, variant:(day*7+slot*3)%11, imageUrl:null,
        createdAt:new Date().toISOString(), updatedAt:new Date().toISOString()});
      ids.push(id);
    }
    sets.push({date, puzzleIds:ids, status:'scheduled'});
  }
  return {schema:1, createdAt:new Date().toISOString(), puzzles, sets, players:[], taps:[], invites:[], events:[]};
}
export function getDateInTimezone(timezone='Asia/Kolkata', date=new Date()) {
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const obj=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return `${obj.year}-${obj.month}-${obj.day}`;
}
export function plusDays(date, offset){return dateAdd(date,offset)}
