'use client';
import {ErrorState} from './components/error-state';

export default function Error({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
 return <ErrorState title="Something went wrong" detail={error.digest?`Error reference ${error.digest}`:undefined} onRetry={reset}/>;
}
