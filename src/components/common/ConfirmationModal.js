import React from 'react';
import { Trash } from 'lucide-react';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[400] bg-ink-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="card p-6 max-w-sm w-full animate-zoom-in">
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-12 h-12 bg-red-50 dark:bg-red-950/40 rounded-full flex items-center justify-center mb-4 text-red-600 dark:text-red-400">
                        <Trash size={22} />
                    </div>
                    <h3 className="text-lg font-bold text-ink-900 dark:text-ink-100 mb-1.5">{title}</h3>
                    <p className="text-ink-500 dark:text-ink-400 text-sm">{message}</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={onClose} className="btn-secondary flex-1">Vazgeç</button>
                    <button onClick={onConfirm} className="btn-danger flex-1">Evet, Sil</button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
