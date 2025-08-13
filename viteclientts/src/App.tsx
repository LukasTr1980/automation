import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SettingsPage from './pages/SettingsPage';
import VillaAnnaRoutes from './routes/VillaAnnaRoutes';
import NotFoundPage from './pages/404Page';
import { SnackbarProvider } from './components/snackbar/SnackbarContext';
import CentralizedSnackbar from './components/snackbar/CentralizedSnackbar';
import ErrorBoundary from './components/ErrorBoundary';
import CssBaseline from '@mui/material/CssBaseline';

function App() {

  return (
    <SnackbarProvider>
      <ErrorBoundary>
        <CssBaseline />
        <Router>
          <div className="App">
            <Routes>
              <Route path='/' element={<HomePage />} />
              <Route path='/home' element={<HomePage />} />
              <Route path='/settings' element={<SettingsPage />} />
              <Route path='/villa-anna/*' element={<VillaAnnaRoutes />} />
              <Route path='*' element={<NotFoundPage />} />
            </Routes>
            <CentralizedSnackbar />
          </div>
        </Router>
      </ErrorBoundary>
    </SnackbarProvider>
  );
}

export default App;
