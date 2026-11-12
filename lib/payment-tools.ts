// Funzioni pure: validazione di importi e date prima della RPC, senza arrotondamenti impliciti.
export function validPaymentDate(value:string):boolean {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const d=new Date(`${value}T12:00:00.000Z`);
 return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;
}
export function paymentAmount(value:string):number|null {
 if(!/^\d{1,7}([.,]\d{1,2})?$/.test(value))return null;
 const normalized=value.replace(',','.');
 const cents=Math.round(Number(normalized)*100);
 return cents>0&&cents<=999999999?cents/100:null;
}
