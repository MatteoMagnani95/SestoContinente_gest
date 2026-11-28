import {PageHeader,Alert} from '@/components/ui/Primitives';
import {ConfirmDialog} from '@/components/ui/Drawer';
import EditForm from '@/components/EditForm';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireAdmin,formatDate} from '@/lib/security';
import {accountUuid} from '@/lib/admin-accounts';
import {correctPayment} from '../actions';
export default async function PaymentEdit({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{msg?:string}>}){
 const {id}=await params;const {msg}=await searchParams;const {supabase}=await requireAdmin();if(!accountUuid.test(id))notFound();
 const {data:p,error}=await supabase.from('pagamenti').select('id,persona_id,importo,data_pagamento,metodo,riferimento,note').eq('id',id).maybeSingle();if(error||!p)notFound();
 const {data:person}=await supabase.from('persone').select('cognome,nome').eq('id',p.persona_id).maybeSingle();
 return <><Link href="/gestionale/incassi">← Torna agli incassi</Link><PageHeader area="finance" icon="wallet" marine eyebrow="Amministrazione · Contabilità" title="Rettifica versamento" description={[person?.cognome,person?.nome].filter(Boolean).join(' ')+' · '+formatDate(p.data_pagamento)+' · '+Number(p.importo).toLocaleString('it-IT',{style:'currency',currency:'EUR'})}/>{msg&&<p className="notice error">Rettifica non completata. Controlla i dati; nessuna modifica parziale è stata applicata.</p>}<section className="panel calendar-danger"><h2>Rimuovi registrazione errata</h2><p>Solo per un incasso registrato per errore, non per un rimborso reale. Il sistema conserva una copia della registrazione e del movimento nel registro rettifiche, li esclude dai saldi correnti e permette di registrare il versamento corretto.</p><ConfirmDialog title="Rettifica versamento" trigger="Rettifica versamento"><EditForm action={correctPayment} className="stack"><input type="hidden" name="id" value={id}/><label>Motivazione obbligatoria<textarea name="motivo" required minLength={5} maxLength={1000} rows={4}/></label><label><input name="conferma" type="checkbox" required/> Confermo che si tratta di una registrazione errata e non di denaro da rimborsare.</label><button className="button danger" type="submit">Rimuovi</button></EditForm></ConfirmDialog></section></>;
}
