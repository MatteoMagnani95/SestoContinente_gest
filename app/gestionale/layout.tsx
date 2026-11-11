import StaffNav from '@/components/StaffNav';
import {requireStaff} from '@/lib/security';
export default async function StaffLayout({children}:{children:React.ReactNode}){
  const {supabase,user}=await requireStaff();
  const {data:admin}=await supabase.from('ruoli_utente').select('ruolo').eq('utente_id',user.id).eq('ruolo','amministratore').maybeSingle();
  return <div className="container staff-layout"><div className="staff-sidebar"><h2>Segreteria</h2><p>Gestione associativa</p><StaffNav isAdmin={Boolean(admin)}/></div><div className="staff-content">{children}</div></div>;
}
