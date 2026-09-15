import { Search, ShieldCheck, Users, HeartHandshake } from 'lucide-react';
import { Link } from 'react-router-dom';
import PropertyCard from '../components/PropertyCard.jsx';
import { properties } from '../data/properties.js';

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <h1>Find a place that feels like <em>home.</em></h1>
          <p>Safe accommodation, trusted listings and compatible roommates — made for women.</p>

          <form className="search-box" onSubmit={(event) => event.preventDefault()}>
            <Search size={20} />
            <input aria-label="Search location" placeholder="Where do you want to live?" />
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
        <div className="property-grid">
          {properties.map((property) => <PropertyCard key={property.id} property={property} />)}
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
