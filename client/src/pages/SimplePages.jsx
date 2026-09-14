import { Link } from 'react-router-dom';

export function Roommates() {
  return <SimplePage title="Find your roommate match" text="Roommate profiles and compatibility preferences will live here." />;
}

export function Favorites() {
  return <SimplePage title="Your saved homes" text="Properties you favorite will appear here." />;
}

export function Login() {
  return <AuthPage title="Welcome back" action="Log in" footer="New to SheNest?" footerLink="Create an account" to="/register" />;
}

export function Register() {
  return <AuthPage title="Join SheNest" action="Create account" footer="Already have an account?" footerLink="Log in" to="/login" />;
}

function SimplePage({ title, text }) {
  return (
    <main className="empty-page">
      <div><h1>{title}</h1><p>{text}</p><Link className="button" to="/">Back home</Link></div>
    </main>
  );
}

function AuthPage({ title, action, footer, footerLink, to }) {
  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={(event) => event.preventDefault()}>
        <div className="brand auth-brand"><span className="brand-mark">S</span> SheNest</div>
        <h1>{title}</h1>
        <p>Your next home starts here.</p>
        <label>Email<input type="email" placeholder="you@example.com" required /></label>
        <label>Password<input type="password" placeholder="At least 8 characters" required /></label>
        <button className="button full" type="submit">{action}</button>
        <p className="auth-footer">{footer} <Link to={to}>{footerLink}</Link></p>
      </form>
    </main>
  );
}
