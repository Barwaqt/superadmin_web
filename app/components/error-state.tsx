'use client';
import Image from 'next/image';
import Link from 'next/link';

/* Raw server/proxy text that means "our side broke", not "you did something wrong". */
const technical=/internal server error|unexpected response|failed to fetch|network|econn|etimedout|timeout|gateway|service unavailable|too many requests|(^|[^0-9])(500|502|503|504)([^0-9]|$)/i;

export function ErrorState({title,message,detail,onRetry,retryLabel='Try again',homeHref='/',homeLabel='Back to dashboard',variant='screen'}:{
 title?:string;
 message?:string;
 detail?:string;
 onRetry?:()=>void;
 retryLabel?:string;
 homeHref?:string|null;
 homeLabel?:string;
 variant?:'screen'|'panel'|'inline';
}){
 const raw=(message||'').trim();
 const offline=technical.test(raw);
 const heading=title||(offline?'Something went wrong on our end':'We could not load this page');
 const copy=raw&&!offline?raw:(offline?'Our servers did not answer that request just now. This is usually temporary, so please give it another try.':'Please try again. If it keeps happening, contact the platform team.');
 if(variant==='inline')return <div className="error-state inline" role="alert"><div className="error-state-card"><span className="error-state-mark"><Image src="/logo.svg" alt="" width={40} height={26} unoptimized/></span><span className="error-state-inline-copy">{heading}</span>{onRetry&&<button type="button" className="error-state-retry" onClick={onRetry}>{retryLabel}</button>}</div></div>;
 return <div className={`error-state${variant==='panel'?' panel':''}`} role="alert" aria-live="assertive">
  <div className="error-state-card">
   <span className="error-state-mark"><Image src="/logo.svg" alt="Barwaqt" width={58} height={38} priority unoptimized/></span>
   <span className="error-state-badge">Oops</span>
   <h1>{heading}</h1>
   <p className="error-state-copy">{copy}</p>
   {detail&&<p className="error-state-detail">{detail}</p>}
   <div className="error-state-actions">
    {onRetry&&<button type="button" className="error-state-retry" onClick={onRetry}>{retryLabel}</button>}
    {homeHref&&<Link className="error-state-home" href={homeHref}>{homeLabel}</Link>}
   </div>
   <small className="error-state-hint">Still stuck? Refresh the page or try again in a minute.</small>
  </div>
 </div>;
}
