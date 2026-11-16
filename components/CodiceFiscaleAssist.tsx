'use client';
import {generaCF} from '@/lib/codice-fiscale';
export default function CodiceFiscaleAssist(){return <button className="button ghost" type="button" onClick={e=>{
 const form=e.currentTarget.closest('form');if(!form)return;
 const v=(name:string)=>String((form.elements.namedItem(name) as HTMLInputElement|null)?.value??'').trim();
 try{
  const result=generaCF({nome:v('nome'),cognome:v('cognome'),data_nascita:v('data_nascita'),sesso_cf:v('sesso_cf'),codice_catastale_nascita:v('codice_catastale_nascita')});
  const input=form.elements.namedItem('codice_fiscale') as HTMLInputElement|null;
  if(input){input.value=result;input.dispatchEvent(new Event('input',{bubbles:true}));}
 }catch(error){window.alert(error instanceof Error?error.message:'Dati per CF incompleti');}
 }}>Genera CF</button>}
