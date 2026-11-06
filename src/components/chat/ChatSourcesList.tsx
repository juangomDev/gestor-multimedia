import React from 'react';
import { Database, ExternalLink } from 'lucide-react';
import type { ChatSource } from '../../services/chatService';
import styles from './ChatComponents.module.css';

/**
 * Propiedades del componente `ChatSourcesList`.
 */
export interface ChatSourcesListProps {
  /** Lista de tablas citadas como fuente por el motor RAG tabular. */
  sources: ChatSource[];
  /** Callback para abrir una tabla directamente en el Data Studio a pantalla completa. */
  onOpenInStudio?: (source: ChatSource) => void;
}

/**
 * Renderiza las tarjetas de fuentes documentales (`tableName`, `shortCode`, `title`)
 * utilizadas para fundamentar una respuesta analítica, con acceso directo al Data Studio.
 */
export const ChatSourcesList: React.FC<ChatSourcesListProps> = ({
  sources,
  onOpenInStudio,
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
          const displayTitle = src.title?.trim() || src.tableName;
          return (
            <div key={`${src.tableId}-${src.shortCode}`} className={styles.sourceCard}>
              <div className={styles.sourceInfo}>
                <span className={styles.sourceTitle} title={displayTitle}>
                  {displayTitle}
                </span>
                <div className={styles.sourceMeta}>
                  <span className={styles.shortCodeBadge}>{src.shortCode}</span>
                  {src.title && src.title !== src.tableName && (
                    <span title={src.tableName}>{src.tableName}</span>
                  )}
                </div>
              </div>

              {onOpenInStudio && (
                <button
                  type="button"
                  className={styles.openStudioBtn}
                  onClick={() => onOpenInStudio(src)}
                  title={`Abrir ${src.tableName} en Data Studio`}
                >
                  <span>Abrir Studio</span>
                  <ExternalLink size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

