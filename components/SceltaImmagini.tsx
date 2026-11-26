import {testoImmagini} from '@/lib/scelte';
export default function SceltaImmagini({value,test=false}:{value?:boolean|null;test?:boolean}){
 return <div className="sc-consent-choice"><input type="hidden" name="immagini_checkbox" value="1"/>
 <p className="sc-consent-label">{test?'Simulazione foto e video':'Foto e video'} (facoltativo)</p>
 <label className="check-label"><input type="checkbox" name="immagini" value="si" defaultChecked={value===true}/><span>Autorizzo: {testoImmagini}</span></label>
 <p className="sc-field-hint">La scelta non condiziona la registrazione o l’adesione. Puoi revocarla dal profilo.{value===true?' La casella mostra il consenso già registrato; puoi deselezionarla.':''}</p></div>;
}
