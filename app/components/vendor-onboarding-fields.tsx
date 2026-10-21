'use client';

import {useState} from 'react';
import {useApi,type Category,type VendorPayout} from './commerce-client';

export function VendorCategoryField({value,onChange,required=true}:{value:string;onChange:(category:Category)=>void;required?:boolean}) {
  const categories=useApi<Category[]>('/catalog/categories');
  const [search,setSearch]=useState('');
  const selected=categories.data?.find(category=>category.id===value);
  const matches=(categories.data||[]).filter(category=>category.id===value||`${category.name} ${category.slug}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <fieldset>
    <legend>Vendor category & commission</legend>
    <label>Search categories<input type="search" placeholder="Search category name" value={search} onChange={event=>setSearch(event.target.value)}/></label>
    <label>Category<select required={required} disabled={categories.loading||!!categories.error} value={value} onChange={event=>{const category=categories.data?.find(item=>item.id===event.target.value);if(category)onChange(category);}}>
      <option value="">{categories.loading?'Loading categories…':'Select category'}</option>
      {matches.map(category=><option key={category.id} value={category.id}>{category.name} — {category.commissionBps/100}%</option>)}
    </select></label>
    {!categories.loading&&!categories.error&&!matches.length&&<p>No matching categories.</p>}
    {categories.error&&<p role="alert">{categories.error} <button type="button" onClick={categories.reload}>Retry</button></p>}
    <p role="status">{selected?`Commission: ${selected.commissionBps/100}%`:'Select a category to see its commission.'}</p>
    <p className="muted">The vendor uses this category’s commission. Category rate changes apply to future orders.</p>
  </fieldset>;
}

export function payoutDraft(value?:Partial<VendorPayout>):VendorPayout {
  return {method:value?.method||'BANK_TRANSFER',bankName:value?.bankName||'',accountTitle:value?.accountTitle||'',accountNumber:value?.accountNumber||''};
}

export function VendorPayoutFields({value,onChange}:{value:VendorPayout;onChange:(value:VendorPayout)=>void}) {
  return <fieldset><legend>Vendor payout account</legend><div className="form-grid">
    <label>Payout method<select value={value.method} onChange={event=>{const method=event.target.value as VendorPayout['method'];onChange({...value,method,bankName:method==='EASYPAISA'?'Easypaisa':method==='JAZZCASH'?'JazzCash':''});}}>
      <option value="BANK_TRANSFER">Bank account</option><option value="EASYPAISA">Easypaisa</option><option value="JAZZCASH">JazzCash</option>
    </select></label>
    <label>Account title<input required maxLength={200} autoComplete="off" value={value.accountTitle} onChange={event=>onChange({...value,accountTitle:event.target.value})}/></label>
    <label>{value.method==='BANK_TRANSFER'?'Account number / IBAN':'Wallet account number'}<input required minLength={5} maxLength={100} autoComplete="off" value={value.accountNumber} onChange={event=>onChange({...value,accountNumber:event.target.value})}/></label>
    <label>{value.method==='BANK_TRANSFER'?'Bank name':'Wallet provider'}<input required maxLength={200} readOnly={value.method!=='BANK_TRANSFER'} value={value.bankName} onChange={event=>onChange({...value,bankName:event.target.value})}/></label>
  </div></fieldset>;
}
