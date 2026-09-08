import React, { useState, useCallback, useMemo } from 'react';
import { Box, Pencil, Trash, Upload, Save, Plus, RefreshCcw } from 'lucide-react';
import ConfirmationModal from '../common/ConfirmationModal';
import CollapsibleSection from '../common/CollapsibleSection';
import { naturalSort } from '../../utils/helpers';
import { useCategories } from '../../hooks/useCategories';

const PaginatedProductGrid = React.memo(({ items, editingId, startEditing, onDeleteClick }) => {
    const [displayCount, setDisplayCount] = useState(12);
    const visibleItems = useMemo(() => items.slice(0, displayCount), [items, displayCount]);

    return (
        <div>
            <div className="p-2 flex flex-wrap -mx-1">
                {visibleItems.map(product => (
                    <div key={product.id} className="w-1/3 md:w-1/4 lg:w-1/6 p-1 relative box-border">
                        <div className={`group relative bg-white dark:bg-ink-900 border rounded-xl p-2 hover:shadow-lift transition-all ${editingId === product.id ? 'ring-2 ring-gold-400 border-gold-300' : 'border-stone-200 dark:border-ink-700'}`}>
                            <div className="aspect-square bg-stone-100 dark:bg-ink-800 rounded-lg mb-2 overflow-hidden relative">
                                <img src={product.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" alt={product.code} />
                            </div>
                            <div className="font-bold text-xs truncate text-ink-900 dark:text-ink-100">{product.code}</div>
                            <div className="text-[10px] text-ink-500 dark:text-ink-400 font-bold">{product.gram} gr</div>

                            <button onClick={() => startEditing(product)} className="absolute top-1 right-8 bg-blue-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-blue-600" title="Düzenle"><Pencil size={12}/></button>
                            <button onClick={() => onDeleteClick(product.id)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600" title="Sil"><Trash size={12}/></button>
                        </div>
                    </div>
                ))}
            </div>
            {items.length > displayCount && (
                <div className="flex justify-center mt-2 pb-2 gap-2">
                    <button onClick={() => setDisplayCount(prev => prev + 12)} className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-4 py-2 rounded-full hover:bg-blue-100 transition-colors">Daha Fazla Göster ({items.length - displayCount} kalan)</button>
                    <button onClick={() => setDisplayCount(items.length)} className="text-xs font-bold text-purple-600 hover:text-purple-800 bg-purple-50 px-4 py-2 rounded-full hover:bg-purple-100 transition-colors">Hepsini Göster</button>
                </div>
            )}
        </div>
    );
});

const AdminProductManager = ({ products, editingId, startEditing, cancelEditing, handleDeleteProduct, handleAddProduct, newProduct, setNewProduct, dragActive, handleDrag, handleDrop, isLoading, logoUrl }) => {
    const { categories: CATEGORIES, subcategories: SUBCATEGORIES } = useCategories();
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, productId: null });

    const openDeleteModal = useCallback((id) => {
        setDeleteConfirmation({ isOpen: true, productId: id });
    }, []);

    const executeDelete = useCallback(() => {
        if (deleteConfirmation.productId) {
            handleDeleteProduct(deleteConfirmation.productId);
            setDeleteConfirmation({ isOpen: false, productId: null });
        }
    }, [deleteConfirmation.productId, handleDeleteProduct]);

    const groupedProducts = useMemo(() => {
        const grouped = {};
        const sortedProducts = [...products].sort(naturalSort);

        sortedProducts.forEach(p => {
            let cat = p.category;
            if (!CATEGORIES.includes(cat)) cat = 'Diğer';
            if (!grouped[cat]) grouped[cat] = {};

            let sub = p.subcategory || 'Genel';
            const validSubs = SUBCATEGORIES[cat] || [];
            const matchedSub = validSubs.find(s => s.toUpperCase() === sub.toUpperCase());
            sub = matchedSub || sub.toUpperCase();

            if (!grouped[cat][sub]) grouped[cat][sub] = [];
            grouped[cat][sub].push(p);
        });
        return grouped;
    }, [products, CATEGORIES, SUBCATEGORIES]);

    return (
        <div className="space-y-6 animate-slide-up">
            <ConfirmationModal
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ isOpen: false, productId: null })}
                onConfirm={executeDelete}
                title="Ürünü Sil"
                message="Bu ürünü silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
            />

            <div className="card p-4 flex flex-col md:flex-row justify-between items-center mb-2 gap-4">
                <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-100 flex items-center gap-2"><Box className="text-gold-500"/> Ürün Yönetimi</h2>
                <div className="text-right w-full md:w-auto"><div className="text-xs font-bold text-ink-400 dark:text-ink-500 uppercase tracking-wide">Toplam Ürün</div><div className="text-2xl font-bold text-ink-900 dark:text-ink-100">{products.length} <span className="text-sm font-semibold text-ink-400 dark:text-ink-500">Adet</span></div></div>
            </div>

            <div className={`card p-6 ${editingId ? 'border-blue-200 ring-2 ring-blue-100' : ''}`}>
                {editingId && <div className="mb-4 text-sm font-bold text-blue-600 flex items-center gap-2"><Pencil size={16}/> Şu an bir ürünü düzenliyorsunuz</div>}
                <form onSubmit={handleAddProduct} className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[120px]"><label className="field-label">Ürün Kodu</label><input required className="field" value={newProduct.code} onChange={e => setNewProduct(Object.assign({}, newProduct, { code: e.target.value }))} placeholder="Örn: SMG/01" /></div>
                        <div className="flex-1 min-w-[100px]"><label className="field-label">Gram</label><input required className="field" value={newProduct.gram} onChange={e => setNewProduct(Object.assign({}, newProduct, { gram: e.target.value }))} placeholder="0.00" /></div>
                        <div className="flex-1 min-w-[150px]"><label className="field-label">Kategori</label><select className="field" value={newProduct.category} onChange={e => { const cat = e.target.value; const firstSub = (SUBCATEGORIES[cat] && SUBCATEGORIES[cat].length > 0) ? SUBCATEGORIES[cat][0] : 'Genel'; setNewProduct(Object.assign({}, newProduct, { category: cat, subcategory: firstSub })); }}>{CATEGORIES.filter(c=>c!=='Anasayfa').map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                        <div className="flex-1 min-w-[150px]"><label className="field-label">Alt Kategori</label><select className="field" value={newProduct.subcategory} onChange={e => setNewProduct(Object.assign({}, newProduct, { subcategory: e.target.value }))}>{SUBCATEGORIES[newProduct.category]?.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                    </div>
                    <div className={`relative w-full h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden group ${dragActive ? 'border-gold-500 bg-gold-50 dark:bg-gold-950/20 scale-[1.01]' : 'border-stone-300 dark:border-ink-600 hover:border-gold-400 hover:bg-stone-50 dark:hover:bg-ink-800'}`} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop} onClick={() => document.getElementById('product-file-upload').click()}>
                        <input id="product-file-upload" type="file" accept="image/png, image/jpeg, image/jpg" className="hidden" onChange={(e) => setNewProduct(Object.assign({}, newProduct, { imageFile: e.target.files[0] }))} />
                        {newProduct.imageFile || (editingId && newProduct.imageUrl && newProduct.imageUrl !== logoUrl) ? (<div className="relative w-full h-full flex items-center justify-center"><img src={newProduct.imageFile ? URL.createObjectURL(newProduct.imageFile) : newProduct.imageUrl} className="h-full object-contain" alt="Ürün önizleme" /><div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-white font-bold text-sm">Görseli Değiştir</span></div></div>) : (<div className="text-center p-4"><Upload className={`mx-auto mb-2 ${dragActive ? 'text-gold-600' : 'text-ink-300 dark:text-ink-500'}`} size={32}/><p className="text-sm font-bold text-ink-500 dark:text-ink-400">Fotoğrafı buraya sürükleyin</p></div>)}
                    </div>
                    <div className="flex gap-2">
                        {editingId && <button type="button" onClick={cancelEditing} className="btn-secondary flex-1">Vazgeç</button>}
                        <button disabled={isLoading} type="submit" className={`flex-[2] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-soft ${editingId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-ink-900 hover:bg-ink-800'}`}>{isLoading ? <RefreshCcw className="animate-spin" size={20}/> : <>{editingId ? <Save size={20}/> : <Plus size={20}/>} {editingId ? 'Güncelle' : 'Ürünü Kaydet'}</>}</button>
                    </div>
                </form>
            </div>

            <div className="space-y-4">
                {Object.entries(groupedProducts).sort(([catA], [catB]) => CATEGORIES.indexOf(catA) - CATEGORIES.indexOf(catB)).map(([category, subcategories]) => (
                    <CollapsibleSection key={category} title={category} count={Object.values(subcategories).reduce((acc, curr) => acc + curr.length, 0)} level={0}>
                        <div className="space-y-2 mt-2">
                            {Object.entries(subcategories).sort(([subA], [subB]) => subA.localeCompare(subB, undefined, { numeric: true, sensitivity: 'base' })).map(([subcategory, items]) => (
                                <CollapsibleSection key={subcategory} title={subcategory} count={items.length} level={1}>
                                    <PaginatedProductGrid items={items} editingId={editingId} startEditing={startEditing} onDeleteClick={openDeleteModal} />
                                </CollapsibleSection>
                            ))}
                        </div>
                    </CollapsibleSection>
                ))}
            </div>
        </div>
    );
};

export default AdminProductManager;
