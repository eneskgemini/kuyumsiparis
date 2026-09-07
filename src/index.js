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
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

// iPad/iPhone'da "Ana Ekrana Ekle" ile kurulan uygulamanın statik dosyalarını
// önbelleğe alıp bir sonraki açılışta anında yüklenmesini sağlar. Firebase
// verileri (ürün/sipariş/mesaj) bundan etkilenmez, her zaman canlı gelir.
serviceWorkerRegistration.register();