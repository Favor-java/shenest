import { useMemo, useState } from 'react';
import PropertyCard from '../components/PropertyCard.jsx';
import { properties } from '../data/properties.js';

export default function Properties() {
  const [search, setSearch] = useState('');

  // useMemo recalculates the filtered list only when the search text changes.
  const filteredProperties = useMemo(() => {
    const text = search.toLowerCase().trim();
    if (!text) return properties;

    return properties.filter((property) =>
      `${property.title} ${property.location} ${property.type}`.toLowerCase().includes(text),
    );
  }, [search]);

  return (
    <main className="page section">
      <div className="page-heading">
        <p className="eyebrow">Find your space</p>
        <h1>Homes that fit your life.</h1>
        <p>Browse verified rooms, studios and apartments.</p>
      </div>

      <div className="filter-bar">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by area or property type"
          aria-label="Search properties"
        />
        <select aria-label="Property type" defaultValue="all">
          <option value="all">All types</option>
          <option>Studio</option>
          <option>Apartment</option>
          <option>Shared apartment</option>
        </select>
      </div>

      <p className="results-count">{filteredProperties.length} homes found</p>
      <div className="property-grid">
        {filteredProperties.map((property) => <PropertyCard key={property.id} property={property} />)}
      </div>
    </main>
  );
}
