(() => {
    'use strict';

    const getStoredTheme = () => localStorage.getItem('theme');

    const getPreferredTheme = () => {
        const storedTheme = getStoredTheme();
        if (storedTheme) {
            return storedTheme;
        }

        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    const setTheme = (theme) => {
        if (theme === 'auto') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-bs-theme', systemTheme);
        } else {
            document.documentElement.setAttribute('data-bs-theme', theme);
        }
    };

    setTheme(getPreferredTheme());
})();
