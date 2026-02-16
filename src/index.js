import 'react-app-polyfill/ie9';
import 'react-app-polyfill/stable';
import 'whatwg-fetch';
import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // CSS dosyasını buradan çağırıyoruz
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);