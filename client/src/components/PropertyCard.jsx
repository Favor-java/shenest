import { Heart, MapPin, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PropertyCard({ property }) {
  return (
    <article className="property-card">
      <div className="property-image-wrap">
        <img src={property.image} alt={property.title} className="property-image" />
        <button className="heart-button" aria-label={`Save ${property.title}`}>
          <Heart size={19} />
        </button>
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
