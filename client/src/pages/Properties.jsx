import { useState } from 'react';
import { useQuery } from '@apollo/client';
import PropertyCard from '../components/PropertyCard.jsx';
import { GET_PROPERTIES } from '../graphql/operations.js';

export default function Properties() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');

  // Apollo runs this GraphQL query and automatically gives us loading, error and data states.
  const { loading, error, data } = useQuery(GET_PROPERTIES, {
    variables: {
      search: search.trim() || null,
      type: type || null,
    },
  });

  const properties = data?.properties ?? [];

  return (
    <main className="page section">
      <div className="page-heading">
        <p className="eyebrow">Find your space</p>
        <h1>Homes that fit your life.</h1>
        <p>Browse rooms, studios and apartments from SheNest landlords.</p>
      </div>

      <div className="filter-bar">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by area or property name"
          aria-label="Search properties"
        />
        <select value={type} onChange={(event) => setType(event.target.value)} aria-label="Property type">
          <option value="">All types</option>
          <option value="Studio">Studio</option>
          <option value="Apartment">Apartment</option>
          <option value="Shared apartment">Shared apartment</option>
        </select>
      </div>

      {loading && <p className="results-count">Loading homes...</p>}
      {error && <p className="results-count">Could not load homes. Is the API running?</p>}
      {!loading && !error && <p className="results-count">{properties.length} homes found</p>}

      <div className="property-grid">
        {properties.map((property) => <PropertyCard key={property.id} property={property} />)}
      </div>
    </main>
  );
}
