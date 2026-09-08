import React, { useEffect, useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Save } from 'lucide-react';
import { db } from '../../config/firebase';
import { appId } from '../../utils/constants';
import { useCompanyInfo } from '../../hooks/useCompanyInfo';

const AdminCompanyInfoManager = ({ setNotification }) => {
    const companyInfo = useCompanyInfo();
    const [form, setForm] = useState(companyInfo);
    const [saving, setSaving] = useState(false);

    // Firestore'dan gelen canlı veriyi forma yansıt (ilk yükleme / başka bir
    // yerden değiştirilirse).
    useEffect(() => { setForm(companyInfo); }, [companyInfo]);

    const handleChange = (field, value) => setForm(prev => Object.assign({}, prev, { [field]: value }));

    const handleSave = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'company'), Object.assign({}, form, { updatedAt: serverTimestamp() }), { merge: true });
            setNotification({ type: 'success', message: 'Firma bilgileri kaydedildi' });
        } catch (e) {
            setNotification({ type: 'error', message: 'Kaydedilemedi: ' + e.message });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="card overflow-hidden">
            <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="field-label">Firma Adı</label>
                        <input type="text" className="field" value={form.name || ''} onChange={(e) => handleChange('name', e.target.value)} placeholder="SAHRA" />
                    </div>
                    <div>
                        <label className="field-label">Alt Başlık</label>
                        <input type="text" className="field" value={form.subtitle || ''} onChange={(e) => handleChange('subtitle', e.target.value)} placeholder="KUYUMCULUK" />
                    </div>
                    <div>
                        <label className="field-label">Telefon</label>
                        <input type="text" className="field" value={form.phone || ''} onChange={(e) => handleChange('phone', e.target.value)} placeholder="05xx xxx xx xx" />
                    </div>
                    <div>
                        <label className="field-label">Vergi No</label>
                        <input type="text" className="field" value={form.taxNo || ''} onChange={(e) => handleChange('taxNo', e.target.value)} placeholder="Vergi numarası" />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="field-label">Adres</label>
                        <input type="text" className="field" value={form.address || ''} onChange={(e) => handleChange('address', e.target.value)} placeholder="Firma adresi" />
                    </div>
                </div>
                <p className="text-[11px] text-ink-400 dark:text-ink-500">Firma adı ve alt başlık sipariş belgesinin (yazdırma/PDF) üst kısmında görünür. Telefon veya adres girersen, başlığın altında küçük bir satırda gösterilir.</p>
                <button onClick={handleSave} disabled={saving} className="btn-primary !py-2.5"><Save size={15}/> {saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
            </div>
        </div>
    );
};

export default AdminCompanyInfoManager;
