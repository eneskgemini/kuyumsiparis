import React, { useState } from 'react';
import { Users, Tag, User, Store, ChevronDown, ChevronRight } from 'lucide-react';
import AdminUserManager from './AdminUserManager';
import AdminCategoryManager from './AdminCategoryManager';
import AdminCustomerManager from './AdminCustomerManager';
import AdminCompanyInfoManager from './AdminCompanyInfoManager';

const SECTIONS = [
    { key: 'users', label: 'Kullanıcı ve Personel Yönetimi', icon: Users, Component: AdminUserManager, extraProps: (props) => ({ currentUid: props.currentUid }) },
    { key: 'categories', label: 'Kategori ve Alt Kategori Yönetimi', icon: Tag, Component: AdminCategoryManager, extraProps: () => ({}) },
    { key: 'customers', label: 'Müşteriler', icon: User, Component: AdminCustomerManager, extraProps: () => ({}) },
    { key: 'company', label: 'Firma Bilgileri', icon: Store, Component: AdminCompanyInfoManager, extraProps: () => ({}) },
];

const AdminSettings = ({ setNotification, currentUid }) => {
    const [openSection, setOpenSection] = useState(null);

    const toggle = (key) => setOpenSection(prev => (prev === key ? null : key));

    return (
        <div className="space-y-6 animate-slide-up max-w-3xl">
            <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-100">Ayarlar</h2>

            <div className="space-y-3">
                {SECTIONS.map(({ key, label, icon: Icon, Component, extraProps }) => (
                    <div key={key}>
                        <button onClick={() => toggle(key)} className="w-full card p-4 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-ink-800 transition-colors">
                            <span className="font-bold text-ink-800 dark:text-ink-100 flex items-center gap-2 text-sm"><Icon size={17} className="text-gold-500"/> {label}</span>
                            {openSection === key ? <ChevronDown size={18} className="text-ink-400"/> : <ChevronRight size={18} className="text-ink-400"/>}
                        </button>
                        {openSection === key && <div className="mt-3"><Component setNotification={setNotification} {...extraProps({ currentUid })} /></div>}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminSettings;
