import { useMutation, useQuery } from '@apollo/client';
import { GET_PENDING_PROPERTIES, VERIFY_PROPERTY } from '../graphql/operations.js';

export default function Admin(){
  const user=JSON.parse(localStorage.getItem('shenest_user')||'null');
  const isAdmin=user?.role==='ADMIN';
  const {data,loading,error}=useQuery(GET_PENDING_PROPERTIES,{skip:!isAdmin});
  const [verify]=useMutation(VERIFY_PROPERTY,{refetchQueries:[GET_PENDING_PROPERTIES]});
  if(!isAdmin)return <main className="empty-page"><div><h1>Admin verification</h1><p>This page is only available to SheNest admins.</p></div></main>;
  return <main className="page section"><div className="page-heading"><p className="eyebrow">Admin</p><h1>Property verification</h1><p>Review new listings and mark the appropriate ones as verified.</p></div>{loading&&<p>Loading...</p>}{error&&<p>Could not load pending properties.</p>}<div className="dashboard-list admin-list">{(data?.pendingProperties??[]).map(property=><article className="dashboard-row" key={property.id}><img src={property.image||'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=300&q=70'} alt=""/><div><h3>{property.title}</h3><p>{property.location} · {property.type}</p></div><button className="button small" onClick={()=>verify({variables:{propertyId:property.id}})}>Verify</button></article>)}</div></main>;
}
