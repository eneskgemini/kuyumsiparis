import React from 'react';
import { Plus } from 'lucide-react';

const ProductCard = React.memo(({ product, onAddToCart, logoUrl }) => (
  <div className="card overflow-hidden hover:shadow-lift hover:-translate-y-0.5 transition-all duration-300 group flex flex-col h-full relative">
    <div className="aspect-square w-full bg-stone-100 dark:bg-ink-800 relative overflow-hidden">
      <img src={product.imageUrl || logoUrl} alt={product.code} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 select-none" onError={(e) => { e.target.src = logoUrl; }} loading="lazy" />
      <span className="absolute top-2.5 right-2.5 bg-white/95 dark:bg-ink-900/90 backdrop-blur-sm text-ink-900 dark:text-ink-100 text-[11px] font-bold px-2.5 py-1 rounded-full shadow-soft z-10 tracking-wide">{product.code}</span>
      <span className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/70 to-transparent text-white text-[10px] font-medium p-2.5 pt-8">{product.category} {product.subcategory && product.subcategory !== "Hepsi" ? `› ${product.subcategory}` : ""}</span>
    </div>
    <div className="p-3.5 flex flex-col flex-1">
      <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-ink-900 dark:text-ink-100 text-sm truncate">{product.code}</h3>
          <span className="chip !px-2 !py-0.5 shrink-0 !text-[11px]">{product.gram ? `${product.gram} gr` : "Gram Yok"}</span>
      </div>
      <button onClick={() => onAddToCart(product)} className="btn-primary w-full mt-auto !py-2.5 hover:!bg-gold-600"><Plus size={16} /> Listeye Ekle</button>
    </div>
  </div>
));

export default ProductCard;
