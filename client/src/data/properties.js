// Temporary sample data lets us build the interface before connecting PostgreSQL.
// Later, these properties will come from our GraphQL API.
export const properties = [
  {
    id: '1',
    title: 'Cozy Studio in Lekki',
    location: 'Lekki, Lagos',
    price: 350000,
    type: 'Studio',
    verified: true,
    image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: '2',
    title: 'Bright Room in Yaba',
    location: 'Yaba, Lagos',
    price: 220000,
    type: 'Shared apartment',
    verified: true,
    image: 'https://images.unsplash.com/photo-1560185008-b033106af5c3?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: '3',
    title: 'Modern Apartment in Ikeja',
    location: 'Ikeja, Lagos',
    price: 480000,
    type: 'Apartment',
    verified: true,
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=80',
  },
];
