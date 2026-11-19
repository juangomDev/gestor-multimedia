import React, { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react';
import { Outlet, useParams } from 'react-router';
import { useFolderTreeQuery } from '../../queries/useFoldersQueries';
import { flattenFolderTree } from '../../services/foldersService';
import { useToast } from '../../context/useToast';
import { ChangePasswordDialog } from '../auth/ChangePasswordDialog';
import { useLiveNotifications } from '../notifications/useLiveNotifications';
import { ShellContext, type ShortCodePreviewRequest } from './shellContextDef';
import { Sidebar } from './Sidebar';
import { MobileDrawer } from './MobileDrawer';
import { CommandPalette } from './CommandPalette';
import styles from './AppLayout.module.css';

const LazyImageInspectorDialog = lazy(
  () => import('../images/ImageInspectorDialog')
);
const LazyPdfViewerDialog = lazy(() => import('../pdfs/PdfViewerDialog'));

/**
 * Shell principal autenticado v2 ("Archivo Editorial"):
 * - Barra lateral fundida de 228px (`Sidebar`) + drawer accesible móvil (`< 900px`)
 * - Proveedor `ShellContext` conectado al árbol de carpetas para subida contextual estricta
 * - Paleta rápida `⌘K` (`CommandPalette`), cambio de contraseña y visores `React.lazy`
 */
export const AppLayout: React.FC = () => {
  const { folderId } = useParams<{ folderId?: string }>();
  const { showToast } = useToast();
  const folderTreeQuery = useFolderTreeQuery();
  useLiveNotifications();

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [activePreview, setActivePreview] = useState<ShortCodePreviewRequest | null>(null);
  const uploadHandlerRef = useRef<(() => void) | null>(null);

  const allFolders = useMemo(
    () => flattenFolderTree(folderTreeQuery.data ?? []),
    [folderTreeQuery.data]
  );

  const activeFolder = useMemo(() => {
    if (!folderId) return null;
    return allFolders.find((f) => f.id === folderId) ?? null;
  }, [allFolders, folderId]);

  const registerUploadHandler = useCallback((handler: () => void) => {
    uploadHandlerRef.current = handler;
    return () => {
      if (uploadHandlerRef.current === handler) {
        uploadHandlerRef.current = null;
      }
    };
  }, []);

  const triggerContextualUpload = useCallback(() => {
    if (uploadHandlerRef.current) {
      uploadHandlerRef.current();
      return;
    }
    showToast('Entra a una carpeta de Imágenes, Tablas o PDF para subir archivos.', 'info');
  }, [showToast]);

  const shellValue = useMemo(
    () => ({
      activeFolder,
      allFolders,
      isCommandPaletteOpen,
      openCommandPalette: () => setIsCommandPaletteOpen(true),
      closeCommandPalette: () => setIsCommandPaletteOpen(false),
      openChangePassword: () => setIsChangePasswordOpen(true),
      triggerContextualUpload,
      registerUploadHandler,
      openShortCodePreview: (preview: ShortCodePreviewRequest) => setActivePreview(preview),
      closeShortCodePreview: () => setActivePreview(null),
      activePreview,
    }),
    [
      activeFolder,
      allFolders,
      isCommandPaletteOpen,
      triggerContextualUpload,
      registerUploadHandler,
      activePreview,
    ]
  );

  return (
    <ShellContext.Provider value={shellValue}>
      <div className={styles.layout} data-testid="app-shell">
        <div className={styles.desktopSidebar}>
          <Sidebar />
        </div>

        <div className={styles.contentColumn}>
          <MobileDrawer />
          <main className={styles.main} id="main-content">
            <Outlet />
          </main>
        </div>

        <CommandPalette />
        <ChangePasswordDialog
          open={isChangePasswordOpen}
          onOpenChange={setIsChangePasswordOpen}
        />

        {activePreview?.type === 'image' ? (
          <Suspense fallback={null}>
            <LazyImageInspectorDialog
              open={true}
              onOpenChange={(open) => {
                if (!open) setActivePreview(null);
              }}
              shortCode={activePreview.shortCode}
              image={activePreview.image}
              canEdit={activePreview.canEdit}
            />
          </Suspense>
        ) : null}

        {activePreview?.type === 'pdf' ? (
          <Suspense fallback={null}>
            <LazyPdfViewerDialog
              open={true}
              onOpenChange={(open) => {
                if (!open) setActivePreview(null);
              }}
              shortCode={activePreview.shortCode}
              initialPage={activePreview.page}
              pdf={activePreview.pdf}
              canEdit={activePreview.canEdit}
            />
          </Suspense>
        ) : null}
      </div>
    </ShellContext.Provider>
  );
};
