import { useEffect, useState } from 'react';
import PropertyCard from '../components/PropertyCard.jsx';
import { api } from '../api/api.js';

export default function Properties(){
 const [search,setSearch]=useState(''); const [type,setType]=useState(''); const [properties,setProperties]=useState([]); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
 useEffect(()=>{const timer=setTimeout(async()=>{try{setLoading(true);setError('');const query=new URLSearchParams();if(search.trim())query.set('search',search.trim());if(type)query.set('type',type);setProperties(await api(`/properties?${query}`));}catch(err){setError(err.message)}finally{setLoading(false)}},250);return()=>clearTimeout(timer)},[search,type]);
 return <main className="page section"><div className="page-heading"><p className="eyebrow">Find your space</p><h1>Homes that fit your life.</h1><p>Browse rooms, studios and apartments from SheNest landlords.</p></div><div className="filter-bar"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by area or property name"/><select value={type} onChange={e=>setType(e.target.value)}><option value="">All types</option><option>Studio</option><option>Apartment</option><option>Shared apartment</option></select></div>{loading&&<p className="results-count">Loading homes...</p>}{error&&<p className="results-count">{error}</p>}{!loading&&!error&&<p className="results-count">{properties.length} homes found</p>}<div className="property-grid">{properties.map(property=><PropertyCard key={property.id} property={property}/>)}</div></main>
}
