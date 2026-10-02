import { useEffect, useState } from 'react';
import { Search, ShieldCheck, Users, HeartHandshake } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import PropertyCard from '../components/PropertyCard.jsx';
import { api } from '../api/api.js';

export default function Home() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([api('/properties'), api('/favorites').catch(() => [])])
      .then(([propertyRows, favoriteRows]) => {
        if (!active) return;
        const savedIds = new Set((favoriteRows || []).map((row) => row.id));
        setProperties(propertyRows.map((row) => ({ ...row, saved: savedIds.has(row.id) })));
      })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  // The hero search hands off to the listings page instead of doing nothing.
  function submitSearch(event) {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/properties?search=${encodeURIComponent(query)}` : '/properties');
  }

  const featured = properties.slice(0, 3);

  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <h1>Find a place that feels like <em>home.</em></h1>
          <p>Safe accommodation, trusted listings and compatible roommates — made for women.</p>

          <form className="search-box" onSubmit={submitSearch}>
            <Search size={20} />
            <input
              aria-label="Search location"
              placeholder="Where do you want to live?"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button className="button" type="submit">Search homes</button>
          </form>

          <div className="trust-row">
            <span><ShieldCheck size={17} /> Verified listings</span>
            <span><Users size={17} /> Roommate matching</span>
            <span><HeartHandshake size={17} /> Women-focused community</span>
          </div>
        </div>

        <div className="hero-image" role="img" aria-label="Comfortable modern apartment">
          <div className="hero-note">
            <span>Verified home</span>
            <strong>Move with confidence.</strong>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <div><p className="eyebrow">Explore homes</p><h2>Places you might love</h2></div>
          <Link to="/properties">See all properties →</Link>
        </div>
        {loading && <p className="results-count">Loading homes...</p>}
        {!loading && error && <p className="results-count">{error}</p>}
        {!loading && !error && featured.length === 0 && <div className="empty-inline"><p>No homes are listed yet.</p><Link className="button" to="/properties">Browse homes</Link></div>}
        <div className="property-grid">
          {featured.map((property) => <PropertyCard key={property.id} property={property} />)}
        </div>
      </section>

      <section className="roommate-banner">
        <div>
          <p className="eyebrow">Roommate matching</p>
          <h2>Not just a room. Find your people too.</h2>
          <p>Create a simple profile and discover women looking for a home and lifestyle similar to yours.</p>
          <Link className="button" to="/roommates">Find a roommate</Link>
        </div>
        <div className="roommate-circles" aria-hidden="true"><span>AM</span><span>ZO</span><span>TA</span></div>
      </section>
    </main>
  );
}
