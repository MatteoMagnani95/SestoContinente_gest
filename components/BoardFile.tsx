'use client';
import {useState,useRef,useEffect} from 'react';
export default function BoardFile({required=false,label='Documento Word'}:{required?:boolean;label?:string}){
 const [file,setFile]=useState<File|null>(null),root=useRef<HTMLDivElement>(null);
 useEffect(()=>{const form=root.current?.closest('form');const reset=()=>setFile(null);form?.addEventListener('reset',reset);return()=>form?.removeEventListener('reset',reset);},[]);
 return <div ref={root} className="sc-field"><label>{label} (DOCX, massimo 3 MB)<input type="file" name="documento" accept=".docx" required={required} onChange={e=>{const f=e.target.files?.[0]??null;setFile(f);e.target.setCustomValidity(f&&(f.size>3000000||f.size<100||!f.name.toLowerCase().endsWith('.docx'))?'Seleziona un DOCX valido di massimo 3 MB.':'');}}/></label>{file&&<p role="status">{file.name} · {Math.ceil(file.size/1024)} KB</p>}</div>;
}
