import { useEffect, useState } from 'react';
import { api } from '../api/api.js';

export default function Admin() {
  const user = JSON.parse(localStorage.getItem('shenest_user') || 'null');
  const isAdmin = user?.role === 'ADMIN';
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(isAdmin);
  const [message, setMessage] = useState('');

  async function load() {
    try { setProperties(await api('/properties/pending')); }
    catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  if (!isAdmin) return <main className="empty-page"><div><h1>Admin verification</h1><p>This page is only available to SheNest admins.</p></div></main>;

  async function verify(id) {
    try { await api(`/properties/${id}/verify`, { method: 'PATCH' }); setMessage('Property verified.'); await load(); }
    catch (error) { setMessage(error.message); }
  }

  return <main className="page section"><div className="page-heading"><p className="eyebrow">Admin</p><h1>Property verification</h1><p>Review new listings and mark appropriate ones as verified.</p></div>{message && <p className="form-message success-message">{message}</p>}{loading ? <p className="results-count">Loading pending listings...</p> : properties.length === 0 ? <div className="empty-inline"><p>Everything is up to date. There are no properties waiting for verification.</p></div> : <div className="dashboard-list admin-list">{properties.map(property => <article className="dashboard-row" key={property.id}><img src={property.image || 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=300&q=70'} alt="" /><div><h3>{property.title}</h3><p>{property.location} · {property.type}</p></div><button className="button small" onClick={() => verify(property.id)}>Verify</button></article>)}</div>}</main>;
}
