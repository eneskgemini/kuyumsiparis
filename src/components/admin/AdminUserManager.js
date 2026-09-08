import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ShieldCheck, ShieldOff, Trash, User } from 'lucide-react';
import { db } from '../../config/firebase';
import { appId } from '../../utils/constants';
import ConfirmationModal from '../common/ConfirmationModal';

// Bir kullanıcının "Yönetim Paneli" butonunu görmesi, app_users belgesindeki
// role alanının 'admin' olmasına bağlı (bkz. StoreView.js). Bu alanı
// düzenleyebilecek bir arayüz olmadığı için şimdiye kadar yalnızca Firebase
// konsolünden elle değiştirilebiliyordu — bu ekran o boşluğu kapatıyor.
const isOnline = (u) => {
    if (!u || !u.isOnline) return false;
    if (u.lastLogin && u.lastLogin.seconds) {
        const diffMinutes = (Date.now() / 1000 - u.lastLogin.seconds) / 60;
        return diffMinutes < 5;
    }
    return true;
};

const AdminUserManager = ({ currentUid, setNotification }) => {
    const [users, setUsers] = useState([]);
    const [deleteTarget, setDeleteTarget] = useState(null);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'app_users'), (snap) => {
            setUsers(snap.docs.map(d => Object.assign({ id: d.id }, d.data())));
        }, (err) => console.error('[Kullanıcılar] Okunamadı:', err));
        return () => unsub();
    }, []);

    const sortedUsers = useMemo(() => [...users].sort((a, b) => (a.displayName || a.email || '').localeCompare(b.displayName || b.email || '', 'tr')), [users]);
    const adminCount = useMemo(() => users.filter(u => u.role === 'admin').length, [users]);

    const toggleRole = async (u) => {
        const isCurrentlyAdmin = u.role === 'admin';
        if (isCurrentlyAdmin && adminCount <= 1) {
            setNotification({ type: 'error', message: 'En az bir yönetici kalmalı — önce başka birini yönetici yapın.' });
            return;
        }
        try {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'app_users', u.id), { role: isCurrentlyAdmin ? '' : 'admin' });
            setNotification({ type: 'success', message: isCurrentlyAdmin ? 'Yöneticilik yetkisi alındı' : 'Yönetici yapıldı' });
        } catch (e) {
            setNotification({ type: 'error', message: 'İşlem başarısız: ' + e.message });
        }
    };

    const executeDelete = async () => {
        if (!deleteTarget) return;
        const target = deleteTarget;
        setDeleteTarget(null);
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'app_users', target.id));
            setNotification({ type: 'success', message: 'Kullanıcı profili silindi' });
        } catch (e) {
            setNotification({ type: 'error', message: 'Silinemedi: ' + e.message });
        }
    };

    return (
        <div className="card overflow-hidden">
            <ConfirmationModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={executeDelete}
                title="Kullanıcı Profilini Sil"
                message="Bu kullanıcının profil kaydını silmek istediğinize emin misiniz? Kullanıcı giriş bilgileriyle tekrar giriş yaparsa profili otomatik olarak yeniden oluşturulur, ancak yönetici yetkisi kaybolur."
            />

            <div className="divide-y divide-stone-100 dark:divide-ink-800">
                {sortedUsers.length === 0 && <div className="p-6 text-center text-sm text-ink-400 dark:text-ink-500 italic">Henüz kayıtlı kullanıcı yok.</div>}
                {sortedUsers.map(u => {
                    const isAdmin = u.role === 'admin';
                    const isSelf = u.uid === currentUid;
                    return (
                        <div key={u.id} className="p-3.5 flex items-center gap-3">
                            <div className="relative shrink-0">
                                <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-ink-800 overflow-hidden flex items-center justify-center ring-1 ring-stone-200 dark:ring-ink-700">
                                    {u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover" alt={u.displayName || u.email} /> : <User size={18} className="text-ink-400" />}
                                </div>
                                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-ink-900 ${isOnline(u) ? 'bg-emerald-500' : 'bg-stone-300 dark:bg-ink-600'}`} title={isOnline(u) ? 'Çevrimiçi' : 'Çevrimdışı'}></span>
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-ink-900 dark:text-ink-100 truncate">{u.displayName || u.email || 'İsimsiz'}</span>
                                    {isSelf && <span className="text-[10px] text-ink-400 dark:text-ink-500 font-bold shrink-0">(Siz)</span>}
                                </div>
                                <div className="text-xs text-ink-400 dark:text-ink-500 truncate">{u.email}{u.position ? ` · ${u.position}` : ''}</div>
                            </div>

                            <span className={`badge shrink-0 ${isAdmin ? 'bg-gold-50 text-gold-700 dark:bg-gold-950/30 dark:text-gold-400' : 'bg-stone-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400'}`}>{isAdmin ? 'Yönetici' : 'Kullanıcı'}</span>

                            <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => toggleRole(u)} className={`p-1.5 rounded-lg transition-colors ${isAdmin ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30' : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'}`} title={isAdmin ? 'Yöneticilikten Çıkar' : 'Yönetici Yap'}>
                                    {isAdmin ? <ShieldOff size={16}/> : <ShieldCheck size={16}/>}
                                </button>
                                {!isSelf && (
                                    <button onClick={() => setDeleteTarget(u)} className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors" title="Profili Sil"><Trash size={16}/></button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AdminUserManager;
