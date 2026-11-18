import {notFound} from 'next/navigation';
import {getCourseMail} from '@/lib/email-context';
import MailContextPage from '@/components/MailContextPage';
export default async function CourseMail({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const c=await getCourseMail(id);if(!c)notFound();return <MailContextPage context={c} kind="course" id={id}/>;
}
