/* global __initial_auth_token */
import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { signInWithEmailAndPassword, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, setDoc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

// Config & Utils
import { auth, db } from './config/firebase';
import { appId, DEFAULT_LOGO_URL } from './utils/constants';

// UI Components
import PrintStyles from './components/common/PrintStyles';
import CustomNotification from './components/common/CustomNotification';
import OrderPreviewModal from './components/common/OrderPreviewModal';

// Views
import StoreView from './components/store/StoreView';
import ProductModal from './components/store/ProductModal';
import CatalogueModal from './components/store/CatalogueModal';

// Yönetim paneli (Stüdyo + Mesajlaşma dahil) yalnızca personel admin paneli açtığında
// gerekiyor; ana bundle'ı küçük tutmak ve müşteri tarafının hızlı açılması için
// ayrı bir parça (chunk) olarak, ihtiyaç anında yükleniyor.
const AdminPanelContent = lazy(() => import('./components/admin/AdminPanelContent'));

const AdminLoadingScreen = () => (
    <div className="fixed inset-0 z-[999] bg-stone-50 dark:bg-ink-950 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-gold-200 border-t-gold-500 animate-spin"></div>
        <p className="text-xs font-bold text-ink-400 uppercase tracking-widest">Yönetim Paneli Yükleniyor...</p>
    </div>
);

const App = () => {
    const [isAdminOpen, setIsAdminOpen] = useState(() => {
        try { return new URLSearchParams(window.location.search).has('tab'); } catch (e) { return false; }
    });

    const [user, setUser] = useState(null);
    const [products, setProducts] = useState([]);
    const [productsLoaded, setProductsLoaded] = useState(false);
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
    const [isCatalogueOpen, setIsCatalogueOpen] = useState(false);
    const [catalogueParams, setCatalogueParams] = useState({ category: 'Anasayfa', subcategory: 'Hepsi' });

    useEffect(() => {
        document.title = "Sahra Kuyumculuk";
        const targetLogo = logoUrl || DEFAULT_LOGO_URL;
        let icon = document.querySelector("link[rel~='icon']");
        if (!icon) { icon = document.createElement('link'); icon.rel = 'icon'; document.getElementsByTagName('head')[0].appendChild(icon); }
        icon.href = targetLogo;
    }, [logoUrl]);

    useEffect(() => {
        const initAuth = async () => {
            try { if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) { await signInWithCustomToken(auth, __initial_auth_token); } } catch (error) { console.error(error); }
        };
        initAuth();

        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if(u) {
                setShowLogin(false);
                try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'app_users', u.uid), { uid: u.uid, email: u.email, displayName: u.displayName || (u.email ? u.email.split('@')[0] : 'Misafir'), photoURL: u.photoURL, lastLogin: serverTimestamp() }, { merge: true }); } catch (err) { console.error(err); }
            } else { setShowLogin(true); }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) return;
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'app_users', user.uid);
        const setOnline = async () => { try { await updateDoc(userRef, { isOnline: true, lastLogin: serverTimestamp() }); } catch(e) {} };
        setOnline();
        const interval = setInterval(setOnline, 2 * 60 * 1000);
        const handleTabClose = async () => { try { updateDoc(userRef, { isOnline: false }); } catch (e) { } };
        window.addEventListener('beforeunload', handleTabClose);
        return () => { clearInterval(interval); window.removeEventListener('beforeunload', handleTabClose); handleTabClose(); };
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const unsubProducts = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'products'), (snap) => { setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setProductsLoaded(true); }, () => setProductsLoaded(true));
        const unsubOrders = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), orderBy('createdAt', 'desc')), (snap) => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubUser = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'app_users', user.uid), (docSnap) => { if (docSnap.exists()) setCurrentUserData(docSnap.data()); });
        // Mağaza logosu daha önce kaydedilmişse (Ayarlar'dan yüklenmişse) sayfa
        // her açıldığında/yenilendiğinde Firestore'dan geri okunur. Eskiden bu
        // okuma hiç yapılmıyordu, bu yüzden yenilemede eski varsayılan logoya
        // dönüyordu - sadece o an yüklendiği oturumda hafızada kalıyordu.
        const unsubSettings = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'general'), (docSnap) => { if (docSnap.exists() && docSnap.data().logoUrl) setLogoUrl(docSnap.data().logoUrl); });
        return () => { unsubProducts(); unsubOrders(); unsubUser(); unsubSettings(); };
    }, [user]);

    const handleAdminLogin = async (e) => { e.preventDefault(); try { await signInWithEmailAndPassword(auth, e.target.email.value, e.target.password.value); setNotification({type:'success', message:'Giriş başarılı'}); } catch (err) { setNotification({type:'error', message:'Giriş başarısız: ' + err.message}); } };
    const handleUpdateLogo = async (newLogoUrl) => { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'general'), { logoUrl: newLogoUrl, updatedAt: serverTimestamp() }, { merge: true }); setLogoUrl(newLogoUrl); };
    const handleAddToCart = useCallback((product) => { setCart(prev => [...prev, { ...product, cartId: Date.now() }]); setNotification({ type: 'success', message: `${product.code} eklendi` }); if(cart.length === 0) setOrderKarat(product.selectedKarat); }, [cart.length]);
    const removeFromCart = useCallback((cartId) => { setCart(prev => { const newCart = prev.filter(item => item.cartId !== cartId); if(newCart.length === 0) setOrderKarat(null); return newCart; }); }, []);

    const handleCheckout = useCallback(async (name, phone, note, deliveryDate, karat, orderNo, orderStamp, items = null, targetStatus = 'new', finalOrderDate) => {
        if(cart.length === 0 && (!items || items.length === 0)) return;
        if (!user) { alert("Oturum açılıyor..."); return; }
        try {
            const itemsToSave = (items || cart).map(item => { const { _tempId, imageUrl, imageFile, ...rest } = item; return rest; });
            let creationTime = serverTimestamp();
            if (finalOrderDate && finalOrderDate !== new Date().toISOString().split('T')[0]) { creationTime = new Date(finalOrderDate); }

            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), {
                customerName: name, customerPhone: phone, totalNote: note, items: itemsToSave,
                createdAt: creationTime, status: targetStatus, deliveryDate: deliveryDate,
                orderKarat: karat, customOrderNo: orderNo, orderStamp: orderStamp, createdBy: user.uid
            });

            if (targetStatus !== 'draft') { setOrderKarat(null); setDraftData({ customerName: "", orderKarat: "", orderStamp: "", orderDate: new Date().toISOString().split('T')[0], deliveryDate: "", customOrderNo: "", customerPhone: "", stampType: 'text', items: [] }); }
            setIsOrderPreviewOpen(false);
            setNotification({ type: 'success', message: targetStatus === 'draft' ? "Taslak kaydedildi!" : "Sipariş oluşturuldu!" });
        } catch (error) { setNotification({ type: 'error', message: "Hata: " + error.message }); }
    }, [cart, user]);

    const handleUpdateOrder = useCallback(async (orderId, data) => { try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId), data); setIsOrderPreviewOpen(false); setViewingOrder(null); setNotification({type:'success', message:'Sipariş güncellendi'}); } catch (error) { setNotification({type:'error', message: error.message}); } }, []);
    const handleDeleteProduct = useCallback(async (id) => { try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', id)); setNotification({type:'success', message:'Ürün silindi'}); } catch(err) { setNotification({type:'error', message:err.message}); } }, []);
    const handleUpdateStatus = useCallback(async (orderId, status) => { try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId), { status }); setNotification({type:'success', message:'Durum güncellendi'}); } catch(err) { setNotification({type:'error', message:err.message}); } }, []);
    const handleDeleteOrder = useCallback(async (orderId) => { try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId)); setNotification({type:'success', message:'Sipariş silindi'}); } catch(err) { setNotification({type:'error', message:err.message}); } }, []);
    const handleOpenCatalogue = (category, subcategory) => { setCatalogueParams({ category, subcategory }); setIsCatalogueOpen(true); };

    if (isAdminOpen && user && !user.isAnonymous) {
        return (
            <>
                {notification && <CustomNotification type={notification.type} message={notification.message} onClose={()=>setNotification(null)} />}
                <PrintStyles />
                {(isOrderPreviewOpen || viewingOrder) && <OrderPreviewModal cart={cart} isOpen={isOrderPreviewOpen} onClose={() => { setIsOrderPreviewOpen(false); setViewingOrder(null); }} onRemoveItem={removeFromCart} initialData={viewingOrder} products={products} onUpdateOrder={handleUpdateOrder} onCreateOrder={handleCheckout} draftData={draftData} setDraftData={setDraftData} logoUrl={logoUrl} />}
                <div className="screen-only">
                    <Suspense fallback={<AdminLoadingScreen />}>
                        <AdminPanelContent user={user} currentUserProfile={user} appId={appId} products={products} orders={orders} onClose={() => setIsAdminOpen(false)} handleDeleteProduct={handleDeleteProduct} handleUpdateStatus={handleUpdateStatus} setNotification={setNotification} onCreateNewOrder={() => { setCart([]); setViewingOrder(null); setIsOrderPreviewOpen(true); }} onViewOrder={(order) => { setViewingOrder(order); setIsOrderPreviewOpen(true); }} handleDeleteOrder={handleDeleteOrder} logoUrl={logoUrl} handleUpdateLogo={handleUpdateLogo} />
                    </Suspense>
                </div>
            </>
        );
    }

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-ink-950 font-sans pb-20 md:pb-0">
        <PrintStyles />
        {notification && <CustomNotification type={notification.type} message={notification.message} onClose={()=>setNotification(null)} />}

        <div className="screen-only">
            <StoreView products={products} productsLoaded={productsLoaded} onAddToCart={handleAddToCart} cart={cart} setIsOrderPreviewOpen={setIsOrderPreviewOpen} user={user} setIsAdminOpen={setIsAdminOpen} onLogin={handleAdminLogin} currentUserData={currentUserData} logoUrl={logoUrl} onOpenCatalogue={handleOpenCatalogue} setSelectedProduct={setSelectedProduct} />

            <ProductModal product={selectedProduct} isOpen={!!selectedProduct} onClose={() => setSelectedProduct(null)} onConfirm={handleAddToCart} />
            <CatalogueModal isOpen={isCatalogueOpen} onClose={() => setIsCatalogueOpen(false)} appId={appId} initialCategory={catalogueParams.category} initialSubcategory={catalogueParams.subcategory} />
        </div>

        <OrderPreviewModal cart={cart} isOpen={isOrderPreviewOpen && !viewingOrder} onClose={() => setIsOrderPreviewOpen(false)} onRemoveItem={removeFromCart} onCreateOrder={handleCheckout} products={products} initialData={null} draftData={draftData} setDraftData={setDraftData} logoUrl={logoUrl} />
        </div>
    );
};

export default App;
