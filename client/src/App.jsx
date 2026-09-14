import { Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import Properties from './pages/Properties.jsx';
import PropertyDetails from './pages/PropertyDetails.jsx';
import CreateProperty from './pages/CreateProperty.jsx';
import Favorites from './pages/Favorites.jsx';
import { Login, Register, Roommates } from './pages/SimplePages.jsx';

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/properties/new" element={<CreateProperty />} />
        <Route path="/properties/:id" element={<PropertyDetails />} />
        <Route path="/roommates" element={<Roommates />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </>
  );
}
