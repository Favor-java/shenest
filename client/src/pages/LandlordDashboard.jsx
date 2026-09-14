import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/api.js';

export default function LandlordDashboard() {
  const user = JSON.parse(localStorage.getItem('shenest_user') || 'null');
  const isLandlord = user?.role === 'LANDLORD';
  const [properties, setProperties] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(isLandlord);
  const [message, setMessage] = useState('');

  async function load() {
    const [propertyRows, bookingRows] = await Promise.all([api('/properties/mine'), api('/bookings/landlord')]);
    setProperties(propertyRows); setBookings(bookingRows); setLoading(false);
  }

  useEffect(() => { if (isLandlord) load().catch(error => { setMessage(error.message); setLoading(false); }); }, [isLandlord]);

  async function updateBooking(id, status) {
    try { await api(`/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }); setMessage(`Booking ${status.toLowerCase()}.`); await load(); }
    catch (error) { setMessage(error.message); }
  }

  if (!user) return <main className="empty-page"><div><h1>Landlord dashboard</h1><p>Log in to manage your listings.</p><Link className="button" to="/login">Log in</Link></div></main>;
  if (!isLandlord) return <main className="empty-page"><div><h1>Landlord dashboard</h1><p>This dashboard is only available to landlord accounts.</p><Link className="button" to="/account">Back to account</Link></div></main>;

  return <main className="page section"><div className="dashboard-heading"><div><p className="eyebrow">Landlord dashboard</p><h1>Your properties</h1><p>Manage listings and incoming booking requests.</p></div><Link className="button" to="/properties/new">+ Add property</Link></div>{loading && <p className="results-count">Loading dashboard...</p>}{message && <p className="form-message success-message">{message}</p>}{!loading && properties.length === 0 && <div className="empty-inline"><p>You have not listed a property yet.</p><Link className="button" to="/properties/new">Create your first listing</Link></div>}<div className="dashboard-list">{properties.map(property => <article className="dashboard-row" key={property.id}><img src={property.image || 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=300&q=70'} alt="" /><div><h3>{property.title}</h3><p>{property.location} · ₦{property.price.toLocaleString()}/yr</p></div><span className={property.verified ? 'status verified-status' : 'status pending-status'}>{property.verified ? 'Verified' : 'Pending verification'}</span><Link to={`/properties/${property.id}`}>View →</Link></article>)}</div><section className="dashboard-section"><div className="section-heading"><div><p className="eyebrow">Booking requests</p><h2>People interested in your homes</h2></div></div>{bookings.length === 0 ? <p className="empty-note">No booking requests yet.</p> : <div className="booking-list">{bookings.map(booking => <article className="booking-row" key={booking.id}><div><strong>{booking.renter_name}</strong><p>{booking.property_title} · {booking.location}</p><small>{booking.renter_email}</small>{booking.message && <blockquote>{booking.message}</blockquote>}</div><div className="booking-actions"><span className={`status status-${booking.status.toLowerCase()}`}>{booking.status}</span>{booking.status === 'PENDING' && <><button className="button small" onClick={() => updateBooking(booking.id, 'APPROVED')}>Approve</button><button className="outline-button small-action" onClick={() => updateBooking(booking.id, 'DECLINED')}>Decline</button></>}</div></article>)}</div>}</section></main>;
}
