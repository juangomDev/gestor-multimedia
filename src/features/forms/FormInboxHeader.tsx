import React from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Code2, Download, Settings2, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { FormSubscriptionControl } from './FormSubscriptionControl';
import type { FormDefinition } from '../../types/forms';
import styles from './FormInboxPage.module.css';

/**
 * Propiedades del encabezado editorial de la bandeja de formulario (`FormInboxHeader`).
 */
export interface FormInboxHeaderProps {
  /** Ruta de retorno hacia la carpeta contenedora o el explorador. */
  backHref: string;
  /** Identificador del formulario activo. */
  formId: string;
  /** Definición cargada del formulario (opcional durante carga inicial). */
  form: FormDefinition | undefined;
  /** Habilita acciones de gestión (`Configurar` y `Eliminar`) cuando el usuario tiene `EDIT`/`ADMIN`. */
  canManage: boolean;
  /** Formato de exportación actualmente en curso (`xlsx` | `csv` | `null`). */
  exportingFormat: 'xlsx' | 'csv' | null;
  onOpenEmbed: () => void;
  onExport: (format: 'xlsx' | 'csv') => void;
  onOpenEdit: () => void;
  onOpenDelete: () => void;
}

/**
 * Encabezado contextual de `FormInboxPage`: título, slug público, indicador `IA activa`,
 * alertas de suscripción, integración web, exportación `.xlsx`/`.csv` y gestión del formulario.
 */
export const FormInboxHeader: React.FC<FormInboxHeaderProps> = ({
  backHref,
  formId,
  form,
  canManage,
  exportingFormat,
  onOpenEmbed,
  onExport,
  onOpenEdit,
  onOpenDelete,
}) => (
  <header className={styles.header}>
    <div className={styles.headingCluster}>
      <div className={styles.titleRow}>
        <Link to={backHref}>
          <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />}>
            Carpeta
          </Button>
        </Link>
        <h1 className={styles.title}>{form?.title || `Formulario · ${formId}`}</h1>
        {form?.slug ? (
          <Badge artifactDot="form" mono>
            /{form.slug}
          </Badge>
        ) : null}
        {form?.autoResolveWithAi ? (
          <Badge tone="accent" data-testid="form-ai-badge">
            <Sparkles size={11} aria-hidden="true" /> IA activa
          </Badge>
        ) : null}
      </div>
      {form?.description ? <p className={styles.description}>{form.description}</p> : null}
    </div>

    <div className={styles.actionsCluster}>
      {formId ? <FormSubscriptionControl formId={formId} /> : null}
      {form ? (
        <Button
          variant="secondary"
          size="sm"
          icon={<Code2 size={14} />}
          onClick={onOpenEmbed}
          data-testid="form-embed-btn"
        >
          Integrar en web
        </Button>
      ) : null}
      <Button
        variant="secondary"
        size="sm"
        icon={<Download size={14} />}
        loading={exportingFormat === 'xlsx'}
        onClick={() => onExport('xlsx')}
        data-testid="form-export-xlsx-btn"
      >
        .xlsx
      </Button>
      <Button
        variant="secondary"
        size="sm"
        icon={<Download size={14} />}
        loading={exportingFormat === 'csv'}
        onClick={() => onExport('csv')}
        data-testid="form-export-csv-btn"
      >
        .csv
      </Button>
      {canManage && form ? (
        <>
          <Button
            variant="secondary"
            size="sm"
            icon={<Settings2 size={14} />}
            onClick={onOpenEdit}
            data-testid="form-edit-btn"
          >
            Configurar
          </Button>
          <Button
            variant="ghost"
            size="icon"
            icon={<Trash2 size={14} />}
            onClick={onOpenDelete}
            aria-label="Eliminar formulario"
            title="Eliminar formulario"
            data-testid="form-delete-btn"
          />
        </>
      ) : null}
    </div>
  </header>
);
