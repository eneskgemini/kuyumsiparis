import React, { useState, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, TrendingUp, Activity, Hammer } from 'lucide-react';
import { parseGram } from '../../utils/helpers';

const SalesCalendar = ({ orders, selectedDate, onDateChange, onViewOrder }) => {
    const currentDate = selectedDate || new Date();
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const startDay = firstDay === 0 ? 6 : firstDay - 1;
    const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    const [selectedDayDetail, setSelectedDayDetail] = useState(null);

    const salesData = useMemo(() => {
        const data = {};
        if (!orders) return data;
        orders.forEach(order => {
            if (order.status === 'delivered' && order.createdAt && order.createdAt.seconds) {
                const date = new Date(order.createdAt.seconds * 1000);
                if (date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear()) {
                    const day = date.getDate();
                    if (!data[day]) data[day] = { count: 0, total: 0, orders: [] };
                    data[day].count += 1;
                    let gram = 0;
                    if(order.items) order.items.forEach(i => gram += (parseGram(i.gram) * (parseInt(i.quantity) || 1)));
                    data[day].total += gram;
                    data[day].orders.push({ name: order.customerName, gram: gram.toFixed(2), order });
                }
            }
        });
        return data;
    }, [orders, currentDate]);

    const monthlyTotalGram = useMemo(() => Object.values(salesData).reduce((acc, day) => acc + day.total, 0).toFixed(2), [salesData]);
    const changeMonth = (dir) => {
        if (onDateChange) { onDateChange(new Date(currentDate.getFullYear(), currentDate.getMonth() + dir, 1)); }
        setSelectedDayDetail(null);
    };

    const totalCells = startDay + daysInMonth;
    const totalRows = Math.ceil(totalCells / 7);

    const renderDays = () => {
        const days = [];
        for (let i = 0; i < startDay; i++) days.push(<div key={`empty-${i}`} className="h-full bg-stone-50/50 dark:bg-ink-800/40 border border-stone-100 dark:border-ink-800"></div>);
        for (let d = 1; d <= daysInMonth; d++) {
            const hasSale = salesData[d];
            const isSelected = selectedDayDetail && selectedDayDetail.day === d;
            const detailObj = hasSale ? Object.assign({ day: d }, hasSale) : null;
            // Sağ kenara yakın günlerde (Cum/Cmt/Paz) kutunun ekran dışına taşmaması için sola doğru aç
            const columnIndex = (startDay + d - 1) % 7;
            const openToLeft = columnIndex >= 4;
            // Takvimin alt sıralarındaki günlerde kutu aşağı açılırsa ekranın
            // altından taşıp görünmez oluyordu; son 2 sırada yukarı doğru aç.
            const rowIndex = Math.floor((startDay + d - 1) / 7);
            const openUpward = rowIndex >= totalRows - 2;

            days.push(
                <div key={d} onClick={() => hasSale ? ((selectedDayDetail && selectedDayDetail.day === d) ? setSelectedDayDetail(null) : setSelectedDayDetail(detailObj)) : null}
                    className={`relative h-full border border-stone-100 dark:border-ink-800 p-1 flex flex-col justify-between transition-colors cursor-pointer ${hasSale ? (isSelected ? 'bg-emerald-100 ring-2 ring-emerald-500' : 'bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100') : 'bg-white dark:bg-ink-900 hover:bg-stone-50 dark:hover:bg-ink-800'}`}>
                    <div className="flex justify-between items-start"><span className={`text-xs font-bold ${hasSale ? 'text-emerald-700 dark:text-emerald-400' : 'text-ink-300 dark:text-ink-500'}`}>{d}</span>{hasSale && <span className="w-2 h-2 bg-emerald-500 rounded-full shrink-0"></span>}</div>
                    {hasSale && <div className="text-[10px] text-right text-ink-500 dark:text-ink-400 font-medium leading-tight truncate"><div>{hasSale.count} Teslim</div><div className="text-emerald-600 dark:text-emerald-400 font-bold">{hasSale.total.toFixed(1)}gr</div></div>}
                    {isSelected && (
                        <div onClick={(e) => e.stopPropagation()} className={`absolute z-[60] bg-white dark:bg-ink-900 rounded-2xl shadow-lift border border-gold-200 dark:border-gold-900/40 w-64 p-4 animate-zoom-in cursor-default ${openToLeft ? 'right-0' : 'left-0'} ${openUpward ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
                            <h4 className="font-bold mb-2 text-ink-900 dark:text-ink-100">{d} {monthNames[currentDate.getMonth()]}</h4>
                            <div className="max-h-48 overflow-y-auto custom-scrollbar -mr-1 pr-1">
                                {detailObj.orders.map((o,i)=>(
                                    <button key={i} onClick={() => { if (onViewOrder) onViewOrder(o.order); setSelectedDayDetail(null); }} className="w-full flex justify-between text-xs border-b border-stone-100 dark:border-ink-800 py-1.5 hover:bg-stone-50 dark:hover:bg-ink-800 rounded transition-colors text-left px-1 -mx-1">
                                        <span className="capitalize text-ink-600 dark:text-ink-300 truncate">{o.name ? o.name.toLowerCase() : ""}</span>
                                        <span className="font-bold text-ink-900 dark:text-ink-100 shrink-0 ml-2">{o.gram}gr</span>
                                    </button>
                                ))}
                            </div>
                            <button onClick={()=>setSelectedDayDetail(null)} className="mt-3 w-full bg-stone-100 dark:bg-ink-800 hover:bg-stone-200 dark:hover:bg-ink-700 text-xs py-2 font-bold rounded-lg text-ink-600 dark:text-ink-300 transition-colors">Kapat</button>
                        </div>
                    )}
                </div>
            );
        }
        return days;
    };

    return (
        <div className="card overflow-visible relative h-full flex flex-col min-h-0">
            <div className="p-3 bg-stone-50 dark:bg-ink-800 border-b border-stone-200 dark:border-ink-700 flex justify-between items-center rounded-t-2xl shrink-0">
                <h3 className="font-bold text-ink-700 dark:text-ink-200 flex items-center gap-2 text-sm"><Calendar size={17} className="text-gold-500"/> Satış Takvimi</h3>
                <div className="flex items-center gap-2"><button onClick={() => changeMonth(-1)} className="p-1 rounded-lg hover:bg-stone-200 dark:hover:bg-ink-700 text-ink-500 dark:text-ink-400"><ChevronLeft size={18}/></button><span className="text-sm font-bold w-32 text-center text-ink-800 dark:text-ink-200">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span><button onClick={() => changeMonth(1)} className="p-1 rounded-lg hover:bg-stone-200 dark:hover:bg-ink-700 text-ink-500 dark:text-ink-400"><ChevronRight size={18}/></button></div>
            </div>
            <div className="grid grid-cols-7 text-center text-[11px] font-bold text-ink-400 dark:text-ink-500 bg-stone-50 dark:bg-ink-800 py-1.5 border-b border-stone-200 dark:border-ink-700 shrink-0"><div>Pzt</div><div>Sal</div><div>Çar</div><div>Per</div><div>Cum</div><div>Cmt</div><div>Paz</div></div>
            <div className="grid grid-cols-7 relative flex-1 min-h-0" style={{ gridTemplateRows: `repeat(${totalRows}, minmax(0, 1fr))` }}>{renderDays()}</div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border-t border-emerald-100 dark:border-emerald-900/40 flex justify-between items-center rounded-b-2xl shrink-0"><div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400"><TrendingUp size={19} /><span className="font-bold text-sm">Bu Ay Toplam</span></div><div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{monthlyTotalGram} gr</div></div>
        </div>
    );
};

const MonthlyPerformanceView = ({ orders, selectedDate }) => {
    const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    const currentDate = selectedDate || new Date();

    const monthlyStats = useMemo(() => {
        let totalGram = 0;
        let orderCount = 0;
        const categoryStats = {};

        orders.forEach(order => {
            if(order.status === 'delivered' && order.createdAt && order.createdAt.seconds) {
                const date = new Date(order.createdAt.seconds * 1000);
                if (date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear()) {
                    orderCount += 1;
                    if(order.items) {
                        order.items.forEach(i => {
                            const gram = (parseGram(i.gram) * (parseInt(i.quantity) || 1));
                            totalGram += gram;
                            const cat = i.category || 'Diğer';
                            if (!categoryStats[cat]) categoryStats[cat] = { count: 0, gram: 0 };
                            categoryStats[cat].count += (parseInt(i.quantity) || 1);
                            categoryStats[cat].gram += gram;
                        });
                    }
                }
            }
        });

        return { totalGram, orderCount, categoryStats };
    }, [orders, currentDate]);

    return (
        <div className="card overflow-hidden h-full flex flex-col min-h-0">
            <div className="p-3 bg-stone-50 dark:bg-ink-800 border-b border-stone-200 dark:border-ink-700 shrink-0">
                <h3 className="font-bold text-ink-700 dark:text-ink-200 flex items-center gap-2 text-sm">
                    <Activity size={17} className="text-gold-500"/>
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()} Performansı
                </h3>
            </div>
            <div className="p-4 md:p-6 flex-1 min-h-0 flex flex-col gap-3 md:gap-4">
                <div className="grid grid-cols-2 gap-3 md:gap-4 shrink-0">
                    <div className="bg-gold-50 dark:bg-gold-950/20 p-3 rounded-xl border border-gold-100 dark:border-gold-900/30 text-center">
                        <div className="text-gold-700 dark:text-gold-400 text-[11px] font-bold uppercase mb-1 tracking-wide">Teslim Edilen Sipariş</div>
                        <div className="text-2xl md:text-3xl font-bold text-gold-800 dark:text-gold-400">{monthlyStats.orderCount}</div>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-center">
                        <div className="text-emerald-600 dark:text-emerald-400 text-[11px] font-bold uppercase mb-1 tracking-wide">Toplam Teslimat</div>
                        <div className="text-2xl md:text-3xl font-bold text-emerald-800 dark:text-emerald-400">{monthlyStats.totalGram.toFixed(2)} <span className="text-sm">gr</span></div>
                    </div>
                </div>

                <div className="flex-1 min-h-0 flex flex-col border-t border-stone-100 dark:border-ink-800 pt-3">
                    <h4 className="font-bold text-ink-600 dark:text-ink-300 text-sm mb-3 shrink-0">Kategori Dağılımı</h4>
                    <div className="space-y-3 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
                    {Object.entries(monthlyStats.categoryStats).length > 0 ? (
                        Object.entries(monthlyStats.categoryStats)
                        .sort((a, b) => b[1].gram - a[1].gram)
                        .map(([cat, stats]) => (
                            <div key={cat} className="flex items-center justify-between text-sm border-b border-stone-100 dark:border-ink-800 pb-2">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-ink-300"></span>
                                    <span className="font-medium text-ink-700 dark:text-ink-200">{cat}</span>
                                    <span className="text-xs text-ink-400 dark:text-ink-500">({stats.count} adet)</span>
                                </div>
                                <div className="font-bold text-ink-900 dark:text-ink-100">{stats.gram.toFixed(2)} gr</div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-ink-400 dark:text-ink-500 py-4 text-sm italic">Bu ay henüz teslimat yok.</div>
                    )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Siparişlerdeki "Üretimde" (preparing) aşamasındaki siparişlerin canlı özeti:
// kaç sipariş üretimde ve toplam kaç gram mal üretimde bekliyor. Ayrıca her
// siparişin kendi gramını da tek tek listeler. Ayrı bir "atölye" veri kaynağı
// yok — doğrudan bu sayfaya zaten prop olarak gelen `orders` verisi kullanılıyor.
const ProductionSummary = ({ orders, onViewOrder }) => {
    const orderGram = (order) => (order.items || []).reduce((acc, i) => acc + (parseGram(i.gram) * (parseInt(i.quantity) || 1)), 0);
    const productionOrders = useMemo(() => (orders || []).filter(o => o.status === 'preparing'), [orders]);
    const totalGram = useMemo(() => productionOrders.reduce((acc, o) => acc + orderGram(o), 0), [productionOrders]);

    return (
        <div className="card overflow-hidden h-full flex flex-col min-h-0">
            <div className="p-3 bg-stone-50 dark:bg-ink-800 border-b border-stone-200 dark:border-ink-700 shrink-0">
                <h3 className="font-bold text-ink-700 dark:text-ink-200 flex items-center gap-2 text-sm">
                    <Hammer size={17} className="text-gold-500"/> Üretimdeki Siparişler
                </h3>
            </div>
            <div className="p-4 flex-1 min-h-0 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3 shrink-0">
                    <div className="bg-gold-50 dark:bg-gold-950/20 p-4 rounded-xl border border-gold-100 dark:border-gold-900/30 text-center">
                        <div className="text-gold-700 dark:text-gold-400 text-[11px] font-bold uppercase mb-1 tracking-wide">Üretimde</div>
                        <div className="text-3xl font-bold text-gold-800 dark:text-gold-400">{productionOrders.length}</div>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-center">
                        <div className="text-emerald-600 dark:text-emerald-400 text-[11px] font-bold uppercase mb-1 tracking-wide">Üretimdeki Gram</div>
                        <div className="text-3xl font-bold text-emerald-800 dark:text-emerald-400">{totalGram.toFixed(2)} <span className="text-sm">gr</span></div>
                    </div>
                </div>

                {productionOrders.length > 0 ? (
                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar divide-y divide-stone-100 dark:divide-ink-800 border-t border-stone-100 dark:border-ink-800 pr-1">
                        {productionOrders.map(o => (
                            <button key={o.id} onClick={() => onViewOrder && onViewOrder(o)} className="w-full flex items-center justify-between py-2 text-sm hover:bg-stone-50 dark:hover:bg-ink-800 rounded-lg px-1.5 -mx-1.5 transition-colors text-left">
                                <span className="capitalize text-ink-600 dark:text-ink-300 truncate">{o.customerName ? o.customerName.toLowerCase() : 'İsimsiz'}</span>
                                <span className="font-bold text-ink-900 dark:text-ink-100 shrink-0 ml-2">{orderGram(o).toFixed(2)} gr</span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 min-h-0 flex items-center justify-center text-center text-ink-400 dark:text-ink-500 text-sm italic">Şu an üretimde sipariş yok.</div>
                )}
            </div>
        </div>
    );
};

const AdminDashboard = ({ products, orders, dashboardDate, setDashboardDate, onViewOrder }) => {
    return (
        <div className="animate-slide-up h-full flex flex-col gap-4 min-h-0">
            <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-100 shrink-0">Özet ve Performans</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-[5] min-h-0">
                <SalesCalendar
                    orders={orders}
                    selectedDate={dashboardDate}
                    onDateChange={setDashboardDate}
                    onViewOrder={onViewOrder}
                />
                <ProductionSummary orders={orders} onViewOrder={onViewOrder} />
            </div>

            <div className="flex-[2] min-h-[300px]">
                <MonthlyPerformanceView
                    orders={orders}
                    selectedDate={dashboardDate}
                />
            </div>
        </div>
    );
};

export default AdminDashboard;