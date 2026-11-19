import React from 'react';
import { Folder, Globe2, Hash } from 'lucide-react';
import { useTablesQuery, usePdfsQuery } from '../../queries/useMediaQueries';
import type { FolderItem } from '../../types/media';
import styles from './DataChatPage.module.css';

/**
 * Modos de alcance soportados en las consultas analíticas de Data Chat.
 */
export type ChatScopeMode = 'all' | 'folder' | 'resource';

/**
 * Propiedades del selector de alcance de consulta (`ChatScopeBar`).
 */
export interface ChatScopeBarProps {
  /** Modo de alcance activo (`all`, `folder` o `resource`). */
  mode: ChatScopeMode;
  /** Cambia el modo de alcance. */
  onModeChange: (mode: ChatScopeMode) => void;
  /** Carpetas disponibles en el árbol del usuario. */
  folders: FolderItem[];
  /** UUID de carpeta seleccionada (cuando `mode === 'folder'`). */
  selectedFolderId: string;
  onSelectFolderId: (folderId: string) => void;
  /** Código corto del recurso seleccionado o escrito manualmente (`mode === 'resource'`). */
  selectedShortCode: string;
  onSelectShortCode: (shortCode: string) => void;
}

/**
 * Barra compacta de alcance para Data Chat: permite consultar **Todo mi espacio**,
 * acotar a una **Carpeta específica** (`folderId`) o focalizar un **Recurso** concreto (`shortCode`).
 */
export const ChatScopeBar: React.FC<ChatScopeBarProps> = ({
  mode,
  onModeChange,
  folders,
  selectedFolderId,
  onSelectFolderId,
  selectedShortCode,
  onSelectShortCode,
}) => {
  const isResourceMode = mode === 'resource';
  const tablesQuery = useTablesQuery({ page: 1, limit: 50 }, isResourceMode);
  const pdfsQuery = usePdfsQuery({ page: 1, limit: 50 }, isResourceMode);

  const queryableFolders = folders.filter((f) => !f.isSystem && f.type !== 'image');
  const tables = tablesQuery.data?.items ?? [];
  const pdfs = pdfsQuery.data?.items ?? [];

  return (
    <div className={styles.scopeBar} data-testid="chat-scope-bar">
      <div className={styles.scopeTabs} role="radiogroup" aria-label="Alcance de la consulta">
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'all'}
          className={`${styles.scopeBtn} ${mode === 'all' ? styles.scopeBtnActive : ''}`}
          onClick={() => onModeChange('all')}
        >
          <Globe2 size={13} aria-hidden="true" />
          Todo mi espacio
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'folder'}
          className={`${styles.scopeBtn} ${mode === 'folder' ? styles.scopeBtnActive : ''}`}
          onClick={() => onModeChange('folder')}
        >
          <Folder size={13} aria-hidden="true" />
          Carpeta específica
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'resource'}
          className={`${styles.scopeBtn} ${mode === 'resource' ? styles.scopeBtnActive : ''}`}
          onClick={() => onModeChange('resource')}
        >
          <Hash size={13} aria-hidden="true" />
          Recurso
        </button>
      </div>

      {mode === 'folder' ? (
        <select
          aria-label="Seleccionar carpeta de alcance"
          className={styles.scopeSelect}
          value={selectedFolderId}
          onChange={(e) => onSelectFolderId(e.target.value)}
          data-testid="chat-scope-folder-select"
        >
          <option value="">Selecciona una carpeta...</option>
          {queryableFolders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              [{folder.type.toUpperCase()}] {folder.name}
            </option>
          ))}
        </select>
      ) : null}

      {mode === 'resource' ? (
        <div className={styles.resourceControls}>
          <select
            aria-label="Elegir tabla o PDF registrado"
            className={styles.scopeSelect}
            value={selectedShortCode}
            onChange={(e) => onSelectShortCode(e.target.value)}
            data-testid="chat-scope-resource-select"
          >
            <option value="">Elegir tabla o PDF...</option>
            {tables.length > 0 ? (
              <optgroup label="Tablas">
                {tables.map((t) => (
                  <option key={t.id} value={t.shortCode}>
                    t/{t.shortCode} — {t.tableName}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {pdfs.length > 0 ? (
              <optgroup label="Documentos PDF">
                {pdfs.map((p) => (
                  <option key={p.id} value={p.shortCode}>
                    p/{p.shortCode} — {p.originalName}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>

          <input
            type="text"
            className={styles.scopeCodeInput}
            placeholder="o escribe shortCode (ej. t/k9x2a)"
            value={selectedShortCode}
            onChange={(e) => onSelectShortCode(e.target.value)}
            aria-label="Código corto del recurso"
            data-testid="chat-scope-shortcode-input"
          />
        </div>
      ) : null}
    </div>
  );
};
