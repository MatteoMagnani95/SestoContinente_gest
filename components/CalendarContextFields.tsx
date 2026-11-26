import type {CalendarContext} from '@/lib/calendar-tools';
export default function CalendarContextFields({context}:{context:CalendarContext}){return <>
 <input type="hidden" name="origine" value="calendario"/>
 <input type="hidden" name="cal_giorno" value={context.giorno}/><input type="hidden" name="cal_vista" value={context.vista}/><input type="hidden" name="cal_piscina" value={context.piscina}/><input type="hidden" name="cal_edizione" value={context.edizione}/><input type="hidden" name="cal_annullate" value={context.annullate?'1':''}/>
 </>;}
