'use client';

import {useState} from 'react';
import {api} from './commerce-client';

export function HeroImageUpload({remaining,onUploaded,onBusyChange}:{remaining:number;onBusyChange:(busy:boolean)=>void;onUploaded:(images:{url:string;name:string}[])=>void}) {
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  return <label>Upload images as new slides
    <input type="file" multiple accept="image/png,image/jpeg,image/webp" disabled={busy||remaining===0} onChange={async event=>{
      const files=Array.from(event.target.files||[]);
      event.target.value='';
      if(!files.length)return;
      if(files.length>remaining){setMessage(`You can add ${remaining} more slides. Select fewer images.`);return;}
      if(files.some(file=>file.size>5*1024*1024)){setMessage('Each image must be 5 MB or smaller.');return;}
      setBusy(true);onBusyChange(true);setMessage('');
      const uploaded:{url:string;name:string}[]=[];
      const failures:string[]=[];
      try {
        for(const file of files){
          try {
            const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('Unable to read image'));reader.readAsDataURL(file);});
            const result=await api<{url:string}>('/uploads','POST',{filename:file.name,kind:'IMAGE',data});
            uploaded.push({url:result.url,name:file.name.replace(/\.[^.]+$/,'').slice(0,160)||'New collection'});
          }catch(error){failures.push(`${file.name}: ${(error as Error).message}`);}
        }
        if(uploaded.length)onUploaded(uploaded);
        setMessage(`${uploaded.length} slide(s) added. Edit their content and publish the homepage. ${failures.join(' ')}`);
      }finally{setBusy(false);onBusyChange(false);}
    }}/>
    <small role="status">{busy?'Uploading images…':message||'Select multiple PNG, JPEG or WebP images. Each image becomes a separate slide.'}</small>
  </label>;
}
