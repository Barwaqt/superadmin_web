'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {authRequest,type AccountUser} from './auth-client';
import {BrandLoader} from './brand-loader';
const Context=createContext<AccountUser|null>(null);
export const useAdminUser=()=>useContext(Context);
export default function AdminSession({children}:{children:React.ReactNode}){const [user,setUser]=useState<AccountUser|null>(null);const router=useRouter();useEffect(()=>{let active=true;authRequest<AccountUser>('me').then(user=>{if(user.role!=='ADMIN')throw new Error('Administrator account required');if(active)setUser(user);}).catch(()=>router.replace('/'));return()=>{active=false;};},[router]);return user?<Context.Provider value={user}>{children}</Context.Provider>:<BrandLoader label="Checking your administrator account…"/>;}
