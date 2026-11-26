import {applicationLegalConfig} from './application-config';
export function informativaRegistrazione(){
 if(process.env.SESTO_TEST_MODE?.trim().toLowerCase()==='true')return {test:true,url:'/registrati/informativa-test',versione:'TEST-COLLAUDO-1'};
 const cfg=applicationLegalConfig('');
 let validUrl=false;try{validUrl=['https:','http:'].includes(new URL(cfg.privacyUrl).protocol);}catch{}
 const valida=Boolean(cfg.privacyVersion&&cfg.privacyVersion!=='DA_CONFIGURARE'&&!/^TEST-/i.test(cfg.privacyVersion)&&validUrl);
 return {test:false,url:valida?cfg.privacyUrl:'',versione:valida?cfg.privacyVersion:''};
}
