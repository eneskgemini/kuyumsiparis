import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { appId } from '../utils/constants';

// Firma bilgileri (Ayarlar > Firma Bilgileri) artifacts/{appId}/public/data/
// settings/company dokümanında tutulur. Sipariş belgesindeki başlık ve
// iletişim bilgileri buradan canlı okunur; doküman henüz oluşturulmamışsa
// eski sabit "SAHRA / KUYUMCULUK" değerleri varsayılan olarak kullanılır.
const DEFAULTS = { name: 'SAHRA', subtitle: 'KUYUMCULUK', address: '', phone: '', taxNo: '' };

export const useCompanyInfo = () => {
    const [companyInfo, setCompanyInfo] = useState(DEFAULTS);

    useEffect(() => {
        const ref = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'company');
        const unsub = onSnapshot(ref, (snap) => {
            if (snap.exists()) {
                const data = snap.data() || {};
                setCompanyInfo(Object.assign({}, DEFAULTS, data));
            }
        }, (err) => console.error('[Firma Bilgileri] Okunamadı:', err));
        return () => unsub();
    }, []);

    return companyInfo;
};

export default useCompanyInfo;
