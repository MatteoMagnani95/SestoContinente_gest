/** Client-only helpers shared by the guard and editing components. No persistence or logging of form values. */
type Control=HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement;
export type Snapshot=Map<Control,string>;
export type DiscardRequest={form?:HTMLFormElement;container?:HTMLElement;proceed:()=>void;trigger?:HTMLElement|null};
const excluded=new Set(['hidden','submit','button','reset','image']);
export function trackedForm(form:HTMLFormElement){
 return !form.hasAttribute('data-dirty-ignore')&&(form.hasAttribute('data-dirty-form')||form.method.toLowerCase()==='post');
}
export function controls(form:HTMLFormElement):Control[]{
 return Array.from(form.elements).filter((el):el is Control=>
  (el instanceof HTMLInputElement||el instanceof HTMLSelectElement||el instanceof HTMLTextAreaElement)&&
  (!!el.name||el.hasAttribute('data-dirty-track'))&&(!(el instanceof HTMLInputElement&&excluded.has(el.type))||el.hasAttribute('data-dirty-track'))&&!el.hasAttribute('data-dirty-ignore'));
}
export function controlValue(control:Control):string{
 if(control instanceof HTMLInputElement){
  if(control.type==='checkbox'||control.type==='radio')return control.checked?'checked':'unchecked';
  if(control.type==='file')return JSON.stringify(Array.from(control.files??[]).map(f=>[f.name,f.size,f.lastModified,f.type]));
 }
 if(control instanceof HTMLSelectElement&&control.multiple)return JSON.stringify(Array.from(control.selectedOptions).map(o=>o.value));
 return control.value;
}
export function initialValue(control:Control):string{
 const explicit=control.getAttribute('data-dirty-initial');if(explicit!==null)return explicit;
 if(control instanceof HTMLInputElement){
  if(control.type==='checkbox'||control.type==='radio')return control.defaultChecked?'checked':'unchecked';
  if(control.type==='file')return '[]';
 }
 if(control instanceof HTMLSelectElement){
  const defaults=Array.from(control.options).filter(o=>o.defaultSelected);
  if(control.multiple)return JSON.stringify(defaults.map(o=>o.value));
  return defaults.length?defaults[defaults.length-1].value:control.value;
 }
 return control.defaultValue;
}
export function snapshot(form:HTMLFormElement,initial=false):Snapshot{
 return new Map(controls(form).map(control=>[control,initial?initialValue(control):controlValue(control)]));
}
export function reconcile(form:HTMLFormElement,baseline:Snapshot){
 const current=new Set(controls(form));
 for(const el of baseline.keys())if(!current.has(el))baseline.delete(el);
 for(const el of current)if(!baseline.has(el))baseline.set(el,initialValue(el));
}
export function isDirty(form:HTMLFormElement,baseline:Snapshot){
 reconcile(form,baseline);
 return Array.from(baseline).some(([el,value])=>controlValue(el)!==value);
}
export function markFormSaved(form:HTMLFormElement){
 document.dispatchEvent(new CustomEvent('sc:form-saved',{detail:form}));
}
export function requestDiscard(request:DiscardRequest){
 const event=new CustomEvent<DiscardRequest>('sc:discard-request',{detail:request,cancelable:true});
 if(document.dispatchEvent(event))request.proceed();
}
export function cancelForm(form:HTMLFormElement,trigger?:HTMLElement|null){
 const dialog=form.closest('[data-sc-panel]');
 if(dialog){dialog.dispatchEvent(new CustomEvent('sc:panel-close',{cancelable:true}));return;}
 requestDiscard({form,trigger,proceed:()=>{
  form.reset();
  const panel=form.closest('details');
  if(panel){panel.open=false;panel.querySelector('summary')?.focus();}
 }});
}
