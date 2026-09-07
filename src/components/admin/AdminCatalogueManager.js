import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Upload, X, Trash, Loader2, Check, Image as ImageIcon } from 'lucide-react';
import { db } from '../../config/firebase';
import { CATEGORIES, SUBCATEGORIES } from '../../utils/constants';
import { uploadImageToStorage } from '../../utils/helpers';
import CollapsibleSection from '../common/CollapsibleSection';

const AdminCatalogueManager = ({ appId, setNotification }) => {
    const [images, setImages] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState("Yüzük");
    const [selectedSubCategory, setSelectedSubCategory] = useState("AS-B");
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    useEffect(() => {
        let q = query(collection(db, 'artifacts', appId, 'public', 'data', 'catalogue_images'), orderBy('createdAt', 'asc'));
        const unsub = onSnapshot(q, (snap) => {
            const fetchedImages = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
            setImages(fetchedImages);
        });
        return () => unsub();
    }, [appId]);

    const groupedImages = useMemo(() => {
        const grouped = {};
        images.forEach(img => {
            let cat = img.category || 'Diğer';
            if (!CATEGORIES.includes(cat)) cat = 'Diğer';
            if (!grouped[cat]) grouped[cat] = {};

            let sub = img.subcategory || 'Genel';
            const validSubs = SUBCATEGORIES[cat] || [];
            const matchedSub = validSubs.find(s => s.toUpperCase() === sub.toUpperCase());
            sub = matchedSub || sub.toUpperCase();

            if (!grouped[cat][sub]) grouped[cat][sub] = [];
            grouped[cat][sub].push(img);
        });
        return grouped;
    }, [images]);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (file) => {
        if (!file) return;
        if(file.size > 15 * 1024 * 1024) {
            setNotification({ type: 'error', message: 'Dosya boyutu çok yüksek (Max 15MB)' });
            return;
        }
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const executeUpload = async () => {
        if (!selectedFile) return;
        setUploading(true);
        try {
            // Katalog fotoğrafları da artık Firebase Storage'a yükleniyor (base64 yerine);
            // bu, katalog listesinin ilk açılışını hızlandırıyor.
            const { url } = await uploadImageToStorage(selectedFile, 'catalogue');

            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'catalogue_images'), {
                imageUrl: url,
                category: selectedCategory,
                subcategory: selectedSubCategory,
                createdAt: serverTimestamp(),
                fileName: selectedFile.name
            });

            setNotification({ type: 'success', message: 'Fotoğraf yüklendi.' });
            setSelectedFile(null);
            setPreviewUrl(null);
        } catch (error) {
            console.error("Yükleme hatası:", error);
            setNotification({ type: 'error', message: 'Yükleme hatası: ' + error.message });
        } finally {
            setUploading(false);
        }
    };

    const cancelSelection = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
    };

    const handleDelete = async (id) => {
        if(!window.confirm("Bu fotoğrafı silmek istediğinize emin misiniz?")) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'catalogue_images', id));
            setNotification({ type: 'success', message: 'Fotoğraf silindi' });
        } catch (error) {
            setNotification({ type: 'error', message: 'Silme hatası' });
        }
    };

    return (
        <div className="space-y-6 animate-slide-up">
            <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-100 flex items-center gap-2">
                <ImageIcon className="text-gold-500"/> Katalog Yönetimi (HD)
            </h2>

            <div className={`card p-6 ${selectedFile ? 'border-blue-200 ring-2 ring-blue-100' : ''}`}>
                <h3 className="text-sm font-bold text-ink-700 dark:text-ink-200 mb-4 flex items-center gap-2">
                    <Upload size={16}/> Yeni Fotoğraf Yükle
                </h3>

                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="field-label">Kategori</label>
                            <select
                                className="field"
                                value={selectedCategory}
                                onChange={(e) => {
                                    const cat = e.target.value;
                                    setSelectedCategory(cat);
                                    if(SUBCATEGORIES[cat] && SUBCATEGORIES[cat].length > 0) {
                                        setSelectedSubCategory(SUBCATEGORIES[cat][0]);
                                    } else {
                                        setSelectedSubCategory("Genel");
                                    }
                                }}
                            >
                                {CATEGORIES.filter(c => c !== "Anasayfa").map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                         </div>
                         <div>
                            <label className="field-label">Alt Kategori</label>
                            <select
                                className="field"
                                value={selectedSubCategory}
                                onChange={(e) => setSelectedSubCategory(e.target.value)}
                            >
                                {SUBCATEGORIES[selectedCategory]?.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                         </div>
                    </div>

                    <div
                        className={`relative w-full h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden group
                        ${dragActive ? 'border-gold-500 bg-gold-50 dark:bg-gold-950/20 scale-[1.01]' : 'border-stone-300 dark:border-ink-600 hover:border-gold-400 hover:bg-stone-50 dark:hover:bg-ink-800'}
                        ${selectedFile ? 'bg-stone-100 dark:bg-ink-800 border-solid border-stone-300 dark:border-ink-600' : ''}`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => !selectedFile && document.getElementById('catalogue-upload-input').click()}
                    >
                        <input id="catalogue-upload-input" type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e.target.files[0])} />

                        {selectedFile && previewUrl ? (
                            <div className="relative w-full h-full p-2 flex flex-col items-center justify-center">
                                <img src={previewUrl} className="h-32 object-contain mb-2 shadow-sm rounded bg-white dark:bg-ink-900" alt="Önizleme" />
                                <div className="text-xs font-bold text-ink-700 dark:text-ink-200 bg-white/80 px-2 py-1 rounded">{selectedFile.name}</div>
                                <button onClick={(e) => { e.stopPropagation(); cancelSelection(); }} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors shadow-md">
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="text-center p-4">
                                <Upload className={`mx-auto mb-2 ${dragActive ? 'text-gold-600' : 'text-ink-300 dark:text-ink-500'}`} size={32}/>
                                <p className="text-sm font-bold text-ink-600 dark:text-ink-300">Fotoğrafı buraya sürükleyin</p>
                                <p className="text-xs text-ink-400 dark:text-ink-500 mt-1">veya seçmek için tıklayın</p>
                            </div>
                        )}
                    </div>

                    {selectedFile && (
                        <button
                            onClick={executeUpload}
                            disabled={uploading}
                            className="btn-primary w-full !py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {uploading ? <Loader2 size={20} className="animate-spin"/> : <Check size={20}/>}
                            {uploading ? 'Yükleniyor...' : 'Onayla ve Yükle'}
                        </button>
                    )}
                </div>
            </div>

            <div className="card p-6">
                <div className="text-sm font-bold text-ink-400 dark:text-ink-500 mb-4 px-1">Yüklü Fotoğraflar</div>

                {Object.entries(groupedImages).length === 0 && (
                    <div className="text-center py-10 text-ink-400 dark:text-ink-500 bg-stone-50 dark:bg-ink-800 rounded-xl border border-dashed border-stone-300 dark:border-ink-600">
                        Henüz hiç katalog fotoğrafı yüklenmemiş.
                    </div>
                )}

                {Object.entries(groupedImages)
                    .sort(([catA], [catB]) => CATEGORIES.indexOf(catA) - CATEGORIES.indexOf(catB))
                    .map(([category, subcategories]) => (
                    <CollapsibleSection
                        key={category}
                        title={category}
                        count={Object.values(subcategories).reduce((acc, curr) => acc + curr.length, 0)}
                        level={0}
                    >
                        <div className="space-y-2 mt-2">
                            {Object.entries(subcategories)
                                .sort(([subA], [subB]) => subA.localeCompare(subB, undefined, { numeric: true, sensitivity: 'base' }))
                                .map(([subcategory, items]) => (
                                <CollapsibleSection
                                    key={subcategory}
                                    title={subcategory}
                                    count={items.length}
                                    level={1}
                                >
                                    <div className="p-2 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        {items.map(img => (
                                            <div key={img.id} className="group relative bg-stone-50 dark:bg-ink-800 rounded-xl border border-stone-200 dark:border-ink-700 p-2 hover:shadow-lift transition-all">
                                                <div className="aspect-[9/16] bg-white dark:bg-ink-900 rounded-lg overflow-hidden mb-2 relative">
                                                    <img src={img.imageUrl} className="w-full h-full object-cover" loading="lazy" alt={img.fileName || "Fotoğraf"} />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                                                </div>

                                                <div className="text-[10px] font-bold text-ink-600 dark:text-ink-300 truncate text-center" title={img.fileName || "İsimsiz"}>
                                                    {img.fileName || "İsimsiz Dosya"}
                                                </div>

                                                <button
                                                    onClick={() => handleDelete(img.id)}
                                                    className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md transform scale-90 hover:scale-100"
                                                    title="Sil"
                                                >
                                                    <Trash size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </CollapsibleSection>
                            ))}
                        </div>
                    </CollapsibleSection>
                ))}
            </div>
        </div>
    );
};

export default AdminCatalogueManager;
