'use client';
import {useState} from 'react';
import Image from 'next/image';
import {api,useApi,money,type ProductPage,type Product,type Vendor} from '../components/commerce-client';
import {BrandLoader} from '../components/brand-loader';
import {ErrorState} from '../components/error-state';
const labels={PENDING:'Pending review',APPROVED:'Approved',REJECTED:'Rejected'};
export function ProductReview(){
 const [status,setStatus]=useState('PENDING');
 const [vendorId,setVendorId]=useState('');
 const [search,setSearch]=useState('');
 const [page,setPage]=useState(1);
 const [selected,setSelected]=useState<Product|null>(null);
 const [reason,setReason]=useState('');
 const [checked,setChecked]=useState(false);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const params=new URLSearchParams({page:String(page),limit:'20',search,...(status?{reviewStatus:status}:{}),...(vendorId?{vendorId}:{})});
 const list=useApi<ProductPage>('/admin/products?'+params);
 const vendors=useApi<Vendor[]>('/admin/vendors?limit=100');
 async function decide(decision:'APPROVED'|'REJECTED'){
  if(!selected)return;
  setBusy(true);setMessage('');
  try{await api('/admin/products/'+selected.id+'/review','POST',{decision,reviewVersion:selected.reviewVersion,...(decision==='REJECTED'?{reason:reason.trim()}:{})});setSelected(null);list.reload();setMessage(decision==='APPROVED'?'Product approved. Enabled products from approved stores are now published.':'Product rejected. The vendor can see your reason and resubmit.');}
  catch(e){setMessage((e as Error).message);setSelected(null);list.reload();}
  finally{setBusy(false);}
 }
 async function toggle(p:Product){setBusy(true);setMessage('');try{await api('/admin/products/'+p.id,'PATCH',{active:!p.active});setSelected(null);list.reload();setMessage(p.active?'Product unpublished.':'Approved product enabled.');}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 return <section className="panel"><div className="panel-heading"><div><h2>Product reviews</h2><p className="muted">Review the complete listing before approving it for customers.</p></div><button onClick={list.reload}>Refresh</button></div>
 <div className="filter-row"><select aria-label="Review status" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value="">All review statuses</option>{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><select aria-label="Vendor" value={vendorId} onChange={e=>{setVendorId(e.target.value);setPage(1);}}><option value="">All vendors</option>{vendors.data?.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select><input aria-label="Search products" placeholder="Search product title" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></div>
 <p role="status">{message}</p>{list.loading&&<BrandLoader label="Loading products…"/>}{list.error&&<ErrorState variant="panel" message={list.error} onRetry={list.reload}/>}{vendors.error&&<ErrorState variant="inline" message={vendors.error} onRetry={vendors.reload}/>}
 <div className="catalog">{list.data?.items.map(p=><article key={p.id}>{p.images[0]?<Image src={p.images[0]} alt={p.name} width={180} height={150} unoptimized style={{objectFit:'contain'}}/>:<p>No images supplied</p>}<h3>{p.name}</h3><p>{p.vendor?.name} · {p.category?.name}</p><p>{money(p.priceMinor)} · {p.stock} in stock</p><span className="pill">{labels[p.reviewStatus]}</span><p>{p.reviewStatus==='APPROVED'?(p.active&&p.vendor?.status==='APPROVED'?'Published':'Unpublished'):'Not published'}</p>{p.rejectionReason&&<p>Rejection reason: {p.rejectionReason}</p>}<button className="primary" onClick={()=>{setSelected(p);setReason('');setChecked(false);setMessage('');}}>{p.reviewStatus==='PENDING'?'Review product':'View details'}</button></article>)}</div>
 {!list.loading&&!list.error&&list.data?.total===0&&<p>No products match this review status.</p>}<div className="live-actions"><button disabled={page===1} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Page {page} · {list.data?.total||0} products</span><button disabled={page*20>=(list.data?.total||0)} onClick={()=>setPage(p=>p+1)}>Next</button></div>
 {selected&&<div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="review-title" style={{width:900,maxWidth:'95vw',maxHeight:'90dvh',overflow:'auto'}}><button disabled={busy} onClick={()=>setSelected(null)}>Close</button><h2 id="review-title">{selected.name}</h2><p>{labels[selected.reviewStatus]} · {selected.vendor?.name} ({selected.vendor?.status})</p><p>{selected.vendor?.city} / {selected.vendor?.zone}</p><dl className="settlement"><div><dt>Category</dt><dd>{selected.category?.name}</dd></div><div><dt>Price</dt><dd>{money(selected.priceMinor)}</dd></div><div><dt>Stock</dt><dd>{selected.stock}</dd></div><div><dt>Slug</dt><dd>{selected.slug}</dd></div><div><dt>Vendor publication setting</dt><dd>{selected.active?'Enabled':'Disabled'}</dd></div></dl>
 <h3>All product images ({selected.images.length})</h3><div style={{display:'flex',flexWrap:'wrap',gap:16}}>{selected.images.map((src,i)=><a key={src+i} href={src} target="_blank" rel="noopener noreferrer"><Image src={src} alt={`${selected.name}, image ${i+1}`} width={220} height={220} unoptimized style={{objectFit:'contain'}}/></a>)}</div>{!selected.images.length&&<p>No images supplied.</p>}
 <h3>Description</h3><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{selected.description||'No description supplied.'}</p><h3>Attributes / specifications</h3><dl>{Object.entries(selected.attributes).map(([key,value])=><div key={key}><dt><b>{key}</b></dt><dd style={{overflowWrap:'anywhere'}}>{String(value)}</dd></div>)}</dl>{!Object.keys(selected.attributes).length&&<p>No attributes supplied.</p>}{selected.rejectionReason&&<p>Rejection reason: {selected.rejectionReason}</p>}
 {selected.reviewStatus==='PENDING'?<><label><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/> I have reviewed the title, every image, description, category, price and specifications.</label><div className="live-actions"><button className="primary" disabled={busy||!checked} onClick={()=>void decide('APPROVED')}>Approve product</button></div><label>Reason for rejection<textarea minLength={3} maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Explain what the vendor needs to correct."/></label><button disabled={busy||reason.trim().length<3} onClick={()=>void decide('REJECTED')}>Reject with reason</button></>:selected.reviewStatus==='APPROVED'?<button disabled={busy} onClick={()=>void toggle(selected)}>{selected.active?'Unpublish':'Enable publication'}</button>:<p>Waiting for the vendor to correct and resubmit this product.</p>}
 </section></div>}
 </section>;
}
