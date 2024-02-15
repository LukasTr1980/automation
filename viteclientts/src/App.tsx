import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage';
import SettingsPage from './pages/SettingsPage';
import UserPage from './pages/UserPage';
import VillaAnnaRoutes from './routes/VillaAnnaRoutes';
import AuthGuard from './components/AuthGuard';
import NotFoundPage from './pages/404Page';
import { SnackbarProvider } from './components/snackbar/SnackbarContext';
import CentralizedSnackbar from './components/snackbar/CentralizedSnackbar';
import { SocketProvider } from './components/socketio/SocketContext';
import ErrorBoundary from './components/ErrorBoundary';
import CssBaseline from '@mui/material/CssBaseline';

function App() {

  return (
    <SnackbarProvider>
      <ErrorBoundary>
        <CssBaseline />
        <Router>
          <div className="App">
            <header className="App-header">
              <Routes>
                <Route path='/' element={<AuthGuard><HomePage /></AuthGuard>} />
                <Route path="/login" element={<LoginPage />} />
                <Route path='/home' element={<AuthGuard><HomePage /></AuthGuard>} />
                <Route path='/settings' element={<AuthGuard requiredRole='admin'><SettingsPage /></AuthGuard>} />
                <Route path='/user' element={<AuthGuard><UserPage /></AuthGuard>} />
                <Route path='/villa-anna/*' element={<AuthGuard><SocketProvider><VillaAnnaRoutes /></SocketProvider></AuthGuard>} />
                <Route path='*' element={<AuthGuard><NotFoundPage /></AuthGuard>} />
              </Routes>
            </header>
            <CentralizedSnackbar />
          </div>
        </Router>
      </ErrorBoundary>
    </SnackbarProvider>
  );
}

export default App;
