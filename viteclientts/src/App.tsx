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
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';
import NavBar from './components/NavBar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function App() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
      },
    },
  });

  return (
    <SnackbarProvider>
      <ErrorBoundary>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <QueryClientProvider client={queryClient}>
            <Router>
              <div className="App">
                <NavBar />
                <Routes>
                  <Route path='/' element={<VillaAnnaHomePage />} />
                  <Route path='/bewaesserung' element={<BewaesserungsPage />} />
                  <Route path='/countdown' element={<CountdownPage />} />
                  <Route path='*' element={<NotFoundPage />} />
                </Routes>
                <CentralizedSnackbar />
              </div>
            </Router>
          </QueryClientProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </SnackbarProvider>
  );
}

export default App;
