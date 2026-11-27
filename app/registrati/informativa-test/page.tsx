import {PageHeader} from '@/components/ui/Primitives';
import {notFound} from 'next/navigation';
import {informativaRegistrazione} from '@/lib/registrazione';
export default function InformativaTest(){if(!informativaRegistrazione().test)notFound();return <article className="container narrow"><PageHeader area="system" icon="document" marine title="Informativa di prova"/><p>TEST-COLLAUDO-1 · La registrazione simula una presa visione. Utilizza solo dati inventati.</p></article>;}
