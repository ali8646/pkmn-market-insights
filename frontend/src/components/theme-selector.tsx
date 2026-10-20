import { useEffect, useRef, useState } from 'react';

export type ThemeId = 'obsidian' | 'ember' | 'masterball' | 'silph';

interface ThemeOption {
    id: ThemeId;
    name: string;
    description: string;
    accentColor: string;
}

const themes: ThemeOption[] = [
    {
        id: 'obsidian',
        name: 'Obsidian',
        description: 'Deep midnight dark with emerald accents',
        accentColor: '#70d6a0',
    },
    {
        id: 'ember',
        name: 'Charizard Ember',
        description: 'Volcanic charcoal with warm flame highlights',
        accentColor: '#f97316',
    },
    {
        id: 'masterball',
        name: 'Master Ball',
        description: 'Cosmic indigo with psychic violet accents',
        accentColor: '#a855f7',
    },
    {
        id: 'silph',
        name: 'Silph Co. Light',
        description: 'Minimalist clean paper light mode',
        accentColor: '#0284c7',
    },
];

export default function ThemeSelector() {
    const [currentTheme, setCurrentTheme] = useState<ThemeId>('obsidian');
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        try {
            const savedTheme = window.localStorage.getItem('cardsight-theme') as ThemeId | null;
            if (savedTheme && themes.some((t) => t.id === savedTheme)) {
                setCurrentTheme(savedTheme);
                document.documentElement.setAttribute('data-theme', savedTheme);
            } else {
                document.documentElement.setAttribute('data-theme', 'obsidian');
            }
        } catch {
            // localStorage unavailable
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const selectTheme = (themeId: ThemeId) => {
        setCurrentTheme(themeId);
        document.documentElement.setAttribute('data-theme', themeId);
        try {
            window.localStorage.setItem('cardsight-theme', themeId);
        } catch {
            // ignore
        }
        setIsOpen(false);
    };

    const activeTheme = themes.find((t) => t.id === currentTheme) ?? themes[0];

    return (
        <div className="theme-selector-wrap" ref={dropdownRef}>
            <button
                type="button"
                className="theme-selector-trigger"
                onClick={() => setIsOpen((prev) => !prev)}
                aria-label={`Current theme: ${activeTheme.name}. Click to change theme.`}
                aria-expanded={isOpen}
            >
                <span
                    className="theme-color-dot"
                    style={{ backgroundColor: activeTheme.accentColor }}
                    aria-hidden="true"
                />
                <span className="theme-trigger-label">{activeTheme.name}</span>
                <span className="theme-trigger-arrow" aria-hidden="true">▾</span>
            </button>

            {isOpen && (
                <div className="theme-dropdown-menu" role="menu">
                    <div className="theme-dropdown-header">Select Theme</div>
                    {themes.map((theme) => {
                        const isSelected = theme.id === currentTheme;
                        return (
                            <button
                                key={theme.id}
                                type="button"
                                className={`theme-dropdown-item${isSelected ? ' active' : ''}`}
                                onClick={() => selectTheme(theme.id)}
                                role="menuitem"
                            >
                                <span
                                    className="theme-item-swatch"
                                    style={{ backgroundColor: theme.accentColor }}
                                    aria-hidden="true"
                                />
                                <div className="theme-item-text">
                                    <span className="theme-item-name">{theme.name}</span>
                                    <span className="theme-item-desc">{theme.description}</span>
                                </div>
                                {isSelected && <span className="theme-item-check" aria-hidden="true">✓</span>}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
