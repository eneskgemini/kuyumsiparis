import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { X, ChevronLeft, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
import { db } from '../../config/firebase';

const CatalogueModal = ({ isOpen, onClose, appId, initialCategory, initialSubcategory }) => {
    const [images, setImages] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [scale, setScale] = useState(1);
    const [translate, setTranslate] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [startTouch, setStartTouch] = useState({ x: 0, y: 0 });
    const [startPinchDist, setStartPinchDist] = useState(0);
    const [startScale, setStartScale] = useState(1);
    const [swipeOffset, setSwipeOffset] = useState(0);

    useEffect(() => {
        resetZoom();
    }, [currentIndex]);

    const resetZoom = () => {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
        setSwipeOffset(0);
    };

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        setImages([]);
        
        let q = query(collection(db, 'artifacts', appId, 'public', 'data', 'catalogue_images'), orderBy('createdAt', 'asc'));

        const unsub = onSnapshot(q, (snap) => {
            let fetched = snap.docs.map(d => d.data());
            
            if (initialCategory && initialCategory !== "Anasayfa") {
                fetched = fetched.filter(img => img.category === initialCategory);
                if (initialSubcategory && initialSubcategory !== "Hepsi") {
                    fetched = fetched.filter(img => img.subcategory && img.subcategory.toUpperCase() === initialSubcategory.toUpperCase());
                }
            }
            
            setImages(fetched.map(f => f.imageUrl));
            setCurrentIndex(0);
            setLoading(false);
        });
        
        return () => unsub();
    }, [isOpen, appId, initialCategory, initialSubcategory]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (images.length === 0) return;
            if (e.key === 'ArrowLeft') changeImage(-1);
            else if (e.key === 'ArrowRight') changeImage(1);
            else if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, images.length, onClose]);

    const changeImage = (dir) => {
        resetZoom();
        if (dir === 1) setCurrentIndex(prev => (prev + 1) % images.length);
        else setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
    };

    const getDistance = (touches) => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);

    const handleTouchStart = (e) => {
        if (e.touches.length === 1) {
            setIsDragging(true);
            setStartTouch({ x: e.touches[0].clientX, y: e.touches[0].clientY });
        } else if (e.touches.length === 2) {
            setStartPinchDist(getDistance(e.touches));
            setStartScale(scale);
        }
    };

    const handleTouchMove = (e) => {
        e.preventDefault(); 
        if (e.touches.length === 1 && isDragging) {
            const dx = e.touches[0].clientX - startTouch.x;
            const dy = e.touches[0].clientY - startTouch.y;

            if (scale > 1) {
                setTranslate(prev => ({ x: prev.x + dx * 0.5, y: prev.y + dy * 0.5 }));
                setStartTouch({ x: e.touches[0].clientX, y: e.touches[0].clientY });
            } else {
                setSwipeOffset(dx);
            }
        } else if (e.touches.length === 2) {
            const dist = getDistance(e.touches);
            if (startPinchDist > 0) {
                const newScale = startScale * (dist / startPinchDist);
                setScale(Math.min(Math.max(1, newScale), 5));
            }
        }
    };

    const handleMouseDown = (e) => { setIsDragging(true); setStartTouch({ x: e.clientX, y: e.clientY }); };

    const handleMouseMoveMouse = (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startTouch.x;
        const dy = e.clientY - startTouch.y;

        if (scale > 1) {
            setTranslate(prev => ({ x: prev.x + dx * 0.5, y: prev.y + dy * 0.5 }));
            setStartTouch({ x: e.clientX, y: e.clientY });
        } else {
            setSwipeOffset(dx);
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        if (scale > 1) {
            if (scale < 1) setScale(1); 
        } else {
            const threshold = 100;
            if (swipeOffset > threshold) changeImage(-1); 
            else if (swipeOffset < -threshold) changeImage(1); 
            else setSwipeOffset(0);
        }
        setStartPinchDist(0);
    };

    const handleDoubleTap = () => { if (scale > 1) resetZoom(); else setScale(2.5); };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-[500] bg-black flex flex-col items-center justify-center overflow-hidden touch-none select-none"
            style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }} 
        >
            <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white z-[510] transition-colors p-2 bg-black/20 rounded-full hover:bg-white/20">
                <X size={32}/>
            </button>
            
            {loading ? (
                <div className="text-white flex items-center gap-2 animate-pulse">
                    <Loader2 className="animate-spin"/> Yükleniyor...
                </div>
            ) : images.length > 0 ? (
                <>
                    <div 
                        className="flex-1 w-full h-full flex items-center justify-center relative p-0 overflow-hidden"
                        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
                        onMouseDown={handleMouseDown} onMouseMove={handleMouseMoveMouse} onMouseUp={handleTouchEnd} onMouseLeave={handleTouchEnd}
                        onDoubleClick={handleDoubleTap}
                    >
                        <div 
                            style={{ 
                                transform: scale === 1 ? `translateX(${swipeOffset}px)` : `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                                transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                                width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            <img src={images[currentIndex]} className="max-w-full max-h-full object-contain select-none shadow-2xl pointer-events-none" key={currentIndex} alt="Katalog" onDragStart={(e) => e.preventDefault()}/>
                        </div>
                        
                        {scale === 1 && (
                            <>
                                <button onClick={(e) => { e.stopPropagation(); changeImage(-1); }} className="hidden md:block absolute left-4 text-white/30 hover:text-white transition-all p-4 hover:bg-white/10 rounded-full group-hover:opacity-100"><ChevronLeft size={48}/></button>
                                <button onClick={(e) => { e.stopPropagation(); changeImage(1); }} className="hidden md:block absolute right-4 text-white/30 hover:text-white transition-all p-4 hover:bg-white/10 rounded-full group-hover:opacity-100"><ChevronRight size={48}/></button>
                            </>
                        )}
                    </div>
                    
                    <div className="absolute bottom-0 left-0 w-full h-20 md:h-24 bg-gradient-to-t from-black via-black/90 to-transparent flex items-center gap-2 overflow-x-auto px-4 py-2 scrollbar-hide z-50">
                        {images.map((img, idx) => (
                            <button key={idx} onClick={() => { setCurrentIndex(idx); resetZoom(); }} className={`shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-lg overflow-hidden border-2 transition-all relative ${idx === currentIndex ? 'border-gold-400 scale-105 opacity-100' : 'border-transparent opacity-40 hover:opacity-100'}`}>
                                <img src={img} className="w-full h-full object-cover" loading="lazy" alt="thumb"/>
                            </button>
                        ))}
                    </div>
                    
                    <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full text-white/70 text-xs font-bold border border-white/10 flex items-center gap-2 pointer-events-none z-[510]">
                        <span>{initialCategory}</span>
                        {initialSubcategory !== "Hepsi" && <><ChevronRight size={12} className="opacity-50"/><span>{initialSubcategory}</span></>}
                        <span className="ml-2 pl-2 border-l border-white/20 text-gold-400">{currentIndex + 1} / {images.length}</span>
                    </div>
                </>
            ) : (
                <div className="text-white text-xl flex flex-col items-center gap-4 animate-zoom-in">
                    <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center"><AlertTriangle size={40} className="text-gold-400"/></div>
                    <p className="font-light">Bu kategori için fotoğraf yok.</p>
                    <button onClick={onClose} className="bg-white text-ink-900 px-8 py-3 rounded-full text-sm font-bold shadow-lift hover:bg-gold-50 transition-colors">Kapat</button>
                </div>
            )}
        </div>
    );
};

export default CatalogueModal;