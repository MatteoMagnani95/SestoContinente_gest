import {applicationLegalConfig} from './application-config';
export function informativaRegistrazione(){
 if(process.env.SESTO_TEST_MODE?.trim().toLowerCase()==='true')return {test:true,url:'/registrati/informativa-test',versione:'TEST-COLLAUDO-1'};
 const cfg=applicationLegalConfig('');
 const valida=Boolean(cfg.privacyVersion&&cfg.privacyVersion!=='DA_CONFIGURARE'&&!/^TEST-/i.test(cfg.privacyVersion)&&/^https?:\/\//.test(cfg.privacyUrl));
 return {test:false,url:valida?cfg.privacyUrl:'',versione:valida?cfg.privacyVersion:''};
}
