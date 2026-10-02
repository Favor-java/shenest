import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/api.js';

const emptyForm = { title: '', description: '', location: '', price: '', type: 'Studio' };

export default function CreateProperty() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('shenest_user') || 'null');
  const [form, setForm] = useState(emptyForm);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user) return <main className="empty-page"><div><h1>List a property</h1><p>Log in with a landlord account to create a listing.</p><Link className="button" to="/login">Log in</Link></div></main>;
  if (user.role !== 'LANDLORD') return <main className="empty-page"><div><h1>Landlord feature</h1><p>Property listings can only be created from a landlord account.</p><Link className="button" to="/properties">Browse homes</Link></div></main>;

  function updateField(event) { setForm({ ...form, [event.target.name]: event.target.value }); }
  function chooseImage(event) { const file = event.target.files?.[0] || null; setImage(file); setPreview(file ? URL.createObjectURL(file) : ''); }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true); setMessage('');
    try {
      let imageUrl = null;
      if (image) { const formData = new FormData(); formData.append('image', image); const upload = await api('/uploads/property-image', { method: 'POST', body: formData }); imageUrl = upload.url; }
      const property = await api('/properties', { method: 'POST', body: JSON.stringify({ ...form, price: Number(form.price), image: imageUrl }) });
      navigate(`/properties/${property.id}`);
    } catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  }

  return <main className="form-page section"><Link className="back-link" to="/landlord">← Back to dashboard</Link><div className="form-heading"><p className="eyebrow">Landlord tools</p><h1>List a property</h1><p>Add the important details and upload a clear photo of the home.</p></div><form className="listing-form" onSubmit={handleSubmit}><label>Property title<input name="title" value={form.title} onChange={updateField} required /></label><label>Location<input name="location" value={form.location} onChange={updateField} required /></label><div className="form-row"><label>Yearly price (₦)<input name="price" value={form.price} onChange={updateField} type="number" min="1" required /></label><label>Property type<select name="type" value={form.type} onChange={updateField}><option>Studio</option><option>Apartment</option><option>Shared apartment</option></select></label></div><label>Property image<input type="file" accept="image/*" onChange={chooseImage} /></label>{preview && <img className="upload-preview" src={preview} alt="Property preview" />}<label>Description<textarea name="description" value={form.description} onChange={updateField} rows="6" required /></label>{message && <p className="form-message">{message}</p>}<button className="button" disabled={loading}>{loading ? 'Uploading and creating...' : 'Create listing'}</button></form></main>;
}
