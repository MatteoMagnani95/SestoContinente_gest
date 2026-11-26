export const testoImmagini="Uso di foto e video per promuovere le attività dell’associazione e per la pubblicazione sui suoi profili social ufficiali.";
export const versioneImmagini="Foto e video · 1";
export function sceltaLabel(value:boolean|null|undefined){return value===true?'Autorizzo':value===false?'Non autorizzo':'Non acquisito';}
export function dataOra(value:string|null|undefined){return value?new Date(value).toLocaleString('it-IT',{timeZone:'Europe/Rome'}):'';}
