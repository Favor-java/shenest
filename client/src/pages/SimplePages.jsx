import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/api.js';

export function Login(){ return <AuthPage mode="login" />; }
export function Register(){ return <AuthPage mode="register" />; }

function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'USER' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  function updateField(event) { setForm({ ...form, [event.target.name]: event.target.value }); }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setLoading(true);
    try {
      const body = isRegister ? form : { email: form.email, password: form.password };
      const result = await api(`/auth/${isRegister ? 'register' : 'login'}`, { method: 'POST', body: JSON.stringify(body) });
      localStorage.setItem('shenest_token', result.token);
      localStorage.setItem('shenest_user', JSON.stringify(result.user));
      navigate(result.user.role === 'LANDLORD' ? '/landlord' : '/properties');
      window.location.reload();
    } catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  }

  return <main className="auth-page"><form className="auth-card" onSubmit={handleSubmit}>
    <div className="brand auth-brand"><span className="brand-mark">S</span> SheNest</div>
    <h1>{isRegister ? 'Join SheNest' : 'Welcome back'}</h1><p>Your next home starts here.</p>
    {isRegister && <><label>Name<input name="name" value={form.name} onChange={updateField} required /></label><label>Account type<select name="role" value={form.role} onChange={updateField}><option value="USER">I am looking for a home</option><option value="LANDLORD">I am a landlord</option></select></label></>}
    <label>Email<input name="email" value={form.email} onChange={updateField} type="email" required /></label>
    <label>Password<input name="password" value={form.password} onChange={updateField} type="password" minLength="8" required /></label>
    {message && <p className="form-message">{message}</p>}
    <button className="button full" disabled={loading}>{loading ? 'Please wait...' : isRegister ? 'Create account' : 'Log in'}</button>
    <p className="auth-footer">{isRegister ? 'Already have an account?' : 'New to SheNest?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Log in' : 'Create an account'}</Link></p>
  </form></main>;
}
