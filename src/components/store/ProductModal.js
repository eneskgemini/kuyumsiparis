import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';

const ProductModal = ({ product, isOpen, onClose, onConfirm }) => {
    const [quantity, setQuantity] = useState(1);
    const [size, setSize] = useState("");

    useEffect(() => {
        if (isOpen) { setQuantity(1); setSize(""); }
    }, [isOpen, product]);

    if(!isOpen || !product) return null;

    return (
        <div className="fixed inset-0 z-[300] bg-ink-950/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="card w-full max-w-md overflow-hidden animate-zoom-in">
                <div className="relative aspect-square bg-stone-100 dark:bg-ink-800">
                    <img src={product.imageUrl} className="w-full h-full object-contain" alt={product.code}/>
                    <button onClick={onClose} className="absolute top-4 right-4 bg-white/90 dark:bg-ink-900/90 p-2 rounded-full hover:bg-white dark:hover:bg-ink-800 shadow-soft transition-colors text-ink-700 dark:text-ink-200"><X size={18}/></button>
                </div>
                <div className="p-6">
                    <h2 className="text-xl font-bold text-ink-900 dark:text-ink-100 mb-4 tracking-wide">{product.code}</h2>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="field-label">Adet</label>
                            <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))} className="field text-center font-bold"/>
                        </div>
                        <div>
                            <label className="field-label">Boy / Ölçü</label>
                            <input type="text" value={size} onChange={(e) => setSize(e.target.value)} placeholder="Standart" className="field text-center font-bold"/>
                        </div>
                    </div>
                    <button onClick={()=>{onConfirm(Object.assign({}, product, { quantity, selectedSize: size })); onClose();}} className="btn-primary w-full !py-4"><Plus size={18} /> Listeye Ekle</button>
                </div>
            </div>
        </div>
    );
};

export default ProductModal;
