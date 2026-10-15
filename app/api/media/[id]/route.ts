import {NextRequest,NextResponse} from 'next/server';
import {cookies} from 'next/headers';
export async function GET(req:NextRequest,ctx:{params:Promise<{id:string}>}){
 const {id}=await ctx.params;if(!/^[0-9a-f-]{36}$/i.test(id))return new NextResponse(null,{status:404});
 const jar=await cookies();const access=jar.get('barwaqt_admin_access')?.value;
 try{const response=await fetch((process.env.API_URL||'http://localhost:4000/api/v1').replace(/\/$/,'')+'/uploads/'+id+'/content',{headers:access?{Authorization:'Bearer '+access}:{},cache:'no-store',signal:AbortSignal.timeout(20000)});
 if(!response.ok)return NextResponse.json({error:{message:'File unavailable'}},{status:response.status});
 const headers=new Headers();for(const key of ['content-type','content-disposition','cache-control']){const value=response.headers.get(key);if(value)headers.set(key,value);}headers.set('X-Content-Type-Options','nosniff');return new NextResponse(response.body,{headers});
 }catch{return new NextResponse(null,{status:503});}
}
