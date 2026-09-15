import { Link } from 'react-router-dom';

export default function NotFound() {
  return <main className="empty-page not-found"><div><span className="big-404">404</span><h1>This page wandered off.</h1><p>The page you tried to open does not exist.</p><Link className="button" to="/">Go back home</Link></div></main>;
}
