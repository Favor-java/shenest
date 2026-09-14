import { useEffect, useState } from 'react';
import { Heart, Home, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api/api.js';

export default function Account() {
  const user = JSON.parse(localStorage.getItem('shenest_user') || 'null');
  const [favorites, setFavorites] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(Boolean(user));

  useEffect(() => {
    if (!user) return;
    Promise.all([api('/favorites'), api('/bookings/mine')])
      .then(([favoriteRows, bookingRows]) => { setFavorites(favoriteRows); setBookings(bookingRows); })
      .finally(() => setLoading(false));
  }, []);

  if (!user) return <main className="empty-page"><div><h1>Your account</h1><p>Log in to see your profile.</p><Link className="button" to="/login">Log in</Link></div></main>;

  return <main className="page section account-page">
    <div className="account-header"><div className="account-avatar"><UserRound size={30} /></div><div><p className="eyebrow">Your account</p><h1>{user.name}</h1><p>{user.email}</p><span className="role-badge">{user.role}</span></div></div>
    <div className="account-stats"><Link to="/favorites"><Heart size={20} /><strong>{loading ? '—' : favorites.length}</strong><span>Saved homes</span></Link><div><Home size={20} /><strong>{loading ? '—' : bookings.length}</strong><span>Booking requests</span></div></div>
    <section className="account-section"><h2>Your booking requests</h2>{loading ? <p>Loading...</p> : bookings.length === 0 ? <div className="empty-inline"><p>No booking requests yet.</p><Link className="button small" to="/properties">Browse homes</Link></div> : <div className="booking-list">{bookings.map(booking => <article className="booking-row" key={booking.id}><div><strong>{booking.property_title}</strong><p>{booking.location}</p>{booking.message && <small>{booking.message}</small>}</div><span className={`status status-${booking.status.toLowerCase()}`}>{booking.status}</span></article>)}</div>}</section>
    <section className="account-section"><h2>Quick links</h2><div className="quick-links"><Link to="/roommates">Roommate profile</Link><Link to="/favorites">Saved homes</Link>{user.role === 'LANDLORD' && <Link to="/landlord">Landlord dashboard</Link>}{user.role === 'ADMIN' && <Link to="/admin">Admin verification</Link>}</div></section>
  </main>;
}
