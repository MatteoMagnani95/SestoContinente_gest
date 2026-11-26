import {defineConfig} from '@playwright/test';

const baseURL = process.env.QA_BASE_URL || 'http://127.0.0.1:3314';
if (!['127.0.0.1','localhost'].includes(new URL(baseURL).hostname)) {
  throw new Error('Il collaudo usa esclusivamente un server locale.');
}
const roles=['STAFF','SECRETARY','MEMBER','INSTRUCTOR','BOARD','APPLICANT'];
const authenticated=roles.some(role=>process.env['QA_'+role+'_STATE']);
if(authenticated){
  // Sessioni sintetiche, mai cookie o token della produzione.
  const endpoint=process.env.NEXT_PUBLIC_SUPABASE_URL;
  if(process.env.QA_ISOLATED_ENV!=='true'||!endpoint||
     !['localhost','127.0.0.1'].includes(new URL(endpoint).hostname)){
    throw new Error('Per il collaudo autenticato usare Supabase locale, QA_ISOLATED_ENV=true e sessioni sintetiche.');
  }
}
const engines = ['chromium','webkit'];
export default defineConfig({
  testDir:'tests/browser',
  workers:2,
  timeout:45000,
  reporter:'list',
  use:{baseURL},
  projects:engines.flatMap(browserName=>{
    const executablePath=process.env['QA_'+browserName.toUpperCase()+'_PATH'];
    const use={browserName,launchOptions:{executablePath}};
    const projects=[{name:browserName,testMatch:'public.spec.mjs',use}];
    if(process.env.QA_STAFF_STATE) projects.push({
      name:browserName+'-staff',testMatch:'staff.spec.mjs',
      use:{...use,storageState:process.env.QA_STAFF_STATE,viewport:{width:390,height:844}},
    });
    for(const role of ['secretary','member','instructor','board','applicant']){
      const storageState=process.env['QA_'+role.toUpperCase()+'_STATE'];
      if(storageState)projects.push({name:browserName+'-'+role,testMatch:'roles.spec.mjs',metadata:{role},use:{...use,storageState,viewport:{width:390,height:844}}});
    }
    return projects;
  }),
});
