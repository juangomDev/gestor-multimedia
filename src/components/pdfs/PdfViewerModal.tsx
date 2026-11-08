import React, { useState, useEffect } from 'react';
import { Download, FileText, Code2, Copy, Check, ChevronLeft, ChevronRight, Bookmark } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { pdfsService, type PdfExtractedTextResponse } from '../../services/pdfsService';
import { copyToClipboard } from '../../utils/clipboard';
import { useToast } from '../../context/useToast';
import type { PdfItem } from '../../types/media';

/**
 * Propiedades del modal de visualización de PDFs y texto extraído.
 */
export interface PdfViewerModalProps {
  pdf: PdfItem | null;
  isOpen: boolean;
  onClose: () => void;
  initialPage?: number;
}

/**
 * Visor interactivo para documentos PDF con previsualización embebida y consulta del texto extraído.
 */
export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  pdf,
  isOpen,
  onClose,
  initialPage = 1,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'preview' | 'text'>(initialPage > 1 ? 'text' : 'preview');
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [lastInitialPage, setLastInitialPage] = useState<number>(initialPage);
  const [extractedData, setExtractedData] = useState<PdfExtractedTextResponse | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  if (initialPage !== lastInitialPage) {
    setLastInitialPage(initialPage);
    setCurrentPage(initialPage);
    if (initialPage > 1) setActiveTab('text');
  }

  useEffect(() => {
    if (!isOpen || !pdf || activeTab !== 'text') return;
    let active = true;
    pdfsService
      .fetchPdfExtractedText(pdf.shortCode)
      .then((data) => {
        if (active) setExtractedData(data);
      })
      .catch((err: unknown) => {
        if (active) {
          const msg = err instanceof Error ? err.message : 'Error al obtener texto del PDF';
          showToast(msg, 'error');
        }
      })
      .finally(() => {
        if (active) setIsLoadingText(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, pdf, activeTab, showToast]);

  if (!isOpen || !pdf) return null;

  const downloadUrl = pdfsService.getPdfDownloadUrl(pdf.shortCode);
  const totalPages = extractedData?.totalPages || pdf.pageCount || 1;
  const activePageObj = extractedData?.pages?.find((p) => p.pageNumber === currentPage);
  const currentText = activePageObj?.text || (extractedData?.pages?.[0]?.text ?? 'Sin texto disponible en esta página.');

  const handleCopyCurrentText = async () => {
    const ok = await copyToClipboard(currentText);
    if (ok) {
      setCopiedText(true);
      showToast('Texto copiado al portapapeles', 'success');
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Documento PDF — ${pdf.originalName}`}
      wide={true}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Barra superior de pestañas y descarga */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', background: 'var(--bg-panel)', padding: 3, borderRadius: 'var(--radius-md)', gap: 4 }}>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: activeTab === 'preview' ? 'var(--bg-card)' : 'transparent',
                color: activeTab === 'preview' ? 'var(--text-main)' : 'var(--text-muted)',
                fontWeight: activeTab === 'preview' ? 600 : 500,
                fontSize: '0.8125rem',
                cursor: 'pointer',
              }}
            >
              <FileText size={15} />
              <span>Visor PDF</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('text')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: activeTab === 'text' ? 'var(--bg-card)' : 'transparent',
                color: activeTab === 'text' ? 'var(--text-main)' : 'var(--text-muted)',
                fontWeight: activeTab === 'text' ? 600 : 500,
                fontSize: '0.8125rem',
                cursor: 'pointer',
              }}
            >
              <Code2 size={15} />
              <span>Texto Extraído</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <a
              href={downloadUrl}
              download={pdf.originalName}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--accent-primary)',
                background: 'rgba(59, 130, 246, 0.12)',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
              }}
            >
              <Download size={14} />
              <span>Descargar Original</span>
            </a>
          </div>
        </div>

        {/* Contenido según pestaña */}
        {activeTab === 'preview' ? (
          <div
            style={{
              width: '100%',
              height: '560px',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              border: '1px solid var(--border-subtle)',
              background: '#2b2b2b',
            }}
          >
            <iframe
              src={pdf.url}
              title={pdf.originalName}
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Controles de página para texto */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--bg-panel)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.8125rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: currentPage <= 1 ? 'var(--text-muted)' : 'var(--text-main)',
                    cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Página anterior"
                >
                  <ChevronLeft size={16} />
                </button>

                <span style={{ fontWeight: 600 }}>
                  Página {currentPage} de {totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: currentPage >= totalPages ? 'var(--text-muted)' : 'var(--text-main)',
                    cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Página siguiente"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyCurrentText}
                icon={copiedText ? <Check size={14} style={{ color: 'var(--color-success)' }} /> : <Copy size={14} />}
              >
                <span>Copiar Página</span>
              </Button>
            </div>

            {isLoadingText ? (
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Cargando texto extraído del documento...
              </div>
            ) : (
              <pre
                style={{
                  width: '100%',
                  height: '480px',
                  overflowY: 'auto',
                  background: 'var(--bg-input)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8125rem',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  boxSizing: 'border-box',
                }}
              >
                {currentText}
              </pre>
            )}
          </div>
        )}

        {/* Resumen semántico si existe */}
        {pdf.metadataCard && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(168, 85, 247, 0.08)',
              border: '1px solid rgba(168, 85, 247, 0.2)',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <Bookmark size={16} style={{ color: '#a855f7', flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ color: '#a855f7' }}>Ficha Técnica: </strong>
              <span>{pdf.metadataCard.summary || pdf.metadataCard.category || 'Sin descripción'}</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

