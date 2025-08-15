import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import VillaAnnaHomePage from './pages/VillaAnna/VillaAnnaHomePage';
import BewaesserungsPage from './pages/VillaAnna/VillaAnnaBewaesserungPage';
import CountdownPage from './pages/VillaAnna/VillaAnnaCountdownPage';
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
              <Route path='/' element={<VillaAnnaHomePage />} />
              <Route path='/bewaesserung' element={<BewaesserungsPage />} />
              <Route path='/countdown' element={<CountdownPage />} />
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
