'use client';
import {useEffect,useState,useCallback} from 'react';
import type {AccountUser} from './auth-client';
export class ApiError extends Error {constructor(message:string,public status:number){super(message);}}
export async function api<T>(path:string,method='GET',body?:unknown,key?:string):Promise<T>{const r=await fetch('/api/commerce'+path,{method,headers:{'Content-Type':'application/json',...(key?{'Idempotency-Key':key}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),cache:'no-store'});if(r.status===204)return undefined as T;const j=await r.json();if(!r.ok)throw new ApiError(j.error?.message||'Request failed',r.status);return j.data;}
export function useApi<T>(path:string|null){
 const [version,setVersion]=useState(0);
 const key=String(path)+':'+version;
 const [result,setResult]=useState<{key:string;data?:T;error:string}>();
 const reload=useCallback(()=>setVersion(v=>v+1),[]);
 useEffect(()=>{let live=true;if(!path)return;api<T>(path).then(data=>{if(live)setResult({key,data,error:''});}).catch(e=>{if(live)setResult({key,error:e.message});});return()=>{live=false;};},[path,key]);
 return {data:result?.key===key?result.data:undefined,error:result?.key===key?result.error:'',loading:!!path&&result?.key!==key,reload};
}
export type Category={id:string;name:string;slug:string;image?:string|null;parentSlug?:string|null};
export type Product={id:string;name:string;slug:string;description:string;priceMinor:number;stock:number;active:boolean;images:string[];attributes:Record<string,string>;categoryId:string;vendorId:string;category?:Category;vendor?:{id:string;name:string;city:string;zone:string;status?:string};createdAt?:string};
export type ProductPage={items:Product[];total:number;page:number;limit:number};
export type Address={id:string;kind:string;firstName:string;lastName:string;phone:string;city:string;zone:string;street:string;building:string;apartment:string;directions:string};
export type Item={productId:string;name:string;quantity:number;unitPriceMinor:number;image?:string};
export type VendorOrder={id:string;status:string;vendorId:string;riderId:string|null;totalMinor:number;items:Item[];createdAt:string;events:{status:string;createdAt:string;note?:string}[];cashReceived?:boolean;order?:{paymentMethod:string;address:Address;deliveryWindow?:{startsAt:string;endsAt:string}|null};latitude?:number;longitude?:number};
export type Vendor={id:string;ownerId:string;name:string;slug:string;description:string;businessType:string;city:string;zone:string;address:string;status:string;commissionBps:number;createdAt:string;owner?:AccountUser};
export type Report={currency:string;orders:{_sum:{totalMinor:number|null};_count:number};delivered:{_sum:{subtotalMinor:number|null;discountMinor:number|null;commissionMinor:number|null;deliveryMinor:number|null;payableMinor:number|null;codCollectedMinor:number|null};_count:number};codRemittedMinor:number;codOutstandingMinor:number;settlementsPaidMinor:number;refundsMinor:number;transfersReceivedMinor:number;platformCollectedMinor:number};
export type Shift={id:string;riderId:string;status:string;startedAt:string;endedAt:string|null;breakStartedAt:string|null;breakSeconds:number;workedSeconds:number;rider?:{id:string;firstName:string;lastName:string}};
export type AuditLog={id:string;actorId:string;action:string;entityId:string;metadata:Record<string,unknown>;createdAt:string};
export type Staff={id:string;email:string;phone:string|null;role:string;firstName:string;lastName:string;profile?:Record<string,unknown>;active:boolean;createdAt:string};
export type StaffPage={items:Staff[];total:number;page:number;limit:number};
export type Notice={id:string;title:string;body:string;readAt:string|null;createdAt:string};
export const money=(v:number)=>new Intl.NumberFormat('en-PK',{style:'currency',currency:'PKR'}).format(v/100);
export const plainMoney=(v:number)=>new Intl.NumberFormat('en-PK').format(v/100);
