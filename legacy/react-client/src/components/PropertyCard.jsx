import { useEffect, useState } from 'react';
import { Heart, MapPin, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api/api.js';

export default function PropertyCard({ property }) {
  const [saved, setSaved] = useState(Boolean(property.saved));
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  // Keep the heart in sync when the parent reloads the list.
  useEffect(() => { setSaved(Boolean(property.saved)); }, [property.saved]);

  // Clear the inline notice after a moment so cards do not stay noisy.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  const loggedIn = Boolean(localStorage.getItem('shenest_token'));

  async function toggleFavorite() {
    if (busy) return;
    if (!loggedIn) { setNotice('Log in to save homes.'); return; }
    setBusy(true);
    try {
      const result = await api(`/favorites/${property.id}`, { method: 'POST' });
      setSaved(result.saved);
      setNotice(result.saved ? 'Saved to favorites.' : 'Removed from favorites.');
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="property-card">
      <div className="property-image-wrap">
        <img src={property.image} alt={property.title} className="property-image" />
        <button
          className={saved ? 'heart-button saved' : 'heart-button'}
          type="button"
          onClick={toggleFavorite}
          disabled={busy}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${property.title} from favorites` : `Save ${property.title}`}
        >
          <Heart size={19} fill={saved ? 'currentColor' : 'none'} />
        </button>
        {notice && <p className="card-notice">{notice}</p>}
      </div>

      <div className="property-content">
        <div className="property-title-row">
          <h3>{property.title}</h3>
          {property.verified && <ShieldCheck size={18} aria-label="Verified" />}
        </div>
        <p className="location"><MapPin size={15} /> {property.location}</p>
        <p className="property-type">{property.type}</p>
        <div className="property-footer">
          <strong>₦{property.price.toLocaleString()}<span>/yr</span></strong>
          <Link to={`/properties/${property.id}`}>View home</Link>
        </div>
      </div>
    </article>
  );
}
