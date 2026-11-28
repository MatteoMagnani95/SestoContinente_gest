import {testoImmagini,versioneImmagini} from '@/lib/scelte';
export default function SceltaImmagini({value,test=false,applicantMinor=false,expectedId}:{value?:boolean|null;test?:boolean;applicantMinor?:boolean;expectedId?:string|null}){
 return <div className="sc-consent-choice"><input type="hidden" name="immagini_checkbox" value="1"/><input type="hidden" name="immagini_versione_vista" value={test?'TEST-COLLAUDO-1':versioneImmagini}/>{expectedId!==undefined&&<input type="hidden" name="immagini_scelta_attesa" value={expectedId??''}/>}
 <p className="sc-consent-label">{test?'Simulazione foto e video':'Foto e video'} (facoltativo)</p>
 <label className="check-label"><input type="checkbox" name="immagini" value="si" defaultChecked={value===true}/><span>Autorizzo: {testoImmagini}</span></label>
 {applicantMinor&&<p className="sc-field-hint">Per un minorenne la scelta è espressa dal genitore o tutore che presenta la domanda. La segreteria deve verificare la rappresentanza. La scelta attuale è registrata a livello di account.</p>}<p className="sc-field-hint">La scelta non condiziona la registrazione o l’adesione. Puoi revocarla dal profilo.{value===true?' La casella mostra il consenso già registrato; puoi deselezionarla.':''}</p></div>;
}
