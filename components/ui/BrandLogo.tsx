import Image from 'next/image';

/** The compact mark is cropped from the restored official dolphin-and-wave logo. */
export function BrandMark({className=''}:{className?:string}){
 return <span className={`sc-brand-mark ${className}`}><Image src="/brand/sestocontinente-mark.png" width={536} height={238} alt="" unoptimized/></span>;
}
/** Original association wordmark. A light backing preserves the original colors on dark surfaces. */
export function AssociationLogo({className=''}:{className?:string}){
 return <span className={`sc-brand-full ${className}`}><Image src="/brand/sestocontinente-logo.png" width={742} height={376} alt="SestoContinente – Corsi Subacquei F.i.p.s.a.s" unoptimized/></span>;
}
/** Informational project branding; no invented destination or participation rule. */
export function NereiaProject({compact=false}:{compact?:boolean}){
 return <aside className={`sc-nereia-project${compact?' sc-nereia-compact':''}`} aria-label="Progetto Nereia"><Image src="/brand/nereia-logo.png" width={540} height={546} alt="" unoptimized/><div>{!compact&&<span className="sc-project-label">Progetto in evidenza</span>}<strong>Nereia</strong><span>La subacquea al femminile</span></div></aside>;
}
