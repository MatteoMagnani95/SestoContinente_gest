'use client';
import {useRef,useState,type ReactNode,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {isCalendarDate,todayRome} from '@/lib/course-tools';
import {markFormSaved} from '@/lib/dirty-navigation';
import {createBrowserClient} from '@supabase/ssr';
import {caricaCertificato,preparaCaricamento} from '@/app/area-personale/certificato/actions';
export default function CertificateUploadForm({children,fromManagement=false}:{children:ReactNode;fromManagement?:boolean}){
 const lock=useRef(false),router=useRouter();
 const [pending,setPending]=useState(false),[error,setError]=useState('');
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(lock.current)return;
  const form=e.currentTarget,values=new FormData(form),file=values.get('file');
  if(!(file instanceof File)||file.size>10*1024*1024){setError('Seleziona un file di massimo 10 MB.');return;}
  const dal=String(values.get('rilasciato_il')??''),al=String(values.get('scade_il')??'');
  if(!isCalendarDate(dal)||!isCalendarDate(al)||al<dal||dal>todayRome()){setError('Controlla data di rilascio e scadenza.');return;}
  lock.current=true;setPending(true);setError('');
  try{
   // I file grandi raggiungono direttamente il deposito privato. La validazione resta sul server.
   if(file.size>3*1024*1024){
    const ticket=await preparaCaricamento(String(values.get('persona_id')),file.name,file.type,file.size);
    if(!ticket){setError('Formato o permessi non validi.');return;}
    const db=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const {error:uploadError}=await db.storage.from('sesto-documenti').uploadToSignedUrl(ticket.path,ticket.token,file,{contentType:file.type});
    if(uploadError){setError('Trasferimento temporaneo non confermato. Nessun certificato è stato registrato; riprova il trasferimento.');return;}
    values.delete('file');values.set('transito',ticket.path);
   }
   const result=await caricaCertificato(values);
   if(result.error){setError(result.error);return;}
   form.reset();markFormSaved(form);router.replace('/area-personale/certificato?msg=ok&persona='+encodeURIComponent(String(values.get('persona_id')))+(fromManagement?'&origine=gestionale':''));router.refresh();
  }catch{setError('Esito non confermato. Controlla i certificati caricati prima di ripetere l’invio.');}
  finally{lock.current=false;setPending(false);}
 }
 return <form data-dirty-form id="carica" className="panel stack" onSubmit={submit}><fieldset className="edit-fields" disabled={pending}>{children}</fieldset>{error&&<p role="alert">{error}</p>}{pending&&<p role="status">Caricamento in corso…</p>}</form>;
}
