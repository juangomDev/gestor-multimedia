import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Search, Plus, Folder, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '../components/common/Button';
import { PdfCard } from '../components/pdfs/PdfCard';
import { PdfViewerModal } from '../components/pdfs/PdfViewerModal';
import { UploadPdfModal } from '../components/pdfs/UploadPdfModal';
import { RenamePdfModal } from '../components/pdfs/RenamePdfModal';
import { HotSwapPdfModal } from '../components/pdfs/HotSwapPdfModal';
import { PdfMetadataEditorModal } from '../components/pdfs/PdfMetadataEditorModal';
import { pdfsService } from '../../src/services/pdfsService';
import { useToast } from '../context/useToast';
import type { PdfItem, FolderItem } from '../types/media';
import styles from './PdfsCatalogView.module.css';

/**
 * Propiedades de la vista de catálogo de documentos PDF.
 */
export interface PdfsCatalogViewProps {
  activeFolder?: FolderItem | null;
  folders?: FolderItem[];
  onMovePdfToFolder?: (pdf: PdfItem) => void;
  onPdfsUpdated?: () => void;
  leadingGridItems?: React.ReactNode;
}

/**
 * Vista orquestadora del catálogo de documentos PDF con búsqueda, paginación,
 * subida multipart, visor de doble artefacto y edición semántica.
 */
export const PdfsCatalogView: React.FC<PdfsCatalogViewProps> = ({
  activeFolder,
  onMovePdfToFolder,
  onPdfsUpdated,
  leadingGridItems,
}) => {
  const { showToast } = useToast();
  const [pdfs, setPdfs] = useState<PdfItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modales
  const [viewerPdf, setViewerPdf] = useState<PdfItem | null>(null);
  const [renameTarget, setRenameTarget] = useState<PdfItem | null>(null);
  const [hotSwapTarget, setHotSwapTarget] = useState<PdfItem | null>(null);
  const [metadataTarget, setMetadataTarget] = useState<PdfItem | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  /**
   * Carga la lista de documentos PDF desde el backend aplicando filtros y paginación.
   */
  const loadPdfs = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await pdfsService.fetchRemotePdfs({
        page,
        limit: 20,
        folderId: activeFolder?.id || undefined,
        search: search.trim() || undefined,
      });
      setPdfs(items);
      const meta = pdfsService.getLastPaginationMeta();
      if (meta) {
        setTotal(meta.total);
        setTotalPages(meta.totalPages);
      } else {
        setTotal(items.length);
        setTotalPages(1);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar catálogo de PDFs';
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [page, activeFolder, search, showToast]);

  useEffect(() => {
    let active = true;
    pdfsService
      .fetchRemotePdfs({
        page,
        limit: 20,
        folderId: activeFolder?.id || undefined,
        search: search.trim() || undefined,
      })
      .then((items) => {
        if (!active) return;
        setPdfs(items);
        const meta = pdfsService.getLastPaginationMeta();
        setTotal(meta?.total ?? items.length);
        setTotalPages(meta?.totalPages ?? 1);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const msg = err instanceof Error ? err.message : 'Error al cargar PDFs';
        showToast(msg, 'error');
      });
    return () => {
      active = false;
    };
  }, [page, activeFolder, search, showToast]);

  const handleDelete = async (pdf: PdfItem) => {
    try {
      await pdfsService.deletePdf(pdf.id);
      showToast(`Documento "${pdf.originalName}" eliminado`, 'success');
      setPdfs((prev) => prev.filter((p) => p.id !== pdf.id));
      onPdfsUpdated?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar PDF';
      showToast(msg, 'error');
    }
  };

  return (
    <div className={styles.container} data-testid="pdfs-catalog-view">
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={22} style={{ color: '#ef4444' }} />
            <h1 className={styles.title}>Documentos PDF</h1>
          </div>
          <span className={styles.subtitle}>
            Patrón de doble artefacto binario y texto tokenizado para visor interactivo y RAG ({total} documentos).
          </span>
          {activeFolder && (
            <div className={styles.folderTag}>
              <Folder size={12} />
              <span>Carpeta: {activeFolder.name}</span>
            </div>
          )}
        </div>

        <div className={styles.controlsRow}>
          <div className={styles.searchBox}>
            <Search size={15} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar en PDFs..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className={styles.searchInput}
            />
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void loadPdfs()}
            disabled={isLoading}
            icon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
          >
            Actualizar
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setIsUploadOpen(true)}
            icon={<Plus size={15} />}
          >
            Subir PDF
          </Button>
        </div>
      </div>

      {isLoading && pdfs.length === 0 && !leadingGridItems ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Cargando catálogo de documentos PDF...
        </div>
      ) : !leadingGridItems && pdfs.length === 0 ? (
        <div className={styles.emptyState}>
          <FileText size={40} style={{ color: 'var(--text-muted)' }} />
          <strong>No hay documentos PDF registrados</strong>
          <span>Sube un archivo PDF o modifica el filtro de búsqueda.</span>
          <Button variant="primary" size="sm" onClick={() => setIsUploadOpen(true)}>
            Subir Primer PDF
          </Button>
        </div>
      ) : (
        <div className={styles.grid}>
          {leadingGridItems}
          {pdfs.map((pdf) => (
            <PdfCard
              key={pdf.id}
              pdf={pdf}
              onOpenViewer={setViewerPdf}
              onOpenRename={setRenameTarget}
              onOpenHotSwap={setHotSwapTarget}
              onOpenMetadata={setMetadataTarget}
              onMoveToFolder={onMovePdfToFolder}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className={styles.paginationRow}>
          <span>Página {page} de {totalPages}</span>
          <div className={styles.paginationControls}>
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              icon={<ChevronLeft size={14} />}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              icon={<ChevronRight size={14} />}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <PdfViewerModal
        isOpen={Boolean(viewerPdf)}
        pdf={viewerPdf}
        onClose={() => setViewerPdf(null)}
      />

      <UploadPdfModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        folderId={activeFolder?.id}
        folderName={activeFolder?.name}
        onPdfUploaded={(created) => {
          setPdfs((prev) => [created, ...prev]);
          onPdfsUpdated?.();
        }}
      />

      <RenamePdfModal
        isOpen={Boolean(renameTarget)}
        pdf={renameTarget}
        onClose={() => setRenameTarget(null)}
        onPdfRenamed={(updated) => {
          setPdfs((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          onPdfsUpdated?.();
        }}
      />

      <HotSwapPdfModal
        isOpen={Boolean(hotSwapTarget)}
        pdf={hotSwapTarget}
        onClose={() => setHotSwapTarget(null)}
        onPdfSwapped={(updated) => {
          setPdfs((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          onPdfsUpdated?.();
        }}
      />

      <PdfMetadataEditorModal
        isOpen={Boolean(metadataTarget)}
        pdf={metadataTarget}
        onClose={() => setMetadataTarget(null)}
        onMetadataUpdated={(updated) => {
          setPdfs((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          onPdfsUpdated?.();
        }}
      />
    </div>
  );
};

