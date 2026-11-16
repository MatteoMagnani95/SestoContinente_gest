import {NextRequest,NextResponse} from 'next/server';
import {requireStaff} from '@/lib/security';
import {makeRegister} from '@/lib/pdf-registro';
export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;const tipo=req.nextUrl.searchParams.get('tipo');const lessonId=req.nextUrl.searchParams.get('lezione');
 if(!/^[a-f0-9-]{36}$/i.test(id)||!['piscina','teoria','programma'].includes(tipo??''))return new NextResponse('Richiesta non valida',{status:400});
 const {supabase}=await requireStaff();
 const {data:edition}=await supabase.from('edizioni_corsi').select('id,nome,inizio,fine').eq('id',id).maybeSingle();
 if(!edition)return new NextResponse('Non trovato',{status:404});
 let query=supabase.from('lezioni').select('id,titolo,inizio,fine').eq('edizione_id',id).is('annullata_il',null).order('inizio').limit(250);
 if(tipo!=='programma'){if(!lessonId||!/^[a-f0-9-]{36}$/i.test(lessonId))return new NextResponse('Lezione richiesta',{status:400});query=query.eq('id',lessonId);}
 const {data:lessons,error}=await query;if(error||!lessons?.length)return new NextResponse('Lezioni assenti',{status:404});
 const lessonIds=lessons.map(l=>l.id);
 const [{data:linkData},{data:students},{data:teachers}]=await Promise.all([
  supabase.from('lezione_moduli').select('lezione_id,modulo_id,ordine').in('lezione_id',lessonIds).order('ordine').limit(1000),
  supabase.from('iscrizioni_corsi').select('persona_id,stato').eq('edizione_id',id).in('stato',['iscritto','concluso']).limit(500),
  supabase.from('assegnazioni_istruttori').select('persona_id,ruolo').eq('edizione_id',id).limit(100)
 ]);
 const mid=[...new Set((linkData??[]).map(x=>x.modulo_id))];
 const pid=[...new Set([...(students??[]).map(x=>x.persona_id),...(teachers??[]).map(x=>x.persona_id)])];
 const [{data:moduli},{data:people}]=await Promise.all([
  mid.length?supabase.from('moduli_didattici').select('id,tipo,codice,titolo,descrizione').in('id',mid):Promise.resolve({data:[]}),
  pid.length?supabase.from('persone').select('id,nome,cognome').in('id',pid):Promise.resolve({data:[]})]);
 const display=(pid:string)=>{const p=people?.find(x=>x.id===pid);return p?`${p.cognome} ${p.nome}`:'Anagrafica non disponibile';};
 const lines:{text:string;large?:boolean;space?:number}[]=[{text:`Corso: ${edition.nome}`,large:true},{text:`Periodo: ${edition.inizio} - ${edition.fine}`,space:16}];
 for(const lesson of lessons){
  lines.push({text:`${lesson.inizio} - ${lesson.fine} | ${lesson.titolo}`,large:true,space:6});
  const ids=(linkData??[]).filter(x=>x.lezione_id===lesson.id).sort((a,b)=>a.ordine-b.ordine);
  for(const item of ids){const m=moduli?.find(x=>x.id===item.modulo_id);if(m)lines.push({text:`${m.tipo}: ${m.codice} - ${m.titolo}`,large:true},{text:m.descrizione,space:5});}
  if(tipo!=='programma'){
   lines.push({text:tipo==='piscina'?'REGISTRO FIRME - PISCINA':'REGISTRO FIRME - TEORIA',large:true});
   for(const student of students??[])lines.push({text:`${display(student.persona_id).padEnd(40,' ')} Firma: _______________________________________`,space:13});
   lines.push({text:'ISTRUTTORI / RELATORI',large:true});for(const t of teachers??[])lines.push({text:`${display(t.persona_id)} (${t.ruolo})   Firma: ______________________________`,space:10});
  }
  lines.push({text:'',space:22});
 }
 const bytes=await makeRegister(tipo==='programma'?'PROGRAMMA COMPLETO DEL CORSO':tipo==='piscina'?'REGISTRO PISCINA':'REGISTRO TEORIA',lines);
 return new NextResponse(bytes,{headers:{'Content-Type':'application/pdf',
  'Content-Disposition':`attachment; filename="${tipo}_${id.slice(0,8)}.pdf"`,'Cache-Control':'private, no-store'}});
}
