import React, { useState, useEffect } from 'react';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { User, X, Check, Pencil } from 'lucide-react';
import { db } from '../../config/firebase';
import { appId } from '../../utils/constants';

// DiceBear'ın ücretsiz, API anahtarı gerektirmeyen SVG servisi kullanılıyor.
// (Eski multiavatar.com PNG servisi kararsızdı ve avatarlar görünmüyordu.)
// 1 kadın (topuz saçlı) + 7 erkek - dükkândaki çalışan sayısı/dağılımına göre.
const AVATARS = [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Sibel&top=bun&facialHairProbability=0&backgroundColor=f5e6c8",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Ali&top=shortFlat&facialHair=beardLight&facialHairProbability=100&backgroundColor=d9d3c7",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Burak&top=shortRound&facialHairProbability=0&backgroundColor=f0d9b5",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Can&top=theCaesar&facialHair=moustacheFancy&facialHairProbability=100&backgroundColor=e8e4dc",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Emre&top=sides&facialHairProbability=0&backgroundColor=ead9c3",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Kaan&top=shortWaved&facialHair=beardMedium&facialHairProbability=100&backgroundColor=dcd6c9",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Mehmet&top=shortCurly&facialHairProbability=0&backgroundColor=f2e2c4",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Ozan&top=theCaesarAndSidePart&facialHair=beardLight&facialHairProbability=100&backgroundColor=e0dacd"
];

const UserProfileModal = ({ user, isOpen, onClose }) => {
    const [name, setName] = useState((user && user.displayName) || "");
    const [position, setPosition] = useState("");
    const [photo, setPhoto] = useState((user && user.photoURL) || "");
    const [loading, setLoading] = useState(false);
    const [showAvatars, setShowAvatars] = useState(false);

    useEffect(() => {
        if (isOpen && user) {
            setName(user.displayName || "");
            setPhoto(user.photoURL || "");
            setShowAvatars(false);
            const fetchUserData = async () => {
                try {
                    const docSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'app_users', user.uid));
                    if (docSnap.exists()) setPosition(docSnap.data().position || "");
                } catch (e) { console.error(e); }
            };
            fetchUserData();
        }
    }, [isOpen, user]);

    const handleSave = async () => {
        setLoading(true);
        try {
            await updateProfile(user, { displayName: name, photoURL: photo });
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'app_users', user.uid), {
                uid: user.uid,
                displayName: name,
                email: user.email,
                photoURL: photo,
                position: position,
                updatedAt: serverTimestamp()
            }, { merge: true });

            alert("Profil başarıyla güncellendi!");
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
        <div className="fixed inset-0 z-[300] bg-ink-950/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="card p-6 max-w-md w-full relative max-h-[90vh] overflow-y-auto custom-scrollbar animate-zoom-in">
                <button onClick={onClose} className="absolute top-4 right-4 text-ink-300 hover:text-ink-600 dark:text-ink-500 dark:hover:text-ink-200 transition-colors"><X size={18}/></button>
                <h3 className="text-lg font-bold text-ink-900 dark:text-ink-100 mb-6 tracking-wide">Hesap Ayarları</h3>

                <div className="flex flex-col items-center mb-6">
                    <div className="w-24 h-24 mb-3 rounded-full overflow-hidden border-4 border-stone-50 dark:border-ink-800 shadow-soft bg-stone-100 dark:bg-ink-800 flex items-center justify-center ring-1 ring-stone-200 dark:ring-ink-700">
                        {photo ? (
                            <img src={photo} className="w-full h-full object-cover" alt="Profil" />
                        ) : (
                            <div className="text-ink-400 dark:text-ink-500 font-bold text-2xl">{name ? name[0]?.toUpperCase() : <User size={40}/>}</div>
                        )}
                    </div>

                    <button
                        onClick={() => setShowAvatars(!showAvatars)}
                        className="chip hover:bg-stone-100 dark:hover:bg-ink-700 transition-colors mb-2"
                    >
                        <Pencil size={13}/> {showAvatars ? "Listeyi Kapat" : "Avatarı Değiştir"}
                    </button>

                    {showAvatars && (
                        <div className="w-full animate-slide-down mt-2">
                            <div className="grid grid-cols-4 gap-3 p-3 bg-stone-50 dark:bg-ink-800 rounded-xl border border-stone-200 dark:border-ink-700">
                                {AVATARS.map((avatarUrl, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            setPhoto(avatarUrl);
                                            setShowAvatars(false);
                                        }}
                                        className={`relative aspect-square rounded-xl border-2 overflow-hidden transition-all hover:scale-105 ${photo === avatarUrl ? 'border-gold-500 shadow-soft scale-105' : 'border-transparent hover:border-stone-300 dark:hover:border-ink-600'}`}
                                    >
                                        <img src={avatarUrl} alt={`Avatar ${idx + 1}`} loading="lazy" className="w-full h-full object-cover bg-white dark:bg-stone-200" />
                                        {photo === avatarUrl && (
                                            <div className="absolute bottom-1 right-1 bg-gold-500 text-white rounded-full p-0.5">
                                                <Check size={12} strokeWidth={4}/>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-4">
                    <div>
                        <label className="field-label">Ad Soyad</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="field" placeholder="Adınız Soyadınız"/>
                    </div>
                    <div>
                        <label className="field-label">Görevi / Pozisyonu</label>
                        <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} className="field" placeholder="Örn: Satış Temsilcisi"/>
                    </div>
                    <button onClick={handleSave} disabled={loading} className="btn-primary w-full !py-4 mt-2">
                        {loading ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserProfileModal;
