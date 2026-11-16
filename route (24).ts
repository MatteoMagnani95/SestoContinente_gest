import {NextRequest,NextResponse} from 'next/server';
import ExcelJS from 'exceljs';
import {requireStaff} from '@/lib/security';
import {headings} from '@/lib/importazione';
export async function GET(req:NextRequest){
 await requireStaff();const tipo=req.nextUrl.searchParams.get('tipo')==='corsi'?'corsi':'soci';
 const book=new ExcelJS.Workbook(), sheet=book.addWorksheet(tipo==='soci'?'Soci storici':'Corsi storici');
 sheet.addRow(headings(tipo));sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};
 sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF174E62'}};
 for(let i=1;i<=headings(tipo).length;i++)sheet.getColumn(i).width=24;
 sheet.views=[{state:'frozen',ySplit:1}];
 const content=await book.xlsx.writeBuffer();
 return new NextResponse(Buffer.from(content),{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 'Content-Disposition':`attachment; filename="modello_${tipo}_sesto_continente.xlsx"`,'Cache-Control':'private, no-store'}});
}
