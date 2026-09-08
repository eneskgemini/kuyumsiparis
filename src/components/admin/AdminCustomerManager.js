import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Plus, Trash, Pencil, Check, X, User } from 'lucide-react';
import { db } from '../../config/firebase';
import { appId } from '../../utils/constants';
import ConfirmationModal from '../common/ConfirmationModal';

// Firma adının ilk kelimesinden otomatik bir kod önerir (ör. "Koçak
// Kuyumculuk" -> "KOÇAK"). Kullanıcı bu öneriyi istediği gibi değiştirebilir.
const suggestCode = (name) => {
    const first = (name || '').trim().split(/\s+/)[0] || '';
    return first.toUpperCase().replace(/[^A-ZÇĞİÖŞÜ0-9]/g, '');
};

// Bu listedeki her müşteri, sipariş oluştururken firma adı alanına yazılınca
// otomatik tamamlama ile önerilir ve seçildiğinde "KOD-XXX" biçiminde
// otomatik sipariş numarası üretilir (bkz. App.js handleCheckout). orderCount
// her yeni siparişte otomatik artar, buradan elle değiştirilmez.
const AdminCustomerManager = ({ setNotification }) => {
    const [customers, setCustomers] = useState([]);
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [codeTouched, setCodeTouched] = useState(false);
    const [editing, setEditing] = useState(null); // { id, name, code }
    const [deleteTarget, setDeleteTarget] = useState(null);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'customers'), (snap) => {
            setCustomers(snap.docs.map(d => Object.assign({ id: d.id }, d.data())));
        }, (err) => console.error('[Müşteriler] Okunamadı:', err));
        return () => unsub();
    }, []);

    const sortedCustomers = useMemo(() => [...customers].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr')), [customers]);

    useEffect(() => { if (!codeTouched) setCode(suggestCode(name)); }, [name, codeTouched]);

    const codeExists = (c, excludeId) => customers.some(cust => cust.id !== excludeId && (cust.code || '').toUpperCase() === c.toUpperCase());

    const handleAdd = async () => {
        const trimmedName = name.trim();
        const trimmedCode = code.trim().toUpperCase();
        if (!trimmedName || !trimmedCode) { setNotification({ type: 'error', message: 'Firma adı ve kod zorunlu' }); return; }
        if (codeExists(trimmedCode, null)) { setNotification({ type: 'error', message: 'Bu kod zaten kullanılıyor' }); return; }
        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'customers'), {
                name: trimmedName, nameLower: trimmedName.toLowerCase(), code: trimmedCode, orderCount: 0, createdAt: serverTimestamp(),
            });
            setName(''); setCode(''); setCodeTouched(false);
            setNotification({ type: 'success', message: 'Müşteri eklendi' });
        } catch (e) { setNotification({ type: 'error', message: 'Eklenemedi: ' + e.message }); }
    };

    const startEdit = (c) => setEditing({ id: c.id, name: c.name, code: c.code });
    const cancelEdit = () => setEditing(null);
    const saveEdit = async () => {
        if (!editing) return;
        const trimmedName = editing.name.trim();
        const trimmedCode = editing.code.trim().toUpperCase();
        if (!trimmedName || !trimmedCode) { setNotification({ type: 'error', message: 'Firma adı ve kod zorunlu' }); return; }
        if (codeExists(trimmedCode, editing.id)) { setNotification({ type: 'error', message: 'Bu kod zaten kullanılıyor' }); return; }
        try {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', editing.id), {
                name: trimmedName, nameLower: trimmedName.toLowerCase(), code: trimmedCode,
            });
            setEditing(null);
            setNotification({ type: 'success', message: 'Müşteri güncellendi' });
        } catch (e) { setNotification({ type: 'error', message: 'Güncellenemedi: ' + e.message }); }
    };

    const executeDelete = async () => {
        if (!deleteTarget) return;
        const target = deleteTarget;
        setDeleteTarget(null);
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', target.id));
            setNotification({ type: 'success', message: 'Müşteri silindi' });
        } catch (e) { setNotification({ type: 'error', message: 'Silinemedi: ' + e.message }); }
    };

    return (
        <div className="card overflow-hidden">
            <ConfirmationModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={executeDelete}
                title="Müşteriyi Sil"
                message="Bu müşteriyi silmek istediğinize emin misiniz? Geçmiş siparişleri etkilenmez; sadece sipariş oluştururken otomatik tamamlama ve numaralandırmadan kalkar."
            />

            <div className="p-4 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                    <input type="text" placeholder="Firma adı" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }} className="field flex-1" />
                    <input type="text" placeholder="Kod (ör. KOCAK)" value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setCodeTouched(true); }} onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }} className="field sm:w-32" />
                    <button onClick={handleAdd} className="btn-secondary !px-4 shrink-0"><Plus size={16}/> Ekle</button>
                </div>

                <div className="divide-y divide-stone-100 dark:divide-ink-800 border-t border-stone-100 dark:border-ink-800">
                    {sortedCustomers.length === 0 && <div className="py-8 text-center text-sm text-ink-400 dark:text-ink-500 italic">Henüz kayıtlı müşteri yok.</div>}
                    {sortedCustomers.map(c => {
                        const isEditing = !!(editing && editing.id === c.id);
                        return (
                            <div key={c.id} className="py-2.5 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-ink-800 flex items-center justify-center shrink-0"><User size={14} className="text-ink-400"/></div>
                                {isEditing ? (
                                    <div className="flex-1 flex flex-col sm:flex-row gap-2">
                                        <input autoFocus value={editing.name} onChange={(e) => setEditing(Object.assign({}, editing, { name: e.target.value }))} className="field !py-1.5 text-sm flex-1" />
                                        <input value={editing.code} onChange={(e) => setEditing(Object.assign({}, editing, { code: e.target.value.toUpperCase() }))} className="field !py-1.5 text-sm sm:w-28" />
                                    </div>
                                ) : (
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-sm text-ink-900 dark:text-ink-100 truncate">{c.name}</div>
                                        <div className="text-xs text-ink-400 dark:text-ink-500">Kod: {c.code} · {c.orderCount || 0} sipariş</div>
                                    </div>
                                )}
                                <div className="flex items-center gap-1 shrink-0">
                                    {isEditing ? (
                                        <>
                                            <button onClick={saveEdit} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors" title="Kaydet"><Check size={14}/></button>
                                            <button onClick={cancelEdit} className="p-1.5 text-ink-400 hover:bg-stone-100 dark:hover:bg-ink-800 rounded-lg transition-colors" title="Vazgeç"><X size={14}/></button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => startEdit(c)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors" title="Düzenle"><Pencil size={14}/></button>
                                            <button onClick={() => setDeleteTarget(c)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors" title="Sil"><Trash size={14}/></button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AdminCustomerManager;
