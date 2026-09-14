import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Link, useNavigate } from 'react-router-dom';
import { CREATE_PROPERTY, GET_PROPERTIES } from '../graphql/operations.js';

const emptyForm = { title: '', description: '', location: '', price: '', type: 'Studio', image: '' };

export default function CreateProperty() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [createProperty, { loading }] = useMutation(CREATE_PROPERTY, { refetchQueries: [GET_PROPERTIES] });

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!localStorage.getItem('shenest_token')) return setMessage('Please log in before listing a property.');

    try {
      const result = await createProperty({
        variables: {
          ...form,
          price: Number(form.price),
          image: form.image || null,
        },
      });
      navigate(`/properties/${result.data.createProperty.id}`);
    } catch (requestError) {
      setMessage(requestError.message);
    }
  }

  return (
    <main className="form-page section">
      <Link className="back-link" to="/properties">← Back to homes</Link>
      <div className="form-heading"><p className="eyebrow">Landlord tools</p><h1>List a property</h1><p>Keep it simple. Add the important details and an admin can verify the listing later.</p></div>
      <form className="listing-form" onSubmit={handleSubmit}>
        <label>Property title<input name="title" value={form.title} onChange={updateField} placeholder="Cozy studio in Lekki" required /></label>
        <label>Location<input name="location" value={form.location} onChange={updateField} placeholder="Lekki, Lagos" required /></label>
        <div className="form-row">
          <label>Yearly price (₦)<input name="price" value={form.price} onChange={updateField} type="number" min="1" placeholder="350000" required /></label>
          <label>Property type<select name="type" value={form.type} onChange={updateField}><option>Studio</option><option>Apartment</option><option>Shared apartment</option></select></label>
        </div>
        <label>Image URL<input name="image" value={form.image} onChange={updateField} type="url" placeholder="https://..." /></label>
        <label>Description<textarea name="description" value={form.description} onChange={updateField} rows="6" placeholder="Tell renters what makes this home comfortable..." required /></label>
        {message && <p className="form-message">{message}</p>}
        <button className="button" disabled={loading}>{loading ? 'Creating listing...' : 'Create listing'}</button>
      </form>
    </main>
  );
}
