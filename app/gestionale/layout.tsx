import {requireStaffForRender as requireStaff} from '@/lib/security';
/** Security boundary retained; shared presentation is in the root AppShell. */
export default async function StaffLayout({children}:{children:React.ReactNode}){
 await requireStaff();
 return <>{children}</>;
}
