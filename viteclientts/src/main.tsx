import React from 'react'
import ReactDOM from 'react-dom/client'
import './utils/axiosSetup.tsx';
import App from './App.tsx'
import './index.css'
import './utils/i18n.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
