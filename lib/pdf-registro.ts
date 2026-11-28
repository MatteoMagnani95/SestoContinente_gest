import {PDFDocument,StandardFonts,rgb,type PDFFont} from 'pdf-lib';
const toText=(s:string)=>s.replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/[\u2013\u2014]/g,'-').replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g,'?');
const PAGE_WIDTH=595.28,MARGIN=48;
export function wrapRegisterText(text:string,font:PDFFont,size:number,maxWidth=PAGE_WIDTH-2*MARGIN):string[]{
 const lines:string[]=[];
 const fits=(value:string)=>font.widthOfTextAtSize(value,size)<=maxWidth;
 for(const paragraph of toText(text).split(/\r\n|\r|\n/)){
  let line='';
  for(const word of paragraph.trim().split(/\s+/).filter(Boolean)){
   const combined=line?line+' '+word:word;
   if(fits(combined)){line=combined;continue;}
   if(line){lines.push(line);line='';}
   // A single unbroken word can exceed a page (e.g. a long module title).
   // Split by measured glyph width, not by an arbitrary character count.
   for(const char of word){
    if(line&&!fits(line+char)){lines.push(line);line=char;}
    else line+=char;
   }
  }
  if(line)lines.push(line);else if(!paragraph.trim())lines.push('');
 }
 return lines;
}
export async function makeRegister(title:string,lines:{text:string;large?:boolean;space?:number}[]){
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 let page=pdf.addPage([PAGE_WIDTH,841.89]),y=785;
 const write=(text:string,large:boolean)=>{
  const selected=large?bold:font,size=large?12:9;
  for(const chunk of wrapRegisterText(text,selected,size)){
   if(y<72){page=pdf.addPage([PAGE_WIDTH,841.89]);y=785;}
   if(chunk)page.drawText(chunk,{x:MARGIN,y,size,font:selected,color:rgb(.12,.17,.25)});
   y-=large?21:15;
  }
 };
 write(title,true);y-=15;
 for(const line of lines){
  if(!line.text.trim()){y-=line.space??10;continue;}
  write(line.text,line.large??false);if(line.space)y-=line.space;
 }
 return Buffer.from(await pdf.save());
}
