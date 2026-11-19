import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ThemeProvider } from './ThemeContext';
import { useTheme } from './useTheme';
import { resetThemeStorageCache, THEME_STORAGE_KEY } from './themeStorage';

type MediaChangeListener = (event: MediaQueryListEvent) => void;

function mockMatchMedia(initialDark: boolean) {
  let matches = initialDark;
  const listeners: MediaChangeListener[] = [];

  const mql = {
    get matches() {
      return matches;
    },
    media: '(prefers-color-scheme: dark)',
    addEventListener: vi.fn((_event: string, cb: MediaChangeListener) => {
      listeners.push(cb);
    }),
    removeEventListener: vi.fn((_event: string, cb: MediaChangeListener) => {
      const idx = listeners.indexOf(cb);
      if (idx >= 0) listeners.splice(idx, 1);
    }),
  };

  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mql)
  );

  return {
    setDark(nextDark: boolean) {
      matches = nextDark;
      listeners.forEach((fn) => fn({ matches: nextDark } as MediaQueryListEvent));
    },
  };
}

const ThemeProbe: React.FC = () => {
  const { preference, resolvedTheme, setPreference, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="pref">{preference}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button type="button" onClick={toggleTheme}>
        Toggle
      </button>
      <button type="button" onClick={() => setPreference('dark')}>
        Force Dark
      </button>
      <button type="button" onClick={() => setPreference('system')}>
        Follow System
      </button>
    </div>
  );
};

describe('ThemeContext & useTheme (Fase 1.1.4)', () => {
  beforeEach(() => {
    localStorage.clear();
    resetThemeStorageCache();
    document.documentElement.removeAttribute('data-theme');
    vi.restoreAllMocks();
  });

  it('sigue la preferencia del sistema por defecto y reacciona a cambios de matchMedia', () => {
    const media = mockMatchMedia(true);

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId('pref')).toHaveTextContent('system');
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    act(() => {
      media.setDark(false);
    });

    expect(screen.getByTestId('resolved')).toHaveTextContent('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('persiste cambios explícitos en localStorage y alterna entre claro y oscuro', () => {
    mockMatchMedia(false);

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId('resolved')).toHaveTextContent('light');

    fireEvent.click(screen.getByRole('button', { name: 'Toggle' }));
    expect(screen.getByTestId('pref')).toHaveTextContent('dark');
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    fireEvent.click(screen.getByRole('button', { name: 'Toggle' }));
    expect(screen.getByTestId('pref')).toHaveTextContent('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('lee el valor previamente persistido en localStorage al montar', () => {
    mockMatchMedia(false);
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId('pref')).toHaveTextContent('dark');
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
  });

  it('lanza error claro si useTheme se invoca fuera de ThemeProvider', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ThemeProbe />)).toThrow(/ThemeProvider/);
    errSpy.mockRestore();
  });
});
