import {testoImmagini} from '@/lib/scelte';
export default function SceltaImmagini({value,test=false}:{value?:boolean|null;test?:boolean}){
 return <fieldset><legend>{test?'Simulazione foto e video':'Foto e video'} (facoltativo)</legend><p>{testoImmagini}</p>
 <label className="check-label"><input type="radio" name="immagini" value="si" defaultChecked={value===true}/>Autorizzo</label>
 <label className="check-label"><input type="radio" name="immagini" value="no" defaultChecked={value===false}/>Non autorizzo</label>
 <small>Puoi completare l’adesione con entrambe le scelte e revocare il consenso dal profilo.</small></fieldset>;
}
