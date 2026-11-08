import React from 'react';
import { Database, FileText, ExternalLink } from 'lucide-react';
import type { ChatSource } from '../../services/chatService';
import styles from './ChatComponents.module.css';

/**
 * Propiedades del componente `ChatSourcesList`.
 */
export interface ChatSourcesListProps {
  /** Lista de fuentes documentales (tablas o documentos PDF) citadas por el motor RAG. */
  sources: ChatSource[];
  /** Callback para abrir una tabla directamente en el Data Studio a pantalla completa. */
  onOpenInStudio?: (source: ChatSource) => void;
  /** Callback para abrir un documento PDF citado en el visor en la página exacta. */
  onOpenPdf?: (source: ChatSource, page?: number) => void;
}

/**
 * Renderiza las tarjetas de fuentes documentales (tablas y PDFs con páginas citadas)
 * utilizadas para fundamentar una respuesta analítica, con accesos directos al Data Studio o visor PDF.
 */
export const ChatSourcesList: React.FC<ChatSourcesListProps> = ({
  sources,
  onOpenInStudio,
  onOpenPdf,
}) => {
  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <div className={styles.sourcesSection} aria-label="Fuentes documentales citadas">
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>
          <Database size={13} />
          <span>Fuentes Documentales ({sources.length})</span>
        </span>
      </div>

      <div className={styles.sourcesGrid}>
        {sources.map((src) => {
          const isPdf = Boolean(src.pdfId || src.pdfName || (src.pages && src.pages.length > 0));
          const displayTitle = src.title?.trim() || src.pdfName || src.tableName || (isPdf ? 'Documento PDF' : 'Dataset Tabular');
          const identifier = src.pdfId || src.tableId || src.shortCode;
          const firstPage = src.pages && src.pages.length > 0 ? src.pages[0] : undefined;

          return (
            <div key={`${identifier}-${src.shortCode}`} className={styles.sourceCard} data-testid={`chat-source-${src.shortCode}`}>
              <div className={styles.sourceInfo}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isPdf ? (
                    <FileText size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
                  ) : (
                    <Database size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                  )}
                  <span className={styles.sourceTitle} title={displayTitle}>
                    {displayTitle}
                  </span>
                </div>

                <div className={styles.sourceMeta}>
                  <span className={styles.shortCodeBadge}>
                    {isPdf ? `/p/${src.shortCode}` : `/t/${src.shortCode}`}
                  </span>

                  {src.pages && src.pages.length > 0 && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: '#ef4444',
                        background: 'rgba(239, 68, 68, 0.1)',
                        padding: '1px 5px',
                        borderRadius: '4px',
                      }}
                      title={`Páginas citadas: ${src.pages.join(', ')}`}
                    >
                      Págs. {src.pages.join(', ')}
                    </span>
                  )}
                </div>
              </div>

              {isPdf && onOpenPdf ? (
                <button
                  type="button"
                  className={styles.openStudioBtn}
                  onClick={() => onOpenPdf(src, firstPage)}
                  title={`Abrir PDF en visor interactivo${firstPage ? ` (página ${firstPage})` : ''}`}
                >
                  <span>{firstPage ? `Pág. ${firstPage}` : 'Ver PDF'}</span>
                  <ExternalLink size={12} />
                </button>
              ) : !isPdf && onOpenInStudio ? (
                <button
                  type="button"
                  className={styles.openStudioBtn}
                  onClick={() => onOpenInStudio(src)}
                  title={`Abrir ${src.tableName} en Data Studio`}
                >
                  <span>Abrir Studio</span>
                  <ExternalLink size={12} />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};
