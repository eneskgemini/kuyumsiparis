import React, { useState, useMemo } from 'react';
import { Pencil, Plus, Minus, Check } from 'lucide-react';
import ConfirmationModal from '../common/ConfirmationModal';
import { ORDER_STAGES } from '../../utils/constants';
import { parseGram } from '../../utils/helpers';

const AdminOrderManager = ({ orders, onCreateNewOrder, onViewOrder, handleUpdateStatus, handleDeleteOrder }) => {
    const [activeStatusFilter, setActiveStatusFilter] = useState('new');
    const [isEditMode, setIsEditMode] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, orderId: null });

    const openDeleteModal = (id) => {
        setDeleteConfirmation({ isOpen: true, orderId: id });
    };

    const executeDelete = () => {
        if (deleteConfirmation.orderId) {
            handleDeleteOrder(deleteConfirmation.orderId);
            setDeleteConfirmation({ isOpen: false, orderId: null });
        }
    };

    const filteredOrders = useMemo(() => {
        if (activeStatusFilter === 'all') return orders;
        return orders.filter(o => o.status === activeStatusFilter);
    }, [orders, activeStatusFilter]);

    const statusCounts = useMemo(() => {
        const counts = { all: orders.length, new: 0, preparing: 0, ready: 0, delivered: 0 };
        orders.forEach(o => { if (counts[o.status] !== undefined) counts[o.status]++; });
        return counts;
    }, [orders]);

    return (
        <div className="h-full flex flex-col pb-4 animate-slide-up">
            <ConfirmationModal
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ isOpen: false, orderId: null })}
                onConfirm={executeDelete}
                title="Siparişi Sil"
                message="Bu listeyi kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
            />

            <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
                <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-100">Sipariş Yönetimi</h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-soft border transition-colors ${isEditMode ? 'bg-red-50 dark:bg-red-950/30 text-red-600 border-red-200 dark:border-red-900/40' : 'bg-white dark:bg-ink-900 text-ink-600 dark:text-ink-300 border-stone-200 dark:border-ink-700 hover:bg-stone-50 dark:hover:bg-ink-800'}`}
                    >
                        {isEditMode ? <Check size={16}/> : <Pencil size={16}/>}
                        {isEditMode ? 'Bitti' : 'Düzenle'}
                    </button>
                    <button onClick={onCreateNewOrder} className="btn-primary"><Plus size={16}/> Yeni Sipariş Oluştur</button>
                </div>
            </div>
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 pt-1 custom-scrollbar">
                    {Object.entries(ORDER_STAGES).map(([key, info]) => (
                        <button key={key} onClick={() => setActiveStatusFilter(key)} className={`px-4 py-2 rounded-full text-xs font-bold border whitespace-nowrap min-w-fit flex items-center gap-2 transition-colors ${activeStatusFilter === key ? 'bg-ink-900 text-white border-ink-900 shadow-soft' : 'bg-white dark:bg-ink-900 text-ink-600 dark:text-ink-300 border-stone-200 dark:border-ink-700 hover:bg-stone-50 dark:hover:bg-ink-800'}`}>
                            <info.icon size={14}/> {info.label} ({statusCounts[key]})
                        </button>
                    ))}
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredOrders.length === 0 && (
                    <div className="text-center py-14 text-ink-400 dark:text-ink-500 bg-stone-50 dark:bg-ink-800 rounded-xl border border-dashed border-stone-300 dark:border-ink-600 text-sm">
                        Şu an siparişimiz yok.
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredOrders.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).map(order => (
                        <div key={order.id} className="relative card p-5 hover:shadow-lift transition-shadow">
                            {(order.status === 'new' || isEditMode) && (
                                <button
                                    onClick={() => openDeleteModal(order.id)}
                                    className="absolute top-2 right-2 p-1.5 bg-red-50 dark:bg-red-950/30 text-red-600 rounded-full hover:bg-red-500 hover:text-white transition-colors z-10"
                                    title="Siparişi Sil"
                                >
                                    <Minus size={16}/>
                                </button>
                            )}
                            <div className="flex justify-between items-start mb-3 pr-8">
                                <div><h3 className="font-bold text-ink-900 dark:text-ink-100 text-base capitalize">{order.customerName}</h3><div className="text-xs text-ink-400 dark:text-ink-500 font-mono mt-0.5">{new Date(order.createdAt?.seconds * 1000).toLocaleString('tr-TR')}</div></div>
                                <div className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${ORDER_STAGES[order.status].color}`}>{ORDER_STAGES[order.status].label}</div>
                            </div>
                            <div className="bg-stone-50 dark:bg-ink-800 rounded-xl border border-stone-100 dark:border-ink-800 p-3 mb-4 space-y-2">
                                {(order.items || []).slice(0, 3).map((item, idx) => <div key={idx} className="flex justify-between items-center text-xs text-ink-600 dark:text-ink-300"><span className="font-bold">{item.code}</span><span>x{item.quantity}</span></div>)}
                                {(order.items || []).length > 3 && <div className="text-[10px] text-ink-400 dark:text-ink-500 italic text-center">+ {(order.items.length - 3)} diğer</div>}
                            </div>
                            <div className="flex justify-between items-center pt-3 border-t border-stone-100 dark:border-ink-800 mt-2">
                                <div className="font-bold text-ink-900 dark:text-ink-100 text-sm">{order.items ? order.items.reduce((acc, item) => acc + (parseGram(item.gram) * (parseInt(item.quantity) || 1)), 0).toFixed(2) : "0.00"} gr</div>
                                <div className="flex gap-2">
                                    {order.status === 'new' && (
                                        <button
                                            onClick={() => handleUpdateStatus(order.id, 'preparing')}
                                            className="px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-bold transition-colors shadow-sm"
                                        >
                                            Üretim
                                        </button>
                                    )}
                                    {order.status === 'preparing' && (
                                        <button
                                            onClick={() => handleUpdateStatus(order.id, 'ready')}
                                            className="px-3 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg text-xs font-bold transition-colors shadow-sm"
                                        >
                                            Hazır
                                        </button>
                                    )}
                                    {order.status === 'ready' && (
                                        <button
                                            onClick={() => handleUpdateStatus(order.id, 'delivered')}
                                            className="px-3 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-bold transition-colors shadow-sm"
                                        >
                                            Teslim
                                        </button>
                                    )}
                                    <button onClick={() => onViewOrder(order)} className="px-3 py-2 bg-stone-100 dark:bg-ink-800 text-ink-700 dark:text-ink-200 hover:bg-stone-200 dark:hover:bg-ink-700 rounded-lg text-xs font-bold transition-colors">Detay</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminOrderManager;
