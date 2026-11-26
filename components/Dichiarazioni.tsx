import {sceltaLabel,dataOra} from '@/lib/scelte';
type Dati={flag_immagini?:boolean;flag_privacy?:boolean;versione_privacy?:string;data_accettazione?:string;immagini_scelta?:boolean|null;immagini_versione?:string;immagini_il?:string};
export default function Dichiarazioni({dati:r}:{dati:Dati}){
 return <section><h3>Dichiarazioni della domanda</h3><dl><dt>Informativa sul trattamento dei dati personali</dt><dd>{r.flag_privacy?['Presa visione',r.versione_privacy,dataOra(r.data_accettazione)].filter(Boolean).join(' · '):'Non acquisito'}</dd>
 <dt>Foto e video promozionali e social</dt><dd>{[sceltaLabel(r.immagini_scelta),r.immagini_versione,dataOra(r.immagini_il)].filter(Boolean).join(' · ')}</dd>{r.flag_immagini&&r.immagini_scelta==null&&<><dt>Autorizzazione foto e video registrata nella precedente domanda</dt><dd>{['Per le finalità specificate nell’informativa dell’epoca',r.versione_privacy,dataOra(r.data_accettazione)].filter(Boolean).join(' · ')}</dd></>}</dl></section>;
}
