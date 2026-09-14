import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <header className="navbar">
      <Link className="brand" to="/">
        <span className="brand-mark">S</span>
        SheNest
      </Link>

      <nav className="nav-links" aria-label="Main navigation">
        <Link to="/properties">Find a home</Link>
        <Link to="/roommates">Find a roommate</Link>
        <Link to="/favorites">Favorites</Link>
      </nav>

      <div className="nav-actions">
        <Link className="text-button" to="/login">Log in</Link>
        <Link className="button small" to="/register">Sign up</Link>
      </div>
    </header>
  );
}
