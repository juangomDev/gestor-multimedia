import React, { useState } from 'react';
import { ArrowUpRight, FileText, Image as ImageIcon, Table2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { storageService } from '../../services/storageService';
import { buildPublicAssetUrl } from '../../utils/formatters';
import type { MediaCategory } from '../../types/media';
import styles from './CommandPalette.module.css';

const PREFIX_MAP: Record<MediaCategory, 'i' | 't' | 'p'> = {
  image: 'i',
  table: 't',
  pdf: 'p',
};

/**
 * Propiedades del formulario de resolución directa por `shortCode` dentro de `CommandPalette`.
 */
export interface ShortCodeResolverFormProps {
  /** Callback ejecutado con el tipo de recurso y el código limpio al confirmar. */
  onResolve: (kind: MediaCategory, shortCode: string) => void;
  /** Callback para cerrar la paleta sin navegar. */
  onCancel: () => void;
}

/**
 * Selector de tipo (`Imagen`, `Tabla`, `PDF`) y entrada monoespaciada para abrir un recurso
 * directamente por su `shortCode` sin escribir entradas locales en `localStorage`.
 */
export const ShortCodeResolverForm: React.FC<ShortCodeResolverFormProps> = ({
  onResolve,
  onCancel,
}) => {
  const [kind, setKind] = useState<MediaCategory>('table');
  const [code, setCode] = useState('');

  const cleanCode = code.trim().replace(/^\/?(i|t|p)\//i, '');
  const previewUrl = buildPublicAssetUrl(
    storageService.getApiBaseUrl(),
    PREFIX_MAP[kind],
    cleanCode || ':shortCode'
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!cleanCode) return;
    onResolve(kind, cleanCode);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.shortCodeForm}>
      <div className={styles.kindRow} role="radiogroup" aria-label="Tipo de recurso">
        <button
          type="button"
          role="radio"
          aria-checked={kind === 'image'}
          className={`${styles.kindBtn} ${kind === 'image' ? styles.kindBtnActive : ''}`}
          onClick={() => setKind('image')}
        >
          <ImageIcon size={15} aria-hidden="true" />
          <span>Imagen (/i/)</span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={kind === 'table'}
          className={`${styles.kindBtn} ${kind === 'table' ? styles.kindBtnActive : ''}`}
          onClick={() => setKind('table')}
        >
          <Table2 size={15} aria-hidden="true" />
          <span>Tabla (/t/)</span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={kind === 'pdf'}
          className={`${styles.kindBtn} ${kind === 'pdf' ? styles.kindBtnActive : ''}`}
          onClick={() => setKind('pdf')}
        >
          <FileText size={15} aria-hidden="true" />
          <span>PDF (/p/)</span>
        </button>
      </div>

      <Input
        label="Código corto (shortCode)"
        mono
        placeholder="ej. k9x2a8p1q0"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        autoFocus
      />

      <div className={styles.previewBox}>
        <span className={styles.previewLabel}>URL pública canónica</span>
        <span className={styles.previewUrl}>{previewUrl}</span>
      </div>

      <div className={styles.shortCodeFooter}>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          iconRight={<ArrowUpRight size={15} />}
          disabled={!cleanCode}
        >
          Abrir recurso
        </Button>
      </div>
    </form>
  );
};
