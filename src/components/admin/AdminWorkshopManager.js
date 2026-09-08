import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Hammer, Plus, Trash, X, Check, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { db } from '../../config/firebase';
import { parseGram } from '../../utils/helpers';
import ConfirmationModal from '../common/ConfirmationModal';

// Atölyeye çıkan mal/ürünleri takip etmek için: her "liste" atölyeye
// gönderilen bir grup kalemi (açıklama + gram) temsil eder. Liste "Atölyede"
// (açık) durumdayken toplam gramı Özet sayfasındaki Atölye Durumu kutusuna
// yansır; "Atölyeden Geri Geldi" ile kapatılınca o hesaba dahil edilmez ama
// kayıt olarak (geçmiş) saklanmaya devam eder.
const AdminWorkshopManager = ({ appId, setNotification }) => {
    const [lists, setLists] = useState([]);
    const [expandedId, setExpandedId] = useState(null);
    const [newListTitle, setNewListTitle] = useState('');
    const [itemDrafts, setItemDrafts] = useState({});
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, listId: null });

    useEffect(() => {
        const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'workshop_lists'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            setLists(snap.docs.map(d => Object.assign({ id: d.id }, d.data())));
        });
        return () => unsub();
    }, [appId]);

    const openLists = useMemo(() => lists.filter(l => l.status !== 'closed'), [lists]);
    const closedLists = useMemo(() => lists.filter(l => l.status === 'closed'), [lists]);

    const listGram = (list) => (list.items || []).reduce((acc, i) => acc + parseGram(i.gram), 0);

    const handleCreateList = async () => {
        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'workshop_lists'), {
                title: newListTitle.trim() || `Liste ${lists.length + 1}`,
                status: 'open',
                items: [],
                createdAt: serverTimestamp(),
            });
            setNewListTitle('');
            setNotification({ type: 'success', message: 'Liste oluşturuldu' });
        } catch (e) {
            setNotification({ type: 'error', message: 'Liste oluşturulamadı: ' + e.message });
        }
    };

    const handleAddItem = async (list) => {
        const draft = itemDrafts[list.id];
        const gram = draft ? parseGram(draft.gram) : 0;
        if (!draft || !draft.description || !draft.description.trim() || !gram) return;
        try {
            const newItems = [...(list.items || []), { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), description: draft.description.trim(), gram }];
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'workshop_lists', list.id), { items: newItems });
            setItemDrafts(prev => Object.assign({}, prev, { [list.id]: { description: '', gram: '' } }));
        } catch (e) {
            setNotification({ type: 'error', message: 'Kalem eklenemedi: ' + e.message });
        }
    };

    const handleRemoveItem = async (list, itemId) => {
        try {
            const newItems = (list.items || []).filter(i => i.id !== itemId);
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'workshop_lists', list.id), { items: newItems });
        } catch (e) {
            setNotification({ type: 'error', message: 'Kalem silinemedi: ' + e.message });
        }
    };

    const toggleListStatus = async (list) => {
        try {
            const nextStatus = list.status === 'closed' ? 'open' : 'closed';
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'workshop_lists', list.id), {
                status: nextStatus,
                closedAt: nextStatus === 'closed' ? serverTimestamp() : null,
            });
            setNotification({ type: 'success', message: nextStatus === 'closed' ? 'Liste kapatıldı (atölyeden döndü)' : 'Liste yeniden açıldı' });
        } catch (e) {
            setNotification({ type: 'error', message: 'İşlem başarısız: ' + e.message });
        }
    };

    const openDeleteModal = (listId) => setDeleteConfirmation({ isOpen: true, listId });
    const executeDelete = async () => {
        const { listId } = deleteConfirmation;
        setDeleteConfirmation({ isOpen: false, listId: null });
        if (!listId) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'workshop_lists', listId));
            setNotification({ type: 'success', message: 'Liste silindi' });
        } catch (e) {
            setNotification({ type: 'error', message: 'Silme hatası' });
        }
    };

    const renderList = (list) => {
        const isExpanded = expandedId === list.id;
        const gram = listGram(list);
        const draft = itemDrafts[list.id] || { description: '', gram: '' };
        const isClosed = list.status === 'closed';

        return (
            <div key={list.id} className="card overflow-hidden">
                <button onClick={() => setExpandedId(isExpanded ? null : list.id)} className="w-full flex items-center justify-between p-4 hover:bg-stone-50 dark:hover:bg-ink-800 transition-colors text-left">
                    <div className="flex items-center gap-3 min-w-0">
                        {isExpanded ? <ChevronDown size={16} className="text-ink-400 shrink-0"/> : <ChevronRight size={16} className="text-ink-400 shrink-0"/>}
                        <span className="font-bold text-ink-900 dark:text-ink-100 text-sm truncate">{list.title}</span>
                        <span className={`badge shrink-0 ${isClosed ? 'bg-stone-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'}`}>{isClosed ? 'Kapalı' : 'Atölyede'}</span>
                        <span className="text-xs text-ink-400 dark:text-ink-500 shrink-0">({(list.items || []).length} kalem)</span>
                    </div>
                    <div className="font-bold text-gold-700 dark:text-gold-400 text-sm shrink-0 ml-3">{gram.toFixed(2)} gr</div>
                </button>

                {isExpanded && (
                    <div className="p-4 pt-0 animate-slide-down">
                        <div className="bg-stone-50 dark:bg-ink-800 rounded-xl border border-stone-100 dark:border-ink-800 divide-y divide-stone-200 dark:divide-ink-700 mb-3">
                            {(list.items || []).length === 0 && <div className="p-3 text-xs text-ink-400 dark:text-ink-500 text-center italic">Henüz kalem eklenmedi.</div>}
                            {(list.items || []).map(item => (
                                <div key={item.id} className="flex items-center justify-between px-3 py-2 text-sm gap-2">
                                    <span className="text-ink-700 dark:text-ink-200 truncate">{item.description}</span>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="font-bold text-ink-900 dark:text-ink-100">{parseGram(item.gram).toFixed(2)} gr</span>
                                        {!isClosed && <button onClick={() => handleRemoveItem(list, item.id)} className="text-red-400 hover:text-red-600 transition-colors" title="Kalemi Sil"><X size={14}/></button>}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {!isClosed && (
                            <div className="flex flex-col sm:flex-row gap-2 mb-3">
                                <input type="text" placeholder="Açıklama (ör. Bilezik tamiri)" value={draft.description} onChange={(e) => setItemDrafts(prev => Object.assign({}, prev, { [list.id]: Object.assign({}, draft, { description: e.target.value }) }))} onKeyDown={(e) => { if (e.key === 'Enter') handleAddItem(list); }} className="field !py-2 flex-1" />
                                <input type="text" placeholder="Gram" value={draft.gram} onChange={(e) => setItemDrafts(prev => Object.assign({}, prev, { [list.id]: Object.assign({}, draft, { gram: e.target.value }) }))} onKeyDown={(e) => { if (e.key === 'Enter') handleAddItem(list); }} className="field !py-2 sm:w-24" />
                                <button onClick={() => handleAddItem(list)} className="btn-secondary !px-3 justify-center"><Plus size={16}/></button>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button onClick={() => toggleListStatus(list)} className={`btn-sm flex-1 ${isClosed ? 'btn-secondary' : 'btn-primary'}`}>
                                {isClosed ? <><RotateCcw size={14}/> Yeniden Aç</> : <><Check size={14}/> Atölyeden Geri Geldi</>}
                            </button>
                            <button onClick={() => openDeleteModal(list.id)} className="bg-red-50 dark:bg-red-950/30 text-red-600 hover:bg-red-100 dark:hover:bg-red-950/50 rounded-xl px-4 flex items-center justify-center transition-colors" title="Listeyi Sil"><Trash size={14}/></button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-slide-up pb-10">
            <ConfirmationModal
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ isOpen: false, listId: null })}
                onConfirm={executeDelete}
                title="Listeyi Sil"
                message="Bu listeyi ve içindeki tüm kalemleri kalıcı olarak silmek istediğinize emin misiniz?"
            />

            <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-100 flex items-center gap-2"><Hammer className="text-gold-500"/> Atölye Listeleri</h2>

            <div className="card p-4 flex flex-col sm:flex-row gap-2">
                <input type="text" placeholder="Yeni liste adı (boş bırakılırsa otomatik isimlenir)" value={newListTitle} onChange={(e) => setNewListTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleCreateList(); }} className="field flex-1" />
                <button onClick={handleCreateList} className="btn-primary justify-center"><Plus size={16}/> Yeni Liste</button>
            </div>

            <div className="space-y-3">
                <h3 className="text-sm font-bold text-ink-400 dark:text-ink-500 uppercase tracking-wide px-1">Atölyede ({openLists.length})</h3>
                {openLists.length === 0 && <div className="text-center py-8 text-ink-400 dark:text-ink-500 bg-stone-50 dark:bg-ink-800 rounded-xl border border-dashed border-stone-300 dark:border-ink-600 text-sm">Şu an atölyede açık liste yok.</div>}
                {openLists.map(renderList)}
            </div>

            {closedLists.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-ink-400 dark:text-ink-500 uppercase tracking-wide px-1">Kapalı Listeler ({closedLists.length})</h3>
                    {closedLists.map(renderList)}
                </div>
            )}
        </div>
    );
};

export default AdminWorkshopManager;
