import React, { useState, useRef, useEffect, useCallback } from 'react';
import { collection, doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import {
    Download, Upload, Maximize, RotateCw, Contrast, Sun, Wand2, Loader2,
    Sparkles, Save, CheckCircle2, RefreshCcw, Hand, Gem, Ear, Settings2, ArrowLeft
} from 'lucide-react';
import { db } from '../../config/firebase';
import { appId } from '../../utils/constants';
import { uploadImageToStorage, autoColorCorrectDataUrl } from '../../utils/helpers';

// AI Stüdyo artık tek kategori başına TEK bir manken şablonu kullanıyor:
// Yüzük → el, Kolye → göğüs, Küpe → kulak. Admin her kategori için şablonu
// (manken fotoğrafı + doğru konum) bir KERE ayarlar; sonrasında yeni bir ürün
// fotoğrafı yüklendiğinde arka planı otomatik silinir, rengi/tonu otomatik
// düzeltilir ve o kategorinin şablonuna otomatik yerleştirilir — elle hiçbir
// şey yapmaya gerek kalmaz.
const CATEGORY_CONFIG = [
    { key: 'ring', category: 'Yüzük', bodyPart: 'El', icon: Hand },
    { key: 'necklace', category: 'Kolye', bodyPart: 'Göğüs', icon: Gem },
    { key: 'earring', category: 'Küpe', bodyPart: 'Kulak', icon: Ear },
];

const EXPORT_WIDTH = 1600;
const EXPORT_HEIGHT = 2133; // 3:4 oranı
const DEFAULT_TRANSFORM = { x: 50, y: 50, scale: 0.3, rotate: 0 };

// İki resmi (arkaplan + kesilmiş ürün) verilen ayarlarla tek bir kareye birleştirir.
const composeImage = (bgSrc, fgSrc, cfg, width = EXPORT_WIDTH, height = EXPORT_HEIGHT) => new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const bg = new window.Image();
    bg.crossOrigin = 'anonymous';
    bg.onload = () => {
        const bgRatio = bg.width / bg.height;
        const canvasRatio = width / height;
        let dw = width, dh = height, ox = 0, oy = 0;
        if (bgRatio > canvasRatio) { dw = height * bgRatio; ox = (width - dw) / 2; }
        else { dh = width / bgRatio; oy = (height - dh) / 2; }
        ctx.drawImage(bg, ox, oy, dw, dh);

        const fg = new window.Image();
        fg.crossOrigin = 'anonymous';
        fg.onload = () => {
            ctx.save();
            const targetX = (cfg.transform.x / 100) * width;
            const targetY = (cfg.transform.y / 100) * height;
            ctx.translate(targetX, targetY);
            ctx.rotate((cfg.transform.rotate * Math.PI) / 180);

            const baseWidth = width * cfg.transform.scale;
            const ratio = fg.height / fg.width;
            const baseHeight = baseWidth * ratio;

            ctx.filter = `brightness(${cfg.brightness}%) contrast(${cfg.contrast}%)`;
            if (cfg.useMultiply) ctx.globalCompositeOperation = 'multiply';
            ctx.drawImage(fg, -baseWidth / 2, -baseHeight / 2, baseWidth, baseHeight);

            ctx.restore();
            resolve(canvas.toDataURL('image/png', 1.0));
        };
        fg.onerror = () => reject(new Error('Ürün görseli yüklenemedi'));
        fg.src = fgSrc;
    };
    bg.onerror = () => reject(new Error('Arkaplan görseli yüklenemedi'));
    bg.src = bgSrc;
});

const AIStudio = ({ setNotification }) => {
    const notify = useCallback((n) => { if (setNotification) setNotification(n); }, [setNotification]);

    // Kategori seçimi ve kayıtlı şablonlar (her kategori için TEK şablon)
    const [selectedKey, setSelectedKey] = useState('ring');
    const [templates, setTemplates] = useState({}); // { ring: {...}|undefined, necklace: {...}, earring: {...} }
    const [mode, setMode] = useState('auto'); // 'auto' | 'setup'

    const activeConfig = CATEGORY_CONFIG.find(c => c.key === selectedKey);
    const activeTemplate = templates[selectedKey];

    useEffect(() => {
        const ref = collection(db, 'artifacts', appId, 'public', 'data', 'ai_category_templates');
        const unsub = onSnapshot(ref, (snap) => {
            const next = {};
            snap.docs.forEach(d => { next[d.id] = d.data(); });
            setTemplates(next);
        });
        return () => unsub();
    }, []);

    // ---- OTOMATİK ÜRETİM AKIŞI ----
    const [stage, setStage] = useState('idle'); // idle | removing-bg | correcting | composing | done | error
    const [resultUrl, setResultUrl] = useState(null);
    const [rawFile, setRawFile] = useState(null);

    const runAutoPipeline = useCallback(async (file, template) => {
        setResultUrl(null);
        try {
            setStage('removing-bg');
            const mod = await import('@imgly/background-removal');
            const cutBlob = await mod.removeBackground(file);
            const cutUrl = URL.createObjectURL(cutBlob);

            setStage('correcting');
            const correctedUrl = await autoColorCorrectDataUrl(cutUrl);

            setStage('composing');
            const finalUrl = await composeImage(template.bgImage, correctedUrl, {
                transform: template.transform,
                brightness: template.brightness,
                contrast: template.contrast,
                useMultiply: template.useMultiply,
            });

            setResultUrl(finalUrl);
            setStage('done');
            notify({ type: 'success', message: 'Fotoğraf hazır!' });
        } catch (error) {
            console.error('AI Stüdyo hatası:', error);
            setStage('error');
            notify({ type: 'error', message: 'İşlenemedi: ' + error.message });
        }
    }, [notify]);

    const handleAutoUpload = (e) => {
        const file = e.target.files[0];
        if (!file || !activeTemplate) return;
        setRawFile(file);
        runAutoPipeline(file, activeTemplate);
    };

    const retryAuto = () => { if (rawFile && activeTemplate) runAutoPipeline(rawFile, activeTemplate); };
    const resetAuto = () => { setRawFile(null); setResultUrl(null); setStage('idle'); };

    const downloadResult = () => {
        if (!resultUrl) return;
        const link = document.createElement('a');
        link.download = `Sahra_${activeConfig.category}_${Date.now()}.png`;
        link.href = resultUrl;
        link.click();
    };

    // ---- ŞABLON AYARLAMA (KATEGORİ BAŞINA BİR KERE) AKIŞI ----
    const [setupBgFile, setSetupBgFile] = useState(null);
    const [setupBgUrl, setSetupBgUrl] = useState(null);
    const [setupFgUrl, setSetupFgUrl] = useState(null);
    const [setupProcessingFg, setSetupProcessingFg] = useState(false);
    const [setupTransform, setSetupTransform] = useState({ ...DEFAULT_TRANSFORM });
    const [setupBrightness, setSetupBrightness] = useState(100);
    const [setupContrast, setSetupContrast] = useState(100);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);

    const setupWorkspaceRef = useRef(null);
    const setupCanvasRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);

    const enterSetup = () => {
        setSetupBgFile(null);
        setSetupBgUrl(activeTemplate ? activeTemplate.bgImage : null);
        setSetupFgUrl(null);
        setSetupTransform(activeTemplate ? { ...activeTemplate.transform } : { ...DEFAULT_TRANSFORM });
        setSetupBrightness(activeTemplate ? activeTemplate.brightness : 100);
        setSetupContrast(activeTemplate ? activeTemplate.contrast : 100);
        setMode('setup');
    };

    const handleSetupBgUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setSetupBgFile(file);
        setSetupBgUrl(URL.createObjectURL(file));
    };

    // Konumlamayı doğru yapabilmek için örnek bir ürün fotoğrafı yükleniyor
    // (bu fotoğraf kaydedilmez, sadece şablonu ayarlarken referans olarak kullanılır).
    const handleSetupFgUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setSetupProcessingFg(true);
        setSetupTransform({ ...DEFAULT_TRANSFORM });
        try {
            const mod = await import('@imgly/background-removal');
            const cutBlob = await mod.removeBackground(file);
            setSetupFgUrl(URL.createObjectURL(cutBlob));
        } catch (error) {
            console.error(error);
            setSetupFgUrl(URL.createObjectURL(file));
            notify({ type: 'error', message: 'Arka plan otomatik silinemedi, ham haliyle gösteriliyor.' });
        } finally {
            setSetupProcessingFg(false);
        }
    };

    const drawSetupPreview = useCallback(() => {
        if (!setupFgUrl || !setupCanvasRef.current) return;
        const canvas = setupCanvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new window.Image();
        img.src = setupFgUrl;
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            const targetX = (setupTransform.x / 100) * canvas.width;
            const targetY = (setupTransform.y / 100) * canvas.height;
            ctx.translate(targetX, targetY);
            ctx.rotate((setupTransform.rotate * Math.PI) / 180);
            const baseWidth = canvas.width * setupTransform.scale;
            const ratio = img.height / img.width;
            const baseHeight = baseWidth * ratio;
            ctx.filter = `brightness(${setupBrightness}%) contrast(${setupContrast}%)`;
            ctx.drawImage(img, -baseWidth / 2, -baseHeight / 2, baseWidth, baseHeight);
            ctx.restore();
        };
    }, [setupFgUrl, setupTransform, setupBrightness, setupContrast]);

    useEffect(() => {
        if (mode === 'setup' && setupWorkspaceRef.current && setupCanvasRef.current) {
            const rect = setupWorkspaceRef.current.getBoundingClientRect();
            setupCanvasRef.current.width = rect.width;
            setupCanvasRef.current.height = rect.height;
            drawSetupPreview();
        }
    }, [mode, drawSetupPreview, setupBgUrl]);

    const handleSetupMouseDown = () => setIsDragging(true);
    const handleSetupMouseUp = () => setIsDragging(false);
    const handleSetupMouseMove = (e) => {
        if (!isDragging || !setupWorkspaceRef.current) return;
        const rect = setupWorkspaceRef.current.getBoundingClientRect();
        let x = ((e.clientX - rect.left) / rect.width) * 100;
        let y = ((e.clientY - rect.top) / rect.height) * 100;
        setSetupTransform(prev => ({ ...prev, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }));
    };

    const saveTemplate = async () => {
        if (!setupBgUrl) { notify({ type: 'error', message: 'Önce bir manken fotoğrafı yükleyin.' }); return; }
        if (!setupFgUrl) { notify({ type: 'error', message: 'Konumu ayarlamak için örnek bir ürün fotoğrafı yükleyin.' }); return; }
        setIsSavingTemplate(true);
        try {
            let bgToSave = setupBgUrl;
            if (setupBgFile) {
                const { url } = await uploadImageToStorage(setupBgFile, 'ai_category_templates');
                bgToSave = url;
            }
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'ai_category_templates', selectedKey), {
                category: activeConfig.category,
                bodyPart: activeConfig.bodyPart,
                bgImage: bgToSave,
                transform: setupTransform,
                brightness: setupBrightness,
                contrast: setupContrast,
                useMultiply: true,
                updatedAt: serverTimestamp(),
            });
            notify({ type: 'success', message: `${activeConfig.category} şablonu kaydedildi! Artık yeni ürünler otomatik bu konuma yerleştirilecek.` });
            setMode('auto');
            resetAuto();
        } catch (error) {
            console.error(error);
            notify({ type: 'error', message: 'Şablon kaydedilemedi: ' + error.message });
        } finally {
            setIsSavingTemplate(false);
        }
    };

    // ---- ARAYÜZ ----
    return (
        <div className="bg-stone-50 dark:bg-ink-800 rounded-2xl shadow-xl border border-stone-200 dark:border-ink-700 flex flex-col font-sans">
            <div className="p-6 border-b border-stone-200 dark:border-ink-700 bg-ink-900">
                <h3 className="font-serif text-2xl text-white tracking-widest uppercase flex items-center gap-2"><Sparkles size={22} className="text-gold-500"/> AI Stüdyo</h3>
                <p className="text-[10px] text-ink-400 mt-2 uppercase tracking-widest">Yükle, otomatik hazırlansın</p>
            </div>

            {/* KATEGORİ SEÇİMİ */}
            <div className="p-6 border-b border-stone-200 dark:border-ink-700 flex flex-wrap gap-3">
                {CATEGORY_CONFIG.map(cfg => {
                    const Icon = cfg.icon;
                    const isActive = selectedKey === cfg.key;
                    const hasTemplate = !!templates[cfg.key];
                    return (
                        <button
                            key={cfg.key}
                            onClick={() => { setSelectedKey(cfg.key); setMode('auto'); resetAuto(); }}
                            className={`flex-1 min-w-[140px] flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${isActive ? 'border-gold-500 bg-gold-50 dark:bg-gold-950/20' : 'border-stone-200 dark:border-ink-700 hover:border-stone-300 dark:hover:border-ink-600 bg-white dark:bg-ink-900'}`}
                        >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-gold-500 text-white' : 'bg-stone-100 dark:bg-ink-800 text-ink-500 dark:text-ink-400'}`}><Icon size={18}/></div>
                            <div className="text-left">
                                <div className="text-sm font-bold text-ink-900 dark:text-ink-100">{cfg.category}</div>
                                <div className="text-[10px] text-ink-400 dark:text-ink-500 flex items-center gap-1">
                                    {hasTemplate ? <><CheckCircle2 size={11} className="text-emerald-500"/> {cfg.bodyPart} şablonu hazır</> : <><Settings2 size={11}/> Şablon ayarlanmadı</>}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="p-6 md:p-10">
                {mode === 'auto' && (
                    <>
                        {!activeTemplate ? (
                            <div className="max-w-md mx-auto text-center py-12">
                                <div className="w-16 h-16 bg-gold-50 dark:bg-gold-950/20 rounded-full flex items-center justify-center mx-auto mb-4"><Settings2 size={28} className="text-gold-500"/></div>
                                <h4 className="text-lg font-bold text-ink-900 dark:text-ink-100 mb-2">{activeConfig.category} için önce bir şablon ayarla</h4>
                                <p className="text-sm text-ink-500 dark:text-ink-400 mb-6">Bir manken fotoğrafı yükleyip ürünün {activeConfig.bodyPart.toLowerCase()} üzerindeki doğru konumunu bir kere ayarla — sonra her yeni {activeConfig.category.toLowerCase()} otomatik oraya yerleşecek.</p>
                                <button onClick={enterSetup} className="btn-gold !px-8"><Settings2 size={16}/> Şablonu Ayarla</button>
                            </div>
                        ) : (
                            <div className="max-w-lg mx-auto">
                                {stage === 'idle' && (
                                    <label className="flex flex-col items-center justify-center p-10 border-2 border-gold-500 border-dashed rounded-xl bg-gold-50 dark:bg-gold-950/20 hover:bg-gold-100 dark:hover:bg-gold-950/30 transition-colors cursor-pointer text-center">
                                        <Upload size={28} className="text-gold-600 mb-3"/>
                                        <span className="text-sm font-bold text-gold-700 dark:text-gold-400 uppercase tracking-wider">{activeConfig.category} Fotoğrafını Yükle</span>
                                        <span className="text-xs text-gold-600/70 dark:text-gold-500/60 mt-2">Dekupe ve renk ayarı gerekmez — otomatik yapılır, {activeConfig.bodyPart.toLowerCase()} üzerine otomatik yerleştirilir</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={handleAutoUpload} />
                                    </label>
                                )}

                                {(stage === 'removing-bg' || stage === 'correcting' || stage === 'composing') && (
                                    <div className="flex flex-col items-center justify-center p-16 bg-ink-900 rounded-xl text-white gap-4">
                                        <Loader2 size={32} className="animate-spin text-gold-500"/>
                                        <div className="text-sm font-bold text-center">
                                            {stage === 'removing-bg' && 'Arka plan otomatik siliniyor (dekupe)...'}
                                            {stage === 'correcting' && 'Renk ve ton otomatik düzeltiliyor...'}
                                            {stage === 'composing' && `${activeConfig.bodyPart} üzerine yerleştiriliyor...`}
                                        </div>
                                    </div>
                                )}

                                {stage === 'error' && (
                                    <div className="flex flex-col items-center gap-4 p-10 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl">
                                        <p className="text-sm font-bold text-red-700 dark:text-red-400 text-center">Bir sorun oldu.</p>
                                        <div className="flex gap-2">
                                            <button onClick={retryAuto} className="btn-secondary !py-2 !px-4"><RefreshCcw size={14}/> Tekrar Dene</button>
                                            <button onClick={resetAuto} className="btn-ghost !py-2 !px-4">Vazgeç</button>
                                        </div>
                                    </div>
                                )}

                                {stage === 'done' && resultUrl && (
                                    <div className="space-y-4">
                                        <div className="rounded-xl overflow-hidden border border-stone-200 dark:border-ink-700 shadow-lift">
                                            <img src={resultUrl} alt="Sonuç" className="w-full aspect-[3/4] object-cover"/>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={downloadResult} className="btn-gold flex-1"><Download size={16}/> İndir</button>
                                            <button onClick={retryAuto} className="btn-secondary !px-4" title="Tekrar oluştur"><RefreshCcw size={16}/></button>
                                            <button onClick={resetAuto} className="btn-secondary !px-4">Yeni Ürün</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {mode === 'setup' && (
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
                        <div>
                            <button onClick={() => setMode('auto')} className="text-xs font-bold text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-ink-100 flex items-center gap-1 mb-4"><ArrowLeft size={14}/> Geri Dön</button>

                            {!setupBgUrl ? (
                                <label className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-stone-300 dark:border-ink-600 rounded-xl hover:border-gold-500 hover:bg-gold-50 dark:hover:bg-gold-950/20 transition-colors cursor-pointer text-center">
                                    <Upload size={24} className="text-ink-400 mb-2"/>
                                    <span className="text-xs font-bold text-ink-600 dark:text-ink-300 uppercase tracking-wider">1. Manken Fotoğrafı Yükle</span>
                                    <span className="text-[10px] text-ink-400 mt-1">{activeConfig.bodyPart} net görünen bir fotoğraf seç</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleSetupBgUpload} />
                                </label>
                            ) : (
                                <div
                                    ref={setupWorkspaceRef}
                                    className={`relative w-full max-w-[420px] mx-auto aspect-[3/4] shadow-2xl overflow-hidden bg-white dark:bg-ink-900 rounded-xl ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                                    onMouseDown={handleSetupMouseDown}
                                    onMouseUp={handleSetupMouseUp}
                                    onMouseLeave={handleSetupMouseUp}
                                    onMouseMove={handleSetupMouseMove}
                                >
                                    <img src={setupBgUrl} className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none" alt="Manken"/>
                                    <canvas ref={setupCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none"/>
                                    {setupProcessingFg && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <Loader2 size={28} className="animate-spin text-gold-400"/>
                                        </div>
                                    )}
                                </div>
                            )}

                            {setupBgUrl && !setupFgUrl && !setupProcessingFg && (
                                <label className="mt-4 flex items-center justify-center gap-2 p-4 border-2 border-dashed border-stone-300 dark:border-ink-600 rounded-xl hover:border-gold-500 transition-colors cursor-pointer text-center max-w-[420px] mx-auto">
                                    <Wand2 size={16} className="text-gold-600"/>
                                    <span className="text-xs font-bold text-ink-600 dark:text-ink-300">2. Konumlamak için örnek bir {activeConfig.category.toLowerCase()} fotoğrafı yükle</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleSetupFgUpload} />
                                </label>
                            )}
                        </div>

                        {setupBgUrl && setupFgUrl && (
                            <div className="space-y-5 bg-white dark:bg-ink-900 p-5 rounded-xl border border-stone-200 dark:border-ink-700 h-fit">
                                <h4 className="text-xs font-bold text-ink-500 dark:text-ink-400 uppercase tracking-widest border-b border-stone-100 dark:border-ink-800 pb-2">3. Konumu Ayarla</h4>
                                <p className="text-[10px] text-ink-400 dark:text-ink-500 -mt-3">Ürünü doğru yere sürükle, boyutunu ayarla.</p>
                                <div>
                                    <div className="flex justify-between text-[10px] text-ink-500 dark:text-ink-400 font-bold uppercase mb-2"><span className="flex items-center gap-1"><Maximize size={12}/> Ölçek</span><span>{Math.round(setupTransform.scale * 100)}%</span></div>
                                    <input type="range" min="0.05" max="1.5" step="0.01" value={setupTransform.scale} onChange={(e) => setSetupTransform(prev => ({ ...prev, scale: parseFloat(e.target.value) }))} className="w-full accent-gold-500 h-1 bg-stone-200 dark:bg-ink-700 rounded-lg appearance-none" />
                                </div>
                                <div>
                                    <div className="flex justify-between text-[10px] text-ink-500 dark:text-ink-400 font-bold uppercase mb-2"><span className="flex items-center gap-1"><RotateCw size={12}/> Döndürme</span><span>{setupTransform.rotate}°</span></div>
                                    <input type="range" min="-180" max="180" value={setupTransform.rotate} onChange={(e) => setSetupTransform(prev => ({ ...prev, rotate: parseFloat(e.target.value) }))} className="w-full accent-gold-500 h-1 bg-stone-200 dark:bg-ink-700 rounded-lg appearance-none" />
                                </div>
                                <div>
                                    <div className="flex justify-between text-[10px] text-ink-500 dark:text-ink-400 font-bold uppercase mb-2"><span className="flex items-center gap-1"><Sun size={12}/> Parlaklık</span><span>{setupBrightness}%</span></div>
                                    <input type="range" min="50" max="150" value={setupBrightness} onChange={(e) => setSetupBrightness(parseInt(e.target.value))} className="w-full accent-gold-500 h-1 bg-stone-200 dark:bg-ink-700 rounded-lg appearance-none" />
                                </div>
                                <div>
                                    <div className="flex justify-between text-[10px] text-ink-500 dark:text-ink-400 font-bold uppercase mb-2"><span className="flex items-center gap-1"><Contrast size={12}/> Kontrast</span><span>{setupContrast}%</span></div>
                                    <input type="range" min="50" max="150" value={setupContrast} onChange={(e) => setSetupContrast(parseInt(e.target.value))} className="w-full accent-gold-500 h-1 bg-stone-200 dark:bg-ink-700 rounded-lg appearance-none" />
                                </div>
                                <button onClick={saveTemplate} disabled={isSavingTemplate} className="btn-gold w-full disabled:opacity-50">
                                    {isSavingTemplate ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                                    Şablonu Kaydet
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIStudio;
