import type { SVGProps } from 'react';

export type IconName = 'users' | 'clipboard' | 'course' | 'equipment' | 'certificate' | 'calendar' | 'check' | 'warning' | 'error' | 'info' | 'archive' | 'search' | 'arrow-left' | 'plus' | 'clock' | 'document' | 'home' | 'menu' | 'close' | 'chevron-down' | 'chevron-right' | 'user' | 'bell' | 'settings' | 'wallet' | 'logout' | 'ara' | 'apnea' | 'nuoto' | 'gav' | 'regulator' | 'wetsuit' | 'computer' | 'file-pdf' | 'file-image' | 'file-sheet' | 'file-word' | 'lock';

const shapes: Record<IconName, React.ReactNode> = {
  gav: <><path d="M4 3h4l2 6h4l2-6h4v17h-6l-2-5-2 5H4Z"/><path d="M7 12h3m4 0h3"/></>,
  regulator: <><circle cx="9" cy="12" r="5"/><path d="M14 12h3a4 4 0 0 0 4-4V3M7 12h4M9 10v4"/></>,
  wetsuit: <path d="m8 3-5 5 3 4 2-2v5l-2 6h5l1-5 1 5h5l-2-6v-5l2 2 3-4-5-5Z"/>,
  computer: <><rect x="4" y="5" width="16" height="14" rx="3"/><rect x="7" y="8" width="10" height="6" rx="1"/><path d="M9 16h6"/></>,
  'file-pdf': <><path d="M5 3h9l5 5v13H5V3Zm9 0v6h5"/><path d="m8 17 2-5 2 5 2-3 2 3"/></>,
  'file-image': <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="2"/><path d="m3 17 5-5 4 4 4-5 5 6"/></>,
  'file-sheet': <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 3v18"/></>,
  'file-word': <><path d="M5 3h9l5 5v13H5V3Zm9 0v6h5"/><path d="m8 12 2 5 2-4 2 4 2-5"/></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>,
  ara: <><path d="M3 9c0-2 2-3 4-3h10c2 0 4 1 4 3v5c0 3-4 4-6 2l-2-2a1.4 1.4 0 0 0-2 0l-2 2c-2 2-6 1-6-2Z"/><path d="M3 9H1v5h2m18-5h2v5h-2"/></>,
  apnea: <><path d="m4 18 2-11 3-4 3 2-2 5-2 11Zm9 0 2-11 3-4 3 2-2 5-2 11Z"/><path d="m6 11 4 1m5-1 4 1"/></>,
  nuoto: <><path d="M2 14c3 0 3-3 6-3s3 3 6 3 3-3 8-3M2 20c3 0 3-3 6-3s3 3 6 3 3-3 8-3"/><circle cx="17" cy="5" r="3"/><path d="m6 10 5-6 4 5"/></>,
  home: <><path d="m3 10 9-7 9 7v11H3Z"/><path d="M9 21v-8h6v8"/></>,
  menu: <path d="M3 5h18M3 12h18M3 19h18"/>,
  close: <path d="m5 5 14 14M19 5 5 19"/>,
  'chevron-down': <path d="m6 9 6 6 6-6"/>,
  'chevron-right': <path d="m9 6 6 6-6 6"/>,
  user: <><circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>,
  bell: <><path d="M5 9a7 7 0 0 1 14 0v5l2 3H3l2-3ZM10 21h4"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="m12 2 2 3 4 1 3 4-1 4-3 4-4 1-3-2-4-1-3-4 1-4 3-4 4-1Z"/></>,
  wallet: <><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 8h18M16 12h5v5h-5z"/></>,
  logout: <><path d="M10 3H4v18h6M10 12h11m-4-4 4 4-4 4"/></>,
  users: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M21 20v-2a6 6 0 0 0-4-5"/></>,
  clipboard: <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h4"/></>,
  course: <><path d="m2 9 10-5 10 5-10 5-10-5ZM6 11v6c4 3 8 3 12 0v-6M22 9v7"/></>,
  equipment: <><rect x="8" y="5" width="8" height="17" rx="3"/><path d="M10 5V2h4v3M8 10h8M11 2V1M16 8h3v6"/></>,
  certificate: <><rect x="4" y="3" width="16" height="14" rx="2"/><path d="M8 7h8M8 10h4M10 17v5l2-2 2 2v-5"/><circle cx="12" cy="15" r="2"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 15h2M14 15h2"/></>,
  check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>,
  warning: <><path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5M12 17h.01"/></>,
  error: <><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>,
  archive: <><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v12h14V8M10 12h4"/></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  'arrow-left': <path d="m12 5-7 7 7 7M5 12h15"/>,
  plus: <path d="M12 5v14M5 12h14"/>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  document: <><path d="M5 3h9l5 5v13H5V3ZM14 3v6h5M8 13h8M8 17h8"/></>,
};
export function Icon({ name, className = '', ...props }: { name: IconName; className?: string } & Omit<SVGProps<SVGSVGElement>, 'name' | 'children'>) {
  return <svg {...props} className={`sc-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{shapes[name]}</svg>;
}
