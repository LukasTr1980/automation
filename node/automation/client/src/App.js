import React, { useEffect } from 'react';
import { useCookies } from 'react-cookie';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginForm from './LoginForm';
import HomePage from './HomePage';
import BewaesserungPage from './BewaesserungPage';
import MarkisePage from './MarkisePage';
import AuthGuard from './AuthGuard';
import axios from 'axios';
import NotFoundPage from './404Page';

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
            <Route path='/' element={<LoginForm />} />
            <Route path="/login" element={<LoginForm />} />
            <Route path="/home" element={<AuthGuard><HomePage /></AuthGuard>} />
            <Route path='/bewaesserung' element={<AuthGuard><BewaesserungPage /></AuthGuard>} />
            <Route path='/markise' element={<AuthGuard><MarkisePage /></AuthGuard>} />
            <Route path='*' element={<NotFoundPage />} />
          </Routes>
        </header>
      </div>
    </Router>
  );
}

export default App;
