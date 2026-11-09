/**
 * Modal para la creación y diseño de Formularios Dinámicos con esquemas de entrada y resolución.
 * @module components/forms/CreateFormModal
 */

import React, { useState } from 'react';
import { Plus, Layers, ShieldCheck } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { FormFieldRow } from './FormFieldRow';
import type { FormSchemaField, CreateFormInput } from '../../types/forms';
import styles from './CreateFormModal.module.css';

/**
 * Propiedades del componente CreateFormModal.
 */
export interface CreateFormModalProps {
  /** Determina si el modal está visible */
  isOpen: boolean;
  /** Función para cerrar el modal */
  onClose: () => void;
  /** Callback al confirmar la creación del formulario */
  onSubmit: (input: CreateFormInput) => Promise<void>;
  /** Lista opcional de carpetas para vincular */
  folders?: Array<{ id: string; name: string }>;
}

/**
 * Modal dinámico para diseñar formularios con esquemas separados de entrada y dictamen.
 */
export const CreateFormModal: React.FC<CreateFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  folders = [],
}) => {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [folderId, setFolderId] = useState('');
  const [externalTargetUrl, setExternalTargetUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [entryFields, setEntryFields] = useState<FormSchemaField[]>([
    { name: 'nombre_completo', label: 'Nombre Completo', type: 'string', required: true },
    { name: 'correo', label: 'Correo Electrónico', type: 'email', required: true },
    { name: 'motivo', label: 'Motivo de Consulta', type: 'textarea', required: false },
  ]);

  const [resFields, setResFields] = useState<FormSchemaField[]>([
    { name: 'dictamen_oficial', label: 'Dictamen Oficial', type: 'string', required: true },
    { name: 'observaciones', label: 'Observaciones', type: 'textarea', required: false },
  ]);

  const handleTitleBlur = () => {
    if (!slug && title) {
      const generated = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generated);
    }
  };

  const handleAddField = (target: 'entry' | 'res') => {
    const newField: FormSchemaField = {
      name: `campo_${Date.now()}`,
      label: 'Nuevo Campo',
      type: 'string',
      required: false,
    };
    if (target === 'entry') setEntryFields((prev) => [...prev, newField]);
    else setResFields((prev) => [...prev, newField]);
  };

  const handleUpdateField = (
    target: 'entry' | 'res',
    index: number,
    updates: Partial<FormSchemaField>
  ) => {
    if (target === 'entry') {
      setEntryFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...updates } : f)));
    } else {
      setResFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...updates } : f)));
    }
  };

  const handleRemoveField = (target: 'entry' | 'res', index: number) => {
    if (target === 'entry') {
      setEntryFields((prev) => prev.filter((_, i) => i !== index));
    } else {
      setResFields((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) {
      setError('El título y slug son requeridos.');
      return;
    }
    if (entryFields.length === 0) {
      setError('Debes configurar al menos un campo de entrada.');
      return;
    }
    if (resFields.length === 0) {
      setError('Debes configurar al menos un campo de resolución.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        title: title.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        folderId: folderId || undefined,
        externalTargetUrl: externalTargetUrl.trim() || undefined,
        entryFieldsSchema: entryFields,
        resolutionFieldsSchema: resFields,
        allowedResolutionStates: ['VALID', 'INVALID'],
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear el formulario');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Crear Formulario Dinámico" wide={true}>
      <form onSubmit={handleSubmit} className={styles.container}>
        {error && <div style={{ color: '#ef4444', fontSize: '0.8125rem' }}>{error}</div>}

        <div className={styles.row}>
          <div className={styles.fieldGroup}>
            <label htmlFor="form-title">Título del Formulario *</label>
            <input
              id="form-title"
              className={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="Ej: Solicitud de Licencia Municipal"
              required
            />
          </div>
          <div className={styles.fieldGroup}>
            <label htmlFor="form-slug">Slug de URL Pública *</label>
            <input
              id="form-slug"
              className={styles.input}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="ej: solicitud-licencia"
              required
            />
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="form-desc">Descripción</label>
          <input
            id="form-desc"
            className={styles.input}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Breve resumen del propósito del formulario"
          />
        </div>

        <div className={styles.row}>
          <div className={styles.fieldGroup}>
            <label htmlFor="form-folder">Carpeta Vinculada (PostgreSQL)</label>
            <select
              id="form-folder"
              className={styles.select}
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
            >
              <option value="">(Sin carpeta asignada)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  📁 {f.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.fieldGroup}>
            <label htmlFor="form-webhook">Webhook de Despacho (URL Externa)</label>
            <input
              id="form-webhook"
              className={styles.input}
              type="url"
              value={externalTargetUrl}
              onChange={(e) => setExternalTargetUrl(e.target.value)}
              placeholder="https://api.externa.gob/webhook"
            />
          </div>
        </div>

        {/* Campos de entrada públicos */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <Layers size={16} color="#818cf8" />
              <span>Esquema de Entrada (Público / Usuario)</span>
            </div>
            <span className={styles.sectionDesc}>Campos que completará el remitente</span>
          </div>

          <div className={styles.fieldsList}>
            {entryFields.map((field, idx) => (
              <FormFieldRow
                key={idx}
                field={field}
                index={idx}
                onUpdate={(i, u) => handleUpdateField('entry', i, u)}
                onRemove={(i) => handleRemoveField('entry', i)}
              />
            ))}
          </div>

          <button type="button" className={styles.addBtn} onClick={() => handleAddField('entry')}>
            <Plus size={14} />
            <span>Agregar Campo de Entrada</span>
          </button>
        </div>

        {/* Campos de resolución interna */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <ShieldCheck size={16} color="#34d399" />
              <span>Esquema de Resolución (Operador / Write-Once)</span>
            </div>
            <span className={styles.sectionDesc}>Campos para sellar el dictamen final</span>
          </div>

          <div className={styles.fieldsList}>
            {resFields.map((field, idx) => (
              <FormFieldRow
                key={idx}
                field={field}
                index={idx}
                onUpdate={(i, u) => handleUpdateField('res', i, u)}
                onRemove={(i) => handleRemoveField('res', i)}
              />
            ))}
          </div>

          <button type="button" className={styles.addBtn} onClick={() => handleAddField('res')}>
            <Plus size={14} />
            <span>Agregar Campo de Resolución</span>
          </button>
        </div>

        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            Crear Formulario
          </Button>
        </div>
      </form>
    </Modal>
  );
};
