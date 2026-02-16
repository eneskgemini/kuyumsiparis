// =========================================
// IPAD 2 İÇİN ZORUNLU POLYFILL
// =========================================
import 'proxy-polyfill'; 
import 'react-app-polyfill/ie9';
import 'react-app-polyfill/stable';
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import 'whatwg-fetch';
import 'abortcontroller-polyfill/dist/abortcontroller-polyfill-only';

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <App />
);