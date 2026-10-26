type Tokens = {accessToken:string;refreshToken:string;expiresIn:number};
// Shared across auth and commerce route modules in this Node process.
const state = globalThis as typeof globalThis & {barwaqtRefreshes?:Map<string,Promise<Tokens|null>>};
const pending = state.barwaqtRefreshes ??= new Map<string,Promise<Tokens|null>>();
export async function refreshSession(base:string, token:string):Promise<Tokens|null> {
 const key=base+":"+token;
 const existing=pending.get(key);if(existing)return existing;
 const operation=(async()=>{
  const response=await fetch(base+'/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refreshToken:token}),cache:'no-store',signal:AbortSignal.timeout(20000)});
  if(response.status===401||response.status===403)return null;
  if(!response.ok)throw new Error('Session service temporarily unavailable');
  return (await response.json()).data as Tokens;
 })();
 pending.set(key,operation);
 // Keep successful rotation briefly for overlapping requests carrying the old cookie.
 operation.then(()=>{setTimeout(()=>pending.delete(key),10000);},()=>{pending.delete(key);});
 return operation;
}
