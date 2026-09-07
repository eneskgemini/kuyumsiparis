/* eslint-disable no-restricted-globals */

// Bu, Create React App'in resmi "cra-template-pwa" şablonundaki standart
// Workbox tabanlı service worker dosyasıdır. Görevi: build sırasında
// oluşan statik dosyaları (JS/CSS/HTML/ikonlar) önbelleğe alıp, siteyi
// iPad'de "Ana Ekrana Ekle" ile açılan uygulamanın bir sonraki açılışlarda
// anında (ve internet zayıfken de) yüklenmesini sağlamak.
//
// ÖNEMLİ: Bu sadece STATİK UYGULAMA DOSYALARINI önbellekler. Firebase
// (Firestore/Storage/Auth) istekleri bu service worker'dan etkilenmez,
// her zaman canlı ağdan gider — yani ürün/sipariş/mesaj verileri asla
// bayat (eski) önbellekten gelmez.

import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';

clientsClaim();

// Build sırasında oluşan tüm varlıkları önbelleğe al. Bu değişken
// (self.__WB_MANIFEST) build aracı tarafından otomatik doldurulur.
precacheAndRoute(self.__WB_MANIFEST);

// Tüm sayfa-içi (SPA) navigasyon isteklerini index.html ile karşıla.
const fileExtensionRegexp = new RegExp('/[^/?]+\\.[^/]+$');
registerRoute(
  ({ request, url }) => {
    if (request.mode !== 'navigate') {
      return false;
    }
    if (url.pathname.startsWith('/_')) {
      return false;
    }
    if (url.pathname.match(fileExtensionRegexp)) {
      return false;
    }
    return true;
  },
  createHandlerBoundToURL(process.env.PUBLIC_URL + '/index.html')
);

// Aynı origin'den gelen .png istekleri için runtime cache (ör. public/ altındaki ikonlar).
registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.endsWith('.png'),
  new StaleWhileRevalidate({
    cacheName: 'images',
    plugins: [new ExpirationPlugin({ maxEntries: 50 })],
  })
);

// Uygulama, registration.waiting.postMessage({type: 'SKIP_WAITING'}) ile
// yeni service worker'ı hemen etkinleştirebilir.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
