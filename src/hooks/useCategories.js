import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { appId, CATEGORIES as DEFAULT_CATEGORIES, SUBCATEGORIES as DEFAULT_SUBCATEGORIES } from '../utils/constants';

// Kategoriler/alt kategoriler artık kod içinde sabit değil; Ayarlar > Kategori
// Yönetimi ekranından düzenlenebiliyor ve
// artifacts/{appId}/public/data/settings/categories dokümanında saklanıyor.
// O doküman henüz yoksa (ilk kurulum / hiç düzenleme yapılmamış) constants.js
// içindeki eski sabit listeler varsayılan olarak kullanılır — böylece mevcut
// kategoriler bir anda kaybolmaz. Ürün/katalog/mağaza tarafındaki tüm
// bileşenler bu hook'u kullanarak aynı canlı listeyi paylaşır.
export const useCategories = () => {
    const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
    const [subcategories, setSubcategories] = useState(DEFAULT_SUBCATEGORIES);

    useEffect(() => {
        const ref = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'categories');
        const unsub = onSnapshot(ref, (snap) => {
            if (snap.exists()) {
                const data = snap.data() || {};
                if (Array.isArray(data.categories) && data.categories.length > 0) setCategories(data.categories);
                if (data.subcategories && typeof data.subcategories === 'object') setSubcategories(data.subcategories);
            }
        }, (err) => console.error('[Kategoriler] Okunamadı:', err));
        return () => unsub();
    }, []);

    return { categories, subcategories };
};

export default useCategories;
