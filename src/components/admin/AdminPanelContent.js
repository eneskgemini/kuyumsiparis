import React, { useState, useCallback, useRef, Suspense, lazy } from 'react';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { LogOut, LayoutDashboard, Box, ClipboardList, Image as ImageIcon, Sparkles, MessageSquare, Settings, Store, Loader2 } from 'lucide-react';
import { db, auth } from '../../config/firebase';
import { DEFAULT_LOGO_URL } from '../../utils/constants';
import { uploadImageToStorage } from '../../utils/helpers';

// Alt Bileşen İçe Aktarımları
import AdminDashboard from './AdminDashboard';
import AdminProductManager from './AdminProductManager';
import AdminOrderManager from './AdminOrderManager';
import AdminCatalogueManager from './AdminCatalogueManager';
import AdminSettings from './AdminSettings';

// AI Stüdyo ve Mesajlaşma en ağır modüller — yalnızca ilgili sekmeye tıklandığında yükleniyor.
const AIStudio = lazy(() => import('../studio/AIStudio'));
const MessagingModule = lazy(() => import('../messaging/MessagingModule'));

const TabLoading = () => (
    <div className="flex items-center justify-center gap-2 text-ink-400 py-24">
        <Loader2 size={18} className="animate-spin" /> Yükleniyor...
    </div>
);

const NAV_ITEMS = [
    { key: 'dashboard', label: 'Özet', icon: LayoutDashboard },
    { key: 'products', label: 'Ürün Yönetimi', icon: Box },
    { key: 'orders', label: 'Siparişler', icon: ClipboardList },
    { key: 'catalogue', label: 'Katalog', icon: ImageIcon },
    { key: 'social', label: 'Stüdyo', icon: Sparkles },
    { key: 'messages', label: 'Mesajlar', icon: MessageSquare },
    { key: 'settings', label: 'Ayarlar', icon: Settings },
];

const AdminPanelContent = ({ user, currentUserProfile, appId, products, orders, onClose, handleDeleteProduct, handleUpdateStatus, setNotification, onCreateNewOrder, onViewOrder, handleDeleteOrder, logoUrl, handleUpdateLogo }) => {
    const getAdminParams = () => {
        try {
            const params = new URLSearchParams(window.location.search);
            return { tab: params.get('tab') || "dashboard" };
        } catch (e) { return { tab: "dashboard" }; }
    };
    const [activeTab, setActiveTab] = useState(getAdminParams().tab);

    const [dashboardDate, setDashboardDate] = useState(new Date());
    const [dragActive, setDragActive] = useState(false);
    const [newProduct, setNewProduct] = useState({ code: '', gram: '', category: 'Yüzük', subcategory: 'AS-B', imageUrl: '', imageFile: null });
    const [isLoading, setIsLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const scrollContainerRef = useRef(null);

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
        setNewProduct(Object.assign({}, { code: product.code, gram: product.gram, category: product.category, subcategory: product.subcategory || 'Genel', imageUrl: product.imageUrl, imageFile: null }));
        if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    }, []);

    const cancelEditing = useCallback(() => { setEditingId(null); setNewProduct({ code: '', gram: '', category: 'Yüzük', subcategory: 'AS-B', imageUrl: '', imageFile: null }); }, []);

    const handleDrag = (e) => { e.preventDefault(); e.stopPropagation(); if (e.type === "dragenter" || e.type === "dragover") { setDragActive(true); } else if (e.type === "dragleave") { setDragActive(false); } };
    const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files && e.dataTransfer.files[0]) { setNewProduct(Object.assign({}, newProduct, { imageFile: e.dataTransfer.files[0] })); } };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (file) { try { const { url } = await uploadImageToStorage(file, 'logo'); await handleUpdateLogo(url); setNotification({type: 'success', message: 'Logo güncellendi'}); } catch (err) { setNotification({type: 'error', message: 'Logo güncellenemedi: ' + err.message}); } }
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        if(!newProduct.code || !newProduct.gram) return alert("Lütfen kod ve gram giriniz.");
        const normalizedCode = newProduct.code.trim().toLowerCase();
        if (products.some(p => p.code.trim().toLowerCase() === normalizedCode && p.id !== editingId)) { setNotification({ type: 'error', message: 'Bu kod ile zaten bir ürün mevcut' }); return; }
        setIsLoading(true);
        try {
            let finalImageUrl = newProduct.imageUrl || logoUrl || DEFAULT_LOGO_URL;
            // Görseller artık Firestore belgesine devasa bir metin (base64) olarak değil,
            // Firebase Storage'a yüklenip sadece küçük bir link olarak kaydediliyor.
            // Bu sayede ürün listesinin ilk yüklenmesi çok daha hızlı oluyor.
            if (newProduct.imageFile) finalImageUrl = (await uploadImageToStorage(newProduct.imageFile, 'products')).url;
            const productData = Object.assign({}, { code: newProduct.code, gram: newProduct.gram, category: newProduct.category, subcategory: newProduct.subcategory, imageUrl: finalImageUrl });
            if (editingId) { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', editingId), Object.assign({}, productData, { updatedAt: serverTimestamp() })); setNotification({ type: 'success', message: 'Ürün güncellendi' }); setEditingId(null); }
            else { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), Object.assign({}, productData, { createdAt: serverTimestamp() })); setNotification({ type: 'success', message: 'Ürün eklendi' }); }
            setNewProduct({ code: '', gram: '', category: newProduct.category, subcategory: newProduct.subcategory, imageUrl: '', imageFile: null });
        } catch (error) { setNotification({ type: 'error', message: error.message }); } finally { setIsLoading(false); }
    };

    return (
        <div className="flex flex-col md:flex-row h-screen bg-stone-50 dark:bg-ink-950">
            <div className="md:w-64 bg-white dark:bg-ink-900 border-b md:border-b-0 md:border-r border-stone-200 dark:border-ink-700 text-ink-900 dark:text-ink-100 flex flex-col flex-shrink-0">
                <div className="p-6 border-b border-stone-100 dark:border-ink-800 flex flex-col items-center relative">
                    <div className="w-16 h-16 bg-stone-100 dark:bg-ink-800 rounded-full flex items-center justify-center mb-3 text-xl font-bold text-gold-600 dark:text-gold-400 overflow-hidden ring-1 ring-stone-200 dark:ring-ink-700">{user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" alt="Profil"/> : user.email[0].toUpperCase()}</div>
                    <div className="text-sm font-bold text-ink-900 dark:text-ink-100 truncate max-w-full">{user.email}</div>
                    <div className="text-[11px] text-ink-400 font-semibold uppercase tracking-wide mt-0.5">Yönetici</div>
                </div>

                <nav className="flex-1 p-3 space-y-1 overflow-x-auto md:overflow-visible flex md:flex-col custom-scrollbar">
                    {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
                        <button key={key} onClick={() => setActiveTab(key)} className={`sidebar-link whitespace-nowrap md:whitespace-normal ${activeTab === key ? 'bg-ink-900 dark:bg-ink-700 text-white dark:text-stone-50 shadow-soft' : 'text-ink-500 dark:text-ink-400 hover:bg-stone-100 dark:hover:bg-ink-800 hover:text-ink-900 dark:hover:text-gold-300'}`}>
                            <Icon size={17} className={activeTab === key ? 'text-gold-400' : ''}/> {label}
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-stone-100 dark:border-ink-800 space-y-2 hidden md:block">
                    <button onClick={onClose} className="btn-secondary w-full !py-2.5"><Store size={15}/> Mağazaya Dön</button>
                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/70 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold transition-colors"><LogOut size={14}/> Çıkış Yap</button>
                </div>

                 <div className="p-4 border-t border-stone-100 dark:border-ink-800 flex gap-2 md:hidden">
                    <button onClick={onClose} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-stone-100 dark:bg-ink-800 hover:bg-stone-200 dark:hover:bg-ink-700 rounded-lg text-xs font-bold text-ink-700 dark:text-ink-200">Mağaza</button>
                    <button onClick={handleLogout} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/70 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold"><LogOut size={14}/></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 relative custom-scrollbar" ref={scrollContainerRef}>
                {activeTab === 'dashboard' && <AdminDashboard products={products} orders={orders} dashboardDate={dashboardDate} setDashboardDate={setDashboardDate} />}
                {activeTab === 'products' && <AdminProductManager products={products} editingId={editingId} startEditing={startEditing} cancelEditing={cancelEditing} handleDeleteProduct={handleDeleteProduct} handleAddProduct={handleAddProduct} newProduct={newProduct} setNewProduct={setNewProduct} dragActive={dragActive} handleDrag={handleDrag} handleDrop={handleDrop} isLoading={isLoading} logoUrl={logoUrl} />}
                {activeTab === 'orders' && <AdminOrderManager orders={orders} onCreateNewOrder={onCreateNewOrder} onViewOrder={onViewOrder} handleUpdateStatus={handleUpdateStatus} handleDeleteOrder={handleDeleteOrder} />}
                {activeTab === 'catalogue' && <AdminCatalogueManager appId={appId} setNotification={setNotification} />}
                {activeTab === 'social' && <div className="h-full pb-10"><h2 className="text-2xl font-bold text-ink-900 dark:text-ink-100 mb-4">Stüdyo</h2><Suspense fallback={<TabLoading />}><AIStudio setNotification={setNotification} /></Suspense></div>}
                {activeTab === 'messages' && <div className="h-full pb-10"><h2 className="text-2xl font-bold text-ink-900 dark:text-ink-100 mb-4">Mesajlar</h2><Suspense fallback={<TabLoading />}><MessagingModule appId={appId} currentUserProfile={currentUserProfile} /></Suspense></div>}
                {activeTab === 'settings' && <AdminSettings logoUrl={logoUrl} handleLogoUpload={handleLogoUpload} />}
            </div>
        </div>
    );
};

export default AdminPanelContent;
