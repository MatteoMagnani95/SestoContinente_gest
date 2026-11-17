'use client';
import {useEffect} from 'react';
// MOD-14: recupero per form storici non ancora convertiti in componenti condivisi.
// I form di ricerca/filtri e quelli distruttivi sono esclusi; type="button" non invia mai dati.
export default function GlobalCancelButtons(){
 useEffect(()=>{
  const apply=()=>{
   document.querySelectorAll<HTMLFormElement>('form').forEach(form=>{
    if(form.dataset.hasGlobalCancel==='1'||form.querySelector('[data-cancel-form]')||[...form.querySelectorAll('a,button')].some(el=>/^(annulla(?:\s*\/\s*torna indietro)?|torna indietro)$/i.test((el.textContent??'').trim())))return;
    const submit=[...form.querySelectorAll<HTMLButtonElement>('button[type="submit"],button:not([type])')].filter(x=>!x.disabled);
    if(!submit.some(b=>/salva|crea |registra |aggiungi |invia alla segreteria|aggiorna |assegna |collega account|sostituisci/i.test(b.textContent??'')))return;
    if(submit.some(b=>/elimina|rimuovi|disiscriviti|annulla lezione|conferma annullamento|storna/i.test(b.textContent??'')))return;
    form.dataset.hasGlobalCancel='1';
    const button=document.createElement('button');button.type='button';button.className='button ghost global-cancel';button.textContent='Annulla / Torna indietro';
    button.addEventListener('click',()=>{
     const path=window.location.pathname;
     const target=path.endsWith('/nuovo')?path.slice(0,-6):
       /^\/gestionale\/soci\/[^/]+/.test(path)?'/gestionale/soci':
       /^\/gestionale\/corsi\/[^/]+/.test(path)?'/gestionale/corsi':
       path.startsWith('/area-personale')?'/area-personale':
       path.startsWith('/richiesta')?'/area-personale':path;
     window.location.assign(target);
    });
    const save=submit[submit.length-1];save.insertAdjacentElement('afterend',button);
   });
  };
  apply();const observer=new MutationObserver(apply);observer.observe(document.body,{childList:true,subtree:true});
  return ()=>observer.disconnect();
 },[]);
 return null;
}
