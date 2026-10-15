"use client";
import {useState} from 'react';
import {api} from './commerce-client';
export function UploadField({onUploaded,kind='IMAGE'}:{onUploaded:(url:string)=>void;kind?:'IMAGE'|'DOCUMENT'}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 return <label>Upload {kind==='IMAGE'?'image':'PDF document'}<input type="file" disabled={busy} accept={kind==='IMAGE'?'image/png,image/jpeg,image/webp':'application/pdf'} onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;if(file.size>5*1024*1024){setMessage('Maximum file size is 5 MB.');return;}setBusy(true);setMessage('');try{const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('Unable to read file'));reader.readAsDataURL(file);});const row=await api<{url:string}>('/uploads','POST',{filename:file.name,kind,data});onUploaded(row.url);setMessage('Uploaded. Save your changes to attach this file.');}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}}/><small role="status">{busy?'Uploading…':message}</small></label>;
}
