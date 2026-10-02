import { Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import Properties from './pages/Properties.jsx';
import PropertyDetails from './pages/PropertyDetails.jsx';
import CreateProperty from './pages/CreateProperty.jsx';
import Favorites from './pages/Favorites.jsx';
import Roommates from './pages/Roommates.jsx';
import Messages from './pages/Messages.jsx';
import LandlordDashboard from './pages/LandlordDashboard.jsx';
import Admin from './pages/Admin.jsx';
import Account from './pages/Account.jsx';
import NotFound from './pages/NotFound.jsx';
import { Login, Register } from './pages/SimplePages.jsx';

export default function App() {
  return <><Navbar /><Routes><Route path="/" element={<Home />} /><Route path="/properties" element={<Properties />} /><Route path="/properties/new" element={<CreateProperty />} /><Route path="/properties/:id" element={<PropertyDetails />} /><Route path="/roommates" element={<Roommates />} /><Route path="/messages/:userId" element={<Messages />} /><Route path="/favorites" element={<Favorites />} /><Route path="/landlord" element={<LandlordDashboard />} /><Route path="/admin" element={<Admin />} /><Route path="/account" element={<Account />} /><Route path="/login" element={<Login />} /><Route path="/register" element={<Register />} /><Route path="*" element={<NotFound />} /></Routes></>;
}
