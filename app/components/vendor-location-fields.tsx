'use client';

import {useEffect,useState} from 'react';
import {api} from './commerce-client';

export type VendorLocation={address:string;city:string;zone:string};

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
    if(term.length<3){setResults([]);setSearching(false);return;}
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
      {results.length>0&&<ul className="location-results" role="listbox" aria-label="Matching places">{results.map(place=><li key={place.placeId}><button type="button" role="option" disabled={!!busy} onClick={()=>void pick(place.placeId)}><b>{place.mainText}</b><small>{place.secondaryText}</small></button></li>)}</ul>}
      <p role="status">{searching?'Searching…':message}</p>
    </div>
  </fieldset>;
}
