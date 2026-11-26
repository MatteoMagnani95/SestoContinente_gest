'use client';
import {cancelForm} from '@/lib/dirty-navigation';
export default function CancelEditButton(){return <button type="button" className="button ghost" data-cancel-form onClick={e=>{
 const form=e.currentTarget.closest('form');if(form)cancelForm(form,e.currentTarget);
}}>Annulla</button>;}
