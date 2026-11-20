import React, { useState } from 'react';
import { Download, Pencil, RefreshCw, Tags } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ShortCodeChip } from '../../components/ui/ShortCodeChip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { pdfsService } from '../../services/pdfsService';
import { usePdfExtractedTextQuery } from '../../queries/useMediaQueries';
import { formatBytes } from '../../utils/formatters';
import { RenameAssetDialog } from '../images/RenameAssetDialog';
import { HotSwapAssetDialog } from '../images/HotSwapAssetDialog';
import { PdfMetadataDialog } from './PdfMetadataDialog';
import { PdfExtractedTextTab } from './PdfExtractedTextTab';
import { usePdfBlobUrl } from './usePdfBlobUrl';
import type { PdfItem } from '../../types/media';
import styles from './PdfViewerDialog.module.css';

/**
 * Propiedades del visor de documentos PDF cargado con `React.lazy`.
 */
export interface PdfViewerDialogProps {
  /** Controla la apertura del visor PDF. */
  open: boolean;
  /** Callback de cierre. */
  onOpenChange: (open: boolean) => void;
  /** Código corto del documento (`/p/:shortCode`). */
  shortCode: string;
  /** Página inicial opcional (ej. al abrir desde una cita RAG). */
  initialPage?: number;
  /** Título opcional del documento. */
  title?: string;
  /** Registro completo del PDF (cuando se abre desde el Explorador). */
  pdf?: PdfItem;
  /** Permite editar metadatos, renombrar o hacer Hot-Swap si el usuario tiene permiso `EDIT`/`ADMIN`. */
  canEdit?: boolean;
}

/**
 * Visor PDF editorial con carga diferida (`React.lazy`), pestaña **Documento** (`/p/:shortCode#page=N`
 * con descarga `?download=true`), pestaña **Texto extraído** (`/p/:shortCode?format=text` por página
 * con auditoría RAG y alerta `isScanned`), más edición de metadatos, renombrado y Hot-Swap.
 */
export const PdfViewerDialog: React.FC<PdfViewerDialogProps> = ({
  open,
  onOpenChange,
  shortCode,
  initialPage,
  title,
  pdf,
  canEdit = false,
}) => {
  const [activeTab, setActiveTab] = useState<'document' | 'text'>('document');
  const [activePage, setActivePage] = useState<number>(initialPage || 1);
  const [pageDraft, setPageDraft] = useState<string>(String(initialPage || 1));

  const identityKey = `${open}:${shortCode}:${pdf?.id ?? ''}:${initialPage ?? 1}`;
  const [localPdf, setLocalPdf] = useState<PdfItem | undefined>(pdf);
  const [trackedKey, setTrackedKey] = useState(identityKey);
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [hotSwapOpen, setHotSwapOpen] = useState(false);

  if (identityKey !== trackedKey) {
    setTrackedKey(identityKey);
    setLocalPdf(pdf);
    setActivePage(initialPage || 1);
    setPageDraft(String(initialPage || 1));
  }

  const activeCode = localPdf?.shortCode || shortCode;
  const activeTitle = localPdf?.originalName || title || `Documento PDF · ${activeCode}`;
  const canonicalUrl = pdfsService.getPdfUrl(activeCode);
  const versionedBase = localPdf?.urlWithVersion || canonicalUrl;
  const pdfPreview = usePdfBlobUrl(versionedBase, open);
  const iframeUrl = `${pdfPreview.previewBaseUrl}#page=${activePage}`;
  const downloadUrl = pdfsService.getPdfDownloadUrl(activeCode);

  const textQuery = usePdfExtractedTextQuery(activeCode, undefined, open && activeTab === 'text');
  const totalPages = localPdf?.pageCount ?? textQuery.data?.totalPages ?? null;
  const canMutate = Boolean(localPdf?.id && canEdit);

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number.parseInt(pageDraft, 10);
    if (!Number.isNaN(parsed) && parsed >= 1) {
      const clamped = totalPages ? Math.min(parsed, totalPages) : parsed;
      setActivePage(clamped);
      setPageDraft(String(clamped));
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) setActiveTab('document');
          onOpenChange(next);
        }}
        title={activeTitle}
        description="Previsualización binaria directa y auditoría de texto estructurado extraído por página."
        size="xl"
      >
        <div className={styles.toolbar} data-testid="pdf-viewer-dialog">
          <div className={styles.metaCluster}>
            <ShortCodeChip prefix="p" shortCode={activeCode} copyValue={canonicalUrl} />
            {totalPages ? (
              <Badge artifactDot="pdf" mono>
                {totalPages} pág.
              </Badge>
            ) : null}
            {localPdf?.isScanned ? <Badge tone="warn">Escaneado</Badge> : null}
            {localPdf?.metadataCard?.tags?.[0] ? (
              <Badge tone="accent">{localPdf.metadataCard.tags[0]}</Badge>
            ) : localPdf?.metadataCard?.title ? (
              <Badge tone="accent">{localPdf.metadataCard.title}</Badge>
            ) : null}
            {localPdf ? <span className={styles.metaText}>{formatBytes(localPdf.sizeBytes)}</span> : null}
          </div>

          <div className={styles.actionsCluster}>
            <a href={downloadUrl} target="_blank" rel="noreferrer">
              <Button variant="secondary" size="sm" icon={<Download size={14} />}>
                Descargar PDF
              </Button>
            </a>

            {canMutate ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Tags size={14} />}
                  onClick={() => setMetadataOpen(true)}
                  data-testid="pdf-open-metadata-btn"
                >
                  Metadatos
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<RefreshCw size={14} />}
                  onClick={() => setHotSwapOpen(true)}
                >
                  Hot-Swap
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Pencil size={14} />}
                  aria-label="Renombrar PDF"
                  onClick={() => setRenameOpen(true)}
                />
              </>
            ) : null}
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'document' | 'text')}
        >
          <TabsList>
            <TabsTrigger value="document">Documento</TabsTrigger>
            <TabsTrigger value="text">Texto extraído</TabsTrigger>
          </TabsList>

          <TabsContent value="document">
            <div className={styles.docControls}>
              <form className={styles.pageJumpForm} onSubmit={handleJumpSubmit}>
                <label htmlFor="pdf-page-jump">Ir a página:</label>
                <input
                  id="pdf-page-jump"
                  type="number"
                  min={1}
                  max={totalPages ?? undefined}
                  value={pageDraft}
                  onChange={(e) => setPageDraft(e.target.value)}
                  className={styles.pageInput}
                />
                {totalPages ? <span className={styles.metaText}>de {totalPages}</span> : null}
                <Button type="submit" variant="ghost" size="sm">
                  Ir
                </Button>
              </form>
              <span className={styles.metaText}>Página activa: #{activePage}</span>
            </div>

            {pdfPreview.status === 'loading' ? (
              <div className={styles.frameLoading} role="status" aria-live="polite">
                Cargando previsualización del PDF…
              </div>
            ) : (
              <iframe key={iframeUrl} src={iframeUrl} title={activeTitle} className={styles.frame} />
            )}
          </TabsContent>

          <TabsContent value="text">
            <PdfExtractedTextTab
              shortCode={activeCode}
              isScanned={localPdf?.isScanned}
              data={textQuery.data}
              isLoading={textQuery.isLoading}
              isError={textQuery.isError}
              onJumpToPage={(pageNumber) => {
                setActivePage(pageNumber);
                setPageDraft(String(pageNumber));
                setActiveTab('document');
              }}
            />
          </TabsContent>
        </Tabs>
      </Dialog>

      {localPdf && metadataOpen ? (
        <PdfMetadataDialog
          open={metadataOpen}
          onOpenChange={setMetadataOpen}
          pdfId={localPdf.id}
          pdfName={localPdf.originalName}
          initialMetadata={localPdf.metadataCard}
          onSaved={(updated) => setLocalPdf({ ...localPdf, ...updated })}
        />
      ) : null}

      {localPdf && renameOpen ? (
        <RenameAssetDialog
          open={renameOpen}
          onOpenChange={setRenameOpen}
          kind="pdf"
          assetId={localPdf.id}
          shortCode={localPdf.shortCode}
          currentName={localPdf.originalName}
          onRenamed={(updated) => setLocalPdf({ ...localPdf, ...(updated as PdfItem) })}
        />
      ) : null}

      {localPdf && hotSwapOpen ? (
        <HotSwapAssetDialog
          open={hotSwapOpen}
          onOpenChange={setHotSwapOpen}
          kind="pdf"
          assetId={localPdf.id}
          shortCode={localPdf.shortCode}
          currentName={localPdf.originalName}
          onReplaced={(updated) => {
            setLocalPdf({ ...localPdf, ...(updated as PdfItem) });
            if (activeTab === 'text') void textQuery.refetch();
          }}
        />
      ) : null}
    </>
  );
};

export default PdfViewerDialog;
