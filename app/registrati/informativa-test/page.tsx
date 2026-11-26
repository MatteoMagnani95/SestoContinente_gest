import {notFound} from 'next/navigation';
import {informativaRegistrazione} from '@/lib/registrazione';
export default function InformativaTest(){if(!informativaRegistrazione().test)notFound();return <article className="container narrow"><h1>Informativa di prova</h1><p>TEST-COLLAUDO-1 · La registrazione simula una presa visione. Utilizza solo dati inventati.</p></article>;}
