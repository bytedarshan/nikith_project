// Streaks are derived from server-verified full daily completions, never client state.
// A day counts only after all five puzzles are submitted.
import {plusDays} from './seed.mjs';

export const MILESTONE_REWARDS=Object.freeze({
  3:{xp:20, name:'First Flame',symbol:'🔥'},
  7:{xp:50, name:'Week Warrior',symbol:'🛡️'},
  14:{xp:100, name:'Two-Week Legend',symbol:'🏅'},
  30:{xp:200, name:'Monthly Master',symbol:'👑'}
});
const dayDiff=(a,b)=>Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000);

export function calculateStreak(completedDates, today){
  const dates=[...new Set(completedDates.filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&d<=today))].sort();
  let streak=0,best=0,shields=0,bonusXp=0,last=null,lastShieldUsed=null;
  let latestMilestone=null,todayBonusXp=0;
  const allMilestones=[];
  for(const day of dates){
    const gap=last===null?Infinity:dayDiff(last,day);
    // A saved shield bridges exactly one missed calendar day; it never creates a fake completed day.
    if(gap===1)streak+=1;
    else if(gap===2 && shields>0){shields--;streak+=1;lastShieldUsed=day;}
    else streak=1;
    last=day;
    best=Math.max(best,streak);
    const award=MILESTONE_REWARDS[streak];
    if(award){
      bonusXp+=award.xp;
      const earned={...award,days:streak,date:day};
      allMilestones.push(earned);
      latestMilestone=day===today?earned:null;
      if(day===today)todayBonusXp=award.xp;
    }else if(day===today){latestMilestone=null;}
    // Earn at 7, 14, 21, etc, up to one shield in reserve.
    if(streak%7===0)shields=Math.min(1,shields+1);
  }
  const diff=last===null?Infinity:dayDiff(last,today);
  let status='new',activeStreak=0;
  if(diff===0){status='secured';activeStreak=streak;}
  else if(diff===1){status='at-risk';activeStreak=streak;}
  else if(diff===2&&shields>0){status='shield-ready';activeStreak=streak;}
  else if(last!==null){status='restart';}
  const nextShieldAt=Math.floor(activeStreak/7)*7+7;
  return {
    streak:activeStreak,longest:best,shields,status,lastCompletedDate:last,
    todayCompleted:diff===0,daysToNextShield:nextShieldAt-activeStreak,
    nextShieldAt,shieldUsedToday:lastShieldUsed===today,
    latestMilestone,todayBonusXp,bonusXp,
    totalMilestones:allMilestones.length
  };
}
