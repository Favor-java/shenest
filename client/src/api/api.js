const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// One small helper handles all requests from React to Express.
export async function api(path, options = {}) {
  const token = localStorage.getItem('shenest_token');

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Something went wrong.');
  return data;
}
