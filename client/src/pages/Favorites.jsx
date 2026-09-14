import { useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
import PropertyCard from '../components/PropertyCard.jsx';
import { GET_FAVORITES } from '../graphql/operations.js';

export default function Favorites() {
  const loggedIn = Boolean(localStorage.getItem('shenest_token'));
  const { loading, error, data } = useQuery(GET_FAVORITES, { skip: !loggedIn });

  if (!loggedIn) {
    return <main className="empty-page"><div><h1>Your saved homes</h1><p>Log in to save properties and see them here.</p><Link className="button" to="/login">Log in</Link></div></main>;
  }

  if (loading) return <main className="empty-page"><p>Loading favorites...</p></main>;
  if (error) return <main className="empty-page"><p>Could not load your favorites.</p></main>;

  const favorites = data?.myFavorites ?? [];

  return (
    <main className="page section">
      <div className="page-heading"><p className="eyebrow">Saved for later</p><h1>Your favorite homes</h1><p>Keep the places you like in one simple list.</p></div>
      {favorites.length === 0 ? (
        <div className="empty-inline"><p>You have not saved a home yet.</p><Link className="button" to="/properties">Browse homes</Link></div>
      ) : (
        <div className="property-grid favorites-grid">{favorites.map((property) => <PropertyCard key={property.id} property={property} />)}</div>
      )}
    </main>
  );
}
