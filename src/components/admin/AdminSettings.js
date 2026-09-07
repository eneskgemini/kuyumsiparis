import React from 'react';
import { DEFAULT_LOGO_URL } from '../../utils/constants';

const AdminSettings = ({ logoUrl, handleLogoUpload }) => (
    <div className="space-y-6 animate-slide-up max-w-2xl">
        <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-100">Ayarlar</h2>
        <div className="card p-6">
            <h3 className="font-bold text-ink-700 dark:text-ink-200 mb-4">Mağaza Logosu</h3>
            <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-stone-50 dark:bg-ink-800 border-2 border-stone-100 dark:border-ink-800 rounded-2xl flex items-center justify-center overflow-hidden"><img src={logoUrl || DEFAULT_LOGO_URL} alt="Logo" className="w-full h-full object-contain" /></div>
                <div><label className="block mb-2 text-sm text-ink-600 dark:text-ink-300 font-bold">Yeni Logo Yükle</label><input type="file" accept="image/png, image/jpeg" onChange={handleLogoUpload} className="block w-full text-sm text-ink-500 dark:text-ink-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gold-50 dark:bg-gold-950/20 file:text-gold-700 dark:text-gold-400 hover:file:bg-gold-100 file:transition-colors"/><p className="text-[11px] text-ink-400 dark:text-ink-500 mt-2">Önerilen boyut: 512x512px (PNG)</p></div>
            </div>
        </div>
    </div>
);

export default AdminSettings;
