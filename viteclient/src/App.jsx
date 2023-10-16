import { useEffect } from 'react';
import { useCookies } from 'react-cookie';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage';
import SettingsPage from './pages/SettingsPage';
import VillaAnnaRoutes from './routes/VillaAnnaRoutes';
import AuthGuard from './components/AuthGuard';
import axios from 'axios';
import NotFoundPage from './pages/404Page';

function App() {
  const [cookies] = useCookies(['session']);

  useEffect(() => {
    axios.interceptors.request.use((config) => {
      const sessionId = cookies.session;

      if (sessionId && !config.headers['Authorization']) {
        config.headers['Authorization'] = `Bearer ${sessionId}`;
      }

      return config;
    }, (error) => {
      return Promise.reject(error);
    });
  }, [cookies]);

  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <Routes>
            <Route path='/' element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path='/home' element={<AuthGuard><HomePage /></AuthGuard>} />
            <Route path='/settings' element={<AuthGuard><SettingsPage /></AuthGuard>} />
            <Route path='/villa-anna/*' element={<AuthGuard><VillaAnnaRoutes /></AuthGuard>} />
            <Route path='*' element={<AuthGuard><NotFoundPage /></AuthGuard>} />
          </Routes>
        </header>
      </div>
    </Router>
  );
}

export default App;
