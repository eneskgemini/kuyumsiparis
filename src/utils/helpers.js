import { useState, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

export const naturalSort = (a, b) => {
    if (!a.code || !b.code) return 0;
    return a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' });
};

export const parseGram = (val) => { 
    if (!val) return 0; 
    const f = parseFloat(val.toString().replace(',', '.')); 
    return isNaN(f) ? 0 : f; 
};

export const processFile = (file) => new Promise((resolve, reject) => {
    if (!file) return reject(new Error("Dosya bulunamadı."));
    const reader = new FileReader();
    reader.onload = (e) => {
        const result = e.target.result;
        if (file.type && file.type.match('image.*')) {
            const img = new window.Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_SIZE = 1600; 
                
                if (width > MAX_SIZE || height > MAX_SIZE) {
                    const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
                    width *= ratio;
                    height *= ratio;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(0, 0, width, height);
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);
                
                let quality = 0.85; 
                let dataUrl = canvas.toDataURL('image/jpeg', quality);
                
                resolve({ base64: dataUrl, type: 'image' });
            };
            img.onerror = () => reject(new Error("Görsel işlenemedi."));
            img.src = result;
        } else {
            resolve({ base64: result, type: 'file', fileName: file.name, fileSize: file.size });
        }
    };
    reader.onerror = () => reject(new Error("Dosya okunamadı."));
    reader.readAsDataURL(file);
});

// Görseli tarayıcıda küçültüp sıkıştırır ve Firebase Storage'a yükler; Firestore
// belgesine sadece küçük bir indirme linki yazılır (eskiden olduğu gibi devasa
// base64 metni değil). Bu, ürün/katalog listesinin ilk açılışta çekilen veri
// boyutunu -ve dolayısıyla bekleme süresini- büyük ölçüde küçültür.
// PNG (şeffaf) dosyalar beyaz dolgu almadan PNG olarak, diğerleri (JPEG vb.)
// beyaz zemine oturtulup sıkıştırılmış JPEG olarak kaydedilir. Böylece bir
// logo gibi şeffaf arka planlı görseller Storage'a yüklenirken şeffaflığını
// kaybetmez (eskiden her görsel, PNG bile olsa, beyaz zemine JPEG olarak
// "düzleştiriliyordu" - logo kutusunun beyaz görünmesinin asıl sebebi buydu).
const resizeImageToBlob = (file, maxSize = 1600, quality = 0.85) => new Promise((resolve, reject) => {
    if (!file) return reject(new Error("Dosya bulunamadı."));
    const isPng = file.type === 'image/png';
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxSize || height > maxSize) {
                const ratio = Math.min(maxSize / width, maxSize / height);
                width *= ratio;
                height *= ratio;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!isPng) {
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(0, 0, width, height);
            }
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
                if (blob) resolve(blob); else reject(new Error("Görsel işlenemedi."));
            }, isPng ? 'image/png' : 'image/jpeg', quality);
        };
        img.onerror = () => reject(new Error("Görsel işlenemedi."));
        img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Dosya okunamadı."));
    reader.readAsDataURL(file);
});

export const uploadImageToStorage = async (file, folder = 'uploads') => {
    if (!file) throw new Error("Dosya bulunamadı.");
    const isPng = file.type === 'image/png';
    const blob = await resizeImageToBlob(file);
    const ext = isPng ? 'png' : 'jpg';
    const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob, { contentType: isPng ? 'image/png' : 'image/jpeg' });
    const url = await getDownloadURL(storageRef);
    return { url, path };
};

// AI Stüdyo'da yüklenen (dekupe edilmiş, arka planı şeffaf) ürün fotoğrafının
// rengini/tonunu otomatik düzeltir: parlaklık-kontrastı normalize eder ve
// hafif canlılık ekler. Kanal başına DEĞİL, tüm kanallara EŞİT uygulanır —
// bu yüzden altının/ürünün doğal rengi (ör. sarı altın) bozulmaz, sadece
// donuk/soluk görünüm düzelir. Şeffaf pikseller hesaba katılmaz.
export const autoColorCorrectDataUrl = (srcUrl) => new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const d = imageData.data;

            // Parlaklık histogramı (sadece görünür pikseller)
            const hist = new Uint32Array(256);
            let opaqueCount = 0;
            for (let i = 0; i < d.length; i += 4) {
                if (d[i + 3] < 20) continue;
                const luminance = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) | 0;
                hist[luminance]++;
                opaqueCount++;
            }

            if (opaqueCount === 0) { resolve(srcUrl); return; }

            // %0.5 alt/üst kırpma ile germe aralığını bul (aşırı uçlara duyarlı olmasın)
            const clip = opaqueCount * 0.005;
            let lo = 0, hi = 255, acc = 0;
            for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc > clip) { lo = i; break; } }
            acc = 0;
            for (let i = 255; i >= 0; i--) { acc += hist[i]; if (acc > clip) { hi = i; break; } }
            if (hi <= lo) { lo = 0; hi = 255; }
            const range = hi - lo || 1;

            const SATURATION_BOOST = 1.12; // hafif canlılık

            for (let i = 0; i < d.length; i += 4) {
                if (d[i + 3] < 5) continue; // tamamen şeffafı atla
                let r = ((d[i] - lo) / range) * 255;
                let g = ((d[i + 1] - lo) / range) * 255;
                let b = ((d[i + 2] - lo) / range) * 255;
                r = Math.max(0, Math.min(255, r));
                g = Math.max(0, Math.min(255, g));
                b = Math.max(0, Math.min(255, b));

                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                d[i] = Math.max(0, Math.min(255, gray + (r - gray) * SATURATION_BOOST));
                d[i + 1] = Math.max(0, Math.min(255, gray + (g - gray) * SATURATION_BOOST));
                d[i + 2] = Math.max(0, Math.min(255, gray + (b - gray) * SATURATION_BOOST));
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png', 1.0));
        } catch (err) {
            reject(err);
        }
    };
    img.onerror = () => reject(new Error('Görsel yüklenemedi (renk ayarı).'));
    img.src = srcUrl;
});

export const handleDownload = async (url, filename) => {
    try {
         const response = await fetch(url);
         const blob = await response.blob();
         const blobUrl = window.URL.createObjectURL(blob);
         const link = document.createElement('a');
         link.href = blobUrl;
         link.download = filename || 'indirilen_dosya';
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
         window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.error("İndirme hatası:", error);
        window.open(url, '_blank');
    }
};