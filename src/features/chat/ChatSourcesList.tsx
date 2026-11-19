import React, { useContext } from 'react';
import { useNavigate } from 'react-router';
import { FileText, Table2 } from 'lucide-react';
import { ShellContext } from '../shell/shellContextDef';
import { getSourceDisplayName, isPdfSource } from './chatHelpers';
import type { ChatSource } from '../../types/chat';
import styles from './ChatSourcesList.module.css';

/**
 * Propiedades del listado de citas clicables de Data Chat (`ChatSourcesList`).
 */
export interface ChatSourcesListProps {
  /** Fuentes tabulares o PDF citadas en una respuesta analítica. */
  sources: ChatSource[];
  /** Callback opcional ejecutado antes de abrir la cita (ej. cerrar el drawer público). */
  onSourceOpened?: () => void;
}

/**
 * Lista de citas documentales clicables:
 * - Tablas: navegan a `/tables/:shortCode` (Data Studio).
 * - PDFs: abren `PdfViewerDialog` directamente en la página exacta `pages[0]`.
 */
export const ChatSourcesList: React.FC<ChatSourcesListProps> = ({
  sources,
  onSourceOpened,
}) => {
  const navigate = useNavigate();
  const shell = useContext(ShellContext);

  if (!sources || sources.length === 0) return null;

  const handleOpenSource = (source: ChatSource) => {
    const pdf = isPdfSource(source);
    onSourceOpened?.();

    if (pdf) {
      const targetPage =
        Array.isArray(source.pages) && source.pages.length > 0 ? source.pages[0] : undefined;
      shell?.openShortCodePreview({
        type: 'pdf',
        shortCode: source.shortCode,
        page: targetPage,
      });
      return;
    }

    navigate(`/tables/${encodeURIComponent(source.shortCode)}`);
  };

  return (
    <div className={styles.wrap} data-testid="chat-sources-list">
      <span className={styles.heading}>Fuentes citadas ({sources.length})</span>
      <div className={styles.list}>
        {sources.map((source, idx) => {
          const pdf = isPdfSource(source);
          const name = getSourceDisplayName(source);
          const prefix = pdf ? 'p' : 't';
          const pagesLabel =
            pdf && Array.isArray(source.pages) && source.pages.length > 0
              ? source.pages.length === 1
                ? `pág. ${source.pages[0]}`
                : `págs. ${source.pages.join(', ')}`
              : null;

          return (
            <button
              key={`${source.shortCode}-${idx}`}
              type="button"
              className={styles.sourceChip}
              onClick={() => handleOpenSource(source)}
              data-testid={`chat-source-${source.shortCode}`}
            >
              <span
                className={`${styles.dot} ${pdf ? styles.dotPdf : styles.dotTable}`}
                aria-hidden="true"
              />
              {pdf ? (
                <FileText size={13} aria-hidden="true" />
              ) : (
                <Table2 size={13} aria-hidden="true" />
              )}
              <span className={styles.name} title={name}>
                {name}
              </span>
              <span className={styles.code}>
                {prefix}/{source.shortCode}
              </span>
              {pagesLabel ? <span className={styles.pages}>{pagesLabel}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};
