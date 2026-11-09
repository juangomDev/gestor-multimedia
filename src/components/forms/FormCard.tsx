/**
 * Tarjeta de visualización y control de un Formulario Dinámico.
 * @module components/forms/FormCard
 */

import React, { useState } from 'react';
import { FileText, Inbox, Copy, Check, Download, Layers, ShieldCheck } from 'lucide-react';
import type { FormDefinition } from '../../types/forms';
import { formsService } from '../../services/formsService';
import styles from './FormCard.module.css';

/**
 * Propiedades del componente FormCard.
 */
export interface FormCardProps {
  /** Definición del formulario a renderizar */
  form: FormDefinition;
  /** Indica si la tarjeta está actualmente seleccionada */
  isSelected?: boolean;
  /** Callback al hacer click para abrir la bandeja de entradas */
  onSelect?: (form: FormDefinition) => void;
  /** Callback para mostrar mensaje de notificación Toast */
  onNotify?: (message: string, type: 'success' | 'error' | 'info') => void;
}

/**
 * Componente que representa un formulario dinámico en el catálogo.
 */
export const FormCard: React.FC<FormCardProps> = ({
  form,
  isSelected = false,
  onSelect,
  onNotify,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyPublicUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    const publicUrl = `${window.location.origin}/#/public/forms/${form.slug}`;
    navigator.clipboard
      .writeText(publicUrl)
      .then(() => {
        setCopied(true);
        onNotify?.('Enlace público copiado al portapapeles', 'success');
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        onNotify?.('Error al copiar el enlace', 'error');
      });
  };

  const handleExport = (e: React.MouseEvent, format: 'xlsx' | 'csv') => {
    e.stopPropagation();
    const exportUrl = formsService.getExportUrl(form.id, format);
    window.open(exportUrl, '_blank', 'noopener,noreferrer');
    onNotify?.(`Exportando entradas en formato ${format.toUpperCase()}...`, 'info');
  };

  const entryCount = form.entriesCount ?? 0;
  const inputFieldsCount = form.entryFieldsSchema?.length ?? 0;
  const resFieldsCount = form.resolutionFieldsSchema?.length ?? 0;

  return (
    <div
      className={`${styles.card} ${isSelected ? styles.cardActive : ''}`}
      onClick={() => onSelect?.(form)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(form);
        }
      }}
    >
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <FileText size={22} />
        </div>
        <div className={styles.info}>
          <div className={styles.title} title={form.title}>
            {form.title}
          </div>
          <div className={styles.slug}>/{form.slug}</div>
        </div>
      </div>

      {form.description && <div className={styles.description}>{form.description}</div>}

      <div className={styles.badges}>
        <span className={`${styles.badge} ${styles.badgePrimary}`} title="Total de respuestas recibidas">
          <Inbox size={12} />
          {entryCount} {entryCount === 1 ? 'entrada' : 'entradas'}
        </span>
        <span className={styles.badge} title="Campos de entrada públicos">
          <Layers size={12} />
          {inputFieldsCount} inputs
        </span>
        <span className={styles.badge} title="Campos de resolución interna">
          <ShieldCheck size={12} />
          {resFieldsCount} resolución
        </span>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.actionBtn} ${isSelected ? styles.actionBtnPrimary : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(form);
          }}
          title="Ver bandeja de entradas del formulario"
        >
          <Inbox size={14} />
          <span>Bandeja</span>
        </button>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={handleCopyPublicUrl}
            title="Copiar URL pública del formulario"
          >
            {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            <span>{copied ? 'Copiado' : 'Link'}</span>
          </button>

          <button
            type="button"
            className={styles.actionBtn}
            onClick={(e) => handleExport(e, 'xlsx')}
            title="Descargar respuestas en Excel (.xlsx)"
          >
            <Download size={14} />
            <span>.xlsx</span>
          </button>
        </div>
      </div>
    </div>
  );
};

