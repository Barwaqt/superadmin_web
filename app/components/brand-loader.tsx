import Image from 'next/image';
export function BrandLoader({label='Loading…',compact=false}:{label?:string;compact?:boolean}){
 return <div className={`brand-loader${compact?' compact':''}`} role="status" aria-live="polite" aria-busy="true"><span className="brand-loader-ring"><Image src="/logo.svg" alt="" width={40} height={26} priority unoptimized/></span><span className="brand-loader-label">{label}</span></div>;
}
