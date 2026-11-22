import assert from 'node:assert/strict';
import {gradeCrowdMatch,dailyAwards,XP_PER_TAP} from '../public/rewards.js';
function caseCheck(nearby,total,peak,expected){
 const r=gradeCrowdMatch(nearby,total,peak);
 assert.equal(r.tier,expected);
 console.log(`✓ ${expected}: ${r.score}% of crowd, ${r.alignment}% of peak`);
}
caseCheck(70,100,72,'perfect');
caseCheck(50,100,60,'great');
caseCheck(30,100,60,'good');
caseCheck(9,100,60,'wild');
caseCheck(2,100,2,'wild'); // prevents a tiny isolated cluster being called "perfect"
caseCheck(0,100,30,'wild');
assert.throws(()=>gradeCrowdMatch(101,100,101));
const sample=['perfect','great','great','good','wild'].map(tier=>({tier}));
assert.deepEqual(dailyAwards(sample,true).map(a=>a.id),['finisher','pulse','magnet']);
assert.equal(dailyAwards(sample,false).length,0);
assert.equal(XP_PER_TAP,10);
console.log('All reward-tier tests passed');
