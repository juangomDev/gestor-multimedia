import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { useAuth } from './context/useAuth';
import { Sidebar } from './components/layout/Sidebar';
import { ImagesView } from './views/ImagesView';
import { TablesCatalogView } from './views/TablesCatalogView';
import { TableDataStudioView } from './views/TableDataStudioView';
import { LoginView } from './views/LoginView';
import { UserProfilesView } from './views/UserProfilesView';
import { SettingsView } from './views/SettingsView';
import { ChatStudioView } from './views/ChatStudioView';
import { AuditLogsView } from './views/AuditLogsView';
import { PdfsCatalogView } from './views/PdfsCatalogView';
import { DropzoneOverlay } from './components/upload/DropzoneOverlay';
import { UploadModal } from './components/upload/UploadModal';
import { CreateFolderModal } from './components/folders/CreateFolderModal';
import { EditFolderModal } from './components/folders/EditFolderModal';
import { ShareFolderModal } from './components/folders/ShareFolderModal';
import { MoveToFolderModal } from './components/folders/MoveToFolderModal';
import { ChangePasswordModal } from './components/auth/ChangePasswordModal';
import { StatusBar } from './components/layout/StatusBar';
import { authService } from './services/authService';
import { storageService } from './services/storageService';
import { useMediaWorkspace } from './hooks/useMediaWorkspace';
import type { ImageItem, TableItem, FolderItem } from './types/media';

/** Feature Flag: Gestión de carpetas descongelada y conectada a PostgreSQL (`monolith-backend`). */
const ENABLE_FOLDERS = true;

/**
 * Contenedor principal autenticado que coordina el layout, vistas activas y modales globales.
 */
const MainApp: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [activeView, setActiveView] = useState<
    'images' | 'tables' | 'pdfs' | 'chat' | 'profiles' | 'login' | 'settings' | 'audit'
  >(() => (authService.getSession()?.token ? 'images' : 'login'));
  const [searchQuery, setSearchQuery] = useState('');
  const [pdfsCount, setPdfsCount] = useState(() => storageService.getPdfs().length);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderItem | null>(null);
  const [sharingFolder, setSharingFolder] = useState<FolderItem | null>(null);

  const {
    images,
    tables,
    folders,
    activeFolder,
    activeFolderId,
    setActiveFolderId,
    selectedTableForStudio,
    setSelectedTableForStudio,
    movingTarget,
    setMovingTarget,
    totalBytes,
    refreshItems,
    syncRemote,
    handleManualSync,
    handleFilesUpload,
    handleDeleteImage,
    handleDeleteTable,
    handleDeleteFolder,
    handleConfirmMove,
  } = useMediaWorkspace();

  if (!isAuthenticated || activeView === 'login') {
    return (
      <LoginView
        onLoginSuccess={() => setActiveView('images')}
        onExploreDemo={() => setActiveView('images')}
      />
    );
  }

  if (selectedTableForStudio) {
    return (
      <div style={{ height: '100vh', width: '100vw', background: 'var(--bg-primary)', padding: '10px', boxSizing: 'border-box', overflow: 'hidden', display: 'flex' }}>
        <TableDataStudioView
          table={selectedTableForStudio}
          onBack={() => setSelectedTableForStudio(null)}
          onTableUpdated={() => refreshItems()}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: 'var(--bg-primary)', padding: '10px', gap: '10px', overflow: 'hidden', boxSizing: 'border-box' }}>
      <Sidebar
        activeView={activeView}
        onViewChange={(nextView) => {
          if (nextView === 'images' && activeFolder && activeFolder.type !== 'image') {
            setActiveFolderId(null);
          } else if (nextView === 'tables' && activeFolder && activeFolder.type !== 'table') {
            setActiveFolderId(null);
          } else if (nextView === 'pdfs' && activeFolder && activeFolder.type !== 'pdf') {
            setActiveFolderId(null);
          }
          setActiveView(nextView);
        }}
        onOpenUpload={() => setIsUploadOpen(true)}
        onSync={handleManualSync}
        imagesCount={images.length}
        tablesCount={tables.length}
        pdfsCount={pdfsCount}
        totalBytes={totalBytes}
        activeFolderId={ENABLE_FOLDERS ? activeFolderId : null}
        onFolderChange={setActiveFolderId}
        onOpenNewFolder={() => setIsNewFolderOpen(true)}
        onEditFolder={setEditingFolder}
        onShareFolder={setSharingFolder}
        onDeleteFolder={handleDeleteFolder}
        folders={folders}
        foldersEnabled={ENABLE_FOLDERS}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
      />

      <main style={{ flex: 1, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-panel)', background: 'var(--bg-panel)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {activeView === 'images' && (
            <ImagesView
              images={images}
              activeFolder={ENABLE_FOLDERS && activeFolder?.type === 'image' ? activeFolder : null}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onOpenUpload={() => setIsUploadOpen(true)}
              onDeleteImage={handleDeleteImage}
              onImageUpdated={() => refreshItems()}
              folders={folders}
              onBulkActionFinished={() => refreshItems()}
              onMoveImageToFolder={
                ENABLE_FOLDERS
                  ? (img) => setMovingTarget({ item: img, type: 'image' })
                  : undefined
              }
            />
          )}
          {activeView === 'tables' && (
            <TablesCatalogView
              tables={tables}
              activeFolder={ENABLE_FOLDERS && activeFolder?.type === 'table' ? activeFolder : null}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onOpenStudio={setSelectedTableForStudio}
              onOpenUpload={() => setIsUploadOpen(true)}
              onDeleteTable={handleDeleteTable}
              onTableUpdated={() => refreshItems()}
              folders={folders}
              onBulkActionFinished={() => refreshItems()}
              onMoveTableToFolder={
                ENABLE_FOLDERS
                  ? (tbl) => setMovingTarget({ item: tbl, type: 'table' })
                  : undefined
              }
            />
          )}
          {activeView === 'pdfs' && (
            <PdfsCatalogView
              activeFolder={ENABLE_FOLDERS && activeFolder?.type === 'pdf' ? activeFolder : null}
              folders={folders}
              onPdfsUpdated={() => {
                setPdfsCount(storageService.getPdfs().length);
                void syncRemote();
              }}
            />
          )}
          {activeView === 'chat' && (
            <ChatStudioView
              folders={folders}
              tables={tables}
              onOpenTableInStudio={setSelectedTableForStudio}
            />
          )}
          {activeView === 'profiles' && (
            <UserProfilesView onBackToGallery={() => setActiveView('images')} />
          )}
          {activeView === 'audit' && (
            <AuditLogsView onBackToGallery={() => setActiveView('images')} />
          )}
          {activeView === 'settings' && (
            <SettingsView
              onBackToGallery={() => setActiveView('images')}
              onConfigSaved={() => {
                refreshItems();
                void syncRemote();
              }}
              onItemImported={() => {
                refreshItems();
                void syncRemote();
              }}
              folderId={ENABLE_FOLDERS ? activeFolderId : null}
              onOpenChangePassword={() => setIsChangePasswordOpen(true)}
            />
          )}
        </div>

        <StatusBar totalBytes={totalBytes} />
      </main>

      <DropzoneOverlay onFilesDropped={handleFilesUpload} />

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onFilesSelected={handleFilesUpload}
        folderName={ENABLE_FOLDERS ? activeFolder?.name : undefined}
      />

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />

      {ENABLE_FOLDERS && (
        <CreateFolderModal
          isOpen={isNewFolderOpen}
          onClose={() => setIsNewFolderOpen(false)}
          type={activeView === 'images' ? 'image' : activeView === 'tables' ? 'table' : 'pdf'}
          onFolderCreated={(created) => {
            setActiveFolderId(created.id);
            refreshItems();
            void syncRemote();
          }}
        />
      )}

      {ENABLE_FOLDERS && (
        <EditFolderModal
          folder={editingFolder}
          isOpen={!!editingFolder}
          onClose={() => setEditingFolder(null)}
          onFolderUpdated={(updated) => {
            if (editingFolder && activeFolderId === editingFolder.id) {
              setActiveFolderId(updated.id);
            }
            refreshItems();
            void syncRemote();
          }}
        />
      )}

      {ENABLE_FOLDERS && (
        <ShareFolderModal
          folder={sharingFolder}
          isOpen={!!sharingFolder}
          onClose={() => setSharingFolder(null)}
          onSharesChanged={() => {
            void syncRemote();
          }}
        />
      )}

      {ENABLE_FOLDERS && movingTarget && (
        <MoveToFolderModal
          isOpen={true}
          onClose={() => setMovingTarget(null)}
          itemName={
            movingTarget.type === 'image'
              ? (movingTarget.item as ImageItem).originalName
              : (movingTarget.item as TableItem).tableName
          }
          currentFolderId={movingTarget.item.folderId || null}
          folders={folders.filter((f) => f.type === movingTarget.type)}
          onMove={handleConfirmMove}
        />
      )}
    </div>
  );
};

/**
 * Componente raíz de la aplicación Gestor Multimedia con proveedores de autenticación y notificaciones.
 */
export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainApp />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
