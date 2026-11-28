import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export type Area = 'secretariat' | 'teaching' | 'calendar' | 'equipment' | 'finance' | 'system' | 'pool' | 'event' | 'certificate' | 'documents';
type ButtonVariant = 'primary' | 'secondary' | 'danger';
const toneIcon: Record<Tone, IconName> = { success: 'check', warning: 'warning', danger: 'error', info: 'info', neutral: 'archive' };
// Speculative RSC on authenticated archives can be cancelled by document navigation in WebKit.
const privateNavigation=(href:string)=>/^(?:\?|\/(?:gestionale|gestione-eventi|area-personale|area-soci|istruttore|organi-sociali|documenti|notifiche|comunicazioni)(?:[/?#]|$))/.test(href);
const buttonClass = (variant: ButtonVariant, extra = '') => `sc-button sc-button-${variant} ${extra}`.trim();

export function Button({ variant = 'primary', icon, children, className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; icon?: IconName }) {
  return <button {...props} type={type} className={buttonClass(variant, className)}>{icon && <Icon name={icon}/>} {children}</button>;
}
export function ButtonLink({ href, children, icon, variant = 'primary', className = '' }: { href: string; children: ReactNode; icon?: IconName; variant?: ButtonVariant; className?: string }) {
  // Download endpoints are not React Server Component pages.
  if(/^\/gestionale\/(?:esporta\/|importazione\/modello(?:\?|$)|corsi\/[^/]+\/stampe(?:\?|$))/.test(href))return <a href={href} className={buttonClass(variant,className)}>{icon && <Icon name={icon}/>} {children}</a>;
  return <Link href={href} prefetch={privateNavigation(href)?false:undefined} className={buttonClass(variant, className)}>{icon && <Icon name={icon}/>} {children}</Link>;
}
export function PageHeader({ title, description, eyebrow, actions, area, icon, marine = false }: { title: string; description?: string; eyebrow?: string; actions?: ReactNode; area?: Area; icon?: IconName; marine?: boolean }) {
  return <header className={`sc-page-header${area ? ' sc-area-'+area : ''}${marine ? ' sc-page-header-marine' : ''}`}>
    <div className="sc-page-header-text">{eyebrow && <p className="eyebrow">{eyebrow}</p>}<div className="sc-heading-title">{icon && <span className="sc-heading-icon"><Icon name={icon}/></span>}<h1>{title}</h1></div>{description && <p>{description}</p>}</div>
    {actions && <div className="actions">{actions}</div>}
  </header>;
}
/** Navigation only: callers supply a real, authorized destination. */
export function QuickActionLink({href, children, icon, area='system'}:{href:string;children:ReactNode;icon:IconName;area?:Area}){
  return <Link href={href} prefetch={privateNavigation(href)?false:undefined} className={`sc-quick-action sc-area-${area}`}><Icon name={icon}/><span>{children}</span><Icon name="chevron-right"/></Link>;
}
export function SectionHeader({ title, description, actions, id }: { title: string; description?: string; actions?: ReactNode; id?: string }) {
  return <header className="sc-section-header"><div><h2 id={id}>{title}</h2>{description && <p>{description}</p>}</div>{actions && <div className="actions">{actions}</div>}</header>;
}
export function MetricCard({ label, value, icon, area = 'system', note }: { label: string; value: ReactNode; icon: IconName; area?: Area; note?: string }) {
  return <article className={`sc-card sc-metric sc-area-${area}`}><span className="sc-metric-icon"><Icon name={icon}/></span><p className="sc-metric-label">{label}</p><strong className="sc-metric-value">{value}</strong>{note && <p className="sc-metric-note">{note}</p>}</article>;
}
export function StatusBadge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`sc-status sc-tone-${tone}`}><Icon name={toneIcon[tone]}/>{children}</span>;
}
export function Alert({ tone = 'info', title, children, announce = false }: { tone?: Tone; title?: string; children: ReactNode; announce?: boolean }) {
  return <div className={`sc-alert sc-tone-${tone}`} role={announce ? (tone === 'danger' ? 'alert' : 'status') : undefined}><Icon name={toneIcon[tone]}/><div>{title && <strong>{title}</strong>}{children}</div></div>;
}
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="sc-state"><Icon name="archive"/><h3>{title}</h3>{description && <p>{description}</p>}{action}</div>;
}
export function LoadingState({ message = 'Caricamento in corso…' }: { message?: string }) {
  return <div className="sc-state" role="status"><Icon name="clock"/><p>{message}</p></div>;
}
export function ErrorState({ title = 'Dati non disponibili', description = 'Riprova tra poco.', action }: { title?: string; description?: string; action?: ReactNode }) {
  return <div className="sc-state" role="alert"><Icon name="error"/><h3>{title}</h3><p>{description}</p>{action}</div>;
}
/** Provide the render function from the same component boundary. It receives accessibility attributes for the actual control. */
export function FormField({ id, label, required = false, hint, error, children }: { id: string; label: string; required?: boolean; hint?: string; error?: string; children: (attrs: { id: string; required: boolean; 'aria-invalid'?: true; 'aria-describedby'?: string }) => ReactNode }) {
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;
  return <div className="sc-field"><label htmlFor={id}>{label}{required ? ' (obbligatorio)' : ' (facoltativo)'}</label>{children({ id, required, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}{hint && <p className="sc-field-hint" id={`${id}-hint`}>{hint}</p>}{error && <p className="sc-field-error" id={`${id}-error`}>{error}</p>}</div>;
}
export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return <fieldset className="sc-form-section"><legend>{title}</legend>{children}</fieldset>;
}
export function FormActions({ children }: { children: ReactNode }) {
  return <div className="sc-form-actions">{children}</div>;
}
