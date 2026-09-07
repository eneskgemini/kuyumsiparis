import React, { useState } from 'react';
import { Folder, ChevronDown, ChevronRight } from 'lucide-react';

const CollapsibleSection = ({ title, count, children, defaultOpen = false, level = 0 }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className={`bg-white dark:bg-ink-900 ${level > 0 ? 'ml-4 border-l border-stone-200 dark:border-ink-700' : 'mb-2 rounded-xl border border-stone-200 dark:border-ink-700 overflow-hidden'}`}>
            <button onClick={() => setIsOpen(!isOpen)} className={`w-full flex justify-between items-center p-3.5 transition-colors ${isOpen ? 'bg-stone-50 dark:bg-ink-800' : 'hover:bg-stone-50 dark:hover:bg-ink-800'}`}>
                <div className="flex items-center gap-2.5 font-bold text-ink-700 dark:text-ink-200">
                    <Folder size={18} className={isOpen ? 'text-gold-500' : 'text-ink-300 dark:text-ink-500'}/>
                    <span className={level === 0 ? "text-sm" : "text-xs text-ink-600 dark:text-ink-300"}>{title}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[11px] bg-stone-100 dark:bg-ink-800 text-ink-500 dark:text-ink-400 font-bold px-2 py-0.5 rounded-full border border-stone-200 dark:border-ink-700">{count}</span>
                    {isOpen ? <ChevronDown size={15} className="text-ink-400 dark:text-ink-500"/> : <ChevronRight size={15} className="text-ink-400 dark:text-ink-500"/>}
                </div>
            </button>
            {isOpen && <div className={`p-2 ${level === 0 ? 'bg-stone-50/40 dark:bg-ink-800/40' : ''} animate-slide-down`}>{children}</div>}
        </div>
    );
};

export default CollapsibleSection;
