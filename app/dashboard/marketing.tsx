'use client';
import {useEffect,useRef,useState} from 'react';
import {api,useApi} from '../components/commerce-client';
type Campaign={id:string;name:string;createdAt:string;messages:{id:string;phone:string;channel:string;status:string;providerId:string|null;error:string|null}[]};
export function Marketing(){
 const config=useApi<{smsConfigured:boolean;whatsappConfigured:boolean;maxRecipients:number}>('/admin/marketing/config');
 const history=useApi<Campaign[]>('/admin/marketing/campaigns');
 const [name,setName]=useState(''),[numbers,setNumbers]=useState(''),[sms,setSms]=useState(true),[whatsapp,setWhatsapp]=useState(false),[text,setText]=useState(''),[template,setTemplate]=useState(''),[header,setHeader]=useState(''),[variables,setVariables]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const request=useRef<{body:string;key:string}|null>(null);
 const reload=history.reload;
 useEffect(()=>{const timer=setInterval(reload,5000);return()=>clearInterval(timer);},[reload]);
 return <section className="panel"><h2>SMS & WhatsApp marketing</h2><p>Send SMS text or a Veevo-approved WhatsApp template to up to 100 phone numbers. Select both channels to send through both.</p>
 <p>SMS: {config.data?.smsConfigured?'Configured':'Not configured'} · WhatsApp: {config.data?.whatsappConfigured?'Configured':'Not configured'}</p>
 <form className="business-form" onSubmit={async event=>{
  event.preventDefault();setBusy(true);setMessage('');
  const body={name,recipients:numbers.split(/[\n,;]+/).map(v=>v.trim()).filter(Boolean),channels:[...(sms?['SMS']:[]),...(whatsapp?['WHATSAPP']:[])],...(sms?{smsText:text}:{}),...(whatsapp?{whatsapp:{templateId:Number(template),headerVariables:header?[header]:[],bodyVariables:variables?variables.split('\n'):[]}}:{})};
  const serialized=JSON.stringify(body);if(request.current?.body!==serialized)request.current={body:serialized,key:crypto.randomUUID()};
  try{const result=await api<Campaign>('/admin/marketing/campaigns','POST',body,request.current.key);setMessage(`Campaign queued: ${result.messages.length} messages. See status below.`);history.reload();}
  catch(error){setMessage((error as Error).message);}finally{setBusy(false);}
 }}>
 <label>Campaign name<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label>
 <fieldset><legend>Channels</legend><label><input type="checkbox" checked={sms} onChange={e=>setSms(e.target.checked)}/>SMS</label><label><input type="checkbox" checked={whatsapp} onChange={e=>setWhatsapp(e.target.checked)}/>WhatsApp</label></fieldset>
 <label>Recipient phone numbers<textarea required rows={5} value={numbers} onChange={e=>setNumbers(e.target.value)} placeholder="+923001234567 (one number per line)"/></label>
 {sms&&<label>SMS message<textarea required rows={4} maxLength={1600} value={text} onChange={e=>setText(e.target.value)}/><small>{text.length}/1600 characters. Long messages may be billed as multiple SMS.</small></label>}
 {whatsapp&&<><label>Approved WhatsApp template ID<input required type="number" min={1} step={1} value={template} onChange={e=>setTemplate(e.target.value)}/></label><label>Header text variable (optional)<input maxLength={1000} value={header} onChange={e=>setHeader(e.target.value)}/></label><label>Body variables (one per line, in template order)<textarea rows={4} value={variables} onChange={e=>setVariables(e.target.value)}/></label><p>Use a text-only template approved in your Veevo portal. The same variable values are used for every recipient.</p></>}
 <button className="primary" disabled={busy||(!sms&&!whatsapp)||(sms&&!config.data?.smsConfigured)||(whatsapp&&!config.data?.whatsappConfigured)}>{busy?'Queuing…':'Send campaign'}</button><p role="status">{message||config.error}</p>
 </form>
 <h2>Recent campaigns</h2><p>ACCEPTED means Veevo accepted the message, not confirmed delivery. UNKNOWN requires checking the Veevo portal before resending.</p>{history.error&&<p role="alert">{history.error}</p>}
 {history.data?.map(c=><details key={c.id}><summary>{c.name} · {new Date(c.createdAt).toLocaleString()} · {c.messages.filter(m=>m.status==='ACCEPTED').length}/{c.messages.length} accepted</summary><div style={{overflowX:'auto'}}><table><thead><tr><th>Recipient</th><th>Channel</th><th>Status</th><th>Provider reference / details</th></tr></thead><tbody>{c.messages.map(m=><tr key={m.id}><td>{m.phone}</td><td>{m.channel}</td><td>{m.status}</td><td>{m.error||m.providerId||'—'}</td></tr>)}</tbody></table></div></details>)}
 </section>;
}
