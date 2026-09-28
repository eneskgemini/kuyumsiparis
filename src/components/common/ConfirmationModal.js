import React from 'react';
import { createPortal } from 'react-dom';
import { Trash } from 'lucide-react';

// NOT: Bu modal bilerek document.body'ye "portal" ile çiziliyor (doğrudan
// çağrıldığı yerin DOM'una değil). Sebebi: çoğu ekran bu modalı
// "animate-slide-up" gibi bir CSS animasyonu olan bir <div>'in içinden
// açıyor - o animasyon transform:translateY(...) kullanıyor, ve CSS'te bir
// üst öğede transform olması, içindeki "position: fixed" öğelerin artık
// tüm ekrana değil O ÜST ÖĞEYE göre sabitlenmesine yol açıyor. Bu yüzden
// sayfa aşağı kaydırılmışken modal ekranın ortasında değil, sayfanın en
// üstünde (o üst öğenin başlangıcında) görünüyordu. Portal ile modalı
// doğrudan body'nin altına taşıyınca, hangi ekrandan açılırsa açılsın
// her zaman gerçek ekranın tam ortasında çıkıyor.
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[400] bg-ink-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="card p-6 max-w-sm w-full animate-zoom-in">
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-12 h-12 bg-red-50 dark:bg-red-950/40 rounded-full flex items-center justify-center mb-4 text-red-600 dark:text-red-400">
                        <Trash size={22} />
                    </div>
                    <h3 className="text-lg font-bold text-ink-900 dark:text-ink-100 mb-1.5">{title}</h3>
                    <p className="text-ink-500 dark:text-ink-400 text-sm">{message}</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={onClose} className="btn-secondary flex-1">Vazgeç</button>
                    <button onClick={onConfirm} className="btn-danger flex-1">Evet, Sil</button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ConfirmationModal;
