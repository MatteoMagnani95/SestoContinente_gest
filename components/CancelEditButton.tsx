'use client';
export default function CancelEditButton(){return <button type="button" className="button ghost" data-cancel-form onClick={e=>{
 const form=e.currentTarget.closest('form');if(!form)return;
 form.reset();form.dispatchEvent(new Event('change',{bubbles:true}));
 const details=form.closest('details');if(details)details.open=false;
}}>Annulla / Torna indietro</button>;}
