import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Heart, MapPin, ShieldCheck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { GET_PROPERTY, REQUEST_BOOKING, TOGGLE_FAVORITE } from '../graphql/operations.js';

export default function PropertyDetails() {
  const { id } = useParams();
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const { loading, error, data } = useQuery(GET_PROPERTY, { variables: { id } });
  const [toggleFavorite] = useMutation(TOGGLE_FAVORITE);
  const [requestBooking, bookingState] = useMutation(REQUEST_BOOKING);

  if (loading) return <main className="empty-page"><p>Loading home...</p></main>;
  if (error || !data?.property) return <main className="empty-page"><div><h1>Home not found</h1><Link to="/properties">Back to homes</Link></div></main>;

  const property = data.property;

  async function saveFavorite() {
    if (!localStorage.getItem('shenest_token')) return setNotice('Please log in before saving a home.');
    try {
      const result = await toggleFavorite({ variables: { propertyId: property.id } });
      setNotice(result.data.toggleFavorite ? 'Saved to your favorites.' : 'Removed from your favorites.');
    } catch (requestError) {
      setNotice(requestError.message);
    }
  }

  async function submitBooking(event) {
    event.preventDefault();
    if (!localStorage.getItem('shenest_token')) return setNotice('Please log in before sending a booking request.');
    try {
      await requestBooking({ variables: { propertyId: property.id, message: message || null } });
      setMessage('');
      setNotice('Booking request sent to the landlord.');
    } catch (requestError) {
      setNotice(requestError.message);
    }
  }

  return (
    <main className="details-page section">
      <Link className="back-link" to="/properties">← Back to homes</Link>
      <div className="details-layout">
        <div>
          <img className="details-image" src={property.image || 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80'} alt={property.title} />
          <div className="details-copy">
            <div className="details-title-row">
              <div><h1>{property.title}</h1><p><MapPin size={16} /> {property.location}</p></div>
              {property.verified && <span className="verified"><ShieldCheck size={17} /> Verified</span>}
            </div>
            <p className="details-description">{property.description}</p>
            <div className="details-meta"><span>{property.type}</span><strong>₦{property.price.toLocaleString()} / year</strong></div>
          </div>
        </div>

        <aside className="booking-card">
          <h2>Interested in this home?</h2>
          <p>Send a simple booking request. The landlord can review it before anything is confirmed.</p>
          <button className="outline-button full" type="button" onClick={saveFavorite}><Heart size={17} /> Save favorite</button>
          <form onSubmit={submitBooking}>
            <label>Message to landlord
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Hi, I am interested in this home..." rows="5" />
            </label>
            <button className="button full" disabled={bookingState.loading}>{bookingState.loading ? 'Sending...' : 'Request booking'}</button>
          </form>
          {notice && <p className="form-message">{notice}</p>}
        </aside>
      </div>
    </main>
  );
}
