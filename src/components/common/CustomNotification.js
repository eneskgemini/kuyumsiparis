import React, { useEffect } from 'react';
import { Check, AlertTriangle, X } from 'lucide-react';

const CustomNotification = ({ type, message, onClose }) => {
  useEffect(() => {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
  }, [onClose]);

  const isSuccess = type === 'success';

  return (
    <div className="fixed top-5 right-5 z-[200] flex items-start gap-3 bg-white dark:bg-ink-900 rounded-2xl p-4 pr-3 shadow-lift border border-stone-200 dark:border-ink-700 animate-slide-in-right max-w-sm">
        <div className={`shrink-0 rounded-full p-2 ${isSuccess ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'}`}>
          {isSuccess ? <Check size={18} strokeWidth={3} /> : <AlertTriangle size={18} strokeWidth={3} />}
        </div>
        <div className="flex-1 pt-0.5">
           <h3 className={`text-sm font-bold ${isSuccess ? 'text-emerald-800 dark:text-emerald-400' : 'text-red-800 dark:text-red-400'}`}>{isSuccess ? 'Başarılı' : 'Hata'}</h3>
           <p className="text-ink-500 dark:text-ink-400 text-xs font-medium mt-0.5">{message}</p>
        </div>
        <button onClick={onClose} className="shrink-0 text-ink-300 hover:text-ink-600 dark:text-ink-500 dark:hover:text-ink-200 transition-colors p-1"><X size={15}/></button>
    </div>
  );
};

export default CustomNotification;
