import StaffNav from '@/components/StaffNav';
import {requireStaff} from '@/lib/security';
export default async function StaffLayout({children}:{children:React.ReactNode}){
  await requireStaff();
  return <div className="container staff-layout"><div className="staff-sidebar"><h2>Segreteria</h2><p>Gestione associativa</p><StaffNav/></div><div className="staff-content">{children}</div></div>;
}
