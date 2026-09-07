import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { Search, ShoppingBag, User, LogOut, Menu, MonitorPlay, ChevronDown, ChevronRight, Star, X, AlertTriangle, Settings, Key, Mail, Loader2 } from 'lucide-react';
import { auth, db } from '../../config/firebase';
import { CATEGORIES, SUBCATEGORIES, appId } from '../../utils/constants';
import { useDebounce, naturalSort } from '../../utils/helpers';
import Pagination from '../common/Pagination';
import ProductCard from './ProductCard';
import UserProfileModal from './UserProfileModal';

const StoreView = ({ products, onAddToCart, cart, setIsOrderPreviewOpen, user, setIsAdminOpen, onLogin, currentUserData, logoUrl, onOpenCatalogue, setSelectedProduct, productsLoaded }) => {
  const [activeCategory, setActiveCategory] = useState("Anasayfa");
  const [activeSubCategory, setActiveSubCategory] = useState("Hepsi");
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [loginStep, setLoginStep] = useState('welcome');
  const [currentPage, setCurrentPage] = useState(1);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [showEmptyCartModal, setShowEmptyCartModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const ITEMS_PER_PAGE = 24;
  const isAuthenticated = user && !user.isAnonymous;

  useEffect(() => { setCurrentPage(1); }, [activeCategory, activeSubCategory, debouncedSearchTerm]);

  const handleLogout = async () => {
      if (user && user.uid) {
        try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'app_users', user.uid), { isOnline: false }); } catch(e) {}
      }
      await signOut(auth);
      window.location.reload();
  };

  const filteredProducts = useMemo(() => {
      if (!products) return [];
      let filtered = [];
      if (activeCategory === "Anasayfa") {
          if (!debouncedSearchTerm || debouncedSearchTerm.trim() === "") filtered = [];
          else { const term = debouncedSearchTerm.toLowerCase().trim(); filtered = products.filter(p => p.code && p.code.toLowerCase().includes(term)); }
      } else {
          filtered = products.filter(p => {
              const catMatch = p.category === activeCategory; if (!catMatch) return false;
              const subMatch = activeSubCategory === "Hepsi" || (p.subcategory && p.subcategory.toUpperCase() === activeSubCategory.toUpperCase());
              if (!subMatch) return false;
              if (debouncedSearchTerm.length > 0) return p.code && p.code.toLowerCase().includes(debouncedSearchTerm.toLowerCase().trim()); return true;
          });
      }
      return filtered.sort(naturalSort);
  }, [products, activeCategory, activeSubCategory, debouncedSearchTerm]);

  const paginatedProducts = useMemo(() => filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, (currentPage - 1) * ITEMS_PER_PAGE + ITEMS_PER_PAGE), [filteredProducts, currentPage]);
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);

  const handleCategoryClick = useCallback((category, subcategory = "Hepsi") => {
      setActiveCategory(category); setActiveSubCategory(subcategory); setSearchTerm(""); setIsMobileMenuOpen(false);
  }, []);

  if (!isAuthenticated) return (
    <div className="fixed inset-0 z-[200] bg-stone-50 dark:bg-ink-950 flex flex-col items-center justify-center overflow-hidden p-4">
        <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full bg-gold-200/40 dark:bg-gold-900/20 blur-3xl"></div>
            <div className="absolute inset-0 bg-[radial-gradient(#00000008_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:22px_22px]"></div>
        </div>

        <div className="relative z-10 w-full max-w-sm flex flex-col items-center text-center">
            <div className={`mb-6 rounded-full bg-white dark:bg-ink-900 border border-stone-200 dark:border-ink-700 shadow-lift flex items-center justify-center transition-all duration-500 ${loginStep === 'form' ? 'w-16 h-16' : 'w-24 h-24'}`}>
                {logoUrl ? <img src={logoUrl} alt="Sahra" className={`object-contain transition-all duration-500 ${loginStep === 'form' ? 'w-10 h-10' : 'w-14 h-14'}`} /> : <Star size={40} className="text-gold-500" />}
            </div>

            {loginStep === 'welcome' && (
                <div className="animate-slide-up flex flex-col items-center w-full">
                    <h1 className="text-4xl font-serif font-semibold text-ink-900 dark:text-ink-100 tracking-[0.14em] mb-2">SAHRA</h1>
                    <p className="text-[11px] text-gold-600 dark:text-gold-400 uppercase tracking-[0.35em] font-bold mb-10 border-b border-stone-200 dark:border-ink-700 pb-5 w-full">Kuyumculuk &amp; Mücevherat</p>
                    <button onClick={() => setLoginStep('form')} className="btn-gold w-full !py-4 !rounded-full">
                        Giriş Yap <ChevronRight size={16}/>
                    </button>
                </div>
            )}

            {loginStep === 'form' && (
                <div className="w-full animate-slide-up card !rounded-3xl p-7 text-left">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg text-ink-900 dark:text-ink-100 font-serif font-semibold tracking-wide">Üye Girişi</h2>
                        <button onClick={() => setLoginStep('welcome')} className="text-ink-300 hover:text-ink-700 dark:text-ink-500 dark:hover:text-ink-200 transition-colors"><X size={18}/></button>
                    </div>
                    <form onSubmit={onLogin} className="space-y-4">
                        <div>
                            <label className="field-label">E-Posta</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300 dark:text-ink-500" size={16} />
                                <input name="email" type="email" required className="field !pl-10" placeholder="ornek@sahra.com" />
                            </div>
                        </div>
                        <div>
                            <label className="field-label">Şifre</label>
                            <div className="relative">
                                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300 dark:text-ink-500" size={16} />
                                <input name="password" type="password" required className="field !pl-10" placeholder="••••••••" />
                            </div>
                        </div>
                        <button type="submit" className="btn-primary w-full !py-3.5 mt-2">
                            Paneli Aç <ChevronRight size={16}/>
                        </button>
                    </form>
                </div>
            )}
        </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden relative bg-stone-50 dark:bg-ink-950">
        {showEmptyCartModal && (
            <div className="fixed inset-0 z-[300] bg-ink-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowEmptyCartModal(false)}>
                <div className="card p-8 max-w-sm w-full text-center animate-zoom-in" onClick={(e) => e.stopPropagation()}>
                    <div className="w-16 h-16 bg-gold-50 dark:bg-gold-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={30} className="text-gold-500"/>
                    </div>
                    <h3 className="text-lg font-bold text-ink-900 dark:text-ink-100 mb-2">Uyarı</h3>
                    <p className="text-ink-500 dark:text-ink-400 mb-6 font-medium text-sm">Sipariş oluşturmak için en az 1 model ekleyiniz.</p>
                    <button onClick={() => setShowEmptyCartModal(false)} className="btn-primary w-full">Tamam</button>
                </div>
            </div>
        )}
        {isAccountModalOpen && <UserProfileModal user={user} isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} />}

        {isMobileMenuOpen && (
            <div className="fixed inset-0 bg-ink-950/40 z-30 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>
        )}

        <div className={`fixed inset-y-0 left-0 z-40 w-72 bg-white dark:bg-charcoal-900 border-r border-stone-200 dark:border-charcoal-700 flex flex-col flex-shrink-0 transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="px-4 py-[18px] border-b border-stone-100 dark:border-charcoal-800 flex flex-col items-center">
                <div className="w-full flex justify-end md:hidden mb-2"><button onClick={() => setIsMobileMenuOpen(false)} className="text-ink-400 hover:text-ink-700 dark:text-ink-300 dark:hover:text-white"><X size={20}/></button></div>
                <div className="w-52 h-24 flex items-center justify-center">{logoUrl ? <img src={logoUrl} className="max-w-full max-h-full w-auto h-auto object-contain" alt="logo"/> : <Star size={48} className="text-gold-500"/>}</div>
            </div>
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
                <button onClick={() => handleCategoryClick("Anasayfa")} className={`sidebar-link ${activeCategory === "Anasayfa" ? 'bg-ink-900 dark:bg-charcoal-700 text-white dark:text-stone-50 shadow-soft' : 'text-ink-500 dark:text-charcoal-200 hover:bg-stone-100 dark:hover:bg-charcoal-800 hover:text-ink-900 dark:hover:text-gold-300'}`}><Search size={17}/> Hızlı Arama</button>

                {CATEGORIES.filter(c => c !== "Anasayfa").map(cat => (
                    <div key={cat} className="group relative">
                        <button onClick={() => setExpandedCategory(expandedCategory === cat ? null : cat)} className={`w-full flex justify-between items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeCategory === cat || expandedCategory === cat ? 'bg-gold-50 dark:bg-gold-950/30 text-gold-700 dark:text-gold-400' : 'text-ink-500 dark:text-charcoal-200 hover:bg-stone-100 dark:hover:bg-charcoal-800 hover:text-ink-900 dark:hover:text-gold-300'}`}>
                            <span>{cat}</span>{expandedCategory === cat ? <ChevronDown size={14}/> : <ChevronRight size={14} className="opacity-50"/>}
                        </button>

                        {expandedCategory === cat && SUBCATEGORIES[cat] && (
                            <div className="py-2 space-y-0.5 animate-slide-down">
                                {SUBCATEGORIES[cat].map(sub => (
                                    <button key={sub} onClick={(e) => { e.stopPropagation(); handleCategoryClick(cat, sub); }} className={`w-full text-left pl-10 pr-4 py-2 text-xs font-bold transition-colors flex items-center gap-2 rounded-lg ${activeSubCategory === sub && activeCategory === cat ? 'text-ink-900 dark:text-white bg-stone-100 dark:bg-charcoal-800' : 'text-ink-400 dark:text-charcoal-300 hover:text-ink-700 dark:hover:text-white'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${activeSubCategory === sub && activeCategory === cat ? 'bg-gold-500' : 'bg-stone-300 dark:bg-charcoal-600'}`}></span>{sub}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {currentUserData?.role === 'admin' && (
                <div className="p-4 border-t border-stone-100 dark:border-charcoal-800">
                    <button onClick={() => setIsAdminOpen(true)} className="btn-secondary w-full"><Settings size={16}/> Yönetim Paneli</button>
                </div>
            )}
        </div>

        <div className="flex-1 flex flex-col bg-stone-50 dark:bg-charcoal-900 relative overflow-hidden w-full">
            <div className="h-16 bg-white dark:bg-charcoal-900 border-b border-stone-200 dark:border-charcoal-800 flex items-center justify-between px-4 md:px-6 shadow-soft z-10 shrink-0">
                <div className="flex items-center gap-2 md:gap-4 flex-1">
                    <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 text-ink-600 dark:text-ink-300 hover:bg-stone-100 dark:hover:bg-charcoal-800 rounded-lg"><Menu size={22} /></button>

                    {activeCategory !== 'Anasayfa' && (
                        <div className="relative w-full max-w-xs md:max-w-md animate-slide-down">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300 dark:text-ink-500" size={17}/>
                            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={`${activeCategory}...`} className="w-full bg-stone-100 dark:bg-charcoal-800 border-none rounded-full py-2 pl-10 pr-4 text-xs md:text-sm font-bold text-ink-700 dark:text-ink-200 outline-none focus:ring-2 focus:ring-gold-200 dark:focus:ring-gold-500/20 transition-all placeholder-ink-400 dark:placeholder-ink-500"/>
                        </div>
                    )}

                    {activeCategory !== 'Anasayfa' && (
                        <>
                            <button onClick={() => onOpenCatalogue(activeCategory, activeSubCategory)} className="hidden md:flex items-center gap-2 px-4 py-2 bg-ink-900 dark:bg-charcoal-700 text-white dark:text-stone-50 rounded-full text-xs font-bold hover:bg-ink-800 dark:hover:bg-charcoal-600 transition-colors shadow-soft ml-4 animate-zoom-in"><MonitorPlay size={16} className="text-gold-400" /> Katalog Modu</button>
                            <button onClick={() => onOpenCatalogue(activeCategory, activeSubCategory)} className="md:hidden p-2 bg-ink-900 dark:bg-charcoal-700 text-white dark:text-stone-50 rounded-full shadow-soft ml-2 animate-zoom-in" title="Katalog Modu"><MonitorPlay size={20} className="text-gold-400" /></button>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2 md:gap-4">
                    <button onClick={() => { if (cart.length > 0) { setIsOrderPreviewOpen(true); } else { setShowEmptyCartModal(true); } }} className="relative p-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-charcoal-800 dark:hover:bg-charcoal-700 rounded-full transition-colors group"><ShoppingBag size={19} className="text-ink-600 group-hover:text-ink-900 dark:text-ink-300 dark:group-hover:text-white"/>{cart.length > 0 && <span className="absolute -top-1 -right-1 bg-gold-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full ring-2 ring-white dark:ring-charcoal-900">{cart.length}</span>}</button>
                    <div className="relative">
                        <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center gap-3 pl-2 md:pl-4 border-l border-stone-200 dark:border-charcoal-700 outline-none"><div className="w-8 h-8 rounded-full bg-ink-900 dark:bg-charcoal-700 text-white dark:text-stone-50 flex items-center justify-center font-bold text-xs overflow-hidden">{user && user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" alt="user"/> : (user && user.email && user.email[0].toUpperCase())}</div></button>
                        {isUserMenuOpen && (<><div className="fixed inset-0 z-10" onClick={() => setIsUserMenuOpen(false)}></div><div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-charcoal-800 rounded-xl shadow-lift border border-stone-200 dark:border-charcoal-700 z-20 overflow-hidden animate-slide-down"><button onClick={() => { setIsAccountModalOpen(true); setIsUserMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-medium text-ink-600 dark:text-ink-300 hover:bg-stone-50 dark:hover:bg-charcoal-700 flex items-center gap-2"><User size={16}/> Hesap</button><button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"><LogOut size={16}/> Çıkış Yap</button></div></>)}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar flex flex-col">
                {activeCategory === 'Anasayfa' && (
                    <div className={`flex flex-col items-center justify-center transition-all duration-500 ease-in-out px-4 ${searchTerm ? 'py-6 min-h-auto' : 'min-h-[300px] md:min-h-[400px] animate-fade-in'}`}>
                        <div className={`inline-block rounded-full bg-gold-50 dark:bg-gold-950/30 border border-gold-100 dark:border-gold-900/40 transition-all duration-500 ${searchTerm ? 'mb-2 p-3 scale-75' : 'mb-4 md:mb-6 p-6 md:p-8'}`}><Search size={searchTerm ? 32 : (window.innerWidth < 768 ? 48 : 64)} className="text-gold-500"/></div>
                        <h2 className={`font-bold text-ink-900 dark:text-ink-100 font-serif tracking-wide transition-all duration-500 text-center ${searchTerm ? 'text-lg md:text-xl mb-1' : 'text-2xl md:text-3xl mb-2'}`}>Model Arama</h2>
                        <div className={`relative w-full transition-all duration-500 ${searchTerm ? 'max-w-4xl' : 'max-w-lg'}`}>
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-ink-300 dark:text-ink-500" size={22}/>
                            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Örn: SMG..." className="w-full bg-white dark:bg-charcoal-800 border border-stone-200 dark:border-charcoal-700 rounded-full py-3 md:py-4 pl-12 md:pl-14 pr-6 text-base md:text-lg font-bold text-ink-800 dark:text-ink-100 outline-none focus:border-gold-400 focus:ring-4 focus:ring-gold-100 dark:focus:ring-gold-500/10 transition-all shadow-soft placeholder-ink-400 dark:placeholder-ink-500" autoFocus/>
                        </div>
                    </div>
                )}

                {(activeCategory !== 'Anasayfa' || searchTerm) && (
                    <div className={activeCategory === 'Anasayfa' ? 'animate-slide-up mt-4' : ''}>
                        <div className="mb-4 flex items-center justify-end"><Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} /></div>

                        {!productsLoaded && paginatedProducts.length === 0 ? (
                            <div className="flex flex-wrap -mx-2">
                                {Array.from({ length: 10 }).map((_, i) => (
                                    <div key={i} className="w-1/2 md:w-1/4 lg:w-1/5 p-2 box-border">
                                        <div className="card !shadow-none aspect-square animate-pulse bg-stone-100 dark:bg-charcoal-800"></div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-wrap -mx-2">
                                {paginatedProducts.map(product => (
                                    <div key={product.id} className="w-1/2 md:w-1/4 lg:w-1/5 p-2 box-border">
                                        <ProductCard product={product} onAddToCart={setSelectedProduct} logoUrl={logoUrl} />
                                    </div>
                                ))}
                            </div>
                        )}

                        {productsLoaded && paginatedProducts.length === 0 && <div className="text-center py-20 text-ink-400 dark:text-ink-500 font-medium">Ürün bulunamadı.</div>}
                        {!productsLoaded && paginatedProducts.length === 0 && (
                            <div className="text-center py-6 text-ink-400 dark:text-ink-500 font-medium flex items-center justify-center gap-2 text-sm">
                                <Loader2 size={15} className="animate-spin" /> Ürünler yükleniyor...
                            </div>
                        )}
                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default StoreView;
