'use client';
import {useEffect,useRef,useState} from 'react';
import {money,methodLabel} from '@/lib/finance-ui';
export default function PaymentReview({residuo}:{residuo:number}){
 const root=useRef<HTMLDivElement>(null),[state,setState]=useState({amount:0,date:'',method:''});
 useEffect(()=>{const form=root.current?.closest('form');if(!form)return;const refresh=()=>{const f=new FormData(form);setState({amount:Number(f.get('importo')),date:String(f.get('data_pagamento')??''),method:String(f.get('metodo')??'')});const confirmation=form.elements.namedItem('conferma');if(confirmation instanceof HTMLInputElement)confirmation.checked=false;};const change=(e:Event)=>{if((e.target as HTMLInputElement)?.name!=='conferma')refresh();};form.addEventListener('input',change);form.addEventListener('change',change);refresh();return()=>{form.removeEventListener('input',change);form.removeEventListener('change',change);};},[]);
 return <div ref={root} className="sc-card"><h3>Riepilogo prima della conferma</h3><p>Versamento: <strong>{Number.isFinite(state.amount)?money(state.amount):'Da indicare'}</strong></p><p>Residuo previsto: {Number.isFinite(state.amount)&&state.amount>0&&state.amount<=residuo?money(Math.round((residuo-state.amount)*100)/100):'Da verificare'}</p><p>Data: {state.date?state.date.split('-').reverse().join('/'):'Da indicare'} · {methodLabel(state.method)}</p><p className="tiny muted">Il saldo definitivo è verificato al salvataggio.</p></div>;
}
