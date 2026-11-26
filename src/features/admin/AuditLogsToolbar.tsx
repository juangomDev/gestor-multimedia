import React from 'react';
import { Download, RefreshCw, Search, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import shared from './AdminShared.module.css';
import controls from './AdminControls.module.css';

const ACTION_OPTIONS = [
  { value: '', label: 'Todas las acciones' },
  { value: 'LOGIN', label: 'LOGIN' },
  { value: 'USER_CREATE', label: 'USER_CREATE' },
  { value: 'USER_UPDATE_STATUS', label: 'USER_UPDATE_STATUS' },
  { value: 'USER_RESET_PASSWORD', label: 'USER_RESET_PASSWORD' },
  { value: 'USER_DELETE', label: 'USER_DELETE' },
  { value: 'FOLDER_CREATE', label: 'FOLDER_CREATE' },
  { value: 'FOLDER_SHARE', label: 'FOLDER_SHARE' },
  { value: 'FOLDER_DELETE', label: 'FOLDER_DELETE' },
  { value: 'IMAGE_UPLOAD', label: 'IMAGE_UPLOAD' },
  { value: 'TABLE_UPLOAD', label: 'TABLE_UPLOAD' },
  { value: 'PDF_UPLOAD', label: 'PDF_UPLOAD' },
  { value: 'FORM_CREATE', label: 'FORM_CREATE' },
  { value: 'FORM_UPDATE', label: 'FORM_UPDATE' },
  { value: 'FORM_DELETE', label: 'FORM_DELETE' },
  { value: 'BULK_DELETE', label: 'BULK_DELETE' },
  { value: 'BULK_MOVE', label: 'BULK_MOVE' },
  { value: 'API_KEY_CREATE', label: 'API_KEY_CREATE', adminOnly: true },
  { value: 'API_KEY_UPDATE', label: 'API_KEY_UPDATE', adminOnly: true },
  { value: 'API_KEY_REVOKE', label: 'API_KEY_REVOKE', adminOnly: true },
];

const RESOURCE_OPTIONS = [
  { value: '', label: 'Todos los recursos' },
  { value: 'USER', label: 'Usuario (USER)' },
  { value: 'FOLDER', label: 'Carpeta (FOLDER)' },
  { value: 'IMAGE', label: 'Imagen (IMAGE)' },
  { value: 'TABLE', label: 'Tabla (TABLE)' },
  { value: 'PDF', label: 'PDF (PDF)' },
  { value: 'FORM', label: 'Formulario (FORM)' },
  { value: 'API_KEY', label: 'API Key (API_KEY)', adminOnly: true },
];

/**
 * Propiedades de la barra de filtros y exportación de auditoría (`AuditLogsToolbar`).
 */
export interface AuditLogsToolbarProps {
  search: string;
  action: string;
  resourceType: string;
  fromDate: string;
  toDate: string;
  hideAdminFilters: boolean;
  isFetching: boolean;
  exportingFormat: 'csv' | 'xlsx' | null;
  onSearchChange: (value: string) => void;
  onActionChange: (value: string) => void;
  onResourceTypeChange: (value: string) => void;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onClearFilters: () => void;
  onExport: (format: 'csv' | 'xlsx') => void;
  onRefresh: () => void;
}

/**
 * Barra superior de filtrado server-side (`search`, `action`, `resourceType`, `from`, `to`)
 * y descarga autenticada en CSV / Excel (`.xlsx`) para `AuditLogsPanel`.
 */
export const AuditLogsToolbar: React.FC<AuditLogsToolbarProps> = ({
  search,
  action,
  resourceType,
  fromDate,
  toDate,
  hideAdminFilters,
  isFetching,
  exportingFormat,
  onSearchChange,
  onActionChange,
  onResourceTypeChange,
  onFromDateChange,
  onToDateChange,
  onClearFilters,
  onExport,
  onRefresh,
}) => {
  const visibleActions = hideAdminFilters
    ? ACTION_OPTIONS.filter((opt) => !opt.adminOnly)
    : ACTION_OPTIONS;
  const visibleResources = hideAdminFilters
    ? RESOURCE_OPTIONS.filter((opt) => !opt.adminOnly)
    : RESOURCE_OPTIONS;
  const hasActiveFilters = Boolean(search || action || resourceType || fromDate || toDate);

  return (
    <div className={shared.toolbar}>
      <div className={shared.filterCluster}>
        <div className={controls.searchWrap}>
          <Search size={13} className={controls.searchIcon} aria-hidden="true" />
          <input
            type="search"
            className={controls.searchInput}
            placeholder="Buscar actor, acción o ID..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Buscar eventos de auditoría"
            data-testid="audit-search-input"
          />
        </div>

        <select
          aria-label="Filtrar auditoría por acción"
          className={shared.select}
          value={action}
          onChange={(e) => onActionChange(e.target.value)}
          data-testid="audit-action-filter"
        >
          {visibleActions.map((opt) => (
            <option key={opt.value || 'all-act'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Filtrar auditoría por recurso"
          className={shared.select}
          value={resourceType}
          onChange={(e) => onResourceTypeChange(e.target.value)}
          data-testid="audit-resource-filter"
        >
          {visibleResources.map((opt) => (
            <option key={opt.value || 'all-res'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <label className={controls.dateField}>
          <span>Desde</span>
          <input
            type="date"
            className={controls.dateInput}
            value={fromDate}
            onChange={(e) => onFromDateChange(e.target.value)}
            aria-label="Fecha inicial de auditoría"
            data-testid="audit-from-input"
          />
        </label>

        <label className={controls.dateField}>
          <span>Hasta</span>
          <input
            type="date"
            className={controls.dateInput}
            value={toDate}
            onChange={(e) => onToDateChange(e.target.value)}
            aria-label="Fecha final de auditoría"
            data-testid="audit-to-input"
          />
        </label>

        {hasActiveFilters ? (
          <Button
            variant="ghost"
            size="sm"
            icon={<X size={13} />}
            onClick={onClearFilters}
            data-testid="audit-clear-filters-btn"
          >
            Limpiar
          </Button>
        ) : null}
      </div>

      <div className={controls.actionsCluster}>
        <Button
          variant="secondary"
          size="sm"
          icon={<Download size={13} />}
          loading={exportingFormat === 'csv'}
          onClick={() => onExport('csv')}
          data-testid="audit-export-csv-btn"
        >
          .csv
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<Download size={13} />}
          loading={exportingFormat === 'xlsx'}
          onClick={() => onExport('xlsx')}
          data-testid="audit-export-xlsx-btn"
        >
          .xlsx
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<RefreshCw size={14} />}
          loading={isFetching}
          onClick={onRefresh}
        >
          Actualizar
        </Button>
      </div>
    </div>
  );
};
