import {NextRequest,NextResponse} from 'next/server';
import {requireStaff} from '@/lib/security';
import {tutteLePagine} from '@/lib/pagine';
import {readCourseChunks} from '@/lib/course-ui';
import {formatRome} from '@/lib/course-tools';
import {formatValue} from '@/lib/format';
import {makeRegister} from '@/lib/pdf-registro';
export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;const tipo=req.nextUrl.searchParams.get('tipo');const lessonId=req.nextUrl.searchParams.get('lezione');
 if(!/^[a-f0-9-]{36}$/i.test(id)||!['piscina','teoria','programma'].includes(tipo??''))return new NextResponse('Richiesta non valida',{status:400});
 const {supabase}=await requireStaff();
 const {data:edition}=await supabase.from('edizioni_corsi').select('id,nome,inizio,fine').eq('id',id).maybeSingle();
 if(!edition)return new NextResponse('Non trovato',{status:404});
 if(tipo!=='programma'&&(!lessonId||!/^[a-f0-9-]{36}$/i.test(lessonId)))return new NextResponse('Lezione richiesta',{status:400});
 const {data:lessons,error}=await tutteLePagine((da,a)=>{let q=supabase.from('lezioni').select('id,titolo,inizio,fine').eq('edizione_id',id).is('annullata_il',null);if(tipo!=='programma')q=q.eq('id',lessonId!);return q.order('inizio').order('id').range(da,a);});if(error||!lessons?.length)return new NextResponse('Lezioni assenti',{status:404});
 const lessonIds=lessons.map(l=>l.id);
 const [{data:linkData,error:linksError},{data:students,error:studentsError},{data:teachers,error:teachersError}]=await Promise.all([
  readCourseChunks(lessonIds,(ids,da,a)=>supabase.from('lezione_moduli').select('lezione_id,modulo_id,ordine').in('lezione_id',ids).order('lezione_id').order('ordine').order('modulo_id').range(da,a)),
  tutteLePagine((da,a)=>supabase.from('iscrizioni_corsi').select('persona_id,stato').eq('edizione_id',id).in('stato',['iscritto','concluso']).order('id').range(da,a)),
  tutteLePagine((da,a)=>supabase.from('assegnazioni_istruttori').select('persona_id,ruolo').eq('edizione_id',id).order('id').range(da,a))
 ]);
 if(linksError||studentsError||teachersError)return new NextResponse('Dati del registro non disponibili. Riprova.',{status:503});
 const mid=[...new Set((linkData??[]).map(x=>x.modulo_id))];
 const pid=[...new Set([...(students??[]).map(x=>x.persona_id),...(teachers??[]).map(x=>x.persona_id)])];
 const [{data:moduli,error:modulesError},{data:people,error:peopleError}]=await Promise.all([
  readCourseChunks(mid,(ids,da,a)=>supabase.from('moduli_didattici').select('id,tipo,codice,titolo,descrizione').in('id',ids).order('id').range(da,a)),
  readCourseChunks(pid,(ids,da,a)=>supabase.from('persone').select('id,nome,cognome').in('id',ids).order('id').range(da,a))]);
 if(modulesError||peopleError||moduli?.length!==mid.length||people?.length!==pid.length)return new NextResponse('Registro incompleto: dati collegati non disponibili.',{status:503});
 const display=(pid:string)=>{const p=people?.find(x=>x.id===pid);return p?`${p.cognome} ${p.nome}`:'Anagrafica non disponibile';};
 const lines:{text:string;large?:boolean;space?:number}[]=[{text:`Corso: ${edition.nome}`,large:true},{text:`Periodo: ${formatValue(edition.inizio)} - ${formatValue(edition.fine)}`,space:16}];
 for(const lesson of lessons){
  lines.push({text:`${formatRome(lesson.inizio)} - ${formatRome(lesson.fine)} | ${lesson.titolo}`,large:true,space:6});
  const ids=(linkData??[]).filter(x=>x.lezione_id===lesson.id).sort((a,b)=>a.ordine-b.ordine);
  for(const item of ids){const m=moduli?.find(x=>x.id===item.modulo_id);if(m)lines.push({text:`${m.tipo}: ${m.codice} - ${m.titolo}`,large:true},{text:m.descrizione,space:5});}
  if(tipo!=='programma'){
   lines.push({text:tipo==='piscina'?'REGISTRO FIRME - PISCINA':'REGISTRO FIRME - TEORIA',large:true});
   for(const student of [...(students??[])].sort((a,b)=>display(a.persona_id).localeCompare(display(b.persona_id),'it')))lines.push({text:`${display(student.persona_id).padEnd(40,' ')} Firma: _______________________________________`,space:13});
   lines.push({text:'ISTRUTTORI / RELATORI',large:true});for(const t of [...(teachers??[])].sort((a,b)=>display(a.persona_id).localeCompare(display(b.persona_id),'it')))lines.push({text:`${display(t.persona_id)} (${t.ruolo})   Firma: ______________________________`,space:10});
  }
  lines.push({text:'',space:22});
 }
 const bytes=await makeRegister(tipo==='programma'?'PROGRAMMA COMPLETO DEL CORSO':tipo==='piscina'?'REGISTRO PISCINA':'REGISTRO TEORIA',lines);
 return new NextResponse(bytes,{headers:{'Content-Type':'application/pdf',
  'Content-Disposition':`attachment; filename="${tipo}_${id.slice(0,8)}.pdf"`,'Cache-Control':'private, no-store'}});
}
