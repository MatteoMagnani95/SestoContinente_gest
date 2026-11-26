'use server';
import {courseDuplicate} from '@/lib/course-errors';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireStaff} from '@/lib/security';
import {modules,isModuleKey,type Field,type Module} from '@/lib/modules';
import {italianLocalToISO} from '@/lib/format';
import {identityFromForm,validaSalvataggioAnagrafica} from '@/lib/verifica-anagrafica';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const text=(f:FormData,k:string)=>String(f.get(k)??'').trim();
const errorPath=(key:string,code:string)=>`/gestionale/moduli/${encodeURIComponent(key)}?msg=${code}`;
export async function saveModuleRecord(form:FormData) {
 const key=text(form,'modulo');
 if(!isModuleKey(key)) redirect('/gestionale?msg=permessi');
 if(key==='pagamenti') redirect('/gestionale/incassi');
 const module:Module=modules[key];
 const {supabase,user}=await requireStaff();
 if(module.adminOnly){
  const {data}=await supabase.from('ruoli_utente').select('ruolo').eq('utente_id',user.id).eq('ruolo','amministratore').maybeSingle();
  if(!data) redirect('/gestionale?msg=permessi');
 }
 const id=text(form,'id');
 if(id && (!uuid.test(id)||module.appendOnly)) redirect(errorPath(key,'permessi'));
 // Le modifiche a lezioni esistenti passano dall'editor atomico di orario e corsie.
 if(key==='calendario'&&id)redirect(`/gestionale/calendario-visivo/${id}`);
 const changes:Record<string,unknown>={};
 for(const field of module.fields) {
  const raw=text(form,field.name);
  if(!id&&!raw&&((key==='edizioni'&&field.name==='direttore_id')||(key==='brevetti'&&field.name==='edizione_id')))return {field:field.name,error:'Seleziona '+field.label.toLowerCase()+'.'};
  if(field.type==='checkbox') {changes[field.name]=form.get(field.name)==='on';continue;}
  if(field.required&&!raw) return {error:'Controlla il campo '+field.label+'.',field:field.name};
  if(!raw){changes[field.name]=null;continue;}
  if(raw.length>8000) return {error:'Controlla il campo '+field.label+'.',field:field.name};
  if(field.options&&!field.options.includes(raw)) return {error:'Controlla il campo '+field.label+'.',field:field.name};
  if(field.type==='reference'&&!uuid.test(raw)) return {error:'Controlla il campo '+field.label+'.',field:field.name};
  if(field.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return {error:'Controlla il campo '+field.label+'.',field:field.name};
  if(field.type==='days'){
   const values=raw.split(',').map(x=>x.trim());
   if(values.length<1||values.length>10||values.some(x=>!/^\d{1,3}$/.test(x)))return {error:'Controlla il campo '+field.label+'.',field:field.name};
   const days=[...new Set(values.map(Number))];
   if(days.some(x=>x>365))return {error:'Controlla il campo '+field.label+'.',field:field.name};
   changes[field.name]=days.sort((a,b)=>b-a);continue;
  }
  if(field.type==='number'){
   const num=Number(raw.replace(',','.'));
   if(!Number.isFinite(num)||(field.min!==undefined&&num<field.min)||(field.step==='1'&&!Number.isInteger(num)))
    return {error:'Controlla il campo '+field.label+'.',field:field.name};
   changes[field.name]=num;continue;
  }
  if(field.type==='date'&&!/^\d{4}-\d{2}-\d{2}$/.test(raw))return {error:'Controlla il campo '+field.label+'.',field:field.name};
  if(field.type==='datetime'){
   try{changes[field.name]=italianLocalToISO(raw);}catch{return {error:'Controlla il campo '+field.label+'.',field:field.name};}
   continue;
  }
  changes[field.name]=raw;
 }
 if(key==='anagrafiche') {
  for(const fld of ['provincia_nascita','provincia_residenza']) {
   const val=String(changes[fld]??'').toUpperCase();
   if(val&&!/^[A-Z]{2}$/.test(val))redirect(errorPath(key,'dati'));
   changes[fld]=val||null;
  }
  for(const fld of ['stato_nascita','stato_residenza']){
   const val=String(changes[fld]??'');
   if(val.length>(fld==='stato_nascita'?100:15))redirect(errorPath(key,'dati'));
   changes[fld]=val?val[0].toUpperCase()+val.slice(1).toLowerCase():null;
  }
  let previous:import('@/lib/verifica-anagrafica').Identity & {codice_catastale_nascita?:unknown;cf_omocodia_verificata?:unknown;cf_override_motivo?:unknown}|null=null;
  if(id){
   const {data,error}=await supabase.from('persone').select('nome,cognome,data_nascita,luogo_nascita,provincia_nascita,stato_nascita,sesso_cf,codice_fiscale,codice_catastale_nascita,cf_omocodia_verificata,cf_override_motivo').eq('id',id).single();
   if(error||!data)redirect(errorPath(key,'database'));
   previous=data;
  }
  const check=await validaSalvataggioAnagrafica(identityFromForm(form),previous,form.get('cf_omocodia_verificata')==='on',text(form,'cf_override_motivo'));
  if(check.error)return {error:'Controlla il codice fiscale e i dati anagrafici.',field:'codice_fiscale'};
  changes.codice_catastale_nascita=check.code;
  changes.cf_omocodia_verificata=check.omocodia;
  changes.cf_override_motivo=check.reason;
  changes.codice_fiscale=String(changes.codice_fiscale??'').toUpperCase()||null;
 }
 if(key==='iscrizioni'&&!id&&changes.stato!=='iscritto')redirect(errorPath(key,'socio_non_iscrivibile'));
 if(key==='istruttori'){
  const person=String(changes.persona_id??'');
  const {data:qualified}=await supabase.from('qualifiche_istruttori').select('id').eq('persona_id',person).limit(1);
  if(!qualified?.length)redirect(errorPath(key,'vincolo'));
 }
 if(key==='adesioni'&&changes.verbale_cda_id){
  const {data:verbale}=await supabase.from('cda_verbali').select('id').eq('id',String(changes.verbale_cda_id)).eq('stato','approvato').in('tipo',['Approvazione Adesioni Soci','Misto']).maybeSingle();
  if(!verbale)redirect(errorPath(key,'vincolo'));
 }
 if(key==='addebiti'&&id){
  // Non riassegnare un debito a un altro socio/corso (anche con pagamenti esistenti).
  const {data:existing,error}=await supabase.from('addebiti_corsi').select('iscrizione_id').eq('id',id).single();
  if(error||!existing||existing.iscrizione_id!==changes.iscrizione_id)redirect(errorPath(key,'iscrizione_vincolata'));
 }
 if(key==='addebiti'&&!id){
  const {data:eligible,error}=await supabase.from('iscrizioni_corsi').select('id,edizione:edizioni_corsi!inner(stato,stagione:stagioni!inner(attiva))').eq('id',String(changes.iscrizione_id)).eq('stato','iscritto').eq('edizione.stato','attivo').eq('edizione.stagione.attiva',true).maybeSingle();
  if(error||!eligible)redirect(errorPath(key,'iscrizione_non_attiva'));
 }
 if(key==='comunicazioni'&&!id) changes.autore_id=user.id;
 let query;
 if(id){
  let update=supabase.from(module.table).update(changes).eq('id',id);
  if(key==='certificati'){
   const expected=text(form,'documento_atteso');
   if(!expected&&changes.esito_verifica==='valido')return {error:'Carica il certificato prima di validarlo.',field:'esito_verifica'};
   update=expected?update.eq('documento_id',expected):update.is('documento_id',null);
  }
  query=update.select('id').single();
 }
 else query=supabase.from(module.table).insert(changes).select('id').single();
 const {error}=await query;
 if(error) {
  if(key==='edizioni'||key==='corsi'){const dup=await courseDuplicate(supabase,module.table,changes,error);if(dup)return dup;}
  if(error.code==='P3421')return {error:'Il direttore non può essere allievo della stessa edizione.',field:key==='edizioni'?'direttore_id':'persona_id'};
  if(error.code==='P3422')return {error:'Seleziona un’edizione frequentata dall’allievo con direttore assegnato.',field:'edizione_id'};
  if(key==='certificati')return {error:'Verifica documento, stato e date del certificato.',field:'esito_verifica'};
  // 23P01: violazione del vincolo PostgreSQL EXCLUDE sull'occupazione corsie.
  // Mostrare un'indicazione comprensibile senza esporre dettagli SQL.
  if(key==='prenotazioni'&&error.code==='23P01'){
   const corsiaId=String(changes.corsia_id??'');
   const {data:corsia}=await supabase.from('corsie').select('numero').eq('id',corsiaId).maybeSingle();
   const params=new URLSearchParams({msg:'corsia_occupata'});
   if(corsia?.numero!==undefined&&corsia.numero!==null)params.set('corsia',String(corsia.numero));
   if(typeof changes.inizio==='string')params.set('inizio',changes.inizio);
   if(typeof changes.fine==='string')params.set('fine',changes.fine);
   redirect(`/gestionale/moduli/${encodeURIComponent(key)}?${params.toString()}`);
  }
  if(key==='prenotazioni'&&error.code==='23505')redirect(errorPath(key,'corsia_duplicata'));
  if(key==='iscrizioni'&&error.code==='P3413')redirect(errorPath(key,'socio_non_iscrivibile'));
  if(key==='addebiti'&&error.code==='P3412')redirect(errorPath(key,id?'iscrizione_vincolata':'iscrizione_non_attiva'));
  const constraint=['23505','23P01','23503','23514'].includes(error.code??'');
  return {error:constraint?'Controlla duplicati, date e collegamenti.':'Impossibile salvare le modifiche.'};
 }
 revalidatePath(`/gestionale/moduli/${key}`);
 revalidatePath('/gestionale');
 if(key==='iscrizioni'&&id)redirect('/gestionale/corsi/'+changes.edizione_id+'?msg=iscritto#allievi');
 redirect(id?errorPath(key,'salvato')+'&edit='+id:errorPath(key,'salvato'));
}

export async function deleteModuleRecord(form:FormData){
 const key=text(form,'modulo'),id=text(form,'id'),back=text(form,'back');
 const {supabase}=await requireStaff();
 const extra:Record<string,string>={richieste:'richieste',cda_componenti:'cda_componenti',cda_verbali:'cda_verbali',moduli_didattici:'moduli_didattici'};
 const mod:Module|undefined=isModuleKey(key)?modules[key]:undefined;
 const table=mod?.table??(Object.prototype.hasOwnProperty.call(extra,key)?extra[key]:undefined);
 if(!table||mod?.appendOnly||!uuid.test(id))redirect('/gestionale?msg=permessi');
 const path=back==='calendario'?'/gestionale/calendario-visivo':back==='soci'?'/gestionale/soci':back==='richieste'?'/gestionale/richieste':back==='organi'?'/organi-sociali':back==='cda_archivio'?'/organi-sociali/archivio':back==='didattica'?'/gestionale/programmi-didattici':back==='corsi'?'/gestionale/corsi':back==='incassi'?'/gestionale/incassi':back.startsWith('corso:')&&uuid.test(back.slice(6))?`/gestionale/corsi/${back.slice(6)}`:back.startsWith('socio:')&&uuid.test(back.slice(6))?`/gestionale/soci/${back.slice(6)}`:`/gestionale/moduli/${key}`;
 if(form.get('conferma')!=='on')redirect(`${path}?msg=elimina_conferma`);
 const {error}=key==='listino'?await supabase.from('listino_corsi').delete().eq('id',id).select('id').single():await supabase.rpc('rimuovi_record_gestionale',{p_tabella:table,p_id:id});
 revalidatePath('/', 'layout');
 redirect(`${path}?msg=${error?(['23503','P3414','P0001'].includes(error.code)?'elimina_collegati':'database'):'eliminato'}`);
}
