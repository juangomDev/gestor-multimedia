/**
 * Vista principal de Estudio de Formularios Dinámicos, Tablas Abiertas y Resolución Write-Once.
 * @module views/FormsStudioView
 */

import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, Inbox, Download } from 'lucide-react';
import { Button } from '../components/common/Button';
import { FormCard } from '../components/forms/FormCard';
import { CreateFormModal } from '../components/forms/CreateFormModal';
import { ResolveEntryModal } from '../components/forms/ResolveEntryModal';
import { FormEntriesTable } from '../components/forms/FormEntriesTable';
import { FormSubscriptionButton } from '../components/forms/FormSubscriptionButton';
import { formsService } from '../services/formsService';
import { foldersService } from '../services/foldersService';
import type { FormDefinition, FormEntry, FormEntryStatus, CreateFormInput } from '../types/forms';
import type { FolderItem } from '../types/media';
import styles from './FormsStudioView.module.css';

/**
 * Propiedades del componente FormsStudioView.
 */
export interface FormsStudioViewProps {
  /** Callback para notificar mensajes */
  onNotify?: (message: string, type: 'success' | 'error' | 'info') => void;
}

/**
 * Vista orquestadora para la administración de formularios y resolución inmutable de respuestas.
 */
export const FormsStudioView: React.FC<FormsStudioViewProps> = ({ onNotify }) => {
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [selectedForm, setSelectedForm] = useState<FormDefinition | null>(null);
  const [entries, setEntries] = useState<FormEntry[]>([]);
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<FormEntryStatus | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isEntriesLoading, setIsEntriesLoading] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<FormEntry | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      formsService.listForms(),
      foldersService.fetchFolders().catch(() => []),
    ])
      .then(([list, fetchedFolders]) => {
        if (!active) return;
        setForms(list);
        setFolders(fetchedFolders);
        if (list.length > 0 && !selectedForm) {
          setSelectedForm(list[0]);
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        onNotify?.(err instanceof Error ? err.message : 'Error al cargar formularios', 'error');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadTrigger, onNotify, selectedForm]);

  useEffect(() => {
    if (!selectedForm) return;
    let active = true;
    formsService
      .listEntries(selectedForm.id, {
        month: monthFilter || undefined,
        status: statusFilter,
      })
      .then((res) => {
        if (!active) return;
        setEntries(res.entries);
      })
      .catch((err: unknown) => {
        if (!active) return;
        onNotify?.(err instanceof Error ? err.message : 'Error al cargar entradas', 'error');
      })
      .finally(() => {
        if (active) setIsEntriesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedForm, monthFilter, statusFilter, onNotify]);

  const handleRefreshEntries = () => {
    if (!selectedForm) return;
    setIsEntriesLoading(true);
    formsService
      .listEntries(selectedForm.id, {
        month: monthFilter || undefined,
        status: statusFilter,
      })
      .then((res) => setEntries(res.entries))
      .catch((err: unknown) => {
        onNotify?.(err instanceof Error ? err.message : 'Error al cargar entradas', 'error');
      })
      .finally(() => setIsEntriesLoading(false));
  };

  const handleCreateForm = async (input: CreateFormInput) => {
    const created = await formsService.createForm(input);
    setForms((prev) => [created, ...prev]);
    setSelectedForm(created);
    setReloadTrigger((prev) => prev + 1);
    onNotify?.(`Formulario "${created.title}" creado con éxito`, 'success');
  };

  const handleEntryResolved = (updated: FormEntry) => {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    if (selectedForm) {
      setForms((prev) =>
        prev.map((f) => (f.id === selectedForm.id ? { ...f, entriesCount: (f.entriesCount || 0) } : f))
      );
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Estudio de Formularios & Tablas Abiertas</h1>
          <p className={styles.subtitle}>
            Esquemas dinámicos de captura, bandeja de respuestas y dictamen inmutable Write-Once.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
          <Plus size={16} />
          <span>Nuevo Formulario</span>
        </Button>
      </div>

      {/* Catálogo de Formularios */}
      {isLoading ? (
        <div className={styles.emptyState}>Cargando catálogo de formularios...</div>
      ) : forms.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No existen formularios creados todavía.</p>
          <Button variant="secondary" onClick={() => setIsCreateOpen(true)} style={{ marginTop: '12px' }}>
            <Plus size={14} />
            <span>Crear Primer Formulario</span>
          </Button>
        </div>
      ) : (
        <div className={styles.formsGrid}>
          {forms.map((form) => (
            <FormCard
              key={form.id}
              form={form}
              isSelected={selectedForm?.id === form.id}
              onSelect={(f) => setSelectedForm(f)}
              onNotify={onNotify}
            />
          ))}
        </div>
      )}

      {/* Bandeja de Respuestas y Resolución */}
      {selectedForm && (
        <div className={styles.inboxSection}>
          <div className={styles.inboxHeader}>
            <div className={styles.inboxTitle}>
              <Inbox size={20} color="#818cf8" />
              <span>Bandeja de Entradas: {selectedForm.title}</span>
            </div>

            <div className={styles.filterBar}>
              <FormSubscriptionButton
                formId={selectedForm.id}
                formTitle={selectedForm.title}
                onNotify={onNotify}
              />
              <input
                type="month"
                className={styles.filterInput}
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                title="Filtrar por mes"
              />
              <select
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FormEntryStatus | 'ALL')}
              >
                <option value="ALL">Todos los estados</option>
                <option value="NEW">Nuevas (Pendientes)</option>
                <option value="VALID">Válidas (Aprobadas)</option>
                <option value="INVALID">Inválidas (Rechazadas)</option>
              </select>
              <Button
                variant="secondary"
                onClick={handleRefreshEntries}
                disabled={isEntriesLoading}
              >
                <RefreshCw size={14} className={isEntriesLoading ? 'animate-spin' : ''} />
                <span>Actualizar</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  const url = formsService.getExportUrl(selectedForm.id, 'xlsx', {
                    month: monthFilter || undefined,
                    status: statusFilter,
                  });
                  window.open(url, '_blank');
                }}
              >
                <Download size={14} />
                <span>Exportar .xlsx</span>
              </Button>
            </div>
          </div>

          <FormEntriesTable
            entries={entries}
            isLoading={isEntriesLoading}
            onSelectEntry={(entry) => setSelectedEntry(entry)}
          />
        </div>
      )}

      {/* Modales */}
      <CreateFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateForm}
        folders={folders.map((f) => ({ id: f.id, name: f.name }))}
      />

      {selectedForm && (
        <ResolveEntryModal
          isOpen={!!selectedEntry}
          onClose={() => setSelectedEntry(null)}
          entry={selectedEntry}
          form={selectedForm}
          onResolved={handleEntryResolved}
          onNotify={onNotify}
        />
      )}
    </div>
  );
};

