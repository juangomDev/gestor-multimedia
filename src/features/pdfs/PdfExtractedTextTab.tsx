import React, { useDeferredValue, useMemo, useState } from 'react';
import { AlertTriangle, FileSearch, Search } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import type { PdfExtractedTextResponse } from '../../services/pdfsService';
import styles from './PdfViewerDialog.module.css';

/**
 * Propiedades de la pestaña de auditoría de texto extraído de `PdfViewerDialog`.
 */
export interface PdfExtractedTextTabProps {
  /** Código corto del PDF consultado. */
  shortCode: string;
  /** Indica si el documento viene marcado como escaneado por el backend. */
  isScanned?: boolean;
  /** Datos de texto extraído (`GET /p/:shortCode?format=text`). */
  data: PdfExtractedTextResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  /** Salta directamente a la página seleccionada en la pestaña **Documento**. */
  onJumpToPage: (pageNumber: number) => void;
}

/**
 * Panel de auditoría de texto extraído por página (`?format=text`), con alerta preventiva
 * para documentos `isScanned`, filtro en vivo (`useDeferredValue`) y salto rápido al binario.
 */
export const PdfExtractedTextTab: React.FC<PdfExtractedTextTabProps> = React.memo(({
  shortCode,
  isScanned = false,
  data,
  isLoading,
  isError,
  onJumpToPage,
}) => {
  const [textFilter, setTextFilter] = useState('');
  const deferredFilter = useDeferredValue(textFilter);

  const pages = useMemo(() => data?.pages ?? [], [data?.pages]);

  const filteredPages = useMemo(() => {
    const q = deferredFilter.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter((p) => (p.text ?? '').toLowerCase().includes(q));
  }, [pages, deferredFilter]);

  const totalExtractedChars = useMemo(
    () => pages.reduce((sum, p) => sum + (p.charCount ?? (p.text ?? '').trim().length), 0),
    [pages]
  );

  const looksScanned = Boolean(
    isScanned || (!isLoading && pages.length > 0 && totalExtractedChars === 0)
  );

  return (
    <>
      {looksScanned ? (
        <div className={styles.scannedAlert} role="alert" data-testid="pdf-scanned-warning">
          <AlertTriangle size={15} aria-hidden="true" />
          <span>
            Documento marcado como <strong>escaneado</strong> o sin texto seleccionable. El
            asistente RAG usará la ficha de metadatos (<code>title</code>, <code>summary</code>,{' '}
            <code>keywords</code>) para indexarlo.
          </span>
        </div>
      ) : null}

      <div className={styles.textHeader}>
        <div className={styles.searchWrap}>
          <Search size={13} className={styles.searchIcon} aria-hidden="true" />
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Buscar en el texto extraído..."
            value={textFilter}
            onChange={(e) => setTextFilter(e.target.value)}
            aria-label="Filtrar páginas de texto extraído"
          />
        </div>
        <span className={styles.metaText}>
          {filteredPages.length} de {pages.length} pág. · {totalExtractedChars} caracteres
        </span>
      </div>

      <div className={styles.textPane}>
        {isLoading ? (
          <Skeleton variant="card" height={150} />
        ) : isError ? (
          <div className={styles.stateBox}>
            No se pudo obtener el texto extraído para <code>p/{shortCode}</code>.
          </div>
        ) : filteredPages.length > 0 ? (
          filteredPages.map((page) => (
            <article key={page.pageNumber} className={styles.pageCard}>
              <div className={styles.pageHeaderRow}>
                <span className={styles.pageHeading}>
                  Página {page.pageNumber} · {page.charCount ?? (page.text ?? '').trim().length} caracteres
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<FileSearch size={13} />}
                  onClick={() => onJumpToPage(page.pageNumber)}
                >
                  Ver en documento
                </Button>
              </div>
              <p className={styles.pageBody}>
                {(page.text ?? '').trim() || '(Sin texto seleccionable en esta página)'}
              </p>
            </article>
          ))
        ) : (
          <div className={styles.stateBox}>
            {deferredFilter
              ? `No hay coincidencias para "${deferredFilter}" en el texto extraído.`
              : 'Este documento no contiene texto indexado (posible PDF escaneado).'}
          </div>
        )}
      </div>
    </>
  );
});
