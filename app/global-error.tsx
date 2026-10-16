'use client';
import './globals.css';
import {ErrorState} from './components/error-state';

export default function GlobalError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
 return <html lang="en"><body><ErrorState title="Something went wrong on our end" detail={error.digest?`Error reference ${error.digest}`:undefined} onRetry={reset}/></body></html>;
}
