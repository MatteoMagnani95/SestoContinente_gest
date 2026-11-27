import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summarizeNavigation} from '../scripts/qa-navigation-summary.mjs';
const paths=['/gestionale','/gestionale/soci','/gestionale/corsi','/gestionale/calendario-visivo','/gestionale/incassi','/gestionale'];
const sample=(before,after)=>before.map((n,i)=>({from:paths[i],to:paths[i+1],baseline:{samples:9,contentReadyMedianMs:n,contentReadyMaxMs:n+10},candidate:{samples:9,contentReadyMedianMs:after[i],contentReadyMaxMs:after[i]+10}}));
test('navigation goal uses the ratio of sums of all five measured medians, not an unweighted mean of percentages',()=>{
 const summary=summarizeNavigation(sample([365,512.8,299.7,1060.5,583],[266.6,336.6,267.9,406.4,385.8]));
 assert.equal(summary.baselineSumOfMediansMs,2821);
 assert.equal(summary.candidateSumOfMediansMs,1663.3);
 assert.equal(summary.reductionPct,41.04);
 assert.equal(summary.improved,5);
 assert.equal(summary.minimum40Reached,true);
 assert.equal(summary.stretch50Reached,false);
});
test('navigation goal never treats missing or invalid metrics as zero',()=>{
 const data=sample([100,100,100,100,100],[50,50,50,50,50]);
 assert.equal(summarizeNavigation(data).stretch50Reached,true);
 assert.throws(()=>summarizeNavigation(data.slice(0,4)));
 assert.throws(()=>summarizeNavigation([...data].reverse()));
 data[0].candidate.contentReadyMedianMs=null;
 assert.throws(()=>summarizeNavigation(data));
});
