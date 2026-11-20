import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { storageService } from '../../services/storageService';
import { copyToClipboard } from '../../utils/clipboard';
import { useToast } from '../../context/useToast';
import { buildPublicFetchSnippet, buildPublicFormEndpoint } from './formHelpers';
import type { FormDefinition } from '../../types/forms';
import styles from './FormEmbedDialog.module.css';

/**
 * Propiedades del modal de integración web pública (`FormEmbedDialog`).
 */
export interface FormEmbedDialogProps {
  /** Controla la visibilidad del diálogo. */
  open: boolean;
  /** Callback al cerrar el diálogo. */
  onOpenChange: (open: boolean) => void;
  /** Definición del formulario cuyo endpoint público y snippet se muestran. */
  form: FormDefinition;
}

/**
 * Modal "Integrar en web" que expone el endpoint sin autenticación
 * `POST /api/v1/public/forms/:slug/entries` y un snippet `fetch` generado desde
 * `entryFieldsSchema` listo para copiar.
 */
export const FormEmbedDialog: React.FC<FormEmbedDialogProps> = ({
  open,
  onOpenChange,
  form,
}) => {
  const { showToast } = useToast();
  const [copiedTarget, setCopiedTarget] = useState<'endpoint' | 'snippet' | null>(null);

  const baseUrl = storageService.getApiBaseUrl();
  const endpoint = buildPublicFormEndpoint(baseUrl, form.slug);
  const snippet = buildPublicFetchSnippet(baseUrl, form.slug, form.entryFieldsSchema);

  const handleCopy = async (text: string, target: 'endpoint' | 'snippet', label: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedTarget(target);
      showToast(`${label} copiado al portapapeles.`, 'success');
      window.setTimeout(() => setCopiedTarget((curr) => (curr === target ? null : curr)), 1800);
    } else {
      showToast('No se pudo copiar al portapapeles.', 'error');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Integrar en web · ${form.title}`}
      description="Endpoint público sin token JWT para recibir entradas desde formularios externos o apps."
      size="lg"
    >
      <div className={styles.wrap} data-testid="form-embed-dialog">
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.label}>Endpoint de envío público</span>
            <Button
              variant="secondary"
              size="sm"
              icon={copiedTarget === 'endpoint' ? <Check size={13} /> : <Copy size={13} />}
              onClick={() => void handleCopy(endpoint, 'endpoint', 'Endpoint público')}
            >
              {copiedTarget === 'endpoint' ? 'Copiado' : 'Copiar URL'}
            </Button>
          </div>
          <div className={styles.endpointBox}>
            <span className={styles.methodPill}>POST</span>
            <code data-testid="form-public-endpoint">{endpoint}</code>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.label}>Snippet JavaScript (fetch)</span>
            <Button
              variant="secondary"
              size="sm"
              icon={copiedTarget === 'snippet' ? <Check size={13} /> : <Copy size={13} />}
              onClick={() => void handleCopy(snippet, 'snippet', 'Snippet fetch')}
            >
              {copiedTarget === 'snippet' ? 'Copiado' : 'Copiar snippet'}
            </Button>
          </div>
          <pre className={styles.codeBlock} data-testid="form-fetch-snippet">
            <code>{snippet}</code>
          </pre>
        </div>

        {form.entryFieldsSchema.length > 0 ? (
          <div className={styles.section}>
            <span className={styles.label}>Campos esperados en el cuerpo JSON</span>
            <div className={styles.fieldsList}>
              {form.entryFieldsSchema.map((field) => (
                <Badge key={field.name} tone={field.required ? 'accent' : 'neutral'} mono>
                  {field.name}: {field.type}
                  {field.required ? ' *' : ''}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
};
