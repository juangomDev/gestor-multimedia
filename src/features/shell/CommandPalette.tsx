import React, { useCallback, useDeferredValue, useMemo, useState } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { useNavigate } from 'react-router';
import { ArrowUpRight, Hash, Search } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/useAuth';
import { useShell } from './useShell';
import { useGlobalShortcut } from './useGlobalShortcut';
import { ShortCodeResolverForm } from './ShortCodeResolverForm';
import { buildCommandEntries } from './commandEntries';
import type { MediaCategory } from '../../types/media';
import styles from './CommandPalette.module.css';

type PaletteMode = 'search' | 'shortcode';

/**
 * Paleta rápida `⌘K` / `Ctrl+K` con apertura instantánea (cero retardo de animación),
 * listener global deduplicado (`client-event-listeners`), búsqueda en vivo del árbol de carpetas
 * y resolución directa "Abrir por `shortCode`" sin tocar `localStorage`.
 */
export const CommandPalette: React.FC = () => {
  const { isAdmin, isManager } = useAuth();
  const {
    allFolders,
    isCommandPaletteOpen,
    openCommandPalette,
    closeCommandPalette,
    openShortCodePreview,
  } = useShell();
  const navigate = useNavigate();

  const [mode, setMode] = useState<PaletteMode>('search');
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  useGlobalShortcut('k', (event) => {
    event.preventDefault();
    if (isCommandPaletteOpen) {
      closeCommandPalette();
    } else {
      openCommandPalette();
    }
  });

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        closeCommandPalette();
        setQuery('');
        setSelectedIndex(0);
        setMode('search');
      }
    },
    [closeCommandPalette]
  );

  const openResourceByShortCode = useCallback(
    (kind: MediaCategory, rawCode: string) => {
      const cleanCode = rawCode.trim().replace(/^\/?(i|t|p)\//i, '');
      if (!cleanCode) return;

      handleOpenChange(false);
      if (kind === 'table') {
        navigate(`/tables/${encodeURIComponent(cleanCode)}`);
        return;
      }
      openShortCodePreview({ type: kind, shortCode: cleanCode });
    },
    [handleOpenChange, navigate, openShortCodePreview]
  );

  const entries = useMemo(
    () =>
      buildCommandEntries({
        allFolders,
        query: deferredQuery,
        isAdmin,
        isManager,
      }),
    [allFolders, deferredQuery, isAdmin, isManager]
  );

  const directCodeMatch = /^\/?(i|t|p)\/([a-zA-Z0-9_-]{2,})$/i.exec(query.trim());
  const clampedIndex = entries.length > 0 ? Math.min(selectedIndex, entries.length - 1) : 0;

  const selectPath = (targetPath: string) => {
    handleOpenChange(false);
    navigate(targetPath);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((prev) => (entries.length ? (prev + 1) % entries.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((prev) =>
        entries.length ? (prev - 1 + entries.length) % entries.length : 0
      );
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (directCodeMatch) {
        const p = directCodeMatch[1].toLowerCase();
        openResourceByShortCode(
          p === 'i' ? 'image' : p === 'p' ? 'pdf' : 'table',
          directCodeMatch[2]
        );
        return;
      }
      const selected = entries[clampedIndex];
      if (selected) selectPath(selected.targetPath);
    }
  };

  return (
    <RadixDialog.Root open={isCommandPaletteOpen} onOpenChange={handleOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={styles.overlay} />
        <RadixDialog.Content className={styles.content} aria-label="Paleta rápida de comandos">
          <RadixDialog.Title className="sr-only">Paleta rápida</RadixDialog.Title>
          <RadixDialog.Description className="sr-only">
            Busca carpetas o abre un recurso directamente mediante su shortCode.
          </RadixDialog.Description>

          <div className={styles.modeBar}>
            <div className={styles.modeTabs} role="tablist" aria-label="Modo de paleta">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'search'}
                className={`${styles.modeTab} ${mode === 'search' ? styles.modeTabActive : ''}`}
                onClick={() => setMode('search')}
              >
                Buscar en bóveda
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'shortcode'}
                className={`${styles.modeTab} ${mode === 'shortcode' ? styles.modeTabActive : ''}`}
                onClick={() => setMode('shortcode')}
              >
                Abrir por shortCode
              </button>
            </div>
            <span className={styles.escBadge}>ESC</span>
          </div>

          {mode === 'search' ? (
            <>
              <div className={styles.searchWrap}>
                <Search size={16} className={styles.searchIcon} aria-hidden="true" />
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Buscar carpetas, vistas o escribir t/codigo, i/codigo, p/codigo..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  onKeyDown={handleSearchKeyDown}
                  autoFocus
                  aria-label="Buscar en la paleta rápida"
                />
              </div>

              <div className={styles.results} role="listbox" aria-label="Resultados de búsqueda">
                {directCodeMatch ? (
                  <button
                    type="button"
                    role="option"
                    aria-selected="true"
                    className={`${styles.item} ${styles.itemSelected}`}
                    onClick={() => {
                      const p = directCodeMatch[1].toLowerCase();
                      openResourceByShortCode(
                        p === 'i' ? 'image' : p === 'p' ? 'pdf' : 'table',
                        directCodeMatch[2]
                      );
                    }}
                  >
                    <span className={styles.itemLeft}>
                      <Hash size={15} aria-hidden="true" />
                      <span className={styles.itemText}>
                        <span className={styles.itemTitle}>
                          Abrir código {directCodeMatch[1].toLowerCase()}/{directCodeMatch[2]}
                        </span>
                        <span className={styles.itemMeta}>Resolución directa sin caché local</span>
                      </span>
                    </span>
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </button>
                ) : entries.length === 0 ? (
                  <div className={styles.empty}>
                    Sin coincidencias para &ldquo;{query.trim()}&rdquo;. Cambia a &ldquo;Abrir por
                    shortCode&rdquo; para resolver un enlace directo.
                  </div>
                ) : (
                  entries.map((entry, idx) => (
                    <button
                      key={entry.id}
                      type="button"
                      role="option"
                      aria-selected={idx === clampedIndex}
                      className={`${styles.item} ${
                        idx === clampedIndex ? styles.itemSelected : ''
                      }`}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => selectPath(entry.targetPath)}
                    >
                      <span className={styles.itemLeft}>
                        {entry.icon}
                        <span className={styles.itemText}>
                          <span className={styles.itemTitle}>{entry.title}</span>
                          <span className={styles.itemMeta}>{entry.subtitle}</span>
                        </span>
                      </span>
                      {entry.badge ? (
                        <Badge artifactDot={entry.dot} mono>
                          {entry.badge}
                        </Badge>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <ShortCodeResolverForm
              onResolve={openResourceByShortCode}
              onCancel={() => handleOpenChange(false)}
            />
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
};
