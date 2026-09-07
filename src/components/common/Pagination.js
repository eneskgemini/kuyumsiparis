import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-center gap-3 py-4">
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-lg border border-stone-200 dark:border-ink-700 bg-white dark:bg-ink-900 hover:bg-stone-50 dark:hover:bg-ink-800 hover:border-stone-300 dark:hover:border-ink-600 disabled:opacity-40 disabled:cursor-not-allowed text-ink-600 dark:text-ink-300 transition-colors"><ChevronLeft size={18} /></button>
            <span className="text-xs font-bold text-ink-500 dark:text-ink-400 tabular-nums">Sayfa {currentPage} / {totalPages}</span>
            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-lg border border-stone-200 dark:border-ink-700 bg-white dark:bg-ink-900 hover:bg-stone-50 dark:hover:bg-ink-800 hover:border-stone-300 dark:hover:border-ink-600 disabled:opacity-40 disabled:cursor-not-allowed text-ink-600 dark:text-ink-300 transition-colors"><ChevronRight size={18} /></button>
        </div>
    );
};

export default Pagination;
