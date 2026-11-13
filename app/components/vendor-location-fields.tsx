'use client';

import {useEffect,useState} from 'react';
import {api} from './commerce-client';

export type VendorLocation={address:string;city:string;zone:string};

export type VendorDelivery={expressDelivery:boolean;expressEtaMinutes:number|null;standardDeliveryDays:number};

// Express promises are stored in minutes; the admin picks from these windows.
const expressWindows:[number,string][]=[[30,'30 minutes'],[60,'1 hour'],[120,'2 hours'],[180,'3 hours'],[240,'4 hours'],[480,'8 hours'],[720,'12 hours'],[1440,'24 hours']];

export function VendorDeliveryFields({value,onChange}:{value:VendorDelivery;onChange:(next:VendorDelivery)=>void}) {
  const standardDays=Math.min(7,Math.max(1,value.standardDeliveryDays||7));
  return <fieldset>
    <legend>Delivery options</legend>
    <div className="form-grid">
      <label>Standard delivery<select value={standardDays} onChange={event=>onChange({...value,standardDeliveryDays:Number(event.target.value)})}>{[1,2,3,4,5,6,7].map(days=><option key={days} value={days}>Within {days} day{days===1?'':'s'}</option>)}</select></label>
      <label>Express delivery<select value={value.expressDelivery?'on':'off'} onChange={event=>onChange({...value,expressDelivery:event.target.value==='on',expressEtaMinutes:event.target.value==='on'?(value.expressEtaMinutes||120):value.expressEtaMinutes})}><option value="off">Not offered</option><option value="on">Offered</option></select></label>
      {value.expressDelivery&&<label>Express delivery time<select value={value.expressEtaMinutes||120} onChange={event=>onChange({...value,expressEtaMinutes:Number(event.target.value)})}>{expressWindows.map(([minutes,label])=><option key={minutes} value={minutes}>Within {label}</option>)}</select></label>}
    </div>
    <p className="muted" style={{marginTop:6}}>Customers pick one option at checkout. Express is only offered when every store in the basket supports it, so keep it off unless this store can commit to the time.</p>
  </fieldset>;
}

type Place={placeId:string;mainText:string;secondaryText?:string};
type PlaceDetails={formattedAddress?:string;name?:string;street?:string;city?:string;zone?:string};

const clean=(value?:string)=>value?.trim().slice(0,200)||'';

export function VendorLocationFields({value,onChange}:{value:VendorLocation;onChange:(next:VendorLocation)=>void}) {
  const [query,setQuery]=useState('');
  const [results,setResults]=useState<Place[]>([]);
  const [searching,setSearching]=useState(false);
  const [busy,setBusy]=useState('');
  const [message,setMessage]=useState('');

  // Suggest matching places as soon as the admin types, without a Search click.
  useEffect(()=>{
    const term=query.trim();
    if(term.length<3)return;
    let live=true;
    const timer=setTimeout(async()=>{
      setSearching(true);
      setMessage('');
      try{
        const places=await api<Place[]>('/maps/search?query='+encodeURIComponent(term));
        if(!live)return;
        setResults(places);
        if(!places.length)setMessage('No places found. Try a landmark, market, or area name.');
      }catch(e){if(live)setMessage((e as Error).message);}
      finally{if(live)setSearching(false);}
    },200);
    return ()=>{live=false;clearTimeout(timer);};
  },[query]);

  function apply(next:Partial<VendorLocation>,source:string){
    onChange({
      address:clean(next.address)||value.address,
      city:clean(next.city)||value.city,
      zone:clean(next.zone)||value.zone,
    });
    setResults([]);
    setQuery('');
    const missing=(['city','zone'] as const).filter(field=>!clean(next[field]));
    setMessage(`Service area filled from ${source}.${missing.length?` Confirm the ${missing.join(' and ')} field${missing.length>1?'s':''} below.`:''} Review and save.`);
  }

  async function pick(placeId:string){
    setBusy(placeId);
    setMessage('');
    try{
      const place=await api<PlaceDetails>('/maps/place-details?placeId='+encodeURIComponent(placeId));
      const next={address:place.formattedAddress||place.street||place.name,city:place.city,zone:place.zone};
      if(!next.address&&!next.city&&!next.zone)throw new Error('Google Maps returned no address for that place.');
      apply(next,'Google Maps');
    }catch(e){setMessage((e as Error).message);}
    finally{setBusy('');}
  }

  function locate(){
    if(!navigator.geolocation){setMessage('This browser does not support location detection. Search for the store area instead.');return;}
    setBusy('gps');
    setMessage('Detecting the current location…');
    navigator.geolocation.getCurrentPosition(async position=>{
      try{
        const place=await api<PlaceDetails>('/maps/reverse-geocode?lat='+position.coords.latitude+'&lng='+position.coords.longitude);
        if(!place.formattedAddress&&!place.city&&!place.zone)throw new Error('No address was found for the current location.');
        apply(place,'the current location');
      }catch(e){setMessage((e as Error).message);}
      finally{setBusy('');}
    },()=>{setBusy('');setMessage('Location permission was denied. Search for the store area instead.');},{enableHighAccuracy:true,timeout:10000});
  }

  return <fieldset>
    <legend>Service area & address</legend>
    <div className="form-grid">
      <label>Business address<input required maxLength={200} value={value.address} onChange={event=>onChange({...value,address:event.target.value})}/></label>
      <label>City<input required maxLength={200} autoComplete="address-level2" value={value.city} onChange={event=>onChange({...value,city:event.target.value})}/></label>
      <label>Zone / Area<input required maxLength={200} autoComplete="address-level3" value={value.zone} onChange={event=>onChange({...value,zone:event.target.value})}/></label>
    </div>
    <p className="muted" style={{marginTop:6}}>Type 3+ characters to see matching market, landmark or area names.</p>
    <div className="location-detect">
      <div className="location-detect-heading">
        <b>Detect from Google Maps</b>
        <button type="button" className="mini-button" disabled={!!busy} onClick={locate}>{busy==='gps'?'Detecting…':'⌖ Use current location'}</button>
      </div>
      <p className="location-detect-hint">Type an area, market, or landmark and pick a suggestion to fill the fields above, or enter the address, city, and zone manually. Customers in this city and zone see the vendor at checkout.</p>
      <div className="location-search">
        <input aria-label="Search store location" placeholder="Type an area, market, or landmark" maxLength={120} value={query} onChange={event=>setQuery(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();event.stopPropagation();const first=results[0];if(first&&!busy)void pick(first.placeId);}}}/>
      </div>
      {results.length>0&&<ul className="location-results" role="listbox" aria-label="Matching places">{results.map(place=><li key={place.placeId}><button type="button" role="option" aria-selected={false} disabled={!!busy} onClick={()=>void pick(place.placeId)}><b>{place.mainText}</b><small>{place.secondaryText}</small></button></li>)}</ul>}
      <p role="status">{searching?'Searching…':message}</p>
    </div>
  </fieldset>;
}
