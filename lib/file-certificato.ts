export function tipoCertificato(nome:string,mime:string,size:number){
 if(!Number.isSafeInteger(size)||size<5||size>10*1024*1024)return null;
 if(mime==='application/pdf'&&/\.pdf$/i.test(nome))return 'pdf';
 if(mime==='image/jpeg'&&/\.jpe?g$/i.test(nome))return 'jpg';
 return null;
}
export function certificatoAmmesso(bytes:Buffer,ext:'pdf'|'jpg'){
 if(ext==='jpg')return bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff&&bytes[bytes.length-2]===0xff&&bytes[bytes.length-1]===0xd9;
 return /^%PDF-\d\.\d/.test(bytes.subarray(0,8).toString('ascii'))&&bytes.subarray(-1024).includes(Buffer.from('%%EOF'));
}
