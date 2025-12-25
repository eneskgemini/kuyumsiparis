/* global __firebase_config, __app_id, __initial_auth_token */
// ==========================================
// FILE: src/App.js (Main Entry - Non-Blocking Uploads)
// ==========================================

import React, { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, doc, deleteDoc, updateDoc,
  query, serverTimestamp, onSnapshot, getDocs, writeBatch, where, orderBy, limit, setDoc, getDoc 
} from 'firebase/firestore';
import { 
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, 
  signInAnonymously, signInWithCustomToken, signOut, updateProfile
} from 'firebase/auth';
import {
  getStorage, ref, uploadBytesResumable, getDownloadURL, uploadString
} from 'firebase/storage';
import { 
  ShoppingBag, Search, Plus, Trash, LogOut,
  X, Star, RefreshCcw, Folder, ChevronDown, Printer, Download, Save, Check, CheckCheck,
  ArrowUp, Upload, User, Key, ChevronLeft, ChevronRight, AlertTriangle, Users, Send, Settings, Box, CheckCircle, Calendar, Minus, Pencil, Activity, TrendingUp, CheckSquare, FileText, Wand2,
  Grid, AlignCenter, MousePointer2, Image as ImageIcon, Monitor, Paperclip, Bell, Loader2
} from 'lucide-react';

// FileIcon alias'ını manuel oluşturuyoruz (FileText kullanarak)
const FileIcon = FileText;

// ==========================================
// FILE: src/constants.js
// ==========================================
const DEFAULT_LOGO_URL = "https://i.hizliresim.com/6pdu20m.png"; 
const DEFAULT_FRAME_URL = "https://i.hizliresim.com/pq4m3mg.png";
const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"; 
const CATEGORIES = ["Anasayfa", "Yüzük", "Kolye", "Küpe", "Bileklik", "Set", "Haç"];
const SUBCATEGORIES = {
  "Yüzük": ["AS-B", "SMG", "SA-Y", "SB-M", "SB-Y", "SH-R", "SH-Y", "SK-Y", "SM-I", "SM-Y", "SR-G", "SS-H", "SS-Y", "ST-I", "ST-O"],
  "Kolye": ["SA-K", "SH-H", "SK-A", "SK-E"],
  "Küpe": ["SH-K", "SK-M", "SM-K", "SR-E"],
  "Bileklik": ["SP-B"],
  "Set": ["SB-S", "SH-E", "SS-A", "SV-K"],
  "Haç": ["M-HC", "S-HC"]
};
const KARAT_OPTIONS = ["8K", "9K", "10K", "14K", "18K", "21K", "22K"];
const COLOR_OPTIONS = ["Yeşil", "Beyaz", "Rose"];
const ORDER_STAGES = {
    new: { label: 'Yeni Sipariş', color: 'bg-yellow-100 text-yellow-800', border: 'border-yellow-200', icon: FileText },
    preparing: { label: 'Üretimde', color: 'bg-blue-100 text-blue-800', border: 'border-blue-200', icon: RefreshCcw },
    ready: { label: 'Hazır', color: 'bg-purple-100 text-purple-800', border: 'border-purple-200', icon: CheckSquare },
    delivered: { label: 'Teslim Edildi', color: 'bg-green-100 text-green-800', border: 'border-green-200', icon: CheckCircle }
};

// ==========================================
// FILE: src/config/firebase.js
// ==========================================
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "AIzaSyBU8dWUrlVu2PUiysZ44r0USHn-TtfT6R0",
  authDomain: "sahra-c9ba6.firebaseapp.com",
  projectId: "sahra-c9ba6",
  storageBucket: "sahra-c9ba6.firebasestorage.app",
  messagingSenderId: "330661296496",
  appId: "1:330661296496:web:f8c18c1d391d0980bbb7b5",
  measurementId: "G-LGM6Y1WCK6"
};

let app, auth, db, storage;
try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} catch (error) {
  console.error("Firebase Başlatma Hatası:", error);
}
const appId = typeof __app_id !== 'undefined' ? __app_id : "sahra-kuyum-app";

// ==========================================
// FILE: src/utils/helpers.js
// ==========================================
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const naturalSort = (a, b) => {
    if (!a.code || !b.code) return 0;
    return a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' });
};

const parseGram = (val) => { if (!val) return 0; const f = parseFloat(val.toString().replace(',', '.')); return isNaN(f) ? 0 : f; };

const processFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const result = e.target.result;
        if (file.type.match('image.*')) {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_SIZE = 1200; // Optimize edilmiş boyut
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
                ctx.drawImage(img, 0, 0, width, height);
                
                let quality = 0.7; // Optimize edilmiş kalite
                let dataUrl = canvas.toDataURL('image/jpeg', quality);
                const MAX_CHARS = 900000; // Firestore limitinin hemen altı (yaklaşık 900KB)
                
                // Çok agresif sıkıştırma gerekirse
                while (dataUrl.length > MAX_CHARS && quality > 0.3) {
                    quality -= 0.1;
                    dataUrl = canvas.toDataURL('image/jpeg', quality);
                }
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

const handleDownload = async (url, filename) => {
    try {
        // Base64 ise direkt indir
        if (url.startsWith('data:')) {
             const link = document.createElement('a');
             link.href = url;
             link.download = filename || 'dosya';
             document.body.appendChild(link);
             link.click();
             document.body.removeChild(link);
             return;
        }

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

// ==========================================
// FILE: src/components/Shared/PrintStyles.js
// ==========================================
const PrintStyles = () => (
  <style>{`
    .print-page { width: 210mm; min-height: 297mm; padding: 10mm; background: white; position: relative; display: flex; flex-direction: column; box-sizing: border-box; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(0,0,0,0.1); margin-bottom: 40px; }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; font-size: 11px; border: 1px solid #000; }
    .header-table th, .header-table td { border: 1px solid #000; padding: 4px; text-align: left; vertical-align: middle; line-height: 1.1; }
    .header-table th { background-color: #eee; font-weight: bold; }
    .erp-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; align-content: start; }
    .erp-card { border: 1px solid #000; display: flex; flex-direction: column; font-size: 9px; height: 220px; box-sizing: border-box; page-break-inside: avoid; overflow: hidden; }
    .erp-image-area { height: 150px; border-bottom: 1px solid #000; display: flex; justify-content: center; align-items: center; background: #fff; overflow: hidden; padding: 2px; }
    .erp-image-area img { width: auto; height: auto; max-width: 100%; max-height: 100%; object-fit: contain; }
    .erp-details-area { flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
    .erp-header { font-weight: bold; background-color: #eee; text-align: center; font-size: 10px; border-bottom: 1px solid #ccc; padding: 1px 0; white-space: nowrap; overflow: hidden; }
    .erp-compact-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dotted #ccc; padding: 0 4px; font-size: 9px; line-height: 14px; background: #fff; height: 15px; }
    .erp-note { margin-top: auto; background-color: #ffffcc !important; padding: 2px; font-weight: bold; font-size: 8px; border-top: 1px solid #000; text-align: center; height: 35px; display: flex; flex-direction: column; justify-content: center; align-items: center; line-height: 1; }
    .erp-note input, .erp-note select { background: transparent !important; border: none !important; text-align: center; width: 100%; font-weight: bold; font-size: 8px; padding: 0 !important; margin: 0 !important; outline: none; }
    .footer-summary { margin-top: auto; border-top: 2px solid black; padding-top: 5px; font-size: 11px; }
    .screen-view-container { display: flex; flex-direction: column; align-items: center; background: #525659; padding: 40px 20px; min-height: 100vh; }
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    @media print {
      @page { size: A4; margin: 0mm; }
      body * { visibility: hidden; }
      .no-print { display: none !important; }
      #printable-root, #printable-root * { visibility: visible; }
      #printable-root { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
      .screen-only, .admin-panel-container, .modal-overlay-fix > div:first-child { display: none !important; }
      html, body { background: white !important; height: auto !important; overflow: visible !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .modal-overlay-fix { position: static !important; width: 100% !important; height: auto !important; background: white !important; overflow: visible !important; z-index: auto !important; display: block !important; }
      .screen-view-container { display: block !important; padding: 0 !important; margin: 0 !important; background: white !important; }
      .print-page { border: none !important; box-shadow: none !important; margin: 0 !important; page-break-after: always !important; width: 100% !important; height: auto !important; min-height: auto !important; }
      .print-page:last-child { page-break-after: auto !important; }
      .erp-grid { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 5px !important; }
      input, textarea, select { border: none !important; background: transparent !important; padding: 0 !important; margin: 0 !important; resize: none !important; box-shadow: none !important; font-weight: bold !important; color: #000 !important; appearance: none; -webkit-appearance: none; }
      .text-red-600 { color: #dc2626 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .print-invisible-card { display: none !important; }
    }
  `}</style>
);

// ==========================================
// FILE: src/components/Shared/UIComponents.js
// ==========================================
const CustomNotification = ({ type, message, onClose }) => {
  useEffect(() => { const timer = setTimeout(onClose, 4000); return () => clearTimeout(timer); }, [onClose]);
  return (
    <div className="fixed top-4 right-4 z-[200] flex items-center bg-white rounded-xl p-4 shadow-2xl border border-slate-100 animate-in slide-in-from-right-10 fade-in duration-300 max-w-sm">
        <div className={`rounded-full p-2 mr-3 ${type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
          {type === 'success' ? <Check size={20} strokeWidth={3} /> : <AlertTriangle size={20} strokeWidth={3} />}
        </div>
        <div>
           <h3 className={`text-sm font-bold ${type === 'success' ? 'text-green-800' : 'text-red-800'}`}>{type === 'success' ? 'Başarılı' : 'Hata'}</h3>
           <p className="text-slate-600 text-xs font-medium">{message}</p>
        </div>
        <button onClick={onClose} className="ml-4 text-slate-400 hover:text-slate-600"><X size={16}/></button>
    </div>
  );
};

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[400] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                        <Trash size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
                    <p className="text-slate-500 text-sm">{message}</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-colors">Vazgeç</button>
                    <button onClick={onConfirm} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold transition-colors shadow-lg shadow-red-200">Evet, Sil</button>
                </div>
            </div>
        </div>
    );
};

const CollapsibleSection = ({ title, count, children, defaultOpen = false, level = 0 }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className={`border-b border-slate-100 ${level > 0 ? 'ml-4 border-l' : 'mb-2 rounded-lg border'} bg-white`}>
            <button onClick={() => setIsOpen(!isOpen)} className={`w-full flex justify-between items-center p-3 transition-colors ${isOpen ? 'bg-slate-50' : 'hover:bg-slate-50'} ${level === 0 ? 'rounded-t-lg' : ''}`}>
                <div className="flex items-center gap-2 font-bold text-slate-700">
                    {isOpen ? <Folder size={20} className="text-yellow-500"/> : <Folder size={20} className="text-slate-400"/>}
                    <span className={level === 0 ? "text-base" : "text-sm text-slate-600"}>{title}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2 py-1 rounded-full border border-slate-200">{count}</span>
                    {isOpen ? <ChevronDown size={16} className="text-slate-400"/> : <ChevronLeft size={16} className="text-slate-400 rotate-180"/>}
                </div>
            </button>
            {isOpen && <div className={`p-2 ${level === 0 ? 'bg-slate-50/30' : ''} animate-in slide-in-from-top-1 duration-200`}>{children}</div>}
        </div>
    );
};

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-center gap-4 py-4">
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-lg border bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 transition-colors"><ChevronLeft size={20} /></button>
            <span className="text-sm font-bold text-slate-700">Sayfa {currentPage} / {totalPages}</span>
            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-lg border bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 transition-colors"><ChevronRight size={20} /></button>
        </div>
    );
};

const PaginatedProductGrid = React.memo(({ items, editingId, startEditing, onDeleteClick }) => {
    const [displayCount, setDisplayCount] = useState(12); 
    const visibleItems = useMemo(() => items.slice(0, displayCount), [items, displayCount]);

    return (
        <div>
            <div className="p-2 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                {visibleItems.map(product => (
                    <div key={product.id} className={`group relative bg-white border rounded-lg p-2 hover:shadow-lg transition-all ${editingId === product.id ? 'ring-2 ring-blue-500' : 'border-slate-100'}`}>
                        <div className="aspect-square bg-slate-100 rounded-md mb-2 overflow-hidden relative">
                            <img src={product.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                        </div>
                        <div className="font-bold text-xs truncate text-slate-800">{product.code}</div>
                        <div className="text-[10px] text-slate-500 font-bold">{product.gram} gr</div>
                        
                        <button onClick={() => startEditing(product)} className="absolute top-1 right-8 bg-blue-50 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-blue-600" title="Düzenle"><Pencil size={12}/></button>
                        <button onClick={() => onDeleteClick(product.id)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600" title="Sil"><Trash size={12}/></button>
                    </div>
                ))}
            </div>
            {items.length > displayCount && (
                <div className="flex justify-center mt-2 pb-2 gap-2">
                    <button onClick={() => setDisplayCount(prev => prev + 12)} className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-4 py-2 rounded-full hover:bg-blue-100 transition-colors">Daha Fazla Göster ({items.length - displayCount} kalan)</button>
                    <button onClick={() => setDisplayCount(items.length)} className="text-xs font-bold text-purple-600 hover:text-purple-800 bg-purple-50 px-4 py-2 rounded-full hover:bg-purple-100 transition-colors">Hepsini Göster</button>
                </div>
            )}
        </div>
    );
});

// ==========================================
// FILE: src/components/Dashboard/DashboardComponents.js
// ==========================================
const SalesCalendar = ({ orders, selectedDate, onDateChange }) => {
    const currentDate = selectedDate || new Date();
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); 
    const startDay = firstDay === 0 ? 6 : firstDay - 1; 
    const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    const [selectedDayDetail, setSelectedDayDetail] = useState(null);

    const salesData = useMemo(() => {
        const data = {};
        if (!orders) return data;
        orders.forEach(order => {
            if (order.status === 'delivered' && order.createdAt && order.createdAt.seconds) {
                const date = new Date(order.createdAt.seconds * 1000);
                if (date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear()) {
                    const day = date.getDate();
                    if (!data[day]) data[day] = { count: 0, total: 0, orders: [] };
                    data[day].count += 1;
                    let gram = 0;
                    if(order.items) order.items.forEach(i => gram += (parseGram(i.gram) * (parseInt(i.quantity) || 1)));
                    data[day].total += gram;
                    data[day].orders.push({ name: order.customerName, gram: gram.toFixed(2) });
                }
            }
        });
        return data;
    }, [orders, currentDate]);

    const monthlyTotalGram = useMemo(() => Object.values(salesData).reduce((acc, day) => acc + day.total, 0).toFixed(2), [salesData]);
    const changeMonth = (dir) => { 
        if (onDateChange) { onDateChange(new Date(currentDate.getFullYear(), currentDate.getMonth() + dir, 1)); }
        setSelectedDayDetail(null); 
    };

    const renderDays = () => {
        const days = [];
        for (let i = 0; i < startDay; i++) days.push(<div key={`empty-${i}`} className="h-20 bg-slate-50/50 border border-slate-100"></div>);
        for (let d = 1; d <= daysInMonth; d++) {
            const hasSale = salesData[d];
            const isSelected = selectedDayDetail && selectedDayDetail.day === d;
            days.push(
                <div key={d} onClick={() => hasSale ? (selectedDayDetail?.day === d ? setSelectedDayDetail(null) : setSelectedDayDetail({ day: d, ...hasSale })) : null} 
                    className={`relative h-20 border border-slate-100 p-1 flex flex-col justify-between transition-colors cursor-pointer ${hasSale ? (isSelected ? 'bg-green-100 ring-2 ring-green-500' : 'bg-green-50 hover:bg-green-100') : 'bg-white hover:bg-slate-50'}`}>
                    <div className="flex justify-between items-start"><span className={`text-xs font-bold ${hasSale ? 'text-green-700' : 'text-slate-400'}`}>{d}</span>{hasSale && <span className="w-2 h-2 bg-green-500 rounded-full"></span>}</div>
                    {hasSale && <div className="text-[10px] text-right text-slate-600 font-medium leading-tight"><div>{hasSale.count} Teslim</div><div className="text-green-600 font-bold">{hasSale.total.toFixed(1)}gr</div></div>}
                </div>
            );
        }
        return days;
    };

    // UPDATE: h-fit added to prevent vertical stretching
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-visible relative h-fit">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-bold text-slate-700 flex items-center gap-2"><Calendar size={18} className="text-blue-500"/> Satış Takvimi</h3>
                <div className="flex items-center gap-2"><button onClick={() => changeMonth(-1)}><ChevronLeft size={20}/></button><span className="text-sm font-bold w-32 text-center">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span><button onClick={() => changeMonth(1)}><ChevronRight size={20}/></button></div>
            </div>
            <div className="grid grid-cols-7 text-center text-xs font-bold text-slate-500 bg-slate-100 py-2 border-b border-slate-200"><div>Pzt</div><div>Sal</div><div>Çar</div><div>Per</div><div>Cum</div><div>Cmt</div><div>Paz</div></div>
            <div className="grid grid-cols-7 relative">{renderDays()}{selectedDayDetail && <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[60] bg-white rounded-lg shadow-2xl border-2 border-yellow-400 w-64 p-4"><h4 className="font-bold mb-2">{selectedDayDetail.day} {monthNames[currentDate.getMonth()]}</h4>{selectedDayDetail.orders.map((o,i)=><div key={i} className="flex justify-between text-xs border-b py-1"><span className="capitalize">{o.name}</span><span className="font-bold">{o.gram}gr</span></div>)}<button onClick={()=>setSelectedDayDetail(null)} className="mt-2 w-full bg-slate-100 text-xs py-1 font-bold">Kapat</button></div>}</div>
            <div className="p-4 bg-green-50 border-t border-green-100 flex justify-between items-center"><div className="flex items-center gap-2 text-green-800"><TrendingUp size={20} /><span className="font-bold text-sm">Bu Ay Toplam</span></div><div className="text-xl font-bold text-green-700">{monthlyTotalGram} gr</div></div>
        </div>
    );
};

const MonthlyPerformanceView = ({ orders, selectedDate }) => {
    const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    const currentDate = selectedDate || new Date();
    const [previewImage, setPreviewImage] = useState(null);

    const monthlyStats = useMemo(() => {
        let totalGram = 0;
        let orderCount = 0;
        const productCounts = {};
        const productImages = {};

        orders.forEach(order => {
            if(order.status === 'delivered' && order.createdAt && order.createdAt.seconds) {
                const date = new Date(order.createdAt.seconds * 1000);
                if (date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear()) {
                    orderCount += 1;
                    if(order.items) {
                        order.items.forEach(i => {
                            const gram = (parseGram(i.gram) * (parseInt(i.quantity) || 1));
                            totalGram += gram;
                            
                            const code = i.code || 'Bilinmeyen';
                            if (!productCounts[code]) productCounts[code] = 0;
                            productCounts[code] += (parseInt(i.quantity) || 1);
                            
                            if (!productImages[code] && i.imageUrl && i.imageUrl !== DEFAULT_LOGO_URL) {
                                productImages[code] = i.imageUrl;
                            }
                        });
                    }
                }
            }
        });
        
        const topProducts = Object.entries(productCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([code, count]) => ({
                code,
                count,
                imageUrl: productImages[code]
            }));
        
        return { totalGram, orderCount, topProducts };
    }, [orders, currentDate]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full relative">
            {previewImage && (
                // UPDATE: Changed absolute to fixed with high z-index
                <div 
                    className="fixed inset-0 z-[500] bg-black/80 flex items-center justify-center p-4 cursor-pointer backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setPreviewImage(null)}
                >
                    <div className="relative bg-white p-2 rounded-lg max-w-sm w-full">
                        <img src={previewImage} className="w-full h-auto rounded max-h-[80vh] object-contain mx-auto" alt="Preview"/>
                        <div className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1">
                            <X size={20}/>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <Activity size={18} className="text-purple-600"/> 
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()} Performansı
                </h3>
            </div>
            <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 text-center">
                        <div className="text-purple-600 text-xs font-bold uppercase mb-1">Toplam Sevkiyat</div>
                        <div className="text-3xl font-bold text-purple-800">{monthlyStats.orderCount}</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center">
                        <div className="text-green-600 text-xs font-bold uppercase mb-1">Toplam Teslimat</div>
                        <div className="text-3xl font-bold text-green-800">{monthlyStats.totalGram.toFixed(2)} <span className="text-sm">gr</span></div>
                    </div>
                </div>
                
                <h4 className="font-bold text-slate-600 text-sm mb-3">En Çok Satılan 10 Model</h4>
                <div className="space-y-2">
                    {monthlyStats.topProducts.length > 0 ? (
                        monthlyStats.topProducts.map((item, index) => (
                            <div key={item.code} className="flex items-center justify-between text-sm border-b border-slate-50 pb-2 hover:bg-slate-50 rounded px-2 transition-colors">
                                <div className="flex items-center gap-3">
                                    <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold ${index < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {index + 1}
                                    </span>
                                    <button 
                                        onClick={() => item.imageUrl && setPreviewImage(item.imageUrl)}
                                        className={`font-medium text-slate-700 ${item.imageUrl ? 'hover:text-blue-600 hover:underline cursor-pointer' : 'cursor-default'}`}
                                    >
                                        {item.code}
                                    </button>
                                </div>
                                <div className="font-bold text-slate-800">{item.count} Adet</div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-slate-400 py-4 text-sm italic">Bu ay henüz satış yok.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ==========================================
// FILE: src/components/Modules/MessagingModule.js
// ==========================================
const MessagingModule = ({ appId, currentUserProfile, targetChatUser }) => {
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newMessage, setNewMessage] = useState("");
    const [previewImage, setPreviewImage] = useState(null); 
    const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, type: null, id: null, title: '', message: '' });
    
    // Upload States
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false); // Sürükle bırak state'i
    const fileInputRef = useRef(null);

    const messagesEndRef = useRef(null); 
    const scrollContainerRef = useRef(null); 

    const isOnline = (user) => {
        if (!user) return false;
        if (user.isOnline === true) {
            if (user.lastLogin && user.lastLogin.seconds) {
                 const now = new Date();
                 const loginDate = new Date(user.lastLogin.seconds * 1000);
                 const diffMinutes = (now - loginDate) / 1000 / 60;
                 return diffMinutes < 5; 
            }
            return true;
        }
        return false;
    };

    useEffect(() => {
        const unsubUsers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'app_users'), (snap) => {
            const fetchedUsers = snap.docs.map(d => ({id:d.id, ...d.data()})).filter(u => u.uid !== currentUserProfile.uid);
            const uniqueUsers = Array.from(new Map(fetchedUsers.map(u => [u.email, u])).values());
            setUsers(uniqueUsers);
        });
        const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'messages'), orderBy('createdAt', 'asc'));
        const unsubMsgs = onSnapshot(q, (snap) => {
            setMessages(snap.docs.map(d => ({id:d.id, ...d.data()})).filter(m => (m.senderId === currentUserProfile.uid) || (m.receiverId === currentUserProfile.uid)));
        });
        return () => { unsubUsers(); unsubMsgs(); };
    }, [appId, currentUserProfile]);

    // Handle deep linking to a chat
    useEffect(() => {
        if (targetChatUser && users.length > 0) {
            const foundUser = users.find(u => u.uid === targetChatUser);
            if (foundUser) {
                setSelectedUser(foundUser);
            }
        }
    }, [targetChatUser, users]);
    
    useEffect(() => {
        if (selectedUser && messages.length > 0) {
            const unreadMessages = messages.filter(m => 
                m.senderId === selectedUser.uid && 
                m.receiverId === currentUserProfile.uid && 
                !m.read
            );

            if (unreadMessages.length > 0) {
                const batch = writeBatch(db);
                unreadMessages.forEach(m => {
                    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'messages', m.id);
                    batch.update(ref, { read: true });
                });
                batch.commit().catch(console.error);
            }
        }
    }, [selectedUser, messages, appId, currentUserProfile.uid]);

    const scrollToBottom = (behavior = 'smooth') => {
         if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
         }
    };

    useLayoutEffect(() => {
        scrollToBottom('auto'); 
    }, [messages, selectedUser]);
    
    const handleSendMessage = async (e) => { e.preventDefault(); if(!newMessage.trim() || !selectedUser) return; await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'messages'), { content: newMessage, senderId: currentUserProfile.uid, senderName: currentUserProfile.displayName || currentUserProfile.email, senderEmail: currentUserProfile.email, receiverId: selectedUser.uid, receiverName: selectedUser.displayName || selectedUser.email, createdAt: serverTimestamp(), read: false, type: 'text' }); setNewMessage(""); };
    
    // GÜNCELLENMİŞ: Ortak Yükleme Fonksiyonu
    const uploadFile = async (file) => {
        if (!file) return;
        if (!selectedUser) {
            alert("Lütfen önce bir kişi seçiniz.");
            return;
        }

        setIsUploading(true);
        // "Dosya gönderiliyor yazmasın" -> Bildirimleri kaldırdık, sadece buton üzerinde state olacak.

        try {
            // Görseller için Base64 dönüşümü (Storage yerine Firestore)
            if (file.type.startsWith('image/')) {
                const processed = await processFile(file); // Sıkıştır ve Base64'e çevir
                
                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'messages'), {
                    content: 'Görsel paylaşıldı',
                    senderId: currentUserProfile.uid,
                    senderName: currentUserProfile.displayName || currentUserProfile.email,
                    senderEmail: currentUserProfile.email,
                    receiverId: selectedUser.uid,
                    receiverName: selectedUser.displayName || selectedUser.email,
                    createdAt: serverTimestamp(),
                    read: false,
                    type: 'image',
                    imageUrl: processed.base64,
                    fileName: file.name,
                    fileSize: file.size,
                    fileType: file.type
                });
                setIsUploading(false);
                if(fileInputRef.current) fileInputRef.current.value = null;
            } else {
                // Diğer dosyalar için (PDF vb.)
                // Küçük dosyaları Base64 yapalım (1MB altı)
                if (file.size < 1048576) {
                    const reader = new FileReader();
                    reader.onload = async (e) => {
                        const base64 = e.target.result;
                        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'messages'), {
                            content: file.name,
                            senderId: currentUserProfile.uid,
                            senderName: currentUserProfile.displayName || currentUserProfile.email,
                            senderEmail: currentUserProfile.email,
                            receiverId: selectedUser.uid,
                            receiverName: selectedUser.displayName || selectedUser.email,
                            createdAt: serverTimestamp(),
                            read: false,
                            type: 'file',
                            fileUrl: base64, 
                            fileName: file.name,
                            fileSize: file.size,
                            fileType: file.type
                        });
                        setIsUploading(false);
                        if(fileInputRef.current) fileInputRef.current.value = null;
                    };
                    reader.readAsDataURL(file);
                } else {
                    // Büyük dosyalarda uyarı ver (Storage bu ortamda güvenilmez)
                    alert("Çok büyük dosyalar bu ortamda gönderilemez. Lütfen 1MB altı dosya seçiniz.");
                    setIsUploading(false);
                }
            }
        } catch (err) {
            console.error("Yükleme hatası:", err);
            alert("Mesaj gönderilemedi.");
            setIsUploading(false);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        uploadFile(file);
    };

    // GÜNCELLENMİŞ: Sürükle Bırak Fonksiyonları
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            uploadFile(e.dataTransfer.files[0]);
        }
    };

    const triggerDelete = (type, id = null) => {
        setDeleteConfig({
            isOpen: true,
            type,
            id,
            title: type === 'all' ? 'Sohbeti Temizle' : 'Mesajı Sil',
            message: type === 'all' 
                ? 'Bu kişiyle olan TÜM mesajlaşma geçmişini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.' 
                : 'Bu mesajı silmek istediğinize emin misiniz?'
        });
    };

    const executeDelete = async () => {
        try {
            if (deleteConfig.type === 'single' && deleteConfig.id) {
                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'messages', deleteConfig.id));
            } else if (deleteConfig.type === 'all' && selectedUser) {
                const batch = writeBatch(db);
                const chatMessages = messages.filter(m => 
                    (m.senderId === currentUserProfile.uid && m.receiverId === selectedUser.uid) || 
                    (m.senderId === selectedUser.uid && m.receiverId === currentUserProfile.uid)
                );
                chatMessages.forEach(m => {
                    batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'messages', m.id));
                });
                await batch.commit();
            }
        } catch(e) {
            console.error("Silme hatası", e);
            alert("Bir hata oluştu.");
        } finally {
            setDeleteConfig({ ...deleteConfig, isOpen: false });
        }
    };

    const getUnreadCount = (userId) => messages.filter(m => m.senderId === userId && m.receiverId === currentUserProfile.uid && !m.read).length;

    return (
        <div className="flex h-[600px] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
            <ConfirmationModal 
                isOpen={deleteConfig.isOpen}
                onClose={() => setDeleteConfig({ ...deleteConfig, isOpen: false })}
                onConfirm={executeDelete}
                title={deleteConfig.title}
                message={deleteConfig.message}
            />
            
            {previewImage && <div className="fixed inset-0 z-[400] bg-black/90 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}><img src={previewImage} className="max-w-full max-h-full object-contain"/></div>}
            
            <div className="w-1/3 border-r border-slate-100 bg-slate-50 flex flex-col">
                <div className="p-4 border-b border-slate-200 font-bold text-slate-700 flex items-center gap-2"><Users size={18}/> Kişiler ({users.length})</div>
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    {users.length === 0 && <div className="p-4 text-xs text-center text-slate-400">Henüz kayıtlı kullanıcı yok.</div>}
                    {users.map(u => (
                        <div key={u.id} onClick={() => setSelectedUser(u)} className={`p-3 cursor-pointer border-b border-slate-100 group relative ${selectedUser?.id === u.id ? 'bg-yellow-50 border-yellow-200' : ''}`}>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${isOnline(u) ? 'bg-green-500 shadow-green-200' : 'bg-red-500 shadow-red-200'}`} title={isOnline(u) ? 'Çevrimiçi' : 'Çevrimdışı'}></div>
                                    <span className="font-bold text-sm text-slate-800">{u.displayName || "Kullanıcı"}</span>
                                </div>
                                {getUnreadCount(u.uid) > 0 && <span className="bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">{getUnreadCount(u.uid)}</span>}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate pl-4.5">{u.email}</div>
                        </div>
                    ))}
                </div>
            </div>
            
            <div 
                className="flex-1 flex flex-col bg-slate-50/30 relative" 
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                 {/* Drag & Drop Overlay */}
                 {dragActive && selectedUser && (
                    <div className="absolute inset-0 z-[100] bg-blue-500/10 backdrop-blur-sm border-2 border-dashed border-blue-500 flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-200">
                        <div className="bg-white p-6 rounded-full shadow-xl mb-4 text-blue-600">
                            <Upload size={48} />
                        </div>
                        <h3 className="text-xl font-bold text-blue-900">Dosyayı Buraya Bırakın</h3>
                        <p className="text-blue-700 font-medium mt-1">{selectedUser.displayName} kişisine gönderilecek</p>
                    </div>
                 )}

                 {selectedUser ? (
                    <>
                        <div className="p-3 bg-white border-b flex justify-between items-center font-bold text-slate-800">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isOnline(selectedUser) ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <span>{selectedUser.displayName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => triggerDelete('all')} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors" title="Tüm Sohbeti Sil"><Trash size={18}/></button>
                                <button onClick={()=>{setSelectedUser(null)}} className="text-slate-400 hover:text-slate-600 p-2"><X size={18}/></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 custom-scrollbar relative" ref={scrollContainerRef}>
                            
                            {messages.filter(m => (m.senderId === currentUserProfile.uid && m.receiverId === selectedUser.uid) || (m.senderId === selectedUser.uid && m.receiverId === currentUserProfile.uid)).map(m => (
                                <div key={m.id} className={`flex ${m.senderId === currentUserProfile.uid ? 'justify-end' : 'justify-start'} group relative items-end gap-2`}>
                                    
                                    <div className={`${m.senderId === currentUserProfile.uid ? 'order-first' : 'order-last'}`}>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); triggerDelete('single', m.id); }} 
                                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                            title="Mesajı Sil"
                                        >
                                            <Trash size={16}/>
                                        </button>
                                    </div>
                                    
                                    <div className={`p-3 rounded-2xl text-sm max-w-[85%] break-words shadow-sm relative ${m.senderId === currentUserProfile.uid ? 'bg-slate-800 text-white rounded-br-none' : 'bg-white border rounded-bl-none'}`}>
                                        {m.type === 'image' ? (
                                            <div className="overflow-hidden rounded-lg relative group/img">
                                                <img 
                                                    src={m.imageUrl} 
                                                    className="w-full h-auto max-h-64 object-cover cursor-pointer bg-slate-100" 
                                                    onClick={()=>setPreviewImage(m.imageUrl)}
                                                    onLoad={() => scrollToBottom()} 
                                                    loading="lazy"
                                                />
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleDownload(m.imageUrl, `gorsel_${m.id}.png`); }}
                                                    className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity"
                                                    title="Görseli İndir"
                                                >
                                                    <Download size={16} />
                                                </button>
                                            </div>
                                        ) : m.type === 'file' ? (
                                            <div className="flex items-center gap-3 min-w-[200px]">
                                                <div className="bg-slate-700/20 p-2.5 rounded-lg shrink-0">
                                                    <FileIcon size={28} className={m.senderId === currentUserProfile.uid ? 'text-blue-200' : 'text-slate-500'} />
                                                </div>
                                                <div className="overflow-hidden min-w-0 flex-1">
                                                    <div className="font-bold truncate text-xs mb-0.5" title={m.fileName}>{m.fileName}</div>
                                                    <div className="text-[10px] opacity-70">
                                                        {m.fileSize ? (m.fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'Dosya'}
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleDownload(m.fileUrl, m.fileName)}
                                                    className="p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors shrink-0" 
                                                    title="İndir"
                                                >
                                                    <Download size={18} />
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="whitespace-pre-wrap break-words">{m.content}</span>
                                        )}
                                        {m.senderId === currentUserProfile.uid && (
                                            <div className="flex justify-end mt-1 -mr-1">
                                                {m.read ? (
                                                    <CheckCheck size={14} className="text-blue-400" strokeWidth={3} />
                                                ) : (
                                                    <Check size={14} className="text-slate-500" strokeWidth={3} />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef}></div>
                        </div>
                        <form onSubmit={handleSendMessage} className="p-3 bg-white border-t flex gap-2 items-center">
                            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                            <button 
                                type="button" 
                                onClick={() => fileInputRef.current?.click()} 
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative"
                                title="Dosya Gönder"
                                disabled={isUploading}
                            >
                                {isUploading ? <Loader2 size={20} className="animate-spin text-blue-500"/> : <Paperclip size={20}/>}
                            </button>
                            <input className="flex-1 bg-slate-100 border-0 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-100 outline-none" placeholder="Mesaj..." value={newMessage} onChange={e => setNewMessage(e.target.value)} />
                            <button type="submit" disabled={isUploading} className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white rounded-full p-2 transition-colors"><Send size={18}/></button>
                        </form>
                    </>
                 ) : <div className="flex-1 flex items-center justify-center text-slate-400">Kişi Seçin</div>}
            </div>
        </div>
    );
};

// ==========================================
// FILE: src/components/Modules/AIStudio.js (Eski: SocialMediaEditor)
// ==========================================
const AIStudio = () => {
    // Çerçeveyi localStorage'dan veya varsayılan değerden al
    const [customFrameUrl, setCustomFrameUrl] = useState(() => {
        return localStorage.getItem('sahra_studio_frame') || DEFAULT_FRAME_URL;
    });

    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const frameInputRef = useRef(null); // Gizli dosya inputu için ref
    const [userImage, setUserImage] = useState(null);
    const [frameImage, setFrameImage] = useState(null);
    const [imgState, setImgState] = useState({ x: 0, y: 0, w: 200, h: 200, aspect: 1 });
    const [prodCode, setProdCode] = useState("");
    const [prodGram, setProdGram] = useState("");
    
    // GÜNCELLEME: Sürükleme ve Boyutlandırma state'leri
    const [showGrid, setShowGrid] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragType, setDragType] = useState(null); // 'move' or 'resize'
    const [activeHandle, setActiveHandle] = useState(null); // 'tl', 'tr', 'bl', 'br'
    
    // GÜNCELLEME: React state gecikmesini önlemek için ref kullanıyoruz
    const startPosRef = useRef({ x: 0, y: 0 });
    const startImgStateRef = useRef({ x: 0, y: 0, w: 0, h: 0 });

    useEffect(() => {
        if(customFrameUrl) { 
            const img = new Image(); 
            img.crossOrigin = "anonymous"; 
            img.src = customFrameUrl; 
            img.onload = () => setFrameImage(img); 
        }
    }, [customFrameUrl]);

    // Ayarlar butonuna tıklanınca dosya seçiciyi aç
    const handleFrameSettingsClick = () => {
        if(frameInputRef.current) {
            frameInputRef.current.click();
        }
    };

    // Dosya seçildiğinde çerçeveyi güncelle ve kaydet
    const handleFrameSettingsUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
             const reader = new FileReader();
             reader.onload = (evt) => {
                 const res = evt.target.result;
                 setCustomFrameUrl(res);
                 localStorage.setItem('sahra_studio_frame', res); // Kalıcı olarak sakla
             };
             reader.readAsDataURL(file);
        }
    };

    // Yardımcı: Mouse pozisyonunu canvas koordinatlarına çevir
    const getMousePos = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        // Scale faktörünü hesaba kat (CSS boyutu vs Canvas boyutu)
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    };

    const draw = useCallback((isExport = false) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 1. Çerçeveyi Çiz
        if (frameImage) ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
        
        // 2. Kullanıcı Resmini Çiz
        if (userImage) {
            ctx.drawImage(userImage, imgState.x, imgState.y, imgState.w, imgState.h);
            
            // Eğer resim varsa ve export modunda değilsek
            if (!isExport) {
                const handleSize = 10;
                ctx.strokeStyle = "#2563eb"; // Blue 600
                ctx.lineWidth = 2;
                
                // Seçim kutusu
                ctx.strokeRect(imgState.x, imgState.y, imgState.w, imgState.h);
                
                // Köşe tutamaçları
                ctx.fillStyle = "#ffffff";
                // Sol Üst
                ctx.fillRect(imgState.x - handleSize/2, imgState.y - handleSize/2, handleSize, handleSize);
                ctx.strokeRect(imgState.x - handleSize/2, imgState.y - handleSize/2, handleSize, handleSize);
                // Sağ Üst
                ctx.fillRect(imgState.x + imgState.w - handleSize/2, imgState.y - handleSize/2, handleSize, handleSize);
                ctx.strokeRect(imgState.x + imgState.w - handleSize/2, imgState.y - handleSize/2, handleSize, handleSize);
                // Sol Alt
                ctx.fillRect(imgState.x - handleSize/2, imgState.y + imgState.h - handleSize/2, handleSize, handleSize);
                ctx.strokeRect(imgState.x - handleSize/2, imgState.y + imgState.h - handleSize/2, handleSize, handleSize);
                // Sağ Alt
                ctx.fillRect(imgState.x + imgState.w - handleSize/2, imgState.y + imgState.h - handleSize/2, handleSize, handleSize);
                ctx.strokeRect(imgState.x + imgState.w - handleSize/2, imgState.y + imgState.h - handleSize/2, handleSize, handleSize);
            }
        }

        // 3. Izgarayı Çiz (Eğer aktifse ve export değilse)
        if (showGrid && !isExport) {
            ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
            ctx.lineWidth = 1;
            const gridSize = 50;
            
            // Dikey çizgiler
            for (let x = 0; x <= canvas.width; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }
            
            // Yatay çizgiler
            for (let y = 0; y <= canvas.height; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }
            
            // Merkez çizgileri (Kırmızı)
            ctx.strokeStyle = "rgba(255, 0, 0, 0.4)";
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(canvas.width/2, 0); ctx.lineTo(canvas.width/2, canvas.height); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, canvas.height/2); ctx.lineTo(canvas.width, canvas.height/2); ctx.stroke();
        }

        // 4. Metinleri Çiz
        if (prodCode || prodGram) {
            ctx.textAlign = "right"; 
            ctx.fillStyle = "#000000";
            
            const alignRightX = canvas.width - 40;

            if(prodGram) {
                 // GÜNCELLEME: Gram için Myriad Arabic Regular 38pt
                 ctx.font = "normal 38pt 'Myriad Arabic', sans-serif";
                 // Trim ile boşlukları temizle
                 // GÜNCELLEME: gr ile boşluk kaldırıldı
                 ctx.fillText(prodGram.trim() + "gr", alignRightX, canvas.height - 40);
            }
            if(prodCode) {
                // GÜNCELLEME: Kod için Myriad Arabic Bold 40pt
                ctx.font = "bold 40pt 'Myriad Arabic', sans-serif";
                // Trim ile boşlukları temizle
                ctx.fillText(prodCode.trim(), alignRightX, canvas.height - 100);
            }
        }
    }, [userImage, frameImage, imgState, prodCode, prodGram, showGrid]);

    useEffect(() => { draw(); }, [draw]);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) { 
            const img = new Image(); 
            img.onload = () => { 
                setUserImage(img);
                // Başlangıçta ortala
                const canvas = canvasRef.current;
                const aspect = img.width / img.height;
                const initialW = 300;
                const initialH = initialW / aspect;
                setImgState({
                    x: (canvas.width - initialW) / 2, 
                    y: (canvas.height - initialH) / 2, 
                    w: initialW, 
                    h: initialH, 
                    aspect: aspect
                }); 
            }; 
            img.src = URL.createObjectURL(file); 
        }
    };

    // GÜNCELLEME: Mouse Event Handler'ları (ref kullanarak)
    const handleMouseDown = (e) => {
        if (!userImage) return;
        const pos = getMousePos(e);
        const handleSize = 20; // Tıklama alanı biraz daha geniş olsun (Daha kolay tutuş)

        let currentType = null;
        let currentHandle = null;

        // Köşe Kontrolü (Resize)
        // TL
        if (Math.abs(pos.x - imgState.x) < handleSize && Math.abs(pos.y - imgState.y) < handleSize) {
            currentType = 'resize'; currentHandle = 'tl';
        }
        // TR
        else if (Math.abs(pos.x - (imgState.x + imgState.w)) < handleSize && Math.abs(pos.y - imgState.y) < handleSize) {
            currentType = 'resize'; currentHandle = 'tr';
        }
        // BL
        else if (Math.abs(pos.x - imgState.x) < handleSize && Math.abs(pos.y - (imgState.y + imgState.h)) < handleSize) {
            currentType = 'resize'; currentHandle = 'bl';
        }
        // BR
        else if (Math.abs(pos.x - (imgState.x + imgState.w)) < handleSize && Math.abs(pos.y - (imgState.y + imgState.h)) < handleSize) {
            currentType = 'resize'; currentHandle = 'br';
        }
        // Resim Üzeri (Move)
        else if (pos.x > imgState.x && pos.x < imgState.x + imgState.w && pos.y > imgState.y && pos.y < imgState.y + imgState.h) {
            currentType = 'move'; currentHandle = null;
        }

        if (currentType) {
            // State güncellemeleri
            setDragType(currentType); 
            setActiveHandle(currentHandle); 
            setIsDragging(true);

            // KRİTİK DÜZELTME:
            // React state güncellemeleri asenkrondur. Bu yüzden ref'leri HEMEN güncellememiz gerekir.
            // Aksi takdirde handleMouseMove ilk çalıştığında startPosRef boş kalır ve görsel zıplar.
            startPosRef.current = pos;
            startImgStateRef.current = { ...imgState };
        }
    };

    const handleMouseMove = (e) => {
        if (!isDragging || !userImage) {
            return;
        }

        const pos = getMousePos(e);
        const dx = pos.x - startPosRef.current.x;
        const dy = pos.y - startPosRef.current.y;

        if (dragType === 'move') {
            setImgState(prev => ({
                ...prev,
                x: startImgStateRef.current.x + dx,
                y: startImgStateRef.current.y + dy
            }));
        } else if (dragType === 'resize') {
            const startState = startImgStateRef.current;
            let newW = startState.w;
            let newH = startState.h;
            let newX = startState.x;
            let newY = startState.y;

            // Aspect ratio koruyarak resize
            
            if (activeHandle === 'br') {
                newW = startState.w + dx;
                newH = newW / imgState.aspect;
            } else if (activeHandle === 'bl') {
                newW = startState.w - dx;
                newH = newW / imgState.aspect;
                newX = startState.x + dx;
            } else if (activeHandle === 'tr') {
                newW = startState.w + dx;
                newH = newW / imgState.aspect;
                newY = startState.y - (newH - startState.h);
            } else if (activeHandle === 'tl') {
                newW = startState.w - dx;
                newH = newW / imgState.aspect;
                newX = startState.x + dx;
                newY = startState.y - (newH - startState.h);
            }

            // Minimum boyut kontrolü
            if (newW > 20 && newH > 20) {
                setImgState({
                    ...imgState,
                    x: newX,
                    y: newY,
                    w: newW,
                    h: newH
                });
            }
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setDragType(null);
        setActiveHandle(null);
    };

    // GÜNCELLEME: Ortala Fonksiyonu
    const centerImage = () => {
        if (!userImage) return;
        const canvas = canvasRef.current;
        setImgState(prev => ({
            ...prev,
            x: (canvas.width - prev.w) / 2,
            y: (canvas.height - prev.h) / 2
        }));
    };
    
    // GÜNCELLEME: İndirme Fonksiyonu - Temiz Çizim
    const handleDownloadImage = () => {
        // Önce temiz çiz (UI yok)
        draw(true);
        
        // Kısa bir gecikmeyle indir (rendering bitmesi için)
        setTimeout(() => {
             try {
                 const link = document.createElement('a');
                 link.download = 'sahra_studio.png';
                 link.href = canvasRef.current.toDataURL();
                 link.click();
             } catch(e) {
                 console.error("İndirme hatası", e);
             } finally {
                 // UI'ı geri getir
                 draw(false);
             }
        }, 50);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full flex flex-row gap-6 relative">
            {/* GİZLİ INPUT: Çerçeve Yükleme */}
            <input 
                type="file" 
                ref={frameInputRef} 
                onChange={handleFrameSettingsUpload} 
                className="hidden" 
                accept="image/*"
            />
            
            {/* AYARLAR BUTONU: Sağ Üst Köşe */}
            <button 
                onClick={handleFrameSettingsClick}
                className="absolute top-4 right-4 z-20 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors shadow-sm"
                title="Varsayılan Çerçeveyi Değiştir"
            >
                <Settings size={20} />
            </button>

            <div className="w-1/3 flex flex-col gap-4">
                 <div className="bg-slate-50 p-4 rounded-lg shadow-inner">
                    <h3 className="font-bold mb-4 text-slate-800 flex items-center gap-2"><Wand2 size={18} className="text-purple-600"/> Stüdyo</h3>
                    <div className="space-y-3">
                        {/* Çerçeve Görseli Input'u Kaldırıldı (Kullanıcı İsteği) */}
                        
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Monitor size={12}/> Ürün Görseli</label>
                            <input type="file" onChange={handleImageUpload} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                        </div>
                        <div className="border-t border-slate-200 my-2"></div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">Ürün Kodu</label>
                                <input type="text" placeholder="Kod" value={prodCode} onChange={e=>setProdCode(e.target.value)} className="w-full border p-2 rounded text-sm"/>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">Gram</label>
                                <input type="text" placeholder="Gram" value={prodGram} onChange={e=>setProdGram(e.target.value)} className="w-full border p-2 rounded text-sm"/>
                            </div>
                        </div>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-2">
                     <button 
                        onClick={() => setShowGrid(!showGrid)}
                        className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 border transition-all ${showGrid ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                     >
                        <Grid size={16}/> Izgara {showGrid ? 'Açık' : 'Kapalı'}
                     </button>
                     <button 
                        onClick={centerImage}
                        disabled={!userImage}
                        className="py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                     >
                        <AlignCenter size={16}/> Ortala
                     </button>
                 </div>

                 <button onClick={handleDownloadImage} className="bg-slate-900 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-slate-800 flex items-center justify-center gap-2 mt-auto">
                    <Download size={20}/> Tasarımı İndir
                 </button>
            </div>
            <div className="flex-1 bg-slate-100 rounded-xl p-4 flex items-center justify-center border border-slate-200 relative overflow-hidden group">
                <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-50 pointer-events-none"></div>
                <canvas 
                    ref={canvasRef} 
                    width={800} 
                    height={800} 
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    className={`w-auto h-full max-h-[600px] bg-white shadow-2xl rounded-lg relative z-10 ${userImage ? 'cursor-grab active:cursor-grabbing' : ''}`}
                />
                <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-slate-500 shadow-sm border pointer-events-none flex items-center gap-2">
                    {isDragging ? <MousePointer2 size={12} className="animate-pulse text-blue-500"/> : null} 
                    Canlı Önizleme
                </div>
            </div>
        </div>
    );
};

// ==========================================
// FILE: src/components/Admin/AdminSubViews.js
// ==========================================

const AdminDashboard = ({ products, orders, dashboardDate, setDashboardDate }) => {
    
    // Atölyedeki (Preparing) siparişlerin sayısını ve gramajını hesapla
    const workshopStats = useMemo(() => {
        const preparingOrders = orders.filter(o => o.status === 'preparing');
        let totalGrams = 0;
        
        preparingOrders.forEach(order => {
            if (order.items) {
                order.items.forEach(item => {
                    const gram = parseGram(item.gram);
                    const qty = parseInt(item.quantity) || 1;
                    totalGrams += (gram * qty);
                });
            }
        });
        
        return {
            count: preparingOrders.length,
            grams: totalGrams.toFixed(2)
        };
    }, [orders]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-2xl font-bold text-slate-800">Panel Özeti</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-slate-500 text-sm font-bold mb-1">Toplam Ürün</div>
                    <div className="text-3xl font-bold text-slate-800">{products.length}</div>
                </div>
                {/* Değiştirilen Kart: Atölyedeki Siparişler */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-slate-500 text-sm font-bold mb-1">Atölyedeki Sipariş</div>
                    <div className="flex items-end gap-2">
                         <div className="text-3xl font-bold text-slate-800">{workshopStats.count}</div>
                         <div className="text-sm font-bold text-slate-400 mb-1">({workshopStats.grams} gr)</div>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SalesCalendar orders={orders} selectedDate={dashboardDate} onDateChange={setDashboardDate} />
                <MonthlyPerformanceView orders={orders} selectedDate={dashboardDate} />
            </div>
        </div>
    );
};

const AdminProductManager = ({ products, editingId, startEditing, cancelEditing, handleDeleteProduct, handleAddProduct, newProduct, setNewProduct, dragActive, handleDrag, handleDrop, isLoading, logoUrl }) => {
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, productId: null });

    const openDeleteModal = useCallback((id) => {
        setDeleteConfirmation({ isOpen: true, productId: id });
    }, []);

    const executeDelete = useCallback(() => {
        if (deleteConfirmation.productId) {
            handleDeleteProduct(deleteConfirmation.productId);
            setDeleteConfirmation({ isOpen: false, productId: null });
        }
    }, [deleteConfirmation.productId, handleDeleteProduct]);

    const groupedProducts = useMemo(() => {
        const grouped = {};
        products.forEach(p => {
            if (!grouped[p.category]) grouped[p.category] = {};
            const sub = p.subcategory || 'Diğer';
            if (!grouped[p.category][sub]) grouped[p.category][sub] = [];
            grouped[p.category][sub].push(p);
        });
        return grouped;
    }, [products]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <ConfirmationModal 
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ isOpen: false, productId: null })}
                onConfirm={executeDelete}
                title="Ürünü Sil"
                message="Bu ürünü silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
            />

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center mb-2">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Box className="text-blue-500"/> Ürün Yönetimi</h2>
                <div className="text-right"><div className="text-sm font-bold text-slate-500">Toplam Ürün</div><div className="text-2xl font-bold text-blue-600">{products.length} Adet</div></div>
            </div>
            
            <div className={`bg-white p-6 rounded-xl shadow-sm border ${editingId ? 'border-blue-200 ring-2 ring-blue-100' : 'border-slate-200'}`}>
                {editingId && <div className="mb-4 text-sm font-bold text-blue-600 flex items-center gap-2"><Pencil size={16}/> Şu an bir ürünü düzenliyorsunuz</div>}
                <form onSubmit={handleAddProduct} className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[120px]"><label className="block text-xs font-bold text-slate-500 mb-1">Ürün Kodu</label><input required className="w-full border rounded-lg p-3 text-sm font-bold bg-slate-50" value={newProduct.code} onChange={e => setNewProduct({...newProduct, code: e.target.value})} placeholder="Örn: SMG/01" /></div>
                        <div className="flex-1 min-w-[100px]"><label className="block text-xs font-bold text-slate-500 mb-1">Gram</label><input required className="w-full border rounded-lg p-3 text-sm font-bold bg-slate-50" value={newProduct.gram} onChange={e => setNewProduct({...newProduct, gram: e.target.value})} placeholder="0.00" /></div>
                        <div className="flex-1 min-w-[150px]"><label className="block text-xs font-bold text-slate-500 mb-1">Kategori</label><select className="w-full border rounded-lg p-3 text-sm bg-slate-50 font-bold" value={newProduct.category} onChange={e => { const cat = e.target.value; const firstSub = SUBCATEGORIES[cat] && SUBCATEGORIES[cat].length > 0 ? SUBCATEGORIES[cat][0] : 'Genel'; setNewProduct({...newProduct, category: cat, subcategory: firstSub}); }}>{CATEGORIES.filter(c=>c!=='Anasayfa').map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                        <div className="flex-1 min-w-[150px]"><label className="block text-xs font-bold text-slate-500 mb-1">Alt Kategori</label><select className="w-full border rounded-lg p-3 text-sm bg-slate-50 font-bold" value={newProduct.subcategory} onChange={e => setNewProduct({...newProduct, subcategory: e.target.value})}>{SUBCATEGORIES[newProduct.category]?.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                    </div>
                    <div className={`relative w-full h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden group ${dragActive ? 'border-yellow-500 bg-yellow-50 scale-[1.01]' : 'border-slate-300 hover:border-yellow-400 hover:bg-slate-50'}`} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop} onClick={() => document.getElementById('product-file-upload').click()}>
                        <input id="product-file-upload" type="file" accept="image/png, image/jpeg, image/jpg" className="hidden" onChange={(e) => setNewProduct({...newProduct, imageFile: e.target.files[0]})} />
                        {newProduct.imageFile || (editingId && newProduct.imageUrl && newProduct.imageUrl !== logoUrl) ? (<div className="relative w-full h-full flex items-center justify-center"><img src={newProduct.imageFile ? URL.createObjectURL(newProduct.imageFile) : newProduct.imageUrl} className="h-full object-contain" /><div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-white font-bold text-sm">Görseli Değiştir</span></div></div>) : (<div className="text-center p-4"><Upload className={`mx-auto mb-2 ${dragActive ? 'text-yellow-600' : 'text-slate-400'}`} size={32}/><p className="text-sm font-bold text-slate-600">Fotoğrafı buraya sürükleyin</p></div>)}
                    </div>
                    <div className="flex gap-2">
                        {editingId && <button type="button" onClick={cancelEditing} className="flex-1 bg-slate-200 text-slate-700 py-4 rounded-xl font-bold">Vazgeç</button>}
                        <button disabled={isLoading} type="submit" className={`flex-[2] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 ${editingId ? 'bg-blue-600' : 'bg-slate-900'}`}>{isLoading ? <RefreshCcw className="animate-spin" size={20}/> : <>{editingId ? <Save size={20}/> : <Plus size={20}/>} {editingId ? 'Güncelle' : 'Ürünü Kaydet'}</>}</button>
                    </div>
                </form>
            </div>

            <div className="space-y-4">
                {Object.entries(groupedProducts).sort(([catA], [catB]) => CATEGORIES.indexOf(catA) - CATEGORIES.indexOf(catB)).map(([category, subcategories]) => (
                    <CollapsibleSection key={category} title={category} count={Object.values(subcategories).reduce((acc, curr) => acc + curr.length, 0)} level={0}>
                        <div className="space-y-2 mt-2">
                            {Object.entries(subcategories).sort(([subA], [subB]) => subA.localeCompare(subB, undefined, { numeric: true, sensitivity: 'base' })).map(([subcategory, items]) => (
                                <CollapsibleSection key={subcategory} title={subcategory} count={items.length} level={1}>
                                    <PaginatedProductGrid items={[...items].sort(naturalSort)} editingId={editingId} startEditing={startEditing} onDeleteClick={openDeleteModal} />
                                </CollapsibleSection>
                            ))}
                        </div>
                    </CollapsibleSection>
                ))}
            </div>
        </div>
    );
};

const AdminOrderManager = ({ orders, onCreateNewOrder, onViewOrder, handleUpdateStatus, handleDeleteOrder }) => {
    const [activeStatusFilter, setActiveStatusFilter] = useState('new');
    const [isEditMode, setIsEditMode] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, orderId: null });

    const openDeleteModal = (id) => {
        setDeleteConfirmation({ isOpen: true, orderId: id });
    };

    const executeDelete = () => {
        if (deleteConfirmation.orderId) {
            handleDeleteOrder(deleteConfirmation.orderId);
            setDeleteConfirmation({ isOpen: false, orderId: null });
        }
    };
    
    const filteredOrders = useMemo(() => {
        if (activeStatusFilter === 'all') return orders;
        return orders.filter(o => o.status === activeStatusFilter);
    }, [orders, activeStatusFilter]);

    const statusCounts = useMemo(() => {
        const counts = { all: orders.length, new: 0, preparing: 0, ready: 0, delivered: 0 };
        orders.forEach(o => { if (counts[o.status] !== undefined) counts[o.status]++; });
        return counts;
    }, [orders]);

    return (
        <div className="h-full flex flex-col pb-4">
            <ConfirmationModal 
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ isOpen: false, orderId: null })}
                onConfirm={executeDelete}
                title="Siparişi Sil"
                message="Bu listeyi kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
            />

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Sipariş Yönetimi</h2>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsEditMode(!isEditMode)} 
                        className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm border transition-colors ${isEditMode ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >
                        {isEditMode ? <Check size={18}/> : <Pencil size={18}/>}
                        {isEditMode ? 'Bitti' : 'Düzenle'}
                    </button>
                    <button onClick={onCreateNewOrder} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg hover:bg-slate-800"><Plus size={18}/> Yeni Sipariş Oluştur</button>
                </div>
            </div>
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 pt-2 custom-scrollbar">
                    <button onClick={() => setActiveStatusFilter('all')} className={`px-4 py-2 rounded-full text-xs font-bold border whitespace-nowrap min-w-fit ${activeStatusFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>Tümü ({statusCounts.all})</button>
                    {Object.entries(ORDER_STAGES).map(([key, info]) => (
                        <button key={key} onClick={() => setActiveStatusFilter(key)} className={`px-4 py-2 rounded-full text-xs font-bold border whitespace-nowrap min-w-fit flex items-center gap-2 ${activeStatusFilter === key ? 'bg-white ring-2 ring-blue-500' : 'bg-white text-slate-600'}`}>
                            <info.icon size={14}/> {info.label} ({statusCounts[key]})
                        </button>
                    ))}
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredOrders.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).map(order => (
                        <div key={order.id} className="relative bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            {(order.status === 'new' || isEditMode) && (
                                <button 
                                    onClick={() => openDeleteModal(order.id)} 
                                    className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-500 hover:text-white transition-colors z-10"
                                    title="Siparişi Sil"
                                >
                                    <Minus size={16}/>
                                </button>
                            )}
                            <div className="flex justify-between items-start mb-3 pr-8">
                                <div><h3 className="font-bold text-slate-800 text-base capitalize">{order.customerName}</h3><div className="text-xs text-slate-400 font-mono mt-0.5">{new Date(order.createdAt?.seconds * 1000).toLocaleString('tr-TR')}</div></div>
                                <div className={`px-2 py-1 rounded-lg text-xs font-bold border ${ORDER_STAGES[order.status].color}`}>{ORDER_STAGES[order.status].label}</div>
                            </div>
                            <div className="bg-slate-50 rounded-lg border border-slate-100 p-3 mb-4 space-y-2">
                                {(order.items || []).slice(0, 3).map((item, idx) => <div key={idx} className="flex justify-between items-center text-xs text-slate-600"><span className="font-bold">{item.code}</span><span>x{item.quantity}</span></div>)}
                                {(order.items || []).length > 3 && <div className="text-[10px] text-slate-400 italic text-center">+ {(order.items.length - 3)} diğer</div>}
                            </div>
                            <div className="flex justify-between pt-3 border-t border-slate-100 mt-2">
                                <div className="font-bold text-slate-800 text-sm">{order.items ? order.items.reduce((acc, item) => acc + (parseGram(item.gram) * (parseInt(item.quantity) || 1)), 0).toFixed(2) : "0.00"} gr</div>
                                <div className="flex gap-2">
                                    {order.status === 'new' && (
                                        <button 
                                            onClick={() => handleUpdateStatus(order.id, 'preparing')} 
                                            className="px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-bold transition-colors shadow-sm"
                                        >
                                            Üretim
                                        </button>
                                    )}
                                    {order.status === 'preparing' && (
                                        <button 
                                            onClick={() => handleUpdateStatus(order.id, 'ready')} 
                                            className="px-3 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg text-xs font-bold transition-colors shadow-sm"
                                        >
                                            Hazır
                                        </button>
                                    )}
                                    {order.status === 'ready' && (
                                        <button 
                                            onClick={() => handleUpdateStatus(order.id, 'delivered')} 
                                            className="px-3 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg text-xs font-bold transition-colors shadow-sm"
                                        >
                                            Teslim
                                        </button>
                                    )}
                                    <button onClick={() => onViewOrder(order)} className="px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors">Detay</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const AdminSettings = ({ logoUrl, handleLogoUpload }) => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 max-w-2xl">
        <h2 className="text-2xl font-bold text-slate-800">Ayarlar</h2>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-4">Mağaza Logosu</h3>
            <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-slate-50 border-2 border-slate-100 rounded-xl flex items-center justify-center overflow-hidden"><img src={logoUrl || DEFAULT_LOGO_URL} alt="Logo" className="w-full h-full object-contain" /></div>
                <div><label className="block mb-2 text-sm text-slate-600 font-bold">Yeni Logo Yükle</label><input type="file" accept="image/png, image/jpeg" onChange={handleLogoUpload} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/><p className="text-[10px] text-slate-400 mt-2">Önerilen boyut: 512x512px (PNG)</p></div>
            </div>
        </div>
    </div>
);

// ==========================================
// FILE: src/layouts/AdminPanelContent.js
// ==========================================
const AdminPanelContent = ({ user, currentUserProfile, appId, products, orders, onClose, handleDeleteProduct, handleUpdateStatus, setNotification, onCreateNewOrder, onViewOrder, handleDeleteOrder, logoUrl, handleUpdateLogo }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [dashboardDate, setDashboardDate] = useState(new Date());
    const [dragActive, setDragActive] = useState(false);
    const [newProduct, setNewProduct] = useState({ code: '', gram: '', category: 'Yüzük', subcategory: 'AS-B', imageUrl: '', imageFile: null });
    const [isLoading, setIsLoading] = useState(false);
    const [editingId, setEditingId] = useState(null); 
    const scrollContainerRef = useRef(null); 
    const [notifications, setNotifications] = useState([]);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [targetChatUser, setTargetChatUser] = useState(null);

    // Bildirim Dinleyicileri
    useEffect(() => {
        if (!currentUserProfile) return;

        // 1. Teslim Tarihi Yaklaşan Siparişleri Kontrol Et (3 gün kala)
        const checkUpcomingOrders = () => {
            const today = new Date();
            const upcoming = orders.filter(order => {
                if (order.status === 'delivered' || !order.deliveryDate) return false;
                const delivery = new Date(order.deliveryDate);
                const diffTime = delivery - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= 3 && diffDays > 0;
            });

            const orderNotifications = upcoming.map(o => ({
                id: `order-${o.id}`,
                type: 'warning',
                title: 'Teslimat Yaklaşıyor',
                message: `${o.customerName} siparişinin teslimine ${Math.ceil((new Date(o.deliveryDate) - today)/(1000*60*60*24))} gün kaldı.`,
                time: new Date()
            }));
            
            setNotifications(prev => {
                // Mevcut olmayanları ekle
                const existingIds = new Set(prev.map(n => n.id));
                const newOnes = orderNotifications.filter(n => !existingIds.has(n.id));
                return [...newOnes, ...prev];
            });
        };

        checkUpcomingOrders();
    }, [orders]);

    useEffect(() => {
        // 2. Yeni Mesajları Dinle
        const q = query(
            collection(db, 'artifacts', appId, 'public', 'data', 'messages'), 
            where('receiverId', '==', currentUserProfile.uid),
            where('read', '==', false),
            orderBy('createdAt', 'desc'),
            limit(10)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const msg = change.doc.data();
                    // Sadece yeni gelenler için (son 1 dk içinde) ses çal
                    const isRecent = msg.createdAt && (new Date() - new Date(msg.createdAt.seconds * 1000)) < 60000;
                    
                    if (isRecent) {
                        try {
                            const audio = new Audio(NOTIFICATION_SOUND_URL);
                            audio.play().catch(e => console.log("Ses çalma hatası:", e));
                        } catch (e) {
                            console.error("Audio error", e);
                        }
                    }

                    setNotifications(prev => {
                        const exists = prev.some(n => n.id === change.doc.id);
                        if (exists) return prev;
                        return [{
                            id: change.doc.id,
                            type: 'message',
                            senderId: msg.senderId,
                            title: `${msg.senderName} size mesaj gönderdi`,
                            message: `${msg.content.substring(0, 30)}${msg.content.length>30?'...':''}`,
                            time: msg.createdAt ? new Date(msg.createdAt.seconds * 1000) : new Date()
                        }, ...prev];
                    });
                }
            });
        });

        return () => unsubscribe();
    }, [appId, currentUserProfile]);

    const handleNotificationClick = (notification) => {
        // UPDATE: Bildirimi okundu olarak işaretle (listeden kaldır)
        setNotifications(prev => prev.filter(n => n.id !== notification.id));

        if (notification.type === 'message' && notification.senderId) {
            setTargetChatUser(notification.senderId);
            setActiveTab('messages');
        }
        setIsNotificationOpen(false);
    };

    const handleLogout = async () => { 
        if (currentUserProfile && currentUserProfile.uid) {
            try {
                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'app_users', currentUserProfile.uid), { 
                    isOnline: false 
                });
            } catch(e) { console.error(e); }
        }
        await signOut(auth); 
        window.location.reload(); 
    };

    const startEditing = useCallback((product) => {
        setEditingId(product.id);
        setNewProduct({ code: product.code, gram: product.gram, category: product.category, subcategory: product.subcategory || 'Genel', imageUrl: product.imageUrl, imageFile: null });
        if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const cancelEditing = useCallback(() => { setEditingId(null); setNewProduct({ code: '', gram: '', category: 'Yüzük', subcategory: 'AS-B', imageUrl: '', imageFile: null }); }, []);

    const handleDrag = (e) => { e.preventDefault(); e.stopPropagation(); if (e.type === "dragenter" || e.type === "dragover") { setDragActive(true); } else if (e.type === "dragleave") { setDragActive(false); } };
    const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files && e.dataTransfer.files[0]) { setNewProduct({...newProduct, imageFile: e.dataTransfer.files[0]}); } };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (file) { try { const base64 = await processFile(file); await handleUpdateLogo(base64.base64); setNotification({type: 'success', message: 'Logo güncellendi'}); } catch (err) { setNotification({type: 'error', message: 'Logo güncellenemedi: ' + err.message}); } }
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        if(!newProduct.code || !newProduct.gram) return alert("Lütfen kod ve gram giriniz.");
        const normalizedCode = newProduct.code.trim().toLowerCase();
        if (products.some(p => p.code.trim().toLowerCase() === normalizedCode && p.id !== editingId)) { setNotification({ type: 'error', message: 'Bu kod ile zaten bir ürün mevcut' }); return; }
        setIsLoading(true);
        try {
            let finalImageUrl = newProduct.imageUrl || logoUrl || DEFAULT_LOGO_URL;
            if (newProduct.imageFile) finalImageUrl = (await processFile(newProduct.imageFile)).base64;
            const productData = { code: newProduct.code, gram: newProduct.gram, category: newProduct.category, subcategory: newProduct.subcategory, imageUrl: finalImageUrl };
            if (editingId) { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', editingId), { ...productData, updatedAt: serverTimestamp() }); setNotification({ type: 'success', message: 'Ürün güncellendi' }); setEditingId(null); } 
            else { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), { ...productData, createdAt: serverTimestamp() }); setNotification({ type: 'success', message: 'Ürün eklendi' }); }
            setNewProduct({ code: '', gram: '', category: newProduct.category, subcategory: newProduct.subcategory, imageUrl: '', imageFile: null });
        } catch (error) { setNotification({ type: 'error', message: error.message }); } finally { setIsLoading(false); }
    };

    return (
        <div className="flex h-screen bg-slate-100">
            <div className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0">
                <div className="p-6 border-b border-slate-800 flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-3 text-2xl font-bold text-yellow-500 overflow-hidden border-2 border-slate-700">{user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover"/> : user.email[0].toUpperCase()}</div>
                    <div className="text-sm font-bold">{user.email}</div>
                    <div className="text-xs text-slate-500">Yönetici</div>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    {['dashboard:Özet', 'products:Ürün Yönetimi', 'orders:Siparişler', 'social:Stüdyo', 'messages:Mesajlar', 'settings:Ayarlar'].map(item => {
                        const [key, label] = item.split(':');
                        return <button key={key} onClick={() => setActiveTab(key)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === key ? 'bg-yellow-500 text-slate-900' : 'text-slate-400 hover:bg-slate-800'}`}>{label}</button>;
                    })}
                </nav>
                <div className="p-4 border-t border-slate-800 space-y-2">
                    <button onClick={onClose} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-xs font-bold">Mağazaya Dön</button>
                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-900/50 hover:bg-red-900 text-red-200 rounded text-xs font-bold"><LogOut size={14}/> Çıkış Yap</button>
                </div>
            </div>

            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                {/* Bildirimler - Absolute Positioning - GÜNCELLENDİ */}
                {/* activeTab ürün yönetimi haricinde göster */}
                {activeTab !== 'products' && (
                    <div className={`absolute right-8 z-50 transition-all duration-300 ease-in-out ${activeTab === 'orders' ? 'top-20' : 'top-4'}`}>
                        <div className="relative">
                            <button 
                                onClick={() => setIsNotificationOpen(!isNotificationOpen)} 
                                className="p-2 text-slate-500 hover:text-slate-800 rounded-full relative transition-colors bg-transparent"
                            >
                                <Bell size={24} />
                                {notifications.length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>}
                            </button>
                            
                            {isNotificationOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsNotificationOpen(false)}></div>
                                    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in slide-in-from-top-2">
                                        <div className="p-3 border-b border-slate-50 font-bold text-sm text-slate-700">Bildirimler</div>
                                        <div className="max-h-80 overflow-y-auto">
                                            {notifications.length === 0 ? (
                                                <div className="p-4 text-center text-xs text-slate-400">Yeni bildirim yok</div>
                                            ) : (
                                                notifications.map((n, i) => (
                                                    <div 
                                                        key={i} 
                                                        onClick={() => handleNotificationClick(n)}
                                                        className={`p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${n.type === 'message' ? 'bg-blue-50/50' : 'bg-yellow-50/50'}`}
                                                    >
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="font-bold text-xs text-slate-800">{n.title}</span>
                                                            <span className="text-[10px] text-slate-400">{n.time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                        </div>
                                                        <div className="text-xs text-slate-600 line-clamp-2">{n.message}</div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        {notifications.length > 0 && (
                                            <button onClick={() => setNotifications([])} className="w-full py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 border-t border-slate-100">Tümünü Temizle</button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-8 relative" ref={scrollContainerRef}>
                    {activeTab === 'dashboard' && <AdminDashboard products={products} orders={orders} dashboardDate={dashboardDate} setDashboardDate={setDashboardDate} />}
                    {activeTab === 'products' && <AdminProductManager products={products} editingId={editingId} startEditing={startEditing} cancelEditing={cancelEditing} handleDeleteProduct={handleDeleteProduct} handleAddProduct={handleAddProduct} newProduct={newProduct} setNewProduct={setNewProduct} dragActive={dragActive} handleDrag={handleDrag} handleDrop={handleDrop} isLoading={isLoading} logoUrl={logoUrl} />}
                    {activeTab === 'orders' && <AdminOrderManager orders={orders} onCreateNewOrder={onCreateNewOrder} onViewOrder={onViewOrder} handleUpdateStatus={handleUpdateStatus} handleDeleteOrder={handleDeleteOrder} />}
                    {activeTab === 'social' && <div className="h-full pb-10"><h2 className="text-2xl font-bold text-slate-800 mb-4">Stüdyo</h2><div className="h-[600px]"><AIStudio /></div></div>}
                    {activeTab === 'messages' && <div className="h-full pb-10"><h2 className="text-2xl font-bold text-slate-800 mb-4">Mesajlar</h2><MessagingModule appId={appId} currentUserProfile={currentUserProfile} targetChatUser={targetChatUser} /></div>}
                    {activeTab === 'settings' && <AdminSettings logoUrl={logoUrl} handleLogoUpload={handleLogoUpload} />}
                </div>
            </div>
        </div>
    );
};

// ==========================================
// FILE: src/components/Store/ProductCard.js
// ==========================================
const ProductCard = React.memo(({ product, onAddToCart, logoUrl }) => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden border border-slate-100 hover:shadow-xl transition-all duration-300 group flex flex-col h-full relative">
    <div className="aspect-square w-full bg-slate-100 relative overflow-hidden">
      <img src={product.imageUrl || logoUrl} alt={product.code} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 select-none" onError={(e) => { e.target.src = logoUrl; }} loading="lazy" />
      <span className="absolute top-2 right-2 bg-yellow-600 text-white text-xs font-bold px-2 py-1 rounded shadow z-10">{product.code}</span>
      <span className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/70 to-transparent text-white text-[10px] p-2 pt-6">{product.category} {product.subcategory && product.subcategory !== "Hepsi" ? `> ${product.subcategory}` : ""}</span>
    </div>
    <div className="p-4 flex flex-col flex-1">
      <div className="flex justify-between items-center mb-3"><h3 className="font-bold text-slate-800 text-sm truncate">{product.code}</h3><span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded font-bold shrink-0 border border-slate-200">{product.gram ? `${product.gram} gr` : "Gram Yok"}</span></div>
      <button onClick={() => onAddToCart(product)} className="w-full mt-auto bg-slate-900 text-white text-sm py-2.5 rounded hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2 font-medium active:scale-95"><Plus size={16} /> Listeye Ekle</button>
    </div>
  </div>
));

// ==========================================
// FILE: src/components/Store/ProductModal.js
// ==========================================
const ProductModal = ({ product, isOpen, onClose, onConfirm }) => {
    const [quantity, setQuantity] = useState(1);
    const [size, setSize] = useState("");
    useEffect(() => { if (isOpen) { setQuantity(1); setSize(""); } }, [isOpen, product]);
    if(!isOpen || !product) return null;
    return (
        <div className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="relative aspect-square bg-slate-100"><img src={product.imageUrl} className="w-full h-full object-contain"/><button onClick={onClose} className="absolute top-4 right-4 bg-white/80 p-2 rounded-full hover:bg-white"><X size={20}/></button></div>
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">{product.code}</h2>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Adet</label><input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))} className="w-full border-2 border-slate-100 rounded-xl p-3 text-center font-bold text-slate-800"/></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Boy / Ölçü</label><input type="text" value={size} onChange={(e) => setSize(e.target.value)} placeholder="Standart" className="w-full border-2 border-slate-100 rounded-xl p-3 text-center font-bold text-slate-800"/></div>
                    </div>
                    <button onClick={()=>{onConfirm({...product, quantity, selectedSize: size}); onClose();}} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 flex items-center justify-center gap-2 shadow-lg active:scale-95"><Plus size={20} /> Listeye Ekle</button>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// FILE: src/components/Shared/UserProfileModal.js
// ==========================================
const UserProfileModal = ({ user, isOpen, onClose }) => {
    const [name, setName] = useState(user?.displayName || "");
    const [position, setPosition] = useState("");
    const [photo, setPhoto] = useState(user?.photoURL || ""); 
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && user) {
            setName(user.displayName || "");
            setPhoto(user.photoURL || ""); 
            const fetchUserData = async () => { try { const docSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'app_users', user.uid)); if (docSnap.exists()) setPosition(docSnap.data().position || ""); } catch (e) { console.error(e); } };
            fetchUserData();
        }
    }, [isOpen, user]);

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const processed = await processFile(file);
                setPhoto(processed.base64); 
            } catch (err) {
                console.error(err);
                alert("Fotoğraf işlenemedi: " + err.message);
            }
        }
    };

    const handleSave = async () => { 
        setLoading(true); 
        try { 
            let finalPhotoUrl = photo;

            if (photo && photo.startsWith('data:')) {
                const storageRef = ref(storage, `profile_photos/${user.uid}/profile_${Date.now()}.jpg`);
                
                const res = await fetch(photo);
                const blob = await res.blob();

                const uploadTask = await uploadBytesResumable(storageRef, blob);
                finalPhotoUrl = await getDownloadURL(uploadTask.ref);
            }

            await updateProfile(user, { displayName: name, photoURL: finalPhotoUrl }); 
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'app_users', user.uid), { 
                uid: user.uid, 
                displayName: name, 
                email: user.email, 
                photoURL: finalPhotoUrl,
                position: position, 
                updatedAt: serverTimestamp() 
            }, { merge: true }); 
            
            alert("Güncellendi!"); 
            onClose(); 
        } catch (error) { 
            console.error("Kayıt hatası:", error);
            alert("Hata oluştu: " + error.message); 
        } finally { 
            setLoading(false); 
        } 
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400"><X size={20}/></button>
                <h3 className="text-lg font-bold text-slate-800 mb-6">Hesap Ayarları</h3>
                
                <div className="flex flex-col items-center mb-6">
                    <div className="relative w-24 h-24 mb-2 group">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-50 shadow-lg bg-slate-100 flex items-center justify-center">
                            {photo ? (
                                <img src={photo} className="w-full h-full object-cover" alt="Profil" />
                            ) : (
                                <div className="text-slate-400 font-bold text-2xl">{name ? name[0]?.toUpperCase() : <User size={40}/>}</div>
                            )}
                        </div>
                        <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                            <Upload className="text-white" size={24}/>
                            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                        </label>
                    </div>
                    <p className="text-xs text-slate-400 font-medium">Fotoğrafı değiştirmek için tıklayın</p>
                </div>

                <div className="flex flex-col gap-4">
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded-lg p-3 text-sm font-bold bg-slate-50" placeholder="Adınız Soyadınız"/>
                    <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} className="w-full border rounded-lg p-3 text-sm font-bold bg-slate-50" placeholder="Örn: Satış Temsilcisi"/>
                    <button onClick={handleSave} disabled={loading} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors">{loading ? "Yükleniyor..." : "Kaydet"}</button>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// FILE: src/components/Order/OrderPreviewModal.js
// ==========================================
const OrderPreviewModal = ({ cart, isOpen, onClose, onRemoveItem, initialData, onCreateOrder, products, onUpdateOrder, draftData, setDraftData, logoUrl }) => {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderKarat, setOrderKarat] = useState(""); 
  const [orderStamp, setOrderStamp] = useState(""); 
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [orderNo, setOrderNo] = useState(""); 
  const [stampType, setStampType] = useState('text'); 
  const [editableItems, setEditableItems] = useState([]);
  const [globalColor, setGlobalColor] = useState(""); 

  const isDraft = initialData?.status === 'draft';
  const isViewingOldOrder = !!initialData;
  const isEditable = !initialData || isDraft;

  const orderStats = useMemo(() => {
    const realItems = editableItems.filter(i => i.code && i.code.toString().trim() !== "" && i.category);
    const totalQty = realItems.reduce((acc, i) => acc + (parseInt(i.quantity) || 0), 0);
    const totalGr = realItems.reduce((acc, i) => acc + (parseGram(i.gram) * (parseInt(i.quantity) || 0)), 0);
    
    const catBreakdown = realItems.reduce((acc, item) => {
        const cat = item.category; 
        if(cat) {
            acc[cat] = (acc[cat] || 0) + (parseInt(item.quantity) || 0);
        }
        return acc;
    }, {});

    return { totalQty, totalGr, catBreakdown, realItems };
  }, [editableItems]);

  const handleStampUpload = async (e) => {
      const file = e.target.files[0];
      if (file) { try { const base64 = (await processFile(file)).base64; setOrderStamp(base64); updateDraft('orderStamp', base64); } catch(err) { console.error(err); } }
  };

  useEffect(() => { if (isOpen) document.body.style.overflow = 'hidden'; else document.body.style.overflow = 'unset'; return () => { document.body.style.overflow = 'unset'; }; }, [isOpen]);
  useEffect(() => { if (isEditable && deliveryDate && orderDate > deliveryDate) { setDeliveryDate(orderDate); } }, [orderDate, deliveryDate, isEditable]);
  
  useEffect(() => {
    if (initialData) {
        setCustomerName(initialData.customerName || ""); setCustomerPhone(initialData.customerPhone || ""); setOrderNo(initialData.customOrderNo || "");
        setEditableItems((initialData.items || []).map((item, idx) => ({ ...item, _tempId: idx, imageUrl: item.imageUrl || logoUrl })));
        setOrderStamp(initialData.orderStamp || ""); setStampType(initialData.orderStamp?.startsWith('data:image') ? 'image' : 'text');
        if(initialData.createdAt && initialData.createdAt.seconds) setOrderDate(new Date(initialData.createdAt.seconds * 1000).toISOString().split('T')[0]);
        setOrderKarat(initialData.orderKarat || initialData.items?.[0]?.selectedKarat || ""); setDeliveryDate(initialData.deliveryDate || ""); 
    } else {
        setCustomerName(draftData?.customerName || ""); setOrderKarat(draftData?.orderKarat || (cart && cart.length > 0 ? cart[0].selectedKarat : "") || ""); setOrderNo(draftData?.customOrderNo || ""); setOrderStamp(draftData?.orderStamp || ""); setStampType(draftData?.stampType || 'text'); setCustomerPhone(draftData?.customerPhone || "");
        setOrderDate(draftData?.orderDate || new Date().toISOString().split('T')[0]); setDeliveryDate(draftData?.deliveryDate || "");
        let initialItems = [];
        if (cart && cart.length > 0) { 
            initialItems = cart.map((item, idx) => ({ ...item, _tempId: idx, imageUrl: item.imageUrl || logoUrl })); 
        } else if (draftData?.items && draftData.items.length > 0) { 
            initialItems = draftData.items.map(item => ({ ...item, imageUrl: item.imageUrl || logoUrl })); 
        } else { 
            initialItems = Array.from({ length: 9 }).map((_, i) => ({ code: "", quantity: 1, gram: "", selectedSize: "", selectedKarat: "", selectedColor: "", note: "", imageUrl: logoUrl, _tempId: `manual_${i}` })); 
        }
        setEditableItems(initialItems);
    }
  }, [initialData, cart, isOpen, logoUrl]);
  
  const compactList = useCallback(() => {
      setEditableItems(prev => {
          const filled = prev.filter(item => (item.code && item.code.trim() !== ""));
          let neededCount = filled.length <= 9 ? 9 : 9 + (Math.ceil((filled.length - 9) / 12) * 12);
          const extraNeeded = Math.max(0, neededCount - filled.length);
          const emptyRows = Array.from({ length: extraNeeded }).map((_, i) => ({ code: "", quantity: 1, gram: "", selectedSize: "", selectedKarat: "", selectedColor: "", note: "", imageUrl: logoUrl, _tempId: `auto_fill_${Date.now()}_${i}` }));
          return [...filled, ...emptyRows];
      });
  }, [logoUrl]);

  useEffect(() => { if (isEditable) compactList(); }, [compactList, isEditable]); 
  
  const updateDraft = (key, value) => { if (!isViewingOldOrder && setDraftData) { setDraftData(prev => ({ ...prev, [key]: value })); } };
  
  const handleItemUpdate = (index, field, value) => { 
      setEditableItems(prev => { 
          if (field === 'code' && value) {
              const isDuplicate = prev.some((item, i) => 
                  i !== index && 
                  item.code && 
                  item.code.trim().toLowerCase() === value.toString().trim().toLowerCase()
              );
              if (isDuplicate) {
                  window.alert("Bu ürün zaten listenizde mevcut!");
                  return prev; 
              }
          }

          const newItems = [...prev]; 
          let newItem = { ...newItems[index], [field]: value }; 
          
          if (field === 'code') { 
              const searchTerm = value.toString().trim().toLowerCase();
              const matchedProduct = products?.find(p => p.code?.trim().toLowerCase() === searchTerm); 
              
              if (matchedProduct) { 
                  newItem.gram = matchedProduct.gram || ""; 
                  newItem.imageUrl = matchedProduct.imageUrl || logoUrl; 
                  if(!newItem.category) newItem.category = matchedProduct.category; 
                  if (!newItem.selectedKarat && orderKarat) newItem.selectedKarat = orderKarat;
              } else { 
                  newItem.imageUrl = logoUrl; 
                  newItem.category = ""; 
              } 
          } 
          newItems[index] = newItem; 
          return newItems; 
      }); 
  };
  
  const handleLocalRemove = (index) => { const item = editableItems[index]; if (!isViewingOldOrder && item && item.cartId) { onRemoveItem(item.cartId); } setEditableItems(prev => { const n = [...prev]; n[index] = { code: "", quantity: 1, gram: "", selectedSize: "", selectedKarat: "", selectedColor: "", note: "", imageUrl: logoUrl, _tempId: `cleared_${Date.now()}_${Math.random()}` }; return n; }); };
  
  const updateAllItems = (field, value) => {
    setEditableItems(prev => prev.map(item => item.code ? { ...item, [field]: value } : item));
    if (field === 'selectedKarat') { setOrderKarat(value); updateDraft('orderKarat', value); }
    if (field === 'selectedColor') { setGlobalColor(value); }
  };

  const handleSaveOrder = (status = 'new') => { if(!customerName) return window.alert("Firma Adı Giriniz"); if(!orderKarat) return window.alert("Lütfen sipariş ayarını seçiniz!"); if(!deliveryDate) return window.alert("Lütfen teslim tarihini giriniz!"); const cleanItems = editableItems.filter(item => item.code && item.code.trim() !== "").map(({ _tempId, ...rest }) => rest); if (cleanItems.length === 0) return window.alert("Lütfen en az 1 ürün giriniz."); if (isViewingOldOrder && onUpdateOrder) onUpdateOrder(initialData.id, { customerName, customerPhone, orderKarat, orderStamp, deliveryDate, customOrderNo: orderNo, items: cleanItems, status: status === 'new' ? 'new' : initialData.status }); else onCreateOrder(customerName, customerPhone, "", deliveryDate, orderKarat, orderNo, orderStamp, cleanItems, status); };
  
  if (!isOpen) return null;
  const FIRST_PAGE_ITEMS = 9; const OTHER_PAGE_ITEMS = 12; const pages = []; let itemsForPagination = [...editableItems];
  if (itemsForPagination.length > 0) { pages.push(itemsForPagination.splice(0, itemsForPagination.length >= FIRST_PAGE_ITEMS ? FIRST_PAGE_ITEMS : itemsForPagination.length)); while (itemsForPagination.length > 0) pages.push(itemsForPagination.splice(0, OTHER_PAGE_ITEMS)); } else { pages.push(Array.from({ length: 9 }).map((_, i) => ({ code: "", quantity: 1, gram: "", selectedSize: "", selectedKarat: "", selectedColor: "", note: "", imageUrl: logoUrl, _tempId: `empty_${i}` }))); }
  
  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-sm overflow-y-auto modal-overlay-fix">
      <div className="fixed top-0 left-0 w-full bg-slate-800 p-4 z-[110] flex justify-between items-center no-print shadow-lg">
        <div className="text-white font-bold flex items-center gap-2"><Printer size={20} className="text-yellow-500"/> SİPARİŞ BELGESİ</div>
        <div className="flex gap-3">
           <button onClick={()=>{if (!isViewingOldOrder && setDraftData) setDraftData(prev => ({ ...prev, items: editableItems })); onClose();}} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">KAPAT</button>
           <button onClick={()=>{if(!customerName) return window.alert("Firma Adı giriniz."); window.print();}} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">YAZDIR</button>
           {isEditable && <button onClick={() => handleSaveOrder('new')} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">OLUŞTUR</button>}
        </div>
      </div>
      <div className="mt-20 pb-10 flex flex-col items-center screen-view-container">
        <div id="printable-root" className="flex flex-col items-center gap-8">
            {pages.map((pageItems, pageIndex) => (
            <div key={pageIndex} className="print-page screen-page">
                <div className="mb-2 page-header-content">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-3/4">
                            <h1 className="text-4xl font-bold tracking-widest text-black uppercase">SAHRA</h1>
                            <p className="text-xl font-bold text-yellow-600 tracking-[0.3em] uppercase mt-1">KUYUMCULUK</p>
                        </div>
                        <div className="border border-black p-2 rounded text-right">
                            <div className="text-[10px] font-bold mb-1 leading-tight">
                                {Object.entries(orderStats.catBreakdown).length > 0 ? (
                                    Object.entries(orderStats.catBreakdown).map(([cat, count]) => `${count} ${cat}`).join(', ')
                                ) : (
                                    <span className="italic">Ürün Yok</span>
                                )}
                            </div>
                            <div className="text-sm font-bold border-t border-black pt-1 mt-1">
                                {orderStats.totalGr.toFixed(2)} Gr
                            </div>
                        </div>
                    </div>
                    {pageIndex === 0 && (
                        <>
                            <table className="header-table"><thead><tr><th>Sipariş Numarası</th><th>Müşteri Kodu / Adı</th><th>Ayar</th><th>Sipariş Tarihi</th><th>Teslim Tarihi</th><th>Damga</th></tr></thead><tbody><tr><td>{orderNo || "_______"}</td><td>{customerName.toUpperCase() || "________________"}</td><td>{orderKarat || "_______"}</td><td>{orderDate.split('-').reverse().join('.')}</td><td>{deliveryDate ? deliveryDate.split('-').reverse().join('.') : "___/___/20__"}</td>
                            <td>
                                {isEditable ? (
                                    <div className="flex items-center gap-1 no-print">
                                        {!orderStamp?.startsWith('data:') && <input type="text" value={orderStamp} placeholder="Damga Yaz" onChange={(e)=>{setOrderStamp(e.target.value); updateDraft('orderStamp', e.target.value);}} className="p-1 border rounded w-24 text-xs"/>}
                                        <label className="cursor-pointer bg-slate-100 p-1 rounded hover:bg-slate-200" title="Resim Yükle"><Paperclip size={14}/><input type="file" accept="image/*" className="hidden" onChange={handleStampUpload}/></label>
                                        {orderStamp?.startsWith('data:') && <div className="flex items-center gap-1"><img src={orderStamp} className="h-6 w-auto border"/><button onClick={()=>{setOrderStamp(''); updateDraft('orderStamp', '');}} className="text-red-500"><X size={14}/></button></div>}
                                    </div>
                                ) : (orderStamp?.startsWith('data:') ? <img src={orderStamp} className="h-6 object-contain"/> : (orderStamp || "_______"))}
                                {isEditable && !orderStamp && <span className="print-only">_______</span>}
                                {isEditable && orderStamp && !orderStamp.startsWith('data:') && <span className="print-only">{orderStamp}</span>}
                                {isEditable && orderStamp && orderStamp.startsWith('data:') && <img src={orderStamp} className="h-6 object-contain print-only"/>}
                            </td>
                            </tr></tbody></table>
                            
                            {isEditable && (
                                <div className="no-print bg-yellow-50 p-3 rounded border border-yellow-200 mt-2 relative grid grid-cols-2 gap-3 shadow-inner">
                                    <div className="flex flex-col gap-2">
                                        <input value={customerName} onChange={e=>{setCustomerName(e.target.value.toUpperCase()); updateDraft('customerName', e.target.value);}} placeholder="FİRMA ADI *" className="p-2 border rounded font-bold text-sm w-full"/>
                                        <input value={orderNo} onChange={e=>{setOrderNo(e.target.value); updateDraft('customOrderNo', e.target.value);}} placeholder="SİPARİŞ NO" className="p-2 border rounded font-bold text-sm w-full"/>
                                        <input type="date" min={new Date().toISOString().split('T')[0]} value={deliveryDate} onChange={e=>{setDeliveryDate(e.target.value); updateDraft('deliveryDate', e.target.value);}} className="p-2 border rounded text-sm w-full"/> 
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <select value={orderKarat} onChange={e => updateAllItems('selectedKarat', e.target.value)} className="p-2 border rounded bg-white font-bold text-sm w-full"> <option value="" disabled>Ayar Seç (Tümü)</option> {KARAT_OPTIONS.map(k=><option key={k} value={k}>{k}</option>)} </select>
                                        <select value={globalColor} onChange={e => updateAllItems('selectedColor', e.target.value)} className="p-2 border rounded bg-white font-bold text-sm w-full"> <option value="">Renk Seç (Tümü)</option> {COLOR_OPTIONS.map(c=><option key={c} value={c}>{c}</option>)} </select>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
                <div className="erp-grid">
                {pageItems.map((item, index) => {
                    const globalIndex = pageIndex === 0 ? index : FIRST_PAGE_ITEMS + (pageIndex - 1) * OTHER_PAGE_ITEMS + index;
                    const isVisibleInPrint = item.code && item.category;
                    return (
                    <div key={item._tempId || index} className={`erp-card relative group ${!isVisibleInPrint ? "print-invisible-card" : ""}`}>
                        <div className="erp-image-area"><img src={item.imageUrl || logoUrl || DEFAULT_LOGO_URL} alt="Ürün" /></div>
                        <div className="erp-details-area">
                            <div className="erp-header"> 
                                {!isEditable ? item.code : (
                                    <input 
                                        type="text" 
                                        autoComplete="off"
                                        className="w-full text-center bg-transparent outline-none font-bold" 
                                        value={item.code} 
                                        onChange={(e) => handleItemUpdate(globalIndex, 'code', e.target.value)} 
                                    />
                                )} 
                            </div>
                            <div className="erp-compact-row"><div className="flex gap-1">Adet:{!isEditable ? item.quantity : <input type="number" className="w-6 text-center font-bold bg-transparent outline-none" value={item.quantity} onChange={(e) => handleItemUpdate(globalIndex, 'quantity', parseInt(e.target.value) || 1)} />}</div><div className="flex gap-1">Gr:{!isEditable ? item.gram : <input type="text" className="w-8 text-center bg-transparent outline-none" value={item.gram} onChange={(e) => handleItemUpdate(globalIndex, 'gram', e.target.value)} />}</div></div>
                            <div className="erp-compact-row" style={{borderBottom:'none'}}>
                                <div className="flex w-full h-full items-center">
                                    <span className="text-[9px] mr-1 shrink-0">Boy:</span>
                                    {!isEditable ? (
                                        <span className="flex-1 text-center font-bold text-[9px]">{item.selectedSize}</span>
                                    ) : (
                                        <input type="text" className="flex-1 w-full h-full text-center bg-transparent outline-none text-[9px] font-bold min-w-0" value={item.selectedSize || ''} onChange={(e) => handleItemUpdate(globalIndex, 'selectedSize', e.target.value)} />
                                    )}
                                </div>
                            </div>
                            <div className="erp-note">
                                <div className="flex w-full border-b border-black/10 pb-0.5 mb-0.5">
                                    <div className="flex-1 border-r border-black/10">
                                         {!isEditable ? item.selectedKarat : <select className="w-full h-full bg-transparent text-[7px] outline-none text-center font-bold" value={item.selectedKarat} onChange={(e)=>handleItemUpdate(globalIndex, 'selectedKarat', e.target.value)}><option value="">Ayar</option>{KARAT_OPTIONS.map(k=><option key={k} value={k}>{k}</option>)}</select>}
                                    </div>
                                    <div className="flex-1">
                                         {!isEditable ? item.selectedColor : <select className="w-full h-full bg-transparent text-[7px] outline-none text-center font-bold" value={item.selectedColor} onChange={(e)=>handleItemUpdate(globalIndex, 'selectedColor', e.target.value)}><option value="">Renk</option>{COLOR_OPTIONS.map(c=><option key={c} value={c}>{c}</option>)}</select>}
                                    </div>
                                </div>
                                {!isEditable ? (
                                    <span className="w-full text-center text-red-600 font-bold block bg-transparent text-[8px] leading-tight">{item.note}</span>
                                ) : (
                                    <input type="text" className="w-full text-center text-red-600 font-bold bg-transparent outline-none" placeholder="NOT" value={item.note || ""} onChange={(e) => handleItemUpdate(globalIndex, 'note', e.target.value)} />
                                )}
                            </div>
                        </div>
                        {isEditable && <button onClick={() => handleLocalRemove(globalIndex)} className="no-print absolute top-0 right-0 bg-red-500 text-white w-5 h-5 flex items-center justify-center text-xs">X</button>}
                    </div>
                )})}
                </div>
                {(pageIndex === pages.length - 1) && <div className="footer-summary text-xs font-bold flex justify-between border-t-2 border-black pt-2"><div>TOPLAM ADET: {orderStats.totalQty}</div><div>TOPLAM GRAM: {orderStats.totalGr.toFixed(2)} gr</div></div>}
            </div>
            ))}
            {isEditable && (
                <div className="no-print mt-4 mb-8 flex justify-center w-full">
                    <button 
                        onClick={() => {
                            setEditableItems(prev => {
                                const currentLen = prev.length;
                                let addCount = 0;
                                
                                if (currentLen < 9) {
                                    addCount = 9 - currentLen;
                                } 
                                else {
                                    const remainder = (currentLen - 9) % 12;
                                    
                                    if (remainder === 0) {
                                        addCount = 12;
                                    } else {
                                        addCount = 12 - remainder;
                                    }
                                }
                                
                                const newItems = Array.from({ length: addCount }).map((_, i) => ({ 
                                    code: "", quantity: 1, gram: "", selectedSize: "", selectedKarat: "", selectedColor: "", note: "", imageUrl: logoUrl, _tempId: `manual_added_${Date.now()}_${i}` 
                                }));
                                
                                return [...prev, ...newItems];
                            });
                        }} 
                        className="bg-slate-200 hover:bg-slate-300 text-slate-600 p-3 rounded-full shadow-lg transition-colors"
                        title="Sayfayı Doldur / Yeni Sayfa Ekle"
                    >
                        <Plus size={32} />
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// FILE: src/layouts/StoreView.js
// ==========================================
const StoreView = ({ products, loading, onAddToCart, cart, isOrderPreviewOpen, setIsOrderPreviewOpen, viewingOrder, setViewingOrder, handleCheckout, removeFromCart, orderKarat, user, setIsAdminOpen, setShowLogin, setSelectedProduct, onLogin, currentUserData, logoUrl }) => {
  const [activeCategory, setActiveCategory] = useState("Anasayfa");
  const [activeSubCategory, setActiveSubCategory] = useState("Hepsi"); 
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [loginStep, setLoginStep] = useState('welcome');
  const [currentPage, setCurrentPage] = useState(1);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [showEmptyCartModal, setShowEmptyCartModal] = useState(false);
  
  const ITEMS_PER_PAGE = 24;
  const isAuthenticated = user && !user.isAnonymous;
  useEffect(() => { setCurrentPage(1); }, [activeCategory, activeSubCategory, debouncedSearchTerm]);
  
  const handleLogout = async () => { 
      if (user && user.uid) {
        try {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'app_users', user.uid), { isOnline: false });
        } catch(e) {}
      }
      await signOut(auth); 
      window.location.reload(); 
  };

  // YÖNETİM PANELİ ERİŞİM KONTROLÜ (GÜNCELLENDİ)
  const isAdmin = useMemo(() => {
    if (!currentUserData) return false;

    // DEBUG: Konsola veriyi yazdırarak kontrol edelim
    console.log("Kullanıcı Yetki Kontrolü:", currentUserData);

    const roleRaw = currentUserData.role;
    const positionRaw = currentUserData.position;

    // Rol diziyse veya stringse hepsini küçük harfe çevirip birleşik string yapalım
    let roleStr = "";
    if (Array.isArray(roleRaw)) roleStr = roleRaw.join(" ").toLowerCase();
    else roleStr = (roleRaw || "").toString().toLowerCase();

    const positionStr = (positionRaw || "").toString().toLowerCase();

    // İzin verilen anahtar kelimeler
    const allowedKeywords = [
        'admin', 'manager', 'ceo', 'owner', 'sahip', 'kurucu', 
        'yonetici', 'yönetici', 'administrator', 'baskan', 'başkan'
    ];

    // Rol veya pozisyon bu kelimelerden birini içeriyor mu?
    const hasPermission = allowedKeywords.some(keyword => 
        roleStr.includes(keyword) || positionStr.includes(keyword)
    );
    
    return hasPermission;
  }, [currentUserData]);
  
  const filteredProducts = useMemo(() => { 
      if (!products) return []; 
      let filtered = [];
      if (activeCategory === "Anasayfa") {
          if (!debouncedSearchTerm || debouncedSearchTerm.trim() === "") filtered = [];
          else { const term = debouncedSearchTerm.toLowerCase().trim(); filtered = products.filter(p => p.code && p.code.toLowerCase().includes(term)); }
      } else {
          filtered = products.filter(p => { 
              const catMatch = p.category === activeCategory; if (!catMatch) return false; 
              const subMatch = activeSubCategory === "Hepsi" || p.subcategory === activeSubCategory; if (!subMatch) return false; 
              if (debouncedSearchTerm.length > 0) return p.code && p.code.toLowerCase().includes(debouncedSearchTerm.toLowerCase().trim()); return true; 
          });
      }
      return filtered.sort(naturalSort);
  }, [products, activeCategory, activeSubCategory, debouncedSearchTerm]);

  const paginatedProducts = useMemo(() => filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, (currentPage - 1) * ITEMS_PER_PAGE + ITEMS_PER_PAGE), [filteredProducts, currentPage]);
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const handleCategoryClick = useCallback((category, subcategory = "Hepsi") => { setActiveCategory(category); setActiveSubCategory(subcategory); setSearchTerm(""); }, []);

  if (!isAuthenticated) return (
    <div className="fixed inset-0 z-[200] bg-slate-900 flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0"><img src="https://images.unsplash.com/photo-1617038220319-276d3cfab638?q=80&w=2070&auto=format&fit=crop" className="w-full h-full object-cover opacity-30 animate-in fade-in zoom-in duration-[3s]" /><div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-slate-900/40 backdrop-blur-sm"></div></div>
        <div className="relative z-10 w-full max-w-md p-8 flex flex-col items-center text-center transition-all duration-700">
            <div className={`mb-6 p-5 rounded-full bg-slate-950 border border-yellow-500/20 shadow-2xl ring-1 ring-white/5 transition-all duration-1000 ${loginStep === 'form' ? 'scale-75 mb-2' : 'scale-100'}`}>{logoUrl ? (<img src={logoUrl} alt="Sahra" className="w-16 h-16 object-contain drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />) : <Star size={48} className="text-yellow-500" />}</div>
            {loginStep === 'welcome' && (<div className="animate-in fade-in slide-in-from-bottom-8 duration-700 flex flex-col items-center w-full"><h1 className="text-4xl font-serif text-white tracking-[0.2em] mb-2 drop-shadow-lg">SAHRA</h1><p className="text-xs text-yellow-500 uppercase tracking-[0.5em] font-bold mb-12 border-b border-yellow-500/30 pb-4 w-full">Exclusive Jewellery</p><button onClick={() => setLoginStep('form')} className="group relative px-8 py-4 bg-transparent overflow-hidden rounded-full transition-all hover:scale-105 active:scale-95"><div className="absolute inset-0 w-full h-full bg-gradient-to-r from-yellow-600 to-yellow-400 opacity-80 group-hover:opacity-100 transition-opacity"></div><span className="relative flex items-center gap-3 text-slate-900 font-bold text-xs uppercase tracking-widest">Giriş Yap <ArrowUp size={16} className="rotate-90 group-hover:translate-x-1 transition-transform"/></span></button></div>)}
            {loginStep === 'form' && (<div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white/5 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-2xl"><div className="flex items-center justify-between mb-6"><h2 className="text-xl text-white font-serif tracking-wide">Üye Girişi</h2><button onClick={() => setLoginStep('welcome')} className="text-slate-400 hover:text-white transition-colors"><X size={20}/></button></div><form onSubmit={onLogin} className="space-y-5"><div className="group relative"><User className="absolute left-0 top-3 text-slate-500 group-focus-within:text-yellow-500 transition-colors" size={18} /><input name="email" type="email" required className="w-full bg-transparent border-b border-white/20 py-3 pl-8 text-white placeholder-slate-600 focus:border-yellow-500 focus:outline-none transition-all text-sm" placeholder="E-Posta Adresiniz" /></div><div className="group relative"><Key className="absolute left-0 top-3 text-slate-500 group-focus-within:text-yellow-500 transition-colors" size={18} /><input name="password" type="password" required className="w-full bg-transparent border-b border-white/20 py-3 pl-8 text-white placeholder-slate-600 focus:border-yellow-500 focus:outline-none transition-all text-sm" placeholder="Şifreniz" /></div><button type="submit" className="w-full mt-4 bg-white text-slate-900 font-bold py-3.5 rounded hover:bg-yellow-400 transition-all uppercase text-xs tracking-wider shadow-lg flex items-center justify-center gap-2 group"><span>Paneli Aç</span><ChevronRight size={16} className="group-hover:translate-x-1 transition-transform text-slate-400 group-hover:text-slate-900"/></button></form></div>)}
        </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden relative">
        {showEmptyCartModal && <div className="fixed inset-0 z-[300] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowEmptyCartModal(false)}><div className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm w-full text-center"><div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32} className="text-yellow-500"/></div><h3 className="text-xl font-bold text-slate-800 mb-2">Uyarı</h3><p className="text-slate-500 text-sm mb-4">Lütfen listeyi hazırlamak için en az 1 model ekleyiniz.</p><button onClick={() => setShowEmptyCartModal(false)} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm w-full">Tamam</button></div></div>}
        {isAccountModalOpen && <UserProfileModal user={user} isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} />}
        
        <div className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0 z-20 shadow-xl relative">
            <div className="p-6 border-b border-slate-800 flex flex-col items-center"><div className="mb-4 bg-yellow-500 p-3 rounded-xl text-slate-900 shadow-[0_0_15px_rgba(234,179,8,0.5)]">{logoUrl ? <img src={logoUrl} className="w-8 h-8 object-contain"/> : <Star size={32}/>}</div><h1 className="text-xl font-bold tracking-widest font-serif">SAHRA</h1></div>
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-hide">
                <button onClick={() => handleCategoryClick("Anasayfa")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeCategory === "Anasayfa" ? 'bg-yellow-500 text-slate-900' : 'text-slate-400 hover:bg-slate-800'}`}><Search size={18}/> Hızlı Arama</button>
                {CATEGORIES.filter(c => c !== "Anasayfa").map(cat => (
                    <div key={cat} className="group relative">
                        <button onClick={() => { if (activeCategory === cat) { setActiveCategory("Anasayfa"); setActiveSubCategory("Hepsi"); } else { handleCategoryClick(cat); } }} className={`w-full flex justify-between items-center px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeCategory === cat ? 'bg-slate-800 text-yellow-500' : 'text-slate-400 hover:bg-slate-800'}`}><span>{cat}</span>{activeCategory === cat ? <ChevronDown size={14} className="text-yellow-500"/> : <ChevronRight size={14} className="opacity-50"/>}</button>
                        {activeCategory === cat && SUBCATEGORIES[cat] && (<div className="bg-slate-950/50 py-2 space-y-1">{SUBCATEGORIES[cat].map(sub => (<button key={sub} onClick={(e) => { e.stopPropagation(); handleCategoryClick(cat, sub); }} className={`w-full text-left pl-10 pr-4 py-2 text-xs font-bold transition-colors flex items-center gap-2 ${activeSubCategory === sub ? 'text-white bg-slate-800/50 border-l-2 border-yellow-500' : 'text-slate-500 hover:text-slate-300'}`}><span className={`w-1.5 h-1.5 rounded-full ${activeSubCategory === sub ? 'bg-yellow-500' : 'bg-slate-600'}`}></span>{sub}</button>))}</div>)}
                    </div>
                ))}
            </div>
            {/* GÜNCELLEME: Sadece admin rolüne sahip kullanıcılar için Yönetim Paneli butonunu göster */}
            {isAdmin && (
                <div className="p-4 border-t border-slate-800 bg-slate-950">
                    <button onClick={() => setIsAdminOpen(true)} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-bold transition-colors">
                        <Settings size={16}/> Yönetim Paneli
                    </button>
                </div>
            )}
        </div>

        <div className="flex-1 flex flex-col bg-slate-50 relative overflow-hidden">
            <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10 shrink-0">
                <div className="flex items-center gap-4 flex-1">{activeCategory !== 'Anasayfa' && (<div className="relative w-full max-w-md animate-in fade-in slide-in-from-top-2 duration-300"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={`${activeCategory} içinde ara...`} className="w-full bg-slate-100 border-none rounded-full py-2 pl-10 pr-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all"/></div>)}</div>
                <div className="flex items-center gap-4">
                    <button onClick={() => { if (cart.length > 0) { setIsOrderPreviewOpen(true); } else { setShowEmptyCartModal(true); } }} className="relative p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors group"><ShoppingBag size={20} className="text-slate-600 group-hover:text-slate-900"/>{cart.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full ring-2 ring-white">{cart.length}</span>}</button>
                    <div className="relative">
                        <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center gap-3 pl-4 border-l outline-none"><div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs overflow-hidden border border-slate-200">{user?.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover"/> : user?.email?.[0]?.toUpperCase()}</div></button>
                        {isUserMenuOpen && (<><div className="fixed inset-0 z-10" onClick={() => setIsUserMenuOpen(false)}></div><div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden"><button onClick={() => { setIsAccountModalOpen(true); setIsUserMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2"><User size={16}/> Hesap</button><button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"><LogOut size={16}/> Çıkış Yap</button></div></>)}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col">
                {activeCategory === 'Anasayfa' && (<div className={`flex flex-col items-center justify-center transition-all duration-500 ease-in-out ${searchTerm ? 'py-6 min-h-auto' : 'min-h-[400px] animate-in fade-in zoom-in'}`}><div className={`inline-block rounded-full bg-yellow-50 shadow-inner transition-all duration-500 ${searchTerm ? 'mb-2 p-3 scale-75' : 'mb-6 p-8'}`}><Search size={searchTerm ? 32 : 64} className="text-yellow-500 opacity-80"/></div><h2 className={`font-bold text-slate-800 font-serif tracking-wide transition-all duration-500 ${searchTerm ? 'text-xl mb-1' : 'text-3xl mb-2'}`}>Model Arama</h2><div className={`relative w-full transition-all duration-500 ${searchTerm ? 'max-w-4xl' : 'max-w-lg'}`}><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={24}/><input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Örn: SMG..." className="w-full bg-white border-2 border-slate-100 rounded-full py-4 pl-14 pr-6 text-lg font-bold text-slate-800 outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all shadow-xl" autoFocus/></div></div>)}
                {(activeCategory !== 'Anasayfa' || searchTerm) && (
                    <div className={activeCategory === 'Anasayfa' ? 'animate-in fade-in slide-in-from-bottom-8 duration-500 mt-4' : ''}>
                        <div className="mb-4 flex items-center justify-end"><Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} /></div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">{paginatedProducts.map(product => (<ProductCard key={product.id} product={product} onAddToCart={setSelectedProduct} logoUrl={logoUrl} />))}</div>
                        {paginatedProducts.length === 0 && <div className="text-center py-20 text-slate-400">Ürün bulunamadı.</div>}
                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

const App = () => {
    const [user, setUser] = useState(null);
    const [isAdminOpen, setIsAdminOpen] = useState(false);
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [cart, setCart] = useState([]);
    const [notification, setNotification] = useState(null);
    const [isOrderPreviewOpen, setIsOrderPreviewOpen] = useState(false);
    const [viewingOrder, setViewingOrder] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showLogin, setShowLogin] = useState(true);
    const [orderKarat, setOrderKarat] = useState(null);
    const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO_URL);
    const [currentUserData, setCurrentUserData] = useState({});
    const [draftData, setDraftData] = useState({ customerName: "", orderKarat: "", orderStamp: "", orderDate: new Date().toISOString().split('T')[0], deliveryDate: "", customOrderNo: "", customerPhone: "", stampType: 'text', items: [] });

    // YENİ EKLENEN KISIM: Sekme Başlığı ve İkonu
    useEffect(() => {
        document.title = "Sahra Kuyumculuk"; // 
        const link = document.querySelector("link[rel~='icon']");
        if (link) {
            link.href = "https://i.hizliresim.com/6pdu20m.png"; // 
        }
    }, []);

    useEffect(() => {
        const initAuth = async () => { 
            try {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) { 
                    await signInWithCustomToken(auth, __initial_auth_token); 
                } 
            } catch (error) {
                console.error("Auth initialization failed:", error);
            }
        };
        initAuth();
        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if(u) {
                setShowLogin(false);
                try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'app_users', u.uid), { uid: u.uid, email: u.email, displayName: u.displayName || (u.email ? u.email.split('@')[0] : 'Misafir'), photoURL: u.photoURL, lastLogin: serverTimestamp() }, { merge: true }); } catch (err) { console.error("Kullanıcı senkronizasyon hatası:", err); }
            } else { setShowLogin(true); }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) return;

        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'app_users', user.uid);

        const setOnline = async () => {
            try {
                await updateDoc(userRef, { 
                    isOnline: true, 
                    lastLogin: serverTimestamp() 
                });
            } catch(e) { console.error("Online status err:", e); }
        };
        setOnline();

        const interval = setInterval(async () => { 
            try { 
                await updateDoc(userRef, { 
                    isOnline: true, 
                    lastLogin: serverTimestamp() 
                }); 
            } catch(e) { console.log("Heartbeat hatası:", e); } 
        }, 2 * 60 * 1000); 

        const handleTabClose = async () => {
            try {
               updateDoc(userRef, { isOnline: false });
            } catch (e) { }
        };

        window.addEventListener('beforeunload', handleTabClose);

        return () => {
            clearInterval(interval);
            window.removeEventListener('beforeunload', handleTabClose);
            handleTabClose();
        };
    }, [user, appId]);

    useEffect(() => {
        if (!user) return;
        const unsubSettings = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'general'), (docSnap) => { if (docSnap.exists() && docSnap.data().logoUrl) { setLogoUrl(docSnap.data().logoUrl); } });
        if (user?.uid) { const unsubUser = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'app_users', user.uid), (docSnap) => { if (docSnap.exists()) { setCurrentUserData(docSnap.data()); } }); return () => { unsubSettings(); unsubUser(); }; } else { setCurrentUserData({}); return () => unsubSettings(); }
    }, [user, appId]);

    useEffect(() => {
        if (!user) return;
        const unsubProducts = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'products'), (snap) => { setProducts(snap.docs.map(d => ({id:d.id, ...d.data()}))); });
        const unsubOrders = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), orderBy('createdAt', 'desc')), (snap) => { setOrders(snap.docs.map(d => ({id:d.id, ...d.data()}))); });
        return () => { unsubProducts(); unsubOrders(); };
    }, [user]);

    const handleAdminLogin = async (e) => { e.preventDefault(); try { await signInWithEmailAndPassword(auth, e.target.email.value, e.target.password.value); setNotification({type:'success', message:'Giriş başarılı'}); } catch (err) { setNotification({type:'error', message:'Giriş başarısız'}); } };
    const handleUpdateLogo = async (newLogoBase64) => { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'general'), { logoUrl: newLogoBase64, updatedAt: serverTimestamp() }, { merge: true }); };
    const handleAddToCart = useCallback((product) => { setCart(prev => [...prev, { ...product, cartId: Date.now() }]); setNotification({ type: 'success', message: `${product.code} sepete eklendi` }); if(cart.length === 0) setOrderKarat(product.selectedKarat); }, [cart.length]);
    const removeFromCart = useCallback((cartId) => { setCart(prev => { const newCart = prev.filter(item => item.cartId !== cartId); if(newCart.length === 0) setOrderKarat(null); return newCart; }); }, []);
    const handleCheckout = useCallback(async (name, phone, note, deliveryDate, karat, orderNo, orderStamp, items = null, targetStatus = 'new') => { if(cart.length === 0 && (!items || items.length === 0)) return; if (!user) { alert("Oturum açılıyor..."); return; } try { const itemsToSave = (items || cart).map(item => { const { _tempId, ...rest } = item; return rest; }); await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), { customerName: name, customerPhone: phone, totalNote: note, items: itemsToSave, createdAt: serverTimestamp(), status: targetStatus, deliveryDate: deliveryDate, orderKarat: karat, customOrderNo: orderNo, orderStamp: orderStamp, createdBy: user.uid }); if (targetStatus !== 'draft') { setCart([]); setOrderKarat(null); setDraftData({ customerName: "", orderKarat: "", orderStamp: "", orderDate: new Date().toISOString().split('T')[0], deliveryDate: "", customOrderNo: "", customerPhone: "", stampType: 'text', items: [] }); } setIsOrderPreviewOpen(false); setNotification({ type: 'success', message: targetStatus === 'draft' ? "Taslak kaydedildi!" : "Sipariş oluşturuldu!" }); } catch (error) { setNotification({ type: 'error', message: "Hata: " + error.message }); } }, [cart, user, appId]);
    const handleUpdateOrder = useCallback(async (orderId, data) => { try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId), data); setIsOrderPreviewOpen(false); setViewingOrder(null); setNotification({type:'success', message:'Sipariş güncellendi'}); } catch (error) { setNotification({type:'error', message: error.message}); } }, [appId]);
    const handleDeleteProduct = useCallback(async (id) => { try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', id)); setNotification({type:'success', message:'Ürün silindi'}); } catch(err) { setNotification({type:'error', message:err.message}); } }, [appId]);
    const handleUpdateStatus = useCallback(async (orderId, status) => { try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId), { status }); setNotification({type:'success', message:'Durum güncellendi'}); } catch(err) { setNotification({type:'error', message:err.message}); } }, [appId]);
    const handleDeleteOrder = useCallback(async (orderId) => { try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId)); setNotification({type:'success', message:'Sipariş silindi'}); } catch(err) { setNotification({type:'error', message:err.message}); } }, [appId]);

    if (isAdminOpen && user && !user.isAnonymous) {
        return (
            <>
                {notification && <CustomNotification type={notification.type} message={notification.message} onClose={()=>setNotification(null)} />}
                <PrintStyles /> 
                {(isOrderPreviewOpen || viewingOrder) && <OrderPreviewModal cart={cart} isOpen={isOrderPreviewOpen} onClose={() => { setIsOrderPreviewOpen(false); setViewingOrder(null); }} onRemoveItem={removeFromCart} initialData={viewingOrder} products={products} onUpdateOrder={handleUpdateOrder} onCreateOrder={handleCheckout} draftData={draftData} setDraftData={setDraftData} logoUrl={logoUrl} />}
                <div className="screen-only"><AdminPanelContent user={user} currentUserProfile={user} appId={appId} products={products} orders={orders} onClose={() => setIsAdminOpen(false)} handleDeleteProduct={handleDeleteProduct} handleUpdateStatus={handleUpdateStatus} setNotification={setNotification} onCreateNewOrder={() => { setCart([]); setViewingOrder(null); setIsOrderPreviewOpen(true); }} onViewOrder={(order) => { setViewingOrder(order); setIsOrderPreviewOpen(true); }} handleDeleteOrder={handleDeleteOrder} logoUrl={logoUrl} handleUpdateLogo={handleUpdateLogo} /></div>
            </>
        );
    }
    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20 md:pb-0">
          <PrintStyles />
          {notification && <CustomNotification type={notification.type} message={notification.message} onClose={()=>setNotification(null)} />}
          <div className="screen-only">
              <StoreView products={products} loading={false} onAddToCart={handleAddToCart} cart={cart} isOrderPreviewOpen={isOrderPreviewOpen} setIsOrderPreviewOpen={setIsOrderPreviewOpen} viewingOrder={viewingOrder} setViewingOrder={setViewingOrder} handleCheckout={handleCheckout} removeFromCart={removeFromCart} orderKarat={orderKarat} user={user} setIsAdminOpen={setIsAdminOpen} setShowLogin={setShowLogin} setSelectedProduct={setSelectedProduct} onLogin={handleAdminLogin} selectedProduct={selectedProduct} currentUserData={currentUserData} logoUrl={logoUrl} />
              <ProductModal product={selectedProduct} isOpen={!!selectedProduct} onClose={() => setSelectedProduct(null)} onConfirm={handleAddToCart} currentOrderKarat={orderKarat} />
          </div>
          <OrderPreviewModal cart={cart} isOpen={isOrderPreviewOpen && !viewingOrder} onClose={() => setIsOrderPreviewOpen(false)} onRemoveItem={removeFromCart} onCreateOrder={handleCheckout} products={products} initialData={null} draftData={draftData} setDraftData={setDraftData} logoUrl={logoUrl} />
        </div>
    );
};

export default App;