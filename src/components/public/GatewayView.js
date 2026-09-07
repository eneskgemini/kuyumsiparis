import React from 'react';
import { ShoppingBag, Users, ChevronRight, Star } from 'lucide-react';

const GatewayView = ({ setAppMode, logoUrl }) => {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center relative overflow-hidden px-6">
      {/* Arka Plan Efekti */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-gold-200/40 blur-3xl"></div>
        <div className="absolute inset-0 bg-[radial-gradient(#00000008_1px,transparent_1px)] [background-size:22px_22px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-5xl flex flex-col items-center animate-slide-up">
        {/* Logo Bölümü */}
        <div className="mb-12 flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-white border border-stone-200 flex items-center justify-center shadow-lift mb-4">
                {logoUrl ? <img src={logoUrl} className="w-16 h-16 object-contain" alt="Logo"/> : <Star size={40} className="text-gold-500"/>}
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-semibold text-ink-900 tracking-[0.16em] uppercase">SAHRA</h1>
            <p className="text-gold-600 uppercase tracking-[0.4em] text-xs mt-2 font-bold">Kuyumculuk &amp; Mücevherat</p>
        </div>

        {/* Seçenekler */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">

            {/* Personel Girişi */}
            <button onClick={() => setAppMode('staff')} className="group relative card p-8 hover:border-gold-300 hover:shadow-lift hover:-translate-y-1 transition-all text-left overflow-hidden">
                <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-gold-500 transition-colors">
                    <Users size={30} className="text-ink-500 group-hover:text-white transition-colors"/>
                </div>
                <h2 className="text-xl font-bold text-ink-900 mb-2">Personel Girişi</h2>
                <p className="text-ink-500 text-sm mb-6 leading-relaxed">B2B sipariş yönetimi, ERP, stüdyo ve şirket içi mesajlaşma modüllerine erişim sağlayın.</p>
                <div className="flex items-center gap-2 text-gold-600 text-sm font-bold uppercase tracking-wider">
                    Giriş Yap <ChevronRight size={16} className="group-hover:translate-x-2 transition-transform"/>
                </div>
            </button>

            {/* Online Satış (E-Ticaret) */}
            <button onClick={() => setAppMode('public')} className="group relative card p-8 hover:border-ink-300 hover:shadow-lift hover:-translate-y-1 transition-all text-left overflow-hidden">
                <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-ink-900 transition-colors">
                    <ShoppingBag size={30} className="text-ink-500 group-hover:text-white transition-colors"/>
                </div>
                <h2 className="text-xl font-bold text-ink-900 mb-2">Online Satış</h2>
                <p className="text-ink-500 text-sm mb-6 leading-relaxed">Müşterilerimiz için e-ticaret mağazası. Yeni koleksiyonları keşfedin ve sipariş verin.</p>
                <div className="flex items-center gap-2 text-ink-900 text-sm font-bold uppercase tracking-wider">
                    Mağazayı Gez <ChevronRight size={16} className="group-hover:translate-x-2 transition-transform"/>
                </div>
            </button>

        </div>
      </div>
    </div>
  );
};

export default GatewayView;
