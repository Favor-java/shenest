import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PropertyCard from '../components/PropertyCard.jsx';
import { api } from '../api/api.js';

export default function Properties(){
 const [params,setParams]=useSearchParams();
 const [search,setSearch]=useState(params.get('search')||''); const [type,setType]=useState(''); const [properties,setProperties]=useState([]); const [loading,setLoading]=useState(true); const [error,setError]=useState('');

 // Picking up ?search= from the home page hero keeps the two screens connected.
 useEffect(()=>{setSearch(params.get('search')||'')},[params]);

 useEffect(()=>{
  let active=true;
  const timer=setTimeout(async()=>{
   try{
    setLoading(true);setError('');
    const query=new URLSearchParams();
    if(search.trim())query.set('search',search.trim());
    if(type)query.set('type',type);
    const [propertyRows,favoriteRows]=await Promise.all([api(`/properties?${query}`),api('/favorites').catch(()=>[])]);
    if(!active)return;
    const savedIds=new Set((favoriteRows||[]).map(row=>row.id));
    setProperties(propertyRows.map(row=>({...row,saved:savedIds.has(row.id)})));
   }catch(err){if(active)setError(err.message)}
   finally{if(active)setLoading(false)}
  },250);
  return()=>{active=false;clearTimeout(timer)}
 },[search,type]);

 function changeSearch(value){
  setSearch(value);
  const next=new URLSearchParams(params);
  if(value.trim())next.set('search',value.trim()); else next.delete('search');
  setParams(next,{replace:true});
 }

 return <main className="page section"><div className="page-heading"><p className="eyebrow">Find your space</p><h1>Homes that fit your life.</h1><p>Browse rooms, studios and apartments from SheNest landlords.</p></div><div className="filter-bar"><input value={search} onChange={e=>changeSearch(e.target.value)} placeholder="Search by area or property name"/><select value={type} onChange={e=>setType(e.target.value)}><option value="">All types</option><option>Studio</option><option>Apartment</option><option>Shared apartment</option></select></div>{loading&&<p className="results-count">Loading homes...</p>}{error&&<p className="results-count">{error}</p>}{!loading&&!error&&<p className="results-count">{properties.length} homes found</p>}{!loading&&!error&&properties.length===0&&<div className="empty-inline"><p>No homes match your search.</p><Link className="button" to="/properties">Clear filters</Link></div>}<div className="property-grid">{properties.map(property=><PropertyCard key={property.id} property={property}/>)}</div></main>
}
