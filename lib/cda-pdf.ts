import mammoth from 'mammoth';
import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
function compatible(text:string){return text.replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/[\u2013\u2014]/g,'-').replace(/\u2022/g,'-').replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g,'?');}
export async function convertVerbaleDocx(file:Buffer,info:{data:string;oggetto:string}){
 const result=await mammoth.extractRawText({buffer:file});
 if(!result.value.trim())throw Error('Documento vuoto o non leggibile');
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),titleFont=await pdf.embedFont(StandardFonts.HelveticaBold);
 let page=pdf.addPage([595.28,841.89]),y=796;
 const draw=(value:string,bold=false,size=10)=>{
  if(y<62){page=pdf.addPage([595.28,841.89]);y=796;}
  page.drawText(compatible(value),{x:44,y,font:bold?titleFont:font,size,color:rgb(.1,.2,.28)});y-=size+7;
 };
 draw('ASD Subacquea Sesto Continente - Verbale CdA',true,14);draw(`Seduta: ${info.data}`,true,10);draw(`Oggetto: ${info.oggetto.slice(0,90)}`,true,10);
 y-=20;
 // Trascrizione fedele dei paragrafi di testo, ma NON dell'impaginazione/tabelle Word.
 for(const paragraph of result.value.split(/\r?\n/)){
  let line='';for(const word of compatible(paragraph).split(/\s+/)){
   if((line+' '+word).length>91){draw(line);line=word;}else line=line?line+' '+word:word;
  }
  if(line)draw(line);else y-=9;
 }
 y-=16;draw('Generato dal gestionale dopo approvazione unanime.',false,8);
 draw('Questa è una trascrizione di testo; conservare il DOCX sorgente per tabelle e impaginazione.',false,8);
 return Buffer.from(await pdf.save());
}
