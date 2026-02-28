import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Kiosk from './pages/Kiosk';
import Coordinator from './pages/Coordinator';
import Family from './pages/Family';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/kiosk" element={<Kiosk />} />
        <Route path="/coordinator" element={<Coordinator />} />
        <Route path="/family" element={<Family />} />
      </Routes>
    </BrowserRouter>
  );
}
