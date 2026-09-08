import React, { useState } from 'react';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { Plus, Trash, Pencil, Check, X, ChevronDown, ChevronRight, Lock } from 'lucide-react';
import { db } from '../../config/firebase';
import { appId } from '../../utils/constants';
import { useCategories } from '../../hooks/useCategories';
import ConfirmationModal from '../common/ConfirmationModal';

// "Anasayfa" gerçek bir ürün kategorisi değil; mağaza tarafındaki ana filtre
// sekmesi olarak kod içinde özel anlamı var, bu yüzden silinemez/adı
// değiştirilemez.
const LOCKED_CATEGORY = 'Anasayfa';

const AdminCategoryManager = ({ setNotification }) => {
    const { categories, subcategories } = useCategories();
    const [expanded, setExpanded] = useState(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newSubDrafts, setNewSubDrafts] = useState({});
    const [editingCategory, setEditingCategory] = useState(null); // { original, value }
    const [editingSub, setEditingSub] = useState(null); // { category, original, value }
    const [deleteTarget, setDeleteTarget] = useState(null); // { type, category, subcategory? }
    const [busy, setBusy] = useState(false);

    const saveCategories = async (nextCategories, nextSubcategories) => {
        try {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'categories'), {
                categories: nextCategories,
                subcategories: nextSubcategories,
                updatedAt: serverTimestamp(),
            }, { merge: true });
        } catch (e) {
            setNotification({ type: 'error', message: 'Kaydedilemedi: ' + e.message });
        }
    };

    // Bir kategori/alt kategori yeniden adlandırıldığında, o değeri kullanan
    // mevcut ürün ve katalog fotoğraflarını da günceller (aksi halde eski
    // isimle kayıtlı ürünler "Diğer" kovasına düşer).
    const cascadeRename = async (field1, value1, field2, value2, updateFields) => {
        let count = 0;
        for (const col of ['products', 'catalogue_images']) {
            const clauses = field2 ? [where(field1, '==', value1), where(field2, '==', value2)] : [where(field1, '==', value1)];
            const qRef = query(collection(db, 'artifacts', appId, 'public', 'data', col), ...clauses);
            const snap = await getDocs(qRef);
            if (!snap.empty) {
                const batch = writeBatch(db);
                snap.docs.forEach(d => batch.update(d.ref, updateFields));
                await batch.commit();
                count += snap.size;
            }
        }
        return count;
    };

    // --- Kategori işlemleri ---
    const handleAddCategory = async () => {
        const name = newCategoryName.trim();
        if (!name) return;
        if (categories.some(c => c.toLowerCase() === name.toLowerCase())) { setNotification({ type: 'error', message: 'Bu kategori zaten var' }); return; }
        await saveCategories([...categories, name], Object.assign({}, subcategories, { [name]: [] }));
        setNewCategoryName('');
        setNotification({ type: 'success', message: 'Kategori eklendi' });
    };

    const startEditCategory = (name) => setEditingCategory({ original: name, value: name });
    const cancelEditCategory = () => setEditingCategory(null);
    const saveEditCategory = async () => {
        if (!editingCategory) return;
        const { original, value } = editingCategory;
        const trimmed = value.trim();
        if (!trimmed || trimmed === original) { setEditingCategory(null); return; }
        if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase() && c !== original)) { setNotification({ type: 'error', message: 'Bu isimde bir kategori zaten var' }); return; }
        setBusy(true);
        try {
            const nextCategories = categories.map(c => c === original ? trimmed : c);
            const nextSubcategories = Object.assign({}, subcategories);
            nextSubcategories[trimmed] = nextSubcategories[original] || [];
            delete nextSubcategories[original];
            const updatedCount = await cascadeRename('category', original, null, null, { category: trimmed });
            await saveCategories(nextCategories, nextSubcategories);
            setNotification({ type: 'success', message: `Kategori güncellendi${updatedCount ? ` (${updatedCount} kayıt)` : ''}` });
            setEditingCategory(null);
        } catch (e) {
            setNotification({ type: 'error', message: 'Güncellenemedi: ' + e.message });
        } finally {
            setBusy(false);
        }
    };

    const executeDeleteCategory = async (name) => {
        const nextCategories = categories.filter(c => c !== name);
        const nextSubcategories = Object.assign({}, subcategories);
        delete nextSubcategories[name];
        await saveCategories(nextCategories, nextSubcategories);
        setNotification({ type: 'success', message: 'Kategori silindi' });
    };

    // --- Alt kategori işlemleri ---
    const handleAddSub = async (category) => {
        const draft = (newSubDrafts[category] || '').trim();
        if (!draft) return;
        const existing = subcategories[category] || [];
        if (existing.some(s => s.toLowerCase() === draft.toLowerCase())) { setNotification({ type: 'error', message: 'Bu alt kategori zaten var' }); return; }
        await saveCategories(categories, Object.assign({}, subcategories, { [category]: [...existing, draft] }));
        setNewSubDrafts(prev => Object.assign({}, prev, { [category]: '' }));
        setNotification({ type: 'success', message: 'Alt kategori eklendi' });
    };

    const startEditSub = (category, sub) => setEditingSub({ category, original: sub, value: sub });
    const cancelEditSub = () => setEditingSub(null);
    const saveEditSub = async () => {
        if (!editingSub) return;
        const { category, original, value } = editingSub;
        const trimmed = value.trim();
        if (!trimmed || trimmed === original) { setEditingSub(null); return; }
        const existing = subcategories[category] || [];
        if (existing.some(s => s.toLowerCase() === trimmed.toLowerCase() && s !== original)) { setNotification({ type: 'error', message: 'Bu isimde bir alt kategori zaten var' }); return; }
        setBusy(true);
        try {
            const nextSubList = existing.map(s => s === original ? trimmed : s);
            const updatedCount = await cascadeRename('category', category, 'subcategory', original, { subcategory: trimmed });
            await saveCategories(categories, Object.assign({}, subcategories, { [category]: nextSubList }));
            setNotification({ type: 'success', message: `Alt kategori güncellendi${updatedCount ? ` (${updatedCount} kayıt)` : ''}` });
            setEditingSub(null);
        } catch (e) {
            setNotification({ type: 'error', message: 'Güncellenemedi: ' + e.message });
        } finally {
            setBusy(false);
        }
    };

    const executeDeleteSub = async (category, sub) => {
        const nextSubList = (subcategories[category] || []).filter(s => s !== sub);
        await saveCategories(categories, Object.assign({}, subcategories, { [category]: nextSubList }));
        setNotification({ type: 'success', message: 'Alt kategori silindi' });
    };

    const openDeleteModal = (target) => setDeleteTarget(target);
    const executeDelete = async () => {
        if (!deleteTarget) return;
        const target = deleteTarget;
        setDeleteTarget(null);
        if (target.type === 'category') await executeDeleteCategory(target.category);
        else await executeDeleteSub(target.category, target.subcategory);
    };

    return (
        <div className="card overflow-hidden">
            <ConfirmationModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={executeDelete}
                title={deleteTarget && deleteTarget.type === 'category' ? 'Kategoriyi Sil' : 'Alt Kategoriyi Sil'}
                message={deleteTarget && deleteTarget.type === 'category' ? 'Bu kategoriyi silmek istediğinize emin misiniz? Bu kategoriye ait mevcut ürünler "Diğer" altında görünmeye devam eder.' : 'Bu alt kategoriyi silmek istediğinize emin misiniz?'}
            />

            <div className="p-4 space-y-3">
                <div className="flex gap-2">
                    <input type="text" placeholder="Yeni kategori adı" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }} className="field flex-1" />
                    <button onClick={handleAddCategory} className="btn-secondary !px-4 shrink-0"><Plus size={16}/> Kategori Ekle</button>
                </div>

                <div className="space-y-2">
                    {categories.map(cat => {
                        const isLocked = cat === LOCKED_CATEGORY;
                        const isOpen = expanded === cat;
                        const subs = subcategories[cat] || [];
                        const isEditingThis = !!(editingCategory && editingCategory.original === cat);
                        return (
                            <div key={cat} className="bg-white dark:bg-ink-900 rounded-xl border border-stone-200 dark:border-ink-700 overflow-hidden">
                                <div className="w-full flex items-center justify-between p-3 gap-2">
                                    <button onClick={() => setExpanded(isOpen ? null : cat)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                                        {isOpen ? <ChevronDown size={15} className="text-ink-400 shrink-0"/> : <ChevronRight size={15} className="text-ink-400 shrink-0"/>}
                                        {isEditingThis ? (
                                            <input autoFocus value={editingCategory.value} onClick={(e) => e.stopPropagation()} onChange={(e) => setEditingCategory({ original: cat, value: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') saveEditCategory(); if (e.key === 'Escape') cancelEditCategory(); }} className="field !py-1 !px-2 text-sm" />
                                        ) : (
                                            <span className="font-bold text-sm text-ink-800 dark:text-ink-100 truncate">{cat}</span>
                                        )}
                                        {isLocked && <Lock size={12} className="text-ink-300 dark:text-ink-600 shrink-0" />}
                                        <span className="text-[11px] bg-stone-100 dark:bg-ink-800 text-ink-500 dark:text-ink-400 font-bold px-2 py-0.5 rounded-full border border-stone-200 dark:border-ink-700 shrink-0">{subs.length}</span>
                                    </button>
                                    {!isLocked && (
                                        <div className="flex items-center gap-1 shrink-0">
                                            {isEditingThis ? (
                                                <>
                                                    <button disabled={busy} onClick={saveEditCategory} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors" title="Kaydet"><Check size={14}/></button>
                                                    <button disabled={busy} onClick={cancelEditCategory} className="p-1.5 text-ink-400 hover:bg-stone-100 dark:hover:bg-ink-800 rounded-lg transition-colors" title="Vazgeç"><X size={14}/></button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => startEditCategory(cat)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors" title="Yeniden Adlandır"><Pencil size={14}/></button>
                                                    <button onClick={() => openDeleteModal({ type: 'category', category: cat })} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors" title="Sil"><Trash size={14}/></button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {isOpen && (
                                    <div className="px-3 pb-3 pt-1 border-t border-stone-100 dark:border-ink-800 animate-slide-down">
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {subs.length === 0 && <span className="text-xs text-ink-400 dark:text-ink-500 italic py-1">Henüz alt kategori yok.</span>}
                                            {subs.map(sub => {
                                                const isEditingSubThis = !!(editingSub && editingSub.category === cat && editingSub.original === sub);
                                                return isEditingSubThis ? (
                                                    <div key={sub} className="flex items-center gap-1 bg-stone-50 dark:bg-ink-800 border border-stone-200 dark:border-ink-700 rounded-lg px-2 py-1">
                                                        <input autoFocus value={editingSub.value} onChange={(e) => setEditingSub({ category: cat, original: sub, value: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') saveEditSub(); if (e.key === 'Escape') cancelEditSub(); }} className="bg-transparent text-xs font-bold w-20 outline-none text-ink-800 dark:text-ink-100" />
                                                        <button disabled={busy} onClick={saveEditSub} className="text-emerald-600 hover:text-emerald-700"><Check size={12}/></button>
                                                        <button disabled={busy} onClick={cancelEditSub} className="text-ink-400 hover:text-ink-600"><X size={12}/></button>
                                                    </div>
                                                ) : (
                                                    <div key={sub} className="chip">
                                                        <span>{sub}</span>
                                                        <button onClick={() => startEditSub(cat, sub)} className="text-blue-400 hover:text-blue-600 transition-colors" title="Yeniden Adlandır"><Pencil size={11}/></button>
                                                        <button onClick={() => openDeleteModal({ type: 'subcategory', category: cat, subcategory: sub })} className="text-red-400 hover:text-red-600 transition-colors" title="Sil"><Trash size={11}/></button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="flex gap-2">
                                            <input type="text" placeholder="Yeni alt kategori kodu (ör. AS-B)" value={newSubDrafts[cat] || ''} onChange={(e) => setNewSubDrafts(prev => Object.assign({}, prev, { [cat]: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') handleAddSub(cat); }} className="field !py-1.5 text-xs flex-1" />
                                            <button onClick={() => handleAddSub(cat)} className="btn-secondary !py-1.5 !px-3 text-xs shrink-0"><Plus size={13}/> Ekle</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AdminCategoryManager;
