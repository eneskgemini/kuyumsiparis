import React, { useState, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, TrendingUp, Activity } from 'lucide-react';
import { parseGram } from '../../utils/helpers';

const SalesCalendar = ({ orders, selectedDate, onDateChange }) => {
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
                    data[day].orders.push({ name: order.customerName, gram: gram.toFixed(2) });
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

    const renderDays = () => {
        const days = [];
        for (let i = 0; i < startDay; i++) days.push(<div key={`empty-${i}`} className="h-20 bg-stone-50/50 dark:bg-ink-800/40 border border-stone-100 dark:border-ink-800"></div>);
        for (let d = 1; d <= daysInMonth; d++) {
            const hasSale = salesData[d];
            const isSelected = selectedDayDetail && selectedDayDetail.day === d;
            const detailObj = hasSale ? Object.assign({ day: d }, hasSale) : null;

            days.push(
                <div key={d} onClick={() => hasSale ? ((selectedDayDetail && selectedDayDetail.day === d) ? setSelectedDayDetail(null) : setSelectedDayDetail(detailObj)) : null}
                    className={`relative h-20 border border-stone-100 dark:border-ink-800 p-1 flex flex-col justify-between transition-colors cursor-pointer ${hasSale ? (isSelected ? 'bg-emerald-100 ring-2 ring-emerald-500' : 'bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100') : 'bg-white dark:bg-ink-900 hover:bg-stone-50 dark:hover:bg-ink-800'}`}>
                    <div className="flex justify-between items-start"><span className={`text-xs font-bold ${hasSale ? 'text-emerald-700 dark:text-emerald-400' : 'text-ink-300 dark:text-ink-500'}`}>{d}</span>{hasSale && <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>}</div>
                    {hasSale && <div className="text-[10px] text-right text-ink-500 dark:text-ink-400 font-medium leading-tight"><div>{hasSale.count} Teslim</div><div className="text-emerald-600 dark:text-emerald-400 font-bold">{hasSale.total.toFixed(1)}gr</div></div>}
                </div>
            );
        }
        return days;
    };

    return (
        <div className="card overflow-visible relative">
            <div className="p-4 bg-stone-50 dark:bg-ink-800 border-b border-stone-200 dark:border-ink-700 flex justify-between items-center rounded-t-2xl">
                <h3 className="font-bold text-ink-700 dark:text-ink-200 flex items-center gap-2 text-sm"><Calendar size={17} className="text-gold-500"/> Satış Takvimi</h3>
                <div className="flex items-center gap-2"><button onClick={() => changeMonth(-1)} className="p-1 rounded-lg hover:bg-stone-200 dark:hover:bg-ink-700 text-ink-500 dark:text-ink-400"><ChevronLeft size={18}/></button><span className="text-sm font-bold w-32 text-center text-ink-800 dark:text-ink-200">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span><button onClick={() => changeMonth(1)} className="p-1 rounded-lg hover:bg-stone-200 dark:hover:bg-ink-700 text-ink-500 dark:text-ink-400"><ChevronRight size={18}/></button></div>
            </div>
            <div className="grid grid-cols-7 text-center text-[11px] font-bold text-ink-400 dark:text-ink-500 bg-stone-50 dark:bg-ink-800 py-2 border-b border-stone-200 dark:border-ink-700"><div>Pzt</div><div>Sal</div><div>Çar</div><div>Per</div><div>Cum</div><div>Cmt</div><div>Paz</div></div>
            <div className="grid grid-cols-7 relative">{renderDays()}{selectedDayDetail && <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[60] bg-white dark:bg-ink-900 rounded-2xl shadow-lift border border-gold-200 dark:border-gold-900/40 w-64 p-4 animate-zoom-in"><h4 className="font-bold mb-2 text-ink-900 dark:text-ink-100">{selectedDayDetail.day} {monthNames[currentDate.getMonth()]}</h4>{selectedDayDetail.orders.map((o,i)=><div key={i} className="flex justify-between text-xs border-b border-stone-100 dark:border-ink-800 py-1"><span className="capitalize text-ink-600 dark:text-ink-300">{o.name ? o.name.toLowerCase() : ""}</span><span className="font-bold text-ink-900 dark:text-ink-100">{o.gram}gr</span></div>)}<button onClick={()=>setSelectedDayDetail(null)} className="mt-3 w-full bg-stone-100 dark:bg-ink-800 hover:bg-stone-200 dark:hover:bg-ink-700 text-xs py-2 font-bold rounded-lg text-ink-600 dark:text-ink-300 transition-colors">Kapat</button></div>}</div>
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border-t border-emerald-100 dark:border-emerald-900/40 flex justify-between items-center rounded-b-2xl"><div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400"><TrendingUp size={19} /><span className="font-bold text-sm">Bu Ay Toplam</span></div><div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{monthlyTotalGram} gr</div></div>
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
        <div className="card overflow-hidden h-full">
            <div className="p-4 bg-stone-50 dark:bg-ink-800 border-b border-stone-200 dark:border-ink-700">
                <h3 className="font-bold text-ink-700 dark:text-ink-200 flex items-center gap-2 text-sm">
                    <Activity size={17} className="text-gold-500"/>
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()} Performansı
                </h3>
            </div>
            <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gold-50 dark:bg-gold-950/20 p-4 rounded-xl border border-gold-100 dark:border-gold-900/30 text-center">
                        <div className="text-gold-700 dark:text-gold-400 text-[11px] font-bold uppercase mb-1 tracking-wide">Teslim Edilen Sipariş</div>
                        <div className="text-3xl font-bold text-gold-800 dark:text-gold-400">{monthlyStats.orderCount}</div>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-center">
                        <div className="text-emerald-600 dark:text-emerald-400 text-[11px] font-bold uppercase mb-1 tracking-wide">Toplam Teslimat</div>
                        <div className="text-3xl font-bold text-emerald-800 dark:text-emerald-400">{monthlyStats.totalGram.toFixed(2)} <span className="text-sm">gr</span></div>
                    </div>
                </div>

                <h4 className="font-bold text-ink-600 dark:text-ink-300 text-sm mb-3">Kategori Dağılımı</h4>
                <div className="space-y-3">
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
    );
};

const AdminDashboard = ({ products, orders, dashboardDate, setDashboardDate }) => {
    return (
        <div className="space-y-6 animate-slide-up h-full">
            <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-100">Özet ve Performans</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SalesCalendar
                    orders={orders}
                    selectedDate={dashboardDate}
                    onDateChange={setDashboardDate}
                />
                <MonthlyPerformanceView
                    orders={orders}
                    selectedDate={dashboardDate}
                />
            </div>
        </div>
    );
};

export default AdminDashboard;
