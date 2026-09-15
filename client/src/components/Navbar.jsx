import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('shenest_user') || 'null');
  const loggedIn = Boolean(user);

  function logout() {
    localStorage.removeItem('shenest_token');
    localStorage.removeItem('shenest_user');
    navigate('/');
    window.location.reload();
  }

  return <header className="navbar">
    <Link className="brand" to="/"><span className="brand-mark">S</span>SheNest</Link>
    <nav className="nav-links" aria-label="Main navigation">
      <Link to="/properties">Find a home</Link>
      <Link to="/roommates">Find a roommate</Link>
      {loggedIn && <Link to="/favorites">Favorites</Link>}
      {user?.role === 'LANDLORD' && <><Link to="/properties/new">List a property</Link><Link to="/landlord">Dashboard</Link></>}
      {user?.role === 'ADMIN' && <Link to="/admin">Verification</Link>}
    </nav>
    <div className="nav-actions">
      {loggedIn ? <><Link className="text-button" to="/account">{user.name.split(' ')[0]}</Link><button className="text-button nav-plain-button" type="button" onClick={logout}>Log out</button></> : <><Link className="text-button" to="/login">Log in</Link><Link className="button small" to="/register">Sign up</Link></>}
    </div>
  </header>;
}
