// The same reward rules are used by the server and client.
// A "Perfect Pulse" means a near-peak *crowd* match, never an objectively correct answer.
export const XP_PER_TAP=10;
export const REWARD_LEVELS=Object.freeze({
  perfect:{key:'perfect',name:'PERFECT PULSE!',short:'Perfect',symbol:'🏆',stars:3,subtitle:'You found the crowd\'s strongest hotspot.'},
  great:{key:'great',name:'NAILED IT!',short:'In sync',symbol:'⚡',stars:2,subtitle:'You picked one of the crowd\'s favorite spots.'},
  good:{key:'good',name:'PRETTY CLOSE!',short:'Close',symbol:'✨',stars:1,subtitle:'Not the top spot, but plenty of people thought like you.'},
  wild:{key:'wild',name:'WILD CARD!',short:'Different',symbol:'🪄',stars:0,subtitle:'A bold pick! Your instincts took a different route.'}
});
export function gradeCrowdMatch(nearby,othersCount,peakNearby){
 if(!Number.isInteger(nearby)||!Number.isInteger(othersCount)||!Number.isInteger(peakNearby)||othersCount<1||nearby<0||nearby>othersCount||peakNearby<nearby||peakNearby>othersCount)throw Error('Invalid crowd match data');
 const score=Math.round(nearby/othersCount*100);
 const alignment=peakNearby>0?Math.round(nearby/peakNearby*100):0;
 const share=nearby/othersCount;
 let key='wild';
 if(alignment>=95 && share>=.20)key='perfect';
 else if(alignment>=75 && share>=.15)key='great';
 else if(alignment>=45 && share>=.08)key='good';
 return {score,alignment,tier:key,stars:REWARD_LEVELS[key].stars};
}
export function dailyAwards(puzzles,completed){
 if(!completed)return [];
 const out=[{id:'finisher',symbol:'🎖️',name:'Daily Finisher',detail:'All five choices locked in'}];
 const graded=puzzles.filter(p=>p.tier&&p.tier!=='pending');
 if(graded.some(p=>p.tier==='perfect'))out.push({id:'pulse',symbol:'🏆',name:'Perfect Pulse',detail:'Hit the strongest crowd hotspot'});
 if(graded.filter(p=>p.tier==='perfect'||p.tier==='great').length>=3)out.push({id:'magnet',symbol:'⚡',name:'Crowd Magnet',detail:'Three brilliant crowd reads'});
 return out;
}
