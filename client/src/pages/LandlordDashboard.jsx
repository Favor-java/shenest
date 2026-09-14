import { useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
import { GET_MY_PROPERTIES } from '../graphql/operations.js';

export default function LandlordDashboard(){
  const loggedIn=Boolean(localStorage.getItem('shenest_token'));
  const {data,loading,error}=useQuery(GET_MY_PROPERTIES,{skip:!loggedIn});
  if(!loggedIn)return <main className="empty-page"><div><h1>Landlord dashboard</h1><p>Log in to manage your listings.</p><Link className="button" to="/login">Log in</Link></div></main>;
  const properties=data?.myProperties??[];
  return <main className="page section"><div className="dashboard-heading"><div><p className="eyebrow">Landlord dashboard</p><h1>Your properties</h1><p>See your listings and whether SheNest has verified them.</p></div><Link className="button" to="/properties/new">+ Add property</Link></div>{loading&&<p>Loading...</p>}{error&&<p>Could not load your properties.</p>}<div className="dashboard-list">{properties.map(property=><article className="dashboard-row" key={property.id}><img src={property.image||'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=300&q=70'} alt=""/><div><h3>{property.title}</h3><p>{property.location} · ₦{property.price.toLocaleString()}/yr</p></div><span className={property.verified?'status verified-status':'status pending-status'}>{property.verified?'Verified':'Pending verification'}</span><Link to={`/properties/${property.id}`}>View →</Link></article>)}</div></main>;
}
