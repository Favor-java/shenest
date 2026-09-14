import { useEffect, useState } from 'react';
import { Heart, MapPin, MessageCircle, ShieldCheck, Star } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/api.js';

export default function PropertyDetails() {
  const { id } = useParams();
  const currentUser = JSON.parse(localStorage.getItem('shenest_user') || 'null');
  const [property, setProperty] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [review, setReview] = useState({ rating: '5', comment: '' });

  useEffect(() => {
    Promise.all([api(`/properties/${id}`), api(`/reviews/${id}`)])
      .then(([propertyData, reviewData]) => { setProperty(propertyData); setReviews(reviewData); })
      .catch(error => setNotice(error.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <main className="empty-page"><p>Loading home...</p></main>;
  if (!property) return <main className="empty-page"><div><h1>Home not found</h1><Link to="/properties">Back to homes</Link></div></main>;

  async function saveFavorite() {
    try {
      const result = await api(`/favorites/${id}`, { method: 'POST' });
      setNotice(result.saved ? 'Saved to your favorites.' : 'Removed from favorites.');
    } catch (error) { setNotice(error.message); }
  }

  async function submitBooking(event) {
    event.preventDefault();
    try {
      await api('/bookings', { method: 'POST', body: JSON.stringify({ propertyId: Number(id), message: message || null }) });
      setMessage('');
      setNotice('Booking request sent.');
    } catch (error) { setNotice(error.message); }
  }

  async function submitReview(event) {
    event.preventDefault();
    try {
      const item = await api(`/reviews/${id}`, { method: 'POST', body: JSON.stringify({ rating: Number(review.rating), comment: review.comment || null }) });
      setReviews([item, ...reviews]);
      setReview({ rating: '5', comment: '' });
      setNotice('Thanks for your review.');
    } catch (error) { setNotice(error.message); }
  }

  const isOwner = currentUser && Number(currentUser.id) === Number(property.owner_id);

  return <main className="details-page section">
    <Link className="back-link" to="/properties">← Back to homes</Link>
    <div className="details-layout">
      <div>
        <img className="details-image" src={property.image || 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80'} alt={property.title} />
        <div className="details-copy">
          <div className="details-title-row"><div><h1>{property.title}</h1><p><MapPin size={16} />{property.location}</p></div>{Boolean(property.verified) && <span className="verified"><ShieldCheck size={17} />Verified</span>}</div>
          <p className="details-description">{property.description}</p>
          <div className="details-meta"><span>{property.type}</span><strong>₦{property.price.toLocaleString()} / year</strong></div>
        </div>
        <section className="reviews-section"><h2>Reviews</h2><form className="review-form" onSubmit={submitReview}><select value={review.rating} onChange={e => setReview({ ...review, rating: e.target.value })}>{[5,4,3,2,1].map(n => <option key={n} value={n}>{n} stars</option>)}</select><input value={review.comment} onChange={e => setReview({ ...review, comment: e.target.value })} placeholder="Share your experience" /><button className="button small">Post</button></form><div className="review-list">{reviews.length === 0 ? <p>No reviews yet.</p> : reviews.map(item => <article key={item.id}><span><Star size={15} /> {item.rating}/5</span><p>{item.comment || 'No written comment.'}</p></article>)}</div></section>
      </div>
      <aside className="booking-card"><h2>Interested in this home?</h2><p>Save it, contact the landlord, or send a booking request.</p>{!isOwner && <><button className="outline-button full" onClick={saveFavorite}><Heart size={17} />Save favorite</button><Link className="outline-button full" to={`/messages/${property.owner_id}`}><MessageCircle size={17} />Message landlord</Link><form onSubmit={submitBooking}><label>Booking message<textarea value={message} onChange={e => setMessage(e.target.value)} rows="5" placeholder="Hi, I am interested in this home..." /></label><button className="button full">Request booking</button></form></>}{isOwner && <p className="owner-note">This is your property listing.</p>}{notice && <p className="form-message">{notice}</p>}</aside>
    </div>
  </main>;
}
