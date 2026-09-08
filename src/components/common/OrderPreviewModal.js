import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Printer, X, Paperclip, Plus } from 'lucide-react';
import { KARAT_OPTIONS, COLOR_OPTIONS, DEFAULT_LOGO_URL } from '../../utils/constants';
import { parseGram, processFile, naturalSort } from '../../utils/helpers';
import { useCompanyInfo } from '../../hooks/useCompanyInfo';

// Dolu satırları ürün koduna göre doğal/numara sırasına dizer (ör. "AS-B 7"
// her zaman "AS-B 10"'dan önce gelir), boş satırları en sonda bırakır.
// Sepetten eklenen, taslaktan gelen veya mevcut siparişten açılan ürün
// listeleri de dahil, listenin her oluşturulduğu yerde kullanılır.
const sortByCode = (items) => {
    const filled = items.filter(i => i.code && i.code.toString().trim() !== "");
    const empty = items.filter(i => !i.code || i.code.toString().trim() === "");
    return [...filled.sort(naturalSort), ...empty];
};

const OrderPreviewModal = ({ cart, isOpen, onClose, onRemoveItem, initialData, onCreateOrder, products, onUpdateOrder, draftData, setDraftData, logoUrl, customers }) => {
  const companyInfo = useCompanyInfo();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderKarat, setOrderKarat] = useState(""); 
  const [orderStamp, setOrderStamp] = useState(""); 
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [orderNo, setOrderNo] = useState(""); 
  const [stampType, setStampType] = useState('text'); 
  const [editableItems, setEditableItems] = useState([]);
  const [globalColor, setGlobalColor] = useState(""); 

  const isDraft = initialData && initialData.status === 'draft';
  const isViewingOldOrder = !!initialData;
  const isEditable = !initialData || isDraft;

  // Yazılan firma adı, Ayarlar > Müşteriler'de kayıtlı bir müşteriyle
  // eşleşiyorsa sipariş numarası "KOD-XXX" biçiminde otomatik önerilir
  // (kesin/atomik numara App.js -> handleCheckout içinde, sipariş
  // kaydedilirken üretilir). Mevcut bir siparişi görüntülerken/düzenlerken
  // numara yeniden üretilmesin diye bu sadece yeni sipariş oluştururken çalışır.
  const matchedCustomer = useMemo(() => {
      if (isViewingOldOrder || !customers || !customerName) return null;
      const target = customerName.trim().toLowerCase();
      if (!target) return null;
      return customers.find(c => c.nameLower === target) || null;
  }, [customers, customerName, isViewingOldOrder]);

  useEffect(() => {
      if (matchedCustomer) {
          const preview = `${matchedCustomer.code}-${String((matchedCustomer.orderCount || 0) + 1).padStart(3, '0')}`;
          setOrderNo(preview);
          updateDraft('customOrderNo', preview);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedCustomer]);

  const orderStats = useMemo(() => {
    const realItems = editableItems.filter(i => i.code && i.code.toString().trim() !== "" && i.category);
    const totalQty = realItems.reduce((acc, i) => acc + (parseInt(i.quantity) || 0), 0);
    const totalGr = realItems.reduce((acc, i) => acc + (parseGram(i.gram) * (parseInt(i.quantity) || 0)), 0);
    
    const catBreakdown = realItems.reduce((acc, item) => {
        const cat = item.category; 
        if(cat) {
            acc[cat] = (acc[cat] || 0) + (parseInt(item.quantity) || 0);
        }
        return acc;
    }, {});

    return { totalQty, totalGr, catBreakdown, realItems };
  }, [editableItems]);

  const handleStampUpload = async (e) => {
      const file = e.target.files[0];
      if (file) { try { const base64 = (await processFile(file)).base64; setOrderStamp(base64); updateDraft('orderStamp', base64); } catch(err) { console.error(err); } }
  };

  useEffect(() => { if (isOpen) document.body.style.overflow = 'hidden'; else document.body.style.overflow = 'unset'; return () => { document.body.style.overflow = 'unset'; }; }, [isOpen]);
  
  useEffect(() => {
    if (initialData) {
        setCustomerName(initialData.customerName || ""); setCustomerPhone(initialData.customerPhone || ""); setOrderNo(initialData.customOrderNo || "");
        
        setEditableItems(sortByCode((initialData.items || []).map((item, idx) => {
            let img = item.imageUrl;
            if (!img && products) {
                const codeToFind = item.code ? item.code.toString().trim().toLowerCase() : "";
                const p = products.find(p => p.code && p.code.toString().trim().toLowerCase() === codeToFind);
                if (p) img = p.imageUrl;
            }
            return Object.assign({}, item, { _tempId: idx, imageUrl: img || logoUrl });
        })));

        setOrderStamp(initialData.orderStamp || ""); setStampType(initialData.orderStamp && initialData.orderStamp.startsWith('data:image') ? 'image' : 'text');
        if(initialData.createdAt && initialData.createdAt.seconds) setOrderDate(new Date(initialData.createdAt.seconds * 1000).toISOString().split('T')[0]);
        setOrderKarat(initialData.orderKarat || (initialData.items && initialData.items[0] && initialData.items[0].selectedKarat) || ""); setDeliveryDate(initialData.deliveryDate || ""); 
    } else {
        setCustomerName((draftData && draftData.customerName) || ""); setOrderKarat((draftData && draftData.orderKarat) || (cart && cart.length > 0 ? cart[0].selectedKarat : "") || ""); setOrderNo((draftData && draftData.customOrderNo) || ""); setOrderStamp((draftData && draftData.orderStamp) || ""); setStampType((draftData && draftData.stampType) || 'text'); setCustomerPhone((draftData && draftData.customerPhone) || "");
        setOrderDate((draftData && draftData.orderDate) || new Date().toISOString().split('T')[0]); setDeliveryDate((draftData && draftData.deliveryDate) || "");
        let initialItems = [];
        if (cart && cart.length > 0) { 
            initialItems = cart.map((item, idx) => Object.assign({}, item, { _tempId: idx, imageUrl: item.imageUrl || logoUrl })); 
        } else if (draftData && draftData.items && draftData.items.length > 0) { 
            initialItems = draftData.items.map(item => Object.assign({}, item, { imageUrl: item.imageUrl || logoUrl })); 
        } else {
            initialItems = Array.from({ length: 12 }).map((_, i) => ({ code: "", quantity: 1, gram: "", selectedSize: "", selectedKarat: "", selectedColor: "", note: "", imageUrl: logoUrl, _tempId: `manual_${i}` }));
        }
        setEditableItems(sortByCode(initialItems));
    }
  }, [initialData, cart, isOpen, logoUrl, products]);
  
  const compactList = useCallback(() => {
      setEditableItems(prev => {
          const filled = prev.filter(item => (item.code && item.code.trim() !== ""));
          const pageLimit = 12;
          let neededCount = Math.ceil(Math.max(filled.length, pageLimit) / pageLimit) * pageLimit;

          const extraNeeded = Math.max(0, neededCount - filled.length);
          const emptyRows = Array.from({ length: extraNeeded }).map((_, i) => ({ code: "", quantity: 1, gram: "", selectedSize: "", selectedKarat: "", selectedColor: "", note: "", imageUrl: logoUrl, _tempId: `auto_fill_${Date.now()}_${i}` }));
          return [...filled, ...emptyRows];
      });
  }, [logoUrl]);

  useEffect(() => { if (isEditable) compactList(); }, [compactList, isEditable]); 
  
  const updateDraft = (key, value) => { if (!isViewingOldOrder && setDraftData) { setDraftData(prev => (Object.assign({}, prev, { [key]: value }))); } };
  
  const handleItemUpdate = (index, field, value) => { 
      setEditableItems(prev => { 
          const newItems = [...prev]; 
          let newItem = Object.assign({}, newItems[index], { [field]: value }); 
          
          if (field === 'code') { 
              const searchTerm = value.toString().trim().toLowerCase();
              const matchedProduct = products && products.find(p => (p.code && p.code.trim().toLowerCase()) === searchTerm); 
              
              if (matchedProduct) { 
                  newItem.gram = matchedProduct.gram || ""; 
                  newItem.imageUrl = matchedProduct.imageUrl || logoUrl; 
                  if(!newItem.category) newItem.category = matchedProduct.category; 
                  if (!newItem.selectedKarat && orderKarat) newItem.selectedKarat = orderKarat;
              } else { 
                  newItem.imageUrl = logoUrl; 
                  newItem.category = ""; 
              } 
          } 
          newItems[index] = newItem; 
          return newItems; 
      }); 
  };
  
  // Kod kutucuğundan çıkıldığında (blur), dolu satırları ürün koduna göre
  // doğal/numara sırasına diz (ör. AS-B7, AS-B10'dan önce gelir). Boş
  // satırlar her zaman en sonda kalır. Yazarken değil, sadece yazmayı
  // bitirince sıralanır - böylece daktilo yazarken satır zıplamaz.
  const sortItemsByCode = useCallback(() => {
      setEditableItems(prev => sortByCode(prev));
  }, []);

  const handleLocalRemove = (index) => { const item = editableItems[index]; if (!isViewingOldOrder && item && item.cartId) { onRemoveItem(item.cartId); } setEditableItems(prev => { const n = [...prev]; n[index] = { code: "", quantity: 1, gram: "", selectedSize: "", selectedKarat: "", selectedColor: "", note: "", imageUrl: logoUrl, _tempId: `cleared_${Date.now()}_${Math.random()}` }; return n; }); };
  
  const updateAllItems = (field, value) => {
    setEditableItems(prev => prev.map(item => item.code ? Object.assign({}, item, { [field]: value }) : item));
    if (field === 'selectedKarat') { setOrderKarat(value); updateDraft('orderKarat', value); }
    if (field === 'selectedColor') { setGlobalColor(value); }
  };

  const handleSaveOrder = (status = 'new') => { 
    if(!customerName) return window.alert("Firma Adı Giriniz"); 
    if(!orderKarat) return window.alert("Lütfen sipariş ayarını seçiniz!"); 
    if(!deliveryDate) return window.alert("Lütfen teslim tarihini giriniz!"); 
    
    const cleanItems = editableItems.filter(item => item.code && item.code.trim() !== "").map((item) => {
        const copy = Object.assign({}, item);
        delete copy._tempId;
        return copy;
    }); 
    if (cleanItems.length === 0) return window.alert("Lütfen en az 1 ürün giriniz."); 
    if (isViewingOldOrder && onUpdateOrder) onUpdateOrder(initialData.id, { customerName, customerPhone, orderKarat, orderStamp, deliveryDate, customOrderNo: orderNo, items: cleanItems, status: status === 'new' ? 'new' : initialData.status }); 
    else onCreateOrder(customerName, customerPhone, "", deliveryDate, orderKarat, orderNo, orderStamp, cleanItems, status, orderDate); 
  };
  
  if (!isOpen) return null;
  const FIRST_PAGE_ITEMS = 12; const OTHER_PAGE_ITEMS = 12; const pages = []; let itemsForPagination = [...editableItems];
  if (itemsForPagination.length > 0) { pages.push(itemsForPagination.splice(0, itemsForPagination.length >= FIRST_PAGE_ITEMS ? FIRST_PAGE_ITEMS : itemsForPagination.length)); while (itemsForPagination.length > 0) pages.push(itemsForPagination.splice(0, OTHER_PAGE_ITEMS)); } else { pages.push(Array.from({ length: 12 }).map((_, i) => ({ code: "", quantity: 1, gram: "", selectedSize: "", selectedKarat: "", selectedColor: "", note: "", imageUrl: logoUrl, _tempId: `empty_${i}` }))); }
  
  return (
    <div className="fixed inset-0 z-[100] bg-ink-950/95 backdrop-blur-sm overflow-y-auto modal-overlay-fix print:static print:bg-white" style={{ colorScheme: 'light' }}>
      <div className="fixed top-0 left-0 w-full bg-ink-900 p-4 z-[110] flex flex-wrap justify-between items-center gap-2 no-print shadow-lift border-b border-white/5">
        <div className="text-white font-bold flex items-center gap-2 tracking-wide"><Printer size={19} className="text-gold-400"/> SİPARİŞ BELGESİ</div>
        <div className="flex flex-wrap gap-2">
           <button onClick={()=>{if (!isViewingOldOrder && setDraftData) setDraftData(prev => (Object.assign({}, prev, { items: editableItems }))); onClose();}} className="bg-white/10 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs tracking-wide flex items-center gap-2 transition-colors">KAPAT</button>

           <button onClick={()=>{if(!customerName) return window.alert("Firma Adı giriniz."); window.print();}} className="bg-white text-ink-900 hover:bg-gold-100 px-4 py-2.5 rounded-xl font-bold text-xs tracking-wide flex items-center gap-2 transition-colors shadow-soft"><Printer size={15}/> PDF / YAZDIR</button>

           {isEditable && <button onClick={() => handleSaveOrder('new')} className="bg-gradient-to-b from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs tracking-wide flex items-center gap-2 transition-all shadow-gold">OLUŞTUR</button>}
        </div>
      </div>
      
      <div className="mt-24 pb-10 flex flex-col items-center screen-view-container print:mt-0 print:pt-0 print:pb-0 print:block">
        <div id="printable-root" className="flex flex-col items-center gap-8 print:block print:gap-0">
            {pages.map((pageItems, pageIndex) => (
            <div key={pageIndex} className="print-page screen-page">
                <div className="mb-2 page-header-content">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-3/4">
                            <h1 className="text-4xl font-bold tracking-widest text-black uppercase">{companyInfo.name || 'SAHRA'}</h1>
                            <p className="text-xl font-bold text-gold-600 tracking-[0.3em] uppercase mt-1">{companyInfo.subtitle || 'KUYUMCULUK'}</p>
                            {(companyInfo.phone || companyInfo.address) && (
                                <p className="text-[9px] text-black mt-0.5">{[companyInfo.phone, companyInfo.address].filter(Boolean).join('  ·  ')}</p>
                            )}
                        </div>
                        <div className="border border-black p-2 rounded text-right bg-white">
                            <div className="text-[10px] font-bold mb-1 leading-tight text-black">
                                {Object.entries(orderStats.catBreakdown).length > 0 ? (
                                    Object.entries(orderStats.catBreakdown).map(([cat, count]) => `${count} ${cat}`).join(', ')
                                ) : (
                                    <span className="italic">Ürün Yok</span>
                                )}
                            </div>
                            <div className="text-sm font-bold border-t border-black pt-1 mt-1 text-black">
                                {orderStats.totalGr.toFixed(2)} Gr
                            </div>
                        </div>
                    </div>
                    {pageIndex === 0 && (
                        <>
                            <table className="header-table"><thead><tr><th className="text-black">Sipariş Numarası</th><th className="text-black">Müşteri Kodu / Adı</th><th className="text-black">Ayar</th><th className="text-black">Sipariş Tarihi</th><th className="text-black">Teslim Tarihi</th><th className="text-black">Damga</th></tr></thead><tbody><tr><td className="text-black bg-white">{orderNo || "_______"}</td><td className="text-black bg-white">{customerName.toUpperCase() || "________________"}</td><td className="text-black bg-white">{orderKarat || "_______"}</td><td className="text-black bg-white">{orderDate.split('-').reverse().join('.')}</td><td className="text-black bg-white">{deliveryDate ? deliveryDate.split('-').reverse().join('.') : "___/___/20__"}</td>
                            <td className="text-black bg-white">
                                {isEditable ? (
                                    <div className="flex items-center gap-1 no-print">
                                        {(!orderStamp || !orderStamp.startsWith('data:')) && <input type="text" value={orderStamp} placeholder="Damga Yaz" onChange={(e)=>{setOrderStamp(e.target.value); updateDraft('orderStamp', e.target.value);}} className="p-1 border rounded w-24 text-xs bg-white text-black"/>}
                                        <label className="cursor-pointer bg-stone-100 p-1 rounded hover:bg-stone-200" title="Resim Yükle"><Paperclip size={14}/><input type="file" accept="image/*" className="hidden" onChange={handleStampUpload}/></label>
                                        {orderStamp && orderStamp.startsWith('data:') && <div className="flex items-center gap-1"><img src={orderStamp} className="h-6 w-auto border"/><button onClick={()=>{setOrderStamp(''); updateDraft('orderStamp', '');}} className="text-red-500"><X size={14}/></button></div>}
                                    </div>
                                ) : (orderStamp && orderStamp.startsWith('data:') ? <img src={orderStamp} className="h-6 object-contain"/> : (orderStamp || "_______"))}
                                {isEditable && !orderStamp && <span className="print-only">_______</span>}
                                {isEditable && orderStamp && !orderStamp.startsWith('data:') && <span className="print-only">{orderStamp}</span>}
                                {isEditable && orderStamp && orderStamp.startsWith('data:') && <img src={orderStamp} className="h-6 object-contain print-only"/>}
                            </td>
                            </tr></tbody></table>
                            
                            {isEditable && (
                                <div className="no-print bg-gold-50 p-3 rounded-xl border border-gold-200 mt-2 relative grid grid-cols-2 gap-3 shadow-inner">
                                    <div className="flex flex-col gap-2">
                                        <input list="registered-customers-list" value={customerName} onChange={e=>{setCustomerName(e.target.value.toUpperCase()); updateDraft('customerName', e.target.value);}} placeholder="FİRMA ADI *" className="p-2 border rounded font-bold text-sm w-full text-black bg-white"/>
                                        {customers && customers.length > 0 && (
                                            <datalist id="registered-customers-list">
                                                {customers.map(c => <option key={c.id} value={c.name} />)}
                                            </datalist>
                                        )}
                                        <input value={orderNo} onChange={e=>{setOrderNo(e.target.value); updateDraft('customOrderNo', e.target.value);}} placeholder="SİPARİŞ NO" className="p-2 border rounded font-bold text-sm w-full text-black bg-white"/>
                                        {matchedCustomer && <span className="text-[10px] text-emerald-700 font-bold -mt-1">Otomatik önerildi ({matchedCustomer.name} için {(matchedCustomer.orderCount || 0) + 1}. sipariş) — istersen değiştirebilirsin</span>}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex gap-2">
                                            <input type="date" value={orderDate} onChange={e=>{setOrderDate(e.target.value); updateDraft('orderDate', e.target.value);}} title="Sipariş Tarihi" className="p-2 border rounded text-sm w-1/2 text-black bg-white"/>
                                            <input type="date" min={new Date().toISOString().split('T')[0]} value={deliveryDate} onChange={e=>{setDeliveryDate(e.target.value); updateDraft('deliveryDate', e.target.value);}} title="Teslim Tarihi" className="p-2 border rounded text-sm w-1/2 text-black bg-white"/>
                                        </div>
                                        <div className="flex gap-2">
                                            <select value={orderKarat} onChange={e => updateAllItems('selectedKarat', e.target.value)} className="p-2 border rounded bg-white font-bold text-sm w-full text-black"> <option value="" disabled>Ayar Seç (Tümü)</option> {KARAT_OPTIONS.map(k=><option key={k} value={k}>{k}</option>)} </select>
                                            <select value={globalColor} onChange={e => updateAllItems('selectedColor', e.target.value)} className="p-2 border rounded bg-white font-bold text-sm w-full text-black"> <option value="">Renk Seç (Tümü)</option> {COLOR_OPTIONS.map(c=><option key={c} value={c}>{c}</option>)} </select>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
                <div className="erp-grid">
                {pageItems.map((item, index) => {
                    const globalIndex = pageIndex === 0 ? index : FIRST_PAGE_ITEMS + (pageIndex - 1) * OTHER_PAGE_ITEMS + index;
                    const isVisibleInPrint = item.code && item.category;
                    return (
                    <div key={item._tempId || index} className={`erp-card relative group ${!isVisibleInPrint ? "print-invisible-card" : ""}`}>
                        <div className="erp-image-area"><img src={item.imageUrl || logoUrl || DEFAULT_LOGO_URL} alt="Ürün" /></div>
                        <div className="erp-details-area">
                            <div className="erp-header"> 
                                {!isEditable ? <span className="font-bold text-[11px] text-black tracking-wide">{item.code}</span> : (
                                    <input 
                                        type="text" 
                                        autoComplete="off"
                                        className="w-full text-center bg-transparent outline-none font-bold text-black"
                                        value={item.code}
                                        onChange={(e) => handleItemUpdate(globalIndex, 'code', e.target.value)}
                                        onBlur={sortItemsByCode}
                                    />
                                )} 
                            </div>
                            <div className="erp-compact-row">
                                <div className="flex gap-1 items-center">
                                    <span className="text-[9px] shrink-0 text-black">Adet:</span>
                                    {!isEditable ? <span className="font-bold text-[11px] text-black">{item.quantity}</span> : <input type="number" className="w-8 text-center font-bold bg-transparent outline-none text-[11px] text-black" value={item.quantity} onChange={(e) => handleItemUpdate(globalIndex, 'quantity', parseInt(e.target.value) || 1)} />}
                                </div>
                                <div className="flex gap-1 items-center">
                                    <span className="text-[9px] shrink-0 text-black">Gr:</span>
                                    {!isEditable ? <span className="font-bold text-[11px] text-black">{item.gram}</span> : <input type="text" className="w-10 text-center font-bold bg-transparent outline-none text-[11px] text-black" value={item.gram} onChange={(e) => handleItemUpdate(globalIndex, 'gram', e.target.value)} />}
                                </div>
                            </div>
                            <div className="erp-compact-row" style={{borderBottom:'none'}}>
                                <div className="flex w-full h-full items-center">
                                    <span className="text-[9px] mr-1 shrink-0 text-black">Boy:</span>
                                    {!isEditable ? (
                                        <span className="flex-1 text-center font-bold text-[10px] text-black">{item.selectedSize}</span>
                                    ) : (
                                        <input type="text" className="flex-1 w-full h-full text-center bg-transparent outline-none text-[10px] font-bold text-black min-w-0" value={item.selectedSize || ''} onChange={(e) => handleItemUpdate(globalIndex, 'selectedSize', e.target.value)} />
                                    )}
                                </div>
                            </div>
                            <div className="erp-note">
                                <div className="flex w-full border-b border-black/10 pb-0.5 mb-0.5">
                                    <div className="flex-1 border-r border-black/10">
                                         {!isEditable ? <span className="font-bold text-[9px] text-black">{item.selectedKarat}</span> : <select className="w-full h-full bg-transparent text-[8px] outline-none text-center font-bold text-black" value={item.selectedKarat} onChange={(e)=>handleItemUpdate(globalIndex, 'selectedKarat', e.target.value)}><option value="">Ayar</option>{KARAT_OPTIONS.map(k=><option key={k} value={k}>{k}</option>)}</select>}
                                    </div>
                                    <div className="flex-1">
                                         {!isEditable ? <span className="font-bold text-[9px] text-black">{item.selectedColor}</span> : <select className="w-full h-full bg-transparent text-[8px] outline-none text-center font-bold text-black" value={item.selectedColor} onChange={(e)=>handleItemUpdate(globalIndex, 'selectedColor', e.target.value)}><option value="">Renk</option>{COLOR_OPTIONS.map(c=><option key={c} value={c}>{c}</option>)}</select>}
                                    </div>
                                </div>
                                {!isEditable ? (
                                    <span className="w-full text-center text-red-600 font-bold block bg-transparent text-[9px] leading-tight">{item.note}</span>
                                ) : (
                                    <input type="text" className="w-full text-center text-red-600 font-bold bg-transparent outline-none text-[9px]" placeholder="NOT" value={item.note || ""} onChange={(e) => handleItemUpdate(globalIndex, 'note', e.target.value)} />
                                )}
                            </div>
                        </div>
                        {isEditable && <button onClick={() => handleLocalRemove(globalIndex)} className="no-print absolute top-0 right-0 bg-red-500 text-white w-5 h-5 flex items-center justify-center text-xs">X</button>}
                    </div>
                )})}
                </div>
                {(pageIndex === pages.length - 1) && <div className="footer-summary text-xs font-bold flex justify-between border-t-2 border-black pt-2 text-black"><div>TOPLAM ADET: {orderStats.totalQty}</div><div>TOPLAM GRAM: {orderStats.totalGr.toFixed(2)} gr</div></div>}
            </div>
            ))}
            {isEditable && (
                <div className="no-print mt-4 mb-8 flex justify-center w-full">
                    <button 
                        onClick={() => {
                            setEditableItems(prev => {
                                const currentLen = prev.length;
                                const pageLimit = 12;
                                let addCount = 0;
                                
                                const remainder = currentLen % pageLimit;
                                
                                if (remainder === 0) {
                                    addCount = pageLimit;
                                } else {
                                    addCount = pageLimit - remainder;
                                }
                                
                                const newItems = Array.from({ length: addCount }).map((_, i) => ({ 
                                    code: "", quantity: 1, gram: "", selectedSize: "", selectedKarat: "", selectedColor: "", note: "", imageUrl: logoUrl, _tempId: `manual_added_${Date.now()}_${i}` 
                                }));
                                
                                return [...prev, ...newItems];
                            });
                        }} 
                        className="bg-white hover:bg-stone-100 text-ink-500 p-3 rounded-full shadow-soft border border-stone-200 transition-colors"
                        title="Sayfayı Doldur / Yeni Sayfa Ekle"
                    >
                        <Plus size={32} />
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default OrderPreviewModal;