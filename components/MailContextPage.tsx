import {PageHeader,ButtonLink} from '@/components/ui/Primitives';
import {randomUUID} from 'node:crypto';
import {contextKey,contextRecipients,type MailContext} from '@/lib/email-context';
import {currentMailMode} from '@/lib/email-service';
import {validEmail} from '@/lib/email-tools';
import AssociationMailForm from './AssociationMailForm';
export default function MailContextPage({context,kind,id}:{context:MailContext;kind:'member'|'course';id:string}){
 const count=contextRecipients(context).length,missing=context.people.filter(p=>!validEmail(p.email)).length;
 return <div className="container stack"><PageHeader area={kind==='course'?'teaching':'secretariat'} icon="document" marine eyebrow={'Comunicazioni · '+(kind==='course'?'Mailing list corso':'Scheda socio')} title={context.title} actions={<ButtonLink href={context.returnUrl} variant="secondary" icon="arrow-left">Torna indietro</ButtonLink>}/>
 <section className="panel"><h2>{kind==='course'?'Iscritti e destinatari':'Destinatario'}</h2><p>{context.people.length} {kind==='course'?'iscritti confermati':'socio'} · {count} indirizzi validi unici · {missing} recapiti mancanti o non validi.</p>{missing>0&&<p className="notice warning">Chi non ha un recapito valido non riceverà la comunicazione. La segreteria può completare il campo email nell’anagrafica (per i minori usare un recapito autorizzato).</p>}
 {count>500&&<p className="notice warning">Lista superiore al limite applicativo di 500 indirizzi: invio bloccato; serve una coda dedicata.</p>}
 <div className="table-panel"><table><thead><tr><th>Cognome e nome</th><th>Email</th></tr></thead><tbody>{context.people.map(p=><tr key={p.id}><td>{p.cognome} {p.nome}</td><td>{validEmail(p.email)??'Da completare'}</td></tr>)}</tbody></table></div><p className="tiny muted">Le liste sono dinamiche: non vengono copiati gli indirizzi in un archivio parallelo. Gli indirizzi condivisi ricevono una sola copia.</p></section>
 <AssociationMailForm kind={kind} id={id} nonce={randomUUID()} fingerprint={contextKey(context)} templates={context.templates} mode={currentMailMode()} count={count}/></div>;
}
