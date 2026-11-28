import {deleteModuleRecord} from '@/app/module-actions';
import {entityLabel} from '@/lib/module-ui';
import {ConfirmDialog} from '@/components/ui/Drawer';
import ActionForm from '@/components/ui/ActionForm';
export default function RemoveRecord({moduleKey,id,back='',label}:{moduleKey:string;id:string;back?:string;label?:string}){
 const entity=entityLabel(moduleKey),action=moduleKey==='cda_verbali'?'Rimuovi bozza':'Elimina '+entity;
 return <ConfirmDialog title={action+(label?' · '+label:'')} trigger={action}><ActionForm action={deleteModuleRecord} className="stack">
 <input type="hidden" name="modulo" value={moduleKey}/><input type="hidden" name="id" value={id}/><input type="hidden" name="back" value={back}/>
 <p>{moduleKey==='cda_verbali'?'Rimuovi la bozza dall’elenco corrente. I file e le versioni restano consultabili tra le bozze rimosse.':'L’operazione elimina soltanto '+entity+' selezionato, se consentito. I dati collegati e lo storico protetto impediscono la cancellazione.'}</p>
 <label><input type="checkbox" name="conferma" required/> Confermo l’operazione su {label??entity}</label>
 <button type="submit" className="sc-button sc-button-danger">{action}</button>
 </ActionForm></ConfirmDialog>;
}
