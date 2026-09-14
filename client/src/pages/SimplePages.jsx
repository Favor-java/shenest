import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Link, useNavigate } from 'react-router-dom';
import { LOGIN, REGISTER } from '../graphql/operations.js';

export function Roommates() {
  return <SimplePage title="Find your roommate match" text="Roommate profiles and compatibility preferences will live here." />;
}

export function Favorites() {
  return <SimplePage title="Your saved homes" text="Properties you favorite will appear here." />;
}

export function Login() {
  return <AuthPage mode="login" />;
}

export function Register() {
  return <AuthPage mode="register" />;
}

function SimplePage({ title, text }) {
  return (
    <main className="empty-page">
      <div><h1>{title}</h1><p>{text}</p><Link className="button" to="/">Back home</Link></div>
    </main>
  );
}

function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const [login, loginState] = useMutation(LOGIN);
  const [register, registerState] = useMutation(REGISTER);
  const loading = loginState.loading || registerState.loading;

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');

    try {
      const result = isRegister
        ? await register({ variables: form })
        : await login({ variables: { email: form.email, password: form.password } });

      const auth = isRegister ? result.data.register : result.data.login;
      localStorage.setItem('shenest_token', auth.token);
      localStorage.setItem('shenest_user', JSON.stringify(auth.user));
      navigate('/properties');
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="brand auth-brand"><span className="brand-mark">S</span> SheNest</div>
        <h1>{isRegister ? 'Join SheNest' : 'Welcome back'}</h1>
        <p>Your next home starts here.</p>

        {isRegister && (
          <label>Name
            <input name="name" value={form.name} onChange={updateField} placeholder="Your name" required />
          </label>
        )}

        <label>Email
          <input name="email" value={form.email} onChange={updateField} type="email" placeholder="you@example.com" required />
        </label>
        <label>Password
          <input name="password" value={form.password} onChange={updateField} type="password" placeholder="At least 8 characters" minLength="8" required />
        </label>

        {message && <p className="form-message">{message}</p>}
        <button className="button full" type="submit" disabled={loading}>
          {loading ? 'Please wait...' : isRegister ? 'Create account' : 'Log in'}
        </button>

        <p className="auth-footer">
          {isRegister ? 'Already have an account?' : 'New to SheNest?'}{' '}
          <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Log in' : 'Create an account'}</Link>
        </p>
      </form>
    </main>
  );
}
