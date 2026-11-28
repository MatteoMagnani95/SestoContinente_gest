import assert from 'node:assert/strict';

export function summarizeNavigation(scenarios){
 assert.equal(scenarios.length,5,'Five navigation scenarios are required');
 const expected=[
  ['/gestionale','/gestionale/soci'],
  ['/gestionale/soci','/gestionale/corsi'],
  ['/gestionale/corsi','/gestionale/calendario-visivo'],
  ['/gestionale/calendario-visivo','/gestionale/incassi'],
  ['/gestionale/incassi','/gestionale']
 ];
 const round=n=>Math.round(n*100)/100;
 const transitions=scenarios.map((scenario,i)=>{
  assert.deepEqual([scenario.from,scenario.to],expected[i]);
  for(const key of ['baseline','candidate']){
   const m=scenario[key];
   assert.equal(m.samples,9);
   assert.ok(Number.isFinite(m.contentReadyMedianMs)&&m.contentReadyMedianMs>0,'Missing/invalid content-ready median');
   assert.ok(Number.isFinite(m.contentReadyMaxMs)&&m.contentReadyMaxMs>=m.contentReadyMedianMs,'Missing/invalid content-ready maximum');
  }
  const before=scenario.baseline.contentReadyMedianMs,after=scenario.candidate.contentReadyMedianMs;
  return {from:scenario.from,to:scenario.to,beforeMs:before,afterMs:after,reductionPct:round((1-after/before)*100),improved:after<before};
 });
 const before=transitions.reduce((sum,t)=>sum+t.beforeMs,0),after=transitions.reduce((sum,t)=>sum+t.afterMs,0);
 const reduction=(1-after/before)*100;
 return {baselineSumOfMediansMs:round(before),candidateSumOfMediansMs:round(after),reductionPct:round(reduction),improved:transitions.filter(t=>t.improved).length,minimum40Reached:reduction>=40,stretch50Reached:reduction>=50,transitions};
}
