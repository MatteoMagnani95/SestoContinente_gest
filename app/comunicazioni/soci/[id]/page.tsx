import {notFound} from 'next/navigation';
import {getMemberMail} from '@/lib/email-context';
import MailContextPage from '@/components/MailContextPage';
export default async function MemberMail({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const c=await getMemberMail(id);if(!c)notFound();return <MailContextPage context={c} kind="member" id={id}/>;
}
