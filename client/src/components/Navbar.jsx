import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const loggedIn = Boolean(localStorage.getItem('shenest_token'));

  function logout() {
    localStorage.removeItem('shenest_token');
    localStorage.removeItem('shenest_user');
    navigate('/');
  }

  return (
    <header className="navbar">
      <Link className="brand" to="/"><span className="brand-mark">S</span>SheNest</Link>

      <nav className="nav-links" aria-label="Main navigation">
        <Link to="/properties">Find a home</Link>
        <Link to="/roommates">Find a roommate</Link>
        <Link to="/favorites">Favorites</Link>
        <Link to="/properties/new">List a property</Link>
      </nav>

      <div className="nav-actions">
        {loggedIn ? (
          <button className="text-button nav-plain-button" type="button" onClick={logout}>Log out</button>
        ) : (
          <><Link className="text-button" to="/login">Log in</Link><Link className="button small" to="/register">Sign up</Link></>
        )}
      </div>
    </header>
  );
}
