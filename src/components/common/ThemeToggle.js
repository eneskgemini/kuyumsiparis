import React, { useState, useEffect, useCallback } from 'react';
import { Sun, Moon } from 'lucide-react';

const STORAGE_KEY = 'sahra-theme';

export const getInitialTheme = () => {
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored === 'dark' || stored === 'light') return stored;
    } catch (e) { /* localStorage unavailable */ }
    try {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    } catch (e) { /* matchMedia unavailable */ }
    return 'light';
};

const applyTheme = (theme) => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
};

const ThemeToggle = ({ className = "" }) => {
    const [theme, setTheme] = useState(getInitialTheme);

    useEffect(() => {
        applyTheme(theme);
        try { window.localStorage.setItem(STORAGE_KEY, theme); } catch (e) { /* ignore */ }
    }, [theme]);

    const toggle = useCallback(() => setTheme(prev => (prev === 'dark' ? 'light' : 'dark')), []);

    return (
        <button
            onClick={toggle}
            title={theme === 'dark' ? 'Aydınlık moda geç' : 'Karanlık moda geç (gözü yormasın)'}
            aria-label="Tema değiştir"
            className={`no-print w-10 h-10 rounded-full flex items-center justify-center bg-stone-100 hover:bg-stone-200 text-ink-600 dark:bg-ink-800 dark:hover:bg-ink-700 dark:text-gold-400 border border-stone-200 dark:border-ink-700 shadow-soft transition-colors ${className}`}
        >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
    );
};

export default ThemeToggle;
