import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
const toText=(s:string)=>s.replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/[\u2013\u2014]/g,'-').replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g,'?');
export async function makeRegister(title:string,lines:{text:string;large?:boolean;space?:number}[]){
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 let page=pdf.addPage([595.28,841.89]),y=785;
 const write=(text:string,large:boolean)=>{if(y<72){page=pdf.addPage([595.28,841.89]);y=785;}
  page.drawText(toText(text),{x:48,y,size:large?12:9,font:large?bold:font,color:rgb(.12,.17,.25)});y-=large?21:15;};
 write(title,true);y-=15;
 for(const line of lines){
  const original=toText(line.text);if(!original.trim()){y-=line.space??10;continue;}
  const chunks:string[]=[];let chunk='';for(const word of original.split(/\s+/)){
   if((chunk+' '+word).length>98){if(chunk)chunks.push(chunk);chunk=word;}else chunk=chunk?chunk+' '+word:word;
  }if(chunk)chunks.push(chunk);
  for(const c of chunks)write(c,line.large??false);if(line.space)y-=line.space;
 }
 return Buffer.from(await pdf.save());
}
